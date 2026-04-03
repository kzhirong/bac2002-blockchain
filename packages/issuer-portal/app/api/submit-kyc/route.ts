import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { createClient, createAdminClient } from '../../../lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, nationality, dob, documentNumber, subjectAddress } = body;

    // ── 1. Validate required fields ───────────────────────────────────────────
    if (!fullName || !nationality || !dob || !documentNumber || !subjectAddress) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    if (!ethers.isAddress(subjectAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    // ── 2. Get authenticated user ─────────────────────────────────────────────
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 3. Check for an existing active submission ────────────────────────────
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from('kyc_submissions')
      .select('id, status')
      .eq('user_id', session.user.id)
      .in('status', ['pending', 'approved'])
      .limit(1)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `You already have a ${existing.status} submission` },
        { status: 409 }
      );
    }

    // ── 4. Insert submission ──────────────────────────────────────────────────
    const { data: submission, error: insertErr } = await admin
      .from('kyc_submissions')
      .insert({
        user_id: session.user.id,
        full_name: fullName,
        nationality,
        dob,
        document_number: documentNumber,
        subject_address: subjectAddress,
        status: 'pending',
      })
      .select()
      .single();

    if (insertErr) throw new Error(insertErr.message);

    return NextResponse.json({ submissionId: submission.id }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[submit-kyc]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
