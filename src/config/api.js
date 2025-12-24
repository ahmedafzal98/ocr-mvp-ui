/**
 * Centralized API configuration
 * 
 * This file ensures all API calls use the same base URL.
 * Environment variables are set at build time by Vite.
 */

// Get API base URL from environment variable
// In production, this should be set in Vercel: VITE_API_BASE_URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Derive WebSocket URL from API URL
const getWebSocketURL = () => {
  if (import.meta.env.VITE_WS_BASE_URL) {
    return import.meta.env.VITE_WS_BASE_URL;
  }
  
  if (import.meta.env.VITE_API_BASE_URL) {
    // Convert http:// to ws:// and https:// to wss://
    return import.meta.env.VITE_API_BASE_URL
      .replace(/^http:/, 'ws:')
      .replace(/^https:/, 'wss:');
  }
  
  // Fallback to localhost with protocol detection
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://127.0.0.1:8000`;
};

const WS_BASE_URL = getWebSocketURL();

// Log in development to help debug
if (import.meta.env.DEV) {
  console.log('🔧 API Configuration:');
  console.log('  API_BASE_URL:', API_BASE_URL);
  console.log('  WS_BASE_URL:', WS_BASE_URL);
  console.log('  VITE_API_BASE_URL env:', import.meta.env.VITE_API_BASE_URL);
}

// Warn in production if using localhost
if (import.meta.env.PROD && API_BASE_URL.includes('127.0.0.1')) {
  console.warn('⚠️ WARNING: Using localhost API URL in production!');
  console.warn('   Set VITE_API_BASE_URL in Vercel environment variables');
  console.warn('   Current API_BASE_URL:', API_BASE_URL);
}

export { API_BASE_URL, WS_BASE_URL };
export default API_BASE_URL;

