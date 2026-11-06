'use client';

import { useState, useEffect } from 'react';
import { currentBranch, formatDate, loadCorporate, saveCorporate, updateCorporate } from '../../lib/branchData';

type Line = { id: string; description: string; qty: number; unit: string; price: number };

export default function CorporatePage() {
  const [corporateName, setCorporateName] = useState('');
  const [tin, setTin] = useState('');
  const [phone, setPhone] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [payment, setPayment] = useState('Cash');
  const [paid, setPaid] = useState(true);
  const [dateTime, setDateTime] = useState('');
  const [lines, setLines] = useState<Line[]>([{ id: '1', description: '', qty: 1, unit: 'pcs', price: 0 }]);
  const [showUnpaid, setShowUnpaid] = useState(false);
  const [saved, setSaved] = useState<any>(null);

  useEffect(() => {
    setDateTime(formatDate(new Date().toISOString()) + ' ' + new Date().toLocaleTimeString());
    setRecords(loadCorporate());
  }, []);

  const addLine = () => setLines((p) => [...p, { id: Date.now().toString(), description: '', qty: 1, unit: 'pcs', price: 0 }]);
  const removeLine = (id: string) => setLines((p) => p.filter((l) => l.id !== id).length ? p.filter((l) => l.id !== id) : [{ id: Date.now().toString(), description: '', qty: 1, unit: 'pcs', price: 0 }]);
  const subtotal = lines.reduce((n, l) => n + l.qty * l.price, 0);
  const net = Math.round((subtotal / 1.12) * 100) / 100;
  const vat = Math.round((subtotal - net) * 100) / 100;
  const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const save = () => {
    if (!invoiceNo.trim()) return alert('Enter invoice number');
    if (!corporateName.trim()) return alert('Enter corporate name');
    const valid = lines.filter((l) => l.description.trim() && l.qty > 0);
    if (!valid.length) return alert('Add at least one item');
    const sale = {
      id: Date.now().toString(),
      invoiceNo: invoiceNo.trim(),
      corporateName,
      tin,
      phone,
      payment,
      paid,
      date: new Date().toISOString(),
      dateTime,
      branch: currentBranch(),
      lines: valid,
      total: subtotal,
      net,
      vat,
    };
    saveCorporate(sale);
    setRecords(loadCorporate());
    setSaved(sale);
    setCorporateName('');
    setTin('');
    setPhone('');
    setInvoiceNo('');
    setPaid(true);
    setLines([{ id: Date.now().toString(), description: '', qty: 1, unit: 'pcs', price: 0 }]);
  };

  const markPaid = (id: string) => {
    const branch = currentBranch() || 'unknown';
    const updated = records.map((r) => r.id === id ? { ...r, paid: true } : r);
    updateCorporate(branch, updated);
    setRecords(updated);
  };

  const unpaid = records.filter((r) => !r.paid);
  const unpaidTotal = unpaid.reduce((n, r) => n + (Number(r.total) || 0), 0);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-yellow-600">Corporate Sales Invoicing</h1>
      <div className="text-xs text-gray-500 mb-4">This branch only</div>

      <div className="bg-white rounded-xl shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs font-medium">Payment</label>
          <select className="w-full border rounded px-2 py-2" value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option>Cash</option>
            <option>GCash</option>
            <option>Maya</option>
            <option>Credit / Debit Card</option>
            <option>Bank Transfer</option>
            <option>Check</option>
            <option>Credit</option>
          </select>
        </div>
        <div className="md:col-span-4">
          <label className="text-xs font-medium">Corporate Name</label>
          <input className="w-full border rounded px-3 py-2" value={corporateName} onChange={(e) => setCorporateName(e.target.value)} />
          <label className="text-xs font-medium mt-2 block">Contact Number</label>
          <input className="w-full border rounded px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="md:col-span-3">
          <label className="text-xs font-medium">TIN No.</label>
          <input className="w-full border rounded px-3 py-2" value={tin} onChange={(e) => setTin(e.target.value)} />
        </div>
        <div className="md:col-span-3">
          <label className="text-xs font-medium">Invoice No.</label>
          <input className="w-full border rounded px-3 py-2" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          <div className="text-xs mt-2">{dateTime}</div>
          <label className="flex items-center gap-2 mt-2 font-medium">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> PAID
          </label>
          {!paid && <div className="text-red-600 text-sm font-bold">UNPAID</div>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-teal-500 text-white">
            <tr>
              <th className="p-2 text-center">Description</th>
              <th className="p-2 text-center">Qty</th>
              <th className="p-2 text-center">Unit</th>
              <th className="p-2 text-center">Price</th>
              <th className="p-2 text-center">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-1"><input className="border rounded px-2 py-1 w-full" value={l.description} onChange={(e) => setLines(lines.map((x) => x.id === l.id ? { ...x, description: e.target.value } : x))} /></td>
                <td className="p-1"><input type="number" className="border rounded px-2 py-1 w-16 text-center" value={l.qty} onChange={(e) => setLines(lines.map((x) => x.id === l.id ? { ...x, qty: parseInt(e.target.value) || 1 } : x))} /></td>
                <td className="p-1"><input className="border rounded px-2 py-1 w-20" value={l.unit} onChange={(e) => setLines(lines.map((x) => x.id === l.id ? { ...x, unit: e.target.value } : x))} /></td>
                <td className="p-1"><input type="number" className="border rounded px-2 py-1 w-24 text-right" value={l.price || ''} onChange={(e) => setLines(lines.map((x) => x.id === l.id ? { ...x, price: parseFloat(e.target.value) || 0 } : x))} /></td>
                <td className="p-1 text-right">{money(l.qty * l.price)}</td>
                <td><button onClick={() => removeLine(l.id)} className="text-red-600 text-xs">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addLine} className="mt-3 bg-blue-700 text-white px-4 py-2 rounded">+ Add Line</button>
      </div>

      <div className="bg-white rounded-xl shadow p-4 max-w-sm ml-auto">
        <div className="flex justify-between"><span>Net of VAT</span><span>{money(net)}</span></div>
        <div className="flex justify-between"><span>12% VAT</span><span>{money(vat)}</span></div>
        <div className="flex justify-between font-bold text-lg"><span>Grand Total</span><span>{money(subtotal)}</span></div>
        <button onClick={save} className="w-full mt-3 bg-blue-700 text-white py-3 rounded font-bold">Save Corporate Sale</button>
        <button onClick={() => setShowUnpaid(true)} className="w-full mt-2 bg-red-600 text-white py-3 rounded font-bold">Unpaid Clients Summary</button>
      </div>

      {showUnpaid && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-auto p-4">
          <div className="bg-white max-w-4xl mx-auto p-4 rounded">
            <div className="text-center font-bold text-lg">UNPAID CLIENTS</div>
            <div className="text-center text-sm mb-3">{currentBranch()?.toUpperCase()}</div>
            <table className="w-full text-sm">
              <thead className="bg-red-600 text-white">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Invoice No.</th>
                  <th className="p-2 text-left">Corporate Name</th>
                  <th className="p-2 text-left">TIN No.</th>
                  <th className="p-2 text-left">Contact</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {unpaid.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{formatDate(r.date)}</td>
                    <td className="p-2">{r.invoiceNo}</td>
                    <td className="p-2">{r.corporateName}</td>
                    <td className="p-2">{r.tin}</td>
                    <td className="p-2">{r.phone}</td>
                    <td className="p-2 text-right">{money(r.total)}</td>
                    <td className="p-2"><button onClick={() => markPaid(r.id)} className="text-green-700 text-xs">Mark Paid</button></td>
                  </tr>
                ))}
                {unpaid.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-gray-400">No unpaid clients</td></tr>}
              </tbody>
            </table>
            <div className="text-right font-bold mt-3">Unpaid Total: {money(unpaidTotal)}</div>
            <button onClick={() => setShowUnpaid(false)} className="mt-3 bg-gray-600 text-white px-4 py-2 rounded">Close</button>
          </div>
        </div>
      )}
    {saved && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-auto p-4">
          <div id="corp-invoice" className="bg-white max-w-2xl mx-auto p-6 rounded">
            <div className="text-center font-bold text-lg">{(saved.branch || currentBranch() || '').toUpperCase()}</div>
            <div className="text-center font-black text-xl mb-2">INVOICE</div>
            <div className="flex justify-between text-sm mb-2">
              <div><strong>Corporate:</strong> {saved.corporateName}</div>
              <div><strong>No.</strong> {saved.invoiceNo}</div>
              <div>{saved.dateTime}</div>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <div><strong>TIN:</strong> {saved.tin || '—'}</div>
              <div><strong>Contact:</strong> {saved.phone || '—'}</div>
              <div><strong>Payment:</strong> {saved.payment}</div>
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Description</th>
                  <th className="text-center">Qty</th>
                  <th className="text-left">Unit</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {saved.lines.map((l: Line) => (
                  <tr key={l.id} className="border-b">
                    <td className="py-1">{l.description}</td>
                    <td className="text-center">{l.qty}</td>
                    <td>{l.unit}</td>
                    <td className="text-right">{money(l.price)}</td>
                    <td className="text-right">{money(l.qty * l.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right mt-3">
              <div>Net of VAT: {money(saved.net)}</div>
              <div>12% VAT: {money(saved.vat)}</div>
              <div className="font-bold text-lg">GRAND TOTAL: {money(saved.total)}</div>
            </div>
            {saved.payment === 'Credit' && (
              <div className="text-center font-black text-lg mt-4 border-t pt-2">TERMS: STRICTLY 30 DAYS ONLY</div>
            )}
            <div className="flex gap-2 mt-4 print:hidden">
              <button onClick={() => setSaved(null)} className="flex-1 bg-gray-500 text-white py-2 rounded">Close</button>
              <button onClick={() => {
                const style = document.createElement('style');
                style.innerHTML = `@media print { @page { size: A5 portrait; margin: 6mm; } body * { visibility: hidden; } #corp-invoice, #corp-invoice * { visibility: visible; } #corp-invoice { position: absolute; left: 0; top: 0; width: 100%; } }`;
                document.head.appendChild(style);
                setTimeout(() => { window.print(); setTimeout(() => style.remove(), 500); }, 100);
              }} className="flex-1 bg-blue-700 text-white py-2 rounded">Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
