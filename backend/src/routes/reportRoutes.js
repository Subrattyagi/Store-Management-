const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/summary', authorize('manager', 'director'), reportController.getSummary);
router.get('/department', authorize('manager', 'director'), reportController.getDepartmentReport);
router.get('/audit-logs', authorize('director'), reportController.getAuditLogs);

module.exports = router;
