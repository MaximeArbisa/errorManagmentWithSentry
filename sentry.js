const sentry = require('@sentry/node')

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

// Errors in synchronous handlers are catched by default by Express and sent to
// the error middleware.
// Asynchronous handlers should be wrapped in a try/catch so that the error is properly catched
// then sent to the error middleware through next(err)
// see: https://expressjs.com/en/guide/error-handling.html
const sentryErrorHandler = (err, req, res, next) => {
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
    if (err.lsError) {
      scope.setLevel(err.level)
    }

    // Capture error
    sentry.captureException(err)
  })

  // Proceed to the error middleware
  next(err)
}

module.exports = {
  sentryErrorHandler,
  sentry,
}
