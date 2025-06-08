import React from 'react';
import { Shield, User, LogOut } from 'lucide-react';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { useChatStore, ASSISTANT_MODES } from '../../store/chatStore';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

// Mode to icon mapping
const MODE_ICONS = {
  general_support: '💬',
  claims_mode: '📋',
  transition_mode: '🧭',
  document_mode: '📄',
  mental_health_mode: '🧠',
  education_mode: '🎓',
  career_mode: '🧑‍💼',
  finance_mode: '💰',
  housing_mode: '🏠',
  survivor_mode: '🕊️',
  training_mode: '🛠️',
} as const;

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { currentMode } = useChatStore();
  const currentModeInfo = ASSISTANT_MODES[currentMode];
  const currentIcon = MODE_ICONS[currentMode];
  
  return (
    <header className="bg-[#0A2463] text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Shield size={24} className="text-[#FFBA08]" />
            <h1 className="text-xl font-bold">Forward Assist HQ</h1>
          </div>
        </div>
        
        {/* Center - Assistant Mode Pill Badge */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-full px-4 py-1 text-sm font-medium">
            <span className="text-lg">{currentIcon}</span>
            <span className="text-gray-800">{currentModeInfo.title}</span>
          </div>
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