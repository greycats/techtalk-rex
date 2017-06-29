// @flow

import Router from 'koa-router'
import search from './search'

export default new Router({ prefix: '/api' })
.use('/search', search())
