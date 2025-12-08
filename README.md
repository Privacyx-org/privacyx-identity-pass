# PXP-102 — Privacyx Identity Pass

**PXP-102** (Privacyx Identity Pass) is an identity-based access standard powered by zero-knowledge proofs.

It allows a user to prove they possess a valid identity attestation issued by a trusted provider  
(KYC service, proof-of-personhood system, Web2 verifier, etc.) **without revealing who they are, which wallet they use, or any raw data**.

This repository contains:

- the **reference PXP-102 smart contracts** (interface + minimal implementation),
- a **Hardhat stack** for tests and deployment scripts,
- **local demo tooling** aligned with the SDK and the Status API.

---

## 🔴 Live deployment & Playground

- **Network:** Ethereum mainnet (chainId `1`)
- **IdentityPass (PXP-102) mainnet:**  
  `0x2b8899B3ACDe63Fd5ABefa0D75d5982622665498`

- **Status API (Privacyx reference deployment)**  
  Base URL: `https://identitypass-api.privacyx.tech`

Main endpoints (examples):

    # Healthcheck
    curl https://identitypass-api.privacyx.tech/health

    # Demo issuer + nullifier (requires x-api-key in production)
    curl -H "x-api-key: YOUR_API_KEY" \
      https://identitypass-api.privacyx.tech/pxp-102/status/default

Generic endpoint:

    curl -H "x-api-key: YOUR_API_KEY" \
      "https://identitypass-api.privacyx.tech/pxp-102/status?issuer=0xISSUER_BYTES32&nullifier=0xNULLIFIER_BYTES32"

Playground dApp (Status + developer integrations):  
👉 https://identitypass.privacyx.tech  
Frontend repo: `Privacyx-org/privacyx-pxp102-dapp`

This repository (`privacyx-identity-pass`) remains the canonical source for PXP-102 contracts and deployment scripts.

---

## 🧱 PXP-102 Standard

PXP-102 is part of the Privacyx Standards Framework (PXP):

- **PXP-101 — Balance Pass** (implemented & live)
- **PXP-102 — Identity Pass** (this repo)
- **PXP-103 — Reputation Pass** (planned)

Draft specification:  
👉 https://github.com/Privacyx-org/privacyx-balance-pass/blob/main/PXP-102.md

---

## 📂 Contracts

### `contracts/IPxp102IdentityPass.sol`

Canonical PXP-102 interface:

    event IdentityPassUsed(
        address caller,
        bytes32 nullifier,
        bytes32 issuer,
        uint256 root
    );

    function getCurrentRoot(bytes32 issuer) external view returns (uint256);
    function isNullifierUsed(bytes32 nullifierHash) external view returns (bool);
    function proveIdentity(...) external;

This interface is implementation-agnostic and defines the minimal surface for a PXP-102 deployment.

---

### `contracts/IdentityPass.sol`

Minimalistic reference implementation:

**Admin / Governance**

- `owner` (injected in the constructor)
- `transferOwnership(address newOwner)`

**Verifier (Groth16 / zkSNARK)**

- `IIdentityVerifier` interface
- `verifier` address injected in the constructor
- `setVerifier(address _verifier)`

**Issuer & Merkle root management**

- `mapping(bytes32 => uint256) _issuerRoots`
- `setIssuerRoot(bytes32 issuer, uint256 newRoot)`
- `getCurrentRoot(bytes32 issuer)`

**Nullifiers (anti-replay)**

- `mapping(bytes32 => bool) _nullifierUsed`
- `isNullifierUsed(bytes32 nullifierHash)`

**Zero-knowledge proof consumption**

- `proveIdentity(...)` expects `pubSignals = [root, issuerHash, nullifierHash]`
- checks that `root` is consistent with the given issuer
- calls `verifier.verifyProof(...)`
- marks `nullifierHash` as used
- emits `IdentityPassUsed(...)`

This implementation focuses on:

- the canonical shape of PXP-102,
- anti-replay semantics via the nullifier,
- the issuer ↔ root binding,
- the Groth16 verifier hook.

Real-world governance (DAO, multisig, oracles, etc.) is intentionally left to concrete deployments.

---

## 🔗 SDK & Status API

### Privacyx SDK

The Privacyx SDK exposes an `IdentityPass` module aligned with this implementation:

- npm: `privacyx-sdk`
- repo: `https://github.com/Privacyx-org/privacyx-sdk`

Example:

    import { JsonRpcProvider } from "ethers";
    import { IdentityPass } from "privacyx-sdk";

    const provider = new JsonRpcProvider(process.env.RPC_URL);

    const idPass = new IdentityPass({
      chainId: 1,
      provider,
      address: "0x2b8899B3ACDe63Fd5ABefa0D75d5982622665498",
    });

    // Read-only usage
    const root = await idPass.getCurrentRoot(issuerHex);
    const used = await idPass.isNullifierUsed(nullifierHex);

At this stage, `getCurrentRoot` and `isNullifierUsed` are production-ready.  
Proof submission via `submitProof` is still experimental and will be stabilized in a 0.2.x SDK release.

---

### PXP-102 Status API

The Status API is a small Express server packaged in `privacyx-sdk`:

- file: `examples/identity-pass-mainnet-status-api.example.mjs`
- docs: `PXP102_STATUS_API.md` in the `privacyx-sdk` repo

It exposes:

- `GET /health`
- `GET /pxp-102/status/default`
- `GET /pxp-102/status?issuer=0x...&nullifier=0x...`

Example (production):

    curl -H "x-api-key: YOUR_API_KEY" \
      "https://identitypass-api.privacyx.tech/pxp-102/status?issuer=0xISSUER&nullifier=0xNULLIFIER"

It integrates cleanly with Web2 backends / API gateways using the `x-api-key` header.

---

## 🧪 Tooling / Hardhat

This repo ships a full Hardhat setup for PXP-102:

- contract compilation
- local deployment
- testnet / mainnet deployment scripts

Deployment scripts (examples):

- `scripts/deploy-local.js`
- `scripts/deploy-sepolia-with-verifier.js`
- `scripts/deploy-mainnet-with-verifier.js`

Typical workflow:

    # Start a local node
    npx hardhat node

    # In another terminal: local deployment
    npx hardhat run scripts/deploy-local.js --network localhost

The scripts:

- deploy a mock verifier + IdentityPass,
- initialize an issuer + root,
- print useful addresses (contract, encoded issuer, etc.).

---

## 🧮 ZK Circuit (public skeleton)

This repo includes a pedagogical Circom skeleton circuit for PXP-102:

- file: `zk/circuits/identity_pass.circom`
- template: `IdentityPassSkeleton(32)` (Merkle depth 32, aligned with PXP-101)

Main inputs:

- `isk` — Identity Secret Key (private)
- `issuerHash` — issuer identifier (bytes32 → Fr)
- `salt` — entropy for the leaf
- `context` — uniqueness scope (app / epoch / one-shot)
- `leaf` — canonical commitment
- `pathElements[32]`, `pathIndices[32]` — Merkle proof

Public signals (outputs):

- `root` — Merkle root (pubSignals[0])
- `issuerHash_out` — issuer (pubSignals[1])
- `nullifierHash` — derived from `(isk, issuerHash, context)` (pubSignals[2])

Important:

- the circuit published here is a **reference skeleton**, not hardened,
- the mainnet circuit used by Privacyx is a separate, hardened private circuit,
- **never** use this skeleton as-is in production.

---

## 🔧 Circom pipeline

Basic compilation:

    npm run circom:compile

`package.json` script:

    "scripts": {
      "circom:compile": "circom zk/circuits/identity_pass.circom --r1cs --wasm --sym -o zk/build"
    }

Generates:

- `zk/build/identity_pass.r1cs`
- `zk/build/identity_pass_js/identity_pass.wasm`
- `zk/build/identity_pass.sym`

Git ignores build artifacts via:

    # Circom build artifacts
    zk/build/

---

## 📄 IO JSON & examples

This repo contains snarkjs-compatible IO examples aligned with the IdentityPass contract:

- `zk/identity_proof.example.json` — Groth16 proof object (`pi_a`, `pi_b`, `pi_c`)
- `zk/identity_public.example.json` — public signals `[root, issuerHash, nullifierHash]`

They are used by:

- backends / dApps integrating PXP-102,
- `privacyx-sdk` examples,
- Hardhat demo scripts.

---

## 🧪 Local Hardhat + SDK demo

End-to-end local demo flow:

1. Start a local node

       cd ~/privacyx-identity-pass
       npx hardhat node

2. Deploy IdentityPass locally

       npx hardhat run scripts/deploy-local.js --network localhost

3. Run the SDK script in `privacyx-sdk`:

       export RPC_URL="http://127.0.0.1:8545"
       export PRIVATE_KEY="0x..."
       export IDENTITY_PASS_ADDRESS="0x<local IdentityPass address>"

       cd ~/privacyx-sdk
       node examples/identity-pass-local-hardhat.example.mjs

The script demonstrates:

- reading the root via `getCurrentRoot(issuerHex)`,
- checking the nullifier via `isNullifierUsed(nullifierHex)`,
- submitting a demo proof,
- observing the nullifier flip from `false` → `true`.

---

## 📜 License

MIT

