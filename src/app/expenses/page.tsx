'use client';

import { useEffect, useState } from 'react';
import { currentBranch } from '../../lib/branchData';

type Expense = {
  id: string;
  date: string;
  category: string;
  payee: string;
  reference: string;
  amount: number;
  vat: number;
  notes: string;
  branch: string;
};

const CATEGORIES = [
  'Utilities - Meralco',
  'Utilities - PLDT',
  'Utilities - Prime Water',
  'Utilities - Internet / Other',
  'Auto Sweep / EasyTrip RFID',
  'Rentals',
  'Office Supplies',
  'Fuel and Oil',
  'Repairs and Maintenance',
  'Transportation and Delivery',
  'Communication',
  'Insurance',
  'Professional Fees',
  'Taxes and Licenses',
  'Representation',
  'Salaries and Wages',
  'Miscellaneous',
];

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function loadExpenses(branch: string): Promise<Expense[]> {
  const key = `anlurich-expenses-${branch}`;
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (res.ok) {
      const rows: { key: string; value: string }[] = await res.json();
      const row = rows.find((r) => r.key === key);
      if (row?.value) {
        localStorage.setItem(key, row.value);
        return JSON.parse(row.value);
      }
    }
  } catch {}
  return JSON.parse(localStorage.getItem(key) || '[]');
}

async function saveExpenses(branch: string, rows: Expense[]) {
  const key = `anlurich-expenses-${branch}`;
  localStorage.setItem(key, JSON.stringify(rows));
  await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value: JSON.stringify(rows) }),
  });
}

export default function ExpensesPage() {
  const [branch, setBranch] = useState('');
  const [rows, setRows] = useState<Expense[]>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: CATEGORIES[0],
    payee: '',
    reference: '',
    amount: '',
    vat: '',
    notes: '',
  });
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    const b = currentBranch() || 'unknown';
    setBranch(b);
    loadExpenses(b).then(setRows);
  }, []);

  const save = async () => {
    if (!form.payee.trim() || !form.amount) return alert('Payee and amount are required');
    const item: Expense = {
      id: editing || Date.now().toString(),
      date: form.date,
      category: form.category,
      payee: form.payee.trim(),
      reference: form.reference.trim(),
      amount: Number(Number(form.amount).toFixed(2)),
      vat: Number(Number(form.vat || 0).toFixed(2)),
      notes: form.notes.trim(),
      branch,
    };
    const next = editing ? rows.map((r) => (r.id === editing ? item : r)) : [item, ...rows];
    setRows(next);
    await saveExpenses(branch, next);
    setEditing(null);
    setForm({ date: new Date().toISOString().slice(0, 10), category: CATEGORIES[0], payee: '', reference: '', amount: '', vat: '', notes: '' });
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    const next = rows.filter((r) => r.id !== id);
    setRows(next);
    await saveExpenses(branch, next);
  };

  const filtered = rows.filter((r) => !year || String(r.date).startsWith(year));
  const total = filtered.reduce((s, r) => s + (r.amount || 0), 0);
  const vatTotal = filtered.reduce((s, r) => s + (r.vat || 0), 0);

  const download = () => {
    const header = 'Date,Category,Payee,Reference,Amount,VAT,Notes';
    const lines = filtered.map((r) => [r.date, r.category, r.payee, r.reference, r.amount.toFixed(2), r.vat.toFixed(2), r.notes].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...lines, `"","","","TOTAL","${total.toFixed(2)}","${vatTotal.toFixed(2)}",""`].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `company-expenses-${branch}-${year || 'all'}.csv`;
    a.click();
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-1">Company Expense</h1>
      <p className="text-xs text-gray-500 mb-4">Private per branch · for BIR expense reports</p>

      <div className="bg-white rounded-xl shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
        <input type="date" className="border rounded px-3 py-2" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <select className="border rounded px-3 py-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input className="border rounded px-3 py-2" placeholder="Payee / Supplier" value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} />
        <input className="border rounded px-3 py-2" placeholder="OR / Invoice No." value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        <input type="number" step="0.01" className="border rounded px-3 py-2" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <input type="number" step="0.01" className="border rounded px-3 py-2" placeholder="VAT amount" value={form.vat} onChange={(e) => setForm({ ...form, vat: e.target.value })} />
        <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button onClick={save} className="bg-blue-700 text-white rounded px-4 py-2">{editing ? 'Update Expense' : 'Save Expense'}</button>
      </div>

      <div className="flex gap-2 mb-3 items-center">
        <input className="border rounded px-3 py-2 w-28" placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} />
        <button onClick={download} className="bg-gray-700 text-white rounded px-4 py-2 text-sm">Download BIR CSV</button>
        <div className="ml-auto text-sm">Total: <b>{money(total)}</b> · VAT: <b>{money(vatTotal)}</b></div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-teal-600 text-white">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Payee</th>
              <th className="p-2 text-left">Reference</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2 text-right">VAT</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.date}</td>
                <td className="p-2">{r.category}</td>
                <td className="p-2">{r.payee}</td>
                <td className="p-2">{r.reference}</td>
                <td className="p-2 text-right">{money(r.amount)}</td>
                <td className="p-2 text-right">{money(r.vat)}</td>
                <td className="p-2 text-right">
                  <button onClick={() => { setEditing(r.id); setForm({ date: r.date, category: r.category, payee: r.payee, reference: r.reference, amount: String(r.amount), vat: String(r.vat), notes: r.notes }); }} className="text-blue-600 mr-2">Edit</button>
                  <button onClick={() => remove(r.id)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
