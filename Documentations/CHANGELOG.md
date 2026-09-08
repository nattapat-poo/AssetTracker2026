# 📜 Changelog — Project 08: QR Asset Survey

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to the Lab Oops OS Versioning Standard (`v[Gen].[Feature].[Minor][ui]`).

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
