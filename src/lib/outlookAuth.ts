// Outlook OAuth Configuration
export const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID;
export const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET;
export const OUTLOOK_REDIRECT_URI = process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:3000/api/auth/outlook/callback';

// Check if required environment variables are set
export function validateOutlookConfig() {
  const missing = [];
  if (!OUTLOOK_CLIENT_ID) missing.push('OUTLOOK_CLIENT_ID');
  if (!OUTLOOK_CLIENT_SECRET) missing.push('OUTLOOK_CLIENT_SECRET');
  
  if (missing.length > 0) {
    throw new Error(`Missing required Outlook OAuth environment variables: ${missing.join(', ')}`);
  }
  
  return true;
}