const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Notification = require('../models/Notification');

// @desc   Get my notifications (latest 30)
// @route  GET /api/notifications
// @access Private (all)
exports.getMyNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ recipient: req.user._id })
        .sort('-createdAt')
        .limit(30)
        .lean();

    res.status(200).json({
        status: 'success',
        results: notifications.length,
        data: { notifications },
    });
});

// @desc   Get unread count
// @route  GET /api/notifications/unread-count
// @access Private (all)
exports.getUnreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    res.status(200).json({ status: 'success', data: { count } });
});

// @desc   Mark single notification as read
// @route  PATCH /api/notifications/:id/read
// @access Private (all)
exports.markAsRead = asyncHandler(async (req, res, next) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, recipient: req.user._id },
        { isRead: true },
        { new: true }
    );

    if (!notification) return next(new AppError('Notification not found', 404));

    res.status(200).json({ status: 'success', data: { notification } });
});

// @desc   Mark all my notifications as read
// @route  PATCH /api/notifications/read-all
// @access Private (all)
exports.markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    res.status(200).json({ status: 'success', message: 'All notifications marked as read' });
});
