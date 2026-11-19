import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DispatchOrder } from '../../types';

export const generateDispatchNotePDF = (order: DispatchOrder) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Top header bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 40, 'F');

  // Accent Line
  doc.setFillColor(34, 197, 94); // brand-500
  doc.rect(0, 40, 210, 3, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('LEO FORCE LED MANUFACTURING CORP.', 14, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('Finished Goods Outward & Logistics Dispatch Department', 14, 24);
  doc.text('Plot 44, Electronic City Phase II, Industrial Corridor | Phone: +1 800 555 0105', 14, 29);

  // Dispatch Note Label
  doc.setTextColor(34, 197, 94);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('DISPATCH / DELIVERY NOTE', 130, 18);
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`DISPATCH NO: ${order.dispatchOrderNumber}`, 130, 25);
  doc.text(`INVOICE NO: ${order.invoiceNumber}`, 130, 31);

  // Order Details Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 50, 182, 38, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('CONSIGNEE & SHIPMENT INFORMATION', 20, 58);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);

  doc.text('Customer / Client:', 20, 66);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(order.customerName, 60, 66);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Dispatch Date:', 20, 73);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(new Date(order.dispatchDate).toLocaleDateString(), 60, 73);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Status:', 20, 80);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(order.status === 'DISPATCHED' ? 22 : 217, order.status === 'DISPATCHED' ? 163 : 119, 74);
  doc.text(order.status, 60, 80);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Invoice Reference:', 115, 66);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(order.invoiceNumber, 150, 66);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Carrier / Transport:', 115, 73);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Express Freight Line', 150, 73);

  // Table of Items
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('CONSIGNED FINISHED GOODS', 14, 98);

  autoTable(doc, {
    startY: 102,
    head: [['Item #', 'Product Model', 'Product Description', 'Wattage', 'Quantity Dispatched', 'QC Verification']],
    body: [
      [
        '1',
        order.product.modelNumber,
        order.product.productName,
        `${order.product.wattage}W`,
        `${order.quantity} Units`,
        '100% QC Passed',
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 4,
    },
    columnStyles: {
      4: { fontStyle: 'bold', halign: 'right' },
      5: { textColor: [22, 163, 74], fontStyle: 'bold' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 130;

  // Instructions Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, finalY + 10, 182, 30, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('DISPATCH & HANDLING NOTES:', 18, finalY + 17);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text('• Handle with care: Solid-state LED luminaires with electronic driver circuitry.', 18, finalY + 24);
  doc.text('• Finished goods inventory has been deducted and verified against invoice order.', 18, finalY + 30);
  doc.text('• All cartons sealed with Leo Force security tamper-evident tape.', 18, finalY + 36);

  // Signatures
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);

  // Left Signatory (Dispatch Warehouse Officer)
  doc.line(18, finalY + 70, 85, finalY + 70);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Warehouse & Dispatch Officer', 18, finalY + 76);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Authorized by: ${order.createdBy?.name || 'Dispatch Team'}`, 18, finalY + 80);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 18, finalY + 84);

  // Right Signatory (Customer / Transporter Acknowledgment)
  doc.line(120, finalY + 70, 188, finalY + 70);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Received in Good Condition By', 120, finalY + 76);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Consignee / Driver Signature & Stamp`, 120, finalY + 80);
  doc.text(`Date: ________________________`, 120, finalY + 84);

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated via Leo Force LED Manufacturing Management System | Original Copy for Consignee', 14, 285);

  doc.save(`Dispatch_Note_${order.dispatchOrderNumber}.pdf`);
};
