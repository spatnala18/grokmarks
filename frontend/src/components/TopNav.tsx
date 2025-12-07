// ============================================
// Top Navigation Bar Component
// ============================================

import { RefreshCw, Search, LogOut } from 'lucide-react';
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
          <span className="logo-icon">🔖</span>
          <span className="logo-text">Grokmarks</span>
        </div>
      </div>

      {/* Center - Search */}
      <div className="top-nav-center">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search topics, posts, or @handles…"
            className="search-input"
          />
        </div>
      </div>

      {/* Right - User + Sync */}
      <div className="top-nav-right">
        {user && (
          <>
            <button
              className="sync-button"
              onClick={onSync}
              disabled={isSyncing}
            >
              <RefreshCw size={16} className={isSyncing ? 'spinning' : ''} />
              <span>{isSyncing ? 'Syncing…' : 'Sync from X'}</span>
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
