/**
 * export.ts
 * Client-side utilities for exporting InnovaX registration data to Excel (.xlsx) and PDF.
 * Uses xlsx (SheetJS) for Excel and jspdf + jspdf-autotable for PDF.
 */

// ---------------------------------------------------------------------------
// Shared: flatten a registration record into a flat row object
// ---------------------------------------------------------------------------

export interface FlatRegistration {
  '#': number;
  'Type': string;
  'Team / Name': string;
  'University': string;
  'Email': string;
  'Leader First Name': string;
  'Leader Last Name': string;
  'Leader ID / NIC': string;
  'Leader WhatsApp': string;
  'Teammate 1 – Name': string;
  'Teammate 1 – ID': string;
  'Teammate 2 – Name': string;
  'Teammate 2 – ID': string;
  'Ambassador Code': string;
  'Proposal Uploaded': string;
  'Selected for Round 2': string;
  'Is Finalist': string;
  'Prototype Link': string;
  'Registered At': string;
}

export function flattenRegistration(user: any, index: number): FlatRegistration {
  const teammate = (idx: number) => user.teammates?.[idx];
  const fmtDate = (iso: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('en-LK', {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  return {
    '#': index + 1,
    'Type': user.type === 'team' ? 'Team' : 'Individual',
    'Team / Name': user.type === 'team' ? (user.teamName || '') : `${user.leader?.firstName || ''} ${user.leader?.lastName || ''}`.trim(),
    'University': user.university || '',
    'Email': user.email || '',
    'Leader First Name': user.leader?.firstName || '',
    'Leader Last Name': user.leader?.lastName || '',
    'Leader ID / NIC': user.leader?.idCard || '',
    'Leader WhatsApp': user.leader?.phone || '',
    'Teammate 1 – Name': teammate(0) ? `${teammate(0).firstName} ${teammate(0).lastName}` : '',
    'Teammate 1 – ID': teammate(0)?.idCard || '',
    'Teammate 2 – Name': teammate(1) ? `${teammate(1).firstName} ${teammate(1).lastName}` : '',
    'Teammate 2 – ID': teammate(1)?.idCard || '',
    'Ambassador Code': user.ambassadorCode || '',
    'Proposal Uploaded': user.proposalUploaded ? 'Yes' : 'No',
    'Selected for Round 2': user.selectedForRound2 ? 'Yes' : 'No',
    'Is Finalist': user.isFinalist ? 'Yes' : 'No',
    'Prototype Link': user.prototypeLink || '',
    'Registered At': fmtDate(user.createdAt),
  };
}

// ---------------------------------------------------------------------------
// Excel export (SheetJS / xlsx)
// ---------------------------------------------------------------------------

export async function exportToExcel(users: any[], filename = 'InnovaX_Registrations'): Promise<void> {
  const { utils, writeFile } = await import('xlsx');

  const rows: FlatRegistration[] = users.map((u, i) => flattenRegistration(u, i));

  const ws = utils.json_to_sheet(rows);

  // Column widths for readability
  ws['!cols'] = [
    { wch: 4 },   // #
    { wch: 10 },  // Type
    { wch: 28 },  // Team / Name
    { wch: 38 },  // University
    { wch: 30 },  // Email
    { wch: 16 },  // Leader First Name
    { wch: 16 },  // Leader Last Name
    { wch: 16 },  // Leader ID
    { wch: 16 },  // Leader WhatsApp
    { wch: 24 },  // Teammate 1 Name
    { wch: 14 },  // Teammate 1 ID
    { wch: 24 },  // Teammate 2 Name
    { wch: 14 },  // Teammate 2 ID
    { wch: 18 },  // Ambassador Code
    { wch: 12 },  // Proposal
    { wch: 16 },  // R2
    { wch: 12 },  // Finalist
    { wch: 40 },  // Prototype Link
    { wch: 22 },  // Registered At
  ];

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Registrations');

  const stamp = new Date().toISOString().slice(0, 10);
  writeFile(wb, `${filename}_${stamp}.xlsx`);
}

// ---------------------------------------------------------------------------
// PDF export (jsPDF + AutoTable)
// ---------------------------------------------------------------------------

export async function exportToPDF(users: any[], title = 'InnovaX Registrations'): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });

  // Header
  doc.setFontSize(18);
  doc.setTextColor(0, 229, 255);
  doc.text('InnovaX', 14, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text(title, 14, 26);

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated: ${new Date().toLocaleString('en-LK')}   |   Total records: ${users.length}`, 14, 32);

  const head = [
    ['#', 'Type', 'Team / Name', 'University', 'Email',
     'Leader', 'ID / NIC', 'WhatsApp',
     'Teammate 1', 'T1 ID', 'Teammate 2', 'T2 ID',
     'Amb. Code', 'Proposal', 'R2', 'Finalist',
     'Prototype Link', 'Registered At'],
  ];

  const body = users.map((u, i) => {
    const f = flattenRegistration(u, i);
    return [
      f['#'],
      f['Type'],
      f['Team / Name'],
      f['University'],
      f['Email'],
      `${f['Leader First Name']} ${f['Leader Last Name']}`.trim(),
      f['Leader ID / NIC'],
      f['Leader WhatsApp'],
      f['Teammate 1 – Name'],
      f['Teammate 1 – ID'],
      f['Teammate 2 – Name'],
      f['Teammate 2 – ID'],
      f['Ambassador Code'],
      f['Proposal Uploaded'],
      f['Selected for Round 2'],
      f['Is Finalist'],
      f['Prototype Link'],
      f['Registered At'],
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: 36,
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: 'linebreak',
      textColor: [230, 230, 230],
      fillColor: [12, 18, 28],
      lineColor: [40, 50, 65],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [5, 15, 30],
      textColor: [0, 229, 255],
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [18, 24, 34],
    },
    columnStyles: {
      0:  { cellWidth: 8 },
      1:  { cellWidth: 16 },
      2:  { cellWidth: 36 },
      3:  { cellWidth: 46 },
      4:  { cellWidth: 44 },
      5:  { cellWidth: 30 },
      6:  { cellWidth: 22 },
      7:  { cellWidth: 22 },
      8:  { cellWidth: 30 },
      9:  { cellWidth: 20 },
      10: { cellWidth: 30 },
      11: { cellWidth: 20 },
      12: { cellWidth: 22 },
      13: { cellWidth: 16 },
      14: { cellWidth: 12 },
      15: { cellWidth: 14 },
      16: { cellWidth: 52 },
      17: { cellWidth: 28 },
    },
    didDrawPage: (data: any) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        doc.internal.pageSize.getWidth() - 28,
        doc.internal.pageSize.getHeight() - 5
      );
    },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`${title.replace(/\s+/g, '_')}_${stamp}.pdf`);
}
