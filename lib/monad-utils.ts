import { ethers } from "ethers";

// Monad Testnet configuration
export const MONAD_TESTNET_CONFIG = {
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "10143"),
  chainName: process.env.NEXT_PUBLIC_CHAIN_NAME || "Monad Testnet",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://testnet-rpc.monad.xyz",
  explorerUrl:
    process.env.NEXT_PUBLIC_EXPLORER_URL || "https://testnet.monadexplorer.com",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
};

// Contract addresses (these should be set from environment variables)
export const CONTRACT_ADDRESSES = {
  EVENT_MANAGER: process.env.NEXT_PUBLIC_EVENT_MANAGER_CONTRACT || "",
  NFT_MINTER: process.env.NEXT_PUBLIC_NFT_MINTER_CONTRACT || "",
  TOKEN_REWARDS: process.env.NEXT_PUBLIC_TOKEN_REWARDS_CONTRACT || "",
};

// Get provider for Monad testnet
export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(MONAD_TESTNET_CONFIG.rpcUrl);
}

// Get signer from MetaMask
export async function getSigner(): Promise<ethers.Signer | null> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  return await provider.getSigner();
}

// Helper function to format MON amount
export function formatMON(amount: string | number): string {
  return ethers.formatEther(amount.toString());
}

// Helper function to parse MON amount
export function parseMON(amount: string): bigint {
  return ethers.parseEther(amount);
}

// Get account balance
export async function getAccountBalance(address: string): Promise<string> {
  try {
    const provider = getProvider();
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error("Error getting balance:", error);
    return "0";
  }
}

// Send MON payment
export async function sendPayment(
  recipientAddress: string,
  amount: string,
  memo?: string
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    const signer = await getSigner();
    if (!signer) {
      throw new Error("No signer available");
    }

    const tx = {
      to: recipientAddress,
      value: parseMON(amount),
      data: memo ? ethers.hexlify(ethers.toUtf8Bytes(memo)) : "0x",
    };

    const transaction = await signer.sendTransaction(tx);
    await transaction.wait();

    return {
      success: true,
      transactionHash: transaction.hash,
    };
  } catch (error) {
    console.error("Send payment error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Contract interaction helpers - to be implemented when contracts are deployed
export class MonadContractHelper {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;

  constructor(signer?: ethers.Signer) {
    this.provider = getProvider();
    this.signer = signer;
  }

  // Placeholder methods for contract interactions
  async createEvent(
    title: string,
    description: string,
    date: number,
    location: string,
    price: string,
    maxAttendees: number
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    eventId?: number;
    error?: string;
  }> {
    console.log("Creating event on Monad Testnet:", { title, price });

    // Generate mock Ethereum-style transaction hash
    const mockTxHash =
      "0x" +
      Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");

    // This will be implemented once the contracts are deployed
    return {
      success: true,
      transactionHash: mockTxHash,
      eventId: Math.floor(Math.random() * 1000) + 1,
    };
  }

  async purchaseTicket(eventId: number): Promise<{
    success: boolean;
    transactionHash?: string;
    ticketId?: number;
    error?: string;
  }> {
    console.log("Purchasing ticket for event on Monad Testnet:", eventId);

    // Generate mock Ethereum-style transaction hash
    const mockTxHash =
      "0x" +
      Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");

    // This will be implemented once the contracts are deployed
    return {
      success: true,
      transactionHash: mockTxHash,
      ticketId: eventId * 1000 + Math.floor(Math.random() * 1000),
    };
  }

  async mintEventNFT(
    recipientAddress: string,
    eventId: number,
    name: string,
    description: string,
    imageUrl: string
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    tokenId?: number;
    error?: string;
  }> {
    console.log("Minting NFT on Monad Testnet for event:", eventId);

    // Generate mock Ethereum-style transaction hash
    const mockTxHash =
      "0x" +
      Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");

    // This will be implemented once the contracts are deployed
    return {
      success: true,
      transactionHash: mockTxHash,
      tokenId: Math.floor(Math.random() * 10000) + 1,
    };
  }

  async claimReward(eventId: number): Promise<{
    success: boolean;
    transactionHash?: string;
    rewardAmount?: string;
    error?: string;
  }> {
    console.log("Claiming reward on Monad Testnet for event:", eventId);

    // Generate mock Ethereum-style transaction hash
    const mockTxHash =
      "0x" +
      Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");

    // This will be implemented once the contracts are deployed
    return {
      success: true,
      transactionHash: mockTxHash,
      rewardAmount: "100", // 100 tokens
    };
  }
}

// Event participation functions
export async function joinEvent(
  eventId: string,
  userAddress: string,
  eventPrice: string = "0.00001"
): Promise<{
  success: boolean;
  transactionHash?: string;
  error?: string;
}> {
  try {
    console.log(
      "Joining event on Monad Testnet:",
      eventId,
      "for user:",
      userAddress,
      "with price:",
      eventPrice
    );

    // Check if MetaMask is available
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    // Get signer from MetaMask
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // Parse the price (remove " MON" if present)
    const priceString = eventPrice.replace(" MON", "").trim();
    const priceInMON =
      priceString === "Free" || priceString === "0" ? "0.00001" : priceString;

    // Create a transaction to send MON
    // In the future, this will interact with the smart contract
    // For now, we'll send MON to a dummy address (simulating payment)
    // Note: Monad doesn't allow data field when sending to EOA (wallet address)
    const tx = {
      to: userAddress, // Sending to self for now (in production, this would be the contract)
      value: parseMON(priceInMON),
      // data field removed because Monad doesn't support it for EOA transfers
    };

    console.log("Sending transaction:", tx);

    // This will trigger MetaMask popup
    const transaction = await signer.sendTransaction(tx);
    console.log("Transaction sent:", transaction.hash);

    // Wait for confirmation
    const receipt = await transaction.wait();
    console.log("Transaction confirmed:", receipt);

    return {
      success: true,
      transactionHash: transaction.hash,
    };
  } catch (error) {
    console.error("Error joining event:", error);

    // Handle user rejection
    if (error instanceof Error) {
      if (error.message.includes("user rejected")) {
        return {
          success: false,
          error: "Transaction rejected by user",
        };
      }
      if (error.message.includes("insufficient funds")) {
        return {
          success: false,
          error: "Insufficient MON balance for transaction",
        };
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// User NFT functions
export async function getUserNFTs(userAddress: string): Promise<any[]> {
  try {
    console.log("Getting NFTs for user on Monad:", userAddress);

    // This will be implemented once the contracts are deployed
    // For now, return mock NFT data
    return [
      {
        id: "1",
        name: "Event Attendance NFT #1",
        description: "Proof of attendance for event",
        image: "/nft-placeholder.png",
        eventName: "Monad Workshop",
        eventDate: "2025-10-31",
        contractAddress: "0x...",
      },
    ];
  } catch (error) {
    console.error("Error getting user NFTs:", error);
    return [];
  }
}

// Utility functions
export function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function isValidAddress(address: string): boolean {
  try {
    ethers.getAddress(address);
    return true;
  } catch {
    return false;
  }
}

export function getExplorerUrl(txHash: string): string {
  return `${MONAD_TESTNET_CONFIG.explorerUrl}/tx/${txHash}`;
}

export function getAddressExplorerUrl(address: string): string {
  return `${MONAD_TESTNET_CONFIG.explorerUrl}/address/${address}`;
}
