// Deployed contract addresses on Polygon Amoy
export const CONTRACT_ADDRESSES = {
  TrustedIssuerRegistry: '0x1Ce243CE7bAb25fC7c15012540dC0486D49374Ec',
  RevocationRegistry:    '0xfC0Ac716587559D4fceC0CEdfa031675b3f978C5',
};

export const AMOY_CHAIN_ID = 80002;

// Minimal ABIs — only the functions we call
export const TIR_ABI = [
  'function isTrusted(address issuer) view returns (bool)',
];

export const RR_ABI = [
  'function getCredentialStatus(bytes32 credentialHash) view returns (bool isAnchored, bool isRevoked, bool issuerStillTrusted, address issuer, uint256 anchoredAt)',
];
