import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import toast from 'react-hot-toast';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { adminLogin } = useAdminAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await adminLogin(email, password);
            toast.success('Welcome back, Admin');
            navigate('/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid credentials');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-root">
            {/* ── Left Brand Panel ── */}
            <div className="login-left">
                <div className="login-left-inner">
                    {/* Logo */}
                    <div className="brand-logo">
                        <div className="brand-logo-wrap">
                            <img
                                src="/bhautiki.png"
                                alt="Bhautiki"
                                className="brand-real-logo"
                            />
                        </div>
                        <div className="brand-portal-label">Admin Portal</div>
                    </div>

                    {/* Content */}
                    <div>
                        <div className="brand-badge">
                            <span className="feature-beacon" />
                            Admin Control Center
                        </div>

                        <h1 className="brand-headline">
                            Manage your<br />
                            org <span>smarter.</span>
                        </h1>

                        <p className="brand-desc">
                            A unified admin portal to onboard employees, manage access credentials,
                            and control role-based permissions — all in one secure place.
                        </p>

                        <div className="brand-features">
                            {[
                                'Employee onboarding & credential generation',
                                'Role-based access control & permissions',
                                'Automated email delivery via Nodemailer',
                                'Real-time onboarding status tracking',
                            ].map((f) => (
                                <div key={f} className="brand-feature">
                                    <span className="feature-beacon" />
                                    {f}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="brand-footer">
                        Authorized administrators only · Bhautiki &trade; 2025
                    </div>
                </div>
            </div>

            {/* ── Right Form Panel ── */}
            <div className="login-right">
                <div className="login-form-card">
                    <div className="form-header">
                        <div className="form-badge">
                            <span className="form-badge-dot" />
                            Secure Access
                        </div>
                        <h2 className="form-title">Admin Sign In</h2>
                        <p className="form-subtitle">Enter your administrator credentials to continue</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="field-group">
                            <label className="field-label">Email address</label>
                            <div className="input-wrap">
                                <span className="input-icon">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                </span>
                                <input
                                    type="email"
                                    className="field-input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="admin@bhautiki.com"
                                    autoComplete="email"
                                    id="admin-email"
                                />
                            </div>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Password</label>
                            <div className="input-wrap">
                                <span className="input-icon">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                        <rect x="3" y="11" width="18" height="11" rx="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="field-input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••••"
                                    autoComplete="current-password"
                                    id="admin-password"
                                    style={{ paddingRight: '42px' }}
                                />
                                <button type="button" className="eye-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                    {showPassword ? (
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn-primary" disabled={isLoading} id="admin-signin-btn">
                            {isLoading ? (
                                <span className="btn-loading">
                                    <span className="spinner" />
                                    Authenticating…
                                </span>
                            ) : (
                                <span className="btn-content">
                                    Sign In to Admin Portal
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                        <polyline points="12 5 19 12 12 19" />
                                    </svg>
                                </span>
                            )}
                        </button>
                    </form>

                    <p className="form-footer-note">Authorized administrators only</p>
                </div>
            </div>
        </div>
    );
}
