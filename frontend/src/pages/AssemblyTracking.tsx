import React, { useState, useEffect } from 'react';
import {
  GitCommit,
  CheckCircle2,
  Clock,
  ArrowRight,
  Factory,
  Layers,
  ChevronRight,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { productionOrderApi, dashboardApi } from '../services/api';
import { ProductionOrder, AssemblyStage } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';

const STAGES: { key: AssemblyStage; label: string; step: number; description: string }[] = [
  { key: 'MATERIAL_ISSUED', label: 'Material Issued', step: 1, description: 'Store issued components to shop floor' },
  { key: 'ASSEMBLY_STARTED', label: 'Assembly Started', step: 2, description: 'SMT mounting & PCB wire soldering' },
  { key: 'ASSEMBLY_COMPLETED', label: 'Assembly Completed', step: 3, description: 'Housing core & thermal heatsink fixed' },
  { key: 'TESTING', label: 'Testing & Burn-In', step: 4, description: 'Aging rack load test & electrical test' },
  { key: 'PACKING', label: 'Packing', step: 5, description: 'Retail carton & barcode labeling' },
  { key: 'FINISHED', label: 'Finished Goods', step: 6, description: 'Batch ready for warehouse transfer' },
];

export const AssemblyTracking: React.FC = () => {
  const { user } = useAuth();
  const isSupervisor = user?.role === 'ADMIN' || user?.role === 'PRODUCTION_SUPERVISOR';

  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Stage advancement modal
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [targetStage, setTargetStage] = useState<AssemblyStage>('ASSEMBLY_STARTED');
  const [stageNotes, setStageNotes] = useState('');
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await productionOrderApi.getAll();
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to load orders for assembly tracking:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleOpenAdvance = (order: ProductionOrder) => {
    setSelectedOrder(order);
    const currentIndex = STAGES.findIndex((s) => s.key === order.stage);
    const nextStage = currentIndex < STAGES.length - 1 ? STAGES[currentIndex + 1].key : order.stage;
    setTargetStage(nextStage);
    setStageNotes(`Advanced to ${nextStage.replace(/_/g, ' ')} stage by ${user?.name || 'Supervisor'}`);
    setIsStageModalOpen(true);
  };

  const handleAdvanceStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setUpdating(true);

    try {
      await productionOrderApi.updateStage(selectedOrder.id, {
        stage: targetStage,
        notes: stageNotes,
      });
      setIsStageModalOpen(false);
      loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to advance stage.');
    } finally {
      setUpdating(false);
    }
  };

  // Filter out cancelled orders for live floor tracking
  const activeOrders = orders.filter((o) => o.status !== 'CANCELLED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <GitCommit className="w-6 h-6 text-emerald-500" />
            Shop Floor Assembly Line Tracking
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track batches step-by-step through 6 manufacturing milestones from component issue to final packaging.
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Refresh Lines
        </button>
      </div>

      {/* Assembly Stage Progress Pipeline Overview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          6-Stage Production Lifecycle
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {STAGES.map((stage, idx) => {
            const countInStage = activeOrders.filter((o) => o.stage === stage.key).length;
            return (
              <div
                key={stage.key}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    STAGE 0{stage.step}
                  </span>
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono">
                    {countInStage}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {stage.label}
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                  {stage.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Production Orders Floor Board */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Active Batches on Shop Floor ({activeOrders.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeOrders.map((order) => {
            const currentStageIndex = STAGES.findIndex((s) => s.key === order.stage);
            const progressPercent = Math.round(((currentStageIndex + 1) / STAGES.length) * 100);
            const isCompleted = order.stage === 'FINISHED' || order.status === 'COMPLETED';

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 relative overflow-hidden"
              >
                {/* Top order banner */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-base text-slate-900 dark:text-slate-100">
                        {order.orderNumber}
                      </span>
                      <StatusBadge status={order.status} variant="order" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                      {order.product.modelNumber} — {order.product.productName}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-mono font-extrabold text-slate-900 dark:text-slate-100">
                      {order.quantity} pcs
                    </span>
                    <p className="text-[10px] text-slate-400">Batch Volume</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Current: {order.stage.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-slate-500 font-bold">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Stage Steps Indicator */}
                <div className="grid grid-cols-6 gap-1 pt-1">
                  {STAGES.map((s, idx) => {
                    const isPassed = idx <= currentStageIndex;
                    const isCurrent = idx === currentStageIndex;
                    return (
                      <div key={s.key} className="text-center">
                        <div
                          className={`h-1.5 rounded-full ${
                            isCurrent
                              ? 'bg-emerald-500'
                              : isPassed
                              ? 'bg-emerald-500/50'
                              : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                        />
                        <span
                          className={`text-[9px] mt-1 block truncate font-mono ${
                            isCurrent
                              ? 'font-bold text-emerald-500'
                              : isPassed
                              ? 'text-slate-400'
                              : 'text-slate-600 dark:text-slate-600'
                          }`}
                        >
                          S{s.step}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Stage Notes */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 text-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Latest Note:</span>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5 italic">
                    "{order.stageNotes || 'Stage in progress.'}"
                  </p>
                </div>

                {/* Action footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400">
                    Target: {new Date(order.productionDate).toLocaleDateString()}
                  </span>

                  {isSupervisor && !isCompleted && (
                    <button
                      onClick={() => handleOpenAdvance(order)}
                      className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xs transition-colors cursor-pointer"
                    >
                      <span>Advance Milestone</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  )}

                  {isCompleted && (
                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Finished & QC Approved
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Advance Stage Modal */}
      <Modal
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        title={`Advance Milestone: ${selectedOrder?.orderNumber}`}
        subtitle="Move order forward to the next manufacturing milestone and log supervisor remarks"
      >
        <form onSubmit={handleAdvanceStage} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Order:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {selectedOrder?.orderNumber}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-slate-500">Product:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {selectedOrder?.product.modelNumber} ({selectedOrder?.quantity} pcs)
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Target Assembly Milestone *
            </label>
            <select
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value as AssemblyStage)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-bold"
            >
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  Stage 0{s.step}: {s.label} ({s.description})
                </option>
              ))}
            </select>
            {targetStage === 'ASSEMBLY_STARTED' && (
              <p className="text-[11px] text-amber-500 mt-1.5">
                Note: Moving to Assembly Started will permanently consume reserved raw materials and issue them to line workers.
              </p>
            )}
            {targetStage === 'FINISHED' && (
              <p className="text-[11px] text-emerald-500 mt-1.5">
                Note: Finishing this batch completes the order and makes it available for QC certification and Finished Goods transfer.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Floor Remarks & Quality Notes *
            </label>
            <textarea
              required
              rows={3}
              value={stageNotes}
              onChange={(e) => setStageNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              placeholder="e.g. SMT mounting verified. Passed optical visual check without solder bridging."
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsStageModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-sm"
            >
              {updating ? 'Updating Stage...' : 'Confirm Stage Advance'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
