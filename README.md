# 🔍 Project 08: QR-Based Mobile Asset Survey App (v1.1.4)
### MUIDS Lab Oops OS — Science Department

> **Zero-install multi-modal camera QR scanner with a Hybrid Master Table Architecture & dynamic multi-sheet migration to inspect, query, and update science laboratory procurement assets in real-time.**

---

## 🎯 Executive Overview
* **Lead Architect:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Organization:** MUIDS — Science Department
* **Ecosystem:** [Lab Oops OS](file:///c:/Users/MUIDS/Documents/Projects/Lab%20Oops/Master_Architecture_Nexus_DB.md)
* **Version:** `v1.1.4`
* **Target Spreadsheet ID:** `18LGXn6JbjFeiVuKlrh0CvJ79M3mpsKTVbc0FJx8LuOk`
* **Target Audience:** Science Laboratory Technicians (`LabTech`) & Teaching Assistants (`TA`)
* **Target Window:** Annual September Procurement Inventory Survey (AY 2569 / 2026)
* **GitHub Repository:** [https://github.com/nattapat-poo/AssetTracker2026](https://github.com/nattapat-poo/AssetTracker2026)
* **GitHub Pages Live App:** [https://nattapat-poo.github.io/AssetTracker2026/](https://nattapat-poo.github.io/AssetTracker2026/)

---

## ⚡ Core Features (v1.1.4)
1. **Moderate Responsive Typography & Snug Mobile Fit**: Harmonized root font size (16.5px mobile / 17px desktop) and calibrated typography scale (`h1` 1.30rem, `h2` 1.15rem, `h3` 1.02rem, `.text-sm` 0.92rem, `.text-xs` 0.82rem) ensuring clear readability without visual bloat or mobile container overflow.
2. **Auditor Column (`Col 16 / Col P`) on Individual Room Sheets**: Menu 1 (`setupRow5AuditHeaders`) provisions the `Auditor` column right after Col O (`สติกเกอร์`) at Column P, recording the display name of the auditor on every 1-tap scan action without aggregating Auditor into `Master_Asset`.
3. **Layer 1, 2 & 3 Data Consistency Protection**: Layer 2 `onEdit(e)` trigger automatically syncs manual cell edits made in room sheets into `Master_Asset` in real-time, backed by Layer 1 Ground Truth and Layer 3 Contradiction detection.
4. **`Stats` Sheet Auto-Provisioning & Live Usage Analytics UI**: Automatic `Stats` tab logging and interactive Web App Usage Stats Modal (`statsModal`) with real-time progress metrics, auditor leaderboards, and room completion breakdown.
5. **Interactive Expand-on-Tap/Hover Toast Notifications**: Toasts display for at least 3.5 seconds; hovering or tapping dynamically expands truncated notifications into readable cards and pauses dismissal.
6. **6-Column Master Sheet Dynamic Indexing & Auto-Sync**: Fully compatible with the updated Master Sheet structure (`Col A: Inventory number`, `Col B: Asset description1`, `Col C: Room`, `Col D: Scanned 69`, `Col E: หมายเหตุปี 69`, `Col F: สติกเกอร์`) with immediate `SpreadsheetApp.flush()` execution on modal save.
7. **Status Chip Category Tone Matching (Only Green / Red / Gray)**: Selected status chip in the Sticker Check sublayer dynamically mirrors the exact tone of its parent action category (🟢 Green for In-Use/Move/Rename, 🔴 Red for No Longer Needed/Damaged, ⚫ Gray for Missing/Verify) across dark and light themes.
2. **Enhanced Typography & Font Scaling**: Scaled base body font size to `17.5px` (`1.58` line-height) and enhanced typography across headings, badges, cards, buttons, and inputs for maximum readability on field mobile devices.
3. **Dark Mode Legacy Cleanup in Light Mode**: Pure light surfaces and crisp WCAG AAA contrast across Audit Stats cards, camera standby placeholder, toast notifications, skeleton loaders, and modals.
4. **Universal Sticker Check Trigger**: Triggering ANY 1-tap action button across all 3 status groups immediately presents the Sticker Check modal (`openStickerInspectionSublayer`) with zero dependency on the chosen status.
5. **Front Copy Buttons**: One-click clipboard copy icons positioned directly at the front of both Asset Name and Inventory Number rows in active cards and pop-up dialogs.
5. **6-Column Master Table Aggregation (Cols B, D, I, M, N, O)**: Menu 2 (`📥 2. Aggregate Rooms into Master Table...`) extracts only essential columns from room sheets starting at row 6:
   `[ Inventory number, Asset description1, Room, Scanned 69, หมายเหตุปี 69, สติกเกอร์ ]`.
6. **Bi-Directional Sticker Migration (Menu 3)**: Menu 3 (`📤 3. Sync Master to Individual Room Sheets...`) synchronizes Column F (`สติกเกอร์`) from `Master_Asset` back into Column O (Col 15) of room sheets for matched assets and newly appended rows.
5. **Enhanced Mobile Body Typography**: Scaled up font sizes for field mobile legibility while maintaining compact navigation headers.
6. **5-Card Audit Overview & Unaudited / Pending Filter**: Upgraded overview dashboard with 5 interactive stat cards (`Total`, `ยังไม่สำรวจ / Pending`, `ใช้งานอยู่ / Good`, `ชำรุด / Damaged`, `สูญหาย / Missing`). Clicking the Pending card immediately filters the roster for unscanned/unverified items (`statusFilter = 'UNVERIFIED'`).
2. **Force Sync & Sheet Cache Flush (`🔄 Sync`)**: Real-time sync button in top header and roster filter bar to purge caches and immediately reflect external spreadsheet modifications.
3. **One-Click Clipboard Copy Buttons**: Instant copy icons next to Asset Description 1 (Asset Name), Inventory Number, and Scanned QR Code in modal dialogs and active asset cards.
4. **Universal Backdrop Modal Dismissal**: Tapping outside any modal dialog safely dismisses it and auto-resumes the camera stream.
5. **Blank Fallback Audit Status**: Unverified assets where Column M (`Scanned 69`) is blank render with no status badge (`""`) instead of falling back to default Good or Unverified badges.
5. **Continuous 1-Tap Mobile Scanning UX**: Performing any 1-Tap status action immediately closes the matched asset modal, hides the inline card, switches to the `scanner` tab, and automatically re-engages the camera stream so technicians can scan the next physical asset without manual dialog dismissals.
4. **Interactive Audit Stat Cards (Drill-Down Filter)**: Clicking any of the 4 metric cards (`Total Registered`, `Verified Good`, `Damaged / Issue`, `Missing Assets`) on the Audit Stats overview automatically switches to the `Room Roster` tab and applies the corresponding status filter (`ALL`, `Good`, `Damaged`, `Missing`) with active chip highlighting.
5. **Spreadsheet Menu 2 Modal Sheet Selector (`SheetSelectorModal.html`)**: Interactive modal dialog for Menu 2 (`📥 2. Aggregate Rooms into Master Table...`) allowing technicians to select which room sheets to combine into `Master_Asset`, complete with **Select All / Deselect All** master checkbox and dynamic counter badge.
6. **Master Table 20-Column Exact Alignment (Cols A–T)**: `Master_Asset` headers in Row 1 precisely match Row 5 of the room sheets:
   `[ No., Inventory number, Asset, Asset description1, Asset description2, Curr.acq.value, Original value, Asset location, Room, สภาพของสินทรัพย์, Cap.date, ปีงบฯที่ได้มา, Scanned 69, หมายเหตุปี 69, สติกเกอร์, ปี68, ปี67, ปี66, ปี64, ปี63 ]`.
7. **Direct In-Place Column I (`Room`) Mutations**: Relocating assets directly mutates Column I (`Room`) across both `Master_Asset` and underlying room worksheets without needing redundant config keys.
8. **Purged `ROOM_TYPE`**: Cleaned all references to `ROOM_TYPE` from backend models, database service, AppState, AuditController, and UI chip bar.
9. **Live Camera Scanner Priority**: Continuous video streaming feed is primary (`📹 START LIVE SCANNER`), with native camera snap photo (`📸 Snap Photo`) as secondary.
10. **`Scanned 69` Audit Column (Col 13 / M)**: Added directly to the left of Column N (14) `"หมายเหตุปี 69"` across all room sheets, providing dedicated recording for user status inputs.
11. **`Master_Asset` Primary Database Engine**: All asset lookups query `Master_Asset` first for sub-second retrieval across all rooms, and mutations trigger automatic bi-directional synchronization with room sheets.
12. **3 Color-Coded Status Groups (10 Options)**:
    - **Group 1: ใช้งานอยู่ (Green shades)**: `ใช้งานอยู่`, `ใช้งานอยู่แต่ชำรุดนะ`, `ใช้งานอยู่+ย้ายไป...`, `ใช้งานอยู่+แก้ไขชื่อเป็น...`
    - **Group 2: หมดความจำเป็น (Red shades)**: `หมดความจำเป็นต้องใช้งาน`, `หมดความจำเป็นต้องใช้งานเพราะชำรุด`
    - **Group 3: สูญหาย / ตรวจสอบ (Grey shades)**: `สูญหาย`, `หาไม่เจอ`, `หาไม่เจอ+ให้พัสดุมาตรวจสอบหน้างาน`, `งง+ให้พัสดุมาตรวจสอบหน้างาน`
13. **Sticker Verification 3-Pill Toggle**: Instant toggle between `ปกติ`, `ปริ้นใหม่`, and `ปริ้นใหม่+แก้ข้อมูล` available on both the inline card and pop-up modal.
14. **15 Dynamic Rooms Configuration (`ROOM_SHEETS_CONFIG`)**: Fully configured for: `Bio Prep`, `Bio1`, `Bio2`, `Chem Pre`, `Chem1`, `Chem2`, `Physics P`, `Physics1`, `Physics2`, `Mobile`, `Science`, `ปาณิษา`, `ชำรุด`, `ไม่ใช้งาน`, `Storage`.
15. **Dynamic Sub-layers with Immediate Autofocus**:
    - Tapping `ใช้งานอยู่+ย้ายไป...` presents a 15-room destination selector.
    - Tapping `ใช้งานอยู่+แก้ไขชื่อเป็น...` displays an inline rename text input that immediately triggers `focus()` and `select()`.
16. **Matched Asset Details Modal (`#asset-details-modal`)**: Automatically surfaces immediately upon scanning any asset QR code with complete metadata and status actions.
17. **Dual-Runtime Architecture & Remote HTTPS Bridge**: Supports both direct Google Apps Script web app execution and external hosting with RESTful RPC bridges.
18. **Hardcoded Column M on Row 5**: Audit columns strictly start at **Column M (Column 13)** across all room sheets with self-healing column preservation.
19. **Config Sheet Synchronization (`syncConfigSheet`)**: Auto-generates and synchronizes the `Config` tab with Bangkok timestamps while strictly preserving existing user settings.
20. **Remaining Items Tracker**: Real-time room progress bar, live unverified badge, and status filters.

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
│   ├── index.html                # Main Responsive Shell with Tailwind CSS
│   ├── styles.html               # Custom CSS, Glassmorphism, Theme Tokens, Touch Targets
│   ├── AppState.html             # Client-side State Manager & Event Bus
│   ├── ApiClient.html            # RPC Bridge (google.script.run + Mock Fallback)
│   ├── ScannerController.html    # HTML5-QRCode Camera Scanner Engine
│   ├── AuditController.html      # 1-Tap Thumb Action Bar & Remaining Items Tracker
│   ├── SheetSelectorModal.html   # Apps Script Menu 2 Sheet Selector Modal
│   ├── ModalController.html      # Modals, Migration Triggers, Stealth Dev Gateway
│   └── ThemeController.html      # WCAG AAA Light/Dark Theme Switcher
├── Documentations/               # Architecture Specs, Planning & Dev Logs
│   ├── Project_Profile.md
│   ├── Planning.md
│   ├── DevLog.md
│   ├── CHANGELOG.md
│   ├── Architectural_Safety_Guide.md
│   ├── GAS_Continuous_Scanning_Limitations.md # In-depth technical analysis on GAS camera constraints
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
