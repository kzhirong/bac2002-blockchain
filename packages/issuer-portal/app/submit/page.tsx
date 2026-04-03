'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FormData {
  fullName: string;
  nationality: string;
  dob: string;
  documentNumber: string;
  subjectAddress: string;
}

export default function SubmitPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    fullName: '',
    nationality: '',
    dob: '',
    documentNumber: '',
    subjectAddress: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/submit-kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Submission failed');
      setStatus('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  };

  const fields: { label: string; name: keyof FormData; type: string; placeholder: string; hint?: string }[] = [
    { label: 'Full Name',        name: 'fullName',        type: 'text', placeholder: 'Alice Chen' },
    { label: 'Nationality',      name: 'nationality',     type: 'text', placeholder: 'SGP', hint: 'ISO 3166-1 alpha-3 code' },
    { label: 'Date of Birth',    name: 'dob',             type: 'date', placeholder: '' },
    { label: 'Document Number',  name: 'documentNumber',  type: 'text', placeholder: 'A1234567B' },
    { label: 'Wallet Address',   name: 'subjectAddress',  type: 'text', placeholder: '0x...' },
  ];

  if (status === 'success') {
    return (
      <div style={page}>
        <div style={card}>
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dcfce7', border: '1px solid #bbf7d0', margin: '0 auto 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Submission Received</h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
              Your KYC documents have been submitted and are pending admin review.
              You will receive an in-app notification once a decision is made.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, padding: '0.6rem 1.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={card}>
        <a href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Dashboard
        </a>

        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.375rem' }}>Submit KYC Documents</h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
          Fill in your identity details below. Your submission will be reviewed by an admin.
          Only a salted hash is anchored on-chain — your PII is never public.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {fields.map(({ label, name, type, placeholder, hint }) => (
            <div key={name} style={fieldGroup}>
              <label style={labelStyle} htmlFor={name}>
                {label}
                {hint && <span style={hintStyle}>{hint}</span>}
              </label>
              <input
                id={name}
                type={type}
                name={name}
                value={form[name]}
                onChange={handleChange}
                placeholder={placeholder}
                required
                style={inputStyle}
              />
            </div>
          ))}

          {status === 'error' && (
            <div style={errorBox}>{error}</div>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            style={submitBtn(status === 'loading')}
          >
            {status === 'loading' ? 'Submitting...' : 'Submit for KYC Verification'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f8fafc',
  display: 'flex',
  justifyContent: 'center',
  padding: '2.5rem 1rem',
};

const card: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: '2rem',
  width: '100%',
  maxWidth: 520,
  height: 'fit-content',
};

const fieldGroup: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 500,
  color: '#374151',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const hintStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 400,
  color: '#94a3b8',
};

const inputStyle: React.CSSProperties = {
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

const submitBtn = (loading: boolean): React.CSSProperties => ({
  padding: '0.625rem 1rem',
  background: loading ? '#93c5fd' : '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: loading ? 'not-allowed' : 'pointer',
  fontSize: '0.875rem',
  fontWeight: 600,
  marginTop: '0.25rem',
});
