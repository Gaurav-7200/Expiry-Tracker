import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  Download,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';

export const SalesHistory = ({ sales, settings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedSaleForReprint, setSelectedSaleForReprint] = useState(null);

  // Compute daily, weekly, monthly summaries
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Start of week (Sunday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfWeekStr = startOfWeek.toISOString().slice(0, 10);

  // Start of month
  const startOfMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

  let todayRev = 0;
  let todayCount = 0;
  let weekRev = 0;
  let weekCount = 0;
  let monthRev = 0;
  let monthCount = 0;

  sales.forEach((s) => {
    if (s.status !== 'completed') return;
    const sDate = s.date.slice(0, 10);

    if (sDate === todayStr) {
      todayRev += s.grandTotal;
      todayCount++;
    }
    if (sDate >= startOfWeekStr) {
      weekRev += s.grandTotal;
      weekCount++;
    }
    if (sDate >= startOfMonthStr) {
      monthRev += s.grandTotal;
      monthCount++;
    }
  });

  const filteredSales = sales.filter((s) => {
    const cleanSearch = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !cleanSearch ||
      s.invoiceNumber.toLowerCase().includes(cleanSearch) ||
      (s.customerName && s.customerName.toLowerCase().includes(cleanSearch)) ||
      (s.customerPhone && s.customerPhone.includes(cleanSearch));

    const matchesPayment = paymentFilter === 'all' || s.paymentMethod === paymentFilter;

    return matchesSearch && matchesPayment;
  });

  const exportToCSV = () => {
    const headers = ['Invoice Number', 'Date', 'Customer', 'Phone', 'Items Count', 'Payment Method', 'Subtotal', 'Tax', 'Grand Total'];
    const rows = filteredSales.map((s) => [
      s.invoiceNumber,
      new Date(s.date).toLocaleString(),
      s.customerName || 'Walk-in',
      s.customerPhone || '',
      s.items.length,
      s.paymentMethod,
      s.subtotal,
      s.taxTotal,
      s.grandTotal,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StockWise_Sales_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-1 border border-emerald-200">
            <Receipt className="w-3.5 h-3.5" /> Transaction Audit & Invoices
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-stone-900 tracking-tight">
            Sales Invoices & Billing History
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Audit historic orders, view itemized batch breakdowns, reprint customer receipts, and review revenue periods.
          </p>
        </div>

        <button
          type="button"
          onClick={exportToCSV}
          className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <Download className="w-4 h-4 text-stone-600" />
          Export Invoices CSV
        </button>
      </div>

      {/* Summary KPI Cards: Daily, Weekly, Monthly */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's Sales */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Today's Revenue
            </span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-emerald-800">
              {settings.currency}
              {todayRev.toFixed(2)}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              {todayCount} completed invoice{todayCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* Weekly Sales */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              This Week's Revenue
            </span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-700">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-stone-900">
              {settings.currency}
              {weekRev.toFixed(2)}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              {weekCount} invoice{weekCount === 1 ? '' : 's'} this week
            </p>
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              This Month's Revenue
            </span>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-700">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-stone-900">
              {settings.currency}
              {monthRev.toFixed(2)}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              {monthCount} invoice{monthCount === 1 ? '' : 's'} in {today.toLocaleString('default', { month: 'long' })}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoice number, customer name, or phone..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 transition"
            />
          </div>

          <div className="flex gap-1.5">
            {[
              { id: 'all', label: 'All Modes' },
              { id: 'cash', label: 'Cash' },
              { id: 'upi', label: 'UPI' },
              { id: 'card', label: 'Card' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPaymentFilter(f.id)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer text-center ${
                  paymentFilter === f.id
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Grand Total</th>
                <th className="py-3 px-4 text-right">Reprint Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    No sales invoices found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const saleDate = new Date(sale.date);
                  const dateStr = saleDate.toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const timeStr = saleDate.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={sale.id} className="hover:bg-stone-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                        {sale.invoiceNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-stone-800">{dateStr}</div>
                        <div className="text-[11px] text-stone-400">{timeStr}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-900">
                          {sale.customerName || 'Walk-in Customer'}
                        </div>
                        {sale.customerPhone && (
                          <div className="text-[11px] text-stone-500 font-mono">
                            {sale.customerPhone}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-stone-800">
                          {sale.items.length} line item{sale.items.length === 1 ? '' : 's'}
                        </span>
                        <div className="text-[10px] text-stone-400 truncate max-w-[200px]">
                          {sale.items.map((i) => `${i.productName} (${i.quantity})`).join(', ')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            sale.paymentMethod === 'cash'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sale.paymentMethod === 'upi'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {sale.paymentMethod === 'cash' && <Banknote className="w-3 h-3" />}
                          {sale.paymentMethod === 'upi' && <QrCode className="w-3 h-3" />}
                          {sale.paymentMethod === 'card' && <CreditCard className="w-3 h-3" />}
                          <span>{sale.paymentMethod}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-extrabold text-stone-900 text-sm">
                        {settings.currency}
                        {sale.grandTotal.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedSaleForReprint(sale)}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 rounded-lg text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Reprint Bill
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reprint Receipt Modal */}
      {selectedSaleForReprint && (
        <ReceiptModal
          sale={selectedSaleForReprint}
          settings={settings}
          isOpen={true}
          onClose={() => setSelectedSaleForReprint(null)}
          isNewSale={false}
        />
      )}
    </div>
  );
};
