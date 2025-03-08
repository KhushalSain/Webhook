// src/lib/tokenStorage.ts
import { TokenData, GoogleTokenData } from '@/types/auth';
import { PrismaClient } from '@prisma/client';

// Create Prisma client instance
const prisma = new PrismaClient();

// In-memory storage (used as cache or fallback)
const tokenStore: Record<string, TokenData> = {};

/**
 * Stores a Gmail token by email address
 */
export async function storeGmailToken(emailAddress: string, token: TokenData): Promise<void> {
  // Store in memory first
  tokenStore[emailAddress] = token;
  
  try {
    // Format the token for the database structure
    const googleToken = token as GoogleTokenData;
    const expiresAt = googleToken.expiry_date 
      ? new Date(googleToken.expiry_date) 
      : new Date(Date.now() + 3600 * 1000); // Default 1 hour if no expiry

    // Store in database using Prisma
    await prisma.gmailToken.upsert({
      where: { email: emailAddress },
      update: {
        accessToken: googleToken.access_token,
        refreshToken: googleToken.refresh_token || '',
        expiresAt,
        tokenType: googleToken.token_type,
        scope: googleToken.scope,
      },
      create: {
        email: emailAddress,
        accessToken: googleToken.access_token,
        refreshToken: googleToken.refresh_token || '',
        expiresAt,
        tokenType: googleToken.token_type,
        scope: googleToken.scope,
      },
    });
    
    console.log(`Stored Gmail token for ${emailAddress} in database`);
  } catch (error) {
    console.error(`Failed to store Gmail token in database for ${emailAddress}:`, error);
    // Token is still stored in memory even if database storage fails
  }
}

/**
 * Retrieves a Gmail token by email address
 */
export async function getGmailToken(emailAddress: string): Promise<TokenData | null> {
  try {
    // Try to get from database first
    const storedToken = await prisma.gmailToken.findUnique({
      where: { email: emailAddress },
    });

    if (storedToken) {
      // Convert to TokenData format
      const token: GoogleTokenData = {
        access_token: storedToken.accessToken,
        refresh_token: storedToken.refreshToken,
        token_type: storedToken.tokenType,
        expiry_date: storedToken.expiresAt.getTime(),
        scope: storedToken.scope || '',
      };
      
      // Update memory cache
      tokenStore[emailAddress] = token;
      
      return token;
    }
    
    // Fall back to memory storage if not in database
    return tokenStore[emailAddress] || null;
  } catch (error) {
    console.error(`Failed to retrieve Gmail token from database for ${emailAddress}:`, error);
    // Fall back to memory storage on database error
    return tokenStore[emailAddress] || null;
  }
}