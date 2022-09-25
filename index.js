// server config 

const express = require('express')
const app = express();

app.use(express.static(__dirname));

app.get('/', (request, response) => {
  response.sendFile(__dirname + '/widget.html');
})

app.listen(process.env.PORT);


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
    let text = tweet.extended_tweet 
      ? tweet.extended_tweet.full_text.replace('https://', '') 
      : tweet.text
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

const putzero = n => n.toLocaleString(undefined, { minimumIntegerDigits: 2 })


// atualiza a bio

setInterval( () => {
  let t = new Date(Date.now())
  t.setHours(t.getHours() - 3)
  let h  = putzero(t.getHours())
  let m  = putzero(t.getMinutes())
  let d  = putzero(t.getDate())
  let me = putzero(t.getMonth())
  T.post('account/update_profile', { 
    description: 
      `ativa as notificações se estiver em busca de um beomgyu R ou outro photocard raro\n\nonline ${d}/${me} às ${h}h${m}m` 
  })
  console.log(`online ${d}/${me} às ${h}h${m}m`)
}, 600000)
