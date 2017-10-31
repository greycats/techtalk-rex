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
const distance = natural.JaroWinklerDistance

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

  defaultSortField() {
    let _defaultSortField = Object.keys(this.options).filter(field => this.options[field].isDefault)[0]
    if (!_defaultSortField) {
      this.log('options should have a field marked as default sorting option')
      _defaultSortField = Object.keys(this.options).filter(field => this.options[field].score)[0]
    }
    this.log(`use default sort: ${_defaultSortField}`)
    return _defaultSortField
  }
}

const LAST_SYNCED_KEY = 'last_synced'
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
    const last_synced = await this.redis.get(LAST_SYNCED_KEY)
    if (last_synced) {
      const stale = Date.now() - last_synced
      if (!force && stale < 1800000 || force && stale < 60000) {
        this.log(`use current index, skipping..`)
        return true
      }
    }
    await this.redis.select(this.redis.condition.select + 1)
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
            redis.zadd(`token:${metaphone(stem(token))}`, distance(token, text), idx)
          })
        }
      }
    }

    Object.keys(this.options).forEach(field => {
      if (!object[field]) return
      const value = object[field]
      const { tokenize, score, filter } = this.options[field]

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

      if (score) {
        const name = value.substr(value.indexOf('/') + 1)
        if (typeof score === 'function') {
          const weight = score(name)
          if (filter && weight > 0) {
            redis.sadd(`${field}:${value}`, idx)
          }
          redis.zadd(`sort:${field}`, weight, idx)
        } else if (name && object[score]) {
          const value = String(object[score])
          if (filter) {
            redis.sadd(`${field}:${value}`, idx)
          }
          redis.zadd(`~${field}`, 'NX', 0, `${name}:${value}`)
        } else {
          redis.zadd(`sort:${field}`, 0, idx)
        }
      }
    })
  }

  async append(objects: {[key: string]: any}[], idx?: number) {
    let redis = this.redis.pipeline()
    for (const object of objects) {
      if (idx === undefined) {
        this._writeIndex(redis, object, object.id)
      } else {
        this._writeIndex(redis, object, idx)
        idx++
      }
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
    const fields = Object.keys(this.options).filter(field => typeof this.options[field].score === 'string')
    if (fields.length) {
      await Promise.all(fields.map(async field => {
        return await this._createSortIndex(field)
      }))
    }
    // switch staging to production
    const currDB = this.redis.condition.select
    const toDB = currDB - 1
    console.log(`[db${currDB}] swapping to db${toDB}..`)
    await this.redis.set(LAST_SYNCED_KEY, Date.now())
    await this.redis.swapdb(currDB, toDB)
    await this.redis.flushdb()
    await this.redis.select(toDB)
    this.log(`index built!`)
  }

  async _createSortIndex(key: string) {
    this.log(`generating sort:${key}..`)
    const [[err, uploaders], _] = await this.redis.pipeline().zrange(`~${key}`, 0, -1).del(`~${key}`).exec()
    await Promise.all(uploaders.map(async (uploader, idx) => {
      const [name, value] = uploader.split(':')
      const docs = await this.redis.smembers(`${key}:${value}`)
      const score = idx + 1
      const args = docs.reduce((curr, doc) => curr.concat(score, doc), [])
      return await this.redis.zadd(`sort:${key}`, 'NX', ...args)
    }))
    return
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
    Object.keys(this.options).forEach(field => {
      const { filter, isDefault } = this.options[field]
      if (filter) {
        const value = filters[field]
        if (value) {
          keys.push(`${field}:${value}`)
          searchKey.push(`${field}:${value}`)
        }
      }
      if (!term && isDefault) {
        keys.push(`sort:${field}`)
      }
    })
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

  parseSorting(sort: string) {
    const sortables = Object.keys(this.options).filter(field => this.options[field].score).join('|')
    const m = new RegExp(`^([+-]?)(${sortables})$`).exec(sort)
    if (m) {
      const desc = m[1] === '-'
      return [m[2], desc]
    }
  }

  async search(keyword: string|null, sort: string|null, filters: any, start: number = 0, end: number = -1) {
    const tkey = await this.parseAndSearch(keyword, filters)
    let sorted = false
    const redis = this.redis.pipeline()

    if (!sort) {
      sort = this.defaultSortField()
    }
    const stkey = tkey + ':sort:' + sort
    const sorting = this.parseSorting(sort)
    if (sorting) {
      const [field, desc] = sorting
      redis.zinterstore(stkey, 2, tkey, `sort:${field}`, 'WEIGHTS', 0, 1)
      redis.expire(stkey, 30)
      if (desc) {
        redis.zrevrange(stkey, start, end)
      } else {
        redis.zrange(stkey, start, end)
      }
      redis.zcard(stkey)
      sorted = true
    }
    if (!sorted) {
      redis.zrevrange(tkey, start, end)
      redis.zcard(tkey)
    }

    const res = await redis.exec()
    const count = res[res.length - 1][1]
    const ids = res[res.length - 2][1]

    if (ids && ids.length) {
      const objects = await this.redis.hmget(`objects`, ...ids)
      return [objects.map(string => JSON.parse(string)), count]
    } else {
      return [[], 0]
    }
  }
}
