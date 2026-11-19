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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1C2939]/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E8E3DA] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header (Hidden during print) */}
        <div className="no-print p-4 bg-[#26364A] text-white flex items-center justify-between border-b border-[#344860]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#344860] rounded-lg">
              <Receipt className="w-5 h-5 text-[#DCE8DF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white font-heading">
                  {isNewSale ? 'Sale Completed Successfully' : 'Invoice Receipt'}
                </h3>
                {isNewSale && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#39845D] text-white">
                    <CheckCircle className="w-3 h-3" /> Paid
                  </span>
                )}
              </div>
              <p className="text-xs text-[#DCE8DF]/80">
                Invoice #{sale.invoiceNumber} • {formattedDate} {formattedTime}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Thermal / A4 Format Switcher */}
            <div className="flex items-center bg-[#1C2939] p-0.5 rounded-lg border border-[#344860] text-xs">
              <button
                type="button"
                onClick={() => setReceiptType('thermal')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  receiptType === 'thermal'
                    ? 'bg-[#C76B45] text-white shadow-xs'
                    : 'text-[#DCE8DF] hover:text-white'
                }`}
              >
                Thermal (80mm)
              </button>
              <button
                type="button"
                onClick={() => setReceiptType('a4')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  receiptType === 'a4'
                    ? 'bg-[#C76B45] text-white shadow-xs'
                    : 'text-[#DCE8DF] hover:text-white'
                }`}
              >
                Standard (A4)
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#DCE8DF] hover:text-white hover:bg-[#344860] transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Container */}
        <div className="overflow-y-auto p-6 bg-[#F6F3EC] flex justify-center flex-1">
          {/* Print container styling */}
          <div
            id="printable-receipt"
            className={`print-container bg-white text-[#26364A] shadow-sm border border-[#E8E3DA] transition-all ${
              receiptType === 'thermal'
                ? 'w-full max-w-[340px] p-4 text-xs font-mono rounded-lg'
                : 'w-full max-w-[620px] p-6 text-sm rounded-lg'
            }`}
          >
            {/* Header info */}
            <div className="text-center pb-3 border-b border-dashed border-[#E8E3DA]">
              <h2 className="font-extrabold text-base tracking-tight text-[#26364A] uppercase font-heading">
                {settings.storeName}
              </h2>
              {settings.tagline && (
                <p className="text-[11px] text-[#737B83] mt-0.5">{settings.tagline}</p>
              )}
              <p className="text-[11px] text-[#737B83] mt-1">{settings.address}</p>
              <p className="text-[11px] text-[#737B83]">
                Tel: {settings.phone} {settings.email ? `• ${settings.email}` : ''}
              </p>
              {settings.gstNumber && (
                <p className="text-[11px] font-semibold text-[#26364A] mt-1 font-mono">
                  Tax ID: {settings.gstNumber}
                </p>
              )}
            </div>

            {/* Invoice Meta */}
            <div className="py-2.5 border-b border-dashed border-[#E8E3DA] text-[11px] flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-[#737B83]">Invoice:</span>
                <span className="font-bold text-[#26364A] font-mono">{sale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737B83]">Date & Time:</span>
                <span>
                  {formattedDate} {formattedTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737B83]">Cashier:</span>
                <span>{sale.cashier || 'Store Staff'}</span>
              </div>
              {sale.customerName && sale.customerName !== 'Walk-in Customer' && (
                <div className="flex justify-between">
                  <span className="text-[#737B83]">Customer:</span>
                  <span className="font-medium text-[#26364A]">{sale.customerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#737B83]">Payment:</span>
                <span className="font-bold uppercase text-[#C76B45]">
                  {sale.paymentMethod}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-3 border-b border-dashed border-[#E8E3DA]">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#E8E3DA] text-[10px] text-[#737B83] uppercase">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Amt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E3DA]/60">
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="py-1.5 pr-1">
                        <div className="font-semibold text-[#26364A] leading-tight font-heading">
                          {item.productName}
                          {item.packSize && (
                            <span className="text-[#737B83] font-normal text-xs ml-1">
                              ({item.packSize})
                            </span>
                          )}
                        </div>
                        {item.batchAllocations && item.batchAllocations.length > 0 && (
                          <div className="text-[10px] text-[#737B83] font-mono">
                            Batch:{' '}
                            {item.batchAllocations
                              .map((a) => `${a.batchNumber} (${a.quantity})`)
                              .join(', ')}
                          </div>
                        )}
                        {item.discount > 0 && (
                          <div className="text-[10px] text-[#39845D]">
                            Disc: -{settings.currency}
                            {item.discount}
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 text-center text-[#26364A] whitespace-nowrap">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-1.5 text-right text-[#26364A] whitespace-nowrap">
                        {settings.currency}
                        {item.sellingPrice}
                      </td>
                      <td className="py-1.5 text-right font-medium text-[#26364A] whitespace-nowrap">
                        {settings.currency}
                        {item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="py-2.5 border-b border-dashed border-[#E8E3DA] space-y-1 text-[11px]">
              <div className="flex justify-between text-[#737B83]">
                <span>Subtotal:</span>
                <span>
                  {settings.currency}
                  {sale.subtotal.toFixed(2)}
                </span>
              </div>

              {sale.discountTotal > 0 && (
                <div className="flex justify-between text-[#39845D] font-medium">
                  <span>Total Discount:</span>
                  <span>
                    -{settings.currency}
                    {sale.discountTotal.toFixed(2)}
                  </span>
                </div>
              )}

              {sale.taxRate > 0 && (
                <div className="flex justify-between text-[#737B83]">
                  <span>Tax ({sale.taxRate}%):</span>
                  <span>
                    {settings.currency}
                    {sale.taxTotal.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-base font-extrabold text-[#26364A] pt-1.5 border-t border-[#E8E3DA] font-heading">
                <span>GRAND TOTAL:</span>
                <span className="text-[#C76B45]">
                  {settings.currency}
                  {sale.grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Cash payment tendered / change details */}
              {sale.paymentMethod === 'cash' && sale.amountTendered !== undefined && (
                <div className="pt-1.5 border-t border-[#E8E3DA] text-[11px] text-[#26364A] space-y-0.5">
                  <div className="flex justify-between text-[#737B83]">
                    <span>Cash Tendered:</span>
                    <span>
                      {settings.currency}
                      {sale.amountTendered.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-[#39845D]">
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
            <div className="pt-3 text-center text-[10px] text-[#737B83] space-y-1">
              <p className="font-medium text-[#26364A]">{settings.receiptFooter}</p>
              <div className="flex items-center justify-center gap-1 font-mono text-[9px] text-[#737B83]/70">
                <span>* * * * * * * * * * * * * * * * * *</span>
              </div>
              <p className="text-[9px] text-[#737B83]/70">Powered by StockWise Grocery Engine</p>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar (Hidden during print) */}
        <div className="no-print p-4 bg-white border-t border-[#E8E3DA] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#26364A] hover:text-[#C76B45] bg-[#F6F3EC] hover:bg-[#E8E3DA] rounded-lg transition flex items-center gap-2 cursor-pointer border border-[#E8E3DA]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to System
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#C76B45] hover:bg-[#B55D37] active:bg-[#C76B45] rounded-lg shadow-xs transition flex items-center gap-2 cursor-pointer font-heading"
            >
              <Printer className="w-4 h-4 text-white" />
              Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
