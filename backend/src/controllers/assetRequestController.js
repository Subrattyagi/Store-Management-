const { body } = require('express-validator');
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const AssetRequest = require('../models/AssetRequest');
const Asset = require('../models/Asset');
const Assignment = require('../models/Assignment');
const { handleValidationErrors } = require('../middleware/validate');
const { createAuditLog } = require('../utils/auditLogger');
const { createNotification, notifyRole } = require('../utils/notificationService');

/* ── helpers ── */
const populate = (q) =>
    q
        .populate('requestedBy', 'name email department')
        .populate('reviewedBy', 'name email')
        .populate('assignedAsset', 'name serialNumber category')
        .populate('timeline.by', 'name');

// @desc   Employee creates an asset request
// @route  POST /api/asset-requests
// @access Private (employee)
exports.createRequest = [
    body('assetCategory').trim().notEmpty().withMessage('Asset category is required'),
    body('assetDescription').trim().notEmpty().withMessage('Description is required'),
    body('urgency').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid urgency'),
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { assetCategory, assetDescription, urgency } = req.body;

        const request = await AssetRequest.create({
            requestedBy: req.user._id,
            assetCategory,
            assetDescription,
            urgency: urgency || 'medium',
            timeline: [{ status: 'pending_manager', note: 'Request submitted by employee', by: req.user._id }],
        });

        const populated = await populate(AssetRequest.findById(request._id));

        // Notify all managers about new pending request
        await notifyRole({
            role: 'manager',
            type: 'asset_request_created',
            title: 'New Asset Request',
            message: `${req.user.name} requested a ${assetCategory}`,
            link: '/manager/asset-requests',
        });

        res.status(201).json({ status: 'success', data: { request: populated } });
    }),
];

// @desc   Get requests (role-filtered)
// @route  GET /api/asset-requests
// @access Private (all)
exports.getRequests = asyncHandler(async (req, res) => {
    const filter = {};

    if (req.user.role === 'employee') {
        filter.requestedBy = req.user._id;
    } else if (req.user.role === 'manager') {
        // Manager sees all pending their approval + ones they've already reviewed
        if (req.query.status) filter.status = req.query.status;
        else filter.status = { $in: ['pending_manager'] };
        // Show all if 'all' query
        if (req.query.all === 'true') delete filter.status;
    } else if (req.user.role === 'store_manager') {
        filter.status = { $in: ['pending_store', 'purchase_requested'] };
        if (req.query.status) filter.status = req.query.status;
    }
    // Director/admin sees all
    if (['director'].includes(req.user.role)) {
        if (req.query.status) filter.status = req.query.status;
    }

    const requests = await populate(AssetRequest.find(filter).sort('-createdAt'));
    res.status(200).json({ status: 'success', results: requests.length, data: { requests } });
});

// @desc   Get single request
// @route  GET /api/asset-requests/:id
// @access Private (all)
exports.getRequest = asyncHandler(async (req, res, next) => {
    const request = await populate(AssetRequest.findById(req.params.id));
    if (!request) return next(new AppError('Request not found', 404));
    res.status(200).json({ status: 'success', data: { request } });
});

// @desc   Manager approves a request
// @route  PATCH /api/asset-requests/:id/approve
// @access Private (manager)
exports.approveRequest = asyncHandler(async (req, res, next) => {
    const request = await AssetRequest.findById(req.params.id);
    if (!request) return next(new AppError('Request not found', 404));
    if (request.status !== 'pending_manager') {
        return next(new AppError(`Cannot approve — current status: ${request.status}`, 400));
    }

    request.status = 'pending_store';
    request.reviewedBy = req.user._id;
    request.managerNote = req.body.note || '';
    request.timeline.push({ status: 'pending_store', note: req.body.note || 'Approved by manager', by: req.user._id });
    await request.save();

    const populated = await populate(AssetRequest.findById(request._id));

    // Notify the requesting employee
    await createNotification({
        recipient: request.requestedBy,
        type: 'asset_request_approved',
        title: 'Asset Request Approved',
        message: `Your request for ${request.assetCategory} has been approved by your manager`,
        link: '/employee/assets',
    });

    // Notify all store managers to fulfil the request
    await notifyRole({
        role: 'store_manager',
        type: 'asset_request_approved',
        title: 'Asset Request Needs Fulfilment',
        message: `A ${request.assetCategory} request approved by manager is awaiting fulfilment`,
        link: '/store-manager/asset-requests',
    });

    res.status(200).json({ status: 'success', data: { request: populated } });
});

// @desc   Manager rejects a request
// @route  PATCH /api/asset-requests/:id/reject
// @access Private (manager)
exports.rejectRequest = asyncHandler(async (req, res, next) => {
    const request = await AssetRequest.findById(req.params.id);
    if (!request) return next(new AppError('Request not found', 404));
    if (request.status !== 'pending_manager') {
        return next(new AppError(`Cannot reject — current status: ${request.status}`, 400));
    }

    request.status = 'rejected';
    request.reviewedBy = req.user._id;
    request.managerNote = req.body.note || '';
    request.timeline.push({ status: 'rejected', note: req.body.note || 'Rejected by manager', by: req.user._id });
    await request.save();

    const populated = await populate(AssetRequest.findById(request._id));

    // Notify the requesting employee
    await createNotification({
        recipient: request.requestedBy,
        type: 'asset_request_rejected',
        title: 'Asset Request Rejected',
        message: `Your request for ${request.assetCategory} was rejected. ${req.body.note ? 'Reason: ' + req.body.note : ''}`.trim(),
        link: '/employee/assets',
    });

    res.status(200).json({ status: 'success', data: { request: populated } });
});

// @desc   Store manager assigns an available asset to the employee
// @route  PATCH /api/asset-requests/:id/assign
// @access Private (store_manager)
exports.assignAsset = asyncHandler(async (req, res, next) => {
    const { assetId } = req.body;
    if (!assetId) return next(new AppError('assetId is required', 400));

    const request = await AssetRequest.findById(req.params.id).populate('requestedBy');
    if (!request) return next(new AppError('Request not found', 404));
    if (!['pending_store', 'purchase_requested'].includes(request.status)) {
        return next(new AppError(`Cannot assign — current status: ${request.status}`, 400));
    }

    const asset = await Asset.findById(assetId);
    if (!asset) return next(new AppError('Asset not found', 404));
    if (asset.status !== 'available') {
        return next(new AppError(`Asset is not available. Current status: ${asset.status}`, 400));
    }

    // Check no active assignment already
    const existing = await Assignment.findOne({ asset: assetId, status: 'issued' });
    if (existing) return next(new AppError('Asset is already actively issued', 400));

    // MongoDB Transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // Create assignment record
        await Assignment.create(
            [{ asset: assetId, employee: request.requestedBy._id, assignedBy: req.user._id, status: 'issued' }],
            { session }
        );

        asset.status = 'issued';
        await asset.save({ session });

        request.status = 'assigned';
        request.assignedAsset = assetId;
        request.storeNote = req.body.note || '';
        request.timeline.push({ status: 'assigned', note: req.body.note || `Asset assigned: ${asset.name} (${asset.serialNumber})`, by: req.user._id });
        await request.save({ session });

        await session.commitTransaction();

        await createAuditLog({
            action: `Asset assigned via request: ${asset.name} to ${request.requestedBy.name}`,
            performedBy: req.user._id,
            asset: asset._id,
            previousStatus: 'available',
            newStatus: 'issued',
        });

        // Notify the requesting employee their asset is ready
        await createNotification({
            recipient: request.requestedBy._id,
            type: 'asset_request_assigned',
            title: 'Asset Assigned to You',
            message: `${asset.name} (${asset.serialNumber}) has been assigned to you`,
            link: '/employee/assets',
        });

        const populated = await populate(AssetRequest.findById(request._id));
        res.status(200).json({ status: 'success', data: { request: populated } });
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
});

// @desc   Store manager marks request as purchase needed
// @route  PATCH /api/asset-requests/:id/purchase
// @access Private (store_manager)
exports.markPurchaseNeeded = asyncHandler(async (req, res, next) => {
    const request = await AssetRequest.findById(req.params.id);
    if (!request) return next(new AppError('Request not found', 404));
    if (request.status !== 'pending_store') {
        return next(new AppError(`Cannot mark purchase — current status: ${request.status}`, 400));
    }

    request.status = 'purchase_requested';
    request.storeNote = req.body.note || '';
    request.timeline.push({ status: 'purchase_requested', note: req.body.note || 'Asset not in stock — purchase initiated', by: req.user._id });
    await request.save();

    // Notify the requesting employee about purchase status
    await createNotification({
        recipient: request.requestedBy,
        type: 'asset_request_purchase',
        title: 'Asset Being Purchased',
        message: `Your ${request.assetCategory} request is pending a new purchase — no stock available`,
        link: '/employee/assets',
    });

    const populated = await populate(AssetRequest.findById(request._id));
    res.status(200).json({ status: 'success', data: { request: populated } });
});

// @desc   Get pending count (for sidebar badges)
// @route  GET /api/asset-requests/pending-count
// @access Private (manager, store_manager)
exports.getPendingCount = asyncHandler(async (req, res) => {
    let filter = {};
    if (req.user.role === 'manager') filter = { status: 'pending_manager' };
    else if (req.user.role === 'store_manager') filter = { status: { $in: ['pending_store', 'purchase_requested'] } };
    const count = await AssetRequest.countDocuments(filter);
    res.status(200).json({ status: 'success', data: { count } });
});
