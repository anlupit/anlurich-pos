'use client';

import { useState } from 'react';
import { currentBranch, formatDate, loadSales } from '../../lib/branchData';

export default function DownloadPage() {
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const downloadDaily = async () => {
    const XLSX = await import('xlsx');
    const branch = (currentBranch() || 'branch').toUpperCase();
    const groups = ['Cash', 'GCash', 'Maya', 'Credit / Debit Card', 'Bank Transfer', 'Check'];
    const sales = loadSales().filter((s) => String(s.date || s.dateTime || '').slice(0, 10) === day);
    const header = ['Invoice No.', 'Time', 'Customer Name', 'Ref No./Check No.', 'Net of VAT', '12% VAT', 'Total', 'Amount Tendered', 'Change'];
    const data: any[][] = [[branch], [formatDate(day)], [], header];
    groups.forEach((g) => {
      const list = sales.filter((s) => (s.paymentMethod || 'Cash') === g);
      if (!list.length) return;
      data.push([g, list.reduce((n, s) => n + (Number(s.total) || 0), 0)]);
      list.forEach((s) => {
        const total = Number(s.total) || 0;
        const net = Math.round((total / 1.12) * 100) / 100;
        data.push([s.invoiceNo, s.dateTime || '', s.customerName || '', s.referenceNo || '', net, total - net, total, s.cashTender || 0, s.change || 0]);
      });
    });
    const sheet = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Daily Sales');
    XLSX.writeFile(wb, `daily-sales-${day}.xlsx`);
  };

  const downloadMonthly = async () => {
    const XLSX = await import('xlsx');
    const branch = (currentBranch() || 'branch').toUpperCase();
    const sales = loadSales().filter((s) => String(s.date || s.dateTime || '').slice(0, 7) === month);
    const header = ['Invoice Date', 'Invoice No.', 'Customer Name', 'Payment Type', 'Ref No./Check No.', 'Net of VAT', '12% VAT', 'Total Amount'];
    const data: any[][] = [[branch], [month], [], header];
    sales.forEach((s) => {
      const total = Number(s.total) || 0;
      const net = Math.round((total / 1.12) * 100) / 100;
      data.push([formatDate(s.date), s.invoiceNo, s.customerName || '', s.paymentMethod || 'Cash', s.referenceNo || '', net, total - net, total]);
    });
    const sheet = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Monthly Sales');
    XLSX.writeFile(wb, `monthly-sales-${month}.xlsx`);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-yellow-600 mb-4">Download</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="font-semibold mb-2">Download Daily Sales</div>
          <input type="date" className="w-full border rounded px-3 py-2 mb-3" value={day} onChange={(e) => setDay(e.target.value)} />
          <button onClick={downloadDaily} className="w-full bg-gray-700 text-white py-3 rounded-lg font-bold">Download Daily Sales</button>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="font-semibold mb-2">Download Monthly Sales</div>
          <input type="month" className="w-full border rounded px-3 py-2 mb-3" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button onClick={downloadMonthly} className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold">Download Monthly Sales</button>
        </div>
      </div>
    </div>
  );
}
