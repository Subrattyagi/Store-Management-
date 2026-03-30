const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Public — admin login with env credentials
router.post('/login', adminController.adminLogin);

// Protected — admin only
router.post('/employees', protect, authorize('admin'), adminController.createEmployee);
router.get('/employees', protect, authorize('admin'), adminController.getEmployees);
router.delete('/employees/:id', protect, authorize('admin'), adminController.deleteEmployee);

module.exports = router;
