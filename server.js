import Discord from 'discord.js'
import express from 'express'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import axios from 'axios'
dotenv.config()

const {env: {DISCORD_TOKEN, PORT}} = process
const client = new Discord.Client()

const logAttendance = async message => {
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

client.on('message', async msg => msg.content === 'here' ? console.log(await logAttendance(msg)) : null)
client.login(DISCORD_TOKEN)
