import express from 'express';
import axios from 'axios';
import crypto from 'crypto';

const router = express.Router();

// GitHub OAuth Configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 'http://localhost:4000/api/github/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// In-memory state store (use Redis in production)
const stateStore = new Map();

/**
 * GET /api/github/auth
 * Generate GitHub OAuth URL
 */
router.get('/auth', (req, res) => {
  try {
    // Generate random state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store state temporarily (expires in 10 minutes)
    stateStore.set(state, {
      timestamp: Date.now(),
      used: false
    });
    
    // Clean up old states
    for (const [key, value] of stateStore.entries()) {
      if (Date.now() - value.timestamp > 10 * 60 * 1000) {
        stateStore.delete(key);
      }
    }
    
    // Build GitHub OAuth URL
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: GITHUB_REDIRECT_URI,
      scope: 'read:user repo',
      state: state
    });
    
    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    
    console.log('🔑 Generated GitHub OAuth URL with state:', state);
    
    res.json({
      success: true,
      authUrl,
      state
    });
  } catch (error) {
    console.error('GitHub auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate GitHub auth URL'
    });
  }
});

/**
 * GET /api/github/callback
 * Handle GitHub OAuth callback
 */
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/error?message=Authorization code not provided`);
  }

  // Verify state to prevent CSRF
  if (!state || !stateStore.has(state)) {
    return res.redirect(`${FRONTEND_URL}/error?message=Invalid state parameter`);
  }
  
  const stateData = stateStore.get(state);
  if (stateData.used) {
    return res.redirect(`${FRONTEND_URL}/error?message=State already used`);
  }
  
  // Mark state as used
  stateData.used = true;
  stateStore.set(state, stateData);

  try {
    console.log('🔄 Exchanging GitHub code for access token...');
    
    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: GITHUB_REDIRECT_URI
      },
      {
        headers: {
          Accept: 'application/json'
        }
      }
    );

    const { access_token, token_type } = tokenResponse.data;

    if (!access_token) {
      throw new Error('No access token received from GitHub');
    }

    console.log('✅ GitHub access token obtained');

    // Redirect back to frontend with token (short-lived)
    // In production, consider storing in secure HTTP-only cookie
    const redirectUrl = `${FRONTEND_URL}/auth/github/callback?access_token=${access_token}&token_type=${token_type}`;
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ GitHub callback error:', error);
    res.redirect(`${FRONTEND_URL}/error?message=Failed to authenticate with GitHub`);
  }
});

/**
 * POST /api/github/verify-eligibility
 * Verify GitHub eligibility and generate ZK proof
 * This delegates to the existing /api/zk/github-verify endpoint
 */
router.post('/verify-eligibility', async (req, res) => {
  const { access_token, eventId } = req.body;

  if (!access_token) {
    return res.status(400).json({
      success: false,
      error: 'GitHub access token required'
    });
  }

  if (!eventId) {
    return res.status(400).json({
      success: false,
      error: 'Event ID required'
    });
  }

  try {
    // Forward to ZK verification endpoint
    // This keeps the OAuth and ZK concerns separated
    const zkVerifyUrl = `${process.env.API_URL || 'http://localhost:4000'}/api/zk/github-verify`;
    
    const response = await axios.post(zkVerifyUrl, {
      githubToken: access_token,
      eventId: eventId
    });

    return res.json(response.data);
  } catch (error) {
    console.error('❌ GitHub eligibility verification error:', error);
    
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to verify GitHub eligibility',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/github/profile
 * Get authenticated user's GitHub profile
 */
router.get('/profile', async (req, res) => {
  const { access_token } = req.query;

  if (!access_token) {
    return res.status(400).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    const user = response.data;

    res.json({
      success: true,
      profile: {
        id: user.id,
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
        bio: user.bio,
        public_repos: user.public_repos,
        followers: user.followers
      }
    });
  } catch (error) {
    console.error('GitHub profile error:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired access token'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch GitHub profile'
    });
  }
});

export default router;
