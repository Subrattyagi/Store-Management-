import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_DASHBOARDS_MAP } from '../../routes/ProtectedRoute';

const QUICK_LOGINS = [
    { role: 'Director', email: 'director@company.com', icon: '👑', color: '#f5d060', bg: 'rgba(212, 175, 55, 0.1)' },
    { role: 'Manager', email: 'manager@company.com', icon: '💼', color: '#f5d060', bg: 'rgba(212, 175, 55, 0.1)' },
    { role: 'Store Mgr', email: 'storemanager@company.com', icon: '🏬', color: '#f5d060', bg: 'rgba(212, 175, 55, 0.1)' },
    { role: 'Employee', email: 'employee@company.com', icon: '👤', color: '#f5d060', bg: 'rgba(212, 175, 55, 0.1)' },
];

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const user = await login(email, password);
            navigate(ROLE_DASHBOARDS_MAP[user.role] || '/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const quickFill = (q) => {
        setEmail(q.email);
        setPassword('password123');
        setError('');
    };

    return (
        <div className="login-page">
            {/* Left branding panel */}
            <div className="login-branding">
                <div className="login-branding-content">
                    <div className="login-branding-logo premium-logo-glow">
                        <img src="/bhautiki.png" alt="Bhautiki+" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
                    </div>
                    <h1>Manage your<br />assets smarter.</h1>
                    <p>A complete asset lifecycle management platform built for modern organizations. Track, assign, and audit with confidence.</p>
                    <div className="login-features">
                        {['Role-based access control', 'Real-time asset tracking', 'Audit logs & reports', 'Exit clearance management'].map(f => (
                            <div key={f} className="login-feature-item">
                                <span className="login-feature-dot" />
                                {f}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right form panel */}
            <div className="login-form-panel">
                <div className="login-form-header">
                    <h2>Welcome back</h2>
                    <p>Sign in to your account to continue</p>
                </div>

                {error && (
                    <div className="alert alert-error">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email address</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@company.com"
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••••"
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                Signing in…
                            </>
                        ) : (
                            <>
                                Sign In
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>

                <div className="quick-login-section">
                    <div className="quick-login-label">Quick access — demo accounts</div>
                    <div className="quick-login-chips">
                        {QUICK_LOGINS.map((q) => (
                            <button key={q.role} className="quick-chip" onClick={() => quickFill(q)} type="button">
                                <div className="quick-chip-icon" style={{ background: q.bg, color: q.color }}>
                                    {q.icon}
                                </div>
                                <div className="quick-chip-info">
                                    <div className="quick-chip-role">{q.role}</div>
                                    <div className="quick-chip-email">{q.email}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
