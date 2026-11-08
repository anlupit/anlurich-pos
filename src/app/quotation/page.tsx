'use client';

import { useState, useEffect } from 'react';
import { saveQuotation, updateQuotation, loadQuotations, deleteQuotation, currentBranch, formatDate } from '../../lib/branchData';

type QuoteLine = {
  id: string;
  partNumber: string;
  description: string;
  brand: string;
  qty: number;
  unit: string;
  price: number;
  laborPrice: number;
};

const BRANCH_HEADERS: Record<string, { name: string; location: string }> = {
  anlurich: { name: 'ANLURICH OPC', location: 'Silang, Cavite' },
  dasma: { name: 'DASMA AUTO PARTS', location: 'Dasma, Cavite' },
  sezan: { name: 'SEZAN', location: 'Baliwag, Bulacan' },
  timitsu: { name: 'TIMITSU', location: 'Baliwag, Bulacan' },
  avenders: { name: 'AVENDERS AUTO PARTS', location: 'Sta. Rosa, Laguna' },
  lipa: { name: 'LIPA AUTO PARTS', location: 'Lipa, Batangas' },
};

export default function QuotationPage() {
  const [quotationNo, setQuotationNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [plateNo, setPlateNo] = useState('');
  const [carMake, setCarMake] = useState('');
  const [carModel, setCarModel] = useState('');
  const [yearModel, setYearModel] = useState('');
  const [chasisNo, setChasisNo] = useState('');
  const [notes, setNotes] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [qPlate, setQPlate] = useState('');
  const [qCustomer, setQCustomer] = useState('');
  const [qNo, setQNo] = useState('');
  const [qResults, setQResults] = useState<any[]>([]);
  const [qSearched, setQSearched] = useState(false);
  const [showPrintAsk, setShowPrintAsk] = useState(false);
  const [printSnap, setPrintSnap] = useState<any>(null);
  const [branchHeader, setBranchHeader] = useState({ name: 'APIS', location: '' });
  const [logo, setLogo] = useState('');
  const [hasLabor, setHasLabor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lines, setLines] = useState<QuoteLine[]>([
    { id: '1', partNumber: '', description: '', brand: '', qty: 1, unit: 'pcs', price: 0, laborPrice: 0 },
  ]);

  useEffect(() => {
    const id = localStorage.getItem('anlurich-branch') || '';
    setBranchHeader(BRANCH_HEADERS[id] || { name: 'APIS', location: '' });
    setHasLabor(id === 'anlurich' || id === 'avenders');
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const existing = JSON.parse(localStorage.getItem(`anlurich-quotations-${id}`) || '[]').map((q: any) => String(q.quotationNo || ''));
    let n = 1;
    let no = `${datePart}-${String(n).padStart(2, '0')}`;
    while (existing.includes(no)) {
      n += 1;
      no = `${datePart}-${String(n).padStart(2, '0')}`;
    }
    setQuotationNo(no);
  }, []);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { id: Date.now().toString(), partNumber: '', description: '', brand: '', qty: 1, unit: 'pcs', price: 0, laborPrice: 0 },
    ]);
  };

  const updateLine = (id: string, field: keyof QuoteLine, value: string | number) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const removeLine = (id: string) => {
    setLines((prev) => {
      const next = prev.filter((l) => l.id !== id);
      return next.length ? next : [{ id: Date.now().toString(), partNumber: '', description: '', brand: '', qty: 1, unit: 'pcs', price: 0 }];
    });
  };

  const lineTotal = (l: QuoteLine) => l.qty * l.price + (hasLabor ? (Number(l.laborPrice) || 0) : 0);
  const grandTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);

  const searchQuotations = () => {
    const all = loadQuotations();
    const plate = qPlate.trim().toLowerCase();
    const name = qCustomer.trim().toLowerCase();
    const no = qNo.trim().toLowerCase();
    const found = all
      .map((q, index) => ({ ...q, _index: index }))
      .filter((q) => {
        const plateOk = !plate || String(q.plateNo || '').toLowerCase().includes(plate);
        const nameOk = !name || String(q.customerName || '').toLowerCase().includes(name);
        const noOk = !no || String(q.quotationNo || '').toLowerCase().includes(no);
        return plateOk && nameOk && noOk && (plate || name || no);
      });
    setQResults(found.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
    setQSearched(true);
  };

  const deleteQuote = (q: any) => {
    if (!confirm(`Delete quotation ${q.quotationNo || ''}?`)) return;
    deleteQuotation(q.id, q.quotationNo);
    searchQuotations();
  };

  const openQuotation = (q: any) => {
    setEditingId(q.id || q.quotationNo);
    setCustomerName(q.customerName || '');
    setCustomerPhone(q.customerPhone || '');
    setQuotationNo(q.quotationNo || '');
    setPlateNo(q.plateNo || '');
    setCarMake(q.carMake || '');
    setCarModel(q.carModel || '');
    setYearModel(q.yearModel || '');
    setChasisNo(q.chasisNo || '');
    setNotes(q.notes || '');
    if (q.lines?.some((l: any) => Number(l.laborPrice) > 0)) setHasLabor(true);
    if (q.lines?.length) setLines(q.lines.map((l: any) => ({ laborPrice: 0, ...l })));
    setShowSearch(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const nextQuotationNo = () => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const existing = loadQuotations().map((q) => String(q.quotationNo || ''));
    let n = 1;
    let no = `${datePart}-${String(n).padStart(2, '0')}`;
    while (existing.includes(no)) {
      n += 1;
      no = `${datePart}-${String(n).padStart(2, '0')}`;
    }
    return no;
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setPlateNo('');
    setCarMake('');
    setCarModel('');
    setYearModel('');
    setChasisNo('');
    setNotes('');
    setLines([{ id: Date.now().toString(), partNumber: '', description: '', brand: '', qty: 1, unit: 'pcs', price: 0, laborPrice: 0 }]);
    setQuotationNo(nextQuotationNo());
    setEditingId(null);
  };

  const handleSave = () => {
    const valid = lines.filter((l) => l.partNumber.trim() || l.description.trim());
    if (valid.length === 0) return alert('Add at least one item');
    const taken = !editingId && loadQuotations().some((q) => String(q.quotationNo) === quotationNo);
    const uniqueNo = taken ? nextQuotationNo() : quotationNo;
    const snap = {
      id: editingId || Date.now().toString() + Math.random().toString(36).slice(2, 6),
      quotationNo: uniqueNo,
      customerName,
      customerPhone,
      plateNo,
      carMake,
      carModel,
      yearModel,
      chasisNo,
      notes,
      lines: valid,
      grandTotal,
      branch: currentBranch(),
      date: new Date().toISOString(),
    };
    if (editingId) updateQuotation(snap);
    else saveQuotation(snap);
    setPrintSnap(snap);
    resetForm();
    setShowPrintAsk(true);
  };

  const printCurrent = () => {
    const valid = lines.filter((l) => l.partNumber.trim() || l.description.trim());
    if (valid.length === 0) return alert('Add at least one item');
    setPrintSnap({
      quotationNo,
      customerName,
      customerPhone,
      plateNo,
      carMake,
      carModel,
      yearModel,
      chasisNo,
      notes,
      lines: valid,
      grandTotal,
      date: new Date().toISOString(),
    });
    setTimeout(doPrint, 100);
  };

  const doPrint = () => {
    setShowPrintAsk(false);
    const style = document.createElement('style');
    style.innerHTML = `@media print {
      @page { size: A5 portrait; margin: 6mm; }
      .print\\:hidden { display: none !important; }
      .print-quote { display: block !important; }
    }`;
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      setTimeout(() => style.remove(), 1000);
    }, 200);
  };

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
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold text-yellow-600">Quotation</h2>
          <button onClick={() => setShowSearch(!showSearch)} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">Search Quotation</button>
        </div>

        {showSearch && (
          <div className="bg-white rounded-xl shadow p-4 mb-4">
            <div className="flex flex-wrap gap-2 mb-3">
              <input className="border rounded px-3 py-2" placeholder="Plate No." value={qPlate} onChange={(e) => setQPlate(e.target.value)} />
              <input className="border rounded px-3 py-2" placeholder="Customer Name" value={qCustomer} onChange={(e) => setQCustomer(e.target.value)} />
              <input className="border rounded px-3 py-2" placeholder="Quotation No." value={qNo} onChange={(e) => setQNo(e.target.value)} />
              <button onClick={searchQuotations} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">Search</button>
            </div>
            {qSearched && qResults.length === 0 && (
              <div className="text-sm text-gray-500">No quotations found for this branch. Check the plate, name, or quotation number.</div>
            )}
            {qResults.length > 0 && (
              <table className="w-full text-sm">
                <thead className="bg-teal-500 text-white">
                  <tr>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Quotation No.</th>
                    <th className="text-left p-2">Customer</th>
                    <th className="text-left p-2">Plate No.</th>
                    <th className="text-right p-2">Total</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {qResults.map((q, i) => (
                    <tr key={`${q._index}-${i}`} className="border-t">
                      <td className="p-2">{formatDate(q.date)}</td>
                      <td className="p-2 font-medium">{q.quotationNo}</td>
                      <td className="p-2">{q.customerName}</td>
                      <td className="p-2">{q.plateNo || '—'}</td>
                      <td className="p-2 text-right">₱{q.grandTotal?.toLocaleString()}</td>
                      <td className="p-2 text-center whitespace-nowrap">
                        <button onClick={() => openQuotation(q)} className="text-blue-600 text-xs font-medium mr-2">Edit</button>
                        <button onClick={() => deleteQuote(q)} className="text-red-600 text-xs font-medium">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Customer / Vehicle Info */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <h2 className="font-semibold mb-3">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input className="border rounded-lg px-3 py-2" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <input className="border rounded-lg px-3 py-2" placeholder="Contact Number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            <input className="border rounded-lg px-3 py-2 bg-gray-50" value={quotationNo} readOnly placeholder="Quotation No." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input className="border rounded-lg px-3 py-2" placeholder="Plate No." value={plateNo} onChange={(e) => setPlateNo(e.target.value)} />
            <input className="border rounded-lg px-3 py-2" placeholder="Car Make" value={carMake} onChange={(e) => setCarMake(e.target.value)} />
            <input className="border rounded-lg px-3 py-2" placeholder="Car Model" value={carModel} onChange={(e) => setCarModel(e.target.value)} />
            <input className="border rounded-lg px-3 py-2" placeholder="Year Model" value={yearModel} onChange={(e) => setYearModel(e.target.value)} />
            <input className="border rounded-lg px-3 py-2" placeholder="Chasis No." value={chasisNo} onChange={(e) => setChasisNo(e.target.value)} />
          </div>
        </div>

        {/* Product Lines */}
        <div className="bg-white rounded-xl shadow p-4 mb-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-teal-500 text-white">
              <tr>
                <th className="p-2 text-center">Part Number</th>
                <th className="p-2 text-center">Description</th>
                <th className="p-2 text-center">Brand</th>
                <th className="p-2 text-center">Qty</th>
                <th className="p-2 text-center">Unit</th>
                <th className="p-2 text-center">Price</th>
                {hasLabor && <th className="p-2 text-center">Labor Cost</th>}
                <th className="p-2 text-center">Total</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-t">
                  <td className="p-1"><input className="border rounded px-2 py-1" style={{ width: '15ch' }} value={line.partNumber} onChange={(e) => updateLine(line.id, 'partNumber', e.target.value)} /></td>
                  <td className="p-1"><input className="border rounded px-2 py-1" style={{ width: '40ch' }} value={line.description} onChange={(e) => updateLine(line.id, 'description', e.target.value)} /></td>
                  <td className="p-1"><input className="border rounded px-2 py-1" style={{ width: '15ch' }} value={line.brand} onChange={(e) => updateLine(line.id, 'brand', e.target.value)} /></td>
                  <td className="p-1"><input type="number" min={1} className="border rounded px-1 py-1 text-center" style={{ width: '4ch' }} value={line.qty} onChange={(e) => updateLine(line.id, 'qty', parseInt(e.target.value) || 1)} /></td>
                  <td className="p-1"><input className="border rounded px-1 py-1" style={{ width: '8ch' }} value={line.unit} onChange={(e) => updateLine(line.id, 'unit', e.target.value)} /></td>
                  <td className="p-1"><input type="number" min={0} step="0.01" className="border rounded px-1 py-1 text-right" style={{ width: '10ch' }} value={line.price || ''} onChange={(e) => updateLine(line.id, 'price', parseFloat(e.target.value) || 0)} /></td>
                  {hasLabor && <td className="p-1"><input type="number" min={0} step="0.01" className="border rounded px-1 py-1 text-right" style={{ width: '10ch' }} value={line.laborPrice || ''} onChange={(e) => updateLine(line.id, 'laborPrice', parseFloat(e.target.value) || 0)} /></td>}
                  <td className="p-1 text-right font-medium">₱{lineTotal(line).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="p-1 text-center"><button type="button" onClick={() => removeLine(line.id)} className="text-red-600 text-xs font-medium">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={addLine} className="mt-3 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">+ Add Line</button>
        </div>

        <div className="bg-white rounded-xl shadow p-4 max-w-sm ml-auto">
          <div className="flex justify-between text-xl font-bold mb-3">
            <span>Grand Total</span>
            <span>₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <button onClick={handleSave} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">{editingId ? 'Update Quotation' : 'Save Quotation'}</button>
          <button onClick={printCurrent} className="w-full mt-2 bg-gray-700 text-white py-3 rounded-lg font-bold">Print A5</button>
        </div>
      </div>

      {showPrintAsk && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm text-center">
            <div className="font-bold text-lg mb-2">Quotation Saved</div>
            <div className="mb-4">Print Quotation?</div>
            <div className="flex gap-3">
              <button onClick={() => setShowPrintAsk(false)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg">No</button>
              <button onClick={doPrint} className="flex-1 bg-green-600 text-white py-2 rounded-lg">Yes</button>
            </div>
          </div>
        </div>
      )}

      {printSnap && (
      <div className="print-quote hidden print:block text-[10px] leading-tight">
        <div className="text-center font-bold text-sm mb-1">{branchHeader.name}</div>
        <div className="flex justify-between items-end border-b pb-1 mb-1">
          <div className="font-bold text-xs">QUOTATION</div>
          <div>No. {printSnap.quotationNo}</div>
          <div>{formatDate(printSnap.date)}</div>
        </div>
        <div className="mb-1">
          <div><strong>Customer:</strong> {printSnap.customerName || '—'} &nbsp; <strong>Contact:</strong> {printSnap.customerPhone || '—'}</div>
          <div><strong>Plate:</strong> {printSnap.plateNo || '—'} &nbsp; <strong>Car:</strong> {printSnap.carMake} {printSnap.carModel} {printSnap.yearModel}</div>
          {printSnap.chasisNo && <div><strong>Chasis:</strong> {printSnap.chasisNo}</div>}
        </div>
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '16%' }} />
            <col style={{ width: '34%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr className="border-b">
              <th className="text-left py-0.5">Part No.</th>
              <th className="text-left py-0.5">Description</th>
              <th className="text-left py-0.5">Brand</th>
              <th className="text-center py-0.5">Qty</th>
              <th className="text-left py-0.5">Unit</th>
              <th className="text-right py-0.5">Price</th>
              {hasLabor && <th className="text-right py-0.5">Labor</th>}
              <th className="text-right py-0.5">Total</th>
            </tr>
          </thead>
          <tbody>
            {printSnap.lines.map((l: any) => (
              <tr key={l.id} className="border-b">
                <td className="py-0.5">{l.partNumber}</td>
                <td className="py-0.5">{l.description}</td>
                <td className="py-0.5">{l.brand}</td>
                <td className="py-0.5 text-center">{l.qty}</td>
                <td className="py-0.5">{l.unit}</td>
                <td className="py-0.5 text-right">{l.price.toLocaleString()}</td>
                {hasLabor && <td className="py-0.5 text-right">{(l.laborPrice || 0).toLocaleString()}</td>}
                <td className="py-0.5 text-right">{(l.qty * l.price + (hasLabor ? (Number(l.laborPrice) || 0) : 0)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-right font-bold mt-2">GRAND TOTAL: {printSnap.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
      </div>
      )}
    </div>
  );
}
