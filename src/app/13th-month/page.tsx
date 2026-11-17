'use client';

import { useEffect, useState } from 'react';

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ThirteenthMonthPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const branch = localStorage.getItem('anlurich-branch') || '';
    Promise.all([
      fetch(`/api/records?table=employee_profiles&branch=${branch}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
      fetch(`/api/records?table=employee_salaries&branch=${branch}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
    ]).then(([employees, salaries]) => {
      const list = (Array.isArray(employees) ? employees : []).filter((e) => e.name && e.status !== 'terminated').map((e) => {
        const mine = (Array.isArray(salaries) ? salaries : []).filter((s: any) => String(s.employeeName || '').toLowerCase() === String(e.name).toLowerCase() && String(s.period || s.date || '').includes(year));
        const days = mine.reduce((n: number, s: any) => n + Number(s.daysPresent || 0), 0);
        const earned = mine.reduce((n: number, s: any) => n + Number(s.basic || 0), 0);
        return { id: e.id, name: e.name, position: e.position || '', days, basic: earned, thirteenth: earned / 12, include: false };
      });
      setRows(list);
    });
  }, [year]);

  const download = async () => {
    const XLSX = await import('xlsx');
    const data = rows.map((r) => ({ Year: year, 'Employee Name': r.name, Position: r.position, 'Days Present': r.days, 'Total Basic Earned': r.basic, '13th Month': r.thirteenth, 'Include in Payout': r.include ? 'Yes' : 'No' }));
    const sheet = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, '13th Month');
    XLSX.writeFile(wb, `13th-month-${year}.xlsx`);
  };

  return (
    <div className="p-4">
      <button onClick={() => (window.location.href = '/employee-salary')} className="text-sm text-blue-600 mb-3">← Back to Employee Salary</button>
      <h1 className="text-2xl font-black text-[#1e3a8a]">13th Month Computation</h1>
      <label className="text-sm">Year <input className="border rounded px-2 py-1 ml-2" value={year} onChange={(e) => setYear(e.target.value)} /></label>
      <div className="flex gap-2 my-3">
        <button onClick={download} className="bg-green-700 text-white px-4 py-2 rounded-lg">Download</button>
        <button onClick={() => window.print()} className="bg-blue-700 text-white px-4 py-2 rounded-lg">Print</button>
      </div>
      <table className="w-full text-sm bg-white rounded-xl shadow">
        <thead><tr className="bg-gray-100"><th className="p-2 text-left">Employee Name</th><th className="p-2 text-left">Position</th><th className="p-2 text-right">Days Present</th><th className="p-2 text-right">Total Basic Earned</th><th className="p-2 text-right">13th Month</th><th className="p-2 text-center">Include in Payout</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.name}</td>
              <td className="p-2">{r.position}</td>
              <td className="p-2 text-right">{r.days}</td>
              <td className="p-2 text-right">{money(r.basic)}</td>
              <td className="p-2 text-right font-bold">{money(r.thirteenth)}</td>
              <td className="p-2 text-center"><input type="checkbox" checked={r.include} onChange={(e) => setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, include: e.target.checked } : x))} /></td>
            </tr>
          ))}
          <tr className="border-t font-black"><td className="p-2" colSpan={4}>Total</td><td className="p-2 text-right">{money(rows.reduce((n, r) => n + r.thirteenth, 0))}</td><td /></tr>
        </tbody>
      </table>
    </div>
  );
}
