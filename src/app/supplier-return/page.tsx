'use client';

import { useEffect, useState } from 'react';
import { currentBranch, loadBranchSuppliers, loadReturns, saveReturn, updateReturns, loadProducts, getStockQty, setStockQty, loadInvoices, formatDate } from '../../lib/branchData';

export default function SupplierReturnPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState('pcs');
  const [price, setPrice] = useState(0);
  const [reason, setReason] = useState('');
  const [qSupplier, setQSupplier] = useState('');
  const [qPart, setQPart] = useState('');
  const [qInvoice, setQInvoice] = useState('');
  const [results, setResults] = useState<any[] | null>(null);

  const refresh = () => setReturns(loadReturns());

  useEffect(() => {
    setSuppliers(loadBranchSuppliers());
    refresh();
  }, []);

  const total = qty * price;

  const save = () => {
    if (!supplierName.trim()) return alert('Enter supplier name');
    if (!partNumber.trim() && !description.trim()) return alert('Enter part number or description');
    if (qty <= 0) return alert('Enter quantity');
    const ret = {
      id: Date.now().toString(),
      supplierName,
      invoiceNo,
      partNumber,
      description,
      brand,
      qty,
      unit,
      price,
      total,
      reason,
      status: 'open',
      branch: currentBranch(),
      date: new Date().toISOString().slice(0, 10),
    };
    saveReturn(ret);
    const product = loadProducts().find((p) => p.partNumber.toLowerCase() === partNumber.trim().toLowerCase());
    if (product) setStockQty(product.id, Math.max(0, getStockQty(product.id) - qty));
    refresh();
    setPartNumber(''); setDescription(''); setBrand(''); setQty(1); setPrice(0); setReason('');
    alert(`Return saved. ₱${total.toLocaleString()} will be deducted from payment to ${supplierName}.`);
  };

  const search = () => {
    const all = loadReturns();
    setResults(all.filter((r) => {
      const sOk = !qSupplier || String(r.supplierName || '').toLowerCase().includes(qSupplier.toLowerCase());
      const pOk = !qPart || String(r.partNumber || '').toLowerCase().includes(qPart.toLowerCase()) || String(r.description || '').toLowerCase().includes(qPart.toLowerCase());
      const iOk = !qInvoice || String(r.invoiceNo || '').toLowerCase().includes(qInvoice.toLowerCase());
      return sOk && pOk && iOk;
    }));
  };

  const apply = (id: string) => {
    const branch = currentBranch() || 'unknown';
    const updated = loadReturns().map((r) => r.id === id ? { ...r, status: 'applied' } : r);
    updateReturns(branch, updated);
    refresh();
    if (results) setResults(updated.filter((r) => results.some((x) => x.id === r.id)));
  };

  const openCredit = (name: string) => returns.filter((r) => r.supplierName === name && r.status === 'open').reduce((n, r) => n + (r.total || 0), 0);
  const unpaid = (name: string) => loadInvoices().filter((i) => i.supplierName === name && i.status !== 'paid').reduce((n, i) => n + (i.grandTotal || 0), 0);

  const list = results || returns;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-yellow-600 mb-1">Supplier Product Return</h1>
      <div className="text-xs text-gray-500 mb-4">This branch only — return amount is deducted from supplier payment</div>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
          <input className="border rounded px-3 py-2" list="sup-list" placeholder="Supplier Name" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
          <datalist id="sup-list">{suppliers.map((s) => <option key={s.id} value={s.name} />)}</datalist>
          <input className="border rounded px-3 py-2" placeholder="Invoice No." value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Part Number" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
          <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
          <input type="number" className="border rounded px-3 py-2" placeholder="Qty" value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 0)} />
          <input className="border rounded px-3 py-2" placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
          <input type="number" className="border rounded px-3 py-2" placeholder="Cost Price" value={price || ''} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} />
          <input className="border rounded px-3 py-2" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="font-bold self-center">Total: ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <button onClick={save} className="bg-blue-700 text-white px-5 py-2 rounded-lg">Save Return</button>
        {supplierName && (
          <div className="text-sm mt-2 text-gray-600">
            Unpaid invoices: ₱{unpaid(supplierName).toLocaleString()} · Open returns: ₱{openCredit(supplierName).toLocaleString()} · Balance due: ₱{Math.max(0, unpaid(supplierName) - openCredit(supplierName)).toLocaleString()}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="flex flex-wrap gap-2">
          <input className="border rounded px-3 py-2" placeholder="Search supplier" value={qSupplier} onChange={(e) => setQSupplier(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Part Number" value={qPart} onChange={(e) => setQPart(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Invoice No." value={qInvoice} onChange={(e) => setQInvoice(e.target.value)} />
          <button onClick={search} className="bg-teal-600 text-white px-5 py-2 rounded-lg">Search</button>
          <button onClick={() => setResults(null)} className="bg-gray-500 text-white px-4 py-2 rounded-lg">Show All</button>
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
            {list.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{formatDate(r.date)}</td>
                <td className="p-2">{r.supplierName}</td>
                <td className="p-2">{r.invoiceNo || '—'}</td>
                <td className="p-2">{r.partNumber}</td>
                <td className="p-2">{r.description}</td>
                <td className="p-2 text-center">{r.qty}</td>
                <td className="p-2 text-right">₱{r.total?.toLocaleString()}</td>
                <td className="p-2 text-center">{r.status === 'applied' ? 'Applied' : 'Open'}</td>
                <td className="p-2 text-center">
                  {r.status !== 'applied' && <button onClick={() => apply(r.id)} className="text-blue-600 text-xs font-medium">Deduct Payment</button>}
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={9} className="p-4 text-center text-gray-400">No returns</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
