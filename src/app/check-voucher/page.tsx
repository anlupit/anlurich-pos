'use client';

import { useEffect, useState } from 'react';
import { currentBranch, formatDate, loadInvoices, updateInvoices } from '../../lib/branchData';

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
  const [voucherNo, setVoucherNo] = useState('');
  const [checks, setChecks] = useState<CheckLine[]>([{ id: '1', date: new Date().toISOString().slice(0, 10), bank: '', no: '', amount: '' }]);
  const [tab, setTab] = useState<'pay' | 'paid' | 'search'>('pay');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [qSupplier, setQSupplier] = useState('');
  const [qMonth, setQMonth] = useState('');
  const [qYear, setQYear] = useState('');

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

  const list = invoices.filter((i) => {
    const paid = String(i.status || '').toLowerCase() === 'paid' || i.paid === true;
    const monthOk = !month || String(i.invoiceDate || i.createdAt || '').startsWith(month);
    const supplierOk = !supplier.trim() || String(i.supplierName || '').toLowerCase().includes(supplier.trim().toLowerCase());
    return (tab === 'paid' ? paid : !paid) && monthOk && supplierOk;
  });

  const chosen = invoices.filter((i) => selected.includes(i.id));
  const isSales = (i: any) => String(i.invoiceType || '').toLowerCase().includes('sales');
  const siTotal = chosen.filter(isSales).reduce((n, i) => n + Number(i.grandTotal || 0), 0);
  const drTotal = chosen.filter((i) => !isSales(i)).reduce((n, i) => n + Number(i.grandTotal || 0), 0);
  const ewt = (siTotal / 1.12) * 0.01;
  const checkAmount = siTotal - ewt + drTotal;
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
    const nextSchedules = [{ id: Date.now().toString(), voucherNo: no, branch, supplier: chosen[0]?.supplierName, invoices: chosen.map((i) => i.invoiceNumber || i.invoiceNo), siTotal, drTotal, ewt, checkAmount, checks, date: new Date().toISOString() }, ...saved];
    localStorage.setItem('anlurich-check-schedules', JSON.stringify(nextSchedules));
    setSchedules(nextSchedules);
    setInvoices(Object.values(byBranch).flat());
    setSelected([]);
    setChecks([{ id: Date.now().toString(), date: new Date().toISOString().slice(0, 10), bank: '', no: '', amount: '' }]);
    setVoucherNo(nextVoucherNo());
    alert(`Payment recorded. Voucher No. ${no}`);
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
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <input className="border rounded px-3 py-2" placeholder="Supplier Name" value={qSupplier} onChange={(e) => setQSupplier(e.target.value)} />
            <input className="border rounded px-3 py-2 w-24" placeholder="Year" value={qYear} onChange={(e) => setQYear(e.target.value)} />
            <select className="border rounded px-3 py-2" value={qMonth} onChange={(e) => setQMonth(e.target.value)}>
              <option value="">Month</option>
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-teal-500 text-white">
              <tr>
                {isAdmin && <th className="text-left p-2">Branch</th>}
                <th className="text-left p-2">Voucher No.</th>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Supplier</th>
                <th className="text-right p-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {voucherResults.map((s) => (
                <tr key={s.id} className="border-t">
                  {isAdmin && <td className="p-2">{s.branch}</td>}
                  <td className="p-2">{s.voucherNo}</td>
                  <td className="p-2">{formatDate(s.date)}</td>
                  <td className="p-2">{s.supplier}</td>
                  <td className="p-2 text-right">{money(s.checkAmount)}</td>
                </tr>
              ))}
              {voucherResults.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">No vouchers found</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
      <>
      <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Month</label>
          <input type="month" className="border rounded px-3 py-2" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Supplier</label>
          <input className="border rounded px-3 py-2" placeholder="Supplier name" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </div>
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
                {tab === 'paid' && <td className="p-2">{inv.checkVoucherNo || '—'}</td>}
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-gray-400">No invoices</td></tr>}
          </tbody>
        </table>
      </div>
      </>
      )}
      {tab === 'pay' && (
        <>
          <div className="bg-white rounded-xl shadow p-4 mb-4 text-right space-y-1">
            <div>Sales Invoice Total: {money(siTotal)}</div>
            <div>1% EWT (Sales Invoice only): {money(ewt)}</div>
            <div>DR Invoice Total (no EWT): {money(drTotal)}</div>
            <div className="text-lg font-bold">Check Amount: {money(checkAmount)}</div>
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
    </div>
  );
}
