import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { TrustedIssuerRegistry, RevocationRegistry } from "../typechain-types";

describe("RevocationRegistry", () => {
  let tir: TrustedIssuerRegistry;
  let rr: RevocationRegistry;
  let admin: SignerWithAddress;
  let issuerA: SignerWithAddress;
  let issuerB: SignerWithAddress;
  let stranger: SignerWithAddress;

  /**
   * Mirror the off-chain hash computation used by the issuer backend.
   * credentialHash = keccak256(abi.encodePacked(subjectDID, credentialType, expiryDate, salt))
   */
  function computeCredentialHash(
    subjectDID: string,
    credentialType: string,
    expiryDate: number,
    salt: string
  ): string {
    return ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32", "bytes32", "uint256", "bytes32"],
        [
          ethers.keccak256(ethers.toUtf8Bytes(subjectDID)),
          ethers.keccak256(ethers.toUtf8Bytes(credentialType)),
          expiryDate,
          ethers.keccak256(ethers.toUtf8Bytes(salt)),
        ]
      )
    );
  }

  const SUBJECT_DID   = "did:ethr:amoy:0xSubject";
  const CRED_TYPE     = "KYCCredential";
  const EXPIRY        = 9999999999; // far future
  const SALT_A        = "random-salt-for-alice";
  const SALT_B        = "random-salt-for-bob";

  let hashA: string;
  let hashB: string;

  beforeEach(async () => {
    [admin, issuerA, issuerB, stranger] = await ethers.getSigners();

    const TIR = await ethers.getContractFactory("TrustedIssuerRegistry");
    tir = await TIR.deploy(admin.address);

    const RR = await ethers.getContractFactory("RevocationRegistry");
    rr = await RR.deploy(await tir.getAddress());

    hashA = computeCredentialHash(SUBJECT_DID, CRED_TYPE, EXPIRY, SALT_A);
    hashB = computeCredentialHash(SUBJECT_DID, CRED_TYPE, EXPIRY, SALT_B);
  });

  // ── anchorCredential ───────────────────────────────────────────────────────

  describe("anchorCredential()", () => {
    beforeEach(async () => {
      await tir.connect(admin).addIssuer(issuerA.address);
    });

    it("trusted issuer can anchor a credential hash", async () => {
      await rr.connect(issuerA).anchorCredential(hashA);
      const status = await rr.getCredentialStatus(hashA);
      expect(status.isAnchored).to.be.true;
      expect(status.isRevoked).to.be.false;
      expect(status.issuerStillTrusted).to.be.true;
      expect(status.issuer).to.equal(issuerA.address);
    });

    it("emits CredentialAnchored event", async () => {
      await expect(rr.connect(issuerA).anchorCredential(hashA))
        .to.emit(rr, "CredentialAnchored")
        .withArgs(hashA, issuerA.address);
    });

    it("reverts if caller is not a trusted issuer", async () => {
      await expect(rr.connect(stranger).anchorCredential(hashA))
        .to.be.revertedWith("RR: caller is not a trusted issuer");
    });

    it("reverts on zero hash", async () => {
      await expect(rr.connect(issuerA).anchorCredential(ethers.ZeroHash))
        .to.be.revertedWith("RR: zero hash");
    });

    it("reverts on duplicate anchor", async () => {
      await rr.connect(issuerA).anchorCredential(hashA);
      await expect(rr.connect(issuerA).anchorCredential(hashA))
        .to.be.revertedWith("RR: already anchored");
    });

    it("same credentialId with different salts produces different hashes", async () => {
      // hashA and hashB use the same subject/type/expiry but different salts
      expect(hashA).to.not.equal(hashB);
      await rr.connect(issuerA).anchorCredential(hashA);
      await rr.connect(issuerA).anchorCredential(hashB); // both should succeed
    });

    it("untrusted issuer is rejected even if later added", async () => {
      // issuerB is NOT yet trusted — should revert
      await expect(rr.connect(issuerB).anchorCredential(hashA))
        .to.be.revertedWith("RR: caller is not a trusted issuer");
    });
  });

  // ── revokeCredential ───────────────────────────────────────────────────────

  describe("revokeCredential()", () => {
    beforeEach(async () => {
      await tir.connect(admin).addIssuer(issuerA.address);
      await tir.connect(admin).addIssuer(issuerB.address);
      await rr.connect(issuerA).anchorCredential(hashA);
      await rr.connect(issuerB).anchorCredential(hashB);
    });

    it("issuer can revoke their own credential", async () => {
      await rr.connect(issuerA).revokeCredential(hashA);
      const status = await rr.getCredentialStatus(hashA);
      expect(status.isRevoked).to.be.true;
    });

    it("emits CredentialRevoked event", async () => {
      await expect(rr.connect(issuerA).revokeCredential(hashA))
        .to.emit(rr, "CredentialRevoked")
        .withArgs(hashA, issuerA.address);
    });

    it("issuerA cannot revoke issuerB's credential", async () => {
      await expect(rr.connect(issuerA).revokeCredential(hashB))
        .to.be.revertedWith("RR: caller did not anchor this credential");
    });

    it("reverts if already revoked", async () => {
      await rr.connect(issuerA).revokeCredential(hashA);
      await expect(rr.connect(issuerA).revokeCredential(hashA))
        .to.be.revertedWith("RR: already revoked");
    });

    it("stranger cannot revoke any credential", async () => {
      await expect(rr.connect(stranger).revokeCredential(hashA))
        .to.be.revertedWith("RR: caller did not anchor this credential");
    });
  });

  // ── getCredentialStatus — issuerStillTrusted live flag ────────────────────

  describe("getCredentialStatus() — issuerStillTrusted flag", () => {
    it("returns false for an unanchored hash", async () => {
      const status = await rr.getCredentialStatus(hashA);
      expect(status.isAnchored).to.be.false;
      expect(status.issuerStillTrusted).to.be.false;
    });

    it("issuerStillTrusted becomes false when issuer is removed from TIR", async () => {
      await tir.connect(admin).addIssuer(issuerA.address);
      await rr.connect(issuerA).anchorCredential(hashA);

      // Issuer is trusted at time of anchoring
      let status = await rr.getCredentialStatus(hashA);
      expect(status.issuerStillTrusted).to.be.true;

      // Admin removes issuer from TIR (e.g. license revoked)
      await tir.connect(admin).removeIssuer(issuerA.address);

      // Credential now fails the live trust check
      status = await rr.getCredentialStatus(hashA);
      expect(status.isAnchored).to.be.true;
      expect(status.isRevoked).to.be.false;
      expect(status.issuerStillTrusted).to.be.false;
    });
  });
});
