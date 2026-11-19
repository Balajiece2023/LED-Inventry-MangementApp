import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  Layers,
  Factory,
  ShieldCheck,
  ShieldAlert,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
  PackageCheck,
  Truck,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { KPICard } from '../components/common/KPICard';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../services/api';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const res = await dashboardApi.getStats();
        setStats(res.data);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [user]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const { summary, lowStockMaterials, recentOrders, recentQC, recentDispatch } = stats;

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Plant Monitoring Active</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user?.name || 'Supervisor'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time shop floor performance, inventory reservation, assembly metrics and QC conformance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/production-orders"
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Factory className="w-4 h-4 mr-1.5" />
            + New Production Order
          </Link>
          <Link
            to="/qc-testing"
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-400" />
            QC Inspection
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Products"
          value={summary.totalProducts}
          subtitle="Active LED Models"
          icon={Boxes}
          color="blue"
          badge={{ text: 'Product Master', variant: 'neutral' }}
        />
        <KPICard
          title="Raw Materials"
          value={summary.rawMaterialsCount}
          subtitle={`Valuation: $${summary.inventoryValue?.toLocaleString()}`}
          icon={Layers}
          color="emerald"
          badge={
            summary.lowStockCount > 0
              ? { text: `${summary.lowStockCount} Low Stock`, variant: 'warning' }
              : { text: 'Stock Healthy', variant: 'positive' }
          }
        />
        <KPICard
          title="Production Orders"
          value={summary.totalProductionOrders}
          subtitle={`${summary.inProgressOrders} In Progress | ${summary.lockedOrders} Locked`}
          icon={Factory}
          color="purple"
          badge={{ text: `${summary.todayProductionUnits} Units Today`, variant: 'positive' }}
        />
        <KPICard
          title="QC Pass Rate"
          value={`${summary.qcPassPercent}%`}
          subtitle={`${summary.qcPassCount} Passed | ${summary.qcFailCount} Failures`}
          icon={summary.qcPassPercent >= 90 ? ShieldCheck : ShieldAlert}
          color={summary.qcPassPercent >= 90 ? 'emerald' : 'rose'}
          badge={
            summary.qcFailCount > 0
              ? { text: `${summary.qcFailPercent}% Rejection`, variant: 'negative' }
              : { text: 'Zero Defects', variant: 'positive' }
          }
        />
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Finished Goods</p>
            <h4 className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {summary.totalFGQuantity} <span className="text-xs font-normal text-slate-500">Units</span>
            </h4>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              {summary.availableFGQuantity} Units Available for Dispatch
            </p>
          </div>
          <div className="p-3 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Dispatch Shipments</p>
            <h4 className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {summary.completedDispatchCount} <span className="text-xs font-normal text-slate-500">Delivered</span>
            </h4>
            <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-0.5">
              {summary.pendingDispatchCount} Orders Scheduled
            </p>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Inventory Valuation</p>
            <h4 className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              ${summary.inventoryValue?.toLocaleString()}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Raw Materials in Warehouse Stores
            </p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main 2-column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Recent Production Orders & Assembly */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Recent Production Orders
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Active batches on shop floor and material reservation status
                </p>
              </div>
              <Link
                to="/production-orders"
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center"
              >
                View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Order #</th>
                    <th className="py-2.5 px-3">Product Model</th>
                    <th className="py-2.5 px-3 text-right">Batch Qty</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {recentOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {order.product.modelNumber}
                        </span>
                        <div className="text-[10px] text-slate-400">{order.product.productName}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {order.quantity} pcs
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={order.status} variant="order" />
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={order.stage} variant="stage" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Assembly Workflow Shortcut */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-900/40 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <Factory className="w-4 h-4" />
                Assembly Line Stages
              </h4>
              <Link to="/assembly-tracking" className="text-xs text-slate-400 hover:text-white flex items-center">
                Track Live <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
              {[
                { stage: 'Material Issued', count: summary.lockedOrders || 1 },
                { stage: 'Assembly Started', count: 1 },
                { stage: 'Assembly Done', count: 0 },
                { stage: 'Testing / Burn-In', count: 1 },
                { stage: 'Packing', count: 0 },
                { stage: 'Finished', count: summary.completedOrders || 2 },
              ].map((st, i) => (
                <div key={st.stage} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-mono">Stage 0{i + 1}</div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5 line-clamp-1">{st.stage}</div>
                  <div className="mt-1 text-sm font-mono font-extrabold text-emerald-400">{st.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 span): Low Stock Alerts & QC Highlights */}
        <div className="space-y-6">
          {/* Low Stock Alerts */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Low Stock Warnings
                </h3>
              </div>
              <Link to="/materials" className="text-xs text-amber-600 dark:text-amber-400 hover:underline">
                Reorder
              </Link>
            </div>

            {lowStockMaterials.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>All raw material stocks are currently above minimum threshold.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {lowStockMaterials.map((mat: any) => (
                  <div
                    key={mat.id}
                    className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {mat.materialCode}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                        {mat.materialName}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        {mat.currentStock - mat.reservedStock} {mat.unit}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Min: {mat.reorderLevel}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent QC Reports */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Recent QC Inspections
                </h3>
              </div>
              <Link to="/qc-testing" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
                Lab View
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentQC.map((qc: any) => (
                <div
                  key={qc.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/40 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {qc.batchNumber}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      V: {qc.voltage}V | P: {qc.power}W | T: {qc.temperature}°C
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={qc.result} variant="qc" />
                    {qc.result === 'FAIL' && (
                      <p className="text-[10px] text-rose-500 font-semibold mt-1">
                        {qc.failureReason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
