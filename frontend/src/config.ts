/// <reference types="vite/client" />

// DevIntel API Configuration
// In production on Vercel, uses VITE_API_URL or defaults to the live Render cloud backend
const envUrl = import.meta.env.VITE_API_URL;
const isDev = import.meta.env.DEV;

export const API_BASE_URL: string = (
  envUrl || (isDev ? 'http://localhost:8000' : 'https://devintel-6ebi.onrender.com')
).replace(/\/+$/, '');
