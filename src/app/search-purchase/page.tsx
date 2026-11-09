'use client';

import { useState, useEffect } from 'react';
import { loadInvoices, loadInvoicesCloud, updateInvoices, currentBranch, formatDate } from '../../lib/branchData';

export default function SearchPurchasePage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [year, setYear] = useState('All');
  const [supplier, setSupplier] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [part, setPart] = useState('');
  const [brand, setBrand] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [largeImage, setLargeImage] = useState('');

  useEffect(() => {
    loadInvoicesCloud().then(setInvoices);
  }, []);

  const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const yearOf = (date: string) => {
    if (!date) return '';
    const m = String(date).match(/20\d{2}/);
    return m ? m[0] : String(date).slice(0, 4);
  };

  const handleSearch = async () => {
    const fresh = await loadInvoicesCloud();
    setInvoices(fresh);
    const rows: any[] = [];
    const qPart = part.trim().toLowerCase();
    const qBrand = brand.trim().toLowerCase();
    const qSupplier = supplier.trim().toLowerCase();
    const qInv = invoiceNo.trim().toLowerCase();

    fresh.forEach((inv) => {
      const invYear = yearOf(inv.invoiceDate || inv.createdAt || '');
      if (year !== 'All' && invYear && invYear !== year) return;
      if (qSupplier && !String(inv.supplierName || '').toLowerCase().includes(qSupplier)) return;
      if (qInv && !`${inv.invoiceNumber || ''} ${inv.invoiceNo || ''}`.toLowerCase().includes(qInv)) return;

      const lines = inv.lines || [];
      const matching = lines.filter((line: any) => {
        const pn = String(line.partNumber || line.partNo || line.oemPartNumber || '').toLowerCase();
        const bc = String(line.barcode || '').toLowerCase();
        const desc = String(line.description || '').toLowerCase();
        const br = String(line.brand || '').toLowerCase();
        const partOk = !qPart || pn.includes(qPart) || bc.includes(qPart) || desc.includes(qPart);
        const brandOk = !qBrand || br.includes(qBrand) || desc.includes(qBrand);
        return partOk && brandOk;
      });

      if (qPart || qBrand) {
        matching.forEach((line: any) => {
          rows.push({
            invoiceId: inv.id,
            supplierName: inv.supplierName,
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            grandTotal: inv.grandTotal,
            partNumber: line.partNumber || line.partNo,
            brand: line.brand,
            description: line.description,
            qty: line.qty || line.quantity,
            price: line.price || line.costPrice,
            invoiceImage: inv.invoiceImage,
          });
        });
      } else if (qSupplier || qInv) {
        if (!lines.length) {
          rows.push({
            invoiceId: inv.id,
            supplierName: inv.supplierName,
            invoiceNumber: inv.invoiceNumber || inv.invoiceNo,
            invoiceDate: inv.invoiceDate,
            grandTotal: inv.grandTotal,
            partNumber: '',
            brand: '',
            description: '',
            qty: '',
            price: '',
            invoiceImage: inv.invoiceImage,
          });
        }
        lines.forEach((line: any) => {
          rows.push({
            invoiceId: inv.id,
            supplierName: inv.supplierName,
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            grandTotal: inv.grandTotal,
            partNumber: line.partNumber || line.partNo,
            brand: line.brand,
            description: line.description,
            qty: line.qty || line.quantity,
            price: line.price || line.costPrice,
            invoiceImage: inv.invoiceImage,
          });
        });
      }
    });

    setResults(rows.sort((a, b) => String(b.invoiceDate || b.createdAt || b.invoiceId || '').localeCompare(String(a.invoiceDate || a.createdAt || a.invoiceId || ''))));
    setSearched(true);
  };

  const openInvoice = (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId) || loadInvoices().find((i) => i.id === invoiceId);
    if (inv) setViewing(JSON.parse(JSON.stringify(inv)));
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

  const attachImage = (file?: File) => {
    if (!file || !viewing) return;
    const reader = new FileReader();
    reader.onload = () => setViewing({ ...viewing, invoiceImage: reader.result });
    reader.readAsDataURL(file);
  };

  const saveEdit = () => {
    if (!viewing) return;
    const branch = currentBranch();
    const all = loadInvoices(branch);
    const updated = all.map((inv) => (inv.id === viewing.id ? viewing : inv));
    updateInvoices(branch, updated);
    setInvoices(updated);
    setViewing(null);
    alert('Invoice updated');
    handleSearch();
  };

  const deleteInvoice = () => {
    if (!viewing) return;
    const pin = prompt('Enter delete password');
    if (pin !== '12345') return alert('Wrong delete password. Invoice was not deleted.');
    if (!confirm(`Delete invoice ${viewing.invoiceNumber}?`)) return;
    const branch = currentBranch();
    const all = loadInvoices(branch);
    const updated = all.filter((inv) => inv.id !== viewing.id);
    updateInvoices(branch, updated);
    setInvoices(updated);
    setViewing(null);
    alert('Invoice deleted');
    handleSearch();
  };

  const goDashboard = () => {
    const b = currentBranch();
    if (b && b !== 'admin') window.location.href = `/branch/${b}`;
    else if (b === 'admin') window.location.href = '/admin';
    else window.location.href = '/';
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-xl font-bold text-yellow-600">Search Purchase Invoice</h1>
        <button onClick={goDashboard} className="text-sm text-blue-600 hover:underline">← Back to Dashboard</button>
      </div>
      <div className="text-xs text-gray-500 mb-4">This branch only</div>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="flex flex-nowrap items-end gap-2 overflow-x-auto">
          <div>
            <div className="text-xs font-medium text-center mb-1">Year</div>
            <input className="border rounded px-2 py-1 text-center" style={{ width: '8ch' }} placeholder="All" value={year === 'All' ? '' : year} onChange={(e) => setYear(e.target.value || 'All')} />
          </div>
          <div>
            <div className="text-xs font-medium text-center mb-1">Supplier Name</div>
            <input className="border rounded px-2 py-1" style={{ width: '50ch' }} value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </div>
          <div>
            <div className="text-xs font-medium text-center mb-1">Invoice No.</div>
            <input className="border rounded px-2 py-1" style={{ width: '20ch' }} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          </div>
          <div>
            <div className="text-xs font-medium text-center mb-1">Part Number</div>
            <input className="border rounded px-2 py-1" style={{ width: '20ch' }} value={part} onChange={(e) => setPart(e.target.value)} />
          </div>
          <div>
            <div className="text-xs font-medium text-center mb-1">Brand</div>
            <input className="border rounded px-2 py-1" style={{ width: '20ch' }} value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <button onClick={handleSearch} className="bg-blue-700 text-white px-5 py-1.5 rounded-lg">Search</button>
        </div>
      </div>

      {searched && (
        <div className="text-sm text-gray-600 mb-2">
          {results.length} item(s) from {[...new Set(results.map((r) => r.invoiceNumber))].length} invoice(s) — latest to oldest
        </div>
      )}
      {searched && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-teal-500 text-white">
              <tr>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Supplier</th>
                <th className="text-left p-2">Invoice No.</th>
                <th className="text-left p-2">Part Number</th>
                <th className="text-left p-2">Brand</th>
                <th className="text-left p-2">Description</th>
                <th className="text-center p-2">Qty</th>
                <th className="text-right p-2">Price</th>
                <th className="text-right p-2">Invoice Total</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{formatDate(r.invoiceDate)}</td>
                  <td className="p-2">{r.supplierName}</td>
                  <td className="p-2 font-medium">{r.invoiceNumber}</td>
                  <td className="p-2">{r.partNumber || '—'}</td>
                  <td className="p-2">{r.brand || '—'}</td>
                  <td className="p-2">{r.description || '—'}</td>
                  <td className="p-2 text-center">{r.qty ?? '—'}</td>
                  <td className="p-2 text-right">{r.price != null ? money(r.price) : '—'}</td>
                  <td className="p-2 text-right">{money(r.grandTotal)}</td>
                  <td className="p-2 text-center">
                    <button onClick={() => openInvoice(r.invoiceId)} className="text-blue-600 text-xs font-medium">View / Edit</button>
                  </td>
                </tr>
              ))}
              {results.length === 0 && <tr><td colSpan={10} className="p-4 text-center text-gray-400">No purchase invoices found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {largeImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[80] p-4" onClick={() => setLargeImage('')}>
          <img src={largeImage} alt="Invoice large" className="max-w-full max-h-[90vh] rounded bg-white" />
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex gap-4">
              <div className="flex-1">
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
                    <td className="p-1"><input className="w-28 border rounded px-2 py-1" value={line.partNumber || ''} onChange={(e) => updateLine(i, 'partNumber', e.target.value)} /></td>
                    <td className="p-1"><input className="w-full border rounded px-2 py-1" value={line.description || ''} onChange={(e) => updateLine(i, 'description', e.target.value)} /></td>
                    <td className="p-1"><input className="w-24 border rounded px-2 py-1" value={line.brand || ''} onChange={(e) => updateLine(i, 'brand', e.target.value)} /></td>
                    <td className="p-1 text-center"><input type="number" className="w-16 border rounded px-2 py-1 text-center" value={line.qty} onChange={(e) => updateLine(i, 'qty', parseInt(e.target.value) || 0)} /></td>
                    <td className="p-1 text-right"><input type="number" className="w-24 border rounded px-2 py-1 text-right" value={line.price} onChange={(e) => updateLine(i, 'price', parseFloat(e.target.value) || 0)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right font-bold mb-3">Total: ₱{viewing.grandTotal?.toLocaleString()}</div>
            <div className="mb-3">
              <div className="text-sm font-medium mb-1">Invoice Image</div>
              <div className="flex flex-wrap gap-2">
                <label className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm cursor-pointer">
                  Browse File
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => attachImage(e.target.files?.[0])} />
                </label>
                <label className="bg-blue-700 text-white px-3 py-2 rounded-lg text-sm cursor-pointer">
                  Back Camera
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => attachImage(e.target.files?.[0])} />
                </label>
              </div>
              {viewing.invoiceImage && <img src={viewing.invoiceImage} alt="Invoice" className="mt-2 max-h-48 rounded border" />}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setViewing(null)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg">Close</button>
              <button onClick={deleteInvoice} className="flex-1 bg-red-600 text-white py-2 rounded-lg">Delete Invoice</button>
              <button onClick={saveEdit} className="flex-1 bg-green-600 text-white py-2 rounded-lg">Save Changes</button>
            </div>
              </div>
              <div className="w-40 shrink-0">
                <div className="text-sm font-medium mb-2">Invoice Photo</div>
                {viewing.invoiceImage ? (
                  <img src={viewing.invoiceImage} alt="Invoice" className="w-full h-40 object-cover rounded border cursor-pointer" onClick={() => setLargeImage(viewing.invoiceImage)} />
                ) : (
                  <div className="w-full h-40 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-400">No photo</div>
                )}
                <div className="text-xs text-gray-500 mt-1">Click thumbnail to enlarge</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
