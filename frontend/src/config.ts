/// <reference types="vite/client" />

// DevIntel API Configuration
// Automatically corrects any 0ebi typos and connects directly to the live Render backend
const rawEnv: string = (import.meta.env.VITE_API_URL || '').trim();
const isDev = import.meta.env.DEV;

// Automatically normalize any 0ebi/oebi typos to verified active backend 6ebi
const sanitizedUrl = rawEnv
  ? rawEnv.replace(/devintel-[0o]ebi/i, 'devintel-6ebi')
  : '';

export const API_BASE_URL: string = (
  sanitizedUrl || (isDev ? 'http://localhost:8000' : 'https://devintel-6ebi.onrender.com')
).replace(/\/+$/, '');
