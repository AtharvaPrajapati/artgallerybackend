export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const code = err.code || (status === 400 ? 'BAD_REQUEST' : 'INTERNAL_ERROR');

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  } else {
    console.error(`[${code}] ${err.message}`);
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message: status === 500 && process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message || 'Request failed',
      details: err.details || undefined,
    },
  });
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
