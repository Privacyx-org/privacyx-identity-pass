# PXP-102: IdentityPass ZK IO (canonical JSON format)

This folder defines the **canonical JSON IO format** for PXP-102 Groth16 proofs.

Even though the circuit is not implemented yet, integrators, SDKs and dApps can
already rely on these schemas:

- `identity_proof.example.json` — Groth16 proof object
- `identity_public.example.json` — public signals `[root, issuerHash, nullifierHash]`

The goal is to mirror the PXP-101 (`balance_proof.json`, `balance_public.json`) UX,
while adapting the public inputs to identity semantics.

---

## 1. identity_proof.json — Groth16 proof

Canonical shape (same as PXP-101):

```jsonc
{
  "pi_a": ["...", "...", "1"],
  "pi_b": [
    ["...", "..."],
    ["...", "..."],
    ["1", "0"]
  ],
  "pi_c": ["...", "...", "1"],
  "protocol": "groth16",
  "curve": "bn128"
}
pi_a, pi_b, pi_c are the standard Groth16 proof elements.

All coordinates are encoded as decimal strings (snarkjs-style).

protocol and curve are metadata fields, kept identical to PXP-101 for compatibility.

In this repository, we provide a dummy example:

zk/identity_proof.example.json

It is not a valid proof, but illustrates the expected structure.

2. identity_public.json — PXP-102 public signals
Canonical shape:

js
Copier le code
[
  "root",
  "issuerHash",
  "nullifierHash"
]
All values are encoded as decimal strings, consistent with typical Groth16 tooling:

index 0 — root

Merkle root (or equivalent commitment) for the Issuer’s identity set.

index 1 — issuerHash

A bytes32 Issuer identifier, interpreted as a field element (Fr) and serialized as decimal.

index 2 — nullifierHash

A bytes32 nullifier derived inside the circuit from:

the identity secret key isk,

issuerHash,

and a context value (app / epoch / ephemeral, cf. PXP-102 spec §3.7).

In this repository, we provide a dummy example:

zk/identity_public.example.json

This file is meant only to document the layout. All values are placeholder decimals.

3. Alignment with PXP-102 spec
This IO format is consistent with the PXP-102 specification:

Public inputs layout (§3.7.3):

_pubSignals[0] = root

_pubSignals[1] = issuerHash

_pubSignals[2] = nullifierHash

On-chain contract (IPxp102IdentityPass):

proveIdentity(uint256[2] _pA, uint256[2][2] _pB, uint256[2] _pC, uint256[3] _pubSignals)

A typical dApp flow is:

User obtains/derives their identity secret key and context.

Off-chain circuit generates:

identity_proof.json (Groth16 proof),

identity_public.json with three public signals.

Frontend or backend loads these JSON files and calls proveIdentity(...) on
the IdentityPass contract using:

_pA = proof.pi_a[0..1]

_pB = proof.pi_b[...] (with G2 coordinate reordering if needed, as in PXP-101)

_pC = proof.pi_c[0..1]

_pubSignals = [root, issuerHash, nullifierHash] (converted to uint256)

This mirrors the PXP-101 UX but for identity / personhood instead of balance thresholds.

---

## 4. Example dApp / backend flow with privacyx-sdk

Once a concrete IdentityPass contract and circuit are live, a typical integration
using the **Privacyx SDK** will look like this (frontend or backend):

```ts
import { BrowserProvider } from "ethers";
import { IdentityPass } from "privacyx-sdk";

// 1) Connect wallet / signer
const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// 2) Instantiate IdentityPass SDK module
const idPass = new IdentityPass({
  chainId: 1, // or your target chain
  provider,
  address: "0xIdentityPassContractAddress",
});

// 3) Load ZK proof & public signals generated off-chain
//    (shape compatible with `zk/identity_proof.example.json` and
//     `zk/identity_public.example.json` from this repo)
import proof from "./identity_proof.json";
import pubSignalsJson from "./identity_public.json";

// Convert public signals from strings → bigint (as expected on-chain)
const pubSignals = pubSignalsJson.map((v) => BigInt(v));

// 4) Submit proof on-chain via the SDK
//    NOTE: For now, IdentityPass.submitProof() in privacyx-sdk is a WIP
//    and will throw a "not implemented" error until PXP-102 is wired.
const receipt = await idPass.submitProof(signer, proof, pubSignals);

console.log("IdentityPass tx:", receipt);
In a Node.js backend (no window.ethereum), you would typically use
JsonRpcProvider + Wallet instead of BrowserProvider, but the proof
and pubSignals handling remain the same:

ts
Copier le code
import { JsonRpcProvider, Wallet } from "ethers";
import { IdentityPass } from "privacyx-sdk";
import proof from "./identity_proof.json";
import pubSignalsJson from "./identity_public.json";

const provider = new JsonRpcProvider(process.env.RPC_URL);
const signer = new Wallet(process.env.PRIVATE_KEY, provider);

const idPass = new IdentityPass({
  chainId: 1,
  provider,
  address: process.env.IDENTITY_PASS_ADDRESS!,
});

const pubSignals = pubSignalsJson.map((v) => BigInt(v));

const receipt = await idPass.submitProof(signer, proof, pubSignals);
console.log("IdentityPass tx:", receipt);
Until the PXP-102 contract and circuit are fully wired, these snippets serve as
API and IO references: the JSON shape and the SDK signatures are stable,
even if the current implementation throws a "not implemented yet (PXP-102 WIP)"
error internally.
