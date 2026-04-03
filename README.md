# BAC2002 Blockchain & Cryptocurrency - KYC Verifiable Credential DApp

## Overview
This repository contains a full-stack, Decentralized Fintech Application (DApp) developed for the **BAC2002 Blockchain and Cryptocurrency** term project. 

The primary objective of this project is to implement a privacy-preserving KYC (Know Your Customer) framework using **W3C Verifiable Credentials** and the **Polygon Amoy testnet**. Instead of putting Sensitive Personally Identifiable Information (PII) on the blockchain, this DApp anchors only cryptographic hashes of the Verifiable Credentials on-chain. This maintains full verifiability without compromising data privacy.

The application serves three primary actors:
1. **The Administrator/Issuer**: Reviews user KYC submissions through a portal and issues cryptographic VCs.
2. **The User**: Submits KYC documents and stores the approved VCs in their wallet.
3. **The Verifier**: Checks the cryptographic validity and on-chain revocation status of a VC when the user presents it.

## Architecture & Technology Stack
This repository is configured as a `pnpm` monorepo containing multiple interconnected packages:

* **`packages/contracts`**
  * **Role**: The Ethereum smart contracts deployed on the Polygon Amoy blockchain using Hardhat.
  * **Core Files**: `DIDRegistry.sol`, `RevocationRegistry.sol`, `TrustedIssuerRegistry.sol`.
* **`packages/shared`**
  * **Role**: Shared TypeScript structures bridging the environments, heavily featuring the `veramoAgent` for W3C Verifiable Credentials (`@veramo/core`).
* **`packages/issuer-portal`**
  * **Role**: A Next.js 14 and Supabase web portal for the KYC issuer. Includes user management and database schemas.
* **`packages/user-wallet`**
  * **Role**: A Vite/React frontend acting as the user's DID and VC storage wallet.
* **`packages/verifier-app`**
  * **Role**: A Vite/React frontend used by third parties to verify the cryptographical signature and on-chain revocation status of VCs.

---

## Prerequisites

Before starting, ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v18.x or v20.x recommended)
* [pnpm](https://pnpm.io/installation) (v8.x or above)
* Git

You will also need to create accounts at:
* [Supabase](https://supabase.com/) (For PostgreSQL database and Auth)
* [Alchemy](https://www.alchemy.com/) (For Polygon Amoy RPC connectivity)
* [Polygonscan](https://amoy.polygonscan.com/) (Optional: for contract verification)

---

## Installation & Setup

**1. Clone the Repository**
```bash
git clone https://github.com/<your-username>/bac2002-blockchain.git
cd bac2002-blockchain
```

**2. Install Dependencies**
Install dependencies globally across all workspaces leveraging `pnpm`:
```bash
pnpm install
```

**3. Environment Configuration**
You will need to manually configure environment variables in two locations.
Copy the `.env.example` file in the root to `.env`:
```bash
cp .env.example .env
```
Fill out the variables in `.env`:
```env
DEPLOYER_PRIVATE_KEY="your-deployer-wallet-private-key-without-0x"
ALCHEMY_AMOY_URL="https://polygon-amoy.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
POLYGONSCAN_API_KEY="your-polygonscan-api-key"
ISSUER_DID_PRIVATE_KEY="separate-private-key-for-veramo-vc-signing"
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

Next, configure the verifier application. Copy the `.env.example` in `packages/verifier-app` to `.env`:
```bash
cp packages/verifier-app/.env.example packages/verifier-app/.env
```
Fill out the variables in `packages/verifier-app/.env`:
```env
VITE_ALCHEMY_AMOY_URL="https://polygon-amoy.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
VITE_WALLET_URL="http://localhost:3002"
```

---

## Deployment & Execution

### Deploying the Database (Supabase)
Navigate to the `issuer-portal` package and execute the migration file within your Supabase project's SQL editor.
* Open your Supabase Dashboard -> SQL Editor.
* Copy the contents of `packages/issuer-portal/supabase-migration.sql` and execute it. 
This will establish `profiles`, `kyc_submissions`, `notifications`, and handle Row Level Security.

### Deploying the Smart Contracts (Polygon Amoy)
Deploy the custom smart contracts locally, or out to the live testnet.
```bash
# Compile the smart contracts
pnpm compile

# Deploy to Polygon Amoy testnet
pnpm deploy:amoy
```

### Running the Services Locally
You can run all three services using the `package.json` scripts from the root directory in separate terminal windows:

**1. Start the Issuer Portal (Next.js - Port 3001)**
```bash
pnpm dev:portal
```
**2. Start the User Wallet (Vite/React - Port 3002)**
```bash
pnpm dev:wallet
```
**3. Start the Verifier App (Vite/React - Port 3003)**
```bash
pnpm dev:verifier
```

---

## Usage Walkthrough
1. **User Registration:** Access the Issuer Portal (`localhost:3001`), register an account, and submit your KYC details (Name, Nationality, DOB, etc.).
2. **Admin Approval:** A Supabase admin approves the KYC Request inside the portal. A JWT VC is signed using Veramo and its hash is immediately anchored on the `RevocationRegistry` on Polygon Amoy.
3. **Hold Application:** The User loads the User Wallet (`localhost:3002`) to retrieve and view their newly issued Verifiable Credential.
4. **Verification:** The User submits their Verification JWT into the Verifier App (`localhost:3003`). The frontend validates the signature against the issuer DID locally, securely verifying the on-chain Polygon Amoy data avoiding the use of an off-chain database.