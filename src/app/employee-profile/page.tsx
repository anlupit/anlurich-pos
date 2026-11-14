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

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    const branch = localStorage.getItem('anlurich-branch') || '';
    fetch(`/api/records?table=employee_profiles&branch=${branch}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((rows) => setEmployee((Array.isArray(rows) ? rows : []).find((r: any) => r.id === id) || null))
      .catch(() => {});
  }, []);

  const onPhoto = (file?: File) => {
    if (!file || !employee) return;
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 160 / Math.max(img.width, img.height));
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const photo = canvas.toDataURL('image/jpeg', 0.8);
      const row = { ...employee, photo };
      setEmployee(row);
      await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'employee_profiles', row }) });
    };
    img.src = URL.createObjectURL(file);
  };

  if (!employee) return <div className="p-4">Loading employee profile...</div>;

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
    <div className="p-4">
      <button onClick={() => (window.location.href = '/employee-salary')} className="text-sm text-blue-600 mb-3">← Back to Employee Dashboard</button>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain" />
          <div>
            <h1 className="text-xl font-black text-[#1e3a8a]">AUTO PARTS INVENTORY SYSTEM</h1>
            <div className="text-yellow-600 font-bold">Employee Profile</div>
          </div>
        </div>
        <div className="text-center">
          {employee.photo ? <img src={employee.photo} alt="" className="h-24 w-24 object-cover rounded-full border" /> : <div className="h-24 w-24 rounded-full bg-gray-200" />}
          <label className="block text-xs text-blue-700 mt-1 cursor-pointer">Change Photo<input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} /></label>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
        <div><b>Name:</b> {employee.name}</div>
        <div><b>Position:</b> {employee.position || '—'}</div>
        <div><b>Contact:</b> {employee.phone || '—'}</div>
        <div><b>Address:</b> {employee.address || '—'}</div>
        <div><b>Email:</b> {employee.email || '—'}</div>
        <div><b>Birthdate:</b> {employee.birthdate || '—'}</div>
        <div><b>Date of Employment:</b> {employee.started || '—'}</div>
        <div><b>Rate:</b> {money(employee.dailyRate)}</div>
        <div><b>Daily Allowance:</b> {money(employee.dailyAllowance)}</div>
        <div><b>SSS:</b> {employee.sssNo || '—'} / {money(employee.sssAmount)}</div>
        <div><b>PhilHealth:</b> {employee.philhealthNo || '—'} / {money(employee.philhealthAmount)}</div>
        <div><b>PAGIBIG:</b> {employee.pagibigNo || '—'} / {money(employee.pagibigAmount)}</div>
        <div><b>Emergency:</b> {employee.emergencyName || '—'} / {employee.emergencyPhone || '—'}</div>
        <div><b>Account:</b> {employee.accountNumber || '—'}</div>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="font-bold text-lg mb-3">Calculate Salary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <label>Days<input className="border rounded w-full px-2 py-1" value={days} onChange={(e) => setDays(parseFloat(e.target.value) || 0)} /></label>
          <label>Half days<input className="border rounded w-full px-2 py-1" value={halfDays} onChange={(e) => setHalfDays(parseFloat(e.target.value) || 0)} /></label>
          <label>Overtime hours<input className="border rounded w-full px-2 py-1" value={overtime} onChange={(e) => setOvertime(parseFloat(e.target.value) || 0)} /></label>
          <label>Undertime hours<input className="border rounded w-full px-2 py-1" value={undertime} onChange={(e) => setUndertime(parseFloat(e.target.value) || 0)} /></label>
        </div>
        <label className="block text-sm mb-3">Absent dates, separated by comma
          <input className="border rounded w-full px-2 py-1 mt-1" placeholder="2026-11-12, 2026-11-13" value={absentDates} onChange={(e) => setAbsentDates(e.target.value)} />
        </label>
        <div className="text-sm mb-3">Half day does not include daily allowance. Absent days: {absentCount}.</div>
        <div className="text-sm space-y-1">
          <div>Base {money(base)} + Allowance {money(allowance)} + OT {money(overtimePay)}</div>
          <div>Deductibles: SSS {money(sss)} · PhilHealth {money(phil)} · PAGIBIG {money(pagibig)} · Undertime {money(undertimePay)} · Cash Advance {money(cashAdvance)}</div>
          <div className="text-xl font-black">Net Pay {money(net)}</div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={requestAdvance} className="bg-orange-600 text-white px-4 py-2 rounded-lg">Request Cash Advance</button>
          <button onClick={saveSalary} className="bg-blue-700 text-white px-4 py-2 rounded-lg">Save Salary</button>
          <button onClick={() => window.print()} className="bg-gray-700 text-white px-4 py-2 rounded-lg">Print</button>
        </div>
      </div>
    </div>
  );
}
