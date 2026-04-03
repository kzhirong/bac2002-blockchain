const WALLET_URL  = (import.meta.env.VITE_WALLET_URL as string | undefined) ?? 'http://localhost:3002';
const VERIFIER_URL = window.location.origin;

// ── Logo mark ─────────────────────────────────────────────────────────────────

function TradeFiMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <rect width="30" height="30" rx="7" fill="#f59e0b" />
      <polyline points="6,22 11,16 16,19 24,9" stroke="white" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const challenge = crypto.randomUUID();

export default function LandingPage() {

  const walletLink = `${WALLET_URL}?challenge=${challenge}&returnTo=${encodeURIComponent(VERIFIER_URL)}`;

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

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={hero}>
        <div style={heroInner}>
          <div style={heroLabel}>Identity Verification</div>
          <h1 style={heroTitle}>Open Your TradeFi Account</h1>
          <p style={heroDesc}>
            Prove your identity with your KYC credential — no documents to upload, no forms to fill.
            Your proof lives on the blockchain.
          </p>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div style={body}>
        <div style={cardCol}>

          {/* Connect wallet card */}
          <div style={card}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={iconBox}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0c1b33" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M2 10h20" />
                  <circle cx="17" cy="15" r="1" fill="#0c1b33" stroke="none" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={cardTitle}>Connect Identity Wallet</div>
                <p style={{ ...cardDesc, marginBottom: '1.125rem' }}>
                  Opens your KYC Identity Wallet. You will review what is being shared and sign with MetaMask.
                  No transaction — no gas fee.
                </p>
                <a href={walletLink} target="_self" style={primaryBtn}>
                  Open Identity Wallet
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
                <div style={nonceBox}>
                  <span style={{ fontWeight: 600, color: '#374151' }}>Session nonce</span>
                  <code style={nonceCode}>{challenge}</code>
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div style={{ paddingBottom: '1rem' }}>
            <div style={sectionLabel}>How verification works</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[
                ['1', 'Holder signature',   'Proves you control the wallet that holds the KYC credential'],
                ['2', 'Holder — Subject',   'Your wallet address matches the subject DID in the credential'],
                ['3', 'Trusted issuer',     'The issuer is registered in TrustedIssuerRegistry on Polygon Amoy'],
                ['4', 'Credential active',  'The credential is anchored on-chain and has not been revoked'],
              ].map(([num, label, desc]) => (
                <div key={num} style={stepRow}>
                  <div style={stepBadge}>{num}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>{label}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.1rem' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
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

const hero: React.CSSProperties = {
  background: 'linear-gradient(160deg, #0c1b33 0%, #142744 100%)',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
};

const heroInner: React.CSSProperties = {
  maxWidth: 560, margin: '0 auto', padding: '2.75rem 1.5rem',
};

const heroLabel: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em',
  textTransform: 'uppercase' as const, color: '#f59e0b', marginBottom: '0.625rem',
};

const heroTitle: React.CSSProperties = {
  fontSize: '1.85rem', fontWeight: 800, color: 'white',
  letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '0.75rem',
};

const heroDesc: React.CSSProperties = {
  fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.65,
};

const body: React.CSSProperties = {
  padding: '2rem 1rem 3.5rem',
};

const cardCol: React.CSSProperties = {
  maxWidth: 560, margin: '0 auto',
  display: 'flex', flexDirection: 'column', gap: '1rem',
};

const card: React.CSSProperties = {
  background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.5rem',
};

const cardTitle: React.CSSProperties = {
  fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.375rem',
};

const cardDesc: React.CSSProperties = {
  fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6,
};

const iconBox: React.CSSProperties = {
  width: 42, height: 42, borderRadius: 10,
  background: '#f8fafc', border: '1px solid #e2e8f0',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
  background: '#f59e0b', color: 'white',
  padding: '0.65rem 1.25rem', borderRadius: 7,
  textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem',
  letterSpacing: '-0.01em',
};

const nonceBox: React.CSSProperties = {
  marginTop: '0.875rem', padding: '0.5rem 0.875rem',
  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6,
  fontSize: '0.73rem', color: '#64748b',
  display: 'flex', flexDirection: 'column', gap: '0.2rem',
};

const nonceCode: React.CSSProperties = {
  wordBreak: 'break-all',
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  color: '#0f172a',
};

const sectionLabel: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase' as const, color: '#94a3b8', marginBottom: '0.75rem',
};

const stepRow: React.CSSProperties = {
  display: 'flex', gap: '0.875rem', alignItems: 'flex-start',
  padding: '0.75rem 1rem',
  background: 'white', border: '1px solid #e2e8f0', borderRadius: 8,
};

const stepBadge: React.CSSProperties = {
  width: 24, height: 24, borderRadius: '50%',
  background: '#0c1b33', color: 'white',
  fontSize: '0.7rem', fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};
