//@flow

import Router from 'koa-router'
import fs from 'fs'
import uuid from 'uuid/v1'
import Boom from 'boom'
import Queue from 'bull'

const images = {}

const queue = new Queue('screenshot')
const completionQueue = new Queue('screenshot-complete')

const handlers = {}

completionQueue.process((job, done) => {
  const { job_id, path } = job.data
  if (handlers[job_id]) {
    handlers[job_id](path)
    delete handlers[job_id]
  }
  done()
})

export default () =>
  new Router()
  .post('/', async ctx => {
    const { keyword } = ctx.request.body
    const job = await queue.add({
      url: `https://s.taobao.com/search?q=${encodeURIComponent(keyword)}`,
      postfix: '.jpg',
      size: 1366,
      scale: 3
    }, {
      lifo: true,
      removeOnComplete: true
    })
    const path = await new Promise((resolve, reject) => handlers[job.id] = resolve)
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
