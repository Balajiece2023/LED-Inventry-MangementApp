import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Filter,
  ArrowDownToLine,
  SlidersHorizontal,
  History,
  AlertTriangle,
  CheckCircle2,
  PackagePlus,
  RefreshCw,
} from 'lucide-react';
import { materialApi } from '../services/api';
import { Material, InventoryTransaction } from '../types';
import { Modal } from '../components/common/Modal';
import { ExportButtons } from '../components/common/ExportButtons';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';

export const Materials: React.FC = () => {
  const { user } = useAuth();
  const isStoreOrAdmin = user?.role === 'ADMIN' || user?.role === 'STORE_KEEPER';

  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  // Form states
  const [addStockForm, setAddStockForm] = useState({
    quantity: '',
    referenceNumber: '',
    supplier: '',
    notes: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    newCurrentStock: '',
    reason: '',
  });

  const [createForm, setCreateForm] = useState({
    materialCode: '',
    materialName: '',
    category: 'Chips',
    currentStock: '0',
    unit: 'PCS',
    unitCost: '0.05',
    reorderLevel: '500',
    supplier: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const res = await materialApi.getAll({
        search: search || undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        lowStock: lowStockOnly || undefined,
      });
      setMaterials(res.data);
    } catch (err) {
      console.error('Failed to load raw materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const res = await materialApi.getTransactions({ limit: 100 });
      setTransactions(res.data);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    }
  };

  useEffect(() => {
    loadMaterials();
    if (activeTab === 'history') {
      loadTransactions();
    }
  }, [search, categoryFilter, lowStockOnly, activeTab]);

  const handleOpenAddStock = (mat: Material) => {
    setSelectedMaterial(mat);
    setAddStockForm({
      quantity: '',
      referenceNumber: `GRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      supplier: mat.supplier || '',
      notes: `Store inward receipt for ${mat.materialName}`,
    });
    setFormError(null);
    setIsAddStockOpen(true);
  };

  const handleOpenAdjustStock = (mat: Material) => {
    setSelectedMaterial(mat);
    setAdjustForm({
      newCurrentStock: String(mat.currentStock),
      reason: 'Physical count variance audit',
    });
    setFormError(null);
    setIsAdjustStockOpen(true);
  };

  const submitAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;
    setFormError(null);
    setSubmitting(true);

    try {
      await materialApi.addStock(selectedMaterial.id, {
        quantity: parseFloat(addStockForm.quantity),
        referenceNumber: addStockForm.referenceNumber,
        supplier: addStockForm.supplier,
        notes: addStockForm.notes,
      });
      setIsAddStockOpen(false);
      loadMaterials();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to add stock.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;
    setFormError(null);
    setSubmitting(true);

    try {
      await materialApi.adjustStock(selectedMaterial.id, {
        newCurrentStock: parseFloat(adjustForm.newCurrentStock),
        reason: adjustForm.reason,
      });
      setIsAdjustStockOpen(false);
      loadMaterials();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to adjust stock.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await materialApi.create({
        ...createForm,
        currentStock: parseFloat(createForm.currentStock),
        unitCost: parseFloat(createForm.unitCost),
        reorderLevel: parseFloat(createForm.reorderLevel),
      });
      setIsCreateOpen(false);
      loadMaterials();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create material.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-emerald-500" />
            Raw Material Master & Inventory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Store keeper stock management, material inwards, reservation locks, and inventory transaction ledger.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <ExportButtons
            data={activeTab === 'inventory' ? materials : transactions}
            fileName={activeTab === 'inventory' ? 'Raw_Materials_Inventory' : 'Inventory_Transactions'}
          />
          {isStoreOrAdmin && (
            <button
              onClick={() => {
                setFormError(null);
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Material Item
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          Inventory Items ({materials.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          Stock Movement Ledger ({transactions.length})
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <>
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search code, name, supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Categories</option>
                <option value="Chips">Chips</option>
                <option value="Drivers">Drivers</option>
                <option value="Electronics">Electronics (PCB/Cap)</option>
                <option value="Mechanics">Mechanics (Housing/HS)</option>
                <option value="Hardware">Hardware (Screws)</option>
                <option value="Electrical">Electrical (Wire)</option>
                <option value="Chemicals">Chemicals (Thermal)</option>
                <option value="Packaging">Packaging</option>
              </select>

              <button
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className={`inline-flex items-center px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                  lowStockOnly
                    ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800'
                    : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                Low Stock Only
              </button>
            </div>
          </div>

          {/* Materials Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold text-[11px]">
                    <th className="py-3 px-4">Material Code</th>
                    <th className="py-3 px-4">Item Name & Category</th>
                    <th className="py-3 px-4 text-right">Physical Stock</th>
                    <th className="py-3 px-4 text-right">Reserved Stock</th>
                    <th className="py-3 px-4 text-right">Available Stock</th>
                    <th className="py-3 px-4 text-center">Reorder Level</th>
                    <th className="py-3 px-4 text-right">Unit Cost</th>
                    <th className="py-3 px-4">Supplier</th>
                    {isStoreOrAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">
                        Loading inventory...
                      </td>
                    </tr>
                  ) : materials.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">
                        No materials found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    materials.map((m) => {
                      const isLow = m.isLowStock;
                      return (
                        <tr
                          key={m.id}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors ${
                            isLow ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {m.materialCode}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {m.materialName}
                            </span>
                            <div className="text-[10px] text-slate-400">{m.category}</div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-600 dark:text-slate-300">
                            {m.currentStock.toLocaleString()} {m.unit}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                            {m.reservedStock > 0 ? `${m.reservedStock.toLocaleString()} ${m.unit}` : '0'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold">
                            <span
                              className={
                                isLow
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }
                            >
                              {(m.availableStock || 0).toLocaleString()} {m.unit}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                isLow
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {m.reorderLevel.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                            ${m.unitCost.toFixed(3)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                            {m.supplier || '—'}
                          </td>
                          {isStoreOrAdmin && (
                            <td className="py-3.5 px-4 text-right space-x-1">
                              <button
                                onClick={() => handleOpenAddStock(m)}
                                className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition-colors"
                                title="Inward stock receipt"
                              >
                                <ArrowDownToLine className="w-3 h-3 mr-1" />
                                Inward
                              </button>
                              <button
                                onClick={() => handleOpenAdjustStock(m)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Adjust physical stock"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Inventory Transaction Ledger */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-500" />
              Stock Movement History
            </h3>
            <span className="text-xs text-slate-400">Chronological Audit Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold text-[11px]">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Material</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Stock Before</th>
                  <th className="py-3 px-4 text-right">Stock After</th>
                  <th className="py-3 px-4">Reference / Order</th>
                  <th className="py-3 px-4">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      No stock movement transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40">
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {tx.material.materialCode}
                        </span>
                        <div className="text-[10px] text-slate-400">{tx.material.materialName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={tx.transactionType} />
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {tx.transactionType === 'INWARD' || tx.transactionType === 'UNRESERVED' ? '+' : '-'}
                        {tx.quantity.toLocaleString()} {tx.material.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {tx.previousStock.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {tx.newStock.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {tx.referenceId || tx.referenceType || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {tx.createdBy?.name || 'System Auto'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Stock / Goods Receipt */}
      <Modal
        isOpen={isAddStockOpen}
        onClose={() => setIsAddStockOpen(false)}
        title={`Inward Stock: ${selectedMaterial?.materialCode}`}
        subtitle="Record goods received note and add physical inventory"
      >
        <form onSubmit={submitAddStock} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium">
              {formError}
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500">Selected Material:</span>
            <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {selectedMaterial?.materialName}
            </div>
            <div className="text-slate-400 mt-0.5 font-mono">
              Current Stock: {selectedMaterial?.currentStock} {selectedMaterial?.unit}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Quantity to Inward ({selectedMaterial?.unit}) *
            </label>
            <input
              type="number"
              required
              step="any"
              min="0.01"
              placeholder="e.g. 1000"
              value={addStockForm.quantity}
              onChange={(e) => setAddStockForm({ ...addStockForm, quantity: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                GRN / Reference #
              </label>
              <input
                type="text"
                value={addStockForm.referenceNumber}
                onChange={(e) => setAddStockForm({ ...addStockForm, referenceNumber: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Supplier Vendor
              </label>
              <input
                type="text"
                value={addStockForm.supplier}
                onChange={(e) => setAddStockForm({ ...addStockForm, supplier: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Inspection / Inward Notes
            </label>
            <input
              type="text"
              value={addStockForm.notes}
              onChange={(e) => setAddStockForm({ ...addStockForm, notes: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddStockOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-sm"
            >
              {submitting ? 'Recording Inward...' : 'Confirm Stock Receipt'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Adjust Physical Stock */}
      <Modal
        isOpen={isAdjustStockOpen}
        onClose={() => setIsAdjustStockOpen(false)}
        title={`Physical Count Adjustment: ${selectedMaterial?.materialCode}`}
        subtitle="Correct current physical stock count after store audit"
      >
        <form onSubmit={submitAdjustStock} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              New Physical Stock Count ({selectedMaterial?.unit}) *
            </label>
            <input
              type="number"
              required
              step="any"
              min="0"
              value={adjustForm.newCurrentStock}
              onChange={(e) => setAdjustForm({ ...adjustForm, newCurrentStock: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Current recorded on-hand: {selectedMaterial?.currentStock} {selectedMaterial?.unit}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Reason for Adjustment *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Physical inventory variance, damaged packaging write-off"
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAdjustStockOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-sm"
            >
              {submitting ? 'Applying Adjustment...' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Material */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register New Raw Material Item"
        subtitle="Add a new component to raw materials inventory"
      >
        <form onSubmit={submitCreateMaterial} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Material Code *
              </label>
              <input
                type="text"
                required
                placeholder="RM-CHIP-2835"
                value={createForm.materialCode}
                onChange={(e) => setCreateForm({ ...createForm, materialCode: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Category *
              </label>
              <select
                value={createForm.category}
                onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="Chips">Chips</option>
                <option value="Drivers">Drivers</option>
                <option value="Electronics">Electronics</option>
                <option value="Mechanics">Mechanics</option>
                <option value="Hardware">Hardware</option>
                <option value="Electrical">Electrical</option>
                <option value="Chemicals">Chemicals</option>
                <option value="Packaging">Packaging</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Material Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. SMD 2835 LED Chip (6500K)"
              value={createForm.materialName}
              onChange={(e) => setCreateForm({ ...createForm, materialName: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Unit (e.g. PCS) *
              </label>
              <input
                type="text"
                required
                placeholder="PCS"
                value={createForm.unit}
                onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Initial Stock
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={createForm.currentStock}
                onChange={(e) => setCreateForm({ ...createForm, currentStock: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Unit Cost ($)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={createForm.unitCost}
                onChange={(e) => setCreateForm({ ...createForm, unitCost: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Reorder Threshold Level
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={createForm.reorderLevel}
                onChange={(e) => setCreateForm({ ...createForm, reorderLevel: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Primary Supplier
              </label>
              <input
                type="text"
                placeholder="e.g. Lumileds Corp"
                value={createForm.supplier}
                onChange={(e) => setCreateForm({ ...createForm, supplier: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
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
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-sm"
            >
              {submitting ? 'Creating Item...' : 'Create Material'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
