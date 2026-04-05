import { useState, useEffect } from 'react'
import { Send, Trash2, Rocket, User, MessageSquare, Sparkles, Mail, Edit2, Save } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_BASE_URL } from '../config'


export default function DraftsReview() {
    const { user, token } = useAuth()
    const [drafts, setDrafts] = useState<any[]>([])
    const [simulationEmail, setSimulationEmail] = useState('')
    const [simulationSender, setSimulationSender] = useState('')
    const [isSimulating, setIsSimulating] = useState(false)
    const [searchCandidates, setSearchCandidates] = useState<{[key: number]: any[]}>({})
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editContent, setEditContent] = useState('')

    useEffect(() => {
        refreshDrafts()
    }, [])

    const refreshDrafts = () => {
        if (!token) return;
        fetch(`${API_BASE_URL}/api/drafts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => setDrafts(data))
    }

    const handleSimulate = () => {
        if (!simulationEmail || !simulationSender) return
        setIsSimulating(true)
        fetch(`${API_BASE_URL}/api/simulate-email`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                sender: simulationSender, 
                body: simulationEmail
            })
        })
        .then(async res => {
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Simulation failed');
            }
            return res.json();
        })
        .then(() => {
            setSimulationEmail('')
            refreshDrafts()
        })
        .catch(err => {
            console.error("Simulation error:", err);
            alert("Error during simulation: " + err.message);
        })
        .finally(() => {
            setIsSimulating(false)
        })
    }

    const handleDiscard = (id: number) => {
        if (!confirm('Are you sure you want to discard this draft?') || !token) return
        fetch(`${API_BASE_URL}/api/drafts/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            if (res.ok) refreshDrafts()
            else alert('Failed to discard draft')
        })
    }

    const handleApprove = (id: number) => {
        if (!token) return
        setIsSimulating(true) // Reuse loading state
        fetch(`${API_BASE_URL}/api/drafts/${id}/approve`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(async res => {
            if (res.ok) {
                alert('Reply sent successfully!')
                refreshDrafts()
            } else {
                const err = await res.json().catch(() => ({}))
                alert('Error sending reply: ' + (err.message || 'Unknown error'))
            }
        })
        .finally(() => setIsSimulating(false))
    }

    const handleSearchArticle = (id: number) => {
        if (!token) return
        fetch(`${API_BASE_URL}/api/drafts/${id}/search-article`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.candidates) {
                setSearchCandidates(prev => ({ ...prev, [id]: data.candidates }));
            }
        });
    }

    const handleAttachUrl = (id: number, url: string) => {
        fetch(`${API_BASE_URL}/api/drafts/${id}/attach-url`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                url, 
                filename: url.toLowerCase().split(/[?#]/)[0].endsWith('.pdf') ? "requested_article.pdf" : "View Article Link" 
            })
        })
        .then(res => res.json())
        .then(() => {
            alert("Article attached!");
            refreshDrafts();
        });
    }

    const handleRemoveAttachment = (draftId: number, index: number) => {
        if (!confirm('Remove this attachment?')) return;
        fetch(`${API_BASE_URL}/api/drafts/${draftId}/attachments/${index}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(() => {
            refreshDrafts();
        });
    }

    const handleUpdateDraft = (id: number) => {
        fetch(`${API_BASE_URL}/api/drafts/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ replyContent: editContent })
        })
        .then(res => res.json())
        .then(() => {
            setEditingId(null);
            refreshDrafts();
        });
    }


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h1>Drafts & Simulation</h1>

            {/* Simulation Tool */}
            <div className="card" style={{ border: '2px solid var(--accent-purple)', background: 'rgba(139, 92, 246, 0.05)' }}>
                <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-purple)' }}>
                    <Rocket size={24} /> Simulation Box
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Student's Email</label>
                        <input
                            className="input"
                            placeholder="e.g. jdoe@university.edu"
                            value={simulationSender}
                            onChange={(e) => setSimulationSender(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Message Content</label>
                        <textarea
                            className="input"
                            style={{ minHeight: '120px' }}
                            placeholder="e.g. Hi! When is the final exam?"
                            value={simulationEmail}
                            onChange={(e) => setSimulationEmail(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleSimulate}
                        disabled={isSimulating}
                        className="btn btn-blue"
                        style={{ backgroundColor: 'var(--accent-purple)', width: 'fit-content', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        {isSimulating ? 'Processing...' : <><Sparkles size={18} /> Trigger AI Interaction</>}
                    </button>
                </div>
            </div>

            {/* Drafts List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h2 style={{ fontSize: '1.8rem' }}>Pending Drafts</h2>
                {drafts.length === 0 && (
                    <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                        <MessageSquare size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                        <p>No new drafts yet. Use the simulation box above to test the AI.</p>
                    </div>
                )}
                {[...drafts].reverse().map((draft, idx) => (
                    <div key={idx} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '1rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                                <User size={16} color="var(--accent-blue)" /> {draft.sender}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                {new Date(draft.timestamp).toLocaleString()}
                            </div>
                        </div>
                        <div style={{ padding: '2rem' }}>
                            {draft.isArticleRequest && (
                                <div style={{ 
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                                    padding: '1.5rem', 
                                    borderRadius: '0.75rem', 
                                    marginBottom: '2rem',
                                    border: '1px dashed var(--accent-blue)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h4 style={{ color: 'var(--accent-blue)', marginBottom: '0.25rem' }}>Article Request Detected</h4>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>AI detected a request for: <strong>{draft.articleQuery}</strong></p>
                                        </div>
                                        <button 
                                            onClick={() => handleSearchArticle(draft.id)}
                                            className="btn btn-blue"
                                            style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                                        >
                                            Find PDF
                                        </button>
                                    </div>

                                    {searchCandidates[draft.id] && (
                                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <h5 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>SEARCH RESULTS</h5>
                                                <button onClick={() => setSearchCandidates(prev => {
                                                    const next = {...prev};
                                                    delete next[draft.id];
                                                    return next;
                                                })} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.7rem' }}>Close</button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {searchCandidates[draft.id].map((c: any, i: number) => (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
                                                        <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.name}</a>
                                                        <button 
                                                            onClick={() => handleAttachUrl(draft.id, c.url)}
                                                            className="btn" 
                                                            style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', backgroundColor: 'var(--accent-blue)', color: 'white' }}
                                                        >
                                                            Attach
                                                        </button>
                                                    </div>
                                                ))}
                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                    <input 
                                                        id={`custom-url-${draft.id}`}
                                                        placeholder="Or paste custom PDF URL..." 
                                                        className="input" 
                                                        style={{ fontSize: '0.8rem', padding: '0.4rem' }} 
                                                    />
                                                    <button 
                                                        onClick={() => {
                                                            const val = (document.getElementById(`custom-url-${draft.id}`) as HTMLInputElement).value;
                                                            if (val) handleAttachUrl(draft.id, val);
                                                        }}
                                                        className="btn btn-blue" 
                                                        style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem' }}
                                                    >
                                                        Attach Custom
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {draft.attachments && draft.attachments.length > 0 && (
                                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                            <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Attached Files</h5>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {draft.attachments.map((at: any, i: number) => (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '0.4rem', fontSize: '0.85rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                                                            <Mail size={14} /> 
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{at.filename}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleRemoveAttachment(draft.id, i)}
                                                            className="btn"
                                                            style={{ background: 'none', color: '#ef4444', padding: '0.2rem', cursor: 'pointer' }}
                                                            title="Remove attachment"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Student Asked</label>
                                <div style={{ marginTop: '0.5rem', fontStyle: 'italic', color: 'var(--text-secondary)', borderLeft: '3px solid var(--border)', paddingLeft: '1.5rem' }}>
                                    "{draft.originalBody}"
                                </div>
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-blue)', letterSpacing: '0.05em' }}>AI Suggested Reply</label>
                                <div style={{ marginTop: '0.5rem', backgroundColor: '#0f172a', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                    {editingId === draft.id ? (
                                        <textarea
                                            className="input"
                                            style={{ width: '100%', minHeight: '150px', backgroundColor: 'transparent', color: 'white', border: 'none', outline: 'none', resize: 'vertical' }}
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                        />
                                    ) : (
                                        <div style={{ whiteSpace: 'pre-wrap' }}>
                                            {typeof draft.replyContent === 'string' ? draft.replyContent : draft.replyContent?.reply || JSON.stringify(draft.replyContent)}
                                        </div>
                                    )}
                                </div>
                            </div>
                             <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                {editingId === draft.id ? (
                                    <>
                                        <button 
                                            onClick={() => handleUpdateDraft(draft.id)}
                                            className="btn btn-blue" 
                                            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                                        >
                                            <Save size={18} /> Save Change
                                        </button>
                                        <button 
                                            onClick={() => setEditingId(null)}
                                            className="btn" 
                                            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => handleDiscard(draft.id)}
                                            className="btn" 
                                            style={{ backgroundColor: '#ef4444', color: 'white', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                                        >
                                            <Trash2 size={18} /> Discard
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setEditingId(draft.id);
                                                setEditContent(typeof draft.replyContent === 'string' ? draft.replyContent : draft.replyContent?.reply || JSON.stringify(draft.replyContent));
                                            }}
                                            className="btn" 
                                            style={{ backgroundColor: 'var(--accent-blue)', color: 'white', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                                        >
                                            <Edit2 size={18} /> Edit
                                        </button>
                                        <button 
                                            onClick={() => handleApprove(draft.id)}
                                            disabled={isSimulating}
                                            className="btn btn-blue" 
                                            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                                        >
                                            <Send size={18} /> Approve & Send
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
