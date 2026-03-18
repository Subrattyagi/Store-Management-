const { body } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const ExitClearance = require('../models/ExitClearance');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const { handleValidationErrors } = require('../middleware/validate');
const { createAuditLog } = require('../utils/auditLogger');
const { createNotification, notifyRole } = require('../utils/notificationService');

// @desc   Manager initiates exit clearance for an employee
// @route  POST /api/exit-clearance
// @access Private (manager)
exports.initiateClearance = [
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    handleValidationErrors,
    asyncHandler(async (req, res, next) => {
        const { employeeId, remarks } = req.body;

        const employee = await User.findById(employeeId);
        if (!employee || employee.role !== 'employee') {
            return next(new AppError('Employee not found or user is not an employee', 404));
        }

        // Check if clearance already exists
        const existing = await ExitClearance.findOne({ employee: employeeId });
        if (existing) {
            return next(new AppError('Exit clearance has already been initiated for this employee', 400));
        }

        // Check for active issued assets
        const activeAssignments = await Assignment.find({ employee: employeeId, status: 'issued' });
        const clearanceStatus = activeAssignments.length > 0 ? 'blocked' : 'pending';

        const clearance = await ExitClearance.create({
            employee: employeeId,
            initiatedBy: req.user._id,
            status: clearanceStatus,
            remarks: clearanceStatus === 'blocked'
                ? `Blocked: ${activeAssignments.length} asset(s) still issued`
                : remarks,
        });

        // Update employee status to 'exiting'
        employee.status = 'exiting';
        await employee.save();

        await createAuditLog({
            action: `Exit clearance initiated for ${employee.name}. Status: ${clearanceStatus}`,
            performedBy: req.user._id,
        });

        // Notify the employee their exit process has started
        await createNotification({
            recipient: employeeId,
            type: 'exit_clearance_initiated',
            title: 'Exit Clearance Initiated',
            message: `Your exit clearance process has been started. Status: ${clearanceStatus}`,
            link: '/employee/exit-status',
        });

        // Notify directors about the exit clearance
        await notifyRole({
            role: 'director',
            type: 'exit_clearance_initiated',
            title: 'Exit Clearance Initiated',
            message: `Exit clearance for ${employee.name} has been initiated (${clearanceStatus})`,
            link: '/director/exit-approvals',
        });

        // Notify store managers to check asset returns
        await notifyRole({
            role: 'store_manager',
            type: 'exit_clearance_initiated',
            title: 'Employee Exit — Check Assets',
            message: `${employee.name} is exiting. Please verify all asset returns`,
            link: '/store-manager/returns',
        });

        const populated = await ExitClearance.findById(clearance._id)
            .populate('employee', 'name email department')
            .populate('initiatedBy', 'name email');

        res.status(201).json({ status: 'success', data: { clearance: populated } });
    }),
];

// @desc   Get all exit clearances
// @route  GET /api/exit-clearance
// @access Private (manager, director)
exports.getClearances = asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const clearances = await ExitClearance.find(filter)
        .populate('employee', 'name email department status')
        .populate('initiatedBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort('-createdAt');

    res.status(200).json({ status: 'success', results: clearances.length, data: { clearances } });
});

// @desc   Employee views their own clearance status
// @route  GET /api/exit-clearance/me
// @access Private (employee)
exports.getMyClearance = asyncHandler(async (req, res, next) => {
    const clearance = await ExitClearance.findOne({ employee: req.user._id })
        .populate('employee', 'name email department')
        .populate('approvedBy', 'name email');

    if (!clearance) {
        return res.status(200).json({ status: 'success', data: { clearance: null, message: 'No exit clearance initiated' } });
    }

    res.status(200).json({ status: 'success', data: { clearance } });
});

// @desc   Director approves exit clearance
// @route  PATCH /api/exit-clearance/:id/approve
// @access Private (director)
exports.approveClearance = asyncHandler(async (req, res, next) => {
    const { remarks } = req.body;

    const clearance = await ExitClearance.findById(req.params.id).populate('employee');
    if (!clearance) return next(new AppError('Exit clearance record not found', 404));

    if (clearance.status === 'cleared') {
        return next(new AppError('This clearance has already been approved', 400));
    }

    // Check for still-issued assets
    const activeAssignments = await Assignment.find({
        employee: clearance.employee._id,
        status: { $in: ['issued', 'return_requested'] },
    });

    if (activeAssignments.length > 0 && !remarks) {
        return next(
            new AppError(
                `Employee has ${activeAssignments.length} active assignment(s). A mandatory remark is required to override.`,
                400
            )
        );
    }

    clearance.status = 'cleared';
    clearance.approvedBy = req.user._id;
    if (remarks) clearance.remarks = remarks;
    await clearance.save();

    // Update employee status to cleared
    clearance.employee.status = 'cleared';
    await clearance.employee.save();

    await createAuditLog({
        action: `Exit clearance approved for ${clearance.employee.name}${activeAssignments.length > 0 ? ' (override with remark)' : ''}`,
        performedBy: req.user._id,
    });

    // Notify the employee they are cleared
    await createNotification({
        recipient: clearance.employee._id,
        type: 'exit_clearance_approved',
        title: 'Exit Clearance Approved',
        message: 'Your exit clearance has been approved by the director. You are cleared to exit.',
        link: '/employee/exit-status',
    });

    res.status(200).json({ status: 'success', message: 'Employee cleared for exit', data: { clearance } });
});

// @desc   Director rejects exit clearance
// @route  PATCH /api/exit-clearance/:id/reject
// @access Private (director)
exports.rejectClearance = [
    body('remarks').trim().notEmpty().withMessage('Remarks are mandatory for rejection'),
    handleValidationErrors,
    asyncHandler(async (req, res, next) => {
        const clearance = await ExitClearance.findById(req.params.id).populate('employee');
        if (!clearance) return next(new AppError('Exit clearance record not found', 404));

        if (clearance.status === 'cleared') {
            return next(new AppError('Cannot reject an already cleared exit', 400));
        }

        clearance.status = 'blocked';
        clearance.approvedBy = req.user._id;
        clearance.remarks = req.body.remarks;
        await clearance.save();

        await createAuditLog({
            action: `Exit clearance rejected for ${clearance.employee.name}: ${req.body.remarks}`,
            performedBy: req.user._id,
        });

        // Notify the employee their clearance was rejected
        await createNotification({
            recipient: clearance.employee._id,
            type: 'exit_clearance_rejected',
            title: 'Exit Clearance Rejected',
            message: `Your exit clearance was rejected. Reason: ${req.body.remarks}`,
            link: '/employee/exit-status',
        });

        res.status(200).json({ status: 'success', message: 'Exit clearance rejected', data: { clearance } });
    }),
];
