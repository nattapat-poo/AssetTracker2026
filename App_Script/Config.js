/**
 * Config.js — Application Constants & 3-Tier Cache Snapshot Engine
 * Project 08: QR-Based Mobile Asset Survey App (v1.1.7e)
 * MUIDS Lab Oops OS — Science Department
 */

const APP_CONFIG = {
  APP_NAME: "MUIDS Mobile Asset Tracker",
  VERSION: "v1.1.7e",
  ICON: "🔍",
  SUBTITLE: "Mobile Camera QR Scanner & Dynamic Multi-Sheet Router"
};

// Deterministic Room Worksheet Column Offsets (1-based / 0-based for Col A - Col U)
const COL_INDEX = {
  NO: 1,                // Col A (idx 0)
  INVENTORY_NUMBER: 2,  // Col B (idx 1)
  ASSET: 3,             // Col C (idx 2)
  DESCRIPTION1: 4,      // Col D (idx 3)
  DESCRIPTION2: 5,      // Col E (idx 4)
  CURR_ACQ_VALUE: 6,    // Col F (idx 5)
  ORIGINAL_VALUE: 7,    // Col G (idx 6)
  ASSET_LOCATION: 8,    // Col H (idx 7)
  ROOM: 9,              // Col I (idx 8)
  CONDITION_THAI: 10,   // Col J (idx 9)
  CAP_DATE: 11,         // Col K (idx 10)
  FISCAL_YEAR: 12,      // Col L (idx 11)
  SCANNED_69: 13,       // Col M (idx 12)
  AUDIT_RESULT_69: 14,  // Col N (idx 13)
  STICKER: 15,          // Col O (idx 14)
  AUDITOR: 16,          // Col P (idx 15) — Auditor Display Name (Individual Room Sheet only)
  YR68: 17,             // Col Q (idx 16)
  YR67: 18,             // Col R (idx 17)
  YR66: 19,             // Col S (idx 18)
  YR64: 20,             // Col T (idx 19)
  YR63: 21              // Col U (idx 20)
};

const ROOM_SHEET_DATA_ROW = 6;     // Room sheets have headers on Row 5
const MASTER_SHEET_DATA_ROW = 2;   // Master_Asset has headers on Row 1

// Ecosystem Nexus Database ID (Project 00: Kernel)
const NEXUS_SPREADSHEET_ID = "11PUpY4zVClvVbfzgu4Olyzy6e5NacNUXZv30bexQQB8";

// Target Science Asset Inventory Spreadsheet ID (Provided by User)
const DEFAULT_ASSET_SPREADSHEET_ID = "18LGXn6JbjFeiVuKlrh0CvJ79M3mpsKTVbc0FJx8LuOk";

// Master Table Constants (Hybrid Architecture v1.1.0a / v1.1.4)
const MASTER_SHEET_NAME = "Master_Asset";
var MASTER_CONFIG = {
  MASTER_SHEET_NAME: "Master_Asset",
  ENABLE_HYBRID_LOOKUP: true,
  ENABLE_AGGREGATION_SYNC: true,
  SYNC_INTERVAL_MINUTES: 5,
  ALLOW_AUTO_PROVISION: true,
  COLOR_PALETTE: {
    HEADER_BG: "#0f172a",
    HEADER_FG: "#ffffff",
    ACCENT_EMERALD: "#10b981",
    STRIPE_ROW_BG: "#f8fafc"
  }
};

// Row 5 Audit Columns to append starting at Column M (Col 13) on room worksheets
const AUDIT_COLUMNS_ROW5 = [
  "Scanned 69",     // Col M (13) — User status input
  "หมายเหตุปี 69",  // Col N (14) — Remarks / rename / moved info
  "สติกเกอร์",       // Col O (15) — Sticker verification option
  "Auditor",        // Col P (16) — Auditor display name (Individual Room Sheet only)
  "ปี68",            // Col Q (17)
  "ปี67",            // Col R (18)
  "ปี66",            // Col S (19)
  "ปี64",            // Col T (20)
  "ปี63"             // Col U (21)
];

// Master Table 6 Essential Audit Columns (v1.1.3i - Schema: Cols B, D, I, M, N, O)
const MASTER_HEADERS = [
  "Inventory number",    // Col A (1) — from Room sheet Col B
  "Asset description1",  // Col B (2) — from Room sheet Col D
  "Room",                // Col C (3) — from Room sheet Col I
  "Scanned 69",          // Col D (4) — from Room sheet Col M
  "หมายเหตุปี 69",          // Col E (5) — from Room sheet Col N
  "สติกเกอร์"              // Col F (6) — from Room sheet Col O
];

const MASTER_ESSENTIAL_COLUMNS = MASTER_HEADERS;

// 15 Room Sheets Configuration (v1.1.1b)
const ROOM_SHEETS_CONFIG = [
  "Bio Prep",
  "Bio1",
  "Bio2",
  "Chem Pre",
  "Chem1",
  "Chem2",
  "Physics P",
  "Physics1",
  "Physics2",
  "Mobile",
  "Science",
  "ปาณิษา",
  "ชำรุด",
  "ไม่ใช้งาน",
  "Storage"
];

// Room Sheets Configuration Map & Aliases for Dynamic Filtering/Querying
const DEFAULT_ROOM_SHEETS_MAP = {
  "Bio Prep": "Bio Prep",
  "Bio1": "Bio1",
  "Bio2": "Bio2",
  "Chem Pre": "Chem Pre",
  "Chem1": "Chem1",
  "Chem2": "Chem2",
  "Physics P": "Physics P",
  "Physics1": "Physics1",
  "Physics2": "Physics2",
  "Mobile": "Mobile",
  "Science": "Science",
  "ปาณิษา": "ปาณิษา",
  "ชำรุด": "ชำรุด",
  "ไม่ใช้งาน": "ไม่ใช้งาน",
  "Storage": "Storage"
};

// Target values for moving assets alias to ROOM_SHEETS_CONFIG (no separate config sheet key needed)
const MOVE_TO = ROOM_SHEETS_CONFIG;

// 3 Color-Coded Status Option Groups (v1.1.1b)
const STATUS_GROUPS = {
  GROUP_1: {
    name: "ใช้งานอยู่",
    color: "green",
    options: [
      "ใช้งานอยู่",
      "ใช้งานอยู่แต่ชำรุดนะ",
      "ใช้งานอยู่+ย้ายไป...",
      "ใช้งานอยู่+แก้ไขชื่อเป็น..."
    ]
  },
  GROUP_2: {
    name: "หมดความจำเป็น",
    color: "red",
    options: [
      "หมดความจำเป็นต้องใช้งาน",
      "หมดความจำเป็นต้องใช้งานเพราะชำรุด"
    ]
  },
  GROUP_3: {
    name: "สูญหาย / ตรวจสอบ",
    color: "grey",
    options: [
      "สูญหาย",
      "หาไม่เจอ",
      "หาไม่เจอ+ให้พัสดุมาตรวจสอบหน้างาน",
      "งง+ให้พัสดุมาตรวจสอบหน้างาน"
    ]
  }
};

// Flat list of all permitted status options
const STATUS_OPTIONS = [
  "ใช้งานอยู่",
  "ใช้งานอยู่แต่ชำรุดนะ",
  "ใช้งานอยู่+ย้ายไป...",
  "ใช้งานอยู่+แก้ไขชื่อเป็น...",
  "หมดความจำเป็นต้องใช้งาน",
  "หมดความจำเป็นต้องใช้งานเพราะชำรุด",
  "สูญหาย",
  "หาไม่เจอ",
  "หาไม่เจอ+ให้พัสดุมาตรวจสอบหน้างาน",
  "งง+ให้พัสดุมาตรวจสอบหน้างาน"
];

// Sticker Verification Options (v1.1.1b)
const STICKER_OPTIONS = [
  "ปกติ",
  "ปริ้นใหม่",
  "ปริ้นใหม่+แก้ข้อมูล"
];

// Procurement Schema Constants
const PROCUREMENT_COLUMNS = {
  NO: "No.",
  INVENTORY_NUMBER: "Inventory number",
  ASSET: "Asset",
  DESCRIPTION1: "Asset description1",
  DESCRIPTION2: "Asset description2",
  CURR_ACQ_VALUE: "Curr.acq.value",
  ORIGINAL_VALUE: "Original value",
  ASSET_LOCATION: "Asset location",
  ROOM: "Room",
  CONDITION_THAI: "สภาพของสินทรัพย์",
  CAP_DATE: "Cap.date",
  FISCAL_YEAR: "ปีงบฯที่ได้มา",
  SCANNED_69: "Scanned 69",
  AUDIT_RESULT_69: "หมายเหตุปี 69",
  STICKER: "สติกเกอร์",
  HISTORICAL_YEARS: ["ปี68", "ปี67", "ปี66", "ปี64", "ปี63"]
};

// 3-Tier Cache Engine (Memory -> ScriptCache -> Spreadsheet)
var IN_MEMORY_CACHE = null;

function getBangkokTimestamp() {
  try {
    return Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss");
  } catch (e) {
    return new Date().toISOString();
  }
}

/**
 * 3-Tier Caching Snapshot for Nexus Global_Config
 */
function getGlobalConfig() {
  var cache = CacheService.getScriptCache();
  var cacheKey = "GLOBAL_CONFIG_SNAPSHOT";
  
  var cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
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
    var sheet = ss.getSheetByName("Global_Config");
    if (!sheet) return {};
    
    var values = sheet.getDataRange().getValues();
    var headers = values[0].map(function(h) { return String(h || "").trim(); });
    var keyIdx = headers.indexOf("ConfigKey");
    var valIdx = headers.indexOf("ConfigValue");
    
    var config = {};
    for (var i = 1; i < values.length; i++) {
      var key = String(values[i][keyIdx] || "").trim();
      var val = String(values[i][valIdx] || "").trim();
      if (key) config[key] = val;
    }
    
    var jsonStr = JSON.stringify(config);
    props.setProperty(cacheKey, jsonStr);
    cache.put(cacheKey, jsonStr, 21600);
    return config;
  } catch (err) {
    console.error("Nexus Global_Config read error: " + err.toString());
    return {};
  }
}

/**
 * 3-Tier Caching Snapshot for local project Config
 * Synchronizes Config sheet tab with standard schema and preserves user customizations.
 */
function syncConfigSheet(ss) {
  if (!ss) ss = getSpreadsheet();
  if (!ss) throw new Error("No active spreadsheet available to sync Config.");
  
  var configSheet = ss.getSheetByName("Config");
  if (!configSheet) {
    configSheet = ss.insertSheet("Config", 0);
  }
  
  var headers = ["ConfigKey", "ConfigValue", "DataType", "Description", "LastUpdated"];
  var lastRow = configSheet.getLastRow();
  var lastCol = configSheet.getLastColumn();
  
  // Initialize headers on row 1 if sheet is empty
  if (lastRow === 0 || lastCol === 0) {
    configSheet.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight("bold")
      .setBackground("#1e293b")
      .setFontColor("#f8fafc")
      .setHorizontalAlignment("center");
    configSheet.setFrozenRows(1);
    lastRow = 1;
  }
  
  // Read existing keys
  var existingData = [];
  if (lastRow > 1) {
    existingData = configSheet.getRange(2, 1, lastRow - 1, Math.max(5, configSheet.getLastColumn())).getValues();
  }
  
  var keyRowMap = {}; // key -> 1-indexed row number in spreadsheet
  for (var i = 0; i < existingData.length; i++) {
    var k = String(existingData[i][0] || "").trim();
    if (k) {
      keyRowMap[k] = i + 2;
    }
  }
  
  var bangkokNow = getBangkokTimestamp();
  var standardConfigs = [
    { key: "APP_TITLE", val: APP_CONFIG.TITLE, type: "STRING", desc: "Application display title" },
    { key: "APP_VERSION", val: APP_CONFIG.VERSION, type: "STRING", desc: "Application semantic release version" },
    { key: "SECRET_DEVELOPER_PIN", val: "2026", type: "STRING", desc: "Developer diagnostics bypass PIN" },
    { key: "DEFAULT_DEVICE_DENSITY", val: "mobile", type: "STRING", desc: "Default layout density mode" },
    { key: "AUDIT_YEAR", val: "2569", type: "NUMBER", desc: "Active Academic Year audit" },
    { key: "SCANNED_COLUMN_NAME", val: PROCUREMENT_COLUMNS.SCANNED_69, type: "STRING", desc: "Survey status input column name (Col M)" },
    { key: "AUDIT_COLUMN_NAME", val: PROCUREMENT_COLUMNS.AUDIT_RESULT_69, type: "STRING", desc: "Survey remarks / details column name (Col N)" },
    { key: "STICKER_COLUMN_NAME", val: PROCUREMENT_COLUMNS.STICKER, type: "STRING", desc: "PVC sticker verification column name (Col O)" },
    { key: "MASTER_SHEET_NAME", val: MASTER_SHEET_NAME, type: "STRING", desc: "Hybrid master aggregation sheet tab name" },
    { key: "ROOM_SHEETS_CONFIG", val: JSON.stringify(DEFAULT_ROOM_SHEETS_MAP), type: "JSON", desc: "Dynamic room sheets mapping and aliases (15 Rooms)" },
    { key: "SYSTEM_SHEETS", val: "Config,Logs,Stats,Global_Config,User,Room,Subjects,Academic_Calendar,Bell_Schedules,Master,Master_Asset,Sheet1", type: "COMMA_LIST", desc: "Excluded system tabs" },
    { key: "STATUS_OPTIONS", val: STATUS_OPTIONS.join(", "), type: "COMMA_LIST", desc: "Permitted survey status values (3 Color-Coded Groups)" },
    { key: "STICKER_OPTIONS", val: STICKER_OPTIONS.join(", "), type: "COMMA_LIST", desc: "PVC Sticker verification options (ปกติ, ปริ้นใหม่, ปริ้นใหม่+แก้ข้อมูล)" },
    { key: "AUTO_RESUME_SCANNER", val: "true", type: "BOOLEAN", desc: "Auto restart camera scanner after 1-tap confirm" },
    { key: "AUDIO_FEEDBACK_ENABLED", val: "true", type: "BOOLEAN", desc: "Audio feedback sound toggle" },
    { key: "VIBRATION_FEEDBACK_ENABLED", val: "true", type: "BOOLEAN", desc: "Haptic vibration toggle on mobile" },
    { key: "ASSET_SPREADSHEET_ID", val: DEFAULT_ASSET_SPREADSHEET_ID, type: "STRING", desc: "Target science asset inventory sheet ID" },
    { key: "NEXUS_SPREADSHEET_ID", val: NEXUS_SPREADSHEET_ID, type: "STRING", desc: "Central Nexus kernel database ID" },
    { key: "ADMIN_USERS", val: "TALT,TA,LabTech,Mek,Fern,Kris,Mai,Turner", type: "COMMA_LIST", desc: "Authorized survey administrators" }
  ];
  
  var rowsToAppend = [];
  var rowsUpdated = 0;
  
  standardConfigs.forEach(function(item) {
    if (keyRowMap[item.key]) {
      var rowNum = keyRowMap[item.key];
      // APP_VERSION, STATUS_OPTIONS, STICKER_OPTIONS, ROOM_SHEETS_CONFIG are updated on code roll
      if (item.key === "APP_VERSION" || item.key === "STATUS_OPTIONS" || item.key === "STICKER_OPTIONS" || item.key === "ROOM_SHEETS_CONFIG") {
        configSheet.getRange(rowNum, 2).setValue(item.val);
        configSheet.getRange(rowNum, 5).setValue(bangkokNow);
        rowsUpdated++;
      }
      // For all other existing keys: strictly preserve existing user settings!
      var currType = String(configSheet.getRange(rowNum, 3).getValue() || "").trim();
      var currDesc = String(configSheet.getRange(rowNum, 4).getValue() || "").trim();
      if (!currType) configSheet.getRange(rowNum, 3).setValue(item.type);
      if (!currDesc) configSheet.getRange(rowNum, 4).setValue(item.desc);
    } else {
      // Missing key -> append as new configuration row
      rowsToAppend.push([item.key, item.val, item.type, item.desc, bangkokNow]);
    }
  });
  
  if (rowsToAppend.length > 0) {
    var nextRow = configSheet.getLastRow() + 1;
    configSheet.getRange(nextRow, 1, rowsToAppend.length, 5).setValues(rowsToAppend);
  }
  
  try {
    for (var c = 1; c <= 5; c++) {
      configSheet.autoResizeColumn(c);
    }
  } catch (e) {}
  
  Nexus_FlushCache();
  
  return {
    success: true,
    message: "Config sheet synchronized (v" + APP_CONFIG.VERSION + "). Added " + rowsToAppend.length + " keys, updated " + rowsUpdated + " existing keys.",
    appVersion: APP_CONFIG.VERSION,
    timestamp: bangkokNow,
    keysAdded: rowsToAppend.length,
    keysUpdated: rowsUpdated
  };
}

function getLocalConfig() {
  var cache = CacheService.getScriptCache();
  var cacheKey = "LOCAL_CONFIG_SNAPSHOT";
  
  var cached = cache.get(cacheKey);
  if (cached) {
    try {
      var parsed = JSON.parse(cached);
      if (parsed && parsed.APP_VERSION === APP_CONFIG.VERSION) {
        return parsed;
      }
    } catch (e) {}
  }
  
  var props = PropertiesService.getScriptProperties();
  var propVal = props.getProperty(cacheKey);
  if (propVal) {
    try {
      var parsedProp = JSON.parse(propVal);
      if (parsedProp && parsedProp.APP_VERSION === APP_CONFIG.VERSION) {
        cache.put(cacheKey, propVal, 21600);
        return parsedProp;
      }
    } catch (e) {}
  }
  
  try {
    var ss = getSpreadsheet();
    if (!ss) return getLocalConfigDefaults();
    
    var configSheet = ss.getSheetByName("Config");
    if (!configSheet) {
      try {
        syncConfigSheet(ss);
        configSheet = ss.getSheetByName("Config");
      } catch (errSync) {
        console.warn("Could not auto-create Config tab: " + errSync.toString());
      }
    }
    
    if (!configSheet) return getLocalConfigDefaults();
    
    var values = configSheet.getDataRange().getValues();
    var headers = values[0].map(function(h) { return String(h || "").trim(); });
    var keyIdx = headers.indexOf("ConfigKey");
    var valIdx = headers.indexOf("ConfigValue");
    var typeIdx = headers.indexOf("DataType");
    
    var config = {};
    for (var i = 1; i < values.length; i++) {
      var key = String(values[i][keyIdx] || "").trim();
      var rawVal = String(values[i][valIdx] || "").trim();
      var type = String(values[i][typeIdx] || "STRING").trim();
      
      if (!key) continue;
      
      var parsedVal = rawVal;
      if (type === "NUMBER") {
        parsedVal = Number(rawVal);
      } else if (type === "BOOLEAN") {
        parsedVal = (rawVal.toLowerCase() === "true");
      } else if (type === "COMMA_LIST") {
        parsedVal = rawVal.split(",").map(function(item) { return item.trim(); });
      } else if (type === "JSON") {
        try {
          parsedVal = JSON.parse(rawVal);
        } catch (e) {
          parsedVal = {};
        }
      }
      config[key] = parsedVal;
    }
    
    // Self-healing: if sheet version is older, sync it
    if (config.APP_VERSION !== APP_CONFIG.VERSION) {
      try {
        syncConfigSheet(ss);
        config.APP_VERSION = APP_CONFIG.VERSION;
      } catch (e) {}
    }
    
    var defaults = getLocalConfigDefaults();
    Object.keys(defaults).forEach(function(k) {
      if (config[k] === undefined) {
        config[k] = defaults[k];
      }
    });
    
    var jsonStr = JSON.stringify(config);
    props.setProperty(cacheKey, jsonStr);
    cache.put(cacheKey, jsonStr, 21600);
    return config;
  } catch (err) {
    console.error("Local Config read error: " + err.toString());
    return getLocalConfigDefaults();
  }
}

function getLocalConfigDefaults() {
  return {
    "APP_TITLE": APP_CONFIG.TITLE,
    "APP_VERSION": APP_CONFIG.VERSION,
    "SECRET_DEVELOPER_PIN": "2026",
    "DEFAULT_DEVICE_DENSITY": "mobile",
    "AUDIT_YEAR": 2569, // Academic Year 2569 (2026)
    "SCANNED_COLUMN_NAME": PROCUREMENT_COLUMNS.SCANNED_69,
    "AUDIT_COLUMN_NAME": PROCUREMENT_COLUMNS.AUDIT_RESULT_69,
    "STICKER_COLUMN_NAME": PROCUREMENT_COLUMNS.STICKER,
    "MASTER_SHEET_NAME": MASTER_SHEET_NAME,
    "ROOM_SHEETS_CONFIG": DEFAULT_ROOM_SHEETS_MAP,
    "ROOM_LIST": ROOM_SHEETS_CONFIG,
    "SYSTEM_SHEETS": ["Config", "Logs", "Stats", "Global_Config", "User", "Room", "Subjects", "Academic_Calendar", "Bell_Schedules", "Master", "Master_Asset", "Sheet1"],
    "STATUS_OPTIONS": STATUS_OPTIONS,
    "STATUS_GROUPS": STATUS_GROUPS,
    "STICKER_OPTIONS": STICKER_OPTIONS,
    "AUTO_RESUME_SCANNER": true,
    "AUDIO_FEEDBACK_ENABLED": true,
    "VIBRATION_FEEDBACK_ENABLED": true,
    "ASSET_SPREADSHEET_ID": DEFAULT_ASSET_SPREADSHEET_ID,
    "NEXUS_SPREADSHEET_ID": NEXUS_SPREADSHEET_ID,
    "ADMIN_USERS": ["TALT", "TA", "LabTech", "Mek", "Fern", "Kris", "Mai", "Turner"]
  };
}

function Nexus_FlushCache() {
  var cache = CacheService.getScriptCache();
  cache.remove("GLOBAL_CONFIG_SNAPSHOT");
  cache.remove("LOCAL_CONFIG_SNAPSHOT");
  cache.remove("ASSET_ROUTER_INDEX");
  cache.remove("ROOM_LIST_CACHE");
  cache.remove("NEXUS_ROOM_DIRECTORY_SNAPSHOT");
  cache.remove("DYNAMIC_ROOM_TYPES_CACHE");
  cache.remove("MASTER_ASSET_CACHE");
  
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty("GLOBAL_CONFIG_SNAPSHOT");
  props.deleteProperty("LOCAL_CONFIG_SNAPSHOT");
  props.deleteProperty("ASSET_ROUTER_INDEX");
  props.deleteProperty("ROOM_LIST_CACHE");
  props.deleteProperty("NEXUS_ROOM_DIRECTORY_SNAPSHOT");
  props.deleteProperty("DYNAMIC_ROOM_TYPES_CACHE");
  props.deleteProperty("MASTER_ASSET_CACHE");
  
  IN_MEMORY_CACHE = null;
  getGlobalConfig();
  getLocalConfig();
  
  console.log("[CACHE] Caches flushed and pre-warmed.");
  return { success: true, timestamp: getBangkokTimestamp() };
}
