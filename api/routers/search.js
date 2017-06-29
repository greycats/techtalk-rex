//@flow

import Router from 'koa-router'
import fs from 'fs'
import { screenshot } from '../../phantom'
import uuid from 'uuid/v1'
import Boom from 'boom'

const images = {}

export default () =>
  new Router()
  .post('/', async ctx => {
    const { keyword } = ctx.request.body
    const path = await screenshot({
      url: `https://s.taobao.com/search?q=${encodeURIComponent(keyword)}`,
      postfix: '.jpg',
      size: 1366,
      scale: 3
    })
    const id = uuid()
    images[id] = path
    ctx.body = { id }
  })
  .get('/images/:id', async ctx => {
    const path = images[ctx.params.id]
    if (!path) {
      throw Boom.notFound()
    }
    ctx.body = fs.createReadStream(path)
    ctx.type = 'image/jpeg'
    ctx.set('content-disposition', 'inline')
  })
  .routes()
