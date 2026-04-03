import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '../../lib/supabase/server';
import AdminSubmissionsTable from '../../components/AdminSubmissionsTable';
import type { KycSubmission, Profile } from '../../lib/types';

export default async function AdminPage() {
  const supabase      = createClient();
  const adminSupabase = createAdminClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if ((profile as Profile | null)?.role !== 'admin') redirect('/dashboard');

  const { data: submissions } = await adminSupabase
    .from('kyc_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  const list = (submissions ?? []) as KycSubmission[];

  const stats: { label: string; count: number; color: string }[] = [
    { label: 'Pending',  count: list.filter(s => s.status === 'pending').length,  color: '#b45309' },
    { label: 'Approved', count: list.filter(s => s.status === 'approved').length, color: '#166534' },
    { label: 'Rejected', count: list.filter(s => s.status === 'rejected').length, color: '#b91c1c' },
    { label: 'Revoked',  count: list.filter(s => s.status === 'revoked').length,  color: '#475569' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Nav */}
      <nav style={nav}>
        <div style={navInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={navDot} />
            <span style={navBrand}>KYC Portal</span>
            <span style={adminBadge}>Admin</span>
          </div>
          <form action="/api/auth/signout" method="post">
            <button type="submit" style={outlineBtn}>Sign out</button>
          </form>
        </div>
      </nav>

      <main style={main}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={pageTitle}>KYC Applications</h1>
          <p style={pageSubtitle}>Review, approve, reject, or revoke identity verification requests.</p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
          {stats.map(({ label, count, color }) => (
            <div key={label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1.25rem 1rem' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color, lineHeight: 1, marginBottom: '0.375rem' }}>
                {count}
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        <AdminSubmissionsTable initialSubmissions={list} />
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
  maxWidth: 1120,
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

const adminBadge: React.CSSProperties = {
  fontSize: '0.65rem',
  fontWeight: 600,
  color: '#2563eb',
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: 4,
  padding: '0.1rem 0.4rem',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
};

const main: React.CSSProperties = {
  maxWidth: 1120,
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
