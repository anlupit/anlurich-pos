'use client';

import { useState, useEffect, useRef } from 'react';
import { loadProducts, saveProducts, deleteProduct, loadProductsCloud, Product } from '../../lib/products';
import { searchInvoicesCloud } from '../../lib/branchData';

export default function ProductCatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    barcode: '', partNumber: '', oemPartNumber: '', brand: '', name: '',
    description: '', category: '', position: '', carMake: '', carModel: '',
    yearModel: '', costPrice: '', sellingPrice: '', reorderPointQty: '0',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [findPart, setFindPart] = useState('');
  const [findBrand, setFindBrand] = useState('');
  const [findName, setFindName] = useState('');
  const [findDesc, setFindDesc] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([loadProductsCloud(), searchInvoicesCloud({})]).then(([rows, invoices]) => {
      const base = rows.length ? rows : loadProducts();
      const latest = new Map<string, { date: string; net: number; description?: string }>();
      invoices.forEach((inv: any) => {
        const date = String(inv.invoiceDate || inv.createdAt || '');
        (inv.lines || []).forEach((line: any) => {
          const part = String(line.partNumber || '').trim().toLowerCase();
          if (!part) return;
          const net = Number(line.netPrice || line.price || 0);
          const prev = latest.get(part);
          if (!prev || date > prev.date) latest.set(part, { date, net, description: line.description });
        });
      });
      setProducts(base.map((p) => {
        const hit = latest.get(String(p.partNumber || '').trim().toLowerCase());
        if (!hit || !hit.net) return p;
        return { ...p, costPrice: Math.round(hit.net * 100) / 100, description: hit.description || p.description, sellingPrice: Math.ceil((hit.net * 1.5) / 100) * 100 };
      }));
    }).catch(() => setProducts(loadProducts()));
  }, []);

  const saveProduct = async () => {
    if (!form.partNumber.trim() || !form.name.trim()) return alert('Part Number and Name are required');
    const data: Product = {
      id: editingId || Date.now().toString(),
      barcode: form.barcode || undefined,
      partNumber: form.partNumber,
      oemPartNumber: form.oemPartNumber || undefined,
      brand: form.brand || undefined,
      name: form.name,
      description: form.description || undefined,
      category: form.category || undefined,
      position: form.position || undefined,
      carMake: form.carMake || undefined,
      carModel: form.carModel || undefined,
      yearModel: form.yearModel || undefined,
      costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
      sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : undefined,
      bufferOrderQty: form.bufferOrderQty ? parseFloat(form.bufferOrderQty) : 0,
    };
    const updated = editingId
      ? products.map((p) => (p.id === editingId ? data : p))
      : [...products, data];
    const emptyForm = { barcode: '', partNumber: '', oemPartNumber: '', brand: '', name: '', description: '', category: '', position: '', carMake: '', carModel: '', yearModel: '', costPrice: '', sellingPrice: '', bufferOrderQty: '0' };
    setProducts(updated);
    setForm(emptyForm);
    setEditingId(null);
    try {
      await saveProducts(updated);
    } catch {
      alert('Saved on this computer only. Supabase did not save. Check DATABASE_URL.');
    }
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      barcode: p.barcode || '',
      partNumber: p.partNumber,
      oemPartNumber: p.oemPartNumber || '',
      brand: p.brand || '',
      name: p.name,
      description: p.description || '',
      category: p.category || '',
      position: p.position || '',
      carMake: p.carMake || '',
      carModel: p.carModel || '',
      yearModel: p.yearModel || '',
      costPrice: p.costPrice != null ? Number(p.costPrice).toFixed(2) : '',
      sellingPrice: p.sellingPrice != null ? Number(p.sellingPrice).toFixed(2) : '',
      bufferOrderQty: p.bufferOrderQty != null ? String(p.bufferOrderQty) : '0',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeOne = async (id: string) => {
    if (!confirm('Delete this product from the catalog?')) return;
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    setSelected(selected.filter((x) => x !== id));
    try {
      await deleteProduct(id);
      localStorage.setItem('anlurich-products', JSON.stringify(updated));
    } catch { alert('Deleted here, but Supabase did not save.'); }
    if (editingId === id) setEditingId(null);
  };

  const deleteSelected = async () => {
    if (!selected.length) return alert('Select products first');
    if (!confirm(`Delete ${selected.length} selected products?`)) return;
    const updated = products.filter((p) => !selected.includes(p.id));
    setProducts(updated);
    setSelected([]);
    try {
      await Promise.all(selected.map((id) => deleteProduct(id)));
      localStorage.setItem('anlurich-products', JSON.stringify(updated));
    } catch { alert('Deleted here, but Supabase did not save.'); }
  };

  const deleteAll = async () => {
    if (!products.length) return;
    if (!confirm(`Delete ALL ${products.length} products in the catalog? This cannot be undone.`)) return;
    const ids = products.map((p) => p.id);
    setProducts([]);
    setSelected([]);
    try {
      await Promise.all(ids.map((id) => deleteProduct(id)));
      localStorage.setItem('anlurich-products', JSON.stringify([]));
    } catch { alert('Deleted here, but Supabase did not save.'); }
  };

  const handleExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const XLSX = await import('xlsx');
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);
    const num = (row: any, names: string[]) => {
      const keys = Object.keys(row);
      const want = names.map((n) => n.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const key = keys.find((k) => want.includes(k.toLowerCase().replace(/[^a-z0-9]/g, '')));
      if (!key || row[key] == null || row[key] === '') return undefined;
      const n = parseFloat(String(row[key]).replace(/[^0-9.]/g, ''));
      return isNaN(n) ? undefined : Number(n.toFixed(2));
    };
    const text = (row: any, names: string[]) => {
      const keys = Object.keys(row);
      const want = names.map((n) => n.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const key = keys.find((k) => want.includes(k.toLowerCase().replace(/[^a-z0-9]/g, '')));
      return key ? String(row[key] ?? '').trim() : '';
    };
    const newProducts: Product[] = rows.map((r, i) => ({
      id: Date.now().toString() + i,
      partNumber: text(r, ['Part Number', 'partNumber', 'Part No']),
      name: text(r, ['Name', 'Product Name', 'name']),
      barcode: text(r, ['Barcode']) || undefined,
      oemPartNumber: text(r, ['OEM Part Number', 'oemPartNumber']) || undefined,
      brand: text(r, ['Brand']) || undefined,
      description: text(r, ['Description']) || undefined,
      category: text(r, ['Category']) || undefined,
      position: text(r, ['Position']) || undefined,
      carMake: text(r, ['Car Make', 'carMake']) || undefined,
      carModel: text(r, ['Car Model', 'carModel']) || undefined,
      yearModel: text(r, ['Year Model', 'yearModel']) || undefined,
      costPrice: num(r, ['Cost Price', 'Cost', 'costPrice', 'CostPrice']),
      sellingPrice: num(r, ['Selling Price', 'Selling', 'sellingPrice', 'Price']),
    })).filter((p) => p.partNumber && p.name);
    if (newProducts.length === 0) return alert('No valid rows. Need Part Number and Name columns.');
    const replace = confirm('Replace the whole catalog with this file?\n\nOK = replace old products\nCancel = add/update only');
    const merged = replace ? [] : [...products];
    let added = 0;
    let updatedCount = 0;
    newProducts.forEach((incoming) => {
      const part = incoming.partNumber.toLowerCase();
      const barcode = String(incoming.barcode || '').toLowerCase();
      const index = merged.findIndex((p) =>
        p.partNumber.toLowerCase() === part ||
        (barcode && String(p.barcode || '').toLowerCase() === barcode)
      );
      if (index >= 0) {
        merged[index] = { ...merged[index], ...incoming, id: merged[index].id };
        updatedCount += 1;
      } else {
        merged.push(incoming);
        added += 1;
      }
    });
    setProducts(merged);
    try {
      await saveProducts(merged);
      alert(replace ? `Catalog replaced. ${merged.length} products saved.` : `Saved to Supabase. Added ${added}, updated ${updatedCount}.`);
    } catch (err: any) {
      alert(`Saved on this computer only.\n\n${err?.message || 'Check DATABASE_URL in Vercel.'}`);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const downloadTemplate = () => {
    const csv = 'Part Number,Name,Barcode,OEM Part Number,Brand,Description,Category,Position,Car Make,Car Model,Year Model,Cost Price,Selling Price\nBRK-001,Brake Pad Set,123456789,OEM-001,GTX,Front brake pads,Brake System,Front,Toyota,Vios,2014-2020,1200.00,1850.00\nBBF3-20,Brake Fluid,9316068437780,,Bendix,BRAKE FLUID DOT-3 1X12 (900ml),Fluids,,, , ,250.50,400.00';
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'product-catalog-template.csv';
    a.click();
  };

  const unique = (values: (string | undefined)[]) => Array.from(new Set(values.map((v) => String(v || '').trim()).filter(Boolean))).sort();
  const nameSuggestions = unique(products.map((p) => p.name));
  const makeSuggestions = unique([...products.map((p) => p.carMake), 'Toyota', 'Honda', 'Mitsubishi', 'Nissan', 'Hyundai', 'Ford', 'Isuzu', 'Suzuki', 'Mazda', 'Kia']);
  const modelSuggestions = unique(products.map((p) => p.carModel));
  const categorySuggestions = unique([...products.map((p) => p.category), 'Brake System', 'Engine', 'Suspension', 'Electrical', 'Filters', 'Fluids', 'Body Parts', 'Cooling System', 'Transmission', 'Accessories']);
  const filtered = products.filter((p) => {
    const part = findPart.trim().toLowerCase();
    const brand = findBrand.trim().toLowerCase();
    const name = findName.trim().toLowerCase();
    const desc = findDesc.trim().toLowerCase();
    return (!part || String(p.partNumber || '').toLowerCase().includes(part))
      && (!brand || String(p.brand || '').toLowerCase().includes(brand))
      && (!name || String(p.name || '').toLowerCase().includes(name))
      && (!desc || String(p.description || '').toLowerCase().includes(desc) || String(p.name || '').toLowerCase().includes(desc));
  }).sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }) ||
    String(a.brand || '').localeCompare(String(b.brand || ''), undefined, { sensitivity: 'base' })
  );

  return (
    <div className="min-h-screen p-4 overflow-x-hidden">
      <h1 className="text-xl font-bold text-yellow-600 mb-1">Product Catalog</h1>
      <div className="text-xs text-gray-500 mb-4">Shared by all branches</div>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="flex gap-3 mb-3">
          <button onClick={downloadTemplate} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm">Download Template</button>
          <label className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm cursor-pointer">
            Mass Upload (Excel/CSV)
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcel} />
          </label>
          <button onClick={deleteSelected} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm">Delete Selected</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }} onDoubleClick={(e) => e.stopPropagation()}>
          <input className="border rounded px-2 py-1" placeholder="Part Number *" value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} required />
          <input className="border rounded px-2 py-1" placeholder="Product Name *" list="name-suggestions" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="border rounded px-2 py-1" placeholder="Barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }} />
          <input className="border rounded px-2 py-1" placeholder="OEM Part Number" value={form.oemPartNumber} onChange={(e) => setForm({ ...form, oemPartNumber: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Category" list="category-suggestions" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Car Make" list="make-suggestions" value={form.carMake} onChange={(e) => setForm({ ...form, carMake: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Car Model" list="model-suggestions" value={form.carModel} onChange={(e) => setForm({ ...form, carModel: e.target.value })} />
          <input className="border rounded px-2 py-1" placeholder="Year Model" value={form.yearModel} onChange={(e) => setForm({ ...form, yearModel: e.target.value })} />
          <input type="number" step="0.01" className="border rounded px-2 py-1 text-right" placeholder="Cost Price" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} onBlur={() => setForm((f) => ({ ...f, costPrice: f.costPrice ? Number(f.costPrice).toFixed(2) : '' }))} />
          <input type="number" step="0.01" className="border rounded px-2 py-1 text-right" placeholder="Selling Price" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} onBlur={() => setForm((f) => ({ ...f, sellingPrice: f.sellingPrice ? Number(f.sellingPrice).toFixed(2) : '' }))} />
          <input type="number" className="border rounded px-2 py-1" placeholder="Reorder Point Qty" value={form.bufferOrderQty} onChange={(e) => setForm({ ...form, bufferOrderQty: e.target.value })} />
          <button type="button" tabIndex={-1} onClick={saveProduct} className="bg-blue-700 text-white px-4 py-1 rounded-lg">{editingId ? 'Update' : 'Add Product'}</button>
          <datalist id="name-suggestions">{nameSuggestions.map((v) => <option key={v} value={v} />)}</datalist>
          <datalist id="make-suggestions">{makeSuggestions.map((v) => <option key={v} value={v} />)}</datalist>
          <datalist id="model-suggestions">{modelSuggestions.map((v) => <option key={v} value={v} />)}</datalist>
          <datalist id="category-suggestions">{categorySuggestions.map((v) => <option key={v} value={v} />)}</datalist>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <div className="p-3 flex flex-wrap gap-2">
          <input className="border rounded px-3 py-2" placeholder="Search part number, ex. GCT" value={findPart} onChange={(e) => setFindPart(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Search brand" value={findBrand} onChange={(e) => setFindBrand(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Search product name" value={findName} onChange={(e) => setFindName(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Search description" value={findDesc} onChange={(e) => setFindDesc(e.target.value)} />
          <div className="text-sm text-gray-500 self-center">{filtered.length} shown</div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-teal-500 text-white">
            <tr>
              <th className="p-2"><input type="checkbox" checked={filtered.length > 0 && filtered.every((p) => selected.includes(p.id))} onChange={(e) => setSelected(e.target.checked ? Array.from(new Set([...selected, ...filtered.map((p) => p.id)])) : selected.filter((id) => !filtered.some((p) => p.id === id)))} /></th>
              <th className="text-left p-2" style={{ width: '25ch' }}>Part Number</th>
              <th className="text-left p-2" style={{ width: '25ch' }}>Product Name</th>
              <th className="text-left p-2">Brand</th>
              <th className="text-left p-2">Description</th>
              <th className="text-right p-2">Cost</th>
              <th className="text-right p-2">Selling</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2"><input type="checkbox" checked={selected.includes(p.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, p.id] : selected.filter((id) => id !== p.id))} /></td>
                <td className="p-2 font-medium" style={{ width: '25ch' }} title={p.partNumber}>{p.partNumber}</td>
                <td className="p-2" style={{ width: '25ch', maxWidth: '25ch', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.name}>{p.name}</td>
                <td className="p-2">{p.brand || '—'}</td>
                <td className="p-2">{p.description || '—'}</td>
                <td className="p-2 text-right">{p.costPrice != null ? `₱${p.costPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                <td className="p-2 text-right">{p.sellingPrice != null ? `₱${p.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                <td className="p-2 text-right whitespace-nowrap">
                  <button onClick={() => startEdit(p)} className="text-blue-600 text-xs font-medium mr-3">View / Edit</button>
                  <button onClick={() => removeOne(p.id)} className="text-red-600 text-xs font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

}
