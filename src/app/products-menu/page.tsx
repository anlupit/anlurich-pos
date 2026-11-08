'use client';
import GroupPage from '../../components/GroupPage';

export default function ProductsMenuPage() {
  return (
    <GroupPage
      title="Products"
      items={[
        { href: '/product-catalog', label: 'Product Catalog' },
        { href: '/products', label: 'Product Inventory' },
      ]}
    />
  );
}
