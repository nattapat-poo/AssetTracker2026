/**
 * AuthService.js — Enterprise Identity & Multi-Role RBAC Authorization Engine
 * Project 08: QR-Based Mobile Asset Survey App (v1.1.8h)
 * MUIDS Lab Oops OS — Science Department
 */

const ECOSYSTEM_SUPERADMIN = "nattapat.poo@mahidol.ac.th";

/**
 * Known Master Science Department User Registry (MUIDS)
 * Baseline fallback registry when Master Google Sheet User tab is unreachable or offline
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
 * 1. 'User' sheet in the Master Google Sheet (getSpreadsheet()) [PRIMARY]
 * 2. 'User' sheet in the Nexus database [SECONDARY]
 * 3. Master team member baseline registry (Mek, Mai, Win, Fern, Kris) [FALLBACK]
 */
function getAuthorizedUsers() {
  var cache = CacheService.getScriptCache();
  var cacheKey = "AUTHORIZED_USERS_CACHE_v1.1.8i";
  var cached = cache ? cache.get(cacheKey) : null;
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }
  
  var users = [];
  var seenEmails = {};

  function addUser(u, source) {
    if (!u) return;
    var em = String(u.Email || u.email || u["Email Address"] || u["User Email"] || u["อีเมล"] || u["อีเมล์"] || "").trim().toLowerCase();
    if (em && !seenEmails[em]) {
      seenEmails[em] = true;
      u._source = source || "MASTER_SHEET";
      users.push(u);
    }
  }

  // 1. Primary Source: Inspect 'User' sheet in the Master Google Sheet (getSpreadsheet())
  try {
    var masterSS = (typeof getSpreadsheet === "function") ? getSpreadsheet() : SpreadsheetApp.getActiveSpreadsheet();
    if (masterSS) {
      var userSheet = masterSS.getSheetByName("User") || masterSS.getSheetByName("Users") || masterSS.getSheetByName("ผู้ใช้งาน");
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
            addUser(obj, "MASTER_SHEET");
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
      var nexusUserSheet = nexusSS ? (nexusSS.getSheetByName("User") || nexusSS.getSheetByName("Users")) : null;
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
            addUser(nObj, "NEXUS_SHEET");
          }
        }
      }
    }
  } catch (e) {
    console.warn("[AUTH] Nexus User tab lookup warning: " + e.toString());
  }

  // 3. Fallback Source: Built-in Master Team Registry (Mek, Mai, Win, Fern, Kris)
  Object.keys(MASTER_USER_REGISTRY).forEach(function(emKey) {
    var reg = MASTER_USER_REGISTRY[emKey];
    addUser({
      Email: reg.email,
      DisplayName: reg.displayName,
      Nickname: reg.nickname,
      Role: reg.role,
      Department: "Science"
    }, "BASELINE_FALLBACK");
  });

  try {
    if (cache) cache.put(cacheKey, JSON.stringify(users), 21600);
  } catch (e) {}

  return users;
}

function getNexusUsers() {
  return getAuthorizedUsers();
}

/**
 * Authenticates user session:
 * 1. Checks Master Google Sheet 'User' tab first.
 *    Allowed roles from Master DB are: 'Admin', 'LabTech', and 'TA' (plus 'SuperAdmin').
 * 2. If not found or on lookup failure, uses baseline fallback registry.
 */
function authenticateSession(clientEmail) {
  var email = (clientEmail && String(clientEmail).trim() !== "")
    ? String(clientEmail).trim().toLowerCase()
    : getActorEmailSafe();

  var isSuperAdmin = (email === ECOSYSTEM_SUPERADMIN.toLowerCase() || email.indexOf("nattapat.poo") !== -1);
  var isMahidol = isMahidolDomain(email);
  
  var config = (typeof getLocalConfig === "function") ? getLocalConfig() : {};
  var adminList = Array.isArray(config.ADMIN_USERS) ? config.ADMIN_USERS : [];

  // 1. PRIMARY: Check Master Google Sheet 'User' tab first
  try {
    var authorizedUsers = getAuthorizedUsers();
    var matchedUser = authorizedUsers.find(function(u) {
      var uEmail = String(u.Email || u.email || u["Email Address"] || u["User Email"] || u["อีเมล"] || "").trim().toLowerCase();
      return uEmail === email;
    });

    if (matchedUser) {
      var rawRole = String(matchedUser.Role || matchedUser.role || matchedUser["User Role"] || matchedUser["บทบาท"] || matchedUser["หน้าที่"] || "Admin").trim();
      var normalizedRole = rawRole.toLowerCase();
      
      // Flexible role matching: allows variations like Admin, LabTech, TA, SuperAdmin, Administrator, Lab Technician, Thai terms
      var isAllowedRole = (
        isSuperAdmin ||
        normalizedRole === "admin" ||
        normalizedRole === "labtech" ||
        normalizedRole === "ta" ||
        normalizedRole === "superadmin" ||
        normalizedRole === "talt" ||
        normalizedRole.indexOf("admin") !== -1 ||
        normalizedRole.indexOf("super") !== -1 ||
        normalizedRole.indexOf("tech") !== -1 ||
        normalizedRole.indexOf("ta") !== -1 ||
        normalizedRole.indexOf("talt") !== -1 ||
        normalizedRole.indexOf("lead") !== -1 ||
        normalizedRole.indexOf("แอดมิน") !== -1 ||
        normalizedRole.indexOf("ผู้ดูแล") !== -1 ||
        normalizedRole.indexOf("อาจารย์") !== -1 ||
        normalizedRole.indexOf("ครู") !== -1
      );

      var role = "Auditor";
      if (isSuperAdmin || normalizedRole.indexOf("super") !== -1) {
        role = "SuperAdmin";
      } else if (normalizedRole.indexOf("admin") !== -1 || normalizedRole.indexOf("แอดมิน") !== -1 || normalizedRole.indexOf("ผู้ดูแล") !== -1) {
        role = "Admin";
      } else if (normalizedRole.indexOf("tech") !== -1) {
        role = "LabTech";
      } else if (normalizedRole.indexOf("ta") !== -1) {
        role = "TA";
      } else {
        role = rawRole || "Admin";
      }

      var nickname = String(matchedUser.Nickname || matchedUser.nickname || matchedUser["Nick Name"] || matchedUser["ชื่อเล่น"] || "").trim();
      var parsedName = String(matchedUser.DisplayName || matchedUser.displayName || matchedUser.Name || matchedUser.name || matchedUser.FirstName || matchedUser["ชื่อ"] || "").trim();

      // If nickname not separated, extract from parentheses e.g. "Thanaphat Chaimongkol (Kris)"
      if (!nickname && parsedName) {
        var matchParen = parsedName.match(/\(([^)]+)\)/);
        if (matchParen) nickname = matchParen[1].trim();
      }
      // If still no nickname, check baseline registry for known email
      if (!nickname && MASTER_USER_REGISTRY[email]) {
        nickname = MASTER_USER_REGISTRY[email].nickname;
      }
      if (!nickname) {
        nickname = parsedName ? parsedName.split(" ")[0] : email.split("@")[0];
      }

      var displayName = "";
      if (nickname && parsedName && parsedName.indexOf(nickname) === -1) {
        displayName = parsedName + " (" + nickname + ")";
      } else {
        displayName = parsedName || nickname || email.split("@")[0];
      }

      var authSource = matchedUser._source || "MASTER_SHEET";
      var isVerified = isSuperAdmin || isAllowedRole || (isMahidol && (role === "Admin" || role === "SuperAdmin" || role === "LabTech" || role === "TA"));

      return {
        email: email,
        name: displayName,
        nickname: nickname,
        role: role,
        isAdmin: (role === "Admin" || role === "SuperAdmin" || isSuperAdmin),
        isSuperAdmin: isSuperAdmin,
        isTALT: isAllowedRole,
        isMahidolAccount: isMahidol,
        isNexusAuthorized: isVerified,
        isVerified: isVerified,
        authStatus: isVerified ? "VERIFIED" : "UNAUTHORIZED_ROLE",
        authSource: authSource,
        primarySubject: matchedUser.PrimarySubject || "Science"
      };
    }
  } catch (e) {
    console.warn("[AUTH] Master sheet User tab lookup exception: " + e.toString());
  }

  // 2. FALLBACK: Built-in 5-Member Science Team Baseline (Mek, Mai, Win, Fern, Kris)
  if (MASTER_USER_REGISTRY[email]) {
    var regUser = MASTER_USER_REGISTRY[email];
    return {
      email: email,
      name: regUser.displayName,
      nickname: regUser.nickname,
      role: (isSuperAdmin || regUser.role === "SuperAdmin") ? "SuperAdmin" : regUser.role,
      isAdmin: (regUser.role === "Admin" || regUser.role === "SuperAdmin" || isSuperAdmin),
      isSuperAdmin: (regUser.role === "SuperAdmin" || isSuperAdmin),
      isTALT: true,
      isMahidolAccount: true,
      isNexusAuthorized: true,
      isVerified: true,
      authStatus: "VERIFIED",
      authSource: "BASELINE_FALLBACK",
      primarySubject: "Science"
    };
  }

  // 3. Fallback role resolution based on config and email patterns
  var emailName = email.split("@")[0];
  var isAdmin = isSuperAdmin || adminList.some(function(item) {
    var str = String(item).toLowerCase().trim();
    return str === email || email.indexOf(str) !== -1;
  });
  
  if (isAdmin) {
    role = isSuperAdmin ? "SuperAdmin" : "Admin";
    isTALT = true;
  }
  
  var isVerifiedUser = isAdmin || isSuperAdmin || (isMahidol && isAllowedRole);
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
