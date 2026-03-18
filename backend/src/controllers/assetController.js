const { body } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Asset = require('../models/Asset');
const Assignment = require('../models/Assignment');
const { handleValidationErrors } = require('../middleware/validate');
const { createAuditLog } = require('../utils/auditLogger');
const { validateTransition } = require('../utils/stateMachine');

// @desc   Add new asset
// @route  POST /api/assets
// @access Private (store_manager)
exports.createAsset = [
    body('name').trim().notEmpty().withMessage('Asset name is required'),
    body('assetType').isIn(['movable', 'fixed']).withMessage('Asset type must be movable or fixed'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('serialNumber').trim().notEmpty().withMessage('Serial number is required'),
    body('condition').optional().isIn(['new', 'good', 'minor_damage', 'major_damage', 'retired']).withMessage('Invalid condition'),
    handleValidationErrors,
    asyncHandler(async (req, res, next) => {
        const {
            name, assetType, category, serialNumber, condition,
            purchaseDate, purchasePrice, vendor, location, notes,
            warranty, images,
        } = req.body;

        const asset = await Asset.create({
            name, assetType, category, serialNumber, condition,
            purchaseDate, purchasePrice, vendor, location, notes,
            warranty, images,
        });

        await createAuditLog({
            action: `Asset created: ${asset.name} (SN: ${asset.serialNumber})`,
            performedBy: req.user._id,
            asset: asset._id,
            newStatus: asset.status,
        });

        res.status(201).json({ status: 'success', data: { asset } });
    }),
];

// @desc   Get all assets
// @route  GET /api/assets
// @access Private (all roles)
exports.getAssets = asyncHandler(async (req, res) => {
    const filter = { isDeleted: { $ne: true } };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.condition) filter.condition = req.query.condition;

    const assets = await Asset.find(filter).sort('-createdAt');
    res.status(200).json({ status: 'success', results: assets.length, data: { assets } });
});

// @desc   Get single asset
// @route  GET /api/assets/:id
// @access Private (all roles)
exports.getAsset = asyncHandler(async (req, res, next) => {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return next(new AppError('Asset not found', 404));
    res.status(200).json({ status: 'success', data: { asset } });
});

// @desc   Update asset details
// @route  PATCH /api/assets/:id
// @access Private (store_manager)
exports.updateAsset = [
    body('condition').optional().isIn(['new', 'good', 'minor_damage', 'major_damage', 'retired']).withMessage('Invalid condition'),
    handleValidationErrors,
    asyncHandler(async (req, res, next) => {
        const asset = await Asset.findById(req.params.id);
        if (!asset) return next(new AppError('Asset not found', 404));

        const allowedFields = ['name', 'category', 'condition', 'purchaseDate', 'purchasePrice', 'vendor', 'location', 'notes', 'warranty', 'images'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) asset[field] = req.body[field];
        });
        await asset.save();

        await createAuditLog({
            action: `Asset updated: ${asset.name} (SN: ${asset.serialNumber})`,
            performedBy: req.user._id,
            asset: asset._id,
        });

        res.status(200).json({ status: 'success', data: { asset } });
    }),
];

// @desc   Update asset condition
// @route  PATCH /api/assets/:id/condition
// @access Private (store_manager)
exports.updateCondition = [
    body('condition')
        .isIn(['new', 'good', 'minor_damage', 'major_damage', 'retired'])
        .withMessage('Invalid condition. Must be one of: new, good, minor_damage, major_damage, retired'),
    body('notes').optional().trim(),
    handleValidationErrors,
    asyncHandler(async (req, res, next) => {
        const { condition, notes } = req.body;
        const asset = await Asset.findById(req.params.id);
        if (!asset) return next(new AppError('Asset not found', 404));

        const previousCondition = asset.condition;

        if (previousCondition === condition) {
            return next(new AppError('Asset already has this condition — no change made', 400));
        }

        asset.condition = condition;
        await asset.save();

        const notesSuffix = notes ? ` | Notes: ${notes}` : '';
        await createAuditLog({
            action: `Asset condition updated: ${asset.name} (SN: ${asset.serialNumber}). ${previousCondition} → ${condition}${notesSuffix}`,
            performedBy: req.user._id,
            asset: asset._id,
            previousStatus: previousCondition,
            newStatus: condition,
        });

        res.status(200).json({ status: 'success', data: { asset } });
    }),
];

// @desc   Update asset lifecycle status
// @route  PATCH /api/assets/:id/status
// @access Private (store_manager, manager)
exports.updateAssetStatus = [
    body('status')
        .isIn(['available', 'issued', 'return_requested', 'under_maintenance', 'lost'])
        .withMessage('Invalid status'),
    handleValidationErrors,
    asyncHandler(async (req, res, next) => {
        const { status } = req.body;
        const asset = await Asset.findById(req.params.id);
        if (!asset) return next(new AppError('Asset not found', 404));

        validateTransition(asset.status, status);

        const previousStatus = asset.status;
        asset.status = status;
        await asset.save();

        await createAuditLog({
            action: `Asset status changed: ${asset.name}`,
            performedBy: req.user._id,
            asset: asset._id,
            previousStatus,
            newStatus: status,
        });

        res.status(200).json({ status: 'success', data: { asset } });
    }),
];

// @desc   Soft delete asset
// @route  DELETE /api/assets/:id
// @access Private (director only)
exports.deleteAsset = asyncHandler(async (req, res, next) => {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return next(new AppError('Asset not found', 404));

    if (asset.status === 'issued') {
        return next(new AppError('Cannot delete an asset that is currently issued', 400));
    }

    asset.isDeleted = true;
    await asset.save();

    await createAuditLog({
        action: `Asset soft-deleted: ${asset.name} (SN: ${asset.serialNumber})`,
        performedBy: req.user._id,
        asset: asset._id,
    });

    res.status(200).json({ status: 'success', message: 'Asset deactivated successfully' });
});

// @desc   Bulk create assets (same type/vendor, different serial numbers)
// @route  POST /api/assets/bulk
// @access Private (store_manager)
exports.createAssetsBulk = asyncHandler(async (req, res, next) => {
    const { commonFields, entries } = req.body;

    if (!commonFields || !Array.isArray(entries) || entries.length === 0) {
        return next(new AppError('commonFields and at least one entry are required', 400));
    }

    if (!commonFields.name || !commonFields.assetType || !commonFields.category) {
        return next(new AppError('name, assetType and category are required in commonFields', 400));
    }

    const validTypes = ['movable', 'fixed'];
    if (!validTypes.includes(commonFields.assetType)) {
        return next(new AppError('assetType must be movable or fixed', 400));
    }

    const docs = entries.map((entry) => ({
        ...commonFields,
        ...entry,
    }));

    const assets = await Asset.insertMany(docs, { ordered: false });

    await Promise.all(
        assets.map((asset) =>
            createAuditLog({
                action: `Asset created (bulk): ${asset.name} (SN: ${asset.serialNumber})`,
                performedBy: req.user._id,
                asset: asset._id,
                newStatus: asset.status,
            })
        )
    );

    res.status(201).json({ status: 'success', results: assets.length, data: { assets } });
});

// @desc   Get full assignment history for a specific asset
// @route  GET /api/assets/:id/history
// @access Private (store_manager, manager, director)
exports.getAssetHistory = asyncHandler(async (req, res, next) => {
    const asset = await Asset.findById(req.params.id).select('name serialNumber category');
    if (!asset) return next(new AppError('Asset not found', 404));

    const history = await Assignment.find({ asset: req.params.id })
        .populate('employee', 'name email department')
        .populate('assignedBy', 'name email')
        .sort('createdAt'); // oldest → newest for timeline order

    res.status(200).json({
        status: 'success',
        results: history.length,
        data: { asset, history },
    });
});

// @desc   Migrate legacy 'damaged' → 'minor_damage' for all assets
// @route  POST /api/assets/migrate-conditions
// @access Private (store_manager, director)
exports.migrateConditions = asyncHandler(async (req, res) => {
    const result = await Asset.updateMany(
        { condition: 'damaged' },
        { $set: { condition: 'minor_damage' } }
    );

    await createAuditLog({
        action: `Condition migration: ${result.modifiedCount} asset(s) updated from 'damaged' → 'minor_damage'`,
        performedBy: req.user._id,
    });

    res.status(200).json({
        status: 'success',
        message: `Migrated ${result.modifiedCount} asset(s) from 'damaged' to 'minor_damage'`,
        data: { modifiedCount: result.modifiedCount },
    });
});

// @desc   Retire an asset (condition = 'retired', removes from active inventory)
// @route  PATCH /api/assets/:id/retire
// @access Private (store_manager)
exports.retireAsset = asyncHandler(async (req, res, next) => {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return next(new AppError('Asset not found', 404));

    if (asset.status === 'issued') {
        return next(new AppError('Cannot retire an asset that is currently issued. Request a return first.', 400));
    }

    const prevCondition = asset.condition;
    asset.condition = 'retired';
    await asset.save();

    await createAuditLog({
        action: `Asset retired: ${asset.name} (SN: ${asset.serialNumber}). Previous condition: ${prevCondition}`,
        performedBy: req.user._id,
        asset: asset._id,
    });

    res.status(200).json({
        status: 'success',
        message: 'Asset has been marked as retired and removed from active inventory',
        data: { asset },
    });
});
