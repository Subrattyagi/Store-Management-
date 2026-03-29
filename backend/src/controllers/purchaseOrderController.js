const { body } = require('express-validator');
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const PurchaseOrder = require('../models/PurchaseOrder');
const AssetRequest = require('../models/AssetRequest');
const Asset = require('../models/Asset');
const Assignment = require('../models/Assignment');
const { handleValidationErrors } = require('../middleware/validate');
const { createAuditLog } = require('../utils/auditLogger');
const { createNotification, notifyRole } = require('../utils/notificationService');

/* ── Status transition rules ── */
const NEXT_STATUS = {
    pending_purchase: 'ordered',
    ordered: 'received',
};

/* ── Populate helper ── */
const populate = (q) =>
    q
        .populate('requestedBy', 'name email')
        .populate('linkedAssetRequest', 'assetCategory assetDescription requestedBy status')
        .populate('linkedAsset', 'name serialNumber category status')
        .populate('linkedAssets', 'name serialNumber category status')
        .populate('timeline.by', 'name');

// ─────────────────────────────────────────────
// @desc   Create a new Purchase Order
// @route  POST /api/purchase-orders
// @access store_manager
// ─────────────────────────────────────────────
exports.createPurchaseOrder = [
    body('assetCategory').trim().notEmpty().withMessage('Asset category is required'),
    body('assetDescription').trim().notEmpty().withMessage('Description is required'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be ≥ 1'),
    body('estimatedCost').optional().isFloat({ min: 0 }).withMessage('Cost must be ≥ 0'),
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const {
            assetCategory,
            assetDescription,
            quantity,
            vendor,
            estimatedCost,
            notes,
            linkedAssetRequest,
        } = req.body;

        // Create the purchase order
        const po = await PurchaseOrder.create({
            assetCategory,
            assetDescription,
            quantity: quantity || 1,
            vendor,
            estimatedCost,
            notes,
            linkedAssetRequest: linkedAssetRequest || null,
            requestedBy: req.user._id,
            timeline: [
                {
                    status: 'pending_purchase',
                    note: 'Purchase order created',
                    by: req.user._id,
                },
            ],
        });

        // If linked to an AssetRequest, update its status to purchase_requested
        if (linkedAssetRequest) {
            const assetReq = await AssetRequest.findById(linkedAssetRequest);
            if (assetReq && assetReq.status === 'pending_store') {
                assetReq.status = 'purchase_requested';
                assetReq.storeNote = `Purchase Order created — ${vendor || 'vendor TBD'}`;
                assetReq.timeline.push({
                    status: 'purchase_requested',
                    note: `Purchase Order raised by ${req.user.name}`,
                    by: req.user._id,
                });
                await assetReq.save();

                // Notify the employee
                await createNotification({
                    recipient: assetReq.requestedBy,
                    type: 'asset_request_purchase',
                    title: 'Asset Being Purchased',
                    message: `Your ${assetCategory} request is being procured — no stock available`,
                    link: '/employee/assets',
                });
            }
        }

        await createAuditLog({
            action: `Purchase Order created for ${assetCategory}`,
            performedBy: req.user._id,
        });

        const populated = await populate(PurchaseOrder.findById(po._id));
        res.status(201).json({ status: 'success', data: { purchaseOrder: populated } });
    }),
];

// ─────────────────────────────────────────────
// @desc   List Purchase Orders (with optional status filter)
// @route  GET /api/purchase-orders
// @access store_manager, manager, director
// ─────────────────────────────────────────────
exports.getPurchaseOrders = asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.purchaseStatus = req.query.status;

    const orders = await populate(
        PurchaseOrder.find(filter).sort('-createdAt')
    );

    res.status(200).json({
        status: 'success',
        results: orders.length,
        data: { purchaseOrders: orders },
    });
});

// ─────────────────────────────────────────────
// @desc   Get single Purchase Order
// @route  GET /api/purchase-orders/:id
// @access store_manager, manager, director
// ─────────────────────────────────────────────
exports.getPurchaseOrder = asyncHandler(async (req, res, next) => {
    const po = await populate(PurchaseOrder.findById(req.params.id));
    if (!po) return next(new AppError('Purchase order not found', 404));
    res.status(200).json({ status: 'success', data: { purchaseOrder: po } });
});

// ─────────────────────────────────────────────
// @desc   Advance purchase status (pending_purchase → ordered, ordered → received)
// @route  PATCH /api/purchase-orders/:id/status
// @access store_manager
// ─────────────────────────────────────────────
exports.updatePurchaseStatus = asyncHandler(async (req, res, next) => {
    const po = await PurchaseOrder.findById(req.params.id).populate('linkedAssetRequest');
    if (!po) return next(new AppError('Purchase order not found', 404));

    const next_status = NEXT_STATUS[po.purchaseStatus];
    if (!next_status) {
        return next(new AppError(`Cannot advance — current status: ${po.purchaseStatus}`, 400));
    }

    const { note, vendor, orderDate } = req.body;

    po.purchaseStatus = next_status;
    if (vendor) po.vendor = vendor;
    if (next_status === 'ordered') po.orderDate = orderDate ? new Date(orderDate) : new Date();
    if (next_status === 'received') po.receivedDate = new Date();

    po.timeline.push({
        status: next_status,
        note: note || `Status advanced to ${next_status}`,
        by: req.user._id,
    });

    await po.save();

    // Notify requesting employee if request is linked
    if (po.linkedAssetRequest?.requestedBy) {
        const msgMap = {
            ordered: `Your ${po.assetCategory} has been ordered from ${po.vendor || 'vendor'}`,
            received: `Your ${po.assetCategory} has arrived — it will be added to inventory soon`,
        };
        await createNotification({
            recipient: po.linkedAssetRequest.requestedBy,
            type: 'asset_request_purchase',
            title: 'Purchase Update',
            message: msgMap[next_status],
            link: '/employee/assets',
        });
    }

    await createAuditLog({
        action: `Purchase Order ${po._id} status → ${next_status}`,
        performedBy: req.user._id,
    });

    const populated = await populate(PurchaseOrder.findById(po._id));
    res.status(200).json({ status: 'success', data: { purchaseOrder: populated } });
});

// ─────────────────────────────────────────────
// @desc   Add asset to inventory after receiving (+ optional auto-assign)
// @route  POST /api/purchase-orders/:id/receive
// @access store_manager
// ─────────────────────────────────────────────
exports.receiveAndAddAsset = [
    body('name').trim().notEmpty().withMessage('Asset name is required'),
    body('serialNumber').trim().notEmpty().withMessage('Serial number is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('condition').isIn(['new', 'good', 'minor_damage', 'major_damage']).withMessage('Invalid condition'),
    handleValidationErrors,
    asyncHandler(async (req, res, next) => {
        const po = await PurchaseOrder.findById(req.params.id).populate({
            path: 'linkedAssetRequest',
            populate: { path: 'requestedBy', select: 'name email' },
        });

        if (!po) return next(new AppError('Purchase order not found', 404));
        if (po.purchaseStatus !== 'received') {
            return next(new AppError('Purchase order must be in "received" state first', 400));
        }
        if (po.linkedAsset) {
            return next(new AppError('Asset already added to inventory for this PO', 400));
        }

        const {
            name,
            serialNumber,
            category,
            condition,
            location,
            vendor,
            purchasePrice,
            assetType,
            notes: assetNotes,
            brand: assetBrand,
            autoAssign, // boolean — auto-assign to requesting employee
        } = req.body;

        // Check for duplicate serial number
        const existing = await Asset.findOne({ serialNumber });
        if (existing) {
            return next(new AppError(`Serial number ${serialNumber} already exists in inventory`, 400));
        }

        // 1. Create the asset
        const asset = await Asset.create({
            name,
            serialNumber,
            category,
            brand: assetBrand || '',
            condition,
            location,
            vendor: vendor || po.vendor,
            purchasePrice,
            assetType: assetType || 'movable',
            notes: assetNotes,
            status: 'available',
        });

        // 2. Link asset to PO
        po.linkedAsset = asset._id;
        po.receivedQuantity = 1;

        // 3. Update brand breakdown if exists
        if (po.brandBreakdown && po.brandBreakdown.length > 0 && assetBrand) {
            const match = po.brandBreakdown.find(b => b.brand && b.brand.toLowerCase() === assetBrand.trim().toLowerCase());
            if (match) {
                match.receivedQuantity = (match.receivedQuantity || 0) + 1;
            }
        }

        po.timeline.push({
            status: 'received',
            note: `Asset added to inventory: ${name} (${serialNumber})`,
            by: req.user._id,
        });

        await po.save();

        // 3. Optional auto-assign to requesting employee
        let assignment = null;
        if (autoAssign && po.linkedAssetRequest && po.linkedAssetRequest.status === 'purchase_requested') {
            const assetReq = po.linkedAssetRequest;
            const employeeId = assetReq.requestedBy?._id || assetReq.requestedBy;

            assignment = await Assignment.create({
                asset: asset._id,
                employee: employeeId,
                assignedBy: req.user._id,
                status: 'issued',
            });

            asset.status = 'issued';
            await asset.save();

            assetReq.status = 'assigned';
            assetReq.assignedAsset = asset._id;
            assetReq.storeNote = `Auto-assigned after purchase: ${name} (${serialNumber})`;
            assetReq.timeline.push({
                status: 'assigned',
                note: `Assigned via purchase order — ${name} (${serialNumber})`,
                by: req.user._id,
            });
            await assetReq.save();

            // Notify employee
            await createNotification({
                recipient: employeeId,
                type: 'asset_request_assigned',
                title: 'Asset Assigned to You',
                message: `${name} (${serialNumber}) has been assigned to you after procurement`,
                link: '/employee/assets',
            });

            await createAuditLog({
                action: `Auto-assigned ${name} to ${assetReq.requestedBy?.name || 'employee'} via purchase order`,
                performedBy: req.user._id,
                asset: asset._id,
                previousStatus: 'available',
                newStatus: 'issued',
            });
        }

        await createAuditLog({
            action: `Asset ${name} (${serialNumber}) added to inventory via PO ${po._id}`,
            performedBy: req.user._id,
            asset: asset._id,
            newStatus: asset.status,
        });

        const populated = await populate(PurchaseOrder.findById(po._id));
        res.status(201).json({ status: 'success', data: { purchaseOrder: populated, asset, assignment } });
    }),
];

// ─────────────────────────────────────────────
// @desc   Bulk add multiple assets to inventory (for qty > 1 POs)
// @route  POST /api/purchase-orders/:id/bulk-receive
// @access store_manager
// ─────────────────────────────────────────────
exports.bulkReceiveAndAdd = [
    body('assets').isArray({ min: 1 }).withMessage('assets array is required'),
    body('assets.*.serialNumber').trim().notEmpty().withMessage('Each asset must have a serial number'),
    body('assets.*.name').trim().notEmpty().withMessage('Each asset must have a name'),
    body('assets.*.category').trim().notEmpty().withMessage('Each asset must have a category'),
    body('assets.*.condition')
        .isIn(['new', 'good', 'minor_damage', 'major_damage'])
        .withMessage('Invalid condition'),
    handleValidationErrors,
    asyncHandler(async (req, res, next) => {
        const po = await PurchaseOrder.findById(req.params.id).populate({
            path: 'linkedAssetRequest',
            populate: { path: 'requestedBy', select: 'name email' },
        });

        if (!po) return next(new AppError('Purchase order not found', 404));
        if (po.purchaseStatus !== 'received') {
            return next(new AppError('Purchase order must be in "received" state first', 400));
        }

        const { assets: assetDefs } = req.body;

        // Check for duplicate serial numbers within the submitted batch
        const submittedSerials = assetDefs.map(a => a.serialNumber.trim());
        const uniqueSubmitted = new Set(submittedSerials);
        if (uniqueSubmitted.size !== submittedSerials.length) {
            return next(new AppError('Duplicate serial numbers within the batch', 400));
        }

        // Check which serials already exist in the DB
        const existingAssets = await Asset.find({ serialNumber: { $in: submittedSerials } });
        const existingSerialsMap = new Map(existingAssets.map(a => [a.serialNumber, a]));

        const assetsToLink = []; // Asset IDs that already exist and need to be linked
        const newAssetDefs = []; // New asset definitions that need to be created

        for (const def of assetDefs) {
            const sn = def.serialNumber.trim();
            if (existingSerialsMap.has(sn)) {
                const asset = existingSerialsMap.get(sn);
                // Only link if it's NOT already in the PO's linkedAssets
                if (!po.linkedAssets.some(id => id.toString() === asset._id.toString())) {
                    assetsToLink.push(asset._id);
                }
            } else {
                newAssetDefs.push(def);
            }
        }

        let createdCount = 0;
        let newlyLinkedFromExistingCount = assetsToLink.length;

        // 1. Create all new assets
        if (newAssetDefs.length > 0) {
            const createdAssets = await Asset.insertMany(
                newAssetDefs.map(a => ({
                    name: a.name,
                    serialNumber: a.serialNumber.trim(),
                    brand: a.brand || '',
                    category: a.category,
                    condition: a.condition,
                    location: a.location || '',
                    vendor: a.vendor || po.vendor || '',
                    purchasePrice: a.purchasePrice ? Number(a.purchasePrice) : undefined,
                    assetType: a.assetType || 'movable',
                    notes: a.notes || '',
                    status: 'available',
                }))
            );
            createdCount = createdAssets.length;
            po.linkedAssets.push(...createdAssets.map(a => a._id));
        }

        // 2. Link existing ones (that were not previously linked)
        if (assetsToLink.length > 0) {
            po.linkedAssets.push(...assetsToLink);
        }

        // Update individual brand buckets in brandBreakdown
        if (po.brandBreakdown && po.brandBreakdown.length > 0) {
            for (const def of assetDefs) {
                const brandName = (def.brand || '').trim().toLowerCase();
                if (!brandName) continue;

                const match = po.brandBreakdown.find(b => b.brand && b.brand.toLowerCase() === brandName);
                if (match) {
                    match.receivedQuantity = (match.receivedQuantity || 0) + 1;
                }
            }
        }

        // Update overall received quantity
        po.receivedQuantity = po.linkedAssets.length;

        // Set linkedAsset to the first one if not already set (for backward compat)
        if (!po.linkedAsset && po.linkedAssets.length > 0) {
            po.linkedAsset = po.linkedAssets[0];
        }

        const totalHandled = createdCount + newlyLinkedFromExistingCount;
        po.timeline.push({
            status: 'received',
            note: `${totalHandled} asset(s) handled (Created: ${createdCount}, Linked Existing: ${newlyLinkedFromExistingCount})`,
            by: req.user._id,
        });

        await po.save();

        // Audit log
        await createAuditLog({
            action: `Bulk added assets to inventory via PO ${po._id} (Created: ${createdCount}, Linked: ${newlyLinkedFromExistingCount})`,
            performedBy: req.user._id,
        });

        // Use doc.populate for better stability in the response
        await po.populate([
            { path: 'requestedBy', select: 'name email' },
            { path: 'linkedAssetRequest', populate: { path: 'requestedBy', select: 'name' } },
            { path: 'linkedAssets', select: 'name serialNumber category status' },
            { path: 'timeline.by', select: 'name' }
        ]);

        res.status(201).json({
            status: 'success',
            data: {
                purchaseOrder: po,
                created: createdCount,
                linkedExisting: newlyLinkedFromExistingCount,
                totalAddedThisRequest: totalHandled
            },
        });
    }),
];

// ─────────────────────────────────────────────
// @desc   Cancel a purchase order
// @route  PATCH /api/purchase-orders/:id/cancel
// @access store_manager
// ─────────────────────────────────────────────
exports.cancelPurchaseOrder = asyncHandler(async (req, res, next) => {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return next(new AppError('Purchase order not found', 404));

    if (po.purchaseStatus === 'received') {
        return next(new AppError('Cannot cancel a received purchase order', 400));
    }

    if (po.receivedQuantity > 0) {
        return next(new AppError('Cannot cancel a purchase order that has already been partially received in inventory', 400));
    }

    const { note } = req.body;

    po.purchaseStatus = 'cancelled';
    po.timeline.push({
        status: 'cancelled',
        note: note || 'Purchase order cancelled',
        by: req.user._id,
    });

    await po.save();

    // If linked to an AssetRequest, reset it to pending_store so it can be re-processed
    if (po.linkedAssetRequest) {
        const assetReq = await AssetRequest.findById(po.linkedAssetRequest);
        if (assetReq && assetReq.status === 'purchase_requested') {
            assetReq.status = 'pending_store';
            assetReq.storeNote = `Purchase Order cancelled by ${req.user.name}. Request returned to pending pool.`;
            assetReq.timeline.push({
                status: 'pending_store',
                note: `Linked Purchase Order cancelled — returning request to pending pool`,
                by: req.user._id,
            });
            await assetReq.save();
        }
    }

    await createAuditLog({
        action: `Purchase Order ${po._id} CANCELLED`,
        performedBy: req.user._id,
    });

    const populated = await populate(PurchaseOrder.findById(po._id));
    res.status(200).json({ status: 'success', data: { purchaseOrder: populated } });
});

// @route  GET /api/purchase-orders/counts
// @access store_manager, manager, director
// ─────────────────────────────────────────────
exports.getPurchaseCounts = asyncHandler(async (req, res) => {
    const [pending, ordered, received, cancelled] = await Promise.all([
        PurchaseOrder.countDocuments({ purchaseStatus: 'pending_purchase' }),
        PurchaseOrder.countDocuments({ purchaseStatus: 'ordered' }),
        PurchaseOrder.countDocuments({ purchaseStatus: 'received' }),
        PurchaseOrder.countDocuments({ purchaseStatus: 'cancelled' }),
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            counts: {
                pending_purchase: pending,
                ordered,
                received,
                cancelled,
                total: pending + ordered + received + cancelled
            }
        },
    });
});
