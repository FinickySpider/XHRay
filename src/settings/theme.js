// Modern DevTools-inspired theme with softer colors and better UX
const themes = {
  dark: {
    // Backgrounds
    bgPrimary: '#1e1e1e',
    bgSecondary: '#252526',
    bgTertiary: '#2d2d2d',
    bgHover: '#37373d',
    
    // Borders
    border: '#3c3c3c',
    borderHover: '#4fc3f7',
    
    // Text
    textPrimary: '#cccccc',
    textSecondary: '#858585',
    textMuted: '#6a6a6a',
    
    // Accents
    accent: '#4fc3f7',
    accentHover: '#00bcd4',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    
    // Shadows
    shadowSmall: '0 1px 3px rgba(0,0,0,0.3)',
    shadowMedium: '0 2px 8px rgba(0,0,0,0.4)',
    shadowLarge: '0 8px 32px rgba(0,0,0,0.5)',
    shadowAccent: '0 2px 8px rgba(79, 195, 247, 0.3)'
  },
  light: {
    // Backgrounds
    bgPrimary: '#ffffff',
    bgSecondary: '#f5f5f5',
    bgTertiary: '#e0e0e0',
    bgHover: '#e8e8e8',
    
    // Borders
    border: '#d0d0d0',
    borderHover: '#0288d1',
    
    // Text
    textPrimary: '#333333',
    textSecondary: '#666666',
    textMuted: '#999999',
    
    // Accents
    accent: '#0288d1',
    accentHover: '#0277bd',
    success: '#388e3c',
    warning: '#f57c00',
    error: '#d32f2f',
    
    // Shadows
    shadowSmall: '0 1px 3px rgba(0,0,0,0.1)',
    shadowMedium: '0 2px 8px rgba(0,0,0,0.15)',
    shadowLarge: '0 8px 32px rgba(0,0,0,0.2)',
    shadowAccent: '0 2px 8px rgba(2, 136, 209, 0.2)'
  }
};

export function applyTheme(panel, showBtn) {
  const dark = !!GM_getValue("darkTheme", true);
  const theme = dark ? themes.dark : themes.light;
  
  if (panel) {
    // Modern semi-transparent background with blur effect
    panel.style.background = dark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    panel.style.backdropFilter = 'blur(10px)';
    panel.style.border = `1px solid ${theme.border}`;
    panel.style.boxShadow = theme.shadowLarge;
    panel.style.borderRadius = '8px';
    panel.style.color = theme.textPrimary;
  }
  
  if (showBtn) {
    showBtn.style.background = theme.bgSecondary;
    showBtn.style.color = theme.textPrimary;
    showBtn.style.border = `1px solid ${theme.border}`;
    showBtn.style.borderRadius = '6px';
    showBtn.style.boxShadow = theme.shadowSmall;
    showBtn.style.transition = 'all 0.2s ease';
    
    // Add hover effect
    showBtn.onmouseenter = () => {
      showBtn.style.background = theme.bgHover;
      showBtn.style.borderColor = theme.accent;
      showBtn.style.boxShadow = theme.shadowAccent;
    };
    showBtn.onmouseleave = () => {
      showBtn.style.background = theme.bgSecondary;
      showBtn.style.borderColor = theme.border;
      showBtn.style.boxShadow = theme.shadowSmall;
    };
  }
}

// Export theme colors for use in other components
export function getThemeColors() {
  const dark = !!GM_getValue("darkTheme", true);
  return dark ? themes.dark : themes.light;
}