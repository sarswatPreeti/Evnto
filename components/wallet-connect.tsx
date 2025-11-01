"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ExternalLink, AlertCircle, Wallet } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";

interface WalletConnectProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletConnect({ isOpen, onClose }: WalletConnectProps) {
  const { connectWallet, error, isLoading, chainId, switchToMonad } =
    useWallet();
  const [connecting, setConnecting] = useState(false);

  const isMetaMaskInstalled =
    typeof window !== "undefined" && window.ethereum?.isMetaMask;

  const handleConnect = async () => {
    if (connecting || isLoading) return;

    setConnecting(true);

    try {
      const success = await connectWallet();
      if (success) {
        onClose();
      }
    } catch (err) {
      console.error("Connection failed:", err);
    } finally {
      setConnecting(false);
    }
  };

  const handleSwitchNetwork = async () => {
    await switchToMonad();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="bg-kaizen-dark-gray border-none rounded-3xl w-full max-w-sm">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-kaizen-white font-bold text-xl">
              Connect Wallet
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-kaizen-gray hover:text-kaizen-white hover:bg-kaizen-gray/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Description */}
          <p className="text-kaizen-gray text-sm mb-6">
            Connect your MetaMask wallet to interact with events on Monad
            Testnet
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Network Warning */}
          {chainId &&
            chainId !==
              parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "10143") && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-400 text-sm mb-2">
                  You're connected to the wrong network. Please switch to Monad
                  Testnet.
                </p>
                <Button
                  onClick={handleSwitchNetwork}
                  className="w-full bg-yellow-500 text-black hover:bg-yellow-600"
                  size="sm"
                >
                  Switch to Monad Testnet
                </Button>
              </div>
            )}

          {/* MetaMask Option */}
          <div className="space-y-3">
            <button
              onClick={handleConnect}
              disabled={!isMetaMaskInstalled || connecting || isLoading}
              className={`w-full p-4 rounded-2xl border transition-colors ${
                isMetaMaskInstalled
                  ? "border-kaizen-gray/30 hover:border-kaizen-yellow bg-kaizen-black/50 hover:bg-kaizen-yellow/10"
                  : "border-kaizen-gray/20 bg-kaizen-gray/10 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`font-semibold ${
                        isMetaMaskInstalled
                          ? "text-kaizen-white"
                          : "text-kaizen-gray"
                      }`}
                    >
                      MetaMask
                    </h3>
                  </div>
                  <p className="text-kaizen-gray text-sm">
                    Connect using MetaMask wallet
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {connecting ? (
                    <div className="w-5 h-5 border-2 border-kaizen-yellow border-t-transparent rounded-full animate-spin" />
                  ) : isMetaMaskInstalled ? (
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                  ) : (
                    <ExternalLink className="w-4 h-4 text-kaizen-gray" />
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* Instructions for MetaMask */}
          {!isMetaMaskInstalled && (
            <div className="mt-6 p-4 bg-kaizen-black/50 rounded-lg">
              <h4 className="text-kaizen-white text-sm font-semibold mb-2">
                Don't have MetaMask?
              </h4>
              <p className="text-kaizen-gray text-xs mb-3">
                Install the MetaMask browser extension to connect your Ethereum
                wallet.
              </p>
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-kaizen-yellow text-xs hover:text-kaizen-yellow/80"
              >
                Download MetaMask
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Monad Testnet Info */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h4 className="text-blue-400 text-sm font-semibold mb-2">
              Monad Testnet
            </h4>
            <p className="text-blue-300 text-xs mb-2">
              This app works on Monad Testnet. The network will be added
              automatically when you connect.
            </p>
            <div className="text-xs text-blue-300/80">
              <div>Chain ID: {process.env.NEXT_PUBLIC_CHAIN_ID || "10143"}</div>
              <div>Currency: MON</div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-kaizen-gray/20">
            <p className="text-kaizen-gray text-xs text-center">
              By connecting a wallet, you agree to Evnto's Terms of Service
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
