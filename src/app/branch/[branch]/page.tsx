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
  const [searchSupplier, setSearchSupplier] = useState('');
  const [searchPart, setSearchPart] = useState('');
  const [searchDesc, setSearchDesc] = useState('');
  const [searchBarcode, setSearchBarcode] = useState('');
  const [searchBrand, setSearchBrand] = useState('');
  const [invoiceResults, setInvoiceResults] = useState<any[]>([]);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const month = new Date().toISOString().slice(0, 7);
  const year = new Date().getFullYear().toString();

  useEffect(() => {
    if (branchId) localStorage.setItem('anlurich-branch', branchId);
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

  const handleSearch = () => {
    const yearInvoices = invoices.filter((i) => i.invoiceDate?.startsWith(year) || i.createdAt?.startsWith(year));
    if (searchSupplier.trim()) {
      setInvoiceResults(yearInvoices.filter((i) => i.supplierName?.toLowerCase().includes(searchSupplier.trim().toLowerCase())));
    } else {
      setInvoiceResults([]);
    }
    const q = {
      part: searchPart.trim().toLowerCase(),
      desc: searchDesc.trim().toLowerCase(),
      barcode: searchBarcode.trim().toLowerCase(),
      brand: searchBrand.trim().toLowerCase(),
    };
    if (q.part || q.desc || q.barcode || q.brand) {
      const history: any[] = [];
      yearInvoices.forEach((inv) => {
        (inv.lines || []).forEach((line: any) => {
          const ok =
            (!q.part || line.partNumber?.toLowerCase().includes(q.part)) &&
            (!q.desc || line.description?.toLowerCase().includes(q.desc)) &&
            (!q.barcode || line.barcode?.toLowerCase().includes(q.barcode)) &&
            (!q.brand || line.brand?.toLowerCase().includes(q.brand));
          if (ok) {
            history.push({
              supplierName: inv.supplierName,
              invoiceDate: inv.invoiceDate,
              partNumber: line.partNumber,
              brand: line.brand,
              description: line.description,
              qty: line.qty || line.quantity,
              price: line.price || line.costPrice,
            });
          }
        });
      });
      setPriceHistory(history);
    } else {
      setPriceHistory([]);
    }
    setSearched(true);
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
    const updated = invoices.map((inv) => (inv.id === viewing.id ? viewing : inv));
    setInvoices(updated);
    updateInvoices(branchId, updated);
    setInvoiceResults((prev) => prev.map((inv) => (inv.id === viewing.id ? viewing : inv)));
    setViewing(null);
    alert('Invoice updated');
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <svg width="36" height="36" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="#1e3a5f" strokeWidth="2" />
            <circle cx="20" cy="20" r="6" fill="#1e3a5f" />
          </svg>
          <div>
            <div className="text-xl font-bold text-yellow-600">{branchName}</div>
            <div className="text-xs text-gray-500">AUTO PARTS INVENTORY SYSTEM (APIS)</div>
          </div>
        </div>
        <div className="bg-gray-200 rounded-lg px-4 py-2 text-right">
          <div className="text-lg font-bold">₱{monthlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs text-gray-500">Monthly Sales</div>
        </div>
      </div>
      <div className="border-b-2 border-black mb-4" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          <div className="text-sm font-medium mb-2">DATE TODAY: {today}</div>
          <div className="font-semibold mb-2">PRODUCT SEARCH</div>
          <div className="flex flex-wrap gap-2 mb-2">
            <input className="border rounded px-2 py-1 text-sm w-36" placeholder="Supplier Name" value={searchSupplier} onChange={(e) => setSearchSupplier(e.target.value)} />
            <input className="border rounded px-2 py-1 text-sm w-28" placeholder="Part Number" value={searchPart} onChange={(e) => setSearchPart(e.target.value)} />
            <input className="border rounded px-2 py-1 text-sm w-36" placeholder="Description" value={searchDesc} onChange={(e) => setSearchDesc(e.target.value)} />
            <input className="border rounded px-2 py-1 text-sm w-28" placeholder="Brand" value={searchBrand} onChange={(e) => setSearchBrand(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <input className="border rounded px-2 py-1 text-sm w-40" placeholder="Barcode" value={searchBarcode} onChange={(e) => setSearchBarcode(e.target.value)} />
            <button onClick={handleSearch} className="bg-blue-700 text-white px-4 py-1 rounded text-sm">Search</button>
          </div>
        </div>
        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">₱{dailyTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-sm text-gray-500">Daily Sales</div>
        </div>
      </div>

      {searched && (
        <div className="mb-4 space-y-4">
          {invoiceResults.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <div className="font-semibold p-3">Supplier Invoices ({year})</div>
              <table className="w-full text-sm">
                <thead className="bg-teal-500 text-white">
                  <tr>
                    <th className="text-left p-2">Supplier Name</th>
                    <th className="text-left p-2">Invoice Date</th>
                    <th className="text-right p-2">Total Amount</th>
                    <th className="text-center p-2">Status</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceResults.map((inv) => (
                    <tr key={inv.id} className="border-t">
                      <td className="p-2">{inv.supplierName}</td>
                      <td className="p-2">{formatDate(inv.invoiceDate)}</td>
                      <td className="p-2 text-right">₱{inv.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{inv.status || 'unpaid'}</span>
                      </td>
                      <td className="p-2 text-center">
                        <button onClick={() => setViewing(inv)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {priceHistory.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <div className="font-semibold p-3">Purchase Price History ({year})</div>
              <table className="w-full text-sm">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Supplier</th>
                    <th className="text-left p-2">Part Number</th>
                    <th className="text-left p-2">Brand</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-center p-2">Qty</th>
                    <th className="text-right p-2">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {priceHistory.map((h, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{formatDate(h.invoiceDate)}</td>
                      <td className="p-2">{h.supplierName}</td>
                      <td className="p-2">{h.partNumber}</td>
                      <td className="p-2">{h.brand || '—'}</td>
                      <td className="p-2">{h.description}</td>
                      <td className="p-2 text-center">{h.qty}</td>
                      <td className="p-2 text-right">₱{h.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {invoiceResults.length === 0 && priceHistory.length === 0 && <p className="text-gray-500 text-sm">No results for {year}.</p>}
        </div>
      )}

      <div className="font-semibold mb-2">LOW STOCK Items</div>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-teal-500 text-white">
            <tr>
              <th className="text-left p-2">Part Number</th>
              <th className="text-center p-2">Qty</th>
              <th className="text-left p-2">Brand</th>
              <th className="text-left p-2">Product Description</th>
            </tr>
          </thead>
          <tbody>
            {products.filter((p) => (p.quantity ?? 0) <= 5).slice(0, 8).map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2">{p.partNumber}</td>
                <td className="p-2 text-center">{p.quantity ?? 0}</td>
                <td className="p-2">{p.brand || '—'}</td>
                <td className="p-2">{p.description || p.name}</td>
              </tr>
            ))}
            {products.filter((p) => (p.quantity ?? 0) <= 5).length === 0 && (
              <tr><td colSpan={4} className="p-4 text-center text-gray-400">No low stock items</td></tr>
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
                      <input type="number" step="0.01" className="border rounded w-24 text-right" value={line.price || line.costPrice || 0} onChange={(e) => updateViewLine(i, 'price', parseFloat(e.target.value) || 0)} />
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
