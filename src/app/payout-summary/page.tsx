'use client';

import { useEffect, useState } from 'react';

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const order = ['Gcash', 'Gotym', 'Bank Transfer', 'Cash'];

export default function PayoutSummaryPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const branch = localStorage.getItem('anlurich-branch') || '';
    Promise.all([
      fetch(`/api/records?table=employee_profiles&branch=${branch}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
      fetch(`/api/records?table=employee_salaries&branch=${branch}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
    ]).then(([employees, salaries]) => {
      const latest = new Map<string, any>();
      (Array.isArray(salaries) ? salaries : []).forEach((row: any) => {
        const key = String(row.employeeName || '').toLowerCase();
        if (!latest.has(key)) latest.set(key, row);
      });
      const list = (Array.isArray(employees) ? employees : []).filter((e) => e.name).map((e) => ({
        group: e.payoutType || 'Cash',
        name: e.name,
        position: e.position || '',
        account: e.accountNumber || '',
        net: Number(latest.get(String(e.name || '').toLowerCase())?.net || 0),
      })).sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || a.name.localeCompare(b.name));
      setRows(list);
    });
  }, []);

  const download = async () => {
    const XLSX = await import('xlsx');
    const data = rows.map((r) => ({ Group: r.group, 'Employee Name': r.name, Position: r.position, 'Account No of Payout': r.account, 'Net Total of Payout': r.net }));
    const sheet = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Payout Summary');
    XLSX.writeFile(wb, 'payout-summary.xlsx');
  };

  return (
    <div className="p-4">
      <button onClick={() => (window.location.href = '/employee-salary')} className="text-sm text-blue-600 mb-3">← Back to Employee Dashboard</button>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-[#1e3a8a]">AUTO PARTS INVENTORY SYSTEM</h1>
          <div className="text-yellow-600 font-bold">Payout Summary</div>
        </div>
        <div className="flex gap-2">
          <button onClick={download} className="bg-green-700 text-white px-4 py-2 rounded-lg">Download</button>
          <button onClick={() => window.print()} className="bg-blue-700 text-white px-4 py-2 rounded-lg">Print</button>
        </div>
      </div>
      {order.map((group) => {
        const items = rows.filter((r) => r.group === group);
        if (!items.length) return null;
        return (
          <div key={group} className="bg-white rounded-xl shadow mb-4 overflow-x-auto">
            <div className="bg-[#1e3a8a] text-white font-bold px-3 py-2">{group}</div>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-100"><th className="p-2 text-left">Employee Name</th><th className="p-2 text-left">Position</th><th className="p-2 text-left">Account No of Payout</th><th className="p-2 text-right">Net Total of Payout</th></tr></thead>
              <tbody>
                {items.map((r) => <tr key={r.name} className="border-t"><td className="p-2">{r.name}</td><td className="p-2">{r.position}</td><td className="p-2">{r.account}</td><td className="p-2 text-right">{money(r.net)}</td></tr>)}
                <tr className="border-t font-bold"><td className="p-2" colSpan={3}>Total</td><td className="p-2 text-right">{money(items.reduce((n, r) => n + r.net, 0))}</td></tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
