'use client';

import { useEffect, useState } from 'react';
import { loadSales, loadInvoices, formatDate } from '../../lib/branchData';

export default function PrintReportsPage() {
  const [report, setReport] = useState<'sales' | 'purchases' | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [grand, setGrand] = useState(0);
  const [pick, setPick] = useState<'sales' | 'purchases' | 'supplier' | null>(null);
  const [salesDate, setSalesDate] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(new Date().toISOString().slice(5, 7));
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [logo, setLogo] = useState('');

  useEffect(() => {
    setLogo(localStorage.getItem('anlurich-index-logo') || '/logo.png');
  }, []);

  const runDailySales = () => {
    const sales = loadSales().filter((s) => (s.date || s.dateTime || '').slice(0, 10) === salesDate);
    const list: any[] = [];
    let total = 0;
    sales.forEach((s) => {
      (s.items || s.lines || []).forEach((item: any) => {
        const lineTotal = item.total || (item.qty || 0) * (item.price || 0);
        total += lineTotal;
        list.push({
          invoiceNo: s.invoiceNo,
          partNumber: item.partNumber,
          description: item.description,
          qty: item.qty,
          unit: item.unit,
          price: item.price,
          total: lineTotal,
        });
      });
    });
    setRows(list);
    setGrand(total);
    setTitle(`Daily Sales — ${formatDate(salesDate)}`);
    setReport('sales');
    setPick(null);
  };

  const runMonthlyPurchases = () => {
    const ym = `${year}-${month}`;
    const invoices = loadInvoices().filter((i) => (i.invoiceDate || i.createdAt || '').slice(0, 7) === ym);
    const list = invoices.map((i) => {
      const due = i.dueDate ? new Date(i.dueDate) : null;
      let status = i.paid ? 'Paid' : 'Unpaid';
      if (!i.paid && due && due < new Date()) status = 'Overdue';
      return {
        date: formatDate(i.invoiceDate),
        supplier: i.supplierName,
        invoiceNo: i.invoiceNumber,
        total: i.grandTotal,
        status,
      };
    });
    setRows(list);
    setGrand(list.reduce((sum, r) => sum + (r.total || 0), 0));
    const label = new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    setTitle(`Monthly Purchases — ${label}`);
    setReport('purchases');
    setPick(null);
  };

  const runSupplierInvoice = () => {
    const ym = `${year}-${month}`;
    const invoices = loadInvoices().filter((i) => (i.invoiceDate || i.createdAt || '').slice(0, 7) === ym);
    const money = (n: number) => Number(n || 0);
    const mapped = invoices.map((i) => {
      const total = money(i.grandTotal);
      const net = Math.round((total / 1.12) * 100) / 100;
      const vat = Math.round((total - net) * 100) / 100;
      const type = String(i.invoiceType || '').toLowerCase().includes('dr') ? 'DR Invoice' : 'Sales Invoice';
      return { date: i.invoiceDate || '', dateLabel: formatDate(i.invoiceDate), invoiceNo: i.invoiceNumber, supplier: i.supplierName, net, vat, total, type };
    });
    mapped.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'Sales Invoice' ? -1 : 1;
      return String(b.date).localeCompare(String(a.date));
    });
    setRows(mapped);
    setGrand(mapped.reduce((sum, r) => sum + r.total, 0));
    const label = new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    setTitle(`Monthly Supplier Invoice — ${label}`);
    setReport('supplier');
    setPick(null);
  };

  const downloadSupplier = async () => {
    const XLSX = await import('xlsx');
    const data = rows.map((r) => ({
      Type: r.type,
      Date: r.dateLabel,
      'Invoice No': r.invoiceNo,
      'Supplier Name': r.supplier,
      'Net of VAT': Number(r.net.toFixed(2)),
      '12% VAT': Number(r.vat.toFixed(2)),
      'Total Amount': Number(r.total.toFixed(2)),
    }));
    data.push({ Type: '', Date: '', 'Invoice No': '', 'Supplier Name': 'GRAND TOTAL', 'Net of VAT': '', '12% VAT': '', 'Total Amount': Number(grand.toFixed(2)) } as any);
    const sheet = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Supplier Invoices');
    XLSX.writeFile(wb, 'monthly-supplier-invoice.xlsx');
  };

  const clearAll = () => {
    setReport(null);
    setRows([]);
    setTitle('');
    setGrand(0);
    setPick(null);
    setSalesDate(new Date().toISOString().slice(0, 10));
    setMonth(new Date().toISOString().slice(5, 7));
    setYear(new Date().getFullYear().toString());
  };

  const print = () => window.print();

  return (
    <div className="p-4">
      <div className="print:hidden">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            {logo ? <img src={logo} alt="Logo" className="w-14 h-14 object-contain" /> : null}
            <h1 className="text-xl md:text-2xl font-black tracking-wide text-[#1e3a8a]">AUTO PARTS INVENTORY SYSTEM</h1>
          </div>
          <div className="text-2xl md:text-4xl font-black text-gray-800">{formatDate(new Date().toISOString().slice(0, 10))}</div>
        </div>
        <div className="border-b-2 border-black mb-3" />
        <h2 className="text-xl font-bold text-yellow-600 mb-4">Print Reports</h2>
        <div className="flex gap-3">
          <button onClick={() => setPick('sales')} className="bg-blue-700 text-white px-5 py-3 rounded-lg font-medium">Daily Sales</button>
          <button onClick={() => setPick('purchases')} className="bg-teal-600 text-white px-5 py-3 rounded-lg font-medium">Monthly Purchases</button>
          <button onClick={() => setPick('supplier')} className="bg-orange-600 text-white px-5 py-3 rounded-lg font-medium">Monthly Supplier Invoice</button>
        </div>
      </div>

      {pick === 'sales' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm">
            <div className="font-bold mb-3">Choose sales date</div>
            <input type="date" className="w-full border rounded px-3 py-2 mb-4" value={salesDate} onChange={(e) => setSalesDate(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => setPick(null)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg">Cancel</button>
              <button onClick={runDailySales} className="flex-1 bg-blue-700 text-white py-2 rounded-lg">Preview</button>
            </div>
          </div>
        </div>
      )}

      {pick === 'purchases' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm">
            <div className="font-bold mb-3">Choose month and year</div>
            <div className="flex gap-2 mb-4">
              <select className="flex-1 border rounded px-3 py-2" value={month} onChange={(e) => setMonth(e.target.value)}>
                {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m) => (
                  <option key={m} value={m}>{new Date(`2026-${m}-01`).toLocaleString('en-US', { month: 'short' })}</option>
                ))}
              </select>
              <select className="flex-1 border rounded px-3 py-2" value={year} onChange={(e) => setYear(e.target.value)}>
                {Array.from({ length: 6 }, (_, i) => (new Date().getFullYear() - i).toString()).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPick(null)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg">Cancel</button>
              <button onClick={runMonthlyPurchases} className="flex-1 bg-teal-600 text-white py-2 rounded-lg">Preview</button>
            </div>
          </div>
        </div>
      )}

      {pick === 'supplier' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm">
            <div className="font-bold mb-3">Choose month and year</div>
            <div className="flex gap-2 mb-4">
              <select className="flex-1 border rounded px-3 py-2" value={month} onChange={(e) => setMonth(e.target.value)}>
                {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m) => (
                  <option key={m} value={m}>{new Date(`2026-${m}-01`).toLocaleString('en-US', { month: 'short' })}</option>
                ))}
              </select>
              <select className="flex-1 border rounded px-3 py-2" value={year} onChange={(e) => setYear(e.target.value)}>
                {Array.from({ length: 6 }, (_, i) => (new Date().getFullYear() - i).toString()).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPick(null)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg">Cancel</button>
              <button onClick={runSupplierInvoice} className="flex-1 bg-orange-600 text-white py-2 rounded-lg">Preview</button>
            </div>
          </div>
        </div>
      )}

      {report && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-3 print:hidden">
            <h2 className="font-bold">{title}</h2>
            <button onClick={print} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">Print</button>
            {report === 'supplier' && <button onClick={downloadSupplier} className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm">Download</button>}
          </div>
          <div className="hidden print:block text-center font-bold mb-2">{title}</div>
          {report === 'sales' && (
            <table className="w-full text-sm bg-white rounded-xl shadow">
              <thead className="bg-teal-500 text-white">
                <tr>
                  <th className="text-left p-1">Invoice No.</th>
                  <th className="text-left p-1">Part Number</th>
                  <th className="text-left p-1">Description</th>
                  <th className="text-center p-1">Qty</th>
                  <th className="text-left p-1">Unit</th>
                  <th className="text-right p-1">Price</th>
                  <th className="text-right p-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{r.invoiceNo}</td>
                    <td className="p-2">{r.partNumber}</td>
                    <td className="p-2">{r.description}</td>
                    <td className="p-2 text-center">{r.qty}</td>
                    <td className="p-2">{r.unit}</td>
                    <td className="p-2 text-right">₱{r.price?.toLocaleString()}</td>
                    <td className="p-2 text-right">₱{r.total?.toLocaleString()}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-gray-400">No sales today</td></tr>}
              </tbody>
            </table>
          )}
          {report === 'purchases' && (
            <table className="w-full text-sm bg-white rounded-xl shadow">
              <thead className="bg-teal-500 text-white">
                <tr>
                  <th className="text-left p-1">Date</th>
                  <th className="text-left p-1">Supplier</th>
                  <th className="text-left p-1">Invoice No.</th>
                  <th className="text-right p-1">Total</th>
                  <th className="text-center p-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{r.date}</td>
                    <td className="p-2">{r.supplier}</td>
                    <td className="p-2">{r.invoiceNo}</td>
                    <td className="p-2 text-right">₱{r.total?.toLocaleString()}</td>
                    <td className="p-2 text-center">{r.status}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">No purchases this month</td></tr>}
              </tbody>
            </table>
          )}
          {report === 'supplier' && (
            <table className="w-full text-sm bg-white rounded-xl shadow">
              <thead className="bg-orange-600 text-white">
                <tr>
                  <th className="text-left p-1">Date</th>
                  <th className="text-left p-1">Invoice No.</th>
                  <th className="text-left p-1">Supplier Name</th>
                  <th className="text-right p-1">Net of VAT</th>
                  <th className="text-right p-1">12% VAT</th>
                  <th className="text-right p-1">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <>
                    {(i === 0 || rows[i - 1].type !== r.type) && (
                      <tr key={`h-${r.type}`} className="bg-gray-100 font-bold"><td colSpan={6} className="p-2">{r.type}</td></tr>
                    )}
                    <tr key={i} className="border-t">
                      <td className="p-2">{r.dateLabel}</td>
                      <td className="p-2">{r.invoiceNo}</td>
                      <td className="p-2">{r.supplier}</td>
                      <td className="p-2 text-right">₱{r.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-2 text-right">₱{r.vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-2 text-right">₱{r.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </>
                ))}
                {rows.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400">No supplier invoices this month</td></tr>}
              </tbody>
            </table>
          )}
          {report === 'sales' && <div className="text-right font-bold text-lg mt-3">Grand Total: ₱{grand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>}
          {report === 'supplier' && <div className="text-right font-bold text-lg mt-3">Grand Total of All Purchases: ₱{grand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>}
        </div>
      )}
    </div>
  );
}
