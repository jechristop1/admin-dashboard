import React from 'react';
import { Shield, User, LogOut } from 'lucide-react';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { useChatStore, ASSISTANT_MODES } from '../../store/chatStore';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { currentMode } = useChatStore();
  const currentModeInfo = ASSISTANT_MODES[currentMode];
  
  return (
    <header className="bg-[#0A2463] text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Shield size={24} className="text-[#FFBA08]" />
            <h1 className="text-xl font-bold">Forward Assist HQ</h1>
          </div>
        </div>
        
        {/* Center - Assistant Mode Display */}
        <div className="flex items-center gap-3">
          <div className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5">
            <span className="text-sm font-semibold text-white">Assistant Mode</span>
          </div>
          <span className="text-white font-medium">{currentModeInfo.title}</span>
        </div>
        
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm font-medium">{user?.name || user?.email}</span>
              </div>
              
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<LogOut size={16} />}
                  className="text-white hover:bg-[#061A47]"
                  onClick={() => logout()}
                >
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<User size={16} />}
            >
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;