# Decentralized Identity & Credential Verification Platform — Project Plan

## Goal
Full-stack dApp where an authorized issuer mints verifiable on-chain credentials
(certificates/badges), holders authenticate via Web3 wallet, and any third party
can verify a credential's authenticity publicly — no login required.

## Stack
- Frontend: Next.js + Tailwind, wagmi/viem or ethers.js for wallet connection
- Backend: Node.js + Express — off-chain metadata, session handling, QR generation
- DB: PostgreSQL (relational fits users/issuers/credential-metadata well) via Prisma
- Blockchain: Solidity, Hardhat for dev/test/deploy, deployed to Sepolia
- Security: JWT (for off-chain session mgmt only — auth itself is wallet-signature
  based, not password), rate limiting (express-rate-limit), input sanitization,
  RBAC enforced both on-chain (contract modifiers) and off-chain (middleware)

## Core flows
1. **Wallet auth (SIWE-style)**: user connects wallet -> backend issues a nonce
   -> user signs it -> backend verifies signature -> issues JWT session. No
   passwords anywhere.
2. **Credential issuance**: only wallets with ISSUER_ROLE (on-chain RBAC) can
   call `issueCredential`. Stores a hash/commitment on-chain; full credential
   metadata (name, issue date, type) stored off-chain in Postgres, linked by
   credential ID.
3. **Verification portal**: public route, no auth. Input credential ID or scan
   QR -> backend fetches off-chain metadata + queries the smart contract for
   the on-chain record -> confirms hash match -> shows verified/invalid.
4. **Revocation** (recommended addition): issuer can revoke a credential
   on-chain (status flag), verification portal checks this too — strong
   interview talking point (mutability vs immutability trade-off).

## Smart contract design (Solidity)
- `CredentialRegistry.sol`:
  - `mapping(bytes32 => Credential)` where Credential = {issuer, subject hash,
    credentialHash, issuedAt, revoked}
  - `AccessControl` (OpenZeppelin) for ISSUER_ROLE / ADMIN_ROLE — don't hand-roll
    RBAC, use the audited library
  - `issueCredential(bytes32 id, bytes32 credentialHash, address subject)` —
    onlyRole(ISSUER_ROLE)
  - `revokeCredential(bytes32 id)` — onlyRole(ISSUER_ROLE), only original issuer
  - `verifyCredential(bytes32 id) view returns (bool valid, address issuer, ...)`
  - Store only hashes on-chain, never PII — full credential data lives off-chain;
    this is the standard "commit the hash, keep the data off-chain" pattern for
    privacy + gas cost

## Repo structure
```
did-platform/
├── contracts/
│   ├── CredentialRegistry.sol
│   ├── test/CredentialRegistry.test.js       # Hardhat + Chai tests
│   ├── scripts/deploy.js
│   └── hardhat.config.js
├── backend/
│   ├── src/
│   │   ├── routes/auth.js                    # nonce issuance, signature verify, JWT
│   │   ├── routes/credentials.js             # issue (proxied to chain), list
│   │   ├── routes/verify.js                  # public verification endpoint
│   │   ├── middleware/rbac.js                # off-chain role check middleware
│   │   ├── middleware/rateLimiter.js
│   │   ├── services/contractService.js       # ethers.js contract instance + calls
│   │   ├── db/schema.prisma
│   │   └── app.js
│   └── package.json
├── frontend/
│   ├── app/ (or pages/)
│   │   ├── connect/                          # wallet connect + SIWE flow
│   │   ├── issue/                            # issuer dashboard (role-gated)
│   │   ├── verify/[id]/                      # public verification page
│   │   └── dashboard/                        # holder's credential view
│   ├── components/
│   ├── lib/wagmiConfig.js
│   └── package.json
├── docs/
│   ├── ARCHITECTURE.md
│   └── SECURITY.md                            # threat model, RBAC design, hash-not-PII rationale
└── README.md
```

## Build phases (do in order)
1. **Smart contract**: write CredentialRegistry.sol with OZ AccessControl,
   write Hardhat tests covering issue/revoke/verify + access-control failures
   (non-issuer tries to issue -> reverts). Deploy to Sepolia testnet.
2. **Backend — auth**: nonce endpoint, signature verification (ethers.js
   `verifyMessage`), JWT session issuance, rate limiting on auth routes.
3. **Backend — credentials + verify**: issuance endpoint (checks off-chain
   role cache + calls contract), public verify endpoint (no auth, reads
   on-chain state).
4. **Frontend — wallet connect**: SIWE-style login flow using wagmi/viem.
5. **Frontend — issuer dashboard**: role-gated UI to issue credentials, shows
   QR code per issued credential (encode credential ID/URL).
6. **Frontend — public verify page**: paste ID or scan QR -> shows verified
   status, issuer, issue date, revocation status.
7. **Security pass**: input sanitization on all routes, rate limiting,
   confirm no PII on-chain, write SECURITY.md documenting the threat model.

## Interview talking points to bake in deliberately
- Why hash-commit pattern instead of storing data on-chain (privacy + gas)
- Reentrancy: note that this contract has no external calls in state-changing
  functions, so it's not exposed — but explain what would need a
  checks-effects-interactions pattern if it did
- Gas optimization: `bytes32` over `string` for IDs/hashes, minimal on-chain
  storage
- RBAC via OpenZeppelin AccessControl rather than custom `onlyOwner` — audited,
  extensible to multiple issuer orgs
- Wallet-signature auth (SIWE) vs password auth — no credential storage, no
  password breach surface
