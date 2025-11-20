// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PXP-102: Privacyx Identity Pass interface
/// @notice Standard interface for zero-knowledge identity-based access.
interface IPxp102IdentityPass {
    /**
     * @dev Emitted when a valid identity proof is successfully verified and consumed.
     *
     * @param caller     The EOA or contract that submitted the proof.
     * @param nullifier  A unique, one-time nullifier derived from the user’s secret identity key
     *                   and contextual information.
     * @param issuer     An identifier for the Issuer (hash or bytes32 id).
     * @param root       The Merkle root (or commitment) under which the identity is proven.
     */
    event IdentityPassUsed(
        address indexed caller,
        bytes32 indexed nullifier,
        bytes32 indexed issuer,
        uint256 root
    );

    /**
     * @notice Returns the currently accepted Merkle root (or similar commitment) for a given issuer.
     * @dev MUST revert if the issuer is unknown or no root is set.
     * @param issuer The identifier of the Issuer (bytes32).
     */
    function getCurrentRoot(bytes32 issuer) external view returns (uint256);

    /**
     * @notice Returns true if the given nullifier hash has already been used (consumed).
     * @param nullifierHash The nullifier hash (bytes32).
     */
    function isNullifierUsed(bytes32 nullifierHash) external view returns (bool);

    /**
     * @notice Verifies and consumes a zero-knowledge identity proof.
     * @dev `_pubSignals` are expected to be:
     *  - [0] root
     *  - [1] issuerHash
     *  - [2] nullifierHash
     *
     * Implementations MUST:
     * - revert if the proof is invalid,
     * - revert if `issuerHash` does not map to a known/authorized Issuer,
     * - revert if `root` is not a known/accepted root for that Issuer,
     * - revert if `nullifierHash` has already been used,
     * - emit `IdentityPassUsed(caller, nullifierHash, issuerHash, root)` on success.
     */
    function proveIdentity(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[3] calldata _pubSignals
    ) external;
}

