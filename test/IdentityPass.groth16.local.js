const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

describe("PXP-102 — IdentityPass + Groth16 verifier (local)", function () {
  it("accepte un proof Groth16 valide depuis zk/*.json", async function () {
    const [deployer] = await ethers.getSigners();

    // 1) Charger le proof et les public signals générés par snarkjs
    const proofPath = path.join(__dirname, "..", "zk", "identity_proof.example.json");
    const pubSignalsPath = path.join(__dirname, "..", "zk", "identity_public.example.json");

    const proofJson = JSON.parse(fs.readFileSync(proofPath, "utf8"));
    const pubSignalsStr = JSON.parse(fs.readFileSync(pubSignalsPath, "utf8"));

    // pubSignals = [root, issuerField, nullifierField]
    const pubSignals = pubSignalsStr.map((v) => BigInt(v));
    const rootField = pubSignals[0];
    const issuerField = pubSignals[1];
    const nullifierField = pubSignals[2];

    // Encodage issuer/nullifier comme dans le contrat: bytes32(_pubSignals[1/2])
    const issuerBytes32 = ethers.toBeHex(issuerField, 32);
    const nullifierBytes32 = ethers.toBeHex(nullifierField, 32);

    // 2) Déployer le verifier Groth16 généré par snarkjs
    const VerifierFactory = await ethers.getContractFactory("IdentityPassVerifier");
    const verifier = await VerifierFactory.deploy();
    await verifier.waitForDeployment();

    // 3) Déployer IdentityPass avec ce verifier
    const IdentityFactory = await ethers.getContractFactory("IdentityPass");
    const identityPass = await IdentityFactory.deploy(
      await deployer.getAddress(),
      await verifier.getAddress()
    );
    await identityPass.waitForDeployment();

    // 4) Enregistrer l'issuer + root cohérents avec identity_public.example.json
    const txInit = await identityPass.setIssuerRoot(issuerBytes32, rootField);
    await txInit.wait();

    // Vérifier que le root on-chain correspond bien
    const currentRoot = await identityPass.getCurrentRoot(issuerBytes32);
    expect(currentRoot).to.equal(rootField);

    // Nullifier doit être "unused" avant proveIdentity
    const usedBefore = await identityPass.isNullifierUsed(nullifierBytes32);
    expect(usedBefore).to.equal(false);

    // 5) Préparer les arrays au format attendu par le contrat
    // proofJson.pi_a = [ax, ay, 1]
    // proofJson.pi_b = [[bx1, bx2], [by1, by2], [1, 0]]
    // proofJson.pi_c = [cx, cy, 1]
    const pA = [
      BigInt(proofJson.pi_a[0]),
      BigInt(proofJson.pi_a[1]),
    ];
    const pB = [
      [
        BigInt(proofJson.pi_b[0][1]),
        BigInt(proofJson.pi_b[0][0]),
      ],
      [
        BigInt(proofJson.pi_b[1][1]),
        BigInt(proofJson.pi_b[1][0]),
      ],
    ];
    const pC = [
      BigInt(proofJson.pi_c[0]),
      BigInt(proofJson.pi_c[1]),
    ];

    // Sanity check: le verifier pur doit accepter le proof
    const ok = await verifier.verifyProof(pA, pB, pC, pubSignals);
    expect(ok).to.equal(true);

    // 6) Appeler proveIdentity(...) avec le proof + pubSignals
    const tx = await identityPass.proveIdentity(pA, pB, pC, pubSignals);
    const receipt = await tx.wait();

    // Sanity check: la tx doit réussir
    expect(receipt.status).to.equal(1n);

    // 7) Le nullifier doit maintenant être "used"
    const usedAfter = await identityPass.isNullifierUsed(nullifierBytes32);
    expect(usedAfter).to.equal(true);
  });
});

