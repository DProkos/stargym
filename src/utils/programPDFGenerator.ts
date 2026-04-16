import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface GenerateProgramPDFOptions {
  content: string;
  title?: string;
  language: 'el' | 'en';
}

// Black & Gold theme
const GOLD: [number, number, number] = [212, 175, 55];      // #D4AF37
const GOLD_SOFT: [number, number, number] = [245, 230, 170]; // light gold for alt rows
const BLACK: [number, number, number] = [10, 10, 10];
const TEXT_LIGHT: [number, number, number] = [230, 230, 230];
const PAGE_MARGIN = 15;

const FONT_NAME = 'NotoSans';
// Noto Sans Regular & Bold (TTF) — supports Greek
const FONT_URL_REGULAR = 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.0.22/files/noto-sans-greek-400-normal.woff';
const FONT_TTF_REGULAR = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/hinted/ttf/NotoSans/NotoSans-Regular.ttf';
const FONT_TTF_BOLD = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/hinted/ttf/NotoSans/NotoSans-Bold.ttf';

let cachedRegular: string | null = null;
let cachedBold: string | null = null;

async function fetchFontBase64(url: string): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to load font: ${url}`);
  const buf = await resp.arrayBuffer();
  // Convert to base64
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

async function ensureFontsLoaded(): Promise<{ regular: string; bold: string }> {
  if (!cachedRegular) cachedRegular = await fetchFontBase64(FONT_TTF_REGULAR);
  if (!cachedBold) cachedBold = await fetchFontBase64(FONT_TTF_BOLD);
  return { regular: cachedRegular, bold: cachedBold };
}

function parseMarkdownTable(lines: string[], startIdx: number): { rows: string[][]; endIdx: number } {
  const rows: string[][] = [];
  let i = startIdx;
  while (i < lines.length && lines[i].trim().startsWith('|')) {
    const line = lines[i].trim();
    if (/^\|[\s\-:|]+\|$/.test(line)) { i++; continue; }
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

export async function generateProgramPDF({ content, title, language }: GenerateProgramPDFOptions): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
  });

  // Load and register Unicode (Greek-capable) font
  try {
    const { regular, bold } = await ensureFontsLoaded();
    doc.addFileToVFS('NotoSans-Regular.ttf', regular);
    doc.addFont('NotoSans-Regular.ttf', FONT_NAME, 'normal');
    doc.addFileToVFS('NotoSans-Bold.ttf', bold);
    doc.addFont('NotoSans-Bold.ttf', FONT_NAME, 'bold');
  } catch (e) {
    console.error('Font load failed, falling back to helvetica', e);
  }

  const setFont = (style: 'normal' | 'bold' = 'normal') => {
    try { doc.setFont(FONT_NAME, style); } catch { doc.setFont('helvetica', style); }
  };

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  // ---- Header banner (black with gold accent) ----
  doc.setFillColor(...BLACK);
  doc.rect(0, 0, pageWidth, 28, 'F');
  // Gold underline accent
  doc.setFillColor(...GOLD);
  doc.rect(0, 28, pageWidth, 1.2, 'F');

  doc.setTextColor(...GOLD);
  setFont('bold');
  doc.setFontSize(20);
  doc.text('Star Gym', PAGE_MARGIN, 15);
  setFont('normal');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_LIGHT);
  doc.text(
    language === 'el' ? 'Εξατομικευμένο Πρόγραμμα — AI Coach' : 'Personalized Plan — AI Coach',
    PAGE_MARGIN,
    22
  );

  const dateStr = new Date().toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US');
  doc.text(dateStr, pageWidth - PAGE_MARGIN, 22, { align: 'right' });

  let cursorY = 40;

  if (title) {
    doc.setTextColor(...BLACK);
    setFont('bold');
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

    if (!line) { cursorY += 3; i++; continue; }

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
          headStyles: { fillColor: BLACK, textColor: GOLD, fontStyle: 'bold', font: FONT_NAME },
          styles: { font: FONT_NAME, fontSize: 9, cellPadding: 2.5, overflow: 'linebreak', textColor: BLACK },
          alternateRowStyles: { fillColor: [250, 245, 220] },
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
      setFont('bold');
      doc.setFontSize(11);
      doc.setTextColor(...BLACK);
      const wrapped = doc.splitTextToSize(text, contentWidth);
      doc.text(wrapped, PAGE_MARGIN, cursorY);
      cursorY += wrapped.length * 5 + 2;
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      const text = stripInlineMarkdown(line.replace(/^##\s+/, ''));
      ensureSpace(14);
      // Black box with gold text
      const wrapped = doc.splitTextToSize(text, contentWidth - 4);
      const boxH = wrapped.length * 6 + 3;
      doc.setFillColor(...BLACK);
      doc.rect(PAGE_MARGIN, cursorY - 4, contentWidth, boxH, 'F');
      setFont('bold');
      doc.setFontSize(13);
      doc.setTextColor(...GOLD);
      doc.text(wrapped, PAGE_MARGIN + 2, cursorY + 1);
      cursorY += boxH + 3;
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      const text = stripInlineMarkdown(line.replace(/^#\s+/, ''));
      ensureSpace(16);
      setFont('bold');
      doc.setFontSize(15);
      doc.setTextColor(...BLACK);
      const wrapped = doc.splitTextToSize(text, contentWidth);
      doc.text(wrapped, PAGE_MARGIN, cursorY);
      // Gold underline
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.6);
      doc.line(PAGE_MARGIN, cursorY + 2, PAGE_MARGIN + 40, cursorY + 2);
      cursorY += wrapped.length * 7 + 5;
      i++;
      continue;
    }

    // List items
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (bulletMatch || numberedMatch) {
      const prefix = bulletMatch ? '•' : `${numberedMatch![1]}.`;
      const text = stripInlineMarkdown(bulletMatch ? bulletMatch[1] : numberedMatch![2]);
      setFont('normal');
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      const wrapped = doc.splitTextToSize(text, contentWidth - 8);
      ensureSpace(wrapped.length * 5 + 2);
      doc.setTextColor(...GOLD);
      setFont('bold');
      doc.text(prefix, PAGE_MARGIN, cursorY);
      setFont('normal');
      doc.setTextColor(40, 40, 40);
      doc.text(wrapped, PAGE_MARGIN + 6, cursorY);
      cursorY += wrapped.length * 5 + 1;
      i++;
      continue;
    }

    // Paragraph
    setFont('normal');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const wrapped = doc.splitTextToSize(stripInlineMarkdown(line), contentWidth);
    ensureSpace(wrapped.length * 5 + 2);
    doc.text(wrapped, PAGE_MARGIN, cursorY);
    cursorY += wrapped.length * 5 + 2;
    i++;
  }

  // ---- Footer ----
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.3);
    doc.line(PAGE_MARGIN, pageHeight - 12, pageWidth - PAGE_MARGIN, pageHeight - 12);
    setFont('normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
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

  const safeTitle = (title || 'star-gym-program')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) || 'star-gym-program';
  doc.save(`${safeTitle}-${new Date().toISOString().split('T')[0]}.pdf`);
}
