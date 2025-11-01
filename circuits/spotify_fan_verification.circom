pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

/**
 * Spotify Fan Verification Circuit
 * Proves user is a top fan of an artist without revealing listening data
 * 
 * Private Inputs:
 *   - artistHash: Poseidon hash of event's featured artist ID
 *   - topArtistsHashes[10]: Array of Poseidon hashes of user's top 10 artists
 *   - userSpotifyIdHash: Hash of user's Spotify ID (for nullifier)
 * 
 * Public Outputs:
 *   - result: 1 if user is a fan, 0 otherwise
 *   - nullifier: Unique hash preventing double claims
 *   - eventId: Event identifier (public input)
 */

template SpotifyFanVerification(topN) {
    // Private inputs
    signal input artistHash;                    // Hash of event artist
    signal input topArtistsHashes[topN];       // User's top N artist hashes
    signal input userSpotifyIdHash;            // Hash of user's Spotify ID
    
    // Public inputs
    signal input eventId;                       // Event identifier
    
    // Public outputs
    signal output result;                       // 1 if fan, 0 if not
    signal output nullifier;                    // Prevents double minting
    
    // Check if artist is in top N
    component eq[topN];
    signal matches[topN];
    
    for (var i = 0; i < topN; i++) {
        eq[i] = IsEqual();
        eq[i].in[0] <== artistHash;
        eq[i].in[1] <== topArtistsHashes[i];
        matches[i] <== eq[i].out;
    }
    
    // Sum up all matches
    signal sum[topN];
    sum[0] <== matches[0];
    for (var i = 1; i < topN; i++) {
        sum[i] <== sum[i-1] + matches[i];
    }
    
    // Result is 1 if any match found (sum > 0)
    component isPositive = GreaterThan(4);
    isPositive.in[0] <== sum[topN-1];
    isPositive.in[1] <== 0;
    result <== isPositive.out;
    
    // Generate nullifier to prevent double minting
    // nullifier = hash(userSpotifyIdHash, eventId)
    component nullifierHash = Poseidon(2);
    nullifierHash.inputs[0] <== userSpotifyIdHash;
    nullifierHash.inputs[1] <== eventId;
    nullifier <== nullifierHash.out;
}

component main {public [eventId]} = SpotifyFanVerification(10);
