// Email service providers
export type EmailService = 'gmail' | 'outlook';

// Common email interface for both Gmail and Outlook
export interface EmailItem {
  id: string;
  snippet: string;
  from: string;
  subject: string;
  date: string;
  hasAttachments: boolean;
  service: EmailService; // Identify which service this email belongs to
}

// Full email content
export interface EmailContent {
  id: string;
  subject: string;
  from: string;
  date: string;
  body: string;
  contentType: string;
  attachments: Attachment[];
  service: EmailService;
}

// Email attachment
export interface Attachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline?: boolean;
}