import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Layers,
  ShieldCheck,
  Zap,
  Download,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { reportApi } from '../services/api';
import { ExportButtons } from '../components/common/ExportButtons';
import { KPICard } from '../components/common/KPICard';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444'];

export const ReportsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const res = await reportApi.getAnalytics();
        setData(res.data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const { dailyProduction, monthlyProduction, categoryConsumption, qcMetrics, productionEfficiency } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-emerald-500" />
            Executive Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Production yields, inventory consumption, monthly milestones, and quality control defect analysis.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <ExportButtons data={dailyProduction} fileName="Daily_Production_Report" label="Daily Export" />
          <ExportButtons data={monthlyProduction} fileName="Monthly_Production_Report" label="Monthly Export" />
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KPICard
          title="Overall QC Pass Rate"
          value={`${qcMetrics.passRate}%`}
          subtitle={`${qcMetrics.pass} Passed / ${qcMetrics.total} Tested`}
          icon={ShieldCheck}
          color="emerald"
          badge={{ text: 'Production Yield', variant: 'positive' }}
        />
        <KPICard
          title="Target Efficiency"
          value="93.9%"
          subtitle="Line 1 & 2 Overall Performance"
          icon={TrendingUp}
          color="blue"
          badge={{ text: '+2.4% vs Target', variant: 'positive' }}
        />
        <KPICard
          title="Monthly Output"
          value="11,400"
          subtitle="Target: 12,000 Luminaires"
          icon={BarChart3}
          color="purple"
          badge={{ text: '95% of Target', variant: 'neutral' }}
        />
        <KPICard
          title="Chip Consumption"
          value="$3,450"
          subtitle="SMD 2835 & 3030 Leds"
          icon={Layers}
          color="amber"
          badge={{ text: 'Lead Raw Material', variant: 'neutral' }}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Daily Production Run */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Daily Assembled Units (Last 7 Days)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total finished volume per day</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-500">Shop Floor #1</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyProduction}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '0.75rem',
                    color: '#fff',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="units"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#10b981' }}
                  activeDot={{ r: 7 }}
                  name="Finished Units"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Monthly Target vs Actual Output */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Monthly Target vs Actual Production
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Volume goals vs floor delivery</p>
            </div>
            <span className="text-xs font-mono font-bold text-purple-500">Cumulative Units</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyProduction}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '0.75rem',
                    color: '#fff',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                <Bar dataKey="target" fill="#64748b" name="Target Units" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="#8b5cf6" name="Actual Built" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Inventory Consumption Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Inventory Consumption by Component Group
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Cost value ($) issued to assembly</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryConsumption}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={4}
                  label={(entry) => `${entry.name}`}
                >
                  {categoryConsumption.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`$${val.toLocaleString()}`, 'Value Consumed']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '0.75rem',
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: QC Defect Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                QC Defect Breakdown by Root Cause
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Reasons identified in failed batches</p>
            </div>
            <span className="text-xs font-mono font-bold text-rose-500">ISO Non-Conformance</span>
          </div>

          <div className="h-64 flex flex-col justify-center">
            <div className="space-y-3">
              {qcMetrics.failBreakdown.map((item: any, idx: number) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {item.name}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {item.count} incident(s)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(10, item.count * 40)}%`,
                        backgroundColor: COLORS[idx % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Production Line Efficiency Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Assembly Line OEE & Performance Matrix
          </h3>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold text-[11px]">
            <tr>
              <th className="py-3 px-4">Line Designation</th>
              <th className="py-3 px-4 text-right">Actual Output</th>
              <th className="py-3 px-4 text-right">Target Output</th>
              <th className="py-3 px-4 text-right">Line Efficiency (%)</th>
              <th className="py-3 px-4">Performance Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            {productionEfficiency.map((line: any) => (
              <tr key={line.line} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40">
                <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                  {line.line}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold">
                  {line.output.toLocaleString()} pcs
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                  {line.target.toLocaleString()} pcs
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                  {line.efficiency}%
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                    High Productivity
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
