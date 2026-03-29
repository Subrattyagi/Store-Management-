const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.post('/check-serials', authorize('store_manager'), assetController.checkSerials);
router.post('/bulk', authorize('store_manager'), assetController.createAssetsBulk);
router.post('/migrate-conditions', authorize('store_manager', 'director'), assetController.migrateConditions);
router.post('/', authorize('store_manager'), assetController.createAsset);
router.get('/', assetController.getAssets);
router.get('/:id', assetController.getAsset);
router.get('/:id/history', authorize('store_manager', 'manager', 'director'), assetController.getAssetHistory);
router.patch('/:id', authorize('store_manager'), assetController.updateAsset);
router.patch('/:id/condition', authorize('store_manager'), assetController.updateCondition);
router.patch('/:id/status', authorize('store_manager', 'manager'), assetController.updateAssetStatus);
router.patch('/:id/retire', authorize('store_manager'), assetController.retireAsset);
router.delete('/:id', authorize('director'), assetController.deleteAsset);

module.exports = router;
