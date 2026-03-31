const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const { sendWelcomeEmail } = require('../services/emailService');

// Generate temp password: 10 readable chars
const generateTempPassword = () => {
    return crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) +
        Math.floor(10 + Math.random() * 90); // ensure at least 2 digits
};

// ─── Admin Login ─────────────────────────────────────────────────────────────
// @desc   Admin login via env credentials (not DB-stored)
// @route  POST /api/admin/login
// @access Public
exports.adminLogin = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new AppError('Please provide email and password', 400));
    }

    if (
        email !== process.env.ADMIN_EMAIL ||
        password !== process.env.ADMIN_PASSWORD
    ) {
        return next(new AppError('Invalid admin credentials', 401));
    }

    // Sign a JWT with admin role — no DB record needed
    const token = jwt.sign(
        { role: 'admin', email: process.env.ADMIN_EMAIL, isAdminToken: true },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(200).json({
        status: 'success',
        token,
        data: {
            user: {
                role: 'admin',
                email: process.env.ADMIN_EMAIL,
                name: 'Admin',
            },
        },
    });
});

// ─── Create Employee ──────────────────────────────────────────────────────────
// @desc   Create a new employee with temp password and send welcome email
// @route  POST /api/admin/employees
// @access Private (admin only)
exports.createEmployee = asyncHandler(async (req, res, next) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        return next(new AppError('Full name and email are required', 400));
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
        return next(new AppError('A user with this email already exists', 409));
    }

    const tempPassword = generateTempPassword();

    const employee = await User.create({
        name: fullName,
        fullName,
        email: email.toLowerCase(),
        password: tempPassword,
        role: 'employee',
        isTempPassword: true,
    });

    try {
        await sendWelcomeEmail(fullName, email, tempPassword);
    } catch (emailErr) {
        console.error('Email sending failed:', emailErr.message);
    }

    res.status(201).json({
        status: 'success',
        message: 'Employee created successfully. Welcome email sent.',
        data: {
            employee: {
                _id: employee._id,
                fullName: employee.fullName,
                name: employee.name,
                email: employee.email,
                role: employee.role,
                isTempPassword: employee.isTempPassword,
                createdAt: employee.createdAt,
            },
        },
    });
});

// ─── Get Employees ────────────────────────────────────────────────────────────
exports.getEmployees = asyncHandler(async (req, res) => {
    const employees = await User.find({ role: 'employee', isDeleted: { $ne: true } })
        .select('fullName name email role isTempPassword status createdAt')
        .sort({ createdAt: -1 });

    res.status(200).json({
        status: 'success',
        results: employees.length,
        data: { employees },
    });
});

// ─── Delete Employee ──────────────────────────────────────────────────────────
exports.deleteEmployee = asyncHandler(async (req, res, next) => {
    const employee = await User.findOneAndDelete({ _id: req.params.id, role: 'employee' });

    if (!employee) {
        return next(new AppError('Employee not found', 404));
    }

    res.status(200).json({
        status: 'success',
        message: `Employee "${employee.fullName || employee.name}" deleted successfully.`,
    });
});

// ─── Create Manager ───────────────────────────────────────────────────────────
// @desc   Create a new manager with permissions and send welcome email
// @route  POST /api/admin/managers
// @access Private (admin only)
exports.createManager = asyncHandler(async (req, res, next) => {
    const { fullName, email, permissions = [] } = req.body;

    if (!fullName || !email) {
        return next(new AppError('Full name and email are required', 400));
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
        return next(new AppError('A user with this email already exists', 409));
    }

    const tempPassword = generateTempPassword();

    const manager = await User.create({
        name: fullName,
        fullName,
        email: email.toLowerCase(),
        password: tempPassword,
        role: 'manager',
        permissions,
        isTempPassword: true,
    });

    try {
        await sendWelcomeEmail(fullName, email, tempPassword);
    } catch (emailErr) {
        console.error('Email sending failed:', emailErr.message);
    }

    res.status(201).json({
        status: 'success',
        message: 'Manager created successfully. Welcome email sent.',
        data: {
            manager: {
                _id: manager._id,
                fullName: manager.fullName,
                name: manager.name,
                email: manager.email,
                role: manager.role,
                permissions: manager.permissions,
                isTempPassword: manager.isTempPassword,
                createdAt: manager.createdAt,
            },
        },
    });
});

// ─── Get Managers ─────────────────────────────────────────────────────────────
exports.getManagers = asyncHandler(async (req, res) => {
    const managers = await User.find({ role: 'manager', isDeleted: { $ne: true } })
        .select('fullName name email role permissions isTempPassword status createdAt')
        .sort({ createdAt: -1 });

    res.status(200).json({
        status: 'success',
        results: managers.length,
        data: { managers },
    });
});

// ─── Delete Manager ───────────────────────────────────────────────────────────
exports.deleteManager = asyncHandler(async (req, res, next) => {
    const manager = await User.findOneAndDelete({ _id: req.params.id, role: 'manager' });

    if (!manager) {
        return next(new AppError('Manager not found', 404));
    }

    res.status(200).json({
        status: 'success',
        message: `Manager "${manager.fullName || manager.name}" deleted successfully.`,
    });
});

// ─── Create Store Manager ─────────────────────────────────────────────────────
// @desc   Create a new store manager and send welcome email
// @route  POST /api/admin/store-managers
// @access Private (admin only)
exports.createStoreManager = asyncHandler(async (req, res, next) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        return next(new AppError('Full name and email are required', 400));
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
        return next(new AppError('A user with this email already exists', 409));
    }

    const tempPassword = generateTempPassword();

    const storeManager = await User.create({
        name: fullName,
        fullName,
        email: email.toLowerCase(),
        password: tempPassword,
        role: 'store_manager',
        isTempPassword: true,
    });

    try {
        await sendWelcomeEmail(fullName, email, tempPassword);
    } catch (emailErr) {
        console.error('Email sending failed:', emailErr.message);
    }

    res.status(201).json({
        status: 'success',
        message: 'Store Manager created successfully. Welcome email sent.',
        data: {
            storeManager: {
                _id: storeManager._id,
                fullName: storeManager.fullName,
                name: storeManager.name,
                email: storeManager.email,
                role: storeManager.role,
                isTempPassword: storeManager.isTempPassword,
                createdAt: storeManager.createdAt,
            },
        },
    });
});

// ─── Get Store Managers ───────────────────────────────────────────────────────
exports.getStoreManagers = asyncHandler(async (req, res) => {
    const storeManagers = await User.find({ role: 'store_manager', isDeleted: { $ne: true } })
        .select('fullName name email role isTempPassword status createdAt')
        .sort({ createdAt: -1 });

    res.status(200).json({
        status: 'success',
        results: storeManagers.length,
        data: { storeManagers },
    });
});

// ─── Delete Store Manager ─────────────────────────────────────────────────────
exports.deleteStoreManager = asyncHandler(async (req, res, next) => {
    const storeManager = await User.findOneAndDelete({ _id: req.params.id, role: 'store_manager' });

    if (!storeManager) {
        return next(new AppError('Store Manager not found', 404));
    }

    res.status(200).json({
        status: 'success',
        message: `Store Manager "${storeManager.fullName || storeManager.name}" deleted successfully.`,
    });
});
