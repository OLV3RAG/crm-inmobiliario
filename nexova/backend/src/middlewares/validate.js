import { sanitizeInput } from '../utils/sanitize.js';

export function validate(schema) {
  return (req, res, next) => {
    const target = {
      body: sanitizeInput(req.body),
      query: sanitizeInput(req.query),
      params: sanitizeInput(req.params),
    };
    req.body = target.body;
    req.query = target.query;
    req.params = target.params;

    const { error, value } = schema.validate(
      { body: req.body, query: req.query, params: req.params },
      { abortEarly: false, stripUnknown: true }
    );
    if (error) {
      return res.status(400).json({
        error: 'Validación fallida',
        details: error.details.map((d) => d.message),
      });
    }
    if (value.body) req.body = value.body;
    if (value.query) req.query = value.query;
    if (value.params) req.params = value.params;
    next();
  };
}
