# Evnto Smart Contracts

This directory contains the Solidity smart contracts for the Evnto event management platform on Monad chain.

## Contracts

### EventManager.sol
- Main contract for creating and managing events
- Handles ticket sales and attendee verification
- Collects platform fees

### EventNFT.sol
- ERC721 contract for minting event attendance certificates
- Provides proof of attendance as NFTs
- Supports batch minting for events

### EventRewardToken.sol
- ERC20 token for rewarding event participation
- Rewards attendees and organizers
- Has maximum supply cap

## Deployment

To deploy these contracts on Monad testnet:

1. Install dependencies:
```bash
npm install @openzeppelin/contracts
```

2. Compile contracts:
```bash
npx hardhat compile
```

3. Deploy to Monad testnet:
```bash
npx hardhat run scripts/deploy.js --network monad-testnet
```

## Environment Variables

Add these to your `.env` file:
```
PRIVATE_KEY=your_private_key
MONAD_RPC_URL=https://rpc.ankr.com/monad_testnet
```

## Contract Addresses

After deployment, update the contract addresses in:
- `.env` file
- Frontend configuration