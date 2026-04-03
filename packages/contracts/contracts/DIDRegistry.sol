// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DIDRegistry
 * @notice Maps Decentralized Identifiers (DIDs) to their public keys.
 *         No global owner — each DID is independently controlled by its own
 *         controller address. No admin can modify another DID's record.
 *
 *         DIDs are stored by their keccak256 hash to save gas and avoid
 *         storing arbitrary-length strings on-chain.
 *
 *         Off-chain encoding (must match in all services):
 *           didHash = keccak256(abi.encodePacked(didString))
 *           e.g. keccak256("did:ethr:amoy:0xABC...")
 */
contract DIDRegistry {
    struct DIDRecord {
        address controller; // address that controls this DID
        bytes   publicKey;  // raw public key bytes (uncompressed 65-byte or compressed 33-byte)
        uint256 updatedAt;  // block timestamp of last update
    }

    // didHash => DIDRecord
    mapping(bytes32 => DIDRecord) private _registry;

    event DIDRegistered(bytes32 indexed didHash, address indexed controller);
    event DIDPublicKeyUpdated(bytes32 indexed didHash, bytes newPublicKey);
    event DIDOwnershipTransferred(bytes32 indexed didHash, address indexed previousController, address indexed newController);

    /**
     * @dev Reverts if msg.sender is not the controller of the given DID.
     */
    modifier onlyController(bytes32 didHash) {
        require(_registry[didHash].controller == msg.sender, "DIDRegistry: not controller");
        _;
    }

    /**
     * @notice Register a new DID. The caller becomes the controller.
     * @param didHash    keccak256 hash of the DID string.
     * @param publicKey  The public key to associate with this DID.
     */
    function registerDID(bytes32 didHash, bytes calldata publicKey) external {
        require(_registry[didHash].controller == address(0), "DIDRegistry: already registered");
        require(publicKey.length > 0, "DIDRegistry: empty public key");

        _registry[didHash] = DIDRecord({
            controller: msg.sender,
            publicKey:  publicKey,
            updatedAt:  block.timestamp
        });

        emit DIDRegistered(didHash, msg.sender);
    }

    /**
     * @notice Update the public key for a DID you control.
     * @param didHash   keccak256 hash of the DID string.
     * @param publicKey The new public key bytes.
     */
    function updatePublicKey(bytes32 didHash, bytes calldata publicKey) external onlyController(didHash) {
        require(publicKey.length > 0, "DIDRegistry: empty public key");
        _registry[didHash].publicKey = publicKey;
        _registry[didHash].updatedAt = block.timestamp;
        emit DIDPublicKeyUpdated(didHash, publicKey);
    }

    /**
     * @notice Transfer control of a DID to a new address.
     * @param didHash        keccak256 hash of the DID string.
     * @param newController  The address that will take control.
     */
    function transferOwnership(bytes32 didHash, address newController) external onlyController(didHash) {
        require(newController != address(0), "DIDRegistry: zero address");
        address previous = _registry[didHash].controller;
        _registry[didHash].controller = newController;
        _registry[didHash].updatedAt  = block.timestamp;
        emit DIDOwnershipTransferred(didHash, previous, newController);
    }

    /**
     * @notice Resolve a DID to its on-chain record.
     * @param didHash keccak256 hash of the DID string.
     * @return controller  The address that controls this DID.
     * @return publicKey   The public key associated with this DID.
     * @return updatedAt   Timestamp of the last update.
     */
    function resolveDID(bytes32 didHash)
        external
        view
        returns (address controller, bytes memory publicKey, uint256 updatedAt)
    {
        DIDRecord storage record = _registry[didHash];
        require(record.controller != address(0), "DIDRegistry: not registered");
        return (record.controller, record.publicKey, record.updatedAt);
    }
}
