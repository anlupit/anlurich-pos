'use client';

import { useEffect, useRef, useState } from 'react';
import { currentBranch, loadStockCloud, setStockQty } from '../../lib/branchData';
import { loadProductsCloud } from '../../lib/products';
import { loadUsers } from '../../lib/users';

const BUTTONS = [
  { id: 'anlurich', name: 'Anlurich OPC' },
  { id: 'avenders', name: 'Avenders' },
  { id: 'dasma', name: 'Dasma Auto Parts' },
  { id: 'lipa', name: 'Lipa Auto Parts' },
  { id: 'sezan', name: 'Baliwag Auto Parts' },
];
const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MobileParts() {
  const [branch, setBranch] = useState('');
  const [mode, setMode] = useState<'menu' | 'search' | 'receive' | 'lazada' | 'shopee' | 'returns'>('menu');
  const [returnSource, setReturnSource] = useState<'lazada' | 'shopee'>('lazada');
  const [returnCode, setReturnCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [saleLines, setSaleLines] = useState([{ id: '1', barcode: '', partNumber: '', amount: '', commission: '', qty: '1' }]);
  const [loginFor, setLoginFor] = useState<string | null>(null);
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [stock, setStock] = useState<Record<string, { qty: number; location?: string }>>({});
  const [searchBarcode, setSearchBarcode] = useState('');
  const [searchPart, setSearchPart] = useState('');
  const [searchBrand, setSearchBrand] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchDesc, setSearchDesc] = useState('');
  const [invAction, setInvAction] = useState<'in' | 'out'>('in');
  const [invDetail, setInvDetail] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [received, setReceived] = useState('');
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const savingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<any>(null);

  useEffect(() => {
    const b = currentBranch() || '';
    setBranch(b);
    if (b) loadBranch(b);
    return () => stopCamera();
  }, []);

  const loadBranch = (b: string) => {
    Promise.all([
      fetch('/api/records?table=products', { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
      loadStockCloud(b).catch(() => ({})),
    ]).then(([catalog, qtyMap]) => {
      setProducts(Array.isArray(catalog) ? catalog : []);
      setStock(qtyMap || {});
    });
  };

  const submitLogin = async () => {
    if (!loginFor) return;
    const users = await loadUsers();
    const ok = users.some((u) => u.branch === loginFor && u.name === loginName.trim() && u.password === loginPassword);
    if (!ok) return alert('Wrong login.');
    localStorage.setItem('anlurich-branch', loginFor);
    sessionStorage.setItem('anlurich-auth', loginFor);
    setBranch(loginFor);
    setLoginFor(null);
    loadBranch(loginFor);
  };

  const find = (code: string) => {
    const key = code.trim().toLowerCase();
    if (!key) return;
    const found = products.find((p) => String(p.barcode || '').trim().toLowerCase() === key || String(p.partNumber || '').trim().toLowerCase() === key);
    if (!found) return alert('Part not found.');
    setSelected(found);
    setQuery(found.partNumber || '');
    setReceived('');
  };

  const stopCamera = () => {
    stopRef.current?.();
    stopRef.current = null;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  };

  const startCamera = async () => {
    const Detector = (window as any).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) return alert('Use a Bluetooth scanner, or type the barcode.');
    setScanning(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    const detector = new Detector({ formats: ['code_128', 'ean_13', 'ean_8', 'qr_code', 'code_39'] });
    let on = true;
    stopRef.current = () => { on = false; };
    const tick = async () => {
      if (!on || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes[0]?.rawValue) { setSearchBarcode(codes[0].rawValue); find(codes[0].rawValue); stopCamera(); return; }
      } catch {}
      if (on) requestAnimationFrame(tick);
    };
    tick();
  };

  const receive = async () => {
    if (savingRef.current || !selected || !branch) return;
    const add = Number(received) || 0;
    if (add <= 0) return alert('Enter the quantity.');
    if (invAction === 'out' && !invDetail) return alert('Choose where it was sent.');
    savingRef.current = true;
    setSaving(true);
    const current = Number(stock[selected.id]?.qty || 0);
    const nextQty = invAction === 'in' ? current + add : Math.max(0, current - add);
    setStockQty(selected.id, nextQty, stock[selected.id]?.location || '', branch);
    await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'inventory', row: { id: `${branch}-${selected.id}`, branch, productId: selected.id, partNumber: selected.partNumber, brand: selected.brand, name: selected.name, qty: nextQty, action: invAction, detail: invDetail, moved: add } }) });
    setStock((prev) => ({ ...prev, [selected.id]: { qty: nextQty, location: prev[selected.id]?.location } }));
    setReceived('');
    setSelected(null);
    setSearchBarcode('');
    setSearchPart('');
    setInvDetail('');
    savingRef.current = false;
    setSaving(false);
    alert(`${invAction === 'in' ? 'Added' : 'Sent'} ${add}. ${selected.partNumber} ${selected.brand || ''} ${selected.name || ''}. New quantity is ${nextQty}.`);
  };

  const lineTotal = (l: { amount: string; qty: string }) => (Number(l.amount) || 0) * (Number(l.qty) || 0);
  const saleTotal = saleLines.reduce((n, l) => n + lineTotal(l), 0);

  const saveOnline = async (source: 'lazada' | 'shopee') => {
    if (savingRef.current) return;
    if (!customerName.trim() || !orderNo.trim()) return alert('Enter customer name and order number.');
    const valid = saleLines.filter((l) => l.partNumber.trim() && Number(l.qty) > 0);
    if (!valid.length) return alert('Add at least one part.');
    savingRef.current = true;
    setSaving(true);
    const row = { id: `${branch}-${source}-${orderNo.trim()}`, branch, source, customerName: customerName.trim(), orderNo: orderNo.trim(), lines: valid, total: saleTotal, createdAt: new Date().toISOString() };
    await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: `${source}_sales`, row }) });
    for (const l of valid) {
      const found = products.find((p) => String(p.partNumber || '').toLowerCase() === l.partNumber.toLowerCase());
      if (found) {
        const nextQty = Math.max(0, Number(stock[found.id]?.qty || 0) - Number(l.qty || 0));
        setStockQty(found.id, nextQty, stock[found.id]?.location || '', branch);
        await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'inventory', row: { id: `${branch}-${found.id}`, branch, productId: found.id, partNumber: found.partNumber, qty: nextQty } }) });
      }
    }
    setCustomerName('');
    setOrderNo('');
    setSaleLines([{ id: Date.now().toString(), barcode: '', partNumber: '', amount: '', commission: '', qty: '1' }]);
    savingRef.current = false;
    setSaving(false);
    alert(`${source === 'lazada' ? 'Lazada' : 'Shopee'} sale saved. Stock deducted for this branch.`);
  };

  const processReturn = async () => {
    if (savingRef.current || !returnCode.trim()) return alert('Scan the barcode or type the order number.');
    savingRef.current = true;
    setSaving(true);
    const res = await fetch(`/api/records?table=${returnSource}_sales&branch=${branch}`, { cache: 'no-store' });
    const rows = await res.json().catch(() => []);
    const code = returnCode.trim().toLowerCase();
    const sale = (Array.isArray(rows) ? rows : []).find((r: any) => String(r.orderNo || '').toLowerCase() === code || (r.lines || []).some((l: any) => String(l.barcode || '').toLowerCase() === code || String(l.partNumber || '').toLowerCase() === code));
    if (!sale) { savingRef.current = false; setSaving(false); return alert('Order not found.'); }
    if (sale.returned) { savingRef.current = false; setSaving(false); return alert('This order was already returned.'); }
    for (const l of sale.lines || []) {
      const found = products.find((p) => String(p.partNumber || '').toLowerCase() === String(l.partNumber || '').toLowerCase());
      if (found) {
        const nextQty = Number(stock[found.id]?.qty || 0) + Number(l.qty || 0);
        setStockQty(found.id, nextQty, stock[found.id]?.location || '', branch);
        await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'inventory', row: { id: `${branch}-${found.id}`, branch, productId: found.id, partNumber: found.partNumber, qty: nextQty } }) });
        setStock((prev) => ({ ...prev, [found.id]: { qty: nextQty, location: prev[found.id]?.location } }));
      }
    }
    await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: `${returnSource}_sales`, row: { ...sale, returned: true, originalTotal: Number(sale.originalTotal || sale.total || 0), returnedAmount: Number(sale.total || 0), netTotal: 0, returnedAt: new Date().toISOString() } }) });
    setReturnCode('');
    savingRef.current = false;
    setSaving(false);
    alert(`Return saved. Stock added back. Returned amount ₱${Number(sale.total || 0).toLocaleString()} deducted. Original sale kept for monitoring.`);
  };

  const clearSearch = () => {
    setSearchBarcode('');
    setSearchPart('');
    setSearchBrand('');
    setSearchName('');
    setSearchDesc('');
    setSelected(null);
    stopCamera();
  };

  const shown = products.filter((p) => {
    const barcode = searchBarcode.trim().toLowerCase();
    const part = searchPart.trim().toLowerCase();
    const brand = searchBrand.trim().toLowerCase();
    const name = searchName.trim().toLowerCase();
    const desc = searchDesc.trim().toLowerCase();
    if (![barcode, part, brand, name, desc].some(Boolean)) return false;
    return (!barcode || String(p.barcode || '').toLowerCase().includes(barcode))
      && (!part || String(p.partNumber || '').toLowerCase().includes(part))
      && (!brand || String(p.brand || '').toLowerCase().includes(brand))
      && (!name || String(p.name || '').toLowerCase().includes(name))
      && (!desc || String(p.description || '').toLowerCase().includes(desc));
  }).slice(0, 20);

  if (!branch) return (
    <div className="min-h-screen p-3" style={{ background: '#f4f6fb' }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-3">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain" />
          <h1 className="text-lg font-black tracking-wide text-[#1e3a8a]">AUTO PARTS INVENTORY SYSTEM</h1>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {BUTTONS.map((b) => (
            <button key={b.id} onClick={() => { setLoginFor(b.id); setLoginName(''); setLoginPassword(''); }} className="h-12 bg-gradient-to-b from-[#7c6bff] to-[#6d5efc] text-white rounded-xl font-semibold shadow">{b.name}</button>
          ))}
        </div>
        <div className="rounded-xl overflow-hidden shadow bg-white h-48 mb-2">
          <img src="/banner.png" alt="Banner" className="w-full h-full object-cover" />
        </div>
        <div className="text-sm font-semibold text-center">Powered & Designed by Anlu</div>
      </div>
      {loginFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <form className="bg-white rounded-xl p-5 w-full max-w-sm" onSubmit={(e) => { e.preventDefault(); submitLogin(); }}>
            <h2 className="font-bold mb-1">Login</h2>
            <p className="text-sm text-gray-500 mb-3">{BUTTONS.find((b) => b.id === loginFor)?.name}</p>
            <input className="w-full border rounded px-3 py-2 mb-2" placeholder="Login Name" value={loginName} onChange={(e) => setLoginName(e.target.value)} />
            <input type="password" className="w-full border rounded px-3 py-2 mb-3" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
            <div className="flex gap-3">
              <button type="button" onClick={() => setLoginFor(null)} className="flex-1 bg-gray-400 text-white py-2 rounded">Cancel</button>
              <button type="submit" className="flex-1 bg-purple-600 text-white py-2 rounded">Enter</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-3 max-w-3xl mx-auto">
      <div className="bg-[#1e3a8a] text-white rounded-xl p-4 mb-3 flex items-center gap-3">
        <img src="/logo.png" alt="Logo" className="w-12 h-12 bg-white rounded object-contain" />
        <div>
          <div className="text-xs opacity-80">{branch.toUpperCase()}</div>
          <h1 className="text-2xl font-black">Anlurich APP</h1>
        </div>
      </div>
      {mode === 'menu' && (
        <div className="grid gap-3">
          <button onClick={() => { setMode('search'); setSelected(null); setQuery(''); }} className="bg-blue-700 text-white rounded-xl py-6 text-xl font-black">SEARCH PRODUCT</button>
          <button onClick={() => { setMode('receive'); setSelected(null); setQuery(''); }} className="bg-green-700 text-white rounded-xl py-6 text-xl font-black">UPDATE INVENTORY</button>
          <button onClick={() => setMode('lazada')} className="rounded-xl py-6 text-xl font-black text-white" style={{ background: '#0f146d' }}>LAZADA SALE</button>
          <button onClick={() => setMode('shopee')} className="rounded-xl py-6 text-xl font-black text-white" style={{ background: '#ee4d2d' }}>SHOPEE SALE</button>
          <button onClick={() => setMode('returns')} className="bg-amber-600 text-white rounded-xl py-6 text-xl font-black">ONLINE RETURNS</button>
        </div>
      )}
      {mode !== 'menu' && <button onClick={() => { stopCamera(); setMode('menu'); setSelected(null); }} className="mb-3 text-blue-700 font-bold">← Back</button>}
      {(mode === 'lazada' || mode === 'shopee') && (
        <div className="bg-white rounded-xl border p-3">
          <div className="font-black text-lg mb-2">{mode === 'lazada' ? 'Lazada Sale' : 'Shopee Sale'}</div>
          <input className="border rounded px-3 py-2 w-full mb-2" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input className="border rounded px-3 py-2 w-full mb-3" placeholder="Order Number" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} />
          {saleLines.map((l) => (
            <div key={l.id} className="border rounded-xl p-2 mb-2">
              <input className="border rounded px-2 py-2 w-full mb-1" placeholder="Barcode" value={l.barcode} onChange={(e) => setSaleLines(saleLines.map((x) => x.id === l.id ? { ...x, barcode: e.target.value } : x))} />
              <input className="border rounded px-2 py-2 w-full mb-1" placeholder="Part Number" value={l.partNumber} onChange={(e) => setSaleLines(saleLines.map((x) => x.id === l.id ? { ...x, partNumber: e.target.value } : x))} />
              <div className="grid grid-cols-2 gap-1">
                <input className="border rounded px-2 py-2" placeholder="Amount" value={l.amount} onChange={(e) => setSaleLines(saleLines.map((x) => x.id === l.id ? { ...x, amount: e.target.value } : x))} />
                <input className="border rounded px-2 py-2" placeholder="Commission" value={l.commission} onChange={(e) => setSaleLines(saleLines.map((x) => x.id === l.id ? { ...x, commission: e.target.value } : x))} />
                <input className="border rounded px-2 py-2" placeholder="Quantity" value={l.qty} onChange={(e) => setSaleLines(saleLines.map((x) => x.id === l.id ? { ...x, qty: e.target.value } : x))} />
                <div className="border rounded px-2 py-2 font-bold">Total {money(lineTotal(l))}</div>
              </div>
            </div>
          ))}
          <button onClick={() => setSaleLines([...saleLines, { id: Date.now().toString(), barcode: '', partNumber: '', amount: '', commission: '', qty: '1' }])} className="w-full border rounded-xl py-2 mb-2">+ Add Line</button>
          <div className="text-right font-black mb-2">TOTAL {money(saleTotal)}</div>
          <button onClick={() => saveOnline(mode)} disabled={saving} className="w-full text-white rounded-xl py-3 font-bold disabled:opacity-50" style={{ background: mode === 'lazada' ? '#0f146d' : '#ee4d2d' }}>{saving ? 'Saving...' : 'Save Sale'}</button>
        </div>
      )}
      {mode === 'returns' && (
        <div className="bg-white rounded-xl border p-4">
          <div className="font-black text-lg mb-2">Online Returns</div>
          <select className="border rounded-xl px-3 py-3 w-full mb-2" value={returnSource} onChange={(e) => setReturnSource(e.target.value as 'lazada' | 'shopee')}>
            <option value="lazada">Lazada returned this</option>
            <option value="shopee">Shopee returned this</option>
          </select>
          <input className="border rounded-xl px-4 py-4 w-full text-lg mb-3" placeholder="Scan barcode or order number" value={returnCode} onChange={(e) => setReturnCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); processReturn(); } }} />
          <button onClick={processReturn} disabled={saving} className="w-full bg-amber-600 text-white rounded-xl py-4 font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Return to Inventory'}</button>
        </div>
      )}
      {mode === 'search' && <div className="font-bold mb-2">Search Product Catalog</div>}
      {(mode === 'search' || mode === 'receive') && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="flex gap-1">
              <input className="border rounded-xl px-3 py-3 w-full" placeholder="Barcode" value={searchBarcode} onChange={(e) => setSearchBarcode(e.target.value)} />
              <button onClick={scanning ? stopCamera : startCamera} className="bg-black text-white rounded-xl px-3 font-bold">{scanning ? 'Stop' : 'Scan'}</button>
            </div>
            <input className="border rounded-xl px-3 py-3" placeholder="Part Number" value={searchPart} onChange={(e) => setSearchPart(e.target.value)} />
          </div>
          {mode === 'search' && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              <input className="border rounded-xl px-3 py-3" placeholder="Brand" value={searchBrand} onChange={(e) => setSearchBrand(e.target.value)} />
              <input className="border rounded-xl px-3 py-3" placeholder="Product Name" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
              <input className="border rounded-xl px-3 py-3" placeholder="Description" value={searchDesc} onChange={(e) => setSearchDesc(e.target.value)} />
            </div>
          )}
          {scanning && <video ref={videoRef} className="w-full rounded-xl mb-3 bg-black" muted playsInline />}
          {shown.length > 0 && (
            <div className="bg-white rounded-xl border mb-3 overflow-auto">
              <div className="grid grid-cols-5 text-xs font-bold bg-gray-100 p-2"><span>Part Number</span><span>Brand</span><span>Description</span><span>Cost</span><span>Price</span></div>
              {shown.map((p) => (
                <button key={p.id} className="grid grid-cols-5 w-full text-left text-sm px-2 py-2 border-t" onClick={() => { setSelected(p); setSearchBarcode(p.barcode || ''); setSearchPart(p.partNumber || ''); }}>
                  <span>{p.partNumber}</span><span>{p.brand || '—'}</span><span>{p.description || p.name}</span><span>{money(p.costPrice || 0)}</span><span>{money(p.sellingPrice || 0)}</span>
                </button>
              ))}
            </div>
          )}
          {selected && mode === 'receive' && (
            <div className="bg-white rounded-xl border p-4">
              <div className="text-xs text-gray-500">Update inventory · {branch.toUpperCase()}</div>
              <div className="text-xl font-black">{selected.partNumber}</div>
              <div className="font-bold">{selected.brand || 'No brand'}</div>
              <div className="mb-1">{selected.name}</div>
              <div className="text-sm text-gray-500 mb-3">Current stock {stock[selected.id]?.qty || 0}</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button onClick={() => setInvAction('in')} className={`rounded-xl py-2 font-bold ${invAction === 'in' ? 'bg-green-700 text-white' : 'border'}`}>Input Quantity</button>
                <button onClick={() => setInvAction('out')} className={`rounded-xl py-2 font-bold ${invAction === 'out' ? 'bg-red-700 text-white' : 'border'}`}>Output Quantity</button>
              </div>
              <input inputMode="numeric" className="border rounded-xl px-4 py-4 w-full text-2xl text-center mb-2" placeholder="Quantity" value={received} onChange={(e) => setReceived(e.target.value.replace(/[^0-9]/g, ''))} />
              {invAction === 'out' && (
                <select className="border rounded-xl px-3 py-3 w-full mb-2" value={invDetail} onChange={(e) => setInvDetail(e.target.value)}>
                  <option value="">Details</option>
                  <option>Sent to Anlurich</option>
                  <option>Sent to Avenders</option>
                  <option>Sent to Dasma</option>
                  <option>Sent to Lipa</option>
                  <option>Sent to Baliwag Auto Parts</option>
                </select>
              )}
              <button onClick={receive} disabled={saving} className="w-full bg-green-700 text-white rounded-xl py-4 text-lg font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save Inventory'}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
