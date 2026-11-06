'use client';

import { useState, useEffect } from 'react';

type SaleItem = {
  id: string;
  partNumber: string;
  name: string;
  price: number;
  qty: number;
};

type Sale = {
  id: string;
  date: string;
  items: SaleItem[];
  total: number;
  paymentMethod: string;
};

const SALES_KEY = 'anlurich-sales';

export default function DashboardPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const raw = localStorage.getItem(SALES_KEY);
    if (raw) setSales(JSON.parse(raw));
  }, []);

  const todaySales = sales.filter((s) => s.date.startsWith(selectedDate));
  const monthSales = sales.filter((s) => s.date.startsWith(selectedMonth));

  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);
  const monthTotal = monthSales.reduce((sum, s) => sum + s.total, 0);
  const todayCount = todaySales.length;
  const monthCount = monthSales.length;

  const todayByPayment = todaySales.reduce((acc, s) => {
    acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.total;
    return acc;
  }, {} as Record<string, number>);

  const monthByPayment = monthSales.reduce((acc, s) => {
    acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.total;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <svg width="48" height="48" viewBox="0 0 80 80">
              <circle cx="32" cy="40" r="22" fill="none" stroke="#1e40af" strokeWidth="3" />
              <circle cx="32" cy="40" r="8" fill="#1e40af" />
              <circle cx="32" cy="40" r="4" fill="white" />
              <rect x="52" y="28" width="14" height="20" rx="2" fill="#dc2626" />
              <rect x="54" y="22" width="10" height="8" rx="1" fill="#991b1b" />
              <rect x="57" y="48" width="4" height="8" fill="#374151" />
            </svg>
            <div>
              <h1 className="text-2xl font-bold">APIS <span className="text-base font-normal text-gray-600">(Auto-Parts Inventory System)</span></h1>
              <p className="text-gray-500">by Anlu 😊</p>
            </div>
          </div>
          <a href="/" className="text-blue-600 hover:underline">← Home</a>
        </div>

        {/* Daily Sales */}
        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <div className="flex flex-wrap justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Daily Sales</h2>
            <input
              type="date"
              className="border rounded-lg px-3 py-2"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Transactions</div>
              <div className="text-2xl font-bold">{todayCount}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Total Sales</div>
              <div className="text-2xl font-bold text-green-600">₱{todayTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Average Ticket</div>
              <div className="text-2xl font-bold">
                ₱{todayCount ? Math.round(todayTotal / todayCount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0'}
              </div>
            </div>
          </div>
          {Object.keys(todayByPayment).length > 0 && (
            <div className="text-sm">
              <strong>By Payment:</strong>{' '}
              {Object.entries(todayByPayment).map(([method, amount]) => (
                <span key={method} className="mr-4">{method}: ₱{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              ))}
            </div>
          )}
          {todaySales.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Receipt</th>
                    <th className="text-left p-2">Items</th>
                    <th className="text-right p-2">Total</th>
                    <th className="text-left p-2">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {todaySales.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="p-2">{new Date(s.date).toLocaleTimeString()}</td>
                      <td className="p-2">{s.id.slice(-6)}</td>
                      <td className="p-2">{s.items.reduce((n, i) => n + i.qty, 0)}</td>
                      <td className="p-2 text-right font-medium">₱{s.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-2">{s.paymentMethod}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {todaySales.length === 0 && <p className="text-gray-500 mt-4">No sales for this date.</p>}
        </div>

        {/* Monthly Sales */}
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex flex-wrap justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Monthly Sales</h2>
            <input
              type="month"
              className="border rounded-lg px-3 py-2"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Transactions</div>
              <div className="text-2xl font-bold">{monthCount}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Total Sales</div>
              <div className="text-2xl font-bold text-green-600">₱{monthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Average Ticket</div>
              <div className="text-2xl font-bold">
                ₱{monthCount ? Math.round(monthTotal / monthCount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0'}
              </div>
            </div>
          </div>
          {Object.keys(monthByPayment).length > 0 && (
            <div className="text-sm">
              <strong>By Payment:</strong>{' '}
              {Object.entries(monthByPayment).map(([method, amount]) => (
                <span key={method} className="mr-4">{method}: ₱{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              ))}
            </div>
          )}
          {monthSales.length === 0 && <p className="text-gray-500 mt-4">No sales for this month.</p>}
        </div>
      </div>
    </div>
  );
}
