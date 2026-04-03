import {
  createAgent,
  type ICredentialPlugin,
  type IDIDManager,
  type IKeyManager,
  type IResolver,
  type TAgent,
} from '@veramo/core';
import { CredentialPlugin } from '@veramo/credential-w3c';
import { DIDManager, MemoryDIDStore } from '@veramo/did-manager';
import { EthrDIDProvider } from '@veramo/did-provider-ethr';
import { KeyManager, MemoryKeyStore, MemoryPrivateKeyStore } from '@veramo/key-manager';
import { KeyManagementSystem } from '@veramo/kms-local';
import { DIDResolverPlugin } from '@veramo/did-resolver';
import { Resolver } from 'did-resolver';
import { getResolver as ethrDidResolver } from 'ethr-did-resolver';
import { computeAddress } from 'ethers';

// Polygon Amoy chain ID
const AMOY_CHAIN_ID = 80002;

export type IssuerAgent = TAgent<IDIDManager & IKeyManager & ICredentialPlugin & IResolver>;
export type VerifierAgent = TAgent<ICredentialPlugin & IResolver>;

interface IssuerAgentConfig {
  /** Hex private key for JWT-VC signing — separate from the deployer/on-chain wallet */
  issuerPrivateKeyHex: string;
  alchemyAmoyUrl: string;
}

interface VerifierAgentConfig {
  alchemyAmoyUrl: string;
}

/**
 * Create a Veramo agent for signing Verifiable Credentials.
 *
 * Uses a dedicated VC signing key (ISSUER_DID_PRIVATE_KEY) that is separate
 * from the deployer wallet used for on-chain transactions. The issuer DID
 * is deterministically derived from this private key.
 *
 * @returns agent  — Veramo agent configured for VC issuance
 * @returns issuerDid — did:ethr:amoy:{address} derived from the signing key
 */
export async function createIssuerAgent(
  config: IssuerAgentConfig
): Promise<{ agent: IssuerAgent; issuerDid: string }> {
  const privateKeyHex = config.issuerPrivateKeyHex.replace(/^0x/, '');

  const agent = createAgent<IDIDManager & IKeyManager & ICredentialPlugin & IResolver>({
    plugins: [
      new KeyManager({
        store: new MemoryKeyStore(),
        kms: {
          local: new KeyManagementSystem(new MemoryPrivateKeyStore()),
        },
      }),
      new DIDManager({
        store: new MemoryDIDStore(),
        defaultProvider: 'did:ethr:amoy',
        providers: {
          'did:ethr:amoy': new EthrDIDProvider({
            defaultKms: 'local',
            network: 'amoy',
            rpcUrl: config.alchemyAmoyUrl,
          }),
        },
      }),
      new DIDResolverPlugin({
        resolver: new Resolver({
          ...ethrDidResolver({
            networks: [
              {
                name: 'amoy',
                chainId: AMOY_CHAIN_ID,
                rpcUrl: config.alchemyAmoyUrl,
              },
            ],
          }),
        }),
      }),
      new CredentialPlugin(),
    ],
  });

  // Import the VC signing key into the local KMS
  const importedKey = await agent.keyManagerImport({
    kms: 'local',
    type: 'Secp256k1',
    privateKeyHex,
  });

  // Derive the issuer DID from the imported key's public key
  const issuerAddress = computeAddress(`0x${importedKey.publicKeyHex}`);
  const issuerDid = `did:ethr:amoy:${issuerAddress}`;

  // Register the DID in the DID manager so the agent can sign with it
  await agent.didManagerImport({
    did: issuerDid,
    provider: 'did:ethr:amoy',
    controllerKeyId: importedKey.kid,
    keys: [
      {
        kid: importedKey.kid,
        kms: 'local',
        type: 'Secp256k1',
        publicKeyHex: importedKey.publicKeyHex,
        privateKeyHex,
      },
    ],
  });

  return { agent, issuerDid };
}

/**
 * Create a Veramo agent for verifying Verifiable Credentials.
 * No key management — resolver and credential verification only.
 */
export function createVerifierAgent(config: VerifierAgentConfig): VerifierAgent {
  return createAgent<ICredentialPlugin & IResolver>({
    plugins: [
      new DIDResolverPlugin({
        resolver: new Resolver({
          ...ethrDidResolver({
            networks: [
              {
                name: 'amoy',
                chainId: AMOY_CHAIN_ID,
                rpcUrl: config.alchemyAmoyUrl,
              },
            ],
          }),
        }),
      }),
      new CredentialPlugin(),
    ],
  });
}
