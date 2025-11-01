"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Wallet, Check, AlertCircle, Trophy, Zap } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { OAuthVerification } from "./oauth-verification";
import { TransactionDrawer } from "./transaction-drawer";

interface PriorityTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  eventPrice: string;
  eventImage: string;
  eventId: string;
  eventCategory: string;
  eventDate: number;
  artistId?: string;
  isWalletConnected: boolean;
  onConnectWallet: () => void;
}

interface TransactionStatus {
  status: "pending" | "success" | "error";
  hash?: string;
  error?: string;
  action?: string;
}

interface ZKProofData {
  proof: any;
  publicSignals: any;
  type: "github" | "spotify";
}

export function PriorityTicketModal({
  isOpen,
  onClose,
  eventTitle,
  eventPrice,
  eventImage,
  eventId,
  eventCategory,
  eventDate,
  artistId,
  isWalletConnected,
  onConnectWallet,
}: PriorityTicketModalProps) {
  const [step, setStep] = useState<
    "verify" | "mint" | "processing" | "success" | "error"
  >("verify");
  const [zkProofData, setZkProofData] = useState<ZKProofData | null>(null);
  const [transaction, setTransaction] = useState<TransactionStatus>({
    status: "pending",
    action: "Priority Ticket Mint",
  });
  const [showTransactionDrawer, setShowTransactionDrawer] = useState(false);
  const { address } = useWallet();

  const isHackathon = eventCategory === "Web3 Hackathon";
  const isConcert = eventCategory === "Live shows";

  /**
   * Handle successful OAuth verification
   */
  const handleVerificationComplete = (
    proof: any,
    publicSignals: any,
    type: "github" | "spotify"
  ) => {
    console.log("✅ Verification complete:", { type, proof, publicSignals });
    setZkProofData({ proof, publicSignals, type });
    setStep("mint");
  };

  /**
   * Mint priority ticket with ZK proof
   */
  const handleMintPriorityTicket = async () => {
    if (!isWalletConnected || !address) {
      onConnectWallet();
      return;
    }

    if (!zkProofData) {
      alert("Please complete verification first");
      return;
    }

    setStep("processing");
    setTransaction({
      status: "pending",
      action: "Priority Ticket Mint",
    });
    setShowTransactionDrawer(true);

    try {
      // Import contract ABI and address
      const { ethers } = await import("ethers");
      
      // Get the provider from window.ethereum
      if (!window.ethereum) {
        throw new Error("No Ethereum provider found");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Contract details (replace with actual deployed address)
      const contractAddress = process.env.NEXT_PUBLIC_EVENT_TICKET_CONTRACT || "0x...";
      
      // Simplified ABI - only the functions we need
      const contractABI = [
        "function mintPriorityTicketHackathon((uint256[2] a, uint256[2][2] b, uint256[2] c), uint256[2], uint256, string, uint256) external payable returns (uint256)",
        "function mintPriorityTicketConcert((uint256[2] a, uint256[2][2] b, uint256[2] c), uint256[3], uint256, string, uint256) external payable returns (uint256)",
      ];

      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      // Format proof for Solidity
      const formattedProof = {
        a: [zkProofData.proof.pi_a[0], zkProofData.proof.pi_a[1]],
        b: [
          [zkProofData.proof.pi_b[0][0], zkProofData.proof.pi_b[0][1]],
          [zkProofData.proof.pi_b[1][0], zkProofData.proof.pi_b[1][1]],
        ],
        c: [zkProofData.proof.pi_c[0], zkProofData.proof.pi_c[1]],
      };

      // Ticket price (0.01 ETH for priority)
      const priceInWei = ethers.parseEther("0.01");

      let tx;

      if (zkProofData.type === "github" && isHackathon) {
        // Mint hackathon priority ticket
        tx = await contract.mintPriorityTicketHackathon(
          formattedProof,
          zkProofData.publicSignals,
          eventId,
          eventTitle,
          eventDate,
          { value: priceInWei }
        );
      } else if (zkProofData.type === "spotify" && isConcert) {
        // Mint concert priority ticket
        tx = await contract.mintPriorityTicketConcert(
          formattedProof,
          zkProofData.publicSignals,
          eventId,
          eventTitle,
          eventDate,
          { value: priceInWei }
        );
      } else {
        throw new Error("Invalid event category or proof type");
      }

      console.log("⏳ Waiting for transaction confirmation...");
      const receipt = await tx.wait();

      console.log("✅ Priority ticket minted successfully!");

      setTransaction({
        status: "success",
        hash: receipt.hash,
        action: "Priority Ticket Mint",
      });
      setStep("success");
    } catch (error) {
      console.error("❌ Priority ticket mint error:", error);
      setTransaction({
        status: "error",
        error: error instanceof Error ? error.message : "Transaction failed",
        action: "Priority Ticket Mint",
      });
      setStep("error");
    }
  };

  const resetModal = () => {
    setStep("verify");
    setZkProofData(null);
    setTransaction({ status: "pending", action: "Priority Ticket Mint" });
    setShowTransactionDrawer(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <Card className="bg-kaizen-dark-gray border-none rounded-3xl w-full max-w-2xl my-8">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-kaizen-yellow rounded-2xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-kaizen-black" />
                </div>
                <div>
                  <h2 className="text-kaizen-white font-bold text-xl">
                    {step === "verify" && "Priority Ticket Verification"}
                    {step === "mint" && "Mint Priority Ticket"}
                    {step === "processing" && "Minting..."}
                    {step === "success" && "Priority Ticket Minted!"}
                    {step === "error" && "Minting Failed"}
                  </h2>
                  {step === "verify" && (
                    <p className="text-kaizen-gray text-sm">
                      Verify eligibility with zero-knowledge proof
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetModal}
                className="text-kaizen-gray hover:text-kaizen-white hover:bg-kaizen-gray/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Verification Step */}
            {step === "verify" && (
              <>
                {/* Event Details */}
                <div className="flex items-center gap-4 mb-6 bg-kaizen-black/50 rounded-2xl p-4">
                  <img
                    src={eventImage || "/placeholder.svg"}
                    alt={eventTitle}
                    className="w-20 h-20 rounded-2xl object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="text-kaizen-white font-semibold">
                      {eventTitle}
                    </h3>
                    <p className="text-kaizen-gray text-sm">{eventCategory}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Trophy className="w-4 h-4 text-kaizen-yellow" />
                      <span className="text-kaizen-yellow text-sm font-semibold">
                        Priority Access
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-kaizen-gray text-sm">Priority Price</p>
                    <p className="text-kaizen-white font-bold text-lg">
                      0.01 MON
                    </p>
                  </div>
                </div>

                {/* OAuth Verification Component */}
                <OAuthVerification
                  eventCategory={eventCategory}
                  eventId={eventId}
                  artistId={artistId}
                  onVerificationComplete={handleVerificationComplete}
                />
              </>
            )}

            {/* Mint Step */}
            {step === "mint" && (
              <>
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Check className="w-6 h-6 text-green-500" />
                    <div>
                      <h3 className="text-green-500 font-semibold">
                        Verification Successful!
                      </h3>
                      <p className="text-kaizen-gray text-sm">
                        You are eligible for priority ticket
                      </p>
                    </div>
                  </div>
                </div>

                {/* Transaction Summary */}
                <div className="bg-kaizen-black/50 rounded-2xl p-4 mb-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-kaizen-gray text-sm">
                      Priority Ticket
                    </span>
                    <span className="text-kaizen-white text-sm">0.01 MON</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-kaizen-gray text-sm">Gas Fee</span>
                    <span className="text-kaizen-white text-sm">~0.0001 MON</span>
                  </div>
                  <div className="border-t border-kaizen-gray/20 pt-3">
                    <div className="flex justify-between">
                      <span className="text-kaizen-white font-semibold">
                        Total
                      </span>
                      <span className="text-kaizen-white font-semibold">
                        ~0.0101 MON
                      </span>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div className="bg-kaizen-yellow/10 border border-kaizen-yellow/20 rounded-2xl p-4 mb-6">
                  <h4 className="text-kaizen-yellow font-semibold text-sm mb-2">
                    Priority Benefits:
                  </h4>
                  <ul className="space-y-1 text-kaizen-gray text-xs">
                    <li>• Early access to event</li>
                    <li>• Exclusive POAP NFT</li>
                    <li>• Soulbound until event date</li>
                    <li>• On-chain proof of eligibility</li>
                  </ul>
                </div>

                <Button
                  onClick={handleMintPriorityTicket}
                  className="w-full bg-kaizen-yellow text-kaizen-black hover:bg-kaizen-yellow/90 font-semibold rounded-full h-12"
                  disabled={!isWalletConnected}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  {isWalletConnected
                    ? "Mint Priority Ticket"
                    : "Connect Wallet to Mint"}
                </Button>
              </>
            )}

            {/* Processing Step */}
            {step === "processing" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 border-4 border-kaizen-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-kaizen-white font-semibold mb-2">
                  Minting Priority Ticket
                </h3>
                <p className="text-kaizen-gray text-sm">
                  Processing your transaction with ZK proof verification...
                </p>
              </div>
            )}

            {/* Success Step */}
            {step === "success" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-kaizen-white font-semibold mb-2">
                  Priority Ticket Minted!
                </h3>
                <p className="text-kaizen-gray text-sm mb-4">
                  You now have priority access to {eventTitle}
                </p>
                {transaction.hash && (
                  <div className="bg-kaizen-black/50 rounded-2xl p-3 mb-4">
                    <p className="text-kaizen-gray text-xs mb-2">
                      Transaction Hash
                    </p>
                    <code className="text-kaizen-white text-xs break-all">
                      {transaction.hash}
                    </code>
                  </div>
                )}
                <Button
                  onClick={resetModal}
                  className="w-full bg-kaizen-yellow text-kaizen-black hover:bg-kaizen-yellow/90 font-semibold rounded-full"
                >
                  Done
                </Button>
              </div>
            )}

            {/* Error Step */}
            {step === "error" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-kaizen-white font-semibold mb-2">
                  Minting Failed
                </h3>
                <p className="text-kaizen-gray text-sm mb-4">
                  {transaction.error || "The transaction failed to process"}
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={resetModal}
                    variant="outline"
                    className="flex-1 border-kaizen-gray/30 text-kaizen-white hover:bg-kaizen-gray/20"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setStep("mint")}
                    className="flex-1 bg-kaizen-yellow text-kaizen-black hover:bg-kaizen-yellow/90 font-semibold"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Transaction Drawer */}
      <TransactionDrawer
        isOpen={showTransactionDrawer}
        onClose={() => setShowTransactionDrawer(false)}
        transaction={transaction}
      />
    </>
  );
}
