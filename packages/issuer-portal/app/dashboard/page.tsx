import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import SubmissionStatusCard from '../../components/SubmissionStatusCard';
import NotificationBell from '../../components/NotificationBell';
import type { KycSubmission } from '../../lib/types';

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');

  const { data: submissions } = await supabase
    .from('kyc_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  const list = (submissions ?? []) as KycSubmission[];
  const hasActive = list.some(s => s.status === 'pending' || s.status === 'approved');

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Nav */}
      <nav style={nav}>
        <div style={navInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={navDot} />
            <span style={navBrand}>KYC Portal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <NotificationBell />
            <form action="/api/auth/signout" method="post">
              <button type="submit" style={outlineBtn}>Sign out</button>
            </form>
          </div>
        </div>
      </nav>

      <main style={main}>
        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={pageTitle}>My KYC Applications</h1>
            <p style={pageSubtitle}>Track the status of your identity verification requests.</p>
          </div>
          {!hasActive && (
            <a href="/submit" style={primaryLink}>Submit KYC</a>
          )}
        </div>

        {/* Content */}
        {list.length === 0 ? (
          <div style={emptyState}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e2e8f0', margin: '0 auto 1rem' }} />
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>No submissions yet.</p>
            <a href="/submit" style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.875rem' }}>
              Submit your KYC documents
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {list.map(s => (
              <SubmissionStatusCard key={s.id} submission={s} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const nav: React.CSSProperties = {
  background: 'white',
  borderBottom: '1px solid #e2e8f0',
  padding: '0 1.5rem',
};

const navInner: React.CSSProperties = {
  maxWidth: 960,
  margin: '0 auto',
  height: 56,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const navDot: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: '#2563eb',
};

const navBrand: React.CSSProperties = {
  fontWeight: 700,
  fontSize: '0.9rem',
  color: '#0f172a',
};

const main: React.CSSProperties = {
  maxWidth: 960,
  margin: '0 auto',
  padding: '2.5rem 1.5rem',
};

const pageTitle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 700,
  color: '#0f172a',
  marginBottom: '0.25rem',
};

const pageSubtitle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#64748b',
};

const primaryLink: React.CSSProperties = {
  display: 'inline-block',
  background: '#2563eb',
  color: 'white',
  padding: '0.5rem 1rem',
  borderRadius: 6,
  fontWeight: 600,
  fontSize: '0.875rem',
};

const outlineBtn: React.CSSProperties = {
  background: 'none',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  padding: '0.375rem 0.75rem',
  cursor: 'pointer',
  fontSize: '0.875rem',
  color: '#374151',
  fontWeight: 500,
};

const emptyState: React.CSSProperties = {
  textAlign: 'center',
  padding: '4rem 1rem',
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
};
