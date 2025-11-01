'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Github, Shield, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { 
  getGitHubAuthUrl, 
  generateState, 
  storeOAuthState,
  getGitHubToken,
  storeGitHubToken,
  clearGitHubToken
} from '@/lib/github-oauth';
import { 
  verifyGitHubWithZK, 
  parseProofForContract,
  formatCommitment,
  getPriorityTicketPrice,
  type ZKProofResponse 
} from '@/lib/zk-utils';
import { useToast } from '@/hooks/use-toast';

interface ZKPriorityTicketProps {
  eventId: string;
  eventTitle: string;
  eventDate: number; // Unix timestamp
  contractAddress?: string;
  onSuccess?: (tokenId: string) => void;
}

export default function ZKPriorityTicket({
  eventId,
  eventTitle,
  eventDate,
  contractAddress,
  onSuccess,
}: ZKPriorityTicketProps) {
  const { toast } = useToast();
  
  // State management
  const [step, setStep] = useState<'idle' | 'github-auth' | 'verifying' | 'verified' | 'minting' | 'success'>('idle');
  const [proofData, setProofData] = useState<ZKProofResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  
  // Handle OAuth callback
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, []);
  
  /**
   * Step 1: Initiate GitHub OAuth
   */
  const handleGitHubAuth = () => {
    setError(null);
    setStep('github-auth');
    
    const state = generateState();
    storeOAuthState(state);
    
    const authUrl = getGitHubAuthUrl(state);
    
    // Redirect to GitHub
    window.location.href = authUrl;
  };
  
  /**
   * Step 2: Handle OAuth callback and exchange code for token
   */
  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      setStep('verifying');
      
      // Exchange code for token (this should be done server-side in production)
      // For now, we'll assume the token is passed directly
      // In production, send code to your backend to exchange for token
      const token = code; // Temporary: treat code as token
      
      storeGitHubToken(token);
      
      // Start ZK verification
      await handleVerifyGitHub(token);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth callback failed');
      setStep('idle');
    }
  };
  
  /**
   * Step 3: Verify GitHub and generate ZK proof
   */
  const handleVerifyGitHub = async (token?: string) => {
    try {
      setStep('verifying');
      setError(null);
      
      const githubToken = token || getGitHubToken();
      
      if (!githubToken) {
        throw new Error('GitHub token not found. Please authenticate again.');
      }
      
      toast({
        title: '🔍 Verifying GitHub Profile',
        description: 'Analyzing your Web3 contributions...',
      });
      
      // Call backend to verify and generate ZK proof
      const proof = await verifyGitHubWithZK(githubToken, eventId);
      
      setProofData(proof);
      
      if (proof.isEligible) {
        setStep('verified');
        toast({
          title: '✅ Verification Successful!',
          description: proof.message,
        });
      } else {
        setError(proof.message);
        setStep('idle');
        toast({
          title: '❌ Not Eligible',
          description: proof.message,
          variant: 'destructive',
        });
      }
      
      // Clear token after use
      clearGitHubToken();
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMsg);
      setStep('idle');
      
      toast({
        title: '❌ Verification Failed',
        description: errorMsg,
        variant: 'destructive',
      });
    }
  };
  
  /**
   * Step 4: Mint priority ticket with ZK proof
   */
  const handleMintPriorityTicket = async () => {
    if (!proofData || !proofData.isEligible) {
      setError('Invalid proof data');
      return;
    }
    
    try {
      setStep('minting');
      setError(null);
      
      toast({
        title: '🎫 Minting Priority Ticket',
        description: 'Submitting ZK proof to smart contract...',
      });
      
      // Check if wallet is connected
      if (typeof window.ethereum === 'undefined') {
        throw new Error('Please install MetaMask to mint tickets');
      }
      
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Get contract instance (you'll need to import ethers)
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      if (!contractAddress) {
        throw new Error('Contract address not configured');
      }
      
      // EventTicket contract ABI (minimal for our function)
      const abi = [
        'function mintPriorityTicketHackathon(tuple(uint256[2] a, uint256[2][2] b, uint256[2] c) proof, uint256[2] publicSignals, uint256 eventId, string eventTitle, uint256 eventDate) external payable returns (uint256)'
      ];
      
      const contract = new ethers.Contract(contractAddress, abi, signer);
      
      // Parse proof for contract
      const { proof, publicSignals } = parseProofForContract(proofData);
      
      // Get ticket price
      const price = getPriorityTicketPrice();
      
      // Call contract
      const tx = await contract.mintPriorityTicketHackathon(
        proof,
        publicSignals,
        eventId,
        eventTitle,
        eventDate,
        { value: price }
      );
      
      toast({
        title: '⏳ Transaction Submitted',
        description: 'Waiting for confirmation...',
      });
      
      // Wait for transaction
      const receipt = await tx.wait();
      
      setTxHash(receipt.hash);
      setStep('success');
      
      toast({
        title: '🎉 Priority Ticket Minted!',
        description: 'Your ticket has been minted successfully.',
      });
      
      // Extract token ID from event logs
      if (receipt.logs && receipt.logs.length > 0) {
        // Parse logs to get token ID
        const tokenId = receipt.logs[0].topics[1]; // Simplified
        onSuccess?.(tokenId);
      }
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Minting failed';
      setError(errorMsg);
      setStep('verified');
      
      toast({
        title: '❌ Minting Failed',
        description: errorMsg,
        variant: 'destructive',
      });
    }
  };
  
  return (
    <Card className="w-full max-w-2xl border-yellow-500/20 bg-gradient-to-br from-black to-zinc-900">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-yellow-500" />
          <CardTitle className="text-2xl text-yellow-500">
            Priority Ticket - ZK Verified
          </CardTitle>
        </div>
        <CardDescription className="text-zinc-400">
          Prove your Web3 contributions without revealing your identity
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between">
          <StepIndicator label="Verify" active={['github-auth', 'verifying'].includes(step)} completed={['verified', 'minting', 'success'].includes(step)} />
          <div className="flex-1 h-0.5 bg-zinc-800 mx-2" />
          <StepIndicator label="Mint" active={step === 'minting'} completed={step === 'success'} />
          <div className="flex-1 h-0.5 bg-zinc-800 mx-2" />
          <StepIndicator label="Success" active={false} completed={step === 'success'} />
        </div>
        
        {/* Proof Stats (if verified) */}
        {proofData && proofData.stats && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div>
              <p className="text-sm text-zinc-500">Web3 Repositories</p>
              <p className="text-2xl font-bold text-yellow-500">
                {proofData.stats.web3RepoCount}
              </p>
              <p className="text-xs text-zinc-600">
                Threshold: {proofData.stats.threshold.repos}
              </p>
            </div>
            <div>
              <p className="text-sm text-zinc-500">Web3 Commits</p>
              <p className="text-2xl font-bold text-yellow-500">
                {proofData.stats.web3CommitCount}
              </p>
              <p className="text-xs text-zinc-600">
                Threshold: {proofData.stats.threshold.commits}
              </p>
            </div>
          </div>
        )}
        
        {/* Commitment Display */}
        {proofData && (
          <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <p className="text-sm text-zinc-500 mb-2">Your Commitment (Identity Hash)</p>
            <code className="text-xs text-yellow-500 font-mono break-all">
              {formatCommitment(proofData.commitment)}
            </code>
            <p className="text-xs text-zinc-600 mt-2">
              ✅ Zero-knowledge: Your identity remains private
            </p>
          </div>
        )}
        
        {/* Success Display */}
        {step === 'success' && txHash && (
          <div className="p-4 bg-green-900/20 rounded-lg border border-green-500/30">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <p className="text-green-500 font-semibold">Ticket Minted Successfully!</p>
            </div>
            <p className="text-sm text-zinc-400">Transaction Hash:</p>
            <code className="text-xs text-zinc-500 font-mono break-all">{txHash}</code>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col gap-3">
        {/* Step 1: GitHub Verification */}
        {(step === 'idle' || step === 'github-auth') && (
          <Button
            onClick={handleGitHubAuth}
            disabled={step === 'github-auth'}
            className="w-full bg-yellow-500 text-black hover:bg-yellow-600"
            size="lg"
          >
            {step === 'github-auth' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting to GitHub...
              </>
            ) : (
              <>
                <Github className="mr-2 h-4 w-4" />
                Verify GitHub (ZK)
              </>
            )}
          </Button>
        )}
        
        {/* Step 2: Verifying */}
        {step === 'verifying' && (
          <Button disabled className="w-full" size="lg">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating ZK Proof...
          </Button>
        )}
        
        {/* Step 3: Mint Priority Ticket */}
        {step === 'verified' && (
          <Button
            onClick={handleMintPriorityTicket}
            className="w-full bg-yellow-500 text-black hover:bg-yellow-600"
            size="lg"
          >
            <Shield className="mr-2 h-4 w-4" />
            Mint Priority Ticket (0.01 ETH)
          </Button>
        )}
        
        {/* Step 4: Minting */}
        {step === 'minting' && (
          <Button disabled className="w-full" size="lg">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Minting Ticket...
          </Button>
        )}
        
        {/* Step 5: Success */}
        {step === 'success' && (
          <Button
            onClick={() => setStep('idle')}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Mint Another Ticket
          </Button>
        )}
        
        <p className="text-xs text-center text-zinc-600">
          🔒 Your GitHub data stays private. Only eligibility proof is shared on-chain.
        </p>
      </CardFooter>
    </Card>
  );
}

// Helper component for step indicator
function StepIndicator({ label, active, completed }: { label: string; active: boolean; completed: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          completed
            ? 'bg-yellow-500 text-black'
            : active
            ? 'bg-yellow-500/20 border-2 border-yellow-500 text-yellow-500'
            : 'bg-zinc-800 text-zinc-600'
        }`}
      >
        {completed ? <CheckCircle2 className="h-4 w-4" /> : '○'}
      </div>
      <span className="text-xs mt-1 text-zinc-500">{label}</span>
    </div>
  );
}
