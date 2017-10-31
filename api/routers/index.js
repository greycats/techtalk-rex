// @flow

import Router from 'koa-router'
import search from './search'
import attachments from './attachments'

export default new Router({ prefix: '/api' })
.use('/search', search())
.use('/attachments', attachments())
