/**
 * AuthService.js — Session Authentication & SuperAdmin Security Guard
 * Project 08: QR-Based Mobile Asset Survey App (v1.1.0e)
 * MUIDS Lab Oops OS — Science Department
 */

const ECOSYSTEM_SUPERADMIN = "nattapat.poo@mahidol.ac.th";

function getActorEmailSafe() {
  try {
    var user = Session.getActiveUser().getEmail();
    if (user && user.trim() !== "") return user.trim().toLowerCase();
  } catch (e) {}
  try {
    var eff = Session.getEffectiveUser().getEmail();
    if (eff && eff.trim() !== "") return eff.trim().toLowerCase();
  } catch (e) {}
  return ECOSYSTEM_SUPERADMIN;
}

/**
 * Authenticates current user session against Nexus or Local Admin Config
 * Rules:
 * - TALT team members hold roles "TA" or "LabTech".
 * - SuperAdmin is nattapat.poo@mahidol.ac.th
 */
function authenticateSession() {
  var email = getActorEmailSafe();
  var isSuperAdmin = (email === ECOSYSTEM_SUPERADMIN.toLowerCase());
  
  var config = getLocalConfig();
  var adminList = Array.isArray(config.ADMIN_USERS) ? config.ADMIN_USERS : [];
  
  var role = "Auditor"; // Default survey auditor
  var isTALT = false;
  
  // Look up user role in Nexus User sheet if available
  try {
    var nexusUsers = getNexusUsers();
    var matchedUser = nexusUsers.find(function(u) {
      return String(u.Email || "").trim().toLowerCase() === email;
    });
    
    if (matchedUser) {
      var userRole = String(matchedUser.Role || "").trim();
      var displayName = String(matchedUser.DisplayName || matchedUser.FirstName || email).trim();
      
      if (userRole === "Admin" || isSuperAdmin) {
        role = "Admin";
        isTALT = true;
      } else if (userRole === "LabTech" || userRole === "TA") {
        role = userRole;
        isTALT = true;
      } else {
        role = userRole || "Teacher";
      }
      
      return {
        email: email,
        name: displayName,
        role: role,
        isAdmin: (role === "Admin" || isSuperAdmin),
        isSuperAdmin: isSuperAdmin,
        isTALT: isTALT,
        primarySubject: matchedUser.PrimarySubject || "Science"
      };
    }
  } catch (e) {
    console.warn("Nexus user lookup skipped: " + e.toString());
  }
  
  // Fallback role resolution based on config and email patterns
  var emailName = email.split("@")[0];
  var isAdmin = isSuperAdmin || adminList.some(function(item) {
    var str = String(item).toLowerCase().trim();
    return str === email || email.indexOf(str) !== -1;
  });
  
  if (isAdmin) {
    role = "Admin";
    isTALT = true;
  }
  
  return {
    email: email,
    name: emailName.charAt(0).toUpperCase() + emailName.slice(1),
    role: role,
    isAdmin: isAdmin,
    isSuperAdmin: isSuperAdmin,
    isTALT: isTALT,
    primarySubject: "Science"
  };
}

function verifySuperAdminAccess() {
  var email = getActorEmailSafe();
  if (email !== ECOSYSTEM_SUPERADMIN.toLowerCase()) {
    throw new Error("⛔ ACCESS DENIED: Account '" + email + "' is not authorized as SuperAdmin.");
  }
  return true;
}

function getNexusUsers() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("NEXUS_USERS_CACHE");
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }
  
  try {
    var ss = SpreadsheetApp.openById(NEXUS_SPREADSHEET_ID);
    var sheet = ss.getSheetByName("User");
    if (!sheet) return [];
    
    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) return [];
    
    var headers = values[0].map(function(h) { return String(h || "").trim(); });
    var users = values.slice(1).map(function(row) {
      var obj = {};
      headers.forEach(function(h, idx) {
        if (h) obj[h] = row[idx];
      });
      return obj;
    });
    
    cache.put("NEXUS_USERS_CACHE", JSON.stringify(users), 21600);
    return users;
  } catch (e) {
    return [];
  }
}
