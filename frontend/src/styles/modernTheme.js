// YouTube Music-inspired theme built for color extraction
export const createModernTheme = (mode, albumColors = null) => {
  const isDark = mode === "dark";

  // Base colors - YouTube Music style
  const baseColors = {
    // Main background (very dark for YouTube Music feel)
    background: {
      primary: isDark ? "#0f0f0f" : "#ffffff",
      secondary: isDark ? "#1a1a1a" : "#f8f9fa",
      elevated: isDark ? "#212121" : "#ffffff",
      glass: isDark ? "rgba(33, 33, 33, 0.8)" : "rgba(255, 255, 255, 0.8)",
    },

    // Text colors
    text: {
      primary: isDark ? "#ffffff" : "#0f0f0f",
      secondary: isDark ? "#aaaaaa" : "#606060",
      disabled: isDark ? "#666666" : "#909090",
    },

    // Accent colors from album or defaults
    accent: {
      primary: albumColors?.primary || (isDark ? "#ff6b6b" : "#e74c3c"),
      secondary: albumColors?.secondary || (isDark ? "#4ecdc4" : "#3498db"),
      tertiary: albumColors?.accent || (isDark ? "#45b7d1" : "#9b59b6"),
    },

    // UI element colors
    surface: {
      hover: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
      active: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
      selected: albumColors?.primary
        ? `${albumColors.primary}20`
        : isDark
        ? "rgba(255, 107, 107, 0.2)"
        : "rgba(231, 76, 60, 0.2)",
      border: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
    },

    // Status colors
    status: {
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#3b82f6",
    },
  };

  // Generate CSS custom properties for dynamic theming
  const cssVariables = {
    "--bg-primary": baseColors.background.primary,
    "--bg-secondary": baseColors.background.secondary,
    "--bg-elevated": baseColors.background.elevated,
    "--bg-glass": baseColors.background.glass,

    "--text-primary": baseColors.text.primary,
    "--text-secondary": baseColors.text.secondary,
    "--text-disabled": baseColors.text.disabled,

    "--accent-primary": baseColors.accent.primary,
    "--accent-secondary": baseColors.accent.secondary,
    "--accent-tertiary": baseColors.accent.tertiary,

    "--surface-hover": baseColors.surface.hover,
    "--surface-active": baseColors.surface.active,
    "--surface-selected": baseColors.surface.selected,
    "--surface-border": baseColors.surface.border,

    "--status-success": baseColors.status.success,
    "--status-warning": baseColors.status.warning,
    "--status-error": baseColors.status.error,
    "--status-info": baseColors.status.info,

    // Gradients using album colors
    "--gradient-primary": albumColors
      ? `linear-gradient(135deg, ${albumColors.primary} 0%, ${albumColors.secondary} 50%, ${albumColors.accent} 100%)`
      : "linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #45b7d1 100%)",
    "--gradient-subtle": albumColors
      ? `linear-gradient(135deg, ${albumColors.primary}10 0%, ${albumColors.secondary}05 100%)`
      : "linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(78, 205, 196, 0.05) 100%)",
  };

  console.log("🎨 Creating YouTube Music theme with colors:", albumColors);

  return {
    mode,
    colors: baseColors,
    cssVariables,

    // Utility functions
    utils: {
      rgba: (color, opacity) => {
        if (color.startsWith("rgb(")) {
          return color.replace("rgb(", "rgba(").replace(")", `, ${opacity})`);
        }
        // Handle hex colors
        const hex = color.replace("#", "");
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      },

      glassmorphism: (opacity = 0.8) => ({
        background: albumColors
          ? `linear-gradient(135deg, ${albumColors.primary}${Math.round(
              opacity * 255
            )
              .toString(16)
              .padStart(2, "0")} 0%, ${albumColors.secondary}${Math.round(
              opacity * 255
            )
              .toString(16)
              .padStart(2, "0")} 100%)`
          : baseColors.background.glass,
        backdropFilter: "blur(20px) saturate(1.8)",
        WebkitBackdropFilter: "blur(20px) saturate(1.8)",
        border: `1px solid ${baseColors.surface.border}`,
      }),

      elevation: (level) => {
        const shadows = {
          0: "none",
          1: isDark
            ? "0 2px 8px rgba(0, 0, 0, 0.4)"
            : "0 2px 8px rgba(0, 0, 0, 0.1)",
          2: isDark
            ? "0 4px 16px rgba(0, 0, 0, 0.4)"
            : "0 4px 16px rgba(0, 0, 0, 0.1)",
          3: isDark
            ? "0 8px 32px rgba(0, 0, 0, 0.4)"
            : "0 8px 32px rgba(0, 0, 0, 0.1)",
          4: albumColors
            ? `0 12px 40px ${albumColors.primary}30, 0 8px 32px rgba(0, 0, 0, 0.2)`
            : isDark
            ? "0 16px 48px rgba(0, 0, 0, 0.4)"
            : "0 16px 48px rgba(0, 0, 0, 0.1)",
        };
        return shadows[level] || shadows[1];
      },
    },
  };
};

// Apply CSS variables to document root
export const applyCSSVariables = (cssVariables) => {
  const root = document.documentElement;
  Object.entries(cssVariables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
};

// YouTube Music-inspired component styles
export const componentStyles = {
  // Button variants
  button: {
    base: `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 16px;
      border: none;
      border-radius: 18px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
      position: relative;
      overflow: hidden;
      
      &:focus-visible {
        outline: 2px solid var(--accent-primary);
        outline-offset: 2px;
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,

    primary: `
      background: var(--gradient-primary);
      color: white;
      
      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 8px 24px var(--accent-primary)40;
      }
      
      &:active {
        transform: translateY(0);
      }
    `,

    secondary: `
      background: var(--bg-elevated);
      color: var(--text-primary);
      border: 1px solid var(--surface-border);
      
      &:hover:not(:disabled) {
        background: var(--surface-hover);
        border-color: var(--accent-primary);
      }
    `,

    ghost: `
      background: transparent;
      color: var(--text-secondary);
      
      &:hover:not(:disabled) {
        background: var(--surface-hover);
        color: var(--text-primary);
      }
    `,
  },

  // Card variants
  card: {
    base: `
      background: var(--bg-elevated);
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `,

    interactive: `
      cursor: pointer;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        border-color: var(--accent-primary);
      }
    `,

    glass: `
      background: var(--bg-glass);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    `,
  },

  // Input variants
  input: {
    base: `
      width: 100%;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      color: var(--text-primary);
      font-family: inherit;
      font-size: 14px;
      transition: all 0.2s ease;
      outline: none;
      
      &::placeholder {
        color: var(--text-disabled);
      }
      
      &:focus {
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 3px var(--accent-primary)20;
      }
    `,
  },
};
