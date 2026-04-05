import { useState, useEffect } from 'react'
import { BookOpen, Key, Info, Edit2, Save, X, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_BASE_URL } from '../config'

interface KnowledgeItem {
    keyword: string
    details: string
}

export default function KnowledgeBase() {
    const { token } = useAuth()
    const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([])
    const [newKeyword, setNewKeyword] = useState('')
    const [newDetails, setNewDetails] = useState('')
    
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [editKey, setEditKey] = useState('')
    const [editValue, setEditValue] = useState('')

    useEffect(() => {
        if (!token) return;
        fetch(`${API_BASE_URL}/api/knowledge-base`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => setKnowledge(data))
    }, [token])

    const handleAdd = () => {
        if (!newKeyword || !newDetails || !token) return
        fetch(`${API_BASE_URL}/api/knowledge-base`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ keyword: newKeyword, details: newDetails })
        }).then(() => {
            setKnowledge([...knowledge, { keyword: newKeyword, details: newDetails }])
            setNewKeyword('')
            setNewDetails('')
        })
    }

    const handleStartEdit = (index: number) => {
        setEditingIndex(index)
        setEditKey(knowledge[index].keyword)
        setEditValue(knowledge[index].details)
    }

    const handleCancelEdit = () => {
        setEditingIndex(null)
    }

    const handleSaveEdit = (index: number) => {
        if (!editKey || !editValue || !token) return
        fetch(`${API_BASE_URL}/api/knowledge-base/${index}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ keyword: editKey, details: editValue })
        }).then(() => {
            const newKnowledge = [...knowledge]
            newKnowledge[index] = { keyword: editKey, details: editValue }
            setKnowledge(newKnowledge)
            setEditingIndex(null)
        })
    }

    const handleDelete = (index: number) => {
        if (!confirm('Are you sure you want to delete this entry?') || !token) return
        fetch(`${API_BASE_URL}/api/knowledge-base/${index}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(() => {
            const newKnowledge = knowledge.filter((_, i) => i !== index)
            setKnowledge(newKnowledge)
        })
    }


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h1>Knowledge Base</h1>

            <div className="card">
                <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-blue)' }}>
                    <BookOpen size={24} /> New Entry
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Keyword / Topic</label>
                        <input
                            className="input"
                            placeholder="e.g. Exam Date"
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Details / Answer</label>
                        <textarea
                            className="input"
                            style={{ minHeight: '100px', resize: 'vertical' }}
                            placeholder="e.g. The exam is on October 12th in Room 301."
                            value={newDetails}
                            onChange={(e) => setNewDetails(e.target.value)}
                        />
                    </div>
                    <button onClick={handleAdd} className="btn btn-blue" style={{ width: 'fit-content' }}>
                        Save Entry
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem' }}>Saved Knowledge</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                    {knowledge.map((item, idx) => (
                        <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                                {editingIndex === idx ? (
                                    <>
                                        <button onClick={() => handleSaveEdit(idx)} className="btn btn-blue" style={{ padding: '0.4rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', backgroundColor: 'var(--accent-green)' }}>
                                            <Save size={16} />
                                        </button>
                                        <button onClick={handleCancelEdit} className="btn" style={{ padding: '0.4rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', backgroundColor: '#334155' }}>
                                            <X size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => handleStartEdit(idx)} className="btn btn-blue" style={{ padding: '0.4rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center' }}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(idx)} className="btn" style={{ padding: '0.4rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', backgroundColor: '#452222', color: '#ff8888' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                    <Key size={18} style={{ color: 'var(--accent-blue)', marginTop: '0.25rem' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-blue)', marginBottom: '0.25rem' }}>Keyword</div>
                                        {editingIndex === idx ? (
                                            <input
                                                className="input"
                                                style={{ width: '100%' }}
                                                value={editKey}
                                                onChange={(e) => setEditKey(e.target.value)}
                                            />
                                        ) : (
                                            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{item.keyword}</div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                    <Info size={18} style={{ color: 'var(--accent-green)', marginTop: '0.25rem' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-green)', marginBottom: '0.25rem' }}>Details</div>
                                        {editingIndex === idx ? (
                                            <textarea
                                                className="input"
                                                style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                            />
                                        ) : (
                                            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.details}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
