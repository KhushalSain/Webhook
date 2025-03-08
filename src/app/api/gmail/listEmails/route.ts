// src/app/api/gmail/listEmails/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } from '../../../../lib/googleAuth';
import { cookies } from 'next/headers';
import { decryptData } from '@/lib/encrypt';

// Helper function to extract header values
function getHeader(headers: { name?: string | null; value?: string | null }[], name: string): string { // Updated type
  const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
  return header && header.value ? header.value : '';
}

export async function GET() {
  try {
    // Get token from cookie instead of query parameter
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('gmail_auth_token');
    
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Decrypt the token from the cookie
    const decryptedTokens = await decryptData(tokenCookie.value);
    const tokens = JSON.parse(decryptedTokens);

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const res = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
      q: 'has:attachment'
    });
    const messages = res.data.messages || [];

    const emailDetails = await Promise.all(
      messages.map(async (msg) => {
        const msgRes = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id as string,
          format: 'full'
        });
        
        const headers = msgRes.data.payload?.headers || [];
        const hasAttachments = Boolean(
          msgRes.data.payload?.parts?.some(part => part.filename && part.filename.length > 0)
        );
        
        return {
          id: msg.id,
          snippet: msgRes.data.snippet || '',
          from: getHeader(headers, 'from'),
          subject: getHeader(headers, 'subject'),
          date: getHeader(headers, 'date'),
          hasAttachments: hasAttachments,
          // Include any labels if needed
          labelIds: msgRes.data.labelIds
        };
      })
    );

    return NextResponse.json({ emails: emailDetails });
  } catch (error) {
    console.error('Error fetching emails:', error);
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
  }
}
