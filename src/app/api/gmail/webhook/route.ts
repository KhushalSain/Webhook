// src/app/api/gmail/webhook/route.ts
import { NextResponse } from 'next/server';

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

    // Get BASE_URL from environment variables
    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
    
    // Make a call to listEmails endpoint
    try {
      const response = await fetch(`${BASE_URL}/api/gmail/listEmails`, {
        method: 'GET',
      });

      if (!response.ok) {
        console.error('Error calling listEmails endpoint:', response.statusText);
      } else {
        console.log('Successfully called listEmails endpoint');
      }
    } catch (fetchError) {
      console.error('Error fetching listEmails endpoint:', fetchError);
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