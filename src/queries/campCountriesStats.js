'use strict'

const mathRound10 = require('../tool/mathRound10')
const campFilter = require('./campFilter')
const { index } = require('../../config.json')

module.exports = client => dateRange => camp => {
  return client.msearch({
    body: [
      {"index":index},
      {"query":{"bool":{"must":[{"query_string":{"query":"*","analyze_wildcard":true}},{"bool":{"should":[campFilter(camp)]}},{"range":{"@timestamp":{"gte":dateRange.gte,"lte":dateRange.lte,"format":"epoch_millis"}}}],"must_not":[]}},"size":0,"_source":{"excludes":[]},"aggs":{"country":{"terms":{"field":"fields.geoip.country.keyword","size":10000,"order":{"_count":"desc"}},"aggs":{"spent":{"sum":{"field":"fields.link.price"}}}}}}
    ]
  }).then(stats => stats.responses[0].aggregations.country.buckets.map(x => ({ name: x.key, total: x.doc_count, spent: mathRound10(x.spent.value, -5) })))
}
