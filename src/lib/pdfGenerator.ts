import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Customer, Product } from '../types';

export const generateQuotePDF = async (
  shopName: string,
  customer: Customer,
  items: (Product & { quantity: number; price_at_time?: number })[],
  summary: { subtotal: number; tax: number; total: number },
  quoteId: string
): Promise<Blob> => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.text(shopName || 'RetailFlow Shop', 14, 20);
  
  doc.setFontSize(10);
  doc.text('QUOTATION', 196, 20, { align: 'right' });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 196, 26, { align: 'right' });
  if (quoteId) doc.text(`Quote #: ${quoteId.slice(0, 8).toUpperCase()}`, 196, 32, { align: 'right' });

  // Customer Details
  doc.setFontSize(12);
  doc.text('Bill To:', 14, 40);
  doc.setFontSize(10);
  doc.text(customer.name, 14, 46);
  
  let currentY = 52;
  if (customer.phone) {
    doc.text(customer.phone, 14, currentY);
    currentY += 6;
  }
  if (customer.location) {
    doc.text(customer.location, 14, currentY);
  }

  // Table
  const tableData = items.map(item => [
    item.name,
    item.category || '-',
    item.quantity.toString(),
    `Rs. ${item.price_at_time || item.price}`,
    `Rs. ${(item.quantity * (item.price_at_time || item.price)).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 75,
    head: [['Item', 'Category', 'Quantity', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] } // Dark blue header
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY || 75;
  
  doc.text(`Subtotal: Rs. ${summary.subtotal.toFixed(2)}`, 140, finalY + 10);
  doc.text(`Tax: Rs. ${summary.tax.toFixed(2)}`, 140, finalY + 16);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total: Rs. ${summary.total.toFixed(2)}`, 140, finalY + 24);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Thank you for your business!', 14, finalY + 40);

  return doc.output('blob');
};
