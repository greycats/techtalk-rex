//@flow

import Server from './server'

const server = Server()
const port = 3001
server.listen(3001)
console.log(`${server.name}-${server.env}: server.listen(${port})`)
