'use client';
import GroupPage from '../../components/GroupPage';

export default function SalesPage() {
  return (
    <GroupPage
      title="Sales"
      items={[
        { href: '/pos', label: 'POS System' },
        { href: '/search-invoice', label: 'Search Sales Invoice' },
        { href: '/quotation', label: 'Quotation' },
        { href: '/print', label: 'Print Reports' },
      ]}
    />
  );
}
