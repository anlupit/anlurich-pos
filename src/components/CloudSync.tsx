'use client';

import { useEffect, useState } from 'react';

export default function CloudSync() {
  const [status, setStatus] = useState('Connecting cloud...');

  useEffect(() => {
    const pending: { key: string; value: string | null }[] = [];
    let ready = false;
    const origSet = localStorage.setItem.bind(localStorage);
    const origRemove = localStorage.removeItem.bind(localStorage);

    function mergeValue(localValue: string | null, cloudValue: string) {
      if (!localValue) return cloudValue;
      try {
        const local = JSON.parse(localValue);
        const cloud = JSON.parse(cloudValue);
        if (Array.isArray(local) && Array.isArray(cloud)) {
          const byKey = new Map<string, any>();
          [...cloud, ...local].forEach((item, index) => {
            const key = String(item?.id || item?.invoiceNumber || item?.invoiceNo || item?.quotationNo || index);
            const prev = byKey.get(key);
            if (!prev || String(item?.createdAt || item?.date || '') >= String(prev?.createdAt || prev?.date || '')) byKey.set(key, item);
          });
          return JSON.stringify(Array.from(byKey.values()));
        }
      } catch {}
      return cloudValue;
    }

    async function push(key: string, value: string | null) {
      if (!key.startsWith('anlurich-')) return;
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error('save failed');
    }

    localStorage.setItem = (key: string, value: string) => {
      origSet(key, value);
      if (!key.startsWith('anlurich-')) return;
      if (!ready) pending.push({ key, value });
      else push(key, value).catch(() => setStatus('Cloud save failed'));
    };
    localStorage.removeItem = (key: string) => {
      origRemove(key);
      if (!key.startsWith('anlurich-')) return;
      if (!ready) pending.push({ key, value: null });
      else push(key, null).catch(() => setStatus('Cloud save failed'));
    };

    (async () => {
      try {
        const res = await fetch('/api/data');
        if (!res.ok) {
          let reason = 'Cloud not connected';
          try { const data = await res.json(); reason = data.error || reason; } catch {}
          setStatus(reason);
          ready = true;
          return;
        }
        const rows: { key: string; value: unknown }[] = await res.json();
        const serverKeys = new Set(rows.map((r) => r.key));
        for (const row of rows) {
          if (!row.key?.startsWith('anlurich-')) continue;
          const cloudValue = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
          origSet(row.key, mergeValue(localStorage.getItem(row.key), cloudValue));
        }
        const missing: Promise<void>[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('anlurich-') && !serverKeys.has(key)) {
            missing.push(push(key, localStorage.getItem(key)));
          }
        }
        await Promise.all([...missing, ...pending.map((item) => push(item.key, item.value))]);
        ready = true;
        setStatus('Cloud connected — branch data shared');
        window.dispatchEvent(new Event('anlurich-synced'));
      } catch {
        ready = true;
        setStatus('Cloud not connected');
      }
    })();
  }, []);

  return (
    <div className="fixed bottom-2 right-2 z-50 text-[11px] bg-black/70 text-white px-2 py-1 rounded">
      {status}
    </div>
  );
}
