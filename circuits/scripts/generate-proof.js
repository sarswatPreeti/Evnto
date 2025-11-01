const snarkjs = require('snarkjs');
const fs = require('fs');
const { buildPoseidon } = require('circomlibjs');

/**
 * Generate ZK proof for GitHub eligibility
 * @param {string} githubId - User's GitHub ID (will be hashed)
 * @param {number} web3RepoCount - Number of Web3 repos
 * @param {number} web3CommitCount - Number of Web3 commits
 * @returns {Object} { proof, publicSignals }
 */
async function generateEligibilityProof(githubId, web3RepoCount, web3CommitCount) {
    try {
        // Build Poseidon hasher
        const poseidon = await buildPoseidon();
        
        // Generate random salt for privacy
        const salt = BigInt(Math.floor(Math.random() * 1000000000));
        
        // Convert githubId to BigInt (hash if string)
        let githubIdBigInt;
        if (typeof githubId === 'string') {
            const encoder = new TextEncoder();
            const data = encoder.encode(githubId);
            const hashBuffer = poseidon([...data]);
            githubIdBigInt = poseidon.F.toObject(hashBuffer);
        } else {
            githubIdBigInt = BigInt(githubId);
        }
        
        // Prepare circuit inputs
        const input = {
            githubId: githubIdBigInt.toString(),
            web3RepoCount: web3RepoCount.toString(),
            web3CommitCount: web3CommitCount.toString(),
            salt: salt.toString()
        };
        
        console.log('Generating proof with input:', {
            ...input,
            githubId: '[HIDDEN]',
            salt: '[HIDDEN]'
        });
        
        // Generate witness
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            '../circuits/build/github_eligibility_js/github_eligibility.wasm',
            '../circuits/build/github_eligibility_final.zkey'
        );
        
        console.log('Proof generated successfully!');
        console.log('Public signals:', publicSignals);
        console.log('isEligible:', publicSignals[1] === '1' ? 'YES' : 'NO');
        
        return {
            proof,
            publicSignals,
            commitment: publicSignals[0],
            isEligible: publicSignals[1] === '1'
        };
        
    } catch (error) {
        console.error('Error generating proof:', error);
        throw error;
    }
}

/**
 * Verify a proof locally (before sending to contract)
 */
async function verifyProof(proof, publicSignals) {
    try {
        const vKey = JSON.parse(
            fs.readFileSync('../circuits/build/verification_key.json', 'utf8')
        );
        
        const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        
        console.log('Proof verification:', isValid ? 'VALID ✅' : 'INVALID ❌');
        return isValid;
        
    } catch (error) {
        console.error('Error verifying proof:', error);
        return false;
    }
}

/**
 * Format proof for Solidity contract
 */
function formatProofForSolidity(proof, publicSignals) {
    return {
        a: [proof.pi_a[0], proof.pi_a[1]],
        b: [
            [proof.pi_b[0][1], proof.pi_b[0][0]],
            [proof.pi_b[1][1], proof.pi_b[1][0]]
        ],
        c: [proof.pi_c[0], proof.pi_c[1]],
        input: publicSignals
    };
}

module.exports = {
    generateEligibilityProof,
    verifyProof,
    formatProofForSolidity
};

// Test if run directly
if (require.main === module) {
    (async () => {
        console.log('🔐 Testing ZK Proof Generation...\n');
        
        // Test case 1: Eligible user (has 2 web3 repos)
        console.log('Test 1: Eligible user with 2 Web3 repos');
        const result1 = await generateEligibilityProof('test-user-123', 2, 5);
        await verifyProof(result1.proof, result1.publicSignals);
        
        console.log('\n---\n');
        
        // Test case 2: Eligible user (has 15 commits)
        console.log('Test 2: Eligible user with 15 Web3 commits');
        const result2 = await generateEligibilityProof('test-user-456', 0, 15);
        await verifyProof(result2.proof, result2.publicSignals);
        
        console.log('\n---\n');
        
        // Test case 3: Ineligible user
        console.log('Test 3: Ineligible user');
        const result3 = await generateEligibilityProof('test-user-789', 0, 5);
        await verifyProof(result3.proof, result3.publicSignals);
    })();
}
