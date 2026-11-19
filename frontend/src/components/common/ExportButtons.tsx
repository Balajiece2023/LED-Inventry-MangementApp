import React from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportButtonsProps {
  data: any[];
  fileName?: string;
  sheetName?: string;
  label?: string;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  data,
  fileName = 'LED_Manufacturing_Export',
  sheetName = 'Data',
  label = 'Export',
}) => {
  const exportToExcel = () => {
    if (!data || data.length === 0) {
      alert('No data available to export.');
      return;
    }

    // Flatten any nested objects for clean spreadsheet display
    const cleanData = data.map((item) => {
      const flat: any = {};
      Object.keys(item).forEach((key) => {
        const val = item[key];
        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
          Object.keys(val).forEach((subKey) => {
            flat[`${key}_${subKey}`] = val[subKey];
          });
        } else if (Array.isArray(val)) {
          flat[key] = `[${val.length} items]`;
        } else {
          flat[key] = val;
        }
      });
      return flat;
    });

    const worksheet = XLSX.utils.json_to_sheet(cleanData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToCSV = () => {
    if (!data || data.length === 0) {
      alert('No data available to export.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={exportToExcel}
        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 transition-colors shadow-xs"
        title="Export dataset to Microsoft Excel (.xlsx)"
      >
        <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
        Excel
      </button>

      <button
        onClick={exportToCSV}
        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
        title="Export dataset to CSV format"
      >
        <Download className="w-3.5 h-3.5 mr-1.5" />
        CSV
      </button>
    </div>
  );
};
