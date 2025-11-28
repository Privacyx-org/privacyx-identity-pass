// scripts/deploy-mainnet-with-verifier.js
// Déploiement mainnet de IdentityPassVerifier + IdentityPass (PXP-102)

const { ethers, network } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=== PXP-102 Mainnet deploy ===");
  console.log("Network:", network.name);
  console.log("Deployer:", await deployer.getAddress());

  const balance = await ethers.provider.getBalance(await deployer.getAddress());
  console.log("Deployer balance (wei):", balance.toString());

  // 1) Verifier
  const VerifierFactory = await ethers.getContractFactory("IdentityPassVerifier");
  const verifier = await VerifierFactory.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();

  console.log("IdentityPassVerifier deployed at:", verifierAddress);

  // 2) IdentityPass
  const IdentityFactory = await ethers.getContractFactory("IdentityPass");
  const identityPass = await IdentityFactory.deploy(
    await deployer.getAddress(),
    verifierAddress
  );
  await identityPass.waitForDeployment();
  const identityAddress = await identityPass.getAddress();

  console.log("IdentityPass deployed at:", identityAddress);

  // 3) Initial Root / Issuer
  const root = BigInt("5");
  const issuerField = BigInt("2");
  const issuerBytes32 = ethers.toBeHex(issuerField, 32);

  const tx = await identityPass.setIssuerRoot(issuerBytes32, root);
  await tx.wait();

  console.log("Issuer/root initialized:");
  console.log("  issuerField (dec):", issuerField.toString());
  console.log("  issuerBytes32:", issuerBytes32);
  console.log("  root:", root.toString());

  console.log("\n✅ PXP-102 deployed & initialized on MAINNET.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

