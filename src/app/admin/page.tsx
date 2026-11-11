'use client';

import { useState, useEffect } from 'react';

const BRANCHES = [
  { id: 'anlurich', name: 'ANLURICH OPC' },
  { id: 'avenders', name: 'Avenders Auto Parts' },
  { id: 'dasma', name: 'Dasma Auto Parts' },
  { id: 'lipa', name: 'Lipa Auto Parts' },
  { id: 'sezan', name: 'Sezan Baliwag Auto Parts' },
  { id: 'timitsu', name: 'Timitsu Baliwag Auto Parts' },
];

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function saleProfit(sale: any, products: any[]) {
  const items = sale.items || [];
  const list = Array.isArray(products) ? products : [];
  const itemProfit = items.reduce((sum: number, item: any) => {
    const qty = Number(item.qty) || 0;
    const sell = Number(item.price) || 0;
    let cost = Number(item.costPrice) || 0;
    if (!cost) {
      const p = list.find((x) => String(x.partNumber || '').toLowerCase() === String(item.partNumber || '').toLowerCase());
      cost = Number(p?.costPrice) || 0;
    }
    return sum + (sell - cost) * qty;
  }, 0);
  const discount = Number(sale.discount) || 0;
  return itemProfit - discount;
}

export default function AdminDashboard() {
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const yearNow = new Date().getFullYear();
  const [fromMonth, setFromMonth] = useState(`${yearNow}-01`);
  const [toMonth, setToMonth] = useState(`${yearNow}-12`);
  const [payables, setPayables] = useState<any[]>([]);
  const [searchedPayables, setSearchedPayables] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);
  const year = new Date().getFullYear().toString();

  useEffect(() => {
    const load = async () => {
      try {
        const loadTable = async (table: string) => {
          const res = await fetch(`/api/records?table=${table}&branch=admin`, { cache: 'no-store' });
          if (!res.ok) return [];
          const rows = await res.json().catch(() => []);
          return Array.isArray(rows) ? rows : [];
        };
        const [allSales, allNoInvoice, allInvoices, catalog] = await Promise.all([
          loadTable('sales'),
          loadTable('no_invoices'),
          loadTable('supplier_invoices'),
          loadTable('products'),
        ]);
        setSales(Array.isArray(allSales) || Array.isArray(allNoInvoice) ? [...(Array.isArray(allSales) ? allSales : []), ...(Array.isArray(allNoInvoice) ? allNoInvoice : [])] : []);
        setProducts(Array.isArray(catalog) ? catalog : []);
        setInvoices(Array.isArray(allInvoices) ? allInvoices : []);
        const res = await fetch('/api/data', { cache: 'no-store' });
        const rows: { key: string; value: string }[] = res.ok ? await res.json() : [];
        const get = (key: string) => {
          const row = rows.find((r) => r.key === key);
          return row?.value ? JSON.parse(row.value) : [];
        };
        setRequests(Array.isArray(get('anlurich-stock-requests')) ? get('anlurich-stock-requests') : []);
        const ann = get('anlurich-announcements');
        setAnnouncements(Array.isArray(ann) ? ann : []);
      } catch {}
    };
    load();
  }, []);

  const branchStats = BRANCHES.map((b) => {
    const bSales = sales.filter((s) => s.branch === b.id);
    const profit = (list: any[]) => list.reduce((sum, s) => sum + saleProfit(s, products), 0);
    const daily = profit(bSales.filter((s) => String(s.date || s.dateTime || '').startsWith(today)));
    const monthly = profit(bSales.filter((s) => String(s.date || s.dateTime || '').startsWith(month)));
    const ytd = profit(bSales.filter((s) => String(s.date || s.dateTime || '').startsWith(year)));
    return { ...b, daily, monthly, ytd };
  });

  const grandDaily = branchStats.reduce((sum, b) => sum + b.daily, 0);
  const grandMonthly = branchStats.reduce((sum, b) => sum + b.monthly, 0);
  const grandYTD = branchStats.reduce((sum, b) => sum + b.ytd, 0);
  const monthlyPurchases = invoices.filter((i) => String(i.invoiceDate || '').startsWith(month)).reduce((sum, i) => sum + (i.grandTotal || 0), 0);

  const monthOf = (value: string) => {
    const raw = String(value || '');
    if (/^\d{4}-\d{2}/.test(raw)) return raw.slice(0, 7);
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '';
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
  };

  const searchPayables = () => {
    const rows = invoices.filter((inv) => {
      const m = monthOf(inv.invoiceDate || inv.createdAt || '');
      if (fromMonth && m && m < fromMonth) return false;
      if (toMonth && m && m > toMonth) return false;
      return true;
    }).sort((a, b) => String(b.invoiceDate || '').localeCompare(String(a.invoiceDate || '')) || String(a.branch || '').localeCompare(String(b.branch || '')));
    setPayables(rows);
    setSearchedPayables(true);
  };

  const moveOldInvoices = async () => {
    if (!confirm('Move old Anlurich supplier invoices, sales invoices, no-invoice sales, and customers into the new tables and empty the old tables?')) return;
    const res = await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ migrateOldInvoices: true }) });
    const data = await res.json().catch(() => ({}));
    alert(res.ok ? `Moved invoices ${data.moved?.invoices || 0}, sales ${data.moved?.sales || 0}, no-invoice ${data.moved?.noInvoices || 0}, customers ${data.moved?.customers || 0}. Old tables are empty.` : 'Move failed.');
  };

  const clearPhotos = async () => {
    if (!confirm('Delete all stored invoice and expense photos from Supabase?')) return;
    const res = await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'anlurich-clear-photos' }) });
    alert(res.ok ? 'All stored photos cleared from Supabase' : 'Photo clear failed. Check Supabase connection.');
  };

  const postAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    const item = { id: Date.now().toString(), text: newAnnouncement.trim(), author: 'Anlu Pit', date: new Date().toISOString() };
    const next = [item, ...announcements];
    setAnnouncements(next);
    setNewAnnouncement('');
    localStorage.setItem('anlurich-announcements', JSON.stringify(next));
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'anlurich-announcements', value: JSON.stringify(next) }),
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-1">ADMIN Dashboard</h1>
      <a href="/users" className="inline-block mb-4 bg-black text-white px-4 py-2 rounded-lg text-sm">User and Password Manager</a>
      <a href="/check-voucher" className="inline-block mb-4 ml-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">Check Voucher</a>
      <a href="/backup" className="inline-block mb-4 ml-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm">Backup and Restore</a>
      <a href="/low-stock" className="inline-block mb-4 ml-2 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm">Low Stock</a>
      <a href="/stock-history" className="inline-block mb-4 ml-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm">Stock History</a>
      <p className="text-gray-500 mb-4">APIS — Auto Parts Inventory System</p>

      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-semibold mb-2">Announcement</h2>
        <textarea className="w-full border rounded-lg px-3 py-2" rows={3} placeholder="Post an announcement to the index page" value={newAnnouncement} onChange={(e) => setNewAnnouncement(e.target.value)} />
        <button onClick={postAnnouncement} className="mt-2 bg-blue-700 text-white px-4 py-2 rounded-lg">Post</button>
      </div>

      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-semibold mb-1">Net Profit by Branch</h2>
        <p className="text-xs text-gray-500 mb-3">Admin only. Net profit = selling price minus cost price, from POS invoices.</p>
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-2">Branch</th>
              <th className="text-right p-2">Daily Net Profit</th>
              <th className="text-right p-2">Monthly Net Profit</th>
              <th className="text-right p-2">Year to Date Net Profit</th>
            </tr>
          </thead>
          <tbody>
            {branchStats.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-2">{b.name}</td>
                <td className="p-2 text-right">{money(b.daily)}</td>
                <td className="p-2 text-right">{money(b.monthly)}</td>
                <td className="p-2 text-right">{money(b.ytd)}</td>
              </tr>
            ))}
            <tr className="border-t-2 font-bold bg-gray-50">
              <td className="p-2">GRAND TOTAL</td>
              <td className="p-2 text-right">{money(grandDaily)}</td>
              <td className="p-2 text-right">{money(grandMonthly)}</td>
              <td className="p-2 text-right">{money(grandYTD)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-semibold mb-2">Monthly Purchases</h2>
        <div className="text-3xl font-bold text-orange-600">₱{monthlyPurchases.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>

      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-semibold mb-2">All Payable Purchases</h2>
        <p className="text-xs text-gray-500 mb-3">Admin only. Searches supplier invoices from all branches.</p>
        <div className="flex flex-wrap items-end gap-2 mb-3">
          <div>
            <div className="text-xs font-medium mb-1">From Month / Year</div>
            <input type="month" className="border rounded px-2 py-1" value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} />
          </div>
          <div>
            <div className="text-xs font-medium mb-1">To Month / Year</div>
            <input type="month" className="border rounded px-2 py-1" value={toMonth} onChange={(e) => setToMonth(e.target.value)} />
          </div>
          <button onClick={searchPayables} className="bg-blue-700 text-white px-5 py-1.5 rounded-lg">Search</button>
        </div>
        {searchedPayables && (
          <div className="overflow-x-auto">
            <div className="font-bold mb-2">Total: {money(payables.reduce((sum, r) => sum + Number(r.grandTotal || 0), 0))} · Unpaid: {money(payables.filter((r) => String(r.status || 'unpaid').toLowerCase() !== 'paid').reduce((sum, r) => sum + Number(r.grandTotal || 0), 0))}</div>
            <table className="w-full text-sm">
              <thead className="bg-teal-500 text-white">
                <tr>
                  <th className="text-left p-2">Invoice Date</th>
                  <th className="text-left p-2">Branch</th>
                  <th className="text-left p-2">Supplier</th>
                  <th className="text-left p-2">Invoice No.</th>
                  <th className="text-right p-2">Total Amount</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payables.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{r.invoiceDate || '—'}</td>
                    <td className="p-2">{BRANCHES.find((b) => b.id === r.branch)?.name || r.branch || '—'}</td>
                    <td className="p-2">{r.supplierName || '—'}</td>
                    <td className="p-2">{r.invoiceNumber || r.invoiceNo || '—'}</td>
                    <td className="p-2 text-right">{money(r.grandTotal)}</td>
                    <td className="p-2 text-center">{String(r.status || 'unpaid').toLowerCase() === 'paid' ? 'Paid' : 'UnPaid'}</td>
                  </tr>
                ))}
                {payables.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400">No payable purchases found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="font-semibold mb-3">Stock Requests ({requests.length})</h2>
        {requests.length === 0 ? <p className="text-gray-400 text-sm">No stock requests</p> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100"><tr><th className="text-left p-2">Branch</th><th className="text-left p-2">Part</th><th className="text-center p-2">Qty</th><th className="text-left p-2">Status</th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t"><td className="p-2">{r.branch}</td><td className="p-2">{r.partNumber}</td><td className="p-2 text-center">{r.qty}</td><td className="p-2">{r.status}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
