# Gmail & Outlook Webhook Integration

## Project Structure

```
gmailwebhook/
├── .env                      // Environment variables for both Gmail and Outlook
├── .gitignore                
├── eslint.config.mjs         
├── next.config.ts            
├── package.json              
├── postcss.config.mjs        
├── README.md                 
├── tsconfig.json             
└── src/
    ├── app/
    │   ├── globals.css       
    │   ├── layout.tsx        
    │   ├── page.tsx          // Landing page with Google & Outlook buttons
    │   ├── dashboard/        
    │   │   └── page.tsx      // Dashboard showing emails from both services
    │   ├── api/
    │   │   ├── auth/
    │   │   │   ├── google/
    │   │   │   │   └── route.ts      // Initiates Gmail OAuth flow
    │   │   │   ├── outlook/
    │   │   │   │   └── route.ts      // Initiates Outlook OAuth flow
    │   │   │   ├── callback/
    │   │   │   │   └── route.ts      // Gmail OAuth callback handler
    │   │   │   └── outlook/
    │   │   │       └── callback/
    │   │   │           └── route.ts  // Outlook OAuth callback handler
    │   │   ├── gmail/
    │   │   │   ├── listEmails/
    │   │   │   │   └── route.ts      // List Gmail emails with attachments
    │   │   │   ├── getMessage/
    │   │   │   │   └── route.ts      // Get specific Gmail message
    │   │   │   ├── getAttachment/
    │   │   │   │   └── route.ts      // Download Gmail attachment
    │   │   │   ├── watch/
    │   │   │   │   └── route.ts      // Setup Gmail notifications
    │   │   │   └── webhook/
    │   │   │       └── route.ts      // Process Gmail webhook notifications
    │   │   └── outlook/
    │   │       ├── listEmails/
    │   │       │   └── route.ts      // List Outlook emails with attachments
    │   │       ├── getMessage/
    │   │       │   └── route.ts      // Get specific Outlook message
    │   │       ├── getAttachment/
    │   │       │   └── route.ts      // Download Outlook attachment
    │   │       ├── watch/
    │   │       │   └── route.ts      // Setup Outlook subscriptions
    │   │       └── webhook/
    │   │           └── route.ts      // Process Outlook webhook notifications
    │   └── components/
    │       ├── ConnectGoogleButton.tsx
    │       ├── ConnectOutlookButton.tsx
    │       ├── EmailList.tsx          // Displays emails from both services
    │       ├── EmailViewer.tsx        // Shows email content
    │       ├── Header.tsx             // App header with service selector
    │       └── Sidebar.tsx            // Navigation sidebar
    ├── lib/
    │   ├── cookieUtils.ts     // Handles auth cookies for both services
    │   ├── encrypt.ts         // Encryption for token storage
    │   ├── googleAuth.ts      // Google OAuth config 
    │   ├── gmailApi.ts        // Gmail API functions
    │   ├── outlookAuth.ts     // Outlook OAuth config
    │   └── outlookApi.ts      // Microsoft Graph API functions
    └── types/
        ├── auth.ts            // Authentication types for both services
        └── email.d.ts         // Email interface definitions
```

## Overview

This application integrates Gmail and Outlook email services using webhooks to provide real-time email notifications and management. It features:

- OAuth authentication for both Gmail and Microsoft services
- Real-time email notifications via webhooks
- Unified dashboard for both email services
- Secure attachment handling
- TypeScript support
- Next.js framework

## Key Components

- **Authentication**: Separate OAuth flows for Gmail and Outlook
- **API Integration**: Webhook setup and management for both services
- **Frontend**: React components for email viewing and management
- **Security**: Encrypted token storage and secure cookie handling
