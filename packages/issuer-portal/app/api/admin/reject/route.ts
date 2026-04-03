import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '../../../../lib/supabase/server';

export const runtime = 'nodejs';

async function isAdmin(userId: string, admin: ReturnType<typeof createAdminClient>): Promise<boolean> {
  const { data } = await admin.from('profiles').select('role').eq('id', userId).single();
  return data?.role === 'admin';
}

export async function POST(req: NextRequest) {
  try {
    const { submissionId, reason } = await req.json();
    if (!submissionId || !reason?.trim()) {
      return NextResponse.json({ error: 'submissionId and reason are required' }, { status: 400 });
    }

    // ── Auth + admin check ────────────────────────────────────────────────────
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    if (!(await isAdmin(session.user.id, admin))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── Fetch + validate submission ───────────────────────────────────────────
    const { data: sub, error: fetchErr } = await admin
      .from('kyc_submissions')
      .select('user_id, status')
      .eq('id', submissionId)
      .single();

    if (fetchErr || !sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    if (sub.status !== 'pending') {
      return NextResponse.json({ error: `Submission is already ${sub.status}` }, { status: 409 });
    }

    // ── Update status ─────────────────────────────────────────────────────────
    const { error: updateErr } = await admin
      .from('kyc_submissions')
      .update({ status: 'rejected', rejection_reason: reason.trim() })
      .eq('id', submissionId);

    if (updateErr) throw new Error(updateErr.message);

    // ── Notify user ───────────────────────────────────────────────────────────
    await admin.from('notifications').insert({
      user_id: sub.user_id,
      message: `Your KYC application was rejected. Reason: ${reason.trim()}`,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[admin/reject]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
