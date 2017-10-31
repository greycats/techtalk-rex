//@flow

import Redis from 'ioredis'
import Queue from 'bull'
import fs from 'fs'
import yaml from 'js-yaml'
import { OPTIONS, db } from '../api/attachments/options-final'
import { IndexBuilder } from '../api/redis-utils-1'
import type { Attachment } from '../api/attachments/options-final'

const queue = new Queue('attachments-search')

queue.process(async job => {
  const redis = new Redis({ db })
  const { force } = job.data
  const indexBuilder = new IndexBuilder(redis, OPTIONS)
  const stale = await indexBuilder.start(force)
  if (stale) { return }
  const attachments = yaml.load(fs.readFileSync(`${__dirname}/attachments.yml`, 'utf-8'))
  await indexBuilder.append(attachments, 0)
  await indexBuilder.end()
})

if (process.env.NODE_ENV === 'development') {
  queue.add({ force: true })
}
