import React from 'react';
import { Shield, User, LogOut } from 'lucide-react';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, isAuthenticated, logout } = useAuthStore();
  
  return (
    <header className="bg-[#0A2463] text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Shield size={24} className="text-[#FFBA08]" />
            <h1 className="text-xl font-bold">Forward Assist HQ</h1>
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