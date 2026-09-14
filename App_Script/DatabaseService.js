/**
 * DatabaseService.js — Multi-Sheet Router, Cell-Level Bi-Sync & Hybrid Aggregator
 * Project 08: QR-Based Mobile Asset Survey App (v1.1.6b)
 * MUIDS Lab Oops OS — Science Department
 */

/**
 * Concurrency Lock Standard (Section 16 of Lab Oops Standards)
 */
function withLock(callback, timeoutMs) {
  if (!timeoutMs) timeoutMs = 30000;
  var lock = LockService.getScriptLock();
  lock.waitLock(timeoutMs);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Returns active spreadsheet or spreadsheet configured in ScriptProperties
 */
function getSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var configuredId = props.getProperty("ASSET_SPREADSHEET_ID") || DEFAULT_ASSET_SPREADSHEET_ID;
  if (configuredId) {
    try {
      return SpreadsheetApp.openById(configuredId);
    } catch (e) {
      console.warn("Could not open configured ASSET_SPREADSHEET_ID (" + configuredId + "): " + e.toString());
    }
  }
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    return null;
  }
}

/**
 * Tab 5 (Room) integration from Project 00: Kernel (11PUpY4zVClvVbfzgu4Olyzy6e5NacNUXZv30bexQQB8)
 * 3-Tier Caching Snapshot (RAM -> ScriptProperties -> Live Sheet)
 */
function getNexusRoomDirectory() {
  var cache = CacheService.getScriptCache();
  var cacheKey = "NEXUS_ROOM_DIRECTORY_SNAPSHOT";
  var cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }
  
  var props = PropertiesService.getScriptProperties();
  var propData = props.getProperty(cacheKey);
  if (propData) {
    try {
      var parsed = JSON.parse(propData);
      cache.put(cacheKey, propData, 21600);
      return parsed;
    } catch (e) {}
  }
  
  try {
    var nexusSS = SpreadsheetApp.openById(NEXUS_SPREADSHEET_ID);
    var sheet = nexusSS.getSheetByName("Room") || nexusSS.getSheetByName("Rooms");
    if (!sheet) return getFallbackKernelRooms();
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return getFallbackKernelRooms();
    
    var headers = data[0].map(function(h) { return String(h || "").trim(); });
    var rows = data.slice(1);
    
    var rooms = rows.map(function(r) {
      var obj = {};
      headers.forEach(function(h, idx) {
        obj[h] = r[idx];
      });
      return {
        roomId: String(obj.RoomID || "").trim(),
        roomName: String(obj.RoomName || "").trim(),
        sourceSystemCode: String(obj.SourceSystemCode || "").trim(),
        floor: Number(obj.Floor || 2)
      };
    }).filter(function(r) { return r.roomName !== ""; });
    
    var jsonStr = JSON.stringify(rooms);
    props.setProperty(cacheKey, jsonStr);
    cache.put(cacheKey, jsonStr, 21600);
    return rooms;
  } catch (err) {
    console.warn("Nexus Room tab read fallback: " + err.toString());
    return getFallbackKernelRooms();
  }
}

function getFallbackKernelRooms() {
  return [
    { roomId: "room_06", roomName: "Chem1", sourceSystemCode: "ChemLab1", floor: 2 },
    { roomId: "room_07", roomName: "Chem2", sourceSystemCode: "ChemLab2", floor: 2 },
    { roomId: "room_08", roomName: "Physics1", sourceSystemCode: "Physics 1", floor: 2 },
    { roomId: "room_09", roomName: "Physics2", sourceSystemCode: "Physics 2", floor: 2 },
    { roomId: "room_13", roomName: "Bio1", sourceSystemCode: "BioLab1", floor: 3 },
    { roomId: "room_14", roomName: "Bio2", sourceSystemCode: "BioLab2", floor: 3 },
    { roomId: "room_01", roomName: "208", sourceSystemCode: "S208", floor: 2 },
    { roomId: "room_02", roomName: "210", sourceSystemCode: "S210", floor: 2 },
    { roomId: "room_03", roomName: "215", sourceSystemCode: "S215", floor: 2 },
    { roomId: "room_04", roomName: "216", sourceSystemCode: "S216", floor: 2 },
    { roomId: "room_05", roomName: "217", sourceSystemCode: "S217", floor: 2 },
    { roomId: "room_10", roomName: "308", sourceSystemCode: "S308", floor: 3 },
    { roomId: "room_11", roomName: "309", sourceSystemCode: "S309", floor: 3 },
    { roomId: "room_12", roomName: "310", sourceSystemCode: "S310", floor: 3 }
  ];
}

/**
 * Identifies all room inventory worksheets, excluding system tabs
 * Pure Read-Only Inspection: Strictly does NOT add, remove, or modify sheets!
 */
function getRoomSheets(ss) {
  if (!ss) ss = getSpreadsheet();
  if (!ss) return [];
  
  var config = getLocalConfig();
  var systemSheets = config.SYSTEM_SHEETS || ["Config", "Logs", "Stats", "Master", "Sheet1"];
  if (typeof systemSheets === "string") {
    systemSheets = systemSheets.split(",").map(function(s) { return s.trim().toLowerCase(); });
  } else if (Array.isArray(systemSheets)) {
    systemSheets = systemSheets.map(function(s) { return String(s).trim().toLowerCase(); });
  }

  var kernelRooms = getNexusRoomDirectory();
  var sheets = ss.getSheets();
  var roomSheets = [];
  
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName().trim();
    if (systemSheets.indexOf(name.toLowerCase()) === -1) {
      // Cross-reference with Project 00 Kernel Room directory
      var matchedKernel = kernelRooms.find(function(k) {
        var nLow = name.toLowerCase();
        return nLow === k.roomName.toLowerCase() || 
               nLow === k.sourceSystemCode.toLowerCase() ||
               nLow.indexOf(k.roomName.toLowerCase()) !== -1 ||
               k.roomName.toLowerCase().indexOf(nLow) !== -1;
      });

      roomSheets.push({
        name: name,
        sheetId: sheets[i].getSheetId(),
        rowCount: sheets[i].getLastRow(),
        floor: matchedKernel ? matchedKernel.floor : 2,
        canonicalName: matchedKernel ? matchedKernel.roomName : name
      });
    }
  }

  return roomSheets;
}

/**
 * Resolves a room worksheet by name, code, or configured alias.
 * E.g., "204" -> Sheet "204" or Sheet "Lab 204"
 */
function getRoomSheetByName(ss, roomIdentifier) {
  if (!ss) ss = getSpreadsheet();
  if (!ss || !roomIdentifier) return null;
  
  var target = String(roomIdentifier).trim();
  
  // 1. Direct exact match
  var directSheet = ss.getSheetByName(target);
  if (directSheet) return directSheet;
  
  // 2. Mapped alias from local config
  var config = getLocalConfig();
  var roomMap = config.ROOM_SHEETS_CONFIG || DEFAULT_ROOM_SHEETS_MAP;
  if (roomMap && roomMap[target]) {
    var mappedSheet = ss.getSheetByName(roomMap[target]);
    if (mappedSheet) return mappedSheet;
  }
  
  // 3. Case-insensitive and normalized match
  var sheets = ss.getSheets();
  var targetLower = target.toLowerCase();
  for (var i = 0; i < sheets.length; i++) {
    var sName = sheets[i].getName().trim();
    if (sName.toLowerCase() === targetLower) return sheets[i];
  }
  
  // 4. Prefix/Suffix match (e.g. "Lab 204" matches "204" or vice versa)
  for (var j = 0; j < sheets.length; j++) {
    var sheetName = sheets[j].getName().trim().toLowerCase();
    if (sheetName.indexOf(targetLower) !== -1 || targetLower.indexOf(sheetName) !== -1) {
      return sheets[j];
    }
  }
  
  return null;
}


const START_COL_M = 13; // Column M is 13 (1-indexed)
const AUDIT_COLUMNS_ROW5_HARDCODED = [
  "Scanned 69",    // Col M (13) — User status input
  "หมายเหตุปี 69", // Col N (14) — Remarks / rename / moved info
  "สติกเกอร์",      // Col O (15) — Sticker verification option
  "Auditor",       // Col P (16) — Auditor display name (Individual Room Sheet only)
  "ปี68",           // Col Q (17)
  "ปี67",           // Col R (18)
  "ปี66",           // Col S (19)
  "ปี64",           // Col T (20)
  "ปี63"            // Col U (21)
];

const PROCUREMENT_ROW5_CANONICAL = [
  "No.",                  // Col 1 (A)
  "Inventory number",     // Col 2 (B)
  "Asset",                // Col 3 (C)
  "Asset description1",   // Col 4 (D)
  "Asset description2",   // Col 5 (E)
  "Curr.acq.value",       // Col 6 (F)
  "Original value",       // Col 7 (G)
  "Asset location",       // Col 8 (H)
  "Room",                 // Col 9 (I)
  "สภาพของสินทรัพย์",       // Col 10 (J)
  "Cap.date",             // Col 11 (K)
  "ปีงบฯที่ได้มา"          // Col 12 (L)
];

/**
 * At Row 5, hardcodes the 9 audit & historical columns to start strictly at Column M (Column 13):
 * Col M (13): "Scanned 69" (User status input)
 * Col N (14): "หมายเหตุปี 69" (Remarks / rename / moved info)
 * Col O (15): "สติกเกอร์" (Sticker verification: ปกติ, ปริ้นใหม่, ปริ้นใหม่+แก้ข้อมูล)
 * Col P (16): "Auditor" (Display name of auditor from user database)
 * Col Q (17): "ปี68"
 * Col R (18): "ปี67"
 * Col S (19): "ปี66"
 * Col T (20): "ปี64"
 * Col U (21): "ปี63"
 * 
 * Shift detection: 
 * 1. If cell M5 is "หมายเหตุปี 69", inserts column before Col 13.
 * 2. If cell P5 (Col 16) is "ปี68", inserts column before Col 16 to cleanly shift historical cols to Q..U.
 * In addition, repairs and cleans up any accidental audit headers written into Columns 1 to 12 (A to L) on Row 5.
 */
function setupRow5AuditHeaders(ss, selectedSheetNames) {
  if (!ss) ss = getSpreadsheet();
  if (!ss) throw new Error("No active spreadsheet available.");
  
  var roomSheets = [];
  if (Array.isArray(selectedSheetNames) && selectedSheetNames.length > 0) {
    selectedSheetNames.forEach(function(sName) {
      roomSheets.push({ name: sName });
    });
  } else {
    roomSheets = getRoomSheets(ss);
  }

  var targetColumns = AUDIT_COLUMNS_ROW5_HARDCODED;
  var results = [];
  
  roomSheets.forEach(function(roomInfo) {
    var sheet = ss.getSheetByName(roomInfo.name);
    if (!sheet) return;
    
    // Ensure sheet has at least 21 columns (up to Col U)
    if (sheet.getMaxColumns() < 21) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), 21 - sheet.getMaxColumns());
    }
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 5) {
      sheet.insertRowsAfter(sheet.getMaxRows(), 5 - sheet.getMaxRows());
    }

    // Check if cell M5 is currently "หมายเหตุปี 69": insert column before Col 13 to shift cleanly to Col N
    var currM5Val = String(sheet.getRange(5, START_COL_M).getValue() || "").trim();
    if (currM5Val === "หมายเหตุปี 69" || currM5Val.indexOf("หมายเหตุ") !== -1) {
      sheet.insertColumnBefore(START_COL_M);
      if (sheet.getMaxColumns() < 21) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), 21 - sheet.getMaxColumns());
      }
    }

    // Check if cell P5 (Col 16) is NOT already "Auditor" / "ผู้สำรวจ":
    // If it has historical year labels (e.g. "ปี68", "ปี 68", "ผลปี 68", "68", "ปี") or any non-auditor content,
    // insert column before Col 16 to insert Auditor column cleanly, shifting historical columns to Cols Q..U (17..21)
    var currP5Val = String(sheet.getRange(5, 16).getValue() || "").trim();
    var isAuditorCol = currP5Val.toLowerCase().indexOf("auditor") !== -1 || currP5Val.indexOf("ผู้สำรวจ") !== -1 || currP5Val.indexOf("ผู้ตรวจ") !== -1;
    if (!isAuditorCol && currP5Val !== "") {
      sheet.insertColumnBefore(16);
      if (sheet.getMaxColumns() < 21) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), 21 - sheet.getMaxColumns());
      }
    }
    
    // STEP 1: CLEANUP & REPAIR PASS ON ROW 5 COLUMNS 1 TO 12 (A TO L)
    // If a previous run placed audit headers starting from Column A, restore proper procurement headers
    var row5Procurement = sheet.getRange(5, 1, 1, 12).getValues()[0];
    var repairedCols = [];
    
    for (var c = 1; c <= 12; c++) {
      var cellVal = String(row5Procurement[c - 1] || "").trim();
      var isErroneousAudit = targetColumns.indexOf(cellVal) !== -1 || 
                             cellVal.indexOf("ปี6") !== -1 || 
                             cellVal.indexOf("หมายเหตุ") !== -1 || 
                             cellVal.indexOf("สติก") !== -1 ||
                             cellVal.indexOf("Scanned") !== -1 ||
                             cellVal.indexOf("Auditor") !== -1;
                             
      if (isErroneousAudit) {
        var canonicalVal = PROCUREMENT_ROW5_CANONICAL[c - 1];
        sheet.getRange(5, c).setValue(canonicalVal)
          .setFontWeight("bold")
          .setBackground("#f8fafc")
          .setFontColor("#0f172a")
          .setHorizontalAlignment(c === 1 ? "center" : "left");
        repairedCols.push({ col: c, replaced: cellVal, restored: canonicalVal });
      }
    }
    
    // STEP 2: HARDCODE ROW 5 AUDIT COLUMNS STARTING AT COLUMN M (COL 13 TO COL 21 / M TO U)
    for (var i = 0; i < targetColumns.length; i++) {
      var colHeader = targetColumns[i];
      var colIndex = START_COL_M + i; // 13 (M), 14 (N), 15 (O), 16 (P), 17 (Q), 18 (R), 19 (S), 20 (T), 21 (U)
      
      var cellRange = sheet.getRange(5, colIndex);
      cellRange.setValue(colHeader)
        .setFontWeight("bold")
        .setBackground("#0f172a")
        .setHorizontalAlignment("center");
        
      if (colHeader === "Scanned 69") {
        cellRange.setFontColor("#34d399"); // Emerald
      } else if (colHeader === "หมายเหตุปี 69") {
        cellRange.setFontColor("#10b981"); // Teal
      } else if (colHeader === "สติกเกอร์") {
        cellRange.setFontColor("#38bdf8"); // Cyan
      } else if (colHeader === "Auditor") {
        cellRange.setFontColor("#a78bfa"); // Indigo/Purple
      } else {
        cellRange.setFontColor("#94a3b8"); // Slate
      }
    }
    
    results.push({
      sheetName: roomInfo.name,
      startCol: "M (13)",
      columnsAdded: targetColumns.length,
      columnsRange: "M5:U5",
      repairedColsCount: repairedCols.length,
      repairedDetails: repairedCols
    });
  });
  
  // STEP 3: SYNCHRONIZE CONFIG SHEET TAB AUTOMATICALLY
  try {
    syncConfigSheet(ss);
  } catch (e) {
    console.warn("Auto syncConfigSheet notice: " + e.toString());
  }
  
  // Flush caches
  try {
    CacheService.getScriptCache().remove("ASSET_ROUTER_INDEX");
    CacheService.getScriptCache().remove("LOCAL_CONFIG_SNAPSHOT");
  } catch (e) {}
  
  return {
    success: true,
    message: "Row 5 audit headers (Cols M–U) successfully hardcoded across " + results.length + " room sheets. Configured: Scanned 69 (M), หมายเหตุปี 69 (N), สติกเกอร์ (O), Auditor (P), ปี68..ปี63 (Q..U).",
    sheetsConfigured: results.length,
    startColumn: "M (Column 13)",
    columnsRange: "M5:U5",
    columns: targetColumns,
    details: results
  };
}

/**
 * Robust Merged-Header Detector for Procurement Spreadsheets
 * Scans rows 1-6 to locate headers and maps columns per user specification:
 * Col A = 'No.', Col B = 'Inventory number', Col C = 'Asset', Col D = 'Asset description1',
 * Col E = 'Asset description2', Col F = 'Curr.acq.value', Col G = 'Original value',
 * Col H = 'Asset location', Col I = 'Room', Col J = 'สภาพของสินทรัพย์', Col K = 'Cap.date', Col L = 'ปีงบฯที่ได้มา'
 * Target Survey Columns: 'หมายเหตุปี 69', 'Sticker', 'ผลปี 68'...'ผลปี 63'
 */
function detectSheetHeaderAndColumns(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  
  var defaultMap = {
    no: 1,                 // Col A
    inventoryNumber: 2,    // Col B (QR Code / Tag)
    asset: 3,              // Col C
    description1: 4,       // Col D
    description2: 5,       // Col E
    currAcqValue: 6,       // Col F
    originalValue: 7,      // Col G
    assetLocation: 8,      // Col H
    room: 9,               // Col I
    conditionThai: 10,     // Col J
    capDate: 11,           // Col K
    fiscalYear: 12         // Col L
  };

  if (lastRow === 0 || lastCol === 0) {
    return {
      headerRow: 1,
      dataStartRow: 2,
      colMap: defaultMap,
      result69Col: -1,
      stickerCol: -1,
      historicalCols: {}
    };
  }

  var maxScanRows = Math.min(6, lastRow);
  var scanData = sheet.getRange(1, 1, maxScanRows, lastCol).getValues();

  // Find the header row containing key procurement phrases
  var detectedHeaderRow = 1;
  var bestScore = 0;

  for (var r = 0; r < scanData.length; r++) {
    var score = 0;
    scanData[r].forEach(function(cell) {
      var s = String(cell || "").trim().toLowerCase();
      if (s.indexOf("inventory") !== -1 || s.indexOf("หมายเลขครุภัณฑ์") !== -1) score += 4;
      if (s.indexOf("description") !== -1 || s.indexOf("รายการ") !== -1) score += 3;
      if (s === "no." || s === "no" || s === "ลำดับ") score += 2;
      if (s === "room" || s.indexOf("ห้อง") !== -1) score += 2;
      if (s.indexOf("สภาพ") !== -1 || s.indexOf("condition") !== -1) score += 2;
      if (s.indexOf("หมายเหตุปี 69") !== -1 || s.indexOf("ผลปี 68") !== -1) score += 3;
      if (s.indexOf("sticker") !== -1) score += 2;
    });
    if (score > bestScore) {
      bestScore = score;
      detectedHeaderRow = r + 1; // 1-indexed
    }
  }

  var colMap = Object.assign({}, defaultMap);
  var scanned69Col = -1;
  var result69Col = -1;
  var stickerCol = -1;
  var auditorCol = -1;
  var historicalCols = {};

  // Inspect headers across rows 1 to detectedHeaderRow to handle vertically merged headers
  for (var c = 1; c <= lastCol; c++) {
    var combinedHeader = "";
    for (var r = 0; r < detectedHeaderRow; r++) {
      var cellVal = String(scanData[r][c - 1] || "").trim();
      if (cellVal) combinedHeader += " " + cellVal;
    }
    combinedHeader = combinedHeader.trim().toLowerCase();

    if (combinedHeader.indexOf("inventory number") !== -1 || combinedHeader.indexOf("inventory no") !== -1 || combinedHeader.indexOf("หมายเลขครุภัณฑ์") !== -1) {
      colMap.inventoryNumber = c;
    } else if (combinedHeader === "no." || combinedHeader === "no" || combinedHeader === "ลำดับ") {
      colMap.no = c;
    } else if (combinedHeader.indexOf("asset description1") !== -1 || combinedHeader.indexOf("description1") !== -1 || combinedHeader.indexOf("รายการ") !== -1) {
      colMap.description1 = c;
    } else if (combinedHeader.indexOf("asset description2") !== -1 || combinedHeader.indexOf("description2") !== -1) {
      colMap.description2 = c;
    } else if (combinedHeader === "asset" || (combinedHeader.indexOf("สินทรัพย์") !== -1 && combinedHeader.indexOf("สภาพ") === -1)) {
      colMap.asset = c;
    } else if (combinedHeader.indexOf("curr.acq.value") !== -1 || combinedHeader.indexOf("acq.value") !== -1) {
      colMap.currAcqValue = c;
    } else if (combinedHeader.indexOf("original value") !== -1) {
      colMap.originalValue = c;
    } else if (combinedHeader.indexOf("asset location") !== -1 || combinedHeader.indexOf("สถานที่") !== -1) {
      colMap.assetLocation = c;
    } else if (combinedHeader === "room" || combinedHeader.indexOf("ห้อง") !== -1) {
      colMap.room = c;
    } else if (combinedHeader.indexOf("สภาพ") !== -1 || combinedHeader.indexOf("condition") !== -1) {
      colMap.conditionThai = c;
    } else if (combinedHeader.indexOf("cap.date") !== -1 || combinedHeader.indexOf("cap date") !== -1) {
      colMap.capDate = c;
    } else if (combinedHeader.indexOf("ปีงบ") !== -1 || combinedHeader.indexOf("fiscal year") !== -1) {
      colMap.fiscalYear = c;
    } else if (combinedHeader.indexOf("scanned 69") !== -1 || combinedHeader.indexOf("scanned69") !== -1 || combinedHeader.indexOf("สถานะปี 69") !== -1) {
      scanned69Col = c;
    } else if (combinedHeader.indexOf("หมายเหตุปี 69") !== -1 || combinedHeader.indexOf("ผลปี 69") !== -1 || combinedHeader.indexOf("ปี 69") !== -1 || combinedHeader.indexOf("ปี69") !== -1) {
      result69Col = c;
    } else if (combinedHeader.indexOf("sticker") !== -1 || combinedHeader.indexOf("สติกเกอร์") !== -1 || combinedHeader.indexOf("สติ๊กเกอร์") !== -1) {
      stickerCol = c;
    } else if (combinedHeader.indexOf("auditor") !== -1 || combinedHeader.indexOf("ผู้สำรวจ") !== -1 || combinedHeader.indexOf("ผู้ตรวจ") !== -1) {
      auditorCol = c;
    }

    // Historical columns: 'ปี68', 'ปี67', 'ผลปี 68', etc.
    var matchYear = combinedHeader.match(/(?:ผลปี|ปี)\s*(6[3-8])/);
    if (matchYear && matchYear[1]) {
      historicalCols[matchYear[1]] = c;
    }
  }

  // Positional fallback for essential columns
  if (!colMap.inventoryNumber && lastCol >= 2) colMap.inventoryNumber = 2;
  if (!colMap.no && lastCol >= 1) colMap.no = 1;
  if (!colMap.description1 && lastCol >= 4) colMap.description1 = 4;
  if (!colMap.description2 && lastCol >= 5) colMap.description2 = 5;
  if (!colMap.room && lastCol >= 9) colMap.room = 9;

  // Prioritize Row 5 Column M hardcoded survey columns
  if (lastCol >= 13) {
    if (scanned69Col === -1) scanned69Col = 13; // Column M
    if (result69Col === -1 && lastCol >= 14) result69Col = 14; // Column N
    if (stickerCol === -1 && lastCol >= 15) stickerCol = 15; // Column O
    if (auditorCol === -1 && lastCol >= 16) auditorCol = 16; // Column P
    if (!historicalCols["68"] && lastCol >= 17) historicalCols["68"] = 17; // Column Q
    if (!historicalCols["67"] && lastCol >= 18) historicalCols["67"] = 18; // Column R
    if (!historicalCols["66"] && lastCol >= 19) historicalCols["66"] = 19; // Column S
    if (!historicalCols["64"] && lastCol >= 20) historicalCols["64"] = 20; // Column T
    if (!historicalCols["63"] && lastCol >= 21) historicalCols["63"] = 21; // Column U
  }

  if (lastRow >= 5 && detectedHeaderRow <= 5) {
    detectedHeaderRow = 5;
  }

  return {
    headerRow: detectedHeaderRow,
    dataStartRow: detectedHeaderRow + 1,
    colMap: colMap,
    scanned69Col: scanned69Col,
    result69Col: result69Col,
    stickerCol: stickerCol,
    auditorCol: auditorCol,
    historicalCols: historicalCols
  };
}

/**
 * Normalizes QR scan input (strips URLs, query params, leading/trailing whitespace)
 */
function cleanAssetCode(rawInput) {
  if (!rawInput) return "";
  var str = String(rawInput).trim();
  
  // If it is a URL, extract code parameter or path tail
  if (str.indexOf("http://") === 0 || str.indexOf("https://") === 0) {
    try {
      var matchParam = str.match(/[?&](?:id|asset|code|qr|tag|inventory)=([^&]+)/i);
      if (matchParam && matchParam[1]) {
        return decodeURIComponent(matchParam[1]).trim();
      }
      var parts = str.split("/");
      var lastPart = parts[parts.length - 1].split("?")[0].split("#")[0];
      if (lastPart) return decodeURIComponent(lastPart).trim();
    } catch (e) {}
  }
  
  return str;
}

/**
 * Builds in-memory and CacheService index across all room worksheets
 * Pure Read-Only Inspection: Never modifies sheet content!
 */
function buildAssetIndex(forceRefresh) {
  var cache = CacheService.getScriptCache();
  if (!forceRefresh) {
    var cached = cache.get("ASSET_ROUTER_INDEX");
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
  }
  
  var ss = getSpreadsheet();
  if (!ss) return { index: {}, roomSummaries: {} };
  
  var roomSheets = getRoomSheets(ss);
  var index = {};
  var roomSummaries = {};
  
  roomSheets.forEach(function(roomInfo) {
    var sheet = ss.getSheetByName(roomInfo.name);
    if (!sheet) return;
    
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol === 0) {
      roomSummaries[roomInfo.name] = { total: 0, verified: 0, unverified: 0, good: 0, damaged: 0, missing: 0 };
      return;
    }
    
    var schema = detectSheetHeaderAndColumns(sheet);
    var startRow = schema.dataStartRow;
    if (startRow > lastRow) {
      roomSummaries[roomInfo.name] = { total: 0, verified: 0, unverified: 0, good: 0, damaged: 0, missing: 0 };
      return;
    }
    
    var values = sheet.getRange(startRow, 1, lastRow - startRow + 1, lastCol).getValues();
    
    var totalCount = 0;
    var verifiedCount = 0;
    var goodCount = 0;
    var damagedCount = 0;
    var missingCount = 0;
    
    for (var r = 0; r < values.length; r++) {
      var row = values[r];
      var rawAssetId = String(row[schema.colMap.inventoryNumber - 1] || "").trim();
      if (!rawAssetId) continue;
      
      totalCount++;
      
      // Check current audit results in 'Scanned 69' and 'หมายเหตุปี 69'
      var scanned69Val = (schema.scanned69Col !== -1) ? String(row[schema.scanned69Col - 1] || "").trim() : "";
      var result69Val = (schema.result69Col !== -1) ? String(row[schema.result69Col - 1] || "").trim() : "";
      var stickerVal = (schema.stickerCol !== -1) ? String(row[schema.stickerCol - 1] || "").trim() : "";
      
      // Determine verified status strictly from Column M ('Scanned 69')
      var statusDerived = "";
      var isVerified = (scanned69Val !== "");
      
      if (isVerified) {
        verifiedCount++;
        var statusKey = scanned69Val.toLowerCase();
        if (statusKey.indexOf("ชำรุด") !== -1 || statusKey.indexOf("damaged") !== -1) {
          statusDerived = "Damaged";
          damagedCount++;
        } else if (statusKey.indexOf("สูญหาย") !== -1 || statusKey.indexOf("หาไม่เจอ") !== -1 || statusKey.indexOf("missing") !== -1 || statusKey.indexOf("ไม่พบ") !== -1) {
          statusDerived = "Missing";
          missingCount++;
        } else {
          statusDerived = "Good";
          goodCount++;
        }
      }
      
      var itemName = schema.colMap.description1 ? String(row[schema.colMap.description1 - 1] || "").trim() : "";
      var brandModel = schema.colMap.description2 ? String(row[schema.colMap.description2 - 1] || "").trim() : "";
      var roomLocation = schema.colMap.room ? String(row[schema.colMap.room - 1] || "").trim() : roomInfo.name;
      var procurementCondition = schema.colMap.conditionThai ? String(row[schema.colMap.conditionThai - 1] || "").trim() : "";
      var noVal = schema.colMap.no ? String(row[schema.colMap.no - 1] || "").trim() : (r + 1);

      // Collect historical results (e.g. ผลปี 68)
      var historicalData = {};
      Object.keys(schema.historicalCols).forEach(function(yr) {
        var colIdx = schema.historicalCols[yr];
        historicalData[yr] = String(row[colIdx - 1] || "").trim();
      });
      
      var assetRecord = {
        assetId: rawAssetId,
        no: noVal,
        itemName: itemName || "Unnamed Asset",
        brandModel: brandModel,
        registeredLocation: roomLocation || roomInfo.name,
        sheetName: roomInfo.name,
        rowIndex: startRow + r,
        status: statusDerived,
        scanned69: scanned69Val,
        auditResult69: result69Val,
        sticker: stickerVal || (isVerified ? "ปกติ" : "ปกติ"),
        procurementCondition: procurementCondition,
        historicalResults: historicalData
      };
      
      index[rawAssetId.toUpperCase()] = assetRecord;
      if (rawAssetId !== rawAssetId.toUpperCase()) {
        index[rawAssetId] = assetRecord;
      }
    }
    
    roomSummaries[roomInfo.name] = {
      total: totalCount,
      verified: verifiedCount,
      unverified: totalCount - verifiedCount,
      good: goodCount,
      damaged: damagedCount,
      missing: missingCount
    };
  });
  
  var fullData = { index: index, roomSummaries: roomSummaries };
  try {
    cache.put("ASSET_ROUTER_INDEX", JSON.stringify(fullData), 1800); // 30 minutes
  } catch (e) {
    console.warn("Cache put failed: " + e.toString());
  }
  
  return fullData;
}

/**
 * Fast lookup directly from Master_Asset sheet (v1.1.3i 6-Column Primary Database)
 */
function lookupAssetInMaster(masterSheet, code) {
  if (!masterSheet || masterSheet.getLastRow() <= 1) return { found: false };
  
  var lastRow = masterSheet.getLastRow();
  var numCols = Math.max(5, masterSheet.getLastColumn());
  var data = masterSheet.getRange(1, 1, lastRow, numCols).getValues();
  var headers = data[0].map(function(h) { return String(h || "").trim(); });
  
  var idIdx = headers.indexOf("Inventory number");
  if (idIdx === -1) idIdx = 0;
  var desc1Idx = headers.indexOf("Asset description1");
  if (desc1Idx === -1) desc1Idx = 1;
  var roomIdx = headers.indexOf("Room");
  if (roomIdx === -1) roomIdx = 2;
  var scannedIdx = headers.indexOf("Scanned 69");
  if (scannedIdx === -1) scannedIdx = 3;
  var resultIdx = headers.indexOf("หมายเหตุปี 69");
  if (resultIdx === -1) resultIdx = 4;
  var stickerIdx = headers.indexOf("สติกเกอร์");
  
  var cleanTarget = code.toUpperCase();
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var currentId = String(row[idIdx] || "").trim().toUpperCase();
    if (currentId === cleanTarget) {
      var rName = String(row[roomIdx] || "").trim();
      var desc1 = String(row[desc1Idx] || "").trim();
      var scanned69 = String(row[scannedIdx] || "").trim();
      var result69 = String(row[resultIdx] || "").trim();
      var sticker = (stickerIdx !== -1 ? String(row[stickerIdx] || "").trim() : "") || "ปกติ";
      
      var isVerified = (scanned69 !== "");
      var statusDerived = "";
      if (isVerified) {
        var statusKey = scanned69.toLowerCase();
        if (statusKey.indexOf("ชำรุด") !== -1 || statusKey.indexOf("damaged") !== -1) {
          statusDerived = "Damaged";
        } else if (statusKey.indexOf("สูญหาย") !== -1 || statusKey.indexOf("หาไม่เจอ") !== -1 || statusKey.indexOf("missing") !== -1 || statusKey.indexOf("ไม่พบ") !== -1) {
          statusDerived = "Missing";
        } else {
          statusDerived = "Good";
        }
      }
      
      var assetRecord = {
        assetId: String(row[idIdx] || "").trim(),
        no: i,
        itemName: desc1 || "Unnamed Asset",
        registeredLocation: rName,
        sheetName: rName,
        rowIndex: i + 1,
        status: statusDerived,
        scanned69: scanned69,
        auditResult69: result69,
        sticker: sticker,
        isVerified: isVerified
      };
      
      return { found: true, asset: assetRecord, source: "Master_Asset" };
    }
  }
  return { found: false };
}

/**
 * Dynamic Multi-Sheet Router: Searches across Master_Asset first, then all room worksheets
 */
function lookupAsset(rawCode) {
  var code = cleanAssetCode(rawCode);
  if (!code) return { found: false, error: "Empty asset code provided." };
  
  // 1. Primary: Search in Master_Asset sheet
  var ss = getSpreadsheet();
  if (ss) {
    var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
    if (masterSheet && masterSheet.getLastRow() > 1) {
      var masterRes = lookupAssetInMaster(masterSheet, code);
      if (masterRes && masterRes.found) {
        return masterRes;
      }
    }
  }
  
  // 2. Secondary fallback: Search cached/indexed room worksheets
  var cachedIndexData = buildAssetIndex(false);
  var index = cachedIndexData.index || {};
  
  var asset = index[code.toUpperCase()] || index[code];
  if (asset) {
    return { found: true, asset: asset };
  }
  
  // Force fresh index build if cache miss
  var freshIndexData = buildAssetIndex(true);
  index = freshIndexData.index || {};
  asset = index[code.toUpperCase()] || index[code];
  
  if (asset) {
    return { found: true, asset: asset };
  }
  
  return {
    found: false,
    assetCode: code,
    error: "Inventory Number '" + code + "' was not found in Master Table or any registered laboratory room."
  };
}

/**
 * 1-Tap Status In-Place Mutation & Master Bi-Sync Engine (v1.1.1b)
 * Updates 'Scanned 69', 'หมายเหตุปี 69', and 'สติกเกอร์' in both Master_Asset and target Room Worksheet!
 */
function updateAssetStatus(payload) {
  return withLock(function() {
    var rawAssetId = cleanAssetCode(payload.assetId);
    var newStatus = String(payload.status || payload.scanned69 || "").trim();
    var notes = String(payload.notes || "").trim();
    var destinationRoom = String(payload.destinationRoom || "").trim();
    var renameText = String(payload.renameText || "").trim();
    var sticker = String(payload.sticker || "ปกติ").trim();
    var currentRoom = String(payload.currentRoom || "").trim();
    var authUser = authenticateSession();
    
    if (!rawAssetId) {
      throw new Error("Missing asset inventory number.");
    }
    
    var validStatuses = STATUS_OPTIONS.concat(["Good", "Damaged", "Missing"]);
    if (validStatuses.indexOf(newStatus) === -1) {
      throw new Error("Invalid status: " + newStatus + ". Permitted values: " + STATUS_OPTIONS.join(", "));
    }
    
    var ss = getSpreadsheet();
    if (!ss) throw new Error("No active spreadsheet available.");

    var bangkokNow = getBangkokTimestamp();
    
    // Resolve sheet and row
    var targetSheetName = payload.sheetName;
    var targetRowIndex = payload.rowIndex;
    
    var lookup = lookupAsset(rawAssetId);
    if (!targetSheetName) {
      if (lookup.found) {
        targetSheetName = lookup.asset.sheetName || lookup.asset.registeredLocation;
      } else {
        throw new Error("Cannot update: Asset '" + rawAssetId + "' not found.");
      }
    }
    
    // Construct remarks text for Column N ('หมายเหตุปี 69')
    var remarksParts = [];
    if (newStatus === "ใช้งานอยู่+ย้ายไป..." && destinationRoom) {
      remarksParts.push("ย้ายไป " + destinationRoom);
    } else if (newStatus === "ใช้งานอยู่+แก้ไขชื่อเป็น..." && renameText) {
      remarksParts.push("แก้ชื่อเป็น: " + renameText);
    }
    if (notes) {
      remarksParts.push(notes);
    }
    if (currentRoom && currentRoom !== "ALL" && targetSheetName && currentRoom !== targetSheetName) {
      remarksParts.push("[Found in " + currentRoom + "]");
    }
    var finalRemarks = remarksParts.join(" | ");

    // 1. BI-SYNC: UPDATE MASTER_ASSET SHEET (IF PRESENT)
    var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
    var masterUpdated = false;
    if (masterSheet && masterSheet.getLastRow() > 1) {
      var mData = masterSheet.getDataRange().getValues();
      var mHeaders = mData[0].map(function(h) { return String(h || "").trim(); });
      var mAssetIdIdx = mHeaders.indexOf("Inventory number");
      if (mAssetIdIdx === -1) mAssetIdIdx = 0;
      var mDesc1Idx = mHeaders.indexOf("Asset description1");
      if (mDesc1Idx === -1) mDesc1Idx = 1;
      var mRoomIdx = mHeaders.indexOf("Room");
      if (mRoomIdx === -1) mRoomIdx = 2;
      var mScanned69Idx = mHeaders.indexOf("Scanned 69");
      if (mScanned69Idx === -1) mScanned69Idx = 3;
      var mResult69Idx = mHeaders.indexOf("หมายเหตุปี 69");
      if (mResult69Idx === -1) mResult69Idx = 4;
      var mStickerIdx = mHeaders.indexOf("สติกเกอร์");
      if (mStickerIdx === -1 && mHeaders.length > 5) mStickerIdx = 5;
      var mLastUpdIdx = mHeaders.indexOf("LastUpdated");
      
      if (mAssetIdIdx !== -1) {
        for (var m = 1; m < mData.length; m++) {
          if (String(mData[m][mAssetIdIdx] || "").trim().toUpperCase() === rawAssetId.toUpperCase()) {
            var mRow = m + 1;
            if (mScanned69Idx !== -1) masterSheet.getRange(mRow, mScanned69Idx + 1).setValue(newStatus);
            if (mResult69Idx !== -1) masterSheet.getRange(mRow, mResult69Idx + 1).setValue(finalRemarks);
            if (mStickerIdx !== -1) masterSheet.getRange(mRow, mStickerIdx + 1).setValue(sticker);
            if (renameText && mDesc1Idx !== -1) masterSheet.getRange(mRow, mDesc1Idx + 1).setValue(renameText);
            if (destinationRoom && mRoomIdx !== -1) masterSheet.getRange(mRow, mRoomIdx + 1).setValue(destinationRoom);
            if (mLastUpdIdx !== -1) masterSheet.getRange(mRow, mLastUpdIdx + 1).setValue(bangkokNow);
            masterUpdated = true;
            break;
          }
        }
      }
    }

    // 2. BI-SYNC: UPDATE TARGET ROOM WORKSHEET
    var roomSheet = targetSheetName ? getRoomSheetByName(ss, targetSheetName) : null;
    var roomUpdated = false;
    if (roomSheet) {
      var schema = detectSheetHeaderAndColumns(roomSheet);
      
      // Auto repair or insert Row 5 headers if missing
      if (schema.scanned69Col === -1 || schema.result69Col === -1 || schema.stickerCol === -1) {
        setupRow5AuditHeaders(ss);
        schema = detectSheetHeaderAndColumns(roomSheet);
      }
      
      var assetIdCol = schema.colMap.inventoryNumber || 2;
      var rLastRow = roomSheet.getLastRow();
      
      var foundRow = -1;
      if (targetRowIndex && targetRowIndex >= schema.dataStartRow && targetRowIndex <= rLastRow) {
        var chkId = String(roomSheet.getRange(targetRowIndex, assetIdCol).getValue() || "").trim();
        if (chkId.toUpperCase() === rawAssetId.toUpperCase()) {
          foundRow = targetRowIndex;
        }
      }
      
      if (foundRow === -1 && rLastRow >= schema.dataStartRow) {
        var valRange = roomSheet.getRange(schema.dataStartRow, assetIdCol, rLastRow - schema.dataStartRow + 1, 1).getValues();
        for (var vr = 0; vr < valRange.length; vr++) {
          if (String(valRange[vr][0] || "").trim().toUpperCase() === rawAssetId.toUpperCase()) {
            foundRow = schema.dataStartRow + vr;
            break;
          }
        }
      }
      
      if (foundRow !== -1) {
        if (schema.scanned69Col !== -1) roomSheet.getRange(foundRow, schema.scanned69Col).setValue(newStatus);
        if (schema.result69Col !== -1) roomSheet.getRange(foundRow, schema.result69Col).setValue(finalRemarks);
        if (schema.stickerCol !== -1) roomSheet.getRange(foundRow, schema.stickerCol).setValue(sticker);
        if (schema.auditorCol !== -1) {
          var auditorName = (authUser && (authUser.name || authUser.displayName)) ? (authUser.name || authUser.displayName) : (payload.auditor || "Nattapat Poolyam (Mek)");
          roomSheet.getRange(foundRow, schema.auditorCol).setValue(auditorName);
        }
        if (renameText && schema.colMap.description1) {
          roomSheet.getRange(foundRow, schema.colMap.description1).setValue(renameText);
        }
        if (destinationRoom && schema.colMap.room) {
          roomSheet.getRange(foundRow, schema.colMap.room).setValue(destinationRoom);
        }
        roomUpdated = true;
      }
    }
    
    // Immediate flush to guarantee real-time persistence across sheets
    try {
      SpreadsheetApp.flush();
    } catch (flushErr) {}
    
    // Invalidate caches
    try {
      CacheService.getScriptCache().remove("ASSET_ROUTER_INDEX");
      CacheService.getScriptCache().remove("MASTER_ASSET_CACHE");
    } catch (e) {}
    
    logEvent("UPDATE_ASSET_STATUS", "SUCCESS", 0, "Asset " + rawAssetId + " updated: " + newStatus, {
      assetId: rawAssetId,
      sheet: targetSheetName,
      status: newStatus,
      scanned69: newStatus,
      result69: finalRemarks,
      sticker: sticker,
      masterUpdated: masterUpdated,
      roomUpdated: roomUpdated
    });
    
    return {
      success: true,
      assetId: rawAssetId,
      sheetName: targetSheetName,
      status: newStatus,
      scanned69: newStatus,
      auditResult69: finalRemarks,
      sticker: sticker,
      masterUpdated: masterUpdated,
      roomUpdated: roomUpdated,
      roomSummary: getRoomAuditSummary(targetSheetName || "ALL")
    };
  }, 30000);
}

/**
 * Register & Audit an Unlisted Asset (v1.1.2a)
 * Appends a new asset record into both the target Room Worksheet and Master_Asset.
 * Default Column N ('หมายเหตุปี 69'): "พบครุภัณฑ์ที่ไม่มีในฐานข้อมูลส่งสำรวจ"
 */
function addNewUnlistedAsset(payload) {
  return withLock(function() {
    var rawAssetId = cleanAssetCode(payload.assetId);
    if (!rawAssetId) throw new Error("Missing asset inventory number.");

    var newStatus = String(payload.status || payload.scanned69 || "ใช้งานอยู่").trim();
    var itemName = String(payload.itemName || "ครุภัณฑ์ตรวจพบนอกฐานข้อมูล").trim();
    var targetRoom = String(payload.targetRoom || payload.registeredLocation || payload.sheetName || "Storage").trim();
    var notes = String(payload.notes || "พบครุภัณฑ์ที่ไม่มีในฐานข้อมูลส่งสำรวจ").trim();
    var sticker = String(payload.sticker || "ปกติ").trim();
    var bangkokNow = getBangkokTimestamp();
    
    var ss = getSpreadsheet();
    if (!ss) throw new Error("No active spreadsheet available.");

    var roomSheet = getRoomSheetByName(ss, targetRoom);
    if (!roomSheet) {
      var sheets = getRoomSheets(ss);
      if (sheets.length > 0) {
        roomSheet = ss.getSheetByName(sheets[0].name);
        targetRoom = sheets[0].name;
      }
    }

    var roomInserted = false;
    var nextItemNo = 1;
    if (roomSheet) {
      var schema = detectSheetHeaderAndColumns(roomSheet);
      if (schema.scanned69Col === -1 || schema.result69Col === -1 || schema.stickerCol === -1) {
        setupRow5AuditHeaders(ss);
        schema = detectSheetHeaderAndColumns(roomSheet);
      }

      var lastRow = roomSheet.getLastRow();
      var insertRow = Math.max(lastRow + 1, schema.dataStartRow);
      nextItemNo = (insertRow >= schema.dataStartRow) ? (insertRow - schema.dataStartRow + 1) : 1;

      var maxCols = Math.max(roomSheet.getLastColumn(), 21);
      var newRowValues = new Array(maxCols).fill("");
      
      if (schema.colMap.no) newRowValues[schema.colMap.no - 1] = nextItemNo;
      if (schema.colMap.inventoryNumber) newRowValues[schema.colMap.inventoryNumber - 1] = rawAssetId;
      if (schema.colMap.asset) newRowValues[schema.colMap.asset - 1] = rawAssetId;
      if (schema.colMap.description1) newRowValues[schema.colMap.description1 - 1] = itemName;
      if (schema.colMap.room) newRowValues[schema.colMap.room - 1] = targetRoom;
      if (schema.scanned69Col !== -1) newRowValues[schema.scanned69Col - 1] = newStatus;
      if (schema.result69Col !== -1) newRowValues[schema.result69Col - 1] = notes;
      if (schema.stickerCol !== -1) newRowValues[schema.stickerCol - 1] = sticker;
      if (schema.auditorCol !== -1) {
        var unlistedAuditor = (authUser && (authUser.name || authUser.displayName)) ? (authUser.name || authUser.displayName) : (payload.auditor || "Nattapat Poolyam (Mek)");
        newRowValues[schema.auditorCol - 1] = unlistedAuditor;
      }

      roomSheet.getRange(insertRow, 1, 1, newRowValues.length).setValues([newRowValues]);
      roomInserted = true;
    }

    // Bi-sync to Master_Asset if present
    var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
    var masterInserted = false;
    if (masterSheet && masterSheet.getLastRow() >= 1) {
      var mHeaders = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0].map(function(h) { return String(h || "").trim(); });
      var mRowVals = new Array(mHeaders.length).fill("");
      
      var mNoIdx = mHeaders.indexOf("No.");
      var mIdIdx = mHeaders.indexOf("Inventory number");
      var mAssetIdx = mHeaders.indexOf("Asset");
      var mDesc1Idx = mHeaders.indexOf("Asset description1");
      var mRoomIdx = mHeaders.indexOf("Room");
      var mLocIdx = mHeaders.indexOf("Asset location");
      var mCondIdx = mHeaders.indexOf("สภาพของสินทรัพย์");
      var mCapIdx = mHeaders.indexOf("Cap.date");
      var mScanned69Idx = mHeaders.indexOf("Scanned 69");
      var mResult69Idx = mHeaders.indexOf("หมายเหตุปี 69");
      var mStickerIdx = mHeaders.indexOf("สติกเกอร์");
      var mSourceIdx = mHeaders.indexOf("SourceSheet");
      
      if (mNoIdx !== -1) mRowVals[mNoIdx] = masterSheet.getLastRow();
      if (mIdIdx !== -1) mRowVals[mIdIdx] = rawAssetId;
      if (mAssetIdx !== -1) mRowVals[mAssetIdx] = rawAssetId;
      if (mDesc1Idx !== -1) mRowVals[mDesc1Idx] = itemName;
      if (mRoomIdx !== -1) mRowVals[mRoomIdx] = targetRoom;
      if (mLocIdx !== -1) mRowVals[mLocIdx] = targetRoom;
      if (mCondIdx !== -1) mRowVals[mCondIdx] = "ใช้งานได้";
      if (mCapIdx !== -1) mRowVals[mCapIdx] = bangkokNow;
      if (mScanned69Idx !== -1) mRowVals[mScanned69Idx] = newStatus;
      if (mResult69Idx !== -1) mRowVals[mResult69Idx] = notes;
      if (mStickerIdx !== -1) mRowVals[mStickerIdx] = sticker;
      if (mSourceIdx !== -1) mRowVals[mSourceIdx] = targetRoom;

      masterSheet.appendRow(mRowVals);
      masterInserted = true;
    }

    // Immediate flush to guarantee real-time persistence across sheets
    try {
      SpreadsheetApp.flush();
    } catch (flushErr) {}

    // Invalidate caches
    try {
      CacheService.getScriptCache().remove("ASSET_ROUTER_INDEX");
      CacheService.getScriptCache().remove("MASTER_ASSET_CACHE");
    } catch (e) {}

    logEvent("ADD_UNLISTED_ASSET", "SUCCESS", 0, "New asset " + rawAssetId + " registered into " + targetRoom, {
      assetId: rawAssetId,
      itemName: itemName,
      room: targetRoom,
      status: newStatus,
      notes: notes,
      sticker: sticker,
      roomInserted: roomInserted,
      masterInserted: masterInserted
    });

    return {
      success: true,
      assetId: rawAssetId,
      itemName: itemName,
      sheetName: targetRoom,
      registeredLocation: targetRoom,
      status: newStatus,
      scanned69: newStatus,
      auditResult69: notes,
      sticker: sticker,
      roomSummary: getRoomAuditSummary(targetRoom || "ALL")
    };
  }, 30000);
}

/**
 * Fast Master Table Audit Summary Engine (v1.1.3l 6-Column Dynamic Schema)
 * Extracts lean mobile-only payloads for 10x faster JSON serialization & network streaming.
 */
function getMasterAuditSummary(masterSheet, roomName) {
  var lastRow = masterSheet.getLastRow();
  if (lastRow <= 1) {
    return {
      roomName: roomName || "ALL",
      total: 0,
      verified: 0,
      unverified: 0,
      percentComplete: 0,
      good: 0,
      damaged: 0,
      missing: 0,
      items: [],
      source: "Master_Asset"
    };
  }

  // Fetch columns dynamically according to Master Table schema
  var numCols = Math.max(6, masterSheet.getLastColumn());
  var data = masterSheet.getRange(1, 1, lastRow, numCols).getValues();
  var headers = data[0].map(function(h) { return String(h || "").trim(); });

  var idIdx = headers.indexOf("Inventory number");
  if (idIdx === -1) idIdx = 0;
  var desc1Idx = headers.indexOf("Asset description1");
  if (desc1Idx === -1) desc1Idx = 1;
  var roomIdx = headers.indexOf("Room");
  if (roomIdx === -1) roomIdx = 2;
  var scannedIdx = headers.indexOf("Scanned 69");
  if (scannedIdx === -1) scannedIdx = 3;
  var resultIdx = headers.indexOf("หมายเหตุปี 69");
  if (resultIdx === -1) resultIdx = 4;
  var stickerIdx = headers.indexOf("สติกเกอร์");
  if (stickerIdx === -1 && headers.length > 5) stickerIdx = 5;

  var targetRoom = (roomName && roomName.toUpperCase() !== "ALL") ? roomName.trim().toLowerCase() : null;

  var total = 0;
  var verified = 0;
  var good = 0;
  var damaged = 0;
  var missing = 0;
  var items = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var aId = String(row[idIdx] || "").trim();
    if (!aId) continue;

    var rName = String(row[roomIdx] || "").trim();
    if (targetRoom && rName.toLowerCase() !== targetRoom) {
      continue;
    }

    total++;
    var desc1 = String(row[desc1Idx] || "").trim();
    var scanned69Val = String(row[scannedIdx] || "").trim();
    var result69Val = String(row[resultIdx] || "").trim();
    var stickerVal = (stickerIdx !== -1 ? String(row[stickerIdx] || "").trim() : "") || "ปกติ";

    var isVerified = (scanned69Val !== "");
    var statusVal = "";

    if (isVerified) {
      verified++;
      var statusKey = scanned69Val.toLowerCase();
      if (statusKey.indexOf("ชำรุด") !== -1 || statusKey.indexOf("damaged") !== -1) {
        statusVal = "Damaged";
        damaged++;
      } else if (statusKey.indexOf("สูญหาย") !== -1 || statusKey.indexOf("หาไม่เจอ") !== -1 || statusKey.indexOf("missing") !== -1 || statusKey.indexOf("ไม่พบ") !== -1) {
        statusVal = "Missing";
        missing++;
      } else {
        statusVal = "Good";
        good++;
      }
    }

    // Lean payload: strictly only what the mobile app displays & filters!
    items.push({
      assetId: aId,
      no: i,
      itemName: desc1 || "Unnamed Asset",
      registeredLocation: rName,
      sheetName: rName,
      rowIndex: i + 1,
      status: statusVal,
      scanned69: scanned69Val,
      auditResult69: result69Val,
      sticker: stickerVal,
      isVerified: isVerified
    });
  }

  var unverified = total - verified;
  var percent = total > 0 ? Math.round((verified / total) * 100) : 0;

  return {
    roomName: roomName || "ALL",
    total: total,
    verified: verified,
    unverified: unverified,
    percentComplete: percent,
    good: good,
    damaged: damaged,
    missing: missing,
    items: items,
    source: "Master_Asset"
  };
}

/**
 * Returns audit statistics and items checklist for a given room or all rooms
 * Primary: Queries Master_Asset for instant sub-second speed. Secondary: Iterates room sheets with fixed Row 6 offsets.
 */
function getRoomAuditSummary(roomName) {
  var ss = getSpreadsheet();
  if (!ss) return { total: 0, verified: 0, unverified: 0, items: [] };

  // 1. Primary: Aggregate directly from Master_Asset sheet
  var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
  if (masterSheet && masterSheet.getLastRow() > 1) {
    return getMasterAuditSummary(masterSheet, roomName);
  }
  
  // 2. Secondary fallback: Scan room worksheets using fixed Row 6 offsets
  var roomSheets = getRoomSheets(ss);
  var targetRooms = [];
  
  if (!roomName || roomName.toUpperCase() === "ALL") {
    targetRooms = roomSheets.map(function(r) { return r.name; });
  } else {
    targetRooms = [roomName];
  }
  
  var total = 0;
  var verified = 0;
  var good = 0;
  var damaged = 0;
  var missing = 0;
  var items = [];
  
  targetRooms.forEach(function(rName) {
    var sheet = ss.getSheetByName(rName);
    if (!sheet) return;
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 6) return; // Row 5 is header, data starts at Row 6
    
    var values = sheet.getRange(6, 1, lastRow - 5, 20).getValues();
    
    for (var r = 0; r < values.length; r++) {
      var row = values[r];
      var aId = String(row[1] || "").trim(); // Col B (idx 1)
      if (!aId) continue;
      
      total++;
      var desc1 = String(row[3] || "").trim(); // Col D (idx 3)
      var roomLocation = String(row[8] || rName).trim(); // Col I (idx 8)
      var scanned69Val = String(row[12] || "").trim(); // Col M (idx 12)
      var result69Val = String(row[13] || "").trim(); // Col N (idx 13)
      var stickerVal = String(row[14] || "").trim() || "ปกติ"; // Col O (idx 14)
      
      var isVerified = (scanned69Val !== "");
      var statusVal = "";
      
      if (isVerified) {
        verified++;
        var statusKey = scanned69Val.toLowerCase();
        if (statusKey.indexOf("ชำรุด") !== -1 || statusKey.indexOf("damaged") !== -1) {
          statusVal = "Damaged";
          damaged++;
        } else if (statusKey.indexOf("สูญหาย") !== -1 || statusKey.indexOf("หาไม่เจอ") !== -1 || statusKey.indexOf("missing") !== -1 || statusKey.indexOf("ไม่พบ") !== -1) {
          statusVal = "Missing";
          missing++;
        } else {
          statusVal = "Good";
          good++;
        }
      }
      
      items.push({
        assetId: aId,
        no: row[0] || (r + 1),
        itemName: desc1 || "Unnamed Asset",
        registeredLocation: roomLocation || rName,
        sheetName: rName,
        rowIndex: 6 + r,
        status: statusVal,
        scanned69: scanned69Val,
        auditResult69: result69Val,
        sticker: stickerVal,
        isVerified: isVerified
      });
    }
  });
  
  var unverified = total - verified;
  var percentComplete = total > 0 ? Math.round((verified / total) * 100) : 0;
  
  return {
    roomName: roomName || "ALL",
    total: total,
    verified: verified,
    unverified: unverified,
    good: good,
    damaged: damaged,
    missing: missing,
    percentComplete: percentComplete,
    items: items
  };
}

/**
 * Returns initial payload for web app startup
 */
function getInitialPayload() {
  var ss = getSpreadsheet();
  var authUser = authenticateSession();
  var config = getLocalConfig();
  var roomSheets = ss ? getRoomSheets(ss) : [];
  var rooms = roomSheets.map(function(r) { return r.name; });
  if (!rooms || rooms.length === 0) {
    rooms = (typeof ROOM_SHEETS_CONFIG !== "undefined" ? ROOM_SHEETS_CONFIG : []).slice();
  }
  var kernelRooms = getNexusRoomDirectory();
  
  var defaultRoom = "ALL";
  var initialSummary = getRoomAuditSummary(defaultRoom);
  
  return {
    user: authUser,
    config: config,
    rooms: rooms,
    roomSheets: roomSheets,
    kernelRooms: kernelRooms,
    statusGroups: typeof STATUS_GROUPS !== "undefined" ? STATUS_GROUPS : {},
    statusOptions: typeof STATUS_OPTIONS !== "undefined" ? STATUS_OPTIONS : [],
    stickerOptions: typeof STICKER_OPTIONS !== "undefined" ? STICKER_OPTIONS : ["ปกติ", "ปริ้นใหม่", "ปริ้นใหม่+แก้ข้อมูล"],
    roomSheetsConfig: typeof ROOM_SHEETS_CONFIG !== "undefined" ? ROOM_SHEETS_CONFIG : rooms,
    currentRoom: defaultRoom,
    summary: initialSummary,
    spreadsheetId: ss ? ss.getId() : DEFAULT_ASSET_SPREADSHEET_ID
  };
}

/**
 * Menu 2: Fast Single-Batch Aggregation of Room Sheets into Master Table ('Master_Asset')
 * Extracts 6 essential columns from selected room sheets:
 * Col B (Inventory number), Col D (Asset description1), Col I (Room), Col M (Scanned 69), Col N (หมายเหตุปี 69), Col O (สติกเกอร์)
 */
function buildMasterTableFromRooms(ss, selectedSheetNames) {
  if (!ss) ss = getSpreadsheet();
  if (!ss) throw new Error("No active spreadsheet available.");
  
  return withLock(function() {
    var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
    if (!masterSheet) {
      masterSheet = ss.insertSheet(MASTER_SHEET_NAME);
    }
    
    var sheetsToProcess = [];
    if (Array.isArray(selectedSheetNames) && selectedSheetNames.length > 0) {
      selectedSheetNames.forEach(function(sName) {
        var s = ss.getSheetByName(sName);
        if (s) {
          sheetsToProcess.push({ name: sName, sheet: s });
        }
      });
    } else {
      var allRoomSheets = getRoomSheets(ss);
      allRoomSheets.forEach(function(rInfo) {
        var s = ss.getSheetByName(rInfo.name);
        if (s) {
          sheetsToProcess.push({ name: rInfo.name, sheet: s });
        }
      });
    }
    
    var masterHeaders = MASTER_HEADERS; // 6 columns: ["Inventory number", "Asset description1", "Room", "Scanned 69", "หมายเหตุปี 69", "สติกเกอร์"]
    var masterRows = [];
    var bangkokNow = getBangkokTimestamp();
    
    sheetsToProcess.forEach(function(entry) {
      var sheet = entry.sheet || ss.getSheetByName(entry.name);
      if (!sheet) return;
      
      var lastRow = sheet.getLastRow();
      if (lastRow < 6) return; // Row 5 is header, data starts at Row 6
      
      // Batch read columns up to Col O (Col 15) from Row 6 down
      var values = sheet.getRange(6, 1, lastRow - 5, 15).getValues();
      
      for (var r = 0; r < values.length; r++) {
        var row = values[r];
        var assetId = String(row[1] || "").trim(); // Col B (Inventory number, idx 1)
        if (!assetId) continue;
        
        var desc1 = String(row[3] || "").trim(); // Col D (Asset description1, idx 3)
        var roomVal = String(row[8] || "").trim() || entry.name; // Col I (Room, idx 8)
        var scanned69 = String(row[12] || "").trim(); // Col M (Scanned 69, idx 12)
        var result69 = String(row[13] || "").trim(); // Col N (หมายเหตุปี 69, idx 13)
        var sticker = String(row[14] || "").trim(); // Col O (สติกเกอร์, idx 14)
        
        masterRows.push([assetId, desc1, roomVal, scanned69, result69, sticker]);
      }
    });
    
    // Clear existing data and format on Master Sheet in 1 atomic batch
    masterSheet.clear();
    masterSheet.getRange(1, 1, 1, masterHeaders.length)
      .setValues([masterHeaders])
      .setFontWeight("bold")
      .setBackground("#0f172a")
      .setFontColor("#38bdf8");
    masterSheet.setFrozenRows(1);
    
    if (masterRows.length > 0) {
      masterSheet.getRange(2, 1, masterRows.length, masterHeaders.length).setValues(masterRows);
    }
    
    // Invalidate caches
    try {
      CacheService.getScriptCache().remove("MASTER_ASSET_CACHE");
      CacheService.getScriptCache().remove("ASSET_ROUTER_INDEX");
    } catch (e) {}
    
    logEvent("BUILD_MASTER_TABLE", "SUCCESS", 0, "Master Table built with " + masterRows.length + " assets across " + sheetsToProcess.length + " sheets (6 columns including Sticker).", {
      totalAssets: masterRows.length,
      roomsProcessed: sheetsToProcess.length
    });
    
    return {
      success: true,
      message: "Master Table built with " + masterRows.length + " assets across " + sheetsToProcess.length + " sheets (Cols B, D, I, M, N, O).",
      totalAssets: masterRows.length,
      roomsProcessed: sheetsToProcess.length,
      timestamp: bangkokNow
    };
  }, 30000);
}

/**
 * Menu 3: Sync Master Table to Individual Room Sheets (v1.1.3i)
 * Updates Scanned 69 (Col M), หมายเหตุปี 69 (Col N), and สติกเกอร์ (Col O) for matched inventory numbers.
 * Appends new/moved items after the last entry of the destination room sheet with FULL-ROW YELLOW HIGHLIGHT (#FFF2CC).
 */
function migrateMasterToRoomSheets(ss) {
  if (!ss) ss = getSpreadsheet();
  if (!ss) throw new Error("No active spreadsheet available.");
  
  return withLock(function() {
    var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
    if (!masterSheet) {
      throw new Error("Master sheet '" + MASTER_SHEET_NAME + "' does not exist. Please build master table first.");
    }
    
    var lastRow = masterSheet.getLastRow();
    if (lastRow <= 1) {
      return { success: true, message: "Master table has no data rows to migrate.", rowsMigrated: 0, rowsAppended: 0 };
    }
    
    var numCols = Math.max(6, masterSheet.getLastColumn());
    var mHeaders = masterSheet.getRange(1, 1, 1, numCols).getValues()[0].map(function(h) { return String(h || "").trim(); });
    var mAssetIdIdx = mHeaders.indexOf("Inventory number");
    if (mAssetIdIdx === -1) mAssetIdIdx = 0;
    var mDesc1Idx = mHeaders.indexOf("Asset description1");
    if (mDesc1Idx === -1) mDesc1Idx = 1;
    var mRoomIdx = mHeaders.indexOf("Room");
    if (mRoomIdx === -1) mRoomIdx = 2;
    var mScanned69Idx = mHeaders.indexOf("Scanned 69");
    if (mScanned69Idx === -1) mScanned69Idx = 3;
    var mResult69Idx = mHeaders.indexOf("หมายเหตุปี 69");
    if (mResult69Idx === -1) mResult69Idx = 4;
    var mStickerIdx = mHeaders.indexOf("สติกเกอร์");
    if (mStickerIdx === -1 && mHeaders.length > 5) mStickerIdx = 5;
    
    var masterData = masterSheet.getRange(2, 1, lastRow - 1, numCols).getValues();
    
    // Group master rows by canonical Room Sheet
    var rowsByRoom = {};
    for (var i = 0; i < masterData.length; i++) {
      var row = masterData[i];
      var assetId = String(row[mAssetIdIdx] || "").trim();
      if (!assetId) continue;
      
      var targetRoom = String(row[mRoomIdx] || "").trim();
      if (!targetRoom) continue;
      
      var targetSheet = getRoomSheetByName(ss, targetRoom);
      var canonicalSheetName = targetSheet ? targetSheet.getName() : targetRoom;
      
      if (!rowsByRoom[canonicalSheetName]) rowsByRoom[canonicalSheetName] = [];
      rowsByRoom[canonicalSheetName].push(row);
    }
    
    var totalMatched = 0;
    var totalAppended = 0;
    var sheetsAffected = 0;
    
    Object.keys(rowsByRoom).forEach(function(rName) {
      var sheet = getRoomSheetByName(ss, rName);
      if (!sheet) return;
      
      // Ensure sheet has at least 20 columns
      if (sheet.getMaxColumns() < 20) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), 20 - sheet.getMaxColumns());
      }
      
      var sLastRow = sheet.getLastRow();
      if (sLastRow < 5) return;
      
      var existingNumRows = Math.max(0, sLastRow - 5);
      var existingAssetMap = {}; // assetId -> array of rowOffsets (0-indexed from Row 6)
      var roomAuditCols = [];
      
      if (existingNumRows > 0) {
        var existingAssetIds = sheet.getRange(6, 2, existingNumRows, 1).getValues(); // Col B (Inventory number)
        roomAuditCols = sheet.getRange(6, 13, existingNumRows, 3).getValues(); // Cols M, N, O (Columns 13, 14, 15)
        for (var r = 0; r < existingNumRows; r++) {
          var aId = String(existingAssetIds[r][0] || "").trim().toUpperCase();
          if (aId) {
            if (!existingAssetMap[aId]) {
              existingAssetMap[aId] = [r];
            } else {
              existingAssetMap[aId].push(r);
            }
          }
        }
      }
      
      var masterRowsForRoom = rowsByRoom[rName];
      var matchedCount = 0;
      var newOrMovedRows = [];
      
      masterRowsForRoom.forEach(function(mRow) {
        var mAssetId = String(mRow[mAssetIdIdx] || "").trim().toUpperCase();
        var mDesc1 = String(mRow[mDesc1Idx] || "").trim();
        var mScanned69 = String(mRow[mScanned69Idx] || "").trim();
        var mResult69 = String(mRow[mResult69Idx] || "").trim();
        var mSticker = mStickerIdx !== -1 ? String(mRow[mStickerIdx] || "").trim() : "";
        var targetSticker = mSticker || (mScanned69 !== "" ? "ปกติ" : "");
        
        if (existingAssetMap.hasOwnProperty(mAssetId)) {
          // Matched existing asset on this room sheet -> update Cols M, N (and O auto-set to 'ปกติ' if scanned)
          var rIndices = existingAssetMap[mAssetId];
          for (var k = 0; k < rIndices.length; k++) {
            var rIdx = rIndices[k];
            roomAuditCols[rIdx][0] = mScanned69; // Col M (Scanned 69)
            roomAuditCols[rIdx][1] = mResult69;  // Col N (หมายเหตุปี 69)
            if (mScanned69 !== "" || mSticker) {
              roomAuditCols[rIdx][2] = targetSticker; // Col O (สติกเกอร์ -> "ปกติ" if scanned)
            }
          }
          matchedCount += rIndices.length;
        } else {
          // Unmatched asset (newly registered or moved from other room) -> append full 21-col row
          var newRow = new Array(21).fill("");
          newRow[0] = existingNumRows + newOrMovedRows.length + 1; // Col A (No.)
          newRow[1] = String(mRow[mAssetIdIdx] || "").trim();      // Col B (Inventory number)
          newRow[2] = "";                                          // Col C (Asset)
          newRow[3] = mDesc1;                                      // Col D (Asset description1)
          newRow[4] = "";                                          // Col E (Asset description2)
          newRow[5] = "";                                          // Col F (Curr.acq.value)
          newRow[6] = "";                                          // Col G (Original value)
          newRow[7] = "";                                          // Col H (Asset location)
          newRow[8] = rName;                                       // Col I (Room)
          newRow[9] = "";                                          // Col J (สภาพของสินทรัพย์)
          newRow[10] = "";                                         // Col K (Cap.date)
          newRow[11] = "";                                         // Col L (ปีงบฯที่ได้มา)
          newRow[12] = mScanned69;                                 // Col M (Scanned 69)
          newRow[13] = mResult69;                                  // Col N (หมายเหตุปี 69)
          newRow[14] = targetSticker;                              // Col O (สติกเกอร์ -> "ปกติ" if scanned)
          newRow[15] = "";                                         // Col P (Auditor)
          newOrMovedRows.push(newRow);
        }
      });
      
      var sheetHasChanges = false;
      
      // 1. Write back updated audit columns for existing matching rows in 1 batch call
      if (matchedCount > 0 && existingNumRows > 0) {
        sheet.getRange(6, 13, existingNumRows, 3).setValues(roomAuditCols);
        sheetHasChanges = true;
        totalMatched += matchedCount;
      }
      
      // 2. Append new or moved rows after the last entry with FULL-ROW YELLOW HIGHLIGHT (#FFF2CC)
      if (newOrMovedRows.length > 0) {
        var appendStartRow = Math.max(6, sheet.getLastRow() + 1);
        var appendRange = sheet.getRange(appendStartRow, 1, newOrMovedRows.length, 21);
        appendRange.setValues(newOrMovedRows);
        appendRange.setBackground("#FFF2CC"); // Full-row soft yellow highlight
        appendRange.setFontColor("#0f172a");
        try {
          appendRange.setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
          sheet.getRange(appendStartRow, 1, newOrMovedRows.length, 1).setHorizontalAlignment("center");
          sheet.getRange(appendStartRow, 2, newOrMovedRows.length, 1).setNumberFormat("@");
        } catch (fmtErr) {}
        sheetHasChanges = true;
        totalAppended += newOrMovedRows.length;
      }
      
      if (sheetHasChanges) {
        sheetsAffected++;
      }
    });
    
    try {
      CacheService.getScriptCache().remove("ASSET_ROUTER_INDEX");
      CacheService.getScriptCache().remove("MASTER_ASSET_CACHE");
    } catch (e) {}
    
    var msg = "Successfully migrated Master Table: " + totalMatched + " matched items updated, " + totalAppended + " new/moved items appended with yellow highlight across " + sheetsAffected + " room sheets.";
    logEvent("MIGRATE_MASTER_TO_ROOMS", "SUCCESS", 0, msg, {
      rowsMatched: totalMatched,
      rowsAppended: totalAppended,
      sheetsAffected: sheetsAffected
    });
    
    return {
      success: true,
      message: msg,
      rowsMigrated: totalMatched,
      rowsAppended: totalAppended,
      sheetsAffected: sheetsAffected,
      timestamp: getBangkokTimestamp()
    };
  }, 30000);
}

/**
 * Menu 4: Checks Master_Asset table for data contradictions and duplicate inventory numbers (v1.1.3e)
 * Identifies duplicates, inconsistencies, and highlights problematic rows in soft red on the Master_Asset sheet.
 */
function checkMasterTableContradictions(ss) {
  if (!ss) ss = getSpreadsheet();
  if (!ss) throw new Error("No active spreadsheet available.");
  
  var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    return {
      success: true,
      totalScanned: 0,
      duplicatesCount: 0,
      duplicatesList: [],
      missingIdCount: 0,
      missingIdRows: [],
      message: "Master Table is empty or not yet generated."
    };
  }

  var lastRow = masterSheet.getLastRow();
  var numRows = lastRow - 1;
  var numCols = Math.max(5, masterSheet.getLastColumn());
  var dataRange = masterSheet.getRange(2, 1, numRows, numCols);
  var data = dataRange.getValues();
  var headers = masterSheet.getRange(1, 1, 1, numCols).getValues()[0].map(function(h) { return String(h || "").trim(); });

  var idIdx = headers.indexOf("Inventory number");
  if (idIdx === -1) idIdx = 0;
  var desc1Idx = headers.indexOf("Asset description1");
  if (desc1Idx === -1) desc1Idx = 1;
  var roomIdx = headers.indexOf("Room");
  if (roomIdx === -1) roomIdx = 2;

  // Reset previous error background colors to default white
  dataRange.setBackground("#ffffff");

  var idOccurrences = {}; // id -> [ { row: 2, room: "Bio1", name: "..." } ]
  var missingIdRows = [];
  var totalScanned = 0;

  for (var i = 0; i < data.length; i++) {
    var rowNum = i + 2; // 1-indexed sheet row
    var row = data[i];
    var rawId = String(row[idIdx] || "").trim();
    var desc1 = String(row[desc1Idx] || "").trim();
    var roomVal = String(row[roomIdx] || "").trim();

    if (!rawId) {
      if (desc1 || roomVal) {
        missingIdRows.push(rowNum);
        masterSheet.getRange(rowNum, 1, 1, numCols).setBackground("#FEF3C7"); // Soft amber
      }
      continue;
    }

    totalScanned++;
    var cleanId = rawId.toUpperCase();
    if (!idOccurrences[cleanId]) {
      idOccurrences[cleanId] = [];
    }
    idOccurrences[cleanId].push({
      row: rowNum,
      assetId: rawId,
      room: roomVal,
      itemName: desc1
    });
  }

  var duplicatesList = [];
  var rowsToHighlightRed = [];

  Object.keys(idOccurrences).forEach(function(cleanId) {
    var occList = idOccurrences[cleanId];
    if (occList.length > 1) {
      var rows = occList.map(function(o) { return o.row; });
      var rooms = occList.map(function(o) { return o.room || "Unknown"; });
      var names = occList.map(function(o) { return o.itemName || "Unnamed"; });
      duplicatesList.push({
        assetId: occList[0].assetId,
        occurrences: occList.length,
        rows: rows,
        rooms: rooms,
        itemNames: names
      });
      rows.forEach(function(r) {
        rowsToHighlightRed.push(r);
      });
    }
  });

  // Highlight duplicate rows in soft red
  rowsToHighlightRed.forEach(function(r) {
    masterSheet.getRange(r, 1, 1, numCols).setBackground("#FEE2E2"); // Soft red (#FEE2E2)
    masterSheet.getRange(r, idIdx + 1).setBackground("#FECACA").setFontColor("#DC2626"); // Accent on ID
  });

  var msg = "";
  if (duplicatesList.length === 0 && missingIdRows.length === 0) {
    msg = "No contradictions found. All " + totalScanned + " assets in Master Table have unique inventory numbers.";
  } else {
    msg = "Found " + duplicatesList.length + " duplicate inventory numbers (" + rowsToHighlightRed.length + " total rows) and " + missingIdRows.length + " rows with missing IDs. Highlighted in Master_Asset sheet.";
  }

  return {
    success: true,
    totalScanned: totalScanned,
    duplicatesCount: duplicatesList.length,
    duplicateRowsCount: rowsToHighlightRed.length,
    duplicatesList: duplicatesList,
    missingIdCount: missingIdRows.length,
    missingIdRows: missingIdRows,
    message: msg
  };
}

/**
 * Fast Master Table Query Engine with Status and Room Filtering (5-Column Schema: B, D, I, M, N)
 */
function queryMasterTable(filters) {
  if (!filters) filters = {};
  var ss = getSpreadsheet();
  if (!ss) return { total: 0, items: [] };
  
  var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    buildMasterTableFromRooms(ss);
    masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
  }
  
  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    return { total: 0, items: [] };
  }
  
  var lastRow = masterSheet.getLastRow();
  var numCols = Math.max(5, masterSheet.getLastColumn());
  var data = masterSheet.getRange(1, 1, lastRow, numCols).getValues();
  var headers = data[0].map(function(h) { return String(h || "").trim(); });
  
  var idIdx = headers.indexOf("Inventory number");
  if (idIdx === -1) idIdx = 0;
  var desc1Idx = headers.indexOf("Asset description1");
  if (desc1Idx === -1) desc1Idx = 1;
  var roomIdx = headers.indexOf("Room");
  if (roomIdx === -1) roomIdx = 2;
  var scannedIdx = headers.indexOf("Scanned 69");
  if (scannedIdx === -1) scannedIdx = 3;
  var resultIdx = headers.indexOf("หมายเหตุปี 69");
  if (resultIdx === -1) resultIdx = 4;
  var stickerIdx = headers.indexOf("สติกเกอร์");
  
  var targetRoom = String(filters.room || "ALL").trim();
  var targetStatus = String(filters.status || "ALL").trim();
  var search = String(filters.search || "").trim().toLowerCase();
  
  var items = [];
  var verifiedCount = 0;
  var goodCount = 0;
  var damagedCount = 0;
  var missingCount = 0;
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var aId = String(row[idIdx] || "").trim();
    if (!aId) continue;
    
    var desc1 = String(row[desc1Idx] || "").trim();
    var rName = String(row[roomIdx] || "").trim();
    var scanned69 = String(row[scannedIdx] || "").trim();
    var result69 = String(row[resultIdx] || "").trim();
    var sticker = (stickerIdx !== -1 ? String(row[stickerIdx] || "").trim() : "") || "ปกติ";
    
    var isVerified = (scanned69 !== "");
    var derivedStatus = "";
    if (isVerified) {
      verifiedCount++;
      var statusKey = scanned69.toLowerCase();
      if (statusKey.indexOf("ชำรุด") !== -1 || statusKey.indexOf("damaged") !== -1) {
        derivedStatus = "Damaged";
        damagedCount++;
      } else if (statusKey.indexOf("สูญหาย") !== -1 || statusKey.indexOf("หาไม่เจอ") !== -1 || statusKey.indexOf("missing") !== -1 || statusKey.indexOf("ไม่พบ") !== -1) {
        derivedStatus = "Missing";
        missingCount++;
      } else {
        derivedStatus = "Good";
        goodCount++;
      }
    }
    
    if (targetRoom !== "ALL" && rName.toLowerCase() !== targetRoom.toLowerCase()) continue;
    if (targetStatus === "UNVERIFIED" && isVerified) continue;
    if (targetStatus === "VERIFIED" && !isVerified) continue;
    if (targetStatus === "Good" && derivedStatus !== "Good") continue;
    if (targetStatus === "Damaged" && derivedStatus !== "Damaged") continue;
    if (targetStatus === "Missing" && derivedStatus !== "Missing") continue;
    if (targetStatus !== "ALL" && targetStatus !== "UNVERIFIED" && targetStatus !== "VERIFIED" && targetStatus !== "Good" && targetStatus !== "Damaged" && targetStatus !== "Missing") {
      if (derivedStatus.toLowerCase() !== targetStatus.toLowerCase()) continue;
    }
    
    if (search) {
      var matchSearch = aId.toLowerCase().indexOf(search) !== -1 ||
                        desc1.toLowerCase().indexOf(search) !== -1 ||
                        rName.toLowerCase().indexOf(search) !== -1 ||
                        result69.toLowerCase().indexOf(search) !== -1;
      if (!matchSearch) continue;
    }
    
    items.push({
      assetId: aId,
      no: i,
      itemName: desc1 || "Unnamed Asset",
      registeredLocation: rName,
      sheetName: rName,
      rowIndex: i + 1,
      status: derivedStatus,
      scanned69: scanned69,
      auditResult69: result69,
      sticker: sticker,
      isVerified: isVerified
    });
  }
  
  return {
    total: items.length,
    items: items,
    summary: {
      total: items.length,
      verified: verifiedCount,
      unverified: items.length - verifiedCount,
      good: goodCount,
      damaged: damagedCount,
      missing: missingCount
    }
  };
}

/**
 * Retrieves aggregate usage and audit statistics across all rooms and the Stats sheet
 */
function getAppUsageStats() {
  var ss = getSpreadsheet();
  if (!ss) throw new Error("No active spreadsheet available.");
  
  var roomSheets = getRoomSheets(ss);
  var totalAssets = 0;
  var totalAudited = 0;
  var statusCounts = {};
  var stickerCounts = {};
  var auditorCounts = {};
  var roomBreakdown = [];
  
  roomSheets.forEach(function(rInfo) {
    var sheet = ss.getSheetByName(rInfo.name);
    if (!sheet) return;
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 6) {
      roomBreakdown.push({
        room: rInfo.name,
        total: 0,
        audited: 0,
        percent: 0
      });
      return;
    }
    
    var schema = detectSheetHeaderAndColumns(sheet);
    var numRows = lastRow - 5;
    var invCol = schema.colMap.inventoryNumber || 2;
    var scannedCol = schema.scanned69Col !== -1 ? schema.scanned69Col : 13;
    var stickerCol = schema.stickerCol !== -1 ? schema.stickerCol : 15;
    var auditorCol = schema.auditorCol !== -1 ? schema.auditorCol : 16;
    
    var maxColToFetch = Math.max(invCol, scannedCol, stickerCol, auditorCol, 16);
    var grid = sheet.getRange(6, 1, numRows, maxColToFetch).getValues();
    
    var roomTotal = 0;
    var roomAudited = 0;
    
    for (var r = 0; r < grid.length; r++) {
      var row = grid[r];
      var inv = String(row[invCol - 1] || "").trim();
      if (!inv) continue;
      
      roomTotal++;
      totalAssets++;
      
      var scanned = String(row[scannedCol - 1] || "").trim();
      var stk = String(row[stickerCol - 1] || "").trim();
      var auditor = String(row[auditorCol - 1] || "").trim();
      
      if (scanned) {
        roomAudited++;
        totalAudited++;
        
        statusCounts[scanned] = (statusCounts[scanned] || 0) + 1;
        
        var effectiveStk = stk || "ปกติ";
        stickerCounts[effectiveStk] = (stickerCounts[effectiveStk] || 0) + 1;
        
        if (auditor) {
          auditorCounts[auditor] = (auditorCounts[auditor] || 0) + 1;
        } else {
          auditorCounts["Unassigned"] = (auditorCounts["Unassigned"] || 0) + 1;
        }
      }
    }
    
    roomBreakdown.push({
      room: rInfo.name,
      total: roomTotal,
      audited: roomAudited,
      percent: roomTotal > 0 ? Math.round((roomAudited / roomTotal) * 1000) / 10 : 0
    });
  });
  
  // Sort rooms by percent descending
  roomBreakdown.sort(function(a, b) { return b.percent - a.percent; });
  
  // Convert auditorCounts to array
  var auditorLeaderboard = Object.keys(auditorCounts).map(function(name) {
    return { name: name, count: auditorCounts[name] };
  }).sort(function(a, b) { return b.count - a.count; });
  
  var percentComplete = totalAssets > 0 ? Math.round((totalAudited / totalAssets) * 1000) / 10 : 0;
  
  return {
    success: true,
    stats: {
      totalAssets: totalAssets,
      totalAudited: totalAudited,
      totalRemaining: totalAssets - totalAudited,
      percentComplete: percentComplete,
      statusCounts: statusCounts,
      stickerCounts: stickerCounts,
      auditorLeaderboard: auditorLeaderboard,
      roomBreakdown: roomBreakdown,
      timestamp: getBangkokTimestamp()
    }
  };
}

