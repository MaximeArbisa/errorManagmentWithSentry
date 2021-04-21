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

// Import error helpers
const { ApplicationError, MUST_CONNECT, OPERATION_FORBIDDEN } = require('./error')

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

// Sync error handler
// Express will automatically catch this error
router.get('/syncError', (req, res, next) => {
  throw new ApplicationError(MUST_CONNECT)
})

// Async error handler
// Should be wrapped in a try catch, else won't be caught
router.get('/getGame/:userId', async (req, res, next) => {
  const { userId } = req.params

  try {
    const game = await getGameFromUser(userId)

    // Head to 404 handler
    if (!game) {
      return next()
    }

    if (userId !== res.locals.me._id) {
      throw new ApplicationError(OPERATION_FORBIDDEN)
    }

    res.send(game)
  } catch {
    next(err)
  }
})

// Erreur 404 => handler for unhandled next()
router.use((req, res, next) => {
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
      scope.setExtra('message', err.message)
    }

    // Capture error
    sentry.captureException(err)
  })

  const statusCode = err.custom ? err.code : 500
  res.sendStatus(statusCode)
})

// Export all controllers
module.exports = router
