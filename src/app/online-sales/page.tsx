'use client';

import { useState } from 'react';
import { currentBranch } from '../../lib/branchData';

export default function OnlineSalesPage() {
  const [shopee, setShopee] = useState({ partnerId: '', partnerKey: '', shopId: '' });
  const [lazada, setLazada] = useState({ appKey: '', appSecret: '', sellerId: '' });
  const [status, setStatus] = useState('Waiting for Shopee and Lazada review. Save your keys here when approved.');

  const save = () => {
    localStorage.setItem('anlurich-shopee', JSON.stringify(shopee));
    localStorage.setItem('anlurich-lazada', JSON.stringify(lazada));
    setStatus('Keys saved on this computer. Connection starts after the review is approved and we add the sync.');
  };

  const goBack = () => {
    const b = currentBranch();
    window.location.href = b && b !== 'admin' ? `/branch/${b}` : b === 'admin' ? '/admin' : '/';
  };

  return (
    <div className="min-h-screen p-4">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl font-bold text-yellow-600">Shopee and Lazada</h1>
        <button onClick={goBack} className="text-blue-600 text-sm">← Back to Dashboard</button>
      </div>
      <p className="text-sm text-gray-600 mb-4">When the review is approved, paste the keys here. Then we can pull online sales and deduct stock.</p>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold mb-2">Shopee</h2>
          <input className="w-full border rounded px-2 py-1 mb-2" placeholder="Partner ID" value={shopee.partnerId} onChange={(e) => setShopee({ ...shopee, partnerId: e.target.value })} />
          <input className="w-full border rounded px-2 py-1 mb-2" placeholder="Partner Key" value={shopee.partnerKey} onChange={(e) => setShopee({ ...shopee, partnerKey: e.target.value })} />
          <input className="w-full border rounded px-2 py-1" placeholder="Shop ID" value={shopee.shopId} onChange={(e) => setShopee({ ...shopee, shopId: e.target.value })} />
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold mb-2">Lazada</h2>
          <input className="w-full border rounded px-2 py-1 mb-2" placeholder="App Key" value={lazada.appKey} onChange={(e) => setLazada({ ...lazada, appKey: e.target.value })} />
          <input className="w-full border rounded px-2 py-1 mb-2" placeholder="App Secret" value={lazada.appSecret} onChange={(e) => setLazada({ ...lazada, appSecret: e.target.value })} />
          <input className="w-full border rounded px-2 py-1" placeholder="Seller ID" value={lazada.sellerId} onChange={(e) => setLazada({ ...lazada, sellerId: e.target.value })} />
        </div>
      </div>
      <button onClick={save} className="mt-4 bg-blue-700 text-white px-5 py-2 rounded-lg font-bold">Save Keys</button>
      <div className="text-sm text-gray-700 mt-3">{status}</div>
    </div>
  );
}
