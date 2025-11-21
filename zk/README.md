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
