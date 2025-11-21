// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MockIdentityVerifier
/// @notice Minimal mock verifier for PXP-102 tests. Always returns true.
contract MockIdentityVerifier {
    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[3] calldata
    ) external pure returns (bool) {
        return true;
    }
}

