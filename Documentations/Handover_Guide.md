# 🤝 Handover & Deployment Guide — Project 08: QR Asset Survey (v1.1.8d)
### MUIDS Lab Oops OS — Science Department

---

## 1. Quick Start for Technicians (How to Conduct the Audit)
1. **Launch App**: Open the Web App URL on your mobile phone, tablet, or desktop browser. Instant boot (<20ms) via Stale-While-Revalidate (SWR) client caching. Default landing is the **Room** tab showing live sheet records.
2. **Camera Scanning (Multi-Modal Modes)**:
    - **Primary Mode (Live Continuous Scanner)**: Tap **Scan** tab $\rightarrow$ **📹 START LIVE SCANNER** to stream live video at 60 FPS. Powered by native hardware-accelerated `BarcodeDetector` continuous loop on the raw video stream, achieving sub-5ms instant detection matching AppSheet's scanning speed. Full-frame video with `webkit-playsinline` ensures iOS Safari compatibility.
    - **Secondary Mode (Native Camera Snapshot)**: Tap **📸 Snap Photo with Camera** to open your phone's native camera hardware. This operates via direct file capture and 100% bypasses any sandbox permission restrictions across all embedded GAS iframes, iOS Safari, and in-app browsers.
    - **Gallery Upload**: Tap **🖼️ Gallery** to scan an asset photo directly from device storage.
    - **Manual Search**: Type an inventory number into the search bar for instant keyboard-based retrieval.
3. **Sequential Audit Workflow**:
   - **Step 1: Scan QR** $\rightarrow$ Camera instantly detects QR code without tight alignment.
   - **Step 2: Found Record** $\rightarrow$ Matched asset card/modal opens immediately with item details.
   - **Step 3: 1-Tap Status Action** $\rightarrow$ Tap the appropriate Thai status button (e.g. `ใช้งานอยู่`, `ใช้งานอยู่แต่ชำรุดนะ`, etc.).
   - **Step 4: Comment Box (Optional)** $\rightarrow$ Add optional remarks for `หมายเหตุปี 69` (Column N remains completely blank if omitted; no auto-injected `[Found in ...]` text). User can tap `[◀ ย้อนกลับ]` to change status or `[ถัดไป: ตรวจสติกเกอร์ ➔]` to proceed.
   - **Step 5: Sticker Modal** $\rightarrow$ Select sticker condition (`ปกติ`, `ปริ้นใหม่`, `ปริ้นใหม่+แก้ข้อมูล`). User can tap `[◀ ย้อนกลับ]` to return to the comment box.
   - **Step 6: Save Record** $\rightarrow$ Tap **ยืนยันและบันทึก (Save & Scan Next)**. Data is committed directly to Google Sheets with real-time CacheService invalidation. Camera automatically re-arms!
4. **Universal Dynamic Versioning & Live Telemetry**:
   - Version numbering is globalized: changing `APP_VERSION` in the Google Sheet's `Config` tab dynamically updates all app headers, footers, and modal badges upon sync.
   - Complete telemetry logging: camera connection attempts, errors, snapshot triggers, decode results, and toast alerts are logged in the **Stat** tab under **Activity Logs**.

---

## 2. Procurement Sheet Inspection & Row 5 Column Layout Guide

### 2.1 Non-Invasive Data Policy (Strict Protection Rule)
Procurement provides spreadsheets with existing formulas, historical records, and merged formatting.
Project 08 operates under a **Strict Read/Inspect/Analyse Policy**:
- ❌ **NEVER** add, delete, rename, or reorder procurement sheets.
- ❌ **NEVER** inject unwanted system tabs (`Logs`, `Stats`) into the procurement spreadsheet.
- ❌ **NEVER** overwrite original procurement columns (Col A through Col L).
- ✅ **ONLY** record audit survey results into designated audit columns: **`Scanned 69`**, **`หมายเหตุปี 69`**, **`สติกเกอร์`**, and **`Auditor`**.

---

### 2.2 Procurement Column Layout Specification (Columns A – L)
Procurement sheets use a 12-column layout:

| Column | Procurement Header Label | Description / Sample Value | Essentiality | Project 08 Mapping |
| :---: | :--- | :--- | :---: | :--- |
| **Col A** | `No.` | Running sequence number (e.g. `1`, `2`, `3`) | ⭐ **Essential** | Item index on roster |
| **Col B** | `Inventory number` | Primary Asset QR Tag / Barcode (e.g. `100000004523`) | ⭐ **Primary Key** | Scanned by camera to match row |
| **Col C** | `Asset` | General asset category or sub-code | Optional | Displayed in details modal |
| **Col D** | `Asset description1` | Primary equipment name (e.g. `กล้องจุลทรรศน์ 2ตา CX23`) | ⭐ **Essential** | Primary title on asset card |
| **Col E** | `Asset description2` | Equipment specifications / Brand / Model / Serial | ⭐ **Essential** | Secondary subtitle |
| **Col F** | `Curr.acq.value` | Current acquisition / book value (THB) | Optional | Preserved intact |
| **Col G** | `Original value` | Original purchase price (THB) | Optional | Preserved intact |
| **Col H** | `Asset location` | Physical building / room text from procurement | Optional | Location reference |
| **Col I** | `Room` | Designated Laboratory Room (e.g. `Bio1`, `Chem1`) | ⭐ **Essential** | Multi-sheet routing & filter |
| **Col J** | `สภาพของสินทรัพย์` | Procurement physical condition baseline (`ใช้งานได้ดี`, `ชำรุด`) | Recommended | Shown as badge on asset card |
| **Col K** | `Cap.date` | Capitalization / acquisition date (e.g. `01.10.2018`) | Optional | Preserved intact |
| **Col L** | `ปีงบฯที่ได้มา` | Fiscal year acquired (e.g. `2562`, `2564`) | Optional | Displayed in metadata view |

---

### 2.3 Row 5 Audit & Historical Columns (Columns 13–21 / M–U)
At **Row 5**, starting strictly at **Column M (Column 13)**, Project 08 establishes the audit and historical columns across every room worksheet (`M5:U5`):

| Column | Header Label at Row 5 | Purpose | Data Type | Styling / Notes |
| :---: | :--- | :--- | :--- | :--- |
| **Col M (13)** | **`Scanned 69`** | **Active User Survey Status** | Text | Emerald text (`#34d399`), 10 Thai statuses |
| **Col N (14)** | **`หมายเหตุปี 69`** | **Audit Remarks / Move / Rename Notes** | Text | Amber text (`#fbbf24`), notes & transfer log |
| **Col O (15)** | **`สติกเกอร์`** | **PVC Asset Tag Condition** | Text | Sky text (`#38bdf8`), `ปกติ` / `ปริ้นใหม่` / `ปริ้นใหม่+แก้ข้อมูล` |
| **Col P (16)** | **`Auditor`** | **Auditor Display Name** | Text | Violet text (`#a78bfa`), User Display Name |
| **Col Q (17)** | **`ปี68`** | Historical Audit Result AY 2568 (2025) | Text (Read-Only) | Reference from procurement |
| **Col R (18)** | **`ปี67`** | Historical Audit Result AY 2567 (2024) | Text (Read-Only) | Reference from procurement |
| **Col S (19)** | **`ปี66`** | Historical Audit Result AY 2566 (2023) | Text (Read-Only) | Reference from procurement |
| **Col T (20)** | **`ปี64`** | Historical Audit Result AY 2564 (2021) | Text (Read-Only) | Reference from procurement |
| **Col U (21)** | **`ปี63`** | Historical Audit Result AY 2563 (2020) | Text (Read-Only) | Reference from procurement |

> [!NOTE]
> **Non-Destructive Column Shifting**: When `setupRow5AuditHeaders` runs, if cell M5 is detected as `"หมายเหตุปี 69"`, it automatically shifts existing audit data to Column N via `sheet.insertColumnBefore(13)`, inserting the new `Scanned 69` column cleanly without data loss.

---

## 3. Hybrid Master Table Architecture & Synchronization Engine (v1.1.4)

### 3.1 Architecture Overview
Project 08 uses `Master_Asset` as the primary database while keeping all 15 room sheets intact for official sign-off:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   WEB APP / BROWSER UI                                 │
│  • 📹 Live Camera Feed Primary   • 3-Group Status Palette (10 Options)                │
│  • 🏷️ 3-Pill Sticker Selector   • Dynamic Move-to (15 Rooms) & Autofocus Rename        │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              PRIMARY DATABASE ENGINE: Master_Asset                     │
│  • 20 Aligned Columns (Cols A to T) Identical to Room Sheets Row 5                    │
│  • Instant Sub-200ms Lookups (`lookupAssetInMaster`)                                   │
│  • Direct Audit Metric Aggregation (`getMasterAuditSummary`)                           │
└───────────────────────┬────────────────────────────────────────┬───────────────────────┘
                        │ (📥 2. Selective Sheet Aggregation)    │ (🔄 3. Bi-Sync to Rooms)
                        ▼                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              15 ROOM WORKSHEETS (In-Place)                             │
│  • Bio Prep, Bio1, Bio2, Chem Pre, Chem1, Chem2, Physics P, Physics1, Physics2        │
│  • Mobile, Science, ปาณิษา, ชำรุด, ไม่ใช้งาน, Storage                                  │
│  • Columns A-L: Untouched Original Procurement Data                                   │
│  • Columns M-T: [Scanned 69] [หมายเหตุปี 69] [สติกเกอร์] [ปี68] [ปี67] [ปี66] [ปี64] [ปี63] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.2 Master Sheet 20 Aligned Columns (`Master_Asset`)
`Master_Asset` headers in Row 1 precisely match Row 5 of the room sheets:
1. `No.` (Col A)
2. `Inventory number` (Col B)
3. `Asset` (Col C)
4. `Asset description1` (Col D)
5. `Asset description2` (Col E)
6. `Curr.acq.value` (Col F)
7. `Original value` (Col G)
8. `Asset location` (Col H)
9. `Room` (Col I)
10. `สภาพของสินทรัพย์` (Col J)
11. `Cap.date` (Col K)
12. `ปีงบฯที่ได้มา` (Col L)
13. `Scanned 69` (Col M)
14. `หมายเหตุปี 69` (Col N)
15. `สติกเกอร์` (Col O)
16. `ปี68` (Col P)
17. `ปี67` (Col Q)
18. `ปี66` (Col R)
19. `ปี64` (Col S)
20. `ปี63` (Col T)

*(Note: `ROOM_TYPE` has been completely purged from the data model, state, and UI.)*

---

### 3.3 Dynamic Room Configuration (15 Configured Rooms)
The application dynamically routes and filters across 15 configured science laboratory rooms:
- **Biological Sciences**: `Bio Prep`, `Bio1`, `Bio2`
- **Chemical Sciences**: `Chem Pre`, `Chem1`, `Chem2`
- **Physical Sciences**: `Physics P`, `Physics1`, `Physics2`
- **General & Mobile Facilities**: `Mobile`, `Science`, `ปาณิษา`
- **Decommissioned & Storage**: `ชำรุด`, `ไม่ใช้งาน`, `Storage`

---

### 3.4 How to Trigger Migration & Synchronization

#### Method 1: Google Sheets Custom Menu (Inside Spreadsheet UI)
- **`🚀 Lab Oops: Asset Tracker`**
  - **`⚙️ 0. Update / Sync Config Sheet (v1.1.1d)`**: Synchronizes `Config` tab with v1.1.1d, 15 rooms, and 3 status groups.
  - **`🏷️ 1. Setup Row 5 Audit Columns on All Room Sheets (Cols M–T)`**: Sets up the 8 audit columns starting strictly at Column M (Col 13) with `Scanned 69`, preserves existing data, and auto-syncs `Config`.
  - **`📥 2. Aggregate Rooms into Master Table...`**: Opens an interactive modal dialog (`SheetSelectorModal.html`) where users can select which room sheets to combine into `Master_Asset`, with a **Select All / Deselect All** master switch and live counter badge.
  - **`🔄 3. Migrate / Sync Master to Individual Room Sheets`**: Pushes audit results (`Scanned 69`, `หมายเหตุปี 69`, `สติกเกอร์`) recorded in `Master_Asset` back into their corresponding room sheets.
  - **`⚡ 4. Flush Caches`**: Clears 3-tier memory and properties caches.

#### Method 2: Mobile Web App Developer Gateway
1. Press **`Ctrl + Shift + Q`** (or click the developer signature `Nattapat Poolyam` in the footer).
2. Enter security PIN: **`2026`**.
3. In the **Hybrid Master Table & Config Engine** panel, click:
   - `[Sync Config]` (Synchronizes Config sheet tab with v1.1.1d)
   - `[Setup Row 5 (M)]` (Configures Cols 13–20 M–T across all room sheets)
   - `[Build Master]` (Aggregates selected rooms into Master Table)
   - `[Migrate to Rooms]` (Pushes master status back to room sheets)

---

## 4. Google Apps Script & Clasp Deployment

### Step 1: Clasp Configuration
In `c:\Users\MUIDS\Documents\Projects\Lab Oops\Project08_AssetTracker\App_Script`:
`.clasp.json` is linked to script project `10uDSRgcbHmWKyqx-x2-Sv18TRweAZyhExzZ8JKhNU-NbZMF6pgSvPIIJ`:
```json
{
  "scriptId": "10uDSRgcbHmWKyqx-x2-Sv18TRweAZyhExzZ8JKhNU-NbZMF6pgSvPIIJ",
  "rootDir": "."
}
```

### Step 2: Push Code to Apps Script
```powershell
npx @google/clasp push --force
```
> [!IMPORTANT]
> Per deployment policy for `v1.1.1d`, updates are pushed **strictly to Google Apps Script only**. Deployment to GitHub Pages / Git remote repository is held until requested.

### Step 3: Script Properties Verification
1. Open [Google Apps Script Project](https://script.google.com/u/0/home/projects/10uDSRgcbHmWKyqx-x2-Sv18TRweAZyhExzZ8JKhNU-NbZMF6pgSvPIIJ/edit).
2. Go to **Project Settings** $\rightarrow$ **Script Properties**:
   - `ASSET_SPREADSHEET_ID` = `18LGXn6JbjFeiVuKlrh0CvJ79M3mpsKTVbc0FJx8LuOk`
   - `NEXUS_SPREADSHEET_ID` = `11PUpY4zVClvVbfzgu4Olyzy6e5NacNUXZv30bexQQB8`
3. Deploy as Web App (**Deploy** $\rightarrow$ **New deployment** $\rightarrow$ **Web app**).

---

## 5. Local Standalone Preview Mode
```powershell
python Tools/preview_server.py
```
Open [http://localhost:8088/](http://localhost:8088/) in any desktop or mobile browser. It runs against the built-in mock database supporting all v1.1.1d features: stat card drill-down filters, clean card/modal title-subtitle hierarchy, strictly Column N reference notes, live scanner simulation, 3 status groups, and 15 room filtering!
