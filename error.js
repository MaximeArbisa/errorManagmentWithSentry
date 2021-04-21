const deepFreeze = require('deep-freeze')

// Custom error class
class ApplicationError extends Error {
  /**
   * Extend normal error class
   * @param {Object} errorType - custom error type (defined below)
   * @returns {Promise}
   */
  constructor(errorType, ...params) {
    const { code, level, description } = errorType

    // Passer les arguments restants (incluant ceux spécifiques au vendeur) au constructeur parent
    super(...params)

    // Maintenir dans la pile une trace adéquate de l'endroit où l'erreur a été déclenchée (disponible seulement en V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApplicationError)
    }

    // Custom properties
    this.custom = true
    this.code = code
    this.level = level || 'error'
    this.message = `${code} - ${description}` // overrides default value
  }
}

module.exports = deepFreeze({
  ApplicationError,

  OPERATION_FORBIDDEN: {
    code: 403,
    level: 'warning',
    description: 'Forbidden operation',
  },
  MODEL_NOT_FOUND: {
    code: 404,
    level: 'warning',
    description: 'Model not found',
  },
  MUST_CONNECT: {
    code: 420,
    level: 'error',
    description: 'User must connect',
  },
})
