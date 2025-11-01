"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { ethers } from "ethers";

interface WalletState {
  isConnected: boolean;
  walletName: string;
  address: string;
  balance: string;
  chainId: number | null;
  isLoading: boolean;
  error: string | null;
}

interface WalletContextType extends WalletState {
  connectWallet: () => Promise<boolean>;
  disconnectWallet: () => void;
  refreshBalance: () => Promise<void>;
  switchToMonad: () => Promise<boolean>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

interface WalletProviderProps {
  children: ReactNode;
}

// Monad Testnet configuration - using environment variables
const MONAD_TESTNET = {
  chainId: `0x${parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "10143").toString(
    16
  )}`, // Convert to hex
  chainName: process.env.NEXT_PUBLIC_CHAIN_NAME || "Monad Testnet",
  nativeCurrency: {
    name: process.env.NEXT_PUBLIC_NATIVE_TOKEN_NAME || "Monad",
    symbol: process.env.NEXT_PUBLIC_NATIVE_TOKEN_SYMBOL || "MON",
    decimals: parseInt(process.env.NEXT_PUBLIC_NATIVE_TOKEN_DECIMALS || "18"),
  },
  rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL || "https://testnet-rpc.monad.xyz"],
  blockExplorerUrls: [
    process.env.NEXT_PUBLIC_EXPLORER_URL ||
      "https://testnet.monadexplorer.com/",
  ],
};

export function WalletProvider({ children }: WalletProviderProps) {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    walletName: "",
    address: "",
    balance: "0",
    chainId: null,
    isLoading: false,
    error: null,
  });

  // Check for existing wallet connection on app start
  useEffect(() => {
    checkExistingConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // Clear connection preference when MetaMask disconnects
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("walletConnectedThisSession");
          }
          disconnectWallet();
        } else if (accounts[0] !== walletState.address) {
          setWalletState((prev) => ({ ...prev, address: accounts[0] }));
          refreshBalance();
        }
      };

      const handleChainChanged = (chainId: string) => {
        setWalletState((prev) => ({ ...prev, chainId: parseInt(chainId, 16) }));
        refreshBalance();
      };

      (window as any).ethereum.on("accountsChanged", handleAccountsChanged);
      (window as any).ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if ((window as any).ethereum) {
          (window as any).ethereum.removeListener(
            "accountsChanged",
            handleAccountsChanged
          );
          (window as any).ethereum.removeListener(
            "chainChanged",
            handleChainChanged
          );
        }
      };
    }
  }, [walletState.address]);

  const checkExistingConnection = async () => {
    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        // Only auto-connect if user connected in this session
        const connectedThisSession = sessionStorage.getItem(
          "walletConnectedThisSession"
        );
        if (!connectedThisSession) return;

        const accounts = await (window as any).ethereum.request({
          method: "eth_accounts",
        });
        if (accounts.length > 0) {
          const chainId = await (window as any).ethereum.request({
            method: "eth_chainId",
          });
          setWalletState((prev) => ({
            ...prev,
            isConnected: true,
            walletName: "MetaMask",
            address: accounts[0],
            chainId: parseInt(chainId, 16),
          }));
          await refreshBalance();
        } else {
          // If no accounts but was previously connected, clear the flag
          sessionStorage.removeItem("walletConnectedThisSession");
        }
      }
    } catch (error) {
      console.error("Error checking existing connection:", error);
      // Clear connection flag on error
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("walletConnectedThisSession");
      }
    }
  };

  const connectWallet = async (): Promise<boolean> => {
    if (!(window as any).ethereum) {
      setWalletState((prev) => ({
        ...prev,
        error:
          "MetaMask is not installed. Please install MetaMask to use this feature.",
      }));
      return false;
    }

    setWalletState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // This will prompt MetaMask to open
      const accounts = await (window as any).ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        throw new Error("No accounts returned from MetaMask");
      }

      const chainId = await (window as any).ethereum.request({
        method: "eth_chainId",
      });

      setWalletState((prev) => ({
        ...prev,
        isConnected: true,
        walletName: "MetaMask",
        address: accounts[0],
        chainId: parseInt(chainId, 16),
        isLoading: false,
      }));

      // Store connection preference for this session only
      sessionStorage.setItem("walletConnectedThisSession", "true");

      await refreshBalance();

      // Check if user is on Monad testnet, if not suggest switching
      if (
        parseInt(chainId, 16) !==
        parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "10143")
      ) {
        await switchToMonad();
      }

      return true;
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      setWalletState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || "Failed to connect wallet",
      }));
      return false;
    }
  };

  const switchToMonad = async (): Promise<boolean> => {
    if (!(window as any).ethereum) return false;

    try {
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: MONAD_TESTNET.chainId }],
      });
      return true;
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: "wallet_addEthereumChain",
            params: [MONAD_TESTNET],
          });
          return true;
        } catch (addError) {
          console.error("Error adding Monad network:", addError);
          return false;
        }
      } else {
        console.error("Error switching to Monad network:", switchError);
        return false;
      }
    }
  };

  const disconnectWallet = async () => {
    try {
      // Clear local state
      setWalletState({
        isConnected: false,
        walletName: "",
        address: "",
        balance: "0",
        chainId: null,
        isLoading: false,
        error: null,
      });

      // Clear session storage so it won't auto-connect
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("walletConnectedThisSession");
      }
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  };

  const refreshBalance = async () => {
    if (!walletState.address || !(window as any).ethereum) return;

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const balance = await provider.getBalance(walletState.address);
      const balanceInEth = ethers.formatEther(balance);

      setWalletState((prev) => ({
        ...prev,
        balance: parseFloat(balanceInEth).toFixed(4),
      }));
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const value: WalletContextType = {
    ...walletState,
    connectWallet,
    disconnectWallet,
    refreshBalance,
    switchToMonad,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
