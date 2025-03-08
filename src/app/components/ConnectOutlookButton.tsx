// src/app/components/ConnectOutlookButton.tsx
'use client';

import React from 'react';

const ConnectOutlookButton: React.FC = () => {
  const handleConnect = () => {
    // Redirect to the Outlook OAuth initiation endpoint
    window.location.href = '/api/auth/outlook';
  };

  return (
    <button
      onClick={handleConnect}
      style={{
        padding: '1rem 2rem',
        fontSize: '1rem',
        backgroundColor: '#0072C6',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}>
      Connect with Outlook
    </button>
  );
};

export default ConnectOutlookButton;
