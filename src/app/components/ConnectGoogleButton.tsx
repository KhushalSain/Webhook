'use client';

import React from 'react';
import Image from 'next/image';
import styles from './ConnectGoogleButton.module.css';

const ConnectGoogleButton: React.FC = () => {
  const handleConnect = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <button 
      className={styles.connectButton} 
      onClick={handleConnect}
      aria-label="Connect with Google"
    >
      <Image 
        src="/google-icon.svg" 
        alt="Google Logo" 
        width={20} 
        height={20}
        className={styles.googleIcon}
      />
      <span>Connect with Google</span>
    </button>
  );
};

export default ConnectGoogleButton;
