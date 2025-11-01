# 🚀 Quick Start: ZK Priority Tickets

Get the Zero-Knowledge Priority Ticket system running in 5 minutes.

## Prerequisites

```bash
node -v  # Should be 18+
npm -v   # Should be 9+
```

## Installation

### 1. Install All Dependencies

```bash
# Root project
npm install

# Backend
npm run setup:backend

# Circuits
npm run setup:zk

# Contracts
npm run setup:contracts
```

### 2. Setup Environment

```bash
# Copy template
cp .env.example .env.local

# Edit .env.local with your values
# At minimum, set:
# - DATABASE_URL (MongoDB)
# - NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Generate ZK Keys

```bash
cd circuits

# Download Powers of Tau (one-time, ~50MB)
curl -O https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau

# Compile circuit
npm run compile

# Setup ceremony
npm run setup
npm run contribute
npm run export-vkey
npm run export-verifier
```

**Expected output:**
```
✅ Circuit compiled: build/github_eligibility.wasm
✅ Proving key: build/github_eligibility_final.zkey
✅ Verification key: build/verification_key.json
✅ Solidity verifier: ../contracts/src/Verifier.sol
```

### 4. Deploy Contracts (Optional for local testing)

```bash
cd ../contracts

# Configure Monad RPC in hardhat.config.js
# Add PRIVATE_KEY to .env

# Deploy
npm run deploy:contracts

# Copy addresses to .env.local:
# NEXT_PUBLIC_VERIFIER_ADDRESS=0x...
# NEXT_PUBLIC_EVENT_TICKET_ADDRESS=0x...
```

### 5. Setup GitHub OAuth

1. **Create GitHub OAuth App:**
   - Visit: https://github.com/settings/developers
   - Click "New OAuth App"
   - Fill in:
     - Name: "Your App Name - Dev"
     - Homepage: `http://localhost:3000`
     - Callback: `http://localhost:3000/callback/github`
   - Click "Register application"
   - Copy **Client ID** and **Client Secret**

2. **Add to .env.local:**
   ```env
   NEXT_PUBLIC_GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   ```

### 6. Start Development Servers

```bash
# Terminal 1: Backend API
npm run backend

# Terminal 2: Frontend (in root)
npm run dev
```

**Visit:** http://localhost:3000/hackathon

---

## Test the Flow

### 1. Verify GitHub (Mock)

For local testing without GitHub OAuth:

```bash
cd circuits
node scripts/generate-proof.js
```

This generates a test proof you can use.

### 2. Test Backend API

```bash
curl -X POST http://localhost:3001/api/zk/health
```

Expected:
```json
{
  "status": "ok",
  "service": "ZK GitHub Verification"
}
```

### 3. Test Full Flow

1. Open http://localhost:3000/hackathon
2. Click "Verify GitHub (ZK)"
3. Authorize the app
4. See eligibility status
5. Click "Mint Priority Ticket"
6. Confirm transaction in MetaMask

---

## Quick Troubleshooting

### Circuit compilation fails

```bash
# Install Circom globally
cargo install circom
```

### "MODULE_NOT_FOUND" errors

```bash
# Reinstall all dependencies
rm -rf node_modules backend/node_modules circuits/node_modules
npm install
cd backend && npm install
cd ../circuits && npm install
```

### Backend can't connect to MongoDB

```bash
# Check .env.local has DATABASE_URL
cat .env.local | grep DATABASE_URL

# Test connection
mongosh "your-connection-string"
```

### MetaMask not connecting

1. Check you're on the right network (Monad testnet)
2. Add Monad testnet to MetaMask:
   - Network Name: Monad Testnet
   - RPC URL: https://testnet.monad.xyz
   - Chain ID: (check Monad docs)
   - Currency: MON

---

## Next Steps

- 📖 Read full documentation: [docs/ZK-PRIORITY-TICKETS.md](./docs/ZK-PRIORITY-TICKETS.md)
- 🎨 Customize UI: Edit `components/zk-priority-ticket.tsx`
- ⚙️ Adjust thresholds: Edit `circuits/github_eligibility.circom`
- 🚀 Deploy to production: See deployment guide

---

## Support

Need help? Check:
- [Full Documentation](./docs/ZK-PRIORITY-TICKETS.md)
- [GitHub Issues](https://github.com/your-repo/issues)
- [Monad Discord](https://discord.gg/monad)

**Happy Building! 🎉**
