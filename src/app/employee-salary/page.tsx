'use client';

import { useEffect, useState } from 'react';
import { currentBranch } from '../../lib/branchData';

const PASSWORDS: Record<string, string> = {
  anlurich: 'Vghie',
  avenders: 'Vghie',
  dasma: 'YLanzano',
  lipa: 'Gengen',
  sezan: 'Mjohn',
};
const NAMES: Record<string, string> = {
  anlurich: 'Anlurich OPC',
  dasma: 'Dasma Auto Parts',
  lipa: 'Lipa Auto Parts',
  sezan: 'Baliwag Auto Parts',
  avenders: 'Avenders',
};

type Employee = {
  id: string;
  branch: string;
  name: string;
  dailyRate: number;
  dailyAllowance: number;
  position: string;
  started: string;
  sssNo: string;
  philhealthNo: string;
  pagibigNo: string;
  sssAmount?: number;
  philhealthAmount?: number;
  pagibigAmount?: number;
  cashAdvanceTotal?: number;
  birthdate: string;
  photo?: string;
  payout: 'weekly' | 'semi';
};

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const monthName = (d: Date) => d.toLocaleString('en-US', { month: 'long' });

function weekHeader(date: string) {
  const d = new Date(`${date}T00:00:00`);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  const start = new Date(monday.getFullYear(), 0, 1);
  const week = Math.ceil((((monday.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
  return `Salary WEEK ${week} ${monthName(monday)} ${monday.getDate()}-${saturday.getDate()} ${monday.getFullYear()}`;
}

function semiHeader(date: string) {
  const d = new Date(`${date}T00:00:00`);
  if (d.getDate() <= 15) return `${monthName(d).slice(0, 3)} 1-15 ${d.getFullYear()}`;
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return `${monthName(d)} 16-${last} ${d.getFullYear()}`;
}

export default function EmployeeSalaryPage() {
  const [branch, setBranch] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState<any>({ name: '', dailyRate: '', dailyAllowance: '', position: '', started: '', sssNo: '', philhealthNo: '', pagibigNo: '', sssAmount: '', philhealthAmount: '', pagibigAmount: '', cashAdvanceTotal: '', birthdate: '', photo: '', payout: 'weekly' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [show13th, setShow13th] = useState(false);
  const [presentDays, setPresentDays] = useState<Record<string, number>>({});
  const [periodDate, setPeriodDate] = useState(new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState<Record<string, number>>({});
  const [advances, setAdvances] = useState<Record<string, number>>({});
  const [extra, setExtra] = useState<Record<string, any>>({});

  useEffect(() => {
    const b = currentBranch() || '';
    setBranch(b);
    if (sessionStorage.getItem(`salary-ok-${b}`) === '1') setUnlocked(true);
  }, []);

  useEffect(() => {
    if (!unlocked || !branch) return;
    fetch(`/api/records?table=employees&branch=${branch}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((rows) => setEmployees(Array.isArray(rows) ? rows.filter((r) => r.name && !String(r.id || '').startsWith('payroll-')) : []))
      .catch(() => {});
  }, [unlocked, branch]);

  const unlock = () => {
    if (pin === PASSWORDS[branch]) {
      sessionStorage.setItem(`salary-ok-${branch}`, '1');
      setUnlocked(true);
    } else alert('Wrong password for this branch.');
  };

  const saveEmployee = async () => {
    if (!form.name.trim()) return alert('Enter employee name');
    const row: Employee = {
      id: editingId || Date.now().toString(),
      branch,
      name: form.name.trim(),
      dailyRate: Number(form.dailyRate || 0),
      dailyAllowance: Number(form.dailyAllowance || 0),
      position: form.position,
      started: form.started,
      sssNo: form.sssNo,
      philhealthNo: form.philhealthNo,
      pagibigNo: form.pagibigNo,
      sssAmount: Number(form.sssAmount || 0),
      philhealthAmount: Number(form.philhealthAmount || 0),
      pagibigAmount: Number(form.pagibigAmount || 0),
      cashAdvanceTotal: Number(form.cashAdvanceTotal || 0),
      birthdate: form.birthdate,
      photo: form.photo,
      payout: form.payout,
    };
    await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'employees', row }) });
    setEmployees((prev) => prev.some((e) => e.id === row.id) ? prev.map((e) => e.id === row.id ? row : e) : [...prev, row]);
    setForm({ name: '', dailyRate: '', dailyAllowance: '', position: '', started: '', sssNo: '', philhealthNo: '', pagibigNo: '', birthdate: '', photo: '', payout: 'weekly' });
    setEditingId(null);
  };

  const onPhoto = (file?: File) => {
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 160 / Math.max(img.width, img.height));
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      setForm((f: any) => ({ ...f, photo: canvas.toDataURL('image/jpeg', 0.7) }));
    };
    img.src = URL.createObjectURL(file);
  };

  const periodEmployees = employees.filter((e) => e.payout === (new Date(`${periodDate}T00:00:00`).getDate() <= 15 || new Date(`${periodDate}T00:00:00`).getDate() > 15 ? e.payout : e.payout));
  const weekly = periodEmployees.filter((e) => e.payout === 'weekly');
  const semi = periodEmployees.filter((e) => e.payout === 'semi');

  const getExtra = (id: string) => extra[id] || { incentive: 0, undertime: 0, overtime: 0, regularHoliday: 0, specialHoliday: 0, halfDays: 0, absent: 0, restDays: 0, sssLoan: 0, pagibigLoan: 0, companyLoan: 0, shortage: 0, uniform: 0, tools: 0 };
  const setOne = (id: string, field: string, value: number) => setExtra((prev) => ({ ...prev, [id]: { ...getExtra(id), [field]: value } }));

  const compute = (e: Employee) => {
    const x = getExtra(e.id);
    const fullDays = Number(days[e.id] ?? (e.payout === 'weekly' ? 6 : 13));
    const halfDays = Number(x.halfDays || 0);
    const worked = fullDays + halfDays * 0.5;
    const rate = Number(e.dailyRate || 0);
    const hourly = (e.rateType === 'monthly' ? rate / 26 : rate) / 8;
    const dayRate = e.rateType === 'monthly' ? rate / 26 : rate;
    const base = e.rateType === 'monthly' ? (e.payout === 'weekly' ? rate / 4 : rate / 2) : dayRate * worked;
    const undertimePay = hourly * Number(x.undertime || 0);
    const overtimePay = hourly * 1.25 * Number(x.overtime || 0);
    const restDayPay = dayRate * 0.3 * Number(x.restDays || 0);
    const regularHolidayPay = dayRate * 0.3 * Number(x.regularHoliday || 0);
    const specialHolidayPay = dayRate * Number(x.specialHoliday || 0);
    const gross = base + Number(e.dailyAllowance || 0) * worked + Number(x.incentive || 0) + overtimePay + restDayPay + regularHolidayPay + specialHolidayPay;
    const advance = Math.min(Number(advances[e.id] || 0), Number(e.cashAdvanceTotal || advances[e.id] || 0) || Number(advances[e.id] || 0));
    const totalAdvance = Number(e.cashAdvanceTotal || advance);
    const remaining = Math.max(0, totalAdvance - advance);
    const sss = Number(e.sssAmount || 0);
    const phil = Number(e.philhealthAmount || 0);
    const pagibig = Number(e.pagibigAmount || 0);
    const other = Number(x.sssLoan || 0) + Number(x.pagibigLoan || 0) + Number(x.companyLoan || 0) + Number(x.shortage || 0) + Number(x.uniform || 0) + Number(x.tools || 0);
    return { worked, halfDays, absent: Number(x.absent || 0), gross, advance, totalAdvance, remaining, sss, phil, pagibig, undertimePay, overtimePay, restDayPay, regularHolidayPay, specialHolidayPay, incentive: Number(x.incentive || 0), other, net: gross - undertimePay - advance - sss - phil - pagibig - other };
  };

  const savePayroll = async () => {
    const rows = employees.map((e) => ({ id: e.id, name: e.name, payout: e.payout, ...compute(e) }));
    await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'employees', row: { id: `payroll-${branch}-${periodDate}`, branch, name: `Payroll ${periodDate}`, data: { periodDate, rows }, updatedAt: new Date().toISOString() } }) });
    alert('Salary period saved.');
  };

  const postExpense = async () => {
    const total = employees.reduce((n, e) => n + compute(e).net, 0);
    await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'expenses', row: { id: `salary-${branch}-${periodDate}`, branch, date: periodDate, category: 'Salaries and Wages', payee: 'Employees', amount: total, note: `Salary ${periodDate}` } }) });
    alert(`Posted ${money(total)} to Company Expense.`);
  };

  const printSlip = (e: Employee) => {
    const c = compute(e);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><body style="font-family:Arial;width:420px"><h2>${e.name}</h2><div>${e.payout === 'weekly' ? weekHeader(periodDate) : semiHeader(periodDate)}</div><p>Days ${c.worked} · Half days ${c.halfDays} · Absent ${c.absent}</p><p>Gross ${money(c.gross)}</p><p>Undertime ${money(c.undertimePay)} · OT ${money(c.overtimePay)} · Rest day ${money(c.restDayPay)}</p><p>SSS ${money(c.sss)} · PhilHealth ${money(c.phil)} · PAGIBIG ${money(c.pagibig)}</p><p>Loans and other ${money(c.other)} · Advance ${money(c.advance)}</p><h3>Net ${money(c.net)}</h3><p>Remaining cash advance ${money(c.remaining)}</p></body></html>`);
    w.print();
  };

  if (!unlocked) {
    return (
      <div className="p-6 max-w-md">
        <h1 className="text-xl font-bold mb-2">Create Employee Salary</h1>
        <p className="text-sm text-gray-500 mb-4">{NAMES[branch] || branch} — enter the branch password</p>
        <input type="password" className="border rounded px-3 py-2 w-full mb-3" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') unlock(); }} />
        <button onClick={unlock} className="bg-blue-700 text-white px-4 py-2 rounded">Open</button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-yellow-600 mb-1">Create Employee Salary</h1>
      <div className="text-xs text-gray-500 mb-4">{NAMES[branch] || branch}</div>

      <div className="bg-white rounded-xl shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-2">
        <input className="border rounded px-2 py-1" placeholder="Employee name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="border rounded px-2 py-1" placeholder="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
        <select className="border rounded px-2 py-1" value={form.rateType || 'daily'} onChange={(e) => setForm({ ...form, rateType: e.target.value })}>
          <option value="daily">Daily wager</option>
          <option value="monthly">Monthly rate</option>
        </select>
        <input type="number" className="border rounded px-2 py-1" placeholder={form.rateType === 'monthly' ? 'Monthly Rate' : 'Daily Rate'} value={form.dailyRate} onChange={(e) => setForm({ ...form, dailyRate: e.target.value })} />
        <input type="number" className="border rounded px-2 py-1" placeholder="Daily Allowance" value={form.dailyAllowance} onChange={(e) => setForm({ ...form, dailyAllowance: e.target.value })} />
        <div><label className="text-xs">Started</label><input type="date" className="border rounded px-2 py-1 w-full" value={form.started} onChange={(e) => setForm({ ...form, started: e.target.value })} /></div>
        <div><label className="text-xs">Birthdate</label><input type="date" className="border rounded px-2 py-1 w-full" value={form.birthdate} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <input className="border rounded px-2 py-1" placeholder="SSS No." value={form.sssNo} onChange={(e) => setForm({ ...form, sssNo: e.target.value })} />
          <input type="number" className="border rounded px-2 py-1" placeholder="SSS deduction" value={form.sssAmount} onChange={(e) => setForm({ ...form, sssAmount: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input className="border rounded px-2 py-1" placeholder="PhilHealth No." value={form.philhealthNo} onChange={(e) => setForm({ ...form, philhealthNo: e.target.value })} />
          <input type="number" className="border rounded px-2 py-1" placeholder="PhilHealth deduction" value={form.philhealthAmount} onChange={(e) => setForm({ ...form, philhealthAmount: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input className="border rounded px-2 py-1" placeholder="PAGIBIG No." value={form.pagibigNo} onChange={(e) => setForm({ ...form, pagibigNo: e.target.value })} />
          <input type="number" className="border rounded px-2 py-1" placeholder="PAGIBIG deduction" value={form.pagibigAmount} onChange={(e) => setForm({ ...form, pagibigAmount: e.target.value })} />
        </div>
        <input type="number" className="border rounded px-2 py-1" placeholder="Cash Advance Total" value={form.cashAdvanceTotal} onChange={(e) => setForm({ ...form, cashAdvanceTotal: e.target.value })} />
        <select className="border rounded px-2 py-1" value={form.payout} onChange={(e) => setForm({ ...form, payout: e.target.value })}>
          <option value="weekly">Weekly — Monday to Saturday</option>
          <option value="semi">15th and 30th</option>
        </select>
        <input type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0])} />
        {form.photo && <img src={form.photo} alt="" className="h-12 w-12 object-cover rounded" />}
        <button onClick={saveEmployee} className="bg-blue-700 text-white rounded px-3 py-2">{editingId ? 'Update Employee' : 'Add Employee'}</button>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Salary period date</label>
        <input type="date" className="border rounded px-2 py-1" value={periodDate} onChange={(e) => setPeriodDate(e.target.value)} />
        <button onClick={() => setShow13th((v) => !v)} className="bg-green-700 text-white px-4 py-2 rounded">13th Month Computation</button>
        <button onClick={savePayroll} className="bg-blue-700 text-white px-4 py-2 rounded">Save this salary</button>
        <button onClick={postExpense} className="bg-orange-600 text-white px-4 py-2 rounded">Post to Company Expense</button>
      </div>

      {show13th && (
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <h2 className="font-bold text-lg mb-1">13th Month Pay</h2>
          <p className="text-xs text-gray-500 mb-3">Total present days × daily rate ÷ 12. A half day is 4 hours, or 0.5 day.</p>
          {employees.map((e) => {
            const daysPresent = Number(presentDays[e.id] || 0);
            const thirteenth = (Number(e.dailyRate || 0) * daysPresent) / 12;
            return (
              <div key={e.id} className="border rounded p-3 mb-2">
                <div className="font-bold">{e.name}</div>
                <label className="text-sm">Present days <input className="border rounded w-24 text-center ml-1" value={presentDays[e.id] || ''} onChange={(ev) => setPresentDays({ ...presentDays, [e.id]: parseFloat(ev.target.value) || 0 })} placeholder="0.5 = half day" /></label>
                <div className="mt-1">Daily rate {money(e.dailyRate)} × {daysPresent} days ÷ 12 = <b>{money(thirteenth)}</b></div>
              </div>
            );
          })}
        </div>
      )}

      {weekly.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <h2 className="font-bold text-lg mb-3">{weekHeader(periodDate)}</h2>
          {weekly.map((e) => {
            const c = compute(e);
            return (
              <div key={e.id} className="border rounded p-3 mb-2 flex gap-3">
                {e.photo && <img src={e.photo} alt="" className="h-14 w-14 object-cover rounded" />}
                <div className="flex-1">
                  <div className="font-bold">{e.name} · {e.position}</div>
                  <div className="text-xs text-gray-500">SSS {e.sssNo || '—'} · PhilHealth {e.philhealthNo || '—'} · PAGIBIG {e.pagibigNo || '—'}</div>
                  <div className="flex flex-wrap gap-2 mt-2 text-sm">
                    <label>Days <input className="border rounded w-16 text-center" value={days[e.id] ?? 6} onChange={(ev) => setDays({ ...days, [e.id]: parseInt(ev.target.value) || 0 })} /></label>
                    <label>Half days <input className="border rounded w-16 text-center" value={getExtra(e.id).halfDays || ''} onChange={(ev) => setOne(e.id, 'halfDays', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Absent <input className="border rounded w-16 text-center" value={getExtra(e.id).absent || ''} onChange={(ev) => setOne(e.id, 'absent', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Rest days worked <input className="border rounded w-16 text-center" value={getExtra(e.id).restDays || ''} onChange={(ev) => setOne(e.id, 'restDays', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Weekly Incentive <input className="border rounded w-24 text-right" value={getExtra(e.id).incentive || ''} onChange={(ev) => setOne(e.id, 'incentive', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Undertime hrs <input className="border rounded w-16 text-center" value={getExtra(e.id).undertime || ''} onChange={(ev) => setOne(e.id, 'undertime', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Overtime hrs <input className="border rounded w-16 text-center" value={getExtra(e.id).overtime || ''} onChange={(ev) => setOne(e.id, 'overtime', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Regular holiday <input className="border rounded w-16 text-center" value={getExtra(e.id).regularHoliday || ''} onChange={(ev) => setOne(e.id, 'regularHoliday', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Special holiday <input className="border rounded w-16 text-center" value={getExtra(e.id).specialHoliday || ''} onChange={(ev) => setOne(e.id, 'specialHoliday', parseFloat(ev.target.value) || 0)} /></label>
                    <label>SSS loan <input className="border rounded w-20 text-right" value={getExtra(e.id).sssLoan || ''} onChange={(ev) => setOne(e.id, 'sssLoan', parseFloat(ev.target.value) || 0)} /></label>
                    <label>PAGIBIG loan <input className="border rounded w-20 text-right" value={getExtra(e.id).pagibigLoan || ''} onChange={(ev) => setOne(e.id, 'pagibigLoan', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Company loan <input className="border rounded w-20 text-right" value={getExtra(e.id).companyLoan || ''} onChange={(ev) => setOne(e.id, 'companyLoan', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Shortage <input className="border rounded w-20 text-right" value={getExtra(e.id).shortage || ''} onChange={(ev) => setOne(e.id, 'shortage', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Uniform <input className="border rounded w-20 text-right" value={getExtra(e.id).uniform || ''} onChange={(ev) => setOne(e.id, 'uniform', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Tools <input className="border rounded w-20 text-right" value={getExtra(e.id).tools || ''} onChange={(ev) => setOne(e.id, 'tools', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Deduct this period <input className="border rounded w-24 text-right" value={advances[e.id] || ''} onChange={(ev) => setAdvances({ ...advances, [e.id]: parseFloat(ev.target.value) || 0 })} /></label>
                  </div>
                  <div className="mt-1">Rate {money(e.dailyRate)} + Allowance {money(e.dailyAllowance)} × {c.worked} + Incentive {money(c.incentive)} + OT {money(c.overtimePay)} + Regular Holiday {money(c.regularHolidayPay)} + Special Holiday {money(c.specialHolidayPay)} − Undertime {money(c.undertimePay)} − SSS {money(c.sss)} − PhilHealth {money(c.phil)} − PAGIBIG {money(c.pagibig)} − Advance {money(c.advance)} = <b>{money(c.net)}</b></div>
                  <div className="mt-1 font-bold">Remaining Cash Advance: {money(c.remaining)}</div>
                  <button onClick={() => printSlip(e)} className="mt-2 bg-gray-700 text-white px-3 py-1 rounded text-sm">Payslip</button>
                </div>
                <button className="text-blue-600 text-sm" onClick={() => { setEditingId(e.id); setForm(e); }}>Edit</button>
              </div>
            );
          })}
        </div>
      )}

      {semi.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-lg mb-3">{semiHeader(periodDate)}</h2>
          {semi.map((e) => {
            const c = compute(e);
            return (
              <div key={e.id} className="border rounded p-3 mb-2 flex gap-3">
                {e.photo && <img src={e.photo} alt="" className="h-14 w-14 object-cover rounded" />}
                <div className="flex-1">
                  <div className="font-bold">{e.name} · {e.position}</div>
                  <div className="text-xs text-gray-500">SSS {e.sssNo || '—'} · PhilHealth {e.philhealthNo || '—'} · PAGIBIG {e.pagibigNo || '—'}</div>
                  <div className="flex flex-wrap gap-2 mt-2 text-sm">
                    <label>Days <input className="border rounded w-16 text-center" value={days[e.id] ?? 13} onChange={(ev) => setDays({ ...days, [e.id]: parseInt(ev.target.value) || 0 })} /></label>
                    <label>Half days <input className="border rounded w-16 text-center" value={getExtra(e.id).halfDays || ''} onChange={(ev) => setOne(e.id, 'halfDays', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Absent <input className="border rounded w-16 text-center" value={getExtra(e.id).absent || ''} onChange={(ev) => setOne(e.id, 'absent', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Rest days worked <input className="border rounded w-16 text-center" value={getExtra(e.id).restDays || ''} onChange={(ev) => setOne(e.id, 'restDays', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Monthly Incentive <input className="border rounded w-24 text-right" value={getExtra(e.id).incentive || ''} onChange={(ev) => setOne(e.id, 'incentive', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Undertime hrs <input className="border rounded w-16 text-center" value={getExtra(e.id).undertime || ''} onChange={(ev) => setOne(e.id, 'undertime', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Overtime hrs <input className="border rounded w-16 text-center" value={getExtra(e.id).overtime || ''} onChange={(ev) => setOne(e.id, 'overtime', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Regular holiday <input className="border rounded w-16 text-center" value={getExtra(e.id).regularHoliday || ''} onChange={(ev) => setOne(e.id, 'regularHoliday', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Special holiday <input className="border rounded w-16 text-center" value={getExtra(e.id).specialHoliday || ''} onChange={(ev) => setOne(e.id, 'specialHoliday', parseFloat(ev.target.value) || 0)} /></label>
                    <label>SSS loan <input className="border rounded w-20 text-right" value={getExtra(e.id).sssLoan || ''} onChange={(ev) => setOne(e.id, 'sssLoan', parseFloat(ev.target.value) || 0)} /></label>
                    <label>PAGIBIG loan <input className="border rounded w-20 text-right" value={getExtra(e.id).pagibigLoan || ''} onChange={(ev) => setOne(e.id, 'pagibigLoan', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Company loan <input className="border rounded w-20 text-right" value={getExtra(e.id).companyLoan || ''} onChange={(ev) => setOne(e.id, 'companyLoan', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Shortage <input className="border rounded w-20 text-right" value={getExtra(e.id).shortage || ''} onChange={(ev) => setOne(e.id, 'shortage', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Uniform <input className="border rounded w-20 text-right" value={getExtra(e.id).uniform || ''} onChange={(ev) => setOne(e.id, 'uniform', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Tools <input className="border rounded w-20 text-right" value={getExtra(e.id).tools || ''} onChange={(ev) => setOne(e.id, 'tools', parseFloat(ev.target.value) || 0)} /></label>
                    <label>Deduct this period <input className="border rounded w-24 text-right" value={advances[e.id] || ''} onChange={(ev) => setAdvances({ ...advances, [e.id]: parseFloat(ev.target.value) || 0 })} /></label>
                  </div>
                  <div className="mt-1">Rate {money(e.dailyRate)} + Allowance {money(e.dailyAllowance)} × {c.worked} + Incentive {money(c.incentive)} + OT {money(c.overtimePay)} + Regular Holiday {money(c.regularHolidayPay)} + Special Holiday {money(c.specialHolidayPay)} − Undertime {money(c.undertimePay)} − SSS {money(c.sss)} − PhilHealth {money(c.phil)} − PAGIBIG {money(c.pagibig)} − Advance {money(c.advance)} = <b>{money(c.net)}</b></div>
                  <div className="mt-1 font-bold">Remaining Cash Advance: {money(c.remaining)}</div>
                  <button onClick={() => printSlip(e)} className="mt-2 bg-gray-700 text-white px-3 py-1 rounded text-sm">Payslip</button>
                </div>
                <button className="text-blue-600 text-sm" onClick={() => { setEditingId(e.id); setForm(e); }}>Edit</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
