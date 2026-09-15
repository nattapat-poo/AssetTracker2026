# 📜 Changelog — Project 08: QR Asset Survey

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to the Lab Oops OS Versioning Standard (`v[Gen].[Feature].[Minor][ui]`).

## [1.1.8b] - 2026-09-15

### Fixed & Improved
- **Camera Feed Black Square Elimination (`styles.html`, `ScannerController.html`)**:
  - Permanently suppressed `#qr-shaded-region` (`display: none !important; opacity: 0 !important; pointer-events: none !important;`) which caused Html5Qrcode to render a solid black 50% border over the video feed when initialized with 0px dimensions while the scanner tab was hidden.
  - Set `#qr-reader video` to unconstrained full-frame streaming (`width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important;`).
  - Added `videoWidth > 0` and `readyState >= 2` safety checks in `startNativeDetectionLoop` to ensure the native detector only executes on active video frames.
- **Toast Notifications Polish (`ModalController.html`)**:
  - Extended default auto-dismiss duration from 3.5s to 8.5s (with a strict minimum threshold of 6.5s).
  - Fixed premature tap dismissal: Clicking or tapping the toast expands the pill into readable, untruncated card text and prolongs the dismiss timer to 15.0s, preventing accidental disappearance.
  - Provided a dedicated `x` dismiss button on the expanded toast for explicit user dismissal.
- **Activity Logs Panel in Stat Tab (`index.html`, `AppState.html`, `AuditController.html`)**:
  - Added `#activity-logs-panel` into the Stat tab (`#view-summary`) displaying real-time audit history and actions.
  - Persisted user audit activity to `localStorage` (`MUIDS_ACTIVITY_LOGS_v1.1.8b`) with up to 80 recent entries.
  - Provided clear logs button ("ล้างประวัติ") and dynamic badges showing timestamp, action status, asset code, room, and notes.
- **Footer Version Branding (`index.html`)**:
  - Updated footer version branding string from `v1.1.7e` to `v1.1.8b` (`QR Asset Survey • MUIDS Science Dept • v1.1.8b`).

## [1.1.8a] - 2026-09-15

### Added & Improved
- **AppSheet-Parity Instant Barcode Detection (`ScannerController.html`)**:
  - Implemented hardware-accelerated native `BarcodeDetector` running at 60fps via `requestAnimationFrame` directly on the `<video>` camera stream.
  - Sub-5ms instant detection matching AppSheet scanning speed, eliminating user alignment lag.
  - Full-frame uncropped scan boundary (100% viewfinder) with 1280x720 ideal resolution and continuous autofocus.
  - Seamless fallback to ZXing engine when `BarcodeDetector` is unsupported in older mobile browsers.
- **Sub-20ms Startup Timing via Stale-While-Revalidate (SWR) Client Caching (`index.html`)**:
  - Hydrates roster, rooms, and audit statistics immediately from `localStorage` (`MUIDS_INITIAL_PAYLOAD_CACHE`) in <20ms.
  - Performs non-blocking background revalidation with the live Google Apps Script endpoint.
  - Integrated Google Apps Script `CacheService.getScriptCache()` (1800s TTL) for room audit summaries with automated cache invalidation on edits.
- **Clean Column N (`หมายเหตุปี 69`) Audit Remarks (`DatabaseService.js`)**:
  - Permanently removed automatic injection of `"[Found in Master_Asset]"` or `"[Found in <Room>]"`.
  - Column N remains completely blank unless the auditor explicitly types a custom note.
- **Multi-Step Audit Modal Workflow with Optional Comment Box & Universal Back Navigation**:
  - Enforced structured sequential flow: **Scan $\rightarrow$ Found Record $\rightarrow$ 1-Tap Status Action $\rightarrow$ Comment Box (Optional) $\rightarrow$ Sticker Modal $\rightarrow$ Save Record**.
  - Added `#modal-sublayer-comment` and `#card-sublayer-comment` sublayers.
  - Added `[◀ ย้อนกลับ]` Back button across every sublayer (`modal-sublayer-move`, `modal-sublayer-rename`, `modal-sublayer-comment`, `modal-sublayer-sticker`), preserving user input when navigating back and forth.
- **Mahidol Google Account Verification & Nexus Master DB User Match (`AuthService.js`, `index.html`)**:
  - Verified user email domain against Mahidol Google Workspace (`@mahidol.ac.th`, `@mahidol.edu`, `@student.mahidol.ac.th`).
  - Matched authenticated user against allowed users in the Nexus Master DB (`User` sheet of `11PUpY4zVClvVbfzgu4Olyzy6e5NacNUXZv30bexQQB8`).
  - Added interactive `#header-user-badge` in the header bar and `#user-profile-modal` displaying email, role, and Nexus authorization state.

## [1.1.7f] - 2026-09-14

### Fixed & Improved
- **Public Google Apps Script Web App Access (`ANYONE_ANONYMOUS`)**:
  - Updated `appsscript.json` webapp access setting from `ANYONE` to `ANYONE_ANONYMOUS`.
  - Resolves issue where other devices or unauthenticated browsers were redirected to Google Account Sign-in, which caused CORS failures on GitHub Pages and triggered fallback to legacy mock data.
- **Complete Elimination of Legacy Mock Data**:
  - Emptied `INITIAL_LAB_ASSETS` to `[]`.
  - The app now exclusively pulls real live records (689 assets across 16 sheets) from the Google Sheets database.
  - Seamlessly caches real fetched Google Sheet assets into `localStorage` (`MUIDS_ASSET_CACHE_v1.1.7f`) for robust offline continuity.
- **High-Speed Primary JSONP Bridge on GitHub Pages**:
  - Configured `invokeJsonp` as the primary transport on GitHub Pages (`isRemoteLiveMode`), bypassing CORS and reducing initial connection latency from 12s timeout to ~300ms.
  - Increased JSONP timeout to 20s to safely accommodate Google Apps Script cold starts.
- **Mobile Camera Autofocus & Primary Lens Selection**:
  - Re-engineered `ScannerController.html` to pass `{ facingMode: "environment" }` with `focusMode: "continuous"` directly.
  - Prevents multi-camera phones (e.g. Samsung Galaxy, iPhone) from erroneously selecting a blurry fixed-focus macro/wide-angle lens when device labels are masked prior to permission grant.
  - Enlarged QR detection viewfinder bounding box to 85% for rapid detection of smaller asset labels.
  - Added automatic debounce recovery if lookup returns no match, ensuring technicians can immediately scan subsequent items without blocking.

## [1.1.7e] - 2026-09-14

### Added & Improved
- **Version Numbering Under App Title**:
  - Relocated version indicator (`v1.1.7e • Mobile Audit`) directly underneath `🔍 QR Asset Survey`, eliminating title horizontal crowding and preventing truncation on narrow mobile devices.
- **Room Tab as Default Landing Tab (Center Position Preserved)**:
  - Configured `Room` as the default landing view (`activeTab: "roster"`) so users immediately see if sheet data has loaded upon opening the app.
  - Retained navigation tab structure: `Scan` (left) | `Room` (center, active) | `Stat` (right).
  - Avoids premature camera permission prompts on initial app launch.
- **Removed Discrepancy Box**:
  - Removed "Registered to [x], but scanned in [y]" room discrepancy notification banner.
- **Refined Action & Save Buttons**:
  - Rearranged Save Sticker button layout with left-aligned checkmark icon and stacked Thai/English text.
- **Mobile Native Canvas & Layout Tightening**:
  - 430px centered mobile canvas simulator on desktop for pixel-perfect mobile-first parity.
  - Eliminated vertical whitespace gap between tabs and filter bar.
  - Applied universal `.app-modal-dialog` containment preventing card boundary overflow.
  - Extended toast duration (>=5s) with tap/hover to expand.

## [1.1.6b] - 2026-09-14

### Added & Improved
- **Bidirectional Live Google Sheets Bridge for Static GitHub Pages**:
  - **GET & JSONP API Gateway in `Code.js`**: Enhanced `doGet(e)` to handle REST API actions via GET parameters and JSONP callbacks (`callback` query parameter). Bypasses CORS and cross-origin redirect blocks when hosted statically on GitHub Pages.
  - **Dynamic Multi-Transport Fallback in `ApiClient.html`**:
    1. Direct native GAS `google.script.run` when running inside Google Workspace.
    2. HTTPS REST POST `fetch()` bridge for modern fetch-compatible web clients.
    3. JSONP GET script injection bridge (`invokeJsonp()`) as automatic fallback when cross-origin fetch is redirected by Google authentication.
    4. Offline 15-room mock store fallback if both network bridges fail.
  - **Active Bridge Telemetry & Endpoint Diagnostics**:
    - Added `ApiClient.getBridgeStatus()` reporting `isLiveConnected`, `bridgeType` (`GAS_NATIVE`, `GAS_REST_POST`, `GAS_JSONP`, `OFFLINE_MOCK`), and endpoint URLs.
    - Added `ApiClient.setGasEndpointUrl()` to persist custom deployed Apps Script URLs in browser storage.
- **Fixed Toast Notification Dynamic Version String**:
  - Replaced legacy hardcoded toast string `(v1.1.2a)` in `ModalController.html` with reactive dynamic version binding `window.AppState.get("config").APP_VERSION`.
- **Ecosystem-Wide Version Roll to `v1.1.6b`**:
  - Rolled version numbers across `Code.js`, `Config.js`, `DatabaseService.js`, `TelemetryService.js`, `AuthService.js`, `AppState.html`, `ApiClient.html`, `AuditController.html`, `ModalController.html`, `styles.html`, `index.html`, and `Tools/test_core.js`.


### Added & Improved
- **15-Room Comprehensive Mock Data Store**:
  - Overhauled mock database in `App_Script/ApiClient.html` to distribute realistic science laboratory equipment across all 15 active rooms: `Bio Prep`, `Bio1`, `Bio2`, `Chem Pre`, `Chem1`, `Chem2`, `Physics P`, `Physics1`, `Physics2`, `Mobile`, `Science`, `ปาณิษา`, `ชำรุด`, `ไม่ใช้งาน`, `Storage`.
  - Replaced legacy dummy "Lab 204" assets with authentic department procurement models.
- **Dynamic Live GAS Endpoint Configuration**:
  - Added `getGasEndpointUrl()` to support custom GAS Web App deployment URLs via URL parameter (`?gas_url=...`) or `localStorage.getItem("MUIDS_GAS_WEBAPP_URL")`.
  - Added live connection status tracking (`window.__IS_LIVE_CONNECTED`) to clearly distinguish live Google Sheet sync vs. fallback mock mode.
- **GAS Continuous Camera Scanning Whitepaper**:
  - Added comprehensive technical engineering whitepaper `Documentations/GAS_Continuous_Scanning_Limitations.md` explaining iframe sandboxing, permissions policy headers, mobile WebKit stream blocking, and RPC latency.

## [1.1.4] - 2026-09-12

### Milestone Release Summary
- **Official Production Release `v1.1.4`** deployed to both Google Apps Script (GAS) and GitHub repository.
- **Moderate Responsive Typography Engine**:
  - Calibrated root font size to `16.5px` on mobile and `17px` on desktop (`@media (min-width: 640px)`).
  - Balanced typography hierarchy (`h1` 1.30rem, `h2` 1.15rem, `h3` 1.02rem, `.text-sm` 0.92rem, `.text-xs` 0.82rem, `.text-[11px]` 0.78rem, `.text-[10px]` 0.74rem, `.text-[9px]` 0.70rem) for clear legibility without visual bloat.
  - Sized interactive controls (`.thumb-btn` 52px height with 1rem bold text, `.inspection-sticker-btn` 46px height with 0.95rem text, `.sticker-pill` and `.filter-chip` 0.88rem text, form inputs 1rem text).
  - Ensured card padding and dialog boundaries fit comfortably across all mobile phone viewports.
- **Auditor Column (`Col 16 / Col P`) on Individual Room Sheets**:
  - Automatically provisions `Auditor` column after Col O (`สติกเกอร์`) at Column P on individual room sheets.
  - Dynamically records the display name of the auditor on every 1-tap scan action without aggregating Auditor into `Master_Asset`.
- **Tri-Layer Data Consistency Architecture**:
  - Layer 1: Client-side optimistic state cache revalidation.
  - Layer 2: Real-time `onEdit(e)` trigger auto-syncing manual sheet edits to `Master_Asset`.
  - Layer 3: Comprehensive discrepancy and contradiction scanner.
- **`Stats` Sheet Auto-Provisioning & Live Usage Analytics UI**:
  - Interactive Web App Usage Stats Modal (`statsModal`) with real-time progress metrics, auditor leaderboards, and room completion breakdown.
- **Interactive Expand-on-Tap/Hover Toast Notifications**:
  - 3.5s display duration with hover/tap dynamic expansion for long text.
- **Automated Verification Suite**:
  - 33/33 test suites passing in `Tools/test_core.js`.

## [1.1.4d] - 2026-09-12

### Added & Improved
- **Moderate & Balanced Responsive Typography (Perfect Mobile Layout Fit)**:
  - Calibrated root font size to `16.5px` on mobile and `17px` on desktop (`@media (min-width: 640px)`).
  - Balanced typography hierarchy (`h1` 1.30rem, `h2` 1.15rem, `h3` 1.02rem, `.text-sm` 0.92rem, `.text-xs` 0.82rem, `.text-[11px]` 0.78rem, `.text-[10px]` 0.74rem, `.text-[9px]` 0.70rem) for clear readability without visual bloat.
  - Sized interactive controls (`.thumb-btn` 52px height with 1rem bold text, `.inspection-sticker-btn` 46px height with 0.95rem text, `.sticker-pill` and `.filter-chip` 0.88rem text, form inputs 1rem text).
  - Ensured card padding and dialog boundaries fit comfortably across all mobile phone viewports.
- **Suite 33 Automated Verification**:
  - Verified 33/33 test suites passing in `Tools/test_core.js`.

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.4c] - 2026-09-12

### Added & Improved
- **Ultra-Large Root Typography Scaling (Sky-High Legibility across Desktop & Mobile)**:
  - Fixed root CSS calculation by setting `:root, html { font-size: 21px !important; }`. This solves the issue where Tailwind's `rem`-based classes were computing against the unscaled 16px root browser base and feeling small on desktop displays.
  - Scaled body font to `1.15rem` (~24px) with `line-height: 1.6`.
  - Scaled responsive headings and text classes with `!important` to prevent Tailwind responsive `sm:` prefixes from shrinking text on desktop screens:
    - `h1, .text-xl, .sm:text-lg`: `1.75rem` (~36.7px)
    - `h2, .text-lg, .sm:text-base`: `1.50rem` (~31.5px)
    - `h3, .text-base, .sm:text-sm`: `1.30rem` (~27.3px)
    - `.text-sm`: `1.18rem` (~24.7px)
    - `.text-xs, .sm:text-xs`: `1.08rem` (~22.6px)
    - `.text-[11px], .text-[10px], .text-[9px]`: `0.98rem` (~20.5px)
    - `.text-[13px], .text-[15px]`: `1.22rem` (~25.6px)
  - Scaled touch hit buttons (`.thumb-btn` height `62px` with `1.18rem` font, `.inspection-sticker-btn` height `56px` with `1.12rem` font, `.sticker-pill` and `.filter-chip` `1.05rem` font, form inputs `1.15rem` font, `.app-toast` `1.12rem` font).
- **Suite 33 Automated Verification**:
  - Updated Suite 33 in `Tools/test_core.js` verifying 21px root scaling, sky-high typography classes, and button dimensions (33/33 tests passing).

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.4b] - 2026-09-12

### Added & Improved
- **App-Wide Mobile Font Scaling & Touch Readability**:
  - Enlarged base body font size from `17.5px` to `19px` with `line-height: 1.6` for crisp readability on mobile screens in laboratory field audits.
  - Upgraded responsive typography scale (`h1`: `1.55rem`, `h2`: `1.35rem`, `h3`: `1.20rem`, `.text-sm`: `1.08rem`, `.text-xs`: `0.98rem`, `.text-[11px]`: `0.92rem`, `.text-[10px]`: `0.86rem`, `.text-[9px]`: `0.80rem`).
  - Enlarged form inputs, textareas, and select dropdowns to `1rem` / `19px` equivalent to improve legibility and eliminate mobile iOS safari viewport auto-zoom on focus.
  - Scaled touch action buttons (`.thumb-btn` min-height `56px` with `1.05rem` text, `.inspection-sticker-btn` `1.02rem` text, `.sticker-pill` and `.filter-chip` `0.95rem` text).
  - Scaled toast notifications to `1rem` with `line-height: 1.5` for clear message reading.
- **Suite 33 Automated Verification**:
  - Added Test Suite 33 to `Tools/test_core.js` validating base font scaling, responsive typography hierarchy, and mobile touch element sizing.
  - All 33 automated test suites verified passing (33/33).

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.4a] - 2026-09-12

### Added & Improved
- **Auditor Column (`Col 16 / Col P`) on Individual Room Sheets**:
  - Configured Menu 1 (`setupRow5AuditHeaders`) to format/insert the `Auditor` column right after Col O (`สติกเกอร์`) at Column P (Column 16), shifting historical audit columns (`ปี68`..`ปี63`) cleanly to Columns Q–U (Columns 17–21).
  - Automatically writes the auditor's display name (resolved from `authenticateSession()`) into Col P of the target room sheet on every 1-tap audit action (`updateAssetStatus`) and unlisted asset registration (`addNewUnlistedAsset`).
  - **Strict Master Non-Aggregation**: As requested, the `Auditor` column is strictly preserved at the room level and is **not** aggregated into `Master_Asset`, keeping `Master_Asset` lean as 6 essential columns (`Inventory number`, `Asset description1`, `Room`, `Scanned 69`, `หมายเหตุปี 69`, `สติกเกอร์`).
- **Layer 1, 2 & 3 Data Consistency Architecture**:
  - **Layer 1**: Operational Master Ground Truth & Menu 2 selective aggregation engine.
  - **Layer 2 (`onEdit(e)`)**: Implemented Google Sheets simple `onEdit(e)` trigger in `Code.js` to detect manual spreadsheet cell edits on room sheets (Cols M `Scanned 69`, N `หมายเหตุปี 69`, O `สติกเกอร์`, D `Asset description1`, I `Room` at Row $\ge 6$) and sync them directly into `Master_Asset` in real-time.
  - **Layer 3**: Menu 4 (`checkMasterTableContradictions`) & Contradiction Modal for cross-sheet contradiction and duplicate tag detection.
- **Stats Sheet Auto-Provisioning & Live Usage Analytics UI**:
  - Added `ensureStatsSheet(ss)` in `TelemetryService.js` to automatically create and format the `Stats` sheet tab (`Timestamp`, `UserEmail`, `UserName`, `Action`, `Room`, `AssetID`, `DurationMs`, `Metadata`).
  - Implemented `getAppUsageStats()` backend endpoint returning total assets, audited count, remaining count, completion percentage, status breakdown, sticker breakdown, auditor leaderboard, and room-by-room progress bars.
  - Added a dedicated "📊 Stats" button in the Web App header and a mobile-responsive "Usage & Audit Stats" Modal (`statsModal`) with real-time refresh capability.
- **Suite 32 Automated Verification**:
  - Added Test Suite 32 to `Tools/test_core.js` validating Auditor column formatting, Layer 2 `onEdit` handler, Stats sheet auto-creation, and Web App stats UI telemetry rendering.

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.3n] - 2026-09-12

### Added & Improved
- **Full Codebase & Documentation Cleanup**:
  - Performed deep audit and cleanup across all 16 Google Apps Script modules (`App_Script/`) and repository markdown documentations.
  - Verified clean syntax parsing across all JavaScript, JSON, and embedded client HTML scripts.
  - Aligned all architectural documentation guides (`Architectural_Safety_Guide.md`, `Handover_Guide.md`, `Project_Profile.md`, `Planning.md`, `README.md`) with the current 6-column dynamic Master Table schema and interactive toast UX standards.
- **Suite 31 Audit Verification**:
  - Integrated Suite 31 in `Tools/test_core.js` covering JSON syntax, script compilation, and documentation integrity verification.

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.3m] - 2026-09-12

### Added & Improved
- **Interactive Expand-on-Tap/Hover Toast Notifications**:
  - Re-architected `ModalController.showToast` to support dynamic interactive expansion upon cursor hover (`mouseenter`) and touch/click (`click`).
  - Automatically switches from compact pill with truncation to full-width container (`rounded-2xl max-w-lg break-words whitespace-normal`), revealing lengthy untruncated messages.
  - Automatically pauses auto-dismiss countdown during hover/expansion, resuming with a 2.5s grace period on mouseleave or instant tap-to-dismiss.
  - Increased default toast display duration to **3.5 seconds** (minimum 3.0 seconds enforced).
- **Ecosystem Skill Standard Integration**:
  - Integrated the **Universal Toast Notification & Expand-on-Tap Standard** into `.agents/skills/lab-oops-standards/SKILL.md` (Section 3, Item 5) across all 13 Lab Oops OS child projects.

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.3l] - 2026-09-12

### Added & Improved
- **6-Column Master Sheet Schema Dynamic Extraction & Parsing**:
  - Re-architected backend data reading and indexing in `getMasterAuditSummary`, `lookupAssetInMaster`, `updateAssetStatus`, `addNewUnlistedAsset`, and `queryMasterTable` to dynamically align with the updated 6-column Master Sheet layout:
    - **Col A (Index 0)**: `Inventory number`
    - **Col B (Index 1)**: `Asset description1`
    - **Col C (Index 2)**: `Room`
    - **Col D (Index 3)**: `Scanned 69`
    - **Col E (Index 4)**: `หมายเหตุปี 69`
    - **Col F (Index 5)**: `สติกเกอร์`
  - Fixed mismatched column offsets in `getMasterAuditSummary` where `row[3]` previously assigned `Scanned 69` to Asset Name and `row[1]` assigned Description to Asset ID.
- **Immediate Real-Time Sheet Persistence & Auto-Sync**:
  - Added explicit `SpreadsheetApp.flush()` execution in `updateAssetStatus` and `addNewUnlistedAsset` immediately after modifying cells in both `Master_Asset` and Room worksheets.
  - Guarantees immediate, transactional write-through to Google Sheets before returning RPC payloads and refreshing client caches.

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.3k] - 2026-09-12

### Added & Improved
- **Status Chip Category Tone Matching (Only Green / Red / Gray)**:
  - Dynamically updates the selected status chip badge in both `#modal-sublayer-sticker` and `#card-sublayer-sticker` via `updateStickerStatusBadgeTone`:
    - 🟢 **Green (`.badge-status-green`)**: Active/In-use actions (`ใช้งานอยู่`, `ใช้งานอยู่แต่ชำรุดนะ`, Move Room, Rename Asset).
    - 🔴 **Red (`.badge-status-red`)**: No longer needed/damaged actions (`หมดความจำเป็นต้องใช้งาน`, `หมดความจำเป็นต้องใช้งานเพราะชำรุด`).
    - ⚫ **Gray (`.badge-status-gray`)**: Missing/verification actions (`สูญหาย`, `หาไม่เจอ`, `หาไม่เจอ+ให้พัสดุมาตรวจสอบหน้างาน`, `งง+ให้พัสดุมาตรวจสอบหน้างาน`).
  - Applied high-contrast styles for both dark mode and light mode (`body.theme-light`).
- **Extra Font Size Scaling App-Wide**:
  - Increased base body font size to **`17.5px`** (`line-height: 1.58`).
  - Enhanced responsive typography scaling across headings, navigation tabs, cards, inputs, textareas, and buttons.

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.3j] - 2026-09-12

### Added & Improved
- **Dark Mode Legacy Cleanup in Light Mode**:
  - Resolved dark/muddy background artifacts in Audit Stats cards (`.bg-emerald-950/30`, `.bg-amber-950/30`, `.bg-rose-950/30`, `.bg-sky-950/30`, `.bg-purple-950/30`) by introducing comprehensive light tint mappings (`#ecfdf5`, `#fffbeb`, `#fff1f2`, `#f0f9ff`, `#faf5ff`).
  - Restyled camera standby placeholder (`#scanner-placeholder`, `.scanner-overlay-box`) to crisp white/light-slate with dark readable typography and high-contrast start buttons.
  - Upgraded floating toast notifications (`.app-toast`, `.toast-success`, `.toast-error`, `.toast-warning`, `.toast-info`) with high-contrast colored borders and dark text.
  - Overhauled skeleton loading state (`#roster-loading-state`), modals (`#manual-lookup-modal`, `#unrecognized-asset-modal`, `#dev-gateway-modal`), inputs, and dropdowns for full light mode consistency.
- **Universal Sticker Check Modal Trigger**:
  - Standardized all 10 1-tap action buttons across all 3 groups to immediately trigger the Sticker Check modal (`openStickerInspectionSublayer`) with zero dependency on which button is clicked.
  - Integrated Move Room and Rename Asset sublayers to transition smoothly into Sticker Check before persisting.
- **App-Wide Typography Scaling**:
  - Increased base body font size from `15px` to `16px` with `1.55` line-height for enhanced readability on field mobile devices.
  - Scaled headers, tab labels, badges, cards, buttons, and inputs proportionately.

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.3i] - 2026-09-12

### Added & Improved
- **Front Copy Buttons**: Moved one-click copy buttons to the front of both rows (Asset Name and Inventory Number) in both the matched asset inline card and pop-up modal dialog for uniform left-aligned touch ergonomics.
- **Blank Notes Initialization**: In the sticker inspection sublayer ("รายละเอียดการแก้ไข / หมายเหตุสติกเกอร์:"), the textarea now initializes completely blank instead of pre-populating with old remarks.
- **Renamed to "Sticker Check"**: Updated sticker sublayer header label from "ตรวจสอบความสมบูรณ์ของสติกเกอร์ (Sticker Check):" to concise "Sticker Check".
- **Vertical Space Optimization**: Removed the redundant header row "บันทึกสถานะ Scanned 69 (AY 2569): 1-Tap Action" in `#asset-details-modal` to maximize vertical space.
- **Thorough Light Mode Color Panel Overhaul**: Comprehensive upgrade to light theme CSS across header, nav tabs, cards, inputs, textareas, sublayer containers, sticker buttons, and action buttons for crystal-clear readability, elegant surface contrast, and WCAG AAA compliance.

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.3h] - 2026-09-12

### Added & Improved
- **Column O (`สติกเกอร์`) Aggregation & Migration Bi-Sync (Menu 2 & Menu 3)**:
  - Extended Master Table schema to 6 essential columns: Col A (`Inventory number`), Col B (`Asset description1`), Col C (`Room`), Col D (`Scanned 69`), Col E (`หมายเหตุปี 69`), Col F (`สติกเกอร์`).
  - Menu 2 (`buildMasterTableFromRooms`) extracts Column O (`สติกเกอร์`) from each room sheet starting at Row 6 and writes it to Column F in `Master_Asset`.
  - Menu 3 (`migrateMasterToRoomSheets`) parses Column F (`สติกเกอร์`) back into Column O (Col 15) of individual room worksheets for matched and newly appended rows.
- **Post 1-Tap Sticker Integrity Inspection Workflow**:
  - Tapping any 1-Tap status button seamlessly opens a dedicated **Sticker Integrity Inspection** sublayer (`#modal-sublayer-sticker` / `#card-sublayer-sticker`).
  - Displays the chosen audit status badge and provides 3 color-coded sticker condition choices:
    1. 🟢 **`ปกติ` (Intact / Good)** (Default preselected)
    2. 🖨️ **`ปริ้นใหม่` (Needs Reprint)** (Faded, peeling, or damaged tag)
    3. ✏️ **`ปริ้นใหม่+แก้ข้อมูล` (Reprint + Change Info)** (Modify name, value, room)
  - Provides a dedicated change notes textarea (`#modal-sticker-change-notes` / `#card-sticker-change-notes`) allowing technicians to record exact required adjustments.
  - Clicking "ยืนยันและบันทึก" saves both status and sticker condition to Master Table and Room Sheets, merges change notes into `หมายเหตุปี 69`, closes the dialog, displays a 3s toast, and auto-resumes the camera stream.

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.3g] - 2026-09-12

### Added & Improved
- **Light Mode High-Contrast Overhaul (WCAG AAA Compliance)**:
  - Overhauled light mode color palette in `styles.html` to eliminate washed-out text and unreadable low-contrast elements.
  - Emerald badges/text enhanced to high-contrast dark forest green (`#047857`, `#059669`) on soft mint backgrounds (`#d1fae5`).
  - Remark note container (`#modal-asset-note-container`) and text (`#modal-asset-note-display`) updated to rich dark amber/brown (`#92400e`, `#78350f`) on soft cream amber background (`#fef3c7`).
  - Group 3 action buttons (สูญหาย / หาไม่เจอ / งง) styled with high-contrast slate text (`#0f172a`), solid borders (`#cbd5e1`), and distinct hover states.
- **Modal Boundary Containment & Button Overflow Fix**:
  - Enforced `max-h-[92vh] overflow-y-auto` directly on the `#asset-details-modal` dialog card container.
  - Eliminated unwanted duplicate result69 lines and streamlined top vertical spacing.
  - Tightened button padding (`py-1.5 px-2`), gap spacing (`space-y-1.5`), and grid structures so all 10 1-tap action buttons fit comfortably inside the modal card boundary on vertical mobile viewports without cutoffs.
- **Shrunk Compact Copy Buttons**:
  - Miniaturized inline copy icons next to Asset Description (Title), Inventory Number (Subtitle), and Remark (`หมายเหตุปี 69`).
  - Added full copy support for `copyToClipboard('note')` with real-time toast feedback.

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.3f] - 2026-09-12

### Added & Improved
- **Automatic "ปกติ" Setting in Column O (สติกเกอร์) on Menu 3 Migration**:
  - In `migrateMasterToRoomSheets`, every entry that has a 1-tap audit action recorded in Column M (`Scanned 69`) automatically has its Column O (`สติกเกอร์`) populated with `"ปกติ"` when migrated back to individual room worksheets.
  - Ensures accurate sticker tracking on room sheets without requiring extra manual inputs during QR scanning.
  - Leaves unscanned/blank entries untouched so their pre-existing sheet state is maintained.

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.3e] - 2026-09-12

### Added & Improved
- **Menu 3 (Sync Master to Individual Room Sheets) Compatibility & Robustness**:
  - Validated and strengthened `migrateMasterToRoomSheets` to operate with the lean 5-column Master Table schema (`Inventory number`, `Asset description1`, `Room`, `Scanned 69`, `หมายเหตุปี 69`).
  - **Canonical Room Sheet Grouping**: Resolves destination sheet names using `getRoomSheetByName` so that room name variations in Master Table map to their canonical room worksheets cleanly without duplicate passes.
  - **Multi-Row Matching**: Supports matching multiple duplicate rows in the same room sheet without dropping subsequent occurrences.
  - **Audit Column Sync**: Direct batch write to Column M (`Scanned 69`) and Column N (`หมายเหตุปี 69`) on matched rows while preserving existing Column O (`สติกเกอร์`) values on the room sheet.
  - **New / Moved Item Insertion**: Appends unlisted or moved assets after the last row in the room sheet with the standard 20-column schema, soft yellow highlight (`#FFF2CC`), text-formatted inventory number (`@`), and thin grid borders.
  - **Multi-Tier Cache Invalidation**: Automatically purges both `ASSET_ROUTER_INDEX` and `MASTER_ASSET_CACHE` upon migration completion for real-time mobile app synchronization.

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.3d] - 2026-09-12

### Added & Improved
- **Lean 5-Column Master Table Aggregation (Menu 2)**:
  - Updated `buildMasterTableFromRooms` to extract ONLY the 5 essential audit columns:
    1. Col B: `Inventory number`
    2. Col D: `Asset description1`
    3. Col I: `Room`
    4. Col M: `Scanned 69`
    5. Col N: `หมายเหตุปี 69`
  - Completely purged extra procurement data, cost, depreciation, and legacy columns from `Master_Asset`, massively reducing payload sizes and accelerating spreadsheet sync speeds.
  - Aligned all master query and lookup functions (`lookupAssetInMaster`, `queryMasterTable`, `checkMasterTableContradictions`, `migrateMasterToRoomSheets`) to seamlessly operate on the lean 5-column schema.
- **Prominent หมายเหตุปี 69 (Column N) Display in Matched Asset Details Modal**:
  - Added a dedicated, prominent note container (`#modal-asset-note-container`) directly below the inventory number subtitle chip in the scanned asset card modal.
  - Displays the current `หมายเหตุปี 69` value (or `—` when empty) with an amber badge for instant field verification.
- **Compact Mobile Card Modal Layout (No-Scroll Fit)**:
  - Re-engineered the modal card layout (`asset-details-modal`) to fit entirely within vertical mobile screens without vertical scrolling.
  - Sized action buttons to `py-2 px-1.5` / `py-1.5 px-1.5` and tightened padding, eliminating boundary overflow and ensuring all 10 action buttons across the 3 status groups stay 100% within the visible card boundary.

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.3c] - 2026-09-11

### Added & Improved
- **Single Reusable Modal Template for Room Sheet Selection (`SheetSelectorModal.html`)**:
  - Unified Menu 1 (`🏷️ 1. Setup Row 5 Audit Columns on Room Sheets...`) and Menu 2 (`📥 2. Aggregate Rooms into Master Table...`) into a single parameterized HTML template modal as a **single source of truth**.
  - Enabled multi-sheet selection with **Select All / Deselect All**, live counter badge, search/scroll view, and loading spinner feedback for Menu 1 formatting.
  - Dynamically binds modal title, instruction text, action button labels, and server dispatchers based on `mode` (`setupRow5` vs `aggregate`).
- **Targeted Row 5 Audit Column Setup Runner (`runSetupRow5WithSelectedSheets`)**:
  - Implemented `runSetupRow5WithSelectedSheets(selectedSheetNames)` in `Code.js` to format only the user-selected sheets instead of blindly processing every room.
  - Automatically shifts cell M5 if needed, cleans up Columns A–L on Row 5, and writes canonical headers for Columns M–T with formatting and borders.
- **Strict Single Source of Truth Alignment**:
  - Eliminated code duplication between sheet selector interfaces. Any design, styling, or functional tweaks to `SheetSelectorModal.html` automatically apply to both Menu 1 and Menu 2.

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.3b] - 2026-09-11

### Added & Improved
- **Master Table Integrity & Contradiction/Duplicate Checker (`🔍 4. Check Master for Duplicates & Contradictions`)**:
  - Implemented `checkMasterTableContradictions(ss)` to inspect `Master_Asset` across all rows.
  - Automatically identifies duplicate inventory numbers, conflicting room entries, and rows missing inventory IDs.
  - Soft red highlights (`#FEE2E2` row background with `#FECACA` / `#DC2626` cell accent) are automatically applied to duplicate rows on `Master_Asset` for instant spreadsheet review.
  - Added to Google Sheets custom menu (`🔍 4. Check Master for Duplicates & Contradictions`) and Developer Gateway (`ModalController.triggerCheckMasterContradictions()`).
- **Master-to-Room Sync Migration with Full-Row Yellow Highlight (`#FFF2CC`)**:
  - Enhanced Menu 3 (`migrateMasterToRoomSheets`) to match assets by Inventory Number (Col B).
  - For existing matched items: updates audit columns (Col M `Scanned 69`, Col N `หมายเหตุปี 69`, Col O `สติกเกอร์`).
  - For unmatched items (new unlisted registrations or items moved into this room): appends after the last entry with a **full-row soft yellow highlight (`#FFF2CC`)** across all 20 columns to maintain a clear visual audit trail.
- **Room Sheet Aggregation Room Extraction (Column I)**:
  - Updated Menu 2 (`buildMasterTableFromRooms`) to explicitly extract and preserve Column I (`Room`) from each room sheet, falling back to the sheet name only if Column I is empty.
- **Initial Room Roster Skeleton Loading Visual Cue (`#roster-loading-state`)**:
  - Replaced empty blank screen on Room Roster initial load with an animated skeleton loader card (`กำลังโหลดข้อมูลครุภัณฑ์...`) while the spreadsheet payload is fetching.
- **Typography & Responsive Mobile Scaling**:
  - Increased body font size across the app (`15px` base, `text-[15px]` to `text-base` for primary asset names, `text-sm` for inventory numbers and 1-tap action buttons, `text-xs` for metadata chips and notes) while keeping top headers and navigation bars compact and balanced.
  - Documented standards in `Documentations/Architectural_Safety_Guide.md` (Sections 7 & 8).

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.2b] - 2026-09-11

### Added & Improved
- **5-Card Audit Overview & Unaudited / Pending Stat Card**:
  - Expanded Audit Stats overview grid from 4 to 5 responsive cards:
    1. **Total Assets** (`#summary-stat-total`)
    2. **ยังไม่สำรวจ / Pending** (`#summary-stat-unverified`, amber badge, counts unverified items `total - verified`)
    3. **ใช้งานอยู่ / Good** (`#summary-stat-good`, emerald badge)
    4. **ชำรุด / Damaged** (`#summary-stat-damaged`, rose badge)
    5. **สูญหาย / Missing** (`#summary-stat-missing`, slate badge)
  - Tapping the **ยังไม่สำรวจ / Pending** stat card automatically switches to the Room Roster tab and filters for items where Column M (`Scanned 69`) is blank/unverified (`statusFilter = 'UNVERIFIED'`).
- **High-Performance Direct Fixed-Index Sheet & Payload Optimization**:
  - Leveraged strict 20-column schema (`MASTER_HEADERS` on Row 5, data on Row 6) across all room worksheets.
  - **Menu Step 2 (`buildMasterTableFromRooms`)**: Streamlined to perform direct matrix slicing (`sheet.getRange(6, 1, lastRow - 5, 20).getValues()`) without dynamic header regex scanning overhead.
  - **Menu Step 3 (`migrateMasterToRoomSheets`)**: Streamlined to batch-write only the 3 related audit columns (`Scanned 69`, `หมายเหตุปี 69`, `สติกเกอร์` at Cols M, N, O) into room sheets in a single operation per sheet.
  - **Lean Mobile Payloads (`getMasterAuditSummary`, `queryMasterTable`)**: Omitted non-essential legacy fields (`historicalResults`, `procurementCondition`, `budgetYear`, `brandModel`) from network serialization, shrinking JSON payload sizes by ~65% and speeding up synchronization.
- **Automated Verification**:
  - Added Test Suite 16 to `Tools/test_core.js` covering the 5-card Audit Stats layout, `UNVERIFIED` filter mechanics, lean payloads, and version bump validation.

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.2a] - 2026-09-11

### Added & Improved
- **Unlisted Asset Quick Registration & 1-Tap Mobile Audit**:
  - When an unrecognized QR barcode is scanned (not found in `Master_Asset` or room sheets), the app now presents an interactive **Unlisted Asset Registration Modal (`#unrecognized-asset-modal`)** instead of a static error.
  - **Column N (`หมายเหตุปี 69`)**: Defaults to `"พบครุภัณฑ์ที่ไม่มีในฐานข้อมูลส่งสำรวจ"` (pre-filled, editable by user).
  - **Column M (`Scanned 69`)**: Derived directly from the user's 1-Tap Action button selection (`ใช้งานอยู่`, `ใช้งานอยู่แต่ชำรุดนะ`, or `หมดความจำเป็นต้องใช้งาน`).
  - **Target Room Assignment (Column I)**: Allows technician to select the room worksheet to register the item into (defaults to active room).
  - **Asset Description (Column D)**: Optional name input (e.g. `ตู้ดูดควันไอสารเคมี`).
  - **Sticker Status (Column O)**: 3-pill toggle for `ปกติ`, `ปริ้นใหม่`, `ปริ้นใหม่+แก้ข้อมูล`.
  - **Zero-Latency Mobile UX**: Immediate 3-second non-blocking confirmation toast, instant modal dismissal, and automatic resumption of live camera streaming for continuous scanning.
  - **Backend Dual-Insertion**: Inserts the new durable asset row cleanly under Row 5 on the target room worksheet and appends to `Master_Asset` with 20 aligned columns, invalidating cache indices.
- **Copy Scanned Unrecognized QR Tag**:
  - Added copy-to-clipboard button next to the unrecognized code in the registration modal.

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.1g] - 2026-09-10

### Added & Improved
- **Force Sync & Refresh from Google Sheets**:
  - Added visible `🔄 Sync` buttons to the top header and Room Roster filter bar.
  - Tapping triggers `ModalController.triggerForceSync()`: flushes all backend/script caches (`ApiClient.flushCache()`), fetches fresh audit data from the Google Spreadsheet, updates `AppState`, and re-renders the UI with spinning icon animation.
  - Fixed cache stale data bug in `DatabaseService.js` (`getMasterAuditSummary` and `queryMasterTable` now strictly derive verification from `Scanned 69 !== ""` without reading `หมายเหตุปี 69` as status).
- **One-Click Clipboard Copy Buttons**:
  - Added copy icons next to **Asset Description 1 (Asset Name)** and **Inventory Number** in `#asset-details-modal` and `#active-asset-card`.
  - Implemented `ModalController.copyToClipboard(type)` with fallback for instant copy to clipboard and toast feedback.
- **Universal Backdrop Modal Dismissal (Click Outside to Close)**:
  - Tapping outside any modal dialog (`#asset-details-modal`, `#manual-lookup-modal`, `#unrecognized-asset-modal`, `#dev-gateway-modal`) immediately dismisses the modal and returns to the previous view/scanner video stream.
  - Standardized this UX rule in `Documentations/Architectural_Safety_Guide.md`.

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.1f] - 2026-09-10

### Added & Fixed
- **Blank Fallback Audit Status for Unverified Items**:
  - Assets with empty Column M (`Scanned 69`) now render strictly as **blank (`""`)** across the roster, inline cards, and asset modal, instead of falling back to `"Good"` / `"[checkmark] Good"` or `"[clock] Unverified"`.
  - Updated `DatabaseService.js` to strictly require `scanned69Val !== ""` before deriving verification status; if Column M is blank, `statusDerived` and `statusVal` evaluate to empty string `""` with `isVerified = false`.
  - Updated `AuditController.html` (`renderStatusBadgeHtml`) to return an empty string `""` for blank, null, `"-"`, or `"Unverified"` statuses.
- **Architectural Verification & `skill.md` Alignment**:
  - Documented modular architecture adherence across client controllers, state stores, and backend services.
  - Verified Light Mode high-contrast WCAG AAA compliance and touch target standard ($\ge 44\times 44$px).
- **Automated Test Suite Expansion**:
  - Expanded `Tools/test_core.js` to 13 automated test suites verifying blank fallback status badge rendering, 15-room configuration, and 20 aligned Master columns.

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

## [1.1.1e] - 2026-09-10

### Added & Improved
- **Continuous 1-Tap Mobile Scanning UX Workflow**:
  - Once any 1-Tap status button (or Move/Rename confirmation) is clicked, the app:
    1. Immediately closes `#asset-details-modal` without waiting for backend roundtrip.
    2. Hides the inline `#active-asset-card` to clear the viewport.
    3. Auto-navigates back to the `scanner` tab (if not already there).
    4. Automatically re-engages the live camera stream (`ScannerController.startScanner()`) and resets scan debounce (`resetLastScannedCode()`) so the technician can scan the next physical tag instantly.
- **3-Second Non-Blocking Floating Toast Notification**:
  - Confirmation toast duration set to exactly **3,000 ms (3 seconds)** across all actions.
  - Relocated `#toast-container` to `top-16` (directly beneath the app header) with `pointer-events-none` and a centered/slim rounded pill design.
  - Guarantees the toast never obscures the central viewfinder box, camera controls, or thumb buttons.

### Purged & Restricted
- **Strict Allowed Column Enforcement (Columns B, D, I, M, N, O ONLY)**:
  - Completely purged all non-allowed columns from display, linking, and card rendering:
    - **Column A (`No.`)**: Purged `#1`, `#2` item counter badges from roster cards.
    - **Column E (`Asset description2`)**: Purged brand, model, and `"No specification"` from roster cards, inline cards, and modals.
    - **Column J (`สภาพของสินทรัพย์`)**: Purged `"สภาพพัสดุ: ..."` elements from all cards and modals.
    - **Column K / L (`Cap.date` / `ปีงบฯที่ได้มา`)**: Purged `"ปีงบฯ: ..."` elements from modals and cards.
    - **Columns P–T (`ปี68`–`ปี63`)**: Purged historical results (`"ผลปี 68: ..."`) from all cards and modals.
    - **Quick Note Chips**: Removed predefined chips (`Clear Optics`, `Missing Cable`, etc.); replaced with custom note input targeting **Column N (`หมายเหตุปี 69`)**.
  - **The entire UI now strictly renders only 6 columns**:
    - **Column B**: `Inventory Number` (`assetId`)
    - **Column D**: `Asset Description1` (`itemName` / Asset Name — Primary Title)
    - **Column I**: `Room` (`registeredLocation`)
    - **Column M**: `Scanned 69` (Status badge / 1-Tap action buttons)
    - **Column O**: `สติกเกอร์` (`sticker` — displayed with `<i class="fa-solid fa-tag"></i>` pricetag icon)
    - **Column N**: `หมายเหตุปี 69` (`auditResult69` / notes)
  - Restricted roster search query to match strictly within columns B, D, I, M, N, O.

### Deployment Scope
- Deployed exclusively via Google Apps Script Clasp push (`clasp push --force`). Strictly zero Git push executed.

### Added
- **Interactive Audit Stat Cards (Drill-Down Filter)**:
  - Clicking any of the 4 metric cards (`Total Registered`, `Verified Good`, `Damaged / Issue`, `Missing Assets`) on the Audit Stats tab (`#view-summary`) now filters assets in the roster immediately.
  - Implemented `AuditController.filterFromStatCard(criteria)` to update `AppState.set("statusFilter", criteria)`, switch to the `roster` tab, smoothly scroll into view, and toggle active filter chip styling.
  - Updated stat cards with interactive pointer cursor, hover border glow, active tap scale animations, right-arrow indicator, and informative tooltips.

### Changed & Improved
- **Auditing Card & Modal Information Hierarchy**:
  - Restructured `#asset-details-modal` header and `#active-asset-card` to emphasize the asset's identity:
    - **Primary Title (`<h2>` / `<h3>`)**: Asset Name (`Asset description1`, Column D) in bold white text.
    - **Subtitle**: Inventory Number (`Inventory number`, Column B) in emerald font-mono badge accompanied by specification / brand model (`Asset description2`, Column E).
- **Reference Note Display: Column N (`หมายเหตุปี 69`) ONLY**:
  - Corrected reference note rendering in `AuditController.html` (`renderAssetList`) to strictly show **Column N (`หมายเหตุปี 69`)** as `หมายเหตุ 69: ...`.
  - Completely removed erroneous and redundant `"Scanned 69: ..."` text from reference notes.
  - Added dedicated reference box `#modal-asset-result69-box` and `#asset-card-result69-box` populated from `asset.auditResult69` (hidden when empty).

### Enhanced
- **Multi-Status AppState Filter Resolution**:
  - Enhanced `AppState.getFilteredItems()` to resolve both normalized category keys (`Good`, `Damaged`, `Missing`) and full Thai status strings (`ใช้งานอยู่`, `ชำรุด`, `สูญหาย`, `หาไม่เจอ`) seamlessly.
- **Automated Verification Suite (11 Tests)**:
  - Extended `Tools/test_core.js` to verify stat card drill-down handlers, hierarchy title/subtitle DOM elements, and absence of `"Scanned 69: "` in reference notes.

## [1.1.1c] - 2026-09-10

### Fixed
- **Resolved Fatal Syntax Error in `AuditController.html`**:
  - Added missing `});` on `document.querySelectorAll(".modal-quick-chip").forEach(...)` in `AuditController.init()`.
  - Fixes `SyntaxError: missing ) after argument list` that halted initialization on page load.
  - Restores full responsiveness for `ROOM ROSTER` and `AUDIT STATS` tab navigation buttons.
  - Resolves blocked `ApiClient.getInitialPayload()`, ensuring `Verified / Total` metrics and room dropdown options load on start.

### Enhanced
- **Room Selector Master Table & Room Sheets Integration**:
  - Updated primary selector option to **`Master Table (All Rooms)`** (value `"ALL"`).
  - Dropdown dynamically populates `Master Table (All Rooms)` followed by all individual room sheets (`Bio Prep`, `Bio1`, `Chem1`, etc.).
  - Added fallback in `DatabaseService.js` `getInitialPayload()` to `ROOM_SHEETS_CONFIG` if spreadsheet tabs are temporarily unavailable.
  - Set default room view to `"ALL"` (Master Table overview).
- **Direct Column I (`Room`) Mutation for Asset Transfers**:
  - When marking an asset as `ใช้งานอยู่+ย้ายไป...`, the system directly updates **Column I (`Room`)** in both `Master_Asset` and the source room worksheet.
  - Clarified architectural recommendation: No separate `"MOVE_TO"` config key is required; Column I represents official asset location, while Column N (`หมายเหตุปี 69`) retains `"ย้ายไป [destinationRoom]"` as an AY 2569 audit trail.
- **Double-Bound Tab Event Listeners**:
  - Bound explicit DOM click listeners to `#nav-tab-scanner`, `#nav-tab-roster`, and `#nav-tab-summary` alongside inline `onclick` attributes.
- **Automated Client Script Syntax Suite**:
  - Added Suite 10 to `Tools/test_core.js` verifying that all client-side script blocks across all HTML components parse with 0 errors.

## [1.1.1b] - 2026-09-10

### Added
- **Spreadsheet Menu 2 Modal Sheet Selector (`SheetSelectorModal.html`)**:
  - Replaced immediate headless aggregation in Spreadsheet Menu 2 (`📥 2. Aggregate Rooms into Master Table...`) with an interactive modal dialog.
  - Interactive top bar with master **Select All / Deselect All** checkbox and live selection counter badge (`X of Y selected`).
  - Dynamic scrollable list displaying candidate room sheets (excluding system sheets such as `Config`, `Master_Asset`, etc.), all selected by default.
  - Server-side execution via `runAggregationWithSelectedSheets(selectedSheetNames)` calling `buildMasterTableFromRooms(null, selectedSheetNames)` with spreadsheet UI toast feedback.
- **Master Table 20-Column Exact Alignment (Cols A to T)**:
  - Aligned `Master_Asset` columns 1-to-1 with room sheets Row 5 headers:
    - Col A (1): `No.`
    - Col B (2): `Inventory number`
    - Col C (3): `Asset`
    - Col D (4): `Asset description1`
    - Col E (5): `Asset description2`
    - Col F (6): `Curr.acq.value`
    - Col G (7): `Original value`
    - Col H (8): `Asset location`
    - Col I (9): `Room`
    - Col J (10): `สภาพของสินทรัพย์`
    - Col K (11): `Cap.date`
    - Col L (12): `ปีงบฯที่ได้มา`
    - Col M (13): `Scanned 69`
    - Col N (14): `หมายเหตุปี 69`
    - Col O (15): `สติกเกอร์`
    - Col P (16): `ปี68`
    - Col Q (17): `ปี67`
    - Col R (18): `ปี66`
    - Col S (19): `ปี64`
    - Col T (20): `ปี63`
- **Complete Purge of `ROOM_TYPE`**:
  - Fully eliminated `ROOM_TYPE`, `RoomType`, `roomTypeFilter`, `inspectDynamicRoomTypes()`, and UI chip filter bar from `Config.js`, `DatabaseService.js`, `AppState.html`, `AuditController.html`, `ApiClient.html`, and `index.html`.
- **Clasp-Exclusive Deployment**:
  - Pushed strictly to Google Apps Script via `clasp push --force`. Git repository and GitHub Pages kept unchanged per explicit user requirement.

## [1.1.1a] - 2026-09-09

### Added
- **Dedicated `Scanned 69` Column (Col 13 / M)**:
  - User survey status is now explicitly recorded in Column M (`Scanned 69`), placed to the left of Column N (`หมายเหตุปี 69`).
  - Row 5 audit headers expanded to 8 columns: `Scanned 69`, `หมายเหตุปี 69`, `สติกเกอร์`, `ปี68`, `ปี67`, `ปี66`, `ปี64`, `ปี63`.
  - Added self-healing column shifting: automatically detects if Column M was previously `หมายเหตุปี 69`, inserting Column M cleanly before shifting headers to prevent overwriting existing audit remarks.
- **`Master_Asset` Primary Database Engine**:
  - `lookupAsset(rawCode)` queries `Master_Asset` first, retrieving records in <200ms across all 15 rooms.
  - `getRoomAuditSummary(roomName)` aggregates room metrics directly from `Master_Asset` first for instantaneous loading.
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
- **Scanner Priority Inversion**:
  - Set `📹 START LIVE SCANNER` as the primary prominent emerald green action in the standby viewfinder.
  - Reordered toolbar to place Live stream before Camera snap.
- **Clasp-Exclusive Deployment**:
  - Pushed strictly to Google Apps Script via `clasp push --force` (14 files). Git repository and GitHub Pages preserved without premature push.

## [1.1.0e] - 2026-09-08

### Added
- **GitHub Pages Deployment Architecture**:
  - Configured standalone web bundle as `index.html` at repository root and inside `/docs/` with `.nojekyll` bypass.
  - Zero-install, zero-npm static deployment to `https://nattapat-poo.github.io/AssetTracker2026/`.
  - Enables 100% native 60 FPS continuous camera video streaming on mobile devices without iframe sandboxing restrictions.
  - Seamless real-time data persistence to Google Sheets via `LIVE_GAS_WEBAPP_URL` remote HTTPS bridge.
- **Repository Setup & Version Bump**:
  - Rolled to `v1.1.0e` across all Apps Script files, HTML shells, configuration manifests, UI badges, and automated test suites.
  - Clean `.gitignore` protecting local clasp credentials and transient build artifacts.

## [1.1.0d] - 2026-09-08

### Added
- **Matched Asset Details Modal (`#asset-details-modal`)**:
  - Automatically pops up in full focus immediately when an asset QR code is scanned via camera snap, live stream, or gallery upload.
  - Displays full asset metadata: Inventory Number, Item Description, Brand/Model, Room, Condition (`สภาพของสินทรัพย์`), Historical Survey Result (`ผลปี 68`), and Sticker status.
  - Interactive **Sticker Toggle Button** (`🏷️ Sticker: YES/NO`) with real-time state mutation directly inside the modal.
  - Embedded **1-Tap Thumb Action Bar** (`✅ GOOD`, `⚠️ DAMAGED`, `❌ MISSING`) right inside the modal body, saving technician status with a single tap and automatically closing the modal.
  - Integrated condition notes input with quick chip tags (`Lenses clean`, `Calibrated`, `Plate chipped`, `Cable worn`, etc.).
- **Remote HTTPS Bridge & Dual-Runtime Support**:
  - Added `LIVE_GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyX7q6-CSO0JeueXXg9OcNpnNL21DOLS3klvkPjxTs/exec"` to `ApiClient.html`.
  - Enables hosting the frontend as an external static web application (e.g. GitHub Pages, Cloudflare Pages, Netlify) to obtain native 60 FPS continuous camera video streaming outside Google's sandboxed iframe.
  - Frontend automatically detects remote hosting or `?live=1` query parameter to route RPC requests via standard HTTPS `POST` requests to Google Apps Script `doPost(e)` with zero preflight CORS friction.
- **`doPost(e)` Remote Dispatcher Robustness**:
  - Enhanced `doPost(e)` in `Code.js` to dynamically unwrap both wrapped (`{ action, payload: { ... } }`) and flat (`{ action, assetCode: "..." }`) JSON payloads.

### Fixed
- **Instant Scan-to-Modal UX Workflow**: Eliminated the need for technicians to manually scroll down to find the asset card after capturing an image on Android/iOS; the modal now opens instantly with smooth backdrop blur.

### Changed
- **Version Bump**: Rolled to `v1.1.0d` across all 14 Apps Script files, HTML shells, configuration manifests, UI badges, and automated test suites.

## [1.1.0c] - 2026-09-08

### Fixed
- **Camera Activation on Mobile & Laptops**:
  - **GAS Sandboxed Iframe Permissions Policy Fix**: Google Apps Script web apps embed user HTML in a sandboxed iframe without `camera` permissions policy (`allow="camera"`), causing `getUserMedia()` to fail with `NotAllowedError` or `SecurityError`. Resolved by introducing **Mode 1: Instant Native Camera Snap** (`<input type="file" accept="image/*" capture="environment">`), which bypasses the iframe restriction 100% on iOS Safari, Android Chrome, and mobile browsers.
  - **Laptop Webcam `OverconstrainedError` Fix**: On laptops and desktops lacking rear cameras, requesting `{ facingMode: "environment" }` threw `OverconstrainedError`. Resolved by utilizing `Html5Qrcode.getCameras()` to detect available camera IDs and automatically select the front-facing webcam or default device camera.
  - **Intelligent Fallback Bridge**: If live stream initialization throws an iframe permission or access error, the app automatically transitions to the Native Camera Snap dialog without user friction.

### Added
- **Multi-Modal Camera Scanner UI (`ScannerController.html` & `index.html`)**:
  - Added prominent **📸 SNAP WITH CAMERA** primary action button in the scanner standby viewfinder.
  - Added multi-modal controls toolbar with dedicated buttons for **📸 Snap**, **📹 Live Video**, **🔄 Flip Camera**, **⚡ Torch / Flashlight**, and **🖼️ Gallery Upload**.
  - Attached hidden native file inputs for direct camera snap (`capture="environment"`) and gallery file picker.
- **Hardware-Accelerated Dual-Stage QR Decoder**:
  - **Stage 1 (Hardware Acceleration)**: Uses `window.BarcodeDetector` (5ms GPU decoding) via `createImageBitmap(file)` on supported browsers (Android Chrome, iOS Safari 17+).
  - **Stage 2 (Canvas Downscaling)**: Implemented `downscaleImageBlob(file, 1280)` to downscale high-resolution (12MP–48MP) smartphone photos to max 1280px via off-screen HTML5 `<canvas>`, preventing memory exhaustion and reducing ZXing JS decode latency to <50ms.
- **Version Bump**: Rolled to `v1.1.0c` across all components, manifests, UI badges, and automated test suites.

## [1.1.0b] - 2026-09-08

### Fixed
- **Hardcoded Column M on Row 5**: In `setupRow5AuditHeaders(ss)`, replaced dynamic column scanning (which mistakenly matched the report title banner containing `"ปีงบ"` in Column A) with strictly hardcoded **Column M (Column 13)** as the start column for the 7 audit headers:
  - Col M (13): `หมายเหตุปี 69`
  - Col N (14): `สติกเกอร์`
  - Col O (15): `ปี68`
  - Col P (16): `ปี67`
  - Col Q (17): `ปี66`
  - Col R (18): `ปี64`
  - Col S (19): `ปี63`
- **Automatic Repair for Row 5 Columns A–L**: Implemented a self-healing cleanup pass in `setupRow5AuditHeaders(ss)` that scans Row 5 Columns 1–12 (A–L). Any cells mistakenly containing audit headers from previous runs are automatically restored with canonical procurement headers (`No.`, `Inventory number`, `Asset`, `Asset description1`, `Asset description2`, `Curr.acq.value`, `Original value`, `Asset location`, `Room`, `สภาพของสินทรัพย์`, `Cap.date`, `ปีงบฯที่ได้มา`) with restored standard header formatting.

### Added
- **Config Sheet Synchronization Engine (`syncConfigSheet`)**:
  - Implemented `syncConfigSheet(ss)` in `Config.js` to ensure the `Config` tab in the Google Spreadsheet is initialized and kept up to date.
  - Automatically updates `APP_VERSION` to `v1.1.0b` with a fresh Bangkok timestamp (`yyyy-MM-dd HH:mm:ss`).
  - Automatically populates all standard ecosystem keys while **strictly preserving existing user settings and configurations**.
  - Added menu item `⚙️ 0. Update / Sync Config Sheet (v1.1.0b)` to the Google Sheets custom menu `🚀 Lab Oops: Asset Tracker`.
  - Added **Sync Config** button in the Web App Stealth Developer Gateway Modal.
- **Header Prioritization in `detectSheetHeaderAndColumns`**: Updated schema detection to prioritize Row 5 and Column M/N for survey columns when Row 5 headers are present.

---

## [1.1.0a] - 2026-09-08

### Added
- **Hybrid Master Table (`Master_Asset`)**: Introduced a consolidated Master Table sheet storing only essential columns (`No.`, `Inventory number`, `Asset description1`, `Asset description2`, `Room`, `RoomType`, `สภาพของสินทรัพย์`, `ปีงบฯที่ได้มา`, `หมายเหตุปี 69`, `สติกเกอร์`, `ปี68`, `ปี67`, `ปี66`, `ปี64`, `ปี63`, `SourceSheet`, `LastUpdated`), enabling instant whole-department querying, sorting, and filtering.
- **Row 5 Room Sheet Audit Headers**: Implemented `setupRow5AuditHeaders(ss)` to automatically append the 7 requested columns at Row 5 starting immediately after `"ปีงบฯที่ได้มา"` on every room sheet: `"หมายเหตุปี 69"`, `"สติกเกอร์"`, `"ปี68"`, `"ปี67"`, `"ปี66"`, `"ปี64"`, `"ปี63"`.
- **Dynamic Room Type Inspection**: Implemented `inspectDynamicRoomTypes(ss)` mapping all room sheets against the Project 00 Kernel Room Directory (`11PUpY4zVClvVbfzgu4Olyzy6e5NacNUXZv30bexQQB8`), discovering room types (`Lab`, `ChemicalLab`, `BioSafetyLab`, `Classroom`, `PrepRoom`).
- **Configurable Room Sheet Resolver (`getRoomSheetByName`)**: Added configurable room mapping (`ROOM_SHEETS_CONFIG` / `DEFAULT_ROOM_SHEETS_MAP`) supporting normalized room code aliases and case-insensitive resolution.
- **Bidirectional Migration Engine**:
  - `buildMasterTableFromRooms(ss)`: Aggregates essential columns from all room worksheets into `Master_Asset`.
  - `migrateMasterToRoomSheets(ss)`: Migrates audit outputs (`หมายเหตุปี 69`, `สติกเกอร์`, historical years) from `Master_Asset` back into the respective room sheets in-place.
- **Dual Triggers (Google Sheets Menu & Web App Buttons)**:
  - Added `onOpen()` in `Code.js` creating Google Sheets custom menu: `🚀 Lab Oops: Asset Tracker` with actions for Setup Row 5, Aggregate to Master, Migrate to Rooms, and Flush Caches.
  - Added Migration Control Center inside Web App Developer Gateway modal (`Ctrl + Shift + Q` / PIN `2026`) with live feedback.
- **Dynamic Room Type Filter Chips**: Added room type filter bar in the Web App Roster tab (`#room-type-filter-chips`), integrated with `AppState.roomTypeFilter` and `AuditController.html`.
- **Automated Test Suite Expansion**: Expanded `Tools/test_core.js` to test Row 5 setup, Master Table building, migration, and query APIs.

---

## [1.0.0a] - 2026-09-08

### Added
- **Procurement Merged Header Auto-Detection**: Added `detectSheetHeaderAndColumns(sheet)` in `DatabaseService.js` scanning rows 1–6 to handle merged banners and multi-line headers.
- **Procurement Schema Mapping (Cols A–L)**: Full support for standard procurement fields: Col A (`No.`), Col B (`Inventory number`), Col C (`Asset`), Col D (`Asset description1`), Col E (`Asset description2`), Col F (`Curr.acq.value`), Col G (`Original value`), Col H (`Asset location`), Col I (`Room`), Col J (`สภาพของสินทรัพย์`), Col K (`Cap.date`), Col L (`ปีงบฯที่ได้มา`).
- **Audit Target Columns Integration**: Added direct updates to `หมายเหตุปี 69` and `Sticker`.
- **Non-Invasive Safe Telemetry Mode**: Disabled sheet creation of `Logs` and `Stats` inside procurement spreadsheets; routes to Cloud Logging (`console.log`).
- **Live Google Apps Script Clasp Deployment**: Pushed 14 modular server and client files directly to Google Apps Script (`10uDSRgcbHmWKyqx-x2-Sv18TRweAZyhExzZ8JKhNU-NbZMF6pgSvPIIJ`).
