/**
 * Code.js — Unified API Router & Native Web App Dispatcher
 * Project 08: QR-Based Mobile Asset Survey App (v1.1.0e)
 * MUIDS Lab Oops OS — Science Department
 */

function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu("🚀 Lab Oops: Asset Tracker")
      .addItem("⚙️ 0. Update / Sync Config Sheet (v1.1.0e)", "menuSyncConfigSheet")
      .addSeparator()
      .addItem("🏷️ 1. Setup Row 5 Audit Columns on All Room Sheets (Col M)", "menuSetupRow5Headers")
      .addItem("📥 2. Aggregate All Rooms into Master Table", "menuAggregateRoomsToMaster")
      .addItem("🔄 3. Migrate / Sync Master to Individual Room Sheets", "menuMigrateMasterToRooms")
      .addSeparator()
      .addItem("⚡ 4. Flush Caches", "menuFlushCache")
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

function menuSetupRow5Headers() {
  var ui = SpreadsheetApp.getUi();
  try {
    var res = setupRow5AuditHeaders();
    ui.alert("✅ Setup Complete", res.message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert("❌ Setup Error", e.toString(), ui.ButtonSet.OK);
  }
}

function menuAggregateRoomsToMaster() {
  var ui = SpreadsheetApp.getUi();
  try {
    var res = buildMasterTableFromRooms();
    ui.alert("✅ Master Table Built", res.message, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert("❌ Build Error", e.toString(), ui.ButtonSet.OK);
  }
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
  var authUser = authenticateSession();
  var responseData = {};
  var status = "SUCCESS";
  if (!payload) payload = {};
  
  try {
    if (action === "getInitialPayload") {
      responseData = getInitialPayload();
    } else if (action === "lookupAsset") {
      responseData = lookupAsset(payload.assetCode);
    } else if (action === "updateAssetStatus") {
      responseData = updateAssetStatus(payload);
    } else if (action === "getRoomAuditSummary") {
      responseData = getRoomAuditSummary(payload.roomName);
    } else if (action === "setupRow5Headers") {
      verifySuperAdminAccess();
      responseData = setupRow5AuditHeaders();
    } else if (action === "syncConfigSheet") {
      verifySuperAdminAccess();
      responseData = syncConfigSheet();
    } else if (action === "buildMasterTable") {
      verifySuperAdminAccess();
      responseData = buildMasterTableFromRooms();
    } else if (action === "migrateMasterToRooms") {
      verifySuperAdminAccess();
      responseData = migrateMasterToRoomSheets();
    } else if (action === "queryMasterTable") {
      responseData = queryMasterTable(payload.filters);
    } else if (action === "getDynamicRoomTypes") {
      responseData = inspectDynamicRoomTypes();
    } else if (action === "flushCache") {
      verifySuperAdminAccess();
      responseData = Nexus_FlushCache();
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
