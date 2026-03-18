const { body, param } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const { handleValidationErrors } = require('../middleware/validate');
const { createAuditLog } = require('../utils/auditLogger');

// @desc   Get all users
// @route  GET /api/users
// @access Private (manager, director)
exports.getUsers = asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.department) filter.department = req.query.department;
    if (req.query.status) filter.status = req.query.status;

    const users = await User.find(filter).sort('-createdAt');
    res.status(200).json({ status: 'success', results: users.length, data: { users } });
});

// @desc   Get single user
// @route  GET /api/users/:id
// @access Private (manager, director)
exports.getUser = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('User not found', 404));
    res.status(200).json({ status: 'success', data: { user } });
});

// @desc   Update user role
// @route  PATCH /api/users/:id/role
// @access Private (director only)
exports.updateRole = [
    body('role').isIn(['employee', 'store_manager', 'manager', 'director']).withMessage('Invalid role'),
    handleValidationErrors,
    asyncHandler(async (req, res, next) => {
        const user = await User.findById(req.params.id);
        if (!user) return next(new AppError('User not found', 404));

        const previousRole = user.role;
        user.role = req.body.role;
        await user.save();

        await createAuditLog({
            action: `Role updated: ${user.name} from ${previousRole} to ${user.role}`,
            performedBy: req.user._id,
        });

        res.status(200).json({ status: 'success', data: { user } });
    }),
];

// @desc   Update user status
// @route  PATCH /api/users/:id/status
// @access Private (manager, director)
exports.updateStatus = [
    body('status').isIn(['active', 'exiting', 'cleared']).withMessage('Invalid status'),
    handleValidationErrors,
    asyncHandler(async (req, res, next) => {
        const user = await User.findById(req.params.id);
        if (!user) return next(new AppError('User not found', 404));

        const prevStatus = user.status;
        user.status = req.body.status;
        await user.save();

        await createAuditLog({
            action: `User status updated: ${user.name} from ${prevStatus} to ${user.status}`,
            performedBy: req.user._id,
        });

        res.status(200).json({ status: 'success', data: { user } });
    }),
];

// @desc   Soft delete user
// @route  DELETE /api/users/:id
// @access Private (director only)
exports.deleteUser = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('User not found', 404));

    user.isDeleted = true;
    await user.save();

    await createAuditLog({
        action: `User soft-deleted: ${user.name}`,
        performedBy: req.user._id,
    });

    res.status(200).json({ status: 'success', message: 'User deactivated successfully' });
});
