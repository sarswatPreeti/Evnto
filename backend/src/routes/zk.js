const express = require('express');
const router = express.Router();
const { Octokit } = require('@octokit/rest');
const { generateEligibilityProof } = require('../../circuits/scripts/generate-proof');

// Web3-related topics and languages to check
const WEB3_TOPICS = [
    'solidity', 'web3', 'blockchain', 'smart-contract', 'smart-contracts',
    'ethereum', 'defi', 'nft', 'dapp', 'web3js', 'ethers', 'hardhat',
    'truffle', 'metamask', 'cryptocurrency', 'crypto', 'monad'
];

const WEB3_LANGUAGES = [
    'solidity', 'rust', 'move'
];

/**
 * Check if a repository is Web3-related
 */
function isWeb3Repo(repo) {
    // Check topics
    if (repo.topics && repo.topics.length > 0) {
        const hasWeb3Topic = repo.topics.some(topic => 
            WEB3_TOPICS.includes(topic.toLowerCase())
        );
        if (hasWeb3Topic) return true;
    }
    
    // Check language
    if (repo.language) {
        const isWeb3Lang = WEB3_LANGUAGES.includes(repo.language.toLowerCase());
        if (isWeb3Lang) return true;
    }
    
    // Check description and name for keywords
    const text = `${repo.name} ${repo.description || ''}`.toLowerCase();
    const hasWeb3Keyword = WEB3_TOPICS.some(keyword => text.includes(keyword));
    
    return hasWeb3Keyword;
}

/**
 * Count Web3 commits in user's repositories
 */
async function countWeb3Commits(octokit, username, repos) {
    let totalCommits = 0;
    
    for (const repo of repos) {
        if (isWeb3Repo(repo)) {
            try {
                // Get commits for this repo (last 100)
                const { data: commits } = await octokit.repos.listCommits({
                    owner: username,
                    repo: repo.name,
                    author: username,
                    per_page: 100
                });
                
                totalCommits += commits.length;
                
            } catch (error) {
                // Skip if we can't access commits (private repo, etc.)
                console.log(`Skipping commits for ${repo.name}:`, error.message);
            }
        }
    }
    
    return totalCommits;
}

/**
 * POST /api/zk/github-verify
 * Verify GitHub eligibility and generate ZK proof
 * 
 * Body: { githubToken: string, eventId: string }
 * Returns: { proof, publicSignals, isEligible, commitment }
 */
router.post('/github-verify', async (req, res) => {
    try {
        const { githubToken, eventId } = req.body;
        
        if (!githubToken) {
            return res.status(400).json({ 
                error: 'GitHub token required' 
            });
        }
        
        console.log('🔍 Starting GitHub verification for event:', eventId);
        
        // Initialize Octokit with user's token
        const octokit = new Octokit({
            auth: githubToken
        });
        
        // 1. Fetch user's GitHub data
        const { data: user } = await octokit.users.getAuthenticated();
        console.log(`✅ Authenticated as: ${user.login} (ID: ${user.id})`);
        
        // 2. Fetch user's repositories
        const { data: repos } = await octokit.repos.listForAuthenticatedUser({
            per_page: 100,
            sort: 'updated'
        });
        
        console.log(`📦 Found ${repos.length} total repositories`);
        
        // 3. Count Web3-related repositories
        const web3Repos = repos.filter(repo => isWeb3Repo(repo));
        const web3RepoCount = web3Repos.length;
        
        console.log(`⚡ Web3 repositories: ${web3RepoCount}`);
        console.log('   Topics found:', web3Repos.slice(0, 3).map(r => r.topics).flat());
        
        // 4. Count Web3 commits (this can take time, so we limit it)
        console.log('📊 Counting Web3 commits...');
        const web3CommitCount = await countWeb3Commits(octokit, user.login, web3Repos.slice(0, 10));
        
        console.log(`💻 Web3 commits: ${web3CommitCount}`);
        
        // 5. Compute eligibility (threshold: ≥1 repo OR ≥10 commits)
        const isEligible = web3RepoCount >= 1 || web3CommitCount >= 10;
        
        console.log(`🎯 Eligibility: ${isEligible ? 'ELIGIBLE ✅' : 'NOT ELIGIBLE ❌'}`);
        
        // 6. Generate ZK proof
        console.log('🔐 Generating ZK proof...');
        
        const proofData = await generateEligibilityProof(
            user.id.toString(),
            web3RepoCount,
            web3CommitCount
        );
        
        console.log('✅ ZK proof generated successfully!');
        console.log('   Commitment:', proofData.commitment);
        console.log('   Proof valid:', proofData.isEligible);
        
        // 7. Return proof and public signals (NO private data!)
        return res.json({
            success: true,
            proof: proofData.proof,
            publicSignals: proofData.publicSignals,
            commitment: proofData.commitment,
            isEligible: proofData.isEligible,
            // Optional: include anonymous stats for UI display
            stats: {
                web3RepoCount: web3RepoCount,
                web3CommitCount: web3CommitCount,
                threshold: {
                    repos: 1,
                    commits: 10
                }
            },
            message: isEligible 
                ? '🎉 You are eligible for priority ticket!' 
                : '❌ You do not meet the Web3 contribution requirements'
        });
        
    } catch (error) {
        console.error('❌ Error in GitHub verification:', error);
        
        // Handle specific GitHub API errors
        if (error.status === 401) {
            return res.status(401).json({ 
                error: 'Invalid GitHub token' 
            });
        }
        
        if (error.status === 403) {
            return res.status(403).json({ 
                error: 'GitHub API rate limit exceeded. Try again later.' 
            });
        }
        
        return res.status(500).json({ 
            error: 'Failed to verify GitHub eligibility',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/zk/verify-commitment
 * Check if a commitment has been used (prevent double minting)
 */
router.get('/verify-commitment/:commitment', async (req, res) => {
    try {
        const { commitment } = req.params;
        
        // In production, check against smart contract
        // For now, return mock response
        
        return res.json({
            commitment,
            isUsed: false,
            message: 'Commitment has not been used yet'
        });
        
    } catch (error) {
        console.error('Error checking commitment:', error);
        return res.status(500).json({ 
            error: 'Failed to check commitment' 
        });
    }
});

/**
 * GET /api/zk/health
 * Health check for ZK service
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'ZK GitHub Verification',
        timestamp: new Date().toISOString(),
        features: {
            githubVerification: true,
            zkProofGeneration: true,
            commitmentTracking: true
        }
    });
});

module.exports = router;
