// server config
var status = '...'
const express = require('express')
const app = express();
app.get('/', (request, response) => {
  response.send(status)
})
app.listen(process.env.PORT);

// discord config
const { Client, GatewayIntentBits } = require('discord.js')
const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
})
bot.login(process.env.DISCORDTOKEN)
var channel = false
bot.on('ready', () => {
  console.log('discord bot ready')
  channel = bot.channels.cache.get('1023386548739252304')
})

// twitter config
const { TwitterApi, ETwitterStreamEvent } = require('twitter-api-v2');
const client = new TwitterApi(process.env.BearerToken)
const clientRT = new TwitterApi({
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
  let rules = await client.v2.streamRules()
  if (rules.data) {
    await client.v2.updateStreamRules({
      delete: {
        ids: rules.data.map(rule => rule.id)
      }
    })
  }
  await client.v2.updateStreamRules({
    add: track
  })
}

// buscando os tweets
async function startStream() {
  await checkrules()
  const stream = await client.v2.searchStream()
  stream.on(ETwitterStreamEvent.Data, tweet => {
    rt(tweet.data)
  })
  statusupdate()
  setInterval(statusupdate, 300000)
}

//retuita
async function rt({ text, id }) {
  text = text.toLowerCase()
  let skip = true
  membros.forEach(membro => {
    termos.forEach(termo => {
      if (text.includes(membro.toLowerCase()) && text.includes(termo.toLowerCase())) {
        skip = false
      } 
    })
  })
  filtros.forEach(filtro => {
    if(text.includes(filtro.toLowerCase())) {
      skip = true
    }
  })
  if(!skip) {
    const me = await clientRT.v2.me()
    clientRT.v2.retweet(me.data.id, id).catch(e => { console.log(e) })
    clientRT.v2.like(me.data.id, id).catch(e => { console.log(e) })
    if (channel) {
      channel.send(
        `${text.replace('https://', '')}\n` +
        `https://twitter.com/i/status/${tweet.id_str}`
      )
    }
  }
}

// atualiza o status na bio e no console
async function statusupdate() {
  const putzero = n => n.toLocaleString(undefined, { minimumIntegerDigits: 2 })
  let t = new Date(Date.now())
  t.setHours(t.getHours() - 3)
  let h = putzero(t.getHours())
  let m = putzero(t.getMinutes())
  let d = putzero(t.getDate())
  let me = putzero(t.getMonth() + 1)
  status = `online ${d}/${me} às ${h}h${m}m`
  console.log(status)
  clientRT.v1.updateAccountProfile({
    description: `${bio}\n\n~ ${status}`
  }).catch(e => { console.log(e) })
}

if (value.length < 513) { startStream() }
else { console.log('por favor, remova alguns termos') }
