import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { contractAddresses, RevocationRegistry__factory } from 'shared';
import { createClient, createAdminClient } from '../../../../lib/supabase/server';

export const runtime = 'nodejs';

async function isAdmin(userId: string, admin: ReturnType<typeof createAdminClient>): Promise<boolean> {
  const { data } = await admin.from('profiles').select('role').eq('id', userId).single();
  return data?.role === 'admin';
}

export async function POST(req: NextRequest) {
  try {
    const { submissionId } = await req.json();
    if (!submissionId) {
      return NextResponse.json({ error: 'submissionId required' }, { status: 400 });
    }

    // ── Auth + admin check ────────────────────────────────────────────────────
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    if (!(await isAdmin(session.user.id, admin))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── Fetch submission ──────────────────────────────────────────────────────
    const { data: sub, error: fetchErr } = await admin
      .from('kyc_submissions')
      .select('user_id, status, credential_hash')
      .eq('id', submissionId)
      .single();

    if (fetchErr || !sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    if (sub.status !== 'approved') {
      return NextResponse.json({ error: 'Only approved credentials can be revoked' }, { status: 409 });
    }
    if (!sub.credential_hash) {
      return NextResponse.json({ error: 'No on-chain credential hash found' }, { status: 400 });
    }

    // ── Validate env ──────────────────────────────────────────────────────────
    const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY ?? '';
    const alchemyAmoyUrl     = process.env.ALCHEMY_AMOY_URL ?? '';
    if (!deployerPrivateKey || !alchemyAmoyUrl) {
      return NextResponse.json({ error: 'Server misconfigured — check .env' }, { status: 500 });
    }

    // ── Revoke on-chain ───────────────────────────────────────────────────────
    const provider = new ethers.JsonRpcProvider(alchemyAmoyUrl);
    const deployerWallet = new ethers.Wallet(deployerPrivateKey, provider);

    const revocationRegistry = RevocationRegistry__factory.connect(
      contractAddresses.RevocationRegistry,
      deployerWallet
    );
    const tx = await revocationRegistry.revokeCredential(sub.credential_hash);
    await tx.wait();

    // ── Update DB ─────────────────────────────────────────────────────────────
    const { error: updateErr } = await admin
      .from('kyc_submissions')
      .update({ status: 'revoked' })
      .eq('id', submissionId);

    if (updateErr) throw new Error(updateErr.message);

    // ── Notify user ───────────────────────────────────────────────────────────
    await admin.from('notifications').insert({
      user_id: sub.user_id,
      message: 'Your KYC credential has been revoked. Please contact support if you believe this is an error.',
    });

    return NextResponse.json({ success: true, txHash: tx.hash });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[admin/revoke]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
