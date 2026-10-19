export function validateQuery(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: parsed.error.flatten(),
        },
      });
    }
    req.validatedQuery = parsed.data;
    next();
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid path parameters',
          details: parsed.error.flatten(),
        },
      });
    }
    req.validatedParams = parsed.data;
    next();
  };
}

export function requireAdminKey(req, res, next) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || expected === 'change-me-to-a-long-random-string') {
    return res.status(503).json({
      success: false,
      error: {
        code: 'ADMIN_DISABLED',
        message: 'Write operations are disabled until ADMIN_API_KEY is configured',
      },
    });
  }

  const provided = req.header('x-admin-api-key');
  if (provided !== expected) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Valid admin API key required',
      },
    });
  }

  next();
}
