const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

const auditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    asset: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset',
        default: null,
    },
    previousStatus: {
        type: String,
        default: null,
    },
    newStatus: {
        type: String,
        default: null,
    },
    previousEmployee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    newEmployee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        immutable: true,
    },
});

// Make timestamp immutable
auditLogSchema.set('timestamps', false);

// Block deletion at model level
auditLogSchema.pre('deleteOne', function (next) {
    return next(new AppError('Audit logs cannot be deleted', 403));
});
auditLogSchema.pre('deleteMany', function (next) {
    return next(new AppError('Audit logs cannot be deleted', 403));
});
auditLogSchema.pre('findOneAndDelete', function (next) {
    return next(new AppError('Audit logs cannot be deleted', 403));
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
