import { useState, useEffect } from 'react';
import { verifyPresentation, type CheckResult, type VerificationResult, type VerifiablePresentation } from './verify';
import LandingPage from './pages/LandingPage';
import ResultPage from './pages/ResultPage';

type AppState = 'landing' | 'verifying';

export default function App() {
  const [appState, setAppState]   = useState<AppState>('landing');
  const [checks, setChecks]       = useState<CheckResult[]>([]);
  const [result, setResult]       = useState<VerificationResult | null>(null);
  const [challenge, setChallenge] = useState('');

  // On mount: check if wallet redirected back with ?vp= in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vpEncoded  = params.get('vp');
    const ch         = params.get('challenge') ?? '';

    if (vpEncoded) {
      // Clean up URL immediately so a page refresh doesn't re-trigger
      window.history.replaceState({}, '', window.location.pathname);
      runVerification(decodeURIComponent(vpEncoded), ch);
    }
  }, []);

  const runVerification = async (vpJson: string, ch: string) => {
    setChallenge(ch);
    setAppState('verifying');
    setResult(null);

    let vp: VerifiablePresentation;
    try {
      vp = JSON.parse(vpJson) as VerifiablePresentation;
    } catch {
      setResult({
        checks: [],
        passed: false,
        holderAddress: '', nationality: '', subjectDid: '',
        issuerDid: '', credentialId: '', expirationDate: '',
        error: 'Could not parse VP — make sure you pasted valid JSON',
      });
      return;
    }

    // Initialize pending checks in UI immediately
    setChecks([
      { id: 1, label: 'Holder signature',  description: 'MetaMask signature proves presenter controls the holder wallet', status: 'pending', detail: '' },
      { id: 2, label: 'Holder ↔ Subject',  description: 'Wallet address matches the subject DID embedded in the VC',      status: 'pending', detail: '' },
      { id: 3, label: 'Trusted issuer',    description: 'Issuer address is registered in TrustedIssuerRegistry on-chain', status: 'pending', detail: '' },
      { id: 4, label: 'Credential active', description: 'Credential is anchored on-chain and has not been revoked',       status: 'pending', detail: '' },
    ]);

    const finalResult = await verifyPresentation(vp, ch, updatedChecks => {
      setChecks([...updatedChecks]);
    });

    setResult(finalResult);
  };

  const reset = () => {
    setAppState('landing');
    setChecks([]);
    setResult(null);
    setChallenge('');
  };

  if (appState === 'verifying') {
    return <ResultPage checks={checks} result={result} onReset={reset} />;
  }

  return <LandingPage />;
}
