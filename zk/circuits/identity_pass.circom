// zk/circuits/identity_pass.circom
// PXP-102 — IdentityPass canonical circuit (skeleton / WIP)
//
// ⚠️ IMPORTANT :
// Ce circuit est un squelette : il ne fait PAS encore de vraie vérification
// Merkle ni de vrai Poseidon. Il sert à fixer :
// - la structure des inputs
// - la position des public signals
// - l’API off-chain (IO JSON) alignée avec PXP-102.
//
// Public signals attendues côté on-chain / verifier :
//   _pubSignals[0] = root
//   _pubSignals[1] = issuerHash
//   _pubSignals[2] = nullifierHash
//
// On complétera plus tard avec :
// - Poseidon(isk, issuerHash, salt) pour le leaf
// - chemin Merkle complet jusqu’à root
// - Poseidon(isk, issuerHash, context) pour nullifierHash

pragma circom 2.1.6;

// -----------------------------------------------------------------------------
// IdentityPass circuit (squelette)
// -----------------------------------------------------------------------------

template IdentityPassSkeleton(nLevels) {
    // --------------------
    // Inputs "identité"
    // --------------------

    // Secret identity key (ISK) — strictement privée
    signal input isk;

    // Issuer hash (bytes32 interprété comme Fr) — public dans le modèle PXP-102
    // On le garde ici en input, il sera exposé comme public signal.
    signal input issuerHash;

    // Entropie / sel pour le leaf
    signal input salt;

    // Contexte (app / epoch / one-shot) — utilisé pour le nullifier
    signal input context;

    // --------------------
    // Merkle proof inputs
    // --------------------

    // Leaf engagé dans l’arbre d’identités (canonique : Poseidon(isk, issuerHash, salt))
    signal input leaf;

    // Chemin Merkle : valeurs des noeuds frères
    signal input pathElements[nLevels];

    // Chemin Merkle : index (0/1) pour chaque niveau
    signal input pathIndices[nLevels];

    // --------------------
    // Public signals
    // --------------------

    // Root de l’arbre d’identités (pubSignals[0])
    signal output root;

    // Issuer hash en public (pubSignals[1])
    signal output issuerHash_out;

    // Nullifier dérivé de (isk, issuerHash, context) (pubSignals[2])
    signal output nullifierHash;

    // -------------------------------------------------------------------------
    // ⚠️ IMPLEMENTATION PLACEHOLDER
    //
    // Pour l’instant, on ne fait PAS :
    // - de vrai Merkle path
    // - de vrai Poseidon
    //
    // On se contente de :
    // - propager leaf -> root (fake)
    // - propager issuerHash -> issuerHash_out
    // - dériver un nullifierHash factice à partir d’un simple mélange
    //
    // Ces lignes seront remplacées par :
    // - Poseidon(isk, issuerHash, salt) -> leafExpected
    // - vérification Merkle (leafExpected, pathElements, pathIndices) -> root
    // - Poseidon(isk, issuerHash, context) -> nullifierHash
    // -------------------------------------------------------------------------

    // Root fake = leaf (juste pour avoir quelque chose de cohérent)
    root <== leaf;

    // On expose issuerHash tel quel en sortie publique
    issuerHash_out <== issuerHash;

    // Nullifier fake : simple combinaison linéaire (NON sécure, placeholder)
    // nullifierHash = isk + issuerHash + context mod Fr
    nullifierHash <== isk + issuerHash + context;

    // On se fiche de pathElements / pathIndices pour le moment,
    // mais on les "utilise" pour éviter les warnings.
    signal unused[nLevels];
    for (var i = 0; i < nLevels; i++) {
        unused[i] <== pathElements[i] + pathIndices[i];
    }
}

// -----------------------------------------------------------------------------
// main component
// -----------------------------------------------------------------------------
//
// On fixe nLevels à 32 pour un arbre de profondeur 32 (canonique, comme PXP-101).
// On pourra l’ajuster plus tard.

component main = IdentityPassSkeleton(32);

