//@flow

import Router from 'koa-router'

export default () =>
  new Router()
  .post('/', async ctx => {
    const { keyword } = ctx.request.body
    ctx.body = { done: true, keyword }
  })
  .routes()
