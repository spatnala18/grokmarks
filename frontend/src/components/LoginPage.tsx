// ============================================
// Login Page Component
// ============================================

import { Sparkles, BookOpen, Mic, MessageCircle } from 'lucide-react';
import './LoginPage.css';

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="login-page">
      <div className="login-container">
        {/* Logo & Branding */}
        <div className="login-header">
          <div className="login-logo">
            <Sparkles size={32} className="login-logo-icon" />
            <span className="login-logo-text">Grokmarks</span>
          </div>
          <h1 className="login-title">
            Your bookmarks & timeline,<br />
            <span className="text-accent">organized by Grok</span>
          </h1>
          <p className="login-subtitle">
            Automatically group your X posts into Topic Spaces, 
            get AI-powered briefings, and never lose track of what matters.
          </p>
        </div>

        {/* Features */}
        <div className="login-features">
          <div className="feature-item">
            <div className="feature-icon">
              <Sparkles size={20} />
            </div>
            <div className="feature-text">
              <h3>Smart Topic Spaces</h3>
              <p>Grok automatically groups your bookmarks and timeline by topic</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">
              <BookOpen size={20} />
            </div>
            <div className="feature-text">
              <h3>Research-Style Briefings</h3>
              <p>Get summaries with inline citations linking back to tweets</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">
              <Mic size={20} />
            </div>
            <div className="feature-text">
              <h3>Audio Overview</h3>
              <p>Turn any topic into a podcast-style discussion</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">
              <MessageCircle size={20} />
            </div>
            <div className="feature-text">
              <h3>Ask Grok</h3>
              <p>Get answers grounded in your curated content</p>
            </div>
          </div>
        </div>

        {/* Login Button */}
        <button className="login-button" onClick={onLogin}>
          <svg viewBox="0 0 24 24" className="x-icon" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          Continue with X
        </button>

        <p className="login-disclaimer">
          We only read your bookmarks and timeline. We never post on your behalf.
        </p>
      </div>

      {/* Background decoration */}
      <div className="login-bg-decoration" />
    </div>
  );
}
