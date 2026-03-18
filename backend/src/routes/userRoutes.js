const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/', authorize('manager', 'director', 'store_manager'), userController.getUsers);
router.get('/:id', authorize('manager', 'director', 'store_manager'), userController.getUser);
router.patch('/:id/role', authorize('director'), userController.updateRole);
router.patch('/:id/status', authorize('manager', 'director'), userController.updateStatus);
router.delete('/:id', authorize('director'), userController.deleteUser);

module.exports = router;
