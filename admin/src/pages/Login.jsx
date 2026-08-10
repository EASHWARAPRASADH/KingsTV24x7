import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking'); // 'checking' | 'online' | 'waking' | 'offline'
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // Pre-warm the backend server on page load
  useEffect(() => {
    let cancelled = false;
    const wakeBackend = async () => {
      setServerStatus('checking');
      for (let i = 0; i < 5; i++) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(api.defaults.baseURL + '/articles/getAll?page=0&size=1', { 
            method: 'GET',
            signal: controller.signal
          });
          clearTimeout(timer);
          if (!cancelled && res.ok) {
            setServerStatus('online');
            return;
          }
        } catch {
          if (!cancelled) setServerStatus(i === 0 ? 'waking' : 'waking');
        }
        if (cancelled) return;
        await new Promise(r => setTimeout(r, 5000));
      }
      if (!cancelled) setServerStatus('offline');
    };
    wakeBackend();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const result = await login(email, password);
      
      if (result.success) {
        // Role-based post-login redirect
        const role = result.role;
        if (role === 'MOBILE_JOURNALIST' || role === 'INSTITUTION_LOGIN') {
          navigate('/journalist/posts');
        } else if (role === 'READER') {
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            window.location.href = 'http://localhost:5174/';
          } else {
            window.location.href = '/';
          }
        } else {
          navigate('/admin/dashboard');
        }
      } else {
        setError(result.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error("Login submit error", err);
      setError(err.message || 'An unexpected error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src="/assets/logo-banner-light.png" 
            alt="KING24X7 Logo" 
            className="logo-light-only" 
            style={{ maxHeight: '55px', width: 'auto', marginBottom: '0.5rem' }} 
          />
          <img 
            src="/assets/logo-banner-dark.png" 
            alt="KING24X7 Logo" 
            className="logo-dark-only" 
            style={{ maxHeight: '55px', width: 'auto', marginBottom: '0.5rem' }} 
          />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Admin Portal Login</p>
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            {serverStatus === 'checking' && <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} color="#F59E0B" /> <span style={{ color: '#F59E0B' }}>Checking server...</span></>}
            {serverStatus === 'waking' && <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} color="#F59E0B" /> <span style={{ color: '#F59E0B' }}>Waking up server... please wait</span></>}
            {serverStatus === 'online' && <><CheckCircle size={14} color="#10B981" /> <span style={{ color: '#10B981' }}>Server online</span></>}
            {serverStatus === 'offline' && <><AlertCircle size={14} color="#EF4444" /> <span style={{ color: '#EF4444' }}>Server offline — try again shortly</span></>}
          </div>
        </div>
        
        {error && (
          <div style={{ backgroundColor: 'var(--danger-glow)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-control" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              placeholder="admin@king24x7.com"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
