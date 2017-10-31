//@flow

import natural from 'natural'
import type Redis from 'ioredis'

export type SearchFieldOption = {
  tokenize?: boolean,
  score?: ((string) => number) | string,
  isDefault?: boolean,
  filter?: boolean
}

const metaphone = natural.Metaphone.process
const stem = natural.PorterStemmer.stem
const tokenizer = new natural.RegexpTokenizer({pattern: /([A-Za-zА-Яа-я]+|[\u4E00-\u9FA5]|\d+\.\d+(\.\d+)?)/g, gaps: false})

/**
 * Base class to hold redis instance, prefix KEY and `SearchFieldOption`s
 */
class Index {
  redis: Redis
  options: {[key: string]: SearchFieldOption}

  constructor(redis: Redis, options: {[key: string]: SearchFieldOption}) {
    this.redis = redis
    this.options = options
  }

  log(message: string) {
    console.log(`[db${this.redis.condition.select}] ${message}`)
  }
}

const BATCH_SIZE = 2000

/**
 * Create Inverted Index on documents
 * typical usage is:
 *
 * const stale = await builder.start()
 * if (!stale) {
 *   await builder.append(...)
 * }
 * await builder.end()
 */
export class IndexBuilder extends Index {

  async start(force: boolean) {
    await this.redis.flushdb()
    this.log(`start indexing.. ${force ? '(force)': ''}`)
  }

  _writeIndex(redis: Redis, object: {[key: string]: any}, idx: number) {
    redis.hset(`objects`, idx, JSON.stringify(object))
    const writeTokenIndex = (text: string) => {
      if (text) {
        const tokenized = tokenizer.tokenize(text)
        if (tokenized) {
          tokenized.forEach(token => {
            redis.sadd(`token:${metaphone(stem(token))}`, idx)
          })
        }
      }
    }

    Object.keys(this.options).forEach(field => {
      if (!object[field]) return
      const value = object[field]
      const { tokenize } = this.options[field]

      if (tokenize) {
        if (Array.isArray(value)) {
          value.forEach(tag => {
            writeTokenIndex(tag)
            redis.sadd(`tag:${tag}`, idx)
          })
        } else {
          writeTokenIndex(value)
        }
      }
    })
  }

  async append(objects: {[key: string]: any}[], idx: number = 0) {
    let redis = this.redis.pipeline()
    for (const object of objects) {
      this._writeIndex(redis, object, idx)
      idx++
      const length = redis.length
      if (length >= BATCH_SIZE) {
        await redis.exec()
        this.log(`batch wrote ${length}`)
        redis = this.redis.pipeline()
      }
    }
    const length = redis.length
    if (length > 0) {
      await redis.exec()
      this.log(`batch wrote ${length}`)
    }
    return idx
  }

  async end() {
    this.log(`index built!`)
  }
}

/**
 * Search on existing index
 */
export class SearchEngine extends Index {

  // search
  parseTokens(term: string) {
    const keys: string[] = []
    term = term.replace(/\[.*?\]/g, tag => {
      keys.push(`tag:${tag.substring(1, tag.length - 1)}`)
      return ''
    })
    const tokenized = tokenizer.tokenize(term)
    if (tokenized) {
      keys.push(...tokenized.map(token => `token:${metaphone(stem(token))}`))
    }
    return keys
  }

  async parseAndSearch(term: string|null, filters: any) {
    const keys: string[] = []
    if (term) {
      keys.push(...this.parseTokens(term))
    }
    const searchKey = [term]
    const tkey = 's:' + searchKey.join(' ')
    if (keys.length > 0) {
      const exist = await this.redis.expire(tkey, 30)
      if (!exist) {
        await this.redis.multi()
        .zinterstore(tkey, keys.length, ...keys)
        .expire(tkey, 30)
        .exec()
      }
    }
    return tkey
  }

  async search(keyword: string|null, sort: string|null, filters: any, start: number = 0, end: number = -1) {
    const tkey = await this.parseAndSearch(keyword, filters)
    let sorted = false
    const redis = this.redis.pipeline()
    redis.zrevrange(tkey, start, end)
    redis.zcard(tkey)

    const res = await redis.exec()
    const ids = res[res.length - 2][1] //zrevrange
    const count = res[res.length - 1][1] //zcard

    if (ids && ids.length) {
      const objects = await this.redis.hmget(`objects`, ...ids)
      return [objects.map(string => JSON.parse(string)), count]
    } else {
      return [[], 0]
    }
  }
}
