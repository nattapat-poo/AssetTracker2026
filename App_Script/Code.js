/**
 * Code.js — Unified API Router & Native Web App Dispatcher
 * Project 08: QR-Based Mobile Asset Survey App (v1.1.8d)
 * MUIDS Lab Oops OS — Science Department
 */

function onOpen() {
  try {
    var ver = (typeof APP_CONFIG !== "undefined" && APP_CONFIG.VERSION) ? APP_CONFIG.VERSION : "v1.1.8d";
    var ui = SpreadsheetApp.getUi();
    ui.createMenu("🚀 Lab Oops: Asset Tracker")
      .addItem("⚙️ 0. Update / Sync Config Sheet (" + ver + ")", "menuSyncConfigSheet")
      .addSeparator()
      .addItem("🏷️ 1. Setup Row 5 Audit Columns on Room Sheets...", "menuSetupRow5Headers")
      .addItem("📥 2. Aggregate Rooms into Master Table...", "menuAggregateRoomsToMaster")
      .addItem("🔄 3. Migrate / Sync Master to Individual Room Sheets", "menuMigrateMasterToRooms")
      .addItem("🔍 4. Check Master for Duplicates & Contradictions", "menuCheckMasterContradictions")
      .addSeparator()
      .addItem("⚡ 5. Flush Caches", "menuFlushCache")
      .addToUi();
  } catch (e) {
    // SpreadsheetApp.getUi() not available in web app standalone context
  }
}

function menuSyncConfigSheet() {
  var ui = SpreadsheetApp.getUi();
  try {
    var res = syncConfigSheet();
    ui.alert("✅ Config Synchronized", res.message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert("❌ Config Error", e.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Menu 1: Opens modal dialog to select sheets for setting up Row 5 audit columns
 */
function menuSetupRow5Headers() {
  try {
    var ui = SpreadsheetApp.getUi();
    var template = HtmlService.createTemplateFromFile("SheetSelectorModal");
    template.mode = "setupRow5";
    template.modalTitle = "🏷️ Setup Row 5 Audit Columns";
    template.modalDescription = "Check the boxes for room sheets to format Row 5 audit columns (Cols M–U: Scanned 69, หมายเหตุปี 69, สติกเกอร์, Auditor, ปี68..ปี63).";
    template.actionButtonText = "🏷️ Format Selected Sheets";
    template.sheets = getAvailableSheetsForAggregation();
    var html = template.evaluate()
      .setWidth(480)
      .setHeight(560);
    ui.showModalDialog(html, "🏷️ Setup Row 5 Audit Columns");
  } catch (e) {
    try {
      var res = setupRow5AuditHeaders();
      SpreadsheetApp.getUi().alert("✅ Setup Complete", res.message, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (err) {
      SpreadsheetApp.getUi().alert("❌ Setup Error", err.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
    }
  }
}

/**
 * Server-side runner called by SheetSelectorModal for Setup Row 5
 */
function runSetupRow5WithSelectedSheets(selectedSheetNames) {
  var res = setupRow5AuditHeaders(null, selectedSheetNames);
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(res.message, "✅ Row 5 Setup Complete", 5);
  } catch (e) {}
  return res;
}

/**
 * Menu 2: Opens modal dialog to select sheets for aggregation into Master_Asset
 */
function menuAggregateRoomsToMaster() {
  try {
    var ui = SpreadsheetApp.getUi();
    var template = HtmlService.createTemplateFromFile("SheetSelectorModal");
    template.mode = "aggregate";
    template.modalTitle = "📥 Combine Sheets into Master Table";
    template.modalDescription = "Check the boxes for room sheets to aggregate into Master_Asset. Columns A–T will be strictly aligned.";
    template.actionButtonText = "📥 Combine into Master Sheet";
    template.sheets = getAvailableSheetsForAggregation();
    var html = template.evaluate()
      .setWidth(480)
      .setHeight(560);
    ui.showModalDialog(html, "📥 Combine Sheets into Master Table");
  } catch (e) {
    try {
      var res = buildMasterTableFromRooms();
      SpreadsheetApp.getUi().alert("✅ Master Table Built", res.message, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (err) {
      SpreadsheetApp.getUi().alert("❌ Build Error", err.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
    }
  }
}

/**
 * Returns available room sheets in the spreadsheet for aggregation selection
 */
function getAvailableSheetsForAggregation() {
  var ss = getSpreadsheet();
  if (!ss) return [];
  
  var allSheets = ss.getSheets();
  var result = [];
  var systemSheets = [MASTER_SHEET_NAME.toLowerCase(), "config", "logs", "stats", "template", "sheet1"];
  var config = getLocalConfig();
  var configuredRooms = config.ROOM_SHEETS_CONFIG || ROOM_SHEETS_CONFIG || [];
  
  for (var i = 0; i < allSheets.length; i++) {
    var sheet = allSheets[i];
    var name = sheet.getName().trim();
    var lower = name.toLowerCase();
    
    if (systemSheets.indexOf(lower) !== -1 || name.indexOf("_") === 0) continue;
    
    var lastRow = sheet.getLastRow();
    var isConfigured = Array.isArray(configuredRooms) && configuredRooms.indexOf(name) !== -1;
    
    result.push({
      name: name,
      rowCount: Math.max(0, lastRow - 5),
      isConfigured: isConfigured,
      checked: true
    });
  }
  
  return result;
}

/**
 * Server-side runner called by SheetSelectorModal
 */
function runAggregationWithSelectedSheets(selectedSheetNames) {
  var res = buildMasterTableFromRooms(null, selectedSheetNames);
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(res.message, "✅ Master Table Updated", 5);
  } catch (e) {}
  return res;
}

function menuMigrateMasterToRooms() {
  var ui = SpreadsheetApp.getUi();
  try {
    var res = migrateMasterToRoomSheets();
    ui.alert("✅ Migration Complete", res.message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert("❌ Migration Error", e.toString(), ui.ButtonSet.OK);
  }
}

function menuCheckMasterContradictions() {
  var ui = SpreadsheetApp.getUi();
  try {
    var res = checkMasterTableContradictions();
    if (res.duplicatesCount === 0 && res.missingIdCount === 0) {
      ui.alert("✅ Master Table Integrity Passed", "All " + res.totalScanned + " assets in Master Table have unique inventory numbers and valid room mappings.", ui.ButtonSet.OK);
    } else {
      var msg = "⚠️ Contradictions Detected in Master Table:\n\n";
      if (res.duplicatesCount > 0) {
        msg += "• " + res.duplicatesCount + " Duplicate Inventory Numbers (" + res.duplicateRowsCount + " rows total):\n";
        res.duplicatesList.slice(0, 8).forEach(function(d) {
          msg += "  - ID: " + d.assetId + " (Rows: " + d.rows.join(", ") + " | Rooms: " + d.rooms.join(", ") + ")\n";
        });
        if (res.duplicatesList.length > 8) {
          msg += "  ...and " + (res.duplicatesList.length - 8) + " more.\n";
        }
      }
      if (res.missingIdCount > 0) {
        msg += "\n• " + res.missingIdCount + " Rows with missing Inventory Numbers (Rows: " + res.missingIdRows.slice(0, 8).join(", ") + ").\n";
      }
      msg += "\nDuplicate rows have been highlighted in soft red on the Master_Asset sheet for easy review.";
      ui.alert("⚠️ Master Table Contradictions", msg, ui.ButtonSet.OK);
    }
  } catch (e) {
    ui.alert("❌ Check Error", e.toString(), ui.ButtonSet.OK);
  }
}

function menuFlushCache() {
  var ui = SpreadsheetApp.getUi();
  try {
    var res = Nexus_FlushCache();
    ui.alert("✅ Cache Flushed", "Caches successfully flushed and pre-warmed at " + res.timestamp, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert("❌ Cache Error", e.toString(), ui.ButtonSet.OK);
  }
}

function doGet(e) {
  // If API action is requested via GET (e.g. from GitHub Pages CORS/JSONP bridge)
  if (e && e.parameter && e.parameter.action) {
    try {
      var action = e.parameter.action;
      var payload = {};
      if (e.parameter.payload) {
        payload = JSON.parse(e.parameter.payload);
      } else if (e.parameter.data) {
        payload = JSON.parse(e.parameter.data);
      } else {
        payload = e.parameter;
      }
      var result = executeApiAction(action, payload);
      
      if (e.parameter.callback) {
        var callback = e.parameter.callback.replace(/[^a-zA-Z0-9_]/g, '');
        return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ');')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      var errObj = { success: false, error: error.toString() };
      if (e.parameter && e.parameter.callback) {
        var cb = e.parameter.callback.replace(/[^a-zA-Z0-9_]/g, '');
        return ContentService.createTextOutput(cb + '(' + JSON.stringify(errObj) + ');')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(JSON.stringify(errObj))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Otherwise serve native HTML web app template
  var config = getLocalConfig();
  var appConfig = {
    TITLE: config.APP_TITLE || APP_CONFIG.TITLE,
    VERSION: config.APP_VERSION || APP_CONFIG.VERSION,
    ICON: APP_CONFIG.ICON,
    SUBTITLE: APP_CONFIG.SUBTITLE
  };
  
  var template = HtmlService.createTemplateFromFile('index');
  template.APP_CONFIG = appConfig;
  
  return template.evaluate()
    .setTitle(appConfig.ICON + " " + appConfig.TITLE + " " + appConfig.VERSION)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doPost(e) {
  try {
    var contents = e.postData.contents;
    var data = JSON.parse(contents);
    var action = data.action;
    var payload = data.payload || data;
    var result = executeApiAction(action, payload);
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Server-side API Action Dispatcher (called by google.script.run or doPost)
 */
function executeApiAction(action, payload) {
  var startTime = Date.now();
  if (!payload) payload = {};
  var authUser = authenticateSession(payload.clientEmail);
  var responseData = {};
  var status = "SUCCESS";
  
  try {
    if (action === "getInitialPayload") {
      responseData = getInitialPayload();
    } else if (action === "verifyMahidolUser") {
      responseData = verifyMahidolUser(payload.email || payload.clientEmail);
    } else if (action === "lookupAsset") {
      responseData = lookupAsset(payload.assetCode);
    } else if (action === "updateAssetStatus") {
      responseData = updateAssetStatus(payload);
    } else if (action === "addNewUnlistedAsset") {
      responseData = addNewUnlistedAsset(payload);
    } else if (action === "getRoomAuditSummary") {
      responseData = getRoomAuditSummary(payload.roomName);
    } else if (action === "setupRow5Headers") {
      verifySuperAdminAccess();
      responseData = setupRow5AuditHeaders(null, payload.sheetNames || payload.selectedSheets);
    } else if (action === "syncConfigSheet") {
      verifySuperAdminAccess();
      responseData = syncConfigSheet();
    } else if (action === "buildMasterTable") {
      verifySuperAdminAccess();
      responseData = buildMasterTableFromRooms(null, payload.sheetNames);
    } else if (action === "migrateMasterToRooms") {
      verifySuperAdminAccess();
      responseData = migrateMasterToRoomSheets();
    } else if (action === "queryMasterTable") {
      responseData = queryMasterTable(payload.filters);
    } else if (action === "checkMasterContradictions") {
      verifySuperAdminAccess();
      responseData = checkMasterTableContradictions();
    } else if (action === "flushCache") {
      verifySuperAdminAccess();
      responseData = Nexus_FlushCache();
    } else if (action === "getAppUsageStats") {
      responseData = getAppUsageStats();
    } else if (action === "logStat") {
      logStat(payload.metricName, payload.dimension, payload.numericValue, payload.durationMs, payload.metadata);
      responseData = { success: true };
    } else {
      throw new Error("Invalid API action specified: " + action);
    }
  } catch (err) {
    status = "FAILED";
    responseData = { success: false, error: err.toString() };
    logEvent(action, "FAILED", Date.now() - startTime, "Error: " + err.toString(), payload);
  }
  
  return responseData;
}

/**
 * Layer 2: onEdit(e) Simple Trigger
 * Automatically syncs manual edits made in individual room sheets directly into Master_Asset
 * Listens for row >= 6 in room sheets on Columns M (13: Scanned 69), N (14: หมายเหตุปี 69), O (15: สติกเกอร์), D (4: Asset description1), I (9: Room)
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var range = e.range;
    var sheet = range.getSheet();
    var sheetName = sheet.getName();
    
    // Ignore master and system sheets
    var lower = sheetName.toLowerCase();
    if (lower === "master_asset" || lower === "master" || lower === "config" || lower === "logs" || lower === "stats" || lower === "sheet1") {
      return;
    }
    
    var row = range.getRow();
    var col = range.getColumn();
    if (row < 6) return; // Row 5 is header, row 6+ is data
    
    // Check if edited column is one of the audited / sync columns
    // Col 4 = Description1, Col 9 = Room, Col 13 = Scanned 69, Col 14 = หมายเหตุปี 69, Col 15 = สติกเกอร์
    var relevantCols = [4, 9, 13, 14, 15];
    if (relevantCols.indexOf(col) === -1) return;
    
    var ss = e.source || SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    
    var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
    if (!masterSheet || masterSheet.getLastRow() < 2) return;
    
    // Get inventory number from Col 2 (B) of edited row
    var schema = detectSheetHeaderAndColumns(sheet);
    var invCol = (schema && schema.colMap && schema.colMap.inventoryNumber) ? schema.colMap.inventoryNumber : 2;
    var assetId = String(sheet.getRange(row, invCol).getValue() || "").trim();
    if (!assetId) return;
    
    var newValue = range.getValue();
    
    // Sync to Master_Asset
    var mData = masterSheet.getDataRange().getValues();
    var mHeaders = mData[0].map(function(h) { return String(h || "").trim(); });
    var mAssetIdIdx = mHeaders.indexOf("Inventory number");
    if (mAssetIdIdx === -1) mAssetIdIdx = 0;
    
    var targetMColIdx = -1;
    if (col === 4) targetMColIdx = mHeaders.indexOf("Asset description1");
    else if (col === 9) targetMColIdx = mHeaders.indexOf("Room");
    else if (col === 13) targetMColIdx = mHeaders.indexOf("Scanned 69");
    else if (col === 14) targetMColIdx = mHeaders.indexOf("หมายเหตุปี 69");
    else if (col === 15) targetMColIdx = mHeaders.indexOf("สติกเกอร์");
    
    if (targetMColIdx === -1) return;
    
    for (var m = 1; m < mData.length; m++) {
      if (String(mData[m][mAssetIdIdx] || "").trim().toUpperCase() === assetId.toUpperCase()) {
        masterSheet.getRange(m + 1, targetMColIdx + 1).setValue(newValue);
        break;
      }
    }
  } catch (err) {
    console.warn("[onEdit] Auto-sync error: " + err.toString());
  }
}

