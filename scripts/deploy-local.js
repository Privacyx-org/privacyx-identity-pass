// scripts/deploy-local.js
// Déploiement local de MockIdentityVerifier + IdentityPass pour PXP-102

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with:", await deployer.getAddress());

  // 1) Deploy MockIdentityVerifier
  const MockFactory = await ethers.getContractFactory("MockIdentityVerifier");
  const verifier = await MockFactory.deploy();
  await verifier.waitForDeployment(); // ethers v6
  const verifierAddress = await verifier.getAddress();

  console.log("MockIdentityVerifier deployed at:", verifierAddress);

  // 2) Deploy IdentityPass (owner = deployer, verifier = mock)
  const IdentityFactory = await ethers.getContractFactory("IdentityPass");
  const identityPass = await IdentityFactory.deploy(
    await deployer.getAddress(),
    verifierAddress
  );
  await identityPass.waitForDeployment(); // ethers v6
  const identityAddress = await identityPass.getAddress();

  console.log("IdentityPass deployed at:", identityAddress);

  // 3) Initialiser un issuer / root compatibles avec identity_public.example.json
  //
  //   identity_public.example.json :
  //     [ "12345678901234567890", "98765432109876543210", "1928374655647382910" ]
  //
  //   pubSignals[0] = root         (uint256)
  //   pubSignals[1] = issuerHash   (uint256, interprété comme Fr dans le circuit)
  //   pubSignals[2] = nullifierHash
  //
  const root = BigInt("12345678901234567890");
  const issuerField = BigInt("98765432109876543210");

  // On encode issuerField (uint256) en bytes32 de la même façon que le contrat
  // le fera quand il fera `bytes32(_pubSignals[1])` dans proveIdentity.
  const issuerBytes32 = ethers.toBeHex(issuerField, 32);

  const tx = await identityPass.setIssuerRoot(issuerBytes32, root);
  await tx.wait();

  console.log("Issuer/root initialized:");
  console.log("  issuerField (decimal):", issuerField.toString());
  console.log("  issuerBytes32 (hex):  ", issuerBytes32);
  console.log("  root:", root.toString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

