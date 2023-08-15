// server config
var status = '...'
const express = require('express')
const app = express();
app.get('/', (request, response) => {
  response.send(status)
})
app.listen(process.env.PORT);
console.log(status)
// discord config

const { Client, GatewayIntentBits } = require('discord.js')
const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
})

var channel = false

bot.login(process.env.DISCORDTOKEN)

bot.on('ready', () => {
  channel = bot.channels.cache.get('1023386548739252304')
  channel.send(status + ': discord bot online')
})

var currentapp = 0

const bearers = [ process.env.BearerToken, process.env.BearerToken2]

// twitter config
const { TwitterApi, ETwitterStreamEvent } = require('twitter-api-v2');

var client = new TwitterApi(process.env.BearerToken)
var clientRT = new TwitterApi({
      appKey: process.env.APIKey,
      appSecret: process.env.APIKeySecret,
      accessToken: process.env.AccessToken,
      accessSecret: process.env.AccessTokenSecret
    })

// atualiza as regras
const { membros, termos, filtros, bio } = require('./config.json')
let value = `(${membros.reduce((a, b) => a + ' OR ' + b)}) (${termos.reduce((a, b) => a + ' OR ' + b)}) -is:retweet`
const track = [{ value }]

async function checkrules() {
  let skip = false
  let rules = await client.v2.streamRules()
  if (rules.data) {
    let rulestodelete = []
    rules.data.map(rule => {
      if (track[0].value == rule) { skip = true }
      else { rulestodelete.push(rule.id) }
    })
    if (rulestodelete.length > 0) {
      await client.v2.updateStreamRules({
        delete: {
          ids: rulestodelete
        }
      })
    }
  }
  if (!skip) {
    await client.v2.updateStreamRules({
      add: track
    })
  }
}

// buscando os tweets
String.prototype.has = function(term) {
  term = new RegExp(`[^0-9a-záàâãéèêíïóôõöúç@]+${term.toLowerCase()}[^0-9a-záàâãéèêíïóôõöúç@]+`, 'i')
  return term.test(` ${this.toLowerCase()} `)
}

String.prototype.deleteuser = function() {
  return (this.split(/[ \n]/).filter(word => !word.startsWith('@')).join(' '))
}

//retuita
function rt(meid, { text, id }) {
  text = text.deleteuser()
  let skip = true
  membros.forEach(membro => {
    termos.forEach(termo => {
      if (text.has(membro) && text.has(termo)) {
        skip = false
      }
      // console.log(membro, termo, skip) // teste
    })
  })
  filtros.forEach(filtro => {
    if (text.has(filtro)) {
      skip = true
    }
    // console.log(filtro, skip) // teste
  })
  console.log(`${text}\nhttps://twitter.com/i/status/${id}\n---------------------------------\n`) // teste
  if (!skip) {
    clientRT.v2.retweet(meid, id).catch(e => {
      console.log(e)
      if (channel) {
        channel.send(status + ': erro ao retuitar: \n' + e)
      }
    })
    //clientRT.v2.like(meid, id).catch(e => { console.log(e) })
  }
}

// atualiza o status na bio e no console
async function bioupdate() {
  console.log('online ' + status)
  if (channel) {
    channel.send('online ' + status).catch(e => { console.log(e) })
  }
  clientRT.v1.updateAccountProfile({
    description: `${bio}\n\n~ online ${status}`
  }).catch(e => {
    console.log(e)
    if (channel) {
      channel.send(status + ': erro ao alterar a bio: \n' + e)
    }
  })
}

function statusupdate() {
  const putzero = n => n.toLocaleString(undefined, { minimumIntegerDigits: 2 })
  let t = new Date(Date.now())
  t.setHours(t.getHours() - 3)
  let h = putzero(t.getHours())
  let m = putzero(t.getMinutes())
  let d = putzero(t.getDate())
  let me = putzero(t.getMonth() + 1)
  status = `${d}/${me} às ${h}h${m}m`
}

async function startStream() {
  const id = '1424861656383897600'
  statusupdate()
  bioupdate()
  statusupdate()
  await checkrules()
  client.v2.searchStream().then(async function (stream) {
    console.log(currentapp + ': deu bom')
    //stream.close();
    stream.autoReconnect = true;
    statusupdate()
    bioupdate()
    setInterval(statusupdate, 60000)
    setInterval(bioupdate, 600000)
    stream.on(ETwitterStreamEvent.Data, tweet => {
      if (channel) {
        channel.send(status + ': novo tweet')
      }
      rt(id, tweet.data)
    })
    stream.on(
      ETwitterStreamEvent.ConnectionError,
      err => {
        if (channel) { channel.send(status + ': erro de conexão:\n' + err).catch(e => { console.log(e) }) }
        stream = client.v2.searchStream()
      }
    )
    stream.on(
      ETwitterStreamEvent.ConnectionClosed,
      () => {
        if (channel) { channel.send(status + ': conexão encerrada???????').catch(e => { console.log(e) }) }
        stream = client.v2.searchStream()
      }
    )
  })
  .catch( err => {
    console.log(currentapp + ': deu ruim' + err)
    currentapp = currentapp ? 0 : 1
    client = new TwitterApi(apps[currentapp].bearer)
    //clientRT = new TwitterApi(apps[currentapp].tokens)
    startStream() 
  })
}

startStream()
