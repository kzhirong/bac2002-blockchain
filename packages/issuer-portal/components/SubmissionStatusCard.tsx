import type { KycSubmission } from '../lib/types';

const STATUS: Record<string, { text: string; color: string; bg: string; border: string }> = {
  pending:  { text: 'Pending Review', color: '#92400e', bg: '#fefce8', border: '#fde68a' },
  approved: { text: 'Approved',       color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
  rejected: { text: 'Rejected',       color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
  revoked:  { text: 'Revoked',        color: '#475569', bg: '#f8fafc', border: '#cbd5e1' },
};

interface Props {
  submission: KycSubmission;
}

export default function SubmissionStatusCard({ submission: s }: Props) {
  const st = STATUS[s.status] ?? STATUS.pending;

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        {/* Left: metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <span style={badge(st)}>{st.text}</span>
          <div style={meta}><span style={metaKey}>Name</span> {s.full_name}</div>
          <div style={meta}><span style={metaKey}>Nationality</span> {s.nationality}</div>
          <div style={meta}><span style={metaKey}>Submitted</span> {new Date(s.created_at).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Rejection reason */}
      {s.status === 'rejected' && s.rejection_reason && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: '0.8rem', color: '#b91c1c' }}>
          <strong>Reason:</strong> {s.rejection_reason}
        </div>
      )}

      {/* Approved: show VC */}
      {s.status === 'approved' && s.vc_jwt && (
        <div style={{ marginTop: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Verifiable Credential (JWT)
          </div>
          <textarea
            readOnly
            value={s.vc_jwt}
            rows={4}
            style={vcTextarea}
          />
          {s.tx_hash && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
              Anchor tx:{' '}
              <a
                href={`https://amoy.polygonscan.com/tx/${s.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#2563eb', wordBreak: 'break-all' }}
              >
                {s.tx_hash}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Revoked: show hash */}
      {s.status === 'revoked' && s.credential_hash && (
        <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
          <span style={metaKey}>Credential hash</span>{' '}
          <code style={{ fontSize: '0.75rem', wordBreak: 'break-all', color: '#374151' }}>{s.credential_hash}</code>
        </div>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: '1.25rem',
};

const badge = (st: { color: string; bg: string; border: string }): React.CSSProperties => ({
  display: 'inline-block',
  background: st.bg,
  color: st.color,
  border: `1px solid ${st.border}`,
  padding: '0.2rem 0.6rem',
  borderRadius: 9999,
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  width: 'fit-content',
});

const meta: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#374151',
  display: 'flex',
  gap: '0.5rem',
};

const metaKey: React.CSSProperties = {
  fontWeight: 600,
  color: '#64748b',
  minWidth: 80,
};

const vcTextarea: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.5rem 0.75rem',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: '0.7rem',
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  color: '#374151',
  background: '#f8fafc',
  resize: 'vertical',
  outline: 'none',
};
