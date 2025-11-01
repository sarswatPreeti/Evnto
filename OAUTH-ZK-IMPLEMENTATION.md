# OAuth Identity Linking + ZK Eligibility Verification

## Implementation Overview

This implementation provides **automatic identity verification** for:
- **Web3 Hackathon Priority Tickets** → GitHub OAuth
- **Live Concert Priority Tickets** → Spotify OAuth

All verification happens using **OAuth tokens + Zero-Knowledge proofs** with **NO manual user input** required.

---

## 🏗️ Architecture

### Backend Components

#### 1. GitHub OAuth Routes (`/backend/src/routes/github.js`)
- `GET /api/github/auth` - Generate OAuth URL with CSRF state
- `GET /api/github/callback` - Handle OAuth callback and exchange code for token
- `POST /api/github/verify-eligibility` - Verify GitHub eligibility and generate ZK proof
- `GET /api/github/profile` - Fetch authenticated user's profile

#### 2. Spotify OAuth Routes (`/backend/src/routes/spotify.js`)
- `GET /api/spotify/auth` - Generate Spotify OAuth URL
- `GET /api/spotify/callback` - Handle OAuth callback
- `GET /api/spotify/profile` - Fetch user profile
- `GET /api/spotify/top-artists` - Fetch user's top artists
- `POST /api/spotify/verify` - Generate ZK proof for fan verification

#### 3. ZK Proof Generation (`/backend/src/routes/zk.js`)
- `POST /api/zk/github-verify` - Process GitHub data and generate eligibility proof
- Fetches public repos, languages, topics, commit counts
- Computes Web3 credibility score off-chain
- Generates ZK proof using Circom + SnarkJS

### Smart Contracts

#### EventTicket.sol (`/contracts/src/EventTicket.sol`)

**New Functions:**

```solidity
function mintPriorityTicketHackathon(
    Proof calldata proof,
    uint256[2] calldata publicSignals, // [commitment, isEligible]
    uint256 eventId,
    string memory eventTitle,
    uint256 eventDate
) external payable returns (uint256)
```

```solidity
function mintPriorityTicketConcert(
    Proof calldata proof,
    uint256[3] calldata publicSignals, // [eventId, result, nullifier]
    uint256 eventId,
    string memory eventTitle,
    uint256 eventDate
) external payable returns (uint256)
```

**Features:**
- ✅ Groth16 ZK proof verification
- ✅ Prevents double minting via commitment/nullifier
- ✅ Soulbound tickets (locked until event date)
- ✅ Priority tier with on-chain metadata
- ✅ Withdrawal and admin functions

### Circom Circuits

#### 1. GitHub Eligibility (`/circuits/github_eligibility.circom`)
```circom
template GitHubEligibility(minRepos, minCommits)
```
- **Private Inputs:** githubId, web3RepoCount, web3CommitCount, salt
- **Public Outputs:** commitment (Poseidon hash), isEligible (boolean)
- **Logic:** User eligible if ≥1 Web3 repo OR ≥10 Web3 commits

#### 2. Spotify Fan Verification (`/circuits/spotify_fan_verification.circom`)
```circom
template SpotifyFanVerification(topN)
```
- **Private Inputs:** artistHash, topArtistsHashes[10], userSpotifyIdHash
- **Public Inputs:** eventId
- **Public Outputs:** result (1 if fan), nullifier (prevents double claims)
- **Logic:** Checks if event artist is in user's top N artists

### Frontend Components

#### 1. OAuth Verification Component (`/components/oauth-verification.tsx`)
- Displays GitHub/Spotify verification buttons based on event category
- Opens OAuth popup windows
- Listens for callback messages
- Calls backend verification endpoints
- Shows eligibility status with stats

#### 2. Priority Ticket Modal (`/components/priority-ticket-modal.tsx`)
- Multi-step modal: verify → mint → processing → success/error
- Integrates `OAuthVerification` component
- Formats ZK proof for Solidity contract
- Calls `mintPriorityTicketHackathon` or `mintPriorityTicketConcert`
- Shows transaction status and POAP benefits

#### 3. OAuth Callback Pages
- `/app/auth/github/callback/page.tsx` - Receives GitHub OAuth callback
- `/app/auth/spotify/callback/page.tsx` - Receives Spotify OAuth callback
- Both pages send token to parent window via `postMessage` and auto-close

---

## 🔐 Security Features

### OAuth Security
- ✅ CSRF protection via random state parameter
- ✅ State validation on callback
- ✅ Short-lived access tokens (never stored long-term)
- ✅ Tokens cleared after proof generation
- ✅ HTTPS required in production

### Zero-Knowledge Privacy
- ✅ **No raw GitHub/Spotify data stored**
- ✅ **No identity leaks on-chain**
- ✅ Private data hashed with Poseidon before proof generation
- ✅ Only eligibility boolean visible on-chain
- ✅ Commitment/nullifier prevents double minting

### Smart Contract Security
- ✅ ReentrancyGuard on mint functions
- ✅ Commitment/nullifier validation
- ✅ Soulbound tokens (prevents resale before event)
- ✅ Owner-only admin functions
- ✅ Withdrawal protection

---

## 🚀 Usage Flow

### GitHub (Hackathons)

1. **User clicks "Verify GitHub for Priority Access"**
2. Frontend requests OAuth URL from `/api/github/auth`
3. User logs into GitHub OAuth popup
4. GitHub redirects to `/auth/github/callback?access_token=...`
5. Callback page sends token to parent window via `postMessage`
6. Frontend calls `/api/github/verify-eligibility` with token
7. Backend:
   - Fetches user's repos via GitHub API
   - Counts Web3-related repos/commits
   - Generates ZK proof with Circom
   - Returns `{ proof, publicSignals, isEligible }`
8. Frontend shows ✅ Eligible or ❌ Not Eligible
9. User clicks "Mint Priority Ticket"
10. Frontend calls `EventTicket.mintPriorityTicketHackathon(proof, publicSignals, ...)`
11. Smart contract verifies proof and mints soulbound NFT

### Spotify (Concerts)

1. **User clicks "Verify Spotify for Priority Access"**
2. Frontend requests OAuth URL from `/api/spotify/auth`
3. User logs into Spotify OAuth popup
4. Spotify redirects to `/auth/spotify/callback?access_token=...`
5. Callback page sends token to parent window
6. Frontend calls `/api/spotify/profile` to get user ID
7. Frontend calls `/api/spotify/verify` with token + artistId + eventId
8. Backend:
   - Fetches user's top artists via Spotify API
   - Checks if event artist is in top N
   - Generates ZK proof with Circom
   - Returns `{ proof, publicSignals, artistFound }`
9. Frontend shows ✅ Top Fan or ❌ Not in Top Artists
10. User clicks "Mint Priority Ticket"
11. Frontend calls `EventTicket.mintPriorityTicketConcert(proof, publicSignals, ...)`
12. Smart contract verifies proof and mints soulbound NFT

---

## 📦 Environment Variables

### Backend (.env)
```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:4000/api/github/callback

# Spotify OAuth
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:4000/api/spotify/callback

# Frontend URL
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:4000
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_EVENT_TICKET_CONTRACT=0x... # Deployed contract address
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id
```

---

## 🧪 Testing

### Manual Testing Steps

1. **Start Backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   npm install
   npm run dev
   ```

3. **Test GitHub OAuth:**
   - Navigate to a hackathon event
   - Click "Verify GitHub for Priority Access"
   - Log in with GitHub account that has Web3 repos
   - Verify eligibility status shows correctly
   - Mint priority ticket

4. **Test Spotify OAuth:**
   - Navigate to a concert event
   - Click "Verify Spotify for Priority Access"
   - Log in with Spotify account
   - Verify fan status shows correctly
   - Mint priority ticket

### Circuit Testing
```bash
cd circuits
npm install
# Compile circuits
circom github_eligibility.circom --r1cs --wasm --sym
circom spotify_fan_verification.circom --r1cs --wasm --sym

# Generate proving keys (requires Powers of Tau ceremony)
snarkjs groth16 setup github_eligibility.r1cs pot_final.ptau github_eligibility.zkey
```

### Smart Contract Testing
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test
```

---

## 🔄 Data Flow

### GitHub Verification
```
User → OAuth → GitHub API → Backend
                              ↓
                        Fetch repos/commits
                              ↓
                      Compute eligibility
                              ↓
                    Generate ZK proof (Circom)
                              ↓
                        Frontend receives
                         { proof, publicSignals }
                              ↓
                      Smart Contract verifies
                              ↓
                       Mint Priority NFT
```

### Spotify Verification
```
User → OAuth → Spotify API → Backend
                               ↓
                        Fetch top artists
                               ↓
                       Check if artist match
                               ↓
                    Generate ZK proof (Circom)
                               ↓
                        Frontend receives
                         { proof, publicSignals }
                               ↓
                      Smart Contract verifies
                               ↓
                       Mint Priority NFT
```

---

## 📝 API Endpoints

### GitHub
- `GET /api/github/auth` - Get OAuth URL
- `GET /api/github/callback` - OAuth callback
- `POST /api/github/verify-eligibility` - Verify & generate proof
- `GET /api/github/profile` - Get user profile

### Spotify
- `GET /api/spotify/auth` - Get OAuth URL
- `GET /api/spotify/callback` - OAuth callback
- `GET /api/spotify/profile` - Get user profile
- `GET /api/spotify/top-artists` - Get top artists
- `POST /api/spotify/verify` - Verify & generate proof

### ZK Proofs
- `POST /api/zk/github-verify` - GitHub eligibility verification
- `GET /api/zk/verify-commitment/:commitment` - Check if commitment used

---

## 🎯 Key Features Implemented

✅ **OAuth Integration**
- GitHub OAuth with `read:user` and `repo` scopes
- Spotify OAuth with `user-top-read` scope
- Secure state management and CSRF protection

✅ **Data Fetching**
- GitHub: Public repos, languages, topics, commit counts
- Spotify: Top N artists with privacy preservation

✅ **ZK Proof Generation**
- Circom circuits for GitHub and Spotify eligibility
- Poseidon hash for privacy
- SnarkJS proof generation

✅ **Smart Contract Integration**
- `mintPriorityTicketHackathon` with GitHub proof
- `mintPriorityTicketConcert` with Spotify proof
- Groth16 verifier integration
- Soulbound token mechanics

✅ **Frontend UI**
- OAuth verification buttons
- Eligibility status display
- Priority ticket modal
- Transaction tracking

✅ **Security**
- No raw data storage
- No identity leaks
- Short-lived tokens
- Commitment/nullifier protection

---

## 🚧 Production Deployment Checklist

- [ ] Register OAuth apps (GitHub & Spotify)
- [ ] Update environment variables with production URLs
- [ ] Deploy backend with HTTPS
- [ ] Deploy smart contracts to Monad mainnet
- [ ] Complete Powers of Tau ceremony for circuits
- [ ] Generate final proving keys
- [ ] Upload verifier contracts
- [ ] Test end-to-end flows on testnet
- [ ] Security audit smart contracts
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting
- [ ] Add Redis for state management (replace in-memory Map)

---

## 📚 Additional Resources

- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Documentation](https://github.com/iden3/snarkjs)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Spotify OAuth](https://developer.spotify.com/documentation/web-api/concepts/authorization)
- [Groth16 Verifier](https://github.com/iden3/snarkjs#groth16-verifier)

---

## 🐛 Troubleshooting

### OAuth Popup Blocked
- Ensure popup blockers are disabled
- Check browser console for errors

### ZK Proof Generation Fails
- Verify circuit compilation succeeded
- Check proving keys exist
- Ensure inputs are correctly formatted

### Smart Contract Reverts
- Check commitment/nullifier not already used
- Verify proof is valid
- Ensure sufficient ETH for transaction
- Check event date is in future

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review environment variable configuration
3. Verify OAuth app credentials
4. Check smart contract deployment addresses
5. Review backend logs for errors

---

**Implementation Status: ✅ Complete**

All components have been implemented according to the specifications. The system is ready for testing and deployment.
