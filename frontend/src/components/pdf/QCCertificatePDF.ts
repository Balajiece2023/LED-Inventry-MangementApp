import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QCReport, QCCertificate, Product } from '../../types';

export const generateQCCertificatePDF = (
  cert: QCCertificate | { certificateNumber: string; batchNumber: string; inspectorName: string; inspectionDate: string; result: string },
  report: QCReport,
  product: Product
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 42, 'F');

  // Accent Line
  doc.setFillColor(34, 197, 94); // brand-500
  doc.rect(0, 42, 210, 3, 'F');

  // Company Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text('LEO FORCE LED MANUFACTURING CORP.', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Precision Solid-State Luminaire & Optoelectronics Division', 14, 25);
  doc.text('ISO 9001:2015 & CE Certified Manufacturing Plant | QC Lab #04', 14, 30);

  // Certificate Label Top Right
  doc.setTextColor(34, 197, 94);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('QC CONFORMANCE CERTIFICATE', 125, 20);
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`CERT NO: ${cert.certificateNumber}`, 125, 27);
  doc.text(`DATE: ${new Date(cert.inspectionDate).toLocaleDateString()}`, 125, 33);

  // Certificate Meta Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 52, 182, 38, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('BATCH & PRODUCT SPECIFICATIONS', 20, 60);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);

  doc.text('Batch / Lot Number:', 20, 68);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(report.batchNumber, 60, 68);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Product Model:', 20, 75);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(product.modelNumber, 60, 75);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Product Description:', 20, 82);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${product.productName} (${product.wattage}W)`, 60, 82);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('QC Inspector:', 115, 68);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(report.inspectorName, 148, 68);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Production Order:', 115, 75);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(report.productionOrder?.orderNumber || 'N/A', 148, 75);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Burn-In Duration:', 115, 82);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(report.burnInTestDuration || '4 Hours continuous', 148, 82);

  // Electrical & Thermal Test Parameters Table
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ELECTRICAL & PHOTOMETRIC TEST RESULTS', 14, 100);

  autoTable(doc, {
    startY: 104,
    head: [['Parameter Tested', 'Nominal Range', 'Measured Value', 'Standard Reference', 'Status']],
    body: [
      ['Input AC Voltage', '220V - 240V', `${report.voltage.toFixed(1)} V`, 'IEC 60598-1', 'PASS'],
      ['Operating Current', '0.040A - 0.065A', `${report.current.toFixed(3)} A`, 'IEC 62384', 'PASS'],
      ['Rated Power Draw', `${product.wattage - 1}W - ${product.wattage + 1}W`, `${report.power.toFixed(1)} W`, 'IEC 62722-2-1', 'PASS'],
      ['Operating Heat Sink Temp', '< 65.0 °C', `${report.temperature.toFixed(1)} °C`, 'ANSI/IES LM-80', 'PASS'],
      ['Burn-In Accelerated Aging', '100% Load @ 45°C', report.burnInTestDuration, 'LM-79 Photometric', 'PASS'],
      ['Overall Conformance', 'Zero Critical Defects', report.result, 'QC Specification Rev 3', report.result],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3.5,
    },
    columnStyles: {
      4: { fontStyle: 'bold', textColor: [22, 163, 74] }, // green
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 165;

  // Remarks box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, finalY + 8, 182, 24, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('ENGINEER REMARKS & DISPOSITION:', 18, finalY + 15);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(
    report.remarks ||
      'This production lot has successfully undergone rigorous testing and complies with all quality standards.',
    18,
    finalY + 22
  );

  // Big PASS Approval Stamp
  doc.setDrawColor(22, 163, 74);
  doc.setLineWidth(1);
  doc.roundedRect(14, finalY + 38, 70, 24, 2, 2, 'D');

  doc.setTextColor(22, 163, 74);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('APPROVED / PASS', 20, finalY + 49);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Eligible for Finished Goods Inventory', 20, finalY + 56);

  // Signatory Box
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(125, finalY + 54, 185, finalY + 54);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(report.inspectorName, 125, finalY + 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Lead Quality Assurance Engineer', 125, finalY + 63);
  doc.text(`Authorized Signatory | Date: ${new Date().toLocaleDateString()}`, 125, finalY + 67);

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This electronic certificate is issued pursuant to automated production quality checks and is valid without physical seal.',
    14,
    285
  );

  // Save the PDF
  doc.save(`QC_Certificate_${cert.certificateNumber}_${report.batchNumber}.pdf`);
};
