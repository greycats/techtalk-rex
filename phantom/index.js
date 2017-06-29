//@flow

import phantomjs from 'phantomjs-prebuilt'
import fs from 'fs'
import tmp from 'tmp'

type Links = {[key: string]: string}[]

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
