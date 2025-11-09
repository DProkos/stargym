import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceData {
  invoice_number: string;
  issue_date: string;
  due_date: string;
  customer: {
    full_name: string;
    email: string;
    phone?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes?: string;
  payment_terms?: string;
}

interface CompanySettings {
  company_name: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_tax_id?: string;
  company_logo_url?: string;
  footer_text?: string;
  bank_details?: string;
}

export async function generateInvoicePDF(
  invoiceData: InvoiceData,
  companySettings: CompanySettings
): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Add Logo if available
  if (companySettings.company_logo_url) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = companySettings.company_logo_url!;
      });
      doc.addImage(img, 'PNG', 15, yPosition, 40, 20);
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  }

  // Company Info (Right side)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const companyInfoX = pageWidth - 15;
  doc.text(companySettings.company_name, companyInfoX, yPosition, { align: 'right' });
  yPosition += 5;

  if (companySettings.company_address) {
    doc.text(companySettings.company_address, companyInfoX, yPosition, { align: 'right' });
    yPosition += 5;
  }

  if (companySettings.company_phone) {
    doc.text(`Tel: ${companySettings.company_phone}`, companyInfoX, yPosition, { align: 'right' });
    yPosition += 5;
  }

  if (companySettings.company_email) {
    doc.text(companySettings.company_email, companyInfoX, yPosition, { align: 'right' });
    yPosition += 5;
  }

  if (companySettings.company_tax_id) {
    doc.text(`Tax ID: ${companySettings.company_tax_id}`, companyInfoX, yPosition, { align: 'right' });
  }

  yPosition = 60;

  // Invoice Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 15, yPosition);

  yPosition += 10;

  // Invoice Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice Number: ${invoiceData.invoice_number}`, 15, yPosition);
  yPosition += 5;
  doc.text(`Issue Date: ${new Date(invoiceData.issue_date).toLocaleDateString()}`, 15, yPosition);
  yPosition += 5;
  doc.text(`Due Date: ${new Date(invoiceData.due_date).toLocaleDateString()}`, 15, yPosition);

  yPosition += 15;

  // Bill To Section
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 15, yPosition);
  yPosition += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceData.customer.full_name, 15, yPosition);
  yPosition += 5;
  doc.text(invoiceData.customer.email, 15, yPosition);
  if (invoiceData.customer.phone) {
    yPosition += 5;
    doc.text(invoiceData.customer.phone, 15, yPosition);
  }

  yPosition += 15;

  // Items Table
  const tableBody = invoiceData.items.map(item => [
    item.description,
    item.quantity.toString(),
    `€${parseFloat(String(item.unit_price)).toFixed(2)}`,
    `€${parseFloat(String(item.total_price)).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Description', 'Quantity', 'Unit Price', 'Total']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 10,
      cellPadding: 5
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' }
    }
  });

  // Get Y position after table
  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Summary Section
  const summaryX = pageWidth - 65;
  doc.setFont('helvetica', 'normal');
  
  doc.text('Subtotal:', summaryX, yPosition);
  doc.text(`€${parseFloat(String(invoiceData.subtotal)).toFixed(2)}`, pageWidth - 15, yPosition, { align: 'right' });
  yPosition += 6;

  if (invoiceData.discount_amount > 0) {
    doc.text('Discount:', summaryX, yPosition);
    doc.text(`-€${parseFloat(String(invoiceData.discount_amount)).toFixed(2)}`, pageWidth - 15, yPosition, { align: 'right' });
    yPosition += 6;
  }

  doc.text(`Tax (${invoiceData.tax_rate}%):`, summaryX, yPosition);
  doc.text(`€${parseFloat(String(invoiceData.tax_amount)).toFixed(2)}`, pageWidth - 15, yPosition, { align: 'right' });
  yPosition += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', summaryX, yPosition);
  doc.text(`€${parseFloat(String(invoiceData.total_amount)).toFixed(2)}`, pageWidth - 15, yPosition, { align: 'right' });

  yPosition += 15;

  // Notes
  if (invoiceData.notes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 15, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(invoiceData.notes, pageWidth - 30);
    doc.text(splitNotes, 15, yPosition);
    yPosition += splitNotes.length * 5 + 5;
  }

  // Payment Terms
  if (invoiceData.payment_terms) {
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Terms:', 15, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    const splitTerms = doc.splitTextToSize(invoiceData.payment_terms, pageWidth - 30);
    doc.text(splitTerms, 15, yPosition);
    yPosition += splitTerms.length * 5 + 5;
  }

  // Bank Details
  if (companySettings.bank_details) {
    doc.setFont('helvetica', 'bold');
    doc.text('Bank Details:', 15, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    const splitBank = doc.splitTextToSize(companySettings.bank_details, pageWidth - 30);
    doc.text(splitBank, 15, yPosition);
  }

  // Footer
  if (companySettings.footer_text) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(companySettings.footer_text, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  return doc.output('blob');
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}