import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Download,
  Calendar,
  FileText,
  User,
  ArrowRight,
} from 'lucide-react';
import { dispatchApi, productApi, finishedGoodsApi } from '../services/api';
import { DispatchOrder, Product, DispatchStatus } from '../types';
import { Modal } from '../components/common/Modal';
import { ExportButtons } from '../components/common/ExportButtons';
import { StatusBadge } from '../components/common/StatusBadge';
import { generateDispatchNotePDF } from '../components/pdf/DispatchNotePDF';
import { useAuth } from '../context/AuthContext';

export const DispatchPage: React.FC = () => {
  const { user } = useAuth();
  const isDispatchOrAdmin = user?.role === 'ADMIN' || user?.role === 'DISPATCH_TEAM';

  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [fgInventory, setFgInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(50);
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordRes, prodRes, fgRes] = await Promise.all([
        dispatchApi.getAll({
          search: search || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        }),
        productApi.getAll({ status: 'ACTIVE' }),
        finishedGoodsApi.getAll(),
      ]);
      setOrders(ordRes.data);
      setProducts(prodRes.data);
      setFgInventory(fgRes.data);
      if (prodRes.data.length > 0 && !selectedProductId) {
        setSelectedProductId(prodRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load dispatch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  const handleOpenCreate = () => {
    setCustomerName('');
    setInvoiceNumber(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    if (products.length > 0) setSelectedProductId(products[0].id);
    setQuantity(50);
    setDispatchDate(new Date().toISOString().split('T')[0]);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Calculate available finished goods for selected product in modal
  const selectedProductFGAvailable = fgInventory
    .filter((fg) => fg.productId === selectedProductId && fg.qcStatus === 'PASS')
    .reduce((sum, it) => sum + (it.quantity - it.reservedQuantity), 0);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (quantity > selectedProductFGAvailable) {
      setFormError(
        `Insufficient finished goods stock! Requested: ${quantity}, Available in warehouse: ${selectedProductFGAvailable} units.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await dispatchApi.createOrder({
        customerName,
        invoiceNumber,
        productId: selectedProductId,
        quantity,
        dispatchDate,
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create dispatch order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteDispatch = async (order: DispatchOrder) => {
    if (
      !window.confirm(
        `Confirm dispatch of ${order.quantity} units for Invoice ${order.invoiceNumber}? This will deduct inventory from Finished Goods.`
      )
    ) {
      return;
    }

    try {
      await dispatchApi.completeDispatch(order.id);
      alert(`Dispatch order ${order.dispatchOrderNumber} completed! Finished goods inventory deducted.`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete dispatch.');
    }
  };

  const handleDownloadNote = (order: DispatchOrder) => {
    generateDispatchNotePDF(order);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-emerald-500" />
            Dispatch Management & Customer Shipments
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create customer orders, verify finished goods inventory availability, complete outward dispatch, and generate Dispatch Notes.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <ExportButtons data={orders} fileName="Dispatch_Shipments_Export" />
          {isDispatchOrAdmin && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Customer Order
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search dispatch #, customer, invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Dispatch Statuses</option>
            <option value="PENDING">Pending Delivery</option>
            <option value="DISPATCHED">Dispatched & Completed</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold text-[11px]">
                <th className="py-3 px-4">Dispatch Order #</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Product Model</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4">Scheduled Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    Loading dispatch orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No dispatch orders found matching criteria.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  const isPending = ord.status === 'PENDING';
                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {ord.dispatchOrderNumber}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {ord.customerName}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                        {ord.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {ord.product.modelNumber}
                        </span>
                        <div className="text-[10px] text-slate-400">{ord.product.productName}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {ord.quantity.toLocaleString()} pcs
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(ord.dispatchDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={ord.status} variant="dispatch" />
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        {isPending && isDispatchOrAdmin && (
                          <button
                            onClick={() => handleCompleteDispatch(ord)}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200 dark:border-purple-800 transition-colors"
                            title="Confirm outward delivery"
                          >
                            <Truck className="w-3 h-3 mr-1" />
                            Dispatch
                          </button>
                        )}

                        <button
                          onClick={() => handleDownloadNote(ord)}
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                          title="Download Dispatch Delivery Note PDF"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Delivery Note
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

      {/* Modal: Create Customer Order */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Customer Dispatch Order"
        subtitle="Book outward order, verify finished goods availability, and schedule dispatch"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Customer / Consignee Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Metro Electrical Mega Distributors"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Commercial Invoice # *
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Dispatch Target Date
              </label>
              <input
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Select Product Model *
            </label>
            <select
              required
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.modelNumber} — {p.productName} ({p.wattage}W)
                </option>
              ))}
            </select>
          </div>

          {/* Availability Check Indicator */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Finished Goods Stock Available:</span>
              <div className="font-mono font-bold text-base text-slate-900 dark:text-slate-100 mt-0.5">
                {selectedProductFGAvailable.toLocaleString()} Units
              </div>
            </div>
            <div className="text-right">
              {selectedProductFGAvailable >= quantity ? (
                <span className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> In Stock
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-bold text-rose-500">
                  <AlertCircle className="w-4 h-4 mr-1" /> Stock Shortage
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Dispatch Quantity (Units) *
            </label>
            <input
              type="number"
              required
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || quantity > selectedProductFGAvailable}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-sm"
            >
              {submitting ? 'Booking Order...' : 'Confirm Customer Order'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
