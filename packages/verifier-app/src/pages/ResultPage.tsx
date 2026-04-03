import type { CheckResult, VerificationResult } from '../verify';

interface Props {
  result: VerificationResult | null;
  checks: CheckResult[];
  onReset: () => void;
}

// ── Status icons ──────────────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite', display: 'block' }}>
      <circle cx="12" cy="12" r="9" stroke="#e2e8f0" strokeWidth="2.5" />
      <path d="M12 3a9 9 0 0 1 9 9" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function PassIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#15803d" />
      <polyline points="7,12 10.5,15.5 17,8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#dc2626" />
      <line x1="8" y1="8" x2="16" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="8" x2="8" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ── Logo mark ─────────────────────────────────────────────────────────────────

function TradeFiMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <rect width="30" height="30" rx="7" fill="#f59e0b" />
      <polyline points="6,22 11,16 16,19 24,9" stroke="white" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResultPage({ result, checks, onReset }: Props) {
  const allDone   = checks.every(c => c.status !== 'pending');
  const allPassed = result?.passed ?? false;

  const titleText = !allDone
    ? 'Verifying Presentation'
    : allPassed
      ? 'Identity Verified'
      : 'Verification Failed';

  const hintText = !allDone
    ? 'Running on-chain checks — please wait.'
    : allPassed
      ? 'All checks passed. This credential is valid and trusted.'
      : 'One or more checks failed. See details below.';

  return (
    <div style={page}>

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav style={navBar}>
        <div style={navInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <TradeFiMark />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'white', letterSpacing: '-0.02em' }}>TradeFi</div>
              <div style={{ fontSize: '0.6rem', color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>KYC Verification</div>
            </div>
          </div>
          <span style={networkBadge}>Polygon Amoy Testnet</span>
        </div>
      </nav>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div style={content}>

        {/* Page title */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ ...pageTitle, color: allDone ? (allPassed ? '#15803d' : '#dc2626') : '#0f172a' }}>
            {titleText}
          </h2>
          <p style={pageHint}>{hintText}</p>
        </div>

        {/* Check list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
          {checks.map(check => (
            <div
              key={check.id}
              style={{
                background: check.status === 'pass' ? '#f0fdf4' : check.status === 'fail' ? '#fef2f2' : 'white',
                border: `1px solid ${check.status === 'pass' ? '#86efac' : check.status === 'fail' ? '#fca5a5' : '#e2e8f0'}`,
                borderRadius: 10, padding: '1rem 1.25rem',
                display: 'flex', gap: '0.875rem', alignItems: 'flex-start',
                transition: 'background 0.25s, border-color 0.25s',
              }}
            >
              <div style={{ marginTop: '0.1rem', flexShrink: 0 }}>
                {check.status === 'pending' ? <SpinnerIcon /> : check.status === 'pass' ? <PassIcon /> : <FailIcon />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 600, fontSize: '0.875rem',
                  color: check.status === 'pass' ? '#15803d' : check.status === 'fail' ? '#dc2626' : '#374151',
                }}>
                  Check {check.id}: {check.label}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                  {check.description}
                </div>
                {check.detail && (
                  <code style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginTop: '0.3rem', wordBreak: 'break-all', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
                    {check.detail}
                  </code>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Final result banner */}
        {allDone && (
          <div style={{
            border: `2px solid ${allPassed ? '#16a34a' : '#dc2626'}`,
            borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem',
            background: allPassed ? '#f0fdf4' : '#fef2f2',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: allPassed && result ? '1.25rem' : 0 }}>
              {allPassed ? (
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="#15803d" />
                  <polyline points="7.5,12 10.5,15.5 16.5,8.5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="#dc2626" />
                  <line x1="8" y1="8" x2="16" y2="16" stroke="white" strokeWidth="2.25" strokeLinecap="round" />
                  <line x1="16" y1="8" x2="8" y2="16" stroke="white" strokeWidth="2.25" strokeLinecap="round" />
                </svg>
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em', color: allPassed ? '#15803d' : '#dc2626' }}>
                  {allPassed ? 'KYC VERIFIED' : 'VERIFICATION FAILED'}
                </div>
                {!allPassed && result?.error && (
                  <div style={{ fontSize: '0.825rem', color: '#b91c1c', marginTop: '0.2rem' }}>{result.error}</div>
                )}
              </div>
            </div>

            {allPassed && result && (
              <div style={dataGrid}>
                <DataField label="KYC Status"  value="Verified"                                               color="#15803d" />
                <DataField label="Nationality" value={result.nationality || '—'}                              />
                <DataField label="Expires"     value={new Date(result.expirationDate).toLocaleDateString()}   />
                <div style={{ gridColumn: '1/-1' }}><DataField label="Holder DID" value={result.subjectDid} mono /></div>
                <div style={{ gridColumn: '1/-1' }}><DataField label="Issuer DID" value={result.issuerDid}  mono /></div>
              </div>
            )}
          </div>
        )}

        <button onClick={onReset} style={backBtn}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Verify another
        </button>
      </div>
    </div>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────────

function DataField({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '0.2rem' }}>
        {label}
      </div>
      <div style={{
        fontSize: mono ? '0.72rem' : '0.875rem',
        fontFamily: mono ? 'ui-monospace, SFMono-Regular, monospace' : 'inherit',
        color: color ?? '#0f172a', fontWeight: 500, wordBreak: 'break-all',
      }}>
        {value}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const page: React.CSSProperties = { minHeight: '100vh', background: '#f1f5f9' };

const navBar: React.CSSProperties = {
  background: '#0c1b33',
  position: 'sticky',
  top: 0,
  zIndex: 50,
};

const navInner: React.CSSProperties = {
  maxWidth: 960, margin: '0 auto', padding: '0 2rem',
  height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};

const networkBadge: React.CSSProperties = {
  fontSize: '0.72rem', color: '#475569',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 4, padding: '0.2rem 0.5rem',
};

const content: React.CSSProperties = {
  maxWidth: 560, margin: '0 auto', padding: '2rem 1rem 3.5rem',
};

const pageTitle: React.CSSProperties = {
  fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.3rem',
};

const pageHint: React.CSSProperties = {
  fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5,
};

const dataGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr',
  gap: '0.875rem 1.5rem',
  background: 'rgba(255,255,255,0.55)',
  borderRadius: 8, padding: '1rem',
};

const backBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
  background: 'none', border: '1px solid #e2e8f0', borderRadius: 6,
  padding: '0.5rem 1rem', cursor: 'pointer',
  color: '#374151', fontSize: '0.875rem',
};
