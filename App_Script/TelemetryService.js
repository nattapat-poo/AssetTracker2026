/**
 * TelemetryService.js — Operational Audit Logging & Performance Analytics
 * Project 08: QR-Based Mobile Asset Survey App (v1.1.0e)
 * MUIDS Lab Oops OS — Science Department
 * 
 * Non-invasive Mode: Never inserts 'Logs' or 'Stats' tabs into the procurement spreadsheet!
 * Only writes to Logs/Stats if tabs already exist; otherwise outputs to Cloud Logging.
 */

function logEvent(action, status, durationMs, details, payload) {
  try {
    var timestamp = getBangkokTimestamp();
    var email = getActorEmailSafe();
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
    
    // Only write if sheet already exists (strictly do NOT create it)
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
  } catch (err) {
    console.error("[TELEMETRY] logEvent error: " + err.toString());
  }
}

function logStat(metricName, dimension, numericValue, durationMs, metadata) {
  try {
    var timestamp = getBangkokTimestamp();
    var email = getActorEmailSafe();
    
    var metaStr = "";
    if (metadata && typeof metadata === "object") {
      try { metaStr = JSON.stringify(metadata); } catch (e) {}
    } else if (metadata) {
      metaStr = String(metadata);
    }
    
    console.log("[STAT:" + metricName + "] " + dimension + " = " + numericValue + " (" + durationMs + "ms)");

    var ss = getSpreadsheet();
    if (!ss) return;
    
    var config = getLocalConfig();
    var sheetName = config.STATS_SHEET_NAME || "Stats";
    var sheet = ss.getSheetByName(sheetName);
    
    // Only write if sheet already exists (strictly do NOT create it)
    if (sheet) {
      sheet.appendRow([
        timestamp,
        email,
        metricName,
        dimension || "GENERAL",
        numericValue || 1,
        durationMs || 0,
        metaStr
      ]);
    }
  } catch (err) {
    console.error("[TELEMETRY] logStat error: " + err.toString());
  }
}
