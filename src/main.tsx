import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";
import { AudioPlayerProvider } from "./contexts/AudioPlayerContext";

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#1a1a2e', 
          color: '#fff', 
          minHeight: '100vh',
          fontFamily: 'Inter, sans-serif'
        }}>
          <h1 style={{ color: '#f87171' }}>Algo deu errado</h1>
          <pre style={{ 
            backgroundColor: '#0f0f23', 
            padding: '15px', 
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '14px'
          }}>
            {this.state.error?.message}
            {"\n\n"}
            {this.state.error?.stack}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#00d4ff',
              color: '#1a1a2e',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Recarregar Página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Loading fallback
const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#fff',
    fontFamily: 'Inter, sans-serif'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid rgba(0, 212, 255, 0.3)',
        borderTop: '3px solid #00d4ff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 16px'
      }} />
      <p>Carregando...</p>
    </div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const container = document.getElementById("root");

if (container) {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <AudioPlayerProvider>
          <App />
        </AudioPlayerProvider>
      </Suspense>
    </ErrorBoundary>
  );
} else {
  console.error("Root element not found");
}