const express = require('express');
const router = express.Router();
const c = require('../controllers/assetRequestController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/pending-count', authorize('manager', 'store_manager'), c.getPendingCount);
router.post('/', authorize('employee', 'manager'), c.createRequest);
router.get('/', c.getRequests);
router.get('/:id', c.getRequest);
router.patch('/:id/approve', authorize('manager'), c.approveRequest);
router.patch('/:id/reject', authorize('manager'), c.rejectRequest);
router.patch('/:id/assign', authorize('store_manager'), c.assignAsset);
router.patch('/:id/purchase', authorize('store_manager'), c.markPurchaseNeeded);

module.exports = router;
