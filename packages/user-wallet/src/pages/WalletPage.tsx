import { useMemo } from 'react';
import { parseVC } from '../jwtUtils';

const STORAGE_KEY = 'kyc-vc-encrypted';

interface Props {
  vcJwt: string | null;
  onPresent: () => void;
  onRemove: () => void;
  onUnlock: () => void;
  locked: boolean;
}

export default function WalletPage({ vcJwt, onPresent, onRemove, onUnlock, locked }: Props) {
  const hasStored = !!localStorage.getItem(STORAGE_KEY);
  const decoded   = useMemo(() => {
    if (!vcJwt) return null;
    try { return parseVC(vcJwt); } catch { return null; }
  }, [vcJwt]);

  const daysUntilExpiry = decoded
    ? Math.ceil((new Date(decoded.expirationDate).getTime() - Date.now()) / 86_400_000)
    : null;

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!hasStored) {
    return (
      <div style={emptyWrap}>
        <div style={emptyIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </svg>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>No credential stored yet.</p>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Go to Import to add your KYC credential.</p>
      </div>
    );
  }

  // ── Locked state ───────────────────────────────────────────────────────────
  if (locked) {
    return (
      <div>
        <div style={{ marginBottom: '1.75rem' }}>
          <h2 style={pageTitle}>Wallet</h2>
          <p style={pageHint}>Your credential is encrypted and stored locally.</p>
        </div>
        <div style={card}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0', gap: '1rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>Wallet Locked</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Enter your PIN to view your credential.</div>
            </div>
            <button onClick={onUnlock} style={tealBtn}>Unlock Wallet</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Parse error ────────────────────────────────────────────────────────────
  if (!decoded) {
    return (
      <div style={card}>
        <p style={{ color: '#b91c1c', fontSize: '0.875rem' }}>Could not parse stored credential.</p>
        <button onClick={onRemove} style={{ ...tealBtn, background: '#dc2626', marginTop: '1rem' }}>
          Remove &amp; Re-import
        </button>
      </div>
    );
  }

  const expired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

  // ── Credential view ────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={pageTitle}>Wallet</h2>
        <p style={pageHint}>Your KYC credential is stored and ready to use.</p>
      </div>

      {/* Credential card */}
      <div style={card}>
        {/* Card header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0d9488', marginBottom: '0.2rem' }}>
              KYC Identity Credential
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
              {decoded.nationality ? `Nationality: ${decoded.nationality}` : 'Verifiable Credential'}
            </div>
          </div>
          <span style={{
            padding: '0.2rem 0.6rem',
            borderRadius: 9999,
            fontSize: '0.68rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: expired ? '#fef2f2' : '#f0fdfa',
            color: expired ? '#b91c1c' : '#0d9488',
            border: `1px solid ${expired ? '#fecaca' : '#99f6e4'}`,
          }}>
            {expired ? 'Expired' : 'Valid'}
          </span>
        </div>

        {/* Fields grid */}
        <div style={grid}>
          <Field label="KYC Status" value="Verified" valueColor="#0d9488" />
          <Field label="Nationality" value={decoded.nationality || '—'} />
          <Field
            label="Expires"
            value={expired
              ? `Expired ${Math.abs(daysUntilExpiry!)}d ago`
              : `${new Date(decoded.expirationDate).toLocaleDateString()} (${daysUntilExpiry}d)`}
            valueColor={expired ? '#b91c1c' : undefined}
          />
          <Field label="Issued" value={new Date(decoded.issuedAt).toLocaleDateString()} />
        </div>

        {/* DIDs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem' }}>
          <MonoField label="Subject DID" value={decoded.subjectDid} />
          <MonoField label="Issuer DID"  value={decoded.issuerDid} />
          <MonoField label="Credential ID" value={decoded.credentialId} />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
          <button
            onClick={onPresent}
            disabled={expired}
            style={{ ...tealBtn, flex: 1, opacity: expired ? 0.45 : 1, cursor: expired ? 'not-allowed' : 'pointer' }}
          >
            Generate Presentation
          </button>
          <button
            onClick={() => { if (confirm('Remove stored credential? This cannot be undone.')) onRemove(); }}
            style={ghostBtn}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <div style={fieldLabel}>{label}</div>
      <div style={{ fontSize: '0.875rem', color: valueColor ?? '#0f172a', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function MonoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={fieldLabel}>{label}</div>
      <code style={mono}>{value}</code>
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
const emptyWrap: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', padding: '3rem 1rem', textAlign: 'center', gap: '0.5rem',
};
const emptyIcon: React.CSSProperties = {
  width: 52, height: 52, borderRadius: 14, background: '#f1f5f9',
  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem',
};
const grid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr',
  gap: '0.875rem 1.5rem',
  background: '#f8fafc', borderRadius: 8, padding: '1rem',
  marginBottom: '0.75rem',
};
const fieldLabel: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem',
};
const mono: React.CSSProperties = {
  fontSize: '0.72rem', wordBreak: 'break-all', color: '#374151',
  background: '#f8fafc', border: '1px solid #e2e8f0',
  padding: '0.375rem 0.5rem', borderRadius: 4, display: 'block',
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
};
const tealBtn: React.CSSProperties = {
  padding: '0.6rem 1.25rem', background: '#0d9488', color: 'white',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
};
const ghostBtn: React.CSSProperties = {
  padding: '0.6rem 1rem', background: 'none', color: '#64748b',
  border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem',
};
