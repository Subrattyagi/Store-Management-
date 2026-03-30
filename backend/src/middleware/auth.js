const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const User = require('../models/User');

/**
 * Middleware: Verify JWT and attach req.user
 * Handles both regular users (DB lookup) and admin tokens (env-based, no DB)
 */
const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return next(new AppError('Invalid or expired token. Please log in again.', 401));
    }

    // Admin tokens are not DB-stored — short circuit
    if (decoded.isAdminToken && decoded.role === 'admin') {
        req.user = { role: 'admin', email: decoded.email, name: 'Admin', isAdminToken: true };
        return next();
    }

    const currentUser = await User.findOne({ _id: decoded.id, isDeleted: { $ne: true } }).select('+password');
    if (!currentUser) {
        return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    req.user = currentUser;
    next();
});

module.exports = { protect };
