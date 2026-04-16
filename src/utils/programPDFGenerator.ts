import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface GenerateProgramPDFOptions {
  content: string;
  title?: string;
  language: 'el' | 'en';
}

const BRAND_COLOR: [number, number, number] = [124, 58, 237]; // Star Gym purple
const PAGE_MARGIN = 15;

function parseMarkdownTable(lines: string[], startIdx: number): { rows: string[][]; endIdx: number } {
  const rows: string[][] = [];
  let i = startIdx;
  while (i < lines.length && lines[i].trim().startsWith('|')) {
    const line = lines[i].trim();
    // Skip separator lines like |---|---|
    if (/^\|[\s\-:|]+\|$/.test(line)) {
      i++;
      continue;
    }
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length > 0) rows.push(cells);
    i++;
  }
  return { rows, endIdx: i };
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1');
}

export function generateProgramPDF({ content, title, language }: GenerateProgramPDFOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  // ---- Header banner ----
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Star Gym', PAGE_MARGIN, 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    language === 'el' ? 'Εξατομικευμένο Πρόγραμμα - AI Coach' : 'Personalized Plan - AI Coach',
    PAGE_MARGIN,
    22
  );

  const dateStr = new Date().toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US');
  doc.text(dateStr, pageWidth - PAGE_MARGIN, 22, { align: 'right' });

  let cursorY = 38;

  if (title) {
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    const titleLines = doc.splitTextToSize(stripInlineMarkdown(title), contentWidth);
    doc.text(titleLines, PAGE_MARGIN, cursorY);
    cursorY += titleLines.length * 6 + 4;
  }

  const ensureSpace = (needed: number) => {
    if (cursorY + needed > pageHeight - 18) {
      doc.addPage();
      cursorY = PAGE_MARGIN + 5;
    }
  };

  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    // Empty line → spacing
    if (!line) {
      cursorY += 3;
      i++;
      continue;
    }

    // Table
    if (line.startsWith('|')) {
      const { rows, endIdx } = parseMarkdownTable(lines, i);
      if (rows.length > 0) {
        const head = [rows[0].map(stripInlineMarkdown)];
        const body = rows.slice(1).map(r => r.map(stripInlineMarkdown));
        ensureSpace(20);
        autoTable(doc, {
          startY: cursorY,
          head,
          body,
          margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
          headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
          alternateRowStyles: { fillColor: [245, 243, 255] },
        });
        // @ts-expect-error lastAutoTable is added by autotable plugin
        cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 6;
      }
      i = endIdx;
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      const text = stripInlineMarkdown(line.replace(/^###\s+/, ''));
      ensureSpace(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...BRAND_COLOR);
      const wrapped = doc.splitTextToSize(text, contentWidth);
      doc.text(wrapped, PAGE_MARGIN, cursorY);
      cursorY += wrapped.length * 5 + 2;
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      const text = stripInlineMarkdown(line.replace(/^##\s+/, ''));
      ensureSpace(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...BRAND_COLOR);
      const wrapped = doc.splitTextToSize(text, contentWidth);
      doc.text(wrapped, PAGE_MARGIN, cursorY);
      cursorY += wrapped.length * 6 + 3;
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      const text = stripInlineMarkdown(line.replace(/^#\s+/, ''));
      ensureSpace(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(...BRAND_COLOR);
      const wrapped = doc.splitTextToSize(text, contentWidth);
      doc.text(wrapped, PAGE_MARGIN, cursorY);
      cursorY += wrapped.length * 7 + 4;
      i++;
      continue;
    }

    // List items (bullet or numbered)
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (bulletMatch || numberedMatch) {
      const prefix = bulletMatch ? '• ' : `${numberedMatch![1]}. `;
      const text = stripInlineMarkdown(bulletMatch ? bulletMatch[1] : numberedMatch![2]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      const wrapped = doc.splitTextToSize(text, contentWidth - 6);
      ensureSpace(wrapped.length * 5 + 2);
      doc.text(prefix, PAGE_MARGIN, cursorY);
      doc.text(wrapped, PAGE_MARGIN + 5, cursorY);
      cursorY += wrapped.length * 5 + 1;
      i++;
      continue;
    }

    // Regular paragraph
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const wrapped = doc.splitTextToSize(stripInlineMarkdown(line), contentWidth);
    ensureSpace(wrapped.length * 5 + 2);
    doc.text(wrapped, PAGE_MARGIN, cursorY);
    cursorY += wrapped.length * 5 + 2;
    i++;
  }

  // ---- Footer on every page ----
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(220, 220, 220);
    doc.line(PAGE_MARGIN, pageHeight - 12, pageWidth - PAGE_MARGIN, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      language === 'el'
        ? 'Star Gym Μενίδι • Δημιουργήθηκε από AI Coach'
        : 'Star Gym Menidi • Generated by AI Coach',
      PAGE_MARGIN,
      pageHeight - 7
    );
    doc.text(
      `${language === 'el' ? 'Σελίδα' : 'Page'} ${p} / ${totalPages}`,
      pageWidth - PAGE_MARGIN,
      pageHeight - 7,
      { align: 'right' }
    );
  }

  // ---- Save ----
  const safeTitle = (title || 'star-gym-program')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) || 'star-gym-program';
  doc.save(`${safeTitle}-${new Date().toISOString().split('T')[0]}.pdf`);
}
