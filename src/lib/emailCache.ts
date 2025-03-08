import { EmailContent } from '@/types/email';

// Simple in-memory cache for email messages
class EmailCache {
  private cache: Map<string, { content: EmailContent, timestamp: number }> = new Map();
  private fetchPromises: Map<string, Promise<EmailContent>> = new Map();
  private readonly MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes cache validity

  /**
   * Store email content in cache
   */
  set(messageId: string, content: EmailContent): void {
    this.cache.set(messageId, {
      content,
      timestamp: Date.now()
    });
  }

  /**
   * Get email content from cache if available and not expired
   */
  get(messageId: string): EmailContent | null {
    const cached = this.cache.get(messageId);
    
    if (!cached) {
      return null;
    }
    
    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp > this.MAX_AGE_MS) {
      this.cache.delete(messageId);
      return null;
    }
    
    return cached.content;
  }

  /**
   * Track a fetch promise for a message ID to prevent duplicate requests
   */
  setFetchPromise(messageId: string, promise: Promise<EmailContent>): Promise<EmailContent> {
    this.fetchPromises.set(messageId, promise);
    
    // Remove the promise once it's resolved or rejected
    promise.finally(() => {
      if (this.fetchPromises.get(messageId) === promise) {
        this.fetchPromises.delete(messageId);
      }
    });
    
    return promise;
  }

  /**
   * Get an existing fetch promise for a message ID
   */
  getFetchPromise(messageId: string): Promise<EmailContent> | null {
    return this.fetchPromises.get(messageId) || null;
  }

  /**
   * Clear the entire cache or a specific message
   */
  clear(messageId?: string): void {
    if (messageId) {
      this.cache.delete(messageId);
      this.fetchPromises.delete(messageId);
    } else {
      this.cache.clear();
      this.fetchPromises.clear();
    }
  }
}

// Export a singleton instance
export const emailCache = new EmailCache();
