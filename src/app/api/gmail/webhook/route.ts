// src/app/api/gmail/webhook/route.ts
import { NextResponse } from 'next/server';
import { getGmailToken } from '@/lib/tokenStorage';
import { processWebhook } from '@/lib/gmailApi';

export async function POST(request: Request) {
  try {
    // Parse the Pub/Sub message
    const body = await request.json();
    console.log('Pub/Sub message received:', body);

    // Pub/Sub messages have a specific structure
    const pubsubMessage = body.message;
    if (!pubsubMessage || !pubsubMessage.data) {
      return NextResponse.json({ 
        error: 'Invalid Pub/Sub message format' 
      }, { status: 400 });
    }

    // Decode and process the webhook data
    try {
      // Decode base64 data from Pub/Sub
      const decodedData = Buffer.from(pubsubMessage.data, 'base64').toString('utf-8');
      const notificationData = JSON.parse(decodedData);
      
      // Process the notification to extract email and history data
      const webhookData = await processWebhook(notificationData);
      
      if (webhookData && webhookData.emailAddress) {
        // Get the token for this email address from database
        const token = await getGmailToken(webhookData.emailAddress);
        
        if (!token) {
          console.error('No token found for email address:', webhookData.emailAddress);
          return NextResponse.json({ error: 'Token not found' }, { status: 404 });
        }
        
        // Get BASE_URL from environment variables
        const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
        
        // Call the listEmails endpoint with the retrieved token
        const response = await fetch(`${BASE_URL}/api/gmail/listEmails`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          console.error('Error calling listEmails endpoint:', response.statusText);
        } else {
          console.log('Successfully called listEmails endpoint for', webhookData.emailAddress);
        }
      } else {
        console.log('No valid email address found in notification data');
      }
    } catch (parseError) {
      console.error('Error processing webhook data:', parseError);
    }

    return NextResponse.json({ 
      message: 'Notification received and processed'
    });
    
  } catch (error) {
    console.error('Error processing webhook notification:', error);
    return NextResponse.json({ 
      error: 'Error processing notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}