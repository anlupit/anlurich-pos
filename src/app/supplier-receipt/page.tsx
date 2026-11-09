'use client';

import { useState, useEffect } from 'react';
import { saveInvoice, currentBranch, loadBranchSuppliers, saveBranchSuppliers, adjustStockByItem, syncOnline, loadInvoicesCloud, updateInvoices, stripInvoicePhotos } from '../../lib/branchData';
import { upsertCatalogFromInvoice, loadProductsCloud } from '../../lib/products';

type Supplier = { id: string; name: string; address?: string; tin?: string; contact?: string; phone?: string; email?: string };

type Line = {
  id: string;
  barcode: string;
  brand: string;
  partNumber: string;
  description: string;
  productName: string;
  qty: number;
  unit: string;
  grossPrice: number;
};

export default function SupplierReceiptPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [terms, setTerms] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceType, setInvoiceType] = useState('');
  const [discount1, setDiscount1] = useState('');
  const [discount2, setDiscount2] = useState('');
  const [discount3, setDiscount3] = useState('');
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', address: '', tin: '', contact: '', phone: '', email: '' });
  const [lines, setLines] = useState<Line[]>([
    { id: '1', barcode: '', brand: '', partNumber: '', productName: '', description: '', qty: 1, unit: 'pcs', grossPrice: 0 },
  ]);
  const [catalog, setCatalog] = useState<any[]>([]);

  useEffect(() => {
    syncOnline().then(async () => {
      const saved = loadBranchSuppliers();
      const invoices = await loadInvoicesCloud().catch(() => []);
      const fromInvoices = (invoices || []).map((inv: any) => inv.supplierName).filter(Boolean);
      const names = Array.from(new Map([...saved.map((s) => s.name), ...fromInvoices].filter(Boolean).map((name) => [String(name).toLowerCase(), { id: String(name), name: String(name) }])).values());
      setSuppliers(names.length ? names : saved);
    }).catch(() => setSuppliers(loadBranchSuppliers()));
    loadProductsCloud().then(setCatalog).catch(() => {});
    stripInvoicePhotos().catch(() => {});
  }, []);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { id: Date.now().toString(), barcode: '', brand: '', partNumber: '', productName: '', description: '', qty: 1, unit: 'pcs', grossPrice: 0 },
    ]);
  };

  const removeLine = (id: string) => {
    setLines((prev) => {
      const next = prev.filter((l) => l.id !== id);
      return next.length ? next : [{ id: Date.now().toString(), barcode: '', brand: '', partNumber: '', description: '', qty: 1, unit: 'pcs', grossPrice: 0 }];
    });
  };

  const updateLine = (id: string, field: keyof Line, value: string | number) => {
    setLines((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const next = { ...l, [field]: value };
      if (field === 'barcode') {
        const code = String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
        const product = catalog.find((p) => String(p.barcode || '').replace(/[^a-z0-9]/gi, '').toLowerCase() === code);
        if (product) {
          next.brand = product.brand || '';
          next.partNumber = product.partNumber || '';
          next.productName = product.name || product.productName || '';
          next.description = product.description || product.name || product.productName || '';
        }
      }
      return next;
    }));
  };

  const supplierChoices = suppliers.filter((s) => !supplierName.trim() || s.name.toLowerCase().includes(supplierName.trim().toLowerCase())).slice(0, 10);
  const d1 = parseFloat(discount1) || 0;
  const d2 = parseFloat(discount2) || 0;
  const d3 = parseFloat(discount3) || 0;
  const netPrice = (l: Line) => round2(l.grossPrice * (1 - d1 / 100) * (1 - d2 / 100) * (1 - d3 / 100));
  const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const round2 = (n: number) => Math.round((n || 0) * 100) / 100;
  const lineTotal = (l: Line) => round2(l.qty * netPrice(l));
  const grandTotal = round2(lines.reduce((sum, l) => sum + lineTotal(l), 0));
  const netOfVAT = round2(grandTotal / 1.12);
  const vat = round2(grandTotal - netOfVAT);

  const handleAddSupplier = () => {
    if (!newSupplier.name.trim()) return alert('Supplier name is required');
    const supplier: Supplier = {
      id: Date.now().toString(),
      name: newSupplier.name.trim(),
      address: newSupplier.address.trim(),
      tin: newSupplier.tin.trim() || undefined,
      contact: newSupplier.contact.trim() || undefined,
      phone: newSupplier.phone.trim() || undefined,
      email: newSupplier.email.trim() || undefined,
    };
    const updated = [...suppliers, supplier];
    setSuppliers(updated);
    saveBranchSuppliers(updated);
    setSupplierName(supplier.name);
    setNewSupplier({ name: '', address: '', tin: '', contact: '', phone: '', email: '' });
    setShowAddSupplier(false);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!supplierName.trim()) return alert('Enter supplier name');
    if (!invoiceNumber.trim()) return alert('Enter invoice number');
    setSaving(true);
    if (!invoiceNumber.trim()) return alert('Enter invoice number');
    const valid = lines.filter((l) => l.partNumber.trim() && l.qty > 0);
    if (valid.length === 0) return alert('Add at least one item');

    const branch = currentBranch() || 'unknown';
    const invoice = {
      id: Date.now().toString(),
      branch,
      supplierName,
      invoiceNumber,
      invoiceType,
      invoiceDate,
      terms,
      lines: valid.map((l) => ({ ...l, netPrice: netPrice(l), price: netPrice(l), total: lineTotal(l) })),
      subtotal: grandTotal,
      discount1: d1,
      discount2: d2,
      discount3: d3,
      grandTotal,
      status: 'unpaid',
      createdAt: new Date().toISOString(),
    };
    try {
      await saveInvoice(invoice);
    } catch {
      return alert('Invoice was NOT saved. Supabase is not connected. Check the cloud connection and try again.');
    }
    const catalog = upsertCatalogFromInvoice(invoice.lines);
    const missed: string[] = [];
    valid.forEach((l) => {
      const result = adjustStockByItem({ partNumber: l.partNumber, barcode: l.barcode, qty: l.qty }, Number(l.qty || 0), branch);
      if (!result.ok) missed.push(l.partNumber || l.barcode || 'item');
    });
    if (missed.length) alert(`Invoice saved. Catalog added ${catalog.added}. Stock not added for: ${missed.join(', ')}.`);
    else alert(`Invoice saved to Supabase. Catalog added ${catalog.added} new item(s). Purchased quantity added to this branch stock.`);
    setSaving(false);
    setInvoiceNumber('');
  };

  return (
    <div className="p-2 md:p-4 max-w-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h1 className="text-xl font-bold text-yellow-600">RECORD SUPPLIER INVOICE</h1>
          <div className="text-xs text-gray-500">AUTO PARTS INVENTORY SYSTEM (APIS)</div>
        </div>
        <div className="flex gap-2">
          <div>
            <label className="block text-xs font-medium mb-1 text-center">Discount 1 (%)</label>
            <input type="number" className="border rounded px-2 py-1 text-center w-[10ch]" value={discount1} onChange={(e) => setDiscount1(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-center">Discount 2 (%)</label>
            <input type="number" className="border rounded px-2 py-1 text-center w-[10ch]" value={discount2} onChange={(e) => setDiscount2(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-center">Discount 3 (%)</label>
            <input type="number" className="border rounded px-2 py-1 text-center w-[10ch]" value={discount3} onChange={(e) => setDiscount3(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Header fields */}
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[20ch] flex-1 relative">
            <label className="block text-xs font-medium mb-1 text-left">Supplier Name</label>
            <input className="w-full border rounded px-2 py-1" placeholder="Type to narrow supplier" value={supplierName} onChange={(e) => { setSupplierName(e.target.value); setSupplierOpen(true); }} onFocus={() => setSupplierOpen(true)} onBlur={() => setTimeout(() => setSupplierOpen(false), 150)} />
            {supplierOpen && supplierChoices.length > 0 && (
              <div className="absolute z-20 left-0 right-0 bg-white border rounded shadow mt-1 max-h-40 overflow-auto">
                {supplierChoices.map((s) => (
                  <button type="button" key={s.id} className="block w-full text-left px-2 py-1 hover:bg-blue-50" onMouseDown={() => { setSupplierName(s.name); setSupplierOpen(false); }}>{s.name}</button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-center">Terms</label>
            <select className="border rounded px-2 py-1" style={{ width: '12ch' }} value={terms} onChange={(e) => setTerms(e.target.value)}>
              <option value="">—</option>
              <option>COD</option>
              <option>30 days</option>
              <option>60 days</option>
              <option>90 days</option>
              <option>120 days</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-center">Invoice Date</label>
            <input type="date" className="border rounded px-2 py-1" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-center">Invoice Number</label>
            <input className="border rounded px-2 py-1" style={{ width: '20ch' }} maxLength={20} value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-center">Invoice Type</label>
            <select className="border rounded px-2 py-1" style={{ width: '16ch' }} value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)}>
              <option value="">—</option>
              <option>DR Invoice</option>
              <option>Sales Invoice</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lines */}
      <div className="bg-white rounded-xl shadow p-2 mb-4">
        <table className="w-full text-xs table-fixed">
          <thead className="bg-teal-500 text-white">
            <tr>
              <th className="p-1 text-center" style={{ width: '11%' }}>Barcode</th>
              <th className="p-1 text-center" style={{ width: '35ch' }}>Brand</th>
              <th className="p-1 text-center" style={{ width: '11%' }}>Part Number</th>
              <th className="p-1 text-center" style={{ width: '14%' }}>Product Name</th>
              <th className="p-1 text-center" style={{ width: '22%' }}>Description</th>
              <th className="p-1 text-center" style={{ width: '5%' }}>Qty</th>
              <th className="p-1 text-center" style={{ width: '6%' }}>Unit</th>
              <th className="p-1 text-center" style={{ width: '8%' }}>Gross</th>
              <th className="p-1 text-center" style={{ width: '7%' }}>Net</th>
              <th className="p-1 text-center" style={{ width: '7%' }}>Total</th>
              <th className="p-1" style={{ width: '4%' }}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-t">
                <td className="p-1"><input className="w-full border rounded px-1 py-1" value={line.barcode} onChange={(e) => updateLine(line.id, 'barcode', e.target.value)} /></td>
                <td className="p-1"><input className="border rounded px-1 py-1" style={{ width: '35ch' }} value={line.brand} onChange={(e) => updateLine(line.id, 'brand', e.target.value)} /></td>
                <td className="p-1"><input className="w-full border rounded px-1 py-1" value={line.partNumber} onChange={(e) => updateLine(line.id, 'partNumber', e.target.value)} /></td>
                <td className="p-1"><input className="w-full border rounded px-1 py-1" value={line.productName} onChange={(e) => updateLine(line.id, 'productName', e.target.value)} /></td>
                <td className="p-1"><input className="w-full border rounded px-1 py-1" value={line.description} onChange={(e) => updateLine(line.id, 'description', e.target.value)} /></td>
                <td className="p-1"><input type="number" min={1} className="w-full border rounded px-1 py-1 text-center" value={line.qty} onChange={(e) => updateLine(line.id, 'qty', parseInt(e.target.value) || 1)} /></td>
                <td className="p-1"><input className="w-full border rounded px-1 py-1 text-center" value={line.unit} onChange={(e) => updateLine(line.id, 'unit', e.target.value)} /></td>
                <td className="p-1"><input type="number" min={0} step="0.01" className="w-full border rounded px-1 py-1 text-right" value={line.grossPrice || ''} onChange={(e) => updateLine(line.id, 'grossPrice', parseFloat(e.target.value) || 0)} /></td>
                <td className="p-1 text-center font-medium">{money(netPrice(line))}</td>
                <td className="p-1 text-center font-medium">{money(lineTotal(line))}</td>
                <td className="p-1 text-center">
                  <button type="button" onClick={() => removeLine(line.id)} className="text-red-600 text-xs font-medium">X</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addLine} className="mt-3 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">+ Add Line</button>
      </div>

      {/* Totals + Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between py-2 font-bold text-lg"><span>Grand Total</span><span>{money(grandTotal)}</span></div>
          <div className="flex justify-between py-1 text-sm text-gray-600"><span>Net of VAT</span><span>{money(netOfVAT)}</span></div>
          <div className="flex justify-between py-1 text-sm text-gray-600"><span>12% VAT</span><span>{money(vat)}</span></div>
          <button onClick={handleSave} disabled={saving} className="w-full mt-3 bg-blue-700 text-white py-3 rounded-lg font-bold disabled:opacity-60">{saving ? 'SAVING TO SUPABASE...' : 'SAVE INVOICE'}</button>
        </div>
      </div>

      {/* Add Supplier Modal */}
      {showAddSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-lg">
            <h3 className="font-bold text-lg mb-3">Add Supplier</h3>
            <div className="space-y-2">
              <input className="w-full border rounded px-3 py-2" placeholder="Supplier Name *" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} />
              <input className="w-full border rounded px-3 py-2" placeholder="Address" value={newSupplier.address} onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <input className="border rounded px-3 py-2" maxLength={20} placeholder="TIN No." value={newSupplier.tin} onChange={(e) => setNewSupplier({ ...newSupplier, tin: e.target.value })} />
                <input className="border rounded px-3 py-2" maxLength={20} placeholder="Contact Person" value={newSupplier.contact} onChange={(e) => setNewSupplier({ ...newSupplier, contact: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="border rounded px-3 py-2" maxLength={20} placeholder="Contact Number" value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} />
                <input className="border rounded px-3 py-2" placeholder="Email" value={newSupplier.email} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAddSupplier(false)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg">Cancel</button>
              <button onClick={handleAddSupplier} className="flex-1 bg-green-600 text-white py-2 rounded-lg">Save Supplier</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
