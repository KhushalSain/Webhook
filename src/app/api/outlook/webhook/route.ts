import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decryptData } from '@/lib/encrypt';
import { getOutlookEmail } from '@/lib/outlookApi';

// The webhook handler needs to handle both validation requests and actual notifications
export async function POST(request: Request) {
  try {
    // Microsoft sends a validation token when setting up subscriptions
    const { searchParams } = new URL(request.url);
    const validationToken = searchParams.get('validationToken');
    
    if (validationToken) {
      // This is a validation request - respond with the token as plain text
      return new NextResponse(validationToken, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    // This is an actual notification - parse the body
    const data = await request.json();
    
    // Verify clientState to ensure the request is legitimate
    const expectedClientState = "outlookSubscriptionVerification";
    if (data.clientState !== expectedClientState) {
      console.error('Invalid clientState in notification');
      return NextResponse.json({ error: 'Invalid clientState' }, { status: 401 });
    }

    // Process the notifications
    const notifications = data.value || [];
    console.log(`Received ${notifications.length} notifications from Outlook`);
    
    // Process each notification (in a real app, you might want to use a queue)
    for (const notification of notifications) {
      try {
        // Get cookie store
        const cookieStore = await cookies();
        const tokenCookie = cookieStore.get('outlook_auth_token');
        
        if (!tokenCookie) {
          console.error('No authentication token found for processing notification');
          continue;
        }
        
        // Decrypt the token
        const decryptedTokens = await decryptData(tokenCookie.value);
        const tokens = JSON.parse(decryptedTokens);
        
        // Extract the message ID from the resource URL
        // Resource format is typically: me/messages/{id}
        const resourceParts = notification.resource.split('/');
        const messageId = resourceParts[resourceParts.length - 1];
        
        if (!messageId) {
          console.error('Could not extract message ID from notification resource');
          continue;
        }
        
        // Fetch the email details
        const message = await getOutlookEmail(tokens, messageId);
        
        // Process the message (e.g., store in database, notify user, etc.)
        console.log(`Processed message: ${message.subject}`);
        
        // In a real application, you might:
        // 1. Update UI via WebSockets
        // 2. Send push notifications
        // 3. Process attachments automatically
        // 4. Add to a queue for further processing
      } catch (notificationError) {
        console.error('Error processing notification:', notificationError);
        // Continue processing other notifications
      }
    }

    // Acknowledge receipt of notifications
    return NextResponse.json({ status: 'notifications processed' });
  } catch (error) {
    console.error('Error in Outlook webhook handler:', error);
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// Handle validation requests which can come as GET
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const validationToken = searchParams.get('validationToken');
  
  if (validationToken) {
    // This is a validation request - respond with the token as plain text
    return new NextResponse(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  // Not a validation request
  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}