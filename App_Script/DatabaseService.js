/**
 * DatabaseService.js — Dynamic Multi-Sheet Router & In-Place Mutation Engine
 * Project 08: QR-Based Mobile Asset Survey App (v1.1.0e)
 * MUIDS Lab Oops OS — Science Department
 * 
 * Non-invasive Procurement Parser: Reads merged headers, preserves raw data,
 * and maps survey results into 'หมายเหตุปี 69' and 'Sticker' columns.
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
  var propVal = props.getProperty(cacheKey);
  if (propVal) {
    try {
      cache.put(cacheKey, propVal, 21600); // 6 hours
      return JSON.parse(propVal);
    } catch (e) {}
  }
  
  try {
    var ss = SpreadsheetApp.openById(NEXUS_SPREADSHEET_ID);
    var sheet = ss.getSheetByName("Room");
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
        floor: Number(obj.Floor || 2),
        roomType: String(obj.RoomType || "Lab").trim()
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
    { roomId: "room_06", roomName: "Chem1", sourceSystemCode: "ChemLab1", floor: 2, roomType: "Lab" },
    { roomId: "room_07", roomName: "Chem2", sourceSystemCode: "ChemLab2", floor: 2, roomType: "ChemicalLab" },
    { roomId: "room_08", roomName: "Physics1", sourceSystemCode: "Physics 1", floor: 2, roomType: "Lab" },
    { roomId: "room_09", roomName: "Physics2", sourceSystemCode: "Physics 2", floor: 2, roomType: "Lab" },
    { roomId: "room_13", roomName: "Bio1", sourceSystemCode: "BioLab1", floor: 3, roomType: "ChemicalLab" },
    { roomId: "room_14", roomName: "Bio2", sourceSystemCode: "BioLab2", floor: 3, roomType: "BioSafetyLab" },
    { roomId: "room_01", roomName: "208", sourceSystemCode: "S208", floor: 2, roomType: "Classroom" },
    { roomId: "room_02", roomName: "210", sourceSystemCode: "S210", floor: 2, roomType: "Classroom" },
    { roomId: "room_03", roomName: "215", sourceSystemCode: "S215", floor: 2, roomType: "Classroom" },
    { roomId: "room_04", roomName: "216", sourceSystemCode: "S216", floor: 2, roomType: "Classroom" },
    { roomId: "room_05", roomName: "217", sourceSystemCode: "S217", floor: 2, roomType: "Classroom" },
    { roomId: "room_10", roomName: "308", sourceSystemCode: "S308", floor: 3, roomType: "Classroom" },
    { roomId: "room_11", roomName: "309", sourceSystemCode: "S309", floor: 3, roomType: "Classroom" },
    { roomId: "room_12", roomName: "310", sourceSystemCode: "S310", floor: 3, roomType: "Classroom" }
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
        roomType: matchedKernel ? matchedKernel.roomType : "InventoryLab",
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

/**
 * Inspects all room sheets and determines dynamic Room Types
 * Cross-references with Project 00 Kernel Room directory
 */
function inspectDynamicRoomTypes(ss) {
  if (!ss) ss = getSpreadsheet();
  if (!ss) return { roomMap: {}, roomTypes: ["ALL"] };
  
  var cache = CacheService.getScriptCache();
  var cached = cache.get("DYNAMIC_ROOM_TYPES_CACHE");
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }
  
  var roomSheets = getRoomSheets(ss);
  var kernelRooms = getNexusRoomDirectory();
  var roomMap = {};
  var typeSet = { "ALL": true };
  
  roomSheets.forEach(function(r) {
    var assignedType = r.roomType || "Lab";
    
    // Fine-tune room type by room name keywords if generic
    var nameLower = r.name.toLowerCase();
    if (nameLower.indexOf("chem") !== -1) {
      assignedType = "ChemicalLab";
    } else if (nameLower.indexOf("bio") !== -1) {
      assignedType = "BioSafetyLab";
    } else if (nameLower.indexOf("phys") !== -1) {
      assignedType = "PhysicsLab";
    } else if (nameLower.indexOf("prep") !== -1) {
      assignedType = "PrepRoom";
    } else if (nameLower.match(/^\d{3}$/)) {
      var kMatch = kernelRooms.find(function(k) { return k.roomName === r.name; });
      if (kMatch && kMatch.roomType) {
        assignedType = kMatch.roomType;
      } else {
        assignedType = "Lab";
      }
    }
    
    roomMap[r.name] = {
      sheetName: r.name,
      roomCode: r.canonicalName || r.name,
      roomType: assignedType,
      floor: r.floor || 2
    };
    typeSet[assignedType] = true;
  });
  
  var result = {
    roomMap: roomMap,
    roomTypes: Object.keys(typeSet)
  };
  
  try {
    cache.put("DYNAMIC_ROOM_TYPES_CACHE", JSON.stringify(result), 21600);
  } catch (e) {}
  
  return result;
}

const START_COL_M = 13; // Column M is 13 (1-indexed)
const AUDIT_COLUMNS_ROW5_HARDCODED = [
  "หมายเหตุปี 69", // Col M (13)
  "สติกเกอร์",      // Col N (14)
  "ปี68",           // Col O (15)
  "ปี67",           // Col P (16)
  "ปี66",           // Col Q (17)
  "ปี64",           // Col R (18)
  "ปี63"            // Col S (19)
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
 * At Row 5, hardcodes the 7 audit & historical columns to start strictly at Column M (Column 13):
 * Col M (13): "หมายเหตุปี 69"
 * Col N (14): "สติกเกอร์"
 * Col O (15): "ปี68"
 * Col P (16): "ปี67"
 * Col Q (17): "ปี66"
 * Col R (18): "ปี64"
 * Col S (19): "ปี63"
 * 
 * In addition, repairs and cleans up any accidental audit headers written into Columns 1 to 12 (A to L) on Row 5.
 */
function setupRow5AuditHeaders(ss) {
  if (!ss) ss = getSpreadsheet();
  if (!ss) throw new Error("No active spreadsheet available.");
  
  var roomSheets = getRoomSheets(ss);
  var targetColumns = AUDIT_COLUMNS_ROW5_HARDCODED;
  var results = [];
  
  roomSheets.forEach(function(roomInfo) {
    var sheet = ss.getSheetByName(roomInfo.name);
    if (!sheet) return;
    
    // Ensure sheet has at least 19 columns (up to Col S)
    if (sheet.getMaxColumns() < 19) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), 19 - sheet.getMaxColumns());
    }
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 5) {
      sheet.insertRowsAfter(sheet.getMaxRows(), 5 - sheet.getMaxRows());
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
                             cellVal.indexOf("สติก") !== -1;
                             
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
    
    // STEP 2: HARDCODE ROW 5 AUDIT COLUMNS STARTING AT COLUMN M (COL 13)
    for (var i = 0; i < targetColumns.length; i++) {
      var colHeader = targetColumns[i];
      var colIndex = START_COL_M + i; // 13, 14, 15, 16, 17, 18, 19
      
      var cellRange = sheet.getRange(5, colIndex);
      cellRange.setValue(colHeader)
        .setFontWeight("bold")
        .setBackground("#0f172a")
        .setHorizontalAlignment("center");
        
      if (colHeader === "หมายเหตุปี 69") {
        cellRange.setFontColor("#34d399"); // Emerald
      } else if (colHeader === "สติกเกอร์") {
        cellRange.setFontColor("#38bdf8"); // Cyan
      } else {
        cellRange.setFontColor("#94a3b8"); // Slate
      }
    }
    
    results.push({
      sheetName: roomInfo.name,
      startCol: "M (13)",
      columnsAdded: targetColumns.length,
      columnsRange: "M5:S5",
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
    message: "Row 5 audit headers successfully hardcoded to Column M across " + results.length + " room sheets. Repaired any misaligned headers on Columns A-L.",
    sheetsConfigured: results.length,
    startColumn: "M (Column 13)",
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
  var result69Col = -1;
  var stickerCol = -1;
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
    } else if (combinedHeader.indexOf("หมายเหตุปี 69") !== -1 || combinedHeader.indexOf("ผลปี 69") !== -1 || combinedHeader.indexOf("ปี 69") !== -1 || combinedHeader.indexOf("ปี69") !== -1) {
      result69Col = c;
    } else if (combinedHeader.indexOf("sticker") !== -1 || combinedHeader.indexOf("สติกเกอร์") !== -1 || combinedHeader.indexOf("สติ๊กเกอร์") !== -1) {
      stickerCol = c;
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
    if (result69Col === -1) result69Col = 13; // Column M
    if (stickerCol === -1 && lastCol >= 14) stickerCol = 14; // Column N
    if (!historicalCols["68"] && lastCol >= 15) historicalCols["68"] = 15; // Column O
    if (!historicalCols["67"] && lastCol >= 16) historicalCols["67"] = 16; // Column P
    if (!historicalCols["66"] && lastCol >= 17) historicalCols["66"] = 17; // Column Q
    if (!historicalCols["64"] && lastCol >= 18) historicalCols["64"] = 18; // Column R
    if (!historicalCols["63"] && lastCol >= 19) historicalCols["63"] = 19; // Column S
  }

  if (lastRow >= 5 && detectedHeaderRow <= 5) {
    detectedHeaderRow = 5;
  }

  return {
    headerRow: detectedHeaderRow,
    dataStartRow: detectedHeaderRow + 1,
    colMap: colMap,
    result69Col: result69Col,
    stickerCol: stickerCol,
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
      
      // Check current audit result in 'หมายเหตุปี 69'
      var result69Val = (schema.result69Col !== -1) ? String(row[schema.result69Col - 1] || "").trim() : "";
      var stickerVal = (schema.stickerCol !== -1) ? String(row[schema.stickerCol - 1] || "").trim() : "";
      
      // Determine verified status
      var statusDerived = "Unverified";
      var isVerified = false;
      
      if (result69Val !== "") {
        isVerified = true;
        verifiedCount++;
        var rLow = result69Val.toLowerCase();
        if (rLow.indexOf("good") !== -1 || rLow.indexOf("ปกติ") !== -1 || rLow.indexOf("ดี") !== -1) {
          statusDerived = "Good";
          goodCount++;
        } else if (rLow.indexOf("damaged") !== -1 || rLow.indexOf("ชำรุด") !== -1) {
          statusDerived = "Damaged";
          damagedCount++;
        } else if (rLow.indexOf("missing") !== -1 || rLow.indexOf("สูญหาย") !== -1) {
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
        auditResult69: result69Val,
        sticker: stickerVal || (isVerified ? "Yes" : "No"),
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
 * Dynamic Multi-Sheet Router: Searches across all room worksheets
 */
function lookupAsset(rawCode) {
  var code = cleanAssetCode(rawCode);
  if (!code) return { found: false, error: "Empty asset code provided." };
  
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
    error: "Inventory Number '" + code + "' was not found in any registered laboratory room."
  };
}

/**
 * 1-Tap Status In-Place Mutation Engine
 * Updates ONLY 'หมายเหตุปี 69' and 'Sticker' in the target room worksheet!
 */
function updateAssetStatus(payload) {
  return withLock(function() {
    var rawAssetId = cleanAssetCode(payload.assetId);
    var newStatus = String(payload.status || "").trim();
    var notes = String(payload.notes || "").trim();
    var currentRoom = String(payload.currentRoom || "").trim();
    var authUser = authenticateSession();
    
    if (!rawAssetId) {
      throw new Error("Missing asset inventory number.");
    }
    
    var validStatuses = ["Good", "Damaged", "Missing"];
    if (validStatuses.indexOf(newStatus) === -1) {
      throw new Error("Invalid status: " + newStatus + ". Permitted values: " + validStatuses.join(", "));
    }
    
    var ss = getSpreadsheet();
    if (!ss) throw new Error("No active spreadsheet available.");
    
    // Resolve sheet and row
    var targetSheetName = payload.sheetName;
    var targetRowIndex = payload.rowIndex;
    
    if (!targetSheetName || !targetRowIndex) {
      var lookup = lookupAsset(rawAssetId);
      if (!lookup.found) {
        throw new Error("Cannot update: Asset '" + rawAssetId + "' not found.");
      }
      targetSheetName = lookup.asset.sheetName;
      targetRowIndex = lookup.asset.rowIndex;
    }
    
    var sheet = ss.getSheetByName(targetSheetName);
    if (!sheet) throw new Error("Sheet tab '" + targetSheetName + "' not found.");
    
    var schema = detectSheetHeaderAndColumns(sheet);
    var lastCol = sheet.getLastColumn();
    
    // Ensure 'หมายเหตุปี 69' column exists on this sheet
    var resultCol = schema.result69Col;
    if (resultCol === -1) {
      resultCol = lastCol + 1;
      sheet.getRange(schema.headerRow, resultCol).setValue(PROCUREMENT_COLUMNS.AUDIT_RESULT_69)
        .setFontWeight("bold")
        .setBackground("#0f172a")
        .setFontColor("#34d399");
      lastCol++;
    }

    // Ensure 'Sticker' column exists on this sheet
    var stickerCol = schema.stickerCol;
    if (stickerCol === -1) {
      stickerCol = lastCol + 1;
      sheet.getRange(schema.headerRow, stickerCol).setValue(PROCUREMENT_COLUMNS.STICKER)
        .setFontWeight("bold")
        .setBackground("#0f172a")
        .setFontColor("#38bdf8");
    }

    // Verify row still points to the asset
    var assetIdCol = schema.colMap.inventoryNumber || 2;
    var currentRowAssetId = String(sheet.getRange(targetRowIndex, assetIdCol).getValue() || "").trim();
    
    if (currentRowAssetId.toUpperCase() !== rawAssetId.toUpperCase()) {
      var values = sheet.getRange(schema.dataStartRow, assetIdCol, sheet.getLastRow() - schema.dataStartRow + 1, 1).getValues();
      var foundRow = -1;
      for (var i = 0; i < values.length; i++) {
        if (String(values[i][0] || "").trim().toUpperCase() === rawAssetId.toUpperCase()) {
          foundRow = schema.dataStartRow + i;
          break;
        }
      }
      if (foundRow === -1) {
        throw new Error("Row alignment check failed: could not re-locate " + rawAssetId);
      }
      targetRowIndex = foundRow;
    }
    
    // Format audit result string for 'หมายเหตุปี 69'
    var resultText = newStatus;
    if (notes) {
      resultText += " (" + notes + ")";
    }
    if (currentRoom && currentRoom !== "ALL" && currentRoom !== targetSheetName) {
      resultText += " [Found in " + currentRoom + "]";
    }

    // Write in-place to the target row
    sheet.getRange(targetRowIndex, resultCol).setValue(resultText);
    sheet.getRange(targetRowIndex, stickerCol).setValue("Yes");
    
    // Invalidate local cache
    try {
      CacheService.getScriptCache().remove("ASSET_ROUTER_INDEX");
    } catch (e) {}
    
    logEvent("UPDATE_ASSET_STATUS", "SUCCESS", 0, "Asset " + rawAssetId + " recorded in " + PROCUREMENT_COLUMNS.AUDIT_RESULT_69 + " as " + resultText, {
      assetId: rawAssetId,
      sheet: targetSheetName,
      row: targetRowIndex,
      status: newStatus,
      result69: resultText,
      sticker: "Yes"
    });
    
    return {
      success: true,
      assetId: rawAssetId,
      sheetName: targetSheetName,
      rowIndex: targetRowIndex,
      status: newStatus,
      auditResult69: resultText,
      sticker: "Yes",
      roomSummary: getRoomAuditSummary(targetSheetName)
    };
  }, 30000);
}

/**
 * Returns audit statistics and items checklist for a given room or all rooms
 */
function getRoomAuditSummary(roomName) {
  var ss = getSpreadsheet();
  if (!ss) return { total: 0, verified: 0, unverified: 0, items: [] };
  
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
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol === 0) return;
    
    var schema = detectSheetHeaderAndColumns(sheet);
    var startRow = schema.dataStartRow;
    if (startRow > lastRow) return;
    
    var values = sheet.getRange(startRow, 1, lastRow - startRow + 1, lastCol).getValues();
    
    for (var r = 0; r < values.length; r++) {
      var row = values[r];
      var aId = String(row[schema.colMap.inventoryNumber - 1] || "").trim();
      if (!aId) continue;
      
      total++;
      var result69Val = (schema.result69Col !== -1) ? String(row[schema.result69Col - 1] || "").trim() : "";
      var stickerVal = (schema.stickerCol !== -1) ? String(row[schema.stickerCol - 1] || "").trim() : "";
      
      var isVerified = (result69Val !== "");
      var statusVal = "Unverified";
      
      if (isVerified) {
        verified++;
        var rLow = result69Val.toLowerCase();
        if (rLow.indexOf("good") !== -1 || rLow.indexOf("ปกติ") !== -1 || rLow.indexOf("ดี") !== -1) {
          statusVal = "Good";
          good++;
        } else if (rLow.indexOf("damaged") !== -1 || rLow.indexOf("ชำรุด") !== -1) {
          statusVal = "Damaged";
          damaged++;
        } else if (rLow.indexOf("missing") !== -1 || rLow.indexOf("สูญหาย") !== -1) {
          statusVal = "Missing";
          missing++;
        } else {
          statusVal = "Good";
          good++;
        }
      }
      
      var itemName = schema.colMap.description1 ? String(row[schema.colMap.description1 - 1] || "").trim() : "Unnamed";
      var brandModel = schema.colMap.description2 ? String(row[schema.colMap.description2 - 1] || "").trim() : "";
      var roomLocation = schema.colMap.room ? String(row[schema.colMap.room - 1] || "").trim() : rName;
      var procurementCondition = schema.colMap.conditionThai ? String(row[schema.colMap.conditionThai - 1] || "").trim() : "";
      var noVal = schema.colMap.no ? String(row[schema.colMap.no - 1] || "").trim() : (r + 1);

      var historicalData = {};
      Object.keys(schema.historicalCols).forEach(function(yr) {
        historicalData[yr] = String(row[schema.historicalCols[yr] - 1] || "").trim();
      });
      
      items.push({
        assetId: aId,
        no: noVal,
        itemName: itemName,
        brandModel: brandModel,
        registeredLocation: roomLocation || rName,
        sheetName: rName,
        rowIndex: startRow + r,
        status: statusVal,
        auditResult69: result69Val,
        sticker: stickerVal || (isVerified ? "Yes" : "No"),
        procurementCondition: procurementCondition,
        historicalResults: historicalData
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
  var kernelRooms = getNexusRoomDirectory();
  var dynamicRoomData = ss ? inspectDynamicRoomTypes(ss) : { roomTypes: ["ALL", "Lab", "ChemicalLab", "BioSafetyLab", "Classroom", "PrepRoom"], roomMap: {} };
  
  var defaultRoom = rooms.length > 0 ? rooms[0] : "ALL";
  var initialSummary = getRoomAuditSummary(defaultRoom);
  
  return {
    user: authUser,
    config: config,
    rooms: rooms,
    roomSheets: roomSheets,
    kernelRooms: kernelRooms,
    roomTypes: dynamicRoomData.roomTypes,
    roomMap: dynamicRoomData.roomMap,
    currentRoom: defaultRoom,
    summary: initialSummary,
    spreadsheetId: ss ? ss.getId() : DEFAULT_ASSET_SPREADSHEET_ID
  };
}

/**
 * Creates/refreshes Master Table ('Master_Asset') from all room worksheets
 * Populates only essential columns + dynamic room type
 */
function buildMasterTableFromRooms(ss) {
  if (!ss) ss = getSpreadsheet();
  if (!ss) throw new Error("No active spreadsheet available.");
  
  return withLock(function() {
    var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
    if (!masterSheet) {
      masterSheet = ss.insertSheet(MASTER_SHEET_NAME);
    }
    
    var roomInspection = inspectDynamicRoomTypes(ss);
    var roomSheets = getRoomSheets(ss);
    var masterHeaders = MASTER_ESSENTIAL_COLUMNS;
    
    var masterRows = [];
    var bangkokNow = getBangkokTimestamp();
    
    roomSheets.forEach(function(roomInfo) {
      var sheet = ss.getSheetByName(roomInfo.name);
      if (!sheet) return;
      
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow <= 1 || lastCol === 0) return;
      
      var schema = detectSheetHeaderAndColumns(sheet);
      var startRow = schema.dataStartRow;
      if (startRow > lastRow) return;
      
      var values = sheet.getRange(startRow, 1, lastRow - startRow + 1, lastCol).getValues();
      var roomMeta = roomInspection.roomMap[roomInfo.name] || { roomType: "Lab" };
      
      for (var r = 0; r < values.length; r++) {
        var row = values[r];
        var assetId = String(row[schema.colMap.inventoryNumber - 1] || "").trim();
        if (!assetId) continue;
        
        var noVal = schema.colMap.no ? String(row[schema.colMap.no - 1] || "").trim() : (r + 1);
        var desc1 = schema.colMap.description1 ? String(row[schema.colMap.description1 - 1] || "").trim() : "";
        var desc2 = schema.colMap.description2 ? String(row[schema.colMap.description2 - 1] || "").trim() : "";
        var roomVal = schema.colMap.room ? String(row[schema.colMap.room - 1] || "").trim() : roomInfo.name;
        var condition = schema.colMap.conditionThai ? String(row[schema.colMap.conditionThai - 1] || "").trim() : "";
        var fiscalYear = schema.colMap.fiscalYear ? String(row[schema.colMap.fiscalYear - 1] || "").trim() : "";
        
        var result69 = (schema.result69Col !== -1) ? String(row[schema.result69Col - 1] || "").trim() : "";
        var sticker = (schema.stickerCol !== -1) ? String(row[schema.stickerCol - 1] || "").trim() : (result69 ? "Yes" : "No");
        
        var yr68 = schema.historicalCols["68"] ? String(row[schema.historicalCols["68"] - 1] || "").trim() : "";
        var yr67 = schema.historicalCols["67"] ? String(row[schema.historicalCols["67"] - 1] || "").trim() : "";
        var yr66 = schema.historicalCols["66"] ? String(row[schema.historicalCols["66"] - 1] || "").trim() : "";
        var yr64 = schema.historicalCols["64"] ? String(row[schema.historicalCols["64"] - 1] || "").trim() : "";
        var yr63 = schema.historicalCols["63"] ? String(row[schema.historicalCols["63"] - 1] || "").trim() : "";
        
        masterRows.push([
          noVal,
          assetId,
          desc1,
          desc2,
          roomVal || roomInfo.name,
          roomMeta.roomType,
          condition,
          fiscalYear,
          result69,
          sticker,
          yr68,
          yr67,
          yr66,
          yr64,
          yr63,
          roomInfo.name,
          bangkokNow
        ]);
      }
    });
    
    // Clear and write to Master Sheet
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
    
    // Cache master snapshot
    try {
      CacheService.getScriptCache().remove("MASTER_ASSET_CACHE");
      CacheService.getScriptCache().remove("ASSET_ROUTER_INDEX");
    } catch (e) {}
    
    logEvent("BUILD_MASTER_TABLE", "SUCCESS", 0, "Master Table built with " + masterRows.length + " assets across " + roomSheets.length + " rooms.", {
      totalAssets: masterRows.length,
      roomsProcessed: roomSheets.length
    });
    
    return {
      success: true,
      message: "Master Table built with " + masterRows.length + " assets across " + roomSheets.length + " rooms.",
      totalAssets: masterRows.length,
      roomsProcessed: roomSheets.length,
      timestamp: bangkokNow
    };
  }, 30000);
}

/**
 * Migrates audit results ('หมายเหตุปี 69' and 'สติกเกอร์') from Master Table to individual room sheets
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
    var lastCol = masterSheet.getLastColumn();
    if (lastRow <= 1) {
      return { success: true, message: "Master table has no data rows to migrate.", rowsMigrated: 0 };
    }
    
    var masterData = masterSheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = masterData[0].map(function(h) { return String(h || "").trim(); });
    
    var assetIdIdx = headers.indexOf("Inventory number");
    var result69Idx = headers.indexOf("หมายเหตุปี 69");
    var stickerIdx = headers.indexOf("สติกเกอร์");
    var sourceSheetIdx = headers.indexOf("SourceSheet");
    var roomIdx = headers.indexOf("Room");
    var yr68Idx = headers.indexOf("ปี68");
    var yr67Idx = headers.indexOf("ปี67");
    var yr66Idx = headers.indexOf("ปี66");
    var yr64Idx = headers.indexOf("ปี64");
    var yr63Idx = headers.indexOf("ปี63");
    
    if (assetIdIdx === -1) {
      throw new Error("Master table is missing 'Inventory number' column.");
    }
    
    var updatesBySheet = {};
    for (var i = 1; i < masterData.length; i++) {
      var row = masterData[i];
      var assetId = String(row[assetIdIdx] || "").trim();
      if (!assetId) continue;
      
      var targetSheetName = String((sourceSheetIdx !== -1 ? row[sourceSheetIdx] : "") || (roomIdx !== -1 ? row[roomIdx] : "")).trim();
      if (!targetSheetName) continue;
      
      if (!updatesBySheet[targetSheetName]) updatesBySheet[targetSheetName] = [];
      updatesBySheet[targetSheetName].push({
        assetId: assetId,
        result69: (result69Idx !== -1) ? String(row[result69Idx] || "").trim() : "",
        sticker: (stickerIdx !== -1) ? String(row[stickerIdx] || "").trim() : "",
        yr68: (yr68Idx !== -1) ? String(row[yr68Idx] || "").trim() : "",
        yr67: (yr67Idx !== -1) ? String(row[yr67Idx] || "").trim() : "",
        yr66: (yr66Idx !== -1) ? String(row[yr66Idx] || "").trim() : "",
        yr64: (yr64Idx !== -1) ? String(row[yr64Idx] || "").trim() : "",
        yr63: (yr63Idx !== -1) ? String(row[yr63Idx] || "").trim() : ""
      });
    }
    
    var totalMigrated = 0;
    var sheetsAffected = 0;
    
    Object.keys(updatesBySheet).forEach(function(sName) {
      var sheet = getRoomSheetByName(ss, sName);
      if (!sheet) return;
      
      var schema = detectSheetHeaderAndColumns(sheet);
      var sLastRow = sheet.getLastRow();
      var sLastCol = sheet.getLastColumn();
      if (sLastRow < schema.dataStartRow || sLastCol === 0) return;
      
      var res69Col = schema.result69Col;
      var stickCol = schema.stickerCol;
      
      if (res69Col === -1 || stickCol === -1) {
        setupRow5AuditHeaders(ss);
        schema = detectSheetHeaderAndColumns(sheet);
        res69Col = schema.result69Col;
        stickCol = schema.stickerCol;
      }
      
      var assetColIdx = schema.colMap.inventoryNumber || 2;
      var rowRange = sheet.getRange(schema.dataStartRow, assetColIdx, sLastRow - schema.dataStartRow + 1, 1).getValues();
      var rowMap = {};
      for (var r = 0; r < rowRange.length; r++) {
        var id = String(rowRange[r][0] || "").trim().toUpperCase();
        if (id) rowMap[id] = schema.dataStartRow + r;
      }
      
      var sheetUpdates = updatesBySheet[sName];
      sheetUpdates.forEach(function(item) {
        var targetRow = rowMap[item.assetId.toUpperCase()];
        if (targetRow) {
          if (res69Col !== -1 && item.result69 !== "") {
            sheet.getRange(targetRow, res69Col).setValue(item.result69);
          }
          if (stickCol !== -1 && item.sticker !== "") {
            sheet.getRange(targetRow, stickCol).setValue(item.sticker);
          }
          
          if (schema.historicalCols["68"] && item.yr68 !== "") sheet.getRange(targetRow, schema.historicalCols["68"]).setValue(item.yr68);
          if (schema.historicalCols["67"] && item.yr67 !== "") sheet.getRange(targetRow, schema.historicalCols["67"]).setValue(item.yr67);
          if (schema.historicalCols["66"] && item.yr66 !== "") sheet.getRange(targetRow, schema.historicalCols["66"]).setValue(item.yr66);
          if (schema.historicalCols["64"] && item.yr64 !== "") sheet.getRange(targetRow, schema.historicalCols["64"]).setValue(item.yr64);
          if (schema.historicalCols["63"] && item.yr63 !== "") sheet.getRange(targetRow, schema.historicalCols["63"]).setValue(item.yr63);
          
          totalMigrated++;
        }
      });
      sheetsAffected++;
    });
    
    try {
      CacheService.getScriptCache().remove("ASSET_ROUTER_INDEX");
    } catch (e) {}
    
    logEvent("MIGRATE_MASTER_TO_ROOMS", "SUCCESS", 0, "Migrated " + totalMigrated + " assets to " + sheetsAffected + " room sheets.", {
      rowsMigrated: totalMigrated,
      sheetsAffected: sheetsAffected
    });
    
    return {
      success: true,
      message: "Successfully migrated " + totalMigrated + " asset records across " + sheetsAffected + " room sheets.",
      rowsMigrated: totalMigrated,
      sheetsAffected: sheetsAffected,
      timestamp: getBangkokTimestamp()
    };
  }, 30000);
}

/**
 * Fast Master Table Query Engine with Dynamic Room Type and Room Filtering
 */
function queryMasterTable(filters) {
  if (!filters) filters = {};
  var ss = getSpreadsheet();
  if (!ss) return { total: 0, items: [], roomTypes: [] };
  
  var roomInspection = inspectDynamicRoomTypes(ss);
  var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
  
  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    buildMasterTableFromRooms(ss);
    masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
  }
  
  if (!masterSheet || masterSheet.getLastRow() <= 1) {
    return { total: 0, items: [], roomTypes: roomInspection.roomTypes };
  }
  
  var lastRow = masterSheet.getLastRow();
  var lastCol = masterSheet.getLastColumn();
  var data = masterSheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0].map(function(h) { return String(h || "").trim(); });
  
  var targetRoomType = String(filters.roomType || "ALL").trim();
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
    var item = {};
    headers.forEach(function(h, idx) {
      item[h] = row[idx];
    });
    
    var rType = String(item.RoomType || "Lab").trim();
    var rName = String(item.Room || item.SourceSheet || "").trim();
    var result69 = String(item["หมายเหตุปี 69"] || "").trim();
    var sticker = String(item["สติกเกอร์"] || "").trim();
    
    var derivedStatus = "Unverified";
    var isVerified = (result69 !== "");
    if (isVerified) {
      verifiedCount++;
      var rLow = result69.toLowerCase();
      if (rLow.indexOf("good") !== -1 || rLow.indexOf("ปกติ") !== -1 || rLow.indexOf("ดี") !== -1) {
        derivedStatus = "Good";
        goodCount++;
      } else if (rLow.indexOf("damaged") !== -1 || rLow.indexOf("ชำรุด") !== -1) {
        derivedStatus = "Damaged";
        damagedCount++;
      } else if (rLow.indexOf("missing") !== -1 || rLow.indexOf("สูญหาย") !== -1) {
        derivedStatus = "Missing";
        missingCount++;
      } else {
        derivedStatus = "Good";
        goodCount++;
      }
    }
    
    if (targetRoomType !== "ALL" && rType.toLowerCase() !== targetRoomType.toLowerCase()) continue;
    if (targetRoom !== "ALL" && rName.toLowerCase() !== targetRoom.toLowerCase()) continue;
    if (targetStatus !== "ALL" && derivedStatus.toLowerCase() !== targetStatus.toLowerCase()) continue;
    
    if (search) {
      var matchSearch = String(item["Inventory number"] || "").toLowerCase().indexOf(search) !== -1 ||
                         String(item["Asset description1"] || "").toLowerCase().indexOf(search) !== -1 ||
                         String(item["Asset description2"] || "").toLowerCase().indexOf(search) !== -1 ||
                         rName.toLowerCase().indexOf(search) !== -1;
      if (!matchSearch) continue;
    }
    
    items.push({
      assetId: item["Inventory number"],
      no: item["No."],
      itemName: item["Asset description1"] || "Unnamed",
      brandModel: item["Asset description2"] || "",
      registeredLocation: rName,
      sheetName: item.SourceSheet || rName,
      roomType: rType,
      status: derivedStatus,
      auditResult69: result69,
      sticker: sticker || (isVerified ? "Yes" : "No"),
      procurementCondition: item["สภาพของสินทรัพย์"] || "",
      fiscalYear: item["ปีงบฯที่ได้มา"] || "",
      historicalResults: {
        "68": item["ปี68"] || "",
        "67": item["ปี67"] || "",
        "66": item["ปี66"] || "",
        "64": item["ปี64"] || "",
        "63": item["ปี63"] || ""
      }
    });
  }
  
  return {
    total: items.length,
    verified: verifiedCount,
    unverified: items.length - verifiedCount,
    good: goodCount,
    damaged: damagedCount,
    missing: missingCount,
    items: items,
    roomTypes: roomInspection.roomTypes,
    roomMap: roomInspection.roomMap
  };
}
