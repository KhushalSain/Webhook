import React from 'react';

interface HeaderProps {
  onRefresh: () => void;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onRefresh, onMenuClick }) => {
  return (
    <header className="header">
      <div className="logo-section">
        <div className="menu-icon" onClick={onMenuClick}>☰</div>
        <div className="logo">Gmail</div>
      </div>
      
      <div className="search-section">
        <div className="search-icon">🔍</div>
        <input type="text" placeholder="Search mail" className="search-input" />
      </div>
      
      <div className="actions-section">
        <button className="refresh-btn" onClick={onRefresh}>
          ⟳
        </button>
        <div className="user-avatar">
          <span>U</span>
        </div>
      </div>
      
      <style jsx>{`
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          background-color: #f6f8fc;
          border-bottom: 1px solid #dadce0;
          height: 64px;
        }
        
        .logo-section {
          display: flex;
          align-items: center;
          min-width: 240px;
        }
        
        .menu-icon {
          margin-right: 16px;
          font-size: 20px;
          color: #5f6368;
          cursor: pointer;
        }
        
        .logo {
          font-size: 22px;
          font-weight: 500;
          color: #5f6368;
        }
        
        .search-section {
          display: flex;
          align-items: center;
          background-color: #eaf1fb;
          border-radius: 8px;
          padding: 0 16px;
          flex-grow: 1;
          max-width: 720px;
          height: 48px;
        }
        
        .search-icon {
          color: #5f6368;
          margin-right: 12px;
        }
        
        .search-input {
          border: none;
          background: transparent;
          width: 100%;
          font-size: 16px;
          outline: none;
        }
        
        .actions-section {
          display: flex;
          align-items: center;
          min-width: 160px;
          justify-content: flex-end;
        }
        
        .refresh-btn {
          background: none;
          border: none;
          font-size: 20px;
          color: #5f6368;
          cursor: pointer;
          margin-right: 16px;
          padding: 8px;
          border-radius: 50%;
          transition: background-color 0.15s ease;
        }
        
        .refresh-btn:hover {
          background-color: #e8eaed;
        }
        
        .user-avatar {
          width: 32px;
          height: 32px;
          background-color: #1a73e8;
          border-radius: 50%;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          cursor: pointer;
        }
        
        @media (max-width: 768px) {
          .search-section {
            max-width: none;
          }
          
          .logo-section {
            min-width: auto;
          }
          
          .logo {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;