const mongoose = require('mongoose');

const timelineEntrySchema = new mongoose.Schema({
    status: { type: String, required: true },
    note: { type: String, trim: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
}, { _id: false });

const assetRequestSchema = new mongoose.Schema(
    {
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        assetCategory: {
            type: String,
            required: [true, 'Asset category is required'],
            trim: true,
        },
        assetDescription: {
            type: String,
            required: [true, 'Please describe the asset you need'],
            trim: true,
        },
        urgency: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
        status: {
            type: String,
            enum: ['pending_manager', 'rejected', 'pending_store', 'purchase_requested', 'assigned'],
            default: 'pending_manager',
        },
        // Manager review
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        managerNote: { type: String, trim: true },

        // Store manager processing
        assignedAsset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
        storeNote: { type: String, trim: true },

        // Full history of every status change
        timeline: [timelineEntrySchema],
    },
    { timestamps: true }
);

module.exports = mongoose.model('AssetRequest', assetRequestSchema);
