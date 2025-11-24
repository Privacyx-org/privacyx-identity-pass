const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

describe("PXP-102 — IdentityPass négatif (Groth16 local)", function () {
  let proofJson, pubSignalsStr, pubSignals;
  let rootField, issuerField, nullifierField;
  let issuerBytes32, nullifierBytes32;
  let verifier, identityPass, deployer;

  beforeEach(async () => {
    [deployer] = await ethers.getSigners();

    const proofPath = path.join(__dirname, "..", "zk", "identity_proof.example.json");
    const pubSignalsPath = path.join(__dirname, "..", "zk", "identity_public.example.json");

    proofJson = JSON.parse(fs.readFileSync(proofPath, "utf8"));
    pubSignalsStr = JSON.parse(fs.readFileSync(pubSignalsPath, "utf8"));

    pubSignals = pubSignalsStr.map((v) => BigInt(v));
    rootField = pubSignals[0];
    issuerField = pubSignals[1];
    nullifierField = pubSignals[2];

    issuerBytes32 = ethers.toBeHex(issuerField, 32);
    nullifierBytes32 = ethers.toBeHex(nullifierField, 32);

    // Déployer verifier
    const VerifierFactory = await ethers.getContractFactory("IdentityPassVerifier");
    verifier = await VerifierFactory.deploy();
    await verifier.waitForDeployment();

    // Déployer IdentityPass
    const IdentityFactory = await ethers.getContractFactory("IdentityPass");
    identityPass = await IdentityFactory.deploy(
      await deployer.getAddress(),
      await verifier.getAddress()
    );
    await identityPass.waitForDeployment();

    // Initialiser issuer/root correct
    await identityPass.setIssuerRoot(issuerBytes32, rootField);
  });

  function formatProof(p) {
    return {
      pA: [BigInt(p.pi_a[0]), BigInt(p.pi_a[1])],
      pB: [
        [BigInt(p.pi_b[0][1]), BigInt(p.pi_b[0][0])],
        [BigInt(p.pi_b[1][1]), BigInt(p.pi_b[1][0])]
      ],
      pC: [BigInt(p.pi_c[0]), BigInt(p.pi_c[1])]
    };
  }

  it("refuse un proof rejoué (nullifier déjà utilisé)", async function () {
    const { pA, pB, pC } = formatProof(proofJson);

    // Première preuve = OK
    await identityPass.proveIdentity(pA, pB, pC, pubSignals);

    // Deuxième preuve → doit revert pour nullifier déjà utilisé
    await expect(
      identityPass.proveIdentity(pA, pB, pC, pubSignals)
    ).to.be.revertedWith("IdentityPass: nullifier already used");
  });

  it("refuse un proof avec un mauvais root", async function () {
    const { pA, pB, pC } = formatProof(proofJson);

    const wrongPubSignals = [...pubSignals];
    wrongPubSignals[0] = BigInt(999999); // wrong root

    await expect(
      identityPass.proveIdentity(pA, pB, pC, wrongPubSignals)
    ).to.be.revertedWith("IdentityPass: unknown issuer/root");
  });

  it("refuse un proof totalement invalide (modifié)", async function () {
    const { pA, pB, pC } = formatProof(proofJson);

    const badA = [...pA];
    badA[0] = BigInt(42);

    await expect(
      identityPass.proveIdentity(badA, pB, pC, pubSignals)
    ).to.be.revertedWith("IdentityPass: invalid proof");
  });

  it("refuse un proof correct mais issu d’un issuer non-enregistré", async function () {
    const { pA, pB, pC } = formatProof(proofJson);

    const fakeIssuerPubSignals = [...pubSignals];
    fakeIssuerPubSignals[1] = BigInt(123123); // changer issuer hash

    await expect(
      identityPass.proveIdentity(pA, pB, pC, fakeIssuerPubSignals)
    ).to.be.revertedWith("IdentityPass: unknown issuer/root");
  });
});

