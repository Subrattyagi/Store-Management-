const mongoose = require('mongoose');

const VALID_TRANSITIONS = {
    available: ['issued'],
    issued: ['return_requested', 'under_maintenance', 'lost'],
    return_requested: ['available'],
    under_maintenance: ['available'],
    lost: [],
};

const assetSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Asset name is required'],
            trim: true,
        },
        assetType: {
            type: String,
            enum: ['movable', 'fixed'],
            default: 'movable',
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            trim: true,
        },
        serialNumber: {
            type: String,
            required: [true, 'Serial number is required'],
            unique: true,
            trim: true,
        },
        condition: {
            type: String,
            enum: ['new', 'good', 'minor_damage', 'major_damage', 'retired'],
            default: 'new',
        },
        status: {
            type: String,
            enum: ['available', 'issued', 'return_requested', 'under_maintenance', 'lost'],
            default: 'available',
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        purchaseDate: {
            type: Date,
        },
        purchasePrice: {
            type: Number,
        },
        vendor: {
            type: String,
            trim: true,
        },
        location: {
            type: String,
            trim: true,
        },
        notes: {
            type: String,
            trim: true,
        },
        warranty: {
            provider: { type: String, trim: true },
            expiryDate: { type: Date },
            notes: { type: String, trim: true },
        },
        images: [
            {
                data: { type: String },   // base64 or URL
                name: { type: String },
                uploadedAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

// Static: validate lifecycle transition
assetSchema.statics.isValidTransition = function (from, to) {
    return (VALID_TRANSITIONS[from] || []).includes(to);
};


module.exports = mongoose.model('Asset', assetSchema);
