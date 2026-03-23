const { body } = require('express-validator');
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Assignment = require('../models/Assignment');
const Asset = require('../models/Asset');
const User = require('../models/User');
const { handleValidationErrors } = require('../middleware/validate');
const { createAuditLog } = require('../utils/auditLogger');
const { validateTransition } = require('../utils/stateMachine');
const { createNotification, notifyRole } = require('../utils/notificationService');

// @desc   Issue asset to employee (manager)
// @route  POST /api/assignments
// @access Private (manager)
exports.createAssignment = [
    body('assetId').notEmpty().withMessage('Asset ID is required'),
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    handleValidationErrors,
    asyncHandler(async (req, res, next) => {
        const { assetId, employeeId } = req.body;

        // Validate asset exists and is available
        const asset = await Asset.findById(assetId);
        if (!asset) return next(new AppError('Asset not found', 404));
        if (asset.status !== 'available') {
            return next(new AppError(`Asset is not available. Current status: ${asset.status}`, 400));
        }

        // Validate employee exists
        const employee = await User.findById(employeeId);
        if (!employee || employee.role !== 'employee') {
            return next(new AppError('Employee not found or invalid role', 404));
        }

        // Check for existing active assignment (extra safety)
        const existingAssignment = await Assignment.findOne({ asset: assetId, status: 'issued' });
        if (existingAssignment) {
            return next(new AppError('Asset is already actively issued to another employee', 400));
        }

        // MongoDB Transaction: create assignment + update asset status atomically
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const [assignment] = await Assignment.create(
                [{ asset: assetId, employee: employeeId, assignedBy: req.user._id, status: 'issued' }],
                { session }
            );

            validateTransition(asset.status, 'issued');
            asset.status = 'issued';
            await asset.save({ session });

            await session.commitTransaction();

            await createAuditLog({
                action: `Asset issued: ${asset.name} to ${employee.name}`,
                performedBy: req.user._id,
                asset: asset._id,
                previousStatus: 'available',
                newStatus: 'issued',
            });

            // Notify employee about direct asset assignment
            await createNotification({
                recipient: employeeId,
                type: 'asset_request_assigned',
                title: 'Asset Issued to You',
                message: `${asset.name} (${asset.serialNumber}) has been issued to you by your manager`,
                link: '/employee/assets',
            });

            const populated = await Assignment.findById(assignment._id)
                .populate('asset', 'name serialNumber category')
                .populate('employee', 'name email department')
                .populate('assignedBy', 'name email');

            res.status(201).json({ status: 'success', data: { assignment: populated } });
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }),
];

// @desc   Get assignments (role-filtered)
// @route  GET /api/assignments
// @access Private (all roles)
exports.getAssignments = asyncHandler(async (req, res) => {
    const filter = {};

    // Employees can only see their own assignments
    if (req.user.role === 'employee') {
        filter.employee = req.user._id;
    } else {
        if (req.query.employeeId) filter.employee = req.query.employeeId;
        if (req.query.assetId) filter.asset = req.query.assetId;
    }
    if (req.query.status) filter.status = req.query.status;

    const assignments = await Assignment.find(filter)
        .populate('asset', 'name serialNumber category status condition')
        .populate('employee', 'name email department')
        .populate('assignedBy', 'name email')
        .sort('-createdAt');

    res.status(200).json({ status: 'success', results: assignments.length, data: { assignments } });
});

// @desc   Get single assignment
// @route  GET /api/assignments/:id
// @access Private (all roles)
exports.getAssignment = asyncHandler(async (req, res, next) => {
    const assignment = await Assignment.findById(req.params.id)
        .populate('asset', 'name serialNumber category status condition')
        .populate('employee', 'name email department')
        .populate('assignedBy', 'name email');

    if (!assignment) return next(new AppError('Assignment not found', 404));

    // Employees can only see their own
    if (req.user.role === 'employee' && assignment.employee._id.toString() !== req.user._id.toString()) {
        return next(new AppError('Not authorized to view this assignment', 403));
    }

    res.status(200).json({ status: 'success', data: { assignment } });
});

// @desc   Employee raises return request
// @route  POST /api/assignments/:id/return-request
// @access Private (employee)
exports.requestReturn = asyncHandler(async (req, res, next) => {
    const assignment = await Assignment.findById(req.params.id).populate('asset');
    if (!assignment) return next(new AppError('Assignment not found', 404));

    if (assignment.employee.toString() !== req.user._id.toString()) {
        return next(new AppError('You can only request return for your own assets', 403));
    }

    if (assignment.status !== 'issued') {
        return next(new AppError(`Cannot request return. Assignment status: ${assignment.status}`, 400));
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        assignment.status = 'return_requested';
        await assignment.save({ session });

        const asset = assignment.asset;
        validateTransition(asset.status, 'return_requested');
        asset.status = 'return_requested';
        await asset.save({ session });

        await session.commitTransaction();

        await createAuditLog({
            action: `Return requested for asset: ${asset.name}`,
            performedBy: req.user._id,
            asset: asset._id,
            previousStatus: 'issued',
            newStatus: 'return_requested',
        });

        // Notify store managers about return request
        await notifyRole({
            role: 'store_manager',
            type: 'return_requested',
            title: 'Asset Return Requested',
            message: `${req.user.name} has requested to return ${asset.name} (${asset.serialNumber})`,
            link: '/store-manager/returns',
        });

        res.status(200).json({ status: 'success', message: 'Return request submitted successfully' });
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
});

// @desc   Store manager approves physical return
// @route  PATCH /api/assignments/:id/approve-return
// @access Private (store_manager)
exports.approveReturn = [
    body('returnCondition').isIn(['new', 'good', 'minor_damage', 'major_damage', 'retired']).withMessage('Return condition required'),
    handleValidationErrors,
    asyncHandler(async (req, res, next) => {
        const { returnCondition, notes } = req.body;
        const assignment = await Assignment.findById(req.params.id).populate('asset');
        if (!assignment) return next(new AppError('Assignment not found', 404));

        if (assignment.status !== 'return_requested') {
            return next(new AppError(`Asset is not in return_requested status. Current: ${assignment.status}`, 400));
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const asset = assignment.asset;
            const prevCondition = asset.condition;

            assignment.status = 'returned';
            assignment.returnCondition = returnCondition;
            if (notes) assignment.notes = notes;
            await assignment.save({ session });

            validateTransition(asset.status, 'available');
            asset.status = 'available';
            asset.condition = returnCondition;
            await asset.save({ session });

            // [NEW LOGIC]: Auto-unblock Exit Clearance if all assets are returned
            const ExitClearance = require('../models/ExitClearance');
            const activeClearance = await ExitClearance.findOne({
                employee: assignment.employee._id,
                status: 'blocked'
            }).session(session);

            if (activeClearance) {
                // Check if any other assets are still issued/return_requested
                const remainingAssets = await Assignment.countDocuments({
                    employee: assignment.employee._id,
                    status: { $in: ['issued', 'return_requested'] },
                    _id: { $ne: assignment._id } // Exclude the one we just returned
                }).session(session);

                if (remainingAssets === 0) {
                    activeClearance.status = 'pending';
                    activeClearance.remarks = 'Auto-unblocked: All assigned assets have been returned.';
                    await activeClearance.save({ session });

                    // Notify Director that it's ready
                    await notifyRole({
                        role: 'director',
                        type: 'exit_clearance_unblocked',
                        title: 'Exit Ready for Approval',
                        message: `${asset.name} was returned. ${assignment.employee.name}'s exit clearance is now fully unblocked.`,
                        link: '/director/exit-approvals',
                    });
                } else {
                    activeClearance.remarks = `Blocked: ${remainingAssets} asset(s) still issued`;
                    await activeClearance.save({ session });
                }
            }

            await session.commitTransaction();

            const conditionNote = prevCondition !== returnCondition
                ? ` [Condition changed: ${prevCondition} → ${returnCondition}]`
                : '';

            await createAuditLog({
                action: `Return approved for asset: ${asset.name}${conditionNote}`,
                performedBy: req.user._id,
                asset: asset._id,
                previousStatus: 'return_requested',
                newStatus: 'available',
            });

            // Notify the employee their return was processed
            await createNotification({
                recipient: assignment.employee,
                type: 'return_approved',
                title: 'Asset Return Approved',
                message: `Your return of ${asset.name} has been accepted and verified`,
                link: '/employee/assets',
            });

            res.status(200).json({
                status: 'success',
                message: 'Return approved. Asset is now available.',
                data: { assignment },
            });
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }),
];

// @desc   Employee reports asset as lost
// @route  POST /api/assignments/:id/report-lost
// @access Private (employee)
exports.reportLost = asyncHandler(async (req, res, next) => {
    const assignment = await Assignment.findById(req.params.id).populate('asset');
    if (!assignment) return next(new AppError('Assignment not found', 404));

    if (assignment.employee.toString() !== req.user._id.toString()) {
        return next(new AppError('You can only report your own issued assets', 403));
    }

    if (assignment.status !== 'issued') {
        return next(new AppError('Only issued assets can be reported lost', 400));
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const asset = assignment.asset;
        validateTransition(asset.status, 'lost');

        asset.status = 'lost';
        await asset.save({ session });

        assignment.status = 'lost';
        assignment.notes = req.body.reason || 'Reported as lost by employee';
        await assignment.save({ session });

        await session.commitTransaction();

        await createAuditLog({
            action: `Asset reported lost: ${asset.name} by ${req.user.name}`,
            performedBy: req.user._id,
            asset: asset._id,
            previousStatus: 'issued',
            newStatus: 'lost',
        });

        res.status(200).json({ status: 'success', message: 'Asset reported as lost' });
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
});

// @desc   Transfer an issued asset from one employee to another
// @route  POST /api/assignments/:id/transfer
// @access Private (store_manager, manager)
exports.transferAsset = [
    body('newEmployeeId').notEmpty().withMessage('Target employee ID is required'),
    body('transferNote').optional().trim(),
    handleValidationErrors,
    asyncHandler(async (req, res, next) => {
        const { newEmployeeId, transferNote } = req.body;

        // ── 1. Load and validate the current assignment ──
        const currentAssignment = await Assignment.findById(req.params.id).populate('asset').populate('employee');
        if (!currentAssignment) return next(new AppError('Assignment not found', 404));

        if (currentAssignment.status !== 'issued') {
            return next(new AppError(
                `Asset can only be transferred when it is actively issued. Current assignment status: ${currentAssignment.status}`,
                400
            ));
        }

        // ── 2. Validate asset eligibility ──
        const asset = currentAssignment.asset;
        if (!asset) return next(new AppError('Asset data missing on this assignment', 404));

        if (asset.status !== 'issued') {
            return next(new AppError(
                `Asset status must be 'issued' to perform a transfer. Current asset status: ${asset.status}`,
                400
            ));
        }

        if (['under_maintenance', 'lost'].includes(asset.status)) {
            return next(new AppError('Cannot transfer an asset that is under maintenance or lost', 400));
        }

        if (asset.condition === 'retired') {
            return next(new AppError('Cannot transfer a retired asset', 400));
        }

        // ── 3. Validate target employee ──
        if (newEmployeeId === currentAssignment.employee._id.toString()) {
            return next(new AppError('Cannot transfer asset to the same employee it is currently assigned to', 400));
        }

        const newEmployee = await User.findById(newEmployeeId);
        if (!newEmployee) return next(new AppError('Target employee not found', 404));
        if (newEmployee.role !== 'employee') return next(new AppError('Target must be an employee', 400));
        if (newEmployee.status !== 'active') return next(new AppError('Target employee is not active', 400));
        if (newEmployee.isDeleted) return next(new AppError('Target employee account has been removed', 404));

        const previousEmployee = currentAssignment.employee;

        // ── 4. Atomic transaction ──
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Mark old assignment as transferred
            currentAssignment.status = 'transferred';
            if (transferNote) currentAssignment.transferNote = transferNote;
            currentAssignment.transferredBy = req.user._id;
            await currentAssignment.save({ session });

            // Create new assignment for the new employee
            const [newAssignment] = await Assignment.create(
                [{
                    asset: asset._id,
                    employee: newEmployeeId,
                    assignedBy: req.user._id,
                    status: 'issued',
                    notes: transferNote
                        ? `Transferred from ${previousEmployee.name}. Reason: ${transferNote}`
                        : `Transferred from ${previousEmployee.name}`,
                }],
                { session }
            );

            // Asset status stays 'issued' — no status change needed
            await session.commitTransaction();

            // ── 5. Audit log ──
            await createAuditLog({
                action: `Asset Transfer: ${asset.name} (${asset.serialNumber}) from ${previousEmployee.name} to ${newEmployee.name}. Transferred by: ${req.user.name}${transferNote ? `. Reason: ${transferNote}` : ''}`,
                performedBy: req.user._id,
                asset: asset._id,
                previousStatus: 'issued',
                newStatus: 'issued',
                previousEmployee: previousEmployee._id,
                newEmployee: newEmployee._id,
            });

            // ── 6. Notify new employee ──
            await createNotification({
                recipient: newEmployee._id,
                type: 'asset_request_assigned',
                title: 'Asset Transferred to You',
                message: `${asset.name} (${asset.serialNumber}) has been transferred to you from ${previousEmployee.name} by ${req.user.name}`,
                link: '/employee/assets',
            });

            // ── 7. Notify previous employee ──
            await createNotification({
                recipient: previousEmployee._id,
                type: 'general',
                title: 'Asset Transferred Away',
                message: `${asset.name} (${asset.serialNumber}) has been transferred from you to ${newEmployee.name} by ${req.user.name}`,
                link: '/employee/assets',
            });

            // Populate and return the new assignment
            const populated = await Assignment.findById(newAssignment._id)
                .populate('asset', 'name serialNumber category status condition')
                .populate('employee', 'name email department')
                .populate('assignedBy', 'name email');

            res.status(200).json({
                status: 'success',
                message: `Asset successfully transferred from ${previousEmployee.name} to ${newEmployee.name}`,
                data: { assignment: populated },
            });
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }),
];
