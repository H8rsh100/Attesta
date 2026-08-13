<div align="center">

# Attesta

### Decentralized Identity & Credential Verification Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-brightgreen.svg)](https://soliditylang.org/)
[![Network](https://img.shields.io/badge/Network-Sepolia_Testnet-purple.svg)](https://sepolia.etherscan.io/)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js_14-black.svg)](https://nextjs.org/)
[![Backend](https://img.shields.io/badge/Backend-Express.js-lightgrey.svg)](https://expressjs.com/)
[![Tests](https://img.shields.io/badge/Tests-16_Passing-success.svg)](contracts/test/CredentialRegistry.test.js)

<p align="center">
  A full-stack Web3 platform for issuing, managing, and verifying tamper-proof on-chain credentials. Authorized issuers mint cryptographic commitments on Ethereum Sepolia, while any third party can instantly verify credentials publicly with zero login required.
</p>

</div>

---

## Highlights

- **Hash-Commit Privacy**: No raw PII (Personally Identifiable Information) or sensitive metadata is ever stored on-chain. Only Keccak256 cryptographic hashes are recorded.
- **Dual-Layer Access Control**: Issuer permissions are verified off-chain via backend middleware and strictly enforced on-chain through OpenZeppelin AccessControl.
- **Zero-Password Authentication**: Wallet-signature authentication (SIWE-style) uses cryptographically secure single-use nonces stored in httpOnly cookies.
- **On-Chain Revocation**: Issuers retain the ability to revoke credentials on-chain, giving verifiers immediate, real-time revocation status.
- **Public Verification Portal & Instant QR**: Public verification endpoints allow anyone to check authenticity via Credential ID or mobile QR code scanner.

---

## System Architecture

```
                      +-----------------------------+
                      |   Next.js 14 Web Frontend   |
                      | (Public Portal & Dashboard) |
                      +--------------+--------------+
                                     |
                         REST API    | httpOnly JWT
                                     v
                      +--------------+--------------+
                      |     Node.js Express API     |
                      | (Auth, Metadata & Controller|
                      +-------+--------------+------+
                              |              |
                Prisma Client |              | ethers.js JsonRpcProvider
                              v              v
                  +-----------+---+      +---+-------------------------+
                  |  PostgreSQL   |      |  Ethereum Sepolia Testnet   |
                  | (Off-Chain    |      | (CredentialRegistry.sol     |
                  |  Metadata)    |      |  OpenZeppelin AccessControl)|
                  +---------------+      +-----------------------------+
```

Full architectural specifications are detailed in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Detailed security parameters are covered in [docs/SECURITY.md](docs/SECURITY.md).

---

## Repository Structure

```
Attesta/
├── contracts/               # Solidity smart contracts, Hardhat tests & deployment scripts
│   ├── contracts/
│   │   └── CredentialRegistry.sol
│   ├── test/                # Hardhat test suite (16 test cases covering issue, revoke, RBAC)
│   └── scripts/
├── backend/                 # Node.js + Express REST API
│   ├── src/
│   │   ├── routes/          # Auth, Credentials, Revocation, and Verification endpoints
│   │   ├── middleware/      # Rate limiters & dual-layer RBAC middleware
│   │   ├── services/        # Ethers.js contract provider singleton
│   │   └── db/              # Prisma schema & database migrations
│   └── test/                # Backend security and utility test suite
├── frontend/                # Next.js 14 web application
│   ├── src/
│   │   ├── app/             # App Router pages (Home, Verify Portal, Issuer Dashboard)
│   │   └── lib/             # Wagmi & Viem Web3 configurations
├── docs/                    # Architecture and Security documentation
├── LICENSE                  # Official MIT License
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database (Local, Supabase, or Neon)
- MetaMask or compatible Web3 wallet
- Ethereum Sepolia RPC URL (Infura or Alchemy)

---

### 1. Smart Contracts Setup

```bash
cd contracts
npm install

# Run unit tests on local Hardhat network (16 passing test cases)
npm test

# Deploy CredentialRegistry to Sepolia Testnet
npm run deploy:sepolia
```

---

### 2. Backend API Setup

```bash
cd backend
npm install
cp .env.example .env

# Configure PostgreSQL connection & Sepolia RPC credentials in .env

# Run Prisma schema migration
npx prisma generate
npx prisma migrate dev --schema=src/db/schema.prisma

# Start backend server (runs on http://localhost:4000)
npm run dev
```

---

### 3. Frontend App Setup

```bash
cd frontend
npm install

# Start Next.js development server (runs on http://localhost:3000)
npm run dev
```

---

## Environment Variables Configuration

### `contracts/.env`

| Variable | Description |
|---|---|
| `SEPOLIA_RPC_URL` | Sepolia JSON-RPC endpoint URL |
| `PRIVATE_KEY` | Deployer wallet private key |
| `ETHERSCAN_API_KEY` | Etherscan API key for contract verification |
| `CONTRACT_ADDRESS` | Deployed `CredentialRegistry` address |

### `backend/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key used for signing session JWTs |
| `JWT_EXPIRES_IN` | Token expiration duration (e.g. `24h`) |
| `RPC_URL` | Sepolia RPC endpoint URL |
| `CONTRACT_ADDRESS` | Deployed contract address on Sepolia |
| `BACKEND_PRIVATE_KEY` | Backend wallet key for executing on-chain transactions |
| `FRONTEND_URL` | Allowed origin for CORS (e.g. `http://localhost:3000`) |

### `frontend/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed `CredentialRegistry` address |
| `NEXT_PUBLIC_API_URL` | Express backend API URL (`http://localhost:4000`) |
| `NEXT_PUBLIC_RPC_URL` | Sepolia RPC endpoint for client-side reads |

---

## Core API Reference

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/auth/nonce/:address` | Public | Request a 256-bit single-use cryptographic nonce |
| `POST` | `/api/auth/verify-signature` | Public | Submit signed nonce; receives httpOnly JWT cookie |
| `POST` | `/api/credentials` | Issuer Only | Issue new credential on-chain & store off-chain metadata |
| `POST` | `/api/credentials/:id/revoke` | Issuer Only | Revoke credential on-chain & update status |
| `GET` | `/api/verify/:id` | Public | Fetch combined on-chain state & off-chain metadata |

---

## Security Model Overview

1. **Zero Raw PII On-Chain**: Hashes (`bytes32`) guarantee data privacy and regulatory compliance.
2. **Dual-Layer RBAC**: On-chain OpenZeppelin `AccessControl` combined with backend pre-flight verification.
3. **HTTP-Only Cookies**: JWTs are stored strictly in `httpOnly` cookies with `sameSite=strict` to prevent XSS and CSRF.
4. **Rate-Limiting**: Express rate limiters protect authentication and issuance routes against brute-force and DDoS vectors.

For complete threat analysis and security details, see [docs/SECURITY.md](docs/SECURITY.md).

---

## License

This project is licensed under the [MIT License](LICENSE).
