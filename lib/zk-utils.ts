/**
 * Zero-Knowledge Proof Utilities
 * For interacting with ZK proof generation and verification
 */

export interface ZKProof {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
}

export interface ZKProofResponse {
  success: boolean;
  proof: any;
  publicSignals: string[];
  commitment: string;
  isEligible: boolean;
  stats?: {
    web3RepoCount: number;
    web3CommitCount: number;
    threshold: {
      repos: number;
      commits: number;
    };
  };
  message: string;
}

/**
 * Verify GitHub eligibility and generate ZK proof
 * @param githubToken - GitHub OAuth token
 * @param eventId - Event ID to mint ticket for
 * @returns ZK proof data
 */
export async function verifyGitHubWithZK(
  githubToken: string,
  eventId: string
): Promise<ZKProofResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  const response = await fetch(`${apiUrl}/api/zk/github-verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      githubToken,
      eventId,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to verify GitHub eligibility');
  }
  
  return response.json();
}

/**
 * Check if a commitment has been used
 * @param commitment - Commitment hash
 * @returns Whether commitment was used
 */
export async function checkCommitmentUsed(commitment: string): Promise<boolean> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  try {
    const response = await fetch(`${apiUrl}/api/zk/verify-commitment/${commitment}`);
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.isUsed;
  } catch (error) {
    console.error('Error checking commitment:', error);
    return false;
  }
}

/**
 * Format proof for Solidity contract call
 * @param proof - Raw proof from snarkjs
 * @param publicSignals - Public signals array
 * @returns Formatted proof object
 */
export function formatProofForContract(proof: any, publicSignals: string[]) {
  return {
    a: [proof.pi_a[0], proof.pi_a[1]],
    b: [
      [proof.pi_b[0][1], proof.pi_b[0][0]],
      [proof.pi_b[1][1], proof.pi_b[1][0]],
    ],
    c: [proof.pi_c[0], proof.pi_c[1]],
    publicSignals: publicSignals.map(s => s.toString()),
  };
}

/**
 * Verify Spotify eligibility and generate ZK proof
 * @param spotifyToken - Spotify OAuth token
 * @param artistId - Artist ID to verify
 * @param eventId - Event ID
 * @returns ZK proof data
 */
export async function verifySpotifyWithZK(
  spotifyToken: string,
  artistId: string,
  eventId: string
): Promise<ZKProofResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  // Get user profile first
  const profileResponse = await fetch(`${apiUrl}/api/spotify/profile?access_token=${spotifyToken}`);
  
  if (!profileResponse.ok) {
    throw new Error('Failed to fetch Spotify profile');
  }
  
  const profileData = await profileResponse.json();
  const spotifyUserId = profileData.profile.id;
  
  // Verify eligibility
  const response = await fetch(`${apiUrl}/api/spotify/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      spotifyUserId,
      artistId,
      eventId,
      access_token: spotifyToken,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to verify Spotify eligibility');
  }
  
  const data = await response.json();
  
  return {
    success: data.success,
    proof: data.proof,
    publicSignals: data.publicSignals,
    commitment: '', // Not used for Spotify
    isEligible: data.artistFound,
    message: data.success ? 'You are a top fan!' : 'Not in top artists',
  };
}

/**
 * Mint priority ticket on-chain with ZK proof
 * @param proof - ZK proof from verification
 * @param publicSignals - Public signals
 * @param eventId - Event ID
 * @param eventTitle - Event title
 * @param eventDate - Event timestamp
 * @param type - Type of verification (github or spotify)
 * @param contractAddress - Contract address
 * @returns Transaction receipt
 */
export async function mintPriorityTicketWithProof(
  proof: any,
  publicSignals: string[],
  eventId: string,
  eventTitle: string,
  eventDate: number,
  type: 'github' | 'spotify',
  contractAddress: string
) {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No Ethereum provider found');
  }

  const { ethers } = await import('ethers');
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // Format proof for Solidity
  const formattedProof = {
    a: [proof.pi_a[0], proof.pi_a[1]],
    b: [
      [proof.pi_b[0][0], proof.pi_b[0][1]],
      [proof.pi_b[1][0], proof.pi_b[1][1]],
    ],
    c: [proof.pi_c[0], proof.pi_c[1]],
  };

  // Contract ABI
  const contractABI = [
    'function mintPriorityTicketHackathon((uint256[2] a, uint256[2][2] b, uint256[2] c), uint256[2], uint256, string, uint256) external payable returns (uint256)',
    'function mintPriorityTicketConcert((uint256[2] a, uint256[2][2] b, uint256[2] c), uint256[3], uint256, string, uint256) external payable returns (uint256)',
  ];

  const contract = new ethers.Contract(contractAddress, contractABI, signer);

  // Priority ticket price (0.01 ETH)
  const priceInWei = ethers.parseEther('0.01');

  let tx;

  if (type === 'github') {
    tx = await contract.mintPriorityTicketHackathon(
      formattedProof,
      publicSignals,
      eventId,
      eventTitle,
      eventDate,
      { value: priceInWei }
    );
  } else {
    tx = await contract.mintPriorityTicketConcert(
      formattedProof,
      publicSignals,
      eventId,
      eventTitle,
      eventDate,
      { value: priceInWei }
    );
  }

  const receipt = await tx.wait();
  return receipt;
}

/**
 * Parse proof response for contract interaction
 */
export function parseProofForContract(proofData: ZKProofResponse) {
  const formatted = formatProofForContract(
    proofData.proof,
    proofData.publicSignals
  );
  
  return {
    proof: {
      a: formatted.a,
      b: formatted.b,
      c: formatted.c,
    },
    publicSignals: [
      proofData.publicSignals[0], // commitment
      proofData.publicSignals[1], // isEligible
    ],
  };
}

/**
 * Estimate gas for priority ticket minting
 */
export function estimatePriorityTicketGas(): bigint {
  // Base gas for contract call + ZK verification
  // ZK verification is expensive (~500k gas)
  return BigInt(600000);
}

/**
 * Calculate priority ticket price (in wei)
 */
export function getPriorityTicketPrice(): bigint {
  // 0.01 ETH (or MON on Monad)
  return BigInt('10000000000000000');
}

/**
 * Validate proof structure
 */
export function isValidProofStructure(proof: any): boolean {
  if (!proof || typeof proof !== 'object') return false;
  
  return (
    Array.isArray(proof.pi_a) && proof.pi_a.length === 3 &&
    Array.isArray(proof.pi_b) && proof.pi_b.length === 3 &&
    Array.isArray(proof.pi_c) && proof.pi_c.length === 3
  );
}

/**
 * Format commitment for display (first 10 and last 10 chars)
 */
export function formatCommitment(commitment: string): string {
  if (commitment.length < 20) return commitment;
  return `${commitment.slice(0, 10)}...${commitment.slice(-10)}`;
}
