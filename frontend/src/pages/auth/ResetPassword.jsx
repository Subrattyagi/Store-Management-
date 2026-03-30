import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';
import toast from 'react-hot-toast';

export default function ResetPassword() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { user, login, logout } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setIsLoading(true);
        try {
            const res = await authAPI.resetPassword({ newPassword, confirmPassword });
            const userData = res.data.data.user;

            // Update localStorage with fresh user (isTempPassword now false)
            localStorage.setItem('user', JSON.stringify(userData));

            toast.success('Password reset successfully! Welcome aboard 🎉');

            // Navigate to role dashboard
            const dashboards = {
                employee: '/employee/assets',
                store_manager: '/store-manager/inventory',
                manager: '/manager/dashboard',
                director: '/director/reports',
            };
            navigate(dashboards[userData.role] || '/employee/assets');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reset password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="reset-page">
            <div className="reset-card">
                {/* Warning Icon */}
                <div className="reset-icon-wrap">
                    <div className="reset-icon">
                        🔑
                    </div>
                </div>

                <h1 className="reset-title">Reset Your Password</h1>
                <p className="reset-subtitle">
                    Your account uses a temporary password. Please set a permanent password to continue.
                </p>

                <div className="reset-warning-banner">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    This is a required step before you can access your account
                </div>

                <form onSubmit={handleSubmit} className="reset-form">
                    <div className="form-group">
                        <label className="form-label">New Password</label>
                        <div className="password-input-wrap">
                            <input
                                type={showNew ? 'text' : 'password'}
                                className="form-input"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                placeholder="Enter new password"
                                id="new-password"
                            />
                            <button type="button" className="toggle-eye" onClick={() => setShowNew(!showNew)}>
                                {showNew ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Confirm Password</label>
                        <div className="password-input-wrap">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                className="form-input"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Re-enter your new password"
                                id="confirm-password"
                            />
                            <button type="button" className="toggle-eye" onClick={() => setShowConfirm(!showConfirm)}>
                                {showConfirm ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <div className="password-hints">
                        <span className={newPassword.length >= 6 ? 'hint-ok' : 'hint'}>
                            {newPassword.length >= 6 ? '✓' : '○'} At least 6 characters
                        </span>
                        <span className={newPassword && confirmPassword && newPassword === confirmPassword ? 'hint-ok' : 'hint'}>
                            {newPassword && confirmPassword && newPassword === confirmPassword ? '✓' : '○'} Passwords match
                        </span>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%', justifyContent: 'center' }}
                        disabled={isLoading}
                        id="set-password-btn"
                    >
                        {isLoading ? (
                            <>
                                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                Setting Password…
                            </>
                        ) : (
                            <>
                                Set New Password
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>

                <p className="reset-footer">
                    Having trouble?{' '}
                    <button
                        onClick={() => { logout(); navigate('/login'); }}
                        style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
                    >
                        Return to login
                    </button>
                </p>
            </div>
        </div>
    );
}
