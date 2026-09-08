# 🤝 Handover & Deployment Guide — Project 08: QR Asset Survey (v1.1.0e)
### MUIDS Lab Oops OS — Science Department

---

## 1. Quick Start for Technicians (How to Conduct the Audit)
1. **Launch App**: Open the Web App URL on your mobile phone or tablet browser (Safari on iOS, Chrome on Android, or desktop browser).
2. **Camera Scanning**:
   - **On Mobile Phones (GAS Web App Mode)**: Tap the prominent **📸 SNAP WITH CAMERA** button. This opens your phone's native camera with full hardware auto-exposure and flash. It **100% bypasses Google Apps Script's sandboxed iframe permission restriction** with zero permission prompts or errors!
   - **On Mobile Phones (External Host / GitHub Pages Mode)**: If hosted outside Google's iframe, the app streams **continuous 60 FPS live video** through `getUserMedia()`! Simply point the phone at any QR code—it beeps and detects the code automatically with zero shutter tapping.
   - **On Laptops / Desktops**: Tap **📹 Live Video Stream** to activate your webcam via intelligent hardware detection, or tap **📸 Snap** to take a picture.
   - **From Gallery**: Tap the **🖼️ Gallery** icon to scan a previously saved QR photo.
3. **Automatic Matched Asset Modal**:
   - As soon as the QR code is scanned, the **Matched Asset Details Modal** pops up in focus!
   - Displays: Inventory Number, Item Description, Brand/Model, Room, Procurement Condition (`สภาพของสินทรัพย์`), Historical Result (`ผลปี 68`), and Sticker status.
4. **1-Tap Physical Status Confirmation**: Tap one of the three large thumb buttons right inside the modal:
   - **GOOD** ✅: Asset is operational, intact, and present.
   - **DAMAGED** ⚠️: Malfunctioning, broken part, cracked glass, or chipped housing. Tap quick remark chips or type notes.
   - **MISSING** ❌: QR sticker cannot be matched to physical item or item is absent.
5. **Sticker Status**: Tap **🏷️ Sticker: YES/NO** to toggle sticker status directly inside the modal.
6. **Instant In-Place Write**: The system records the audit directly into the room's sheet under `หมายเหตุปี 69` and `สติกเกอร์` in <1 second, automatically closes the modal, and re-arms the scanner for the next item!
7. **Track Progress**: Switch to the **ROOM ROSTER** tab and tap **Unverified Only** or filter by **Room Type** (`Lab`, `ChemicalLab`, `Classroom`, `PrepRoom`) to view remaining items needing verification!

---

## 2. Procurement Sheet Inspection & Row 5 Column Layout Guide

### 2.1 Non-Invasive Data Policy (Strict Protection Rule)
Procurement provides spreadsheets with existing formulas, historical records, and merged formatting.
Project 08 operates under a **Strict Read/Inspect/Analyse Policy**:
- ❌ **NEVER** add, delete, rename, or reorder procurement sheets.
- ❌ **NEVER** inject unwanted system tabs (`Logs`, `Stats`) into the procurement spreadsheet.
- ❌ **NEVER** overwrite original procurement columns (Col A through Col L).
- ✅ **ONLY** record audit survey results into designated audit columns: **`หมายเหตุปี 69`** and **`สติกเกอร์`**.

---

### 2.2 Procurement Column Layout Specification (Columns A – L)
Procurement sheets use a 12-column layout:

| Column | Procurement Header Label | Description / Sample Value | Essentiality | Project 08 Mapping |
| :---: | :--- | :--- | :---: | :--- |
| **Col A** | `No.` | Running sequence number (e.g. `1`, `2`, `3`) | ⭐ **Essential** | Displays item index on asset roster |
| **Col B** | `Inventory number` | Primary Asset QR Tag / Barcode (e.g. `100000004523`) | ⭐ **Primary Key** | Scanned by camera to match row |
| **Col C** | `Asset` | General asset category or sub-code | Optional | Displayed in details modal |
| **Col D** | `Asset description1` | Primary equipment name (e.g. `กล้องจุลทรรศน์ 2 ตา CX23`) | ⭐ **Essential** | Primary display title on mobile card |
| **Col E** | `Asset description2` | Equipment specifications / Brand / Model / Serial | ⭐ **Essential** | Secondary display subtitle |
| **Col F** | `Curr.acq.value` | Current acquisition / book value (THB) | Optional | Preserved intact |
| **Col G** | `Original value` | Original purchase price (THB) | Optional | Preserved intact |
| **Col H** | `Asset location` | Physical building / room text from procurement | Optional | Location verification reference |
| **Col I** | `Room` | Designated Laboratory Room (e.g. `204`, `308`, `Chem1`) | ⭐ **Essential** | Multi-sheet routing & discrepancy check |
| **Col J** | `สภาพของสินทรัพย์` | Procurement physical condition baseline (`ใช้งานได้ดี`, `ชำรุด`) | Recommended | Shown as badge on asset card |
| **Col K** | `Cap.date` | Capitalization / acquisition date (e.g. `01.10.2018`) | Optional | Preserved intact |
| **Col L** | `ปีงบฯที่ได้มา` | Fiscal year acquired (e.g. `2562`, `2564`) | Optional | Displayed in metadata view |

---

### 2.3 Row 5 Audit & Historical Columns (Hardcoded Strictly to Column M)
At **Row 5**, starting strictly at **Column M (Column 13)**, Project 08 establishes the 7 standard audit and historical columns across every room worksheet (`M5:S5`):

| Column | Header Label at Row 5 | Purpose | Data Type | Styling / Notes |
| :---: | :--- | :--- | :--- | :--- |
| **Col M (13)** | **`หมายเหตุปี 69`** | **Active Audit Result (AY 2569 / 2026)** | Text | Emerald text (`#34d399`), written by Project 08 |
| **Col N (14)** | **`สติกเกอร์`** | **PVC Asset Tag Status** | Text | Sky text (`#38bdf8`), `Yes` / `No` / `Needs Reprint` |
| **Col O (15)** | **`ปี68`** | Historical Audit Result AY 2568 (2025) | Text (Read-Only) | Displayed on verification card |
| **Col P (16)** | **`ปี67`** | Historical Audit Result AY 2567 (2024) | Text (Read-Only) | Historical reference |
| **Col Q (17)** | **`ปี66`** | Historical Audit Result AY 2566 (2023) | Text (Read-Only) | Historical reference |
| **Col R (18)** | **`ปี64`** | Historical Audit Result AY 2564 (2021) | Text (Read-Only) | Historical reference |
| **Col S (19)** | **`ปี63`** | Historical Audit Result AY 2563 (2020) | Text (Read-Only) | Historical reference |

> [!NOTE]
> **Self-Healing Column A–L Repair**: When `setupRow5AuditHeaders` runs, it also inspects Columns 1–12 (A–L) on Row 5. Any cells accidentally overwritten with audit column names from earlier runs are automatically restored to the proper procurement headers with standard formatting.

---

## 3. Hybrid Master Table Architecture & Migration Engine (v1.1.0a)

### 3.1 Architecture Overview
To solve the dual-maintenance dilemma of Google AppSheet (where having 15 separate room tabs created massive configuration overhead, but a single master sheet broke procurement's sign-off format), **Project 08 v1.1.0a implements a Hybrid Master Table Architecture**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   WEB APP / BROWSER UI                                 │
│  • Instant QR Camera Scan        • Dynamic Room Type Filter (Lab, Chem, Bio, Class...)  │
│  • 1-Tap Thumb Action Bar        • Fast Query Engine against Master Table              │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              HYBRID MASTER TABLE ENGINE                                │
│  • Master Sheet: [Master_Asset] (Consolidated Essential Columns)                       │
│  • In-Memory / ScriptCache Snapshot for sub-5ms Lookups                                │
│  • Dynamic Room Type Inspector (maps sheets against Project 00 Kernel)                 │
└───────────────────────┬────────────────────────────────────────┬───────────────────────┘
                        │ (📥 1. Aggregate from Rooms)           │ (🔄 2. Migrate to Rooms)
                        ▼                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              ROOM WORKSHEETS (In-Place)                                │
│  • [Lab 204]  • [Lab 301]  • [Chem 1]  • [Bio 1]  • [Prep Rooms] ... (Untouched Layout)│
│  • Original Procurement Cols A-L Intact                                                │
│  • Row 5 Audit Columns: [หมายเหตุปี 69] [สติกเกอร์] [ปี68] [ปี67] [ปี66] [ปี64] [ปี63] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.2 Master Sheet Schema (`Master_Asset`)
The `Master_Asset` sheet consolidates all equipment across all rooms into a high-performance query repository with **only essential columns**:

1. `No.` (Sequence index)
2. `Inventory number` (Asset QR Tag primary key)
3. `Asset description1` (Primary item name)
4. `Asset description2` (Brand / Model / Specifications)
5. `Room` (Laboratory code / name)
6. `RoomType` (Dynamic room category: `Lab`, `ChemicalLab`, `BioSafetyLab`, `Classroom`, `PrepRoom`)
7. `สภาพของสินทรัพย์` (Baseline procurement condition)
8. `ปีงบฯที่ได้มา` (Acquisition fiscal year)
9. `หมายเหตุปี 69` (Active audit survey result)
10. `สติกเกอร์` (PVC barcode tag condition)
11. `ปี68` | 12. `ปี67` | 13. `ปี66` | 14. `ปี64` | 15. `ปี63`
16. `SourceSheet` (Name of underlying room worksheet)
17. `LastUpdated` (Timestamp of last sync)

---

### 3.3 Dynamic Room Type Inspection & Configurable Resolvers
- **Dynamic Room Type Discovery**: Automatically cross-references sheet names against the **Project 00 Kernel Room Directory** (`11PUpY4zVClvVbfzgu4Olyzy6e5NacNUXZv30bexQQB8`), tagging each room with its functional role (`Lab`, `ChemicalLab`, `BioSafetyLab`, `Classroom`, `PrepRoom`).
- **Configurable Room Sheet Resolver (`getRoomSheetByName`)**: Intelligently resolves sheet references using exact matching, configured aliases (`ROOM_SHEETS_CONFIG`), case-insensitive search, and normalized room code aliases (e.g. `"204"` $\leftrightarrow$ `"Lab 204"`).

---

### 3.4 How to Trigger Migration & Synchronization

The migration can be triggered seamlessly via two interfaces:

#### Method 1: Google Sheets Custom Menu (Inside the Spreadsheet UI)
When opening the Google Spreadsheet in your browser, a custom menu appears on the menu bar:
- **`🚀 Lab Oops: Asset Tracker`**
  - **`⚙️ 0. Update / Sync Config Sheet (v1.1.0e)`**: Initializes or updates the `Config` tab with version `v1.1.0e`, refreshing standard keys while strictly preserving existing user settings.
  - **`🏷️ 1. Setup Row 5 Audit Columns on All Room Sheets (Col M)`**: Hardcodes the 7 audit columns starting strictly at Column M (Column 13), repairs Columns A–L on Row 5, and auto-syncs the `Config` sheet.
  - **`📥 2. Aggregate All Rooms into Master Table`**: Reads all room worksheets and populates the `Master_Asset` table.
  - **`🔄 3. Migrate / Sync Master to Individual Room Sheets`**: Pushes audit results (`หมายเหตุปี 69` and `สติกเกอร์`) recorded in `Master_Asset` back into their corresponding room sheets.
  - **`⚡ 4. Flush Caches`**: Clears 3-tier memory and properties caches.

#### Method 2: Mobile Web App Developer Gateway
1. Press **`Ctrl + Shift + Q`** (or click the developer signature `Nattapat Poolyam` in the footer).
2. Enter security PIN: **`2026`**.
3. In the **Hybrid Master Table & Config Engine** panel, click:
   - `[Sync Config]` (Synchronizes Config sheet tab with v1.1.0e)
   - `[Setup Row 5 (M)]` (Hardcodes Row 5 Column M and repairs Columns A–L)
   - `[Build Master]` (Aggregates rooms into Master Table)
   - `[Migrate to Rooms]` (Pushes master audit status back to room sheets)
4. Toast notifications and live JSON logs provide immediate confirmation.

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
Open [http://localhost:8088/](http://localhost:8088/) in any desktop or mobile browser. It runs against the built-in mock database supporting all v1.1.0a master table, migration, and room type filtering simulations!
