'use strict'

let serveStatic = require('serve-static')
let finalhandler = require('finalhandler')

let auth = require('./auth')
let api = require('./api')

let serve = serveStatic('src/client/', {
  extensions: [ 'html', 'htm', 'js' ],
  index: [ 'index.html' ]
})

module.exports = (req, res) => {
    let done = finalhandler(req, res)

    auth(req, res, done)
    req.url.startsWith('/api')
      ? api(req, res, done)
      : serve(req, res, done)
  }
