import express from 'express'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
dotenv.config()

const {env: {PORT}} = process

const app = express()
app.use(bodyParser.json())

app.get('/', (req, res) => res.send('Welcome to Discord bot world'))

app.listen(PORT, () => console.log(`Listening on ${PORT}`))
