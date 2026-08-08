# Attesta

A decentralized identity and credential verification platform. Authorized issuers mint verifiable on-chain credentials, holders authenticate via Web3 wallet, and any third party can verify authenticity publicly -- no login required.

## Architecture

```
Next.js Frontend  ->  Express Backend  ->  Sepolia Testnet
                                       ->  PostgreSQL (metadata)
```

Full design in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Security model in [docs/SECURITY.md](docs/SECURITY.md)

---

## Repository Structure

```
attesta/
contracts/          # Solidity smart contract + Hardhat tests + deploy script
backend/            # Node.js + Express API
frontend/           # Next.js app (wallet connect, issuer dashboard, verify page)
docs/               # Architecture and security docs
```

---

## Setup

### Prerequisites

- Node.js >= 18
- PostgreSQL (local or cloud -- Supabase/Neon work fine)
- MetaMask browser extension
- A Sepolia RPC URL (Infura / Alchemy)
- A funded Sepolia wallet (for contract deployment)

---

### 1. Smart Contracts

```bash
cd contracts
npm install
cp .env.example .env
# Fill in SEPOLIA_RPC_URL and PRIVATE_KEY in .env

# Run tests (uses local Hardhat network -- no RPC key needed)
npm test

# Deploy to Sepolia
npm run deploy:sepolia
# Copy CONTRACT_ADDRESS from output into backend/.env
```

---

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, RPC_URL, CONTRACT_ADDRESS, BACKEND_PRIVATE_KEY

# Set up Postgres and run migrations
npx prisma generate
npx prisma migrate dev --schema=src/db/schema.prisma

# Start dev server
npm run dev
# Runs on http://localhost:4000
```

---

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_CONTRACT_ADDRESS, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

npm run dev
# Runs on http://localhost:3000
```

---

## Environment Variables

### contracts/.env

| Variable | Description |
|---|---|
| `SEPOLIA_RPC_URL` | Infura/Alchemy Sepolia endpoint |
| `PRIVATE_KEY` | Deployer wallet private key |
| `ETHERSCAN_API_KEY` | Optional -- for contract verification |
| `CONTRACT_ADDRESS` | Populated after deployment |

### backend/.env

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random string for JWT signing |
| `JWT_EXPIRES_IN` | e.g. `24h` |
| `RPC_URL` | Sepolia RPC endpoint |
| `CONTRACT_ADDRESS` | Deployed CredentialRegistry address |
| `BACKEND_PRIVATE_KEY` | Backend wallet key (pays gas for issuance) |
| `FRONTEND_URL` | For CORS -- e.g. `http://localhost:3000` |

### frontend/.env.local

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed CredentialRegistry address |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | From cloud.walletconnect.com |
| `NEXT_PUBLIC_API_URL` | Backend URL e.g. `http://localhost:4000` |

---

## Core Flows

**Wallet Auth**: Connect wallet -> GET /api/auth/nonce/:address -> sign nonce -> POST /api/auth/verify-signature -> JWT set in httpOnly cookie.

**Issue Credential**: Issuer connects wallet -> authenticates -> fills form (subject, type, name) -> POST /api/credentials -> contract.issueCredential() on Sepolia -> QR code generated.

**Verify Credential**: Any party -> GET /api/verify/:id -> on-chain verifyCredential() + off-chain metadata -> VALID / REVOKED / NOT_FOUND.

---

## Security Highlights

- No passwords. Auth is wallet-signature only (SIWE-style).
- No PII on-chain. Only keccak256 hashes stored in the contract.
- RBAC enforced on-chain (contract modifier) AND off-chain (middleware).
- JWT stored in httpOnly cookie -- not localStorage.
- Rate limiting on auth (10/15min) and issuance (20/hr) routes.
- Input validation on all routes via express-validator.

See [docs/SECURITY.md](docs/SECURITY.md) for the full threat model.

---

## License

ISC
