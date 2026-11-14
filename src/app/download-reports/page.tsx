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
  const [report, setReport] = useState('inventory');
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
    const [invoices, sales, noInv] = await Promise.all([
      loadInvoicesCloud(branch).catch(() => []),
      loadSalesCloud(branch).catch(() => []),
      loadNoInvoicesCloud(branch).catch(() => []),
    ]);
    const allSales = [...(sales || []), ...(noInv || [])].filter((s) => inRange(s.date || s.dateTime));
    if (report === 'sales') {
      const map = new Map<string, any>();
      allSales.forEach((s) => {
        const day = String(s.date || s.dateTime || '').slice(0, 10);
        const month = day.slice(0, 7);
        const key = `${day}`;
        const row = map.get(key) || { date: day, month, cash: 0, credit: 0, total: 0, invoices: 0 };
        const amount = Number(s.grandTotal || s.total || 0);
        if (String(s.paymentType || s.payment || '').toLowerCase().includes('credit')) row.credit += amount;
        else row.cash += amount;
        row.total += amount;
        row.invoices += 1;
        map.set(key, row);
      });
      setRows(Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date)));
      setLoading(false);
      return;
    }
    if (report === 'profit') {
      const list = allSales.flatMap((s) => (s.items || s.lines || []).map((line: any) => {
        const qty = Number(line.qty || line.quantity || 0);
        const sell = Number(line.price || 0);
        const cost = Number(line.costPrice || products.find((p) => String(p.partNumber).toLowerCase() === String(line.partNumber || '').toLowerCase())?.costPrice || 0);
        return { date: String(s.date || s.dateTime || '').slice(0, 10), invoice: s.invoiceNo || s.invoiceNumber || '', partNumber: line.partNumber, qty, sell, cost, profit: (sell - cost) * qty };
      }));
      setRows(list);
      setLoading(false);
      return;
    }
    if (report === 'unpaid') {
      const customers = allSales.filter((s) => String(s.paymentType || s.payment || s.status || '').toLowerCase().includes('credit') || s.status === 'unpaid')
        .map((s) => ({ type: 'Customer', name: s.customerName || 'Walk-in', ref: s.invoiceNo || s.invoiceNumber || '', date: String(s.date || s.dateTime || '').slice(0, 10), amount: Number(s.grandTotal || s.total || 0) }));
      const suppliers = (invoices || []).filter((i) => inRange(i.invoiceDate || i.createdAt) && i.status !== 'paid')
        .map((i) => ({ type: 'Supplier', name: i.supplierName, ref: i.invoiceNumber || i.invoiceNo, date: String(i.invoiceDate || '').slice(0, 10), amount: Number(i.grandTotal || 0) }));
      setRows([...customers, ...suppliers]);
      setLoading(false);
      return;
    }
    if (report === 'slow') {
      const sold = new Map<string, string>();
      allSales.forEach((s) => (s.items || s.lines || []).forEach((line: any) => {
        const key = String(line.partNumber || '').toLowerCase();
        const day = String(s.date || s.dateTime || '').slice(0, 10);
        if (!sold.get(key) || day > sold.get(key)!) sold.set(key, day);
      }));
      const cutoff = new Date(to);
      cutoff.setDate(cutoff.getDate() - 60);
      const slow = products.filter((p) => {
        const last = sold.get(String(p.partNumber || '').toLowerCase());
        return !last || last < cutoff.toISOString().slice(0, 10);
      }).map((p) => ({ partNumber: p.partNumber, brand: p.brand, name: p.name, lastSale: sold.get(String(p.partNumber || '').toLowerCase()) || 'No sale' }));
      setRows(slow);
      setLoading(false);
      return;
    }
    const history = await loadStockHistory().catch(() => []);
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
    const data = rows;
    const sheet = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Inventory');
    XLSX.writeFile(wb, `inventory-report-${branch}-${from}-to-${to}.xlsx`);
  };

  const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const columns = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-yellow-600 mb-1">Download Reports</h1>
      <div className="text-xs text-gray-500 mb-4">Inventory report from stock movements</div>
      <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-2 items-end">
          <label className="block text-xs mb-1">Report</label>
          <select className="border rounded px-3 py-2" value={report} onChange={(e) => { setReport(e.target.value); setRows([]); }}>
            <option value="inventory">Inventory movement</option>
            <option value="sales">Daily and monthly sales</option>
            <option value="profit">Profit report</option>
            <option value="unpaid">Unpaid customers and suppliers</option>
            <option value="slow">Slow-moving stock</option>
          </select>
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
            <tr>{columns.map((c) => <th key={c} className="p-2 text-left">{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">{columns.map((c) => <td key={c} className="p-2">{typeof r[c] === 'number' ? r[c].toLocaleString() : r[c] || '—'}</td>)}</tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-gray-400">Generate a report to see stock movements</td></tr>}
          </tbody>
        </table>
      </div>
      {rows.length > 0 && <div className="text-right font-bold mt-3">Total value: {money(rows.reduce((n, r) => n + r.value, 0))} · {formatDate(to)}</div>}
    </div>
  );
}
