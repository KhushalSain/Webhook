// src/app/api/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, validateGoogleConfig } from '../../../../lib/googleAuth';
import { cookies } from 'next/headers';
import { encryptData } from '@/lib/encrypt';
import { storeGmailToken } from '@/lib/tokenStorage';
import { getUserInfo } from '@/lib/gmailApi';
import { GoogleTokenData } from '@/types/auth';

export async function GET(request: Request) {
  try {
    // Validate Google configuration
    validateGoogleConfig();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    if (!code) {
      console.error('No authorization code provided in callback');
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
    }

    console.log('Received auth code, exchanging for tokens...');
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    try {
      const { tokens } = await oauth2Client.getToken(code);
      
      if (!tokens.access_token) {
        console.error('No access token received from Google');
        return NextResponse.json({ error: 'Failed to obtain access token' }, { status: 500 });
      }
      
      oauth2Client.setCredentials(tokens);
      console.log('Successfully obtained tokens from Google');
      
      // Encrypt tokens for security before storing
      const encryptedTokens = await encryptData(JSON.stringify(tokens));
      
      // Set token in HTTP-only cookie
      const cookieStore = await cookies();
      cookieStore.set({
        name: 'gmail_auth_token',
        value: encryptedTokens,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });

      const userInfo = await getUserInfo(tokens.access_token);
      
      if (!userInfo.email) {
        throw new Error('Failed to get user email from Google');
      }
      
      // Convert tokens to GoogleTokenData type
      const googleTokenData: GoogleTokenData = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || undefined,
        scope: tokens.scope || '',
        token_type: tokens.token_type || 'Bearer',
        id_token: tokens.id_token || undefined,
        expiry_date: tokens.expiry_date || undefined
      };
      
      storeGmailToken(userInfo.email, googleTokenData);

      // Redirect to dashboard without exposing tokens in URL
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } catch (tokenError: unknown) {
      console.error('Error exchanging code for tokens:', (tokenError as Error).message);
      return NextResponse.json({ 
        error: 'Token exchange failed', 
        details: (tokenError as Error).message 
      }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error('Error during OAuth callback:', (error as Error).message);
    return NextResponse.json({ 
      error: 'Authentication error', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}
