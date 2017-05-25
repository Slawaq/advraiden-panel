'use strict'

module.exports = camp => camp.links.map(l => ({
  "bool": {
    "must": [
      {
        "match": {
          "fields.campaigningId": {
            "query": l.camp
          }
        }
      },{
        "match": {
          "fields.linkId": {
            "query": l.id
          }
        }
      }
    ]
  }
}))
