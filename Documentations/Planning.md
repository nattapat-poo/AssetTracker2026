# 📋 Engineering Planning & Architecture — Project 08

## 1. Technical Objectives
Build and deploy a mobile camera QR scanner web application that eliminates manual spreadsheet searches and clipboard paperwork during the annual September science asset procurement survey.

## 2. Dynamic Multi-Sheet Routing & 6-Column Master Table Architecture
- **Challenge:** Assets are partitioned across 15 room worksheets (`Bio1`, `Chem1`, `Physics1`, etc.).
- **Hybrid Solution (v1.1.3n):** 
  1. `Master_Asset` operates as the primary high-speed indexed database:
     - **Col A**: `Inventory number`
     - **Col B**: `Asset description1`
     - **Col C**: `Room`
     - **Col D**: `Scanned 69`
     - **Col E**: `หมายเหตุปี 69`
     - **Col F**: `สติกเกอร์`
  2. `lookupAsset(code)` queries `Master_Asset` first for sub-second lookup, falling back to multi-sheet router.
  3. `updateAssetStatus()` and `addNewUnlistedAsset()` perform **real-time bi-directional mutations** directly to both `Master_Asset` and the individual room worksheet, immediately followed by `SpreadsheetApp.flush()`.
  4. Locked mutations with `LockService.getScriptLock()` for 30 seconds prevent race conditions when multiple technicians audit concurrently.

## 3. Mobile Camera & Viewfinder Experience
- Embedded HTML5 viewfinder card with rear-camera default (`facingMode: "environment"`).
- Dual scanning mode: Continuous 60 FPS live video stream (`📹 START LIVE SCANNER`) and hardware camera snap (`📸 SNAP WITH CAMERA`).
- Synthetic Web Audio API double-tone chime (A5 880Hz $\rightarrow$ E6 1318Hz) on scan.
- Haptic vibration pulse (`[40, 30, 40] ms`).
- Torch / Flashlight toggle for dimly lit cabinets.
- Gallery file picker fallback for saved photos.
- Manual asset ID keyboard input modal for scratched or peeled stickers.

## 4. 1-Tap Thumb Action Bar & Sticker Inspection Workflow
- 3 Color-Coded Status Groups (10 Thai operational statuses):
  - **Group 1 (Green)**: ใช้งานอยู่, ใช้งานอยู่แต่ชำรุดนะ, Move Room (`ใช้งานอยู่+ย้ายไป...`), Rename Asset (`ใช้งานอยู่+แก้ไขชื่อเป็น...`).
  - **Group 2 (Red)**: หมดความจำเป็นต้องใช้งาน, หมดความจำเป็นต้องใช้งานเพราะชำรุด.
  - **Group 3 (Gray)**: สูญหาย, หาไม่เจอ, หาไม่เจอ+ให้พัสดุมาตรวจสอบหน้างาน, งง+ให้พัสดุมาตรวจสอบหน้างาน.
- Universal Sticker Check sublayer (`ปกติ`, `ปริ้นใหม่`, `ปริ้นใหม่+แก้ข้อมูล`) with blank change notes input before final persistence.
- Interactive expand-on-hover/tap toast notifications with 3.5s duration.

## 5. Telemetry & Danielson 2022 Appraisal Alignment
- **Domain 2e (Organizing Physical Space):** Transparent equipment audit tracking with condition remarks.
- **Domain 4b (Maintaining Accurate Records):** Continuous immutable audit logging via the standard `Logs` sheet.
