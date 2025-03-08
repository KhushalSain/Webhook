import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } from '../../../../lib/googleAuth';
import { decryptData } from '@/lib/encrypt';

// Define types for Gmail message parts and payload
interface GmailMessagePart {
  mimeType?: string;
  filename?: string;
  body?: {
    data?: string;
    attachmentId?: string;
    size?: number;
  };
  headers?: { name?: string; value?: string }[];
  parts?: GmailMessagePart[];
}

interface GmailMessagePayload {
  headers?: { name?: string; value?: string }[];
  parts?: GmailMessagePart[];
  body?: {
    data?: string;
  };
}

// Helper function to extract header values
function getHeader(headers: { name?: string | null; value?: string | null }[], name: string): string { // Updated type
  const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
  return header && header.value ? header.value : '';
}

// Helper function to decode base64 content
function decodeBase64(data: string): string {
  try {
    // Replace URL-safe characters and decode
    const normalizedData = data.replace(/-/g, '+').replace(/_/g, '/');
    const buffer = Buffer.from(normalizedData, 'base64');
    return buffer.toString('utf-8');
  } catch (error) {
    console.error('Error decoding base64:', error);
    return '';
  }
}

// Function to find message parts recursively
function findBodyParts(part: GmailMessagePart, mimeType: string = 'text/html'): GmailMessagePart[] {
  const parts: GmailMessagePart[] = [];
  
  if (part.mimeType === mimeType && part.body?.data) {
    parts.push(part);
  }
  
  if (part.parts && Array.isArray(part.parts)) {
    for (const subPart of part.parts) {
      parts.push(...findBodyParts(subPart, mimeType));
    }
  }
  
  return parts;
}

// Function to extract attachments
function extractAttachments(payload: GmailMessagePayload): { attachmentId: string; filename: string; mimeType: string; size: number }[] {
  const attachments: { attachmentId: string; filename: string; mimeType: string; size: number }[] = [];
  
  function traverse(part: GmailMessagePart) {
    if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream', // Default value for mimeType
        size: part.body.size || 0 // Default value for size
      });
    }
    
    if (part.parts && Array.isArray(part.parts)) {
      part.parts.forEach(traverse);
    }
  }
  
  if (payload) {
    traverse(payload);
  }
  
  return attachments;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('id');
    
    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }
    
    // Get token from cookie - using await for cookies()
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
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });
    
    const message = response.data;
    const payload = message.payload as GmailMessagePayload;
    const headers = payload?.headers || [];
    
    // Extract email headers
    const from = getHeader(headers, 'from');
    const to = getHeader(headers, 'to');
    const subject = getHeader(headers, 'subject');
    const date = getHeader(headers, 'date');
    
    // Extract email body
    let body = '';
    let plainText = '';
    
    // First try to get HTML content
    if (payload) {
      const htmlParts = findBodyParts(payload, 'text/html');
      
      if (htmlParts.length > 0 && htmlParts[0].body?.data) {
        body = decodeBase64(htmlParts[0].body.data);
      } else {
        // If no HTML, try to get plain text
        const textParts = findBodyParts(payload, 'text/plain');
        
        if (textParts.length > 0 && textParts[0].body?.data) {
          plainText = decodeBase64(textParts[0].body.data);
          // Convert plain text to HTML with proper line breaks
          body = plainText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
        }
      }
    }
    
    // Extract attachments
    const attachments = extractAttachments(payload);
    
    return NextResponse.json({
      id: messageId,
      from,
      to,
      subject,
      date,
      body,
      attachments,
      snippet: message.snippet,
      hasAttachments: attachments.length > 0
    });
    
  } catch (error: unknown) {
    console.error('Error fetching message details:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
