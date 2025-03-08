import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } from '../../../../lib/googleAuth';
import { decryptData } from '@/lib/encrypt';
import { getGmailToken } from '@/lib/tokenStorage';
import DOMPurify from 'isomorphic-dompurify';

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
  partId?: string;
  contentId?: string;
}

interface GmailMessagePayload {
  headers?: { name?: string; value?: string }[];
  parts?: GmailMessagePart[];
  body?: {
    data?: string;
  };
  mimeType?: string;
  partId?: string;
}

// Interface for attachment with inline data
interface AttachmentWithMessageId {
  id: string;
  name: string;
  contentType: string;
  size: number;
  inline: boolean;
  contentId?: string;
  messageId: string;
}

// Define type for API errors
interface ApiError extends Error {
  status?: number;
  message: string;
}

// Helper function to extract header values
function getHeader(headers: { name?: string | null; value?: string | null }[], name: string): string {
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

// Function to find body parts by MIME type
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

// Function to extract all attachments including inline images
function extractAttachments(payload: GmailMessagePayload): { id: string; name: string; contentType: string; size: number; inline: boolean; contentId?: string }[] {
  const attachments: { id: string; name: string; contentType: string; size: number; inline: boolean; contentId?: string }[] = [];
  
  function traverse(part: GmailMessagePart) {
    // Check if it's an attachment (has filename and attachmentId)
    if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
      const isInline = part.contentId ? true : false;
      
      attachments.push({
        id: part.body.attachmentId,
        name: part.filename,
        contentType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0,
        inline: isInline,
        contentId: part.contentId
      });
    }
    
    // Recursively check all child parts
    if (part.parts && Array.isArray(part.parts)) {
      part.parts.forEach(traverse);
    }
  }
  
  if (payload) {
    traverse(payload);
  }
  
  return attachments;
}

// Function to extract email addresses from header
function extractEmailAddresses(header: string): { name: string; email: string }[] {
  if (!header) return [];
  
  const addresses: { name: string; email: string }[] = [];
  const regex = /(?:"([^"]+)")?[^<]*<([^>]+)>|([^,]+)/g;
  let match;

  while ((match = regex.exec(header)) !== null) {
    const displayName = match[1] || match[3]?.split('@')[0] || '';
    const email = match[2] || match[3] || '';
    if (email) {
      addresses.push({
        name: displayName.trim(),
        email: email.trim()
      });
    }
  }

  return addresses;
}

// Process HTML to handle inline images
function processHtmlContent(html: string, attachments: AttachmentWithMessageId[]): string {
  let processedHtml = html;
  
  // Replace cid: references with attachment URLs
  attachments.forEach(attachment => {
    if (attachment.inline && attachment.contentId) {
      const contentId = attachment.contentId.replace(/[<>]/g, '');
      const regex = new RegExp(`cid:${contentId}`, 'gi');
      processedHtml = processedHtml.replace(
        regex, 
        `/api/gmail/getAttachment?messageId=${attachment.messageId}&attachmentId=${attachment.id}`
      );
    }
  });
  
  // Sanitize HTML to prevent XSS attacks
  return DOMPurify.sanitize(processedHtml, {
    ADD_ATTR: ['target'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|data|cid):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('id');
    
    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
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
    
    try {
      // Get message with full details
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });
      
      const message = response.data;
      
      if (!message.id) {
        throw new Error('Message ID is missing in the response');
      }
      
      const payload = message.payload as GmailMessagePayload;
      const headers = payload?.headers || [];
      
      // Extract email headers with more detailed parsing
      const fromHeader = getHeader(headers, 'from');
      const toHeader = getHeader(headers, 'to');
      const ccHeader = getHeader(headers, 'cc');
      const bccHeader = getHeader(headers, 'bcc');
      const subject = getHeader(headers, 'subject');
      const date = getHeader(headers, 'date');
      const replyTo = getHeader(headers, 'reply-to');
      
      // Parse addresses into structured format
      const from = extractEmailAddresses(fromHeader);
      const to = extractEmailAddresses(toHeader);
      const cc = extractEmailAddresses(ccHeader);
      const bcc = extractEmailAddresses(bccHeader);
      
      // Extract all attachments including inline images
      const attachments = extractAttachments(payload).map(attachment => ({
        ...attachment,
        messageId: message.id as string
      }));
      
      // Extract email body - prioritize HTML, fallback to plain text
      let body = '';
      let plainText = '';
      let contentType = 'text/plain';
      
      // First try to get HTML content
      if (payload) {
        const htmlParts = findBodyParts(payload, 'text/html');
        
        if (htmlParts.length > 0 && htmlParts[0].body?.data) {
          contentType = 'text/html';
          body = decodeBase64(htmlParts[0].body.data);
          // Process HTML to handle inline images and sanitize content
          body = processHtmlContent(body, attachments as AttachmentWithMessageId[]);
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
      
      // Get thread information to support conversation view
      const threadInfo = await gmail.users.threads.get({
        userId: 'me',
        id: message.threadId || ''
      }).catch(() => null);
      
      // Format dates for better display
      const formattedDate = new Date(date).toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short'
      });
      
      return NextResponse.json({
        id: message.id,
        threadId: message.threadId,
        labelIds: message.labelIds || [],
        snippet: message.snippet,
        historyId: message.historyId,
        internalDate: message.internalDate,
        
        // Email headers
        subject,
        from,
        to,
        cc,
        bcc,
        date,
        formattedDate,
        replyTo: replyTo ? extractEmailAddresses(replyTo) : [],
        
        // Content
        body,
        plainText: plainText || '',
        contentType,
        
        // Attachments
        attachments,
        hasAttachments: attachments.filter(a => !a.inline).length > 0,
        inlineImages: attachments.filter(a => a.inline),
        
        // Thread metadata
        isInThread: (threadInfo?.data?.messages?.length ?? 0) > 1,
        messageCount: threadInfo?.data?.messages?.length || 1,
        service: 'gmail'
      });
      
    } catch (error: unknown) {
      console.error('Error fetching message details:', error);
      return NextResponse.json({ 
        error: (error as Error).message || 'Failed to fetch message details'
      }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error('Error fetching message details:', error);
    return NextResponse.json({ 
      error: (error as Error).message,
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    }, { status: 500 });
  }
}
