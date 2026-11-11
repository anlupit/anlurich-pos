'use client';

import { useEffect, useState } from 'react';
import { currentBranch } from '../../lib/branchData';

const BRANCHES = ['anlurich', 'dasma', 'sezan', 'timitsu', 'avenders', 'lipa'];

export default function LowStockPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [branch, setBranch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const productsRes = await fetch('/api/records?table=products', { cache: 'no-store' });
        const products = productsRes.ok ? await productsRes.json() : [];
        const stockRes = await fetch('/api/records?table=inventory&branch=admin', { cache: 'no-store' });
        const stock = stockRes.ok ? await stockRes.json() : [];
        const byKey = new Map<string, number>();
        (Array.isArray(stock) ? stock : []).forEach((s: any) => {
          const key = `${String(s.branch || '').toLowerCase()}|${s.productId || s.product_id || ''}`;
          byKey.set(key, Number(s.qty || 0));
        });
        const list: any[] = [];
        (Array.isArray(products) ? products : []).forEach((p: any) => {
          const reorder = Number(p.bufferOrderQty || p.reorderPointQty || 0);
          if (reorder <= 0) return;
          BRANCHES.forEach((b) => {
            const qty = byKey.get(`${b}|${p.id}`) ?? 0;
            if (qty <= reorder) {
              list.push({
                branch: b,
                partNumber: p.partNumber,
                brand: p.brand || '',
                name: p.name || p.description || '',
                qty,
                reorder,
              });
            }
          });
        });
        list.sort((a, b) => String(a.name).localeCompare(String(b.name)) || String(a.brand).localeCompare(String(b.brand)) || String(a.partNumber).localeCompare(String(b.partNumber)));
        setRows(list);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = rows.filter((r) => !branch || r.branch === branch);

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const data = filtered.map((r) => ({
      Branch: r.branch,
      'Part Number': r.partNumber,
      Brand: r.brand,
      'Product Name': r.name,
      'On Hand': r.qty,
      'Reorder Point': r.reorder,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Low Stock');
    XLSX.writeFile(wb, `low-stock-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const goBack = () => {
    const b = currentBranch();
    window.location.href = b && b !== 'admin' ? `/branch/${b}` : b === 'admin' ? '/admin' : '/';
  };

  return (
    <div className="min-h-screen p-4 overflow-x-hidden">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl font-bold text-yellow-600">Low Stock Report</h1>
        <button onClick={goBack} className="text-blue-600 text-sm">← Back to Dashboard</button>
      </div>
      <div className="flex gap-2 mb-3">
        <select className="border rounded px-2 py-1" value={branch} onChange={(e) => setBranch(e.target.value)}>
          <option value="">All branches</option>
          {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <button onClick={exportExcel} className="bg-green-600 text-white px-4 py-1 rounded-lg text-sm">Export to Excel</button>
        <div className="text-sm text-gray-500 self-center">{loading ? 'Loading...' : `${filtered.length} items`}</div>
      </div>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-teal-500 text-white">
            <tr>
              <th className="text-left p-2">Branch</th>
              <th className="text-left p-2">Part Number</th>
              <th className="text-left p-2">Brand</th>
              <th className="text-left p-2">Product Name</th>
              <th className="text-right p-2">On Hand</th>
              <th className="text-right p-2">Reorder Point</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={`${r.branch}-${r.partNumber}-${i}`} className="border-t">
                <td className="p-2">{r.branch}</td>
                <td className="p-2">{r.partNumber}</td>
                <td className="p-2">{r.brand || '—'}</td>
                <td className="p-2">{r.name}</td>
                <td className="p-2 text-right font-medium text-red-600">{r.qty}</td>
                <td className="p-2 text-right">{r.reorder}</td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-500">No products are below the reorder point. Set Reorder Point Qty in the Product Catalog.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
