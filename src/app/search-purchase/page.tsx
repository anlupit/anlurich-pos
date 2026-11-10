'use client';

import { useState, useEffect } from 'react';
import { loadInvoices, loadInvoicesCloud, updateInvoices, currentBranch, formatDate, stripInvoicePhotos, searchInvoicesCloud, saveInvoice, deleteInvoiceRecord, clearOldInvoiceRecords } from '../../lib/branchData';

export default function SearchPurchasePage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [month, setMonth] = useState('');
  const [supplier, setSupplier] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [part, setPart] = useState('');
  const [brand, setBrand] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [mode, setMode] = useState<'invoice' | 'product'>('invoice');
  const [searched, setSearched] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [logo, setLogo] = useState('');

  useEffect(() => {
    setLogo(localStorage.getItem('anlurich-index-logo') || '/logo.png');
    clearOldInvoiceRecords().catch(() => {});
    loadInvoicesCloud().then(setInvoices);
  }, []);

  const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const searchInvoices = (list: any[], filters = { month, supplier, invoiceNo }) => {
    const qSupplier = filters.supplier.trim().toLowerCase();
    const qInv = filters.invoiceNo.trim().toLowerCase();
    const rows = list.filter((inv) => {
      const invDate = String(inv.invoiceDate || inv.createdAt || '');
      if (filters.month && !invDate.startsWith(filters.month)) return false;
      if (qSupplier && !String(inv.supplierName || '').toLowerCase().includes(qSupplier)) return false;
      if (qInv && !`${inv.invoiceNumber || ''} ${inv.invoiceNo || ''}`.toLowerCase().includes(qInv)) return false;
      return true;
    }).sort((a, b) => {
      const date = String(b.invoiceDate || '').localeCompare(String(a.invoiceDate || ''));
      if (date) return date;
      const supplierSort = String(a.supplierName || '').localeCompare(String(b.supplierName || ''));
      if (supplierSort) return supplierSort;
      return String(b.invoiceNumber || b.invoiceNo || '').localeCompare(String(a.invoiceNumber || a.invoiceNo || ''), undefined, { numeric: true });
    });
    setResults(rows);
    setMode('invoice');
    setSearched(true);
  };

  const searchProducts = (list: any[], filters = { part, brand }) => {
    const qPart = filters.part.trim().toLowerCase();
    const qBrand = filters.brand.trim().toLowerCase();
    const rows: any[] = [];
    list.forEach((inv) => {
      (inv.lines || []).forEach((line: any) => {
        const pn = String(line.partNumber || line.partNo || line.oemPartNumber || '').toLowerCase();
        const br = String(line.brand || '').toLowerCase();
        const partOk = !qPart || pn.includes(qPart);
        const brandOk = !qBrand || br.includes(qBrand);
        if (partOk && brandOk) {
          rows.push({
            invoiceId: inv.id,
            invoiceDate: inv.invoiceDate,
            invoiceNumber: inv.invoiceNumber,
            supplierName: inv.supplierName,
            partNumber: line.partNumber || line.partNo,
            brand: line.brand,
            qty: line.qty || line.quantity,
            netAmount: line.netPrice || line.price || line.costPrice,
          });
        }
      });
    });
    setResults(rows.sort((a, b) => {
      const date = String(b.invoiceDate || '').localeCompare(String(a.invoiceDate || ''));
      if (date) return date;
      const supplierSort = String(a.supplierName || '').localeCompare(String(b.supplierName || ''));
      if (supplierSort) return supplierSort;
      return String(b.invoiceNumber || '').localeCompare(String(a.invoiceNumber || ''), undefined, { numeric: true });
    }));
    setMode('product');
    setSearched(true);
    setPart('');
    setBrand('');
  };

  const handleInvoiceSearch = async () => {
    const filters = { month, supplier, invoiceNo };
    const fresh = await searchInvoicesCloud(filters);
    searchInvoices(fresh, filters);
    setMonth('');
    setSupplier('');
    setInvoiceNo('');
  };

  const handleProductSearch = async () => {
    const filters = { part, brand };
    const fresh = await searchInvoicesCloud(filters);
    searchProducts(fresh, filters);
    setPart('');
    setBrand('');
  };

  const openInvoice = (invoiceId: string) => {
    const inv = results.find((i) => i.id === invoiceId) || invoices.find((i) => i.id === invoiceId);
    if (inv) setViewing(JSON.parse(JSON.stringify(inv)));
    else alert('Invoice record was not found. Search again and try View / Edit.');
  };

  const updateLine = (index: number, field: string, value: string | number) => {
    if (!viewing) return;
    const lines = [...(viewing.lines || [])];
    const line = { ...lines[index], [field]: value };
    line.total = (Number(line.qty) || 0) * (Number(line.price) || 0);
    lines[index] = line;
    const subtotal = lines.reduce((sum: number, l: any) => sum + (Number(l.qty) || 0) * (Number(l.price) || 0), 0);
    const grandTotal = subtotal * (1 - (viewing.discount1 || 0) / 100) * (1 - (viewing.discount2 || 0) / 100);
    setViewing({ ...viewing, lines, subtotal, grandTotal });
  };

  const saveEdit = async () => {
    if (!viewing) return;
    const current = viewing;
    setViewing(null);
    const branch = currentBranch() || 'unknown';
    try {
      await saveInvoice({ ...current, branch, updatedAt: new Date().toISOString() });
    } catch {
      return alert('Changes were NOT saved. Supabase is not connected.');
    }
    alert('Invoice saved to Supabase');
    handleInvoiceSearch();
  };

  const deleteInvoice = async () => {
    if (!viewing) return;
    const pin = prompt('Enter delete password');
    if (pin !== '12345') return alert('Wrong delete password. Invoice was not deleted.');
    if (!confirm(`Delete invoice ${viewing.invoiceNumber}?`)) return;
    const branch = currentBranch();
    await deleteInvoiceRecord(viewing, branch);
    setInvoices((prev) => prev.filter((inv) => inv.id !== viewing.id));
    setResults((prev) => prev.filter((inv) => inv.id !== viewing.id));
    setViewing(null);
    alert('Invoice deleted from this computer and Supabase');
  };

  const goDashboard = () => {
    const b = currentBranch();
    if (b && b !== 'admin') window.location.href = `/branch/${b}`;
    else if (b === 'admin') window.location.href = '/admin';
    else window.location.href = '/';
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          {logo ? <img src={logo} alt="Logo" className="w-14 h-14 object-contain" /> : null}
          <h1 className="text-xl md:text-2xl font-black tracking-wide text-[#1e3a8a]">AUTO PARTS INVENTORY SYSTEM</h1>
        </div>
        <div className="text-2xl md:text-4xl font-black text-gray-800">{formatDate(new Date().toISOString().split('T')[0])}</div>
      </div>
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-xl font-bold text-yellow-600">Search Purchase Invoice</h1>
        <button onClick={goDashboard} className="text-sm text-blue-600 hover:underline">← Back to Dashboard</button>
      </div>
      <div className="text-xs text-gray-500 mb-4">This branch only</div>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="flex flex-wrap items-end gap-2 mb-3" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInvoiceSearch(); } }}>
          <div>
            <div className="text-xs font-medium text-center mb-1">Month / Year</div>
            <input type="month" className="border rounded px-2 py-1" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div>
            <div className="text-xs font-medium text-center mb-1">Supplier Name</div>
            <input className="border rounded px-2 py-1" style={{ width: '40ch' }} value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </div>
          <div>
            <div className="text-xs font-medium text-center mb-1">Invoice No.</div>
            <input className="border rounded px-2 py-1" style={{ width: '20ch' }} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          </div>
          <button onClick={handleInvoiceSearch} className="bg-blue-700 text-white px-5 py-1.5 rounded-lg">Search Invoice</button>
        </div>
        <div className="flex flex-wrap items-end gap-2" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleProductSearch(); } }}>
          <div>
            <div className="text-xs font-medium text-center mb-1">Part Number</div>
            <input className="border rounded px-2 py-1" style={{ width: '20ch' }} value={part} onChange={(e) => setPart(e.target.value)} />
          </div>
          <div>
            <div className="text-xs font-medium text-center mb-1">Brand</div>
            <input className="border rounded px-2 py-1" style={{ width: '20ch' }} value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <button onClick={handleProductSearch} className="bg-teal-600 text-white px-5 py-1.5 rounded-lg">Search Product</button>
        </div>
      </div>

      {searched && mode === 'invoice' && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full" style={{ fontSize: '20px' }}>
            <thead className="bg-teal-500 text-white">
              <tr>
                <th className="text-left p-2">Invoice Date</th>
                <th className="text-left p-2">Invoice No.</th>
                <th className="text-left p-2">Supplier Name</th>
                <th className="text-right p-2">Total Amount</th>
                <th className="text-center p-2">Status</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{formatDate(r.invoiceDate)}</td>
                  <td className="p-2 font-medium">{r.invoiceNumber || r.invoiceNo}</td>
                  <td className="p-2">{r.supplierName}</td>
                  <td className="p-2 text-right">{money(r.grandTotal)}</td>
                  <td className="p-2 text-center">{String(r.status || 'unpaid').toLowerCase() === 'paid' ? 'Paid' : 'UnPaid'}</td>
                  <td className="p-2 text-center"><button onClick={() => openInvoice(r.id)} className="text-blue-600 font-medium">View / Edit</button></td>
                </tr>
              ))}
              {results.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400">No purchase invoices found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {searched && mode === 'product' && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full" style={{ fontSize: '20px' }}>
            <thead className="bg-teal-500 text-white">
              <tr>
                <th className="text-left p-2">Invoice Date</th>
                <th className="text-left p-2">Invoice Number</th>
                <th className="text-left p-2">Supplier Name</th>
                <th className="text-left p-2">Part Number</th>
                <th className="text-left p-2">Brand</th>
                <th className="text-center p-2">Delivered Qty</th>
                <th className="text-right p-2">Net Amount</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{formatDate(r.invoiceDate)}</td>
                  <td className="p-2 font-medium">{r.invoiceNumber}</td>
                  <td className="p-2">{r.supplierName}</td>
                  <td className="p-2">{r.partNumber || '—'}</td>
                  <td className="p-2">{r.brand || '—'}</td>
                  <td className="p-2 text-center">{r.qty ?? '—'}</td>
                  <td className="p-2 text-right">{r.netAmount != null ? money(r.netAmount) : '—'}</td>
                  <td className="p-2 text-center"><button onClick={() => openInvoice(r.invoiceId)} className="text-blue-600 font-medium">View / Edit</button></td>
                </tr>
              ))}
              {results.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-gray-400">No purchase items found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-7xl max-h-[90vh] overflow-auto">
            <h3 className="font-bold text-lg mb-3">Invoice {viewing.invoiceNumber}</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input className="border rounded px-3 py-2" value={viewing.supplierName || ''} onChange={(e) => setViewing({ ...viewing, supplierName: e.target.value })} />
              <input className="border rounded px-3 py-2" value={viewing.invoiceNumber || ''} onChange={(e) => setViewing({ ...viewing, invoiceNumber: e.target.value })} />
            </div>
            <table className="w-full text-sm mb-3">
              <thead className="bg-gray-100"><tr><th className="text-left p-1">Part Number</th><th className="text-left p-1">Description</th><th className="text-left p-1">Brand</th><th className="text-center p-1">Qty</th><th className="text-right p-1">Price</th></tr></thead>
              <tbody>
                {(viewing.lines || []).map((line: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="p-1"><input className="border rounded px-2 py-1" style={{ width: '20ch' }} value={line.partNumber || ''} onChange={(e) => updateLine(i, 'partNumber', e.target.value)} /></td>
                    <td className="p-1"><input className="border rounded px-2 py-1" style={{ width: '60ch' }} value={line.description || ''} onChange={(e) => updateLine(i, 'description', e.target.value)} /></td>
                    <td className="p-1"><input className="border rounded px-2 py-1" style={{ width: '30ch' }} value={line.brand || ''} onChange={(e) => updateLine(i, 'brand', e.target.value)} /></td>
                    <td className="p-1 text-center"><input type="number" className="w-16 border rounded px-2 py-1 text-center" value={line.qty} onChange={(e) => updateLine(i, 'qty', parseInt(e.target.value) || 0)} /></td>
                    <td className="p-1 text-right"><input type="number" step="0.01" className="w-24 border rounded px-2 py-1 text-right" value={Number(line.price || 0).toFixed(2)} onChange={(e) => updateLine(i, 'price', Math.round((parseFloat(e.target.value) || 0) * 100) / 100)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right font-bold mb-3">Total: ₱{Number(viewing.grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="flex gap-3">
              <button onClick={() => setViewing(null)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg">Close</button>
              <button onClick={deleteInvoice} className="flex-1 bg-red-600 text-white py-2 rounded-lg">Delete Invoice</button>
              <button onClick={saveEdit} className="flex-1 bg-green-600 text-white py-2 rounded-lg">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
