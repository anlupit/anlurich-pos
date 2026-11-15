'use client';

import { useEffect, useState } from 'react';

const LETTERHEAD: Record<string, string> = {
  anlurich: 'Anlurich OPC',
  dasma: 'Dasma Auto Parts',
  lipa: 'Lipa Auto Parts',
  sezan: 'Baliwag Auto Parts',
  avenders: 'Avenders Auto Parts',
};

export default function EmployeeProfilePage() {
  const [employee, setEmployee] = useState<any>(null);
  const [days, setDays] = useState(6);
  const [halfDays, setHalfDays] = useState(0);
  const [overtime, setOvertime] = useState(0);
  const [undertime, setUndertime] = useState(0);
  const [absentDates, setAbsentDates] = useState('');
  const [cashAdvance, setCashAdvance] = useState(0);
  const [advanceRequest, setAdvanceRequest] = useState(0);
  const [deductGov, setDeductGov] = useState(false);
  const [deductMonth, setDeductMonth] = useState(new Date().toISOString().slice(0, 7));
  const [alreadyDeducted, setAlreadyDeducted] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(false);

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
      const scale = Math.min(1, 400 / Math.max(img.width, img.height));
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (ctx) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, canvas.width, canvas.height); }
      const photo = canvas.toDataURL('image/jpeg', 0.92);
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
  const sss = deductGov && !alreadyDeducted ? Number(employee.sssAmount || 0) : 0;
  const phil = deductGov && !alreadyDeducted ? Number(employee.philhealthAmount || 0) : 0;
  const pagibig = deductGov && !alreadyDeducted ? Number(employee.pagibigAmount || 0) : 0;
  const gross = base + allowance + overtimePay;
  const salaryNet = gross - undertimePay - sss - phil - pagibig;
  const totalPayout = salaryNet - cashAdvance + advanceRequest;
  const cashAdvanceBalance = Math.max(0, Number(employee.cashAdvanceTotal || 0) + advanceRequest - cashAdvance);

  const saveSalary = async () => {
    const row = { id: `${employee.branch}-${employee.id}-${new Date().toISOString().slice(0, 10)}`, branch: employee.branch, employeeName: employee.name, days, halfDays, absentDates, overtime, undertime, cashAdvance, advanceRequest, gross, net: totalPayout, date: new Date().toISOString().slice(0, 10) };
    const profile = { ...employee, cashAdvanceTotal: cashAdvanceBalance };
    await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'employee_salaries', row }) });
    await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'employee_profiles', row: profile }) });
    setEmployee(profile);
    alert('Salary saved.');
  };

  const saveProfile = async () => {
    await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'employee_profiles', row: employee }) });
    setEditing(false);
    alert('Employee information saved to Supabase.');
  };

  const requestAdvance = async () => {
    const amount = prompt('Cash advance amount');
    if (!amount) return;
    const row = { ...employee, cashAdvanceTotal: Number(employee.cashAdvanceTotal || 0) + Number(amount) };
    setEmployee(row);
    setCashAdvance(Number(amount));
    await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'employee_profiles', row }) });
  };

  const downloadSalary = async () => {
    const XLSX = await import('xlsx');
    const data = [{ Name: employee.name, Position: employee.position, Days: days, Base: base, Allowance: allowance, 'Cash Advance Request': advanceRequest, 'Cash Advance Deduction': cashAdvance, SSS: sss, PhilHealth: phil, PAGIBIG: pagibig, 'Total Earnings': totalPayout, 'Current Cash Advance Balance': cashAdvanceBalance }];
    const sheet = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Salary');
    XLSX.writeFile(wb, `salary-${employee.name}.xlsx`);
  };

  const printSalary = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><body style="font-family:Arial;text-align:center"><img src="/logo.png" style="height:70px"/><h2>${LETTERHEAD[employee.branch] || employee.branch}</h2><h3>Salary Computation</h3><div style="text-align:left"><p>${employee.name}</p><p>Salary ${money(salaryNet)}</p><p>Cash Advance Request ${money(advanceRequest)}</p><p>Cash Advance Deduction ${money(cashAdvance)}</p><h2>Total Earnings ${money(totalPayout)}</h2></div></body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="bg-[#1e3a8a] text-white rounded-t-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain bg-white rounded" />
          <div className="font-black tracking-wide">AUTO PARTS INVENTORY SYSTEM</div>
        </div>
        <label className="cursor-pointer">
          {employee.photo ? <img src={employee.photo} alt="" className="h-[153px] w-[153px] object-cover rounded-full border-2 border-white" /> : <div className="h-[153px] w-[153px] rounded-full bg-white/30" />}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
        </label>
      </div>
      <div className="bg-white rounded-b-xl shadow p-4 mb-4">
        <button onClick={() => (window.location.href = '/employee-salary')} className="text-sm text-blue-600">← Back</button>
        <h1 className="text-3xl font-black text-[#1e3a8a] mb-4">Employee Profile</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="text-2xl font-bold">{employee.name}</div>
              <button onClick={() => editing ? saveProfile() : setEditing(true)} className="bg-blue-700 text-white px-3 py-1 rounded text-sm">{editing ? 'Save' : 'Edit'}</button>
            </div>
            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <input className="border rounded px-2 py-1" value={employee.name || ''} onChange={(e) => setEmployee({ ...employee, name: e.target.value })} placeholder="Name" />
                <input className="border rounded px-2 py-1" value={employee.position || ''} onChange={(e) => setEmployee({ ...employee, position: e.target.value })} placeholder="Position" />
                <input className="border rounded px-2 py-1" value={employee.phone || ''} onChange={(e) => setEmployee({ ...employee, phone: e.target.value })} placeholder="Contact Number" />
                <input className="border rounded px-2 py-1" value={employee.address || ''} onChange={(e) => setEmployee({ ...employee, address: e.target.value })} placeholder="Address" />
                <input className="border rounded px-2 py-1" value={employee.email || ''} onChange={(e) => setEmployee({ ...employee, email: e.target.value })} placeholder="Email" />
                <input className="border rounded px-2 py-1" value={employee.dailyRate || ''} onChange={(e) => setEmployee({ ...employee, dailyRate: e.target.value })} placeholder="Rate" />
                <input className="border rounded px-2 py-1" value={employee.dailyAllowance || ''} onChange={(e) => setEmployee({ ...employee, dailyAllowance: e.target.value })} placeholder="Daily Allowance" />
                <input className="border rounded px-2 py-1" value={employee.sssNo || ''} onChange={(e) => setEmployee({ ...employee, sssNo: e.target.value })} placeholder="SSS No." />
                <input className="border rounded px-2 py-1" value={employee.sssAmount || ''} onChange={(e) => setEmployee({ ...employee, sssAmount: e.target.value })} placeholder="SSS Amount" />
                <input className="border rounded px-2 py-1" value={employee.philhealthNo || ''} onChange={(e) => setEmployee({ ...employee, philhealthNo: e.target.value })} placeholder="PhilHealth No." />
                <input className="border rounded px-2 py-1" value={employee.philhealthAmount || ''} onChange={(e) => setEmployee({ ...employee, philhealthAmount: e.target.value })} placeholder="PhilHealth Amount" />
                <input className="border rounded px-2 py-1" value={employee.pagibigNo || ''} onChange={(e) => setEmployee({ ...employee, pagibigNo: e.target.value })} placeholder="PAGIBIG No." />
                <input className="border rounded px-2 py-1" value={employee.pagibigAmount || ''} onChange={(e) => setEmployee({ ...employee, pagibigAmount: e.target.value })} placeholder="PAGIBIG Amount" />
                <input className="border rounded px-2 py-1" value={employee.accountNumber || ''} onChange={(e) => setEmployee({ ...employee, accountNumber: e.target.value })} placeholder="Payout Account No." />
              </div>
            ) : (<>
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
            </>)}
          </div>
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-[#1e3a8a] text-white text-center font-bold py-2">{new Date(`${deductMonth}-01`).toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()} Deductibles</div>
            <div className="p-4">
              <label className="text-sm block mb-2">Month <input type="month" className="border rounded px-2 py-1 ml-2" value={deductMonth} onChange={(e) => setDeductMonth(e.target.value)} /></label>
              <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={deductGov} onChange={(e) => setDeductGov(e.target.checked)} disabled={alreadyDeducted} /> Deduct this payout</label>
              {alreadyDeducted && <div className="text-xs text-red-600 mb-2">Already deducted for this month.</div>}
              {deductGov && <>
                <div className="flex justify-between text-sm py-1 border-b"><span className="text-red-600 font-bold">SSS</span><b className="text-red-600">{money(employee.sssAmount)}</b></div>
                <div className="flex justify-between text-sm py-1 border-b"><span className="text-red-600 font-bold">PhilHealth</span><b className="text-red-600">{money(employee.philhealthAmount)}</b></div>
                <div className="flex justify-between text-sm py-1 border-b"><span className="text-red-600 font-bold">PAGIBIG</span><b className="text-red-600">{money(employee.pagibigAmount)}</b></div>
              </>}
              <label className="flex justify-between items-center text-sm py-2 border-b">Cash Advance Request
                <input className="border rounded w-28 px-2 py-1 text-right" value={advanceRequest || ''} onChange={(e) => setAdvanceRequest(parseFloat(e.target.value) || 0)} />
              </label>
              <label className="flex justify-between items-center text-sm py-2 border-b">Cash Advance Deduction
                <input className="border rounded w-28 px-2 py-1 text-right" value={cashAdvance || ''} onChange={(e) => setCashAdvance(parseFloat(e.target.value) || 0)} />
              </label>
              <div className="flex justify-between items-center mt-3"><span>Total Earnings</span><span className="text-2xl font-black text-blue-700">{money(totalPayout)}</span></div>
              <div className="text-sm mt-2">Current CASH ADVANCE balance: <b>{money(cashAdvanceBalance)}</b></div>
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
          <button onClick={downloadSalary} className="border border-green-700 text-green-700 px-4 py-2 rounded-lg">Download</button>
          <button onClick={printSalary} className="border border-blue-700 text-blue-700 px-4 py-2 rounded-lg">Print</button>
        </div>
      </div>
    </div>
  );
}
