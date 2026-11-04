export function notFound(req, res) {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Central error handler. Every failure leaves the API as JSON in the same
 * shape the React client expects: { message, errors? }.
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let errors = Array.isArray(err.errors) ? err.errors : undefined;

  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.name === 'ValidationError') {
    status = 422;
    errors = Object.values(err.errors).map((error) => ({
      field: error.path,
      message: error.message,
    }));
    message = errors[0]?.message || 'Validation failed';
  } else if (err.code === 11000) {
    status = 409;
    message = 'A subscription with those details already exists';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body must be valid JSON';
  }

  if (status >= 500) {
    // Log the detail server-side, but never hand driver/stack text to the
    // client: it can describe the database host, credentials or internals.
    console.error('[error]', err);
    status = 500;
    message = 'Internal server error';
    errors = undefined;
  }

  res.status(status).json({ message, ...(errors ? { errors } : {}) });
}
