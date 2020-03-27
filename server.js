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

  // build attendance structure
  Redis.set(`attendance#${channel}:${date}`, JSON.stringify({
    students: []
  }))
}

const closeAttendance = channel => Redis.get(
  `channel#${channel}_attendance`,
  (err, reply) => Redis.set(`channel#${channel}_attendance`, JSON.stringify({...JSON.parse(reply), status: 'late'}))
)

const endClass = channel => Redis.set(
  `channel#${channel}_attendance`,
  JSON.stringify({status: 'closed'})
)

const logAttendance = (channel, user, date) => {
  Redis.get(`channel#${channel}_attendance`, (err, reply) => {
    const data = JSON.parse(reply)

    Redis.get(`attendance#${channel}:${date}`, (err, reply) => {
      const attendance = JSON.parse(reply)
      if (!attendance) return

      const students = attendance.students
      const student = {
        id: user.user.id
      }

      if (user.nickname) student.name = user.nickname
      else student.name = user.user.username

      if (data.status === 'open') student.status = 'present'
      else if (data.status === 'late') student.status = 'late'

      if (student.status === 'present' || student.status === 'late') {
        // Only save if not already exists
        if (students.findIndex(student => student.id === user.user.id) === -1) {
          students.push(student)
          Redis.set(`attendance#${channel}:${date}`, JSON.stringify({students}))
        }
      }
    })
  })
}

const attendanceLog = (message, channel, date) => {
  Redis.get(`attendance#${channel}:${date}`, (err, reply) => {
    if (reply) {
      let attended = ''
      const students = JSON.parse(reply).students
      const onTime = students.filter(student => student.status === 'present')
        .map(student => student.name)
      const late = students.filter(student => student.status === 'late')
        .map(student => student.name)
      const ontimeString = onTime.length ? onTime.join('\n') : "Nobody has attended"
      const lateString = late.length ? late.join('\n') : "Nobody is late\n"
      attended = '**On time:**\n'
        + ontimeString
        + '\n\n**Late:**\n'
        + lateString
      message.author.send(attended)
    }
  })
}

const clearAttendance = (channel, date) => {
  Redis.del(`attendance#${channel}:${date}`)
}

/**
 * Express
 */
const app = express()
app.use(bodyParser.json())
app.post('/log', (req, res) => {
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
  const teacher = message.channel.guild ? message.channel.guild.roles.cache.filter(item => item.name === 'Teacher').first().id : null

  // If the member is a teacher, process teacher commands
  if (message.member) {
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
      else if (content === '/attendance log') attendanceLog(message, channel.id, today)
      else if (content === '/clear attendance') clearAttendance(channel.id, today)
    }
    if (content === 'here' || content === 'hizzle' || content === 'present') logAttendance(channel.id, message.member, today)
  }
})

client.login(DISCORD_TOKEN)
