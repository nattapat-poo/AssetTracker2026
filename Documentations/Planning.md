# 📋 Engineering Planning & Architecture — Project 08

## 1. Technical Objectives
Build and deploy a mobile camera QR scanner web application that eliminates manual spreadsheet searches and clipboard paperwork during the annual September science asset procurement survey.

## 2. Dynamic Multi-Sheet Routing Architecture
- **Challenge:** Assets are partitioned across 12 room worksheets (`Lab 204`, `Lab 301`, etc.).
- **Solution:** 
  1. `getRoomSheets()` identifies non-system worksheets dynamically.
  2. `buildAssetIndex()` indexes `AssetID -> { sheetName, rowIndex, assetData }` and caches it in `CacheService` (30-minute TTL).
  3. `lookupAsset(code)` provides instant $O(1)$ resolution to the exact worksheet and row.
  4. `updateAssetStatus()` locks mutations with `LockService.getScriptLock()` for 30 seconds to prevent race conditions when multiple technicians audit concurrently.
  5. `ensureAssetColumns()` auto-creates `Status`, `AuditedBy`, `AuditDate`, `Notes`, and `FoundLocation` columns if absent, ensuring plug-and-play compatibility with any Google Sheet.

## 3. Mobile Camera & Viewfinder Experience
- Embedded HTML5 viewfinder card with rear-camera default (`facingMode: "environment"`).
- Synthetic Web Audio API double-tone chime (A5 880Hz $\rightarrow$ E6 1318Hz) on scan.
- Haptic vibration pulse (`[40, 30, 40] ms`).
- Torch / Flashlight toggle for dimly lit cabinets.
- Gallery file picker fallback for saved photos.
- Manual asset ID keyboard input modal for scratched or peeled stickers.

## 4. 1-Tap Thumb Action Bar & Discrepancy Tracking
- Large thumb buttons ($\ge 56\text{px}$ touch targets):
  - `[✅ GOOD]` (Emerald)
  - `[⚠️ DAMAGED]` (Amber)
  - `[❌ MISSING]` (Rose)
- Location Discrepancy Alert: If an item registered to `Lab 204` is scanned while auditing `Lab 301`, the system displays a visible warning badge and logs `FoundLocation = "Lab 301"`.

## 5. Telemetry & Danielson 2022 Appraisal Alignment
- **Domain 2e (Organizing Physical Space):** Transparent equipment audit tracking with condition remarks.
- **Domain 4b (Maintaining Accurate Records):** Continuous immutable audit logging via the standard `Logs` sheet.
