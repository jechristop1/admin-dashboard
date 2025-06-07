import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const handleToggleSidebar = () => {
    if (window.innerWidth >= 1024) {
      // Desktop: toggle collapsed state
      setSidebarCollapsed(!sidebarCollapsed);
    } else {
      // Mobile: toggle open state
      setSidebarOpen(!sidebarOpen);
    }
  };
  
  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Show sidebar only when not collapsed on desktop */}
        {!sidebarCollapsed && (
          <Sidebar 
            isOpen={sidebarOpen} 
            onClose={() => setSidebarOpen(false)}
            onToggle={handleToggleSidebar}
          />
        )}
        
        {/* Collapsed sidebar toggle button */}
        {sidebarCollapsed && (
          <div className="hidden lg:flex flex-col items-center bg-white border-r border-gray-200 p-2">
            <button
              onClick={handleToggleSidebar}
              className="p-3 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Expand sidebar"
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="text-[#0A2463]"
              >
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        )}
        
        <main className="flex-1 overflow-hidden p-4 lg:p-6">
          <div className="h-full w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;