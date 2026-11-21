'use client';

import { useEffect, useState } from 'react';
import { currentBranch } from '../../lib/branchData';

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BoschDashboard() {
  const [branch, setBranch] = useState('');
  const [sales, setSales] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    const b = currentBranch();
    setBranch(b);
    if (!['anlurich', 'sezan', 'admin'].includes(b)) return;
    Promise.all([
      fetch('/api/records?table=bosch_sales', { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
      fetch('/api/records?table=bosch_products', { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
      fetch('/api/records?table=bosch_invoices', { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
    ]).then(([s, p, i]) => {
      setSales(Array.isArray(s) ? s.filter((x) => !x.branch || x.branch === b || b === 'admin') : []);
      setTools(Array.isArray(p) ? p : []);
      setInvoices(Array.isArray(i) ? i : []);
    });
  }, []);

  if (branch && !['anlurich', 'sezan', 'admin'].includes(branch)) {
    return <div className="p-6">Bosch is only for Anlurich and Baliwag Auto Parts.</div>;
  }

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const dayOf = (s: any) => String(s.date || s.createdAt || '').slice(0, 10);
  const todaySales = sales.filter((s) => dayOf(s) === today);
  const monthSales = sales.filter((s) => dayOf(s).startsWith(month));
  const todayTotal = todaySales.reduce((n, s) => n + Number(s.total || 0), 0);
  const monthTotal = monthSales.reduce((n, s) => n + Number(s.total || 0), 0);
  const stockValue = tools.reduce((n, p) => n + Number(p.qty || 0) * Number(p.costPrice || 0), 0);
  const payables = invoices.filter((i) => !i.paid);
  const payableTotal = payables.reduce((n, i) => n + Number(i.total || i.grandTotal || 0), 0);

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-black text-[#002366] mb-1">Bosch Dashboard</h1>
      <div className="text-sm text-gray-500 mb-4">{(branch || '').toUpperCase()} · Power tools only. Separate from auto parts.</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div className="bg-white rounded-xl p-4 shadow"><div className="text-sm text-gray-500">Today Bosch Sales</div><div className="text-2xl font-black">{money(todayTotal)}</div></div>
        <div className="bg-white rounded-xl p-4 shadow"><div className="text-sm text-gray-500">Month Bosch Sales</div><div className="text-2xl font-black">{money(monthTotal)}</div></div>
        <div className="bg-white rounded-xl p-4 shadow"><div className="text-sm text-gray-500">Bosch Stock Value</div><div className="text-2xl font-black">{money(stockValue)}</div></div>
        <div className="bg-white rounded-xl p-4 shadow"><div className="text-sm text-gray-500">Bosch Payables</div><div className="text-2xl font-black">{money(payableTotal)}</div></div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-3 shadow">
          <div className="font-bold mb-2">Bosch Inventory</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-100"><tr><th className="p-2 text-left">Part No.</th><th className="p-2 text-left">Name</th><th className="p-2 text-right">Qty</th></tr></thead>
            <tbody>
              {tools.slice(0, 100).map((p) => (
                <tr key={p.id} className="border-t"><td className="p-2">{p.partNumber}</td><td className="p-2">{p.name}</td><td className="p-2 text-right font-bold">{p.qty || 0}</td></tr>
              ))}
              {tools.length === 0 && <tr><td colSpan={3} className="p-3 text-gray-400">No Bosch products yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl p-3 shadow">
          <div className="font-bold mb-2">Bosch Payables</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-100"><tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Invoice</th><th className="p-2 text-left">Supplier</th><th className="p-2 text-right">Amount</th></tr></thead>
            <tbody>
              {payables.slice(0, 100).map((i) => (
                <tr key={i.id} className="border-t"><td className="p-2">{String(i.date || '').slice(0, 10)}</td><td className="p-2">{i.invoiceNo}</td><td className="p-2">{i.supplier}</td><td className="p-2 text-right">{money(i.total || 0)}</td></tr>
              ))}
              {payables.length === 0 && <tr><td colSpan={4} className="p-3 text-gray-400">No unpaid Bosch invoices.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
