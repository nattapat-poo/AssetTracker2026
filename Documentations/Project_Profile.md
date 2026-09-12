# 🧠 Lab Oops OS: Project Profile — Project 08

## 📋 Metadata
* **Project Title:** 🔍 QR-Based Mobile Asset Survey App (Hybrid Master Table & Multi-Sheet Router)
* **Version:** `v1.1.3n (Full Codebase Cleanup & System Audit Benchmark)`
* **Lead Architect & Developer:** Nattapat Poolyam (Mek) (`nattapat.poo@mahidol.ac.th`)
* **Organization:** MUIDS — Science Department
* **Ecosystem:** Lab Oops OS (*Science Laboratory Operations & Oppositely-Organized Problems Solved Operating System*)
* **Timezone:** `Asia/Bangkok` (UTC+07:00)
* **Active Academic Year:** `2026` (Thai Fiscal Year `2569`)
* **Status:** 🟢 Benchmark Active (v1.1.3n Deployed & Verified with 31 Test Suites)
* **Priority:** 🔥 High (Time-sensitive annual procurement audit)
* **Target Window:** September (Annual Institutional Procurement Audit)
* **Platform:** Mobile Web Application (iOS Safari & Android Chrome Browser Native)
* **Core Tech Stack:** **Antigravity + Google Apps Script Web App (V8) + HTML5-QRCode JS + Tailwind CSS + Google Sheets API**
* **Target Asset Spreadsheet:** `18LGXn6JbjFeiVuKlrh0CvJ79M3mpsKTVbc0FJx8LuOk` (Non-Invasive Inspection & Row 5 Setup)
* **Master Database Connection:** Maps rooms against `Room` in `Project 00: Kernel` (`11PUpY4zVClvVbfzgu4Olyzy6e5NacNUXZv30bexQQB8`)
* **Portfolio Value:** ⭐ High Showcase (Mobile camera hardware integration solving physical audit bottlenecks)
* **Danielson 2022 Alignment:**
  - **Domain 2e:** Organizing Physical Space (Institutional inventory stewardship and tracking equipment condition)
  - **Domain 4b:** Maintaining Accurate Records (Real-time immutable audit trail and multi-sheet row sync)

---

## 🚨 The Problem & Evolution
Every September, school procurement conducts a mandatory physical inventory audit of thousands of registered assets across 12 science laboratories (microscopes, digital balances, hot plates, spectrophotometers, centrifuges, autoclaves, vortex mixers).

Historically, this audit was hindered by operational bottlenecks:
1. **Third-Party Platform & AppSheet Bottlenecks:** Commercial asset apps and AppSheet required rigid single-table schemas. Maintaining 12-15 room tabs in AppSheet required 15 separate table definitions or a massive consolidated table that broke procurement's sign-off sheet format.
2. **Multi-Sheet Tab Fragmentation:** Each laboratory (Lab 204, 301, 308, Prep Rooms) maintains an independent worksheet tab with merged header banners (rows 1–6). Shuffling tabs made cross-room queries and whole-department progress tracking slow.
3. **Manual Clipboard Chaos:** Technicians frequently walked room-to-room with paper clipboards, spending additional days manually transcribing handwritten checkmarks into Google Sheets.

---

## 💡 Modernized Solution: Hybrid Master Table Architecture (v1.1.0a)
A hybrid architecture combining a high-performance **Master Table (`Master_Asset`)** for instant querying and dynamic filtering, with **in-place bidirectional migration** to individual room worksheets:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MOBILE BROWSER CLIENT (HTML5-QRCode)                 │
│  • Instant Rear-Camera QR Stream  • Big Thumb Status Buttons           │
│  • Dynamic Room Type Filter Chips • Remaining Unverified Tracker       │
│  • Location Discrepancy Alert     • Manual Fallback Search             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (google.script.run / HTTPS RPC)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             HYBRID MASTER TABLE ENGINE (Google Apps Script API)        │
│  • Master Sheet: [Master_Asset] (Essential Columns + Dynamic RoomType) │
│  • Bidirectional Migration Engine (Aggregate Rooms ↔ Migrate Sheets)   │
│  • Dual Triggers: Google Sheets UI Menu (onOpen) & Web App Buttons     │
│  • Row 5 Audit Column Injector (Col M-S after ปีงบฯที่ได้มา)           │
│  • Configurable Room Sheet Resolver (getRoomSheetByName)               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              PROCUREMENT ASSET SPREADSHEET (Preserved Layout)          │
│  • [Lab 204]  • [Lab 301]  • [Chem 1]  • [Bio 1] ... (Room Tabs)      │
│  • Col A-L: Original Procurement Data (Read-Only)                      │
│  • Row 5 Headers: หมายเหตุปี 69, สติกเกอร์, ปี68, ปี67, ปี66, ปี64, ปี63 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Core Features & Specifications (v1.1.0a)

1. **Master Table (`Master_Asset`)**: Single consolidated table storing only essential columns (`No.`, `Inventory number`, `Asset description1`, `Asset description2`, `Room`, `RoomType`, `สภาพของสินทรัพย์`, `ปีงบฯที่ได้มา`, `หมายเหตุปี 69`, `สติกเกอร์`, `ปี68`, `ปี67`, `ปี66`, `ปี64`, `ปี63`, `SourceSheet`, `LastUpdated`), enabling instant querying and filtering.
2. **Row 5 Audit Column Setup**: Automatically configures the 7 standard audit and historical columns at Row 5 starting immediately after `"ปีงบฯที่ได้มา"` across every room sheet.
3. **Dynamic Room Type Inspection**: Inspects all room sheets and categorizes them by dynamic room types (`Lab`, `ChemicalLab`, `BioSafetyLab`, `Classroom`, `PrepRoom`) via Project 00 Kernel.
4. **Configurable Room Sheet Resolver (`getRoomSheetByName`)**: Supports exact names, configured mappings (`ROOM_SHEETS_CONFIG`), and normalized aliases.
5. **Bidirectional Migration Engine**:
   - Aggregates room worksheets into `Master_Asset`.
   - Migrates audit results (`หมายเหตุปี 69`, `สติกเกอร์`, historical years) back to room sheets in-place.
6. **Dual Triggers**:
   - Google Sheets Custom UI Menu: `🚀 Lab Oops: Asset Tracker` (`Setup Row 5`, `Aggregate to Master`, `Migrate to Rooms`, `Flush Caches`).
   - Web App UI Buttons inside the Developer Gateway (`Ctrl + Shift + Q` / PIN `2026`).
7. **Zero-Install Camera Scanner**: Mobile camera QR scanner powered by HTML5 `html5-qrcode` with audio chime and haptic feedback.
8. **1-Tap Status Confirmation**: Large touch-friendly thumb buttons ($\ge 56\text{px}$) for **Good** ✅, **Damaged** ⚠️, and **Missing** ❌.
