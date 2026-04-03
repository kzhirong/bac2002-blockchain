import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Network:  ", network.name);
  console.log("Deployer: ", deployer.address);
  console.log("Balance:  ", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "POL\n");

  // ── 1. TrustedIssuerRegistry ───────────────────────────────────────────────
  console.log("Deploying TrustedIssuerRegistry...");
  const TIR = await ethers.getContractFactory("TrustedIssuerRegistry");
  const tir = await TIR.deploy(deployer.address); // deployer is the initial admin
  await tir.waitForDeployment();
  const tirAddress = await tir.getAddress();
  console.log("  TrustedIssuerRegistry deployed to:", tirAddress);

  // ── 2. DIDRegistry ─────────────────────────────────────────────────────────
  console.log("Deploying DIDRegistry...");
  const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
  const didRegistry = await DIDRegistry.deploy();
  await didRegistry.waitForDeployment();
  const didRegistryAddress = await didRegistry.getAddress();
  console.log("  DIDRegistry deployed to:", didRegistryAddress);

  // ── 3. RevocationRegistry (needs TIR address) ──────────────────────────────
  console.log("Deploying RevocationRegistry...");
  const RR = await ethers.getContractFactory("RevocationRegistry");
  const rr = await RR.deploy(tirAddress);
  await rr.waitForDeployment();
  const rrAddress = await rr.getAddress();
  console.log("  RevocationRegistry deployed to:", rrAddress);

  // ── 4. Register the deployer wallet as the first trusted issuer ────────────
  console.log("\nRegistering deployer as trusted issuer in TIR...");
  const tx = await tir.addIssuer(deployer.address);
  await tx.wait();
  console.log("  Done. Deployer is now a trusted issuer.");

  // ── 5. Write contractAddresses.json to shared package ─────────────────────
  const addresses = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    TrustedIssuerRegistry: tirAddress,
    DIDRegistry: didRegistryAddress,
    RevocationRegistry: rrAddress,
  };

  const sharedDir = path.resolve(__dirname, "../../../packages/shared");
  fs.mkdirSync(sharedDir, { recursive: true });
  const outputPath = path.join(sharedDir, "contractAddresses.json");
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));

  console.log("\nContract addresses written to:", outputPath);
  console.log(JSON.stringify(addresses, null, 2));

  // ── 6. Polygonscan verification hint ──────────────────────────────────────
  if (network.name === "amoy") {
    console.log("\nTo verify on Polygonscan, run:");
    console.log(`  pnpm verify:amoy ${tirAddress} "${deployer.address}"`);
    console.log(`  pnpm verify:amoy ${didRegistryAddress}`);
    console.log(`  pnpm verify:amoy ${rrAddress} "${tirAddress}"`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
