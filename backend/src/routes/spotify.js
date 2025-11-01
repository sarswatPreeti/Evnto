import express from 'express';
import SpotifyWebApi from 'spotify-web-api-node';
import { buildPoseidon } from 'circomlibjs';
import * as snarkjs from 'snarkjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Spotify API Configuration
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:4000/api/spotify/callback'
});

const SPOTIFY_SCOPES = [
  'user-top-read',
  'user-read-email',
  'user-read-private'
];

const SPOTIFY_TOP_N = 10; // Check top 10 artists
const SPOTIFY_TIME_RANGE = 'medium_term'; // Last 6 months

// Generate Spotify OAuth URL
router.get('/auth', (req, res) => {
  try {
    const state = Math.random().toString(36).substring(7);
    const authorizeURL = spotifyApi.createAuthorizeURL(SPOTIFY_SCOPES, state);
    
    res.json({
      success: true,
      authUrl: authorizeURL,
      state
    });
  } catch (error) {
    console.error('Spotify auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Spotify auth URL'
    });
  }
});

// Spotify OAuth callback
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'Authorization code not provided'
    });
  }

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    // Redirect back to frontend with tokens
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/spotify-callback?access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`;
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Spotify callback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to exchange authorization code'
    });
  }
});

// Get user's top artists
router.get('/top-artists', async (req, res) => {
  const { access_token } = req.query;

  if (!access_token) {
    return res.status(400).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    spotifyApi.setAccessToken(access_token);
    
    const topArtists = await spotifyApi.getMyTopArtists({
      limit: SPOTIFY_TOP_N,
      time_range: SPOTIFY_TIME_RANGE
    });

    const artists = topArtists.body.items.map(artist => ({
      id: artist.id,
      name: artist.name,
      images: artist.images,
      genres: artist.genres,
      popularity: artist.popularity
    }));

    res.json({
      success: true,
      artists,
      count: artists.length
    });
  } catch (error) {
    console.error('Spotify top artists error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top artists'
    });
  }
});

// Get user profile
router.get('/profile', async (req, res) => {
  const { access_token } = req.query;

  if (!access_token) {
    return res.status(400).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    spotifyApi.setAccessToken(access_token);
    
    const profile = await spotifyApi.getMe();

    res.json({
      success: true,
      profile: {
        id: profile.body.id,
        displayName: profile.body.display_name,
        email: profile.body.email,
        images: profile.body.images
      }
    });
  } catch (error) {
    console.error('Spotify profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

// Generate ZK proof for Spotify fan verification
router.post('/verify', async (req, res) => {
  const { spotifyUserId, artistId, eventId, access_token } = req.body;

  if (!spotifyUserId || !artistId || !eventId || !access_token) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: spotifyUserId, artistId, eventId, access_token'
    });
  }

  try {
    // Set access token and fetch user's top artists
    spotifyApi.setAccessToken(access_token);
    const topArtistsResponse = await spotifyApi.getMyTopArtists({
      limit: SPOTIFY_TOP_N,
      time_range: SPOTIFY_TIME_RANGE
    });

    const topArtists = topArtistsResponse.body.items;
    const isTopFan = topArtists.some(artist => artist.id === artistId);

    if (!isTopFan) {
      return res.status(403).json({
        success: false,
        error: 'User is not a top fan of this artist',
        topArtists: topArtists.map(a => ({ id: a.id, name: a.name }))
      });
    }

    // Initialize Poseidon hash
    const poseidon = await buildPoseidon();
    const F = poseidon.F;

    // Hash artist ID
    const artistIdBigInt = BigInt('0x' + Buffer.from(artistId).toString('hex'));
    const artistHash = F.toString(poseidon([artistIdBigInt]));

    // Hash all top artist IDs
    const topArtistsHashes = topArtists.map(artist => {
      const artistIdBig = BigInt('0x' + Buffer.from(artist.id).toString('hex'));
      return F.toString(poseidon([artistIdBig]));
    });

    // Pad to exactly 10 artists with zeros
    while (topArtistsHashes.length < SPOTIFY_TOP_N) {
      topArtistsHashes.push('0');
    }

    // Hash Spotify user ID
    const userIdBigInt = BigInt('0x' + Buffer.from(spotifyUserId).toString('hex'));
    const userSpotifyIdHash = F.toString(poseidon([userIdBigInt]));

    // Prepare circuit inputs
    const input = {
      artistHash: artistHash,
      topArtistsHashes: topArtistsHashes,
      userSpotifyIdHash: userSpotifyIdHash,
      eventId: eventId.toString()
    };

    console.log('Generating Spotify ZK proof with inputs:', {
      artistHash,
      topArtistsCount: topArtistsHashes.filter(h => h !== '0').length,
      eventId
    });

    // Generate ZK proof
    const circuitWasmPath = path.join(__dirname, '../../circuits/spotify_fan_verification_js/spotify_fan_verification.wasm');
    const zkeyPath = path.join(__dirname, '../../circuits/spotify_fan_verification.zkey');

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      circuitWasmPath,
      zkeyPath
    );

    console.log('Spotify ZK proof generated successfully');
    console.log('Public signals:', publicSignals);

    res.json({
      success: true,
      proof: {
        pi_a: proof.pi_a.slice(0, 2),
        pi_b: [
          proof.pi_b[0].slice(0, 2).reverse(),
          proof.pi_b[1].slice(0, 2).reverse()
        ],
        pi_c: proof.pi_c.slice(0, 2)
      },
      publicSignals: publicSignals,
      artistFound: true,
      topArtistsCount: topArtists.length
    });

  } catch (error) {
    console.error('Spotify verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate Spotify verification proof'
    });
  }
});

export default router;
