const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Middleware to collect and return express-validator errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const messages = errors.array().map((e) => e.msg).join('. ');
        return next(new AppError(messages, 400));
    }
    next();
};

module.exports = { handleValidationErrors };
