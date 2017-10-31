//@flow

import Router from 'koa-router'
import Redis from 'ioredis'
import { SearchEngine } from '../redis-utils-1'
import { OPTIONS, db } from '../attachments/options-final'

const PER_PAGE = 6
const engine = new SearchEngine(new Redis({ db }), OPTIONS)

export default () => new Router()
.get('/', async ctx => {
  const { keyword, type, uploader, sort, offset: _offset } = ctx.query
  const offset = parseInt(_offset || 0, 10)
  const filters = { type, uploader }
  const range = [offset, offset + PER_PAGE - 1]
  const [attachments, count] = await engine.search(keyword, sort, filters, ...range)
  ctx.body = { attachments, count }
})
.routes()
