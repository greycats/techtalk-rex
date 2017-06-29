// @flow

import Koa from 'koa'
import body from 'koa-body'
import router from './routers'
import cors from 'kcors'

export default () => {
  const app = new Koa()
  app.name = 'API'
  app.use(body({ multipart: true }))
  app.use(cors({ origin: '*' }))
  app.use(router.routes()).use(router.allowedMethods())
  return app
}
