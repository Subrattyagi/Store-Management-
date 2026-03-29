import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Profile() {
    const { user, updateProfile } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef(null);

    // Initial form state bound to user context
    const [formData, setFormData] = useState({
        phone: user?.phone || '',
        department: user?.department || '',
    });
    const [profilePicture, setProfilePicture] = useState(user?.profilePicture || null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation for JPG/PNG
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            toast.error('Only JPG and PNG formats are allowed.');
            return;
        }

        // 2MB limit
        if (file.size > 2 * 1024 * 1024) {
            toast.error('File size must be less than 2MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setProfilePicture(reader.result); // Base64 string
        };
        reader.readAsDataURL(file);
    };

    const handleRemovePicture = () => {
        setProfilePicture(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Simple Phone Validation: 10 digits
        if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
            toast.error('Please enter a valid 10-digit phone number.');
            return; 
        }

        setIsSaving(true);
        try {
            await updateProfile({
                phone: formData.phone.trim(),
                department: formData.department.trim(),
                profilePicture: profilePicture
            });
            toast.success('Profile updated successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    return (
        <div className="profile-page-wrapper" style={{ minHeight: 'calc(100vh - 80px)', background: '#0F1115', color: '#f3f4f6', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Header Section */}
            <div className="page-header" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>Account Settings</h1>
                <p style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>Manage your professional identity and preferences.</p>
            </div>

            {/* Profile Card Main Container */}
            <div className="glass-card" style={{ width: '100%', maxWidth: '32rem', padding: '2rem', borderRadius: '1.5rem', background: 'rgba(28, 31, 38, 0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>

                {/* Avatar Section */}
                <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ position: 'relative', width: '7rem', height: '7rem', borderRadius: '50%', border: '2px solid #D4AF37', padding: '0.25rem', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
                        {profilePicture ? (
                            <img src={profilePicture} alt="User Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.8), rgba(212, 175, 55, 0.4))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '2.5rem', fontWeight: 700 }}>
                                {getInitials(user?.name)}
                            </div>
                        )}
                        <input
                            type="file"
                            accept=".jpg, .jpeg, .png"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                    </div>

                    {/* Avatar Controls */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)', color: '#0F1115', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.625rem 1.5rem', borderRadius: '9999px', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)', transition: 'all 0.2s', alignSelf: 'center' }}
                            onMouseOver={e => e.target.style.opacity = '0.9'}
                            onMouseOut={e => e.target.style.opacity = '1'}
                        >
                            Upload Photo
                        </button>
                        {profilePicture && (
                            <button
                                type="button"
                                onClick={handleRemovePicture}
                                style={{ background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#D1D5DB', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.625rem 1.5rem', borderRadius: '9999px', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseOver={e => e.target.style.background = 'rgba(255, 255, 255, 0.05)'}
                                onMouseOut={e => e.target.style.background = 'transparent'}
                            >
                                Remove
                            </button>
                        )}
                    </div>
                </section>

                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.05)', width: '100%', margin: '1.5rem 0' }} />

                {/* Form Section */}
                <section>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '0.375rem', height: '1.5rem', background: '#D4AF37', borderRadius: '9999px' }}></span>
                        General Information
                    </h2>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                        {/* Name (Read-only) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>Full Name</label>
                            <input
                                type="text"
                                value={user?.name || ''}
                                readOnly
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'rgba(15, 17, 21, 0.3)', border: '1px solid rgba(255, 255, 255, 0.05)', color: '#9CA3AF', fontSize: '0.875rem', cursor: 'not-allowed', boxSizing: 'border-box' }}
                            />
                        </div>

                        {/* Email (Read-only) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>Email Address</label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                readOnly
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'rgba(15, 17, 21, 0.3)', border: '1px solid rgba(255, 255, 255, 0.05)', color: '#9CA3AF', fontSize: '0.875rem', cursor: 'not-allowed', boxSizing: 'border-box' }}
                            />
                        </div>

                        {/* Phone (Editable) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>Phone Number</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                placeholder="+1 (555) 000-0000"
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'rgba(15, 17, 21, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: '0.875rem', transition: 'all 0.3s ease', boxSizing: 'border-box', outline: 'none' }}
                                onFocus={e => { e.target.style.borderColor = '#D4AF37'; e.target.style.boxShadow = '0 0 0 2px rgba(212, 175, 55, 0.2)'; }}
                                onBlur={e => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>

                        {/* Department (Editable) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>Department</label>
                            <input
                                type="text"
                                name="department"
                                value={formData.department}
                                onChange={handleInputChange}
                                placeholder="e.g. IT, Operations"
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'rgba(15, 17, 21, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: '0.875rem', transition: 'all 0.3s ease', boxSizing: 'border-box', outline: 'none' }}
                                onFocus={e => { e.target.style.borderColor = '#D4AF37'; e.target.style.boxShadow = '0 0 0 2px rgba(212, 175, 55, 0.2)'; }}
                                onBlur={e => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>

                        {/* Action Button */}
                        <div style={{ paddingTop: '1rem' }}>
                            <button
                                type="submit"
                                disabled={isSaving}
                                style={{ width: '100%', background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)', color: '#0F1115', fontWeight: 800, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '1rem', borderRadius: '0.75rem', border: 'none', cursor: isSaving ? 'wait' : 'pointer', transition: 'all 0.2s ease', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                                onMouseOver={e => { if (!isSaving) e.currentTarget.style.boxShadow = '0 0 20px rgba(212,175,55,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseOut={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                                onMouseUp={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            >
                                {isSaving ? (
                                    <>
                                        <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: 2, borderColor: '#0F1115', borderRightColor: 'transparent' }} />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </div>
                    </form>
                </section>
            </div>

            {/* Footer Branding */}
            <footer style={{ marginTop: '2rem', textAlign: 'center', color: '#4B5563', fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                © {new Date().getFullYear()} Bhautiki • Secure Profile Management
            </footer>
        </div>
    );
}
