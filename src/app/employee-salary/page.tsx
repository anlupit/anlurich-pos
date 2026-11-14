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
  address?: string;
  phone?: string;
  email?: string;
  payoutType?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  rateType?: string;
  accountNumber?: string;
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
const logo = '/logo.png';
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
  const [form, setForm] = useState<any>({ name: '', position: '', rateType: 'daily', started: '', dailyRate: '', address: '', birthdate: '', phone: '', dailyAllowance: '', email: '', payoutType: '', accountNumber: '', sssNo: '', sssAmount: '', philhealthNo: '', philhealthAmount: '', pagibigNo: '', pagibigAmount: '', emergencyName: '', emergencyPhone: '', photo: '', payout: 'weekly', cashAdvanceTotal: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
    Promise.all([
      fetch(`/api/records?table=employee_profiles&branch=${branch}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
      fetch(`/api/records?table=employees&branch=${branch}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
    ]).then(([profiles, oldRows]) => {
      const rows = [...(Array.isArray(profiles) ? profiles : []), ...(Array.isArray(oldRows) ? oldRows : [])];
      const seen = new Set<string>();
      setEmployees(rows.filter((r) => {
        const key = String(r.id || r.name || '');
        if (!r.name || String(r.id || '').startsWith('payroll-') || r.status === 'terminated' || seen.has(key)) return false;
        seen.add(key);
        return true;
      }));
    });
  }, [unlocked, branch]);

  const unlock = () => {
    const b = branch || currentBranch() || '';
    if (!b) return alert('Login to a branch first, then open Employee Salary.');
    if (pin.trim() === PASSWORDS[b]) {
      sessionStorage.setItem(`salary-ok-${b}`, '1');
      setBranch(b);
      setUnlocked(true);
    } else alert('Wrong password for this branch.');
  };

  if (!unlocked) {
    return (
      <div className="p-6 max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <img src={logo} alt="Logo" className="w-14 h-14 object-contain" />
          <div>
            <div className="font-black text-[#1e3a8a]">AUTO PARTS INVENTORY SYSTEM</div>
            <div className="text-sm text-gray-500">Employee Salary</div>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">{NAMES[branch || currentBranch() || ''] || 'Branch'} — enter the branch password</p>
        <form onSubmit={(e) => { e.preventDefault(); unlock(); }}>
          <input type="password" className="border rounded px-3 py-2 w-full mb-3" placeholder="Branch password" value={pin} onChange={(e) => setPin(e.target.value)} />
          <button type="submit" className="bg-blue-700 text-white px-4 py-2 rounded">Open</button>
        </form>
        <button onClick={() => (window.location.href = '/')} className="block mt-3 text-sm text-blue-600">← Main Menu</button>
      </div>
    );
  }

  const saveEmployee = async () => {
    if (!form.name.trim()) return alert('Enter employee name');
    const row: Employee = {
      id: editingId || Date.now().toString(),
      branch,
      name: form.name.trim(),
      dailyRate: Number(form.dailyRate || 0),
      dailyAllowance: Number(form.dailyAllowance || 0),
      position: form.position,
      address: form.address,
      phone: form.phone,
      email: form.email,
      payoutType: form.payoutType,
      emergencyName: form.emergencyName,
      emergencyPhone: form.emergencyPhone,
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
      rateType: form.rateType,
      accountNumber: form.accountNumber,
    };
    const saved = await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'employee_profiles', row }) });
    if (!saved.ok) return alert('Not saved to Supabase. Check the connection and try again.');
    setEmployees((prev) => prev.some((e) => e.id === row.id) ? prev.map((e) => e.id === row.id ? row : e) : [...prev, row]);
    setForm({ name: '', dailyRate: '', dailyAllowance: '', position: '', started: '', sssNo: '', philhealthNo: '', pagibigNo: '', birthdate: '', photo: '', payout: 'weekly' });
    setEditingId(null);
    setShowAdd(false);
  };

  const onPhoto = (file?: File) => {
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 48 / Math.max(img.width, img.height));
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      setForm((f: any) => ({ ...f, photo: canvas.toDataURL('image/jpeg', 0.35) }));
    };
    img.src = URL.createObjectURL(file);
  };

  const terminateSelected = async () => {
    if (!selectedId) return alert('Select an employee first');
    if (!confirm('Terminate this employee?')) return;
    const row = employees.find((e) => e.id === selectedId);
    await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'employee_profiles', row: { ...row, status: 'terminated' } }) });
    setEmployees((prev) => prev.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  };

  const downloadList = async () => {
    const XLSX = await import('xlsx');
    const data = employees.map((e) => ({ Name: e.name, Position: e.position, 'Contact Number': e.phone || '', Branch: e.branch }));
    const sheet = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Employees');
    XLSX.writeFile(wb, `employees-${branch}.xlsx`);
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
    const rows = employees.map((e) => ({ id: `${branch}-${e.id}-${periodDate}`, branch, periodDate, employeeName: e.name, payout: e.payout, ...compute(e) }));
    await Promise.all(rows.map((row) => fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'salary', row }) })));
    alert(`Saved ${rows.length} salary records to Supabase for ${NAMES[branch] || branch}.`);
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

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-2">
        {logo ? <img src={logo} alt="Logo" className="w-14 h-14 object-contain" /> : null}
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wide text-[#1e3a8a]">AUTO PARTS INVENTORY SYSTEM</h1>
          <div className="text-yellow-600 font-bold">Create Employee Salary</div>
        </div>
      </div>
      <div className="text-xs text-gray-500 mb-4">{NAMES[branch] || branch}</div>

      <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-2">
        <button onClick={() => setShowAdd((v) => !v)} className="bg-blue-700 text-white px-4 py-2 rounded-lg">Add Employee</button>
        <button onClick={terminateSelected} className="bg-red-600 text-white px-4 py-2 rounded-lg">Terminate Employee</button>
        <button onClick={downloadList} className="bg-green-700 text-white px-4 py-2 rounded-lg">Download</button>
        <button onClick={() => window.print()} className="bg-gray-700 text-white px-4 py-2 rounded-lg">Print</button>
        <button onClick={() => (window.location.href = '/')} className="bg-slate-500 text-white px-4 py-2 rounded-lg">Main Menu</button>
      </div>

      {showAdd && <div className="bg-white rounded-xl shadow p-4 mb-4">
        <button onClick={() => setShowAdd(false)} className="text-sm text-blue-600 mb-3">← Back to Employee Dashboard</button>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input className="h-10 w-full rounded-lg border bg-gray-100 px-3" placeholder="Employee Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="h-10 w-full rounded-lg border bg-gray-100 px-3" placeholder="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          <select className="h-10 w-full rounded-lg border bg-gray-100 px-3" value={form.rateType} onChange={(e) => setForm({ ...form, rateType: e.target.value })}>
            <option value="monthly">Monthly</option>
            <option value="daily">Daily</option>
          </select>
          <input type="date" className="h-10 w-full rounded-lg border bg-gray-100 px-3" value={form.started} onChange={(e) => setForm({ ...form, started: e.target.value })} />
          <input className="h-10 w-full rounded-lg border bg-gray-100 px-3" placeholder="Home Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <input type="date" className="h-10 w-full rounded-lg border bg-gray-100 px-3" value={form.birthdate} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} />
          <input className="h-10 w-full rounded-lg border bg-gray-100 px-3" placeholder="Contact Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="h-10 w-full rounded-lg border bg-gray-100 px-3" placeholder="Monthly Rate / Daily Rate" value={form.dailyRate} onChange={(e) => setForm({ ...form, dailyRate: e.target.value })} />
          <input className="h-10 w-full rounded-lg border bg-gray-100 px-3" placeholder="Email Address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select className="h-10 w-full rounded-lg border bg-gray-100 px-3" value={form.payout} onChange={(e) => setForm({ ...form, payout: e.target.value })}>
            <option value="weekly">Weekly payout</option>
            <option value="semi">15th and 30th</option>
          </select>
          <input className="h-10 w-full rounded-lg border bg-gray-100 px-3" placeholder="Account Number for payout" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
          <input className="h-10 w-full rounded-lg border bg-gray-100 px-3" placeholder="Daily Allowance" value={form.dailyAllowance} onChange={(e) => setForm({ ...form, dailyAllowance: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <h2 className="text-xl font-bold mb-3">Deductibles:</h2>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input className="h-10 w-full rounded-lg border bg-gray-100 px-3" placeholder="SSS No." value={form.sssNo} onChange={(e) => setForm({ ...form, sssNo: e.target.value })} />
              <input className="h-10 w-full rounded-lg border bg-gray-100 px-3" placeholder="SSS Deduction Amount" value={form.sssAmount} onChange={(e) => setForm({ ...form, sssAmount: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input className="h-10 w-full rounded-lg border bg-gray-100 px-3" placeholder="Philhealth No." value={form.philhealthNo} onChange={(e) => setForm({ ...form, philhealthNo: e.target.value })} />
              <input className="h-10 w-full rounded-lg border bg-gray-100 px-3" placeholder="Philhealth Deduction Amount" value={form.philhealthAmount} onChange={(e) => setForm({ ...form, philhealthAmount: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="h-10 w-full rounded-lg border bg-gray-100 px-3" placeholder="PAGIBIG No." value={form.pagibigNo} onChange={(e) => setForm({ ...form, pagibigNo: e.target.value })} />
              <input className="h-10 w-full rounded-lg border bg-gray-100 px-3" placeholder="PAGIBIG Deduction Amount" value={form.pagibigAmount} onChange={(e) => setForm({ ...form, pagibigAmount: e.target.value })} />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold mb-3">In case of Emergency</h2>
            <div className="grid grid-cols-2 gap-2 mb-6">
              <input className="h-10 w-full rounded-lg border bg-gray-100 px-3" placeholder="Contact Person" value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />
              <input className="h-10 w-full rounded-lg border bg-gray-100 px-3" placeholder="Contact Number" value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
            </div>
            <div className="flex gap-3 justify-end">
              <label className="bg-blue-600 text-white rounded-full px-8 py-3 cursor-pointer">
                Upload Photo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
              </label>
              <button onClick={saveEmployee} className="bg-blue-700 text-white rounded-full px-8 py-3 font-bold">{editingId ? 'UPDATE EMPLOYEE' : 'ADD EMPLOYEE'}</button>
            </div>
            {form.photo && <img src={form.photo} alt="" className="h-16 w-16 object-cover rounded-full mt-3 ml-auto" />}
          </div>
        </div>
      </div>}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-teal-500 text-white">
            <tr>
              <th className="p-2"></th>
              <th className="p-2 text-left">Employee Name</th>
              <th className="p-2 text-left">Position</th>
              <th className="p-2 text-left">Contact Number</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-2"><input type="radio" checked={selectedId === e.id} onChange={() => setSelectedId(e.id)} /></td>
                <td className="p-2 font-medium">{e.name}</td>
                <td className="p-2">{e.position || '—'}</td>
                <td className="p-2">{e.phone || '—'}</td>
                <td className="p-2 text-right"><button onClick={() => { sessionStorage.setItem(`employee-${e.id}`, JSON.stringify({ ...e, photo: '' })); window.location.href = `/employee-profile?id=${e.id}`; }} className="text-blue-700 font-medium">View Profile / Create Salary</button></td>
              </tr>
            ))}
            {employees.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">No employees yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
