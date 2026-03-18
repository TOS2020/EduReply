import { useState, useEffect } from 'react'
import { UserPlus, CheckCircle, Mail, Edit2, Trash2, Save, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AuthorizedStudents() {
    const { token } = useAuth()
    const [emails, setEmails] = useState<string[]>([])
    const [newEmail, setNewEmail] = useState('')
    
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [editEmail, setEditEmail] = useState('')

    useEffect(() => {
        if (!token) return;
        fetch('https://edureply.onrender.com/api/authorized-students', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => setEmails(data))
    }, [token])

    const handleAdd = () => {
        if (!newEmail || !token) return
        fetch('https://edureply.onrender.com/api/authorized-students', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ email: newEmail })
        }).then(() => {
            setEmails([...emails, newEmail])
            setNewEmail('')
        })
    }

    const handleStartEdit = (index: number) => {
        setEditingIndex(index)
        setEditEmail(emails[index])
    }

    const handleCancelEdit = () => {
        setEditingIndex(null)
    }

    const handleSaveEdit = (index: number) => {
        if (!editEmail || !token) return
        fetch(`https://edureply.onrender.com/api/authorized-students/${index}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ email: editEmail })
        }).then(() => {
            const newEmails = [...emails]
            newEmails[index] = editEmail
            setEmails(newEmails)
            setEditingIndex(null)
        })
    }

    const handleDelete = (index: number) => {
        if (!confirm('Are you sure you want to remove this authorized email?') || !token) return
        fetch(`https://edureply.onrender.com/api/authorized-students/${index}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(() => {
            const newEmails = emails.filter((_, i) => i !== index)
            setEmails(newEmails)
        })
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h1>Authorized Students</h1>

            <div className="card">
                <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-green)' }}>
                    <UserPlus size={24} /> Add Authorized Email
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Student Email</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <input
                                className="input"
                                style={{ flex: 1 }}
                                placeholder="student@university.edu"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                            />
                            <button onClick={handleAdd} className="btn btn-blue" style={{ backgroundColor: 'var(--accent-green)' }}>
                                Authorize
                            </button>
                        </div>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Only students in this list will trigger an AI response when they email you.
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem' }}>Active Authorization</h2>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {emails.map((email, idx) => (
                        <div key={idx} style={{
                            padding: '1.25rem 2rem',
                            borderBottom: idx === emails.length - 1 ? 'none' : '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                <Mail size={20} color="var(--text-secondary)" />
                                {editingIndex === idx ? (
                                    <input
                                        className="input"
                                        style={{ flex: 1, fontSize: '1.1rem' }}
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        autoFocus
                                    />
                                ) : (
                                    <span style={{ fontSize: '1.1rem' }}>{email}</span>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '2rem' }}>
                                {editingIndex === idx ? (
                                    <>
                                        <button onClick={() => handleSaveEdit(idx)} className="btn" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', backgroundColor: 'var(--accent-green)', color: 'white' }}>
                                            <Save size={18} />
                                        </button>
                                        <button onClick={handleCancelEdit} className="btn" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', backgroundColor: '#475569', color: 'white' }}>
                                            <X size={18} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div style={{
                                            display: 'none', // Hidden on small screens, adjust if needed
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            color: 'var(--accent-green)',
                                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '2rem',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            textTransform: 'uppercase'
                                        }} className="status-badge">
                                            <CheckCircle size={14} /> Active
                                        </div>
                                        <button onClick={() => handleStartEdit(idx)} className="btn" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', backgroundColor: '#334155', color: 'white' }}>
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(idx)} className="btn" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', backgroundColor: '#452222', color: '#ff8888' }}>
                                            <Trash2 size={18} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                @media (min-width: 640px) {
                    .status-badge { display: flex !important; }
                }
            ` }} />
        </div>
    )
}
