# OAuth + ZK Priority Tickets - Quick Setup Guide

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18+
- npm or pnpm
- MetaMask or compatible wallet
- GitHub account (for testing hackathon verification)
- Spotify account (for testing concert verification)

---

## Step 1: Register OAuth Applications

### GitHub OAuth App
1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name:** Evnto (or your app name)
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:4000/api/github/callback`
4. Copy **Client ID** and **Client Secret**

### Spotify OAuth App
1. Go to https://developer.spotify.com/dashboard
2. Click "Create app"
3. Fill in:
   - **App name:** Evnto
   - **Redirect URI:** `http://localhost:4000/api/spotify/callback`
4. Copy **Client ID** and **Client Secret**

---

## Step 2: Configure Environment Variables

### Backend Setup

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```bash
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:4000/api/github/callback

SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:4000/api/spotify/callback

PORT=4000
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:4000
```

### Frontend Setup

Create `.env.local` in root:
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id

# Update after deploying contracts
NEXT_PUBLIC_EVENT_TICKET_CONTRACT=0x...
```

---

## Step 3: Install Dependencies

### Backend
```bash
cd backend
npm install
```

Required packages:
- express
- axios
- @octokit/rest
- spotify-web-api-node
- circomlibjs
- snarkjs

### Frontend
```bash
npm install
```

### Circuits
```bash
cd circuits
npm install
```

---

## Step 4: Compile ZK Circuits

```bash
cd circuits

# Install circom if not installed
# Download from: https://docs.circom.io/getting-started/installation/

# Compile GitHub eligibility circuit
circom github_eligibility.circom --r1cs --wasm --sym -o build/

# Compile Spotify verification circuit
circom spotify_fan_verification.circom --r1cs --wasm --sym -o build/

# Generate proving keys (requires Powers of Tau)
# For testing, use a small Powers of Tau file:
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau

# Setup phase 2
snarkjs groth16 setup build/github_eligibility.r1cs powersOfTau28_hez_final_12.ptau github_eligibility.zkey
snarkjs groth16 setup build/spotify_fan_verification.r1cs powersOfTau28_hez_final_12.ptau spotify_fan_verification.zkey

# Export verification keys
snarkjs zkey export verificationkey github_eligibility.zkey github_eligibility_vkey.json
snarkjs zkey export verificationkey spotify_fan_verification.zkey spotify_fan_verification_vkey.json

# Generate Solidity verifier
snarkjs zkey export solidityverifier github_eligibility.zkey ../contracts/src/GitHubVerifier.sol
snarkjs zkey export solidityverifier spotify_fan_verification.zkey ../contracts/src/SpotifyVerifier.sol
```

---

## Step 5: Deploy Smart Contracts

```bash
cd contracts
npm install

# Compile contracts
npx hardhat compile

# Deploy to local network (for testing)
npx hardhat node

# In another terminal
npx hardhat run scripts/deploy.js --network localhost

# Deploy to Monad Testnet (update hardhat.config.js first)
npx hardhat run scripts/deploy.js --network monad-testnet
```

Update `.env.local` with deployed contract addresses.

---

## Step 6: Start Development Servers

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

Backend will run on http://localhost:4000

### Terminal 2 - Frontend
```bash
npm run dev
```

Frontend will run on http://localhost:3000

---

## Step 7: Test the Flow

### Test GitHub Verification (Hackathon)

1. Navigate to http://localhost:3000
2. Create or select a "Web3 Hackathon" event
3. Click "Priority Ticket" button
4. Click "Verify GitHub for Priority Access"
5. Log in with GitHub (popup will open)
6. Backend will analyze your Web3 repos/commits
7. If eligible, you'll see ✅ status
8. Click "Mint Priority Ticket"
9. Confirm MetaMask transaction
10. Receive soulbound NFT ticket!

### Test Spotify Verification (Concert)

1. Navigate to http://localhost:3000
2. Create or select a "Live shows" event with an artist ID
3. Click "Priority Ticket" button
4. Click "Verify Spotify for Priority Access"
5. Log in with Spotify (popup will open)
6. Backend will check if artist is in your top 10
7. If eligible, you'll see ✅ status
8. Click "Mint Priority Ticket"
9. Confirm MetaMask transaction
10. Receive soulbound NFT ticket!

---

## 🔍 Troubleshooting

### OAuth Popup Blocked
- Allow popups for localhost:3000
- Check browser console for errors

### "Invalid redirect_uri"
- Verify OAuth app callback URLs match .env settings
- Ensure no trailing slashes

### Circuit Compilation Fails
- Install circom from official docs
- Ensure you have enough RAM (>4GB recommended)

### ZK Proof Generation Fails
- Check proving keys exist in circuits directory
- Verify WASM files are compiled
- Check input format matches circuit expectations

### Contract Deployment Fails
- Ensure you have testnet ETH
- Verify RPC URL is correct
- Check hardhat.config.js network settings

### Backend API Errors
- Check .env variables are set correctly
- Verify OAuth credentials are valid
- Check backend logs for specific errors

---

## 📦 Package Requirements

### Backend
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "axios": "^1.6.0",
    "@octokit/rest": "^20.0.2",
    "spotify-web-api-node": "^5.0.2",
    "circomlibjs": "^0.1.7",
    "snarkjs": "^0.7.3"
  }
}
```

### Frontend
Already in package.json

### Circuits
```json
{
  "devDependencies": {
    "circom_tester": "^0.0.19",
    "circomlib": "^2.0.5"
  }
}
```

---

## 🎯 Next Steps

1. **Production Deployment:**
   - Register production OAuth apps
   - Deploy contracts to Monad mainnet
   - Update environment variables
   - Set up HTTPS
   - Configure rate limiting

2. **Security Audit:**
   - Review smart contracts
   - Test ZK circuits thoroughly
   - Implement rate limiting
   - Add monitoring and logging

3. **User Experience:**
   - Add loading states
   - Improve error messages
   - Add analytics tracking
   - Create user documentation

4. **Additional Features:**
   - Support for more platforms (Twitter, LinkedIn)
   - Multiple verification methods
   - Tiered priority levels
   - Transferable tickets after event

---

## 📚 Documentation

- Full implementation details: `OAUTH-ZK-IMPLEMENTATION.md`
- Smart contract docs: `contracts/README.md`
- Circuit documentation: `circuits/README.md`
- API documentation: See backend routes files

---

## 🆘 Need Help?

1. Check the troubleshooting section
2. Review environment variable configuration
3. Verify OAuth app setup
4. Check backend logs
5. Test with sample data first

---

**Setup Complete! 🎉**

You now have a fully functional OAuth + ZK priority ticket system.
