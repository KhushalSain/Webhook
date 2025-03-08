'use client';

import React, { useState, useEffect } from 'react';
import ConnectGoogleButton from './components/ConnectGoogleButton';
import Image from 'next/image';
import './app.css';

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (menuOpen && !target.closest('.mobile-menu-button') && !target.closest('.nav-links')) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [menuOpen]);

  // Toggle body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <div className="landing-page">
      <nav className="navbar">
        <div className="navbar-container">
          <div className="logo">
            <Image src="/FlowBitLogo.svg" alt="Gmail Webhook Logo" width={40} height={40} />
            <span>Gmail Webhook</span>
          </div>
          
          <div className="mobile-menu-button" onClick={() => setMenuOpen(!menuOpen)}>
            <span></span>
            <span></span>
            <span></span>
          </div>
          
          <ul className={`nav-links ${menuOpen ? 'active' : ''}`}>
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="#faq">FAQ</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </div>
      </nav>

      <div className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1 className="title">Simplify Your Email Workflow</h1>
            <p className="subtitle">
              Access your Gmail emails and attachments in a beautiful, responsive interface with real-time notifications
            </p>
            <div className="cta-buttons">
              <ConnectGoogleButton />
              <a href="#features" className="secondary-button">Learn More</a>
            </div>
          </div>
          <div className="hero-image">
            <Image 
              src="/FlowBitLogo.svg" 
              alt="Email dashboard illustration" 
              width={500} 
              height={400} 
              priority
              className="floating-animation"
            />
          </div>
        </div>
      </div>

      <div id="features" className="features-section">
        <div className="container">
          <div className="section-header">
            <h2>Key Features</h2>
            <p className="section-description">Everything you need to manage your emails effectively</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📨</div>
              <h3>Real-time Updates</h3>
              <p>Get notified instantly when new emails with attachments arrive in your inbox</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📎</div>
              <h3>Attachment Management</h3>
              <p>View and download email attachments with a single click from any device</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Responsive Design</h3>
              <p>Access your emails from any device with an adaptive interface that looks great everywhere</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure Access</h3>
              <p>Your data remains secure with OAuth authentication and end-to-end encryption</p>
            </div>
          </div>
        </div>
      </div>

      <div id="how-it-works" className="how-it-works-section">
        <div className="container">
          <div className="section-header">
            <h2>How It Works</h2>
            <p className="section-description">Three simple steps to get started</p>
          </div>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Connect Your Gmail</h3>
              <p>Securely link your Gmail account with a single click</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Configure Notifications</h3>
              <p>Choose which emails you want to be notified about</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Access Anywhere</h3>
              <p>View and manage your emails from any device</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="testimonials-section">
        <div className="container">
          <div className="section-header">
            <h2>What Our Users Say</h2>
            <p className="section-description">Feedback from people who use Gmail Webhook every day</p>
          </div>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>&ldquo;This app has completely transformed how I manage my email attachments. So intuitive!&rdquo;</p>
              </div>
              <div className="testimonial-author">
                <p><strong>Sarah Johnson</strong></p>
                <p>Marketing Manager</p>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
              <p>&ldquo;The real-time notifications have saved me countless hours of checking my inbox.&rdquo;</p>
              </div>
              <div className="testimonial-author">
                <p><strong>David Chen</strong></p>
                <p>Software Developer</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <Image src="/FlowBitLogo.svg" alt="Gmail Webhook Logo" width={30} height={30} />
              <span>Gmail Webhook App</span>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#how-it-works">How It Works</a>
                <a href="#pricing">Pricing</a>
              </div>
              <div className="footer-column">
                <h4>Support</h4>
                <a href="#faq">FAQ</a>
                <a href="#contact">Contact</a>
                <a href="#docs">Documentation</a>
              </div>
              <div className="footer-column">
                <h4>Legal</h4>
                <a href="#privacy">Privacy Policy</a>
                <a href="#terms">Terms of Service</a>
              </div>
            </div>
          </div>
          <div className="copyright">
            <p>© 2025 Gmail Webhook App. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}