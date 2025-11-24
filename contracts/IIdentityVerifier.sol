// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IIdentityVerifier
/// @notice Minimal Groth16 verifier interface for PXP-102 (IdentityPass)
interface IIdentityVerifier {
    /// @notice Verify a Groth16 proof for the IdentityPass circuit.
    /// @param _pA Groth16 proof A (G1)
    /// @param _pB Groth16 proof B (G2)
    /// @param _pC Groth16 proof C (G1)
    /// @param _pubSignals Public inputs [root, issuerHashField, nullifierHashField]
    /// @return true if the proof is valid, false otherwise
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[3] calldata _pubSignals
    ) external view returns (bool);
}

