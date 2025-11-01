# Spotify ZK Verification Setup Guide

This guide walks through the complete setup of the Spotify-based Zero-Knowledge proof system for Live Concert priority tickets.

## Overview

The Spotify ZK system allows fans to prove they're top listeners of an artist without revealing their listening history or Spotify account details. This enables privacy-preserving priority ticket distribution for concerts.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Spotify   │─────▶│   Backend    │─────▶│  ZK Circuit │
│    OAuth    │      │  API Server  │      │   (Circom)  │
└─────────────┘      └──────────────┘      └─────────────┘
                            │                      │
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐      ┌─────────────┐
                     │   Frontend   │      │  Blockchain │
                     │   Component  │      │  (Monad EVM)│
                     └──────────────┘      └─────────────┘
```

## Prerequisites

- Node.js 18+ and npm/pnpm
- Spotify Developer Account
- Circom 2.0+ installed
- SnarkJS installed globally: `npm install -g snarkjs`
- Powers of Tau file (ceremony)
- MetaMask or compatible Web3 wallet
- Access to Monad testnet

## Step 1: Spotify Developer Setup

### 1.1 Create Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create an App"
4. Fill in app details:
   - **App Name**: Evnto Spotify Verification
   - **App Description**: Zero-knowledge proof verification for concert fans
   - **Website**: Your app URL
   - **Redirect URI**: `http://localhost:4000/api/spotify/callback` (development)
   - **Redirect URI**: `https://your-api.com/api/spotify/callback` (production)
5. Accept terms and create
6. Note your **Client ID** and **Client Secret**

### 1.2 Configure OAuth Settings

1. In your app dashboard, click "Edit Settings"
2. Add redirect URIs for all environments:
   ```
   http://localhost:4000/api/spotify/callback
   http://localhost:3000/spotify-callback
   https://your-api-domain.com/api/spotify/callback
   https://your-frontend-domain.com/spotify-callback
   ```
3. Save settings

## Step 2: Environment Variables

### 2.1 Backend (.env)

Create or update `backend/.env`:

```env
# Spotify OAuth
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:4000/api/spotify/callback

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:3000

# MongoDB (existing)
DB_URL=your_mongodb_connection_string

# Server
PORT=4000
```

### 2.2 Frontend (.env.local)

Create or update `frontend/.env.local`:

```env
# API Base URL
NEXT_PUBLIC_API_URL=http://localhost:4000

# Spotify (for frontend reference)
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id_here

# ConcertTicket Contract Address (after deployment)
NEXT_PUBLIC_CONCERT_TICKET_CONTRACT=0x...
```

## Step 3: Install Dependencies

### 3.1 Backend Dependencies

```bash
cd backend
npm install
# This will install spotify-web-api-node and all other dependencies
```

### 3.2 Frontend Dependencies

```bash
cd ..
pnpm install
# All UI dependencies should already be installed
```

## Step 4: Circuit Compilation

### 4.1 Download Powers of Tau

If you don't have a Powers of Tau file:

```bash
cd circuits
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_16.ptau
```

### 4.2 Compile Spotify Circuit

```bash
# Compile the circuit
circom spotify_fan_verification.circom --r1cs --wasm --sym -o ./

# Generate witness calculation files
cd spotify_fan_verification_js
node generate_witness.js spotify_fan_verification.wasm ../input.json ../witness.wtns
cd ..
```

### 4.3 Trusted Setup

```bash
# Setup with Powers of Tau
snarkjs groth16 setup spotify_fan_verification.r1cs powersOfTau28_hez_final_16.ptau spotify_fan_verification_0000.zkey

# Contribute to ceremony (adds randomness)
snarkjs zkey contribute spotify_fan_verification_0000.zkey spotify_fan_verification_0001.zkey --name="First contribution" -v

# Beacon (final step)
snarkjs zkey beacon spotify_fan_verification_0001.zkey spotify_fan_verification.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"

# Export verification key
snarkjs zkey export verificationkey spotify_fan_verification.zkey verification_key.json

# Generate Solidity verifier
snarkjs zkey export solidityverifier spotify_fan_verification.zkey SpotifyVerifier.sol

# Move the generated verifier to contracts
mv SpotifyVerifier.sol ../contracts/src/SpotifyVerifier.sol
```

## Step 5: Smart Contract Deployment

### 5.1 Update Deployment Script

Create `contracts/scripts/deploy-spotify.js`:

```javascript
const hre = require("hardhat");

async function main() {
  console.log("Deploying Spotify ZK contracts...");

  // Deploy SpotifyVerifier
  const SpotifyVerifier = await hre.ethers.getContractFactory("SpotifyVerifier");
  const verifier = await SpotifyVerifier.deploy();
  await verifier.deployed();
  console.log("SpotifyVerifier deployed to:", verifier.address);

  // Deploy ConcertTicket
  const ConcertTicket = await hre.ethers.getContractFactory("ConcertTicket");
  const concertTicket = await ConcertTicket.deploy(verifier.address);
  await concertTicket.deployed();
  console.log("ConcertTicket deployed to:", concertTicket.address);

  // Verification info
  console.log("\n📝 Add these to your .env:");
  console.log(`NEXT_PUBLIC_SPOTIFY_VERIFIER_CONTRACT=${verifier.address}`);
  console.log(`NEXT_PUBLIC_CONCERT_TICKET_CONTRACT=${concertTicket.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 5.2 Deploy to Monad Testnet

```bash
cd contracts
npm install
npx hardhat run scripts/deploy-spotify.js --network monad-testnet
```

### 5.3 Update Environment Variables

Add the deployed contract addresses to your `.env.local`:

```env
NEXT_PUBLIC_SPOTIFY_VERIFIER_CONTRACT=0x...
NEXT_PUBLIC_CONCERT_TICKET_CONTRACT=0x...
```

## Step 6: Backend Setup

### 6.1 Start Backend Server

```bash
cd backend
npm run dev
```

The server should start on `http://localhost:4000`

### 6.2 Test Endpoints

Test that Spotify routes are working:

```bash
# Test auth endpoint
curl http://localhost:4000/api/spotify/auth

# Expected response:
# {"success":true,"authUrl":"https://accounts.spotify.com/authorize?...","state":"..."}
```

## Step 7: Frontend Integration

### 7.1 Update Event Details Page

In your event details page (e.g., `app/event/[id]/page.tsx`), add the Spotify verification component:

```tsx
import SpotifyFanVerification from '@/components/spotify-fan-verification';

// In your component:
{event.category === "Live shows" && (
  <SpotifyFanVerification
    eventId={event.contractEventId}
    artistId="3TVXtAsR1Inumwj472S9r4" // Artist's Spotify ID
    artistName={event.artistName || "Artist"}
    eventTitle={event.title}
    eventDate={Math.floor(new Date(event.date).getTime() / 1000)}
    contractAddress={process.env.NEXT_PUBLIC_CONCERT_TICKET_CONTRACT!}
    onSuccess={() => {
      console.log("Priority ticket minted!");
      // Refresh event data
    }}
  />
)}
```

### 7.2 Start Frontend

```bash
pnpm dev
```

The app should start on `http://localhost:3000`

## Step 8: Testing the Full Flow

### 8.1 Test Spotify Authentication

1. Navigate to an event with category "Live shows"
2. Click "Connect with Spotify"
3. Authorize the app in Spotify
4. You should be redirected back with your top artists displayed

### 8.2 Test Proof Generation

1. After authentication, click "Generate ZK Proof"
2. Check backend logs for proof generation:
   ```
   Generating Spotify ZK proof with inputs: { artistHash: '...', topArtistsCount: 10, eventId: '1' }
   Spotify ZK proof generated successfully
   ```

### 8.3 Test NFT Minting

1. Click "Mint Priority Ticket"
2. Approve MetaMask transaction
3. Wait for confirmation
4. Check your wallet for the NFT
5. View transaction on Monad explorer

## Troubleshooting

### Spotify OAuth Issues

**Problem**: "Redirect URI mismatch" error

**Solution**: 
- Ensure redirect URIs in Spotify dashboard match exactly
- Check SPOTIFY_REDIRECT_URI in backend .env
- Verify no trailing slashes

**Problem**: "Invalid client" error

**Solution**:
- Verify SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET
- Ensure credentials are from the correct Spotify app
- Check for extra spaces in .env values

### Circuit Compilation Issues

**Problem**: "Error: Cannot find module 'circomlib'"

**Solution**:
```bash
npm install -g circomlib
```

**Problem**: Powers of Tau file not found

**Solution**:
```bash
cd circuits
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_16.ptau
```

### Proof Generation Issues

**Problem**: "Failed to generate proof" error

**Solution**:
- Ensure circuit files exist in correct locations:
  - `circuits/spotify_fan_verification_js/spotify_fan_verification.wasm`
  - `circuits/spotify_fan_verification.zkey`
- Check circuit compilation completed successfully
- Verify input format matches circuit expectations

**Problem**: "User is not a top fan" error

**Solution**:
- This is expected behavior if user hasn't listened to the artist
- For testing, use artist IDs from your own top artists:
  - Connect to Spotify
  - Check `/api/spotify/top-artists` response
  - Use one of those artist IDs for testing

### Smart Contract Issues

**Problem**: "Invalid proof" when minting

**Solution**:
- Ensure SpotifyVerifier.sol was generated from the same circuit
- Verify circuit compilation → trusted setup → verifier export sequence
- Check that verifier contract address matches the one used in ConcertTicket

**Problem**: "Proof already used" error

**Solution**:
- This is expected - each proof can only be used once
- Nullifier prevents double-claiming
- Use a different event ID or generate a new proof

## Security Considerations

1. **Never commit .env files** - Keep credentials secret
2. **Rotate Spotify credentials** - Periodically update client secret
3. **Rate limiting** - Add rate limiting to /api/spotify/* endpoints
4. **Input validation** - Validate all inputs before proof generation
5. **Circuit auditing** - Have circuits audited before mainnet deployment

## Production Deployment

### Railway/Render Backend

1. Add environment variables in dashboard:
   - SPOTIFY_CLIENT_ID
   - SPOTIFY_CLIENT_SECRET
   - SPOTIFY_REDIRECT_URI (use production URL)
   - FRONTEND_URL (use production URL)

2. Ensure circuit files are included in deployment:
   - Add to git or upload manually
   - Verify paths in code match deployment structure

### Vercel Frontend

1. Add environment variables:
   - NEXT_PUBLIC_API_URL
   - NEXT_PUBLIC_CONCERT_TICKET_CONTRACT
   - NEXT_PUBLIC_SPOTIFY_VERIFIER_CONTRACT

2. Update Spotify redirect URIs to include production URLs

## Additional Resources

- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Documentation](https://github.com/iden3/snarkjs)
- [Zero-Knowledge Proofs Overview](https://en.wikipedia.org/wiki/Zero-knowledge_proof)

## Support

For issues or questions:
- Check existing GitHub issues
- Review error logs in backend console
- Test individual components (OAuth → Proof → Minting)
- Verify environment variables are set correctly

---

**Note**: This is a development guide. For production deployment, implement additional security measures, error handling, and monitoring.
