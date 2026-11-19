import React, { useState, useEffect } from 'react';
import {
  PackageCheck,
  Search,
  Filter,
  Package,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Truck,
} from 'lucide-react';
import { finishedGoodsApi } from '../services/api';
import { FinishedGoods } from '../types';
import { ExportButtons } from '../components/common/ExportButtons';
import { StatusBadge } from '../components/common/StatusBadge';
import { KPICard } from '../components/common/KPICard';

export const FinishedGoodsPage: React.FC = () => {
  const [items, setItems] = useState<FinishedGoods[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        finishedGoodsApi.getAll({ search: search || undefined }),
        finishedGoodsApi.getStats(),
      ]);
      setItems(listRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load finished goods inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <PackageCheck className="w-6 h-6 text-emerald-500" />
            Finished Goods Warehouse Inventory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Certified QC PASS luminaire stock ready for customer dispatch and order fulfillment.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <ExportButtons data={items} fileName="Finished_Goods_Inventory" />
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard
            title="Available for Dispatch"
            value={`${stats.totalAvailable?.toLocaleString()} pcs`}
            subtitle="Immediate unreserved stock"
            icon={PackageCheck}
            color="emerald"
            badge={{ text: 'Ready to Ship', variant: 'positive' }}
          />
          <KPICard
            title="Reserved for Orders"
            value={`${stats.totalReserved?.toLocaleString()} pcs`}
            subtitle="Allocated to customer invoices"
            icon={Truck}
            color="purple"
            badge={{ text: 'Order Committed', variant: 'neutral' }}
          />
          <KPICard
            title="QC Rejected Quarantine"
            value={`${stats.rejectedBatches || 0} batches`}
            subtitle="Failed quality inspection"
            icon={AlertTriangle}
            color="rose"
            badge={{ text: 'Isolated', variant: 'negative' }}
          />
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search batch number, product model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Finished Goods Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold text-[11px]">
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Product Model</th>
                <th className="py-3 px-4 text-right">Total Quantity</th>
                <th className="py-3 px-4 text-right">Reserved Qty</th>
                <th className="py-3 px-4 text-right">Available Qty</th>
                <th className="py-3 px-4">Mfg Date</th>
                <th className="py-3 px-4">QC Status</th>
                <th className="py-3 px-4">Storage Bay Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    Loading finished goods inventory...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No finished goods inventory recorded yet.
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {it.batchNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {it.product.modelNumber}
                      </span>
                      <div className="text-[10px] text-slate-400">{it.product.productName}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-600 dark:text-slate-400">
                      {it.quantity.toLocaleString()} pcs
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                      {it.reservedQuantity.toLocaleString()} pcs
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {(it.availableQuantity || 0).toLocaleString()} pcs
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(it.manufacturingDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={it.qcStatus} variant="qc" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                      {it.notes || 'Warehouse Bay Main'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
