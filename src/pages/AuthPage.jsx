import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, ArrowLeft, Shield } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export default function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const referralCode = new URLSearchParams(window.location.search).get('ref');
    if (referralCode) {
      localStorage.setItem('pending_referral_code', referralCode.trim().toUpperCase());
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/app');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate('/app');
    });

    if (Capacitor.isNativePlatform()) {
      const handleUrl = async () => {
        const { App } = await import('@capacitor/app');
        App.addListener('appUrlOpen', async ({ url }) => {
          if (url.includes('access_token') || url.includes('code=')) {
            const hashPart = url.split('#')[1] || url.split('?')[1];
            if (hashPart) {
              const params = new URLSearchParams(hashPart);
              const accessToken = params.get('access_token');
              const refreshToken = params.get('refresh_token');
              if (accessToken && refreshToken) {
                await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
              }
            }
            await Browser.close();
          }
        });
      };
      handleUrl();
    }

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSocialLogin = async (provider) => {
    setLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: 'com.cexistore.app://login-callback',
            skipBrowserRedirect: true,
          }
        });
        if (error) throw error;
        if (data?.url) {
          await Browser.open({ url: data.url, windowName: '_self' });
        }
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/app`
          }
        });
        if (error) throw error;
      }
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--gray-bg)',
    }}>
      
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse at 30% 30%, rgba(99,102,241,0.1) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(139,92,246,0.07) 0%, transparent 50%)',
      }} />
      <div style={{
        position: 'absolute', top: '-20%', right: '-15%', width: '420px', height: '420px', zIndex: 0,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
        filter: 'blur(80px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', left: '-10%', width: '340px', height: '340px', zIndex: 0,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
        filter: 'blur(60px)',
      }} />

      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'absolute', top: '24px', left: '24px', zIndex: 2,
          width: '42px', height: '42px', borderRadius: '12px',
          background: 'var(--white)', border: '1px solid var(--gray-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-glow)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-border)'; e.currentTarget.style.boxShadow = 'none'; }}
        aria-label="Go back"
      >
        <ArrowLeft size={18} style={{ color: 'var(--text-main)' }} />
      </button>

      {/* Auth Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: '420px',
        background: 'var(--white)',
        border: '1px solid var(--gray-border)',
        borderRadius: '24px',
        padding: '40px 32px',
        textAlign: 'center',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Subtle glow border on top */}
        <div style={{
          position: 'absolute', top: '-1px', left: '20%', right: '20%', height: '3px',
          background: 'linear-gradient(90deg, transparent, var(--primary), transparent)',
          borderRadius: '0 0 4px 4px',
        }} />

        {/* Logo */}
        <div style={{
          width: '60px', height: '60px', borderRadius: '16px',
          background: 'var(--gradient-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <Mail size={26} color="#fff" />
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.8px', marginBottom: '8px', color: 'var(--text-main)' }}>
          Welcome back
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-sub)', marginBottom: '28px', lineHeight: 1.5 }}>
          Sign in to access your privacy dashboard.
        </p>

        {/* Social Login Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => handleSocialLogin('github')}
            disabled={loading}
            style={{
              width: '100%', padding: '13px 20px', borderRadius: '14px',
              background: '#0f172a', color: '#fff', border: 'none',
              fontSize: '14px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              transition: 'all 0.2s ease', opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(15, 23, 42, 0.3)'; }}}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.2)'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            {loading ? 'Connecting...' : 'Continue with GitHub'}
          </button>

          <button
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
            style={{
              width: '100%', padding: '13px 20px', borderRadius: '14px',
              background: 'var(--white)', color: 'var(--text-main)',
              border: '1px solid var(--gray-border)',
              fontSize: '14px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              transition: 'all 0.2s ease', opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-glow)'; }}}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-border)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {loading ? 'Connecting...' : 'Continue with Google'}
          </button>
        </div>

        {/* Trust badge */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          marginTop: '24px', padding: '10px', borderRadius: '12px',
          background: 'rgba(99, 102, 241, 0.04)',
        }}>
          <Shield size={14} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
            Secured with end-to-end encryption
          </span>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px' }}>
          By signing in, you agree to our{' '}
          <a href="/terms" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
            Terms of Service
          </a>
          .
        </p>
      </div>
    </div>
  );
}
