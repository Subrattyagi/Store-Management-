const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema(
    {
        asset: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Asset',
            required: [true, 'Asset reference is required'],
        },
        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User reference is required'],
        },
        issueType: {
            type: String,
            required: [true, 'Issue type is required'],
            enum: ['Screen problem', 'Battery problem', 'Keyboard issue', 'Software issue', 'Other'],
        },
        description: {
            type: String,
            required: [true, 'Issue description is required'],
            trim: true,
        },
        attachmentUrl: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ['open', 'in_progress', 'in_maintenance', 'resolved', 'rejected'],
            default: 'open',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Issue', issueSchema);
