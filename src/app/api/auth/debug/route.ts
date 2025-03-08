import { NextResponse } from 'next/server';
import { validateGoogleConfig, GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } from '../../../../lib/googleAuth';

export async function GET() {
  try {
    // Check if all required environment variables are set
    validateGoogleConfig();
    
    // Check ENCRYPTION_KEY is set
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length < 32) {
      return NextResponse.json({
        status: 'warning',
        message: 'ENCRYPTION_KEY is missing or too short (needs 32+ characters)',
        googleConfig: {
          clientIdSet: Boolean(GOOGLE_CLIENT_ID),
          redirectUri: GOOGLE_REDIRECT_URI,
        }
      }, { status: 200 });
    }
    
    return NextResponse.json({
      status: 'ok',
      message: 'Google OAuth configuration appears valid',
      googleConfig: {
        clientIdSet: Boolean(GOOGLE_CLIENT_ID),
        redirectUri: GOOGLE_REDIRECT_URI,
      }
    }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({
      status: 'error',
      message: (error as Error).message
    }, { status: 500 });
  }
}
