import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Customer, Product } from '../types';

export interface PDFOptions {
  shopName: string;
  logoUrl?: string | null;
  qrCodeUrl?: string | null;
  attachmentUrl?: string | null;
  customer: Customer;
  items: (Product & { quantity: number; price_at_time?: number })[];
  summary: { subtotal: number; tax: number; taxRate: number; total: number };
  quoteId: string;
}

const getBase64ImageFromUrl = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Error fetching image for PDF:', err);
    return null;
  }
};

export const generateQuotePDF = async (options: PDFOptions): Promise<Blob> => {
  const {
    shopName,
    logoUrl,
    qrCodeUrl,
    attachmentUrl,
    customer,
    items,
    summary,
    quoteId
  } = options;

  const doc = new jsPDF();
  let currentHeaderY = 15;

  // Render Retailer Logo if available
  if (logoUrl) {
    const logoBase64 = await getBase64ImageFromUrl(logoUrl);
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 14, 10, 32, 20);
        currentHeaderY = 35;
      } catch (e) {
        console.warn('Failed to render logo image in PDF', e);
      }
    }
  }

  // Header Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(shopName || 'RetailFlow Shop', logoUrl ? 50 : 14, 20);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('QUOTATION', 196, 18, { align: 'right' });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 196, 24, { align: 'right' });
  if (quoteId) doc.text(`Quote #: ${quoteId.slice(0, 8).toUpperCase()}`, 196, 30, { align: 'right' });

  // Customer Details
  const customerY = Math.max(currentHeaderY + 5, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Bill To:', 14, customerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(customer.name, 14, customerY + 6);
  
  let currentY = customerY + 12;
  if (customer.phone) {
    doc.text(customer.phone, 14, currentY);
    currentY += 6;
  }
  if (customer.location) {
    doc.text(customer.location, 14, currentY);
    currentY += 6;
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
    startY: currentY + 4,
    head: [['Item', 'Category', 'Quantity', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 80;
  
  // Summary Totals
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Subtotal: Rs. ${summary.subtotal.toFixed(2)}`, 140, finalY + 10);
  doc.text(`GST (${summary.taxRate || 18}%): Rs. ${summary.tax.toFixed(2)}`, 140, finalY + 16);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total: Rs. ${summary.total.toFixed(2)}`, 140, finalY + 24);

  let bottomY = finalY + 15;

  // Render Payment QR Code if available
  if (qrCodeUrl) {
    const qrBase64 = await getBase64ImageFromUrl(qrCodeUrl);
    if (qrBase64) {
      try {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('SCAN TO PAY (UPI / BANK)', 14, bottomY);
        doc.addImage(qrBase64, 'PNG', 14, bottomY + 3, 30, 30);
        bottomY += 38;
      } catch (e) {
        console.warn('Failed to render QR Code in PDF', e);
      }
    }
  }

  // Render Custom Attachment Image if available
  if (attachmentUrl) {
    const attachBase64 = await getBase64ImageFromUrl(attachmentUrl);
    if (attachBase64) {
      try {
        if (bottomY > 230) {
          doc.addPage();
          bottomY = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('ATTACHMENT / PRODUCT REFERENCE', 14, bottomY);
        doc.addImage(attachBase64, 'PNG', 14, bottomY + 4, 60, 45);
        bottomY += 52;
      } catch (e) {
        console.warn('Failed to render attachment image in PDF', e);
      }
    }
  }

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Thank you for your business!', 14, Math.max(bottomY + 10, finalY + 35));

  return doc.output('blob');
};
