# Zero-Knowledge Priority Ticket System

## 🎯 Overview

A privacy-preserving ticketing system that allows **Web3 contributors** to mint **priority event tickets** without revealing their identity. Uses **Zero-Knowledge Proofs** to verify GitHub contributions on-chain while keeping all personal data off-chain.

## ✨ Key Features

- **🔐 Privacy-First**: Identity stays private using ZK-SNARKs (Groth16)
- **🎫 Priority Access**: Web3 contributors get early/discounted tickets
- **🔒 Soulbound NFTs**: Tickets locked until event date
- **⚡ Monad-Optimized**: Fast, low-cost verification on Monad EVM
- **🛡️ Double-Mint Protection**: Commitment-based uniqueness

---

## 🏗️ Architecture

```
┌─────────────────┐
│  GitHub OAuth   │
│  (Off-chain)    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Backend API    │ ← Fetch repos, commits
│  /zk/github     │   Count Web3 activity
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Circom Circuit │ ← Generate ZK proof
│  (Poseidon Hash)│   web3_score ≥ threshold
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Smart Contract │ ← Verify proof on-chain
│  EventTicket.sol│   Mint NFT if valid
└─────────────────┘
```

---

## 🚀 Setup Guide

### Prerequisites

```bash
# Required tools
Node.js 18+
Rust (for Circom)
Circom 2.0+
SnarkJS
Hardhat
```

### 1. Install Dependencies

```bash
# Root project
npm install

# Backend
cd backend
npm install

# Circuits
cd ../circuits
npm install

# Contracts
cd ../contracts
npm install
```

### 2. Download Powers of Tau

```bash
cd circuits
# Download trusted setup file (12th power = 2^12 constraints)
curl -O https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau
```

### 3. Compile Circuit

```bash
cd circuits
npm run compile
```

This generates:
- `build/github_eligibility.r1cs` - Constraint system
- `build/github_eligibility.wasm` - Witness generator
- `build/github_eligibility.sym` - Symbols

### 4. Setup Ceremony (Trusted Setup)

```bash
npm run setup
npm run contribute
npm run export-vkey
npm run export-verifier
```

This generates:
- `build/github_eligibility_final.zkey` - Proving key
- `build/verification_key.json` - Verification key
- `contracts/src/Verifier.sol` - Solidity verifier

### 5. Deploy Smart Contracts

```bash
cd ../contracts

# Update hardhat.config.js with Monad RPC
# Add your private key to .env

npx hardhat run scripts/deploy-zk-tickets.js --network monad-testnet
```

Save the deployed addresses:
- `Verifier.sol` address
- `EventTicket.sol` address

### 6. Configure Environment

Create `.env.local` in project root:

```env
# GitHub OAuth (create app at github.com/settings/developers)
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Contract addresses (from deployment)
NEXT_PUBLIC_VERIFIER_ADDRESS=0x...
NEXT_PUBLIC_EVENT_TICKET_ADDRESS=0x...

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

# MongoDB (existing)
DATABASE_URL=mongodb://...
```

### 7. Start Services

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
npm run dev
```

---

## 📖 Usage Flow

### For Event Attendees

1. **Navigate to Event Page**
   ```
   Visit event detail page → See "Priority Ticket" option
   ```

2. **Click "Verify GitHub (ZK)"**
   ```
   → Redirects to GitHub OAuth
   → Authorize app (read:user, repo scopes)
   ```

3. **Automatic Verification**
   ```
   Backend:
   ✅ Fetch user repos
   ✅ Count Web3 repos (Solidity, blockchain topics)
   ✅ Count Web3 commits
   ✅ Generate ZK proof
   
   Frontend:
   ✅ Display eligibility status
   ✅ Show proof commitment
   ```

4. **Mint Priority Ticket**
   ```
   If eligible:
   → Click "Mint Priority Ticket"
   → MetaMask popup (0.01 ETH + gas)
   → Transaction confirmed
   → NFT minted 🎉
   ```

### For Event Organizers

No changes needed! Priority tickets use the same `EventTicket` contract. Standard flow:

```solidity
// Create event
eventTicket.mintStandardTicket(eventId, title, date);
```

---

## 🔍 Eligibility Criteria

Users qualify if **either**:

```
✅ Has ≥ 1 repository with Web3 topics/languages
   Topics: solidity, web3, blockchain, smart-contract, etc.
   Languages: Solidity, Rust (Move)

OR

✅ Has ≥ 10 commits in Web3-related repositories
```

**Privacy Guarantee:**
- ❌ Username not revealed
- ❌ Repo names not revealed
- ❌ Exact stats not revealed
- ✅ Only `isEligible` boolean revealed

---

## 🔐 Security Features

### 1. **Double-Mint Prevention**

```solidity
mapping(bytes32 => bool) public usedCommitments;

// Each GitHub user gets unique commitment
commitment = Poseidon(githubId, salt)

// Can only mint once per commitment
require(!usedCommitments[commitment], "Already used");
```

### 2. **Soulbound Tickets**

```solidity
struct Ticket {
    bool isSoulbound;
    uint256 eventDate;
}

// Cannot transfer before event
function _update() {
    if (isSoulbound) {
        require(block.timestamp >= eventDate, "Locked");
    }
}
```

### 3. **ZK Proof Validation**

```solidity
function mintPriorityTicketHackathon(
    Proof calldata proof,
    uint256[2] calldata publicSignals
) {
    // Verify proof on-chain
    bool isValid = verifier.verifyProof(
        proof.a, proof.b, proof.c, publicSignals
    );
    
    require(isValid, "Invalid proof");
    require(publicSignals[1] == 1, "Not eligible");
}
```

---

## 🧪 Testing

### Test Circuit

```bash
cd circuits
node scripts/generate-proof.js
```

Output:
```
Test 1: Eligible user (2 repos) → ✅ Proof valid
Test 2: Eligible user (15 commits) → ✅ Proof valid
Test 3: Ineligible user → ❌ isEligible = 0
```

### Test Backend

```bash
cd backend
npm test

# Or manual test:
curl -X POST http://localhost:3001/api/zk/github-verify \
  -H "Content-Type: application/json" \
  -d '{"githubToken": "ghp_...", "eventId": "123"}'
```

### Test Frontend

```bash
# Visit page
http://localhost:3000/event/create?type=hackathon

# Click "Verify GitHub (ZK)"
# Check console for proof generation
```

---

## 📊 Gas Costs (Monad)

| Operation | Estimated Gas | Cost (at 10 Gwei) |
|-----------|---------------|-------------------|
| ZK Proof Verification | ~500,000 | 0.005 ETH |
| Mint Priority Ticket | ~150,000 | 0.0015 ETH |
| **Total** | **~650,000** | **~0.0065 ETH** |

On Monad (1 Ggas/s), this is **< $0.01** per ticket!

---

## 🎨 UI Component Usage

```tsx
import ZKPriorityTicket from '@/components/zk-priority-ticket';

<ZKPriorityTicket
  eventId="hackathon-2024"
  eventTitle="Monad Blitz Delhi"
  eventDate={1735689600} // Unix timestamp
  contractAddress="0x..."
  onSuccess={(tokenId) => {
    console.log('Ticket minted:', tokenId);
  }}
/>
```

---

## 🔧 Configuration

### Adjust Thresholds

Edit `circuits/github_eligibility.circom`:

```circom
// Current: minRepos = 1, minCommits = 10
component main = GitHubEligibility(1, 10);

// Higher threshold:
component main = GitHubEligibility(3, 20);
```

Then re-compile and re-deploy.

### Add More Web3 Topics

Edit `backend/src/routes/zk.js`:

```javascript
const WEB3_TOPICS = [
  'solidity', 'web3', 'blockchain',
  // Add yours:
  'monad', 'zk-proof', 'layer2'
];
```

---

## 📚 API Reference

### `POST /api/zk/github-verify`

**Request:**
```json
{
  "githubToken": "ghp_xxxxx",
  "eventId": "event-123"
}
```

**Response:**
```json
{
  "success": true,
  "proof": { "pi_a": [...], "pi_b": [...], "pi_c": [...] },
  "publicSignals": ["12345...", "1"],
  "commitment": "12345...",
  "isEligible": true,
  "stats": {
    "web3RepoCount": 3,
    "web3CommitCount": 25
  },
  "message": "You are eligible!"
}
```

### `GET /api/zk/verify-commitment/:commitment`

Check if commitment already used:

```json
{
  "commitment": "12345...",
  "isUsed": false
}
```

---

## 🐛 Troubleshooting

### Circuit Compilation Fails

```bash
# Install Circom
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
sudo cp target/release/circom /usr/local/bin/
```

### "Invalid proof" on Contract

1. Ensure Verifier.sol is up-to-date:
   ```bash
   cd circuits
   npm run export-verifier
   ```

2. Check proof format matches contract expectations

3. Verify public signals are correct:
   ```javascript
   console.log('publicSignals:', publicSignals);
   // Should be: [commitment, isEligible]
   ```

### GitHub API Rate Limit

GitHub has rate limits:
- Authenticated: 5,000 requests/hour
- Consider caching results
- Use GraphQL API for better efficiency

---

## 🚀 Production Checklist

- [ ] Generate production ZK keys with multiple contributors
- [ ] Deploy Verifier.sol to mainnet
- [ ] Set up GitHub OAuth app (production URL)
- [ ] Configure CORS for production domain
- [ ] Add rate limiting to `/zk/github-verify`
- [ ] Implement proper GitHub token exchange (OAuth flow)
- [ ] Set up monitoring for proof generation failures
- [ ] Test with real GitHub accounts
- [ ] Add analytics for eligibility rates
- [ ] Document for users

---

## 📄 License

MIT

---

## 🙏 Credits

- **Circom** - ZK circuit language
- **SnarkJS** - ZK proof generation
- **Groth16** - ZK proof system
- **Monad** - High-performance EVM blockchain
- **GitHub API** - Developer data source

---

## 📞 Support

Issues? Create a GitHub issue or contact the team.

**Built with ❤️ for Web3 Hackathons**
