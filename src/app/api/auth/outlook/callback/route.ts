import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { encryptData } from '@/lib/encrypt';
import { validateOutlookConfig, OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, OUTLOOK_REDIRECT_URI } from '@/lib/outlookAuth';

export async function GET(request: Request) {
  try {
    // Validate Outlook configuration
    validateOutlookConfig();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    if (error) {
      console.error(`Authorization error: ${error}. Description: ${searchParams.get('error_description')}`);
      return NextResponse.redirect(new URL('/?error=auth_rejected', request.url));
    }
    
    if (!code) {
      console.error('No authorization code provided in callback');
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
    }

    // Make sure client ID and secret are defined before using them
    if (!OUTLOOK_CLIENT_ID || !OUTLOOK_CLIENT_SECRET) {
      throw new Error('Missing required Outlook OAuth credentials');
    }

    // Exchange authorization code for access token
    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    const params = new URLSearchParams();
    params.append('client_id', OUTLOOK_CLIENT_ID);
    params.append('client_secret', OUTLOOK_CLIENT_SECRET);
    params.append('code', code);
    params.append('redirect_uri', OUTLOOK_REDIRECT_URI);
    params.append('grant_type', 'authorization_code');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const tokens = await response.json();
    
    if (!tokens.access_token) {
      console.error('No access token received from Microsoft');
      return NextResponse.json({ error: 'Failed to obtain access token' }, { status: 500 });
    }

    // Calculate expiry date if not provided directly
    if (tokens.expires_in) {
      tokens.expiry_date = Date.now() + tokens.expires_in * 1000;
    }

    // Encrypt tokens for security before storing
    const encryptedTokens = await encryptData(JSON.stringify(tokens));
    
    // Set token in HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'outlook_auth_token',
      value: encryptedTokens,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    // Redirect to dashboard without exposing tokens in URL
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('Error during OAuth callback:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ 
      error: 'Authentication error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}