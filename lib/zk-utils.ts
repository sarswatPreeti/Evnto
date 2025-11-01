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
