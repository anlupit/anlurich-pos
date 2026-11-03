'use client';

import { useEffect, useState } from 'react';
import { loadSales, loadAllStock, formatDate } from '../../lib/branchData';

const BRANCHES = [
  { id: 'anlurich', name: 'ANLURICH OPC' },
  { id: 'dasma', name: 'Dasma Auto Parts' },
  { id: 'sezan', name: 'Sezan' },
  { id: 'timitsu', name: 'Timitsu' },
  { id: 'avenders', name: 'Avenders' },
  { id: 'lipa', name: 'Lipa Auto Parts' },
];

export default function OwnerReportPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [stock, setStock] = useState<Record<string, Record<string, { qty: number }>>>({});

  useEffect(() => {
    const all: any[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('anlurich-sales-')) {
        try { all.push(...JSON.parse(localStorage.getItem(key) || '[]')); } catch {}
      }
    }
    setSales(all);
    setStock(loadAllStock());
    try { setProducts(JSON.parse(localStorage.getItem('anlurich-products') || '[]')); } catch {}
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const year = today.slice(0, 4);
  const of = (s: any) => String(s.date || s.dateTime || '');

  const sum = (list: any[]) => list.reduce((n, s) => n + (s.total || 0), 0);
  const branchRows = BRANCHES.map((b) => {
    const bSales = sales.filter((s) => s.branch === b.id);
    return {
      ...b,
      today: sum(bSales.filter((s) => of(s).slice(0, 10) === today)),
      month: sum(bSales.filter((s) => of(s).startsWith(month))),
      year: sum(bSales.filter((s) => of(s).startsWith(year))),
    };
  });
  const grand = {
    today: branchRows.reduce((n, b) => n + b.today, 0),
    month: branchRows.reduce((n, b) => n + b.month, 0),
    year: branchRows.reduce((n, b) => n + b.year, 0),
  };

  const yearSales = sales.filter((s) => of(s).startsWith(year));
  const movers: Record<string, { partNumber: string; description: string; brand: string; qty: number; value: number; branches: Set<string> }> = {};
  yearSales.forEach((s) => {
    (s.items || s.lines || []).forEach((item: any) => {
      const key = (item.partNumber || item.description || 'UNKNOWN').toUpperCase();
      if (!movers[key]) movers[key] = { partNumber: item.partNumber || '—', description: item.description || '', brand: item.brand || '', qty: 0, value: 0, branches: new Set() };
      movers[key].qty += Number(item.qty) || 0;
      movers[key].value += Number(item.total) || (Number(item.qty) || 0) * (Number(item.price) || 0);
      if (s.branch) movers[key].branches.add(s.branch);
    });
  });
  const ranked = Object.values(movers).sort((a, b) => b.qty - a.qty);
  const fast = ranked.slice(0, 20);
  const slow = ranked.filter((m) => m.qty <= 2).slice(0, 20);

  const stockQty = (part: string) => {
    let qty = 0;
    Object.values(stock).forEach((branchStock) => {
      Object.values(branchStock || {}).forEach((s: any) => {
        if (String(s.partNumber || '').toUpperCase() === part.toUpperCase()) qty += s.qty || 0;
      });
    });
    return qty;
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-yellow-600 mb-1">Owner Report</h1>
      <div className="text-xs text-gray-500 mb-4">All branches — {formatDate(today)}</div>

      <div className="bg-white rounded-xl shadow p-4 mb-4 overflow-x-auto">
        <h2 className="font-semibold mb-2">Sales</h2>
        <table className="w-full text-sm">
          <thead className="bg-teal-500 text-white">
            <tr>
              <th className="text-left p-2">Branch</th>
              <th className="text-right p-2">Today</th>
              <th className="text-right p-2">This Month</th>
              <th className="text-right p-2">Year to Date</th>
            </tr>
          </thead>
          <tbody>
            {branchRows.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-2">{b.name}</td>
                <td className="p-2 text-right">₱{b.today.toLocaleString()}</td>
                <td className="p-2 text-right">₱{b.month.toLocaleString()}</td>
                <td className="p-2 text-right">₱{b.year.toLocaleString()}</td>
              </tr>
            ))}
            <tr className="border-t-2 font-bold bg-gray-50">
              <td className="p-2">GRAND TOTAL</td>
              <td className="p-2 text-right">₱{grand.today.toLocaleString()}</td>
              <td className="p-2 text-right">₱{grand.month.toLocaleString()}</td>
              <td className="p-2 text-right">₱{grand.year.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4 overflow-x-auto">
        <h2 className="font-semibold mb-1">Fast Moving — invest more</h2>
        <div className="text-xs text-gray-500 mb-2">Top 20 by quantity sold this year</div>
        <table className="w-full text-sm">
          <thead className="bg-green-600 text-white">
            <tr>
              <th className="text-left p-2">Part Number</th>
              <th className="text-left p-2">Description</th>
              <th className="text-left p-2">Brand</th>
              <th className="text-center p-2">Qty Sold</th>
              <th className="text-right p-2">Sales Value</th>
              <th className="text-left p-2">Branches</th>
            </tr>
          </thead>
          <tbody>
            {fast.map((m) => (
              <tr key={m.partNumber + m.description} className="border-t">
                <td className="p-2 font-medium">{m.partNumber}</td>
                <td className="p-2">{m.description}</td>
                <td className="p-2">{m.brand || '—'}</td>
                <td className="p-2 text-center font-bold">{m.qty}</td>
                <td className="p-2 text-right">₱{m.value.toLocaleString()}</td>
                <td className="p-2 text-xs">{[...m.branches].join(', ')}</td>
              </tr>
            ))}
            {fast.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400">No sales this year yet</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow p-4 overflow-x-auto">
        <h2 className="font-semibold mb-1">Slow Moving — invest less</h2>
        <div className="text-xs text-gray-500 mb-2">Sold 2 or fewer times this year</div>
        <table className="w-full text-sm">
          <thead className="bg-orange-600 text-white">
            <tr>
              <th className="text-left p-2">Part Number</th>
              <th className="text-left p-2">Description</th>
              <th className="text-left p-2">Brand</th>
              <th className="text-center p-2">Qty Sold</th>
              <th className="text-right p-2">Sales Value</th>
            </tr>
          </thead>
          <tbody>
            {slow.map((m) => (
              <tr key={m.partNumber + m.description} className="border-t">
                <td className="p-2">{m.partNumber}</td>
                <td className="p-2">{m.description}</td>
                <td className="p-2">{m.brand || '—'}</td>
                <td className="p-2 text-center">{m.qty}</td>
                <td className="p-2 text-right">₱{m.value.toLocaleString()}</td>
              </tr>
            ))}
            {slow.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">No slow movers yet</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mt-4 overflow-x-auto">
        <h2 className="font-semibold mb-2">Stock Across All Branches</h2>
        <table className="w-full text-sm">
          <thead className="bg-blue-700 text-white">
            <tr>
              <th className="text-left p-2">Part Number</th>
              <th className="text-left p-2">Name</th>
              {BRANCHES.map((b) => <th key={b.id} className="text-center p-2">{b.name.split(' ')[0]}</th>)}
              <th className="text-center p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const byBranch = BRANCHES.map((b) => stock[b.id]?.[p.id]?.qty || 0);
              const total = byBranch.reduce((n, q) => n + q, 0);
              if (total === 0) return null;
              return (
                <tr key={p.id} className="border-t">
                  <td className="p-2 font-medium">{p.partNumber}</td>
                  <td className="p-2">{p.name}</td>
                  {byBranch.map((q, i) => <td key={i} className="p-2 text-center">{q}</td>)}
                  <td className="p-2 text-center font-bold">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
