import { TokenData, OutlookTokenData } from '@/types/auth';
import { cookies } from 'next/headers';
import { encryptData } from './encrypt';

/**
 * Type guard to check if token is OutlookTokenData
 */
function isOutlookToken(token: TokenData): token is OutlookTokenData {
  return 'expires_at' in token || 'expires_in' in token;
}

/**
 * Makes an authenticated request to Microsoft Graph API
 */
export async function callGraphAPI(
  tokens: TokenData, 
  endpoint: string, 
  method: string = 'GET', 
  body?: Record<string, unknown>
) {
  try {
    // Check if token needs to be refreshed (for Outlook tokens)
    if (isOutlookToken(tokens) && tokens.expires_at && 
        new Date(tokens.expires_at).getTime() < Date.now() && 
        tokens.refresh_token) {
      const newTokens = await refreshAccessToken(tokens.refresh_token);
      if (newTokens) {
        // Update tokens in cookie for future requests
        await updateTokenCookie(newTokens);
        tokens = newTokens;
      }
    }
    
    const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(
        `Graph API error: ${response.status} ${errorData.error?.message || errorData.message || 'Unknown error'}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling Microsoft Graph API:', error);
    throw error;
  }
}

/**
 * Refresh the access token using a refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<OutlookTokenData | null> {
  const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID;
  const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET;

  if (!OUTLOOK_CLIENT_ID || !OUTLOOK_CLIENT_SECRET) {
    console.error('Missing required Outlook credentials for token refresh');
    return null;
  }

  try {
    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    const params = new URLSearchParams();
    params.append('client_id', OUTLOOK_CLIENT_ID);
    params.append('client_secret', OUTLOOK_CLIENT_SECRET);
    params.append('refresh_token', refreshToken);
    params.append('grant_type', 'refresh_token');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.status} ${response.statusText}`);
    }

    const tokens = await response.json();
    
    // Calculate expiry date if not provided
    if (tokens.expires_in) {
      tokens.expires_at = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    }

    return tokens as OutlookTokenData;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}

/**
 * Update token cookie after refresh
 */
async function updateTokenCookie(tokens: TokenData) {
  try {
    const encryptedTokens = await encryptData(JSON.stringify(tokens));
    
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'outlook_auth_token',
      value: encryptedTokens,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    
    return true;
  } catch (error) {
    console.error('Error updating token cookie:', error);
    return false;
  }
}

/**
 * Lists emails from Outlook
 */
export async function listOutlookEmails(tokens: TokenData, query: string = '') {
  try {
    let endpoint = '/me/messages?$top=20&$select=id,subject,bodyPreview,from,receivedDateTime,hasAttachments';
    
    if (query) {
      endpoint += `&$filter=${encodeURIComponent(query)}`;
    }
    
    const data = await callGraphAPI(tokens, endpoint);
    return data;
  } catch (error) {
    console.error('Error listing Outlook emails:', error);
    throw error;
  }
}

/**
 * Gets a specific email with attachment info
 */
export async function getOutlookEmail(tokens: TokenData, messageId: string) {
  try {
    const data = await callGraphAPI(
      tokens,
      `/me/messages/${messageId}?$expand=attachments`
    );
    return data;
  } catch (error) {
    console.error('Error getting Outlook email:', error);
    throw error;
  }
}

/**
 * Gets email content in HTML format if available
 */
export async function getOutlookEmailContent(tokens: TokenData, messageId: string) {
  try {
    const message = await getOutlookEmail(tokens, messageId);
    
    // Return HTML content if available, otherwise return plain text
    return {
      id: message.id,
      subject: message.subject || '',
      from: message.from?.emailAddress?.name || message.from?.emailAddress?.address || '',
      date: message.receivedDateTime || '',
      body: message.body?.content || '',
      contentType: message.body?.contentType || 'text',
      attachments: message.attachments || []
    };
  } catch (error) {
    console.error('Error getting Outlook email content:', error);
    throw error;
  }
}

/**
 * Downloads an attachment from Outlook
 */
export async function getOutlookAttachment(tokens: TokenData, messageId: string, attachmentId: string) {
  try {
    const data = await callGraphAPI(
      tokens,
      `/me/messages/${messageId}/attachments/${attachmentId}`
    );
    return data;
  } catch (error) {
    console.error('Error getting Outlook attachment:', error);
    throw error;
  }
}

/**
 * Sets up a subscription for real-time notifications
 */
export async function createSubscription(tokens: TokenData) {
  const notificationUrl = process.env.OUTLOOK_WEBHOOK_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/outlook/webhook`;
  
  if (!notificationUrl) {
    throw new Error('No notification URL configured for webhooks');
  }
  
  try {
    const subscriptionData = {
      changeType: "created,updated",
      notificationUrl: notificationUrl,
      resource: "me/mailFolders('inbox')/messages",
      expirationDateTime: new Date(Date.now() + 60 * 60 * 24 * 3 * 1000).toISOString(), // 3 days from now
      clientState: "outlookSubscriptionVerification"
    };
    
    const data = await callGraphAPI(
      tokens,
      '/subscriptions',
      'POST',
      subscriptionData
    );
    
    return data;
  } catch (error) {
    console.error('Error creating Outlook subscription:', error);
    throw error;
  }
}

/**
 * Renews an existing subscription
 */
export async function renewSubscription(tokens: TokenData, subscriptionId: string) {
  try {
    const updateData = {
      expirationDateTime: new Date(Date.now() + 60 * 60 * 24 * 3 * 1000).toISOString() // 3 days from now
    };
    
    const data = await callGraphAPI(
      tokens,
      `/subscriptions/${subscriptionId}`,
      'PATCH',
      updateData
    );
    
    return data;
  } catch (error) {
    console.error('Error renewing Outlook subscription:', error);
    throw error;
  }
}