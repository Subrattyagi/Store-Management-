const express = require('express');
const router = express.Router();
const exitClearanceController = require('../controllers/exitClearanceController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.post('/', authorize('manager'), exitClearanceController.initiateClearance);
router.get('/', authorize('manager', 'director'), exitClearanceController.getClearances);
router.get('/me', authorize('employee'), exitClearanceController.getMyClearance);
router.patch('/:id/approve', authorize('director'), exitClearanceController.approveClearance);
router.patch('/:id/reject', authorize('director'), exitClearanceController.rejectClearance);

module.exports = router;
