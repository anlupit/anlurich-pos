'use client';

import { formatDate } from '../../lib/branchData';

type InvoiceLine = {
  partNumber: string;
  brand: string;
  description: string;
  quantity: number;
  unit: string;
  costPrice: number;
};

type SupplierInvoice = {
  id: string;
  branch: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceType: string;
  invoiceDate: string;
  terms: string;
  lines: InvoiceLine[];
  subtotal: number;
  discount1: number;
  discount2: number;
  grandTotal: number;
  status: 'unpaid' | 'paid';
  paidDate?: string;
  checkVoucherNo?: string;
  createdAt: string;
};

const INVOICES_KEY = 'anlurich-supplier-invoices';

export function loadInvoices(): SupplierInvoice[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(INVOICES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveInvoices(invoices: SupplierInvoice[]) {
  localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
}

export default function CheckVoucherPage() {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [tab, setTab] = useState<'unpaid' | 'paid'>('unpaid');
  const [selected, setSelected] = useState<SupplierInvoice | null>(null);
  const [voucherNo, setVoucherNo] = useState('');
  const [branch, setBranch] = useState('');

  useEffect(() => {
    const id = localStorage.getItem('anlurich-branch');
    if (id !== 'admin') {
      alert('Check Voucher is for ADMIN only');
      window.location.href = '/';
      return;
    }
    setBranch('ADMIN');
    setInvoices(loadInvoices());
  }, []);

  const unpaid = invoices.filter((i) => i.status === 'unpaid');
  const paid = invoices.filter((i) => i.status === 'paid');
  const list = tab === 'unpaid' ? unpaid : paid;

  const markAsPaid = () => {
    if (!selected) return;
    if (!voucherNo.trim()) {
      alert('Enter check voucher number');
      return;
    }
    const updated = invoices.map((inv) =>
      inv.id === selected.id
        ? { ...inv, status: 'paid' as const, paidDate: new Date().toISOString(), checkVoucherNo: voucherNo.trim() }
        : inv
    );
    setInvoices(updated);
    saveInvoices(updated);
    setSelected(null);
    setVoucherNo('');
    alert('Invoice marked as paid. Double payment prevented.');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Check Voucher — Admin</h1>
          <a href="/dashboard" className="text-sm text-blue-600 hover:underline">← Back to Dashboard</a>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('unpaid')}
            className={`px-4 py-2 rounded-lg font-medium ${tab === 'unpaid' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
          >
            Unpaid ({unpaid.length})
          </button>
          <button
            onClick={() => setTab('paid')}
            className={`px-4 py-2 rounded-lg font-medium ${tab === 'paid' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
          >
            Paid ({paid.length})
          </button>
        </div>

        <div className="bg-white rounded-xl shadow">
          {list.length === 0 ? (
            <p className="p-6 text-gray-500">No {tab} invoices.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-3">Branch</th>
                    <th className="text-left p-3">Supplier</th>
                    <th className="text-left p-3">Invoice #</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Terms</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-left p-3">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((inv) => (
                    <tr key={inv.id} className="border-t hover:bg-gray-50">
                      <td className="p-3">{inv.branch}</td>
                      <td className="p-3">{inv.supplierName}</td>
                      <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                      <td className="p-3">{formatDate(inv.invoiceDate)}</td>
                      <td className="p-3">{inv.terms || '—'}</td>
                      <td className="p-3 text-right font-medium">₱{inv.grandTotal.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {inv.status === 'unpaid' && (
                          <button onClick={() => setSelected(inv)} className="text-blue-600 text-xs">Pay</button>
                        )}
                        {inv.status === 'paid' && (
                          <span className="text-xs text-gray-500">CV: {inv.checkVoucherNo}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pay Modal */}
        {selected && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold mb-2">Mark as Paid</h2>
              <p className="text-sm mb-1"><strong>Supplier:</strong> {selected.supplierName}</p>
              <p className="text-sm mb-1"><strong>Invoice:</strong> {selected.invoiceNumber}</p>
              <p className="text-sm mb-4"><strong>Amount:</strong> ₱{selected.grandTotal.toLocaleString()}</p>
              <label className="block text-sm font-medium mb-1">Check Voucher No.</label>
              <input
                className="w-full border rounded-lg px-3 py-2 mb-4"
                value={voucherNo}
                onChange={(e) => setVoucherNo(e.target.value)}
                placeholder="e.g. CV-2026-001"
              />
              <div className="flex gap-3">
                <button onClick={() => setSelected(null)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg">Cancel</button>
                <button onClick={markAsPaid} className="flex-1 bg-green-600 text-white py-2 rounded-lg">Confirm Paid</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
