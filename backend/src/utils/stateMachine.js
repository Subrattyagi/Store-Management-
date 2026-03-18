const AppError = require('./AppError');

/**
 * Valid asset lifecycle transitions
 */
const VALID_TRANSITIONS = {
    available: ['issued', 'under_maintenance'],
    issued: ['return_requested', 'under_maintenance', 'lost'],
    return_requested: ['available'],
    under_maintenance: ['available'],
    lost: [], // terminal state — no valid transitions out
};

/**
 * Validates an asset status transition
 * @throws {AppError} if the transition is invalid
 */
const validateTransition = (from, to) => {
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed) {
        throw new AppError(`Unknown current status: ${from}`, 400);
    }
    if (!allowed.includes(to)) {
        throw new AppError(
            `Invalid status transition: ${from} → ${to}. Allowed: [${allowed.join(', ') || 'none'}]`,
            400
        );
    }
};

module.exports = { VALID_TRANSITIONS, validateTransition };
