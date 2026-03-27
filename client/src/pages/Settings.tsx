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
    const [isTestingImap, setIsTestingImap] = useState(false);
    const [isSyncActive, setIsSyncActive] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

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

    useEffect(() => {
        if (!token) return;
        
        const checkStatus = () => {
            fetch(`${API_BASE_URL}/api/user/imap-status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => setIsSyncActive(data.isActive))
            .catch(() => setIsSyncActive(false));

            fetch(`${API_BASE_URL}/api/user/activity-logs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => setLogs(data.logs || []))
            .catch(() => {});
        };

        checkStatus();
        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
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

    const handleTestImapConnection = async () => {
        if (!token) return;
        setIsTestingImap(true);
        setStatus(null);
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/test-imap-connection`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            if (response.ok && data.success) {
                setStatus({ type: 'success', message: 'IMAP Connection Verified Successfully!' });
            } else {
                setStatus({ type: 'error', message: `IMAP Test Failed: ${data.message || 'Unknown error'}` });
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Testing failed. Server might be unreachable.' });
        } finally {
            setIsTestingImap(false);
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>App Password / API Key</label>
                                {(smtp.host.includes('brevo.com') || smtp.host.includes('sendgrid.net')) && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-blue)' }}>
                                        {smtp.host.includes('brevo.com') ? 'Use v3 API Key (xkeysib-...)' : 'Use API Key (SG....)'}
                                    </span>
                                )}
                            </div>
                            <input className="input" type="password" value={smtp.pass} onChange={e => setSmtp({...smtp, pass: e.target.value})} placeholder="•••• •••• •••• ••••" />
                        </div>
                    </div>
                </div>

                {/* IMAP Settings */}
                <div className="card">
                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-green)', margin: 0 }}>
                            <Shield size={20} /> IMAP (Receiving)
                        </h2>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem', 
                            fontSize: '0.85rem',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '1rem',
                            background: isSyncActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: isSyncActive ? '#10b981' : '#ef4444',
                            border: `1px solid ${isSyncActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                        }}>
                            <div style={{ 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                background: 'currentColor',
                                animation: isSyncActive ? 'pulse 2s infinite' : 'none'
                            }} />
                            {isSyncActive ? 'Real-time Sync Active' : 'Sync Offline'}
                        </div>
                    </div>
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
                    <button type="button" onClick={handleTestConnection} disabled={isTesting || isTestingImap || isSaving} className="btn" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-blue)', padding: '0.75rem 1.5rem', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                        {isTesting ? 'Testing...' : 'Test SMTP Connection'}
                    </button>
                    <button type="button" onClick={handleTestImapConnection} disabled={isTesting || isTestingImap || isSaving} className="btn" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', padding: '0.75rem 1.5rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        {isTestingImap ? 'Testing...' : 'Test IMAP Connection'}
                    </button>
                    <button type="submit" disabled={isSaving || isTesting || isTestingImap} className="btn btn-blue" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem' }}>
                        {isSaving ? 'Saving...' : <><Save size={18} /> Save Settings</>}
                    </button>
                <div className="card" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
                    <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Live Activity Log</h2>
                    <div style={{ 
                        height: '200px', 
                        overflowY: 'auto', 
                        background: 'rgba(0, 0, 0, 0.2)', 
                        borderRadius: '0.5rem', 
                        padding: '1rem',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                    }}>
                        {logs.length > 0 ? logs.map((log, i) => (
                            <div key={i} style={{ 
                                color: log.includes('Error') || log.includes('Failed') ? '#ef4444' : 
                                       log.includes('Success') ? '#10b981' : 
                                       log.includes('Skipping') ? '#f59e0b' : 'var(--text-secondary)',
                                borderLeft: `2px solid ${
                                    log.includes('Error') || log.includes('Failed') ? '#ef4444' : 
                                    log.includes('Success') ? '#10b981' : 
                                    log.includes('Skipping') ? '#f59e0b' : 'rgba(255,255,255,0.1)'
                                }`,
                                paddingLeft: '0.75rem'
                            }}>
                                {log}
                            </div>
                        )) : (
                            <div style={{ color: 'var(--text-muted)' }}>No logs yet... Send a test email!</div>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}
