'use client';

import { useEffect, useState } from 'react';
import { formatDate } from '../lib/branchData';

export default function GroupPage({ title, items }: { title: string; items: { href: string; label: string }[] }) {
  const [logo, setLogo] = useState('');
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setLogo(localStorage.getItem('anlurich-index-logo') || '');
  }, []);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          {logo ? <img src={logo} alt="Logo" className="w-14 h-14 object-contain" /> : null}
          <h1 className="text-xl md:text-2xl font-black tracking-wide text-[#1e3a8a]">AUTO PARTS INVENTORY SYSTEM</h1>
        </div>
        <div className="text-2xl md:text-4xl font-black text-gray-800">{formatDate(today)}</div>
      </div>
      <div className="border-b-2 border-black mb-4" />
      <h2 className="text-xl font-bold text-yellow-600 mb-1">{title}</h2>
      <div className="text-xs text-gray-500 mb-6">Choose a form</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        {items.map((item) => (
          <a key={item.href} href={item.href} className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl px-5 py-6 text-center font-semibold shadow">
            {item.label}
          </a>
        ))}
      </div>
    </div>
  );
}
