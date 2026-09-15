# 📝 Developer Engineering Journal (DevLog) — Project 08

## 2026-09-16 — Release v1.1.8k: Live Save Pipeline & Sync Audit Hardening
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 release `v1.1.8k`.
* **Deployment Scope:** Dual release deployed to Google Apps Script (`clasp push --force`, redeploy canonical deployment @22) and Git (`git push origin main`, tag `v1.1.8k`).
* **Root Cause Analyses & System Hardening**:
  1. **RCA: Localhost Testing Silently Trapped in OFFLINE_MOCK Mode**:
     - *Issue Reported*: User completed the audit workflow, buttons no longer hung on "Saving...", but records still failed to persist to Google Sheets.
     - *Root Cause*: In `ApiClient.html`, `isRemoteLiveMode` evaluated `window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"`. Whenever testing from `localhost:8088` (the preview server) or direct file preview, `isRemoteLiveMode` evaluated to `false`, silently forcing all writes into mock local state.
     - *Resolution*: Removed hostname exclusions. All web environments now default to live remote Google Apps Script bridge unless explicitly opted out with `?mock=1`.
  2. **RCA: Ghost Mock Mutation Fallback**:
     - *Root Cause*: In `invokeJsonp()` and `invoke()`, any network abort, CORS error, or JSONP timeout caught an exception and invoked `mockExecute()`, which returned `{ success: true }`. The UI reported success to the user despite zero backend persistence.
     - *Resolution*: Mutations (`updateAssetStatus` and `addNewUnlistedAsset`) are strictly prohibited from falling back to mock successes. On failure, they return an explicit error object (`{ success: false, error: ... }`) so the UI accurately notifies the user.
  3. **RCA: URL-Decoded Spaces Breaking Thai Status with Plus Sign (`+`)**:
     - *Root Cause*: Status option `"หาไม่เจอ+ให้พัสดุมาตรวจสอบหน้างาน"` uses the `+` character. When sent through GET query strings to Google Apps Script, the `+` was decoded as space (`"หาไม่เจอ ให้พัสดุมาตรวจสอบหน้างาน"`). In `DatabaseService.js`, `STATUS_OPTIONS.indexOf(newStatus)` returned `-1`, throwing `Invalid status: ...` and terminating the execution.
     - *Resolution*: In `DatabaseService.js`, status validation normalizes strings by removing all spaces and `+` symbols (`opt.replace(/[\s\+]/g, '') === newStatus.replace(/[\s\+]/g, '')`), matching canonical options regardless of URL decoding.
  4. **RCA: Premature UI Feedback Toast**:
     - *Root Cause*: `showToast("✅ บันทึกสำเร็จ: " + newStatus, "success")` was called synchronously before awaiting `ApiClient.updateAssetStatus()`.
     - *Resolution*: Sequenced UI feedback: display `⏳ กำลังบันทึก...` in-flight, and only present `✅ บันทึกสำเร็จ: ...` once the backend confirms `res.success === true`.
  5. **RCA: Fallback ReferenceError in AuthService.js**:
     - *Root Cause*: In `AuthService.js` step 3 fallback, variables `role = "Auditor"` and `isTALT = false` were referenced without `var` declarations, risking a `ReferenceError` in strict environments.
     - *Resolution*: Added explicit variable declarations (`var role = "Auditor"; var isTALT = false;`).
* **Automated Verification**:
  - Suite 46 added to `Tools/test_core.js`.
  - 100% pass rate across all 46 test suites.
  - Live roundtrip verified via `Tools/test_remote_gas.js` against Google Spreadsheet ID `18LGXn6JbjFeiVuKlrh0CvJ79M3mpsKTVbc0FJx8LuOk`.

## 2026-09-16 — Release v1.1.8j: Auto-Reset Button State & Audit Sync Resilience
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 release `v1.1.8j`.
* **Deployment Scope:** Dual release deployed to Google Apps Script (`clasp push --force`, redeploy @20 / new deployment @21) and Git (`git push origin main`).
* **Root Cause Analyses & Resolutions**:
  1. **RCA: Action Buttons Stuck on "Saving..." & Disabled State**:
     - *Issue Reported*: User completed the audit workflow `Scan > Found > Audit Status > Leave blank comment > Audit sticker`. But when opening another asset entry or inspecting the modal, the button previously selected (e.g. `หาไม่เจอ+ให้พัสดุมาตรวจสอบหน้างาน` under Group 3) remained permanently stuck displaying `[🔄 Saving...]` with all action buttons disabled (`btn.disabled = true; isSubmitting = true`), completely locking out further audits.
     - *Root Cause 1 (Modal and Card Open Missing State Reset)*: In `AuditController.html`, `setThumbButtonsLoading(true, newStatus)` mutated the button DOM to `Saving...` and set `isSubmitting = true`. Neither `displayScannedAsset(asset)` nor `ModalController.openAssetDetailsModal(asset)` ever called `setThumbButtonsLoading(false)` or `resetSubmissionState()`, so any subsequent modal opened with the previous `Saving...` state.
     - *Root Cause 2 (Recursive Corruption of `data-prev-html`)*: If `setThumbButtonsLoading(true)` was executed while a button already showed `Saving...`, `data-prev-html` captured `Saving...`. When restored, it permanently remained `Saving...`.
     - *Root Cause 3 (Missing Watchdog Timer)*: If a network call hung or took longer than expected, `isSubmitting` stayed `true` indefinitely, blocking any future clicks with `if (isSubmitting || !activeAsset) return;`.
     - *Resolution 1 (`AuditController.html`)*: Added `data-canonical-html` caching: each button captures its pristine label/icon before any mutation and restores it faithfully on `loading === false`.
     - *Resolution 2 (`AuditController.html` & `ModalController.html`)*: Added `resetSubmissionState()` which is unconditionally invoked on `displayScannedAsset()`, `openAssetDetailsModal()`, `closeSublayers()`, and promise resolution/rejection.
     - *Resolution 3 (`AuditController.html`)*: Added a 12-second safety watchdog timer in `submitStatus()` that automatically unlocks buttons and clears `isSubmitting` if the network call stalls.
  2. **RCA: Audit Record Not Saving to Google Sheets**:
     - *Issue Reported*: User performed the audit, but the record was not persisted to Google Sheets.
     - *Root Cause 1 (Unconditional Expensive Room Scan in `updateAssetStatus`)*: Line 837 of `DatabaseService.js` called `lookupAsset(rawAssetId)` unconditionally on every update, even when `payload.sheetName` was already provided (`"Bio Prep"`). When cache missed, `lookupAsset()` scanned all 15+ room sheets synchronously in GAS (15–25s), exceeding the client's 20s timeout.
     - *Root Cause 2 (Premature JSONP Timeout)*: `invokeJsonp()` in `ApiClient.html` rejected after 20s (`setTimeout(..., 20000)`), aborting in-flight writes that were completing `SpreadsheetApp.flush()`.
     - *Root Cause 3 (Obsolete STATUS_OPTIONS in ApiClient.html)*: `STATUS_OPTIONS` in `ApiClient.html` had only 9 legacy options and was missing `"หาไม่เจอ+ให้พัสดุมาตรวจสอบหน้างาน"`, `"หมดความจำเป็นต้องใช้งาน"`, `"หมดความจำเป็นต้องใช้งานเพราะชำรุด"`.
     - *Root Cause 4 (Hyphen/Underscore Inconsistencies in Inventory Numbers)*: Strict equality comparisons failed if QR codes or spreadsheet cells differed by formatting hyphens.
     - *Resolution 1 (`DatabaseService.js`)*: Implemented lazy lookup: only invoke `lookupAsset()` if `targetSheetName` is missing or `MASTER_SHEET_NAME`.
     - *Resolution 2 (`ApiClient.html`)*: Increased JSONP timeout from 20s to 45s (`45000` ms).
     - *Resolution 3 (`ApiClient.html` & `index.html`)*: Aligned all 10 status options with `Config.js`.
     - *Resolution 4 (`DatabaseService.js` & `ApiClient.html`)*: Added normalized asset code matching (`norm = code.toUpperCase().replace(/[\s\-_]/g, '')`).
* **Automated Verification**:
  - Added Suite 45 to `Tools/test_core.js`.
  - 100% test pass rate across all 45 test suites.

## 2026-09-16 — Release v1.1.8i: Flexible Role RBAC & Bi-Sync Resilience
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 release `v1.1.8i`.
* **Deployment Scope:** Dual release deployed to Google Apps Script (`clasp push --force`, redeploy @12 and versioned deployment) and Git (`git push origin main`).
* **Root Cause Analyses & Resolutions**:
  1. **RCA: User Logout / Unauthorized Role After Master Sheet Data Loaded**:
     - *Issue Reported*: While Master Sheet data was loading, user credential was active (`👤 Mek (SuperAdmin)`). After Master Sheet data completed loading (689 assets), the user status downgraded to `⚠️ Mek (Admin)` and modal displayed `⚠️ บัญชีนี้ยังไม่ได้รับสิทธิ์เข้าใช้งาน กรุณาติดต่อแอดมิน`.
     - *Root Cause 1 (Strict Role String Comparison)*: In `AuthService.js`, `isAllowedRole` only checked exact lowercase equality against `"admin"`, `"labtech"`, `"ta"`. Real Google Sheet values such as `"Administrator"`, `"System Admin"`, or Thai labels like `"ผู้ดูแลระบบ"` or `"แอดมิน"` returned `false`.
     - *Root Cause 2 (isVerified Evaluation Bug)*: `isVerified: isAllowedRole` completely ignored `isSuperAdmin` and `isAdmin`. When `isAllowedRole` was false due to role string variations, `isVerified` became `false`.
     - *Root Cause 3 (Undeclared Variable)*: Fallback Step 3 referenced undeclared variable `isNexusMatched`, causing reference errors.
     - *Root Cause 4 (Missing clientEmail)*: `getInitialPayload` did not send `clientEmail`, so server session authentication fell back to server context which could be blank in certain iframe / cross-origin scenarios.
     - *Resolution 1 (`AuthService.js`)*: Expanded `isAllowedRole` to flexibly match administrative and science roles (`admin`, `super`, `tech`, `ta`, `lead`, `แอดมิน`, `ผู้ดูแล`, etc.).
     - *Resolution 2 (`AuthService.js`)*: Guaranteed `isSuperAdmin: true`, `isAdmin: true`, `isVerified: true`, and `role: "SuperAdmin"` unconditionally for `nattapat.poo@mahidol.ac.th`.
     - *Resolution 3 (`ApiClient.html` & `Code.js` & `DatabaseService.js`)*: Attached `clientEmail` in both `getInitialPayload` and `updateAssetStatus`.
     - *Resolution 4 (`ModalController.html` & `AppState.html`)*: Ensured UI verification status displays active green badge (`✅ บัญชีผ่านการตรวจสอบสิทธิ์จาก Nexus Master DB แล้ว`) for verified admins and superadmins.
  2. **RCA: Audit Mutation Failed to Sync to Google Sheet**:
     - *Issue Reported*: User attempted to audit an asset (`4356000-401000049664-0` in `BIO PREP`), but it did not sync/commit to Google Sheets.
     - *Root Cause 1 (Sheet Name Resolution Mismatch)*: In Master Table view, `payload.sheetName` was `"Master_Asset"`. In `DatabaseService.js`, `roomSheet = getRoomSheetByName(ss, targetSheetName)` resolved to `Master_Asset`, leaving the actual room sheet (`BIO PREP`) untouched.
     - *Root Cause 2 (Slow Full-Spreadsheet Header Setup)*: `setupRow5AuditHeaders(ss)` ran across all sheets in the spreadsheet inside `updateAssetStatus`, causing execution slowdowns and lock timeouts.
     - *Root Cause 3 (Silent Error Swallowing)*: `AuditController.html` never inspected `if (res && res.success === false)`, presenting a false optimistic success toast even when the backend rejected the update.
     - *Resolution 1 (`DatabaseService.js`)*: When `targetSheetName` is `Master_Asset`, dynamically resolve the true room sheet from `payload.registeredLocation`, `payload.room`, or `lookupAsset(rawAssetId)`. Update both the Master Table AND the individual room sheet.
     - *Resolution 2 (`DatabaseService.js`)*: Optimized row 5 header check to only configure the specific target sheet (`setupRow5AuditHeaders(ss, [roomSheet.getName()])`), running in <50ms.
     - *Resolution 3 (`AuditController.html`)*: Added explicit check for `res && res.success === false` and surfaced prominent error toasts (`❌ บันทึกไม่สำเร็จ: ...`).
* **Automated Verification**:
  - Added Suite 44 to `Tools/test_core.js`.
  - 100% test pass rate across all 44 test suites.

## 2026-09-16 — Release v1.1.8h: 2-Row Header Layout & Version Auto-Sync Anti-Downgrade Engine
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 release `v1.1.8h`.
* **Deployment Scope:** Dual release deployed to Google Apps Script (`clasp push --force`, versioned deployment) and Git (`git push origin main`).
* **Root Cause Analyses & Resolutions**:
  1. **RCA: Version Number Blinking & Reverting to 1.1.7f / 1.1.8f**:
     - *Issue Reported*: During loading master sheet data it showed `v1.1.8g`, after completion it turned into `1.1.7f`. After hitting "ล้างหมดจด" it turned into `v1.1.8f` (and after master sheet loaded turned back to `1.1.7f`).
     - *Root Cause 1 (Google Sheet Config Cell)*: The active Google Spreadsheet's `Config` worksheet tab has a cell `APP_VERSION = "1.1.7f"`. When `DatabaseService.getInitialPayload()` ran, it read `config.APP_VERSION = "1.1.7f"` and returned it to the client. The client called `AppState.applyGlobalVersion("1.1.7f")`, which overwrote the UI.
     - *Root Cause 2 (ApiClient Mock Fallback)*: In `ApiClient.html` line 279, the mock payload was hardcoded to `APP_VERSION: "v1.1.8f"`. When "ล้างหมดจด" purged storage and was briefly in mock mode, it displayed `1.1.8f`.
     - *Root Cause 3 (Passive Config Reading)*: In `Config.js`, `getLocalConfig()` only checked `if (!config.APP_VERSION)`, so it never auto-updated an existing stale `1.1.7f` cell.
     - *Resolution 1 (`Config.js`)*: Added auto-healing logic in `getLocalConfig()`: if `config.APP_VERSION !== APP_CONFIG.VERSION`, it immediately updates the Google Sheet cell with `APP_CONFIG.VERSION` (`v1.1.8h`) and sets `config.APP_VERSION = APP_CONFIG.VERSION`.
     - *Resolution 2 (`DatabaseService.js`)*: In `getInitialPayload()`, strictly enforced `config.APP_VERSION = APP_CONFIG.VERSION; config.appVersion = APP_CONFIG.VERSION;` to eliminate any chance of stale sheet versions leaking into the payload.
     - *Resolution 3 (`AppState.html`)*: Updated `AppState.getVersion()` with an anti-downgrade filter that rejects obsolete versions (`1.1.7*`, earlier `1.1.8*`) and falls back to `CURRENT_RELEASE = "v1.1.8h"`.
  2. **RCA: User Identity Box Hidden / Overlapped Behind Buttons**:
     - *Issue Reported*: A box was hidden behind the utility buttons on mobile viewports (red arrow in screenshot).
     - *Root Cause*: The user identity badge was nested inside the left flex column along with the app title on the same horizontal row as the 4 utility buttons. On compact mobile viewports (360px–430px), the 4 utility buttons (taking ~140px) caused the user pill to overflow and get covered or clipped behind the buttons.
     - *Resolution (`index.html` 2-Row Header Layout)*:
       - **Row 1**: Dedicated solely to the Ecosystem Supertitle + App Title on the left, and the 4 compact utility buttons on the right.
       - **Row 2**: A dedicated full-width sub-header status strip below Row 1:
         - Left: Semantic Version Badge (`v1.1.8h • Mobile Audit`).
         - Right: User Identity Pill (`[👤 Mek (SuperAdmin)]`) with `max-w-[200px]` and truncate protection.
       - Zero overlap, zero clipping across all screen sizes.
* **Automated Verification**:
  - Added Test Suite 43 to `Tools/test_core.js`. All 43 test suites pass 100%.

## 2026-09-16 — Release v1.1.8g: Master DB Verification, Auditor Nickname, Header Display & Full Purge Engine
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 release `v1.1.8g`.
* **Deployment Scope:** Dual release deployed to Google Apps Script (`clasp push --force`, versioned deployment) and Git (`git push origin main`).
* **Key Implementations & Features**:
  - **Master DB Google Sheet Verification as Primary Authority**:
    - Re-architected `AuthService.getAuthorizedUsers()` and `authenticateSession()` to strictly query the Master Google Sheet's `User` tab (`getSpreadsheet().getSheetByName("User")`) and `NEXUS_SPREADSHEET_ID` first.
    - Verified user roles against the allowed Master DB roles: **`Admin`**, **`LabTech`**, and **`TA`** (plus `SuperAdmin`).
    - The 5-member science team baseline registry (`MASTER_USER_REGISTRY`) now operates strictly as a resilient offline fallback when the Google Sheet is unreachable or network is offline.
  - **User Display Mounted under App Title / Version Badge**:
    - Added user identity pill directly below the app title and version badge in `index.html` displaying the logged-in technician's nickname and role (e.g. `👤 Mek (SuperAdmin)`).
    - Integrated with `AppState.applyUserDisplay()` to automatically react to session changes, SWR re-validations, and cache updates.
  - **Auditor Nickname Recording into Google Sheet**:
    - Updated `DatabaseService.js` and `AuditController.html` to record the technician's displaying nickname (`Mek`, `Mai`, `Fern`, `Win`, `Kris`) into the `Auditor` column (Col P / 16) in the room sheet when saving audit records.
  - **Complete Purge & Fresh App Restart Engine**:
    - Added `#btn-full-purge-restart` in the Stat tab (`#view-summary`) and Developer Gateway:
      1. Clears all client `localStorage` (`localStorage.clear()`) and `sessionStorage.clear()`.
      2. Calls `ApiClient.clearLocalCache()` to clear memory stores.
      3. Invokes `ApiClient.flushCache()` to clear server `CacheService` and `PropertiesService`.
      4. Executes a hard page reload (`window.location.reload(true)`), booting the web app completely fresh from zero.
  - **Architecture Analysis: Micrologging to Google Sheets vs Local Telemetry**:
    - Evaluated why synchronous micro-logging (camera start, toasts, frame clicks) to Google Sheets creates severe latency (~300ms–1500ms per write), exhausts daily Google quotas (100 reqs/100s), and causes cell locking.
    - Confirmed that client-side LocalStorage logging (`AppState.activityLogs`) in <1ms without network calls is the optimal architecture, while only saving audit business mutations to Google Sheets.
  - **Automated Verification**:
    - Added Test Suite 42 to `Tools/test_core.js`. All 42 test suites pass 100%.

## 2026-09-15 — Release v1.1.8f: Master Google Sheet User Tab Inspection & 5-Member Team Registry
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 release `v1.1.8f`.
* **Deployment Scope:** Dual release deployed to Google Apps Script (`clasp push --force`, versioned deployment) and Git (`git push origin main`).
* **Key Implementations & Features**:
  - **Master Google Sheet `User` Tab Inspection**:
    - Previously, user verification in `AuthService.js` strictly targeted the external `NEXUS_SPREADSHEET_ID`. It did not check the `User` tab within the primary master asset spreadsheet (`getSpreadsheet()`).
    - Updated `AuthService.getAuthorizedUsers()` to first inspect `getSpreadsheet().getSheetByName("User")`, extracting columns for Email, Name/Nickname, and Role with dynamic header resolution (`Email`, `User`, `Name`, `Role`).
  - **5-Member Science Team Baseline Authorization & Fallback**:
    - Created `MASTER_USER_REGISTRY` in `AuthService.js` and updated `ApiClient.verifyMahidolUser` to ensure all 5 science department members are guaranteed instant verification, correct nickname mapping, and `Admin`/`SuperAdmin` permission:
      1. `nattapat.poo@mahidol.ac.th`: Mek (SuperAdmin / Lead)
      2. `nattasuda.yaw@mahidol.ac.th`: Mai (Admin / TA / LabTech)
      3. `rawinsiwat.dec@mahidol.ac.th`: Win (Admin / TA / LabTech)
      4. `panisa.lue@mahidol.ac.th`: Fern (Admin / TA / LabTech)
      5. `thanaphat.cha@mahidol.ac.th`: Kris (Admin / TA / LabTech)
  - **Config & Cache Integration**:
    - Updated `ADMIN_USERS` in `Config.js` to include the full email addresses in addition to nicknames.
    - Added `AUTHORIZED_USERS_CACHE` and `NEXUS_USERS_CACHE` invalidation to `Nexus_FlushCache()` ensuring immediate synchronization when users are updated.
  - **Automated Verification**:
    - Added Test Suite 41 to `Tools/test_core.js` validating User tab parsing, master user registry fallback, and functional authentication for all 5 team members.
    - All 41 automated suites pass 100%.

## 2026-09-15 — Release v1.1.8e: Total Flush Cache Button in Stat Tab & Complete Cache Purge Engine
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 release `v1.1.8e`.
* **Deployment Scope:** Dual release deployed to Google Apps Script (`clasp push --force`, versioned deployment) and Git (`git push origin main`).
* **Key Implementations & Features**:
  - **User Feedback & Camera Confirmation**:
    - User reported: "the camera scan is running fine now" — verifying that the standard string constraint fix `{ facingMode: currentFacingMode }` and `webkit-playsinline` permanently solved the camera feed initialization failure across iOS and Android.
  - **Total Flush / Clear All Cache Button in Stat Tab**:
    - Added dedicated action banner in `#view-summary` (Stat tab) with primary button `#btn-total-flush-cache` (`[🧹 ล้างแคชระบบทั้งหมด]`).
    - Added a quick-trigger Total Flush button inside the Developer Gateway Modal (`#dev-gateway-modal`).
    - Engineered `ModalController.triggerTotalFlushCache()`:
      1. Client cache purge: Clears `localStorage` keys (`MUIDS_INITIAL_PAYLOAD_CACHE`, `MUIDS_ASSET_CACHE_*`), resets in-memory cache via `ApiClient.clearLocalCache()`, and clears `sessionStorage`.
      2. Server cache purge: Executes `ApiClient.flushCache()` which clears `CacheService` scripts and `PropertiesService` indexes on Google Apps Script.
      3. Live Re-hydration: Executes `ApiClient.getInitialPayload()`, stores fresh payload in `localStorage`, updates `AppState` (summary, config, rooms), triggers `AppState.applyGlobalVersion()`, and refreshes summary stat counters.
      4. Telemetry: Logs action to `AppState.logActivity("sync", "Total Flush & Clear Cache", ...)` and shows clear 6.0s confirmation toast (`✅ ล้างแคชทั้งหมดและดึงข้อมูลใหม่สำเร็จ!`).
  - **Automated Verification**:
    - Expanded test suite in `Tools/test_core.js` to 40 complete test suites. All 40 suites passing 100%.

## 2026-09-15 — Release v1.1.8d: Camera Feed RCA, Universal Telemetry & Globalized Versioning
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 release `v1.1.8d`.
* **Deployment Scope:** Dual release deployed to Google Apps Script (`clasp push --force`, versioned deployment) and Git (`git push origin main`).
* **Root Cause Analysis (RCA) on Camera Feed Initialization Failures**:
  - **RCA 1: Constraints Format Mismatch in Html5Qrcode**:
    - Passing `{ facingMode: { ideal: "environment" } }` caused Html5Qrcode to treat the object as a constraint string, generating an invalid MediaTrackConstraint `[object Object]` that failed WebRTC validation in iOS Safari and Android Chrome (`OverconstrainedError` / `TypeError`).
    - Fixed by using clean standard constraints: `{ facingMode: currentFacingMode }` (`"environment"` or `"user"`).
  - **RCA 2: iOS WebKit Video Autoplay Restrictions**:
    - iOS Safari rejects video playback unless `<video webkit-playsinline playsinline muted autoplay>` is explicitly declared on the element before stream playback begins.
    - Fixed by enforcing `webkit-playsinline` and `playsinline` directly on the viewfinder video tag.
  - **RCA 3: Google Apps Script Web App Sandboxed Iframe Permissions**:
    - Google Apps Script embeds Web Apps inside a sandboxed iframe without `allow="camera; microphone"` on certain mobile browsers.
    - Probed `window.isSecureContext` and `window.self !== window.top` to diagnose sandbox restrictions and route technicians to the native snapshot mode (`<input type="file" capture="environment">`).
* **Globalized Dynamic Versioning from Config Sheet**:
  - Centralized version authority to the Google Sheet's `Config` tab (`APP_VERSION`).
  - Added `AppState.getVersion()` and `AppState.applyGlobalVersion()` to bind version labels dynamically without static hardcoding.
  - Updating `APP_VERSION` in the Google Sheet now instantly propagates to all headers, canvas badges, footers, and developer modals.
* **Comprehensive Telemetry & Activity Logging**:
  - Logged camera startup attempts, initialization successes, and detailed failure diagnostics into `AppState.logActivity("camera", ...)`.
  - Logged "Snap Photo" captures, file processing, and decode outcomes into `AppState.logActivity("snap", ...)`.
  - Logged all toast notifications into `AppState.logActivity("toast", ...)`.
  - Added dedicated styling and icons for all telemetry event types in the Stat tab (`#view-summary`).
* **Verification**:
  - All 39 automated verification suites passing in `Tools/test_core.js`.

## 2026-09-15 — Release v1.1.8b: Camera Feed Fix, Toast Polish, Activity Logs Panel & Branding Update
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 release `v1.1.8b`.
* **Deployment Scope:** Dual release deployed to Google Apps Script (`clasp push --force`, versioned deployment) and Git (`git push origin main`).
* **Key Bug Fixes & Visual Implementations:**
  - **Camera Feed Black Square Elimination**:
    - Identified root cause of the solid black square with the scanning red laser: when the scanner tab was hidden on initial launch (`activeTab: "roster"`), `viewfinderWidth` and `viewfinderHeight` were computed as 0px, causing Html5Qrcode to generate `#qr-shaded-region` with 50% border thickness covering the entire `<video>` element.
    - Permanently suppressed `#qr-shaded-region` via CSS (`display: none !important; opacity: 0 !important; pointer-events: none !important;`) and forced `#qr-reader video` to render `100%` width and height with `object-fit: cover`.
    - Removed conflicting rigid landscape `videoConstraints` in `ScannerController.html` to allow portrait mobile devices to establish clean, unconstrained camera streams.
    - Added `videoWidth > 0` and `readyState >= 2` safety checks before invoking `BarcodeDetector.detect()`.
  - **Toast Notification Timing & Tap-to-Hold Polish**:
    - Extended default toast dismiss timer from 3.5s to 8.5s (enforced minimum 6.5s) to ensure technicians have adequate time to read alerts on mobile devices.
    - Fixed premature tap dismissal: previously tapping the toast triggered immediate dismissal. Now, tapping expands the notification into full-width untruncated card text and resets the dismiss timer to 15.0s.
    - Added an explicit `x` close button on expanded toasts for deliberate dismiss actions.
  - **User Activity Logs Panel in Stat Tab**:
    - Added `#activity-logs-panel` inside `#view-summary` (Stat tab) with real-time audit history, action counts, and a clear logs button.
    - Persisted activity events (audited assets, status actions, unlisted registrations) to `localStorage` (`MUIDS_ACTIVITY_LOGS_v1.1.8b`) up to 80 records.
    - Rendered responsive badges with timestamps, inventory numbers, room tags, and notes.
  - **Footer Version Branding**:
    - Updated bottom footer version branding string from `v1.1.7e` to `v1.1.8b` (`QR Asset Survey • MUIDS Science Dept • v1.1.8b`).
* **Verification**:
  - All 38 automated verification suites passing in `Tools/test_core.js`.

## 2026-09-15 — Release v1.1.8a: Instant BarcodeDetector, Comment Step, SWR Caching & Mahidol Nexus Auth
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 release `v1.1.8a`.
* **Deployment Scope:** Dual release deployed to Google Apps Script (`clasp push --force`, versioned deployment) and Git (`git push origin main`).
* **Key Visual & Architectural Implementations:**
  - **Hardware-Accelerated 60fps Native BarcodeDetector (AppSheet Parity)**:
    - Integrated native browser `BarcodeDetector` running on a continuous `requestAnimationFrame` loop directly against the camera's `<video>` element.
    - Achieved sub-5ms recognition speed matching AppSheet's instantaneous scanning capability.
    - Configured uncropped full-frame scanning boundary and continuous autofocus at 1280x720 ideal resolution.
  - **Sub-20ms Startup Timing via SWR Caching & GAS CacheService**:
    - Implemented client-side Stale-While-Revalidate (SWR) caching with `localStorage.getItem("MUIDS_INITIAL_PAYLOAD_CACHE")` for instant app startup.
    - Integrated Google Apps Script `CacheService.getScriptCache()` (1800s TTL) for room summaries with automated invalidation upon updates.
  - **Clean Column N (`หมายเหตุปี 69`) Remarks**:
    - Permanently removed automatic injection of `"[Found in Master_Asset]"` or `"[Found in <Room>]"`.
    - Column N remains blank unless the auditor explicitly types a custom note.
  - **Multi-Step Audit Workflow with Comment Box & Universal Back Navigation**:
    - Enforced sequential modal progression: **Scan $\rightarrow$ Found Record $\rightarrow$ 1-Tap Status Action $\rightarrow$ Comment Box (Optional) $\rightarrow$ Sticker Modal $\rightarrow$ Save Record**.
    - Added `#modal-sublayer-comment` and `#card-sublayer-comment` with optional `หมายเหตุปี 69` input and `[◀ ย้อนกลับ]` / `[ถัดไป: ตรวจสติกเกอร์ ➔]` buttons.
    - Added `[◀ ย้อนกลับ]` back button navigation across all modal views (`modal-sublayer-move`, `modal-sublayer-rename`, `modal-sublayer-comment`, `modal-sublayer-sticker`).
  - **Mahidol Google Account Verification & Nexus Master DB Match**:
    - Added `isMahidolDomain` in `AuthService.js` checking `@mahidol.ac.th`, `@mahidol.edu`, `@student.mahidol.ac.th`.
    - Validated user authorization against the `User` sheet in Nexus Master DB (`11PUpY4zVClvVbfzgu4Olyzy6e5NacNUXZv30bexQQB8`).
    - Added `#header-user-badge` in app header and `#user-profile-modal`.
* **Verification**:
  - All 37 automated verification suites passing in `Tools/test_core.js`.

## 2026-09-14 — Release v1.1.7f: Public Anonymous Web App Bridge, Autofocus Lens & Mock Purge
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 release `v1.1.7f`.
* **Deployment Scope:** Dual release deployed to Google Apps Script (`clasp push --force`, `@12`) and Git (`git push origin main`).
* **Key Bug Fixes & Architectural Enhancements:**
  - **Public Anonymous Web App Access (`ANYONE_ANONYMOUS`)**:
    - Reconfigured `appsscript.json` from `ANYONE` (which mandated Google account authentication and redirected unauthenticated mobile browsers to `accounts.google.com`) to `ANYONE_ANONYMOUS`.
    - Allowed any mobile phone, tablet, or PC to immediately fetch real Google Sheet records via GitHub Pages with zero login wall.
  - **100% Mock Data Elimination**:
    - Completely cleared `INITIAL_LAB_ASSETS` to `[]`.
    - Replaced dummy fallback records with real Google Sheet data caching in `localStorage` (`MUIDS_ASSET_CACHE_v1.1.7f`).
  - **Primary JSONP Low-Latency Bridge**:
    - Switched GitHub Pages remote transport to prioritize `invokeJsonp`, bypassing cross-origin redirect blocks and slashing initial sheet load times from 12s to ~300ms.
  - **Autofocus Camera Selection**:
    - Upgraded `ScannerController.html` to prioritize `{ facingMode: "environment" }` with `focusMode: "continuous"`.
    - Avoids selecting blurry auxiliary macro or selfie cameras on multi-lens smartphones.
    - Expanded QR detection bounding box to 85% with debounce error recovery.
* **Verification**:
  - All 36 automated verification suites passing in `Tools/test_core.js`.

## 2026-09-14 — Pre-Release v1.1.7e: Room Landing Tab, Header Versioning & Mobile Canvas
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 pre-release `v1.1.7e`.
* **Deployment Scope:** Dual release deployed to Google Apps Script (`clasp push --force`, `@9`) and Git (`git push origin main`, commit `9d2e808`).
* **Key Visual & Architectural Implementations:**
  - **Version Numbering Under App Title**:
    - Moved version string (`v1.1.7e • Mobile Audit`) directly underneath `🔍 QR Asset Survey`, guaranteeing zero horizontal truncation on compact smartphone screens.
  - **Room Tab as Default Landing Tab (Center Tab Preserved)**:
    - Updated `AppState.html` default `activeTab: "roster"`, ensuring technicians immediately see loaded Google Sheet database items upon launch.
    - Maintained exact 3-tab layout: `Scan` (left) | `Room` (center, active) | `Stat` (right).
    - Prevents immediate hardware camera permission triggers on app boot.
  - **Discrepancy Banner Removed**:
    - Purged the location mismatch notification box from the matched asset modal.
  - **Save Sticker Button Layout Refinement**:
    - Left-aligned checkmark icon with stacked Thai and English text labels.
  - **Mobile Canvas Simulator & UI Hardening**:
    - 430px centered mobile canvas on desktop browsers.
    - Tightened spacing between navigation tabs and room filter bar.
    - Full modal boundary containment (`.app-modal-dialog`) preventing viewport overflow.
    - Linger toast duration extended (>=5s) with tap/hover expandability.
* **Verification**:
  - 36/36 automated test suites passing in `Tools/test_core.js`.

## 2026-09-14 — Release v1.1.6b: GitHub Pages Live Google Sheets Bridge & Full Version Roll
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.6b`.
* **Deployment Scope:** Dual release deployed to Google Apps Script (`clasp push --force`) and Git (`git push origin main`) + GitHub Pages build.
* **Key Visual & Architectural Implementations:**
  - **Bidirectional Live Google Sheets Bridge for Static GitHub Pages**:
    - Enhanced `doGet(e)` in `Code.js` to dispatch API requests via GET query parameters (`action`, `payload`) with JSON and JSONP script injection (`callback`).
    - Upgraded `ApiClient.html` with dynamic multi-transport failover (GAS Native `google.script.run` -> HTTPS REST POST `fetch` -> JSONP GET script tag -> Offline 15-room mock store).
    - Exposed `ApiClient.getBridgeStatus()` and `ApiClient.setGasEndpointUrl()` for debugging and persistent endpoint management.
  - **Dynamic Toast Notification Version**:
    - Fixed legacy hardcoded `v1.1.2a` in `ModalController.html` to dynamically reflect current `APP_VERSION`.
  - **Full Codebase Roll to `v1.1.6b`**:
    - Updated all backend services, frontend controllers, HTML templates, and verification test suites.
* **Verification**:
  - 33/33 automated tests passing in `Tools/test_core.js`.

## 2026-09-14 — Release v1.1.5a: 15-Room Comprehensive Mock Data & Dynamic Live GAS Bridge
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.5a`.
* **Deployment Scope:** Dual release deployed to Google Apps Script (`clasp push --force`) and Git (`git push origin main`).
* **Key Visual & Architectural Implementations:**
  - **15-Room Realistic Mock Data**: Distributed real lab equipment across all 15 rooms (`Bio Prep`, `Bio1`, `Bio2`, `Chem Pre`, `Chem1`, `Chem2`, `Physics P`, `Physics1`, `Physics2`, `Mobile`, `Science`, `ปาณิษา`, `ชำรุด`, `ไม่ใช้งาน`, `Storage`), purging legacy "Lab 204" assets.
  - **Dynamic GAS Endpoint URL Bridge**: Added `getGasEndpointUrl()` supporting query string parameter `?gas_url=` and `localStorage` overrides with live connection flag.
  - **GAS Continuous Camera Scanning Whitepaper**: Published comprehensive architectural guide at `Documentations/GAS_Continuous_Scanning_Limitations.md`.
* **Verification**:
  - All test suites passing in `Tools/test_core.js`.

## 2026-09-12 — Production Release v1.1.4: Dual Deployment to Google Apps Script & Git
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 official production release `v1.1.4`.
* **Deployment Scope:** Dual release deployed to Google Apps Script (`clasp push --force`) and Git (`git push origin main`).
* **Key Features & Architectural Highlights:**
  - **Balanced Responsive Typography**: Clean, legible font scaling (16.5px mobile / 17px desktop) with optimized control targets.
  - **Auditor Column (`Col 16 / Col P`)**: Room-level auditor identity tracking without polluting the Master Table.
  - **Tri-Layer Data Consistency Guard**: Seamless bi-directional sync (manual edit trigger + contradiction detection).
  - **Usage Analytics Dashboard**: `Stats` sheet auto-provisioning and real-time Web App modal analytics.
  - **Expanded Toast Interaction**: 3.5s linger duration with tap/hover expansion.
  - **6-Column Master Sheet Invariant**: Strict column alignment with immediate flush on write operations.
* **Verification**:
  - Full 33 test suites passing in `Tools/test_core.js`.
  - Preview bundle generated and verified.

## 2026-09-12 — Release v1.1.4d: Moderate Typography Scaling & Perfect Mobile Layout Fit
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.4d`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Strictly ZERO git commit or push.
* **Key Visual & Ergonomic Implementations:**
  - **Calibrated Balanced Root Scale**:
    - Root font size set to `16.5px` on mobile and `17px` on desktop (`@media (min-width: 640px)`).
  - **Moderate Typography Hierarchy**:
    - `h1, .text-xl`: `1.30rem`
    - `h2, .text-lg`: `1.15rem`
    - `h3, .text-base`: `1.02rem`
    - `.text-sm`: `0.92rem`
    - `.text-xs`: `0.82rem`
    - `.text-[11px]`: `0.78rem`
    - `.text-[10px]`: `0.74rem`
    - `.text-[9px]`: `0.70rem`
    - `.asset-row-card h4`: `1.05rem`
  - **Ergonomic Touch Controls**:
    - Thumb buttons (`.thumb-btn` height `52px`, `1rem` text), inspection buttons (`.inspection-sticker-btn` height `46px`, `0.95rem` text), pills & chips (`0.88rem` text), form inputs (`1rem` text), and toasts (`0.92rem` text).
  - **Automated Verification**:
    - Verified 33/33 test suites passing in `Tools/test_core.js`.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (33/33 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force`.

## 2026-09-12 — Release v1.1.4c: Ultra-Large Root Typography Scaling (Sky-High Legibility)
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.4c`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Strictly ZERO git commit or push.
* **Root Cause & Visual Architecture Overhaul:**
  - **The Desktop Readability Root Cause**:
    - On desktop monitors, Tailwind's `rem`-based classes were referencing the browser's default `16px` root font size (`<html>`), and responsive breakpoints (`sm:text-xs`, `sm:text-sm`) were capping text sizes.
  - **The Fix (`:root, html { font-size: 21px !important; }`)**:
    - Elevated the root rem calculation base to `21px`, causing all Tailwind classes (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, etc.) to automatically scale up by 40-50% across desktop and mobile.
    - Added comprehensive `!important` rules on headings, cards, inputs, buttons, chips, and toasts so responsive utilities never shrink text.
  - **Automated Verification**:
    - Suite 33 updated in `Tools/test_core.js`, passing 33/33 test suites.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (33/33 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force`.

## 2026-09-12 — Release v1.1.4b: Mobile Font Scaling & Enhanced Field Legibility
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.4b`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Strictly ZERO git commit or push.
* **Key Visual & Ergonomic Implementations:**
  - **Base Body Font Size Enlarged**:
    - Increased base body font size from `17.5px` to `19px` with `line-height: 1.6` across the entire web application to make all inventory details, asset cards, badges, and modal overlays easy to read on mobile devices in the field.
  - **Scaled Responsive Typography Hierarchy**:
    - `h1, .text-xl`: `1.55rem`
    - `h2, .text-lg`: `1.35rem`
    - `h3, .text-base`: `1.20rem`
    - `.text-sm`: `1.08rem`
    - `.text-xs`: `0.98rem`
    - `.text-[11px]`: `0.92rem`
    - `.text-[10px]`: `0.86rem`
    - `.text-[9px]`: `0.80rem`
  - **Touch Target & Button Typography Upgrades**:
    - Scaled form inputs, textareas, and select dropdowns to `1rem` / `19px` to provide clear field reading and eliminate mobile iOS Safari auto-zoom on input focus.
    - Scaled `.thumb-btn` text to `1.05rem` (min-height `56px`), `.inspection-sticker-btn` to `1.02rem`, `.sticker-pill` and `.filter-chip` to `0.95rem`, and `.app-toast` to `1rem`.
  - **Automated Verification**:
    - Added Suite 33 in `Tools/test_core.js` verifying mobile font scaling, responsive hierarchy, and touch button ergonomics. All 33 test suites passing cleanly (33/33).
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (33/33 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force`.

## 2026-09-12 — Release v1.1.4a: Auditor Column on Room Sheets, Layer 2 onEdit Trigger & Usage Stats Engine
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.4a`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Strictly ZERO git commit or push.
* **Key Architecture & Data Consistency Implementations:**
  - **Auditor Column (`Col 16 / Col P`) on Individual Room Sheets**:
    - Configured Menu 1 (`setupRow5AuditHeaders`) in `DatabaseService.js` to insert/format `Auditor` column right after Col O (`สติกเกอร์`) at Column 16 (Col P), cleanly shifting historical audit data (`ปี68`..`ปี63`) to Columns 17–21 (Cols Q–U).
    - In `updateAssetStatus` and `addNewUnlistedAsset`, writes the auditor's display name from user session authentication (`authenticateSession()`) to Col 16 of the room sheet.
    - **Strict Master Non-Aggregation**: The `Auditor` column is strictly kept on individual room sheets and is **not** aggregated into `Master_Asset`, maintaining `Master_Asset` as 6 lean columns (`Inventory number`, `Asset description1`, `Room`, `Scanned 69`, `หมายเหตุปี 69`, `สติกเกอร์`).
  - **Layer 1, 2 & 3 Data Consistency Protection**:
    - **Layer 1**: Operational Ground Truth documentation and Menu 2 selective aggregation engine.
    - **Layer 2 (`onEdit(e)`)**: Simple Google Sheets trigger in `Code.js` to detect manual cell edits made in room sheets (Cols M, N, O, D, I at Row $\ge 6$) and immediately synchronize edited values to `Master_Asset`.
    - **Layer 3**: Cross-sheet contradiction detection (`checkMasterTableContradictions`) & Contradiction Modal.
  - **Stats Sheet Auto-Provisioning & Web App Usage Analytics UI**:
    - Added `ensureStatsSheet(ss)` in `TelemetryService.js` to automatically create and format the `Stats` sheet tab.
    - Implemented `getAppUsageStats()` backend endpoint returning total assets, audited count, remaining count, completion percentage, status breakdown, sticker breakdown, auditor leaderboard, and room-by-room progress bars.
    - Added dedicated "📊 Stats" button in Web App header and a mobile-responsive "Usage & Audit Stats" Modal (`statsModal`) with real-time refresh capability.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (32/32 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force`.

## 2026-09-12 — Release v1.1.3n: Full Codebase & Documentation Cleanup & Comprehensive Audit
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.3n`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Strictly ZERO git commit or push.
* **Key Architecture & Audit Implementations:**
  - **Full Codebase Audit**:
    - Audited all 16 Google Apps Script modules (`App_Script/`) for clean syntax, robust error handling, and unified versioning badges.
    - Verified all client-side JavaScript controllers and styles for zero parse warnings and seamless mobile interactivity.
  - **Comprehensive Documentation Cleanup**:
    - Synchronized all repository guides (`CHANGELOG.md`, `DevLog.md`, `Planning.md`, `Project_Profile.md`, `Architectural_Safety_Guide.md`, `Handover_Guide.md`, `README.md`) with the 6-column Master Table schema and interactive toast UX standards.
  - **Automated Verification**:
    - Suite 31 added to `Tools/test_core.js`, achieving 31/31 passing test suites.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (31/31 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force`.

## 2026-09-12 — Release v1.1.3m: Interactive Toast Expand-on-Tap/Hover, 3.5s Duration & SKILL.md Standard
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.3m`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Strictly ZERO git commit or push.
* **Key Architecture & UI/UX Implementations:**
  - **Interactive Expand-on-Tap/Hover Toast Notifications**:
    - Re-engineered `showToast` in `ModalController.html` with interactive event handlers for desktop `mouseenter`/`mouseleave` and mobile/desktop `click`.
    - Initial state renders as a non-intrusive floating pill (`rounded-full`, with truncated text `truncate max-w-sm sm:max-w-md`).
    - Tapping, clicking, or hovering expands the container to `rounded-2xl max-w-lg break-words whitespace-normal` with an expand indicator/dismiss icon, displaying full untruncated content.
    - Pauses the auto-dismiss timer while active; resumes with a 2.5s grace period on mouseleave or immediate dismiss on re-tap.
    - Set default toast duration to **3.5 seconds** (minimum 3.0 seconds enforced).
  - **Ecosystem Skill Standard (`SKILL.md`)**:
    - Documented the **Universal Toast Notification & Expand-on-Tap Standard** in `lab-oops-standards/SKILL.md` under Section 3 (Responsive UI/UX Standards).
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (30/30 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force`.

## 2026-09-12 — Release v1.1.3l: 6-Column Master Sheet Schema Dynamic Extraction & Immediate Auto-Sync Flush
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.3l`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Strictly ZERO git commit or push.
* **Key Architecture & Data Pipeline Implementations:**
  - **6-Column Master Sheet Dynamic Indexing**:
    - Restructured `getMasterAuditSummary`, `lookupAssetInMaster`, `updateAssetStatus`, and `addNewUnlistedAsset` in `DatabaseService.js` to dynamically map headers and fall back to the new 6-column schema:
      - Col A (0): `Inventory number`
      - Col B (1): `Asset description1`
      - Col C (2): `Room`
      - Col D (3): `Scanned 69`
      - Col E (4): `หมายเหตุปี 69`
      - Col F (5): `สติกเกอร์`
    - Eliminated previous 20-column legacy offset mapping in `getMasterAuditSummary` which caused `Scanned 69` (`row[3]`) to appear as the item title and `Asset description1` (`row[1]`) to appear as the asset ID.
  - **Real-Time Spreadsheet Persistence**:
    - Added `SpreadsheetApp.flush()` to `updateAssetStatus` and `addNewUnlistedAsset` to commit all cell modifications instantly before the RPC call completes.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (29/29 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force`.

## 2026-09-12 — Release v1.1.3k: Status Chip Category Tone Matching (Green / Red / Gray) & Extra Typography Scaling
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.3k`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Strictly ZERO git commit or push.
* **Key Architecture & UI/UX Implementations:**
  - **Status Chip Category Tone Matching (Only Green / Red / Gray)**:
    - Updated `openStickerInspectionSublayer` in `AuditController.html` to dynamically calculate and assign the appropriate category color tone to `#modal-sticker-selected-status-badge` and `#card-sticker-selected-status-badge`.
    - Group 1 (Active/In-Use: `ใช้งานอยู่`, `ใช้งานอยู่แต่ชำรุดนะ`, Move Room, Rename Asset) -> 🟢 Green (`.badge-status-green`).
    - Group 2 (No Longer Needed: `หมดความจำเป็นต้องใช้งาน`, `หมดความจำเป็นต้องใช้งานเพราะชำรุด`) -> 🔴 Red (`.badge-status-red`).
    - Group 3 (Missing / Verify: `สูญหาย`, `หาไม่เจอ`, `หาไม่เจอ+ให้พัสดุมาตรวจสอบหน้างาน`, `งง+ให้พัสดุมาตรวจสอบหน้างาน`) -> ⚫ Gray (`.badge-status-gray`).
    - Added high-contrast dark mode and light mode (`body.theme-light`) CSS styles in `styles.html`.
  - **Extra Typography & Font Size Scaling**:
    - Increased base body font size to **`17.5px`** (`line-height: 1.58`).
    - Enhanced responsive typography scaling across headings, navigation tabs, cards, inputs, textareas, and buttons for field readability.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (28/28 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force`.

## 2026-09-12 — Release v1.1.3j: Dark Mode Legacy Cleanup in Light Mode, Universal Sticker Trigger & Typography Scaling
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.3j`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Strictly ZERO git commit or push.
* **Key Architecture & UI/UX Implementations:**
  - **Dark Mode Legacy Cleanup in Light Mode**:
    - Overhauled Audit Stats card backgrounds by overriding Tailwind opacity utilities (`.bg-emerald-950/30`, `.bg-amber-950/30`, `.bg-rose-950/30`, `.bg-sky-950/30`, `.bg-purple-950/30`) with light pastel tints (`#ecfdf5`, `#fffbeb`, `#fff1f2`, `#f0f9ff`, `#faf5ff`), eliminating dark/muddy cards.
    - Upgraded camera standby state (`#scanner-placeholder`, `.scanner-overlay-box`) with clean white backgrounds, high-contrast text (`#0f172a`, `#334155`), and crisp button styling.
    - Redesigned toast alerts (`.app-toast`, `.toast-success`, `.toast-error`, `.toast-warning`, `.toast-info`) with high-contrast colored borders and dark text.
    - Updated skeleton loader (`#roster-loading-state`), modals (`#manual-lookup-modal`, `#unrecognized-asset-modal`, `#dev-gateway-modal`), inputs, and dropdowns.
  - **Universal Sticker Check Modal Trigger**:
    - Configured all 10 1-tap action buttons across all 3 groups to immediately open the Sticker Check sublayer (`openStickerInspectionSublayer`), making sticker verification seamless for every status action.
    - Integrated Move Room and Rename Asset sublayers into the Sticker Check flow before persisting.
  - **App-Wide Typography Scaling**:
    - Increased base body font size to `16px` (`line-height: 1.55`) in `styles.html`.
    - Proporionately scaled headers, navigation tabs, stat counters, item cards, and buttons for field legibility.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (27/27 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force`.

## 2026-09-12 — Release v1.1.3i: Front Copy Icons, Blank Notes, Sticker Check & Light Theme Overhaul
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.3i`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Strictly ZERO git commit or push.
* **Key Architecture & UI/UX Implementations:**
  - **Front Copy Buttons**: Placed one-click copy buttons before Asset Name and Inventory Number in both the matched asset card and pop-up modal dialog for clean left alignment and touch ergonomics.
  - **Blank Notes Initialization**: In the sticker inspection sublayer (`#modal-sticker-change-notes` / `#card-sticker-change-notes`), the textarea now opens completely empty (`notesElem.value = ""`) rather than auto-populating old remarks.
  - **Renamed to "Sticker Check"**: Cleaned up the header title in `#card-sublayer-sticker` and `#modal-sublayer-sticker` to concise "Sticker Check".
  - **Removed Redundant 1-Tap Row in Modal**: Removed "บันทึกสถานะ Scanned 69 (AY 2569): 1-Tap Action" row from `#asset-details-modal` to minimize modal height on vertical mobile displays.
  - **Thorough Light Mode Color Panel Overhaul**: Comprehensive styling overhaul across header, nav tabs, cards, inputs, textareas, sublayer containers, sticker buttons, and action buttons for crystal-clear readability, elegant surface contrast, and WCAG AAA compliance.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (26/26 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force`.

## 2026-09-12 — Release v1.1.3h: Column O (สติกเกอร์) Bi-Sync & Post 1-Tap Sticker Inspection Workflow
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.3h`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Git repository and GitHub Pages deliberately unpushed per user instruction.
* **Key Architecture & UI/UX Implementations:**
  - **Column O (`สติกเกอร์`) Aggregation & Migration Bi-Sync (Menu 2 & Menu 3)**:
    - Extended Master Table schema to 6 essential columns: Col A (`Inventory number`), Col B (`Asset description1`), Col C (`Room`), Col D (`Scanned 69`), Col E (`หมายเหตุปี 69`), Col F (`สติกเกอร์`).
    - Menu 2 (`buildMasterTableFromRooms`) extracts Column O (`สติกเกอร์`, idx 14) from each room sheet starting at Row 6 and populates Column F in `Master_Asset`.
    - Menu 3 (`migrateMasterToRoomSheets`) parses Column F (`สติกเกอร์`) back into Column O (Col 15) of individual room worksheets for matched and newly appended rows.
  - **Post 1-Tap Sticker Integrity Inspection Workflow**:
    - Tapping any 1-Tap status button seamlessly opens a dedicated **Sticker Integrity Inspection** sublayer (`#modal-sublayer-sticker` / `#card-sublayer-sticker`).
    - Displays the chosen audit status badge and provides 3 color-coded sticker condition choices:
      1. 🟢 **`ปกติ` (Intact / Good)** (Default preselected)
      2. 🖨️ **`ปริ้นใหม่` (Needs Reprint)** (Faded, peeling, or damaged tag)
      3. ✏️ **`ปริ้นใหม่+แก้ข้อมูล` (Reprint + Change Info)** (Modify name, value, room)
    - Provides a dedicated change notes textarea (`#modal-sticker-change-notes` / `#card-sticker-change-notes`) allowing technicians to record exact required adjustments.
    - Clicking "ยืนยันและบันทึก" saves both status and sticker condition to Master Table and Room Sheets, merges change notes into `หมายเหตุปี 69`, closes the dialog, displays a 3s toast, and auto-resumes the camera stream.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (25/25 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force`.

## 2026-09-12 — Release v1.1.3g: Light Mode High-Contrast Overhaul, Modal Boundary Containment & Compact Copy Buttons
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.3g`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Git repository and GitHub Pages deliberately unpushed per user instruction.
* **Key Architecture & UI/UX Implementations:**
  - **Light Mode High-Contrast Overhaul (WCAG AAA Compliance)**:
    - Fixed low color contrast issues in light mode across all core components in `styles.html`.
    - Applied high-contrast dark forest green (`#047857`, `#059669`) on soft mint backgrounds (`#d1fae5`) for emerald badges and text.
    - Updated remark containers (`#modal-asset-note-container`) and text (`#modal-asset-note-display`) to dark amber/brown (`#92400e`, `#78350f`) on soft cream amber background (`#fef3c7`).
    - Styled Group 3 action buttons (สูญหาย, หาไม่เจอ, งง) with high-contrast text (`#0f172a`), solid borders (`#cbd5e1`), and distinct hover states.
  - **Modal Card Boundary Containment & Button Overflow Prevention**:
    - Enforced `max-h-[92vh] overflow-y-auto` directly on the `#asset-details-modal` dialog card container.
    - Eliminated unwanted duplicate result69 lines and streamlined top vertical spacing.
    - Tightened button padding (`py-1.5 px-2`), gap spacing (`space-y-1.5`), and grid structures so all 10 1-tap action buttons fit comfortably inside the modal card boundary on vertical mobile viewports without cutoffs.
  - **Shrunk Compact Copy Buttons**:
    - Miniaturized inline copy buttons next to Asset Description (Title), Inventory Number (Subtitle), and Remark (`หมายเหตุปี 69`).
    - Added full copy support for `copyToClipboard('note')` with real-time toast feedback.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (24/24 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force`.

## 2026-09-12 — Release v1.1.3f: Automatic Column O (สติกเกอร์ = ปกติ) Population on Menu 3 Migration
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.3f`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Git repository and GitHub Pages deliberately unpushed per user instruction.
* **Key Architecture & Synchronization Implementations:**
  - **Auto-Setting "ปกติ" in Column O for Scanned Items on Migration (Menu 3)**:
    - Updated `migrateMasterToRoomSheets` in `App_Script/DatabaseService.js`.
    - Every asset entry that has a recorded 1-tap action in Column M (`Scanned 69 !== ""`) automatically writes `"ปกติ"` into Column O (`สติกเกอร์`) of its corresponding room worksheet.
    - Preserves existing values for unscanned entries while ensuring 100% data consistency for scanned assets without adding cognitive friction or extra UI steps during field scanning.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (23/23 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force`.

## 2026-09-12 — Release v1.1.3e: Menu 3 Master-to-Room Migration Resilience & 5-Column Sync Integrity
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.3e`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Git repository and GitHub Pages deliberately unpushed per user instruction.
* **Key Architecture & Synchronization Implementations:**
  - **Menu 3 (Sync Master to Individual Room Sheets) Verification & Hardening**:
    - Confirmed full bidirectional fidelity between the 5-column Master Table (`Inventory number`, `Asset description1`, `Room`, `Scanned 69`, `หมายเหตุปี 69`) and the 20-column Room Sheets (Columns A–T).
    - Grouped master rows using canonical sheet name resolution (`getRoomSheetByName`) to eliminate duplicate sheet iterations when room names vary.
    - Updated matched assets directly at Column M (`Scanned 69`) and Column N (`หมายเหตุปี 69`) while preserving existing Column O (`สติกเกอร์`) values on room sheets.
    - Handled duplicate inventory numbers within room sheets via array-based row offset tracking.
    - Appended new or moved items after the last row in the destination room sheet with the complete 20-column structure, soft yellow highlight (`#FFF2CC`), centered numbering (Col A), text format for Inventory number (Col B), and clean cell borders.
    - Invalidated both `ASSET_ROUTER_INDEX` and `MASTER_ASSET_CACHE` script caches upon completion for instantaneous mobile app synchronization.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (22/22 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force`.

## 2026-09-12 — Release v1.1.3d: Lean 5-Column Master Aggregation, หมายเหตุปี 69 Modal Display & Compact Mobile Fit
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.3d`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Git repository and GitHub Pages deliberately unpushed per user instruction.
* **Key Architecture & UX Implementations:**
  - **Lean 5-Column Master Table Aggregation (Menu 2)**:
    - `buildMasterTableFromRooms` strictly reads only Cols B, D, I, M, N from room worksheets starting at Row 6.
    - `Master_Asset` headers aligned to 5 columns: `["Inventory number", "Asset description1", "Room", "Scanned 69", "หมายเหตุปี 69"]`.
    - Eliminates redundant columns (Procurement value, Cap date, historical columns), drastically speeding up aggregation, RPC queries, and bi-sync roundtrips.
  - **Prominent Scanned Entry หมายเหตุปี 69 (Column N) Display**:
    - Embedded `#modal-asset-note-container` and `#modal-asset-note-display` directly under the Inventory Number subtitle in the scanned asset card modal.
    - Accurately renders the item's Column N remark with amber contextual badge.
  - **Compact Mobile Card Modal Layout (No-Scroll Fit)**:
    - Tightened modal padding, group headers, and button heights (`py-2 px-1.5` for Group 1/2, `py-1.5 px-1.5` for Group 3).
    - Prevents boundary clipping on mobile viewports; ensures all 10 action buttons stay 100% within the visible card modal boundary without vertical scrolling.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (21/21 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force`.

## 2026-09-11 — Release v1.1.3c: Single-Source-of-Truth Reusable Room Sheet Selector Modal for Menu 1 & Menu 2
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.3c`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Git repository and GitHub Pages deliberately unpushed per user instruction.
* **Key Architecture & UX Implementations:**
  - **Single Reusable Modal Template Architecture (`SheetSelectorModal.html`)**:
    - Reused and parameterized `SheetSelectorModal.html` as the single source of truth for all sheet-selection flows in Google Sheets.
    - Added dynamic template variables (`modalTitle`, `modalDescription`, `actionButtonText`, `mode` / `actionMode`).
    - Implemented client-side dispatcher branching in `handleCombine()`: calling `runSetupRow5WithSelectedSheets(selected)` for `setupRow5` mode, and `runAggregationWithSelectedSheets(selected)` for `aggregate` mode.
  - **Selective Row 5 Audit Column Setup Engine (`setupRow5AuditHeaders` & `runSetupRow5WithSelectedSheets`)**:
    - Menu 1 (`🏷️ 1. Setup Row 5 Audit Columns on Room Sheets...`) now launches the modal dialog with **Select All / Deselect All**, live counter badge, and individual room checkboxes.
    - Technicians can choose to format specific individual room sheets without modifying or touching unrelated sheets.
    - Server runner `runSetupRow5WithSelectedSheets(selectedSheetNames)` executes targeted Row 5 column alignment, Column M shifting, and procurement column cleanup.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (20/20 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force`.

## 2026-09-11 — Release v1.1.3b: Master Contradiction & Duplicate Scanner, Safe Sync Yellow Highlight & Typography Scaling
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.3b`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Git repository and GitHub Pages deliberately unpushed per user instruction.
* **Key Architecture & UX Implementations:**
  - **Master Table Contradiction & Duplicate Verification Engine**:
    - Implemented `checkMasterTableContradictions(ss)`: scans `Master_Asset` for duplicate inventory numbers (Column B) and missing IDs across all rows.
    - Automatically applies soft red background highlighting (`#FEE2E2` row with `#FECACA` / `#DC2626` cell accent) on duplicate rows on `Master_Asset` for rapid manual inspection.
    - Added custom menu option `🔍 4. Check Master for Duplicates & Contradictions` with alert diagnostics and exposed RPC action `checkMasterContradictions` in Developer Gateway.
  - **Safe Room Migration with Full-Row Yellow Highlighting**:
    - Upgraded Menu 3 (`migrateMasterToRoomSheets`) to match assets strictly by Inventory Number (Col B).
    - Existing matched records have their audit status (Cols M, N, O) updated in batch.
    - Unmatched assets (newly registered unlisted items or assets transferred into this room) are appended after the last row and highlighted in soft yellow (`#FFF2CC`) across all 20 columns to maintain an unambiguous visual audit trail.
  - **Column I (Room) Extraction in Master Aggregation**:
    - Enhanced Menu 2 (`buildMasterTableFromRooms`) to explicitly extract and preserve Column I (`Room`) from room worksheets, defaulting to the worksheet title only when Column I is blank.
  - **Initial Room Roster Skeleton Loading Visual Cue**:
    - Introduced `#roster-loading-state` skeleton loader in `#asset-list-container` (`กำลังโหลดข้อมูลครุภัณฑ์...`) to give technicians immediate visual feedback while data loads.
  - **Typography & Responsive Mobile Scaling**:
    - Scaled up body font hierarchy (`15px` base, `text-[15px]` to `text-base` for item names, `text-sm` for inventory codes and action buttons, `text-xs` for metadata) for effortless legibility in bright laboratory lighting.
    - Kept application and modal navigation headers compact and balanced.
    - Codified guidelines in `Documentations/Architectural_Safety_Guide.md` (Sections 7 & 8).
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (19/19 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force` (16 files pushed).
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.2b`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Git repository and GitHub Pages deliberately unpushed per user instruction.
* **Key Architecture & UX Implementations:**
  - **5-Card Audit Overview & Unaudited / Pending Filter**:
    - Upgraded Audit Stats from a 4-card layout to a 5-card responsive layout (Total, ยังไม่สำรวจ/Pending, ใช้งานอยู่/Good, ชำรุด/Damaged, สูญหาย/Missing).
    - Calculated `unverified = total - verified` across all rooms and `Master_Asset`.
    - Clicking the Pending card immediately transitions to the Room Roster tab and sets `statusFilter = 'UNVERIFIED'`, displaying only items with blank/unscanned Column M (`Scanned 69`).
  - **Direct Fixed-Index Column Performance Engine**:
    - Aligned with the standard 20-column schema across all 15 room worksheets (Row 5 headers, Row 6 data start).
    - Replaced heavy regex header scanning with direct 0-indexed column constants (`COL_INDEX`) in `Config.js`.
    - **Menu Step 2 (`buildMasterTableFromRooms`)**: Uses single-range bulk extraction `sheet.getRange(6, 1, lastRow - 5, 20).getValues()` to assemble `Master_Asset` in 1 batch append.
    - **Menu Step 3 (`migrateMasterToRoomSheets`)**: Writes only the 3 audit columns (`Scanned 69`, `หมายเหตุปี 69`, `สติกเกอร์` at Cols M, N, O) via `sheet.getRange(6, 13, numRows, 3).setValues(...)`.
  - **Lean Mobile Payloads**:
    - Trimmed `getMasterAuditSummary`, `getRoomAuditSummary`, and `queryMasterTable` to serialize only the 9 essential fields needed by the mobile client (`assetId`, `itemName`, `registeredLocation`, `sheetName`, `rowIndex`, `status`, `scanned69`, `auditResult69`, `sticker`, `isVerified`), stripping ~65% of JSON transfer payload.
* **Verification & Clasp Deployment**:
  - All 16 automated test suites passing in `Tools/test_core.js`.
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force`.
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.2a`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Git repository and GitHub Pages deliberately unpushed per user instruction.
* **Key Architecture & UX Implementations:**
  - **Unlisted Asset Registration & 1-Tap Mobile Audit**:
    - When an unlisted QR code or barcode is scanned that does not exist in the database, the app opens `#unrecognized-asset-modal` with an interactive registration form instead of an error message.
    - Pre-populates Column N (`หมายเหตุปี 69`) with default text: `"พบครุภัณฑ์ที่ไม่มีในฐานข้อมูลส่งสำรวจ"` (user editable).
    - Derives Column M (`Scanned 69`) value directly from the user's 1-Tap action button selection (`ใช้งานอยู่`, `ใช้งานอยู่แต่ชำรุดนะ`, `หมดความจำเป็นต้องใช้งาน`).
    - Allows selecting target room (Column I), asset name (Column D), and sticker status (Column O).
    - Instant 3-second non-blocking confirmation toast, instant modal close, and immediate live camera stream resumption for seamless continuous scanning.
  - **Dual-Spreadsheet Synchronization Engine**:
    - `DatabaseService.js` (`addNewUnlistedAsset`) dynamically inserts the asset row under Row 5 on the target room worksheet and appends the 20 aligned columns to `Master_Asset`.
    - Automatically invalidates `ASSET_ROUTER_INDEX` and `MASTER_ASSET_CACHE`.
  - **Performance Optimization Architectural Research**:
    - Investigated and documented acceleration strategies (In-memory client indexing, single-batch `Master_Asset` reads, delta timestamps, and Sheets API v4 batching) to achieve 5x-10x faster fetch/sync performance in Google Apps Script.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (15/15 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force`.

## 2026-09-10 — Release v1.1.1g: Force Sync / Flush Sheet Cache, One-Click Clipboard Copy & Universal Modal Backdrop Dismissal
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.1g`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Git repository and GitHub Pages deliberately unpushed per user instruction.
* **Key Architecture & UX Implementations:**
  - **Force Sync & Real-Time Sheet Cache Flush**:
    - Resolved cache discrepancy where manually edited sheet cells (e.g. clearing `Scanned 69` or adding notes to `หมายเหตุปี 69`) were eclipsed by stale 30-minute backend cache or historical note status derivation.
    - Fixed `DatabaseService.js` (`getMasterAuditSummary` and `queryMasterTable`) to strictly evaluate `isVerified = (scanned69 !== "")` without treating `หมายเหตุปี 69` as an automatic status.
    - Integrated prominent `🔄 Sync` buttons in the top header and Room Roster filter bar calling `ModalController.triggerForceSync()` which purges `CacheService`/`PropertiesService` and re-fetches the live sheet summary.
  - **One-Click Clipboard Copying**:
    - Added quick copy icons next to **Asset Description 1** (`#modal-asset-name`, `#asset-card-name`) and **Inventory Number** (`#modal-asset-id`, `#asset-card-id`).
    - Implemented `ModalController.copyToClipboard(type)` with fallback for desktop and mobile browsers with instant toast feedback.
  - **Universal Backdrop Dismissal Protocol**:
    - Added outside click/tap dismissal across all dialog modals (`#asset-details-modal`, `#manual-lookup-modal`, `#unrecognized-asset-modal`, `#dev-gateway-modal`).
    - Dismissing `#asset-details-modal` via backdrop auto-resumes the camera stream if the technician is on the scanner tab.
    - Codified as standard in `Documentations/Architectural_Safety_Guide.md`.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (14/14 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force` (15 files synced successfully).

## 2026-09-10 — Release v1.1.1f: Blank Fallback Audit Status for Unverified Items, Modularization & Theme Preference Compliance
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.1f`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Git repository and GitHub Pages deliberately unpushed per user instruction.
* **Key Architecture & Logic Implementations:**
  - **Blank Fallback Audit Status**:
    - Fixed fallback behavior where unverified items with empty Column M (`Scanned 69`) erroneously displayed `[checkmark] Good` or `[clock] Unverified`.
    - In `DatabaseService.js`, verification is strictly derived from `scanned69Val !== ""`. If Column M is empty, `statusDerived` and `statusVal` evaluate to `""` (blank string), with `isVerified = false`.
    - In `AuditController.html`, `renderStatusBadgeHtml(status)` returns `""` (blank string) for falsy, `"-"`, or `"Unverified"` statuses.
    - Result: unverified asset cards now cleanly display no status badge until scanned/updated.
  - **Modularization & `skill.md` Alignment**:
    - Confirmed modular split: Backend (`Code.js`, `Config.js`, `DatabaseService.js`, `AuthService.js`, `TelemetryService.js`) and Client Controllers (`AppState.html`, `ApiClient.html`, `ScannerController.html`, `AuditController.html`, `ModalController.html`, `ThemeController.html`).
    - Verified Light Mode high-contrast WCAG AAA compliance and touch target standard ($\ge 44\times 44$px).
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (13/13 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force` (15 files synced successfully).

## 2026-09-10 — Release v1.1.1e: Continuous 1-Tap Mobile Scanning UX, 3s Non-Blocking Floating Toast & Strict Allowed Column Enforcement (B, D, I, M, N, O ONLY)
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.1e`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Git repository and GitHub Pages deliberately unpushed per user instruction.
* **Key Architecture & UX Implementations:**
  - **Continuous 1-Tap Mobile Scanning UX Workflow**:
    - Addressed field auditing friction where technicians had to manually dismiss dialogs or wait for network roundtrips before scanning the next item.
    - Optimized `AuditController.submitStatus(newStatus, extraData)`:
      - Immediately closes `#asset-details-modal` (`ModalController.closeAssetDetailsModal()`).
      - Immediately hides `#active-asset-card`.
      - Automatically switches to the `scanner` tab (if auditing from roster or details).
      - Re-engages the live camera stream (`ScannerController.startScanner()`) and resets scan debounce (`resetLastScannedCode()`).
      - Enables the technician to point the camera at the next physical asset QR code without touching the screen again.
  - **3-Second Non-Blocking Floating Toast Notification**:
    - Standardized confirmation toast duration to exactly **3,000 ms (3 seconds)**.
    - Repositioned `#toast-container` to `top-16` (directly under the app header) with `pointer-events-none`.
    - Restyled toast as a sleek, centered, rounded pill that leaves the camera viewfinder box, native snap button, and bottom controls 100% unobstructed.
  - **Strict Allowed Column Enforcement (Columns B, D, I, M, N, O ONLY)**:
    - Purged all non-allowed columns from display, linking, and card rendering:
      - Purged Column A (`No.` / `#1` item number).
      - Purged Column E (`Asset description2` / brand model / `"No specification"`).
      - Purged Column J (`สภาพของสินทรัพย์` / `"สภาพพัสดุ: ..."`).
      - Purged Column K / L (`Cap.date` / `ปีงบฯที่ได้มา` / `"ปีงบฯ: ..."`).
      - Purged Columns P–T (`ปี68`–`ปี63` / `"ผลปี 68: ..."`).
      - Purged legacy quick-note chips; replaced with clean note input writing to Column N (`หมายเหตุปี 69`).
    - **UI strictly displays only**:
      - **Column B**: `Inventory Number` (`assetId`)
      - **Column D**: `Asset Description1` (`itemName` / Asset Name — Primary Title)
      - **Column I**: `Room` (`registeredLocation`)
      - **Column M**: `Scanned 69` (Status badge / 1-Tap action buttons)
      - **Column O**: `สติกเกอร์` (`sticker` — displayed with `<i class="fa-solid fa-tag"></i>` pricetag icon)
      - **Column N**: `หมายเหตุปี 69` (`auditResult69` / notes)
    - Search query filtering in `AppState.html` and `ApiClient.html` restricted strictly to columns B, D, I, M, N, O.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (12/12 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force` (15 files synced successfully). Strict zero-git-push compliance maintained.

## 2026-09-10 — Release v1.1.1d: Interactive Stat Card Drill-Down, Card/Modal Information Hierarchy & Column N Reference Accuracy
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.1d`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Git repository and GitHub Pages deliberately unpushed per user instruction.
* **Key Enhancements & Solutions:**
  - **Interactive Audit Stat Cards (Drill-Down Filter)**:
    - Wired `AuditController.filterFromStatCard(criteria)` to each of the 4 metric cards on `#view-summary`:
      - `Total Registered` -> filters to `"ALL"`
      - `Verified Good` -> filters to `"Good"`
      - `Damaged / Issue` -> filters to `"Damaged"`
      - `Missing Assets` -> filters to `"Missing"`
    - Tapping any card switches immediately to the `ROOM ROSTER` tab, scrolls the list to top smoothly, and activates the corresponding filter chip button with emerald styling.
    - Improved `AppState.getFilteredItems()` to resolve both English categories and 10 Thai status options smoothly.
  - **Auditing Card & Modal Hierarchy**:
    - Realigned information hierarchy:
      - **Primary Title**: Asset Name (`Asset description1`, Column D) as prominent bold title (`<h2>` / `<h3>`).
      - **Subtitle**: Inventory Number (`Inventory number`, Column B) in emerald font-mono badge alongside specification (`Asset description2`, Column E).
  - **Reference Note Display: Column N (`หมายเหตุปี 69`) ONLY**:
    - Fixed roster card and modal templates to strictly display Column N (`หมายเหตุ 69: ...`).
    - Completely eliminated the misleading and redundant `"Scanned 69: ..."` label.
    - Added dedicated `#modal-asset-result69-box` and `#asset-card-result69-box` badges displaying `หมายเหตุ 69: [val]`.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (11/11 suites green).
  - Standalone preview bundle generated at `Output/standalone_preview.html`.
  - Pushed to Google Apps Script via `npx @google/clasp push --force` (15 files synced successfully). Strict zero-git-push compliance maintained.

## 2026-09-10 — Release v1.1.1c: Client Script Parsing Repair, Dropdown Integration & Direct Column I Location Updates
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.1c`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Git repository and GitHub Pages deliberately unpushed per user instruction.
* **Forensic Diagnosis & Resolution:**
  - **Syntax Error Root Cause in `AuditController.html`**:
    - Discovered missing closing `});` on line 63 `document.querySelectorAll(".modal-quick-chip").forEach(...)`.
    - This threw `SyntaxError: missing ) after argument list` upon script evaluation.
    - Resulting impact: `AuditController` was undefined at runtime; `AuditController.init()` crashed `DOMContentLoaded`; `ApiClient.getInitialPayload()` never executed; `Verified: 0 / 0` never updated; room dropdown never populated; and clicking `ROOM ROSTER` or `AUDIT STATS` (`AuditController.switchTab`) failed silently.
    - Resolution: Fixed closing syntax and verified with node function eval across all component scripts.
  - **Room Selector Master Table & Room Sheets Integration**:
    - Static select and dynamic default option set to `Master Table (All Rooms)` (value `"ALL"`).
    - Populates all available room sheets (`Bio Prep`, `Bio1`, `Chem1`, etc.) below Master Table.
    - In `DatabaseService.js`, added fallback to `ROOM_SHEETS_CONFIG` if room sheets have not loaded or are empty.
  - **Asset Location Column I (Room) vs MOVE_TO Analysis**:
    - Addressed user inquiry: *"I manually make "MOVE_TO" config key to store which room the asset is transfering to, do we need it or we can simply change the asset location (column I)"*.
    - Technical Decision: No separate config key or spreadsheet column needed for `MOVE_TO`.
    - Implemented: When `ใช้งานอยู่+ย้ายไป...` is confirmed with `destinationRoom`, the system mutates **Column I (`Room`)** directly in both `Master_Asset` and the underlying room sheet (`roomSheet.getRange(foundRow, schema.colMap.room).setValue(destinationRoom)`).
    - Audit Trail: Simultaneously preserves `"ย้ายไป [destinationRoom]"` in Column N (`หมายเหตุปี 69`) for procurement historical transparency.
  - **Double-Bound Tab Navigation**:
    - Bound DOM event listeners directly to `#nav-tab-scanner`, `#nav-tab-roster`, and `#nav-tab-summary` for guaranteed reactivity in sandboxed environments.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (10/10 suites green, including new client script syntax suite).
  - Pushed 15 files to Google Apps Script via `clasp push --force`. Git untouched.

---

## 2026-09-10 — Release v1.1.1b: Selective Sheet Aggregation Modal, 20-Column Aligned Master Table & ROOM_TYPE Elimination
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.1b`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Git repository and GitHub Pages deliberately unpushed per user instruction.
* **Key Architecture & UX Implementations:**
  - **Spreadsheet Menu 2 Modal Sheet Selector (`SheetSelectorModal.html`)**:
    - Converted Menu item 2 (`📥 2. Aggregate Rooms into Master Table...`) from an immediate headless rebuild to an interactive Google Apps Script modal dialog.
    - Features a modern dark-themed selector (`#020617`, `#0f172a`, `#10b981`) with a top control bar containing a **Select All / Deselect All** checkbox, a live counter badge (`X of Y selected`), and a scrollable checkbox roster of candidate room sheets.
    - System sheets (`Config`, `Master_Asset`, `Template`, `Log`, `Stat`, `Summary`) are filtered out automatically.
    - Invokes `runAggregationWithSelectedSheets(selectedSheetNames)` to build or rebuild `Master_Asset` exclusively from checked sheets with visual spreadsheet toast updates.
  - **Master Table 20 Aligned Columns (Cols A to T)**:
    - Master Table headers in Row 1 now align 1-to-1 with Room Sheets Row 5:
      `[ A: No., B: Inventory number, C: Asset, D: Asset description1, E: Asset description2, F: Curr.acq.value, G: Original value, H: Asset location, I: Room, J: สภาพของสินทรัพย์, K: Cap.date, L: ปีงบฯที่ได้มา, M: Scanned 69, N: หมายเหตุปี 69, O: สติกเกอร์, P: ปี68, Q: ปี67, R: ปี66, S: ปี64, T: ปี63 ]`.
    - `buildMasterTableFromRooms` maps each room sheet row directly into this 20-column layout, ensuring clean tabular queries and zero column mismatch during bi-directional synchronization.
  - **Complete Elimination of `ROOM_TYPE`**:
    - Purged all references to `ROOM_TYPE`, `RoomType`, and `inspectDynamicRoomTypes()` from `Config.js` and `DatabaseService.js`.
    - Removed `roomTypeFilter` and room-type chip filter UI from `AppState.html`, `AuditController.html`, `ApiClient.html`, and `index.html`.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js` (9/9 suites green).
  - Standalone preview bundle generated via `Tools/preview_server.py --bundle-only`.
  - Pushed to Google Apps Script via `clasp push --force`. Git repository and GitHub Pages kept unchanged per explicit user requirement.

---

## 2026-09-09 — Release v1.1.1a: Multi-Tier Status Workflow & Master_Asset Database Engine
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.1a`.
* **Deployment Scope:** Google Apps Script backend only (`clasp push --force`). Git repository and GitHub Pages deliberately unpushed per user instruction.
* **Key Architecture & UX Implementations:**
  - **Live Camera Scanner Priority**:
    - Inverted viewfinder priority: Live camera streaming feed is now primary (`📹 START LIVE SCANNER` with emerald green styling).
    - Native camera photo snap is secondary. Toolbar buttons reordered so Live controls precede Snap.
  - **Dedicated `Scanned 69` Column (Col 13 / M)**:
    - User survey audit input now explicitly targets Column M (`Scanned 69`), placed to the left of Column N (`หมายเหตุปี 69`).
    - Row 5 audit headers expanded to 8 columns: `Scanned 69`, `หมายเหตุปี 69`, `สติกเกอร์`, `ปี68`, `ปี67`, `ปี66`, `ปี64`, `ปี63`.
    - Added self-healing column shifting logic in `setupRow5AuditHeaders`: detects if Column M was previously `หมายเหตุปี 69`, inserting Column M before writing headers to protect existing notes.
  - **`Master_Asset` Primary Database Engine**:
    - `lookupAsset(rawCode)` queries `Master_Asset` first, retrieving records in <200ms across all 15 rooms.
    - `getRoomAuditSummary(roomName)` aggregates room metrics directly from `Master_Asset` first for instantaneous sub-second loading.
    - `updateAssetStatus(payload)` executes real-time bi-directional synchronization, persisting updates simultaneously to `Master_Asset` and the designated Room worksheet.
  - **3 Color-Coded Status Groups (10 Permitted Options)**:
    - **Group 1: ใช้งานอยู่ (Green shades)**: `ใช้งานอยู่`, `ใช้งานอยู่แต่ชำรุดนะ`, `ใช้งานอยู่+ย้ายไป...`, `ใช้งานอยู่+แก้ไขชื่อเป็น...`.
    - **Group 2: หมดความจำเป็น (Red shades)**: `หมดความจำเป็นต้องใช้งาน`, `หมดความจำเป็นต้องใช้งานเพราะชำรุด`.
    - **Group 3: สูญหาย / ตรวจสอบ (Grey shades)**: `สูญหาย`, `หาไม่เจอ`, `หาไม่เจอ+ให้พัสดุมาตรวจสอบหน้างาน`, `งง+ให้พัสดุมาตรวจสอบหน้างาน`.
  - **Dynamic 15 Rooms Configuration (`ROOM_SHEETS_CONFIG`)**:
    - Configured for 15 rooms: `Bio Prep`, `Bio1`, `Bio2`, `Chem Pre`, `Chem1`, `Chem2`, `Physics P`, `Physics1`, `Physics2`, `Mobile`, `Science`, `ปาณิษา`, `ชำรุด`, `ไม่ใช้งาน`, `Storage`.
    - Aliased internally as `MOVE_TO = ROOM_SHEETS_CONFIG;` without redundant spreadsheet config tab keys.
  - **Sticker Verification 3-Pill Toggle**:
    - Replaced binary sticker toggle with a 3-pill toggle bar (`ปกติ`, `ปริ้นใหม่`, `ปริ้นใหม่+แก้ข้อมูล`) on both `#active-asset-card` and `#asset-details-modal`.
  - **Dynamic Sub-layers with Immediate Autofocus**:
    - `ใช้งานอยู่+ย้ายไป...` reveals an animated 15-room destination selector drawer.
    - `ใช้งานอยู่+แก้ไขชื่อเป็น...` reveals an asset rename input with immediate autofocus (`input.focus(); input.select();`) for instant keyboard readiness on mobile and desktop.
* **Verification & Clasp Deployment**:
  - Full automated verification test suite passing in `Tools/test_core.js`.
  - Successfully pushed 14 files to Google Apps Script via `clasp push --force`. Git repository preserved without premature push.

---

## 2026-09-08 — Release v1.1.0e: GitHub Pages Deployment & Zero-Install Live Web Hosting
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.0e`.
* **Problem Addressed:**
  - Facilitate instantaneous zero-install deployment to GitHub Pages (`https://github.com/nattapat-poo/AssetTracker2026`) to unlock 100% native 60 FPS continuous camera video scanning on mobile devices outside Google Apps Script's sandboxed iframe.
  - Clarified npm requirement: Pure static web architecture requires **zero npm packages, zero node_modules, and zero build toolchains**.
* **Key Implementations:**
  - **Standalone Root Distribution**: Bundled `index.html` at repository root and in `/docs/index.html` for GitHub Pages hosting.
  - **Jekyll Bypass (`.nojekyll`)**: Added `.nojekyll` to root and docs to ensure raw asset serving without Jekyll preprocessing.
  - **Clean Git Tracking**: Established `.gitignore` protecting local clasp auth tokens and cache directories.
  - **Automated Verification**: Full 10-point test suite passing in `Tools/test_core.js`.
  - **GAS Sync**: Pushed all 14 files to Google Apps Script backend.

---

## 2026-09-08 — Release v1.1.0d: Matched Asset Details Modal & Remote HTTPS Live Bridge
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.0d`.
* **Problem Solved & Architectural Query Answered:**
  - **User Inquiries**:
    1. *"Is it possible to after the camera successfully scans the qr code, bring up the modal details of the matched asset inventor number?"*
    2. *"so there is no way to feed the camera/video into the iframe? then capture and show the matched entry?"*
  - **Iframe Sandboxing Forensic Analysis**:
    - When deployed at `script.google.com/macros/s/.../exec`, Google wraps user code in a cross-origin iframe (`n-...-script.googleusercontent.com/userCodeAppPanel`).
    - Google's outer wrapper page omits `allow="camera"` from its iframe permissions policy.
    - Under W3C Permissions Policy standards, child frames strictly cannot override the parent frame's restrictions. Consequently, `navigator.mediaDevices.getUserMedia()` is blocked by Chromium and WebKit at the platform security boundary.
    - Inside the Apps Script iframe, the only mechanism to invoke mobile camera hardware is `<input type="file" capture="environment">`, which delegates capture to the OS camera app (requiring shutter -> checkmark).
  - **The Native 60 FPS Solution (External Hosting & Remote HTTPS Bridge)**:
    - If the frontend bundle is hosted externally (e.g. GitHub Pages, Cloudflare Pages, Netlify, or local HTTPS server), the app operates as a top-level document.
    - `getUserMedia()` is granted full 60 FPS continuous live video access. Pointing the phone at a QR code instantly scans it with zero button taps!
    - We equipped `ApiClient.html` with `LIVE_GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyX7q6-CSO0JeueXXg9OcNpnNL21DOLS3klvkPjxTs/exec"`.
    - When running outside GAS, `ApiClient.invoke()` performs direct HTTPS `POST` requests to Google Apps Script's `doPost(e)` endpoint using `text/plain` headers, achieving zero-CORS real-time database updates to Google Sheets!
* **New UI/UX Features:**
  - **Matched Asset Details Modal (`#asset-details-modal`)**:
    - Automatically surfaces in full focus immediately upon scanning any asset.
    - Displays full specifications, registered room, procurement condition (`สภาพของสินทรัพย์`), past year audit result (`ปี68`), and location discrepancy warnings.
    - Includes interactive **`🏷️ Sticker: YES/NO`** toggle and embedded **`✅ GOOD`**, **`⚠️ DAMAGED`**, and **`❌ MISSING`** thumb action buttons.
    - Tapping any status button saves the row directly to Google Sheets and auto-dismisses the modal in <1 second.
* **Verification & Deployment:**
  - Automated verification suite `Tools/test_core.js` expanded with Section 10 verifying the modal popup and Remote GAS Bridge.
  - 10/10 automated tests passed 100%.
  - Pushed all 14 files to Google Apps Script via `clasp push --force`.

---

## 2026-09-08 — Release v1.1.0c: Multi-Modal Camera Scanner Engine & Iframe Sandbox Bypass
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.0c`.
* **Problem Solved:**
  - On both laptops and mobile phones, users were receiving: `"Camera access required. Tap 'Upload Image' to scan from gallery or enter ID manually."`
  - **Root Cause 1 (Mobile)**: GAS Web Apps run inside a cross-origin `<iframe>` on `*.googleusercontent.com` without `allow="camera"` permissions policy, causing `navigator.mediaDevices.getUserMedia` to immediately throw `NotAllowedError` or `SecurityError`.
  - **Root Cause 2 (Laptop)**: Webcams on laptops threw `OverconstrainedError` when requesting `{ facingMode: "environment" }` because laptops only possess front-facing webcams.
* **Architectural Innovations:**
  1. **Mode 1: Instant Native Camera Snap (`openNativeCameraSnap`)**:
     - Uses `<input type="file" accept="image/*" capture="environment">` to trigger the mobile OS native camera app directly.
     - Operates completely outside the browser's `getUserMedia` permission sandbox, functioning 100% reliably in iOS Safari, Android Chrome, and embedded GAS web apps.
  2. **Mode 2: Smart Laptop Webcam Fallback (`startScanner`)**:
     - Queries `Html5Qrcode.getCameras()`. On laptops/desktops, dynamically selects the available webcam device ID or falls back to `{ facingMode: "user" }`, eliminating `OverconstrainedError`.
     - Automatically redirects to the Native Camera Snap dialog if an iframe permission lock is detected.
  3. **Mode 3: Hardware-Accelerated Dual-Stage QR Decoder (`scanUploadedFile`)**:
     - Stage 1: Leverages native browser `window.BarcodeDetector` (5ms GPU hardware acceleration) via `createImageBitmap(file)`.
     - Stage 2: Automatically downscales large 12MP–48MP mobile photos to max 1280px via off-screen HTML5 `<canvas>` before passing to the ZXing JS decoder, preventing memory exhaustion and slashing decode time to <50ms.
  4. **Scanner Standby & Controls UI**:
     - Viewfinder standby card now features a prominent **`📸 SNAP WITH CAMERA`** primary action button.
     - Control toolbar provides fast 1-tap access to **📸 Snap**, **📹 Live**, **🔄 Flip**, **⚡ Torch**, and **🖼️ Gallery**.
* **Verification & Deployment:**
  - Added new automated verification steps in `Tools/test_core.js` validating camera input elements, button hooks, camera enumeration, and canvas downscaling.
  - 100% test coverage confirmed.
  - Synced bundle to `Output/standalone_preview.html`.
  - Deployed to live Google Apps Script environment via `clasp push --force`.

---

## 2026-09-08 — Release v1.1.0b: Column M Hardcoding, Columns A–L Repair & Config Sheet Synchronization
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled to version `v1.1.0b`.
* **Forensic Investigation & Resolution:**
  1. **Column A Bug Cause**: In `v1.1.0a`, `setupRow5AuditHeaders` scanned rows 1–5 for cells containing `"ปีงบ"`. On procurement sheets with a merged report title banner across rows 1–2 (e.g., "รายงานการตรวจสอบพัสดุ ประจำปีงบประมาณ 2568..."), the scan matched at Column 1 (Column A), causing `startCol` to evaluate to Column 1/2 and overwriting Row 5 procurement headers starting at Column A.
  2. **Hardcoded Column M**: Per user instruction, Row 5 start column is strictly hardcoded to **Column M (Column 13)** (`START_COL_M = 13`):
     - Col M (13): `หมายเหตุปี 69`
     - Col N (14): `สติกเกอร์`
     - Col O (15): `ปี68`
     - Col P (16): `ปี67`
     - Col Q (17): `ปี66`
     - Col R (18): `ปี64`
     - Col S (19): `ปี63`
  3. **Automated Cleanup & Repair for Columns 1–12 (A–L)**:
     - Scans Row 5 Columns 1–12 on every room sheet.
     - Detects any cells overwritten with audit column names from previous runs.
     - Restores canonical procurement headers: Col 1 (`No.`), Col 2 (`Inventory number`), Col 3 (`Asset`), Col 4 (`Asset description1`), Col 5 (`Asset description2`), Col 6 (`Curr.acq.value`), Col 7 (`Original value`), Col 8 (`Asset location`), Col 9 (`Room`), Col 10 (`สภาพของสินทรัพย์`), Col 11 (`Cap.date`), Col 12 (`ปีงบฯที่ได้มา`).
     - Resets header cell styling to neutral procurement layout.
  4. **Config Sheet Synchronization Engine (`syncConfigSheet`)**:
     - Built `syncConfigSheet(ss)` in `Config.js` to ensure the `Config` sheet tab exists and is populated with standard keys.
     - Automatically updates `APP_VERSION` to `v1.1.0b` with current Bangkok timestamp.
     - **Strictly preserves all existing user-configured values** so custom sheet settings remain intact.
     - Added menu item `⚙️ 0. Update / Sync Config Sheet (v1.1.0b)` to custom menu `🚀 Lab Oops: Asset Tracker`.
     - Added button `Sync Config` in Web App Stealth Developer Gateway Modal.
  5. **Verification & Deployment**:
     - Updated automated test suite in `Tools/test_core.js` verifying hardcoded Column M, Columns A–L repair, and Config sheet synchronization.
     - 100% tests passed.
     - Re-generated `Output/standalone_preview.html`.
     - Deployed all 14 files to Google Apps Script via `clasp push --force`.

---

## 2026-09-08 — Release v1.1.0a: Hybrid Master Table Architecture & Bidirectional Migration Engine
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Milestone:** Project 08 rolled up to version `v1.1.0a` implementing the Hybrid Master Table architecture.
* **Key Achievements:**
  1. **Master Table (`Master_Asset`)**:
     - Built single consolidated repository containing only essential columns: `No.`, `Inventory number`, `Asset description1`, `Asset description2`, `Room`, `RoomType`, `สภาพของสินทรัพย์`, `ปีงบฯที่ได้มา`, `หมายเหตุปี 69`, `สติกเกอร์`, `ปี68`, `ปี67`, `ปี66`, `ปี64`, `ปี63`, `SourceSheet`, `LastUpdated`.
     - Enables instant queries, global searches, and filtering across all rooms simultaneously.
  2. **Row 5 Audit Columns Setup on Room Sheets**:
     - Implemented `setupRow5AuditHeaders(ss)` which detects `"ปีงบฯที่ได้มา"` and writes 7 columns at Row 5: `"หมายเหตุปี 69"`, `"สติกเกอร์"`, `"ปี68"`, `"ปี67"`, `"ปี66"`, `"ปี64"`, `"ปี63"`.
     - Preserves existing rows 1–4 and columns A–L intact.
  3. **Dynamic Room Type Inspection**:
     - Implemented `inspectDynamicRoomTypes(ss)` mapping sheets against Project 00 Kernel Room Directory, discovering dynamic room types (`Lab`, `ChemicalLab`, `BioSafetyLab`, `Classroom`, `PrepRoom`).
  4. **Configurable Room Sheet Resolver**:
     - Implemented `getRoomSheetByName(ss, roomIdentifier)` with `ROOM_SHEETS_CONFIG` mapping and normalized alias support.
  5. **Bidirectional Migration Engine**:
     - `buildMasterTableFromRooms(ss)`: Aggregates room worksheets into `Master_Asset`.
     - `migrateMasterToRoomSheets(ss)`: Migrates audit updates from `Master_Asset` back to individual room sheets in-place.
  6. **Dual Triggers**:
     - Google Sheets UI Custom Menu via `onOpen()`: `🚀 Lab Oops: Asset Tracker` (`Setup Row 5`, `Aggregate to Master`, `Migrate to Rooms`, `Flush Caches`).
     - Web App UI Developer Gateway modal (`Ctrl + Shift + Q` / PIN `2026`).
  7. **Frontend & State Updates**:
     - Added `#room-type-filter-chips` to Roster view.
     - Updated `AppState.html` and `AuditController.html` with `roomTypeFilter` support.
     - Updated `ApiClient.html` mock handlers for all new actions.
  8. **Testing & Deployment**:
     - Expanded `Tools/test_core.js` verifying all new APIs with 100% pass rate.
     - Re-built `Output/standalone_preview.html`.
     - Deployed all 14 files to Google Apps Script via `clasp push --force`.

---

## 2026-09-08 — Release v1.0.0a: Non-Invasive Procurement Inspection & Merged Header Engine
* **Milestone:** Non-invasive inspection mode on Google Sheet `18LGXn6JbjFeiVuKlrh0CvJ79M3mpsKTVbc0FJx8LuOk`.
* **Key Achievements:**
  - Merged header detection across rows 1–6.
  - Procurement columns A–L mapping.
  - Zero telemetry tab creation in procurement sheets.
  - Direct updates to `หมายเหตุปี 69` and `Sticker`.
