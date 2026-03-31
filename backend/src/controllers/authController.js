const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const { createAuditLog } = require('../utils/auditLogger');

// Generate JWT token
const signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

const sendTokenResponse = (user, statusCode, res) => {
    const token = signToken(user._id);
    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user: {
                _id: user._id,
                name: user.name,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                permissions: user.permissions || [],
                department: user.department,
                phone: user.phone,
                profilePicture: user.profilePicture,
                status: user.status,
                isTempPassword: user.isTempPassword || false,
            },
        },
    });
};

// @desc   Register a new user
// @route  POST /api/auth/register
// @access Private (manager, director)
exports.register = asyncHandler(async (req, res, next) => {
    const { name, email, password, role, department } = req.body;

    if (!name || !email || !password || !role) {
        return next(new AppError('Name, email, password and role are required', 400));
    }

    const validRoles = ['employee', 'store_manager', 'manager', 'director'];
    if (!validRoles.includes(role)) {
        return next(new AppError('Invalid role', 400));
    }

    // Only director can create manager/director accounts
    if (['manager', 'director'].includes(role) && req.user.role !== 'director') {
        return next(new AppError('Only directors can create manager or director accounts', 403));
    }

    const user = await User.create({ name, email, password, role, department });

    await createAuditLog({
        action: `User created: ${user.name} (${user.role})`,
        performedBy: req.user._id,
    });

    sendTokenResponse(user, 201, res);
});

// @desc   Login
// @route  POST /api/auth/login
// @access Public
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new AppError('Please provide email and password', 400));
    }

    const user = await User.findOne({ email, isDeleted: { $ne: true } }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
        return next(new AppError('Invalid email or password', 401));
    }

    if (user.isDeleted) {
        return next(new AppError('This account has been deactivated', 401));
    }

    await createAuditLog({
        action: `User logged in: ${user.name}`,
        performedBy: user._id,
    });

    sendTokenResponse(user, 200, res);
});

// @desc   Get current user profile
// @route  GET /api/auth/me
// @access Private
exports.getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    res.status(200).json({ status: 'success', data: { user } });
});

// @desc   Update current user profile
// @route  PUT /api/auth/profile
// @access Private
exports.updateProfile = asyncHandler(async (req, res) => {
    const { phone, department, profilePicture } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
        return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    // Update allowed fields
    if (phone !== undefined) user.phone = phone;
    if (department !== undefined) user.department = department;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();

    await createAuditLog({
        action: `User profile updated: ${user.name}`,
        performedBy: req.user._id,
    });

    res.status(200).json({ status: 'success', data: { user } });
});
// @desc   Reset password (for temp password users)
// @route  PUT /api/auth/reset-password
// @access Private
exports.resetPassword = asyncHandler(async (req, res, next) => {
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
        return next(new AppError('Please provide new password and confirmation', 400));
    }

    if (newPassword !== confirmPassword) {
        return next(new AppError('Passwords do not match', 400));
    }

    if (newPassword.length < 6) {
        return next(new AppError('Password must be at least 6 characters', 400));
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
        return next(new AppError('User not found', 404));
    }

    user.password = newPassword;
    user.isTempPassword = false;
    await user.save();

    await createAuditLog({
        action: `User reset password: ${user.name}`,
        performedBy: user._id,
    });

    sendTokenResponse(user, 200, res);
});
