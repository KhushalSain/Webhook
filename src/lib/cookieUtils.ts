import { cookies } from 'next/headers';
import { encryptData,decryptData } from './encrypt';
import { TokenData, GoogleTokenData, OutlookTokenData } from '@/types/auth';

/**
 * Checks if token is GoogleTokenData
 */
function isGoogleToken(token: TokenData): token is GoogleTokenData {
  return 'expiry_date' in token;
}

/**
 * Checks if token is OutlookTokenData
 */
function isOutlookToken(token: TokenData): token is OutlookTokenData {
  return 'expires_at' in token;
}

/**
 * Gets expiry time in seconds for a token
 */
function getTokenExpirySeconds(tokens: TokenData): number {
  // Default to 7 days if no expiry information is available
  const defaultExpiry = 60 * 60 * 24 * 7; // 7 days in seconds
  
  if (isGoogleToken(tokens) && tokens.expiry_date) {
    return Math.floor((tokens.expiry_date - Date.now()) / 1000);
  } else if (isOutlookToken(tokens) && tokens.expires_at) {
    return Math.floor((new Date(tokens.expires_at).getTime() - Date.now()) / 1000);
  }
  
  return defaultExpiry;
}

/**
 * Sets a token in cookies with appropriate security settings
 */
export async function setTokenCookie(name: string, tokens: TokenData) {
  const encryptedTokens = await encryptData(JSON.stringify(tokens));
  
  // Calculate expiry based on token type
  const expirySeconds = getTokenExpirySeconds(tokens);
  
  // Set token in HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set({
    name,
    value: encryptedTokens,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: expirySeconds,
  });
}

/**
 * Clears a token cookie
 */
export  async function clearTokenCookie(name: string) {
  const cookieStore = await cookies();
  cookieStore.set({
    name,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Expire immediately
  });
}

interface TokenStore {
  gmail?: GoogleTokenData;
  outlook?: OutlookTokenData;
}

/**
 * Gets tokens from cookies
 */
export async function getTokensFromCookies(): Promise<TokenStore | null> {
  try {
    const cookieStore = await cookies();
    
    const gmailCookie = cookieStore.get('gmail_auth_token');
    const outlookCookie = cookieStore.get('outlook_auth_token');

    if (!gmailCookie && !outlookCookie) {
      return null;
    }

    const tokens: TokenStore = {};

    if (gmailCookie) {
      const decryptedGmail = await decryptData(gmailCookie.value);
      tokens.gmail = JSON.parse(decryptedGmail);
    }

    if (outlookCookie) {
      const decryptedOutlook = await decryptData(outlookCookie.value);
      tokens.outlook = JSON.parse(decryptedOutlook);
    }

    return tokens;
  } catch (error) {
    console.error('Error getting tokens from cookies:', error);
    return null;
  }
}