import { NextResponse } from 'next/server';
import { validateOutlookConfig, OUTLOOK_CLIENT_ID, OUTLOOK_REDIRECT_URI } from '../../../../lib/outlookAuth';

export async function GET() {
  try {
    // Validate Outlook configuration
    validateOutlookConfig();

     // Make sure client ID is defined
     if (!OUTLOOK_CLIENT_ID) {
      throw new Error('Missing required OUTLOOK_CLIENT_ID');
    }
    
    // Microsoft OAuth2 authorization URL
    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    
    // Required query parameters
    authUrl.searchParams.append('client_id', OUTLOOK_CLIENT_ID);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', OUTLOOK_REDIRECT_URI);
    authUrl.searchParams.append('response_mode', 'query');
    
    // Request offline access for refresh tokens and necessary scopes
    authUrl.searchParams.append('scope', 'offline_access Mail.Read Mail.ReadWrite');
    
    // Redirect to Microsoft's authorization page
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Error initiating Outlook authorization:', error);
    return NextResponse.json({ 
      error: 'Failed to initiate Outlook authorization', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}