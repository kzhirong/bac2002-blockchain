// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TrustedIssuerRegistry.sol";

/**
 * @title RevocationRegistry
 * @notice Anchors and revokes Verifiable Credential hashes on-chain.
 *
 *         Privacy model — hash obfuscation:
 *           No personal data is ever stored on-chain. The issuer backend
 *           computes:
 *             credentialHash = keccak256(abi.encodePacked(
 *               subjectDID,      // bytes32 — hash of the subject's DID string
 *               credentialType,  // bytes32 — e.g. keccak256("KYCCredential")
 *               expiryDate,      // uint256 — unix timestamp
 *               salt             // bytes32 — random per-credential secret
 *             ))
 *           Only this hash hits the chain. The verifier re-computes the same
 *           hash from data presented off-chain by the user and checks it here.
 *
 *         Access control:
 *           anchorCredential()  — only trusted issuers (checked via TIR)
 *           revokeCredential()  — only the issuer who originally anchored it
 */
contract RevocationRegistry {
    TrustedIssuerRegistry public immutable tir;

    struct CredentialRecord {
        address issuer;     // who anchored this credential
        uint256 anchoredAt; // block timestamp of anchoring
        bool    isRevoked;  // revocation flag
    }

    // credentialHash => CredentialRecord
    mapping(bytes32 => CredentialRecord) private _credentials;

    event CredentialAnchored(bytes32 indexed credentialHash, address indexed issuer);
    event CredentialRevoked(bytes32 indexed credentialHash, address indexed issuer);

    constructor(address tirAddress) {
        require(tirAddress != address(0), "RR: zero TIR address");
        tir = TrustedIssuerRegistry(tirAddress);
    }

    modifier onlyTrustedIssuer() {
        require(tir.isTrusted(msg.sender), "RR: caller is not a trusted issuer");
        _;
    }

    modifier onlyCredentialIssuer(bytes32 credentialHash) {
        require(_credentials[credentialHash].issuer == msg.sender, "RR: caller did not anchor this credential");
        _;
    }

    /**
     * @notice Anchor a credential hash on-chain. Can only be called by a
     *         currently trusted issuer. Duplicate anchoring is rejected.
     * @param credentialHash keccak256 hash of the credential data + salt.
     *                       Computed off-chain by the issuer backend.
     */
    function anchorCredential(bytes32 credentialHash) external onlyTrustedIssuer {
        require(credentialHash != bytes32(0), "RR: zero hash");
        require(_credentials[credentialHash].issuer == address(0), "RR: already anchored");

        _credentials[credentialHash] = CredentialRecord({
            issuer:     msg.sender,
            anchoredAt: block.timestamp,
            isRevoked:  false
        });

        emit CredentialAnchored(credentialHash, msg.sender);
    }

    /**
     * @notice Revoke a previously anchored credential. Only the issuer who
     *         anchored it can revoke it — issuer A cannot revoke issuer B's
     *         credentials.
     * @param credentialHash The hash of the credential to revoke.
     */
    function revokeCredential(bytes32 credentialHash)
        external
        onlyCredentialIssuer(credentialHash)
    {
        require(!_credentials[credentialHash].isRevoked, "RR: already revoked");
        _credentials[credentialHash].isRevoked = true;
        emit CredentialRevoked(credentialHash, msg.sender);
    }

    /**
     * @notice Check the full status of a credential.
     * @param credentialHash The hash to query.
     * @return isAnchored        True if this hash was ever anchored.
     * @return isRevoked         True if the issuer has revoked it.
     * @return issuerStillTrusted True if the anchoring issuer is still on the
     *                            TIR whitelist at the time of this call.
     *                            A credential from a de-listed issuer should
     *                            be treated as untrusted even if not revoked.
     * @return issuer            The address that anchored this credential.
     * @return anchoredAt        Block timestamp when it was anchored.
     */
    function getCredentialStatus(bytes32 credentialHash)
        external
        view
        returns (
            bool    isAnchored,
            bool    isRevoked,
            bool    issuerStillTrusted,
            address issuer,
            uint256 anchoredAt
        )
    {
        CredentialRecord storage rec = _credentials[credentialHash];
        isAnchored        = rec.issuer != address(0);
        isRevoked         = rec.isRevoked;
        issuerStillTrusted = isAnchored && tir.isTrusted(rec.issuer);
        issuer            = rec.issuer;
        anchoredAt        = rec.anchoredAt;
    }
}
