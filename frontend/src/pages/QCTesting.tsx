import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Plus,
  Search,
  Filter,
  FileCheck,
  Download,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Thermometer,
  Gauge,
  Clock,
  FileText,
} from 'lucide-react';
import { qcApi, productionOrderApi } from '../services/api';
import { QCReport, QCCertificate, ProductionOrder, QCResult, FailureReason } from '../types';
import { Modal } from '../components/common/Modal';
import { ExportButtons } from '../components/common/ExportButtons';
import { StatusBadge } from '../components/common/StatusBadge';
import { generateQCCertificatePDF } from '../components/pdf/QCCertificatePDF';
import { useAuth } from '../context/AuthContext';

export const QCTesting: React.FC = () => {
  const { user } = useAuth();
  const isQC = user?.role === 'ADMIN' || user?.role === 'QC_ENGINEER';

  const [reports, setReports] = useState<QCReport[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('ALL');

  // Inspection Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [voltage, setVoltage] = useState('230.0');
  const [current, setCurrent] = useState('0.052');
  const [power, setPower] = useState('12.0');
  const [temperature, setTemperature] = useState('46.5');
  const [burnInDuration, setBurnInDuration] = useState('4 Hours Continuous Aging Load');
  const [remarks, setRemarks] = useState('All parameters within standard tolerance.');
  const [result, setResult] = useState<QCResult>('PASS');
  const [failureReason, setFailureReason] = useState<FailureReason>('NONE');

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadQCData = async () => {
    try {
      setLoading(true);
      const [repRes, ordRes] = await Promise.all([
        qcApi.getReports({
          search: search || undefined,
          result: resultFilter !== 'ALL' ? resultFilter : undefined,
        }),
        productionOrderApi.getAll(),
      ]);
      setReports(repRes.data);
      setProductionOrders(ordRes.data);
      if (ordRes.data.length > 0 && !selectedOrderId) {
        setSelectedOrderId(ordRes.data[0].id);
        setBatchNumber(`BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      }
    } catch (err) {
      console.error('Failed to load QC data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQCData();
  }, [search, resultFilter]);

  const handleOpenNewTest = () => {
    if (productionOrders.length > 0) {
      setSelectedOrderId(productionOrders[0].id);
      setBatchNumber(`BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    }
    setVoltage('230.2');
    setCurrent('0.052');
    setPower('12.0');
    setTemperature('45.8');
    setBurnInDuration('4 Hours Continuous Aging Load');
    setRemarks('All electrical and photometric standards verified.');
    setResult('PASS');
    setFailureReason('NONE');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
    const ord = productionOrders.find((o) => o.id === orderId);
    if (ord) {
      setBatchNumber(`BATCH-${new Date().getFullYear()}-${ord.orderNumber.replace('PO-', '')}`);
      setPower(String(ord.product.wattage));
      setCurrent(String((ord.product.wattage / 230).toFixed(3)));
    }
  };

  const handleResultChange = (res: QCResult) => {
    setResult(res);
    if (res === 'FAIL') {
      setFailureReason('DRIVER_FAILURE');
      setRemarks('Driver over-voltage shutdown failed during burn-in stress test.');
    } else {
      setFailureReason('NONE');
      setRemarks('All electrical and thermal parameters passed nominal tolerance.');
    }
  };

  const handleSubmitQC = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await qcApi.createReport({
        productionOrderId: selectedOrderId,
        batchNumber,
        voltage: parseFloat(voltage),
        current: parseFloat(current),
        power: parseFloat(power),
        temperature: parseFloat(temperature),
        burnInTestDuration: burnInDuration,
        remarks,
        result,
        failureReason: result === 'PASS' ? 'NONE' : failureReason,
      });

      setIsModalOpen(false);
      alert(
        result === 'PASS'
          ? `QC Test Passed! Conformance Certificate ${res.data.cert?.certificateNumber || 'generated'} and products added to Finished Goods.`
          : 'QC Inspection registered as FAILED. Failure alert created for engineering review.'
      );
      loadQCData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to submit QC report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadCertificate = (report: QCReport) => {
    const product = report.productionOrder?.product;
    if (!product) {
      alert('Product details missing for this certificate.');
      return;
    }

    const certData = report.certificate || {
      certificateNumber: `QCC-${report.reportNumber.replace('QCR-', '')}`,
      batchNumber: report.batchNumber,
      inspectorName: report.inspectorName,
      inspectionDate: report.createdAt,
      result: report.result,
    };

    generateQCCertificatePDF(certData, report, product);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            QC Testing Lab & Certificate Generation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Conduct electrical, thermal and burn-in testing on finished batches. Auto-generate printable QC certificates for passed items.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <ExportButtons data={reports} fileName="QC_Inspection_Reports" />
          {isQC && (
            <button
              onClick={handleOpenNewTest}
              className="inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New QC Inspection
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
            placeholder="Search report #, batch, inspector..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Inspection Results</option>
            <option value="PASS">PASS Only</option>
            <option value="FAIL">FAIL Only</option>
          </select>
        </div>
      </div>

      {/* QC Reports Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold text-[11px]">
                <th className="py-3 px-4">Report #</th>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Product Model</th>
                <th className="py-3 px-4 text-center">Electrical (V / A / W)</th>
                <th className="py-3 px-4 text-center">Temp (°C)</th>
                <th className="py-3 px-4">Burn-In Duration</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Defect Reason</th>
                <th className="py-3 px-4">Inspector</th>
                <th className="py-3 px-4 text-right">Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    Loading QC inspection logs...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    No QC reports found matching criteria.
                  </td>
                </tr>
              ) : (
                reports.map((r) => {
                  const isPass = r.result === 'PASS';
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition-colors ${
                        !isPass ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {r.reportNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {r.batchNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {r.productionOrder?.product.modelNumber || 'N/A'}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {r.productionOrder?.orderNumber}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        <span className="text-slate-900 dark:text-slate-100 font-bold">
                          {r.voltage.toFixed(1)}V
                        </span>{' '}
                        / <span className="text-slate-500">{r.current.toFixed(3)}A</span> /{' '}
                        <span className="text-amber-500 font-bold">{r.power.toFixed(1)}W</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        <span
                          className={`font-bold ${
                            r.temperature > 65
                              ? 'text-rose-500'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {r.temperature.toFixed(1)}°C
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {r.burnInTestDuration}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={r.result} variant="qc" />
                      </td>
                      <td className="py-3.5 px-4">
                        {!isPass ? (
                          <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                            {r.failureReason.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">None (Passed)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {r.inspectorName}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isPass ? (
                          <button
                            onClick={() => handleDownloadCertificate(r)}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition-colors shadow-2xs"
                            title="Download official PDF Certificate"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            PDF Cert
                          </button>
                        ) : (
                          <span className="text-[10px] text-rose-500 font-bold">
                            Quarantined
                          </span>
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

      {/* Modal: New QC Inspection */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record QC Inspection & Electrical Parameters"
        subtitle="Perform multimeter & thermal measurements on aging rack batch"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmitQC} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Select Production Batch Order *
              </label>
              <select
                required
                value={selectedOrderId}
                onChange={(e) => handleOrderSelect(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {productionOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} — {o.product.modelNumber} ({o.quantity} pcs, Stage: {o.stage})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                QC Batch Lot Identifier *
              </label>
              <input
                type="text"
                required
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Electrical Measurement Inputs */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Electrical & Thermal Meter Readings
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                  Voltage (V) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={voltage}
                  onChange={(e) => setVoltage(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                  Current (A) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                  Power (W) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={power}
                  onChange={(e) => setPower(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                  Heat Sink Temp (°C) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Burn-In Aging Test Specification *
            </label>
            <input
              type="text"
              required
              value={burnInDuration}
              onChange={(e) => setBurnInDuration(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Test Decision: PASS or FAIL */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Inspection Verdict *
              </label>
              <div className="flex items-center space-x-3 mt-1">
                <label className="flex items-center space-x-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer">
                  <input
                    type="radio"
                    name="qcResult"
                    checked={result === 'PASS'}
                    onChange={() => handleResultChange('PASS')}
                    className="text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>PASS (Compliant)</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-bold text-rose-600 dark:text-rose-400 cursor-pointer">
                  <input
                    type="radio"
                    name="qcResult"
                    checked={result === 'FAIL'}
                    onChange={() => handleResultChange('FAIL')}
                    className="text-rose-500 focus:ring-rose-500"
                  />
                  <span>FAIL (Rejected)</span>
                </label>
              </div>
            </div>

            {result === 'FAIL' && (
              <div>
                <label className="block text-xs font-semibold text-rose-600 uppercase mb-1">
                  Primary Failure Reason *
                </label>
                <select
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value as FailureReason)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-rose-300 dark:border-rose-900 text-rose-600 font-bold focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                >
                  <option value="DRIVER_FAILURE">Driver Failure</option>
                  <option value="PCB_FAULT">PCB Fault</option>
                  <option value="LED_FAULT">LED Fault</option>
                  <option value="ASSEMBLY_DEFECT">Assembly Defect</option>
                  <option value="OTHER">Other Defect</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Inspector Remarks & Notes
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
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
              disabled={submitting}
              className={`px-4 py-2 text-xs font-bold rounded-xl text-slate-950 transition-colors shadow-sm ${
                result === 'PASS'
                  ? 'bg-emerald-400 hover:bg-emerald-300'
                  : 'bg-rose-400 hover:bg-rose-300'
              }`}
            >
              {submitting
                ? 'Registering...'
                : result === 'PASS'
                ? 'Approve & Issue Certificate'
                : 'Reject & Quarantine Batch'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
