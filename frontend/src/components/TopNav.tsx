// ============================================
// Top Navigation Bar Component
// ============================================

import { Settings, LogOut, Sparkles } from 'lucide-react';
import type { User } from '../types';
import './TopNav.css';

interface TopNavProps {
  user: User | null;
  isSyncing: boolean;
  onSync: () => void;
  onLogout: () => void;
}

export function TopNav({ user, isSyncing, onSync, onLogout }: TopNavProps) {
  return (
    <header className="top-nav">
      {/* Left - Logo */}
      <div className="top-nav-left">
        <div className="logo">
          <Sparkles size={22} className="logo-icon" />
          <span className="logo-text">Grokmarks</span>
        </div>
      </div>

      {/* Right - User + Sync */}
      <div className="top-nav-right">
        {user && (
          <>
            <button
              className="modify-topics-button"
              onClick={onSync}
              disabled={isSyncing}
            >
              <Settings size={16} className={isSyncing ? 'spinning' : ''} />
              <span>{isSyncing ? 'Processing…' : 'Modify Topics'}</span>
            </button>

            <div className="user-info">
              <img
                src={user.profileImageUrl}
                alt={user.displayName}
                className="user-avatar"
              />
              <span className="user-handle">@{user.username}</span>
            </div>

            <button className="icon-button" onClick={onLogout} title="Logout">
              <LogOut size={18} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
