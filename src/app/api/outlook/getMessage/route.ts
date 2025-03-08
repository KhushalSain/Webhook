import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decryptData } from '@/lib/encrypt';
import { getOutlookEmailContent } from '@/lib/outlookApi';
import { Attachment } from '@/types/email';

export async function GET(request: Request) {
  try {
    // Get token from cookie
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('outlook_auth_token');
    
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Not authenticated with Outlook' }, { status: 401 });
    }
    
    // Decrypt the token from the cookie
    const decryptedTokens = await decryptData(tokenCookie.value);
    const tokens = JSON.parse(decryptedTokens);

    // Get message ID from query parameters
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('id');
    
    if (!messageId) {
      return NextResponse.json({ error: 'No message ID provided' }, { status: 400 });
    }

    // Get the email content from Outlook
    const message = await getOutlookEmailContent(tokens, messageId);
    
    // Transform attachments into a more usable format
    const attachments = message.attachments.map((attachment: Attachment) => ({
      id: attachment.id,
      name: attachment.name,
      contentType: attachment.contentType,
      size: attachment.size,
      isInline: attachment.isInline
    }));

    return NextResponse.json({
      id: message.id,
      subject: message.subject,
      from: message.from,
      date: message.date,
      body: message.body,
      contentType: message.contentType,
      attachments,
      service: 'outlook'
    });
  } catch (error) {
    console.error('Error fetching Outlook message:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch message',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}