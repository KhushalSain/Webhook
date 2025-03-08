'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import EmailList from '../components/EmailList';
import EmailViewer from '../components/EmailViewer';
import { EmailService, EmailItem, EmailContent } from '../../types/email';
import './dashboard.css';

export default function Dashboard() {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailContent | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | undefined>(undefined);
  const [currentTab, setCurrentTab] = useState('inbox');
  const [watchStatus, setWatchStatus] = useState<string>('');
  const [isMobileView, setIsMobileView] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [service, setService] = useState<EmailService>('gmail');
  
  const router = useRouter();

  useEffect(() => {
    // Check if mobile view
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    // Check if there's a stored service preference
    const storedService = localStorage.getItem('selectedEmailService') as EmailService;
    if (storedService && (storedService === 'gmail' || storedService === 'outlook')) {
      setService(storedService);
    }
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Define fetchEmails function based on selected service
  const fetchEmails = useCallback(async () => {
    setLoading(true);
    
    // Clear current selection when switching services
    setSelectedEmailId(undefined); // Changed from null to undefined
    setSelectedEmail(null);
    
    try {
      // Determine which API to call based on the selected service
      const endpoint = service === 'gmail' 
        ? '/api/gmail/listEmails' 
        : '/api/outlook/listEmails';
        
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        if (response.status === 401) {
          // Authentication error - redirect to homepage
          setAuthError(true);
          setTimeout(() => router.push('/'), 2000);
          return;
        }
        throw new Error(`Failed to fetch ${service} emails`);
      }
      
      const data = await response.json();
      
      // Make sure each email has the service property set
      const emailsWithService = data.emails.map((email: EmailItem) => ({
        ...email,
        service: service
      }));
      
      setEmails(emailsWithService);
    } catch (error) {
      console.error(`Error fetching ${service} emails:`, error);
    } finally {
      setLoading(false);
    }
  }, [service, router]);

  const fetchEmailDetail = async (emailId: string) => {
    if (!emailId) return;
    
    try {
      // Determine which API to call based on the selected service
      const endpoint = service === 'gmail'
        ? `/api/gmail/getMessage?id=${emailId}`
        : `/api/outlook/getMessage?id=${emailId}`;
        
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${service} email details`);
      }
      
      const data = await response.json();
      setSelectedEmail(data);
    } catch (error) {
      console.error(`Error fetching ${service} email detail:`, error);
    }
  };

  // Fetch emails when service changes
  useEffect(() => {
    fetchEmails();
  }, [fetchEmails, service]);

  // Fetch email content when an email is selected
  useEffect(() => {
    if (selectedEmailId) {
      fetchEmailDetail(selectedEmailId);
    }
  }, [selectedEmailId, service, fetchEmailDetail]);

  const handleSelectEmail = (emailId: string) => {
    setSelectedEmailId(emailId);
    
    // In mobile view, show email detail view
    if (isMobileView) {
      document.querySelector('.email-view-panel')?.classList.add('mobile-open');
    }
  };

  const handleBackToList = () => {
    if (isMobileView) {
      document.querySelector('.email-view-panel')?.classList.remove('mobile-open');
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    // You can add logic here to fetch emails based on the selected tab
  };
  
  const setupNotifications = async () => {
    setWatchStatus(`Setting up ${service} notifications...`);
    try {
      const endpoint = service === 'gmail'
        ? '/api/gmail/watch'
        : '/api/outlook/watch';
        
      const response = await fetch(endpoint, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to set up ${service} notifications`);
      }
      
      const data = await response.json();
      setWatchStatus(data.success ? 
        `Real-time ${service} updates enabled!` : 
        `Failed to enable ${service} updates. Please try again.`);
    } catch (error) {
      console.error(`Error setting up ${service} notifications:`, error);
      setWatchStatus(`Error: Could not enable ${service} notifications`);
    }
  };

  if (authError) {
    return (
      <div className="auth-error">
        <h2>Authentication Error</h2>
        <p>Please log in again. Redirecting to home page...</p>
        <style jsx>{`
          .auth-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            text-align: center;
            color: #d93025;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Header onRefresh={fetchEmails} onMenuClick={toggleSidebar} />
      
      <div className="content">
        <div className={`sidebar-container ${sidebarOpen ? 'open' : ''}`}>
          <Sidebar 
            onTabChange={handleTabChange} 
            currentTab={currentTab} 
          />
          
          <div className="notification-controls">
            <button 
              onClick={setupNotifications} 
              className="notification-btn"
            >
              Enable Real-time Updates
            </button>
            {watchStatus && <div className="status-message">{watchStatus}</div>}
          </div>
        </div>
        
        <div className="main-content">    
          <div className="emails-panel">
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading emails...</p>
              </div>
            ) : (
              <EmailList 
                emails={emails}
                selectedEmailId={selectedEmailId}
                onSelect={handleSelectEmail} // Changed from onEmailSelect to onSelect to match component props
              />
            )}
          </div>
          
          <div className="email-view-panel">
            {isMobileView && (
              <button className="back-button" onClick={handleBackToList}>
                ← Back to list
              </button>
            )}
            <EmailViewer email={selectedEmail} />
          </div>
        </div>
      </div>
    </div>
  );
}