import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { BookOpen, Users, Mail, LayoutDashboard, LogOut, User as UserIcon, Settings as SettingsIcon } from 'lucide-react'
import KnowledgeBase from './pages/KnowledgeBase'
import AuthorizedStudents from './pages/AuthorizedStudents'
import DraftsReview from './pages/DraftsReview'
import Login from './pages/Login'
import Register from './pages/Register'
import Settings from './pages/Settings'
import { AuthProvider, useAuth } from './context/AuthContext'

function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>;
    
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}

function Sidebar() {
    const { user, logout } = useAuth();

    return (
        <nav className="sidebar">
            <div className="logo">
                <Mail size={32} /> EduReply
            </div>
            <div className="nav-links">
                <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
                    <LayoutDashboard size={20} /> Dashboard
                </NavLink>
                <NavLink to="/knowledge" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <BookOpen size={20} /> Knowledge Base
                </NavLink>
                <NavLink to="/students" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Users size={20} /> Authorized Students
                </NavLink>
                <NavLink to="/drafts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Mail size={20} /> Drafts Review
                </NavLink>
                <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <SettingsIcon size={20} /> Email Settings
                </NavLink>
            </div>
            
            {user && (
                <div style={{ marginTop: 'auto', padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
                            <UserIcon size={18} />
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                        </div>
                    </div>
                    <button onClick={logout} className="nav-item" style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}>
                        <LogOut size={20} /> Logout
                    </button>
                </div>
            )}
        </nav>
    );
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="*" element={
                        <PrivateRoute>
                            <div style={{ display: 'flex', minHeight: '100vh' }}>
                                <Sidebar />
                                <main className="main-content">
                                    <Routes>
                                        <Route path="/" element={
                                            <div className="hero-section">
                                                <h1 className="slogan-title">Welcome, teacher!</h1>
                                                <p className="slogan-subtitle">Automate replies and work more efficiently every day.</p>
                                                <p className="slogan-note">Powered by Generative AI</p>
                                                <div className="card" style={{ marginTop: '3rem' }}>
                                                    <h2 style={{ marginBottom: '1rem' }}>Get Started</h2>
                                                    <p style={{ color: 'var(--text-secondary)' }}>
                                                        Use the sidebar to manage your FAQ knowledge base, authorize students, and review AI-generated drafts.
                                                    </p>
                                                </div>
                                            </div>
                                        } />
                                        <Route path="/knowledge" element={<KnowledgeBase />} />
                                        <Route path="/students" element={<AuthorizedStudents />} />
                                        <Route path="/drafts" element={<DraftsReview />} />
                                        <Route path="/settings" element={<Settings />} />
                                    </Routes>
                                </main>
                            </div>
                        </PrivateRoute>
                    } />
                </Routes>
            </Router>
        </AuthProvider>
    )
}

export default App
