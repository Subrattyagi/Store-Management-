const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

const maintenanceSchema = new mongoose.Schema(
    {
        asset: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Asset',
            required: [true, 'Asset reference is required'],
        },
        description: {
            type: String,
            required: [true, 'Issue description is required'],
            trim: true,
        },
        repairVendor: {
            type: String,
            trim: true,
        },
        repairCost: {
            type: Number,
            min: [0, 'Repair cost cannot be negative'],
        },
        repairDate: {
            type: Date,
        },
        maintenanceStatus: {
            type: String,
            enum: ['pending', 'in_progress', 'completed'],
            default: 'pending',
        },
        notes: {
            type: String,
            trim: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

// Block all deletion attempts — maintenance history is immutable
maintenanceSchema.pre('deleteOne', function (next) {
    return next(new AppError('Maintenance records cannot be deleted', 403));
});
maintenanceSchema.pre('deleteMany', function (next) {
    return next(new AppError('Maintenance records cannot be deleted', 403));
});
maintenanceSchema.pre('findOneAndDelete', function (next) {
    return next(new AppError('Maintenance records cannot be deleted', 403));
});

module.exports = mongoose.model('Maintenance', maintenanceSchema);
