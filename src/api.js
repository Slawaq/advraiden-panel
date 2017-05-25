'use strict'

const Router = require('router')
const bodyParser = require('body-parser')
const finisher = require('./tool/finisher')
const auth = require('basic-auth')
const elasticsearch = require('elasticsearch')
const moment = require('moment')

const { logins, es, name } = require('../config.json')

const campsStats = require('./queries/campsStats')
const campCountriesStats = require('./queries/campCountriesStats')
const campSubidsStats = require('./queries/campSubidsStats')

const client = new elasticsearch.Client({
  host: es.host,
  httpAuth: es.httpAuth,
  // log: 'trace',
})

let getAll = (req, res) => {
  const user = logins.find(x => x.login === auth(req).name)

  campsStats(client)({ 
      gte: +moment(req.body.start),
      lte: +moment(req.body.end)
    })
    (user.camps)
    .then(stats => res.end(JSON.stringify({ stats, name })))
    .catch(e => {
      res.statusCode = 500;
      res.end(e.stack)
    })
}


let getCountries = (req, res) => {
  const user = logins.find(x => x.login === auth(req).name)
  let camp = user.camps.find(c => c.name === req.body.camp)

  if (camp == null) {
    res.statusCode = 403
    res.end('Forbidden')
    return
  }

  campCountriesStats(client)({ 
      gte: +moment(req.body.start),
      lte: +moment(req.body.end)
    })
    (camp)
    .then(stats => res.end(JSON.stringify(stats)))
    .catch(e => {
      res.statusCode = 500;
      res.end(e.stack)
    })
}

let getSubids = (req, res) => {
  const user = logins.find(x => x.login === auth(req).name)
  let camp = user.camps.find(c => c.name === req.body.camp)

  if (camp == null) {
    res.statusCode = 403
    res.end('Forbidden')
    return
  }

  campSubidsStats(client)({ 
      gte: +moment(req.body.start),
      lte: +moment(req.body.end)
    })
    (camp)
    .then(stats => res.end(JSON.stringify(stats)))
    .catch(e => {
      res.statusCode = 500;
      res.end(e.stack)
    })
}

let getCountrySubids = (req, res) => {
  const user = logins.find(x => x.login === auth(req).name)
  let camp = user.camps.find(c => c.name === req.body.camp)

  if (camp == null) {
    res.statusCode = 403
    res.end('Forbidden')
    return
  }

  campSubidsStats(client)({ 
      gte: +moment(req.body.start),
      lte: +moment(req.body.end)
    })
    (camp, req.body.country)
    .then(stats => res.end(JSON.stringify(stats)))
    .catch(e => {
      res.statusCode = 500;
      res.end(e.stack)
    })
}

let setupRouter = () => {
  let router = new Router({ mergeParams: true })
  router.use(bodyParser.json())

  router.post('/api/all', getAll, finisher)
  router.post('/api/getCountries', getCountries, finisher)
  router.post('/api/getSubids', getSubids, finisher)
  router.post('/api/getCountrySubids', getCountrySubids, finisher)

  return router
}

module.exports = setupRouter()
