const AuditLog = require('../models/AuditLog');

/**
 * Creates an immutable audit log entry
 * @param {Object} params
 * @param {string} params.action - Description of the action
 * @param {string} params.performedBy - User ID
 * @param {string} [params.asset] - Asset ID (optional)
 * @param {string} [params.previousStatus] - Previous status value
 * @param {string} [params.newStatus] - New status value
 */
const createAuditLog = async ({
    action,
    performedBy,
    asset = null,
    previousStatus = null,
    newStatus = null,
    previousEmployee = null,
    newEmployee = null,
}) => {
    try {
        await AuditLog.create({ action, performedBy, asset, previousStatus, newStatus, previousEmployee, newEmployee });
    } catch (err) {
        // Non-blocking — audit failure should never crash main flow
        console.error('Audit log failed:', err.message);
    }
};

module.exports = { createAuditLog };
