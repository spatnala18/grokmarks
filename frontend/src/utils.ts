// ============================================
// Utility Functions
// ============================================

/**
 * Parse [tweetId] citations in text and convert to clickable links
 */
export function parseCitations(text: string): string {
  // Convert [tweetId] to clickable links
  let html = text.replace(/\[(\d{15,25})\]/g, (_match, tweetId) => {
    return `<a href="https://x.com/i/status/${tweetId}" target="_blank" rel="noopener noreferrer" class="citation" title="View tweet">[↗]</a>`;
  });

  // Basic markdown formatting
  html = html
    .replace(/^# (.+)$/gm, '<h3 style="color: var(--accent-primary); margin-top: 0;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h4 style="color: var(--text-secondary); margin: 16px 0 8px 0;">$1</h4>')
    .replace(/^• (.+)$/gm, '<li style="margin: 8px 0;">$1</li>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return html;
}

/**
 * Format relative time
 */
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '…';
}
