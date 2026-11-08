'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const MAIN = [
  { href: '/pos', label: 'Sales' },
  { href: '/products-menu', label: 'Products' },
  { href: '/accounting', label: 'Accounting' },
  { href: '/stock-request', label: 'Stock Request' },
];

const GROUPS: Record<string, { title: string; items: { href: string; label: string }[] }> = {
  sales: {
    title: 'Sales',
    items: [
      { href: '/pos', label: 'POS System' },
      { href: '/no-invoice', label: 'No Invoice' },
      { href: '/search-invoice', label: 'Search Sales Invoice' },
      { href: '/quotation', label: 'Quotation' },
      { href: '/unpaid', label: 'Unpaid Invoice' },
      { href: '/download', label: 'Download' },
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

const ICONS: Record<string, string> = {
  Sales: 'M3 17l6-6 4 4 8-8',
  Products: 'M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7',
  Accounting: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
  'Stock Request': 'M7 3h10v18H7zM9 7h6M9 11h6M9 15h4',
  'POS System': 'M4 6h16v10H4zM8 20h8',
  'No Invoice': 'M6 3h8l4 4v14H6zM10 11h6M10 15h4',
  'Search Sales Invoice': 'M11 4a7 7 0 100 14 7 7 0 000-14zm9 16l-4-4',
  Quotation: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4',
  'Unpaid Invoice': 'M4 7h16v10H4zM4 11h16',
  Download: 'M12 4v10m0 0l-4-4m4 4l4-4M5 20h14',
  'Print Reports': 'M6 8V4h12v4M6 16H4V10h16v6h-2M8 14h8v6H8z',
  'Product Catalog': 'M4 5h16v14H4zM8 9h8M8 13h6',
  'Product Inventory': 'M3 7l9-4 9 4v10l-9 4-9-4V7z',
  'Add Supplier': 'M12 5v14M5 12h14',
  'Record Supplier Invoice': 'M6 3h12v18H6zM9 8h6M9 12h6',
  'Search Purchase Invoice': 'M11 4a7 7 0 100 14 7 7 0 000-14zm9 16l-4-4',
  'Supplier Return': 'M7 7l-3 5h16l-3-5M8 17h8',
  'Company Expense': 'M4 6h16v12H4zM4 10h16',
};

function Icon({ label }: { label: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d={ICONS[label] || 'M4 6h16v12H4z'} />
    </svg>
  );
}

function groupOf(pathname: string) {
  if (['/sales', '/pos', '/no-invoice', '/search-invoice', '/quotation', '/unpaid', '/download', '/print'].includes(pathname)) return 'sales';
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
  const menu = (group ? GROUPS[group].items : MAIN).filter((item) => item.href !== pathname);
  const title = group ? GROUPS[group].title : 'MENU';

  return (
    <aside className="w-56 min-h-screen bg-gradient-to-b from-blue-500 to-orange-400 text-white p-3 flex flex-col print:hidden">
      <button onClick={goDashboard} className="text-left mb-4">
        <div className="text-lg font-bold">Dashboard</div>
        <div className="text-2xl font-black tracking-wide">{title}</div>
      </button>
      {branchName && <div className="bg-blue-700 rounded-lg px-3 py-2 mb-3 text-center font-bold text-[18px] leading-tight break-words">{branchName}</div>}
      <nav className="flex flex-col gap-2 flex-1">
        {menu.map((item) => (
          <a key={item.href} href={item.href} className="bg-blue-700 hover:bg-blue-800 rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2">
            <Icon label={item.label} />
            <span className="flex-1 text-left">{item.label}</span>
          </a>
        ))}
        {group && <a href="/branch-menu" className="bg-white/20 rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2"><Icon label="Main Menu" /><span>Main Menu</span></a>}
      </nav>
      <button onClick={logout} className="mt-4 bg-purple-600 hover:bg-purple-700 rounded-lg py-2 text-sm font-medium">
        LOG OUT
      </button>
      <div className="text-xs mt-3 opacity-80">Powered & Designed by Anlu</div>
    </aside>
  );
}
