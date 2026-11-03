'use client';

import { formatDate } from '../../lib/branchData';

export default function InvoiceSearchPage() {
  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('anlurich-supplier-invoices');
    if (raw) setInvoices(JSON.parse(raw));
  }, []);

  const filtered = invoices.filter((inv) =>
    inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
    inv.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
    inv.branch?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Invoice Search</h1>
      <input
        className="w-full max-w-md border rounded-lg px-4 py-2 mb-4"
        placeholder="Search invoice #, supplier, or branch..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="bg-white rounded-xl shadow">
        {filtered.length === 0 ? (
          <p className="p-6 text-gray-500">No invoices found</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3">Branch</th>
                <th className="text-left p-3">Supplier</th>
                <th className="text-left p-3">Invoice #</th>
                <th className="text-left p-3">Date</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-t">
                  <td className="p-3">{inv.branch}</td>
                  <td className="p-3">{inv.supplierName}</td>
                  <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                  <td className="p-3">{formatDate(inv.invoiceDate)}</td>
                  <td className="p-3 text-right">₱{inv.grandTotal?.toLocaleString()}</td>
                  <td className="p-3">{inv.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
