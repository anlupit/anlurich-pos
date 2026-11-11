'use client';

import { useEffect, useState } from 'react';

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function prettyWhen(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || '';
  const date = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Manila' });
  return `${date} Time ${time}`;
}

function addMonths(date: string, months: number) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export default function CustomerPortal() {
  const [phone, setPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [logo, setLogo] = useState('/logo.png');
  const [banner, setBanner] = useState('/banner.png');
  const [customer, setCustomer] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLogo(localStorage.getItem('anlurich-index-logo') || '/logo.png');
    setBanner(localStorage.getItem('anlurich-index-banner') || '/banner.png');
  }, []);

  const login = async () => {
    const ph = phone.trim();
    const pl = plate.trim().toLowerCase();
    if (!ph && !pl) return setError('Enter your contact number or plate number');
    setLoading(true);
    setError('');
    try {
      const [pos, noInv] = await Promise.all([
        fetch('/api/records?table=sales&branch=admin', { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
        fetch('/api/records?table=no_invoices&branch=admin', { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
      ]);
      const all = [...(Array.isArray(pos) ? pos : []), ...(Array.isArray(noInv) ? noInv : [])];
      const mine = all.filter((s) => {
        const phoneOk = ph && String(s.customerPhone || '').replace(/\D/g, '').includes(ph.replace(/\D/g, ''));
        const plateOk = pl && String(s.plateNo || '').toLowerCase().replace(/[^a-z0-9]/g, '') === pl.replace(/[^a-z0-9]/g, '');
        return phoneOk || plateOk;
      });
      if (!mine.length) {
        setCustomer(null);
        setHistory([]);
        setError('No record found. Use the contact number or plate on your invoice.');
        return;
      }
      mine.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      setCustomer(mine[0]);
      setHistory(mine);
    } catch {
      setError('Could not load records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const last = history[0];
  const nextOil = last ? addMonths(last.date, 6) : '';
  const laborTotal = history.reduce((sum, s) => sum + (s.items || []).reduce((n: number, it: any) => n + Number(it.labor || 0), 0), 0);
  const partsTotal = history.reduce((sum, s) => sum + Number(s.total || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow overflow-hidden mb-4">
          <div className="h-36 md:h-48 bg-gray-100">
            <img src={banner} alt="Banner" className="w-full h-full object-cover object-center" />
          </div>
          <div className="flex items-center gap-3 p-4">
            <img src={logo} alt="Logo" className="w-16 h-16 md:w-20 md:h-20 object-contain" />
            <div>
              <h1 className="text-2xl font-black text-[#1e3a8a]">My Vehicle History</h1>
              <p className="text-sm text-gray-500">Anlurich OPC · Avenders · Dasma · Lipa</p>
            </div>
          </div>
        </div>

        {!customer && (
          <div className="bg-white rounded-xl shadow p-4 space-y-3">
            <p className="text-sm">Log in with the contact number or plate number on your invoice.</p>
            <input className="w-full border rounded px-3 py-2" placeholder="Contact number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className="w-full border rounded px-3 py-2" placeholder="Plate number" value={plate} onChange={(e) => setPlate(e.target.value)} />
            <button onClick={login} disabled={loading} className="w-full bg-blue-700 text-white py-2 rounded-lg font-bold">{loading ? 'Checking...' : 'View My History'}</button>
            {error && <div className="text-sm text-red-600">{error}</div>}
          </div>
        )}

        {customer && (
          <>
            <div className="bg-white rounded-xl shadow p-4 mb-3">
              <div className="flex justify-between">
                <div>
                  <div className="font-bold text-lg">{customer.customerName || 'Customer'}</div>
                  <div className="text-sm text-gray-500">{customer.customerPhone || '—'} · {customer.plateNo || 'No plate'} · {customer.vehicleType || ''}</div>
                </div>
                <button onClick={() => { setCustomer(null); setHistory([]); }} className="text-blue-600 text-sm">Log out</button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="bg-blue-50 rounded p-2"><div className="text-xs">Visits</div><div className="font-bold">{history.length}</div></div>
                <div className="bg-green-50 rounded p-2"><div className="text-xs">Parts</div><div className="font-bold">{money(partsTotal)}</div></div>
                <div className="bg-orange-50 rounded p-2"><div className="text-xs">Labor</div><div className="font-bold">{money(laborTotal)}</div></div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
              <div className="font-bold">Next maintenance</div>
              <div className="text-sm mt-1">Last visit: {last?.date || '—'}</div>
              <div className="text-sm">Suggested oil / checkup: <b>{nextOil || '—'}</b> (about 6 months after last service)</div>
              <div className="text-xs text-gray-500 mt-1">Bring your plate number when you visit.</div>
            </div>

            <div className="space-y-3">
              {history.map((s) => (
                <div key={s.id} className="bg-white rounded-xl shadow p-4">
                  <div className="flex justify-between">
                    <div className="font-bold">{prettyWhen(s.dateTime || s.date)} INV No.{s.invoiceNo}</div>
                    <div className="font-bold">{money(s.total)}</div>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">{s.plateNo || ''} {s.vehicleType || ''} · {s.branch || ''}</div>
                  <table className="w-full text-sm">
                    <tbody>
                      {(s.items || []).map((it: any, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="py-1">{it.partNumber} {it.description}</td>
                          <td className="py-1 text-right">{it.qty} × {money(it.price)}</td>
                          {Number(it.labor) > 0 && <td className="py-1 text-right text-orange-700">Labor {money(it.labor)}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
