'use client';

import { useRef, useState } from 'react';
import { currentBranch, loadStockCloud, setStockQty } from '../../lib/branchData';
import { loadProductsCloud } from '../../lib/products';

export default function OnlineReturns() {
  const [source, setSource] = useState<'lazada' | 'shopee'>('lazada');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const processReturn = async () => {
    if (savingRef.current || !code.trim()) return alert('Scan the barcode or type the order number.');
    const branch = currentBranch() || '';
    savingRef.current = true;
    setSaving(true);
    const [rows, products, stock] = await Promise.all([
      fetch(`/api/records?table=${source}_sales&branch=${branch}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
      loadProductsCloud().catch(() => []),
      loadStockCloud(branch).catch(() => ({})),
    ]);
    const key = code.trim().toLowerCase();
    const sale = (Array.isArray(rows) ? rows : []).find((r: any) => String(r.orderNo || '').toLowerCase() === key || (r.lines || []).some((l: any) => String(l.barcode || '').toLowerCase() === key || String(l.partNumber || '').toLowerCase() === key));
    if (!sale) { savingRef.current = false; setSaving(false); return alert('Order not found.'); }
    if (sale.returned) { savingRef.current = false; setSaving(false); return alert('This order was already returned.'); }
    for (const l of sale.lines || []) {
      const found = products.find((p: any) => String(p.partNumber || '').toLowerCase() === String(l.partNumber || '').toLowerCase());
      if (found) {
        const nextQty = Number(stock[found.id]?.qty || 0) + Number(l.qty || 0);
        setStockQty(found.id, nextQty, stock[found.id]?.location || '', branch);
        await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'inventory', row: { id: `${branch}-${found.id}`, branch, productId: found.id, partNumber: found.partNumber, qty: nextQty } }) });
      }
    }
    await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: `${source}_sales`, row: { ...sale, returned: true, originalTotal: Number(sale.originalTotal || sale.total || 0), returnedAmount: Number(sale.total || 0), netTotal: 0, returnedAt: new Date().toISOString() } }) });
    setCode('');
    savingRef.current = false;
    setSaving(false);
    alert(`Return saved. Stock added back. Returned amount ₱${Number(sale.total || 0).toLocaleString()} deducted. Original sale kept for monitoring.`);
  };

  return (
    <div className="p-4 max-w-xl">
      <h1 className="text-2xl font-black mb-3">Online Returns</h1>
      <div className="bg-white rounded-xl shadow p-4">
        <select className="border rounded px-3 py-+2 w-full mb-2" value={source} onChange={(e) => setSource(e.target.value as 'lazada' | 'shopee')}>
          <option value="lazada">Lazada returned this</option>
          <option value="shopee">Shopee returned this</option>
        </select>
        <input className="border rounded px-3 py-3 w-full mb-3" placeholder="Scan barcode or order number" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); processReturn(); } }} />
        <button onClick={processReturn} disabled={saving} className="bg-amber-600 text-white rounded px-6 py-3 font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Return to Inventory'}</button>
      </div>
    </div>
  );
}
