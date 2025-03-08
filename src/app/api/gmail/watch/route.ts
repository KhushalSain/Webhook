import { NextResponse } from 'next/server';
import { watchEmails, getUserInfo } from '@/lib/gmailApi';
import { getTokensFromCookies } from '@/lib/cookieUtils';
import { storeGmailToken } from '@/lib/tokenStorage';

async function handleWatchRequest() {
  try {
    // Get token from cookies
    const tokens = await getTokensFromCookies();
    
    if (!tokens || !tokens.gmail) {
      console.error('Gmail authentication token not found in cookies');
      return NextResponse.json({ error: 'Gmail authentication token not found in cookies' }, { status: 401 });
    }
    
    // Set up watch on Gmail API using the utility function
    const watchResponse = await watchEmails(tokens.gmail);
    
    // Get user info and check if email exists
    const userInfo = await getUserInfo(tokens.gmail.access_token);
    
    if (!userInfo || !userInfo.email) {
      console.error('Failed to retrieve valid email from user profile');
      return NextResponse.json({ 
        error: 'Failed to retrieve user email address' 
      }, { status: 500 });
    }
    
    // Store token with email association
    storeGmailToken(userInfo.email, tokens.gmail);
    
    // Return success with expiration details
    return NextResponse.json({ 
      message: 'Watch request successful', 
      data: {
        historyId: watchResponse.historyId,
        expiration: watchResponse.expiration
      }
    });
  } catch (error) {
    console.error('Error initiating watch request:', error);
    return NextResponse.json({ 
      error: 'Error initiating watch request', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return handleWatchRequest();
}

export async function POST() {
  return handleWatchRequest();
}