'use client';

import { useEffect } from 'react';

export default function CloudSync() {
  useEffect(() => {
    let pushing = false;
    const origSet = localStorage.setItem.bind(localStorage);
    const origRemove = localStorage.removeItem.bind(localStorage);

    async function push(key: string, value: string | null) {
      if (!key.startsWith('anlurich-')) return;
      try {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        });
      } catch {}
    }

    localStorage.setItem = (key: string, value: string) => {
      origSet(key, value);
      if (pushing) push(key, value);
    };
    localStorage.removeItem = (key: string) => {
      origRemove(key);
      if (pushing) push(key, null);
    };

    (async () => {
      try {
        const res = await fetch('/api/data');
        if (!res.ok) return;
        const rows: { key: string; value: unknown }[] = await res.json();
        const serverKeys = new Set(rows.map((r) => r.key));
        for (const row of rows) {
          if (!row.key?.startsWith('anlurich-')) continue;
          const value = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
          origSet(row.key, value);
        }
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('anlurich-') && !serverKeys.has(key)) {
            await push(key, localStorage.getItem(key));
          }
        }
        pushing = true;
        if (rows.length && !sessionStorage.getItem('anlurich-cloud-loaded')) {
          sessionStorage.setItem('anlurich-cloud-loaded', '1');
          window.location.reload();
        }
      } catch {
        pushing = true;
      }
    })();
  }, []);

  return null;
}
