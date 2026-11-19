import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit2,
  Calculator,
  AlertCircle,
  CheckCircle2,
  Layers,
  ChevronRight,
  Boxes,
} from 'lucide-react';
import { bomApi, productApi, materialApi } from '../services/api';
import { BOM, Product, Material } from '../types';
import { Modal } from '../components/common/Modal';
import { ExportButtons } from '../components/common/ExportButtons';
import { useAuth } from '../context/AuthContext';

export const BOMs: React.FC = () => {
  const { user } = useAuth();
  const isAuthorized = user?.role === 'ADMIN' || user?.role === 'PRODUCTION_SUPERVISOR';

  const [boms, setBoms] = useState<BOM[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected BOM for details view
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null);

  // Live Calculator State
  const [calculatorQty, setCalculatorQty] = useState<number>(100);
  const [calcResults, setCalcResults] = useState<any>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBOM, setEditingBOM] = useState<BOM | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [version, setVersion] = useState('1.0');
  const [notes, setNotes] = useState('');
  const [bomItems, setBomItems] = useState<{ materialId: string; quantityRequired: number }[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bomRes, prodRes, matRes] = await Promise.all([
        bomApi.getAll(),
        productApi.getAll({ status: 'ACTIVE' }),
        materialApi.getAll(),
      ]);
      setBoms(bomRes.data);
      setProducts(prodRes.data);
      setMaterials(matRes.data);

      if (bomRes.data.length > 0 && !selectedBOM) {
        setSelectedBOM(bomRes.data[0]);
      }
    } catch (err) {
      console.error('Failed to load BOM data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update calculator whenever selectedBOM or calculatorQty changes
  useEffect(() => {
    const runCalculation = async () => {
      if (!selectedBOM?.productId) return;
      try {
        setCalcLoading(true);
        const res = await bomApi.calculateRequirements(selectedBOM.productId, calculatorQty);
        setCalcResults(res.data);
      } catch (err) {
        console.error('Failed to calculate requirements:', err);
      } finally {
        setCalcLoading(false);
      }
    };

    if (selectedBOM) {
      runCalculation();
    }
  }, [selectedBOM, calculatorQty]);

  const handleOpenCreate = () => {
    setEditingBOM(null);
    setSelectedProductId(products[0]?.id || '');
    setVersion('1.0');
    setNotes('');
    setBomItems([
      { materialId: materials[0]?.id || '', quantityRequired: 1 },
    ]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: BOM) => {
    setEditingBOM(b);
    setSelectedProductId(b.productId);
    setVersion(b.version);
    setNotes(b.notes || '');
    setBomItems(
      b.items.map((it) => ({
        materialId: it.materialId,
        quantityRequired: it.quantityRequired,
      }))
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAddRow = () => {
    if (materials.length === 0) return;
    setBomItems([...bomItems, { materialId: materials[0].id, quantityRequired: 1 }]);
  };

  const handleRemoveRow = (index: number) => {
    setBomItems(bomItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...bomItems];
    updated[index] = { ...updated[index], [field]: value };
    setBomItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (bomItems.length === 0) {
      setFormError('Please add at least one raw material to the BOM.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingBOM) {
        await bomApi.update(editingBOM.id, {
          notes,
          items: bomItems,
        });
      } else {
        await bomApi.create({
          productId: selectedProductId,
          version,
          notes,
          items: bomItems,
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save BOM.');
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
            <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
            Bill of Materials (BOM) Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Specify raw material recipe per LED luminaire unit, BOM versioning, and live production batch requirement calculator.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <ExportButtons data={boms} fileName="LED_BOM_Definitions" />
          {isAuthorized && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create BOM
            </button>
          )}
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: BOM List */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
              Configured BOM Recipes ({boms.length})
            </h3>

            <div className="space-y-2">
              {boms.map((b) => {
                const isSelected = selectedBOM?.id === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBOM(b)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {b.product?.modelNumber}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                        v{b.version}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {b.product?.productName} ({b.product?.wattage}W)
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{b.items.length} Component Items</span>
                      <span className="text-emerald-500 font-semibold flex items-center">
                        Select <ChevronRight className="w-3 h-3 ml-0.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column (2 spans): Selected BOM Details & Live Calculator */}
        <div className="lg:col-span-2 space-y-6">
          {selectedBOM ? (
            <>
              {/* BOM Details Box */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-extrabold text-lg text-slate-900 dark:text-slate-100">
                        {selectedBOM.product?.modelNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Version {selectedBOM.version}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedBOM.product?.productName} • {selectedBOM.notes || 'Standard manufacturing bill of materials.'}
                    </p>
                  </div>

                  {isAuthorized && (
                    <button
                      onClick={() => handleOpenEdit(selectedBOM)}
                      className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                      Edit Recipe
                    </button>
                  )}
                </div>

                {/* Items Table */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold text-[11px]">
                        <th className="py-2.5 px-3">Material Code</th>
                        <th className="py-2.5 px-3">Component Name</th>
                        <th className="py-2.5 px-3 text-right">Qty / 1 Unit</th>
                        <th className="py-2.5 px-3 text-right">Unit Cost</th>
                        <th className="py-2.5 px-3 text-right">Cost / Unit</th>
                        <th className="py-2.5 px-3 text-right">Available in Store</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {selectedBOM.items.map((item) => {
                        const costPerUnit = item.quantityRequired * item.material.unitCost;
                        const available = item.material.currentStock - item.material.reservedStock;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40">
                            <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                              {item.material.materialCode}
                            </td>
                            <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                              {item.material.materialName}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {item.quantityRequired} {item.material.unit}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-500">
                              ${item.material.unitCost.toFixed(3)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                              ${costPerUnit.toFixed(3)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                              {available.toLocaleString()} {item.material.unit}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Live Batch Requirement & Shortage Calculator */}
              <div className="bg-gradient-to-tr from-slate-900 to-slate-850 border border-slate-800 rounded-2xl p-5 text-white shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-emerald-400" />
                      Automated Batch Requirement & Shortage Engine
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Check required stock vs on-hand availability for planned production quantities.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Target Batch Size:</span>
                    {[50, 100, 200, 500].map((q) => (
                      <button
                        key={q}
                        onClick={() => setCalculatorQty(q)}
                        className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-colors ${
                          calculatorQty === q
                            ? 'bg-emerald-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                    <input
                      type="number"
                      min="1"
                      value={calculatorQty}
                      onChange={(e) => setCalculatorQty(parseInt(e.target.value) || 1)}
                      className="w-20 px-2 py-1 text-xs rounded-lg bg-slate-950 border border-slate-700 font-mono text-center text-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {calcResults && (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Planned Quantity</span>
                        <div className="text-xl font-bold font-mono text-white mt-1">
                          {calcResults.productionQuantity} Units
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Estimated Batch Cost</span>
                        <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                          ${calcResults.totalEstimatedCost?.toLocaleString()}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Stock Feasibility</span>
                        <div className="text-sm font-bold mt-1.5 flex items-center gap-1.5">
                          {calcResults.hasAnyShortage ? (
                            <span className="text-rose-400 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" /> Material Shortage Detected
                            </span>
                          ) : (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> 100% In Stock & Ready
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px]">
                            <th className="py-2 px-3">Component</th>
                            <th className="py-2 px-3 text-right">Available in Stock</th>
                            <th className="py-2 px-3 text-right">Required for {calculatorQty}x</th>
                            <th className="py-2 px-3 text-right">Shortage</th>
                            <th className="py-2 px-3 text-right">Feasibility</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                          {calcResults.materials.map((m: any) => (
                            <tr key={m.id} className="hover:bg-slate-800/30">
                              <td className="py-2.5 px-3">
                                <span className="text-white font-bold">{m.materialCode}</span>
                                <span className="text-[10px] text-slate-400 block font-sans">
                                  {m.materialName}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-300">
                                {m.availableStock.toLocaleString()} {m.unit}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                                {m.requiredQuantity.toLocaleString()} {m.unit}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold">
                                {m.shortageQuantity > 0 ? (
                                  <span className="text-rose-400">
                                    -{m.shortageQuantity.toLocaleString()} {m.unit}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">0</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {m.isShortage ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 font-sans">
                                    SHORTAGE
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-sans">
                                    AVAILABLE
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
              Select or create a Bill of Materials to view recipes and calculate inventory requirements.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create / Edit BOM */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBOM ? `Edit BOM: ${editingBOM.product?.modelNumber}` : 'Create New Bill of Materials'}
        subtitle="Associate raw material quantities needed to manufacture 1 finished LED unit"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Target LED Product *
              </label>
              <select
                disabled={!!editingBOM}
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
                BOM Version *
              </label>
              <input
                type="text"
                required
                disabled={!!editingBOM}
                placeholder="1.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Engineering Notes / Revisions
            </label>
            <input
              type="text"
              placeholder="e.g. Standard production recipe with high efficacy SMD 2835"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Dynamic Component Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                Required Raw Materials (Per 1 Unit)
              </span>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Component Item
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto p-1">
              {bomItems.map((row, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <div className="flex-1">
                    <select
                      value={row.materialId}
                      onChange={(e) => handleItemChange(idx, 'materialId', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.materialCode} — {m.materialName} ({m.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-32">
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      required
                      placeholder="Qty"
                      value={row.quantityRequired}
                      onChange={(e) =>
                        handleItemChange(idx, 'quantityRequired', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-right text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveRow(idx)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
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
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-sm"
            >
              {submitting ? 'Saving BOM...' : editingBOM ? 'Update BOM' : 'Create BOM Recipe'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
