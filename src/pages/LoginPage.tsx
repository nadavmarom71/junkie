import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(password);
    if (!ok) {
      toast.error('סיסמה שגויה');
      setPassword('');
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#080B14',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          padding: '40px',
          borderRadius: '16px',
          background: '#111827',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
          width: '320px',
          position: 'relative',
          zIndex: 11,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              color: '#ffffff',
              fontSize: '28px',
              fontWeight: 700,
              margin: 0,
              letterSpacing: '-0.5px',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            Junkie
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', marginTop: '4px', fontFamily: 'Arial, sans-serif' }}>
            מערכת ניהול פיננסי אישי
          </p>
        </div>

        <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)' }} />

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontFamily: 'Arial, sans-serif' }}>
            סיסמה
          </label>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="הכנס סיסמה"
              autoFocus
              style={{
                width: '100%',
                padding: '10px 40px 10px 14px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                direction: 'ltr',
                fontFamily: 'Arial, sans-serif',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                color: 'rgba(255,255,255,0.45)',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                // Eye-off icon
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                // Eye icon
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
          <button
            type="submit"
            disabled={!password || loading}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '10px',
              background: password && !loading ? 'linear-gradient(135deg,#2563EB,#056dff)' : 'rgba(37,99,235,0.4)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              border: 'none',
              cursor: password && !loading ? 'pointer' : 'not-allowed',
              boxShadow: password ? '0 4px 16px rgba(37,99,235,0.4)' : 'none',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            כניסה
          </button>
        </div>
      </form>
    </div>
  );
}
