import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { Toaster } from "react-hot-toast";

import App from "./App";
import "./index.css";

// Initialize theme before React renders
const initializeTheme = () => {
  try {
    const savedTheme = localStorage.getItem('theme') || 'auto';
    let actualTheme = savedTheme;
    
    if (savedTheme === 'auto') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    console.log(`Initializing theme: saved=${savedTheme}, actual=${actualTheme}`);
    
    // Apply theme to document immediately
    document.documentElement.setAttribute('data-theme', actualTheme);
    document.body.setAttribute('data-theme', actualTheme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(actualTheme);
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(actualTheme);
    
    // Apply CSS variables immediately and comprehensively
    const root = document.documentElement;
    if (actualTheme === 'light') {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f8f9fa');
      root.style.setProperty('--bg-elevated', 'rgba(255, 255, 255, 0.9)');
      root.style.setProperty('--bg-glass', 'rgba(255, 255, 255, 0.8)');
      root.style.setProperty('--bg-surface', '#f5f5f5');
      root.style.setProperty('--bg-hover', 'rgba(0, 0, 0, 0.04)');
      root.style.setProperty('--text-primary', '#202124');
      root.style.setProperty('--text-secondary', '#5f6368');
      root.style.setProperty('--text-disabled', '#9aa0a6');
      root.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--shadow', '0 1px 6px rgba(32, 33, 36, 0.1)');
    } else {
      root.style.setProperty('--bg-primary', '#121212');
      root.style.setProperty('--bg-secondary', '#1e1e1e');
      root.style.setProperty('--bg-elevated', 'rgba(42, 42, 42, 0.95)');
      root.style.setProperty('--bg-glass', 'rgba(37, 37, 37, 0.85)');
      root.style.setProperty('--bg-surface', '#242424');
      root.style.setProperty('--bg-hover', 'rgba(255, 255, 255, 0.08)');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#b3b3b3');
      root.style.setProperty('--text-disabled', '#8a8a8a');
      root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.12)');
      root.style.setProperty('--shadow', '0 4px 20px rgba(0, 0, 0, 0.5)');
    }
    
    // Force a style recalculation
    document.documentElement.offsetHeight;
    
    console.log(`Theme initialized successfully: ${actualTheme}`);
  } catch (error) {
    console.error('Theme initialization failed:', error);
    // Fallback to dark theme
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.setAttribute('data-theme', 'dark');
  }
};

// Initialize theme immediately
initializeTheme();

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "12px",
              fontFamily: "Inter, system-ui, sans-serif",
            },
            success: {
              style: {
                background: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                color: "#fff",
              },
            },
            error: {
              style: {
                background: "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)",
                color: "#fff",
              },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
