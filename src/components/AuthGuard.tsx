'use client';

import { useEffect } from 'react';

export default function AuthGuard() {
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/' || path.startsWith('/api') || path.startsWith('/customer')) return;
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
