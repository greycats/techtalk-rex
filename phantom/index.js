//@flow

import phantomjs from 'phantomjs-prebuilt'
import fs from 'fs'
import tmp from 'tmp'
import Queue from 'bull'



type Options = {
  url: string,
  postfix: string,
  size: number,
  scale: number
}

export function screenshot(options: Options): Promise<string> {
  const { url, postfix, size, scale } = options
  return new Promise((resolve, reject) => {
    tmp.file({ prefix: 'screenshot-', postfix }, (err, path, fd) => {
      if (err) {
        return reject(err)
      }
      const program = phantomjs.exec(`${__dirname}/phantom-screenshot.js`, url, path, size, scale)
      program.stdout.pipe(process.stdout)
      program.stderr.pipe(process.stderr)
      program.on('exit', code => {
        if (!code) {
          return resolve(path)
        } else {
          reject(code)
        }
      })
    })
  })
}


const queue = new Queue('screenshot')
const completionQueue = new Queue('screenshot-complete')

queue.process(job =>
  screenshot(job.data)
  .then(path =>
    completionQueue.add({job_id: job.id, path})
  )
)

queue.on('active', (job) => {
  console.log('job active', job.id)
})
queue.on('completed', (job, result) => {
  console.log('job completed', job.id)
})
