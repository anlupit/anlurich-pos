'use client';

import { useEffect, useState } from 'react';

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function EmployeeProfilePage() {
  const [employee, setEmployee] = useState<any>(null);
  const [days, setDays] = useState(6);
  const [halfDays, setHalfDays] = useState(0);
  const [overtime, setOvertime] = useState(0);
  const [undertime, setUndertime] = useState(0);
  const [absentDates, setAbsentDates] = useState('');
  const [cashAdvance, setCashAdvance] = useState(0);
  const [deductGov, setDeductGov] = useState(false);
  const [deductMonth, setDeductMonth] = useState(new Date().toISOString().slice(0, 7));
  const [alreadyDeducted, setAlreadyDeducted] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id') || '';
    const cached = sessionStorage.getItem(`employee-${id}`);
    if (cached) setEmployee(JSON.parse(cached));
    const branch = localStorage.getItem('anlurich-branch') || '';
    fetch(`/api/records?table=employee_profiles&branch=${branch}&id=${id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((rows) => {
        const row = (Array.isArray(rows) ? rows : [])[0];
        if (row) setEmployee(row);
        else if (!cached) setLoadError('Employee profile was not found. Open it from the Employee Salary list.');
      })
      .catch(() => { if (!cached) setLoadError('Could not load the profile. Go back and open it from the list.'); });
  }, []);

  const onPhoto = (file?: File) => {
    if (!file || !employee) return;
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 48 / Math.max(img.width, img.height));
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const photo = canvas.toDataURL('image/jpeg', 0.35);
      const row = { ...employee, photo };
      setEmployee(row);
      await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'employee_profiles', row }) });
    };
    img.src = URL.createObjectURL(file);
  };

  if (!employee) return <div className="p-4">{loadError || 'Loading employee profile...'} <div><button onClick={() => (window.location.href = '/employee-salary')} className="text-blue-600 mt-2">← Back</button></div></div>;

  const absentCount = absentDates.split(',').map((d) => d.trim()).filter(Boolean).length;
  const dayRate = employee.rateType === 'monthly' ? Number(employee.dailyRate || 0) / 26 : Number(employee.dailyRate || 0);
  const hourly = dayRate / 8;
  const worked = days + halfDays * 0.5;
  const allowanceDays = days;
  const base = dayRate * worked;
  const allowance = Number(employee.dailyAllowance || 0) * allowanceDays;
  const overtimePay = hourly * 1.25 * overtime;
  const undertimePay = hourly * undertime;
  const sss = Number(employee.sssAmount || 0);
  const phil = Number(employee.philhealthAmount || 0);
  const pagibig = Number(employee.pagibigAmount || 0);
  const gross = base + allowance + overtimePay;
  const net = gross - undertimePay - sss - phil - pagibig - cashAdvance;

  const saveSalary = async () => {
    const row = { id: `${employee.branch}-${employee.id}-${new Date().toISOString().slice(0, 10)}`, branch: employee.branch, employeeName: employee.name, days, halfDays, absentDates, overtime, undertime, cashAdvance, gross, net, date: new Date().toISOString().slice(0, 10) };
    await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'employee_salaries', row }) });
    alert('Salary saved.');
  };

  const requestAdvance = async () => {
    const amount = prompt('Cash advance amount');
    if (!amount) return;
    const row = { ...employee, cashAdvanceTotal: Number(employee.cashAdvanceTotal || 0) + Number(amount) };
    setEmployee(row);
    setCashAdvance(Number(amount));
    await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'employee_profiles', row }) });
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="bg-[#1e3a8a] text-white rounded-t-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain bg-white rounded" />
          <div className="font-black tracking-wide">AUTO PARTS INVENTORY SYSTEM</div>
        </div>
        <label className="cursor-pointer">
          {employee.photo ? <img src={employee.photo} alt="" className="h-14 w-14 object-cover rounded-full border-2 border-white" /> : <div className="h-14 w-14 rounded-full bg-white/30" />}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
        </label>
      </div>
      <div className="bg-white rounded-b-xl shadow p-4 mb-4">
        <button onClick={() => (window.location.href = '/employee-salary')} className="text-sm text-blue-600">← Back</button>
        <h1 className="text-3xl font-black text-[#1e3a8a] mb-4">Employee Profile</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border rounded-xl p-4">
            <div className="text-2xl font-bold">{employee.name}</div>
            <div className="text-sm text-gray-600 mb-4">{employee.position || '—'} · {employee.phone || '—'}</div>
            <div className="text-sm space-y-1 mb-4">
              <div>Address: {employee.address || '—'}</div>
              <div>Email: {employee.email || '—'}</div>
              <div>Birthdate: {employee.birthdate || '—'}</div>
              <div>Date of Employment: {employee.started || '—'}</div>
              <div>Rate: {money(employee.dailyRate)} · Allowance: {money(employee.dailyAllowance)}</div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>SSS No<br/>{employee.sssNo || '—'}</span><b>{money(employee.sssAmount)}</b></div>
              <div className="flex justify-between"><span>PhilHealth No<br/>{employee.philhealthNo || '—'}</span><b>{money(employee.philhealthAmount)}</b></div>
              <div className="flex justify-between"><span>PAGIBIG No<br/>{employee.pagibigNo || '—'}</span><b>{money(employee.pagibigAmount)}</b></div>
            </div>
          </div>
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-[#1e3a8a] text-white text-center font-bold py-2">{new Date(`${deductMonth}-01`).toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()} Deductibles</div>
            <div className="p-4">
              <label className="text-sm block mb-2">Month <input type="month" className="border rounded px-2 py-1 ml-2" value={deductMonth} onChange={(e) => setDeductMonth(e.target.value)} /></label>
              <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={deductGov} onChange={(e) => setDeductGov(e.target.checked)} disabled={alreadyDeducted} /> Deduct this payout</label>
              {alreadyDeducted && <div className="text-xs text-red-600 mb-2">Already deducted for this month.</div>}
              <div className="flex justify-between text-sm py-1 border-b"><span>SSS No<br/>{employee.sssNo || '—'}</span><b>{money(sss)}</b></div>
              <div className="flex justify-between text-sm py-1 border-b"><span>PhilHealth No<br/>{employee.philhealthNo || '—'}</span><b>{money(phil)}</b></div>
              <div className="flex justify-between text-sm py-1 border-b"><span>PAGIBIG No<br/>{employee.pagibigNo || '—'}</span><b>{money(pagibig)}</b></div>
              <div className="flex justify-between items-center mt-3"><span>Net Pay</span><span className="text-2xl font-black text-blue-700">{money(net)}</span></div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
          <label className="text-sm">Days<input className="border rounded w-full px-2 py-1" value={days} onChange={(e) => setDays(parseFloat(e.target.value) || 0)} /></label>
          <label className="text-sm">Half days<input className="border rounded w-full px-2 py-1" value={halfDays} onChange={(e) => setHalfDays(parseFloat(e.target.value) || 0)} /></label>
          <label className="text-sm">Overtime hours<input className="border rounded w-full px-2 py-1" value={overtime} onChange={(e) => setOvertime(parseFloat(e.target.value) || 0)} /></label>
          <label className="text-sm">Undertime hours<input className="border rounded w-full px-2 py-1" value={undertime} onChange={(e) => setUndertime(parseFloat(e.target.value) || 0)} /></label>
          <label className="text-sm">Absent dates<input className="border rounded w-full px-2 py-1" placeholder="2026-11-12" value={absentDates} onChange={(e) => setAbsentDates(e.target.value)} /></label>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={requestAdvance} className="border border-blue-700 text-blue-700 px-4 py-2 rounded-lg">Request Cash Advance</button>
          <button onClick={saveSalary} className="bg-blue-700 text-white px-6 py-2 rounded-lg">Save Salary</button>
          <button onClick={() => window.print()} className="border border-blue-700 text-blue-700 px-4 py-2 rounded-lg">Print</button>
        </div>
      </div>
    </div>
  );
}
