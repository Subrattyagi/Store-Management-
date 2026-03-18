const mongoose = require('mongoose');

const exitClearanceSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true, // One clearance record per employee
        },
        status: {
            type: String,
            enum: ['pending', 'blocked', 'cleared'],
            default: 'pending',
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        remarks: {
            type: String,
            trim: true,
        },
        initiatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('ExitClearance', exitClearanceSchema);
