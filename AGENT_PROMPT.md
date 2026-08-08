# Agent Build Prompt — Decentralized Identity & Credential Verification Platform

You are building a full-stack dApp for issuing and verifying on-chain
credentials. Follow PLAN.md in this repo for full context (stack, contract
design, repo structure, build phases). Read it first.

## Task
Implement the repo structure in PLAN.md, in the phase order given. Each phase
should be a working, testable increment — get the contract deployed and tested
before touching the frontend.

## Specifics

### Phase 1 — Smart contract
- `contracts/CredentialRegistry.sol`: use OpenZeppelin's `AccessControl` for
  `ISSUER_ROLE` and `DEFAULT_ADMIN_ROLE`. Store credentials as
  `mapping(bytes32 => Credential)`, Credential struct = {address issuer,
  bytes32 subjectHash, bytes32 credentialHash, uint256 issuedAt, bool revoked}.
  Functions: `issueCredential`, `revokeCredential` (only original issuer),
  `verifyCredential` (public view, no auth). Never store raw PII on-chain —
  only hashes.
- Write Hardhat tests in `contracts/test/` covering: successful issue, issue
  reverts for non-issuer role, successful revoke, revoke reverts for wrong
  issuer, verify returns correct state before/after revocation.
- `scripts/deploy.js` deploys to whatever network Hardhat is configured for;
  default config targets Sepolia (use env vars for RPC URL + private key, never
  hardcode).

### Phase 2 — Backend auth
- `routes/auth.js`: `GET /nonce/:address` issues a random nonce tied to that
  address (short TTL, store in-memory or Redis-ready abstraction);
  `POST /verify-signature` takes address + signed nonce, verifies via
  ethers.js `verifyMessage`, issues a JWT on success.
- `middleware/rateLimiter.js`: apply express-rate-limit to auth routes
  specifically (tighter limit) and globally (looser limit).
- Sanitize all inputs (express-validator or equivalent) before they touch the
  DB or contract calls.

### Phase 3 — Backend credentials + verification
- `services/contractService.js`: single ethers.js contract instance
  (read + write), reused across routes — don't instantiate per-request.
- `routes/credentials.js`: `POST /credentials` — requires valid JWT AND
  on-chain ISSUER_ROLE check (query contract, don't trust a DB flag alone)
  before calling `issueCredential`. Stores off-chain metadata (name, type,
  description) in Postgres keyed by the same credential ID used on-chain.
- `routes/verify.js`: `GET /verify/:id` — public, no auth, no rate-limit
  bypass concerns since it's read-only. Fetches off-chain metadata + on-chain
  `verifyCredential` result, returns combined response.
- `db/schema.prisma`: models for User (wallet address, role cache), Credential
  (id, issuerAddress, subjectAddress, type, name, issuedAt, off-chain metadata
  fields) — the credential's source of truth for validity is always the chain,
  Postgres is metadata only.

### Phase 4 — Frontend wallet connect
- Use `wagmi` + `viem` for wallet connection (MetaMask + WalletConnect).
- Implement SIWE-style flow: connect wallet -> fetch nonce -> prompt signature
  -> POST to `/verify-signature` -> store JWT (httpOnly cookie preferred over
  localStorage).

### Phase 5 — Issuer dashboard
- Role-gated route (check JWT + on-chain role) with a form to issue a
  credential (subject address, type, name). On success, generate a QR code
  (e.g. `qrcode` package) encoding a verification URL
  (`/verify/<credentialId>`).

### Phase 6 — Public verify page
- `/verify/[id]` — no auth. Fetches from `GET /verify/:id`, displays
  verified/invalid/revoked state, issuer address, issue date. Also support
  a QR scanner input (client-side lib) that decodes to the same ID.

### Phase 7 — Security pass
- Confirm every route has input validation.
- Confirm rate limiting is active on auth + issuance routes.
- Write `docs/SECURITY.md`: document the threat model, why hashes-not-PII
  on-chain, RBAC enforcement (on-chain modifier + off-chain middleware, not
  either alone), and note the reentrancy non-exposure (no external calls in
  state-changing functions) with a short explanation of checks-effects-
  interactions for context.

## Non-negotiables
- Never store PII or raw credential data on-chain — hashes only.
- RBAC must be enforced on-chain (contract modifier) AND checked off-chain
  before submitting a transaction (fail fast, better UX) — not one or the
  other.
- Use OpenZeppelin's AccessControl, not a hand-rolled role system.
- No passwords anywhere — auth is wallet-signature (SIWE-style) only.
- JWT stored httpOnly cookie, not localStorage (XSS surface).
- All contract addresses, RPC URLs, and keys via environment variables, never
  hardcoded or committed.

## Deliverables
Working monorepo matching PLAN.md's structure: deployed+tested contract on
Sepolia, backend with auth/issuance/verification routes, frontend with wallet
connect + issuer dashboard + public verify page, SECURITY.md, and a README
with setup/deploy/run instructions for all three layers.
