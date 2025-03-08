import React from 'react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 'inbox', label: 'Inbox', icon: '📥' },
    { id: 'starred', label: 'Starred', icon: '⭐' },
    { id: 'sent', label: 'Sent', icon: '📤' },
    { id: 'drafts', label: 'Drafts', icon: '📝' },
    { id: 'important', label: 'Important', icon: '🔔' },
    { id: 'spam', label: 'Spam', icon: '⚠️' },
    { id: 'trash', label: 'Trash', icon: '🗑️' }
  ];
  
  return (
    <div className="sidebar">
      <button className="compose-btn">Compose</button>
      
      <nav className="sidebar-nav">
        <ul>
          {tabs.map(tab => (
            <li 
              key={tab.id} 
              className={currentTab === tab.id ? 'active' : ''}
              onClick={() => onTabChange(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </li>
          ))}
        </ul>
      </nav>
      
      <style jsx>{`
        .sidebar {
          width: 256px;
          padding: 16px;
          background-color: #f6f8fc;
          border-right: 1px solid #dadce0;
          height: 100%;
          overflow-y: auto;
        }
        
        .compose-btn {
          margin-bottom: 16px;
          padding: 12px 24px;
          background-color: #c2e7ff;
          color: #001d35;
          border: none;
          border-radius: 16px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: box-shadow 0.15s ease;
        }
        
        .compose-btn:hover {
          box-shadow: 0 1px 3px rgba(60, 64, 67, 0.3);
        }
        
        .sidebar-nav ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .sidebar-nav li {
          display: flex;
          align-items: center;
          padding: 10px 16px;
          margin-bottom: 4px;
          border-radius: 0 16px 16px 0;
          cursor: pointer;
          color: #202124;
          font-weight: 500;
        }
        
        .sidebar-nav li:hover {
          background-color: #eef3fc;
        }
        
        .sidebar-nav li.active {
          background-color: #d3e3fd;
          font-weight: bold;
        }
        
        .tab-icon {
          margin-right: 12px;
          font-size: 18px;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;