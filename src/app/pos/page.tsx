'use client';

import { useState, useEffect } from 'react';
import { loadProducts, Product as ManagedProduct } from '../products/page';
import { loadInvoices, loadStock, saveSale, currentBranch, customerPoints, formatDate } from '../../lib/branchData';

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
  const [showLetterhead, setShowLetterhead] = useState(false);
  const [letterhead, setLetterhead] = useState('');
  const [savedSale, setSavedSale] = useState<any>(null);
  const [lines, setLines] = useState<Line[]>([
    { id: '1', barcode: '', partNumber: '', description: '', brand: '', qty: 1, unit: 'pcs', price: 0 },
  ]);
  const [discount, setDiscount] = useState('');
  const [cashTender, setCashTender] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [priceCheck, setPriceCheck] = useState({ partNumber: '', description: '', brand: '', costPrice: 0, sellingPrice: 0 });
  const [pointsInfo, setPointsInfo] = useState<{ earned: number; redeemed: number; balance: number } | null>(null);
  const [redeemPts, setRedeemPts] = useState(0);

  useEffect(() => {
    const prods = loadProducts();
    const stock = loadStock();
    setProducts(prods.map((p) => ({ ...p, quantity: stock[p.id]?.qty ?? 0, location: stock[p.id]?.location })));
    setInvoices(loadInvoices());
    setSaleDateTime(formatDate(new Date().toISOString()) + ' ' + new Date().toLocaleTimeString());
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

  const lookupProduct = (id: string, partNumber: string) => {
    updateLine(id, 'partNumber', partNumber);
    const found = products.find((p) => p.partNumber.toLowerCase() === partNumber.toLowerCase());
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

  const doPriceCheck = () => {
    const pn = priceCheck.partNumber.trim().toLowerCase();
    if (!pn) return;
    let latest: any = null;
    invoices
      .slice()
      .sort((a, b) => (b.invoiceDate || '').localeCompare(a.invoiceDate || ''))
      .forEach((inv) => {
        if (latest) return;
        (inv.lines || []).forEach((line: any) => {
          if (latest) return;
          if (String(line.partNumber || '').toLowerCase() === pn) {
            latest = {
              ...line,
              invoiceDate: inv.invoiceDate,
              supplierName: inv.supplierName,
              discount1: inv.discount1 || 0,
              discount2: inv.discount2 || 0,
              discount3: inv.discount3 || 0,
            };
          }
        });
      });
    const catalog = products.find((p) => p.partNumber.toLowerCase() === pn);
    if (!latest && !catalog) return alert('Product not found in supplier invoices or catalog');
    const gross = Number(latest?.grossPrice) || 0;
    const netFromGross = gross * (1 - (latest?.discount1 || 0) / 100) * (1 - (latest?.discount2 || 0) / 100) * (1 - (latest?.discount3 || 0) / 100);
    const cost = netFromGross || Number(latest?.price) || Number(latest?.costPrice) || Number(catalog?.costPrice) || 0;
    const selling = cost > 0 ? Math.ceil((cost * 1.5) / 100) * 100 : 0;
    setPriceCheck({
      partNumber: latest?.partNumber || catalog?.partNumber || priceCheck.partNumber,
      description: latest?.description || catalog?.description || catalog?.name || '',
      brand: latest?.brand || catalog?.brand || '',
      costPrice: cost,
      sellingPrice: selling,
    });
  };

  const addCheckedToCart = () => {
    if (!priceCheck.partNumber) return;
    setLines((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        barcode: '',
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
    };
    saveSale(sale);
    setSavedSale(sale);
    setShowPrintAsk(true);
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
        <span className="text-3xl font-black tracking-wide">INVOICING</span>
      </div>
      <div className="text-xs text-gray-500 mb-4 print:hidden">AUTO PARTS INVENTORY SYSTEM (APIS)</div>

      <div className="bg-white rounded-xl shadow p-3 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 print:hidden">
        <div>
          <label className="block text-xs font-medium mb-1">Payment</label>
          <select className="w-full border rounded px-3 py-2" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option>Cash</option>
            <option>GCash</option>
            <option>Maya</option>
            <option>Credit / Debit Card</option>
            <option>Bank Transfer</option>
            <option>Check</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Customer Name</label>
          <input className="w-full border rounded px-3 py-2" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Contact Number</label>
          <input className="w-full border rounded px-3 py-2" placeholder="09xx-xxx-xxxx" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Sales Invoice No.</label>
          <input className="w-full border rounded px-3 py-2" placeholder="Type invoice no." value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Date & Time</label>
          <input className="w-full border rounded px-3 py-2 bg-gray-50" value={saleDateTime} readOnly />
        </div>
        <div className="text-right flex flex-col justify-center">
          <div className="text-xs font-black tracking-wide">TOTAL POINTS</div>
          <div className="text-4xl font-black leading-none">{pointsInfo ? pointsInfo.balance : '—'}</div>
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
                <td className="p-1"><input className="border rounded px-2 py-1 w-28" value={line.barcode} onChange={(e) => updateLine(line.id, 'barcode', e.target.value)} /></td>
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
        </div>

        {/* Price Check */}
        <div className="bg-white rounded-xl shadow p-4 print:hidden">
          <h2 className="font-semibold mb-3">Price Check</h2>
          <div className="space-y-2">
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Part Number" value={priceCheck.partNumber} onChange={(e) => setPriceCheck({ ...priceCheck, partNumber: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2 bg-gray-50" placeholder="Description" value={priceCheck.description} readOnly />
            <input className="w-full border rounded-lg px-3 py-2 bg-gray-50" placeholder="Brand" value={priceCheck.brand} readOnly />
            <div className="flex justify-between text-sm"><span>Cost Price</span><span>₱{priceCheck.costPrice.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span>Selling Price</span><span>₱{priceCheck.sellingPrice.toLocaleString()}</span></div>
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
          </div>
        </div>
      )}
    </div>
  );
}
