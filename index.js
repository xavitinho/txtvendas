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

var T = new twit({
  consumer_key: process.env.CONSUMERTOKEN,
  consumer_secret: process.env.CONSUMERSECRET,
  access_token: process.env.ACCESSTOKEN,
  access_token_secret: process.env.ACCESSTOKENSECRET,
  timeout_ms: 60 * 1000,
  strictSSL: true
})

const { membros, termos } = require('./filter.json')

const track = []

for (let membro of membros) {
  for (let termo of termos) {
    track.push(`${membro} ${termo}`)
  }
}

console.log(track)

var stream = T.stream('statuses/filter', { track })

stream.on('tweet', function(tweet) {
  if (!tweet.retweeted_status) {
    let text = tweet.extended_tweet ? tweet.extended_tweet.full_text : tweet.text
    let skip = true
    for (let membro of membros) {
      for (let termo of termos) {
        if (text.includes(membro) && text.includes(termo)){
          skip = false
        }
      }
    }
    if (!skip) {
      console.log(`${text}\nhttps://twitter.com/i/status/${tweet.id_str}\n`)
      T.post('statuses/retweet/:id', { id: tweet.id_str })
      T.post('favorites/create', { screen_name: tweet.user.screen_name, id: tweet.id_str})
    }
  }
})
