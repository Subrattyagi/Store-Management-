const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Public — admin login with env credentials
router.post('/login', adminController.adminLogin);

// Protected — admin only
// Employees
router.post('/employees', protect, authorize('admin'), adminController.createEmployee);
router.get('/employees', protect, authorize('admin'), adminController.getEmployees);
router.delete('/employees/:id', protect, authorize('admin'), adminController.deleteEmployee);

// Managers
router.post('/managers', protect, authorize('admin'), adminController.createManager);
router.get('/managers', protect, authorize('admin'), adminController.getManagers);
router.patch('/managers/:id/permissions', protect, authorize('admin'), adminController.updateManagerPermissions);
router.delete('/managers/:id', protect, authorize('admin'), adminController.deleteManager);

// Store Managers
router.post('/store-managers', protect, authorize('admin'), adminController.createStoreManager);
router.get('/store-managers', protect, authorize('admin'), adminController.getStoreManagers);
router.delete('/store-managers/:id', protect, authorize('admin'), adminController.deleteStoreManager);

module.exports = router;
