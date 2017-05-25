'use strict'

const mathRound10 = require('../tool/mathRound10')
const campFilter = require('./campFilter')
const { index } = require('../../config.json')

module.exports = client => dateRange => (camp, country) => {
  let countryFilter = country && country.length === 2 ?
  { 
    "match": {
        "fields.geoip.country": {
          "query": country || "*"
        }
    }
  } : {}
  return client.msearch({
    body: [
      {"index":index},
      {
          "query":{
              "bool":{
                  "must": [
                        countryFilter
                        ,{
                            "bool":{
                                "should":[campFilter(camp)]
                            }
                        },{
                            "range":{
                                "@timestamp":{
                                    "gte":dateRange.gte,
                                    "lte":dateRange.lte,
                                    "format":"epoch_millis"
                                }
                            }
                        }
                    ]
                }
            },
            "size":0,
            "aggs":{"subids":{"terms":{"field":"fields.subid.keyword","size":10000,"order":{"_count":"desc"}},"aggs":{"spent":{"sum":{"field":"fields.link.price"}}}}}}
    ]
  }).then(stats => stats.responses[0].aggregations.subids.buckets.map(x => ({ name: x.key, total: x.doc_count, spent: mathRound10(x.spent.value, -5) })))
}
