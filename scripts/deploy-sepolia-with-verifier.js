// scripts/deploy-sepolia-with-verifier.js
// Déploiement Sepolia de IdentityPassVerifier + IdentityPass (PXP-102, vrai verifier Groth16)

const { ethers, network } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=== PXP-102 Sepolia deploy ===");
  console.log("Network:", network.name);
  console.log("Deployer:", await deployer.getAddress());
  
  const balance = await ethers.provider.getBalance(await deployer.getAddress());
  console.log("Deployer balance (wei):", balance.toString());

  // 1) Deploy IdentityPassVerifier (généré via snarkjs)
  const VerifierFactory = await ethers.getContractFactory("IdentityPassVerifier");
  const verifier = await VerifierFactory.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();

  console.log("IdentityPassVerifier deployed at:", verifierAddress);

  // 2) Deploy IdentityPass (owner = deployer, verifier = IdentityPassVerifier)
  const IdentityFactory = await ethers.getContractFactory("IdentityPass");
  const identityPass = await IdentityFactory.deploy(
    await deployer.getAddress(),
    verifierAddress
  );
  await identityPass.waitForDeployment();
  const identityAddress = await identityPass.getAddress();

  console.log("IdentityPass deployed at:", identityAddress);

  // 3) Initialiser un issuer / root compatibles avec zk/identity_public.example.json
  //
  //   identity_public.example.json :
  //     [ "5", "2", "7" ]
  //
  //   pubSignals[0] = root         (uint256)
  //   pubSignals[1] = issuerHash   (uint256 → cast bytes32 dans le contrat)
  //   pubSignals[2] = nullifierHash
  //
  const root = BigInt("5");        // pubSignals[0]
  const issuerField = BigInt("2"); // pubSignals[1]

  // Même encodage que dans le circuit / contrat: bytes32(_pubSignals[1])
  const issuerBytes32 = ethers.toBeHex(issuerField, 32);

  const tx = await identityPass.setIssuerRoot(issuerBytes32, root);
  await tx.wait();

  console.log("Issuer/root initialized:");
  console.log("  verifier:", verifierAddress);
  console.log("  identityPass:", identityAddress);
  console.log("  issuerField (decimal):", issuerField.toString());
  console.log("  issuerBytes32 (hex):  ", issuerBytes32);
  console.log("  root:", root.toString());

  console.log("\n✅ PXP-102 deployed & initialized on Sepolia.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

