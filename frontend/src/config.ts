/// <reference types="vite/client" />

// DevIntel API Configuration
// When deployed on Vercel/Netlify, set VITE_API_URL in your hosting platform dashboard
export const API_BASE_URL: string = (
  (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'
).replace(/\/+$/, '');
