'use client';

import { useEffect, useState } from 'react';
import { currentBranch, formatDate, loadInvoices, loadInvoicesCloud, updateInvoices } from '../../lib/branchData';

const BRANCHES = [
  { id: 'anlurich', name: 'ANLURICH OPC' },
  { id: 'avenders', name: 'Avenders' },
  { id: 'dasma', name: 'Dasma Auto Parts' },
  { id: 'lipa', name: 'Lipa Auto Parts' },
  { id: 'sezan', name: 'Sezan' },
  { id: 'timitsu', name: 'Timitsu' },
];

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
type CheckLine = { id: string; date: string; bank: string; no: string; amount: string };

function nextVoucherNo() {
  const d = new Date();
  const prefix = `${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getFullYear()).slice(-2)}`;
  const used = JSON.parse(localStorage.getItem('anlurich-voucher-nos') || '[]');
  const next = used.filter((n: string) => String(n).startsWith(`${prefix}-`)).reduce((max: number, n: string) => Math.max(max, parseInt(String(n).split('-')[1] || '0', 10) || 0), 0) + 1;
  return `${prefix}-${String(next).padStart(2, '0')}`;
}

export default function CheckVoucherPage() {
  const [branch, setBranch] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [supplier, setSupplier] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [ewtRate, setEwtRate] = useState<Record<string, boolean>>({});
  const [voucherNo, setVoucherNo] = useState('');
  const [checks, setChecks] = useState<CheckLine[]>([{ id: '1', date: new Date().toISOString().slice(0, 10), bank: '', no: '', amount: '' }]);
  const [tab, setTab] = useState<'pay' | 'paid' | 'search'>('pay');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [qSupplier, setQSupplier] = useState('');
  const [qMonth, setQMonth] = useState('');
  const [qYear, setQYear] = useState('');
  const [searched, setSearched] = useState(false);
  const [printVoucher, setPrintVoucher] = useState<any | null>(null);
  const [editingVoucher, setEditingVoucher] = useState<any | null>(null);

  const isAdmin = branch === 'admin';

  useEffect(() => {
    const id = currentBranch();
    if (!id) {
      window.location.href = '/';
      return;
    }
    setBranch(id);
    const load = () => {
      if (id === 'admin') {
        const all = BRANCHES.flatMap((b) => loadInvoices(b.id).map((i) => ({ ...i, branch: i.branch || b.id })));
        setInvoices(all);
      } else {
        setInvoices(loadInvoices(id).map((i) => ({ ...i, branch: id })));
      }
    };
    load();
    setVoucherNo(nextVoucherNo());
    fetch('/api/data', { cache: 'no-store' }).then((res) => res.ok ? res.json() : []).then((rows: any[]) => {
      const schedules = rows.find((r) => r.key === 'anlurich-check-schedules');
      const nos = rows.find((r) => r.key === 'anlurich-voucher-nos');
      if (schedules?.value) setSchedules(JSON.parse(schedules.value));
      if (nos?.value) localStorage.setItem('anlurich-voucher-nos', nos.value);
    }).catch(() => setSchedules(JSON.parse(localStorage.getItem('anlurich-check-schedules') || '[]')));
  }, []);

  const searchUnpaid = async () => {
    if (!supplier.trim()) return alert('Enter supplier name');
    const source = branch === 'admin'
      ? (await Promise.all(BRANCHES.map((b) => loadInvoicesCloud(b.id).catch(() => [])))).flat()
      : await loadInvoicesCloud(branch).catch(() => loadInvoices(branch));
    setInvoices(Array.isArray(source) ? source : []);
    setSelected([]);
    setSearched(true);
  };

  const list = invoices.filter((i) => {
    const paid = String(i.status || '').toLowerCase() === 'paid' || i.paid === true;
    const monthOk = !month || String(i.invoiceDate || i.createdAt || '').startsWith(month);
    const supplierOk = !supplier.trim() || String(i.supplierName || '').toLowerCase().includes(supplier.trim().toLowerCase());
    return (tab === 'paid' ? paid : !paid) && monthOk && supplierOk;
  });

  const chosen = invoices.filter((i) => selected.includes(i.id));
  const gross = chosen.reduce((n, i) => n + Number(i.grandTotal || 0), 0);
  const netOfVat = chosen.reduce((n, i) => n + Number(i.grandTotal || 0) / 1.12, 0);
  const vat = gross - netOfVat;
  const isSales = (i: any) => String(i.invoiceType || '').toLowerCase().includes('sales');
  const ewt = chosen.reduce((n, i) => n + (isSales(i) && ewtRate[i.id] ? (Number(i.grandTotal || 0) / 1.12) * 0.01 : 0), 0);
  const checkAmount = gross - ewt;
  const checksTotal = checks.reduce((n, c) => n + (parseFloat(c.amount) || 0), 0);

  const toggle = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const addCheck = () => setChecks((prev) => [...prev, { id: Date.now().toString(), date: new Date().toISOString().slice(0, 10), bank: '', no: '', amount: '' }]);
  const updateCheck = (id: string, field: keyof CheckLine, value: string) => setChecks((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));

  const recordPayment = () => {
    if (!chosen.length) return alert('Select invoices to pay');
    if (Math.abs(checksTotal - checkAmount) > 0.05) return alert(`Check total must equal ${money(checkAmount)}`);
    const no = voucherNo || nextVoucherNo();
    const byBranch: Record<string, any[]> = {};
    invoices.forEach((inv) => {
      const b = inv.branch || branch;
      if (!byBranch[b]) byBranch[b] = [];
      byBranch[b].push(selected.includes(inv.id) ? { ...inv, status: 'paid', paid: true, paidDate: new Date().toISOString(), checkVoucherNo: no, checks } : inv);
    });
    Object.entries(byBranch).forEach(([b, list]) => updateInvoices(b, list));
    const used = JSON.parse(localStorage.getItem('anlurich-voucher-nos') || '[]');
    localStorage.setItem('anlurich-voucher-nos', JSON.stringify([...used, no]));
    const saved = JSON.parse(localStorage.getItem('anlurich-check-schedules') || '[]');
    const savedVoucher = { id: Date.now().toString(), voucherNo: no, branch, supplier: chosen[0]?.supplierName, invoices: chosen.map((i) => ({ no: i.invoiceNumber || i.invoiceNo, type: i.invoiceType, amount: i.grandTotal, ewt: isSales(i) && ewtRate[i.id] })), gross, netOfVat, vat, ewt, checkAmount, checks, date: new Date().toISOString() };
    const nextSchedules = [savedVoucher, ...saved];
    localStorage.setItem('anlurich-check-schedules', JSON.stringify(nextSchedules));
    setSchedules(nextSchedules);
    setInvoices(Object.values(byBranch).flat());
    setSelected([]);
    setChecks([{ id: Date.now().toString(), date: new Date().toISOString().slice(0, 10), bank: '', no: '', amount: '' }]);
    setVoucherNo(nextVoucherNo());
    setPrintVoucher(savedVoucher);
  };

  const saveSchedules = (next: any[]) => {
    setSchedules(next);
    localStorage.setItem('anlurich-check-schedules', JSON.stringify(next));
    fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'anlurich-check-schedules', value: JSON.stringify(next) }) }).catch(() => {});
  };

  const saveEditedVoucher = () => {
    if (!editingVoucher) return;
    const saved = editingVoucher;
    setEditingVoucher(null);
    setQSupplier('');
    setQYear('');
    setQMonth('');
    saveSchedules(schedules.map((s) => s.id === saved.id ? saved : s));
  };

  const deleteVoucher = () => {
    if (!editingVoucher) return;
    if (!confirm(`Delete voucher ${editingVoucher.voucherNo}?`)) return;
    saveSchedules(schedules.filter((s) => s.id !== editingVoucher.id));
    setEditingVoucher(null);
  };

  const printNow = () => {
    const style = document.createElement('style');
    style.innerHTML = '@media print { @page { size: A5 portrait; margin: 8mm; } .no-print { display: none !important; } }';
    document.head.appendChild(style);
    window.print();
    style.remove();
  };

  const voucherResults = schedules.filter((s) => {
    if (!isAdmin && s.branch !== branch) return false;
    if (qSupplier.trim() && !String(s.supplier || '').toLowerCase().includes(qSupplier.trim().toLowerCase())) return false;
    const d = String(s.date || '');
    if (qYear && !d.startsWith(qYear)) return false;
    if (qMonth && d.slice(5, 7) !== qMonth) return false;
    return true;
  });

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-1">Check Voucher</h1>
      <p className="text-gray-500 mb-4">{isAdmin ? 'All branches' : 'This branch only'}</p>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('pay')} className={`px-4 py-2 rounded ${tab === 'pay' ? 'bg-blue-700 text-white' : 'bg-gray-200'}`}>To Pay</button>
        <button onClick={() => setTab('paid')} className={`px-4 py-2 rounded ${tab === 'paid' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>Paid</button>
        <button onClick={() => setTab('search')} className={`px-4 py-2 rounded ${tab === 'search' ? 'bg-teal-600 text-white' : 'bg-gray-200'}`}>Search Voucher</button>
      </div>
      {tab === 'search' ? (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="flex flex-wrap gap-2 p-2">
            <input className="border rounded px-2 py-1 text-sm" placeholder="Supplier Name" value={qSupplier} onChange={(e) => setQSupplier(e.target.value)} />
            <input className="border rounded px-2 py-1 w-24 text-sm" placeholder="Year" value={qYear} onChange={(e) => setQYear(e.target.value)} />
            <select className="border rounded px-2 py-1 text-sm" value={qMonth} onChange={(e) => setQMonth(e.target.value)}>
              <option value="">Month</option>
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <table className="w-full" style={{ fontSize: '20px' }}>
            <thead className="bg-green-600 text-white">
              <tr>
                {isAdmin && <th className="text-left px-2 py-1">Branch</th>}
                <th className="text-left px-2 py-1">Voucher No.</th>
                <th className="text-left px-2 py-1">Date</th>
                <th className="text-left px-2 py-1">Supplier</th>
                <th className="text-right px-2 py-1">Amount</th>
                <th className="text-right px-2 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {voucherResults.map((s) => (
                <tr key={s.id} className="border-t">
                  {isAdmin && <td className="px-2 py-0.5">{s.branch}</td>}
                  <td className="px-2 py-0.5">{s.voucherNo}</td>
                  <td className="px-2 py-0.5">{formatDate(s.date)}</td>
                  <td className="px-2 py-0.5">{s.supplier}</td>
                  <td className="px-2 py-0.5 text-right">{money(s.checkAmount)}</td>
                  <td className="px-2 py-0.5 text-right"><button onClick={() => setEditingVoucher(s)} className="text-blue-700">View / Edit</button></td>
                </tr>
              ))}
              {voucherResults.length === 0 && <tr><td colSpan={6} className="p-2 text-center text-gray-400">No vouchers found</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
      <>
      <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Supplier Name</label>
          <input className="border rounded px-3 py-2" placeholder="Type supplier name" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Invoice Month</label>
          <input type="month" className="border rounded px-3 py-2" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <button onClick={searchUnpaid} className="bg-blue-700 text-white px-4 py-2 rounded-lg">Search Unpaid</button>
        {tab === 'pay' && <div className="font-bold text-lg">Voucher No. {voucherNo}</div>}
      </div>
      <div className="bg-white rounded-xl shadow overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-blue-700 text-white">
            <tr>
              {tab === 'pay' && <th className="p-2"></th>}
              {isAdmin && <th className="text-left p-2">Branch</th>}
              <th className="text-left p-2">Supplier</th>
              <th className="text-left p-2">Invoice No.</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Date</th>
              <th className="text-right p-2">Amount</th>
              {tab === 'pay' && <th className="text-center p-2">1% EWT</th>}
              {tab === 'paid' && <th className="text-left p-2">Voucher No.</th>}
            </tr>
          </thead>
          <tbody>
            {list.map((inv) => (
              <tr key={inv.id} className="border-t">
                {tab === 'pay' && <td className="p-2 text-center"><input type="checkbox" checked={selected.includes(inv.id)} onChange={() => toggle(inv.id)} /></td>}
                {isAdmin && <td className="p-2">{inv.branch}</td>}
                <td className="p-2">{inv.supplierName}</td>
                <td className="p-2">{inv.invoiceNumber || inv.invoiceNo}</td>
                <td className="p-2">{inv.invoiceType || '—'}</td>
                <td className="p-2">{formatDate(inv.invoiceDate)}</td>
                <td className="p-2 text-right">{money(inv.grandTotal)}</td>
                {tab === 'pay' && <td className="p-2 text-center">{isSales(inv) ? <input type="checkbox" checked={!!ewtRate[inv.id]} onChange={() => setEwtRate((p) => ({ ...p, [inv.id]: !p[inv.id] }))} /> : '—'}</td>}
                {tab === 'paid' && <td className="p-2">{inv.checkVoucherNo || '—'}</td>}
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-gray-400">{searched ? 'No unpaid invoices for this supplier and month' : 'Enter supplier name, pick the month, then Search Unpaid'}</td></tr>}
          </tbody>
        </table>
      </div>
      </>
      )}
      {tab === 'pay' && (
        <>
          <div className="bg-white rounded-xl shadow p-4 mb-4 text-right space-y-1">
            <div>Gross Amount: {money(gross)}</div>
            <div>Net of VAT: {money(netOfVat)}</div>
            <div>12% VAT: {money(vat)}</div>
            <div>1% EWT on Sales Invoice only: {money(ewt)}</div>
            <div className="text-lg font-bold">Grand Total / Check Amount: {money(checkAmount)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="font-semibold mb-2">Check Schedule — Voucher No. {voucherNo}</div>
            {checks.map((c) => (
              <div key={c.id} className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                <input type="date" className="border rounded px-2 py-1" value={c.date} onChange={(e) => updateCheck(c.id, 'date', e.target.value)} />
                <input className="border rounded px-2 py-1" placeholder="Bank" value={c.bank} onChange={(e) => updateCheck(c.id, 'bank', e.target.value)} />
                <input className="border rounded px-2 py-1" placeholder="Check No." value={c.no} onChange={(e) => updateCheck(c.id, 'no', e.target.value)} />
                <input type="number" className="border rounded px-2 py-1 text-right" placeholder="Check Amount" value={c.amount} onChange={(e) => updateCheck(c.id, 'amount', e.target.value)} />
              </div>
            ))}
            <button onClick={addCheck} className="bg-gray-700 text-white px-4 py-2 rounded mr-2">Add Check</button>
            <button onClick={recordPayment} className="bg-blue-700 text-white px-4 py-2 rounded">Record Payment</button>
            <div className="text-right font-bold mt-3">Total Checks Issued: {money(checksTotal)}</div>
          </div>
        </>
      )}
      {editingVoucher && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-lg">
            <h3 className="font-bold text-lg mb-3">Voucher {editingVoucher.voucherNo}</h3>
            <input className="w-full border rounded px-3 py-2 mb-2" value={editingVoucher.supplier || ''} onChange={(e) => setEditingVoucher({ ...editingVoucher, supplier: e.target.value })} />
            <div className="text-sm mb-2">Date: {formatDate(editingVoucher.date)}</div>
            <div className="text-sm">Gross {money(editingVoucher.gross)} · EWT {money(editingVoucher.ewt)} · Check {money(editingVoucher.checkAmount)}</div>
            <div className="font-semibold mt-3 mb-1">Supplier invoices — tick to remove</div>
            {(editingVoucher.invoices || []).map((inv: any, i: number) => (
              <label key={i} className="flex items-center gap-2 text-sm py-1 border-b">
                <input type="checkbox" onChange={() => {
                  const invoices = editingVoucher.invoices.filter((_: any, n: number) => n !== i);
                  const gross = invoices.reduce((n: number, x: any) => n + Number(x.amount || 0), 0);
                  setEditingVoucher({ ...editingVoucher, invoices, gross, checkAmount: gross - Number(editingVoucher.ewt || 0) });
                }} />
                <span className="flex-1">Invoice {inv.no || inv}</span>
                <span>{formatDate(inv.date)}</span>
                <span className="w-28 text-right">{money(inv.amount || 0)}</span>
              </label>
            ))}
            <div className="font-semibold mt-3 mb-1">Checks — tick to remove</div>
            {(editingVoucher.checks || []).map((c: any, i: number) => (
              <div key={c.id || i} className="flex items-center gap-2 mb-2">
                <input type="checkbox" onChange={() => setEditingVoucher({ ...editingVoucher, checks: editingVoucher.checks.filter((_: any, n: number) => n !== i) })} />
                <input className="border rounded px-2 py-1 flex-1" placeholder="Bank" value={c.bank || ''} onChange={(e) => setEditingVoucher({ ...editingVoucher, checks: editingVoucher.checks.map((x: any, n: number) => n === i ? { ...x, bank: e.target.value } : x) })} />
                <input className="border rounded px-2 py-1 w-28" placeholder="Check No." value={c.no || ''} onChange={(e) => setEditingVoucher({ ...editingVoucher, checks: editingVoucher.checks.map((x: any, n: number) => n === i ? { ...x, no: e.target.value } : x) })} />
                <input type="number" className="border rounded px-2 py-1 w-28 text-right" placeholder="Amount" value={c.amount || ''} onChange={(e) => setEditingVoucher({ ...editingVoucher, checks: editingVoucher.checks.map((x: any, n: number) => n === i ? { ...x, amount: e.target.value } : x) })} />
              </div>
            ))}
            {(editingVoucher.checks || []).length === 0 && <div className="text-sm text-gray-400">No check recorded</div>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditingVoucher(null)} className="flex-1 bg-gray-500 text-white py-2 rounded">Close</button>
              <button onClick={deleteVoucher} className="flex-1 bg-red-600 text-white py-2 rounded">Delete</button>
              <button type="button" onClick={saveEditedVoucher} className="flex-1 bg-green-600 text-white py-2 rounded">Save</button>
            </div>
          </div>
        </div>
      )}
      {printVoucher && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-auto p-4">
          <div className="bg-white max-w-[148mm] mx-auto p-4">
            <div className="text-center">
              <img src="/logo.png" alt="Anlurich" className="h-16 mx-auto object-contain" />
              <div className="font-bold">Auto Parts Inventory</div>
              <div className="text-lg font-black mt-1">CHECK VOUCHER</div>
            </div>
            <div className="flex justify-between text-sm mt-3">
              <div>Voucher No. {printVoucher.voucherNo}</div>
              <div>{formatDate(printVoucher.date)}</div>
            </div>
            <div className="text-sm mb-2">Supplier: {printVoucher.supplier}</div>
            <table className="w-full text-sm border-collapse">
              <thead><tr className="border-b"><th className="text-left">Invoice</th><th className="text-left">Type</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {(printVoucher.invoices || []).map((inv: any, i: number) => (
                  <tr key={i} className="border-b"><td>{inv.no}</td><td>{inv.type}</td><td className="text-right">{money(inv.amount)}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="text-right text-sm mt-2">
              <div>Gross: {money(printVoucher.gross)}</div>
              <div>Net of VAT: {money(printVoucher.netOfVat)}</div>
              <div>12% VAT: {money(printVoucher.vat)}</div>
              <div>1% EWT: {money(printVoucher.ewt)}</div>
              <div className="font-bold">Check Amount: {money(printVoucher.checkAmount)}</div>
            </div>
            <div className="text-sm mt-2">
              {(printVoucher.checks || []).map((c: any) => <div key={c.id}>{c.date} · {c.bank} · {c.no} · {money(c.amount)}</div>)}
            </div>
            <div className="flex gap-2 mt-4 no-print">
              <button onClick={() => setPrintVoucher(null)} className="flex-1 bg-gray-500 text-white py-2 rounded">Close</button>
              <button onClick={printNow} className="flex-1 bg-blue-700 text-white py-2 rounded">Print A5</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
