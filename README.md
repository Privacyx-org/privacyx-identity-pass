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

## 🧮 ZK Circuit (Circom skeleton)

PXP-102 includes a reference Circom circuit, provided as a skeleton, in order to
fix from now:

- the structure of the inputs,
- the position of the public signals,
- the alignment with the `IdentityPass` contract (`_pubSignals[0..2]`).

File :

- `zk/circuits/identity_pass.circom`

Main template:

- `IdentityPassSkeleton(32)` — Merkle depth fixed to 32 levels (same as PXP-101)
- `main` component = `IdentityPassSkeleton(32)`

Main inputs:

- `isk` — Identity Secret Key (private)
- `issuerHash` — issuer identifier (bytes32 → Fr)
- `salt` — entropy for the leaf
- `context` — uniqueness scope (app / epoch / one-shot)
- `leaf` — canonical commitment (future: Poseidon(isk, issuerHash, salt))
- `pathElements[32]`, `pathIndices[32]` — Merkle proof (future)

Public signals (outputs):

- `root` — Merkle root of the identity tree (pubSignals[0])
- `issuerHash_out` — issuer exposed in clear (pubSignals[1])
- `nullifierHash` — nullifier derived from (isk, issuerHash, context) (pubSignals[2])

⚠️ **Currently (skeleton only):**

- `root` is simply copied from `leaf` (no real Merkle proof),
- `issuerHash_out` is copied from `issuerHash`,
- `nullifierHash` is a linear combination `isk + issuerHash + context` (not secure),
- `pathElements` / `pathIndices` are consumed into an `unused[]` array to avoid warnings.

This circuit must **not** be used in production – it is only meant to stabilize
the API, IO, and the layout of the public signals.

---

## 🔧 Circom build pipeline

An npm command allows you to compile the Circom circuit into standard Groth16
artifacts (`.r1cs`, `.wasm`, `.sym`):

```bash
npm run circom:compile
```

Configuration (in package.json):

```jsonc
"scripts": {
  "test": "npx hardhat test",
  "circom:compile": "circom zk/circuits/identity_pass.circom --r1cs --wasm --sym -o zk/build"
}
```

Generated outputs:

zk/build/identity_pass.r1cs

zk/build/identity_pass_js/identity_pass.wasm

zk/build/identity_pass.sym

Ces fichiers sont ignorés par Git via .gitignore :

```gitignore
# Circom build artifacts
zk/build/
```

---

## 📄 ZK IO Format & JSON Examples 

This repository also includes IO format examples (JSON) for PXP-102, aligned
with snarkjs and the `IdentityPass` contract:

zk/identity_proof.example.json — Groth16 proof object (`pi_a`, `pi_b`, `pi_c`)

zk/identity_public.example.json — public signals [root, issuerHash, nullifierHash]

These files are reference material for:

dApp / backend integrations,

future snarkjs verification implementation,

and alignment with the PrivacyX SDK (`IdentityPass.submitProof(...)`).

---

## 🧪 Local Hardhat demo with Privacyx SDK

This repo ships a small local demo flow wired to the `privacyx-sdk` PXP-102 module.

### 1) Start a local Hardhat node

cd ~/privacyx-identity-pass  
npx hardhat node  

Keep this terminal open.

### 2) Deploy MockIdentityVerifier + IdentityPass and init issuer/root

In another terminal:

cd ~/privacyx-identity-pass  
npx hardhat run scripts/deploy-local.js --network localhost  

This will:

- deploy MockIdentityVerifier  
- deploy IdentityPass with:  
  - owner = the first Hardhat account  
  - verifier = the mock verifier  
- call `setIssuerRoot(...)` with values matching `zk/identity_public.example.json`:  
  - root = 12345678901234567890  
  - issuerField = 98765432109876543210  
  - issuerBytes32 = bytes32(issuerField)

The script prints the deployed IdentityPass address (e.g. `0x...`) and the encoded issuer.

### 3) Run the SDK example

In the `privacyx-sdk` repo, you can run the local PXP-102 example:

cd ~/privacyx-sdk  

export RPC_URL="http://127.0.0.1:8545"  
export PRIVATE_KEY="0x<Hardhat account private key>"  
export IDENTITY_PASS_ADDRESS="0x<IdentityPass address from step 2>"  

node examples/identity-pass-local-hardhat.example.mjs

This script will:

- parse the dummy Groth16 proof and public signals  
- read the current root via `getCurrentRoot(issuerHex)`  
- check nullifier usage via `isNullifierUsed(nullifierHex)`  
- submit the proof via `submitProof(...)`  
- confirm that the nullifier flips from `false` to `true`  

This demonstrates the full PXP-102 pipeline in local dev:

Circom IO → IdentityPass contract → Privacyx SDK → Hardhat node.
  
---

## 📜 License

MIT
