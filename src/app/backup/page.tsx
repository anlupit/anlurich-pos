'use client';

import { useState } from 'react';
import { currentBranch } from '../../lib/branchData';

const TABLES = ['sales', 'no_invoices', 'supplier_invoices', 'products', 'inventory', 'expenses', 'customers'];

export default function BackupPage() {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const loadTable = async (table: string) => {
    const res = await fetch(`/api/records?table=${table}&branch=admin`, { cache: 'no-store' });
    if (!res.ok) return [];
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) ? rows : [];
  };

  const downloadBackup = async () => {
    setBusy(true);
    setStatus('Collecting data...');
    try {
      const data: Record<string, any[]> = {};
      for (const table of TABLES) {
        setStatus(`Downloading ${table}...`);
        data[table] = await loadTable(table);
      }
      const history = await fetch('/api/data?key=anlurich-stock-history', { cache: 'no-store' }).then((r) => r.json()).catch(() => []);
      data.stockHistory = Array.isArray(history) ? history : [];
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `apis-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setStatus('Backup downloaded.');
    } catch (err: any) {
      setStatus(err?.message || 'Backup failed');
    }
    setBusy(false);
  };

  const restore = async (file: File) => {
    if (!confirm('Restore this backup? Existing records with the same id will be updated.')) return;
    setBusy(true);
    setStatus('Reading file...');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const data = parsed.data || parsed;
      for (const table of TABLES) {
        const rows = Array.isArray(data[table]) ? data[table] : [];
        setStatus(`Restoring ${table} (${rows.length})...`);
        for (const row of rows) {
          await fetch('/api/records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table, row }),
          });
        }
      }
      setStatus('Restore finished.');
    } catch (err: any) {
      setStatus(err?.message || 'Restore failed. The file must be a backup JSON.');
    }
    setBusy(false);
  };

  const goBack = () => {
    const b = currentBranch();
    window.location.href = b && b !== 'admin' ? `/branch/${b}` : b === 'admin' ? '/admin' : '/';
  };

  return (
    <div className="min-h-screen p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-yellow-600">Backup and Restore</h1>
        <button onClick={goBack} className="text-blue-600 text-sm">← Back to Dashboard</button>
      </div>
      <p className="text-sm text-gray-600 mb-4">Download all sales, invoices, products, and stock. Keep the file safe. You can restore it if Supabase has a problem.</p>
      <div className="bg-white rounded-xl shadow p-4 space-y-4 max-w-xl">
        <button onClick={downloadBackup} disabled={busy} className="bg-blue-700 text-white px-5 py-2 rounded-lg font-bold disabled:opacity-50">
          {busy ? 'Working...' : 'Download Backup'}
        </button>
        <div>
          <label className="block text-sm font-medium mb-1">Restore from backup file</label>
          <input type="file" accept=".json" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); }} />
        </div>
        {status && <div className="text-sm text-gray-700">{status}</div>}
      </div>
    </div>
  );
}
