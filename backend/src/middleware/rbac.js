const AppError = require('../utils/AppError');

/**
 * Role-Based Access Control middleware
 * Usage: authorize('manager', 'director')
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    `Access denied. Role '${req.user.role}' is not authorized for this action.`,
                    403
                )
            );
        }
        next();
    };
};

module.exports = { authorize };
