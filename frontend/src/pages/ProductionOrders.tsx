import React, { useState, useEffect } from 'react';
import {
  Factory,
  Plus,
  Lock,
  XCircle,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { productionOrderApi, productApi, bomApi } from '../services/api';
import { ProductionOrder, Product, OrderStatus, AssemblyStage } from '../types';
import { Modal } from '../components/common/Modal';
import { ExportButtons } from '../components/common/ExportButtons';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';

export const ProductionOrders: React.FC = () => {
  const { user } = useAuth();
  const isSupervisorOrAdmin = user?.role === 'ADMIN' || user?.role === 'PRODUCTION_SUPERVISOR';

  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // View Details Modal
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Create Order Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [orderQty, setOrderQty] = useState<number>(100);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // BOM Preview Calculation in Modal
  const [bomCalculation, setBomCalculation] = useState<any>(null);
  const [bomLoading, setBomLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const [ordRes, prodRes] = await Promise.all([
        productionOrderApi.getAll({
          search: search || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        }),
        productApi.getAll({ status: 'ACTIVE' }),
      ]);
      setOrders(ordRes.data);
      setProducts(prodRes.data);
      if (prodRes.data.length > 0 && !selectedProductId) {
        setSelectedProductId(prodRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load production orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [search, statusFilter]);

  // Recalculate BOM requirements in real-time when product or quantity changes in create modal
  useEffect(() => {
    const fetchBOM = async () => {
      if (!selectedProductId || !orderQty || orderQty <= 0) return;
      try {
        setBomLoading(true);
        const res = await bomApi.calculateRequirements(selectedProductId, orderQty);
        setBomCalculation(res.data);
      } catch (err: any) {
        setBomCalculation(null);
      } finally {
        setBomLoading(false);
      }
    };

    if (isCreateOpen) {
      fetchBOM();
    }
  }, [selectedProductId, orderQty, isCreateOpen]);

  const handleOpenCreate = () => {
    if (products.length > 0) setSelectedProductId(products[0].id);
    setOrderQty(100);
    setNotes('Standard production run.');
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await productionOrderApi.create({
        productId: selectedProductId,
        quantity: orderQty,
        productionDate: orderDate,
        notes,
      });
      setIsCreateOpen(false);
      loadOrders();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLockOrder = async (order: ProductionOrder) => {
    if (
      !window.confirm(
        `Lock order ${order.orderNumber}? This will move raw materials from Available Stock to Reserved Stock in warehouse stores.`
      )
    ) {
      return;
    }

    try {
      await productionOrderApi.lock(order.id);
      alert(`Order ${order.orderNumber} successfully LOCKED! Materials are now reserved.`);
      loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to lock order.');
    }
  };

  const handleCancelOrder = async (order: ProductionOrder) => {
    if (
      !window.confirm(
        `Cancel order ${order.orderNumber}? Any reserved stock will be immediately released back to Available Stock.`
      )
    ) {
      return;
    }

    try {
      await productionOrderApi.cancel(order.id);
      alert(`Order ${order.orderNumber} cancelled. Reserved materials returned to available stock.`);
      loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel order.');
    }
  };

  const handleViewDetails = (ord: ProductionOrder) => {
    setSelectedOrder(ord);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Factory className="w-6 h-6 text-emerald-500" />
            Production Orders & Material Reservation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create production batches, calculate required materials via BOM, and lock orders to move stock to Reserved status.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <ExportButtons data={orders} fileName="Production_Orders_Export" />
          {isSupervisorOrAdmin && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Production Order
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
            placeholder="Search order #, model..."
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
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="LOCKED">LOCKED (Reserved)</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold text-[11px]">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Product Model</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4">Production Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assembly Stage</th>
                <th className="py-3 px-4">Materials Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    Loading production orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No production orders found matching criteria.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  const isLocked = ord.status === 'LOCKED';
                  const isDraft = ord.status === 'DRAFT';
                  const isCancelled = ord.status === 'CANCELLED';
                  const isCompleted = ord.status === 'COMPLETED';

                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {ord.orderNumber}
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
                        {new Date(ord.productionDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={ord.status} variant="order" />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={ord.stage} variant="stage" />
                      </td>
                      <td className="py-3.5 px-4">
                        {isLocked ? (
                          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Materials Reserved
                          </span>
                        ) : ord.status === 'IN_PROGRESS' || isCompleted ? (
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Issued & Consumed
                          </span>
                        ) : isDraft ? (
                          <span className="text-[11px] text-slate-400">Awaiting Lock</span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Released</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => handleViewDetails(ord)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View order details & materials"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {isSupervisorOrAdmin && isDraft && (
                          <button
                            onClick={() => handleLockOrder(ord)}
                            className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300 dark:border-amber-800 transition-colors"
                            title="Lock order and reserve inventory"
                          >
                            <Lock className="w-3 h-3 mr-1" />
                            Lock
                          </button>
                        )}

                        {isSupervisorOrAdmin && (isDraft || isLocked) && (
                          <button
                            onClick={() => handleCancelOrder(ord)}
                            className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Cancel order and release reserved stock"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Production Order with Live BOM Requirements */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Production Order"
        subtitle="Specify product model, quantity, and preview required materials from BOM"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Production Quantity (Units) *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="100"
                value={orderQty}
                onChange={(e) => setOrderQty(parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Planned Production Date
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Batch Run Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Rush customer order for retail delivery"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* BOM Material Availability Preview */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                BOM Requirements Breakdown ({orderQty} Units)
              </span>
              {bomCalculation && (
                <span className="text-xs font-mono font-bold text-slate-500">
                  Est. Material Cost: ${bomCalculation.totalEstimatedCost?.toLocaleString()}
                </span>
              )}
            </div>

            {bomLoading ? (
              <div className="text-center py-4 text-xs text-slate-400">
                Calculating required components from BOM...
              </div>
            ) : !bomCalculation ? (
              <div className="text-center py-4 text-xs text-rose-500">
                No active BOM found for this product. Please define a BOM first.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] uppercase">
                      <th className="py-1.5 px-2">Component</th>
                      <th className="py-1.5 px-2 text-right">Available</th>
                      <th className="py-1.5 px-2 text-right">Required</th>
                      <th className="py-1.5 px-2 text-right">Shortage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-mono text-xs">
                    {bomCalculation.materials.map((m: any) => (
                      <tr key={m.id}>
                        <td className="py-1.5 px-2 font-sans">
                          <span className="font-bold">{m.materialCode}</span>
                          <span className="text-[10px] text-slate-400 block">{m.materialName}</span>
                        </td>
                        <td className="py-1.5 px-2 text-right text-slate-600 dark:text-slate-400">
                          {m.availableStock.toLocaleString()} {m.unit}
                        </td>
                        <td className="py-1.5 px-2 text-right font-bold text-slate-900 dark:text-slate-100">
                          {m.requiredQuantity.toLocaleString()} {m.unit}
                        </td>
                        <td className="py-1.5 px-2 text-right font-bold">
                          {m.shortageQuantity > 0 ? (
                            <span className="text-rose-500">
                              -{m.shortageQuantity.toLocaleString()} {m.unit}
                            </span>
                          ) : (
                            <span className="text-emerald-500">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !bomCalculation}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-sm"
            >
              {submitting ? 'Creating Order...' : 'Create Order in DRAFT'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Order Details & Materials */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Production Order: ${selectedOrder?.orderNumber}`}
        subtitle={`Product: ${selectedOrder?.product.modelNumber} • Quantity: ${selectedOrder?.quantity} Units`}
        maxWidth="2xl"
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Status</span>
                <div className="mt-1">
                  <StatusBadge status={selectedOrder.status} variant="order" />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Stage</span>
                <div className="mt-1">
                  <StatusBadge status={selectedOrder.stage} variant="stage" />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Quantity</span>
                <div className="text-base font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedOrder.quantity} pcs
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Production Date</span>
                <div className="font-mono text-slate-800 dark:text-slate-200 mt-1">
                  {new Date(selectedOrder.productionDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Stage Notes:</span>
              <p className="text-slate-700 dark:text-slate-300 mt-0.5">{selectedOrder.stageNotes || 'No notes.'}</p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2">
                Required Raw Materials & Reservation Status:
              </h4>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="py-2 px-3">Component</th>
                      <th className="py-2 px-3 text-right">Required Qty</th>
                      <th className="py-2 px-3 text-right">Reserved Qty</th>
                      <th className="py-2 px-3 text-right">Issued Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    {selectedOrder.requiredMaterials.map((rm) => (
                      <tr key={rm.id}>
                        <td className="py-2 px-3 font-sans">
                          <span className="font-bold">{rm.material.materialCode}</span>
                          <span className="text-[10px] text-slate-400 block">{rm.material.materialName}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                          {rm.requiredQuantity} {rm.material.unit}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-amber-500">
                          {rm.reservedQuantity} {rm.material.unit}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-500">
                          {rm.issuedQuantity} {rm.material.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
