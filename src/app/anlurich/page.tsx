'use client';

import { useState, useEffect } from 'react';
import { loadProducts, Product } from '../../lib/products';

type Sale = {
  id: string;
  date: string;
  items: { name: string; price: number; qty: number }[];
  total: number;
  paymentMethod: string;
};

const SALES_KEY = 'anlurich-sales';

export default function AnlurichDashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const today = new Date().toISOString().split('T')[0];
  const month = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    const raw = localStorage.getItem(SALES_KEY);
    if (raw) setSales(JSON.parse(raw));
    setProducts(loadProducts());
  }, []);

  const dailySales = sales.filter((s) => s.date.startsWith(today));
  const monthlySales = sales.filter((s) => s.date.startsWith(month));
  const dailyTotal = dailySales.reduce((sum, s) => sum + s.total, 0);
  const monthlyTotal = monthlySales.reduce((sum, s) => sum + s.total, 0);

  // Top 10 saleable (by qty sold)
  const itemTotals: Record<string, number> = {};
  sales.forEach((s) => s.items.forEach((i) => {
    itemTotals[i.name] = (itemTotals[i.name] || 0) + i.qty;
  }));
  const top10 = Object.entries(itemTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Low stock (quantity < 5 if available, else placeholder)
  const lowStock = products.filter((p) => (p as any).quantity != null && (p as any).quantity < 5).slice(0, 10);

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">ANLURICH OPC</h1>
        <p className="text-gray-500">Auto Parts Inventory System</p>
      </div>

      {/* Sales Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-5">
          <div className="text-sm text-gray-500">Daily Sales</div>
          <div className="text-3xl font-bold text-green-600">₱{dailyTotal.toLocaleString()}</div>
          <div className="text-sm text-gray-400">{dailySales.length} transactions today</div>
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <div className="text-sm text-gray-500">Monthly Sales</div>
          <div className="text-3xl font-bold text-blue-600">₱{monthlyTotal.toLocaleString()}</div>
          <div className="text-sm text-gray-400">{monthlySales.length} transactions this month</div>
        </div>
      </div>

      {/* Middle Navigation Buttons */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <a href="/pos" className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 shadow">POS</a>
        <a href="/product-search" className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-green-700 shadow">Product Search</a>
        <a href="/invoice-search" className="bg-orange-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-orange-700 shadow">Invoice Search</a>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold mb-3">Top 10 Saleable Items</h2>
          {top10.length === 0 ? (
            <p className="text-gray-400 text-sm">No sales data yet</p>
          ) : (
            <ol className="text-sm space-y-1">
              {top10.map(([name, qty], i) => (
                <li key={name} className="flex justify-between border-b py-1">
                  <span>{i + 1}. {name}</span>
                  <span className="font-medium">{qty} sold</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold mb-3 text-red-600">Low Stock Items</h2>
          {lowStock.length === 0 ? (
            <p className="text-gray-400 text-sm">No low stock items</p>
          ) : (
            <ul className="text-sm space-y-1">
              {lowStock.map((p) => (
                <li key={p.id} className="flex justify-between border-b py-1">
                  <span>{p.partNumber} — {p.name}</span>
                  <span className="text-red-600">{(p as any).quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
