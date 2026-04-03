'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div style={page}>
      <div style={card}>
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={brandLabel}>KYC Portal</div>
          <h1 style={heading}>Sign in to your account</h1>
          <p style={subtext}>Submit your KYC documents or manage applications.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={field}>
            <label style={label} htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={input}
              placeholder="you@example.com"
            />
          </div>

          <div style={field}>
            <label style={label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={input}
              placeholder="Enter your password"
            />
          </div>

          {error && <div style={errorBox}>{error}</div>}

          <button type="submit" disabled={loading} style={primaryBtn(loading)}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          Don&apos;t have an account?{' '}
          <a href="/auth/register" style={{ color: '#2563eb', fontWeight: 500 }}>Create one</a>
        </p>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const page: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5rem',
  background: '#f8fafc',
};

const card: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: '2rem',
  width: '100%',
  maxWidth: 400,
};

const brandLabel: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#2563eb',
  marginBottom: '0.625rem',
};

const heading: React.CSSProperties = {
  fontSize: '1.375rem',
  fontWeight: 700,
  color: '#0f172a',
  marginBottom: '0.375rem',
};

const subtext: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#64748b',
  lineHeight: 1.5,
};

const field: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
};

const label: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 500,
  color: '#374151',
};

const input: React.CSSProperties = {
  padding: '0.625rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: '0.875rem',
  color: '#0f172a',
  background: 'white',
  outline: 'none',
  width: '100%',
};

const errorBox: React.CSSProperties = {
  padding: '0.75rem',
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: 6,
  color: '#b91c1c',
  fontSize: '0.875rem',
};

const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  padding: '0.625rem 1rem',
  background: disabled ? '#93c5fd' : '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '0.875rem',
  fontWeight: 600,
  marginTop: '0.25rem',
  width: '100%',
});
