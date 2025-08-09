import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

import App from './App';
import { AppThemeProvider } from './contexts/ThemeContext';
import './index.css';

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <BrowserRouter>
          <App />
          <Toaster 
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: '12px',
                fontFamily: 'Inter, system-ui, sans-serif',
              },
              success: {
                style: {
                  background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                },
              },
              error: {
                style: {
                  background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                  color: '#fff',
                },
              },
            }}
          />
        </BrowserRouter>
      </AppThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);