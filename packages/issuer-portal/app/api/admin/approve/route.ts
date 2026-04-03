import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import {
  generateCredentialSalt,
  computeCredentialHash,
  createIssuerAgent,
  contractAddresses,
  RevocationRegistry__factory,
} from 'shared';
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

    // ── 1. Auth + admin check ─────────────────────────────────────────────────
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    if (!(await isAdmin(session.user.id, admin))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── 2. Fetch submission ───────────────────────────────────────────────────
    const { data: sub, error: fetchErr } = await admin
      .from('kyc_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchErr || !sub) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }
    if (sub.status !== 'pending') {
      return NextResponse.json({ error: `Submission is already ${sub.status}` }, { status: 409 });
    }

    // ── 3. Validate env ───────────────────────────────────────────────────────
    const issuerPrivateKeyHex = process.env.ISSUER_DID_PRIVATE_KEY ?? '';
    const deployerPrivateKey  = process.env.DEPLOYER_PRIVATE_KEY ?? '';
    const alchemyAmoyUrl      = process.env.ALCHEMY_AMOY_URL ?? '';

    if (!issuerPrivateKeyHex || !deployerPrivateKey || !alchemyAmoyUrl) {
      return NextResponse.json({ error: 'Server misconfigured — check .env' }, { status: 500 });
    }

    // ── 4. Create Veramo issuer agent ─────────────────────────────────────────
    const { agent, issuerDid } = await createIssuerAgent({ issuerPrivateKeyHex, alchemyAmoyUrl });

    // ── 5. Build VC payload ───────────────────────────────────────────────────
    const credentialId = `urn:uuid:${uuidv4()}`;
    const salt = generateCredentialSalt();
    const subjectDid = `did:ethr:0x${(80002).toString(16)}:${sub.subject_address}`;

    const vc = await agent.createVerifiableCredential({
      credential: {
        id: credentialId,
        issuer: { id: issuerDid },
        type: ['VerifiableCredential', 'KYCCredential'],
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        credentialSubject: {
          id: subjectDid,
          kycVerified: true,
          nationality: sub.nationality,
          credentialSalt: salt,
        },
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
      proofFormat: 'jwt',
    });

    const vcJwt = (vc.proof as { jwt: string }).jwt;

    // ── 6. Anchor on-chain ────────────────────────────────────────────────────
    const credentialHash = computeCredentialHash(credentialId, salt);
    const provider = new ethers.JsonRpcProvider(alchemyAmoyUrl);
    const deployerWallet = new ethers.Wallet(deployerPrivateKey, provider);

    const revocationRegistry = RevocationRegistry__factory.connect(
      contractAddresses.RevocationRegistry,
      deployerWallet
    );
    const tx = await revocationRegistry.anchorCredential(credentialHash);
    await tx.wait();

    // ── 7. Persist results ────────────────────────────────────────────────────
    const { error: updateErr } = await admin
      .from('kyc_submissions')
      .update({
        status: 'approved',
        vc_jwt: vcJwt,
        credential_id: credentialId,
        credential_hash: credentialHash,
        tx_hash: tx.hash,
        issuer_did: issuerDid,
        subject_did: subjectDid,
      })
      .eq('id', submissionId);

    if (updateErr) throw new Error(updateErr.message);

    // ── 8. Notify the user ────────────────────────────────────────────────────
    await admin.from('notifications').insert({
      user_id: sub.user_id,
      message: 'Your KYC application has been approved. Your Verifiable Credential is now available in your dashboard.',
    });

    return NextResponse.json({ vcJwt, credentialId, credentialHash, txHash: tx.hash, issuerDid, subjectDid });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[admin/approve]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
