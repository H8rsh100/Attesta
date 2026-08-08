const { ethers } = require("ethers");

// ABI -- only the functions the backend needs to call
const CREDENTIAL_REGISTRY_ABI = [
  "function issueCredential(bytes32 credentialId, bytes32 credentialHash, bytes32 subjectHash) external",
  "function revokeCredential(bytes32 credentialId) external",
  "function verifyCredential(bytes32 credentialId) external view returns (bool valid, address issuer, bytes32 subjectHash, bytes32 credentialHash, uint256 issuedAt, bool revoked)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function ISSUER_ROLE() external view returns (bytes32)",
  "event CredentialIssued(bytes32 indexed credentialId, address indexed issuer, bytes32 subjectHash, uint256 issuedAt)",
  "event CredentialRevoked(bytes32 indexed credentialId, address indexed revokedBy, uint256 revokedAt)",
];

let _provider = null;
let _signer = null;
let _contract = null;
let _readOnlyContract = null;

/**
 * Initialize the contract service singleton.
 * Call this once at app startup.
 */
function initContractService() {
  if (_contract) return; // already initialized

  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.BACKEND_PRIVATE_KEY;
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!rpcUrl || !contractAddress) {
    console.error(
      "Missing RPC_URL or CONTRACT_ADDRESS -- contract service not initialized"
    );
    return;
  }

  _provider = new ethers.JsonRpcProvider(rpcUrl);

  // Read-only contract (no signer) -- used for public verifyCredential calls
  _readOnlyContract = new ethers.Contract(
    contractAddress,
    CREDENTIAL_REGISTRY_ABI,
    _provider
  );

  if (privateKey) {
    _signer = new ethers.Wallet(privateKey, _provider);
    // Write-capable contract -- used for issueCredential
    _contract = new ethers.Contract(
      contractAddress,
      CREDENTIAL_REGISTRY_ABI,
      _signer
    );
  } else {
    _contract = _readOnlyContract;
    console.warn(
      "BACKEND_PRIVATE_KEY not set -- contract write operations will fail"
    );
  }

  console.log("ContractService initialized. Contract:", contractAddress);
}

/**
 * Get the write-capable contract instance.
 * Throws if not initialized.
 */
function getContract() {
  if (!_contract) {
    throw new Error("ContractService not initialized. Call initContractService() first.");
  }
  return _contract;
}

/**
 * Get the read-only contract instance.
 * Useful for public verification routes where no signing is needed.
 */
function getReadOnlyContract() {
  if (!_readOnlyContract) {
    throw new Error("ContractService not initialized. Call initContractService() first.");
  }
  return _readOnlyContract;
}

/**
 * Get the signer address (backend wallet).
 */
async function getSignerAddress() {
  if (!_signer) return null;
  return _signer.address;
}

module.exports = {
  initContractService,
  getContract,
  getReadOnlyContract,
  getSignerAddress,
};
