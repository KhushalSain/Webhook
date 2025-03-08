import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decryptData } from '@/lib/encrypt';
import { listOutlookEmails } from '@/lib/outlookApi';

interface OutlookEmailAddress {
  name?: string;
  address?: string;
}

interface OutlookMessage {
  id: string;
  bodyPreview?: string;
  from?: {
    emailAddress: OutlookEmailAddress;
  };
  subject?: string;
  receivedDateTime?: string;
  hasAttachments?: boolean;
}

export async function GET(request: Request) {
  try {
    // Get token from cookie
    const cookieStore = await 
    cookies();
    const tokenCookie = cookieStore.get('outlook_auth_token');
    
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Not authenticated with Outlook' }, { status: 401 });
    }
    
    // Decrypt the token from the cookie
    const decryptedTokens = await decryptData(tokenCookie.value);
    const tokens = JSON.parse(decryptedTokens);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || '';
    
    // Default to showing emails with attachments if no filter specified
    const query = filter || 'hasAttachments eq true';

    // Get emails from Outlook
    const messageData = await listOutlookEmails(tokens, query);
    
    if (!messageData.value) {
      return NextResponse.json({ emails: [] });
    }
    
    // Transform the response to match our email interface
    const emails = messageData.value.map((msg: OutlookMessage) => ({
      id: msg.id,
      snippet: msg.bodyPreview || '',
      from: msg.from?.emailAddress?.name || msg.from?.emailAddress?.address || '',
      subject: msg.subject || '',
      date: msg.receivedDateTime || '',
      hasAttachments: msg.hasAttachments || false,
      service: 'outlook' // Add service identifier to distinguish from Gmail
    }));

    return NextResponse.json({ emails });
  } catch (error) {
    console.error('Error fetching Outlook emails:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch emails',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}