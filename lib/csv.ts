export interface ParsedAmbassador {
  email: string;
  nameWithInitials: string;
  firstName: string;
  lastName: string;
  whatsapp: string;
  university: string;
  faculty: string;
  yearOfStudy: string;
  ambassadorId: string;
  delegateCount: number;
}

/**
 * Parses raw CSV text into a 2D array of strings handling quotes, commas, and newlines correctly.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // Skip the escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentField.trim());
      // Only push non-empty rows
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Final field and row if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Extracts ambassador records from parsed CSV rows.
 * Supports both smart header detection and direct 9-column index mapping:
 * Col 1 (0): Email Address
 * Col 2 (1): Name with Initials
 * Col 3 (2): First Name
 * Col 4 (3): Last Name
 * Col 5 (4): WhatsApp Number
 * Col 6 (5): Which university or educational institution are you currently enrolled in?
 * Col 7 (6): Which faculty are you currently enrolled in?
 * Col 8 (7): What is your current year of study?
 * Col 9 (8): Ambassador ID
 */
export function extractAmbassadorsFromCSV(rawText: string): {
  ambassadors: ParsedAmbassador[];
  errors: string[];
} {
  const rows = parseCSV(rawText);
  if (rows.length === 0) {
    return { ambassadors: [], errors: ['The CSV file appears to be empty.'] };
  }

  const errors: string[] = [];
  let startIndex = 0;

  // Check if first row is a header
  const firstRow = rows[0].map((h) => h.toLowerCase());
  const isHeaderRow =
    firstRow.some((col) => col.includes('email')) ||
    firstRow.some((col) => col.includes('ambassador')) ||
    firstRow.some((col) => col.includes('initial')) ||
    firstRow.some((col) => col.includes('faculty')) ||
    firstRow.some((col) => col.includes('university'));

  // Header column mapping
  let colEmail = 0;
  let colInitials = 1;
  let colFirst = 2;
  let colLast = 3;
  let colWhatsapp = 4;
  let colUni = 5;
  let colFaculty = 6;
  let colYear = 7;
  let colAmbId = 8;

  if (isHeaderRow) {
    startIndex = 1;
    firstRow.forEach((col, idx) => {
      const c = col.toLowerCase();
      if (c.includes('email')) colEmail = idx;
      else if (c.includes('initial')) colInitials = idx;
      else if (c.includes('first')) colFirst = idx;
      else if (c.includes('last')) colLast = idx;
      else if (c.includes('whatsapp') || c.includes('phone') || c.includes('mobile')) colWhatsapp = idx;
      else if (c.includes('university') || c.includes('institution') || c.includes('enrolled')) colUni = idx;
      else if (c.includes('faculty')) colFaculty = idx;
      else if (c.includes('year') || c.includes('study')) colYear = idx;
      else if (c.includes('ambassador') || c.includes('amb id') || (c.includes('id') && !c.includes('card'))) colAmbId = idx;
    });
  }

  const ambassadors: ParsedAmbassador[] = [];

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every((c) => !c.trim())) continue;

    const email = (row[colEmail] || '').trim();
    const nameWithInitials = (row[colInitials] || '').trim();
    const firstName = (row[colFirst] || '').trim();
    const lastName = (row[colLast] || '').trim();
    const whatsapp = (row[colWhatsapp] || '').trim();
    const university = (row[colUni] || '').trim();
    const faculty = (row[colFaculty] || '').trim();
    const yearOfStudy = (row[colYear] || '').trim();
    const ambassadorId = (row[colAmbId] || '').trim();

    if (!email && !ambassadorId) {
      continue; // Skip blank line
    }

    if (!email) {
      errors.push(`Row ${i + 1}: Missing Email Address`);
      continue;
    }

    if (!ambassadorId) {
      errors.push(`Row ${i + 1} (${email}): Missing Ambassador ID`);
      continue;
    }

    ambassadors.push({
      email,
      nameWithInitials,
      firstName,
      lastName,
      whatsapp,
      university,
      faculty,
      yearOfStudy,
      ambassadorId,
      delegateCount: 0,
    });
  }

  return { ambassadors, errors };
}
