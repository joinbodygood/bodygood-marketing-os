import axios from 'axios';
import { supabase } from './supabase.js';

// Always use same-origin absolute paths like `/api/...`. In dev, Vite's
// proxy forwards /api to the Express server on :3001. In prod, Express
// serves both the built client and the API on one domain, so no baseURL
// is needed. Setting VITE_API_URL would only be needed for a split-origin
// deploy (e.g. separate frontend + backend hosts).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: false,
});

api.interceptors.request.use(async (config) => {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
