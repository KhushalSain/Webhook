import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } from '../../../../lib/googleAuth';
import { decryptData } from '@/lib/encrypt';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const attachmentId = searchParams.get('attachmentId');
    
    if (!messageId || !attachmentId) {
      return NextResponse.json({ 
        error: 'Message ID and attachment ID are required' 
      }, { status: 400 });
    }
    
    // Get token from cookie
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
    
    // Get attachment
    const response = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId
    });
    
    if (!response.data.data) {
      return NextResponse.json({ error: 'Attachment data not found' }, { status: 404 });
    }
    
    // Decode attachment data
    const attachmentData = response.data.data;
    const normalizedData = attachmentData.replace(/-/g, '+').replace(/_/g, '/');
    const binaryData = Buffer.from(normalizedData, 'base64');
    
    // Create response with binary data and correct content type
    return new NextResponse(binaryData, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment'
      }
    });
    
  } catch (error: unknown) { // Change from any to unknown for better type safety
    console.error('Error fetching attachment:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
