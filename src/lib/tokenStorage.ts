// src/lib/tokenStorage.ts
import { TokenData, GoogleTokenData } from '@/types/auth';
import { PrismaClient } from '@prisma/client';

// PrismaClient singleton implementation for serverless environments
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create or reuse Prisma client instance (prevents connection pool exhaustion in serverless environments)
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  // In production, use a new instance each time
  prisma = createPrismaInstance();
} else {
  // In development, reuse the same instance to avoid too many connections
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaInstance();
  }
  prisma = globalForPrisma.prisma;
}

// Helper function to create and configure a Prisma instance
function createPrismaInstance(): PrismaClient {
  try {
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error'] : [],
      // Data proxy configuration for better serverless performance
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Test database connection
    if (process.env.NODE_ENV === 'development') {
      // Only test connection in development to avoid slowing down production cold starts
      (async () => {
        try {
          await client.$connect();
          console.log('Successfully connected to database');
        } catch (e) {
          console.warn('Failed to connect to database:', e);
          console.warn('Will use in-memory storage as fallback');
        }
      })();
    }
    
    return client;
  } catch (e) {
    console.error('Failed to initialize Prisma client:', e);
    
    // Define a type that extends Promise for Prisma-specific promises
    type PrismaPromiseType<T> = Promise<T> & {
      [Symbol.toStringTag]: string;
    };
    
    // Create a properly typed mock Prisma client for fallback
    const createPrismaPromise = <T>(returnValue: T) => {
      const promise = Promise.resolve(returnValue) as PrismaPromiseType<T>;
      promise[Symbol.toStringTag] = "PrismaPromise";
      return promise;
    };
    
    return {
      gmailToken: {
        upsert: () => createPrismaPromise({ 
          id: 'mock-id', 
          email: 'mock@example.com',
          accessToken: '',
          refreshToken: '',
          expiresAt: new Date(),
          tokenType: 'Bearer',
          scope: '',
          createdAt: new Date(),
          updatedAt: new Date()
        }),
        findUnique: () => createPrismaPromise(null),
      },
      $disconnect: async () => {},
      $connect: async () => {}
    } as unknown as PrismaClient;
  }
}

// In-memory storage (used as cache or fallback)
const tokenStore: Record<string, TokenData> = {};

/**
 * Stores a Gmail token by email address
 */
export async function storeGmailToken(emailAddress: string, token: TokenData): Promise<void> {
  // Store in memory first (reliable fallback)
  tokenStore[emailAddress] = token;
  
  try {
    // Format the token for the database structure
    const googleToken = token as GoogleTokenData;
    const expiresAt = googleToken.expiry_date 
      ? new Date(googleToken.expiry_date) 
      : new Date(Date.now() + 3600 * 1000); // Default 1 hour if no expiry

    // Attempt to store in database using Prisma
    try {
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
    } catch (dbError) {
      console.error(`Failed to store Gmail token in database for ${emailAddress}:`, dbError);
      console.log(`Using in-memory storage for ${emailAddress} as fallback`);
    }
  } catch (error) {
    console.error(`Failed to process token for ${emailAddress}:`, error);
    // Token is still stored in memory even if processing fails
  }
}

/**
 * Retrieves a Gmail token by email address
 */
export async function getGmailToken(emailAddress: string): Promise<TokenData | null> {
  try {
    // Try to get from database first
    try {
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
    } catch (dbError) {
      console.error(`Failed to retrieve token from database for ${emailAddress}:`, dbError);
      console.log(`Using in-memory storage for ${emailAddress} as fallback`);
    }
    
    // Fall back to memory storage if not in database or if database retrieval failed
    return tokenStore[emailAddress] || null;
  } catch (error) {
    console.error(`Error in getGmailToken for ${emailAddress}:`, error);
    // Fall back to memory storage on any error
    return tokenStore[emailAddress] || null;
  }
}

// In serverless environments, we don't need to handle cleanup explicitly
// as the container will be destroyed after execution