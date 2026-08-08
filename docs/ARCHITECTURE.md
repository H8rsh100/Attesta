# Attesta -- Architecture Overview

## System Architecture

Attesta is a 3-layer monorepo:

```
User Browser
    |
    | HTTPS
    v
Next.js Frontend (Port 3000)
    |
    | REST API (httpOnly cookie JWT)
    v
Express Backend (Port 4000)
    |            |
    | Prisma     | ethers.js
    v            v
PostgreSQL    Sepolia Testnet
(metadata)   (CredentialRegistry.sol)
```

## Core Flows

### 1. Wallet Authentication (SIWE-style)

```
Browser         Backend              Blockchain
  |                |                     |
  |-- GET /nonce/:address ------------->|
  |<-- { nonce } -----------------------|
  |                |                     |
  | (user signs nonce in MetaMask)       |
  |                |                     |
  |-- POST /verify-signature ---------->|
  |                |-- ethers.verifyMessage()
  |                |   (recovers address from signature)
  |                |-- issue JWT
  |<-- Set-Cookie: token=<JWT> (httpOnly)
```

### 2. Credential Issuance

```
Issuer Browser      Backend                 Blockchain
     |                  |                       |
     |-- POST /credentials (JWT cookie) ------->|
     |                  |-- Check JWT
     |                  |-- Query contract.hasRole(ISSUER_ROLE)
     |                  |-- Generate credentialId (keccak256 of UUID)
     |                  |-- Hash credential payload (never raw PII on-chain)
     |                  |-- Hash subject address
     |                  |-- tx: issueCredential(id, hash, subjectHash) -------->|
     |                  |                                    contract stores data|
     |                  |<-- tx receipt --------------------------------<--------|
     |                  |-- Store off-chain metadata in Postgres
     |<-- { credentialId, txHash }
```

### 3. Public Verification

```
Verifier Browser    Backend                 Blockchain
     |                  |                       |
     |-- GET /verify/:id ------------------->|
     |                  |-- Fetch from Postgres (name, type, metadata)
     |                  |-- contract.verifyCredential(id) ----------------->|
     |                  |<-- { valid, issuer, hashes, issuedAt, revoked } <--|
     |<-- { status: "VALID"|"REVOKED"|"NOT_FOUND", onChain, offChain }
```

## Security Design

### RBAC -- Two Layers

Role-based access control is enforced at two independent layers:

1. **Off-chain (middleware)**: `requireIssuerRole` queries `contract.hasRole()` before
   the transaction is submitted. This provides fast failure and better UX.
2. **On-chain (contract modifier)**: `onlyRole(ISSUER_ROLE)` on `issueCredential` means
   even a direct contract call bypassing the backend will fail for non-issuers.

Neither layer alone is sufficient. Using both means:
- A compromised backend cannot issue credentials for non-issuers (contract blocks it).
- An attacker who somehow gets a valid JWT cannot use it if they lack the on-chain role.

### Hash-Commit Pattern

Raw credential data and PII are never stored on-chain. Instead:
- The full credential payload is hashed with `keccak256` (via `ethers.id()`).
- The subject wallet address is hashed before being stored.
- Off-chain metadata lives in Postgres, keyed by the same credential ID.
- Verifiers check the on-chain record for authenticity and revocation status,
  and the off-chain DB for human-readable metadata.

This approach provides:
- **Privacy**: No PII on a public ledger.
- **Gas efficiency**: `bytes32` hashes cost significantly less than arbitrary strings.
- **Tamper evidence**: The on-chain hash can verify off-chain data integrity.

### Auth -- No Passwords

Auth is wallet-signature based (SIWE-style):
- The backend issues a random nonce with a 5-minute TTL.
- The user signs the nonce with their private key in MetaMask.
- The backend recovers the signer address with `ethers.verifyMessage()`.
- If address matches, a JWT is issued and stored in an httpOnly cookie.
- Nonces are single-use -- deleted immediately after verification.

There is no password storage, no credential breach surface.

### JWT Storage

JWTs are stored in httpOnly cookies, not localStorage. This prevents XSS attacks
from reading the token. The `sameSite: "strict"` flag prevents CSRF.

## Gas Optimization Notes

- `bytes32` is used for all IDs and hashes (vs. `string` which is dynamic-length).
- No dynamic arrays in the Credential struct -- fixed-size fields only.
- `verifyCredential` is a `view` function -- free to call, no gas cost for reads.

## Reentrancy Note

`CredentialRegistry.sol` has no external calls in state-changing functions.
The `checks-effects-interactions` pattern is not strictly required here, but it is
still followed: all require checks happen first, then state is modified, then events
are emitted. If external calls (e.g., to an NFT contract on issuance) were added,
a `ReentrancyGuard` from OpenZeppelin would be necessary.
