import { ZipReader, Uint8ArrayReader, TextWriter, ZipWriter, Uint8ArrayWriter, TextReader } from '@zip.js/zip.js';
import type { EnrolmentRecord, ReportMetadata, ReportSummary } from '../types.ts';
import { SAMPLE_HTML_REPORT, SAMPLE_CSV_REPORT } from '../sampleData.ts';

export interface ExtractionResult {
  content: string;
  extractedFileName: string;
  format: 'HTML' | 'CSV';
}

/**
 * Extracts a password-protected zip file completely in RAM in browser.
 * ZERO disk writes. Memory buffer only.
 */
export async function extractZipInMemory(
  fileOrBuffer: File | Uint8Array | ArrayBuffer,
  password?: string
): Promise<ExtractionResult> {
  const cleanPassword = password ? password.trim() : '';

  let uint8: Uint8Array;
  if (fileOrBuffer instanceof Uint8Array) {
    uint8 = fileOrBuffer;
  } else if (fileOrBuffer instanceof ArrayBuffer) {
    uint8 = new Uint8Array(fileOrBuffer);
  } else if (typeof (fileOrBuffer as File).arrayBuffer === 'function') {
    const ab = await (fileOrBuffer as File).arrayBuffer();
    uint8 = new Uint8Array(ab);
  } else {
    throw new Error('Unsupported file payload for extraction.');
  }

  try {
    const reader = new ZipReader(new Uint8ArrayReader(uint8));
    const entries = await reader.getEntries();

    if (!entries || entries.length === 0) {
      await reader.close();
      throw new Error('ZIP archive is empty. No files found.');
    }

    // Find the primary report file (CSV or HTML)
    const reportEntry =
      entries.find(
        (e) =>
          !e.directory &&
          (e.filename.toLowerCase().endsWith('.csv') ||
            e.filename.toLowerCase().endsWith('.html') ||
            e.filename.toLowerCase().endsWith('.htm'))
      ) || entries.find((e) => !e.directory);

    if (!reportEntry) {
      await reader.close();
      throw new Error('No valid UIDAI report file (.csv or .html) found inside the ZIP archive.');
    }

    let textContent: string;
    try {
      textContent = await (reportEntry as any).getData(new TextWriter(), {
        password: cleanPassword || undefined,
      });
    } catch (readErr: any) {
      await reader.close();
      const errStr = (readErr?.message || '').toLowerCase();
      if (
        errStr.includes('password') ||
        errStr.includes('encrypted') ||
        errStr.includes('crc') ||
        errStr.includes('authentication') ||
        errStr.includes('bad')
      ) {
        throw new Error('Password decryption failed: Incorrect or missing password for this ZIP archive.');
      }
      throw readErr;
    }

    await reader.close();

    const lowerName = reportEntry.filename.toLowerCase();
    const format: 'HTML' | 'CSV' =
      lowerName.endsWith('.html') || lowerName.endsWith('.htm') || textContent.trim().startsWith('<')
        ? 'HTML'
        : 'CSV';

    return {
      content: textContent,
      extractedFileName: reportEntry.filename,
      format,
    };
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('password') || msg.includes('incorrect') || msg.includes('authentication')) {
      throw new Error('Password decryption failed: Incorrect or missing password for this ZIP archive.');
    }
    throw new Error(`Failed to extract ZIP archive: ${err.message || 'Unknown archive error'}`);
  }
}

/**
 * Creates an in-memory password-protected ZIP archive for sample testing.
 */
export async function createSampleZipInMemory(
  filename: string,
  content: string,
  password: string
): Promise<Uint8Array> {
  const zipWriter = new ZipWriter(new Uint8ArrayWriter());
  await zipWriter.add(filename, new TextReader(content), {
    password: password || undefined,
  });
  return zipWriter.close();
}

/**
 * Generates a downloadable Blob for sample files.
 */
export async function generateSampleZipBlob(
  format: 'html' | 'csv',
  password = 'Uidai@2026'
): Promise<Blob> {
  const isHtml = format === 'html';
  const filename = isHtml ? 'UIDAI_EOD_StatusReport_Sample.html' : 'UIDAI_EOD_StatusReport_Sample.csv';
  const content = isHtml ? SAMPLE_HTML_REPORT : SAMPLE_CSV_REPORT;
  const uint8 = await createSampleZipInMemory(filename, content, password);
  return new Blob([uint8 as any], { type: 'application/zip' });
}

/**
 * Parses RFC-compliant CSV with quotes and escapes.
 */
function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Parses UIDAI CSV Status Report.
 */
export function parseCsvReport(csvString: string): EnrolmentRecord[] {
  const lines = csvString
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV file has insufficient rows (header + data rows required).');
  }

  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map((h) => h.toUpperCase().replace(/\s+/g, '_'));

  const slnoIdx = headers.findIndex((h) => h === 'SLNO' || h === 'SNO' || h === 'S.NO');
  const enrolmentIdx = headers.findIndex((h) => h.includes('ENROLMENT_NO') || h.includes('ENROLMENT'));
  const typeIdx = headers.findIndex((h) => h === 'TYPE');
  const statusIdx = headers.findIndex((h) => h === 'STATUS');
  const totalAmtIdx = headers.findIndex(
    (h) => h === 'TOTAL_AMOUNT_CHARGED' || h.includes('TOTAL_AMOUNT')
  );

  if (enrolmentIdx === -1 || totalAmtIdx === -1) {
    throw new Error(
      'CSV Schema Validation Failed: Missing required columns "ENROLMENT_NO_DATE" or "TOTAL_AMOUNT_CHARGED" in CSV header.'
    );
  }

  const appointmentIdx = headers.findIndex((h) => h.includes('APPOINTMENT'));
  const mandatoryBioIdx = headers.findIndex((h) => h.includes('MANDATORY_BIO'));
  const isNriIdx = headers.findIndex((h) => h === 'IS_NRI');
  const tinIdx = headers.findIndex((h) => h.includes('TIN'));
  const operatorIdx = headers.findIndex((h) => h.includes('OPERATOR'));
  const introducerIdx = headers.findIndex((h) => h === 'INTRODUCER');
  const proofIdx = headers.findIndex((h) => h === 'PROOF');
  const residentIdx = headers.findIndex((h) => h.includes('RESIDENT'));
  const gstIdx = headers.findIndex((h) => h.includes('GST'));
  const amtNewIdx = headers.findIndex((h) => h.includes('NEW_ENROLMENT'));
  const amtUpdateIdx = headers.findIndex((h) => h.includes('UPDATE_ENROLMENT'));
  const rejectReasonIdx = headers.findIndex((h) => h.includes('REJECT_REASON'));
  const processingStateIdx = headers.findIndex((h) => h.includes('PROCESSING_STATE'));

  const records: EnrolmentRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length < 3) continue;

    const sNo = slnoIdx !== -1 && cells[slnoIdx] ? parseInt(cells[slnoIdx], 10) || i : i;
    const enrolmentNoDate = cells[enrolmentIdx] || '';
    if (!enrolmentNoDate) continue;

    const rawTotalCharged = cells[totalAmtIdx] || '0';
    const totalAmountCharged = parseFloat(rawTotalCharged.replace(/[^0-9.-]+/g, '')) || 0;

    const record: EnrolmentRecord = {
      sNo,
      enrolmentNoDate,
      appointmentId: appointmentIdx !== -1 ? cells[appointmentIdx] || '' : '',
      type: typeIdx !== -1 ? cells[typeIdx] || 'U' : 'U',
      mandatoryBiometric: mandatoryBioIdx !== -1 ? cells[mandatoryBioIdx] || 'No' : 'No',
      isNri: isNriIdx !== -1 ? cells[isNriIdx] || 'No' : 'No',
      tinNumber: tinIdx !== -1 ? cells[tinIdx] || '' : '',
      operatorId: operatorIdx !== -1 ? cells[operatorIdx] || '' : '',
      reviewerId: '',
      introducer: introducerIdx !== -1 ? cells[introducerIdx] || '' : '',
      proof: proofIdx !== -1 ? cells[proofIdx] || '' : '',
      resident: residentIdx !== -1 ? cells[residentIdx] || '' : '',
      status: statusIdx !== -1 ? cells[statusIdx] || 'Completed' : 'Completed',
      gstApplied: gstIdx !== -1 ? parseFloat(cells[gstIdx]) || 18.0 : 18.0,
      amountNewEnrolment: amtNewIdx !== -1 ? parseFloat(cells[amtNewIdx]) || 0 : 0,
      amountUpdateEnrolment: amtUpdateIdx !== -1 ? parseFloat(cells[amtUpdateIdx]) || 0 : 0,
      totalAmountCharged,
      rejectReason: rejectReasonIdx !== -1 ? cells[rejectReasonIdx] || '' : '',
      processingState: processingStateIdx !== -1 ? cells[processingStateIdx] || '' : '',
    };

    records.push(record);
  }

  return records;
}

/**
 * Parses UIDAI HTML Status Report in browser via DOMParser.
 */
export function parseHtmlReport(htmlString: string): { records: EnrolmentRecord[]; metadata: ReportMetadata } {
  let doc: Document;
  if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
    const parser = new window.DOMParser();
    doc = parser.parseFromString(htmlString, 'text/html');
  } else {
    throw new Error('DOMParser is unavailable.');
  }

  const metadata: ReportMetadata = {};

  // Extract header metadata from .first_view and .second_view
  const firstViewRows = doc.querySelectorAll('.first_view table tr');
  firstViewRows.forEach((row) => {
    const label = row.querySelector('label')?.textContent?.trim() || '';
    const val = row.querySelector('span')?.textContent?.trim() || '';
    if (label.includes('Date')) metadata.reportDate = val;
    if (label.includes('Registrar')) metadata.registrar = val;
    if (label.includes('Enrolment Agency')) metadata.enrolmentAgency = val;
    if (label.includes('Operator')) metadata.operator = val;
    if (label.includes('Station ID')) metadata.stationId = val;
  });

  const secondViewRows = doc.querySelectorAll('.second_view table tr');
  secondViewRows.forEach((row) => {
    const label = row.querySelector('label')?.textContent?.trim() || '';
    const val = row.querySelector('span')?.textContent?.trim() || '';
    if (label.includes('Version no.')) metadata.clientVersion = val;
  });

  const pickDateH3 = doc.querySelector('.pick_date h3');
  if (pickDateH3) {
    const txt = pickDateH3.textContent?.trim() || '';
    if (txt.includes('Date:')) {
      metadata.dateRange = txt.split('Date:')[1].trim();
    }
  }

  // Extract main table rows from .details_view table or largest table
  let detailsTable = doc.querySelector('.details_view table');
  if (!detailsTable) {
    const tables = doc.querySelectorAll('table');
    let maxRows = 0;
    tables.forEach((t) => {
      const rowsCount = t.querySelectorAll('tbody tr, tr').length;
      if (rowsCount > maxRows) {
        maxRows = rowsCount;
        detailsTable = t;
      }
    });
  }

  if (!detailsTable) {
    throw new Error('Unable to find enrolment data table in HTML document.');
  }

  const thElements = Array.from(detailsTable.querySelectorAll('thead th, tr:first-child th'));
  const headers = thElements.map((th) => th.textContent?.trim().toLowerCase() || '');

  // Check required UIDAI columns
  const sNoIdx = headers.findIndex((h) => h.includes('s.no') || h.includes('slno') || h.includes('s no'));
  const enrolmentIdx = headers.findIndex((h) => h.includes('enrolment no') || h.includes('enrolment'));
  const typeIdx = headers.findIndex((h) => h === 'type' || h.includes('type'));
  const statusIdx = headers.findIndex((h) => h === 'status' || h.includes('status'));
  const totalAmountIdx = headers.findIndex((h) => h.includes('total amount') || h.includes('total_amount'));

  if (enrolmentIdx === -1 || totalAmountIdx === -1) {
    throw new Error(
      'HTML Schema Validation Failed: Required UIDAI columns "Enrolment No." and "Total amount charged" were not found in the HTML table.'
    );
  }

  const appointmentIdx = headers.findIndex((h) => h.includes('appointment'));
  const mandatoryBioIdx = headers.findIndex((h) => h.includes('mandatory bio'));
  const isNriIdx = headers.findIndex((h) => h.includes('nri'));
  const tinIdx = headers.findIndex((h) => h.includes('tin'));
  const operatorIdx = headers.findIndex((h) => h.includes('operator'));
  const reviewerIdx = headers.findIndex((h) => h.includes('reviewer'));
  const introducerIdx = headers.findIndex((h) => h.includes('introducer') && !h.includes('status'));
  const proofIdx = headers.findIndex((h) => h.includes('proof'));
  const residentIdx = headers.findIndex((h) => h.includes('resident'));
  const gstIdx = headers.findIndex((h) => h.includes('gst'));
  const amtNewIdx = headers.findIndex((h) => h.includes('new enrol'));
  const amtUpdateIdx = headers.findIndex((h) => h.includes('update enrol'));

  const rows = Array.from(detailsTable.querySelectorAll('tbody tr, tr')).slice(thElements.length > 0 ? 0 : 1);
  const records: EnrolmentRecord[] = [];

  rows.forEach((tr, index) => {
    const cells = Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim() || '');
    if (cells.length < 5) return; // skip header/summary rows

    const sNo = sNoIdx !== -1 && cells[sNoIdx] ? parseInt(cells[sNoIdx], 10) || index + 1 : index + 1;
    const enrolmentNoDate = cells[enrolmentIdx] || '';
    if (!enrolmentNoDate) return;

    const rawTotalCharged = cells[totalAmountIdx] || '0';
    const totalAmountCharged = parseFloat(rawTotalCharged.replace(/[^0-9.-]+/g, '')) || 0;

    const record: EnrolmentRecord = {
      sNo,
      enrolmentNoDate,
      appointmentId: appointmentIdx !== -1 ? cells[appointmentIdx] || '' : '',
      type: typeIdx !== -1 ? cells[typeIdx] || 'U' : 'U',
      mandatoryBiometric: mandatoryBioIdx !== -1 ? cells[mandatoryBioIdx] || 'No' : 'No',
      isNri: isNriIdx !== -1 ? cells[isNriIdx] || 'No' : 'No',
      tinNumber: tinIdx !== -1 ? cells[tinIdx] || '' : '',
      operatorId: operatorIdx !== -1 ? cells[operatorIdx] || metadata.operator || '' : metadata.operator || '',
      reviewerId: reviewerIdx !== -1 ? cells[reviewerIdx] || '' : '',
      introducer: introducerIdx !== -1 ? cells[introducerIdx] || '' : '',
      proof: proofIdx !== -1 ? cells[proofIdx] || '' : '',
      resident: residentIdx !== -1 ? cells[residentIdx] || '' : '',
      status: statusIdx !== -1 ? cells[statusIdx] || 'Completed' : 'Completed',
      gstApplied: gstIdx !== -1 ? parseFloat(cells[gstIdx]) || 18.0 : 18.0,
      amountNewEnrolment: amtNewIdx !== -1 ? parseFloat(cells[amtNewIdx]) || 0 : 0,
      amountUpdateEnrolment: amtUpdateIdx !== -1 ? parseFloat(cells[amtUpdateIdx]) || 0 : 0,
      totalAmountCharged,
    };

    records.push(record);
  });

  return { records, metadata };
}

/**
 * Validates and aggregates UIDAI report records into a summary.
 */
export function parseUIDAIReport(
  rawContent: string,
  fileName: string,
  detectedFormat: 'HTML' | 'CSV'
): { summary: ReportSummary; records: EnrolmentRecord[] } {
  let records: EnrolmentRecord[] = [];
  let metadata: ReportMetadata = {};

  if (detectedFormat === 'HTML') {
    const htmlResult = parseHtmlReport(rawContent);
    records = htmlResult.records;
    metadata = htmlResult.metadata;
  } else {
    records = parseCsvReport(rawContent);
  }

  if (!records || records.length === 0) {
    throw new Error(
      'Validation Error: No valid UIDAI enrolment records found in the extracted file. Please check that the file conforms to standard UIDAI EOD status report format.'
    );
  }

  let totalAmountCharged = 0;
  let totalGstAmount = 0;
  let totalNewEnrolmentAmount = 0;
  let totalUpdateEnrolmentAmount = 0;
  let countNewEnrolment = 0;
  let countUpdate = 0;
  let countCompleted = 0;
  let countInProcess = 0;
  let countRejected = 0;

  for (const r of records) {
    const charged = Number.isFinite(r.totalAmountCharged) ? r.totalAmountCharged : 0;
    totalAmountCharged += charged;

    const gst = Number.isFinite(r.gstApplied) ? r.gstApplied : 0;
    totalGstAmount += gst;

    const newAmt = Number.isFinite(r.amountNewEnrolment) ? r.amountNewEnrolment : 0;
    totalNewEnrolmentAmount += newAmt;

    const updateAmt = Number.isFinite(r.amountUpdateEnrolment) ? r.amountUpdateEnrolment : 0;
    totalUpdateEnrolmentAmount += updateAmt;

    const typeUpper = (r.type || '').toUpperCase().trim();
    if (typeUpper === 'N' || typeUpper === 'E' || typeUpper.includes('ENROL')) {
      countNewEnrolment++;
    } else {
      countUpdate++;
    }

    const statusUpper = (r.status || '').toUpperCase().trim();
    if (statusUpper.includes('COMPLET')) {
      countCompleted++;
    } else if (statusUpper.includes('PROCESS')) {
      countInProcess++;
    } else if (statusUpper.includes('REJECT')) {
      countRejected++;
    }
  }

  totalAmountCharged = Math.round(totalAmountCharged * 100) / 100;
  totalGstAmount = Math.round(totalGstAmount * 100) / 100;
  totalNewEnrolmentAmount = Math.round(totalNewEnrolmentAmount * 100) / 100;
  totalUpdateEnrolmentAmount = Math.round(totalUpdateEnrolmentAmount * 100) / 100;

  const summary: ReportSummary = {
    totalRecords: records.length,
    totalAmountCharged,
    totalGstAmount,
    totalNewEnrolmentAmount,
    totalUpdateEnrolmentAmount,
    countNewEnrolment,
    countUpdate,
    countCompleted,
    countInProcess,
    countRejected,
    fileName,
    format: detectedFormat,
    metadata,
    extractionTimestamp: new Date().toISOString(),
  };

  return { summary, records };
}
