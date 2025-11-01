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

// Monad Testnet configuration
const MONAD_TESTNET = {
  chainId: `0x${parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "10143").toString(
    16
  )}`, // Convert to hex
  chainName: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: ["https://testnet-rpc.monad.xyz"],
  blockExplorerUrls: ["https://testnet.monadexplorer.com/"],
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
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
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

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener(
            "accountsChanged",
            handleAccountsChanged
          );
          window.ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, [walletState.address]);

  const checkExistingConnection = async () => {
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts.length > 0) {
          const chainId = await window.ethereum.request({
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
        }
      }
    } catch (error) {
      console.error("Error checking existing connection:", error);
    }
  };

  const connectWallet = async (): Promise<boolean> => {
    if (!window.ethereum) {
      setWalletState((prev) => ({
        ...prev,
        error:
          "MetaMask is not installed. Please install MetaMask to use this feature.",
      }));
      return false;
    }

    setWalletState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        throw new Error("No accounts returned from MetaMask");
      }

      const chainId = await window.ethereum.request({ method: "eth_chainId" });

      setWalletState((prev) => ({
        ...prev,
        isConnected: true,
        walletName: "MetaMask",
        address: accounts[0],
        chainId: parseInt(chainId, 16),
        isLoading: false,
      }));

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
    if (!window.ethereum) return false;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: MONAD_TESTNET.chainId }],
      });
      return true;
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
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

  const disconnectWallet = () => {
    setWalletState({
      isConnected: false,
      walletName: "",
      address: "",
      balance: "0",
      chainId: null,
      isLoading: false,
      error: null,
    });
  };

  const refreshBalance = async () => {
    if (!walletState.address || !window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
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
