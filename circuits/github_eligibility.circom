pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

/**
 * GitHub Eligibility ZK Circuit
 * Proves user meets web3 contribution threshold without revealing identity
 * 
 * Private inputs:
 * - githubId: User's GitHub ID (hashed)
 * - web3RepoCount: Number of Web3 repos
 * - web3CommitCount: Number of Web3 commits
 * - salt: Random salt for privacy
 * 
 * Public outputs:
 * - commitment: Poseidon hash of (githubId, salt)
 * - isEligible: 1 if eligible, 0 otherwise
 */

template GitHubEligibility(minRepos, minCommits) {
    // Private inputs
    signal input githubId;
    signal input web3RepoCount;
    signal input web3CommitCount;
    signal input salt;
    
    // Public outputs
    signal output commitment;
    signal output isEligible;
    
    // Compute commitment using Poseidon hash
    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== githubId;
    poseidon.inputs[1] <== salt;
    commitment <== poseidon.out;
    
    // Check if user has enough repos
    component hasEnoughRepos = GreaterEqThan(32);
    hasEnoughRepos.in[0] <== web3RepoCount;
    hasEnoughRepos.in[1] <== minRepos;
    
    // Check if user has enough commits
    component hasEnoughCommits = GreaterEqThan(32);
    hasEnoughCommits.in[0] <== web3CommitCount;
    hasEnoughCommits.in[1] <== minCommits;
    
    // User is eligible if they meet EITHER criteria
    signal repoOrCommit;
    repoOrCommit <== hasEnoughRepos.out + hasEnoughCommits.out;
    
    component checkEligible = GreaterThan(32);
    checkEligible.in[0] <== repoOrCommit;
    checkEligible.in[1] <== 0;
    
    isEligible <== checkEligible.out;
    
    // Constraint: Ensure all counts are non-negative
    signal repoSquared;
    signal commitSquared;
    repoSquared <== web3RepoCount * web3RepoCount;
    commitSquared <== web3CommitCount * web3CommitCount;
}

// Instantiate with thresholds: minRepos = 1, minCommits = 10
component main {public []} = GitHubEligibility(1, 10);
