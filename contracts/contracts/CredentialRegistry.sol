// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CredentialRegistry
 * @notice On-chain registry for verifiable credentials.
 *         Only hashes are stored -- never raw PII.
 *         RBAC is enforced via OpenZeppelin AccessControl.
 */
contract CredentialRegistry is AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    struct Credential {
        address issuer;
        bytes32 subjectHash;    // keccak256 of subject address -- no raw PII
        bytes32 credentialHash; // keccak256 of off-chain credential data
        uint256 issuedAt;
        bool revoked;
    }

    mapping(bytes32 => Credential) private _credentials;

    event CredentialIssued(
        bytes32 indexed credentialId,
        address indexed issuer,
        bytes32 subjectHash,
        uint256 issuedAt
    );

    event CredentialRevoked(
        bytes32 indexed credentialId,
        address indexed revokedBy,
        uint256 revokedAt
    );

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
    }

    /**
     * @notice Issue a new credential. Only callable by addresses with ISSUER_ROLE.
     * @param credentialId  Unique bytes32 ID for this credential (generated off-chain)
     * @param credentialHash keccak256 hash of the full credential metadata
     * @param subjectHash    keccak256 hash of the subject's wallet address
     */
    function issueCredential(
        bytes32 credentialId,
        bytes32 credentialHash,
        bytes32 subjectHash
    ) external onlyRole(ISSUER_ROLE) {
        require(_credentials[credentialId].issuedAt == 0, "Credential already exists");
        require(credentialHash != bytes32(0), "Invalid credential hash");
        require(subjectHash != bytes32(0), "Invalid subject hash");

        _credentials[credentialId] = Credential({
            issuer: msg.sender,
            subjectHash: subjectHash,
            credentialHash: credentialHash,
            issuedAt: block.timestamp,
            revoked: false
        });

        emit CredentialIssued(credentialId, msg.sender, subjectHash, block.timestamp);
    }

    /**
     * @notice Revoke a credential. Only the original issuer can revoke.
     * @param credentialId The credential to revoke
     */
    function revokeCredential(bytes32 credentialId) external onlyRole(ISSUER_ROLE) {
        Credential storage cred = _credentials[credentialId];
        require(cred.issuedAt != 0, "Credential does not exist");
        require(!cred.revoked, "Credential already revoked");
        require(cred.issuer == msg.sender, "Only original issuer can revoke");

        cred.revoked = true;

        emit CredentialRevoked(credentialId, msg.sender, block.timestamp);
    }

    /**
     * @notice Public view to verify a credential's on-chain state.
     * @param credentialId The credential to verify
     * @return valid        True if the credential exists and is not revoked
     * @return issuer       Address of the issuer
     * @return subjectHash  Hash of the subject
     * @return credentialHash Hash of the credential data
     * @return issuedAt     Unix timestamp of issuance
     * @return revoked      Whether the credential has been revoked
     */
    function verifyCredential(bytes32 credentialId)
        external
        view
        returns (
            bool valid,
            address issuer,
            bytes32 subjectHash,
            bytes32 credentialHash,
            uint256 issuedAt,
            bool revoked
        )
    {
        Credential memory cred = _credentials[credentialId];
        return (
            cred.issuedAt != 0 && !cred.revoked,
            cred.issuer,
            cred.subjectHash,
            cred.credentialHash,
            cred.issuedAt,
            cred.revoked
        );
    }

    /**
     * @notice Check if a credential exists (issued or revoked).
     */
    function credentialExists(bytes32 credentialId) external view returns (bool) {
        return _credentials[credentialId].issuedAt != 0;
    }
}
