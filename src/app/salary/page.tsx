'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const BRANCHES = [
  { id: 'anlurich', name: 'ANLURICH OPC', location: 'Silang Cavite', pay: 'Weekly' },
  { id: 'avenders', name: 'Avenders Auto Parts', location: 'Sta.Rosa Laguna', pay: 'Weekly' },
  { id: 'dasma', name: 'Dasma Auto Parts', location: 'Dasma Cavite', pay: 'Weekly' },
  { id: 'lipa', name: 'Lipa Auto Parts', location: 'Lipa Batangas', pay: 'Weekly' },
  { id: 'sezan', name: 'Sezan Baliwag Auto Parts', location: 'Baliwag Bulacan', pay: 'Weekly' },
  { id: 'timitsu', name: 'Timitsu Baliwag Auto Parts', location: 'Baliwag Bulacan', pay: 'Weekly' },
];

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SalaryHome() {
  const router = useRouter();
  const [totals, setTotals] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/data', { cache: 'no-store' });
        const rows: { key: string; value: string }[] = res.ok ? await res.json() : [];
        const next: Record<string, number> = {};
        BRANCHES.forEach((b) => {
          const row = rows.find((r) => r.key === `anlurich-expenses-${b.id}`);
          const list = row?.value ? JSON.parse(row.value) : [];
          next[b.id] = list.filter((x: any) => x.category === 'Salaries and Wages').reduce((s: number, x: any) => s + (Number(x.amount) || 0), 0);
        });
        setTotals(next);
      } catch {}
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <button onClick={() => (window.location.href = '/')} className="text-sm text-blue-600 mb-4">← Back to Main Page</button>
      <h1 className="text-2xl font-bold mb-1">Salary For Employee System</h1>
      <p className="text-sm text-gray-500 mb-6">Weekly salary is posted separately into Company Expense as Salaries and Wages</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {BRANCHES.map((b) => (
          <button key={b.id} onClick={() => router.push(`/salary/${b.id}`)} className="bg-white rounded-xl shadow p-5 text-left hover:shadow-md">
            <div className="font-bold text-lg">{b.name}</div>
            <div className="text-sm text-gray-500">{b.location}</div>
            <div className="mt-2 text-xs bg-green-100 text-green-700 inline-block px-2 py-1 rounded">{b.pay} salary</div>
            <div className="mt-3 text-sm">Salaries and Wages: <b>{money(totals[b.id] || 0)}</b></div>
          </button>
        ))}
      </div>
    </div>
  );
}
