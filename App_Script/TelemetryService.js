/**
 * TelemetryService.js — Operational Audit Logging & Performance Analytics
 * Project 08: QR-Based Mobile Asset Survey App (v1.1.4)
 * MUIDS Lab Oops OS — Science Department
 */

function ensureStatsSheet(ss) {
  if (!ss) ss = getSpreadsheet();
  if (!ss) return null;
  
  var statsSheet = ss.getSheetByName("Stats");
  if (!statsSheet) {
    statsSheet = ss.insertSheet("Stats");
    var headers = ["Timestamp", "UserEmail", "UserName", "Action", "Room", "AssetID", "DurationMs", "Metadata"];
    statsSheet.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight("bold")
      .setBackground("#0f172a")
      .setFontColor("#38bdf8");
    statsSheet.setFrozenRows(1);
  }
  return statsSheet;
}

function logEvent(action, status, durationMs, details, payload) {
  try {
    var timestamp = getBangkokTimestamp();
    var email = getActorEmailSafe();
    var authUser = authenticateSession();
    var recordsAffected = (payload && payload.recordsAffected !== undefined) ? payload.recordsAffected : 1;
    
    var detailStr = details || "";
    if (payload && typeof payload === "object") {
      try { detailStr += " | Payload: " + JSON.stringify(payload); } catch (e) {}
    }
    
    console.log("[LOG:" + action + "] (" + (status || "SUCCESS") + ") " + email + " | " + detailStr);

    var ss = getSpreadsheet();
    if (!ss) return;
    
    var config = getLocalConfig();
    var sheetName = config.LOGS_SHEET_NAME || "Logs";
    var sheet = ss.getSheetByName(sheetName);
    
    if (sheet) {
      sheet.appendRow([
        timestamp,
        email,
        action,
        status || "SUCCESS",
        recordsAffected,
        detailStr
      ]);
    }

    // Auto-record to Stats sheet
    var statsSheet = ensureStatsSheet(ss);
    if (statsSheet) {
      var roomVal = (payload && (payload.sheetName || payload.roomName || payload.room || payload.destinationRoom)) ? (payload.sheetName || payload.roomName || payload.room || payload.destinationRoom) : "";
      var assetIdVal = (payload && (payload.assetId || payload.assetCode)) ? (payload.assetId || payload.assetCode) : "";
      statsSheet.appendRow([
        timestamp,
        email,
        (authUser && authUser.name) ? authUser.name : "System",
        action,
        roomVal,
        assetIdVal,
        durationMs || 0,
        detailStr
      ]);
    }
  } catch (err) {
    console.error("[TELEMETRY] logEvent error: " + err.toString());
  }
}

function logStat(metricName, dimension, numericValue, durationMs, metadata) {
  try {
    var timestamp = getBangkokTimestamp();
    var email = getActorEmailSafe();
    var authUser = authenticateSession();
    
    var metaStr = "";
    if (metadata && typeof metadata === "object") {
      try { metaStr = JSON.stringify(metadata); } catch (e) {}
    } else if (metadata) {
      metaStr = String(metadata);
    }
    
    console.log("[STAT:" + metricName + "] " + dimension + " = " + numericValue + " (" + durationMs + "ms)");

    var ss = getSpreadsheet();
    if (!ss) return;
    
    var statsSheet = ensureStatsSheet(ss);
    if (statsSheet) {
      statsSheet.appendRow([
        timestamp,
        email,
        (authUser && authUser.name) ? authUser.name : "System",
        metricName,
        dimension || "GENERAL",
        "",
        durationMs || 0,
        "Value: " + (numericValue || 1) + (metaStr ? " | " + metaStr : "")
      ]);
    }
  } catch (err) {
    console.error("[TELEMETRY] logStat error: " + err.toString());
  }
}
