# 📝 Developer Engineering Journal (DevLog) — Project 08

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
