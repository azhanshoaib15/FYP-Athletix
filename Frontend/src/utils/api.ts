// ── src/utils/api.ts ─────────────────────────────────────────
// Shared API utility with auto 401 handling and input sanitization

import { store } from '../store/store';
import { logout } from '../store/slices/userSlice';

export const API_URL = 'http://192.168.1.27:8000';
export const ML_URL  = 'https://desirable-playfulness-production-a1dd.up.railway.app';

export const apiFetch = async (
    path: string,
    options: RequestInit = {},
    token?: string | null
): Promise<Response> => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    // Auto-logout on token expiry
    if (res.status === 401) {
        store.dispatch(logout());
    }
    return res;
};

// Input sanitization helpers
export const sanitizeEmail    = (s: string) => s.trim().toLowerCase();
export const sanitizeText     = (s: string) => s.trim();
export const sanitizeNumber   = (s: string, min: number, max: number): number | null => {
    const n = parseFloat(s);
    if (isNaN(n) || n < min || n > max) return null;
    return Math.round(n * 100) / 100;
};