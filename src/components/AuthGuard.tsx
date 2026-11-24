'use client';

import { useEffect } from 'react';

export default function AuthGuard() {
  useEffect(() => {
    const path = window.location.pathname;
    const lower = path.toLowerCase();
    if (path === '/' || path.startsWith('/api') || lower.startsWith('/customer') || lower.startsWith('/booking') || lower.startsWith('/mobile') || lower.startsWith('/iphone')) return;
    const auth = sessionStorage.getItem('anlurich-auth');
    if (!auth) {
      window.location.href = '/';
      return;
    }
    const branchMatch = path.match(/^\/branch\/([^/]+)/);
    if (branchMatch && branchMatch[1] !== auth && auth !== 'admin') {
      window.location.href = '/';
    }
  }, []);
  return null;
}
