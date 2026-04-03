import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import { parseVC, buildVpSigningMessage, buildVpBody } from '../jwtUtils';
import { decryptVC } from '../crypto';

const STORAGE_KEY  = 'kyc-vc-encrypted';
const AMOY_CHAIN_ID = 80002;

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

interface Props {
  vcJwt: string | null;
}

type Step = 'setup' | 'unlock' | 'sign' | 'done' | 'error';

export default function PresentPage({ vcJwt: initialVcJwt }: Props) {
  const params       = new URLSearchParams(window.location.search);
  const urlChallenge = params.get('challenge') ?? '';
  const urlCallback  = params.get('callback')  ?? '';
  const urlReturnTo  = params.get('returnTo')  ?? '';

  const [step, setStep]           = useState<Step>(initialVcJwt ? 'setup' : 'unlock');
  const [challenge, setChallenge] = useState(urlChallenge);
  const [callback, setCallback]   = useState(urlCallback);
  const [pin, setPin]             = useState('');
  const [vcJwt, setVcJwt]         = useState<string | null>(initialVcJwt);
  const [address, setAddress]     = useState('');
  const [vp, setVp]               = useState<object | null>(null);
  const [sending, setSending]     = useState(false);
  const [errMsg, setErrMsg]       = useState('');

  const hasStored = !!localStorage.getItem(STORAGE_KEY);

  useEffect(() => {
    if (urlChallenge && initialVcJwt) setStep('sign');
  }, []);

  // ── Unlock ─────────────────────────────────────────────────────────────────
  const unlock = async () => {
    setErrMsg('');
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (!encrypted) { setErrMsg('No stored credential found'); return; }
    try {
      const jwt = await decryptVC(encrypted, pin);
      setVcJwt(jwt);
      setStep('setup');
    } catch {
      setErrMsg('Incorrect PIN — decryption failed');
    }
  };

  // ── MetaMask ───────────────────────────────────────────────────────────────
  const connectMetaMask = async (): Promise<string> => {
    if (!window.ethereum) throw new Error('MetaMask not detected. Please install MetaMask.');
    const provider = new BrowserProvider(window.ethereum);
    const network  = await provider.getNetwork();
    if (Number(network.chainId) !== AMOY_CHAIN_ID) {
      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${AMOY_CHAIN_ID.toString(16)}` }] });
      } catch {
        throw new Error('Please switch MetaMask to Polygon Amoy (ChainID 80002).');
      }
    }
    const signer = await provider.getSigner();
    return signer.getAddress();
  };

  // ── Generate VP ────────────────────────────────────────────────────────────
  const generateVP = async () => {
    setErrMsg('');
    if (!challenge.trim()) { setErrMsg('Challenge / nonce is required'); return; }
    if (!vcJwt)            { setErrMsg('No credential loaded'); return; }
    try {
      const signerAddress = await connectMetaMask();
      setAddress(signerAddress);

      const decoded   = parseVC(vcJwt);
      const holderDid = `did:ethr:0x${AMOY_CHAIN_ID.toString(16)}:${signerAddress}`;

      if (!decoded.subjectDid.toLowerCase().includes(signerAddress.toLowerCase())) {
        throw new Error(
          `MetaMask address (${signerAddress}) does not match the credential subject DID.\n` +
          `Expected address embedded in: ${decoded.subjectDid}`,
        );
      }

      const signingMessage = buildVpSigningMessage({ holderDid, credentialId: decoded.credentialId, challenge: challenge.trim() });
      const provider       = new BrowserProvider(window.ethereum!);
      const signer         = await provider.getSigner();
      const proofValue     = await signer.signMessage(signingMessage);
      const vpBody         = buildVpBody(holderDid, vcJwt);
      const fullVP = {
        ...vpBody,
        proof: {
          type: 'EthereumPersonalSignature2021',
          created: new Date().toISOString(),
          challenge: challenge.trim(),
          verificationMethod: holderDid,
          proofValue,
          credentialId: decoded.credentialId,
          credentialSalt: decoded.credentialSalt,
        },
      };

      setVp(fullVP);
      setStep('done');

      if (urlReturnTo) {
        const vpEncoded = encodeURIComponent(JSON.stringify(fullVP));
        window.location.href = `${urlReturnTo}?vp=${vpEncoded}&challenge=${encodeURIComponent(challenge.trim())}`;
        return;
      }

      if (callback) {
        setSending(true);
        try {
          await fetch(callback, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fullVP) });
        } catch (e) {
          setErrMsg(`VP generated but failed to send to callback: ${(e as Error).message}`);
        } finally {
          setSending(false);
        }
      }
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Unknown error');
      setStep('error');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!hasStored) {
    return (
      <div style={emptyWrap}>
        <div style={emptyIcon}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>No credential stored.</p>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Import a credential first.</p>
      </div>
    );
  }

  if (step === 'unlock') {
    return (
      <div>
        <div style={{ marginBottom: '1.75rem' }}>
          <h2 style={pageTitle}>Present Credential</h2>
          <p style={pageHint}>Unlock your wallet to generate a Verifiable Presentation.</p>
        </div>
        <div style={card}>
          <div style={fieldGroup}>
            <label style={labelS} htmlFor="pin">PIN</label>
            <input id="pin" type="password" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && unlock()} placeholder="Enter PIN" style={inputS} autoFocus />
          </div>
          {errMsg && <div style={errBox}>{errMsg}</div>}
          <button onClick={unlock} style={tealBtn}>Unlock</button>
        </div>
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div>
        <div style={{ marginBottom: '1.75rem' }}>
          <h2 style={pageTitle}>Present Credential</h2>
          <p style={pageHint}>
            MetaMask will sign a message proving you control the subject wallet.
            No transaction, no gas fee.
          </p>
        </div>
        <div style={card}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={fieldGroup}>
              <label style={labelS} htmlFor="challenge">
                Challenge / Nonce
                <span style={labelHint}>provided by the verifier</span>
              </label>
              <input id="challenge" type="text" value={challenge} onChange={e => setChallenge(e.target.value)} placeholder="e.g. a UUID" style={inputS} />
            </div>
            <div style={fieldGroup}>
              <label style={labelS} htmlFor="callback">
                Callback URL
                <span style={labelHint}>optional</span>
              </label>
              <input id="callback" type="url" value={callback} onChange={e => setCallback(e.target.value)} placeholder="http://localhost:3003/api/verify" style={inputS} />
            </div>
            {errMsg && <div style={errBox}>{errMsg}</div>}
            <button onClick={generateVP} style={tealBtn}>
              Sign &amp; Generate VP via MetaMask
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'done' && vp) {
    const vpJson = JSON.stringify(vp, null, 2);
    return (
      <div>
        <div style={{ marginBottom: '1.75rem' }}>
          <h2 style={pageTitle}>Presentation Ready</h2>
          {address && (
            <p style={pageHint}>
              Signed by <code style={{ fontSize: '0.78rem', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>{address}</code>
            </p>
          )}
        </div>
        <div style={card}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {callback ? (
              <div style={{ padding: '0.75rem', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 6, fontSize: '0.875rem', color: '#0d9488' }}>
                {sending ? 'Sending VP to verifier...' : `VP sent to ${callback}`}
              </div>
            ) : (
              <p style={pageHint}>Copy the VP below and paste it into the verifier app.</p>
            )}

            <div style={fieldGroup}>
              <div style={fieldLabel}>Verifiable Presentation (JSON)</div>
              <textarea
                readOnly
                value={vpJson}
                rows={11}
                style={{ ...inputS, fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: '0.72rem', resize: 'vertical', background: '#f8fafc' }}
              />
            </div>

            <button onClick={() => navigator.clipboard.writeText(vpJson)} style={{ ...tealBtn, background: '#059669' }}>
              Copy VP to Clipboard
            </button>
            <button onClick={() => { setStep('setup'); setVp(null); setErrMsg(''); }} style={ghostBtn}>
              Generate Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // error step
  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ ...pageTitle, color: '#b91c1c' }}>Error</h2>
      </div>
      <div style={card}>
        <div style={errBox}>{errMsg}</div>
        <button onClick={() => { setStep('setup'); setErrMsg(''); }} style={{ ...ghostBtn, marginTop: '1rem' }}>
          Back
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pageTitle: React.CSSProperties = { fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' };
const pageHint: React.CSSProperties  = { fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 };
const card: React.CSSProperties = {
  background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1.5rem',
  display: 'flex', flexDirection: 'column', gap: '1rem',
};
const emptyWrap: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', padding: '3rem 1rem', textAlign: 'center', gap: '0.5rem',
};
const emptyIcon: React.CSSProperties = {
  width: 52, height: 52, borderRadius: 14, background: '#f1f5f9',
  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem',
};
const fieldGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.375rem' };
const fieldLabel: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: '0.06em',
};
const labelS: React.CSSProperties = {
  fontSize: '0.875rem', fontWeight: 500, color: '#374151',
  display: 'flex', alignItems: 'center', gap: '0.5rem',
};
const labelHint: React.CSSProperties = { fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' };
const inputS: React.CSSProperties = {
  padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6,
  fontSize: '0.875rem', color: '#0f172a', background: 'white', outline: 'none', width: '100%',
};
const errBox: React.CSSProperties = {
  padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca',
  borderRadius: 6, color: '#b91c1c', fontSize: '0.875rem', whiteSpace: 'pre-wrap',
};
const tealBtn: React.CSSProperties = {
  padding: '0.625rem', background: '#0d9488', color: 'white',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
};
const ghostBtn: React.CSSProperties = {
  padding: '0.625rem', background: 'none', color: '#64748b',
  border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem',
};
