'use strict'

const http = require('http')

const { port } = require('./config.json')
const handler = require('./src/handler')

http.createServer(handler).listen(port)
