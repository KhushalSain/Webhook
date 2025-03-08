// src/lib/tokenStorage.ts
import { TokenData } from '@/types/auth';

// In-memory storage (replace with database in production)
const tokenStore: Record<string, TokenData> = {};

/**
 * Stores a Gmail token by email address
 */
export function storeGmailToken(emailAddress: string, token: TokenData): void {
  tokenStore[emailAddress] = token;
  console.log(`Stored Gmail token for ${emailAddress}`);
}

/**
 * Retrieves a Gmail token by email address
 */
export function getGmailToken(emailAddress: string): TokenData | null {
  return tokenStore[emailAddress] || null;
}