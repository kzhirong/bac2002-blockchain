import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { DIDRegistry } from "../typechain-types";

describe("DIDRegistry", () => {
  let registry: DIDRegistry;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let stranger: SignerWithAddress;

  // Helpers — mirror the off-chain encoding used by all services
  const toDIDHash = (did: string): string =>
    ethers.keccak256(ethers.toUtf8Bytes(did));

  const ALICE_DID   = "did:ethr:amoy:0xAlice";
  const ALICE_HASH  = toDIDHash(ALICE_DID);
  const PUBLIC_KEY  = ethers.toUtf8Bytes("mock-public-key-65-bytes");
  const PUBLIC_KEY2 = ethers.toUtf8Bytes("mock-public-key-v2-65-bytes");

  beforeEach(async () => {
    [alice, bob, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DIDRegistry");
    registry = await Factory.deploy();
  });

  // ── registerDID ────────────────────────────────────────────────────────────

  describe("registerDID()", () => {
    it("registers a DID and sets caller as controller", async () => {
      await registry.connect(alice).registerDID(ALICE_HASH, PUBLIC_KEY);
      const [controller, key] = await registry.resolveDID(ALICE_HASH);
      expect(controller).to.equal(alice.address);
      expect(key).to.equal(ethers.hexlify(PUBLIC_KEY));
    });

    it("emits DIDRegistered event", async () => {
      await expect(registry.connect(alice).registerDID(ALICE_HASH, PUBLIC_KEY))
        .to.emit(registry, "DIDRegistered")
        .withArgs(ALICE_HASH, alice.address);
    });

    it("reverts if DID is already registered", async () => {
      await registry.connect(alice).registerDID(ALICE_HASH, PUBLIC_KEY);
      await expect(registry.connect(bob).registerDID(ALICE_HASH, PUBLIC_KEY))
        .to.be.revertedWith("DIDRegistry: already registered");
    });

    it("reverts if public key is empty", async () => {
      await expect(registry.connect(alice).registerDID(ALICE_HASH, "0x"))
        .to.be.revertedWith("DIDRegistry: empty public key");
    });
  });

  // ── updatePublicKey ────────────────────────────────────────────────────────

  describe("updatePublicKey()", () => {
    beforeEach(async () => {
      await registry.connect(alice).registerDID(ALICE_HASH, PUBLIC_KEY);
    });

    it("controller can update their public key", async () => {
      await registry.connect(alice).updatePublicKey(ALICE_HASH, PUBLIC_KEY2);
      const [, key] = await registry.resolveDID(ALICE_HASH);
      expect(key).to.equal(ethers.hexlify(PUBLIC_KEY2));
    });

    it("emits DIDPublicKeyUpdated event", async () => {
      await expect(registry.connect(alice).updatePublicKey(ALICE_HASH, PUBLIC_KEY2))
        .to.emit(registry, "DIDPublicKeyUpdated")
        .withArgs(ALICE_HASH, ethers.hexlify(PUBLIC_KEY2));
    });

    it("reverts if called by non-controller", async () => {
      await expect(registry.connect(stranger).updatePublicKey(ALICE_HASH, PUBLIC_KEY2))
        .to.be.revertedWith("DIDRegistry: not controller");
    });

    it("reverts if new public key is empty", async () => {
      await expect(registry.connect(alice).updatePublicKey(ALICE_HASH, "0x"))
        .to.be.revertedWith("DIDRegistry: empty public key");
    });
  });

  // ── transferOwnership ──────────────────────────────────────────────────────

  describe("transferOwnership()", () => {
    beforeEach(async () => {
      await registry.connect(alice).registerDID(ALICE_HASH, PUBLIC_KEY);
    });

    it("controller can transfer DID ownership", async () => {
      await registry.connect(alice).transferOwnership(ALICE_HASH, bob.address);
      const [controller] = await registry.resolveDID(ALICE_HASH);
      expect(controller).to.equal(bob.address);
    });

    it("emits DIDOwnershipTransferred event", async () => {
      await expect(registry.connect(alice).transferOwnership(ALICE_HASH, bob.address))
        .to.emit(registry, "DIDOwnershipTransferred")
        .withArgs(ALICE_HASH, alice.address, bob.address);
    });

    it("new controller can update key; old controller cannot", async () => {
      await registry.connect(alice).transferOwnership(ALICE_HASH, bob.address);
      await expect(registry.connect(alice).updatePublicKey(ALICE_HASH, PUBLIC_KEY2))
        .to.be.revertedWith("DIDRegistry: not controller");
      await registry.connect(bob).updatePublicKey(ALICE_HASH, PUBLIC_KEY2); // should succeed
    });

    it("reverts if called by non-controller", async () => {
      await expect(registry.connect(stranger).transferOwnership(ALICE_HASH, bob.address))
        .to.be.revertedWith("DIDRegistry: not controller");
    });

    it("reverts on zero address", async () => {
      await expect(registry.connect(alice).transferOwnership(ALICE_HASH, ethers.ZeroAddress))
        .to.be.revertedWith("DIDRegistry: zero address");
    });
  });

  // ── resolveDID ─────────────────────────────────────────────────────────────

  describe("resolveDID()", () => {
    it("reverts for an unregistered DID", async () => {
      const unknownHash = toDIDHash("did:ethr:amoy:0xUnknown");
      await expect(registry.resolveDID(unknownHash))
        .to.be.revertedWith("DIDRegistry: not registered");
    });
  });
});
