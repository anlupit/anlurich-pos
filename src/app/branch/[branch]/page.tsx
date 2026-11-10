'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { loadProducts, Product } from '../../../lib/products';
import { loadInvoices, updateInvoices, loadSales, loadStock, formatDate, syncOnline } from '../../../lib/branchData';

const BRANCH_NAMES: Record<string, string> = {
  anlurich: 'ANLURICH OPC',
  dasma: 'DASMA AUTO PARTS',
  sezan: 'SEZAN',
  timitsu: 'TIMITSU',
  avenders: 'AVENDERS',
  lipa: 'LIPA AUTO PARTS',
};

export default function BranchDashboard() {
  const params = useParams();
  const branchId = (params?.branch as string) || '';
  const branchName = BRANCH_NAMES[branchId] || branchId.toUpperCase();

  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchMonth, setSearchMonth] = useState('');
  const [searchSupplier, setSearchSupplier] = useState('');
  const [searchInvoiceNo, setSearchInvoiceNo] = useState('');
  const [searchPart, setSearchPart] = useState('');
  const [searchBrand, setSearchBrand] = useState('');
  const [logo, setLogo] = useState('');
  const [invoiceResults, setInvoiceResults] = useState<any[]>([]);
  const [mode, setMode] = useState<'invoice' | 'product'>('invoice');
  const [searched, setSearched] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const month = new Date().toISOString().slice(0, 7);
  const year = new Date().getFullYear().toString();

  useEffect(() => {
    if (branchId) localStorage.setItem('anlurich-branch', branchId);
    setLogo(localStorage.getItem('anlurich-index-logo') || '/logo.png');
    const load = async () => {
      try {
        await syncOnline(branchId);
        setSales(loadSales(branchId));
        const prods = loadProducts();
        const stock = loadStock(branchId);
        setProducts(prods.map((p) => ({ ...p, quantity: stock[p.id]?.qty ?? 0, location: stock[p.id]?.location })));
        setInvoices(loadInvoices(branchId));
      } catch {}
    };
    load();
  }, [branchId]);

  const branchSales = sales.filter((s) => !s.branch || s.branch === branchId);
  const dailyTotal = branchSales.filter((s) => s.date?.startsWith(today)).reduce((sum, s) => sum + (s.total || 0), 0);
  const monthlyTotal = branchSales.filter((s) => s.date?.startsWith(month)).reduce((sum, s) => sum + (s.total || 0), 0);
  const monthInvoices = invoices.filter((i) => String(i.invoiceDate || i.createdAt || '').startsWith(month));
  const totalMonthlyPurchases = monthInvoices.reduce((sum, i) => sum + Number(i.grandTotal || 0), 0);
  const totalDrPurchases = monthInvoices.filter((i) => String(i.invoiceType || '').toLowerCase().includes('dr')).reduce((sum, i) => sum + Number(i.grandTotal || 0), 0);
  const totalSiPurchases = monthInvoices.filter((i) => String(i.invoiceType || '').toLowerCase().includes('sales')).reduce((sum, i) => sum + Number(i.grandTotal || 0), 0);

  const searchInvoices = () => {
    const qSupplier = searchSupplier.trim().toLowerCase();
    const qInv = searchInvoiceNo.trim().toLowerCase();
    const rows = invoices.filter((inv) => {
      const invDate = String(inv.invoiceDate || inv.createdAt || '');
      if (searchMonth && !invDate.startsWith(searchMonth)) return false;
      if (qSupplier && !String(inv.supplierName || '').toLowerCase().includes(qSupplier)) return false;
      if (qInv && !`${inv.invoiceNumber || ''} ${inv.invoiceNo || ''}`.toLowerCase().includes(qInv)) return false;
      return true;
    }).sort((a, b) => String(b.invoiceDate || '').localeCompare(String(a.invoiceDate || '')));
    setInvoiceResults(rows);
    setMode('invoice');
    setSearched(true);
    setSearchMonth('');
    setSearchSupplier('');
    setSearchInvoiceNo('');
  };

  const searchProducts = () => {
    const qPart = searchPart.trim().toLowerCase();
    const qBrand = searchBrand.trim().toLowerCase();
    const rows: any[] = [];
    invoices.forEach((inv) => {
      (inv.lines || []).forEach((line: any) => {
        const pn = String(line.partNumber || line.partNo || '').toLowerCase();
        const br = String(line.brand || '').toLowerCase();
        if ((!qPart || pn.includes(qPart)) && (!qBrand || br.includes(qBrand))) {
          rows.push({ ...line, supplierName: inv.supplierName, invoiceNumber: inv.invoiceNumber, invoiceDate: inv.invoiceDate, invoiceId: inv.id, netAmount: line.netPrice || line.price || line.costPrice });
        }
      });
    });
    setInvoiceResults(rows.sort((a, b) => String(b.invoiceDate || '').localeCompare(String(a.invoiceDate || ''))));
    setMode('product');
    setSearched(true);
    setSearchPart('');
    setSearchBrand('');
  };

  const updateViewLine = (index: number, field: string, value: number) => {
    if (!viewing) return;
    const newLines = [...(viewing.lines || [])];
    newLines[index] = { ...newLines[index], [field]: value };
    const subtotal = newLines.reduce((sum: number, l: any) => sum + (l.qty || l.quantity || 0) * (l.price || l.costPrice || 0), 0);
    const grandTotal = subtotal * (1 - (viewing.discount1 || 0) / 100) * (1 - (viewing.discount2 || 0) / 100);
    setViewing({ ...viewing, lines: newLines, subtotal, grandTotal });
  };

  const saveEditedInvoice = () => {
    if (!viewing) return;
    const current = viewing;
    setViewing(null);
    const updated = invoices.map((inv) => (inv.id === current.id ? current : inv));
    setInvoices(updated);
    updateInvoices(branchId, updated);
    setInvoiceResults((prev) => prev.map((inv) => (inv.id === current.id ? current : inv)));
    alert('Invoice updated');
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          {logo ? <img src={logo} alt="Logo" className="w-14 h-14 object-contain" /> : null}
          <h1 className="text-xl md:text-2xl font-black tracking-wide text-[#1e3a8a]">AUTO PARTS INVENTORY SYSTEM</h1>
        </div>
        <div className="text-2xl md:text-4xl font-black text-gray-800">{formatDate(today)}</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <div className="bg-green-50 rounded-lg px-4 py-2 text-right">
          <div className="text-lg font-bold">₱{dailyTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs text-gray-500">Daily Sales</div>
        </div>
        <div className="bg-gray-100 rounded-lg px-4 py-2 text-right">
          <div className="text-lg font-bold">₱{monthlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs text-gray-500">Monthly Sales</div>
        </div>
        <div className="bg-blue-50 rounded-lg px-4 py-2 text-right">
          <div className="text-lg font-bold">₱{totalDrPurchases.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs text-gray-500">Total DR Purchases</div>
        </div>
        <div className="bg-orange-50 rounded-lg px-4 py-2 text-right">
          <div className="text-lg font-bold">₱{totalSiPurchases.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs text-gray-500">Total Sales Invoice Purchases</div>
        </div>
      </div>
      <div className="border-b-2 border-black mb-3" />

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="flex flex-wrap items-end gap-2 mb-3" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchInvoices(); } }}>
          <div>
            <div className="text-xs font-medium text-center mb-1">Month / Year</div>
            <input type="month" className="border rounded px-2 py-1" value={searchMonth} onChange={(e) => setSearchMonth(e.target.value)} />
          </div>
          <div>
            <div className="text-xs font-medium text-center mb-1">Supplier Name</div>
            <input className="border rounded px-2 py-1" style={{ width: '40ch' }} value={searchSupplier} onChange={(e) => setSearchSupplier(e.target.value)} />
          </div>
          <div>
            <div className="text-xs font-medium text-center mb-1">Invoice No.</div>
            <input className="border rounded px-2 py-1" style={{ width: '20ch' }} value={searchInvoiceNo} onChange={(e) => setSearchInvoiceNo(e.target.value)} />
          </div>
          <button onClick={searchInvoices} className="bg-blue-700 text-white px-5 py-1.5 rounded-lg">Search Invoice</button>
        </div>
        <div className="flex flex-wrap items-end gap-2" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchProducts(); } }}>
          <div>
            <div className="text-xs font-medium text-center mb-1">Part Number</div>
            <input className="border rounded px-2 py-1" style={{ width: '20ch' }} value={searchPart} onChange={(e) => setSearchPart(e.target.value)} />
          </div>
          <div>
            <div className="text-xs font-medium text-center mb-1">Brand</div>
            <input className="border rounded px-2 py-1" style={{ width: '20ch' }} value={searchBrand} onChange={(e) => setSearchBrand(e.target.value)} />
          </div>
          <button onClick={searchProducts} className="bg-teal-600 text-white px-5 py-1.5 rounded-lg">Search Product</button>
        </div>
      </div>

      {searched && mode === 'invoice' && (
        <div className="bg-white rounded-xl shadow overflow-x-auto mb-4">
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
              {invoiceResults.map((inv, i) => (
                <tr key={inv.id || i} className="border-t">
                  <td className="p-2">{formatDate(inv.invoiceDate)}</td>
                  <td className="p-2 font-medium">{inv.invoiceNumber || inv.invoiceNo}</td>
                  <td className="p-2">{inv.supplierName}</td>
                  <td className="p-2 text-right">₱{Number(inv.grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="p-2 text-center">{String(inv.status || 'unpaid').toLowerCase() === 'paid' ? 'Paid' : 'UnPaid'}</td>
                  <td className="p-2 text-center"><button onClick={() => setViewing(inv)} className="text-blue-600 font-medium">View / Edit</button></td>
                </tr>
              ))}
              {invoiceResults.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400">No purchase invoices found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {searched && mode === 'product' && (
        <div className="bg-white rounded-xl shadow overflow-x-auto mb-4">
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
              {invoiceResults.map((h, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{formatDate(h.invoiceDate)}</td>
                  <td className="p-2 font-medium">{h.invoiceNumber}</td>
                  <td className="p-2">{h.supplierName}</td>
                  <td className="p-2">{h.partNumber || '—'}</td>
                  <td className="p-2">{h.brand || '—'}</td>
                  <td className="p-2 text-center">{h.qty || h.quantity || '—'}</td>
                  <td className="p-2 text-right">₱{Number(h.netAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="p-2 text-center"><button onClick={() => setViewing(invoices.find((inv) => inv.id === h.invoiceId))} className="text-blue-600 font-medium">View / Edit</button></td>
                </tr>
              ))}
              {invoiceResults.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-gray-400">No purchase items found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <div className="font-semibold mb-2">LOW STOCK Items</div>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-[18px]">
          <thead className="bg-teal-500 text-white">
            <tr>
              <th className="text-left p-2">Part Number</th>
              <th className="text-center p-2">Qty</th>
              <th className="text-left p-2">Brand</th>
              <th className="text-left p-2">Product Description</th>
            </tr>
          </thead>
          <tbody>
            {products.filter((p) => (p.quantity ?? 0) <= (p.reorderPointQty ?? p.bufferOrderQty ?? 0)).slice(0, 50).map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2">{p.partNumber}</td>
                <td className="p-2 text-center">{p.quantity ?? 0}</td>
                <td className="p-2">{p.brand || '—'}</td>
                <td className="p-2">{p.description || p.name}</td>
              </tr>
            ))}
            {products.filter((p) => (p.quantity ?? 0) <= (p.reorderPointQty ?? p.bufferOrderQty ?? 0)).length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-gray-400">No low stock items</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {viewing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold mb-2">Invoice {viewing.invoiceNumber} — {viewing.supplierName}</h3>
            <table className="w-full text-sm mb-3">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-2">Part No.</th>
                  <th className="text-left p-2">Brand</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-center p-2">Qty</th>
                  <th className="text-right p-2">Price</th>
                </tr>
              </thead>
              <tbody>
                {(viewing.lines || []).map((line: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="p-1">{line.partNumber}</td>
                    <td className="p-1">{line.brand}</td>
                    <td className="p-1">{line.description}</td>
                    <td className="p-1 text-center">
                      <input type="number" className="border rounded w-16 text-center" value={line.qty || line.quantity || 0} onChange={(e) => updateViewLine(i, 'qty', parseInt(e.target.value) || 0)} />
                    </td>
                    <td className="p-1 text-right">
                      <input className="border rounded w-28 text-right" value={Number(line.price || line.costPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} onChange={(e) => updateViewLine(i, 'price', Math.round((parseFloat(e.target.value.replace(/,/g, '')) || 0) * 100) / 100)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right font-bold mb-3">Grand Total: ₱{viewing.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="flex gap-3">
              <button onClick={() => setViewing(null)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg">Close</button>
              <button onClick={saveEditedInvoice} className="flex-1 bg-green-600 text-white py-2 rounded-lg">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
