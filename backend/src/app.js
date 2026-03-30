const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const assetRoutes = require('./routes/assetRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const exitClearanceRoutes = require('./routes/exitClearanceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const assetRequestRoutes = require('./routes/assetRequestRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const issueRoutes = require('./routes/issueRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Security & parsing middleware
app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : [/^http:\/\/localhost:\d+$/],
    credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Store Management API is running' });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/exit-clearance', exitClearanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/asset-requests', assetRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/admin', adminRoutes);

// Catch-all for unregistered routes
app.all(/(.*)/, (req, res, next) => {
    const AppError = require('./utils/AppError');
    next(new AppError(`Route not found: ${req.originalUrl}`, 404));
});

// Global error handler
app.use(errorHandler);

module.exports = app;
