import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { TrustedIssuerRegistry } from "../typechain-types";

describe("TrustedIssuerRegistry", () => {
  let tir: TrustedIssuerRegistry;
  let admin: SignerWithAddress;
  let issuerA: SignerWithAddress;
  let issuerB: SignerWithAddress;
  let stranger: SignerWithAddress;

  beforeEach(async () => {
    [admin, issuerA, issuerB, stranger] = await ethers.getSigners();
    const TIR = await ethers.getContractFactory("TrustedIssuerRegistry");
    tir = await TIR.deploy(admin.address);
  });

  // ── addIssuer ──────────────────────────────────────────────────────────────

  describe("addIssuer()", () => {
    it("admin can add a trusted issuer", async () => {
      await tir.connect(admin).addIssuer(issuerA.address);
      expect(await tir.isTrusted(issuerA.address)).to.be.true;
    });

    it("emits IssuerAdded event", async () => {
      await expect(tir.connect(admin).addIssuer(issuerA.address))
        .to.emit(tir, "IssuerAdded")
        .withArgs(issuerA.address);
    });

    it("reverts if called by non-admin", async () => {
      await expect(tir.connect(stranger).addIssuer(issuerA.address))
        .to.be.revertedWithCustomError(tir, "OwnableUnauthorizedAccount");
    });

    it("reverts on zero address", async () => {
      await expect(tir.connect(admin).addIssuer(ethers.ZeroAddress))
        .to.be.revertedWith("TIR: zero address");
    });

    it("reverts if issuer already trusted", async () => {
      await tir.connect(admin).addIssuer(issuerA.address);
      await expect(tir.connect(admin).addIssuer(issuerA.address))
        .to.be.revertedWith("TIR: already trusted");
    });
  });

  // ── removeIssuer ───────────────────────────────────────────────────────────

  describe("removeIssuer()", () => {
    beforeEach(async () => {
      await tir.connect(admin).addIssuer(issuerA.address);
    });

    it("admin can remove a trusted issuer", async () => {
      await tir.connect(admin).removeIssuer(issuerA.address);
      expect(await tir.isTrusted(issuerA.address)).to.be.false;
    });

    it("emits IssuerRemoved event", async () => {
      await expect(tir.connect(admin).removeIssuer(issuerA.address))
        .to.emit(tir, "IssuerRemoved")
        .withArgs(issuerA.address);
    });

    it("reverts if called by non-admin", async () => {
      await expect(tir.connect(stranger).removeIssuer(issuerA.address))
        .to.be.revertedWithCustomError(tir, "OwnableUnauthorizedAccount");
    });

    it("reverts if issuer is not currently trusted", async () => {
      await expect(tir.connect(admin).removeIssuer(issuerB.address))
        .to.be.revertedWith("TIR: not trusted");
    });
  });

  // ── isTrusted ──────────────────────────────────────────────────────────────

  describe("isTrusted()", () => {
    it("returns false for an address never added", async () => {
      expect(await tir.isTrusted(stranger.address)).to.be.false;
    });

    it("returns true after adding, false after removing", async () => {
      await tir.connect(admin).addIssuer(issuerA.address);
      expect(await tir.isTrusted(issuerA.address)).to.be.true;
      await tir.connect(admin).removeIssuer(issuerA.address);
      expect(await tir.isTrusted(issuerA.address)).to.be.false;
    });
  });
});
