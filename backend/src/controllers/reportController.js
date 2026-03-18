const asyncHandler = require('../utils/asyncHandler');
const AuditLog = require('../models/AuditLog');
const Asset = require('../models/Asset');
const Assignment = require('../models/Assignment');
const User = require('../models/User');

// @desc   Get organization-wide asset summary
// @route  GET /api/reports/summary
// @access Private (manager, director)
exports.getSummary = asyncHandler(async (req, res) => {
    const [statusCounts, conditionCounts, totalAssets, totalUsers] = await Promise.all([
        Asset.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Asset.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: '$condition', count: { $sum: 1 } } },
        ]),
        Asset.countDocuments({ isDeleted: false }),
        User.countDocuments({ isDeleted: false }),
    ]);

    const byStatus = {};
    statusCounts.forEach(({ _id, count }) => { byStatus[_id] = count; });
    const byCondition = {};
    conditionCounts.forEach(({ _id, count }) => { byCondition[_id] = count; });

    res.status(200).json({
        status: 'success',
        data: { totalAssets, totalUsers, byStatus, byCondition },
    });
});

// @desc   Department-wise asset mapping
// @route  GET /api/reports/department
// @access Private (manager, director)
exports.getDepartmentReport = asyncHandler(async (req, res) => {
    const report = await Assignment.aggregate([
        { $match: { status: 'issued' } },
        {
            $lookup: {
                from: 'users',
                localField: 'employee',
                foreignField: '_id',
                as: 'employeeData',
            },
        },
        { $unwind: '$employeeData' },
        {
            $lookup: {
                from: 'assets',
                localField: 'asset',
                foreignField: '_id',
                as: 'assetData',
            },
        },
        { $unwind: '$assetData' },
        {
            $group: {
                _id: '$employeeData.department',
                totalAssets: { $sum: 1 },
                employees: {
                    $push: {
                        employeeName: '$employeeData.name',
                        assetName: '$assetData.name',
                        assetCategory: '$assetData.category',
                        serialNumber: '$assetData.serialNumber',
                    },
                },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    res.status(200).json({ status: 'success', data: { report } });
});

// @desc   Get paginated audit logs
// @route  GET /api/reports/audit-logs
// @access Private (director)
exports.getAuditLogs = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.action) filter.action = { $regex: req.query.action, $options: 'i' };
    if (req.query.performedBy) filter.performedBy = req.query.performedBy;

    const [logs, total] = await Promise.all([
        AuditLog.find(filter)
            .populate('performedBy', 'name email role')
            .populate('asset', 'name serialNumber')
            .sort('-timestamp')
            .skip(skip)
            .limit(limit),
        AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            logs,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        },
    });
});
