// src/lib/gmailApi.ts
import { google } from 'googleapis';
import { TokenData } from '@/types/auth';

/**
 * Creates an OAuth2 client with the provided tokens
 */
export function createOAuth2Client(tokens: TokenData) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

/**
 * Process Gmail webhook notification
 */
export async function processWebhook(notificationData: { historyId?: string; emailAddress?: string }) {
  // Gmail push notifications contain information like emailAddress and historyId
  if (!notificationData || !notificationData.historyId || !notificationData.emailAddress) {
    console.log('No valid historyId or emailAddress found in notification data');
    return null;
  }

  return {
    historyId: notificationData.historyId,
    emailAddress: notificationData.emailAddress
  };
}

/**
 * Retrieves history changes after a specific historyId
 */
export async function getHistoryChanges(tokens: TokenData, historyId: string) {
  try {
    const auth = createOAuth2Client(tokens);
    const gmail = google.gmail({ version: 'v1', auth });
    
    const response = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: historyId,
      historyTypes: ['messageAdded', 'labelAdded']
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting history changes:', error);
    throw error;
  }
}

/**
 * Gets user information from Gmail API
 */
export async function getUserInfo(accessToken: string) {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const response = await gmail.users.getProfile({ userId: 'me' });
    
    return {
      email: response.data.emailAddress,
      historyId: response.data.historyId
    };
  } catch (error) {
    console.error('Error getting user info:', error);
    throw error;
  }
}

/**
 * Sets up a watch on the user's Gmail inbox
 */
export async function watchEmails(tokens: TokenData) {
  try {
    const auth = createOAuth2Client(tokens);
    const gmail = google.gmail({ version: 'v1', auth });
    
    // The topicName should be the full name of your Pub/Sub topic
    const topicName = process.env.PUBSUB_TOPIC_NAME;
    
    if (!topicName) {
      throw new Error('PUBSUB_TOPIC_NAME environment variable not set');
    }
    
    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: topicName,
        labelIds: ['INBOX']
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error setting up email watch:', error);
    throw error;
  }
}

/**
 * Lists emails from Gmail
 */
export async function listEmails(tokens: TokenData, query: string = '') {
  try {
    const auth = createOAuth2Client(tokens);
    const gmail = google.gmail({ version: 'v1', auth });
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 10
    });
    
    return response.data;
  } catch (error) {
    console.error('Error listing emails:', error);
    throw error;
  }
}

/**
 * Gets a specific email message with full content
 */
export async function getEmailMessage(tokens: TokenData, messageId: string) {
  try {
    const auth = createOAuth2Client(tokens);
    const gmail = google.gmail({ version: 'v1', auth });
    
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting email message:', error);
    throw error;
  }
}

/**
 * Gets an attachment from an email
 */
export async function getAttachment(tokens: TokenData, messageId: string, attachmentId: string) {
  try {
    const auth = createOAuth2Client(tokens);
    const gmail = google.gmail({ version: 'v1', auth });
    
    const response = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: messageId,
      id: attachmentId
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting attachment:', error);
    throw error;
  }
}