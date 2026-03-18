const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.post('/', authorize('manager'), assignmentController.createAssignment);
router.get('/', assignmentController.getAssignments);
router.get('/:id', assignmentController.getAssignment);
router.post('/:id/return-request', authorize('employee'), assignmentController.requestReturn);
router.patch('/:id/approve-return', authorize('store_manager'), assignmentController.approveReturn);
router.post('/:id/report-lost', authorize('employee'), assignmentController.reportLost);
router.post('/:id/transfer', authorize('store_manager', 'manager'), assignmentController.transferAsset);

module.exports = router;
