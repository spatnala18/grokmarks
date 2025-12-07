// ============================================
// GrokBrand Component
// Official xAI Grok branding per brand guidelines
// https://x.ai/legal/brand-guidelines/
// ============================================

import './GrokBrand.css';

type GrokBrandVariant = 'powered-by' | 'powered-by-voice' | 'created-with' | 'built-with-api';
type GrokBrandSize = 'small' | 'medium' | 'large';
type GrokBrandTheme = 'light' | 'dark' | 'auto';

interface GrokBrandProps {
  variant?: GrokBrandVariant;
  size?: GrokBrandSize;
  theme?: GrokBrandTheme;
  className?: string;
}

/**
 * GrokBrand - Official xAI Grok branding component
 * 
 * Usage rules (from xAI Brand Guidelines):
 * - Use only to accurately refer to xAI or Grok services
 * - Do not modify the logo (no recoloring, stretching, effects)
 * - Keep clear visual separation from app's own branding
 * - Always pair with appropriate text attribution
 * 
 * @param variant - The attribution text to display
 * @param size - Logo size (small: 16px, medium: 20px, large: 24px)
 * @param theme - 'light' for dark backgrounds, 'dark' for light backgrounds, 'auto' detects
 */
export function GrokBrand({ 
  variant = 'powered-by', 
  size = 'medium',
  theme = 'auto',
  className = ''
}: GrokBrandProps) {
  
  // Get the appropriate text based on variant
  const getText = () => {
    switch (variant) {
      case 'powered-by':
        return 'Powered by Grok';
      case 'powered-by-voice':
        return 'Powered by Grok Voice';
      case 'created-with':
        return 'Created with Grok';
      case 'built-with-api':
        return 'Built with Grok API';
      default:
        return 'Powered by Grok';
    }
  };

  // Get logo path based on theme
  // Light logo = white/light colored, for dark backgrounds
  // Dark logo = dark colored, for light backgrounds
  const getLogoPath = () => {
    // For our dark theme app, use the light (white) logo
    if (theme === 'light' || theme === 'auto') {
      return '/assets/xai-grok/Grok_Logomark_Light.svg';
    }
    return '/assets/xai-grok/Grok_Logomark_Dark.svg';
  };

  // Get size in pixels
  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return 'grok-brand--small';
      case 'large':
        return 'grok-brand--large';
      default:
        return 'grok-brand--medium';
    }
  };

  return (
    <div className={`grok-brand ${getSizeClass()} ${className}`}>
      <img 
        src={getLogoPath()} 
        alt="Grok logo" 
        className="grok-brand__logo"
        // No CSS filters or transformations per brand guidelines
      />
      <span className="grok-brand__text">{getText()}</span>
    </div>
  );
}

/**
 * GrokIcon - Just the official Grok icon without text
 * Use sparingly and only where Grok is clearly being referenced
 */
interface GrokIconProps {
  size?: number;
  theme?: GrokBrandTheme;
  className?: string;
}

export function GrokIcon({ 
  size = 20, 
  theme = 'auto',
  className = ''
}: GrokIconProps) {
  const getLogoPath = () => {
    if (theme === 'light' || theme === 'auto') {
      return '/assets/xai-grok/Grok_Logomark_Light.svg';
    }
    return '/assets/xai-grok/Grok_Logomark_Dark.svg';
  };

  return (
    <img 
      src={getLogoPath()} 
      alt="Grok" 
      className={`grok-icon ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export default GrokBrand;
