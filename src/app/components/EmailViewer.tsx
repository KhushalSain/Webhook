'use client';

import React, { useState, useEffect, useRef } from 'react';
import { EmailContent } from '@/types/email';
import { emailCache } from '@/lib/emailCache';

interface EmailViewerProps {
  email: EmailContent | null;
  messageId?: string | null;
  service?: 'gmail' | 'outlook';
}

export default function EmailViewer({ email, messageId, service }: EmailViewerProps) {
  const [isDownloading, setIsDownloading] = useState<{[key: string]: boolean}>({});
  const [loadedEmail, setLoadedEmail] = useState<EmailContent | null>(email);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const previousMessageId = useRef<string | null | undefined>(null);

  // Only fetch a new email when messageId changes
  useEffect(() => {
    // Skip if no messageId is provided or it's the same as before or no service
    if (!messageId || messageId === previousMessageId.current || !service) {
      return;
    }

    previousMessageId.current = messageId;
    
    // Check if the email is in our cache
    const cachedEmail = emailCache.get(messageId);
    if (cachedEmail) {
      setLoadedEmail(cachedEmail);
      return;
    }

    // Check if we already have an in-flight request for this email
    const existingPromise = emailCache.getFetchPromise(messageId);
    if (existingPromise) {
      // Use the existing promise instead of creating a new request
      setIsLoading(true);
      existingPromise
        .then(emailData => {
          setLoadedEmail(emailData);
        })
        .catch(err => {
          console.error('Error fetching email content from existing promise:', err);
          setError('Failed to load email content. Please try again.');
        })
        .finally(() => {
          setIsLoading(false);
        });
      return;
    }

    // If not in cache and no in-flight request, fetch it from the API
    setIsLoading(true);
    setError(null);
    
    // Create the fetch promise
    const fetchPromise = (async () => {
      // Use the appropriate API endpoint based on the service
      const endpoint = service === 'gmail' 
        ? `/api/gmail/getMessage?id=${messageId}`
        : `/api/outlook/getMessage?id=${messageId}`;
        
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch email: ${response.status}`);
      }
      
      const emailData = await response.json();
      
      // Store in cache for future use
      emailCache.set(messageId, emailData);
      
      return emailData;
    })();
    
    // Register this promise in our cache
    emailCache.setFetchPromise(messageId, fetchPromise);
    
    // Handle the promise results
    fetchPromise
      .then(emailData => {
        setLoadedEmail(emailData);
      })
      .catch(err => {
        console.error('Error fetching email content:', err);
        setError('Failed to load email content. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
      
  }, [messageId, service]); // Only re-run when messageId or service changes

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading email content...</p>
        <style jsx>{`
          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #5f6368;
          }
          .spinner {
            border: 3px solid #f3f3f3;
            border-radius: 50%;
            border-top: 3px solid #1a73e8;
            width: 24px;
            height: 24px;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <p>{error}</p>
        <style jsx>{`
          .error-state {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
            color: #d93025;
            background-color: #f8f9fa;
            font-size: 16px;
            padding: 16px;
            text-align: center;
          }
        `}</style>
      </div>
    );
  }

  if (!loadedEmail) {
    return (
      <div className="empty-state">
        <p>Select an email to view its contents</p>
        <style jsx>{`
          .empty-state {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
            color: #5f6368;
            background-color: #f8f9fa;
            font-size: 16px;
          }
        `}</style>
      </div>
    );
  }

  const formatDate = (dateString: string): string => {
    try {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString || '';
    }
  };

  // Format the sender information to handle both string and object formats
  const formatSender = (from: any): string => {
    if (typeof from === 'string') {
      return from;
    } 
    
    if (Array.isArray(from)) {
      return from.map(f => {
        if (typeof f === 'string') return f;
        return f.name ? `${f.name} <${f.email}>` : f.email;
      }).join(', ');
    }
    
    if (from && typeof from === 'object') {
      return from.name ? `${from.name} <${from.email}>` : from.email || 'Unknown';
    }
    
    return 'Unknown';
  };

  const handleDownloadAttachment = async (attachmentId: string, fileName: string) => {
    if (!loadedEmail.id) return;
    
    setIsDownloading({...isDownloading, [attachmentId]: true});
    
    try {
      // Use the appropriate API endpoint based on the email service
      const endpoint = loadedEmail.service === 'gmail' 
        ? `/api/gmail/getAttachment?messageId=${loadedEmail.id}&attachmentId=${attachmentId}`
        : `/api/outlook/getAttachment?messageId=${loadedEmail.id}&attachmentId=${attachmentId}`;
      
      const response = await fetch(endpoint);
      
      if (!response.ok) throw new Error('Download failed');
      
      // Create blob from response
      const blob = await response.blob();
      
      // Create download link and click it
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Failed to download attachment. Please try again later.');
    } finally {
      setIsDownloading({...isDownloading, [attachmentId]: false});
    }
  };

  return (
    <div className="email-viewer">
      <div className="email-header">
        <h2 className="email-subject">{loadedEmail.subject || '(No subject)'}</h2>
        
        <div className="email-meta">
          <div className="sender-info">
            <span className="from-label">From: </span>
            <span className="from-value">{formatSender(loadedEmail.from)}</span>
          </div>
          
          <div className="date-info">
            {loadedEmail.date && formatDate(loadedEmail.date)}
          </div>
          
          <div className="service-info">
            <span className="service-label">Service: </span>
            <span className={`service-value ${loadedEmail.service}`}>
              {loadedEmail.service === 'gmail' ? 'Gmail' : 'Outlook'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="email-body">
        {loadedEmail.contentType === 'text/html' ? (
          <div dangerouslySetInnerHTML={{ __html: loadedEmail.body }} />
        ) : (
          <pre>{loadedEmail.body}</pre>
        )}
      </div>
      
      {loadedEmail.attachments && loadedEmail.attachments.length > 0 && (
        <div className="attachments-section">
          <h3>Attachments</h3>
          <div className="attachment-list">
            {loadedEmail.attachments.map((attachment) => (
              <div key={attachment.id} className="attachment-item">
                <div className="attachment-info">
                  <div className="attachment-icon">📎</div>
                  <div className="attachment-filename">{attachment.name}</div>
                  <div className="attachment-type">{attachment.contentType}</div>
                </div>
                <button
                  className={`download-button ${isDownloading[attachment.id] ? 'downloading' : ''}`}
                  onClick={() => handleDownloadAttachment(attachment.id, attachment.name)}
                  disabled={isDownloading[attachment.id]}
                >
                  {isDownloading[attachment.id] ? 'Downloading...' : 'Download'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .email-viewer {
          padding: 20px;
          height: 100%;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        
        .email-header {
          margin-bottom: 20px;
          border-bottom: 1px solid #dadce0;
          padding-bottom: 15px;
        }
        
        .email-subject {
          margin: 0 0 10px 0;
          font-size: 18px;
          color: #202124;
        }
        
        .email-meta {
          font-size: 14px;
          color: #5f6368;
        }
        
        .sender-info, .service-info {
          margin-bottom: 5px;
        }
        
        .from-label, .service-label {
          font-weight: 500;
        }
        
        .service-value.gmail {
          color: #D44638;
          font-weight: 500;
        }
        
        .service-value.outlook {
          color: #0072C6;
          font-weight: 500;
        }
        
        .date-info {
          margin-top: 5px;
          margin-bottom: 5px;
        }
        
        .email-body {
          padding: 10px 0;
          flex-grow: 1;
          font-size: 14px;
          line-height: 1.5;
        }
        
        pre {
          white-space: pre-wrap;
          font-family: inherit;
        }
        
        .attachments-section {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #dadce0;
        }
        
        .attachments-section h3 {
          font-size: 16px;
          margin: 0 0 10px 0;
        }
        
        .attachment-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .attachment-item {
          display: flex;
          flex-direction: column;
          width: 180px;
          padding: 12px;
          background-color: #f1f3f4;
          border-radius: 8px;
        }
        
        .attachment-info {
          display: flex;
          flex-direction: column;
          margin-bottom: 10px;
        }
        
        .attachment-icon {
          font-size: 24px;
          margin-bottom: 8px;
        }
        
        .attachment-filename {
          font-weight: 500;
          margin-bottom: 4px;
          word-break: break-all;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .attachment-type {
          font-size: 12px;
          color: #5f6368;
        }
        
        .download-button {
          background-color: #1a73e8;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 14px;
          margin-top: auto;
        }
        
        .download-button:hover {
          background-color: #1765cc;
        }
        
        .download-button:disabled {
          background-color: #80abea;
          cursor: not-allowed;
        }
        
        .download-button.downloading {
          background-color: #80abea;
        }
        
        @media (max-width: 768px) {
          .attachment-list {
            justify-content: center;
          }
          
          .attachment-item {
            width: 100%;
            max-width: 300px;
          }
        }
      `}</style>
    </div>
  );
}