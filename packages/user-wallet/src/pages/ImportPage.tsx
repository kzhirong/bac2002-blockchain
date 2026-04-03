import { useState } from 'react';
import { encryptVC } from '../crypto';
import { parseVC } from '../jwtUtils';

const STORAGE_KEY = 'kyc-vc-encrypted';

interface Props {
  onImported: () => void;
}

export default function ImportPage({ onImported }: Props) {
  const [step, setStep]          = useState<1 | 2>(1);
  const [vcJwt, setVcJwt]        = useState('');
  const [pin, setPin]            = useState('');
  const [confirmPin, setConfirm] = useState('');
  const [error, setError]        = useState('');
  const [loading, setLoading]    = useState(false);

  const validateJwt = () => {
    setError('');
    try {
      const decoded = parseVC(vcJwt.trim());
      if (!decoded.credentialId)   throw new Error('Missing credentialId in VC');
      if (!decoded.credentialSalt) throw new Error('Missing credentialSalt in VC — cannot verify on-chain');
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid VC JWT');
    }
  };

  const handleStore = async () => {
    setError('');
    if (pin.length < 4)     { setError('PIN must be at least 4 characters'); return; }
    if (pin !== confirmPin) { setError('PINs do not match'); return; }
    setLoading(true);
    try {
      const encrypted = await encryptVC(vcJwt.trim(), pin);
      localStorage.setItem(STORAGE_KEY, encrypted);
      onImported();
    } catch {
      setError('Encryption failed — try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={pageTitle}>Import Credential</h2>
        <p style={pageHint}>
          {step === 1
            ? 'Paste the VC JWT from your issuer portal dashboard.'
            : 'Set a PIN to encrypt the credential locally.'}
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}>
        {([1, 2] as const).map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: step >= s ? '#0d9488' : '#e2e8f0',
              color: step >= s ? 'white' : '#94a3b8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
            }}>
              {step > s ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : s}
            </div>
            <span style={{ fontSize: '0.8rem', color: step >= s ? '#0f172a' : '#94a3b8', fontWeight: step === s ? 600 : 400 }}>
              {s === 1 ? 'Paste JWT' : 'Set PIN'}
            </span>
            {i < 1 && <div style={{ width: 28, height: 1, background: step > s ? '#0d9488' : '#e2e8f0' }} />}
          </div>
        ))}
      </div>

      <div style={card}>
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={fieldGroup}>
              <label style={labelStyle} htmlFor="vcjwt">Verifiable Credential (JWT)</label>
              <textarea
                id="vcjwt"
                value={vcJwt}
                onChange={e => setVcJwt(e.target.value)}
                rows={7}
                placeholder="eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ..."
                style={{ ...inputStyle, fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: '0.72rem', resize: 'vertical' }}
              />
              <span style={hintText}>Copy this from the dashboard after your KYC is approved.</span>
            </div>
            {error && <div style={errBox}>{error}</div>}
            <button onClick={validateJwt} disabled={!vcJwt.trim()} style={primaryBtn(!vcJwt.trim())}>
              Validate &amp; Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={fieldGroup}>
              <label style={labelStyle} htmlFor="pin">
                PIN
                <span style={hintInline}>min. 4 characters</span>
              </label>
              <input id="pin" type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Enter a PIN" autoComplete="new-password" style={inputStyle} />
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle} htmlFor="confirm">Confirm PIN</label>
              <input id="confirm" type="password" value={confirmPin} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter PIN" autoComplete="new-password" style={inputStyle} />
            </div>
            {error && <div style={errBox}>{error}</div>}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setStep(1); setError(''); }} style={ghostBtn}>Back</button>
              <button onClick={handleStore} disabled={loading} style={{ ...primaryBtn(loading), flex: 1 }}>
                {loading ? 'Encrypting...' : 'Store in Wallet'}
              </button>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Your credential is encrypted with AES-256 before being stored locally.
              The PIN is never saved anywhere.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pageTitle: React.CSSProperties = {
  fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem',
};
const pageHint: React.CSSProperties = {
  fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5,
};
const card: React.CSSProperties = {
  background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1.5rem',
};
const fieldGroup: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '0.375rem',
};
const labelStyle: React.CSSProperties = {
  fontSize: '0.875rem', fontWeight: 500, color: '#374151',
  display: 'flex', alignItems: 'center', gap: '0.5rem',
};
const hintInline: React.CSSProperties = {
  fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8',
};
const hintText: React.CSSProperties = {
  fontSize: '0.75rem', color: '#94a3b8',
};
const inputStyle: React.CSSProperties = {
  padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6,
  fontSize: '0.875rem', color: '#0f172a', background: 'white', outline: 'none', width: '100%',
};
const errBox: React.CSSProperties = {
  padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca',
  borderRadius: 6, color: '#b91c1c', fontSize: '0.875rem',
};
const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  padding: '0.625rem', background: disabled ? '#99f6e4' : '#0d9488',
  color: 'white', border: 'none', borderRadius: 6,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontWeight: 600, fontSize: '0.875rem', opacity: disabled ? 0.7 : 1,
});
const ghostBtn: React.CSSProperties = {
  padding: '0.625rem 1rem', background: 'none', color: '#64748b',
  border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem',
};
