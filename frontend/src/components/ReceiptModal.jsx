import React, { useState } from 'react';
import { Printer, X, CheckCircle, Receipt, ArrowLeft } from 'lucide-react';

export const ReceiptModal = ({
  sale,
  settings,
  isOpen,
  onClose,
  isNewSale = false,
}) => {
  const [receiptType, setReceiptType] = useState('thermal');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(sale.date).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = new Date(sale.date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header (Hidden during print) */}
        <div className="no-print p-4 bg-emerald-800 text-white flex items-center justify-between border-b border-emerald-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700/60 rounded-lg">
              <Receipt className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">
                  {isNewSale ? 'Sale Completed Successfully' : 'Invoice Receipt'}
                </h3>
                {isNewSale && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-600/80 text-emerald-100 border border-emerald-500">
                    <CheckCircle className="w-3 h-3" /> Paid
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-200">
                Invoice #{sale.invoiceNumber} • {formattedDate} {formattedTime}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Thermal / A4 Format Switcher */}
            <div className="flex items-center bg-emerald-900/60 p-0.5 rounded-lg border border-emerald-700/60 text-xs">
              <button
                type="button"
                onClick={() => setReceiptType('thermal')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  receiptType === 'thermal'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                Thermal (80mm)
              </button>
              <button
                type="button"
                onClick={() => setReceiptType('a4')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  receiptType === 'a4'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                Standard (A4)
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Container */}
        <div className="overflow-y-auto p-6 bg-stone-100/70 flex justify-center flex-1">
          {/* Print container styling */}
          <div
            id="printable-receipt"
            className={`print-container bg-white text-stone-900 shadow-sm border border-stone-200 transition-all ${
              receiptType === 'thermal'
                ? 'w-full max-w-[340px] p-4 text-xs font-mono rounded-lg'
                : 'w-full max-w-[620px] p-6 text-sm rounded-lg'
            }`}
          >
            {/* Header info */}
            <div className="text-center pb-3 border-b border-dashed border-stone-300">
              <h2 className="font-extrabold text-base tracking-tight text-emerald-950 uppercase">
                {settings.storeName}
              </h2>
              {settings.tagline && (
                <p className="text-[11px] text-stone-600 mt-0.5">{settings.tagline}</p>
              )}
              <p className="text-[11px] text-stone-600 mt-1">{settings.address}</p>
              <p className="text-[11px] text-stone-600">
                Tel: {settings.phone} {settings.email ? `• ${settings.email}` : ''}
              </p>
              {settings.gstNumber && (
                <p className="text-[11px] font-semibold text-stone-700 mt-1">
                  Tax ID: {settings.gstNumber}
                </p>
              )}
            </div>

            {/* Invoice Meta */}
            <div className="py-2.5 border-b border-dashed border-stone-300 text-[11px] flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-stone-500">Invoice:</span>
                <span className="font-bold text-stone-800">{sale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Date & Time:</span>
                <span>
                  {formattedDate} {formattedTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Cashier:</span>
                <span>{sale.cashier || 'Store Staff'}</span>
              </div>
              {sale.customerName && sale.customerName !== 'Walk-in Customer' && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Customer:</span>
                  <span className="font-medium">{sale.customerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-stone-500">Payment:</span>
                <span className="font-bold uppercase text-emerald-800">
                  {sale.paymentMethod}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-3 border-b border-dashed border-stone-300">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-stone-300 text-[10px] text-stone-500 uppercase">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Amt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="py-1.5 pr-1">
                        <div className="font-semibold text-stone-900 leading-tight">
                          {item.productName}
                        </div>
                        {item.batchAllocations && item.batchAllocations.length > 0 && (
                          <div className="text-[10px] text-stone-500">
                            Batch:{' '}
                            {item.batchAllocations
                              .map((a) => `${a.batchNumber} (${a.quantity})`)
                              .join(', ')}
                          </div>
                        )}
                        {item.discount > 0 && (
                          <div className="text-[10px] text-emerald-600">
                            Disc: -{settings.currency}
                            {item.discount}
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 text-center text-stone-700 whitespace-nowrap">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-1.5 text-right text-stone-700 whitespace-nowrap">
                        {settings.currency}
                        {item.sellingPrice}
                      </td>
                      <td className="py-1.5 text-right font-medium text-stone-900 whitespace-nowrap">
                        {settings.currency}
                        {item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="py-2.5 border-b border-dashed border-stone-300 space-y-1 text-[11px]">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span>
                  {settings.currency}
                  {sale.subtotal.toFixed(2)}
                </span>
              </div>

              {sale.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Total Discount:</span>
                  <span>
                    -{settings.currency}
                    {sale.discountTotal.toFixed(2)}
                  </span>
                </div>
              )}

              {sale.taxRate > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>Tax ({sale.taxRate}%):</span>
                  <span>
                    {settings.currency}
                    {sale.taxTotal.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-base font-extrabold text-stone-950 pt-1.5 border-t border-stone-300">
                <span>GRAND TOTAL:</span>
                <span>
                  {settings.currency}
                  {sale.grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Cash payment tendered / change details */}
              {sale.paymentMethod === 'cash' && sale.amountTendered !== undefined && (
                <div className="pt-1.5 border-t border-stone-100 text-[11px] text-stone-700 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Cash Tendered:</span>
                    <span>
                      {settings.currency}
                      {sale.amountTendered.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>Change Returned:</span>
                    <span>
                      {settings.currency}
                      {(sale.changeReturned || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Notice */}
            <div className="pt-3 text-center text-[10px] text-stone-500 space-y-1">
              <p className="font-medium text-stone-700">{settings.receiptFooter}</p>
              <div className="flex items-center justify-center gap-1 font-mono text-[9px] text-stone-400">
                <span>* * * * * * * * * * * * * * * * * *</span>
              </div>
              <p className="text-[9px] text-stone-400">Powered by StockWise Grocery Engine</p>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar (Hidden during print) */}
        <div className="no-print p-4 bg-white border-t border-stone-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to System
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
