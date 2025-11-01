/**
 * GitHub OAuth Configuration
 * For Web3 contributor verification
 */

export const GITHUB_CONFIG = {
  // GitHub OAuth App credentials (set in .env.local)
  clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  
  // OAuth scopes needed for verification
  scopes: ['read:user', 'repo'],
  
  // Redirect URI after OAuth
  redirectUri: process.env.NEXT_PUBLIC_FRONTEND_URL 
    ? `${process.env.NEXT_PUBLIC_FRONTEND_URL}/callback/github`
    : 'http://localhost:3000/callback/github',
  
  // GitHub OAuth endpoints
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  apiUrl: 'https://api.github.com',
};

/**
 * Generate GitHub OAuth URL
 * @param state - Random state for CSRF protection
 * @returns GitHub authorization URL
 */
export function getGitHubAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GITHUB_CONFIG.clientId,
    redirect_uri: GITHUB_CONFIG.redirectUri,
    scope: GITHUB_CONFIG.scopes.join(' '),
    state,
  });
  
  return `${GITHUB_CONFIG.authorizeUrl}?${params.toString()}`;
}

/**
 * Generate random state for CSRF protection
 */
export function generateState(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Store state in sessionStorage
 */
export function storeOAuthState(state: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('github_oauth_state', state);
  }
}

/**
 * Verify OAuth state
 */
export function verifyOAuthState(state: string): boolean {
  if (typeof window !== 'undefined') {
    const storedState = sessionStorage.getItem('github_oauth_state');
    sessionStorage.removeItem('github_oauth_state');
    return storedState === state;
  }
  return false;
}

/**
 * Store GitHub token temporarily (in-memory only for security)
 */
let githubTokenCache: string | null = null;

export function storeGitHubToken(token: string): void {
  githubTokenCache = token;
  // Auto-clear after 5 minutes
  setTimeout(() => {
    githubTokenCache = null;
  }, 5 * 60 * 1000);
}

export function getGitHubToken(): string | null {
  return githubTokenCache;
}

export function clearGitHubToken(): void {
  githubTokenCache = null;
}
