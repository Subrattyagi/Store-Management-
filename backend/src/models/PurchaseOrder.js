const mongoose = require('mongoose');

const timelineEntrySchema = new mongoose.Schema(
    {
        status: { type: String, required: true },
        note: { type: String, trim: true },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
    },
    { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
    {
        // What needs to be purchased
        assetCategory: {
            type: String,
            required: [true, 'Asset category is required'],
            trim: true,
        },
        assetDescription: {
            type: String,
            required: [true, 'Please describe the asset to purchase'],
            trim: true,
        },
        quantity: {
            type: Number,
            default: 1,
            min: [1, 'Quantity must be at least 1'],
        },
        receivedQuantity: {
            type: Number,
            default: 0,
            min: [0, 'Received quantity cannot be negative'],
        },

        // Vendor & cost
        vendor: { type: String, trim: true },
        estimatedCost: { type: Number, min: 0 },

        // Who raised this PO
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        // Optional link to the AssetRequest that triggered this purchase
        linkedAssetRequest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AssetRequest',
            default: null,
        },

        // Procurement lifecycle
        purchaseStatus: {
            type: String,
            enum: ['pending_purchase', 'ordered', 'received', 'cancelled'],
            default: 'pending_purchase',
        },

        // Dates
        orderDate: { type: Date },
        receivedDate: { type: Date },

        // Asset added to inventory after receipt (populated once received + added)
        linkedAsset: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Asset',
            default: null,
        },

        // For bulk POs (quantity > 1): all assets added to inventory
        linkedAssets: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Asset',
            },
        ],

        notes: { type: String, trim: true },

        // Full audit trail
        timeline: [timelineEntrySchema],
    },
    { timestamps: true }
);

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
