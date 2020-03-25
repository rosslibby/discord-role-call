import Discord from 'discord.js'
import redis from 'redis'
import express from 'express'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import axios from 'axios'
dotenv.config()

const {env: {DISCORD_TOKEN, PORT, REDIS_URL}} = process
const client = new Discord.Client()

/**
 * Redis
 */
const Redis = redis.createClient(REDIS_URL)
Redis.on('error', err => console.log(err))
Redis.on('connect', () => console.log('redis has connected'))

const startClass = (channel, date) => {
  Redis.set(`channel#${channel}_attendance`, JSON.stringify({
    status: 'open',
    id: `${channel}:${date}`
  }))
}

const closeAttendance = channel => {
  Redis.get(`channel#${channel}_attendance`, (err, reply) => Redis.set(`channel#${channel}_attendance`, JSON.stringify({...JSON.parse(reply), status: 'late'})))
}

const endClass = channel => Redis.set(`channel#${channel}_attendance`, JSON.stringify({status: 'closed'}))

const trackStudent = (channel, user) => {
  console.log(channel)
  console.log(user)
  Redis.get(`channel_#${channel}`, (err, reply) => console.log(reply))
}

const logAttendance = async message => {
  Redis.set(`channel_#${message.channel.id}`)
  const response = await axios({
    url: 'http://localhost:8080/log',
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    data: {
      channelId: message.channel.id,
      channel: message.channel.name,
      user: message.author.username + '#' + message.author.discriminator
    }
  }).then(async res => await res)
  .catch(async err => await err)

  return response.data
}

/**
 * Express
 */
const app = express()
app.use(bodyParser.json())
app.post('/log', (req, res) => {
  console.log(req.body)
  res.send('Logged in style')
})
app.listen(PORT, () => console.log(`Listening on ${PORT}`))

client.on('ready', () => console.log(`Loggedin as ${client.user.tag}!`))

client.on('message', async message => {
  const {content, channel} = message
  const date = new Date()
  const day = date.getDate() > 9 ? date.getDate() : `0${date.getDate()}`
  const month = date.getMonth() > 9 ? date.getMonth() : `0${date.getMonth()}`
  const today = `${date.getFullYear()}${month}${day}`

  // Determine the teacher role ID
  const teacher = message.channel.guild.roles.cache.filter(item => item.name === 'Teacher').first().id

  // If the member is a teacher, process teacher commands
  if (message.member._roles.findIndex(role => role === teacher) > -1) {
    // Determine which command teacher is using
    if (content === '/start class'
      || content === '/startclass'
      || content === 'start class'
      || content === 'attendance'
      || content === '/attendance'
      || content === '/rolecall') startClass(channel.id, today)
    else if (content === '/close attendance') closeAttendance(channel.id)
    else if (content === '/end class') endClass(channel.id)
  } else {
    if (content === 'here' || content === 'hizzle' || content === 'present') trackStudent(channel.id, message.member.user.id)
  }
})

// client.on('message', async msg => msg.content === 'here' ? console.log(await logAttendance(msg)) : null)
client.login(DISCORD_TOKEN)
