// @flow

import Koa from 'koa'
import body from 'koa-body'
import router from './routers'
import cors from 'kcors'
import Boom from 'boom'

export default () => {
  const app = new Koa()
  app.name = 'API'
  app.use(body())
  app.use(async (ctx: any, next: Function) => {
    try {
      await next()
    } catch (error) {
      const boom = Boom.wrap(error)
      if (boom.output.statusCode == 500) {
        console.trace(error)
      }
      ctx.status = boom.output.statusCode
      ctx.body = boom.output.payload
    }
  })
  app.use(router.routes()).use(router.allowedMethods())
  return app
}
