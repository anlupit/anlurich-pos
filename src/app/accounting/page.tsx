'use client';
import GroupPage from '../../components/GroupPage';

export default function AccountingPage() {
  return (
    <GroupPage
      title="Accounting"
      items={[
        { href: '/add-supplier', label: 'Add Supplier' },
        { href: '/supplier-receipt', label: 'Record Supplier Invoice' },
        { href: '/search-purchase', label: 'Search Purchase Invoice' },
        { href: '/supplier-return', label: 'Supplier Return' },
        { href: '/expenses', label: 'Company Expense' },
      ]}
    />
  );
}
