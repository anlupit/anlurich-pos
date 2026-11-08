'use client';

import { useEffect, useState } from 'react';
import { currentBranch, loadReturns, saveReturn, updateReturns, getStockQty, setStockQty, loadInvoices, updateInvoices, formatDate } from '../../lib/branchData';
import { loadProducts } from '../../lib/products';

type Hit = { key: string; invoiceId: string; supplierName: string; invoiceNo: string; invoiceDate: string; partNumber: string; brand: string; description: string; qty: number; unit: string; price: number; paid: boolean; lineIndex: number };

export default function SupplierReturnPage() {
  const [returns, setReturns] = useState<any[]>([]);
  const [qSupplier, setQSupplier] = useState('');
  const [qInvoice, setQInvoice] = useState('');
  const [qPart, setQPart] = useState('');
  const [qBrand, setQBrand] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [searched, setSearched] = useState(false);
  const [cart, setCart] = useState<Hit[]>([]);
  const [reason, setReason] = useState('');

  useEffect(() => {
    setReturns(loadReturns());
  }, []);

  const search = () => {
    const supplier = qSupplier.trim().toLowerCase();
    const invoice = qInvoice.trim().toLowerCase();
    const part = qPart.trim().toLowerCase();
    const brand = qBrand.trim().toLowerCase();
    const found: Hit[] = [];
    loadInvoices().forEach((inv) => {
      const invNo = String(inv.invoiceNumber || inv.invoiceNo || '');
      const invSupplier = String(inv.supplierName || '');
      if (supplier && !invSupplier.toLowerCase().includes(supplier)) return;
      if (invoice && !invNo.toLowerCase().includes(invoice)) return;
      (inv.lines || []).forEach((line: any, i: number) => {
        const linePart = String(line.partNumber || '');
        const lineDesc = String(line.description || line.name || '');
        const lineBrand = String(line.brand || '');
        if (part && !linePart.toLowerCase().includes(part)) return;
        if (brand && !lineBrand.toLowerCase().includes(brand)) return;
        if (!supplier && !invoice && !part && !brand) return;
        found.push({
          key: `${inv.id || invNo}-${i}-${linePart}`,
          invoiceId: String(inv.id || ''),
          supplierName: invSupplier,
          invoiceNo: invNo,
          invoiceDate: inv.invoiceDate || '',
          partNumber: linePart,
          brand: lineBrand,
          description: lineDesc,
          qty: Number(line.qty || line.quantity || 1),
          unit: line.unit || 'pcs',
          price: Number(line.netPrice || line.price || line.costPrice || 0),
          paid: String(inv.status || '').toLowerCase() === 'paid' || inv.paid === true,
          lineIndex: i,
        });
      });
    });
    setHits(found);
    setSearched(true);
  };

  const addToCart = (hit: Hit) => {
    if (cart.length && cart[0].supplierName.toLowerCase() !== hit.supplierName.toLowerCase()) {
      return alert(`Return is locked to ${cart[0].supplierName}. You cannot add a product from ${hit.supplierName}.`);
    }
    if (cart.some((c) => c.key === hit.key)) return;
    setCart((prev) => [...prev, { ...hit, qty: 1 }]);
  };

  const updateQty = (key: string, qty: number) => {
    setCart((prev) => prev.map((c) => (c.key === key ? { ...c, qty: Math.max(1, qty) } : c)));
  };

  const save = () => {
    if (!cart.length) return alert('Tick and add items to return first');
    const supplierName = cart[0].supplierName;
    const branch = currentBranch() || 'unknown';
    const invoices = loadInvoices(branch);
    const creditMemos = JSON.parse(localStorage.getItem('anlurich-credit-memos') || '[]');
    cart.forEach((item) => {
      const total = item.qty * item.price;
      const inv = invoices.find((i: any) => String(i.id) === item.invoiceId || String(i.invoiceNumber || i.invoiceNo || '') === item.invoiceNo);
      if (inv) {
        const lines = [...(inv.lines || [])];
        const line = { ...(lines[item.lineIndex] || {}) };
        const oldQty = Number(line.qty || line.quantity || 0);
        const newQty = Math.max(0, oldQty - item.qty);
        line.qty = newQty;
        line.quantity = newQty;
        lines[item.lineIndex] = line;
        inv.lines = lines;
        inv.grandTotal = Math.max(0, Number(inv.grandTotal || 0) - total);
        inv.returnAdjusted = true;
      }
      if (item.paid || inv?.status === 'paid' || inv?.paid) {
        creditMemos.push({
          id: Date.now().toString() + item.key,
          supplierName,
          invoiceNo: item.invoiceNo,
          partNumber: item.partNumber,
          description: item.description,
          qty: item.qty,
          amount: total,
          reason,
          branch,
          date: new Date().toISOString().slice(0, 10),
          status: 'open',
        });
      }
      saveReturn({
        id: Date.now().toString() + item.key,
        supplierName,
        invoiceNo: item.invoiceNo,
        partNumber: item.partNumber,
        description: item.description,
        brand: item.brand,
        qty: item.qty,
        unit: item.unit,
        price: item.price,
        total,
        reason,
        status: item.paid ? 'credit-memo' : 'open',
        branch,
        date: new Date().toISOString().slice(0, 10),
      });
      const product = loadProducts().find((p) => p.partNumber.toLowerCase() === item.partNumber.toLowerCase());
      if (product) setStockQty(product.id, Math.max(0, getStockQty(product.id) - item.qty));
    });
    updateInvoices(branch, invoices);
    localStorage.setItem('anlurich-credit-memos', JSON.stringify(creditMemos));
    setReturns(loadReturns());
    setCart([]);
    setReason('');
    alert(`Return saved for ${supplierName}. Invoice quantity and total were adjusted.${cart.some((c) => c.paid) ? ' Credit memo created for the paid invoice.' : ''}`);
  };

  const apply = (id: string) => {
    const branch = currentBranch() || 'unknown';
    const updated = loadReturns().map((r) => r.id === id ? { ...r, status: 'applied' } : r);
    updateReturns(branch, updated);
    setReturns(updated);
  };

  const cartTotal = cart.reduce((n, c) => n + c.qty * c.price, 0);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-yellow-600 mb-1">Supplier Product Return</h1>
      <div className="text-xs text-gray-500 mb-4">Search an invoice, tick items, and return only from the same supplier</div>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="flex flex-wrap gap-2">
          <input className="border rounded px-3 py-2" placeholder="Supplier Name" value={qSupplier} onChange={(e) => setQSupplier(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Invoice No." value={qInvoice} onChange={(e) => setQInvoice(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Part Number" value={qPart} onChange={(e) => setQPart(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Brand" value={qBrand} onChange={(e) => setQBrand(e.target.value)} />
          <button onClick={search} className="bg-teal-600 text-white px-5 py-2 rounded-lg">Search</button>
        </div>
        {searched && hits.length === 0 && <p className="text-sm text-gray-500 mt-3">No invoice items found.</p>}
        {hits.length > 0 && (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead className="bg-teal-500 text-white">
                <tr>
                  <th className="p-2"></th>
                  <th className="text-left p-2">Supplier</th>
                  <th className="text-left p-2">Invoice No.</th>
                  <th className="text-left p-2">Part Number</th>
                  <th className="text-left p-2">Brand</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-center p-2">Qty</th>
                  <th className="text-right p-2">Cost</th>
                </tr>
              </thead>
              <tbody>
                {hits.map((h) => (
                  <tr key={h.key} className="border-t">
                    <td className="p-2 text-center"><input type="checkbox" checked={cart.some((c) => c.key === h.key)} onChange={(e) => e.target.checked ? addToCart(h) : setCart((prev) => prev.filter((c) => c.key !== h.key))} /></td>
                    <td className="p-2">{h.supplierName}</td>
                    <td className="p-2">{h.invoiceNo}</td>
                    <td className="p-2">{h.partNumber}</td>
                    <td className="p-2">{h.brand}</td>
                    <td className="p-2">{h.description}</td>
                    <td className="p-2 text-center">{h.qty}</td>
                    <td className="p-2 text-right">₱{h.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="font-semibold mb-2">Return Cart {cart[0] ? `— ${cart[0].supplierName}` : ''}</div>
        {cart.length === 0 ? <p className="text-sm text-gray-500">No items selected</p> : (
          <table className="w-full text-sm mb-3">
            <thead className="bg-gray-100"><tr><th className="text-left p-2">Invoice</th><th className="text-left p-2">Part Number</th><th className="text-left p-2">Description</th><th className="text-center p-2">Return Qty</th><th className="text-right p-2">Amount</th></tr></thead>
            <tbody>
              {cart.map((c) => (
                <tr key={c.key} className="border-t">
                  <td className="p-2">{c.invoiceNo}</td>
                  <td className="p-2">{c.partNumber}</td>
                  <td className="p-2">{c.description}</td>
                  <td className="p-2 text-center"><input type="number" min={1} className="border rounded w-16 text-center" value={c.qty} onChange={(e) => updateQty(c.key, parseInt(e.target.value) || 1)} /></td>
                  <td className="p-2 text-right">₱{(c.qty * c.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <input className="border rounded px-3 py-2 mb-2 w-full" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex items-center justify-between">
          <div className="font-bold">Return Total: ₱{cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <button onClick={save} className="bg-blue-700 text-white px-5 py-2 rounded-lg">Save Return</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-teal-500 text-white">
            <tr>
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Supplier</th>
              <th className="text-left p-2">Invoice</th>
              <th className="text-left p-2">Part Number</th>
              <th className="text-left p-2">Description</th>
              <th className="text-center p-2">Qty</th>
              <th className="text-right p-2">Amount</th>
              <th className="text-center p-2">Status</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{formatDate(r.date)}</td>
                <td className="p-2">{r.supplierName}</td>
                <td className="p-2">{r.invoiceNo || '—'}</td>
                <td className="p-2">{r.partNumber}</td>
                <td className="p-2">{r.description}</td>
                <td className="p-2 text-center">{r.qty}</td>
                <td className="p-2 text-right">₱{r.total?.toLocaleString()}</td>
                <td className="p-2 text-center">{r.status === 'applied' ? 'Applied' : 'Open'}</td>
                <td className="p-2 text-center">{r.status !== 'applied' && <button onClick={() => apply(r.id)} className="text-blue-600 text-xs font-medium">Deduct Payment</button>}</td>
              </tr>
            ))}
            {returns.length === 0 && <tr><td colSpan={9} className="p-4 text-center text-gray-400">No returns</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
