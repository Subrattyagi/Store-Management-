const express = require('express');
const router = express.Router();
const c = require('../controllers/purchaseOrderController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

// Counts summary (for stat cards)
router.get('/counts', authorize('store_manager', 'manager', 'director'), c.getPurchaseCounts);

// CRUD
router.post('/', authorize('store_manager'), c.createPurchaseOrder);
router.get('/', authorize('store_manager', 'manager', 'director'), c.getPurchaseOrders);
router.get('/:id', authorize('store_manager', 'manager', 'director'), c.getPurchaseOrder);

// Status advancement
router.patch('/:id/status', authorize('store_manager'), c.updatePurchaseStatus);

// Receive asset + add to inventory (+ optional auto-assign)
router.post('/:id/receive', authorize('store_manager'), c.receiveAndAddAsset);

// Bulk add multiple assets (qty > 1 POs)
router.post('/:id/bulk-receive', authorize('store_manager'), c.bulkReceiveAndAdd);


module.exports = router;
