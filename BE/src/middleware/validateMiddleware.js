const { ZodError } = require('zod');

/**
 * Reusable validation middleware factory.
 * Validates req.body (default) or req.query against a Zod schema,
 * mutating the request with the parsed + transformed data.
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = source === 'query' ? req.query : req.body;
      const parsed = schema.parse(data);

      if (source === 'query') {
        req.query = parsed;
      } else {
        req.body = parsed;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        return res.status(400).json({
          success: false,
          message: messages[0]?.message || 'Validation error',
          errors: messages,
        });
      }
      next(error);
    }
  };
};

module.exports = validate;
