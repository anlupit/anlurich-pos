'use client';

import { useState } from 'react';

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (value?: string) => {
  if (!value) return '—';
  const raw = String(value);
  const d = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw);
  if (isNaN(d.getTime())) return raw;
  return `${d.toLocaleDateString('en-US', { month: 'short' })}. ${d.getDate()}, ${d.getFullYear()}`;
};

export default function SearchBoschInvoicePage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [supplier, setSupplier] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [viewing, setViewing] = useState<any>(null);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    const res = await fetch('/api/records?table=bosch_invoices', { cache: 'no-store' });
    const rows = await res.json().catch(() => []);
    const list = Array.isArray(rows) ? rows : [];
    const qSupplier = supplier.trim().toLowerCase();
    const qInv = invoiceNo.trim().toLowerCase();
    const found = list.filter((inv) => {
      const date = String(inv.date || inv.invoiceDate || '').slice(0, 10);
      if (from && date && date < from) return false;
      if (to && date && date > to) return false;
      if (qSupplier && !String(inv.supplier || inv.supplierName || '').toLowerCase().includes(qSupplier)) return false;
      if (qInv && !String(inv.invoiceNo || inv.invoiceNumber || '').toLowerCase().includes(qInv)) return false;
      return true;
    }).sort((a, b) => {
      const dateA = String(a.date || a.invoiceDate || '');
      const dateB = String(b.date || b.invoiceDate || '');
      if (dateB !== dateA) return dateB.localeCompare(dateA);
      const supplierSort = String(a.supplier || a.supplierName || '').localeCompare(String(b.supplier || b.supplierName || ''));
      if (supplierSort) return supplierSort;
      const numA = parseInt(String(a.invoiceNo || a.invoiceNumber || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.invoiceNo || b.invoiceNumber || '').replace(/\D/g, ''), 10) || 0;
      return numB - numA;
    });
    setResults(found);
    setSearched(true);
  };

  const download = async () => {
    if (!results.length) return alert('Search first.');
    const XLSX = await import('xlsx');
    const data = results.map((r) => ({
      Date: formatDate(r.date || r.invoiceDate || ''),
      'Invoice No': r.invoiceNo || r.invoiceNumber || '',
      Supplier: r.supplier || r.supplierName || '',
      'Net of VAT': Number(r.netTotal || 0),
      '12% VAT': Number(r.vatTotal || 0),
      'Grand Total': Number(r.total || 0),
    }));
    const sheet = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Bosch Invoices');
    XLSX.writeFile(wb, 'bosch-invoices.xlsx');
  };

  return (
    <div className="p-4 overflow-x-auto">
      <h1 className="text-2xl font-black mb-1" style={{ color: '#002366' }}>Search Bosch Invoice</h1>
      <p className="text-sm text-gray-500 mb-4">From the Supabase Bosch invoice table</p>
      <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-2 items-end">
        <label className="text-sm">From<input type="date" className="border rounded px-2 py-2 block" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-sm">To<input type="date" className="border rounded px-2 py-2 block" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <label className="text-sm">Supplier<input className="border rounded px-2 py-2 block" value={supplier} onChange={(e) => setSupplier(e.target.value)} /></label>
        <label className="text-sm">Invoice No.<input className="border rounded px-2 py-2 block" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} /></label>
        <button onClick={search} className="bg-[#002366] text-white px-4 py-2 rounded-lg font-bold">Search</button>
        <button onClick={download} className="bg-green-700 text-white px-4 py-2 rounded-lg font-bold">Download</button>
      </div>
      {searched && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white" style={{ background: '#002366' }}>
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Invoice No.</th>
                <th className="p-2 text-left">Supplier</th>
                <th className="p-2 text-right">Net of VAT</th>
                <th className="p-2 text-right">12% VAT</th>
                <th className="p-2 text-right">Grand Total</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{formatDate(r.date || r.invoiceDate)}</td>
                  <td className="p-2 font-medium">{r.invoiceNo || r.invoiceNumber}</td>
                  <td className="p-2">{r.supplier || r.supplierName}</td>
                  <td className="p-2 text-right">{money(r.netTotal)}</td>
                  <td className="p-2 text-right">{money(r.vatTotal)}</td>
                  <td className="p-2 text-right font-bold">{money(r.total)}</td>
                  <td className="p-2 text-center"><button onClick={() => setViewing(r)} className="text-blue-700 font-bold">View</button></td>
                </tr>
              ))}
              {results.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-gray-400">No Bosch invoices found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {viewing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-4 w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between mb-3">
              <h2 className="font-black text-lg">Invoice {viewing.invoiceNo}</h2>
              <button onClick={() => setViewing(null)} className="bg-gray-700 text-white px-3 py-1 rounded">Close</button>
            </div>
            <div className="mb-2">{viewing.supplier} · {formatDate(viewing.date)}</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-1 text-left">Part Number</th>
                  <th className="p-1 text-left">Product Name</th>
                  <th className="p-1 text-center">Qty</th>
                  <th className="p-1 text-right">Net Amount</th>
                </tr>
              </thead>
              <tbody>
                {(viewing.lines || []).map((l: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="p-1">{l.partNumber}</td>
                    <td className="p-1">{l.productName || l.model}</td>
                    <td className="p-1 text-center">{l.qty}</td>
                    <td className="p-1 text-right">{money((l.qty || 0) * (l.price || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right font-black mt-3">Grand Total {money(viewing.total)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
