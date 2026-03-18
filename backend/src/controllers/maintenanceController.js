const { body, param } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Maintenance = require('../models/Maintenance');
const Asset = require('../models/Asset');
const { handleValidationErrors } = require('../middleware/validate');
const { createAuditLog } = require('../utils/auditLogger');

// @desc   Create a new maintenance record
// @route  POST /api/maintenance
// @access Private (store_manager)
exports.createMaintenance = [
    body('asset').notEmpty().withMessage('Asset ID is required'),
    body('description').trim().notEmpty().withMessage('Issue description is required'),
    body('repairVendor').optional().trim(),
    body('repairCost').optional().isFloat({ min: 0 }).withMessage('Repair cost must be a positive number'),
    body('repairDate').optional().isISO8601().withMessage('Invalid repair date'),
    body('notes').optional().trim(),
    handleValidationErrors,
    asyncHandler(async (req, res, next) => {
        const { asset: assetId, description, repairVendor, repairCost, repairDate, notes } = req.body;

        const asset = await Asset.findById(assetId);
        if (!asset) return next(new AppError('Asset not found', 404));
        if (asset.isDeleted) return next(new AppError('Cannot log maintenance for a deleted asset', 400));

        // Auto-move asset to under_maintenance if it isn't already
        const wasAlreadyUnderMaintenance = asset.status === 'under_maintenance';
        if (!wasAlreadyUnderMaintenance) {
            if (asset.status === 'issued') {
                return next(new AppError('Asset is currently issued. Request a return before logging maintenance.', 400));
            }
            asset.status = 'under_maintenance';
            await asset.save();
        }

        const record = await Maintenance.create({
            asset: assetId,
            description,
            repairVendor,
            repairCost,
            repairDate,
            notes,
            createdBy: req.user._id,
        });

        await createAuditLog({
            action: `Maintenance created: ${asset.name} (SN: ${asset.serialNumber}). Issue: ${description}`,
            performedBy: req.user._id,
            asset: asset._id,
            newStatus: 'under_maintenance',
            previousStatus: wasAlreadyUnderMaintenance ? 'under_maintenance' : asset.status,
        });

        const populated = await record.populate([
            { path: 'asset', select: 'name serialNumber category condition status' },
            { path: 'createdBy', select: 'name email' },
        ]);

        res.status(201).json({ status: 'success', data: { maintenance: populated } });
    }),
];

// @desc   Get all maintenance records (with optional filters)
// @route  GET /api/maintenance
// @access Private (store_manager)
exports.getAllMaintenance = asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.maintenanceStatus = req.query.status;

    let records = await Maintenance.find(filter)
        .populate('asset', 'name serialNumber category condition status')
        .populate('createdBy', 'name email')
        .sort('-createdAt');

    // Search by asset name or serial number (client-friendly server-side search)
    if (req.query.search) {
        const q = req.query.search.toLowerCase();
        records = records.filter(r =>
            r.asset?.name?.toLowerCase().includes(q) ||
            r.asset?.serialNumber?.toLowerCase().includes(q)
        );
    }

    res.status(200).json({
        status: 'success',
        results: records.length,
        data: { maintenance: records },
    });
});

// @desc   Get all maintenance records for a specific asset
// @route  GET /api/maintenance/asset/:assetId
// @access Private (store_manager)
exports.getByAsset = [
    param('assetId').isMongoId().withMessage('Invalid asset ID'),
    handleValidationErrors,
    asyncHandler(async (req, res, next) => {
        const asset = await Asset.findById(req.params.assetId).select('name serialNumber category condition status');
        if (!asset) return next(new AppError('Asset not found', 404));

        const records = await Maintenance.find({ asset: req.params.assetId })
            .populate('createdBy', 'name email')
            .sort('createdAt'); // oldest → newest for timeline

        res.status(200).json({
            status: 'success',
            results: records.length,
            data: { asset, maintenance: records },
        });
    }),
];

// @desc   Update maintenance record status
// @route  PATCH /api/maintenance/:id/status
// @access Private (store_manager)
exports.updateMaintenanceStatus = [
    body('maintenanceStatus')
        .isIn(['pending', 'in_progress', 'completed'])
        .withMessage('Invalid status. Must be: pending, in_progress, or completed'),
    body('notes').optional().trim(),
    handleValidationErrors,
    asyncHandler(async (req, res, next) => {
        const { maintenanceStatus, notes } = req.body;

        const record = await Maintenance.findById(req.params.id).populate('asset');
        if (!record) return next(new AppError('Maintenance record not found', 404));

        if (record.maintenanceStatus === 'completed') {
            return next(new AppError('Completed maintenance records cannot be modified', 400));
        }

        const previousStatus = record.maintenanceStatus;
        record.maintenanceStatus = maintenanceStatus;
        if (notes) record.notes = notes;
        await record.save();

        // If completed → revert asset back to available
        if (maintenanceStatus === 'completed' && record.asset) {
            const asset = await Asset.findById(record.asset._id);
            if (asset && asset.status === 'under_maintenance') {
                asset.status = 'available';
                await asset.save();
            }
        }

        const actionLabel = maintenanceStatus === 'completed' ? 'maintenance_completed' : 'maintenance_updated';
        await createAuditLog({
            action: `${actionLabel}: ${record.asset?.name} (SN: ${record.asset?.serialNumber}). Status: ${previousStatus} → ${maintenanceStatus}`,
            performedBy: req.user._id,
            asset: record.asset?._id,
            previousStatus,
            newStatus: maintenanceStatus,
        });

        const populated = await record.populate('createdBy', 'name email');
        res.status(200).json({ status: 'success', data: { maintenance: populated } });
    }),
];
