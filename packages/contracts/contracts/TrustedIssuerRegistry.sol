// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TrustedIssuerRegistry
 * @notice Admin-controlled whitelist of KYC issuers that are permitted to
 *         anchor and revoke Verifiable Credentials on the RevocationRegistry.
 *         Ownable is intentional here — one governance admin controls which
 *         entities are approved issuers (e.g. a licensed KYC provider).
 */
contract TrustedIssuerRegistry is Ownable {
    // issuer address => trusted status
    mapping(address => bool) private _trusted;

    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);

    constructor(address admin) Ownable(admin) {}

    /**
     * @notice Add an address as a trusted issuer.
     * @param issuer The wallet address of the issuer to whitelist.
     */
    function addIssuer(address issuer) external onlyOwner {
        require(issuer != address(0), "TIR: zero address");
        require(!_trusted[issuer], "TIR: already trusted");
        _trusted[issuer] = true;
        emit IssuerAdded(issuer);
    }

    /**
     * @notice Remove a previously trusted issuer.
     *         Any credentials they anchored will fail the issuerStillTrusted
     *         check in RevocationRegistry.getCredentialStatus().
     * @param issuer The wallet address to remove.
     */
    function removeIssuer(address issuer) external onlyOwner {
        require(_trusted[issuer], "TIR: not trusted");
        _trusted[issuer] = false;
        emit IssuerRemoved(issuer);
    }

    /**
     * @notice Check whether an address is a currently trusted issuer.
     * @param issuer The address to query.
     * @return True if the address is trusted.
     */
    function isTrusted(address issuer) external view returns (bool) {
        return _trusted[issuer];
    }
}
