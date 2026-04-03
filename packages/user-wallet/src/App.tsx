import { useState, useCallback } from 'react';
import { decryptVC } from './crypto';
import ImportPage from './pages/ImportPage';
import WalletPage from './pages/WalletPage';
import PresentPage from './pages/PresentPage';

const STORAGE_KEY = 'kyc-vc-encrypted';
type Tab = 'wallet' | 'import' | 'present';

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function WalletIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <circle cx="17" cy="15" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// ── PIN Unlock Modal ──────────────────────────────────────────────────────────

interface UnlockModalProps {
  onUnlocked: (jwt: string) => void;
  onCancel: () => void;
}

function UnlockModal({ onUnlocked, onCancel }: UnlockModalProps) {
  const [pin, setPin]     = useState('');
  const [error, setError] = useState('');

  const unlock = async () => {
    setError('');
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (!encrypted) { setError('Nothing stored'); return; }
    try {
      const jwt = await decryptVC(encrypted, pin);
      onUnlocked(jwt);
    } catch {
      setError('Incorrect PIN — try again');
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f0fdfa', border: '1px solid #ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Unlock Wallet</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Enter your PIN to continue</p>
          </div>
        </div>

        <input
          type="password"
          value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && unlock()}
          placeholder="Enter PIN"
          autoFocus
          style={modalInput}
        />
        {error && <p style={{ color: '#b91c1c', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button onClick={onCancel} style={cancelBtn}>Cancel</button>
          <button onClick={unlock} style={tealBtn}>Unlock</button>
        </div>
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const hasStored       = !!localStorage.getItem(STORAGE_KEY);
  const urlHasChallenge = new URLSearchParams(window.location.search).has('challenge');

  const [tab, setTab]               = useState<Tab>(
    urlHasChallenge && hasStored ? 'present' : hasStored ? 'wallet' : 'import',
  );
  const [vcJwt, setVcJwt]           = useState<string | null>(null);
  const [showUnlock, setShowUnlock] = useState(false);

  const requestUnlock = useCallback(() => setShowUnlock(true), []);
  const onUnlocked    = (jwt: string) => { setVcJwt(jwt); setShowUnlock(false); };

  const onRemove = () => {
    localStorage.removeItem(STORAGE_KEY);
    setVcJwt(null);
    setTab('import');
    window.location.reload();
  };

  const switchToPresent = () => {
    if (!vcJwt) { requestUnlock(); return; }
    setTab('present');
  };

  const switchTab = (t: Tab) => {
    if ((t === 'wallet' || t === 'present') && !vcJwt && localStorage.getItem(STORAGE_KEY)) {
      requestUnlock();
      return;
    }
    setTab(t);
  };

  const currentHasStored = !!localStorage.getItem(STORAGE_KEY);

  const NAV: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'wallet',  label: 'Wallet',  icon: <WalletIcon /> },
    { key: 'present', label: 'Present', icon: <ShareIcon /> },
    { key: 'import',  label: 'Import',  icon: <DownloadIcon /> },
  ];

  return (
    <div style={pageWrap}>
      <div style={appWindow}>
        {/* ── Title bar ──────────────────────────────────────────────────── */}
        <div style={titleBar}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ffbd2e' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#28ca41' }} />
          </div>
          <span style={titleLabel}>Identity Wallet</span>
        </div>

        {/* ── Window body ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Sidebar */}
          <aside style={sidebar}>
            <div style={brandSection}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0d9488', marginBottom: '0.2rem' }}>
                Identity Wallet
              </div>
              <div style={{ fontSize: '0.7rem', color: '#334155' }}>v1.0</div>
            </div>

            <nav style={{ flex: 1, padding: '0.5rem 0' }}>
              {NAV.map(item => {
                const active = tab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => switchTab(item.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      width: '100%',
                      padding: '0.6rem 1.25rem',
                      border: 'none',
                      borderLeft: `2px solid ${active ? '#14b8a6' : 'transparent'}`,
                      background: active ? 'rgba(20,184,166,0.1)' : 'transparent',
                      color: active ? '#2dd4bf' : '#475569',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: active ? 600 : 400,
                      textAlign: 'left',
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Status indicator */}
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: !currentHasStored ? '#334155' : vcJwt ? '#10b981' : '#f59e0b',
                }} />
                <span style={{
                  fontSize: '0.72rem',
                  color: !currentHasStored ? '#475569' : vcJwt ? '#10b981' : '#f59e0b',
                }}>
                  {!currentHasStored ? 'No credential' : vcJwt ? 'Unlocked' : 'Locked'}
                </span>
              </div>
            </div>
          </aside>

          {/* Content */}
          <main style={contentArea}>
            {tab === 'import'  && <ImportPage onImported={() => { setVcJwt(null); setTab('wallet'); window.location.reload(); }} />}
            {tab === 'wallet'  && <WalletPage vcJwt={vcJwt} locked={currentHasStored && !vcJwt} onPresent={switchToPresent} onRemove={onRemove} onUnlock={requestUnlock} />}
            {tab === 'present' && <PresentPage vcJwt={vcJwt} />}
          </main>
        </div>
      </div>

      {showUnlock && <UnlockModal onUnlocked={onUnlocked} onCancel={() => setShowUnlock(false)} />}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5rem',
  background: '#1e293b',
};

const appWindow: React.CSSProperties = {
  width: '100%',
  maxWidth: 880,
  minHeight: 580,
  borderRadius: 10,
  overflow: 'hidden',
  boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)',
  display: 'flex',
  flexDirection: 'column',
};

const titleBar: React.CSSProperties = {
  background: '#0f172a',
  height: 38,
  display: 'flex',
  alignItems: 'center',
  padding: '0 1rem',
  position: 'relative',
  flexShrink: 0,
  borderBottom: '1px solid #1e293b',
};

const titleLabel: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  fontSize: '0.78rem',
  fontWeight: 500,
  color: '#64748b',
  userSelect: 'none',
};

const sidebar: React.CSSProperties = {
  width: 210,
  background: '#0f172a',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  borderRight: '1px solid #1e293b',
};

const brandSection: React.CSSProperties = {
  padding: '1.25rem 1.25rem 1rem',
  borderBottom: '1px solid #1e293b',
};

const contentArea: React.CSSProperties = {
  flex: 1,
  background: '#f8fafc',
  overflowY: 'auto',
  padding: '2rem',
};

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.65)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 200,
  backdropFilter: 'blur(3px)',
};

const modal: React.CSSProperties = {
  background: 'white',
  borderRadius: 12,
  padding: '1.75rem',
  width: '90%',
  maxWidth: 340,
  boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
};

const modalInput: React.CSSProperties = {
  padding: '0.625rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
  color: '#0f172a',
};

const tealBtn: React.CSSProperties = {
  flex: 1,
  padding: '0.6rem',
  background: '#0d9488',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.875rem',
};

const cancelBtn: React.CSSProperties = {
  padding: '0.6rem 1rem',
  background: 'none',
  color: '#64748b',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: '0.875rem',
};
