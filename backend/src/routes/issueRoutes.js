const express = require('express');
const { reportIssue, getMyIssues, getAllIssues, updateIssueStatus } = require('../controllers/issueController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = express.Router();

router.use(protect);

// Employee routes
router.post('/', authorize('employee'), reportIssue);
router.get('/my', authorize('employee'), getMyIssues);

// Management routes
router.get('/', authorize('manager', 'director', 'store_manager'), getAllIssues);
router.patch('/:id/status', authorize('manager', 'director', 'store_manager'), updateIssueStatus);

module.exports = router;
