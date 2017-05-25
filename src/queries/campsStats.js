'use strict'

const mathRound10 = require('../tool/mathRound10')
const campFilter = require('./campFilter')
const { index } = require('../../config.json')

module.exports = client => dateRange => camps => {
  let quries = camps.map(camp => ({  
    "query":{  
      "bool":{  
        "must":[
          {
            "bool": {
              "should": campFilter(camp)
            }
          },
          {
            "range":{  
              "@timestamp":{  
                "gte": dateRange.gte,
                "lte": dateRange.lte,
                "format":"epoch_millis"
              }
            }
          }
        ]
      }
    },
    "size":0,
    "aggs": {  
      "spent":{  
        "sum":{  
          "field":"fields.link.price"
        }
      }
    }
  }))

  return client.msearch({
    body: quries.reduce((r, x) => r.concat(
      {"index":index},x
    ), [])
  })
  .then((x) => x.responses.map((r, i) => Object.assign(r, { name: camps[i].name })))
  .then(stats => {
      let camps = stats.map(stat => {
        try {
          return {
            spent: mathRound10(stat.aggregations.spent.value, -3),
            total: stat.hits.total,
            name: stat.name
          }
        } catch(e) {
          return {
            spent: 0,
            total: 0,
            name: stat.name
          }
        }
      })

      return camps
    })
}
