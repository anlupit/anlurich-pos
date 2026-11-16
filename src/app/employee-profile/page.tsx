'use client';

import { useEffect, useState } from 'react';

const LETTERHEAD: Record<string, string> = {
  anlurich: 'Anlurich OPC',
  dasma: 'Dasma Auto Parts',
  lipa: 'Lipa Auto Parts',
  sezan: 'Baliwag Auto Parts',
  avenders: 'Avenders Auto Parts',
};

function periodLabel(dates: string[]) {
  if (!dates.length) return '';
  const start = new Date(`${dates[0]}T00:00:00`);
  const end = new Date(`${dates[dates.length - 1]}T00:00:00`);
  const month = start.toLocaleString('en-US', { month: 'short' });
  const endMonth = end.toLocaleString('en-US', { month: 'short' });
  const range = month === endMonth ? `${month} ${start.getDate()}-${end.getDate()}` : `${month} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
  return `${range} ${start.getFullYear()}`;
}

function historyDate(h: any) {
  if (h.fromDate && h.toDate) {
    const start = new Date(`${h.fromDate}T00:00:00`);
    const end = new Date(`${h.toDate}T00:00:00`);
    const month = start.toLocaleString('en-US', { month: 'short' });
    const endMonth = end.toLocaleString('en-US', { month: 'short' });
    const range = month === endMonth ? `${month} ${start.getDate()}-${end.getDate()}` : `${month} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
    return `${range} ${start.getFullYear()}`;
  }
  return String(h.period || h.date || '').replace(/\s*Week\s*\d+/i, '');
}

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function EmployeeProfilePage() {
  const [employee, setEmployee] = useState<any>(null);
  const [days, setDays] = useState(6);
  const [halfDays, setHalfDays] = useState(0);
  const [overtime, setOvertime] = useState(0);
  const [undertime, setUndertime] = useState(0);
  const [absentDates, setAbsentDates] = useState('');
  const [presentDates, setPresentDates] = useState<string[]>([]);
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  const [fromDate, setFromDate] = useState(monday.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(saturday.toISOString().slice(0, 10));
  const [halfDate, setHalfDate] = useState('');
  const [cashAdvance, setCashAdvance] = useState(0);
  const [advanceRequest, setAdvanceRequest] = useState(0);
  const [incentive, setIncentive] = useState(0);
  const [incentiveDetails, setIncentiveDetails] = useState('');
  const [undertimeAmount, setUndertimeAmount] = useState(0);
  const [personalCharge, setPersonalCharge] = useState(0);
  const [personalDetails, setPersonalDetails] = useState('');
  const [showAdvance, setShowAdvance] = useState(false);
  const [showIncentive, setShowIncentive] = useState(false);
  const [showCommission, setShowCommission] = useState(false);
  const [commission, setCommission] = useState(0);
  const [commissionDetails, setCommissionDetails] = useState('');
  const [showHoliday, setShowHoliday] = useState(false);
  const [holidayPay, setHolidayPay] = useState(0);
  const [holidayDetails, setHolidayDetails] = useState('');
  const [showOvertime, setShowOvertime] = useState(false);
  const [showCADeduct, setShowCADeduct] = useState(false);
  const [showUndertime, setShowUndertime] = useState(false);
  const [showPersonal, setShowPersonal] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [referenceNo, setReferenceNo] = useState('');
  const [editRow, setEditRow] = useState<any>(null);
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
        fetch(`/api/records?table=employee_salaries&branch=${branch}`, { cache: 'no-store' })
          .then((r) => r.json())
          .then((rows) => setHistory((Array.isArray(rows) ? rows : []).filter((r) => String(r.employeeName || '').toLowerCase() === String((row?.name || '')).toLowerCase())));
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
  const rawRate = Number(String(employee.dailyRate ?? employee.rate ?? 0).replace(/[^0-9.]/g, '')) || 0;
  const dayRate = employee.rateType === 'monthly' ? rawRate / 26 : rawRate;
  const hourly = dayRate / 8;
  const fullDays = presentDates.filter((d) => d !== halfDate).length;
  const worked = fullDays + (halfDate ? 0.5 : 0);
  const allowanceDays = fullDays;
  const base = dayRate * worked;
  const allowance = Number(employee.dailyAllowance || 0) * allowanceDays;
  const overtimePay = (dayRate / 8) * 1.3 * overtime;
  const undertimePay = hourly * undertime;
  const sss = deductGov && !alreadyDeducted ? Number(employee.sssAmount || 0) : 0;
  const phil = deductGov && !alreadyDeducted ? Number(employee.philhealthAmount || 0) : 0;
  const pagibig = deductGov && !alreadyDeducted ? Number(employee.pagibigAmount || 0) : 0;
  const gross = base + allowance + overtimePay;
  const salaryNet = gross - sss - phil - pagibig;
  const undertimeDeduct = showUndertime ? (dayRate / 8) * undertimeAmount : 0;
  const totalPayout = salaryNet - (showCADeduct ? cashAdvance : 0) + (showAdvance ? advanceRequest : 0);
  const historyBalance = history.reduce((n, h) => n + Number(h.advanceRequest || 0) - Number(h.cashAdvance || 0), 0);
  const cashAdvanceBalance = Math.max(0, historyBalance + (showAdvance ? advanceRequest : 0) - (showCADeduct ? cashAdvance : 0));

  const payoutAmount = totalPayout + (showIncentive ? incentive : 0) + (showCommission ? commission : 0) + (showHoliday ? holidayPay : 0) - undertimeDeduct - (showPersonal ? personalCharge : 0);

  const confirmRelease = async () => {
    const dates = presentDates.slice().sort();
    const period = periodLabel(dates) || new Date().toISOString().slice(0, 10);
    const row = { id: `${employee.branch}-${employee.id}-${period}`, branch: employee.branch, employeeName: employee.name, period, fromDate, toDate, payoutType: employee.payoutType || '', accountNumber: employee.accountNumber || '', basic: base, net: payoutAmount, advanceRequest: showAdvance ? advanceRequest : 0, cashAdvance: showCADeduct ? cashAdvance : 0, referenceNo, released: true, date: new Date().toISOString().slice(0, 10) };
    await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'employee_salaries', row }) });
    const profile = { ...employee, cashAdvanceTotal: cashAdvanceBalance };
    await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'employee_profiles', row: profile }) });
    setEmployee(profile);
    setHistory((prev) => [row, ...prev]);
    setReleaseOpen(false);
    setReferenceNo('');
    setPresentDates([]);
    setHalfDate('');
    setOvertime(0);
    setIncentive(0);
    setIncentiveDetails('');
    setUndertimeAmount(0);
    setPersonalCharge(0);
    setPersonalDetails('');
    setCashAdvance(0);
    setAdvanceRequest(0);
    setDeductGov(false);
    setShowAdvance(false);
    setShowIncentive(false);
    setShowCommission(false);
    setShowHoliday(false);
    setHolidayPay(0);
    setHolidayDetails('');
    setCommission(0);
    setCommissionDetails('');
    setShowOvertime(false);
    setShowCADeduct(false);
    setShowUndertime(false);
    setShowPersonal(false);
    alert('Salary saved and released. Form cleared for a new record.');
  };

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

  const deleteHistory = async (row: any) => {
    await fetch('/api/records', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'employee_salaries', id: row.id, branch: row.branch }) });
    const next = history.filter((h) => h.id !== row.id);
    const balance = Math.max(0, next.reduce((n, h) => n + Number(h.advanceRequest || 0) - Number(h.cashAdvance || 0), 0));
    const profile = { ...employee, cashAdvanceTotal: balance };
    await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'employee_profiles', row: profile }) });
    setHistory(next);
    setEmployee(profile);
  };

  const saveEditRow = async () => {
    await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'employee_salaries', row: editRow }) });
    setHistory((prev) => prev.map((h) => h.id === editRow.id ? editRow : h));
    setEditRow(null);
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
        <button onClick={() => (window.location.href = '/employee-salary')} className="bg-slate-600 text-white px-4 py-2 rounded-lg mb-3">← Back to Employee Salary</button>
        <h1 className="text-3xl font-black text-[#1e3a8a] mb-4">Employee Profile</h1>
        <div className="grid gap-3 text-base" style={{ gridTemplateColumns: '1.8fr 1fr 1.2fr' }}>
          <div className="border rounded-xl p-3 min-w-0 bg-white">
            <div className="font-bold text-lg mb-2">1. Employee Information</div>
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-2xl font-black">{employee.name}</div>
                {editing ? <input type="date" className="border rounded px-2 py-1 h-8 text-sm" value={employee.birthdate || ''} onChange={(e) => setEmployee({ ...employee, birthdate: e.target.value })} /> : <div className="text-sm text-gray-600">Birthday: {employee.birthdate || '—'}</div>}
                {editing ? <input type="date" className="border rounded px-2 py-1 h-8 text-sm mt-1" value={employee.started || ''} onChange={(e) => setEmployee({ ...employee, started: e.target.value })} /> : <div className="text-sm text-gray-600">Day started: {employee.started || '—'}</div>}
                {editing ? (
                  <div className="flex gap-1 mt-1">
                    <select className="border rounded px-2 py-1 text-sm" value={employee.payoutType || ''} onChange={(e) => setEmployee({ ...employee, payoutType: e.target.value })}>
                      <option value="">Payout type</option><option>Cash</option><option>Gcash</option><option>Gotym</option><option>Bank Transfer</option>
                    </select>
                    <select className="border rounded px-2 py-1 text-sm" value={employee.payout || 'weekly'} onChange={(e) => setEmployee({ ...employee, payout: e.target.value })}>
                      <option value="weekly">Weekly</option><option value="semi">15th and 30th</option>
                    </select>
                  </div>
                ) : <div className="text-sm text-gray-600">Payout: {employee.payoutType || '—'} · {employee.payout === 'semi' ? '15th and 30th' : 'Weekly'}</div>}
              </div>
              <button onClick={() => editing ? saveProfile() : setEditing(true)} className="bg-[#1e3a8a] text-white px-3 py-1 rounded text-sm">{editing ? 'Save' : 'Edit Employee'}</button>
            </div>
            {editing ? (
              <div className="grid grid-cols-1 gap-1 text-sm">
                <input className="border rounded px-2 py-1 h-8" value={employee.name || ''} onChange={(e) => setEmployee({ ...employee, name: e.target.value })} placeholder="Name" />
                <input className="border rounded px-2 py-1 h-8" value={employee.position || ''} onChange={(e) => setEmployee({ ...employee, position: e.target.value })} placeholder="Position" />
                <input className="border rounded px-2 py-1 h-8" value={employee.phone || ''} onChange={(e) => setEmployee({ ...employee, phone: e.target.value })} placeholder="Contact Number" />
                <input className="border rounded px-2 py-1 h-8" value={employee.address || ''} onChange={(e) => setEmployee({ ...employee, address: e.target.value })} placeholder="Address" />
                <input className="border rounded px-2 py-1 h-8" value={employee.email || ''} onChange={(e) => setEmployee({ ...employee, email: e.target.value })} placeholder="Email" />
                <input className="border rounded px-2 py-1 h-8" value={employee.dailyRate || ''} onChange={(e) => setEmployee({ ...employee, dailyRate: e.target.value })} placeholder="Rate" />
                <input className="border rounded px-2 py-1 h-8" value={employee.dailyAllowance || ''} onChange={(e) => setEmployee({ ...employee, dailyAllowance: e.target.value })} placeholder="Daily Allowance" />
                <input className="border rounded px-2 py-1 h-8" value={employee.sssNo || ''} onChange={(e) => setEmployee({ ...employee, sssNo: e.target.value })} placeholder="SSS No." />
                <input className="border rounded px-2 py-1 h-8" value={employee.sssAmount || ''} onChange={(e) => setEmployee({ ...employee, sssAmount: e.target.value })} placeholder="SSS Amount" />
                <input className="border rounded px-2 py-1 h-8" value={employee.philhealthNo || ''} onChange={(e) => setEmployee({ ...employee, philhealthNo: e.target.value })} placeholder="PhilHealth No." />
                <input className="border rounded px-2 py-1 h-8" value={employee.philhealthAmount || ''} onChange={(e) => setEmployee({ ...employee, philhealthAmount: e.target.value })} placeholder="PhilHealth Amount" />
                <input className="border rounded px-2 py-1 h-8" value={employee.pagibigNo || ''} onChange={(e) => setEmployee({ ...employee, pagibigNo: e.target.value })} placeholder="PAGIBIG No." />
                <input className="border rounded px-2 py-1 h-8" value={employee.pagibigAmount || ''} onChange={(e) => setEmployee({ ...employee, pagibigAmount: e.target.value })} placeholder="PAGIBIG Amount" />
                <input className="border rounded px-2 py-1 h-8" value={employee.accountNumber || ''} onChange={(e) => setEmployee({ ...employee, accountNumber: e.target.value })} placeholder="Payout Account No." />
              </div>
            ) : (<>
            <div className="text-sm space-y-1 mb-2">
              <div>Position: {employee.position || '—'}</div>
              <div>Phone: {employee.phone || '—'}</div>
              <div>Address: {employee.address || '—'}</div>
            </div>
            <div className="font-bold text-sm mt-3">Government Numbers</div>
            <div className="text-sm space-y-1 mb-2">
              <div>SSS Number: {employee.sssNo || '—'}</div>
              <div>PhilHealth Number: {employee.philhealthNo || '—'}</div>
              <div>Pag-IBIG Number: {employee.pagibigNo || '—'}</div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <div className="font-bold text-sm mb-1">Salary History</div>
              <table className="w-full text-[11px] table-fixed leading-tight">
                <thead><tr className="bg-gray-100"><th className="px-1 py-0.5 text-left">Dates</th><th className="px-1 py-0.5 text-left">Payout</th><th className="px-1 py-0.5 text-right">Total</th><th className="px-1 py-0.5 text-left">Ref No.</th><th className="px-1 py-0.5"></th></tr></thead>
                <tbody>{history.map((h) => <tr key={h.id} className="border-t"><td className="px-1 py-0.5">{historyDate(h)}</td><td className="px-1 py-0.5">{h.payoutType || '—'}{h.payoutType && h.payoutType !== 'Cash' && h.accountNumber ? ` — ${h.accountNumber}` : ''}</td><td className="px-1 py-0.5 text-right">{money(h.net)}</td><td className="px-1 py-0.5 truncate">{h.referenceNo || '—'}</td><td className="px-1 py-0.5"><button onClick={() => setEditRow({ ...h })} className="text-blue-700">Edit</button> <button onClick={() => deleteHistory(h)} className="text-red-600">X</button></td></tr>)}</tbody>
              </table>
            </div>
            </>)}
          </div>
          <div className="border rounded-xl p-3 min-w-0">
            <div className="font-bold text-lg mb-2">2. Payroll Adjustments</div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <label className="text-sm">From <input type="date" className="border rounded px-2 py-1" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPresentDates([]); }} /> To <input type="date" className="border rounded px-2 py-1" value={toDate} onChange={(e) => { setToDate(e.target.value); setPresentDates([]); }} /></label>
              {['Cash', 'Gcash', 'Gotym', 'Bank Transfer'].map((type) => (
                <div key={type} className="text-sm">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={employee.payoutType === type} onChange={() => setEmployee({ ...employee, payoutType: type })} /> {type}</label>
                  {type !== 'Cash' && employee.payoutType === type && <input className="border rounded w-28 px-1 py-0.5 mt-1 block" placeholder="Account no." value={employee.accountNumber || ''} onChange={(e) => setEmployee({ ...employee, accountNumber: e.target.value })} />}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              {Array.from({ length: Math.max(1, Math.round((new Date(`${toDate}T00:00:00`).getTime() - new Date(`${fromDate}T00:00:00`).getTime()) / 86400000) + 1) }, (_, i) => {
                const date = new Date(`${fromDate}T00:00:00`);
                date.setDate(date.getDate() + i);
                const key = date.toISOString().slice(0, 10);
                const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                return <div key={key} className="flex items-center gap-2 text-sm">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={presentDates.includes(key)} onChange={(e) => { setPresentDates((prev) => e.target.checked ? [...prev, key] : prev.filter((d) => d !== key)); if (!e.target.checked && halfDate === key) setHalfDate(''); }} />{label}</label>
                  {presentDates.includes(key) && <label className="flex items-center gap-1 text-xs text-orange-700"><input type="radio" name="halfday" checked={halfDate === key} onChange={() => setHalfDate(key)} />Half day</label>}
                </div>;
              })}
            </div>
            <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" checked={showOvertime} onChange={(e) => { setShowOvertime(e.target.checked); if (!e.target.checked) setOvertime(0); }} /> Overtime Hours {showOvertime && <input className="border rounded w-20 px-2 py-1" value={overtime || ''} onChange={(e) => setOvertime(parseFloat(e.target.value) || 0)} />}</label>
            <label className="flex items-center gap-2 text-sm mt-1"><input type="checkbox" checked={showAdvance} onChange={(e) => { setShowAdvance(e.target.checked); if (!e.target.checked) setAdvanceRequest(0); }} /> Cash Advance Request {showAdvance && <input className="border rounded w-20 px-2 py-1" value={advanceRequest || ''} onChange={(e) => setAdvanceRequest(parseFloat(e.target.value) || 0)} />}</label>
            <label className="flex items-center gap-2 text-sm mt-1 flex-wrap"><input type="checkbox" checked={showIncentive} onChange={(e) => { setShowIncentive(e.target.checked); if (!e.target.checked) { setIncentive(0); setIncentiveDetails(''); } }} /> Incentive Bonus {showIncentive && <><input className="border rounded w-20 px-2 py-1" placeholder="Amount" value={incentive || ''} onChange={(e) => setIncentive(parseFloat(e.target.value) || 0)} /><input className="border rounded w-28 px-2 py-1" placeholder="Details" value={incentiveDetails} onChange={(e) => setIncentiveDetails(e.target.value)} /></>}</label>
            <label className="flex items-center gap-2 text-sm mt-1"><input type="checkbox" checked={showCommission} onChange={(e) => { setShowCommission(e.target.checked); if (!e.target.checked) { setCommission(0); setCommissionDetails(""); } }} /> Monthly Commission {showCommission && <><input className="border rounded w-20 px-2 py-1" value={commission || ''} onChange={(e) => setCommission(parseFloat(e.target.value) || 0)} /><input className="border rounded w-28 px-2 py-1" placeholder="Details" value={commissionDetails} onChange={(e) => setCommissionDetails(e.target.value)} /></>}</label>
            <label className="flex items-center gap-2 text-sm mt-1"><input type="checkbox" checked={showHoliday} onChange={(e) => { setShowHoliday(e.target.checked); if (!e.target.checked) { setHolidayPay(0); setHolidayDetails(""); } }} /> Holiday Pay {showHoliday && <><input className="border rounded w-20 px-2 py-1" value={holidayPay || ''} onChange={(e) => setHolidayPay(parseFloat(e.target.value) || 0)} /><input className="border rounded w-28 px-2 py-1" placeholder="Details" value={holidayDetails} onChange={(e) => setHolidayDetails(e.target.value)} /></>}</label>
            <div className="font-bold mt-3">Deductibles</div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={deductGov} onChange={(e) => setDeductGov(e.target.checked)} /> Government Mandatory Contribution</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showCADeduct} onChange={(e) => { setShowCADeduct(e.target.checked); if (!e.target.checked) setCashAdvance(0); }} /> Less Cash Advance {showCADeduct && <input className="border rounded w-20 px-2 py-1" value={cashAdvance || ''} onChange={(e) => setCashAdvance(parseFloat(e.target.value) || 0)} />}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showUndertime} onChange={(e) => { setShowUndertime(e.target.checked); if (!e.target.checked) setUndertimeAmount(0); }} /> Undertime {showUndertime && <input className="border rounded w-20 px-2 py-1" value={undertimeAmount || ''} onChange={(e) => setUndertimeAmount(parseFloat(e.target.value) || 0)} />}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showPersonal} onChange={(e) => { setShowPersonal(e.target.checked); if (!e.target.checked) { setPersonalCharge(0); setPersonalDetails(""); } }} /> Personal Charge {showPersonal && <><input className="border rounded w-20 px-2 py-1" value={personalCharge || ''} onChange={(e) => setPersonalCharge(parseFloat(e.target.value) || 0)} /><input className="border rounded w-28 px-2 py-1" placeholder="Details" value={personalDetails} onChange={(e) => setPersonalDetails(e.target.value)} /></>}</label>
          </div>
          <div className="border rounded-xl p-3 min-w-0 bg-white">
            <div className="text-center mb-3">
              <div className="font-black text-xl text-[#1e3a8a]">{LETTERHEAD[employee.branch] || employee.branch}</div>
              <div className="font-bold">SALARY PAYOUT {new Date(`${fromDate}T00:00:00`).toLocaleString('en-US', { month: 'short', day: 'numeric' })} - {new Date(`${toDate}T00:00:00`).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              <div className="text-sm font-bold text-blue-800">{employee.payoutType || 'No payout type ticked'}{employee.payoutType && employee.payoutType !== 'Cash' && employee.accountNumber ? ` — ${employee.accountNumber}` : ''}</div>
            </div>
            <div className="font-bold text-left mb-2">Salary Computation</div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between"><span>Daily Rate {money(dayRate)} x {worked} = Basic Total Salary</span><b>{money(base)}</b></div>
              <div className="flex justify-between"><span>Allowance x {allowanceDays}</span><b>{money(allowance)}</b></div>
              {showAdvance && <div className="flex justify-between text-blue-700 font-bold"><span>Cash Advance Request</span><span>{money(advanceRequest)}</span></div>}
              {showIncentive && <div className="flex justify-between"><span>Incentive Bonus{incentiveDetails ? ` — ${incentiveDetails}` : ''}</span><span>{money(incentive)}</span></div>}
              {showCommission && <div className="flex justify-between text-blue-700 font-bold"><span>Monthly Commission {commissionDetails}</span><span>{money(commission)}</span></div>}
              {showHoliday && <div className="flex justify-between text-blue-700 font-bold"><span>Holiday Pay {holidayDetails}</span><span>{money(holidayPay)}</span></div>}
              {showOvertime && <div className="flex justify-between"><span>Overtime Pay</span><span>{money(overtimePay)}</span></div>}
              <div className="font-bold pt-2">Deductibles</div>
              {!deductGov && !showCADeduct && !showUndertime && !showPersonal && <div>No Deductions</div>}
              {deductGov && <>
                <div className="flex justify-between text-red-600 font-bold"><span>SSS</span><span>{money(employee.sssAmount)}</span></div>
                <div className="flex justify-between text-red-600 font-bold"><span>PhilHealth</span><span>{money(employee.philhealthAmount)}</span></div>
                <div className="flex justify-between text-red-600 font-bold"><span>PAGIBIG</span><span>{money(employee.pagibigAmount)}</span></div>
              </>}
              {showCADeduct && <div className="flex justify-between text-red-600 font-bold"><span>Less: Cash Advance Deduction</span><span>{money(cashAdvance)}</span></div>}
              {showUndertime && <div className="flex justify-between text-red-600 font-bold"><span>Undertime {undertimeAmount} hrs x {money(dayRate / 8)}{!dayRate ? ' — set daily rate on profile' : ''}</span><span>{money((dayRate / 8) * undertimeAmount)}</span></div>}
              {showPersonal && <div className="flex justify-between text-red-600 font-bold"><span>Personal Charge {personalDetails}</span><span>{money(personalCharge)}</span></div>}
              <div className="flex justify-between items-end pt-3">
                <div className="text-xs"><span className="font-bold">Cash Advance Balance</span><br/><b>{money(cashAdvanceBalance)}</b></div>
                <div className="text-right"><div className="text-sm">Total Payout</div><div className="text-4xl font-black border-b-4 border-double">{money(payoutAmount)}</div></div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={() => setReleaseOpen(true)} className="bg-blue-700 text-white px-6 py-2 rounded-lg">Save Salary</button>
          <button onClick={downloadSalary} className="border border-green-700 text-green-700 px-4 py-2 rounded-lg">Download</button>
          <button onClick={printSalary} className="border border-blue-700 text-blue-700 px-4 py-2 rounded-lg">Print</button>
        </div>
      </div>
      {editRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-md grid grid-cols-2 gap-2 text-sm">
            <div className="col-span-2 font-bold">Edit Salary</div>
            {['period', 'payoutType', 'accountNumber', 'net', 'referenceNo', 'days', 'allowance', 'overtime', 'undertime', 'cashAdvance', 'advanceRequest', 'incentive', 'personalCharge', 'personalDetails', 'sss', 'philhealth', 'pagibig'].map((field) => (
              <input key={field} className="border rounded px-2 py-1" placeholder={field} value={editRow[field] || ''} onChange={(e) => setEditRow({ ...editRow, [field]: e.target.value })} />
            ))}
            <button onClick={saveEditRow} className="bg-blue-700 text-white px-4 py-2 rounded">Save</button>
            <button onClick={() => setEditRow(null)} className="border px-4 py-2 rounded">Cancel</button>
          </div>
        </div>
      )}
      {releaseOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-sm">
            <div className="font-bold text-lg mb-2">Released Payment?</div>
            <div className="text-sm mb-2">Amount to transfer: <b>{money(payoutAmount)}</b></div>
            <input className="border rounded w-full px-2 py-1 mb-3" placeholder="Reference No. of payment transfer" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={confirmRelease} className="bg-blue-700 text-white px-4 py-2 rounded">Released</button>
              <button onClick={() => setReleaseOpen(false)} className="border px-4 py-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
