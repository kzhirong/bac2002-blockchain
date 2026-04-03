'use client';

import { useState } from 'react';
import type { KycSubmission, SubmissionStatus } from '../lib/types';

interface Props {
  initialSubmissions: KycSubmission[];
}

const STATUS_BADGE: Record<SubmissionStatus, { color: string; bg: string; border: string; label: string }> = {
  pending:  { color: '#92400e', bg: '#fefce8', border: '#fde68a', label: 'Pending' },
  approved: { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', label: 'Approved' },
  rejected: { color: '#991b1b', bg: '#fef2f2', border: '#fecaca', label: 'Rejected' },
  revoked:  { color: '#475569', bg: '#f8fafc', border: '#cbd5e1', label: 'Revoked' },
};

const TABS: { key: SubmissionStatus | 'all'; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'pending',  label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'revoked',  label: 'Revoked' },
];

export default function AdminSubmissionsTable({ initialSubmissions }: Props) {
  const [submissions, setSubmissions]   = useState(initialSubmissions);
  const [tab, setTab]                   = useState<SubmissionStatus | 'all'>('all');
  const [loading, setLoading]           = useState<Record<string, boolean>>({});
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId]     = useState<string | null>(null);

  const filtered = tab === 'all' ? submissions : submissions.filter(s => s.status === tab);

  const setItemLoading = (id: string, v: boolean) =>
    setLoading(prev => ({ ...prev, [id]: v }));

  const updateStatus = (id: string, patch: Partial<KycSubmission>) =>
    setSubmissions(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));

  const approve = async (id: string) => {
    setItemLoading(id, true);
    const res  = await fetch('/api/admin/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId: id }) });
    const data = await res.json();
    if (res.ok) {
      updateStatus(id, { status: 'approved', vc_jwt: data.vcJwt, credential_id: data.credentialId, credential_hash: data.credentialHash, tx_hash: data.txHash, issuer_did: data.issuerDid, subject_did: data.subjectDid });
    } else {
      alert(`Approval failed: ${data.error}`);
    }
    setItemLoading(id, false);
  };

  const reject = async (id: string) => {
    const reason = rejectReason[id]?.trim();
    if (!reason) { alert('Please enter a rejection reason.'); return; }
    setItemLoading(id, true);
    const res = await fetch('/api/admin/reject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId: id, reason }) });
    if (res.ok) {
      updateStatus(id, { status: 'rejected', rejection_reason: reason });
    } else {
      const data = await res.json();
      alert(`Rejection failed: ${data.error}`);
    }
    setItemLoading(id, false);
  };

  const revoke = async (id: string) => {
    if (!confirm('Revoke this credential on-chain? This cannot be undone.')) return;
    setItemLoading(id, true);
    const res = await fetch('/api/admin/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId: id }) });
    if (res.ok) {
      updateStatus(id, { status: 'revoked' });
    } else {
      const data = await res.json();
      alert(`Revocation failed: ${data.error}`);
    }
    setItemLoading(id, false);
  };

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
        {TABS.map(t => {
          const count  = t.key === 'all' ? submissions.length : submissions.filter(s => s.status === t.key).length;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: active ? 600 : 400,
                color: active ? '#2563eb' : '#64748b',
                marginBottom: -1,
              }}
            >
              {t.label}{' '}
              <span style={{ fontSize: '0.75rem', color: active ? '#2563eb' : '#94a3b8' }}>{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2.5rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.875rem' }}>
          No submissions in this category.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(s => {
            const badge     = STATUS_BADGE[s.status];
            const isExp     = expandedId === s.id;
            const isLoading = loading[s.id];

            return (
              <div key={s.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: 'white', overflow: 'hidden' }}>
                {/* Row header */}
                <div
                  style={{ padding: '0.875rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: '1rem' }}
                  onClick={() => setExpandedId(isExp ? null : s.id)}
                >
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>{s.full_name}</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.nationality}</span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{s.dob}</span>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.15rem 0.55rem',
                      borderRadius: 9999,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}>
                      {badge.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{new Date(s.created_at).toLocaleDateString()}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: isExp ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExp && (
                  <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem', marginTop: '1rem', fontSize: '0.8rem', color: '#374151' }}>
                      <div><span style={detailKey}>Document</span>{s.document_number}</div>
                      <div><span style={detailKey}>Wallet</span><code style={mono}>{s.subject_address}</code></div>
                      <div><span style={detailKey}>User ID</span><code style={mono}>{s.user_id}</code></div>
                      <div><span style={detailKey}>Submission ID</span><code style={mono}>{s.id}</code></div>
                    </div>

                    {s.status === 'rejected' && s.rejection_reason && (
                      <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: '0.8rem', color: '#b91c1c' }}>
                        <strong>Rejection reason:</strong> {s.rejection_reason}
                      </div>
                    )}

                    {s.status === 'approved' && s.tx_hash && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>
                        <a href={`https://amoy.polygonscan.com/tx/${s.tx_hash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
                          View anchor transaction
                        </a>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {s.status === 'pending' && (
                        <>
                          <div>
                            <button onClick={() => approve(s.id)} disabled={isLoading} style={approveBtn(isLoading)}>
                              {isLoading ? 'Processing...' : 'Approve & Issue VC'}
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <input
                              type="text"
                              placeholder="Rejection reason (required)"
                              value={rejectReason[s.id] ?? ''}
                              onChange={e => setRejectReason(prev => ({ ...prev, [s.id]: e.target.value }))}
                              style={reasonInput}
                            />
                            <button onClick={() => reject(s.id)} disabled={isLoading} style={rejectBtn(isLoading)}>
                              Reject
                            </button>
                          </div>
                        </>
                      )}
                      {s.status === 'approved' && (
                        <button onClick={() => revoke(s.id)} disabled={isLoading} style={revokeBtn(isLoading)}>
                          {isLoading ? 'Revoking...' : 'Revoke credential'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const detailKey: React.CSSProperties = {
  fontWeight: 600,
  color: '#64748b',
  marginRight: '0.4rem',
};

const mono: React.CSSProperties = {
  fontSize: '0.75rem',
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  wordBreak: 'break-all',
};

const reasonInput: React.CSSProperties = {
  flex: 1,
  minWidth: 180,
  padding: '0.4rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: '0.875rem',
  color: '#0f172a',
  outline: 'none',
};

const approveBtn = (disabled: boolean): React.CSSProperties => ({
  padding: '0.45rem 1rem',
  background: '#f0fdf4',
  color: '#166534',
  border: '1px solid #bbf7d0',
  borderRadius: 6,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontWeight: 600,
  fontSize: '0.875rem',
  opacity: disabled ? 0.6 : 1,
});

const rejectBtn = (disabled: boolean): React.CSSProperties => ({
  padding: '0.45rem 1rem',
  background: '#fef2f2',
  color: '#b91c1c',
  border: '1px solid #fecaca',
  borderRadius: 6,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontWeight: 600,
  fontSize: '0.875rem',
  opacity: disabled ? 0.6 : 1,
  flexShrink: 0,
});

const revokeBtn = (disabled: boolean): React.CSSProperties => ({
  padding: '0.45rem 1rem',
  background: '#f8fafc',
  color: '#475569',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontWeight: 600,
  fontSize: '0.875rem',
  opacity: disabled ? 0.6 : 1,
  width: 'fit-content',
});
