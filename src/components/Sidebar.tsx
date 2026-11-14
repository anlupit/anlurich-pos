'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const MAIN = [
  { href: '/pos', label: 'Sales' },
  { href: '/products-menu', label: 'Products' },
  { href: '/accounting', label: 'Accounting' },
  { href: '/stock-request', label: 'Stock Request' },
  { href: '/download-reports', label: 'Download Reports' },
  { href: '/check-voucher', label: 'Check Voucher' },
];

const GROUPS: Record<string, { title: string; items: { href: string; label: string }[] }> = {
  sales: {
    title: 'Sales',
    items: [
      { href: '/pos', label: 'POS System' },
      { href: '/bosch-pos', label: 'Bosch POS' },
      { href: '/no-invoice', label: 'No Invoice' },
      { href: '/search-invoice', label: 'Search Sales Invoice' },
      { href: '/customers', label: 'Customer List' },
      { href: '/crm', label: 'CRM Salesman' },
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
      { href: '/bosch-catalog', label: 'Bosch Catalog' },
      { href: '/products', label: 'Product Inventory' },
      { href: '/low-stock', label: 'Low Stock Report' },
      { href: '/stock-history', label: 'Stock History' },
      { href: '/backup', label: 'Backup and Restore' },
      { href: '/activity', label: 'Activity Log' },
      { href: '/online-sales', label: 'Shopee and Lazada' },
    ],
  },
  accounting: {
    title: 'Accounting',
    items: [
      { href: '/add-supplier', label: 'Add Supplier' },
      { href: '/supplier-receipt', label: 'Record Supplier Invoice' },
      { href: '/bosch-supplier', label: 'Record Bosch Invoice' },
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
  'Download Reports': 'M12 4v10m0 0l-4-4m4 4l4-4M5 20h14',
  'POS System': 'M4 6h16v10H4zM8 20h8',
  'Bosch POS': 'M4 6h16v10H4zM8 20h8',
  'No Invoice': 'M6 3h8l4 4v14H6zM10 11h6M10 15h4',
  'Search Sales Invoice': 'M11 4a7 7 0 100 14 7 7 0 000-14zm9 16l-4-4',
  Quotation: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4',
  'Unpaid Invoice': 'M4 7h16v10H4zM4 11h16',
  Download: 'M12 4v10m0 0l-4-4m4 4l4-4M5 20h14',
  'Print Reports': 'M6 8V4h12v4M6 16H4V10h16v6h-2M8 14h8v6H8z',
  'Product Catalog': 'M4 5h16v14H4zM8 9h8M8 13h6',
  'Product Inventory': 'M3 7l9-4 9 4v10l-9 4-9-4V7z',
  'Low Stock Report': 'M4 19h16M6 16l3-6 3 4 2-3 4 5',
  'Stock History': 'M4 6h16v12H4zM8 10h8M8 14h5',
  'Backup and Restore': 'M12 4v8m0 0l-3-3m3 3l3-3M5 18h14',
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
  if (['/sales', '/pos', '/bosch-pos', '/no-invoice', '/search-invoice', '/quotation', '/unpaid', '/download', '/print', '/customers', '/crm', '/activity', '/online-sales'].includes(pathname)) return 'sales';
  if (['/products-menu', '/product-catalog', '/bosch-catalog', '/products', '/low-stock', '/stock-history', '/backup'].includes(pathname)) return 'products';
  if (['/accounting', '/add-supplier', '/supplier-receipt', '/bosch-supplier', '/search-purchase', '/supplier-return', '/expenses'].includes(pathname)) return 'accounting';
  return '';
}

export default function Sidebar() {
  const pathname = usePathname();
  const [branchName, setBranchName] = useState('');
  const [branchId, setBranchId] = useState('');

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
    setBranchId(id);
    setBranchName(names[id] || '');
  }, []);

  if (pathname === '/' || pathname.startsWith('/customer')) return null;

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
  const boschOk = ['anlurich', 'sezan', 'admin'].includes(branchId);
  const menu = (group ? GROUPS[group].items : MAIN)
    .filter((item) => item.href !== pathname)
    .filter((item) => boschOk || !item.href.startsWith('/bosch'));
  const title = group ? GROUPS[group].title : 'MENU';

  return (
    <aside className="w-52 h-screen overflow-y-auto bg-gradient-to-b from-blue-500 to-orange-400 text-white p-2 flex flex-col print:hidden">
      <button onClick={goDashboard} className="text-left mb-2 bg-blue-800 hover:bg-blue-900 rounded-lg px-3 py-3 w-full">
        <div className="text-lg font-black">Main Page</div>
        <div className="text-sm font-bold opacity-90">{title}</div>
      </button>
      {branchName && <div className="bg-blue-700 rounded-lg px-2 py-1 mb-2 text-center font-bold text-[15px] leading-tight break-words">{branchName}</div>}
      <nav className="flex flex-col gap-1 flex-1">
        {menu.map((item) => (
          <a key={item.href} href={item.href} className="bg-blue-700 hover:bg-blue-800 rounded-lg px-2 py-1.5 text-xs font-medium flex items-center gap-2">
            <Icon label={item.label} />
            <span className="flex-1 text-left">{item.label}</span>
          </a>
        ))}
        {group && <a href="/branch-menu" className="bg-white/20 rounded-lg px-3 py-3 text-base font-bold flex items-center gap-2"><Icon label="Main Menu" /><span>Main Menu</span></a>}
      </nav>
      <button onClick={logout} className="mt-2 bg-purple-600 hover:bg-purple-700 rounded-lg py-1.5 text-xs font-medium">
        LOG OUT
      </button>
      <div className="text-[10px] mt-2 opacity-80">Powered & Designed by Anlu</div>
    </aside>
  );
}
