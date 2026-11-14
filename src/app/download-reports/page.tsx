'use client';

import { useEffect, useState } from 'react';
import { currentBranch, loadInvoicesCloud, loadSalesCloud, loadNoInvoicesCloud, loadStockHistory, formatDate } from '../../lib/branchData';
import { loadProductsCloud } from '../../lib/products';

const BRANCHES = ['anlurich', 'dasma', 'sezan', 'lipa', 'avenders'];

export default function DownloadReportsPage() {
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [branch, setBranch] = useState('');
  const [brand, setBrand] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBranch(currentBranch() || 'anlurich');
  }, []);

  const inRange = (value: string) => {
    const day = String(value || '').slice(0, 10);
    return day && day >= from && day <= to;
  };

  const generate = async () => {
    setLoading(true);
    const products = await loadProductsCloud().catch(() => []);
    const [invoices, sales, noInv, history] = await Promise.all([
      loadInvoicesCloud(branch).catch(() => []),
      loadSalesCloud(branch).catch(() => []),
      loadNoInvoicesCloud(branch).catch(() => []),
      loadStockHistory().catch(() => []),
    ]);
    const byPart = new Map<string, any>();
    const ensure = (part: string, extra: any = {}) => {
      const key = part.toLowerCase();
      if (!byPart.has(key)) {
        const product = products.find((p) => String(p.partNumber || '').toLowerCase() === key);
        byPart.set(key, {
          partNumber: part,
          brand: extra.brand || product?.brand || '',
          name: extra.name || product?.name || product?.description || '',
          opening: 0,
          purchased: 0,
          sold: 0,
          ending: 0,
          cost: Number(product?.costPrice || extra.cost || 0),
        });
      }
      return byPart.get(key);
    };
    (history || []).forEach((h: any) => {
      if (h.branch && h.branch !== branch) return;
      const day = String(h.when || '').slice(0, 10);
      if (!day || day >= from) return;
      const row = ensure(h.partNumber, h);
      row.opening = Number(h.newQty || 0);
    });
    (invoices || []).forEach((inv: any) => {
      if (!inRange(inv.invoiceDate || inv.createdAt)) return;
      (inv.lines || []).forEach((line: any) => {
        if (!line.partNumber) return;
        const row = ensure(line.partNumber, line);
        row.purchased += Number(line.qty || line.quantity || 0);
        if (line.brand) row.brand = line.brand;
        if (line.netPrice || line.price) row.cost = Number(line.netPrice || line.price);
      });
    });
    [...(sales || []), ...(noInv || [])].forEach((sale: any) => {
      if (!inRange(sale.date || sale.dateTime)) return;
      (sale.items || sale.lines || []).forEach((line: any) => {
        if (!line.partNumber) return;
        const row = ensure(line.partNumber, line);
        row.sold += Number(line.qty || line.quantity || 0);
      });
    });
    const list = Array.from(byPart.values()).map((r) => ({
      ...r,
      ending: r.opening + r.purchased - r.sold,
      value: (r.opening + r.purchased - r.sold) * r.cost,
    })).filter((r) => !brand.trim() || String(r.brand).toLowerCase().includes(brand.trim().toLowerCase()))
      .sort((a, b) => String(a.brand).localeCompare(String(b.brand)) || String(a.partNumber).localeCompare(String(b.partNumber)));
    setRows(list);
    setLoading(false);
  };

  const download = async () => {
    if (!rows.length) return alert('Generate the report first');
    const XLSX = await import('xlsx');
    const data = rows.map((r) => ({
      'Part Number': r.partNumber,
      Brand: r.brand,
      Description: r.name,
      Opening: r.opening,
      Purchased: r.purchased,
      Sold: r.sold,
      Ending: r.ending,
      Cost: r.cost,
      Value: r.value,
    }));
    const sheet = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Inventory');
    XLSX.writeFile(wb, `inventory-report-${branch}-${from}-to-${to}.xlsx`);
  };

  const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-yellow-600 mb-1">Download Reports</h1>
      <div className="text-xs text-gray-500 mb-4">Inventory report from stock movements</div>
      <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs mb-1">From</label>
          <input type="date" className="border rounded px-3 py-2" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs mb-1">To</label>
          <input type="date" className="border rounded px-3 py-2" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs mb-1">Branch</label>
          <select className="border rounded px-3 py-2" value={branch} onChange={(e) => setBranch(e.target.value)}>
            {BRANCHES.map((b) => <option key={b} value={b}>{b.toUpperCase()}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1">Brand</label>
          <input className="border rounded px-3 py-2" placeholder="Optional" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>
        <button onClick={generate} className="bg-blue-700 text-white px-4 py-2 rounded-lg">{loading ? 'Loading...' : 'Generate'}</button>
        <button onClick={download} className="bg-green-700 text-white px-4 py-2 rounded-lg">Export to Excel</button>
      </div>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-teal-500 text-white">
            <tr>
              <th className="p-2 text-left">Part Number</th>
              <th className="p-2 text-left">Brand</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-right">Opening</th>
              <th className="p-2 text-right">Purchased</th>
              <th className="p-2 text-right">Sold</th>
              <th className="p-2 text-right">Ending</th>
              <th className="p-2 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.partNumber} className="border-t">
                <td className="p-2">{r.partNumber}</td>
                <td className="p-2">{r.brand || '—'}</td>
                <td className="p-2">{r.name || '—'}</td>
                <td className="p-2 text-right">{r.opening}</td>
                <td className="p-2 text-right">{r.purchased}</td>
                <td className="p-2 text-right">{r.sold}</td>
                <td className="p-2 text-right font-bold">{r.ending}</td>
                <td className="p-2 text-right">{money(r.value)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-gray-400">Generate a report to see stock movements</td></tr>}
          </tbody>
        </table>
      </div>
      {rows.length > 0 && <div className="text-right font-bold mt-3">Total value: {money(rows.reduce((n, r) => n + r.value, 0))} · {formatDate(to)}</div>}
    </div>
  );
}
