'use strict'

const Router = require('router')
const bodyParser = require('body-parser')
const finisher = require('./tool/finisher')
const auth = require('basic-auth')
const elasticsearch = require('elasticsearch')
const moment = require('moment')

const { logins, es } = require('../config.json')

const client = new elasticsearch.Client({
  host: es.host,
  httpAuth: es.httpAuth
  // log: 'trace',
})


function decimalAdjust(type, value, exp) {
  // If the exp is undefined or zero...
  if (typeof exp === 'undefined' || +exp === 0) {
    return Math[type](value);
  }
  value = +value;
  exp = +exp;
  // If the value is not a number or the exp is not an integer...
  if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
    return NaN;
  }
  // If the value is negative...
  if (value < 0) {
    return -decimalAdjust(type, -value, exp);
  }
  // Shift
  value = value.toString().split('e');
  value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
  // Shift back
  value = value.toString().split('e');
  return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
}

let mathRound10 = (value, exp) => decimalAdjust('round', value, exp)

let getCampsStats = dateRange => camps => {
  let campsFilter = camps.map(c => ({
    "match":{
      "fields.campaigningTitle.keyword":{
        "query":c,
        "type":"phrase"
      }
    }
  }))

  return client.msearch({
    body: [
      {"index":"adprohub-*"}, 
      {"query":{"bool":{"must":[{"query_string":{"query":"*","analyze_wildcard":true}},{"bool":{"should":campsFilter}},{"range":{"@timestamp":{"gte":dateRange.gte,"lte":dateRange.lte,"format":"epoch_millis"}}}],"must_not":[]}},"size":0,"_source":{"excludes":[]},"aggs":{"top":{"terms":{"field":"fields.campaigningTitle.keyword","size":10000,"order":{"_count":"desc"}},"aggs":{"total":{"terms":{"field":"fields.link.to.keyword","size":5,"order":{"_count":"desc"}},"aggs":{"spent":{"sum":{"field":"fields.link.price"}}}},"spent":{"sum":{"field":"fields.link.price"}}}}}}
      ]
  })
}

let getCountriesStats = dateRange => camp => {
  let campFilter = {
    "match":{
      "fields.campaigningTitle.keyword":{
        "query":camp,
        "type":"phrase"
      }
    }
  }

  return client.msearch({
    body: [
      {"index":"adprohub-*"},
      {"query":{"bool":{"must":[{"query_string":{"query":"*","analyze_wildcard":true}},{"bool":{"should":[campFilter]}},{"range":{"@timestamp":{"gte":dateRange.gte,"lte":dateRange.lte,"format":"epoch_millis"}}}],"must_not":[]}},"size":0,"_source":{"excludes":[]},"aggs":{"country":{"terms":{"field":"fields.geoip.country.keyword","size":10000,"order":{"_count":"desc"}},"aggs":{"spent":{"sum":{"field":"fields.link.price"}}}}}}
    ]
  })
}

let getSubidsStats = dateRange => camp => {
  let campFilter = {
    "match":{
      "fields.campaigningTitle.keyword":{
        "query":camp,
        "type":"phrase"
      }
    }
  }

  return client.msearch({
    body: [
      {"index":"adprohub-*"},
      {"query":{"bool":{"must":[{"query_string":{"query":"*","analyze_wildcard":true}},{"bool":{"should":[campFilter]}},{"range":{"@timestamp":{"gte":dateRange.gte,"lte":dateRange.lte,"format":"epoch_millis"}}}],"must_not":[]}},"size":0,"_source":{"excludes":[]},"aggs":{"subids":{"terms":{"field":"fields.subid.keyword","size":10000,"order":{"_count":"desc"}},"aggs":{"spent":{"sum":{"field":"fields.link.price"}}}}}}
    ]
  })
}

let getAll = (req, res) => {
  const user = logins.find(x => x.login === auth(req).name)

  getCampsStats({ 
      gte: +moment(req.body.start),
      lte: +moment(req.body.end)
    })
    (user.camps)
    .then(stats => {
      let aggs = stats.responses[0].aggregations.top.buckets
      let data = user.camps.map(x => {
        let aggDoc = aggs.find(a => a.key === x)
        return aggDoc
          ? { name: x, total: aggDoc.doc_count, spent: mathRound10(aggDoc.spent.value, -3) }
          : { name: x, total: 0, spent: 0 }
      })
      res.end(JSON.stringify(data))
    })
    .catch(e => {
      res.statusCode = 500;
      res.end(e.stack)
    })
}


let getCountries = (req, res) => {
  const user = logins.find(x => x.login === auth(req).name)

  if (user.camps.indexOf(req.body.camp) === -1) {
    res.statusCode = 403
    res.end('Forbidden')
    return
  }

  getCountriesStats({ 
      gte: +moment(req.body.start),
      lte: +moment(req.body.end)
    })
    (req.body.camp)
    .then(stats => {
      let data = stats.responses[0].aggregations.country.buckets.map(x => ({ name: x.key, total: x.doc_count, spent: mathRound10(x.spent.value, -5) }))
      res.end(JSON.stringify(data))
    })
    .catch(e => {
      res.statusCode = 500;
      res.end(e.stack)
    })
}

let getSubids = (req, res) => {
  const user = logins.find(x => x.login === auth(req).name)

  if (user.camps.indexOf(req.body.camp) === -1) {
    res.statusCode = 403
    res.end('Forbidden')
    return
  }

  getSubidsStats({ 
      gte: +moment(req.body.start),
      lte: +moment(req.body.end)
    })
    (req.body.camp)
    .then(stats => {
      let data = stats.responses[0].aggregations.subids.buckets.map(x => ({ name: x.key, total: x.doc_count, spent: mathRound10(x.spent.value, -5) }))
      res.end(JSON.stringify(data))
    })
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

  return router
}

module.exports = setupRouter()
