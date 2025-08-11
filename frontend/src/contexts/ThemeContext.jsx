import React, { createContext, useContext, useState, useEffect } from "react";
import { createModernTheme, applyCSSVariables } from "../styles/modernTheme";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const AppThemeProvider = ({ children, albumColors = null }) => {
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem("themeMode") || "auto";
  });

  const prefersDarkMode = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;

  const actualMode =
    themeMode === "auto" ? (prefersDarkMode ? "dark" : "light") : themeMode;

  const theme = React.useMemo(() => {
    console.log("🎨 Creating theme with album colors:", albumColors);
    return createModernTheme(actualMode, albumColors);
  }, [actualMode, albumColors]);

  // Apply CSS variables to document root
  useEffect(() => {
    applyCSSVariables(theme.cssVariables);

    // Apply base styles
    document.body.style.backgroundColor = theme.colors.background.primary;
    document.body.style.color = theme.colors.text.primary;
    document.body.style.fontFamily =
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
    document.body.style.margin = "0";
    document.body.style.transition =
      "background-color 0.3s ease, color 0.3s ease";
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("themeMode", themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => {
      switch (prev) {
        case "light":
          return "dark";
        case "dark":
          return "auto";
        case "auto":
          return "light";
        default:
          return "light";
      }
    });
  };

  const value = {
    mode: actualMode,
    themeMode,
    theme,
    toggleTheme,
    setThemeMode,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
