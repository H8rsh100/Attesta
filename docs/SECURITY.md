# Attesta Security Model

## Threat Model

Attesta is a public-facing dApp. The following threat categories are in scope:

### In-Scope Threats

| Threat | Mitigation |
|---|---|
| Unauthorized credential issuance | On-chain ISSUER_ROLE + off-chain JWT + role check middleware |
| Signature replay attacks | Single-use nonces with 5-minute TTL |
| XSS token theft | JWT in httpOnly cookie, not localStorage |
| CSRF attacks | sameSite=strict cookie policy |
| Brute-force nonce fishing | Tight rate limit: 10 req / 15 min on auth routes |
| PII exposure on public ledger | Hash-commit pattern -- only keccak256 hashes stored on-chain |
| Reentrancy attacks | No external calls in state-changing contract functions |
| Role escalation | AccessControl from OpenZeppelin -- not hand-rolled |
| Input injection | express-validator sanitization on all routes |
| DDoS | Global rate limiter (200 req / 15 min) + tight per-route limits |

### Out-of-Scope Threats

- Private key compromise of the deployer wallet
- Ethereum network-level attacks (51% attack, reorg)
- Browser-level key extraction from MetaMask

---

## Why Hashes, Not PII On-Chain

Storing personal data on a public blockchain is irreconcilable with privacy requirements (GDPR, etc.) because:

1. **Immutability**: Once written, data cannot be deleted or corrected.
2. **Public visibility**: Anyone can read all on-chain data -- forever.
3. **Regulatory conflict**: The "right to erasure" is impossible on-chain.

Attesta uses the **hash-commit pattern**:
- The full credential payload (name, type, subject, issue date) is hashed with `keccak256`.
- Only the hash is stored on-chain.
- The raw data lives in Postgres (off-chain), which can be modified or deleted.
- Verifiers check the on-chain hash to prove the off-chain data has not been tampered with.

**Gas benefit**: `bytes32` (32 bytes, fixed) costs far less than arbitrary `string` storage on Ethereum.

---

## RBAC -- Two Independent Enforcement Layers

Role-based access control for credential issuance is enforced at two independent layers:

### Layer 1: On-Chain (Smart Contract)

```solidity
function issueCredential(...) external onlyRole(ISSUER_ROLE) {
```

`onlyRole(ISSUER_ROLE)` is an OpenZeppelin AccessControl modifier. Even a direct call to the contract (bypassing the backend entirely) will revert if the caller does not hold `ISSUER_ROLE`. This is the authoritative enforcement layer.

**Why OpenZeppelin AccessControl and not hand-rolled?**
- Audited and battle-tested code.
- Supports multiple roles and multiple members per role.
- Supports role admin hierarchy -- ISSUER_ROLE can be managed by DEFAULT_ADMIN_ROLE.
- Reduces the attack surface from custom role logic bugs.

### Layer 2: Off-Chain (Backend Middleware)

```js
async function requireIssuerRole(req, res, next) {
  const hasRole = await contract.hasRole(ISSUER_ROLE, req.user.address);
  if (!hasRole) return res.status(403).json({ error: "Forbidden" });
}
```

The backend queries the contract before submitting any transaction. This provides:
- **Fail-fast**: Rejects unauthorized requests before spending gas.
- **Better UX**: Returns a clear 403 error instead of a failed on-chain tx.

**Neither layer alone is sufficient:**
- On-chain only: A compromised backend could submit txs for non-issuers (which would revert, but wastes gas and creates noise).
- Off-chain only: A sophisticated attacker who bypasses the backend (direct RPC call) would succeed.
- Both together: The backend filters bad requests cheaply; the contract is the final authority.

---

## Reentrancy Non-Exposure

`CredentialRegistry.sol` does not make external calls inside state-changing functions. The attack vector for reentrancy requires:

1. A state-changing function that calls an external contract.
2. That external contract re-enters the original function before state is updated.

Neither `issueCredential` nor `revokeCredential` call any external contract. They only:
- Read/write the internal `_credentials` mapping.
- Emit events.

However, the **checks-effects-interactions** pattern is still followed as a best practice:
1. **Checks**: `require()` statements validate inputs and permissions first.
2. **Effects**: State is modified (`_credentials[id] = ...`).
3. **Interactions**: Events are emitted (last).

If future upgrades add external calls (e.g., minting an NFT on issuance), a `ReentrancyGuard` from OpenZeppelin should be added at that point.

---

## Auth Flow Security

Attesta uses a SIWE-style (Sign-In With Ethereum) auth flow:

1. Backend generates a random 256-bit nonce (`crypto.randomBytes(32)`).
2. Nonce is stored in-memory with a 5-minute TTL.
3. User signs a message containing the nonce with their wallet private key.
4. Backend recovers the signer address using `ethers.verifyMessage()`.
5. If recovered address matches claimed address, the nonce is deleted (single-use) and a JWT is issued.
6. JWT is stored in an httpOnly cookie with `sameSite: strict`.

**Why not passwords?**
- No credential storage means no credential breach surface.
- The user's wallet private key never leaves their device.
- Signatures are specific to the nonce message -- they cannot be replayed.

---

## Input Validation

All routes use `express-validator` to sanitize and validate inputs before they touch the database or contract:

- Ethereum addresses validated with `isEthereumAddress()`.
- String fields trimmed and length-limited.
- Credential ID format validated with a regex (`/^0x[a-fA-F0-9]{64}$/`).
- JSON body size limited to 10kb in Express config.
