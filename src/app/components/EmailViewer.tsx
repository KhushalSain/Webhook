'use client';

import React, { useState } from 'react';
import { EmailContent } from '@/types/email';

interface EmailViewerProps {
  email: EmailContent | null;
}

export default function EmailViewer({ email }: EmailViewerProps) {
  const [isDownloading, setIsDownloading] = useState<{[key: string]: boolean}>({});

  if (!email) {
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

  const handleDownloadAttachment = async (attachmentId: string, fileName: string) => {
    if (!email.id) return;
    
    setIsDownloading({...isDownloading, [attachmentId]: true});
    
    try {
      // Use the appropriate API endpoint based on the email service
      const endpoint = email.service === 'gmail' 
        ? `/api/gmail/getAttachment?messageId=${email.id}&attachmentId=${attachmentId}`
        : `/api/outlook/getAttachment?messageId=${email.id}&attachmentId=${attachmentId}`;
      
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
        <h2 className="email-subject">{email.subject || '(No subject)'}</h2>
        
        <div className="email-meta">
          <div className="sender-info">
            <span className="from-label">From: </span>
            <span className="from-value">{email.from || 'Unknown'}</span>
          </div>
          
          <div className="date-info">
            {email.date && formatDate(email.date)}
          </div>
          
          <div className="service-info">
            <span className="service-label">Service: </span>
            <span className={`service-value ${email.service}`}>
              {email.service === 'gmail' ? 'Gmail' : 'Outlook'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="email-body">
        {email.contentType === 'text/html' ? (
          <div dangerouslySetInnerHTML={{ __html: email.body }} />
        ) : (
          <pre>{email.body}</pre>
        )}
      </div>
      
      {email.attachments && email.attachments.length > 0 && (
        <div className="attachments-section">
          <h3>Attachments</h3>
          <div className="attachment-list">
            {email.attachments.map((attachment) => (
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