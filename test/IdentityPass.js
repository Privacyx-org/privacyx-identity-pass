const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IdentityPass (PXP-102)", function () {
  let deployer;
  let identityPass;
  let verifier;

  // Helpers: cast scalar -> bytes32 (0x-prefixed, padded)
  const toBytes32 = (value) =>
    ethers.zeroPadValue(ethers.toBeHex(value), 32);

  beforeEach(async function () {
    [deployer] = await ethers.getSigners();

    // Deploy mock verifier that always returns true
    const MockFactory = await ethers.getContractFactory("MockIdentityVerifier");
    verifier = await MockFactory.deploy();
    await verifier.waitForDeployment();

    // Deploy IdentityPass with deployer as owner
    const IdentityFactory = await ethers.getContractFactory("IdentityPass");
    identityPass = await IdentityFactory.deploy(
      await deployer.getAddress(),
      await verifier.getAddress()
    );
    await identityPass.waitForDeployment();
  });

  it("allows owner to set and read issuer root", async function () {
    const issuerScalar = 1n;
    const issuerBytes32 = toBytes32(issuerScalar);
    const root = 123456789n;

    await expect(identityPass.setIssuerRoot(issuerBytes32, root))
      .to.emit(identityPass, "IssuerRootUpdated")
      .withArgs(issuerBytes32, root);

    const currentRoot = await identityPass.getCurrentRoot(issuerBytes32);
    expect(currentRoot).to.equal(root);
  });

  it("reverts getCurrentRoot for unknown issuer", async function () {
    const unknownIssuerBytes32 = toBytes32(9999n);

    await expect(
      identityPass.getCurrentRoot(unknownIssuerBytes32)
    ).to.be.revertedWith("IdentityPass: issuer root not set");
  });

  it("verifies identity proof, marks nullifier used and emits event", async function () {
    const issuerScalar = 1n;
    const issuerBytes32 = toBytes32(issuerScalar);

    const root = 42n;
    const nullifierScalar = 777n;
    const nullifierBytes32 = toBytes32(nullifierScalar);

    // Configure issuer root
    await identityPass.setIssuerRoot(issuerBytes32, root);

    // Dummy Groth16 proof data (values don't matter for the mock verifier)
    const pA = [1, 2];
    const pB = [
      [3, 4],
      [5, 6],
    ];
    const pC = [7, 8];

    // pubSignals layout: [0] root, [1] issuerHash, [2] nullifierHash
    // In the circuit, issuerHash and nullifierHash are uint256 scalars,
    // cast to bytes32 inside the contract.
    const pubSignals = [root, issuerScalar, nullifierScalar];

    // Before: nullifier should not be used
    expect(await identityPass.isNullifierUsed(nullifierBytes32)).to.equal(false);

    await expect(identityPass.proveIdentity(pA, pB, pC, pubSignals))
      .to.emit(identityPass, "IdentityPassUsed")
      .withArgs(
        await deployer.getAddress(),
        nullifierBytes32,
        issuerBytes32,
        root
      );

    // After: nullifier should be marked as used
    expect(await identityPass.isNullifierUsed(nullifierBytes32)).to.equal(true);

    // Second use of the same nullifier must revert
    await expect(
      identityPass.proveIdentity(pA, pB, pC, pubSignals)
    ).to.be.revertedWith("IdentityPass: nullifier already used");
  });
});

