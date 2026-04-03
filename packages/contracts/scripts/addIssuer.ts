import { ethers, network } from "hardhat";

// ── Config ──────────────────────────────────────────────────────────────────
const TIR_ADDRESS   = "0x1Ce243CE7bAb25fC7c15012540dC0486D49374Ec";
const ISSUER_TO_ADD = "0x05774A46ce8E3Ee6d411B831fe12Ca68fb516C9f";

const TIR_ABI = [
  "function addIssuer(address issuer) external",
  "function isTrusted(address issuer) view returns (bool)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Network: ", network.name);
  console.log("Caller:  ", deployer.address);

  const tir = new ethers.Contract(TIR_ADDRESS, TIR_ABI, deployer);

  const alreadyTrusted: boolean = await tir.isTrusted(ISSUER_TO_ADD);
  if (alreadyTrusted) {
    console.log(`${ISSUER_TO_ADD} is already a trusted issuer. Nothing to do.`);
    return;
  }

  console.log(`Adding ${ISSUER_TO_ADD} as trusted issuer...`);
  const tx = await tir.addIssuer(ISSUER_TO_ADD);
  console.log("  tx:", tx.hash);
  await tx.wait();
  console.log("  Done ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
