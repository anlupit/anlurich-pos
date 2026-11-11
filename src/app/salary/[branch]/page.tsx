'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Employee = {
  id: string;
  name: string;
  position: string;
  basicWeekly: number;
  insurance: number;
  active: boolean;
};

type Advance = {
  id: string;
  employeeId: string;
  date: string;
  amount: number;
  balance: number;
  note: string;
};

type Request = {
  id: string;
  employeeId: string;
  date: string;
  amount: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
};

const NAMES: Record<string, string> = {
  anlurich: 'ANLURICH OPC',
  avenders: 'Avenders Auto Parts',
  dasma: 'Dasma Auto Parts',
  lipa: 'Lipa Auto Parts',
  sezan: 'Sezan Baliwag Auto Parts',
  timitsu: 'Timitsu Baliwag Auto Parts',
};

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function lastSaturday(from = new Date()) {
  const d = new Date(from);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 1) % 7));
  return d.toISOString().slice(0, 10);
}

function periodFor(branch: string, from = new Date()) {
  if (branch === 'sezan') {
    const d = new Date(from);
    const day = d.getDate();
    const y = d.getFullYear();
    const m = d.getMonth();
    const end = day <= 15 ? new Date(y, m, 15) : new Date(y, m + 1, 0);
    return { label: day <= 15 ? '15th' : '30th', date: end.toISOString().slice(0, 10), kind: 'Semi-monthly' };
  }
  return { label: 'Saturday', date: lastSaturday(from), kind: 'Weekly' };
}

function sssEmployee(basic: number) {
  const msc = Math.min(35000, Math.max(5000, Math.round(basic * 4.333 / 500) * 500));
  return Math.round(msc * 0.05 * 100) / 100 / 4.333;
}

function philHealthEmployee(basic: number) {
  const monthly = basic * 4.333;
  const base = Math.min(100000, Math.max(10000, monthly));
  return Math.round((base * 0.025 / 4.333) * 100) / 100;
}

function pagibigEmployee(basic: number) {
  const monthly = basic * 4.333;
  const monthlyShare = monthly <= 1500 ? monthly * 0.01 : Math.min(200, monthly * 0.02);
  return Math.round((monthlyShare / 4.333) * 100) / 100;
}

function weeklyTax(taxableWeekly: number) {
  const annual = Math.max(0, taxableWeekly) * 52;
  let tax = 0;
  if (annual <= 250000) tax = 0;
  else if (annual <= 400000) tax = (annual - 250000) * 0.15;
  else if (annual <= 800000) tax = 22500 + (annual - 400000) * 0.2;
  else if (annual <= 2000000) tax = 102500 + (annual - 800000) * 0.25;
  else if (annual <= 8000000) tax = 402500 + (annual - 2000000) * 0.3;
  else tax = 2202500 + (annual - 8000000) * 0.35;
  return Math.round((tax / 52) * 100) / 100;
}

async function loadKey(key: string) {
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (!res.ok) return JSON.parse(localStorage.getItem(key) || '[]');
    const rows: { key: string; value: string }[] = await res.json();
    const row = rows.find((r) => r.key === key);
    if (row?.value) {
      localStorage.setItem(key, row.value);
      return JSON.parse(row.value);
    }
  } catch {}
  return JSON.parse(localStorage.getItem(key) || '[]');
}

async function saveKey(key: string, value: unknown) {
  const text = JSON.stringify(value);
  localStorage.setItem(key, text);
  await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value: text }),
  });
}

export default function BranchSalaryPage() {
  const params = useParams();
  const branch = String(params.branch || '');
  const empKey = `anlurich-employees-${branch}`;
  const advKey = `anlurich-advances-${branch}`;
  const reqKey = `anlurich-ca-requests-${branch}`;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [form, setForm] = useState({ name: '', position: '', basicWeekly: '', insurance: '' });
  const [editing, setEditing] = useState<string | null>(null);
  const [advanceFor, setAdvanceFor] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [payAmount, setPayAmount] = useState<Record<string, string>>({});
  const [slip, setSlip] = useState<any | null>(null);
  const period = periodFor(branch);

  useEffect(() => {
    loadKey(empKey).then((rows) => setEmployees(Array.isArray(rows) ? rows : []));
    loadKey(advKey).then((rows) => setAdvances(Array.isArray(rows) ? rows : []));
    loadKey(reqKey).then((rows) => setRequests(Array.isArray(rows) ? rows : []));
  }, [empKey, advKey, reqKey]);

  const saveEmployee = async () => {
    if (!form.name.trim()) return alert('Employee name is required');
    const data: Employee = {
      id: editing || Date.now().toString(),
      name: form.name.trim(),
      position: form.position.trim(),
      basicWeekly: Number(form.basicWeekly) || 0,
      insurance: Number(form.insurance) || 0,
      active: true,
    };
    const next = editing ? employees.map((e) => (e.id === editing ? data : e)) : [...employees, data];
    setEmployees(next);
    await saveKey(empKey, next);
    setForm({ name: '', position: '', basicWeekly: '', insurance: '' });
    setEditing(null);
  };

  const removeEmployee = async (id: string) => {
    if (!confirm('Delete this employee?')) return;
    const next = employees.filter((e) => e.id !== id);
    setEmployees(next);
    await saveKey(empKey, next);
  };

  const submitRequest = async () => {
    if (!advanceFor || !advanceAmount) return alert('Select employee and amount');
    const item: Request = {
      id: Date.now().toString(),
      employeeId: advanceFor,
      date: new Date().toISOString().slice(0, 10),
      amount: Number(advanceAmount) || 0,
      reason: requestReason.trim() || 'Cash advance',
      status: 'Pending',
    };
    const next = [item, ...requests];
    setRequests(next);
    await saveKey(reqKey, next);
    setAdvanceAmount('');
    setRequestReason('');
  };

  const decideRequest = async (id: string, status: 'Approved' | 'Rejected') => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    const nextReq = requests.map((r) => r.id === id ? { ...r, status } : r);
    setRequests(nextReq);
    await saveKey(reqKey, nextReq);
    if (status === 'Approved') {
      const item: Advance = {
        id: `${id}-ca`,
        employeeId: req.employeeId,
        date: req.date,
        amount: req.amount,
        balance: req.amount,
        note: req.reason,
      };
      const nextAdv = [item, ...advances];
      setAdvances(nextAdv);
      await saveKey(advKey, nextAdv);
    }
  };

  const payAdvance = async (id: string) => {
    const amount = Number(payAmount[id] || 0);
    if (amount <= 0) return;
    const next = advances.map((a) => a.id === id ? { ...a, balance: Math.max(0, a.balance - amount) } : a);
    setAdvances(next);
    await saveKey(advKey, next);
    setPayAmount((p) => ({ ...p, [id]: '' }));
  };

  const payroll = employees.filter((e) => e.active).map((e) => {
    const sss = sssEmployee(e.basicWeekly);
    const ph = philHealthEmployee(e.basicWeekly);
    const pi = pagibigEmployee(e.basicWeekly);
    const ins = e.insurance || 0;
    const taxable = Math.max(0, e.basicWeekly - sss - ph - pi - ins);
    const tax = weeklyTax(taxable);
    const caBalance = advances.filter((a) => a.employeeId === e.id).reduce((s, a) => s + a.balance, 0);
    const caThisWeek = Math.min(caBalance, Number(payAmount[e.id] || caBalance) || 0);
    const net = Math.max(0, e.basicWeekly - sss - ph - pi - ins - tax - caThisWeek);
    return { e, sss, ph, pi, ins, tax, caBalance, caThisWeek, net };
  });

  const gross = payroll.reduce((s, r) => s + r.e.basicWeekly, 0);
  const netTotal = payroll.reduce((s, r) => s + r.net, 0);
  const deductionTotal = payroll.reduce((s, r) => s + r.sss + r.ph + r.pi + r.ins + r.tax, 0);

  const postSalaryExpense = async () => {
    if (!payroll.length) return alert('Add employees first');
    const key = `anlurich-expenses-${branch}`;
    const existing = await loadKey(key);
    const today = new Date().toISOString().slice(0, 10);
    const item = {
      id: `salary-${today}`,
      date: today,
      category: 'Salaries and Wages',
      payee: 'Employee Payroll',
      reference: `WEEKLY-${today}`,
      amount: Number(gross.toFixed(2)),
      vat: 0,
      notes: `Weekly salary summary. Net ${netTotal.toFixed(2)}. Deductions ${deductionTotal.toFixed(2)}.`,
      branch,
    };
    const next = [item, ...existing.filter((r: any) => r.id !== item.id)];
    await saveKey(key, next);
    alert(`Posted ${money(gross)} to Company Expense as Salaries and Wages.`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <button onClick={() => (window.location.href = '/salary')} className="text-sm text-blue-600">← Salary Branches</button>
          <h1 className="text-2xl font-bold">{NAMES[branch] || branch} Salary</h1>
          <p className="text-xs text-gray-500">{period.kind} · pay date {period.date} ({period.label}) · SSS · PhilHealth · Pag-IBIG</p>
        </div>
        <button onClick={postSalaryExpense} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm">Post to Salaries and Wages</button>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <h2 className="font-semibold mb-3">{editing ? 'Update Employee' : 'Add Employee'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input className="border rounded px-3 py-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          <input type="number" step="0.01" className="border rounded px-3 py-2" placeholder="Weekly Basic" value={form.basicWeekly} onChange={(e) => setForm({ ...form, basicWeekly: e.target.value })} />
          <input type="number" step="0.01" className="border rounded px-3 py-2" placeholder="Weekly Insurance" value={form.insurance} onChange={(e) => setForm({ ...form, insurance: e.target.value })} />
          <button onClick={saveEmployee} className="bg-blue-700 text-white rounded px-3 py-2">{editing ? 'Update' : 'Add'}</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-teal-600 text-white">
            <tr>
              <th className="p-2 text-left">Employee</th>
              <th className="p-2 text-right">Basic</th>
              <th className="p-2 text-right">SSS</th>
              <th className="p-2 text-right">PhilHealth</th>
              <th className="p-2 text-right">Pag-IBIG</th>
              <th className="p-2 text-right">Insurance</th>
              <th className="p-2 text-right">Tax</th>
              <th className="p-2 text-right">CA This Pay</th>
              <th className="p-2 text-right">Net Pay</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {payroll.map((r) => (
              <tr key={r.e.id} className="border-t">
                <td className="p-2">{r.e.name}<div className="text-xs text-gray-500">{r.e.position}</div></td>
                <td className="p-2 text-right">{money(r.e.basicWeekly)}</td>
                <td className="p-2 text-right">{money(r.sss)}</td>
                <td className="p-2 text-right">{money(r.ph)}</td>
                <td className="p-2 text-right">{money(r.pi)}</td>
                <td className="p-2 text-right">{money(r.ins)}</td>
                <td className="p-2 text-right">{money(r.tax)}</td>
                <td className="p-2 text-right">{money(r.caThisWeek)}</td>
                <td className="p-2 text-right font-bold">{money(r.net)}</td>
                <td className="p-2 text-right whitespace-nowrap">
                  <button onClick={() => setSlip(r)} className="text-green-700 mr-2">Print / Share</button>
                  <button onClick={() => { setEditing(r.e.id); setForm({ name: r.e.name, position: r.e.position, basicWeekly: String(r.e.basicWeekly), insurance: String(r.e.insurance) }); }} className="text-blue-600 mr-2">Edit</button>
                  <button onClick={() => removeEmployee(r.e.id)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 text-sm text-right">Gross {money(gross)} · Deductions {money(deductionTotal)} · Net {money(netTotal)}</div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <h2 className="font-semibold mb-3">Cash Advance Request</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          <select className="border rounded px-3 py-2" value={advanceFor} onChange={(e) => setAdvanceFor(e.target.value)}>
            <option value="">Select employee</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <input type="number" step="0.01" className="border rounded px-3 py-2" placeholder="Amount" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} />
          <input className="border rounded px-3 py-2 flex-1" placeholder="Reason" value={requestReason} onChange={(e) => setRequestReason(e.target.value)} />
          <button onClick={submitRequest} className="bg-orange-600 text-white rounded px-4 py-2">Submit Request</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Employee</th><th className="p-2 text-left">Reason</th><th className="p-2 text-right">Amount</th><th className="p-2">Status</th><th className="p-2"></th></tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.date}</td>
                <td className="p-2">{employees.find((e) => e.id === r.employeeId)?.name || '—'}</td>
                <td className="p-2">{r.reason}</td>
                <td className="p-2 text-right">{money(r.amount)}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2 text-right">
                  {r.status === 'Pending' && (
                    <>
                      <button onClick={() => decideRequest(r.id, 'Approved')} className="text-green-700 mr-2">Approve</button>
                      <button onClick={() => decideRequest(r.id, 'Rejected')} className="text-red-600">Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && <tr><td colSpan={6} className="p-3 text-center text-gray-400">No requests yet</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <h2 className="font-semibold mb-3">Cash Advance Balances</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Employee</th><th className="p-2 text-right">Amount</th><th className="p-2 text-right">Balance</th><th className="p-2">Partial Payment</th></tr>
          </thead>
          <tbody>
            {advances.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-2">{a.date}</td>
                <td className="p-2">{employees.find((e) => e.id === a.employeeId)?.name || '—'}</td>
                <td className="p-2 text-right">{money(a.amount)}</td>
                <td className="p-2 text-right font-bold">{money(a.balance)}</td>
                <td className="p-2">
                  <div className="flex gap-2 justify-end">
                    <input type="number" step="0.01" className="border rounded px-2 py-1 w-28" placeholder="Pay" value={payAmount[a.id] || ''} onChange={(e) => setPayAmount({ ...payAmount, [a.id]: e.target.value })} />
                    <button onClick={() => payAdvance(a.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs">Apply</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {slip && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div id="salary-slip" className="bg-white rounded-xl p-5 w-full max-w-md">
            <div className="text-center font-black">{NAMES[branch] || branch}</div>
            <div className="text-center text-sm">Salary Slip · {period.kind} · {period.date}</div>
            <div className="font-bold mt-3">{slip.e.name}</div>
            <div className="text-xs text-gray-500">{slip.e.position}</div>
            <table className="w-full text-sm mt-3">
              <tbody>
                <tr><td>Basic Pay</td><td className="text-right">{money(slip.e.basicWeekly)}</td></tr>
                <tr><td>SSS</td><td className="text-right">-{money(slip.sss)}</td></tr>
                <tr><td>PhilHealth</td><td className="text-right">-{money(slip.ph)}</td></tr>
                <tr><td>Pag-IBIG</td><td className="text-right">-{money(slip.pi)}</td></tr>
                <tr><td>Insurance</td><td className="text-right">-{money(slip.ins)}</td></tr>
                <tr><td>Tax</td><td className="text-right">-{money(slip.tax)}</td></tr>
                <tr><td>Cash Advance</td><td className="text-right">-{money(slip.caThisWeek)}</td></tr>
                <tr className="border-t font-black"><td>NET PAY</td><td className="text-right">{money(slip.net)}</td></tr>
              </tbody>
            </table>
            <div className="flex gap-2 mt-4 print:hidden">
              <button onClick={() => setSlip(null)} className="flex-1 bg-gray-500 text-white py-2 rounded">Close</button>
              <button onClick={() => window.print()} className="flex-1 bg-blue-700 text-white py-2 rounded">Print / Screenshot</button>
              <a className="flex-1 bg-green-600 text-white py-2 rounded text-center" href={`mailto:?subject=${encodeURIComponent(`${NAMES[branch]} salary ${period.date} - ${slip.e.name}`)}&body=${encodeURIComponent(`${NAMES[branch]}\nSalary ${period.kind} ${period.date}\n${slip.e.name}\nBasic ${slip.e.basicWeekly}\nSSS ${slip.sss}\nPhilHealth ${slip.ph}\nPag-IBIG ${slip.pi}\nInsurance ${slip.ins}\nTax ${slip.tax}\nCash Advance ${slip.caThisWeek}\nNET ${slip.net}`)}`}>Email</a>
            </div>
            <p className="text-xs text-gray-500 mt-2 print:hidden">Print, then screenshot and send in Messenger. Or use Email.</p>
          </div>
        </div>
      )}
    </div>
  );
}
