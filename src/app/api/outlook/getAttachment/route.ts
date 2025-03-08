import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decryptData } from '@/lib/encrypt';
import { getOutlookAttachment } from '@/lib/outlookApi';

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

    // Get message ID and attachment ID from query parameters
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const attachmentId = searchParams.get('attachmentId');
    
    if (!messageId || !attachmentId) {
      return NextResponse.json({ 
        error: 'Missing required parameters', 
        details: 'Both messageId and attachmentId are required'
      }, { status: 400 });
    }

    // Get the attachment data from Outlook
    const attachment = await getOutlookAttachment(tokens, messageId, attachmentId);
    
    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // For Outlook, attachments are returned with contentBytes (base64 encoded)
    // We need to decode it and return as a proper file
    if (attachment.contentBytes) {
      // Decode base64 to binary
      const binaryData = Buffer.from(attachment.contentBytes, 'base64');
      
      // Set appropriate headers for file download
      const headers = new Headers();
      headers.set('Content-Type', attachment.contentType || 'application/octet-stream');
      headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.name)}"`);
      headers.set('Content-Length', binaryData.length.toString());
      
      // Return the binary data with appropriate headers
      return new NextResponse(binaryData, {
        status: 200,
        headers
      });
    } else {
      return NextResponse.json({ 
        error: 'Invalid attachment data',
        details: 'No content found in attachment'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching Outlook attachment:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch attachment',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}