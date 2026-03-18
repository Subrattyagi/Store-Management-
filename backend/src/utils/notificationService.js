const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Create a notification for a single recipient.
 * Non-blocking — errors never crash the main flow.
 */
const createNotification = async ({ recipient, type = 'general', title, message, link = null }) => {
    try {
        await Notification.create({ recipient, type, title, message, link });
    } catch (err) {
        console.error('Notification creation failed:', err.message);
    }
};

/**
 * Create notifications for all users with a given role.
 * Useful for broadcasting to all managers / store_managers / directors.
 */
const notifyRole = async ({ role, type, title, message, link = null }) => {
    try {
        const users = await User.find({ role, isDeleted: { $ne: true }, status: 'active' }).select('_id');
        if (!users.length) return;

        const docs = users.map((u) => ({
            recipient: u._id,
            type,
            title,
            message,
            link,
            isRead: false,
        }));

        await Notification.insertMany(docs, { ordered: false });
    } catch (err) {
        console.error('Role notification failed:', err.message);
    }
};

module.exports = { createNotification, notifyRole };
