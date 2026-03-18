const Issue = require('../models/Issue');
const Asset = require('../models/Asset');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Report a new issue
// @route   POST /api/issues
// @access  Private (Employee)
exports.reportIssue = asyncHandler(async (req, res, next) => {
    const { asset, issueType, description, attachmentUrl } = req.body;

    if (!asset || !issueType || !description) {
        return next(new AppError('Please provide asset, issue type, and description', 400));
    }

    const assetExists = await Asset.findById(asset);
    if (!assetExists) {
        return next(new AppError('Asset not found', 404));
    }

    const issue = await Issue.create({
        asset,
        reportedBy: req.user.id,
        issueType,
        description,
        attachmentUrl
    });

    res.status(201).json({
        status: 'success',
        data: { issue }
    });
});

// @desc    Get my reported issues
// @route   GET /api/issues/my
// @access  Private (Employee)
exports.getMyIssues = asyncHandler(async (req, res, next) => {
    const issues = await Issue.find({ reportedBy: req.user.id })
        .populate('asset', 'name category serialNumber')
        .sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: issues.length,
        data: { issues }
    });
});

// @desc    Get all issues
// @route   GET /api/issues
// @access  Private (Managers, Directors, Store Managers)
exports.getAllIssues = asyncHandler(async (req, res, next) => {
    const issues = await Issue.find()
        .populate('asset', 'name category serialNumber')
        .populate('reportedBy', 'name email department')
        .sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: issues.length,
        data: { issues }
    });
});

// @desc    Update issue status
// @route   PATCH /api/issues/:id/status
// @access  Private (Managers, Directors, Store Managers)
exports.updateIssueStatus = asyncHandler(async (req, res, next) => {
    const { status } = req.body;

    if (!['open', 'in_progress', 'in_maintenance', 'resolved', 'rejected'].includes(status)) {
        return next(new AppError('Invalid status', 400));
    }

    const issue = await Issue.findByIdAndUpdate(req.params.id, { status }, {
        new: true,
        runValidators: true
    });

    if (!issue) {
        return next(new AppError('No issue found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { issue }
    });
});
