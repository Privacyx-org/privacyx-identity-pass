// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IPxp102IdentityPass.sol";

/// @dev Minimal verifier interface for a Groth16-style zk-SNARK verifier.
interface IIdentityVerifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[3] calldata _pubSignals
    ) external view returns (bool);
}

/// @title Privacyx Identity Pass (PXP-102)
/// @notice Reference implementation skeleton for the PXP-102 standard.
/// @dev This contract focuses on the core interface and state layout.
///      Proof verification wiring and issuer governance can be extended later.
contract IdentityPass is IPxp102IdentityPass {
    /// @notice Owner/admin address, allowed to manage issuers and roots.
    address public owner;

    /// @notice Verifier contract used to validate Groth16 identity proofs.
    IIdentityVerifier public verifier;

    /// @dev Mapping of issuerId => current root (commitment) for this issuer.
    mapping(bytes32 => uint256) private _issuerRoots;

    /// @dev Tracks used nullifiers to prevent replay.
    mapping(bytes32 => bool) private _nullifierUsed;

    /// @dev Emitted when a root is updated for a given issuer.
    event IssuerRootUpdated(bytes32 indexed issuer, uint256 newRoot);

    /// @dev Emitted when the verifier contract is updated.
    event VerifierUpdated(address indexed newVerifier);

    modifier onlyOwner() {
        require(msg.sender == owner, "IdentityPass: not owner");
        _;
    }

    constructor(address _owner, address _verifier) {
        require(_owner != address(0), "IdentityPass: owner is zero");
        require(_verifier != address(0), "IdentityPass: verifier is zero");

        owner = _owner;
        verifier = IIdentityVerifier(_verifier);

        emit VerifierUpdated(_verifier);
    }

    /// @notice Returns the currently accepted commitment root for a given issuer.
    /// @inheritdoc IPxp102IdentityPass
    function getCurrentRoot(bytes32 issuer) external view override returns (uint256) {
        uint256 root = _issuerRoots[issuer];
        require(root != 0, "IdentityPass: issuer root not set");
        return root;
    }

    /// @notice Returns true if the given nullifier hash has already been consumed.
    /// @inheritdoc IPxp102IdentityPass
    function isNullifierUsed(bytes32 nullifierHash) external view override returns (bool) {
        return _nullifierUsed[nullifierHash];
    }

    /// @notice Owner function to update the verifier contract.
    function setVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "IdentityPass: verifier is zero");
        verifier = IIdentityVerifier(_verifier);
        emit VerifierUpdated(_verifier);
    }

    /// @notice Owner function to set/update the current root for an issuer.
    /// @param issuer The issuer identifier (bytes32).
    /// @param newRoot The new Merkle root / commitment for this issuer.
    function setIssuerRoot(bytes32 issuer, uint256 newRoot) external onlyOwner {
        require(issuer != bytes32(0), "IdentityPass: issuer is zero");
        require(newRoot != 0, "IdentityPass: root cannot be zero");

        _issuerRoots[issuer] = newRoot;
        emit IssuerRootUpdated(issuer, newRoot);
    }

    /// @inheritdoc IPxp102IdentityPass
    function proveIdentity(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[3] calldata _pubSignals
    ) external override {
        // pubSignals layout: [0] root, [1] issuerHash, [2] nullifierHash
        uint256 root = _pubSignals[0];
        bytes32 issuerHash = bytes32(_pubSignals[1]);
        bytes32 nullifierHash = bytes32(_pubSignals[2]);

        require(root != 0, "IdentityPass: invalid root");
        require(issuerHash != bytes32(0), "IdentityPass: invalid issuer");
        require(!_nullifierUsed[nullifierHash], "IdentityPass: nullifier already used");

        // Check that the issuer and root are known and valid.
        require(_issuerRoots[issuerHash] == root, "IdentityPass: unknown issuer/root");

        // Verify zk-SNARK proof via the verifier contract.
        bool ok = verifier.verifyProof(_pA, _pB, _pC, _pubSignals);
        require(ok, "IdentityPass: invalid proof");

        // Mark nullifier as used to prevent replay.
        _nullifierUsed[nullifierHash] = true;

        emit IdentityPassUsed(msg.sender, nullifierHash, issuerHash, root);
    }

    /// @notice Transfers contract ownership to a new address.
    /// @param newOwner The new owner address.
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "IdentityPass: new owner is zero");
        owner = newOwner;
    }
}

