const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);
router.use(authorize('store_manager'));

router.post('/', maintenanceController.createMaintenance);
router.get('/', maintenanceController.getAllMaintenance);
router.get('/asset/:assetId', maintenanceController.getByAsset);
router.patch('/:id/status', maintenanceController.updateMaintenanceStatus);

module.exports = router;
