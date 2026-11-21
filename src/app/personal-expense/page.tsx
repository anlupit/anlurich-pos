'use client';

import { useEffect, useState } from 'react';

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const KEY = 'anlurich-personal-finance';

export default function PersonalExpensePage() {
  const [allowed, setAllowed] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [paid, setPaid] = useState<string[]>([]);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), category: 'Personal', detail: '', amount: '', kind: 'expense' });
  const [loan, setLoan] = useState({ name: '', lender: '', monthly: '', dueDay: '15', start: new Date().toISOString().slice(0, 10) });

  useEffect(() => {
    const branch = (sessionStorage.getItem('anlurich-auth') || localStorage.getItem('anlurich-branch') || '').toLowerCase();
    if (branch !== 'admin') {
      alert('Personal expense is for Admin only.');
      window.location.href = '/';
      return;
    }
    setAllowed(true);
    fetch(`/api/data?key=${KEY}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((rows) => {
        const row = Array.isArray(rows) ? rows.find((x: any) => x.key === KEY) : null;
        const data = row?.value ? JSON.parse(row.value) : {};
        setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
        setLoans(Array.isArray(data.loans) ? data.loans : []);
        setPaid(Array.isArray(data.paid) ? data.paid : []);
      })
      .catch(() => {});
  }, []);

  const saveAll = async (next: { expenses?: any[]; loans?: any[]; paid?: string[] }) => {
    const data = { expenses: next.expenses || expenses, loans: next.loans || loans, paid: next.paid || paid };
    await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: KEY, value: JSON.stringify(data) }) });
  };

  const addExpense = async () => {
    if (!form.detail.trim() || !form.amount) return alert('Enter the detail and amount.');
    const row = { id: Date.now().toString(), ...form, amount: Number(form.amount) || 0 };
    const next = [row, ...expenses];
    setExpenses(next);
    setForm({ ...form, detail: '', amount: '' });
    await saveAll({ expenses: next });
  };

  const removeExpense = async (id: string) => {
    const next = expenses.filter((e) => e.id !== id);
    setExpenses(next);
    await saveAll({ expenses: next });
  };

  const addLoan = async () => {
    if (!loan.name.trim() || !loan.monthly) return alert('Enter the loan name and monthly payment.');
    const row = { id: Date.now().toString(), ...loan, monthly: Number(loan.monthly) || 0, dueDay: Number(loan.dueDay) || 1 };
    const next = [...loans, row];
    setLoans(next);
    setLoan({ name: '', lender: '', monthly: '', dueDay: '15', start: new Date().toISOString().slice(0, 10) });
    await saveAll({ loans: next });
  };

  const removeLoan = async (id: string) => {
    const next = loans.filter((l) => l.id !== id);
    setLoans(next);
    await saveAll({ loans: next });
  };

  const download = async () => {
    const XLSX = await import('xlsx');
    const data = monthRows.map((e) => ({
      Date: e.date,
      Category: e.category,
      Detail: e.detail,
      Amount: Number(e.amount || 0),
      Type: e.kind === 'payment' ? 'Credit card payment' : 'Expense',
    }));
    const sheet = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Expenses');
    XLSX.writeFile(wb, `personal-expense-${month}.xlsx`);
  };

  const togglePaid = async (key: string) => {
    const next = paid.includes(key) ? paid.filter((x) => x !== key) : [...paid, key];
    setPaid(next);
    await saveAll({ paid: next });
  };

  if (!allowed) return null;
  const monthRows = expenses.filter((e) => String(e.date || '').startsWith(month));
  const cardCharges = monthRows.filter((e) => e.category === 'Credit Card' && e.kind !== 'payment');
  const cardPayments = monthRows.filter((e) => e.kind === 'payment');
  const total = monthRows.filter((e) => e.kind !== 'payment').reduce((n, e) => n + Number(e.amount || 0), 0);
  const cardSpent = cardCharges.reduce((n, e) => n + Number(e.amount || 0), 0);
  const cardPaid = cardPayments.reduce((n, e) => n + Number(e.amount || 0), 0);
  const [year, mon] = month.split('-').map(Number);
  const days = new Date(year, mon, 0).getDate();
  const first = new Date(year, mon - 1, 1).getDay();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <div className="p-4 overflow-x-auto">
      <h1 className="text-2xl font-black text-[#1e3a8a] mb-1">Monthly Personal Expense</h1>
      <p className="text-sm text-gray-500 mb-4">Admin only. Saved in Supabase.</p>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="font-bold mb-2">Add Expense</div>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-sm">Date<input type="date" className="border rounded px-2 py-2 block" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <label className="text-sm">Type
            <select className="border rounded px-2 py-2 block" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value, category: e.target.value === 'payment' ? 'Credit Card' : form.category })}>
              <option value="expense">Expense</option>
              <option value="payment">Pay Credit Card</option>
            </select>
          </label>
          <label className="text-sm">Category
            <select className="border rounded px-2 py-2 block" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {['Personal', 'House', 'Food', 'Transport', 'Utilities', 'Loan', 'Credit Card', 'Other'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-sm">Detail<input className="border rounded px-2 py-2 block" value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} /></label>
          <label className="text-sm">Amount<input className="border rounded px-2 py-2 block w-32" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
          <button onClick={addExpense} className="bg-blue-700 text-white px-4 py-2 rounded-lg font-bold">Add</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <div className="font-bold">Expenses</div>
          <div className="flex gap-2 items-center">
            <input type="month" className="border rounded px-2 py-1" value={month} onChange={(e) => setMonth(e.target.value)} />
            <button onClick={download} className="bg-green-700 text-white px-3 py-1 rounded-lg font-bold">Download Report</button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-100"><tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Category</th><th className="p-2 text-left">Detail</th><th className="p-2 text-right">Amount</th><th></th></tr></thead>
          <tbody>
            {monthRows.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-2">{e.date}</td>
                <td className="p-2">{e.category}{e.kind === 'payment' ? ' payment' : ''}</td>
                <td className="p-2">{e.detail}</td>
                <td className="p-2 text-right">{money(e.amount)}</td>
                <td className="p-2 text-right"><button onClick={() => removeExpense(e.id)} className="text-red-600 font-bold">X</button></td>
              </tr>
            ))}
            {monthRows.length === 0 && <tr><td colSpan={5} className="p-3 text-center text-gray-400">No expense this month</td></tr>}
          </tbody>
        </table>
        <div className="text-right font-black mt-2">Expense total {money(total)}</div>
        <div className="text-right text-sm mt-1">Credit card spent {money(cardSpent)} · Cash paid to card {money(cardPaid)} · Card still unpaid {money(Math.max(0, cardSpent - cardPaid))}</div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="font-bold mb-2">Loan Payment Schedule</div>
        <div className="flex flex-wrap gap-2 items-end mb-3">
          <label className="text-sm">Loan Name<input className="border rounded px-2 py-2 block" value={loan.name} onChange={(e) => setLoan({ ...loan, name: e.target.value })} /></label>
          <label className="text-sm">Lender<input className="border rounded px-2 py-2 block" value={loan.lender} onChange={(e) => setLoan({ ...loan, lender: e.target.value })} /></label>
          <label className="text-sm">Monthly Payment<input className="border rounded px-2 py-2 block w-32" value={loan.monthly} onChange={(e) => setLoan({ ...loan, monthly: e.target.value })} /></label>
          <label className="text-sm">Due Day<input className="border rounded px-2 py-2 block w-20" value={loan.dueDay} onChange={(e) => setLoan({ ...loan, dueDay: e.target.value })} /></label>
          <label className="text-sm">Start<input type="date" className="border rounded px-2 py-2 block" value={loan.start} onChange={(e) => setLoan({ ...loan, start: e.target.value })} /></label>
          <button onClick={addLoan} className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold">Add Loan</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="font-bold">{d}</div>)}
          {cells.map((day, i) => {
            const due = loans.filter((l) => Number(l.dueDay) === day);
            return (
              <div key={i} className={`min-h-16 border rounded p-1 ${due.length ? 'bg-orange-50 border-orange-400' : ''}`}>
                <div className="font-bold">{day || ''}</div>
                {due.map((l) => <div key={l.id} className="text-[10px] text-orange-700">{l.name}</div>)}
              </div>
            );
          })}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-orange-100"><tr><th className="p-2 text-left">Loan</th><th className="p-2 text-left">Lender</th><th className="p-2 text-center">Due Day</th><th className="p-2 text-right">Monthly</th><th className="p-2 text-center">Paid {month}</th><th></th></tr></thead>
          <tbody>
            {loans.map((l) => {
              const key = `${l.id}-${month}`;
              return (
                <tr key={l.id} className="border-t">
                  <td className="p-2">{l.name}</td>
                  <td className="p-2">{l.lender}</td>
                  <td className="p-2 text-center">{l.dueDay}</td>
                  <td className="p-2 text-right">{money(l.monthly)}</td>
                  <td className="p-2 text-center"><input type="checkbox" checked={paid.includes(key)} onChange={() => togglePaid(key)} /></td>
                  <td className="p-2 text-right"><button onClick={() => removeLoan(l.id)} className="text-red-600 font-bold">X</button></td>
                </tr>
              );
            })}
            {loans.length === 0 && <tr><td colSpan={6} className="p-3 text-center text-gray-400">No loans yet</td></tr>}
          </tbody>
        </table>
        <div className="text-right font-black mt-2">Loan payments this month {money(loans.reduce((n, l) => n + Number(l.monthly || 0), 0))}</div>
      </div>
    </div>
  );
}
