# PXP-102: Privacyx Identity Pass

**PXP-102 — Privacyx Identity Pass** is a standard for **zero-knowledge identity-based access**.

It allows users to prove they possess a **valid identity attestation** issued by a trusted provider  
(KYC, proof-of-personhood, Web2 verifier, etc.) **without revealing who they are, which wallet they use,  
or any raw personal data.**

This repository contains the **reference smart contracts skeleton** for PXP-102:

- `IPxp102IdentityPass.sol` — canonical interface
- `IdentityPass.sol` — minimal reference implementation (owner-managed issuers + roots, zk verifier hook)

---

## 🧱 Standard

PXP-102 is part of the **PrivacyX Standards Framework (PXP)**:

- PXP-101 — Balance Pass (implemented & live)
- **PXP-102 — Identity Pass (this repo)**
- PXP-103 — Reputation Pass (planned)

Draft specification (PXP-102):  
👉 https://github.com/Privacyx-org/privacyx-balance-pass/blob/main/PXP-102.md

---

## 📂 Contracts

### `contracts/IPxp102IdentityPass.sol`

Defines the canonical interface:

- `event IdentityPassUsed(address caller, bytes32 nullifier, bytes32 issuer, uint256 root);`
- `function getCurrentRoot(bytes32 issuer) external view returns (uint256);`
- `function isNullifierUsed(bytes32 nullifierHash) external view returns (bool);`
- `function proveIdentity(...) external;`

This matches the PXP-102 standard and is meant to be **implementation-agnostic**.

---

### `contracts/IdentityPass.sol`

Minimal reference implementation skeleton:

- Owner-based admin:
  - `owner` (constructor-injected)
  - `transferOwnership(address newOwner)`
- Verifier wiring:
  - `IIdentityVerifier` interface
  - `verifier` address (constructor-injected)
  - `setVerifier(address _verifier)`
- Issuer & root management:
  - `mapping(bytes32 => uint256) _issuerRoots`
  - `setIssuerRoot(bytes32 issuer, uint256 newRoot)`
  - `getCurrentRoot(bytes32 issuer)`
- Nullifier tracking:
  - `mapping(bytes32 => bool) _nullifierUsed`
  - `isNullifierUsed(bytes32 nullifierHash)`
- ZK proof consumption:
  - `proveIdentity(...)`:
    - expects `pubSignals = [root, issuerHash, nullifierHash]`
    - checks issuer/root validity
    - calls `verifier.verifyProof(...)`
    - marks `nullifierHash` as used
    - emits `IdentityPassUsed(...)`

This contract is intentionally **minimal** and focuses on:

- correct PXP-102 interface,
- nullifier anti-replay semantics,
- issuer/root binding,
- verifier hook for Groth16 proofs.

Governance (DAO, multi-sig, external oracle, etc.) is left to concrete deployments.

---

## 🔗 SDK Integration

The **Privacyx SDK** already exposes a PXP-102 IdentityPass module (API surface only):

npm: `privacyx-sdk`  
Repo: https://github.com/Privacyx-org/privacyx-sdk

```js
import { IdentityPass } from "privacyx-sdk";

const idPass = new IdentityPass({
  chainId: 1,
  provider,
  address: "0xIdentityPassContractAddress",
});

// API preview (WIP):

await idPass.getCurrentRoot(issuerHex);              // → bigint
await idPass.isNullifierUsed(nullifierHashHex);      // → boolean
await idPass.submitProof(signer, proof, [root, issuerHash, nullifierHash]);
// → TransactionReceipt

idPass.onIdentityPassUsed((event) => {
  console.log(event);
});

Once a concrete PXP-102 deployment is live, this repo and the SDK will be wired to it.

---

## 🧪 Tooling / build (future)

This repository currently ships **contracts only**.

Recommended next steps (not yet included):

- Add a Hardhat or Foundry setup:
  - compile `IdentityPass.sol`
  - run unit tests (issuer/root management, nullifier behavior, etc.)
- Add deployment scripts & example configs (mainnet / testnets).
- Wire a real Groth16 verifier contract and circuit.

---

## 📜 License

MIT
