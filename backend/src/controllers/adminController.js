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

    // Check for duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
        return next(new AppError('An employee with this email already exists', 409));
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

    // Send welcome email
    try {
        await sendWelcomeEmail(fullName, email, tempPassword);
    } catch (emailErr) {
        console.error('Email sending failed:', emailErr.message);
        // Don't fail the request if email fails — employee is still created
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
// @desc   Get all employees
// @route  GET /api/admin/employees
// @access Private (admin only)
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
// @desc   Permanently delete an employee (allows re-creating with same email)
// @route  DELETE /api/admin/employees/:id
// @access Private (admin only)
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

