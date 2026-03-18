const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
    {
        asset: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Asset',
            required: true,
        },
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['issued', 'return_requested', 'returned', 'transferred'],
            default: 'issued',
        },
        transferNote: {
            type: String,
            trim: true,
        },
        transferredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        returnCondition: {
            type: String,
            enum: ['new', 'good', 'minor_damage', 'major_damage', 'retired'],
        },
        notes: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

// Prevent duplicate active assignments for the same asset
assignmentSchema.index({ asset: 1, status: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
