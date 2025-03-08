'use client';

import React from 'react';
import { EmailItem } from '@/types/email';

interface EmailListProps {
  emails: EmailItem[];
  selectedEmailId: string | undefined;
  onSelect: (emailId: string) => void; // Changed from onEmailSelect to onSelect
}

const EmailList: React.FC<EmailListProps> = ({ emails, selectedEmailId, onSelect }) => {
  // Format date to a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If the email is from today, show only the time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If the email is from this year, show the month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Otherwise, show the full date
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="email-list">
      {emails.map((email) => (
        <div 
          key={`${email.service}-${email.id}`}
          className={`email-item ${selectedEmailId === email.id ? 'selected' : ''}`}
          onClick={() => onSelect(email.id)} // Changed from onEmailSelect to onSelect
        >
          <div className="email-service-indicator" data-service={email.service}></div>
          <div className="email-details">
            <div className="email-sender">{email.from}</div>
            <div className="email-date">{formatDate(email.date)}</div>
            <div className="email-subject">
              {email.subject}
              {email.hasAttachments && <span className="attachment-icon">📎</span>}
            </div>
            <div className="email-preview">{email.snippet}</div>
          </div>
        </div>
      ))}
      <style jsx>{`
        .email-list {
          overflow-y: auto;
          height: 100%;
        }
        
        .email-item {
          padding: 10px 15px;
          border-bottom: 1px solid #f1f3f4;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .email-item:hover {
          background-color: #f2f6fc;
        }
        
        .email-item.selected {
          background-color: #e8f0fe;
        }
        
        .email-content {
          display: flex;
          flex-direction: column;
        }
        
        .email-sender {
          font-weight: bold;
          margin-bottom: 4px;
        }
        
        .email-main {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }
        
        .email-subject {
          font-size: 14px;
          margin-bottom: 4px;
        }
        
        .email-snippet {
          font-size: 12px;
          color: #5f6368;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .email-meta {
          display: flex;
          align-items: center;
          margin-top: 4px;
        }
        
        .email-date {
          font-size: 12px;
          color: #5f6368;
          margin-right: 10px;
        }
        
        .attachment-icon {
          font-size: 14px;
        }
        
        .empty-state {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: #5f6368;
        }
      `}</style>
    </div>
  );
}

export default EmailList;