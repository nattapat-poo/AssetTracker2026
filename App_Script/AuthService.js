/**
 * AuthService.js — Enterprise Identity & Multi-Role RBAC Authorization Engine
 * Project 08: QR-Based Mobile Asset Survey App (v1.1.8f)
 * MUIDS Lab Oops OS — Science Department
 */

const ECOSYSTEM_SUPERADMIN = "nattapat.poo@mahidol.ac.th";

/**
 * Known Master Science Department User Registry (MUIDS)
 * Explicit 1:1 mapping of verified Mahidol accounts to names and roles
 */
var MASTER_USER_REGISTRY = {
  "nattapat.poo@mahidol.ac.th": {
    email: "nattapat.poo@mahidol.ac.th",
    nickname: "Mek",
    displayName: "Nattapat Poolyam (Mek)",
    role: "SuperAdmin"
  },
  "nattasuda.yaw@mahidol.ac.th": {
    email: "nattasuda.yaw@mahidol.ac.th",
    nickname: "Mai",
    displayName: "Nattasuda Yawichai (Mai)",
    role: "Admin"
  },
  "rawinsiwat.dec@mahidol.ac.th": {
    email: "rawinsiwat.dec@mahidol.ac.th",
    nickname: "Win",
    displayName: "Rawinsiwat Dechpala (Win)",
    role: "Admin"
  },
  "panisa.lue@mahidol.ac.th": {
    email: "panisa.lue@mahidol.ac.th",
    nickname: "Fern",
    displayName: "Panisa Luewattananukul (Fern)",
    role: "Admin"
  },
  "thanaphat.cha@mahidol.ac.th": {
    email: "thanaphat.cha@mahidol.ac.th",
    nickname: "Kris",
    displayName: "Thanaphat Chaimongkol (Kris)",
    role: "Admin"
  }
};

function isMahidolDomain(email) {
  if (!email) return false;
  var em = String(email).toLowerCase().trim();
  return em.endsWith("@mahidol.ac.th") || em.endsWith("@mahidol.edu") || em.endsWith("@student.mahidol.ac.th");
}

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
 * Retrieves authorized user accounts across:
 * 1. 'User' sheet in the Master Google Sheet (getSpreadsheet())
 * 2. 'User' sheet in the Nexus database
 * 3. Master team member baseline registry (Mek, Mai, Win, Fern, Kris)
 */
function getAuthorizedUsers() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("AUTHORIZED_USERS_CACHE");
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }
  
  var users = [];
  var seenEmails = {};

  function addUser(u) {
    if (!u) return;
    var em = String(u.Email || u.email || u["Email Address"] || u["User Email"] || "").trim().toLowerCase();
    if (em && !seenEmails[em]) {
      seenEmails[em] = true;
      users.push(u);
    }
  }

  // 1. Primary Source: Inspect 'User' sheet in the Master Google Sheet (getSpreadsheet())
  try {
    var masterSS = (typeof getSpreadsheet === "function") ? getSpreadsheet() : SpreadsheetApp.getActiveSpreadsheet();
    if (masterSS) {
      var userSheet = masterSS.getSheetByName("User");
      if (userSheet) {
        var values = userSheet.getDataRange().getValues();
        if (values.length > 1) {
          var headers = values[0].map(function(h) { return String(h || "").trim(); });
          for (var i = 1; i < values.length; i++) {
            var row = values[i];
            var obj = {};
            headers.forEach(function(h, idx) {
              if (h) obj[h] = row[idx];
            });
            addUser(obj);
          }
        }
      }
    }
  } catch (e) {
    console.warn("[AUTH] Master sheet User tab lookup warning: " + e.toString());
  }

  // 2. Secondary Source: Central Nexus Kernel database ('User' sheet)
  try {
    if (typeof NEXUS_SPREADSHEET_ID !== "undefined" && NEXUS_SPREADSHEET_ID) {
      var nexusSS = SpreadsheetApp.openById(NEXUS_SPREADSHEET_ID);
      var nexusUserSheet = nexusSS ? nexusSS.getSheetByName("User") : null;
      if (nexusUserSheet) {
        var nValues = nexusUserSheet.getDataRange().getValues();
        if (nValues.length > 1) {
          var nHeaders = nValues[0].map(function(h) { return String(h || "").trim(); });
          for (var j = 1; j < nValues.length; j++) {
            var nRow = nValues[j];
            var nObj = {};
            nHeaders.forEach(function(h, idx) {
              if (h) nObj[h] = nRow[idx];
            });
            addUser(nObj);
          }
        }
      }
    }
  } catch (e) {
    console.warn("[AUTH] Nexus User tab lookup warning: " + e.toString());
  }

  // 3. Guaranteed Baseline: Built-in Master Team Registry (Mek, Mai, Win, Fern, Kris)
  Object.keys(MASTER_USER_REGISTRY).forEach(function(emKey) {
    var reg = MASTER_USER_REGISTRY[emKey];
    addUser({
      Email: reg.email,
      DisplayName: reg.displayName,
      Nickname: reg.nickname,
      Role: reg.role,
      Department: "Science"
    });
  });

  try {
    cache.put("AUTHORIZED_USERS_CACHE", JSON.stringify(users), 21600);
  } catch (e) {}

  return users;
}

function getNexusUsers() {
  return getAuthorizedUsers();
}

/**
 * Authenticates user session against Master Sheet User Tab, Nexus, or Master Team Registry
 * Rules:
 * - Checks if email is a valid Mahidol University Google Workspace account.
 * - Matches user against authorized users in Master Google Sheet ('User' sheet).
 * - Matches Mek, Mai, Win, Fern, Kris to their display names and Admin/SuperAdmin roles.
 * - TALT team members hold roles "TA" or "LabTech".
 * - SuperAdmin is nattapat.poo@mahidol.ac.th
 */
function authenticateSession(clientEmail) {
  var email = (clientEmail && String(clientEmail).trim() !== "")
    ? String(clientEmail).trim().toLowerCase()
    : getActorEmailSafe();

  var isSuperAdmin = (email === ECOSYSTEM_SUPERADMIN.toLowerCase());
  var isMahidol = isMahidolDomain(email);
  
  var config = (typeof getLocalConfig === "function") ? getLocalConfig() : {};
  var adminList = Array.isArray(config.ADMIN_USERS) ? config.ADMIN_USERS : [];
  
  var role = "Auditor"; // Default survey auditor
  var isTALT = false;
  var isNexusMatched = false;
  var displayName = "";
  var nickname = "";

  // Check known registry first
  if (MASTER_USER_REGISTRY[email]) {
    var regUser = MASTER_USER_REGISTRY[email];
    displayName = regUser.displayName;
    nickname = regUser.nickname;
    role = regUser.role;
    isTALT = true;
    isNexusMatched = true;
  }
  
  // 1. Look up user role in Master Sheet / Nexus User sheet
  try {
    var authorizedUsers = getAuthorizedUsers();
    var matchedUser = authorizedUsers.find(function(u) {
      var uEmail = String(u.Email || u.email || u["Email Address"] || u["User Email"] || "").trim().toLowerCase();
      return uEmail === email;
    });
    
    if (matchedUser) {
      isNexusMatched = true;
      var userRole = String(matchedUser.Role || matchedUser.role || role || "Admin").trim();
      nickname = String(matchedUser.Nickname || matchedUser.nickname || matchedUser["Nick Name"] || matchedUser["ชื่อเล่น"] || nickname || "").trim();
      var parsedName = String(matchedUser.DisplayName || matchedUser.displayName || matchedUser.Name || matchedUser.name || matchedUser.FirstName || displayName || email).trim();
      
      if (nickname && parsedName && parsedName.indexOf(nickname) === -1) {
        displayName = parsedName + " (" + nickname + ")";
      } else if (parsedName) {
        displayName = parsedName;
      }
      
      if (userRole === "Admin" || isSuperAdmin) {
        role = isSuperAdmin ? "SuperAdmin" : "Admin";
        isTALT = true;
      } else if (userRole === "LabTech" || userRole === "TA" || userRole === "TALT") {
        role = userRole;
        isTALT = true;
      } else {
        role = userRole || "Teacher";
      }
      
      return {
        email: email,
        name: displayName || (nickname ? nickname : email.split("@")[0]),
        nickname: nickname,
        role: role,
        isAdmin: (role === "Admin" || role === "SuperAdmin" || isSuperAdmin),
        isSuperAdmin: isSuperAdmin,
        isTALT: isTALT,
        isMahidolAccount: isMahidol,
        isNexusAuthorized: true,
        isVerified: true,
        authStatus: "VERIFIED",
        primarySubject: matchedUser.PrimarySubject || "Science"
      };
    }
  } catch (e) {
    console.warn("User lookup exception: " + e.toString());
  }
  
  // 2. Fallback role resolution based on config and email patterns
  var emailName = email.split("@")[0];
  var isAdmin = isSuperAdmin || adminList.some(function(item) {
    var str = String(item).toLowerCase().trim();
    return str === email || email.indexOf(str) !== -1;
  });
  
  if (isAdmin) {
    role = isSuperAdmin ? "SuperAdmin" : "Admin";
    isTALT = true;
  }
  
  var isVerifiedUser = isAdmin || isSuperAdmin || isNexusMatched;
  var authStatus = isVerifiedUser
    ? "VERIFIED"
    : (isMahidol ? "UNREGISTERED_MAHIDOL" : "EXTERNAL_ACCOUNT");

  if (!displayName) {
    displayName = nickname ? nickname : (emailName.charAt(0).toUpperCase() + emailName.slice(1));
  }

  return {
    email: email,
    name: displayName,
    nickname: nickname,
    role: role,
    isAdmin: isAdmin,
    isSuperAdmin: isSuperAdmin,
    isTALT: isTALT,
    isMahidolAccount: isMahidol,
    isNexusAuthorized: isVerifiedUser,
    isVerified: isVerifiedUser,
    authStatus: authStatus,
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

function verifyMahidolUser(email) {
  return authenticateSession(email);
}
