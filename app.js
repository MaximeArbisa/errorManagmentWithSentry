////// APP.JS - glues all together

// Librairies
const express = require('express')
const cookieParser = require('cookie-parser')
const helmet = require('helmet') // For secure HTTP headers

// Create app
const app = express()

// Init config
const port = process.env.PORT || 3000

// Security
app.disable('x-powered-by') // Remove Express notification
app.use(helmet()) // Use secure HTTP headers + deny requests from other domains

// Load middlewares and controllers
// Middlewares
app.use(cookieParser()) // Use cookie parser
app.enable('trust proxy') // To get user IP or HTTP protocol, behind Nginx proxy (else would get Nginx ones)

app.listen(port, function () {
  console.log('Listening on port ' + port)
})

app.use(require('./controllers'))
