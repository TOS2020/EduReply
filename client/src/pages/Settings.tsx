import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Mail, Shield, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function Settings() {
    const { token } = useAuth();
    const [smtp, setSmtp] = useState({ host: 'smtp.gmail.com', port: '465', user: '', pass: '' });
    const [imap, setImap] = useState({ host: 'imap.gmail.com', port: '993', user: '', pass: '' });
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    useEffect(() => {
        if (!token) return;
        fetch(`${API_BASE_URL}/api/user/settings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.emailConfig) {
                if (data.emailConfig.smtp) setSmtp(data.emailConfig.smtp);
                if (data.emailConfig.imap) setImap(data.emailConfig.imap);
            }
        })
        .catch(err => console.error("Failed to load settings:", err));
    }, [token]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        setIsSaving(true);
        setStatus(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/user/settings`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    emailConfig: { smtp, imap }
                })
            });


            if (response.ok) {
                setStatus({ type: 'success', message: 'Settings updated successfully!' });
            } else {
                const data = await response.json();
                setStatus({ type: 'error', message: data.message || 'Failed to update settings.' });
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Connection error. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleTestConnection = async () => {
        if (!token) return;
        setIsTesting(true);
        setStatus(null);
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/test-email-connection`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            if (response.ok && data.success) {
                setStatus({ type: 'success', message: 'SMTP Connection Verified Successfully!' });
            } else {
                setStatus({ type: 'error', message: `Connection Test Failed: ${data.message || 'Unknown error'}` });
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Testing failed. Server might be unreachable.' });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '0.75rem', color: 'var(--accent-blue)' }}>
                    <SettingsIcon size={24} />
                </div>
                <h1>Email Configuration</h1>
            </div>

            {status && (
                <div style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: status.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: status.type === 'success' ? '#10b981' : '#ef4444',
                    border: `1px solid ${status.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                }}>
                    {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {status.message}
                </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* SMTP Settings */}
                <div className="card">
                    <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-blue)' }}>
                        <Mail size={20} /> SMTP (Sending)
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>SMTP Host</label>
                            <input className="input" value={smtp.host} onChange={e => setSmtp({...smtp, host: e.target.value})} placeholder="smtp.gmail.com" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>SMTP Port</label>
                            <input className="input" value={smtp.port} onChange={e => setSmtp({...smtp, port: e.target.value})} placeholder="465" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Email / Username</label>
                            <input className="input" value={smtp.user} onChange={e => setSmtp({...smtp, user: e.target.value})} placeholder="your-email@gmail.com" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>App Password</label>
                            <input className="input" type="password" value={smtp.pass} onChange={e => setSmtp({...smtp, pass: e.target.value})} placeholder="•••• •••• •••• ••••" />
                        </div>
                    </div>
                </div>

                {/* IMAP Settings */}
                <div className="card">
                    <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-green)' }}>
                        <Shield size={20} /> IMAP (Receiving)
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>IMAP Host</label>
                            <input className="input" value={imap.host} onChange={e => setImap({...imap, host: e.target.value})} placeholder="imap.gmail.com" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>IMAP Port</label>
                            <input className="input" value={imap.port} onChange={e => setImap({...imap, port: e.target.value})} placeholder="993" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Email / Username</label>
                            <input className="input" value={imap.user} onChange={e => setImap({...imap, user: e.target.value})} placeholder="your-email@gmail.com" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>App Password</label>
                            <input className="input" type="password" value={imap.pass} onChange={e => setImap({...imap, pass: e.target.value})} placeholder="•••• •••• •••• ••••" />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button type="button" onClick={handleTestConnection} disabled={isTesting || isSaving} className="btn" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-blue)', padding: '0.75rem 1.5rem', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                        {isTesting ? 'Testing...' : 'Test SMTP Connection'}
                    </button>
                    <button type="submit" disabled={isSaving || isTesting} className="btn btn-blue" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem' }}>
                        {isSaving ? 'Saving...' : <><Save size={18} /> Save Settings</>}
                    </button>
                </div>
            </form>
        </div>
    );
}
