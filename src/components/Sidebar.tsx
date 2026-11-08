'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const MAIN = [
  { href: '/sales', label: 'Sales' },
  { href: '/products-menu', label: 'Products' },
  { href: '/accounting', label: 'Accounting' },
  { href: '/stock-request', label: 'Stock Request' },
];

const GROUPS: Record<string, { title: string; items: { href: string; label: string }[] }> = {
  sales: {
    title: 'Sales',
    items: [
      { href: '/pos', label: 'POS System' },
      { href: '/search-invoice', label: 'Search Sales Invoice' },
      { href: '/quotation', label: 'Quotation' },
      { href: '/print', label: 'Print Reports' },
    ],
  },
  products: {
    title: 'Products',
    items: [
      { href: '/product-catalog', label: 'Product Catalog' },
      { href: '/products', label: 'Product Inventory' },
    ],
  },
  accounting: {
    title: 'Accounting',
    items: [
      { href: '/add-supplier', label: 'Add Supplier' },
      { href: '/supplier-receipt', label: 'Record Supplier Invoice' },
      { href: '/search-purchase', label: 'Search Purchase Invoice' },
      { href: '/supplier-return', label: 'Supplier Return' },
      { href: '/expenses', label: 'Company Expense' },
    ],
  },
};

function groupOf(pathname: string) {
  if (['/sales', '/pos', '/search-invoice', '/quotation', '/print'].includes(pathname)) return 'sales';
  if (['/products-menu', '/product-catalog', '/products'].includes(pathname)) return 'products';
  if (['/accounting', '/add-supplier', '/supplier-receipt', '/search-purchase', '/supplier-return', '/expenses'].includes(pathname)) return 'accounting';
  return '';
}

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

  const group = groupOf(pathname);
  const menu = group ? GROUPS[group].items : MAIN;
  const title = group ? GROUPS[group].title : 'MENU';

  return (
    <aside className="w-56 min-h-screen bg-gradient-to-b from-blue-500 to-orange-400 text-white p-3 flex flex-col print:hidden">
      <button onClick={goDashboard} className="text-left mb-4">
        <div className="text-lg font-bold">Dashboard</div>
        <div className="text-2xl font-black tracking-wide">{title}</div>
      </button>
      {branchName && <div className="text-xs opacity-80 mb-3">{branchName}</div>}
      {group && <a href="/branch-menu" className="bg-white/20 rounded-lg px-3 py-2 text-sm text-center font-medium mb-2">← Main Menu</a>}
      <nav className="flex flex-col gap-2 flex-1">
        {menu.map((item) => (
          <a key={item.href} href={item.href} className="bg-blue-700 hover:bg-blue-800 rounded-lg px-3 py-2 text-sm text-center font-medium">
            {item.label}
          </a>
        ))}
      </nav>
      <button onClick={logout} className="mt-4 bg-purple-600 hover:bg-purple-700 rounded-lg py-2 text-sm font-medium">
        LOG OUT
      </button>
      <div className="text-xs mt-3 opacity-80">Powered & Designed by Anlu</div>
    </aside>
  );
}
