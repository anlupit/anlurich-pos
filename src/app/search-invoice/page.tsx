'use client';

import { useState, useEffect } from 'react';
import { loadSales, loadSalesCloud, updateSales, currentBranch, formatDate } from '../../lib/branchData';

function pointsFor(total: number) {
  return Math.floor((total || 0) / 200);
}

export default function SearchInvoicePage() {
  const [sales, setSales] = useState<any[]>([]);
  const [year, setYear] = useState('All');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [contact, setContact] = useState('');
  const [customer, setCustomer] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [logo, setLogo] = useState('');

  useEffect(() => {
    loadSalesCloud().then(setSales);
  }, []);

  const handleSearch = async () => {
    const fresh = await loadSalesCloud();
    setSales(fresh);
    const filtered = fresh.filter((s) => {
      const saleYear = (s.date || s.dateTime || '').slice(0, 4);
      if (year !== 'All' && saleYear && saleYear !== year) return false;
      if (invoiceNo && !String(s.invoiceNo || '').toLowerCase().includes(invoiceNo.toLowerCase())) return false;
      if (contact && !String(s.customerPhone || '').toLowerCase().includes(contact.toLowerCase())) return false;
      if (customer && !String(s.customerName || '').toLowerCase().includes(customer.toLowerCase())) return false;
      return true;
    });
    setResults(filtered.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
    setSearched(true);
  };

  const goDashboard = () => {
    const b = currentBranch();
    if (b && b !== 'admin') window.location.href = `/branch/${b}`;
    else if (b === 'admin') window.location.href = '/admin';
    else window.location.href = '/';
  };

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    if (!editing) return;
    const items = [...(editing.items || [])];
    const item = { ...items[index], [field]: value };
    item.total = (Number(item.qty) || 0) * (Number(item.price) || 0);
    items[index] = item;
    const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.total) || 0), 0);
    const total = Math.max(0, subtotal - (editing.discount || 0));
    setEditing({ ...editing, items, subtotal, total });
  };

  const deleteInvoice = async () => {
    if (!editing) return;
    const pin = prompt('Enter delete password');
    if (pin !== '12345') return alert('Wrong delete password. Invoice was not deleted.');
    if (!confirm(`Delete invoice ${editing.invoiceNo}?`)) return;
    const branch = currentBranch() || 'unknown';
    const all = await loadSalesCloud(branch);
    const updated = all.filter((s: any) => s.id !== editing.id);
    await updateSales(branch, updated);
    setSales(updated);
    setResults((prev) => prev.filter((s) => s.id !== editing.id));
    setEditing(null);
    alert('Invoice deleted');
  };

  const saveEdit = async () => {
    if (!editing) return;
    const branch = currentBranch() || 'unknown';
    const all = await loadSalesCloud(branch);
    const updated = all.map((s: any) => (s.id === editing.id ? editing : s));
    await updateSales(branch, updated);
    setSales(updated);
    setResults((prev) => prev.map((s) => (s.id === editing.id ? editing : s)));
    setEditing(null);
    alert('Invoice updated');
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          {logo ? <img src={logo} alt="Logo" className="w-14 h-14 object-contain" /> : null}
          <h1 className="text-xl md:text-2xl font-black tracking-wide text-[#1e3a8a]">AUTO PARTS INVENTORY SYSTEM</h1>
        </div>
        <div className="text-2xl md:text-4xl font-black text-gray-800">{formatDate(new Date().toISOString().slice(0, 10))}</div>
      </div>
      <div className="border-b-2 border-black mb-3" />
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-2xl font-black text-yellow-600">Search SALES INVOICE</h2>
        <button onClick={goDashboard} className="text-sm text-blue-600 hover:underline">← Back to Dashboard</button>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="flex flex-nowrap items-end gap-2 overflow-x-auto">
          <div>
            <div className="text-xs font-medium text-center mb-1">Year</div>
            <input className="border rounded px-2 py-1 text-center" style={{ width: '8ch' }} placeholder="All" value={year === 'All' ? '' : year} onChange={(e) => setYear(e.target.value || 'All')} onKeyDown={onEnter} />
          </div>
          <div>
            <div className="text-xs font-medium text-center mb-1">Invoice No.</div>
            <input className="border rounded px-2 py-1" style={{ width: '20ch' }} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} onKeyDown={onEnter} />
          </div>
          <div>
            <div className="text-xs font-medium text-center mb-1">Contact No.</div>
            <input className="border rounded px-2 py-1" style={{ width: '20ch' }} value={contact} onChange={(e) => setContact(e.target.value)} onKeyDown={onEnter} />
          </div>
          <div>
            <div className="text-xs font-medium text-center mb-1">Customer Name</div>
            <input className="border rounded px-2 py-1" style={{ width: '50ch' }} value={customer} onChange={(e) => setCustomer(e.target.value)} onKeyDown={onEnter} />
          </div>
          <button onClick={handleSearch} className="bg-blue-700 text-white px-5 py-1.5 rounded-lg">Search</button>
        </div>
      </div>

      {searched && results.length === 0 && (
        <div className="bg-white rounded-xl shadow p-4 text-center text-gray-500">
          No invoices found for this branch. Make sure the sale was saved on this same branch.
        </div>
      )}
      {searched && results.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-teal-500 text-white">
              <tr>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Invoice No.</th>
                <th className="text-left p-2">Customer</th>
                <th className="text-left p-2">Contact</th>
                <th className="text-right p-2">Total</th>
                <th className="text-center p-2">Points</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {results.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{formatDate(s.date)}</td>
                  <td className="p-2 font-medium">{s.invoiceNo}</td>
                  <td className="p-2">{s.customerName || '—'}</td>
                  <td className="p-2">{s.customerPhone || '—'}</td>
                  <td className="p-2 text-right">₱{s.total?.toLocaleString()}</td>
                  <td className="p-2 text-center font-bold text-green-700">{pointsFor(s.total)}</td>
                  <td className="p-2 text-center">
                    <button onClick={() => setEditing(s)} className="text-blue-600 text-xs font-medium">View / Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-3">Invoice {editing.invoiceNo}</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input className="border rounded px-3 py-2" placeholder="Customer Name" value={editing.customerName || ''} onChange={(e) => setEditing({ ...editing, customerName: e.target.value })} />
              <input className="border rounded px-3 py-2" placeholder="Contact" value={editing.customerPhone || ''} onChange={(e) => setEditing({ ...editing, customerPhone: e.target.value })} />
            </div>
            <table className="w-full text-sm mb-3">
              <thead className="bg-gray-100"><tr><th className="text-left p-1">Description</th><th className="text-center p-1">Qty</th><th className="text-right p-1">Price</th><th className="text-right p-1">Total</th></tr></thead>
              <tbody>
                {(editing.items || []).map((item: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="p-1">
                      <input className="w-full border rounded px-2 py-1" value={item.description || ''} onChange={(e) => updateItem(i, 'description', e.target.value)} />
                    </td>
                    <td className="p-1 text-center">
                      <input type="number" min={1} className="w-16 border rounded px-2 py-1 text-center" value={item.qty} onChange={(e) => updateItem(i, 'qty', parseInt(e.target.value) || 1)} />
                    </td>
                    <td className="p-1 text-right">
                      <input className="w-28 border rounded px-2 py-1 text-right" value={Number(item.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} onChange={(e) => updateItem(i, 'price', Math.round((parseFloat(e.target.value.replace(/,/g, '')) || 0) * 100) / 100)} />
                    </td>
                    <td className="p-1 text-right">₱{item.total?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right font-bold mb-1">Total: ₱{Number(editing.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-right font-bold text-green-700 mb-3">Points earned: {pointsFor(editing.total)} (₱200 = 1 point)</div>
            <div className="flex gap-3">
              <button onClick={() => setEditing(null)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg">Close</button>
              <button onClick={deleteInvoice} className="flex-1 bg-red-600 text-white py-2 rounded-lg">Delete Invoice</button>
              <button onClick={saveEdit} className="flex-1 bg-green-600 text-white py-2 rounded-lg">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
