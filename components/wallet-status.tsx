"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Wallet,
  Copy,
  ExternalLink,
  LogOut,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";

interface WalletStatusProps {
  onConnect: () => void;
}

export function WalletStatus({ onConnect }: WalletStatusProps) {
  const {
    isConnected,
    walletName,
    address,
    balance,
    chainId,
    isLoading,
    disconnectWallet,
    refreshBalance,
    switchToMonad,
  } = useWallet();
  const [showDetails, setShowDetails] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);

  // Close details when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        detailsRef.current &&
        !detailsRef.current.contains(event.target as Node)
      ) {
        setShowDetails(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error("Failed to copy address:", err);
      }
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setShowDetails(false);
  };

  const handleSwitchNetwork = async () => {
    await switchToMonad();
  };

  const handleRefreshBalance = async () => {
    await refreshBalance();
  };

  const openMonadExplorer = () => {
    if (address) {
      window.open(
        `https://testnet.monadexplorer.com/address/${address}`,
        "_blank"
      );
    }
  };

  const isOnMonadTestnet =
    chainId === parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "10143");

  if (!isConnected) {
    return (
      <Button
        onClick={onConnect}
        disabled={isLoading}
        className="bg-kaizen-yellow text-kaizen-black hover:bg-kaizen-yellow/90 font-semibold rounded-full flex items-center gap-2"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-kaizen-black border-t-transparent rounded-full animate-spin" />
        ) : (
          <Wallet className="w-4 h-4" />
        )}
        {isLoading ? "Connecting..." : "Connect Wallet"}
      </Button>
    );
  }

  return (
    <div className="relative" ref={detailsRef}>
      <Button
        onClick={() => setShowDetails(!showDetails)}
        variant="outline"
        className={`border-kaizen-gray/30 text-kaizen-white hover:bg-kaizen-gray/20 rounded-full flex items-center gap-2 ${
          !isOnMonadTestnet
            ? "bg-yellow-500/10 border-yellow-500/30"
            : "bg-kaizen-dark-gray"
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            isOnMonadTestnet ? "bg-green-500" : "bg-yellow-500"
          }`}
        ></div>
        {address && truncateAddress(address)}
      </Button>

      {showDetails && (
        <Card className="absolute top-12 right-0 bg-kaizen-dark-gray border-kaizen-gray/30 rounded-2xl p-4 min-w-64 z-10 shadow-xl">
          <div className="space-y-4">
            {/* Network Warning */}
            {!isOnMonadTestnet && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <p className="text-yellow-500 text-sm font-semibold">
                    Wrong Network
                  </p>
                </div>
                <p className="text-yellow-400 text-xs mb-2">
                  Please switch to Monad Testnet to use this app.
                </p>
                <Button
                  onClick={handleSwitchNetwork}
                  className="w-full bg-yellow-500 text-black hover:bg-yellow-600 text-sm"
                  size="sm"
                >
                  Switch to Monad Testnet
                </Button>
              </div>
            )}

            {/* Wallet Info */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-kaizen-white font-semibold text-sm">
                  MetaMask
                </p>
                <div
                  className={`text-xs flex items-center gap-1 ${
                    isOnMonadTestnet ? "text-green-400" : "text-yellow-400"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isOnMonadTestnet ? "bg-green-400" : "bg-yellow-400"
                    }`}
                  ></div>
                  {isOnMonadTestnet ? "Monad Testnet" : `Chain ID: ${chainId}`}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <p className="text-kaizen-gray text-xs">Address</p>
              <div className="flex items-center gap-2">
                <code className="text-kaizen-white text-xs bg-kaizen-black/50 px-2 py-1 rounded flex-1">
                  {address && truncateAddress(address)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyAddress}
                  className="w-6 h-6 text-kaizen-gray hover:text-kaizen-white"
                  title="Copy full address"
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={openMonadExplorer}
                  className="w-6 h-6 text-kaizen-gray hover:text-kaizen-white"
                  title="View on Monad Explorer"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
              {copySuccess && (
                <p className="text-green-400 text-xs">
                  Address copied to clipboard!
                </p>
              )}
            </div>

            {/* Balance */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-kaizen-gray text-xs">Balance</p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefreshBalance}
                  disabled={isLoading}
                  className="w-5 h-5 text-kaizen-gray hover:text-kaizen-white"
                  title="Refresh balance"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
              <p className="text-kaizen-white font-semibold flex items-center gap-2">
                {balance} MON
                {isLoading && (
                  <div className="w-3 h-3 border border-kaizen-gray border-t-kaizen-yellow rounded-full animate-spin" />
                )}
              </p>
              {parseFloat(balance) === 0 && isOnMonadTestnet && (
                <p className="text-kaizen-gray text-xs">
                  Get testnet MON from the{" "}
                  <a
                    href="https://testnet.monad.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-kaizen-yellow hover:underline"
                  >
                    Monad Faucet
                  </a>
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-kaizen-gray/20">
              <Button
                onClick={handleDisconnect}
                variant="ghost"
                className="w-full text-red-400 hover:text-red-300 hover:bg-red-400/10 justify-start"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
