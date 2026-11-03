'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const MENU = [
  { href: '/pos', label: 'POS System' },
  { href: '/search-invoice', label: 'Search Sales Invoice' },
  { href: '/quotation', label: 'Quotation' },
  { href: '/add-supplier', label: 'Add Supplier' },
  { href: '/supplier-receipt', label: 'Record Supplier Invoice' },
  { href: '/search-purchase', label: 'Search Purchase Invoice' },
  { href: '/supplier-return', label: 'Supplier Return' },
  { href: '/products', label: 'Product Inventory' },
  { href: '/product-catalog', label: 'Product Catalog' },
  { href: '/stock-request', label: 'Stock Request' },
  { href: '/print', label: 'Print Reports' },
  { href: '/owner-report', label: 'Owner Report' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [branchName, setBranchName] = useState('');

  useEffect(() => {
    const names: Record<string, string> = {
      anlurich: 'ANLURICH OPC',
      dasma: 'Dasma Auto Parts',
      sezan: 'Sezan',
      timitsu: 'Timitsu',
      avenders: 'Avenders',
      lipa: 'Lipa Auto Parts',
      admin: 'ADMIN',
    };
    const id = localStorage.getItem('anlurich-branch') || '';
    setBranchName(names[id] || '');
  }, []);

  if (pathname === '/') return null;

  const logout = () => {
    localStorage.removeItem('anlurich-branch');
    window.location.href = '/';
  };

  const goDashboard = () => {
    const id = localStorage.getItem('anlurich-branch');
    if (id && id !== 'admin') window.location.href = `/branch/${id}`;
    else if (id === 'admin') window.location.href = '/admin';
    else window.location.href = '/';
  };

  return (
    <aside className="w-56 min-h-screen bg-gradient-to-b from-blue-500 to-orange-400 text-white p-3 flex flex-col print:hidden">
      <button onClick={goDashboard} className="text-left mb-4">
        <div className="text-lg font-bold">Dashboard</div>
        <div className="text-2xl font-black tracking-wide">MENU</div>
      </button>
      {branchName && <div className="text-xs opacity-80 mb-3">{branchName}</div>}
      <nav className="flex flex-col gap-2 flex-1">
        {MENU.map((item) => (
          <a key={item.href} href={item.href} className="bg-blue-700 hover:bg-blue-800 rounded-lg px-3 py-2 text-sm text-center font-medium">
            {item.label}
          </a>
        ))}
      </nav>
      <button onClick={logout} className="mt-4 bg-purple-600 hover:bg-purple-700 rounded-lg py-2 text-sm font-medium">
        LOG OUT
      </button>
      <div className="text-xs mt-3 opacity-80">AI-powered platform by ANLU... 🥰</div>
    </aside>
  );
}
