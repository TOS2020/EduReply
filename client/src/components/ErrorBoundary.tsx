import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in EduReply application:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#0f172a',
          color: '#f8fafc',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            background: '#1e293b',
            padding: '2.5rem',
            borderRadius: '1rem',
            border: '1px solid #334155',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)'
          }}>
            <h1 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '1.8rem' }}>
              Oops! Something went wrong
            </h1>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
              EduReply encountered a runtime error. This is usually due to a connection issue or outdated browser data.
            </p>
            <div style={{
              background: '#0f172a',
              padding: '1rem',
              borderRadius: '0.5rem',
              textAlign: 'left',
              fontSize: '0.85rem',
              fontFamily: 'monospace',
              color: '#f43f5e',
              overflowX: 'auto',
              marginBottom: '2rem',
              border: '1px solid #1e293b'
            }}>
              {this.state.error?.toString()}
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  localStorage.removeItem('auth');
                  window.location.href = window.location.origin + window.location.pathname;
                }}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Clear Data & Reset
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: '#38bdf8',
                  color: '#0f172a',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
