/**
 * CineLedger - Drive Sync Backend
 * ---------------------------------------------------------------
 * Deploy this as a Google Apps Script Web App:
 *   1. Open https://script.google.com and create a new project.
 *   2. Paste this entire file into Code.gs.
 *   3. (Optional) Change PARENT_FOLDER_ID below.
 *   4. Click "Deploy" -> "New deployment".
 *      - Type: Web app
 *      - Execute as: Me
 *      - Who has access: Anyone (or Anyone with the link)
 *   5. Copy the Web app URL.
 *   6. In CineLedger, open Settings (gear icon in header) and paste
 *      the Web app URL into "Apps Script URL".
 *
 * The script will auto-create a "CineLedger Config" sheet inside the
 * parent folder. It tracks every project's folder + sheet URLs and
 * acts as the single source of truth.
 *
 * Security note: anyone with the Web app URL can call it. For
 * personal use this is fine. For multi-tenant deployment, add a
 * shared secret check at the top of doPost().
 */

const PARENT_FOLDER_ID = '1Q-eSFalmrtrzZVh0Ukgrl08S9RT8bF2G';
const CONFIG_SHEET_NAME = 'CineLedger Config';
const CONFIG_HEADERS = [
  'Project Name', 'Prefix', 'Folder ID', 'Folder URL',
  'Sheet ID', 'Sheet URL', 'Last Synced', 'Bill Count', 'Notes'
];
const BILL_HEADERS = [
  'UniqueID', 'Bill No', 'Date', 'Department', 'Sub-category',
  'Paid By', 'Paid To', 'Amount', 'Payment Mode',
  'Transaction Ref', 'Status', 'Approved By', 'Description', 'Attachments'
];

// =============================================================
// HTTP entrypoints
// =============================================================
function doGet(e) {
  return jsonOut({
    service: 'CineLedger Drive Sync',
    version: '1.0',
    actions: ['ping', 'syncProject', 'getConfig', 'updateConfig', 'deleteProject'],
    info: 'POST JSON: { action: "...", ...payload }'
  });
}

function doPost(e) {
  try {
    const body = e.postData && e.postData.contents
      ? JSON.parse(e.postData.contents)
      : {};
    const action = body.action;
    let result;
    switch (action) {
      case 'ping':          result = ping(); break;
      case 'syncProject':   result = syncProject(body.projectName, body.prefix, body.bills || []); break;
      case 'getConfig':     result = getConfig(); break;
      case 'updateConfig':  result = updateConfig(body.row); break;
      case 'deleteProject': result = deleteProjectRow(body.projectName); break;
      default:              result = { error: 'Unknown action: ' + action };
    }
    return jsonOut(result);
  } catch (err) {
    return jsonOut({ error: String(err && err.message || err) });
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// =============================================================
// Actions
// =============================================================
function ping() {
  const config = getOrCreateConfigSheet();
  return {
    ok: true,
    parentFolderId: PARENT_FOLDER_ID,
    configSheetId: config.getParent().getId(),
    configSheetUrl: config.getParent().getUrl()
  };
}

/**
 * Idempotent: creates folder + sheet if they don't exist for the project,
 * then writes the bills to the sheet (overwriting existing rows), and
 * updates the Config sheet entry.
 */
function syncProject(projectName, prefix, bills) {
  if (!projectName) return { error: 'projectName required' };
  const parent = DriveApp.getFolderById(PARENT_FOLDER_ID);
  const config = getOrCreateConfigSheet();
  const data   = config.getDataRange().getValues();
  let rowIdx   = findRowByName(data, projectName); // 0-indexed; 0 is header
  let folderId, folderUrl, sheetId, sheetUrl, ss;

  if (rowIdx > 0) {
    folderId  = data[rowIdx][2];
    folderUrl = data[rowIdx][3];
    sheetId   = data[rowIdx][4];
    sheetUrl  = data[rowIdx][5];
    try { ss = SpreadsheetApp.openById(sheetId); }
    catch (e) { return { error: 'Could not open sheet (was it deleted?): ' + e.message }; }
  } else {
    // Create folder
    const folder = parent.createFolder(projectName);
    folderId  = folder.getId();
    folderUrl = folder.getUrl();

    // Create spreadsheet inside the folder
    ss = SpreadsheetApp.create('Bills Ledger - ' + projectName);
    sheetId  = ss.getId();
    sheetUrl = ss.getUrl();
    const sheetFile = DriveApp.getFileById(sheetId);
    folder.addFile(sheetFile);
    DriveApp.getRootFolder().removeFile(sheetFile);

    // Append to config
    config.appendRow([
      projectName, (prefix || '').toString().toUpperCase(),
      folderId, folderUrl, sheetId, sheetUrl,
      new Date().toISOString(), 0, ''
    ]);
    rowIdx = config.getLastRow() - 1;
  }

  // ALWAYS (re)write headers + formatting so existing sheets pick up new columns
  let bs = ss.getSheetByName('Bills');
  if (!bs) {
    bs = ss.getActiveSheet();
    bs.setName('Bills');
  }
  bs.getRange(1, 1, 1, BILL_HEADERS.length).setValues([BILL_HEADERS]);
  bs.getRange(1, 1, 1, BILL_HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#E11D74')
    .setFontColor('#ffffff');
  bs.setFrozenRows(1);

  // Clear existing data rows below header
  const lastRow = bs.getLastRow();
  const lastCol = bs.getLastColumn();
  if (lastRow > 1) {
    bs.getRange(2, 1, lastRow - 1, Math.max(lastCol, BILL_HEADERS.length)).clearContent();
  }

  // =================================================================
  // ATTACHMENT UPLOAD — runs BEFORE writing bills so we can include
  // each bill's attachment URLs in its row.
  //
  // For each bill with attachments (base64), upload to Drive under
  // {project folder}/Attachments/. Files named {UniqueID}_{originalName}.
  // =================================================================
  const folder   = DriveApp.getFolderById(folderId);
  let attachFolder = null;
  const newUploads  = {};  // billId -> [{ index, name, url, id }]
  const uploadErrors = []; // collect per-attachment errors (don't abort the whole sync)

  for (let bi = 0; bi < bills.length; bi++) {
    const bill = bills[bi];
    if (!bill.attachments || bill.attachments.length === 0) continue;
    for (let ai = 0; ai < bill.attachments.length; ai++) {
      const att = bill.attachments[ai];
      // Skip if already uploaded (has driveId/driveUrl from a prior sync)
      if (att.driveId || att.driveUrl) continue;
      // Need a base64 data URL to upload
      if (!att.preview) {
        uploadErrors.push({ billId: bill.id, name: att.name, reason: 'no preview data' });
        continue;
      }
      const m = String(att.preview).match(/^data:([^;]+);base64,(.+)$/);
      if (!m) {
        uploadErrors.push({ billId: bill.id, name: att.name, reason: 'malformed data URL' });
        continue;
      }

      try {
        if (!attachFolder) {
          const fIt = folder.getFoldersByName('Attachments');
          attachFolder = fIt.hasNext() ? fIt.next() : folder.createFolder('Attachments');
        }

        const mimeType = m[1];
        const base64   = m[2];
        const safeName = (att.name || 'file').replace(/[\/\\:*?"<>|]/g, '_');
        const fileName = (bill.id || 'NOID') + '_' + safeName;

        // Reuse if a file with this exact name already exists
        const existing = attachFolder.getFilesByName(fileName);
        let file;
        if (existing.hasNext()) {
          file = existing.next();
        } else {
          const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName);
          file = attachFolder.createFile(blob);
          try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
        }

        if (!newUploads[bill.id]) newUploads[bill.id] = [];
        newUploads[bill.id].push({
          index: ai,
          name: att.name,
          url: file.getUrl(),
          id: file.getId()
        });
      } catch (e) {
        uploadErrors.push({ billId: bill.id, name: att.name, reason: e.message || String(e) });
      }
    }
  }

  // Helper: collect all attachment URLs for a given bill (newly uploaded + pre-existing)
  function getBillAttachmentUrls(bill) {
    if (!bill.attachments || bill.attachments.length === 0) return [];
    const urls = [];
    const ups = newUploads[bill.id] || [];
    const upByIdx = {};
    ups.forEach(u => { upByIdx[u.index] = u; });
    bill.attachments.forEach((att, i) => {
      const url = upByIdx[i] ? upByIdx[i].url : att.driveUrl;
      if (url) urls.push(url);
    });
    return urls;
  }

  // Write bills (now with Attachments column populated)
  if (bills.length > 0) {
    const rows = bills.map(b => [
      b.id || '',
      b.billNumber || '',
      b.date || '',
      b.department || '',
      b.category || '',
      b.paidBy || '',
      b.paidTo || '',
      Number(b.amount) || 0,
      b.paymentMode || '',
      b.txnId || b.utr || b.chequeNo || b.upiId || (b.cardLast4 ? '**** ' + b.cardLast4 : ''),
      b.status || '',
      b.approvedBy || '',
      b.description || '',
      getBillAttachmentUrls(b).join('\n')   // newline-separated URLs in last column
    ]);
    bs.getRange(2, 1, rows.length, BILL_HEADERS.length).setValues(rows);
    // Wrap text on the Attachments column so multiple links display on multiple lines
    bs.getRange(2, BILL_HEADERS.length, rows.length, 1).setWrap(true);
  }

  bs.autoResizeColumns(1, BILL_HEADERS.length);

  // Attachments sheet: list every file across all bills for this project
  let attSheet = ss.getSheetByName('Attachments');
  if (!attSheet) {
    attSheet = ss.insertSheet('Attachments');
  }
  const ATT_HEADERS = ['UniqueID', 'Bill No', 'File Name', 'Drive URL', 'Uploaded At'];
  attSheet.getRange(1, 1, 1, ATT_HEADERS.length).setValues([ATT_HEADERS]);
  attSheet.getRange(1, 1, 1, ATT_HEADERS.length)
    .setFontWeight('bold').setBackground('#16A34A').setFontColor('#ffffff');
  attSheet.setFrozenRows(1);

  const attLastRow = attSheet.getLastRow();
  if (attLastRow > 1) {
    attSheet.getRange(2, 1, attLastRow - 1, ATT_HEADERS.length).clearContent();
  }

  const attRows = [];
  for (const bill of bills) {
    if (!bill.attachments) continue;
    const ups = newUploads[bill.id] || [];
    const upByIdx = {};
    ups.forEach(u => upByIdx[u.index] = u);
    bill.attachments.forEach((att, i) => {
      const url = upByIdx[i] ? upByIdx[i].url : att.driveUrl;
      if (url) {
        attRows.push([
          bill.id || '', bill.billNumber || '', att.name || '',
          url, new Date().toISOString()
        ]);
      }
    });
  }
  if (attRows.length > 0) {
    attSheet.getRange(2, 1, attRows.length, ATT_HEADERS.length).setValues(attRows);
  }
  attSheet.autoResizeColumns(1, ATT_HEADERS.length);

  // Update Last Synced + Bill Count in config (rowIdx is 0-based in array; sheet rows are 1-based)
  config.getRange(rowIdx + 1, 7).setValue(new Date().toISOString());
  config.getRange(rowIdx + 1, 8).setValue(bills.length);

  return {
    folderId: folderId, folderUrl: folderUrl,
    sheetId: sheetId,   sheetUrl: sheetUrl,
    configSheetId: config.getParent().getId(),
    configSheetUrl: config.getParent().getUrl(),
    billsSynced: bills.length,
    attachmentsUploaded: newUploads,
    attachmentErrors: uploadErrors
  };
}

function getConfig() {
  const config = getOrCreateConfigSheet();
  const data   = config.getDataRange().getValues();
  const rows   = data.slice(1).filter(r => r[0]).map(r => ({
    name:       r[0],
    prefix:     r[1],
    folderId:   r[2],
    folderUrl:  r[3],
    sheetId:    r[4],
    sheetUrl:   r[5],
    lastSynced: r[6] ? new Date(r[6]).toISOString() : '',
    billCount:  Number(r[7]) || 0,
    notes:      r[8] || ''
  }));
  return {
    projects: rows,
    configSheetId: config.getParent().getId(),
    configSheetUrl: config.getParent().getUrl(),
    parentFolderId: PARENT_FOLDER_ID
  };
}

function updateConfig(row) {
  if (!row || !row.name) return { error: 'row.name required' };
  const config = getOrCreateConfigSheet();
  const data   = config.getDataRange().getValues();
  const idx    = findRowByName(data, row.name);
  if (idx <= 0) return { error: 'Project not found in config' };
  config.getRange(idx + 1, 1, 1, CONFIG_HEADERS.length).setValues([[
    row.name,
    (row.prefix || '').toString().toUpperCase(),
    row.folderId || '',
    row.folderUrl || '',
    row.sheetId || '',
    row.sheetUrl || '',
    row.lastSynced || new Date().toISOString(),
    Number(row.billCount) || 0,
    row.notes || ''
  ]]);
  return { ok: true };
}

function deleteProjectRow(projectName) {
  const config = getOrCreateConfigSheet();
  const data   = config.getDataRange().getValues();
  const idx    = findRowByName(data, projectName);
  if (idx <= 0) return { error: 'Project not found' };
  config.deleteRow(idx + 1);
  return { ok: true };
}

// =============================================================
// Helpers
// =============================================================
function findRowByName(data, name) {
  const target = String(name || '').toLowerCase();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').toLowerCase() === target) return i;
  }
  return -1;
}

function getOrCreateConfigSheet() {
  const parent = DriveApp.getFolderById(PARENT_FOLDER_ID);
  const files  = parent.getFilesByName(CONFIG_SHEET_NAME);
  let ss;
  if (files.hasNext()) {
    ss = SpreadsheetApp.openById(files.next().getId());
  } else {
    ss = SpreadsheetApp.create(CONFIG_SHEET_NAME);
    const file = DriveApp.getFileById(ss.getId());
    parent.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
    const sheet = ss.getActiveSheet();
    sheet.setName('Projects');
    sheet.getRange(1, 1, 1, CONFIG_HEADERS.length).setValues([CONFIG_HEADERS]);
    sheet.getRange(1, 1, 1, CONFIG_HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#0F172A')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, CONFIG_HEADERS.length);
  }
  return ss.getSheetByName('Projects') || ss.getActiveSheet();
}
