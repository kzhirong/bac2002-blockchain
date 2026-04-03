'use client';

import { useState } from 'react';

interface KycFormData {
  fullName: string;
  nationality: string;
  dob: string;
  documentNumber: string;
  subjectAddress: string;
}

interface IssuanceResult {
  vcJwt: string;
  credentialId: string;
  credentialHash: string;
  txHash: string;
  issuerDid: string;
  subjectDid: string;
}

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontFamily: 'monospace',
  fontSize: '0.9rem',
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
  fontSize: '0.85rem',
  color: '#374151',
  fontWeight: 500,
};

export default function KycForm() {
  const [form, setForm] = useState<KycFormData>({
    fullName: '',
    nationality: '',
    dob: '',
    documentNumber: '',
    subjectAddress: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<IssuanceResult | null>(null);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/issue-vc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Issuance failed');
      setResult(data);
      setStatus('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  };

  const fields = [
    { label: 'Full Name', name: 'fullName', type: 'text', placeholder: 'Alice Chen' },
    { label: 'Nationality (ISO 3166-1 alpha-3)', name: 'nationality', type: 'text', placeholder: 'SGP' },
    { label: 'Date of Birth', name: 'dob', type: 'date', placeholder: '' },
    { label: 'Document Number', name: 'documentNumber', type: 'text', placeholder: 'A1234567B' },
    { label: 'Subject Wallet Address', name: 'subjectAddress', type: 'text', placeholder: '0x...' },
  ] as const;

  return (
    <div style={{ maxWidth: 640, margin: '3rem auto', padding: '0 1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>KYC Issuance Portal</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Submit identity details for mock KYC verification. A Verifiable Credential
        will be signed and anchored on Polygon Amoy.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {fields.map(({ label, name, type, placeholder }) => (
          <label key={name} style={labelStyle}>
            {label}
            <input
              type={type}
              name={name}
              value={form[name]}
              onChange={handleChange}
              placeholder={placeholder}
              required
              style={inputStyle}
            />
          </label>
        ))}

        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            padding: '0.75rem',
            background: status === 'loading' ? '#8b5cf6' : '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 600,
          }}
        >
          {status === 'loading' ? 'Running KYC check & anchoring…' : 'Submit for KYC Verification'}
        </button>
      </form>

      {status === 'error' && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, color: '#dc2626', fontSize: '0.875rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {status === 'success' && result && (
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ padding: '1rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6 }}>
            <strong style={{ color: '#16a34a' }}>KYC Approved — Credential Issued & Anchored</strong>
          </div>

          {[
            { label: 'Credential ID', value: result.credentialId },
            { label: 'Issuer DID', value: result.issuerDid },
            { label: 'Subject DID', value: result.subjectDid },
            { label: 'On-chain Hash (credentialHash)', value: result.credentialHash },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>{label}</div>
              <pre style={{ background: '#f3f4f6', padding: '0.5rem 0.75rem', borderRadius: 6, fontSize: '0.75rem', wordBreak: 'break-all', whiteSpace: 'pre-wrap', margin: 0 }}>
                {value}
              </pre>
            </div>
          ))}

          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Anchor Transaction</div>
            <a
              href={`https://amoy.polygonscan.com/tx/${result.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#7c3aed', fontSize: '0.85rem', wordBreak: 'break-all' }}
            >
              {result.txHash}
            </a>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
              Verifiable Credential (JWT — store this in your wallet)
            </div>
            <textarea
              readOnly
              value={result.vcJwt}
              rows={6}
              style={{ ...inputStyle, resize: 'vertical', fontSize: '0.7rem', color: '#374151' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
