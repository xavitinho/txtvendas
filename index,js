// server config 

const express = require('express')
const app = express();

const server = function() {
  app.get('/', (request, response) => {
    response.sendStatus(200);
  })
  app.listen(process.env.PORT);
}

server()

// twitter config

const twit = require('twit')

const { track } = require('./filter.json')

var T = new twit({
  consumer_key: process.env.CONSUMERTOKEN,
  consumer_secret: process.env.CONSUMERSECRET,
  access_token: process.env.ACCESSTOKEN,
  access_token_secret: process.env.ACCESSTOKENSECRET,
  timeout_ms: 60 * 1000,
  strictSSL: true
})

var stream = T.stream('statuses/filter', { track })

stream.on('tweet', function(tweet) {
  if (!tweet.retweeted_status) {
    T.post('statuses/retweet/:id', { id: tweet.id_str })
  }
})
