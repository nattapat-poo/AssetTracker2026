# 🔍 Project 08: QR-Based Mobile Asset Survey App (v1.1.0e)
### MUIDS Lab Oops OS — Science Department

> **Zero-install multi-modal camera QR scanner with a Hybrid Master Table Architecture & dynamic multi-sheet migration to inspect, query, and update science laboratory procurement assets in real-time.**

---

## 🎯 Executive Overview
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Organization:** MUIDS — Science Department
* **Ecosystem:** [Lab Oops OS](file:///c:/Users/MUIDS/Documents/Projects/Lab%20Oops/Master_Architecture_Nexus_DB.md)
* **Version:** `v1.1.0e`
* **Target Spreadsheet ID:** `18LGXn6JbjFeiVuKlrh0CvJ79M3mpsKTVbc0FJx8LuOk`
* **Target Audience:** Science Laboratory Technicians (`LabTech`) & Teaching Assistants (`TA`)
* **Target Window:** Annual September Procurement Inventory Survey (AY 2569 / 2026)
* **GitHub Repository:** [https://github.com/nattapat-poo/AssetTracker2026](https://github.com/nattapat-poo/AssetTracker2026)
* **GitHub Pages Live App:** [https://nattapat-poo.github.io/AssetTracker2026/](https://nattapat-poo.github.io/AssetTracker2026/)

---

## ⚡ Core Features (v1.1.0e)
1. **Matched Asset Details Modal (`#asset-details-modal`)**:
   - Automatically surfaces immediately upon scanning any asset QR code.
   - Prominently displays: Inventory Number, Item Description, Brand/Model, Registered Room, Condition (`สภาพของสินทรัพย์`), Historical Result (`ผลปี 68`), Sticker Status, and Location Discrepancy warnings.
   - Embedded 1-Tap Thumb Action buttons (`GOOD`, `DAMAGED`, `MISSING`) and interactive `Sticker` toggle button right in the modal for frictionless one-handed mobile auditing.
2. **Dual-Runtime Architecture & Remote HTTPS Bridge**:
   - **Apps Script Web App Runtime**: Leverages Mode 1 Native Camera Snap (`<input capture="environment">`) to bypass Google Apps Script sandboxed iframe permission policy restrictions on mobile browsers.
   - **External Web Host Runtime (GitHub Pages / Cloudflare Pages)**: When hosted outside Google's iframe, the app utilizes native `getUserMedia` for continuous 60 FPS video streaming with hardware `BarcodeDetector`, communicating directly with Google Sheets via HTTPS POST to `LIVE_GAS_WEBAPP_URL`.
3. **Multi-Modal Camera Scanner Engine (`ScannerController.html`)**:
   - **Mode 1: Instant Native Camera Snap (`capture="environment"`)**: Bypasses GAS sandboxed iframe restrictions 100% on iOS Safari and Android Chrome.
   - **Mode 2: Smart Laptop Webcam Fallback**: Dynamically detects laptop webcams via `Html5Qrcode.getCameras()`.
   - **Mode 3: Accelerated Dual-Stage QR Decoder**: Uses `window.BarcodeDetector` (5ms GPU hardware acceleration) and off-screen canvas downscaling to decode high-resolution mobile photos in <50ms.
4. **Config Sheet Synchronization (`syncConfigSheet`)**: Auto-generates and synchronizes the `Config` tab with `v1.1.0d` and Bangkok timestamps while strictly preserving existing user settings.
5. **Hardcoded Column M on Row 5**: Audit columns strictly start at **Column M (Column 13)** across all room sheets (`หมายเหตุปี 69`, `สติกเกอร์`, `ปี68`, `ปี67`, `ปี66`, `ปี64`, `ปี63`).
6. **Automated Row 5 Columns A–L Repair**: Self-healing cleanup loop that restores any mistakenly overwritten procurement headers on Row 5.
7. **Hybrid Master Table (`Master_Asset`)**: Consolidated essential repository enabling fast global querying and dynamic room filtering.
8. **Dynamic Room Type Inspection**: Categorizes sheets into functional room types (`Lab`, `ChemicalLab`, `BioSafetyLab`, `Classroom`, `PrepRoom`) via Project 00 Kernel.
9. **Configurable Room Sheet Resolver (`getRoomSheetByName`)**: Maps room codes to sheet names (`ROOM_SHEETS_CONFIG`) with normalized alias resolution.
10. **Bidirectional Migration Engine**: Aggregates room tabs into the Master Table and migrates audit updates back to room sheets in-place.
11. **Dual Triggers**:
    - Google Sheets UI Menu: `🚀 Lab Oops: Asset Tracker`
    - Mobile Web App Developer Gateway (`Ctrl + Shift + Q` / PIN `2026`)
12. **Remaining Items Tracker**: Real-time room progress bar, live unverified badge, and status filters.

---

## 📂 Repository Structure
```
Project08_AssetTracker/
├── App_Script/                   # Google Apps Script Clasp project (Deployed)
│   ├── .clasp.json               # Linked to Apps Script Project ID
│   ├── appsscript.json           # Manifest with V8 runtime & OAuth scopes
│   ├── Code.js                   # Unified API Router, onOpen menu, & Web App Dispatcher
│   ├── Config.js                 # Constants, Master Sheet Schema, Row 5 Columns
│   ├── AuthService.js            # User Session & RBAC (TA, LabTech, Admin, Teacher)
│   ├── DatabaseService.js        # Hybrid Master Table, Migration Engine, Row 5 Setup
│   ├── TelemetryService.js       # Cloud Logging Telemetry
│   ├── index.html                # Main Responsive Shell with Tailwind CSS & Room Type Chips
│   ├── styles.html               # Custom CSS, Glassmorphism, Theme Tokens, Touch Targets
│   ├── AppState.html             # Client-side State Manager & Event Bus (roomTypeFilter)
│   ├── ApiClient.html            # RPC Bridge (google.script.run + Mock Fallback)
│   ├── ScannerController.html    # HTML5-QRCode Camera Scanner Engine
│   ├── AuditController.html      # 1-Tap Thumb Action Bar & Remaining Items Tracker
│   ├── ModalController.html      # Modals, Migration Triggers, Stealth Dev Gateway
│   └── ThemeController.html      # WCAG AAA Light/Dark Theme Switcher
├── Documentations/               # Architecture Specs, Planning & Dev Logs
│   ├── Project_Profile.md
│   ├── Planning.md
│   ├── DevLog.md
│   ├── CHANGELOG.md
│   ├── Architectural_Safety_Guide.md
│   └── Handover_Guide.md         # Technicians Guide & Row 5 / Master Table Guide
├── Input/                        # Raw sample templates & inventory schemas
├── Output/                       # Standalone previews & export reports
│   └── standalone_preview.html
├── Tools/                        # Standalone testing & mock generator utilities
│   ├── preview_server.py
│   └── test_core.js
└── README.md                     # Root overview and setup instructions
```

---

## 🚀 Quick Start (Local Preview)
```bash
python Tools/preview_server.py
```
Open [http://localhost:8088/](http://localhost:8088/) in your browser.
