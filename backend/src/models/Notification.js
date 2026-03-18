const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: [
                'asset_request_created',
                'asset_request_approved',
                'asset_request_rejected',
                'asset_request_assigned',
                'asset_request_purchase',
                'return_requested',
                'return_approved',
                'exit_clearance_initiated',
                'exit_clearance_approved',
                'exit_clearance_rejected',
                'general',
            ],
            default: 'general',
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        link: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

// Auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('Notification', notificationSchema);
