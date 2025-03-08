import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decryptData, encryptData } from '@/lib/encrypt';
import { createSubscription } from '@/lib/outlookApi';

export async function POST() {
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

    // Set up subscription for webhook notifications
    const subscription = await createSubscription(tokens);
    
    if (!subscription || !subscription.id) {
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
    }

    // Store the subscription ID in a cookie for future reference
    // This can be used for renewal or cleanup later
    const encryptedSub = await encryptData(JSON.stringify({
      id: subscription.id,
      expirationDateTime: subscription.expirationDateTime
    }));
    
    cookieStore.set({
      name: 'outlook_subscription',
      value: encryptedSub,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // Set cookie expiration to match subscription expiration
      maxAge: Math.floor((new Date(subscription.expirationDateTime).getTime() - Date.now()) / 1000)
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        resource: subscription.resource,
        expirationDateTime: subscription.expirationDateTime
      }
    });
  } catch (error) {
    console.error('Error setting up Outlook subscription:', error);
    return NextResponse.json({ 
      error: 'Failed to set up notifications',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// Renew an existing subscription
export async function PATCH() {
  try {
    // Get token from cookie
    const cookieStore =await cookies();
    const tokenCookie = cookieStore.get('outlook_auth_token');
    const subscriptionCookie = cookieStore.get('outlook_subscription');
    
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Not authenticated with Outlook' }, { status: 401 });
    }
    
    if (!subscriptionCookie) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }
    
    // Decrypt the cookies
    const decryptedTokens = await decryptData(tokenCookie.value);
    const tokens = JSON.parse(decryptedTokens);
    
    const decryptedSub = await decryptData(subscriptionCookie.value);
    const subscription = JSON.parse(decryptedSub);
    
    // Import renewSubscription only when needed
    const { renewSubscription } = await import('@/lib/outlookApi');
    
    // Renew the subscription
    const renewed = await renewSubscription(tokens, subscription.id);
    
    if (!renewed || !renewed.id) {
      return NextResponse.json({ error: 'Failed to renew subscription' }, { status: 500 });
    }

    // Update the subscription cookie
    const encryptedSub = await encryptData(JSON.stringify({
      id: renewed.id,
      expirationDateTime: renewed.expirationDateTime
    }));
    
    cookieStore.set({
      name: 'outlook_subscription',
      value: encryptedSub,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // Set cookie expiration to match subscription expiration
      maxAge: Math.floor((new Date(renewed.expirationDateTime).getTime() - Date.now()) / 1000)
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: renewed.id,
        expirationDateTime: renewed.expirationDateTime
      }
    });
  } catch (error) {
    console.error('Error renewing Outlook subscription:', error);
    return NextResponse.json({ 
      error: 'Failed to renew notifications',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}