'use client';

import { useState, useEffect } from 'react';
import { loadProducts, Product as ManagedProduct } from '../../lib/products';
import { loadInvoices, loadStock, saveSale, loadSales, loadSalesCloud, updateSales, currentBranch, customerPoints, formatDate, adjustStockByItem, syncOnline } from '../../lib/branchData';

type Line = {
  id: string;
  barcode: string;
  partNumber: string;
  description: string;
  brand: string;
  qty: number;
  unit: string;
  price: number;
};

export default function POSPage() {
  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [sSupplier, setSSupplier] = useState('');
  const [sInvoiceNo, setSInvoiceNo] = useState('');
  const [sPart, setSPart] = useState('');
  const [sDesc, setSDesc] = useState('');
  const [sBrand, setSBrand] = useState('');
  const [sBarcode, setSBarcode] = useState('');
  const [invoiceResults, setInvoiceResults] = useState<any[]>([]);
  const [productHistory, setProductHistory] = useState<any[]>([]);
  const [barcodeResults, setBarcodeResults] = useState<ManagedProduct[]>([]);
  const [enlarged, setEnlarged] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [saleDateTime, setSaleDateTime] = useState('');
  const [showPrintAsk, setShowPrintAsk] = useState(false);
  const [showDaily, setShowDaily] = useState(false);
  const [showMonthly, setShowMonthly] = useState(false);
  const [datePick, setDatePick] = useState<'daily-print' | 'daily-download' | 'monthly-print' | 'monthly-download' | null>(null);
  const [reportDay, setReportDay] = useState(new Date().toISOString().slice(0, 10));
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showUnpaid, setShowUnpaid] = useState(false);
  const [payCheck, setPayCheck] = useState({ no: '', bank: '', date: '' });
  const [selectedUnpaid, setSelectedUnpaid] = useState<string[]>([]);
  const [unpaidSearch, setUnpaidSearch] = useState('');
  const [letterhead, setLetterhead] = useState('');
  const [showLetterhead, setShowLetterhead] = useState(false);
  const [savedSale, setSavedSale] = useState<any>(null);
  const [lines, setLines] = useState<Line[]>([
    { id: '1', barcode: '', partNumber: '', description: '', brand: '', qty: 1, unit: 'pcs', price: 0 },
  ]);
  const [discount, setDiscount] = useState('');
  const [cashTender, setCashTender] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [tin, setTin] = useState('');
  const [paid, setPaid] = useState(true);
  const [priceMatches, setPriceMatches] = useState<any[]>([]);
  const [priceCheck, setPriceCheck] = useState({ barcode: '', partNumber: '', description: '', brand: '', costPrice: 0, sellingPrice: 0 });
  const [pointsInfo, setPointsInfo] = useState<{ earned: number; redeemed: number; balance: number } | null>(null);
  const [redeemPts, setRedeemPts] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        await syncOnline();
        const prods = loadProducts();
        const stock = loadStock();
        setProducts(prods.map((p) => ({ ...p, quantity: stock[p.id]?.qty ?? 0, location: stock[p.id]?.location })));
        setInvoices(loadInvoices());
        setSaleDateTime(formatDate(new Date().toISOString()) + ' ' + new Date().toLocaleTimeString());
      } catch {
        setSaleDateTime(new Date().toLocaleString());
      }
    };
    load();
  }, []);

  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const cutoff = twoYearsAgo.toISOString().split('T')[0];

  const searchInvoices = () => {
    const results = invoices
      .filter((i) => (i.invoiceDate || '') >= cutoff)
      .filter((i) =>
        (!sSupplier || i.supplierName?.toLowerCase().includes(sSupplier.toLowerCase())) &&
        (!sInvoiceNo || i.invoiceNumber?.toLowerCase().includes(sInvoiceNo.toLowerCase()))
      )
      .sort((a, b) => (b.invoiceDate || '').localeCompare(a.invoiceDate || ''));
    setInvoiceResults(results);
    setProductHistory([]);
    setBarcodeResults([]);
  };

  const searchProducts = () => {
    const history: any[] = [];
    invoices
      .filter((i) => (i.invoiceDate || '') >= cutoff)
      .forEach((inv) => {
        (inv.lines || []).forEach((line: any) => {
          const ok =
            (!sPart || line.partNumber?.toLowerCase().includes(sPart.toLowerCase())) &&
            (!sDesc || line.description?.toLowerCase().includes(sDesc.toLowerCase())) &&
            (!sBrand || line.brand?.toLowerCase().includes(sBrand.toLowerCase()));
          if (ok && (sPart || sDesc || sBrand)) {
            history.push({
              supplierName: inv.supplierName,
              invoiceNumber: inv.invoiceNumber,
              invoiceDate: inv.invoiceDate,
              partNumber: line.partNumber,
              brand: line.brand,
              description: line.description,
              price: line.price || line.costPrice,
              qty: line.qty || line.quantity,
              total: (line.qty || line.quantity || 0) * (line.price || line.costPrice || 0),
            });
          }
        });
      });
    history.sort((a, b) => (b.invoiceDate || '').localeCompare(a.invoiceDate || ''));
    setProductHistory(history);
    setInvoiceResults([]);
    setBarcodeResults([]);
  };

  const searchBarcode = () => {
    if (!sBarcode.trim()) return;
    const found = products.filter((p) => p.barcode?.toLowerCase().includes(sBarcode.toLowerCase()));
    setBarcodeResults(found);
    setInvoiceResults([]);
    setProductHistory([]);
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { id: Date.now().toString(), barcode: '', partNumber: '', description: '', brand: '', qty: 1, unit: 'pcs', price: 0 },
    ]);
  };

  const removeLine = (id: string) => {
    setLines((prev) => {
      const next = prev.filter((l) => l.id !== id);
      return next.length ? next : [{ id: Date.now().toString(), barcode: '', partNumber: '', description: '', brand: '', qty: 1, unit: 'pcs', price: 0 }];
    });
  };

  const updateLine = (id: string, field: keyof Line, value: string | number) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const lookupBarcode = (id: string, barcode: string, fromScan = false) => {
    const code = barcode.trim();
    if (!code) return;
    const list = loadProducts();
    const found = list.find((p) => String(p.barcode || '').trim().toLowerCase() === code.toLowerCase())
      || list.find((p) => String(p.barcode || '').toLowerCase().includes(code.toLowerCase()));
    if (!found) {
      updateLine(id, 'barcode', code);
      return;
    }
    setLines((prev) => {
      const match = prev.find((l) => l.id !== id && (
        String(l.barcode || '').trim().toLowerCase() === String(found.barcode || code).toLowerCase() ||
        String(l.partNumber || '').trim().toLowerCase() === String(found.partNumber || '').toLowerCase()
      ));
      if (match) {
        return prev
          .map((l) => l.id === match.id ? { ...l, qty: Number(l.qty || 0) + 1 } : l)
          .map((l) => l.id === id ? { ...l, barcode: '', partNumber: '', description: '', brand: '', qty: 1, price: 0 } : l);
      }
      const filled = prev.map((l) => l.id === id ? {
        ...l,
        barcode: found.barcode || code,
        partNumber: found.partNumber,
        description: found.description || found.name,
        brand: found.brand || '',
        price: found.sellingPrice || 0,
        qty: l.qty || 1,
      } : l);
      return fromScan ? [...filled, { id: Date.now().toString(), barcode: '', partNumber: '', description: '', brand: '', qty: 1, unit: 'pcs', price: 0 }] : filled;
    });
  };
    const lookupProduct = (id: string, partNumber: string) => {
    updateLine(id, 'partNumber', partNumber);
    const found = loadProducts().find((p) => p.partNumber.toLowerCase() === partNumber.toLowerCase());
    if (found) {
      setLines((prev) =>
        prev.map((l) =>
          l.id === id
            ? { ...l, partNumber, description: found.description || found.name, brand: found.brand || '', price: found.sellingPrice || 0, barcode: found.barcode || '' }
            : l
        )
      );
    }
  };

  const applyMatch = (item: any) => {
    const gross = Number(item.grossPrice) || 0;
    const netFromGross = gross * (1 - (item.discount1 || 0) / 100) * (1 - (item.discount2 || 0) / 100) * (1 - (item.discount3 || 0) / 100);
    const cost = netFromGross || Number(item.price) || Number(item.costPrice) || 0;
    const selling = cost > 0 ? Math.ceil((cost * 1.5) / 100) * 100 : 0;
    setPriceCheck({
      barcode: item.barcode || priceCheck.barcode,
      partNumber: item.partNumber || priceCheck.partNumber,
      description: item.description || item.name || '',
      brand: item.brand || '',
      costPrice: cost,
      sellingPrice: selling,
    });
    setPriceMatches([]);
  };

  const fillPriceCheckFromBarcode = (barcode: string, force = false) => {
    const code = barcode.trim();
    if (!force) {
      setPriceCheck((prev) => ({ ...prev, barcode: code }));
      if (code.length < 6) return;
    }
    const list = loadProducts();
    const found = list.find((p) => String(p.barcode || '').trim().toLowerCase() === code.toLowerCase());
    if (!found) {
      if (force) alert('Barcode not found in Product Catalog');
      return;
    }
    const cost = Number(found.costPrice) || 0;
    const selling = Number(found.sellingPrice) || (cost > 0 ? Math.ceil((cost * 1.5) / 100) * 100 : 0);
    setPriceCheck({
      barcode: found.barcode || code,
      partNumber: found.partNumber,
      description: found.description || found.name,
      brand: found.brand || '',
      costPrice: cost,
      sellingPrice: selling,
    });
    setPriceMatches([{ ...found, partNumber: found.partNumber, description: found.description || found.name }]);
  };

  const doPriceCheck = async () => {
    const pn = priceCheck.partNumber.trim().toLowerCase();
    const bc = priceCheck.barcode.trim().toLowerCase();
    if (!pn && !bc) return;
    const branch = currentBranch() || 'unknown';
    let freshInvoices = loadInvoices(branch);
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (res.ok) {
        const rows: { key: string; value: string }[] = await res.json();
        const row = rows.find((r) => r.key === `anlurich-supplier-invoices-${branch}`);
        if (row?.value) {
          const cloud = JSON.parse(row.value);
          if (Array.isArray(cloud) && cloud.length) freshInvoices = cloud;
        }
      }
    } catch {}
    const freshProducts = loadProducts();
    const found: any[] = [];
    const seen = new Set<string>();
    freshInvoices
      .slice()
      .sort((a, b) => String(b.invoiceDate || b.createdAt || b.id || '').localeCompare(String(a.invoiceDate || a.createdAt || a.id || '')))
      .forEach((inv) => {
        (inv.lines || []).forEach((line: any) => {
          const linePn = String(line.partNumber || '').toLowerCase();
          const lineBc = String(line.barcode || '').toLowerCase();
          const partOk = !pn || linePn.includes(pn);
          const barcodeOk = !bc || lineBc.includes(bc) || linePn.includes(bc);
          const key = linePn;
          if (partOk && barcodeOk && linePn && !seen.has(key)) {
            seen.add(key);
            found.push({ ...line, invoiceDate: inv.invoiceDate, supplierName: inv.supplierName, discount1: inv.discount1 || 0, discount2: inv.discount2 || 0, discount3: inv.discount3 || 0 });
          }
        });
      });
    freshProducts.forEach((p) => {
      const cpn = p.partNumber.toLowerCase();
      const cbc = (p.barcode || '').toLowerCase();
      const partOk = !pn || cpn.includes(pn);
      const barcodeOk = !bc || cbc.includes(bc) || cpn.includes(bc);
      if (partOk && barcodeOk && cpn && !seen.has(cpn)) {
        seen.add(cpn);
        found.push(p);
      }
    });
    if (!found.length) return alert('Product not found in supplier invoices or catalog');
    if (found.length === 1) return applyMatch(found[0]);
    setPriceMatches(found.slice(0, 8));
  };

  const addCheckedToCart = () => {
    if (!priceCheck.partNumber) return;
    setLines((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        barcode: priceCheck.barcode,
        partNumber: priceCheck.partNumber,
        description: priceCheck.description,
        brand: priceCheck.brand,
        qty: 1,
        unit: 'pcs',
        price: priceCheck.sellingPrice,
      },
    ]);
  };

  const lineTotal = (l: Line) => l.qty * l.price;
  const subtotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const discountAmt = parseFloat(discount) || 0;
  const grandTotal = Math.max(0, subtotal - discountAmt);
  const netOfVAT = Math.round((grandTotal / 1.12) * 100) / 100;
  const vat = Math.round((grandTotal - netOfVAT) * 100) / 100;
  const change = (parseFloat(cashTender) || 0) - grandTotal;

  const checkPoints = () => {
    try {
      if (!customerName.trim() && !customerPhone.trim()) return alert('Enter customer name or contact first');
      const info = customerPoints(customerName, customerPhone);
      setPointsInfo(info);
      setRedeemPts(0);
    } catch (e) {
      alert('Could not check points. Save a sale for this customer on this branch first.');
    }
  };

  const redeem = () => {
    if (!pointsInfo || pointsInfo.balance <= 0) return alert('No points to redeem');
    const use = Math.min(pointsInfo.balance, Math.floor(subtotal) || pointsInfo.balance);
    setRedeemPts(use);
    setDiscount(String(use));
  };

  const handleSave = () => {
    if (!invoiceNo.trim()) return alert('Enter Sales Invoice No.');
    const valid = lines.filter((l) => l.partNumber.trim() && l.qty > 0);
    if (valid.length === 0) return alert('Add at least one item');
    const branch = currentBranch() || 'unknown';
    const sale = {
      id: Date.now().toString(),
      invoiceNo: invoiceNo.trim(),
      customerName,
      customerPhone,
      date: new Date().toISOString(),
      dateTime: saleDateTime,
      branch,
      items: valid.map((l, i) => ({ itemNo: i + 1, partNumber: l.partNumber, description: l.description || l.partNumber, qty: l.qty, unit: l.unit, price: l.price, total: l.qty * l.price })),
      subtotal,
      discount: discountAmt,
      pointsRedeemed: redeemPts,
      total: grandTotal,
      paymentMethod,
      referenceNo: referenceNo.trim(),
      cashTender: parseFloat(cashTender) || 0,
      change: Math.max(0, (parseFloat(cashTender) || 0) - grandTotal),
    };
    saveSale(sale);
    const missed: string[] = [];
    valid.forEach((l) => {
      const result = adjustStockByItem({ partNumber: l.partNumber, barcode: l.barcode, qty: l.qty }, -Number(l.qty || 0), branch);
      if (!result.ok) missed.push(l.partNumber || l.barcode || 'item');
    });
    if (missed.length) alert(`Sale saved. Stock not deducted for: ${missed.join(', ')}. Add those to Product Catalog first.`);
    setSavedSale(sale);
    setShowPrintAsk(true);
  };

  const salesRows = (sales: any[]) => sales
    .slice()
    .sort((a, b) => String(a.dateTime || a.date || '').localeCompare(String(b.dateTime || b.date || '')))
    .map((s) => {
      const total = Number(s.total) || 0;
      const net = Math.round((total / 1.12) * 100) / 100;
      return {
        Time: s.dateTime || formatDate(s.date),
        Customer: s.customerName || '',
        'Invoice No': s.invoiceNo,
        Payment: s.paymentMethod || 'Cash',
        'Ref / Check': s.referenceNo || '',
        Total: Number(total.toFixed(2)),
        Tendered: Number((s.cashTender || 0).toFixed(2)),
        Change: Number((s.change || 0).toFixed(2)),
        'Net of VAT': Number(net.toFixed(2)),
        '12% VAT': Number((total - net).toFixed(2)),
      };
    });

  const downloadDaily = async () => {
    const XLSX = await import('xlsx');
    const today = reportDay;
    const branch = (currentBranch() || 'branch').toUpperCase();
    const groups = ['Cash', 'GCash', 'Maya', 'Credit / Debit Card', 'Bank Transfer', 'Check'];
    const sales = loadSales().filter((s) => String(s.date || s.dateTime || '').slice(0, 10) === today);
    const header = ['Invoice No.', 'Time', 'Customer Name', 'Ref No./Check No.', 'Net of VAT', '12% VAT', 'Total', 'Amount Tendered', 'Change'];
    const data: any[][] = [[branch], [formatDate(today)], [], header];
    groups.forEach((g) => {
      const list = sales
        .filter((s) => (s.paymentMethod || 'Cash') === g)
        .sort((a, b) => String(a.dateTime || a.date || '').localeCompare(String(b.dateTime || b.date || '')));
      if (!list.length) return;
      const groupTotal = list.reduce((n, s) => n + (Number(s.total) || 0), 0);
      data.push([g, Number(groupTotal.toFixed(2))]);
      list.forEach((s) => {
        const total = Number(s.total) || 0;
        const net = Math.round((total / 1.12) * 100) / 100;
        const time = s.dateTime ? String(s.dateTime).split(' ').slice(1).join(' ') : '';
        data.push([s.invoiceNo, time, s.customerName || '', s.referenceNo || '', Number(net.toFixed(2)), Number((total - net).toFixed(2)), Number(total.toFixed(2)), Number((s.cashTender || 0).toFixed(2)), Number((s.change || 0).toFixed(2))]);
      });
    });
    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet['!pageSetup'] = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Daily Sales');
    XLSX.writeFile(wb, `daily-sales-${today}.xlsx`);
  };

  const downloadMonthly = async () => {
    const XLSX = await import('xlsx');
    const ym = reportMonth;
    const branch = (currentBranch() || 'branch').toUpperCase();
    const monthLabel = new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const sales = loadSales()
      .filter((s) => String(s.date || s.dateTime || '').slice(0, 7) === ym)
      .sort((a, b) => String(a.dateTime || a.date || '').localeCompare(String(b.dateTime || b.date || '')));
    const header = ['Invoice Date', 'Invoice No.', 'Customer Name', 'Payment Type', 'Ref No./Check No.', 'Net of VAT', '12% VAT', 'Total Amount'];
    const data: any[][] = [[branch], [monthLabel], [], header];
    let netSum = 0;
    let vatSum = 0;
    let totalSum = 0;
    sales.forEach((s) => {
      const total = Number(s.total) || 0;
      const net = Math.round((total / 1.12) * 100) / 100;
      const vat = Math.round((total - net) * 100) / 100;
      netSum += net;
      vatSum += vat;
      totalSum += total;
      data.push([formatDate(s.date), s.invoiceNo, s.customerName || '', s.paymentMethod || 'Cash', s.referenceNo || '', Number(net.toFixed(2)), Number(vat.toFixed(2)), Number(total.toFixed(2))]);
    });
    data.push([]);
    data.push(['', '', '', '', 'GRAND TOTAL', Number(netSum.toFixed(2)), Number(vatSum.toFixed(2)), Number(totalSum.toFixed(2))]);
    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet['!pageSetup'] = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Monthly Sales');
    XLSX.writeFile(wb, `monthly-sales-${ym}.xlsx`);
  };

  const doPrint = () => {
    setShowLetterhead(false);
    const style = document.createElement('style');
    style.id = 'a5-receipt';
    style.innerHTML = `@media print { @page { size: A5 portrait; margin: 6mm; } }`;
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        style.remove();
        setSavedSale(null);
        window.location.reload();
      }, 500);
    }, 200);
  };

  return (
    <div className="p-4">
      <div className="print:hidden">
      <div className="flex items-baseline gap-3 mb-1 print:hidden">
        <h1 className="text-xl font-bold text-yellow-600">Point of Sale</h1>
        <span className="text-3xl font-black tracking-wide">WALK-IN Customer Invoicing</span>
      </div>
      <div className="text-xs text-gray-500 mb-4 print:hidden">AUTO PARTS INVENTORY SYSTEM (APIS)</div>

      <div className="bg-white rounded-xl shadow p-3 mb-4 grid grid-cols-1 md:grid-cols-12 gap-3 print:hidden">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1">Payment</label>
          <select className="w-full border rounded px-2 py-2" style={{ maxWidth: '20ch' }} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option>Cash</option>
            <option>GCash</option>
            <option>Maya</option>
            <option>Credit / Debit Card</option>
            <option>Bank Transfer</option>
            <option>Check</option>
            <option>Credit</option>
          </select>
          <input className="border rounded px-2 py-2 mt-2 block text-left" style={{ width: '20ch' }} placeholder={paymentMethod === 'Check' ? 'Check No.' : 'Reference No.'} value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
        </div>
        <div className="md:col-span-4">
          <label className="block text-xs font-medium mb-1">{paymentMethod === 'Credit' ? 'Corporate Name' : 'Customer Name'}</label>
          <input className="w-full border rounded px-3 py-2" placeholder={paymentMethod === 'Credit' ? 'Corporate Name' : 'Customer Name'} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          {paymentMethod === 'Credit' && (
            <>
              <input className="w-full border rounded px-3 py-2 mt-2" placeholder="TIN No." value={tin} onChange={(e) => setTin(e.target.value)} />
              <label className="flex items-center gap-2 mt-2 text-sm font-medium"><input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> PAID</label>
            </>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1">Contact Number</label>
          <input className="w-full border rounded px-3 py-2" placeholder="09xx-xxx-xxxx" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1">Sales Invoice No.</label>
          <input className="w-full border rounded px-3 py-2" placeholder="Type invoice no." value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
        </div>
        <div className="md:col-span-2 text-right">
          <label className="block text-xs font-medium mb-1">Date & Time</label>
          <input className="w-full border rounded px-3 py-2 bg-gray-50 text-right" value={saleDateTime} readOnly />
          <div className="mt-2">
            <div className="text-xs font-black tracking-wide">TOTAL POINTS</div>
            <div className="text-4xl font-black leading-none">{pointsInfo ? pointsInfo.balance : '—'}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-3 mb-4 flex gap-2 items-center">
        <button type="button" onClick={checkPoints} className="bg-purple-600 text-white px-5 py-2 rounded-lg font-medium">Check Points</button>
        {pointsInfo && (
          <button type="button" onClick={redeem} className="bg-green-600 text-white px-5 py-2 rounded-lg font-medium">Redeem</button>
        )}
        {redeemPts > 0 && <span className="text-sm text-red-600">₱{redeemPts} in Discount</span>}
      </div>

      {/* Lines */}
      <div className="bg-white rounded-xl shadow p-4 mb-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-teal-500 text-white">
            <tr>
              <th className="p-2 text-left">Barcode</th>
              <th className="p-2 text-left">Part Number</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-left">Brand</th>
              <th className="p-2 text-center">Qty</th>
              <th className="p-2 text-left">Unit</th>
              <th className="p-2 text-right" style={{ width: '10ch' }}>Price</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-t">
                <td className="p-1"><input className="border rounded px-2 py-1" style={{ width: '16ch' }} value={line.barcode} onChange={(e) => lookupBarcode(line.id, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookupBarcode(line.id, (e.target as HTMLInputElement).value, true); } }} /></td>
                <td className="p-1"><input className="border rounded px-2 py-1 w-28" value={line.partNumber} onChange={(e) => lookupProduct(line.id, e.target.value)} /></td>
                <td className="p-1"><input className="border rounded px-2 py-1" style={{ width: '48ch' }} value={line.description} onChange={(e) => updateLine(line.id, 'description', e.target.value)} /></td>
                <td className="p-1"><input className="border rounded px-2 py-1" style={{ width: '15ch' }} value={line.brand} onChange={(e) => updateLine(line.id, 'brand', e.target.value)} /></td>
                <td className="p-1"><input type="number" min={1} className="border rounded px-2 py-1 w-14 text-center" value={line.qty} onChange={(e) => updateLine(line.id, 'qty', parseInt(e.target.value) || 1)} /></td>
                <td className="p-1"><input className="border rounded px-2 py-1 w-16" value={line.unit} onChange={(e) => updateLine(line.id, 'unit', e.target.value)} /></td>
                <td className="p-1 text-right"><input type="number" min={0} step="0.01" className="border rounded px-2 py-1 text-right" style={{ width: '10ch' }} value={line.price || ''} onChange={(e) => updateLine(line.id, 'price', parseFloat(e.target.value) || 0)} /></td>
                <td className="p-1 text-right font-medium">₱{lineTotal(line).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="p-1 text-center">
                  <button type="button" onClick={() => removeLine(line.id)} className="text-red-600 text-xs font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addLine} className="mt-3 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">+ Add Line</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:hidden">
        {/* Totals */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between py-1"><span>Sub Total</span><span>₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between items-center py-1">
            <span>Discount</span>
            <input type="number" min={0} className="border rounded px-2 py-1 w-28 text-right" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0.00" />
          </div>
          {redeemPts > 0 && <div className="flex justify-between py-1 text-green-700"><span>Points Redeemed</span><span>-₱{redeemPts.toLocaleString()}</span></div>}
          <div className="flex justify-between py-1 font-bold text-lg"><span>Grand Total</span><span>₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between py-1 text-sm text-gray-600"><span>Net of VAT</span><span>₱{netOfVAT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between py-1 text-sm text-gray-600"><span>12% VAT</span><span>₱{vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between items-center py-2 border-t mt-2">
            <span>CASH TENDER</span>
            <input type="number" min={0} className="border rounded px-2 py-1 w-28 text-right" value={cashTender} onChange={(e) => setCashTender(e.target.value)} placeholder="0.00" />
          </div>
          <div className="flex justify-between py-1 text-xl font-bold text-red-600">
            <span>CHANGE</span>
            <span>₱{Math.max(0, change).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <button onClick={handleSave} className="w-full mt-3 bg-blue-700 text-white py-3 rounded-lg font-bold">Save Sale</button>
          <button onClick={() => setDatePick('daily-print')} className="w-full mt-2 bg-green-700 text-white py-3 rounded-lg font-bold">Print Daily Sales Report</button>
          <button onClick={() => setDatePick('daily-download')} className="w-full mt-2 bg-gray-700 text-white py-3 rounded-lg font-bold">Download Daily Sales</button>
          <button onClick={() => setDatePick('monthly-download')} className="w-full mt-2 bg-orange-600 text-white py-3 rounded-lg font-bold">Download Monthly Sales</button>
          <button onClick={() => setDatePick('monthly-print')} className="w-full mt-2 bg-orange-800 text-white py-3 rounded-lg font-bold">Print Monthly Sales</button>
          <button onClick={() => setShowUnpaid(true)} className="w-full mt-2 bg-red-600 text-white py-3 rounded-lg font-bold">Unpaid Credit Summary</button>
        </div>

        {/* Price Check */}
        <div className="bg-white rounded-xl shadow p-4 print:hidden">
          <h2 className="font-semibold mb-3">Price Check</h2>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input className="flex-1 border rounded-lg px-3 py-2" placeholder="Scan barcode" value={priceCheck.barcode} onChange={(e) => fillPriceCheckFromBarcode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fillPriceCheckFromBarcode((e.target as HTMLInputElement).value, true); } }} />
              <input className="flex-1 border rounded-lg px-3 py-2" placeholder="Part Number" value={priceCheck.partNumber} onChange={(e) => setPriceCheck({ ...priceCheck, partNumber: e.target.value })} />
            </div>
            {priceMatches.length > 0 && (
              <div className="border rounded bg-teal-50 p-2 text-sm">
                <div className="font-bold">{priceMatches[0].partNumber}</div>
                <div>{priceMatches[0].description || priceMatches[0].name}</div>
                <div>{priceMatches[0].brand || '—'}</div>
              </div>
            )}
            <input className="w-full border rounded-lg px-3 py-2 bg-gray-50" placeholder="Description" value={priceCheck.description} readOnly />
            <input className="w-full border rounded-lg px-3 py-2 bg-gray-50" placeholder="Brand" value={priceCheck.brand} readOnly />
            <div className="flex justify-between text-sm"><span>Cost Price</span><span>₱{Number(priceCheck.costPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between text-sm"><span>Selling Price</span><span>₱{Number(priceCheck.sellingPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            <div className="flex gap-2">
              <button onClick={doPriceCheck} className="flex-1 bg-teal-600 text-white py-2 rounded-lg text-sm">Price Check</button>
              <button onClick={addCheckedToCart} className="flex-1 bg-blue-700 text-white py-2 rounded-lg text-sm">Add to Cart</button>
            </div>
          </div>
        </div>
      </div>

      {/* Print ask */}
      {showPrintAsk && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 text-center max-w-sm">
            <p className="font-semibold mb-4">Sale saved. Print receipt?</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowPrintAsk(false); const b = localStorage.getItem('anlurich-branch'); window.location.href = b ? `/branch/${b}` : '/'; }} className="flex-1 bg-gray-500 text-white py-2 rounded-lg">No</button>
              <button onClick={() => { setShowPrintAsk(false); setShowLetterhead(true); }} className="flex-1 bg-blue-700 text-white py-2 rounded-lg">Yes</button>
            </div>
          </div>
        </div>
      )}

      {/* Letterhead select */}
      {showLetterhead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <p className="font-semibold mb-3">Select branch letterhead</p>
            <select className="w-full border rounded-lg px-3 py-2 mb-4" value={letterhead} onChange={(e) => setLetterhead(e.target.value)}>
              <option value="">— Select —</option>
              <option>ANLURICH OPC</option>
              <option>AVENDERS AUTO PARTS</option>
              <option>DASMA AUTO PARTS</option>
              <option>LIPA AUTO PARTS</option>
              <option>SEZAN BALIWAG AUTO PARTS</option>
              <option>TIMITSU BALIWAG AUTO PARTS</option>
            </select>
            <div className="flex gap-3">
              <button onClick={() => { setShowLetterhead(false); const b = localStorage.getItem('anlurich-branch'); window.location.href = b ? `/branch/${b}` : '/'; }} className="flex-1 bg-gray-500 text-white py-2 rounded-lg">Cancel</button>
              <button onClick={doPrint} disabled={!letterhead} className="flex-1 bg-green-600 text-white py-2 rounded-lg disabled:opacity-50">Print</button>
            </div>
          </div>
        </div>
      )}

      </div>

      {datePick && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm">
            <div className="font-bold mb-3">{datePick.startsWith('daily') ? 'Choose the day' : 'Choose the month'}</div>
            {datePick.startsWith('daily') ? (
              <input type="date" className="w-full border rounded px-3 py-2 mb-4" value={reportDay} onChange={(e) => setReportDay(e.target.value)} />
            ) : (
              <input type="month" className="w-full border rounded px-3 py-2 mb-4" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
            )}
            <div className="flex gap-3">
              <button onClick={() => setDatePick(null)} className="flex-1 bg-gray-500 text-white py-2 rounded">Cancel</button>
              <button onClick={() => {
                const action = datePick;
                setDatePick(null);
                if (action === 'daily-print') setShowDaily(true);
                if (action === 'daily-download') downloadDaily();
                if (action === 'monthly-print') setShowMonthly(true);
                if (action === 'monthly-download') downloadMonthly();
              }} className="flex-1 bg-blue-700 text-white py-2 rounded">Continue</button>
            </div>
          </div>
        </div>
      )}

      {/* Daily sales report */}
      {showDaily && (() => {
        const today = reportDay;
        const groups = [
          { key: 'Cash', label: 'CASH SALES' },
          { key: 'GCash', label: 'GCASH' },
          { key: 'Maya', label: 'MAYA' },
          { key: 'Credit / Debit Card', label: 'CREDIT CARD' },
          { key: 'Bank Transfer', label: 'BANK TRANSFER' },
          { key: 'Check', label: 'CHECK PAYMENT' },
        ];
        const sales = loadSales().filter((s) => String(s.date || s.dateTime || '').slice(0, 10) === today);
        const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const rows = groups.map((g) => {
          const list = sales.filter((s) => (s.paymentMethod || 'Cash') === g.key);
          const total = list.reduce((n, s) => n + (Number(s.total) || 0), 0);
          return { ...g, count: list.length, total, list };
        });
        const grand = rows.reduce((n, r) => n + r.total, 0);
        const net = Math.round((grand / 1.12) * 100) / 100;
        const vat = Math.round((grand - net) * 100) / 100;
        const printDaily = () => {
          const style = document.createElement('style');
          style.id = 'daily-print';
          style.innerHTML = `@media print { @page { size: A4 landscape; margin: 8mm; } body * { visibility: hidden; } #daily-report, #daily-report * { visibility: visible; } #daily-report { position: absolute; left: 0; top: 0; width: 100%; } }`;
          document.head.appendChild(style);
          setTimeout(() => { window.print(); setTimeout(() => style.remove(), 500); }, 100);
        };
        return (
          <div className="fixed inset-0 bg-black/50 z-50 overflow-auto p-4">
            <div id="daily-report" className="bg-white max-w-md mx-auto p-4 rounded shadow">
              <div className="text-center font-bold text-lg">DAILY SALES REPORT</div>
              <div className="text-center text-sm mb-3">{formatDate(today)} · {currentBranch()?.toUpperCase()}</div>
              {rows.map((r) => (
                <div key={r.key} className="mb-3">
                  <div className="flex justify-between font-bold bg-gray-800 text-white px-2 py-1 text-sm"><span>{r.label}</span><span>{money(r.total)} · {r.count}</span></div>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-100">
                        <th className="text-left p-1">Time</th>
                        <th className="text-left p-1">Customer</th>
                        <th className="text-left p-1">Invoice</th>
                        <th className="text-left p-1">Ref / Check</th>
                        <th className="text-right p-1">Total</th>
                        <th className="text-right p-1">Tendered</th>
                        <th className="text-right p-1">Change</th>
                        <th className="text-right p-1">Net VAT</th>
                        <th className="text-right p-1">12% VAT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.list
                        .slice()
                        .sort((a: any, b: any) => String(a.dateTime || a.date || '').localeCompare(String(b.dateTime || b.date || '')))
                        .map((s: any) => {
                          const t = Number(s.total) || 0;
                          const net = Math.round((t / 1.12) * 100) / 100;
                          const vat = Math.round((t - net) * 100) / 100;
                          const time = s.dateTime ? String(s.dateTime).split(' ').slice(1).join(' ') : '';
                          return (
                            <tr key={s.id || s.invoiceNo} className="border-b">
                              <td className="p-1">{time}</td>
                              <td className="p-1">{s.customerName || '—'}</td>
                              <td className="p-1">{s.invoiceNo}</td>
                              <td className="p-1">{s.referenceNo || '—'}</td>
                              <td className="p-1 text-right">{money(t)}</td>
                              <td className="p-1 text-right">{money(s.cashTender || 0)}</td>
                              <td className="p-1 text-right">{money(s.change || 0)}</td>
                              <td className="p-1 text-right">{money(net)}</td>
                              <td className="p-1 text-right">{money(vat)}</td>
                            </tr>
                          );
                        })}
                      {r.list.length === 0 && <tr><td colSpan={9} className="p-1 text-gray-400">No sales</td></tr>}
                    </tbody>
                  </table>
                </div>
              ))}
              <div className="mt-3 text-right space-y-1">
                <div>Net of VAT: {money(net)}</div>
                <div>12% VAT: {money(vat)}</div>
                <div className="font-bold text-lg">GRAND TOTAL: {money(grand)}</div>
              </div>
              <div className="flex gap-2 mt-4 print:hidden">
                <button onClick={() => setShowDaily(false)} className="flex-1 bg-gray-500 text-white py-2 rounded">Close</button>
                <button onClick={printDaily} className="flex-1 bg-blue-700 text-white py-2 rounded">Print</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Monthly sales report */}
      {showMonthly && (() => {
        const ym = reportMonth;
        const monthLabel = new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const sales = loadSales()
          .filter((s) => String(s.date || s.dateTime || '').slice(0, 7) === ym)
          .sort((a, b) => String(a.dateTime || a.date || '').localeCompare(String(b.dateTime || b.date || '')));
        const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const rows = sales.map((s) => {
          const total = Number(s.total) || 0;
          const net = Math.round((total / 1.12) * 100) / 100;
          return { ...s, net, vat: Math.round((total - net) * 100) / 100, total };
        });
        const netSum = rows.reduce((n, r) => n + r.net, 0);
        const vatSum = rows.reduce((n, r) => n + r.vat, 0);
        const totalSum = rows.reduce((n, r) => n + r.total, 0);
        const printMonthly = () => {
          const style = document.createElement('style');
          style.innerHTML = `@media print { @page { size: A4 landscape; margin: 8mm; } body * { visibility: hidden; } #monthly-report, #monthly-report * { visibility: visible; } #monthly-report { position: absolute; left: 0; top: 0; width: 100%; } }`;
          document.head.appendChild(style);
          setTimeout(() => { window.print(); setTimeout(() => style.remove(), 500); }, 100);
        };
        return (
          <div className="fixed inset-0 bg-black/50 z-50 overflow-auto p-4">
            <div id="monthly-report" className="bg-white max-w-5xl mx-auto p-4 rounded shadow">
              <div className="text-center font-bold text-xl">{currentBranch()?.toUpperCase()}</div>
              <div className="text-center font-semibold mb-3">{monthLabel}</div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-gray-100">
                    <th className="text-left p-1">Invoice Date</th>
                    <th className="text-left p-1">Invoice No.</th>
                    <th className="text-left p-1">Customer Name</th>
                    <th className="text-left p-1">Payment Type</th>
                    <th className="text-left p-1">Ref No./Check No.</th>
                    <th className="text-right p-1">Net of VAT</th>
                    <th className="text-right p-1">12% VAT</th>
                    <th className="text-right p-1">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id || s.invoiceNo} className="border-b">
                      <td className="p-1">{formatDate(s.date)}</td>
                      <td className="p-1">{s.invoiceNo}</td>
                      <td className="p-1">{s.customerName || '—'}</td>
                      <td className="p-1">{s.paymentMethod || 'Cash'}</td>
                      <td className="p-1">{s.referenceNo || '—'}</td>
                      <td className="p-1 text-right">{money(s.net)}</td>
                      <td className="p-1 text-right">{money(s.vat)}</td>
                      <td className="p-1 text-right">{money(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-right font-bold mt-3 space-y-1">
                <div>Net of VAT: {money(netSum)}</div>
                <div>12% VAT: {money(vatSum)}</div>
                <div className="text-lg">GRAND TOTAL: {money(totalSum)}</div>
              </div>
              <div className="flex gap-2 mt-4 print:hidden">
                <button onClick={() => setShowMonthly(false)} className="flex-1 bg-gray-500 text-white py-2 rounded">Close</button>
                <button onClick={printMonthly} className="flex-1 bg-blue-700 text-white py-2 rounded">Print</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Unpaid credit summary */}
      {showUnpaid && (() => {
        const unpaid = loadSales().filter((s) => s.paymentMethod === 'Credit' && s.paid === false && (!unpaidSearch.trim() || String(s.customerName || '').toLowerCase().includes(unpaidSearch.trim().toLowerCase())));
        const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const tickAll = () => setSelectedUnpaid(unpaid.map((s) => s.id));
        const recordPayment = () => {
          if (!payCheck.no || !payCheck.bank || !payCheck.date) return alert('Enter check no., bank name, and check date');
          if (!selectedUnpaid.length) return alert('Select the invoices paid');
          const branch = currentBranch() || 'unknown';
          const all = loadSales(branch);
          const updated = all.map((s) => selectedUnpaid.includes(s.id) ? { ...s, paid: true, paymentRef: payCheck.no, bankName: payCheck.bank, checkDate: payCheck.date, paidOn: new Date().toISOString() } : s);
          updateSales(branch, updated);
          setSelectedUnpaid([]);
          setPayCheck({ no: '', bank: '', date: '' });
          alert('Payment recorded. Selected invoices are now PAID and removed from unpaid.');
          setShowUnpaid(false);
        };
        return (
          <div className="fixed inset-0 bg-black/50 z-50 overflow-auto p-4">
            <div className="bg-white max-w-4xl mx-auto p-4 rounded">
              <div className="text-center font-bold text-lg">UNPAID CREDIT CLIENTS</div>
              <div className="flex gap-2 mt-3">
                <input className="flex-1 border rounded px-3 py-2" placeholder="Search client name" value={unpaidSearch} onChange={(e) => setUnpaidSearch(e.target.value)} />
                <button onClick={tickAll} className="bg-blue-700 text-white px-4 py-2 rounded">Tick All</button>
              </div>
              <table className="w-full text-sm mt-3">
                <thead className="bg-red-600 text-white">
                  <tr>
                    <th className="p-2"></th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Invoice</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">TIN</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaid.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="p-2"><input type="checkbox" checked={selectedUnpaid.includes(s.id)} onChange={(e) => setSelectedUnpaid(e.target.checked ? [...selectedUnpaid, s.id] : selectedUnpaid.filter((id) => id !== s.id))} /></td>
                      <td className="p-2">{formatDate(s.date)}</td>
                      <td className="p-2">{s.invoiceNo}</td>
                      <td className="p-2">{s.customerName}</td>
                      <td className="p-2">{s.tin}</td>
                      <td className="p-2 text-right">{money(s.total)}</td>
                    </tr>
                  ))}
                  {unpaid.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400">No unpaid credit</td></tr>}
                </tbody>
              </table>
              <div className="text-right font-bold mt-3">Selected: {selectedUnpaid.length} · {money(unpaid.filter((s) => selectedUnpaid.includes(s.id)).reduce((n, s) => n + (Number(s.total) || 0), 0))}</div>
              <div className="text-right font-bold">Unpaid Total: {money(unpaid.reduce((n, s) => n + (Number(s.total) || 0), 0))}</div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <input className="border rounded px-2 py-2" placeholder="Check No." value={payCheck.no} onChange={(e) => setPayCheck({ ...payCheck, no: e.target.value })} />
                <input className="border rounded px-2 py-2" placeholder="Bank Name" value={payCheck.bank} onChange={(e) => setPayCheck({ ...payCheck, bank: e.target.value })} />
                <input type="date" className="border rounded px-2 py-2" value={payCheck.date} onChange={(e) => setPayCheck({ ...payCheck, date: e.target.value })} />
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setShowUnpaid(false)} className="flex-1 bg-gray-600 text-white py-2 rounded">Close</button>
                <button onClick={recordPayment} className="flex-1 bg-green-700 text-white py-2 rounded font-bold">Record Check Payment</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Printable receipt */}
      {savedSale && letterhead && (
        <div className="hidden print:block text-[10px] leading-tight">
          <div className="text-center font-bold text-sm mb-1">{letterhead}</div>
          <div className="flex justify-between items-end border-b pb-1 mb-1">
            <div className="font-bold text-xs">INVOICE</div>
            <div>No. {savedSale.invoiceNo}</div>
            <div>{savedSale.dateTime || formatDate(savedSale.date)}</div>
          </div>
          <div className="flex justify-between mb-1">
            <div><strong>Customer:</strong> {savedSale.customerName || '—'}</div>
            <div><strong>Contact:</strong> {savedSale.customerPhone || '—'}</div>
            {savedSale.tin && <div><strong>TIN:</strong> {savedSale.tin}</div>}
          </div>
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '6%' }} />
              <col style={{ width: '48%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
            </colgroup>
            <thead>
              <tr className="border-b">
                <th className="text-left py-0.5">No.</th>
                <th className="text-left py-0.5">Part No. / Description</th>
                <th className="text-center py-0.5">Qty</th>
                <th className="text-left py-0.5">Unit</th>
                <th className="text-right py-0.5">Price</th>
                <th className="text-right py-0.5">Total</th>
              </tr>
            </thead>
            <tbody>
              {savedSale.items.map((item: any) => (
                <tr key={item.itemNo} className="border-b">
                  <td className="py-0.5">{item.itemNo}</td>
                  <td className="py-0.5">{item.partNumber ? `${item.partNumber} ` : ''}{item.description}</td>
                  <td className="py-0.5 text-center">{item.qty}</td>
                  <td className="py-0.5">{item.unit}</td>
                  <td className="py-0.5 text-right">₱{item.price.toLocaleString()}</td>
                  <td className="py-0.5 text-right">₱{item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right mt-3" style={{ lineHeight: '1.8' }}>
            <div>Subtotal: ₱{savedSale.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            {savedSale.discount > 0 && <div>Discount: ₱{savedSale.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>}
            <div>Net of VAT: ₱{(Math.round((savedSale.total / 1.12) * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div>12% VAT: ₱{(Math.round((savedSale.total - savedSale.total / 1.12) * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="font-bold text-xs border-t pt-1 mt-1">GRAND TOTAL: ₱{savedSale.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            {savedSale.paymentMethod === 'Credit' && <div className="text-center font-black text-sm mt-2">TERMS: STRICTLY 30 DAYS ONLY</div>}
          </div>
        </div>
      )}
    </div>
  );
}
