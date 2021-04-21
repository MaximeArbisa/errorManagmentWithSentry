// Set Router
const express = require('express')
const router = express.Router()
const sentry = require('@sentry/node')

// Load Models and Middlewares
const User = require('../models/user')

// Init Sentry
sentry.init({
  dsn: 'dsnProvidedBySentry',
  environment: process.env.NODE_ENV || 'development',
  attachStacktrace: true,
  release: '1.0.0',
})

// Set extra tags for the sentry instance
sentry.configureScope((scope) => {
  scope.setTag('service', 'api')
})

// Import Sentry plugins
const { ApplicationError, MUST_CONNECT } = require('./error')

// Controllers
router.use(sentry.Handlers.requestHandler())

// Connection middleware
router.use(async (req, res, next) => {
  try {
    // If no existing session
    if (!req.userSession || !req.userSession.user) {
      return next()
    }

    // Get user by URL
    const me = await User.findOne({ url: req.userSession.user })
    if (!me) {
      return next()
    }

    // Store me for later use
    req.userSession.user = me.url
    res.locals.me = me

    next()
  } catch (err) {
    next(err)
  }
})

router.get('/connect', (req, res, next) => {
  try {
    // If already connected
    if (res.locals.me) {
      return res.redirect('/')
    }

    const data = {
      ...res.locals.data,
      head: '../head/en/connect',
      redirect: req.userSession.redirect,
      connect: 1,
    }

    res.render(`${data.lang}/connect.ejs`, { data })
  } catch (err) {
    next(err)
  }
})

// Erreur 404 => handler for unhandled next()
router.use(async (req, res, next) => {
  try {
    res.sendStatus(404)
  } catch (err) {
    next(err)
  }
})

// Error middleware => next(err)

// Errors in synchronous handlers are catched by default by Express and sent to
// the error middleware.
// Asynchronous handlers should be wrapped in a try/catch so that the error is properly catched
// then sent to the error middleware through next(err)
// see: https://expressjs.com/en/guide/error-handling.html

router.use((err, req, res) => {
  // Set extra tags for this sentry event (not the instance)
  sentry.withScope((scope) => {
    // Set user
    if (res.locals.me) {
      const me = res.locals.me

      scope.setUser({
        id: me._id,
        username: me.url,
        email: me.mail,
      })
    }

    // Check if custom error
    if (err.custom) {
      scope.setLevel(err.level)
    }

    // Capture error
    sentry.captureException(err)
  })

  const statusCode = err.custom ? err.code : 500
  res.sendStatus(statusCode)
})

// Export all controllers
module.exports = router
