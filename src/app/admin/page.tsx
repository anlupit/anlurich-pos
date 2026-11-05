'use client';

import { useState, useEffect } from 'react';

const BRANCHES = [
  { id: 'anlurich', name: 'ANLURICH OPC' },
  { id: 'dasma', name: 'Dasma Auto Parts' },
  { id: 'sezan', name: 'Sezan' },
  { id: 'timitsu', name: 'Timitsu' },
  { id: 'avenders', name: 'Avenders' },
  { id: 'lipa', name: 'Lipa Auto Parts' },
];

export default function AdminDashboard() {
  const [sales, setSales] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  const month = new Date().toISOString().slice(0, 7);
  const year = new Date().getFullYear().toString();

  useEffect(() => {
    try {
      setSales(JSON.parse(localStorage.getItem('anlurich-sales') || '[]'));
      setInvoices(JSON.parse(localStorage.getItem('anlurich-supplier-invoices') || '[]'));
      setRequests(JSON.parse(localStorage.getItem('anlurich-stock-requests') || '[]'));
    } catch {}
  }, []);

  const branchStats = BRANCHES.map((b) => {
    const bSales = sales.filter((s) => s.branch === b.id);
    const monthly = bSales.filter((s) => s.date?.startsWith(month)).reduce((sum, s) => sum + (s.total || 0), 0);
    const ytd = bSales.filter((s) => s.date?.startsWith(year)).reduce((sum, s) => sum + (s.total || 0), 0);
    return { ...b, monthly, ytd };
  });

  const grandMonthly = branchStats.reduce((sum, b) => sum + b.monthly, 0);
  const grandYTD = branchStats.reduce((sum, b) => sum + b.ytd, 0);
  const monthlyPurchases = invoices.filter((i) => i.invoiceDate?.startsWith(month)).reduce((sum, i) => sum + (i.grandTotal || 0), 0);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-1">ADMIN Dashboard</h1>
      <a href="/users" className="inline-block mb-4 bg-black text-white px-4 py-2 rounded-lg text-sm">User and Password Manager</a>
      <p className="text-gray-500 mb-4">APIS — Auto Parts Inventory System</p>
      <a href="/owner-report" className="inline-block bg-blue-700 text-white px-5 py-2 rounded-lg mb-6">Owner Report</a>

      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-semibold mb-3">Branch Sales</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr><th className="text-left p-2">Branch</th><th className="text-right p-2">Monthly</th><th className="text-right p-2">Year-to-Date</th></tr>
          </thead>
          <tbody>
            {branchStats.map((b) => (
              <tr key={b.id} className="border-t"><td className="p-2">{b.name}</td><td className="p-2 text-right">₱{b.monthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td className="p-2 text-right">₱{b.ytd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
            ))}
            <tr className="border-t-2 font-bold bg-gray-50"><td className="p-2">GRAND TOTAL</td><td className="p-2 text-right">₱{grandMonthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td className="p-2 text-right">₱{grandYTD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-semibold mb-2">Monthly Purchases</h2>
        <div className="text-3xl font-bold text-orange-600">₱{monthlyPurchases.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="font-semibold mb-3">Stock Requests ({requests.length})</h2>
        {requests.length === 0 ? <p className="text-gray-400 text-sm">No stock requests</p> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100"><tr><th className="text-left p-2">Branch</th><th className="text-left p-2">Part</th><th className="text-center p-2">Qty</th><th className="text-left p-2">Status</th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t"><td className="p-2">{r.branch}</td><td className="p-2">{r.partNumber}</td><td className="p-2 text-center">{r.qty}</td><td className="p-2">{r.status}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
