# 🛡️ Architectural Safety & Data Integrity Guide — Project 08

## 1. Concurrency Control with `LockService`
Multiple lab technicians often audit different benches or rooms simultaneously. To eliminate race conditions and corrupted rows:
- All status mutations in `DatabaseService.js` are wrapped in `withLock(callback, 30000)` using `LockService.getScriptLock()`.
- If another process is modifying the sheet, the transaction waits up to 30 seconds before executing or failing gracefully.

## 2. Row Verification & Realignment Protocol
Row numbers can shift if rows are deleted or inserted by other users while the audit is in progress:
- Before executing an in-place mutation, `DatabaseService.updateAssetStatus()` checks that the target row still matches the target `AssetID`.
- If a row mismatch is detected, the engine executes an immediate single-column re-scan of the target worksheet to find the true row index before writing values.

## 3. Zero-Destructive Auto-Schema (`ensureAssetColumns`)
When connected to an existing school inventory sheet:
- `ensureAssetColumns(sheet)` scans the header row (Row 1).
- Missing audit columns (`Status`, `AuditedBy`, `AuditDate`, `Notes`, `FoundLocation`) are appended to the far right without modifying or overwriting any existing inventory columns (e.g., procurement date, serial number, unit cost, or supplier).

## 4. Location Discrepancy Tracking
Equipment is frequently borrowed or moved between science laboratories:
- When an asset registered to `Lab 204` is scanned while the technician is auditing `Lab 301`, the system does NOT overwrite the original `RegisteredLocation`.
- Instead, it populates `FoundLocation = "Lab 301"`, providing procurement with a clean discrepancy report of misplaced assets.

## 5. Modal Backdrop Dismissal Standard (Dismiss on Outside Click)
All modal overlays and interactive drawers must support intuitive backdrop click/tap dismissal (`onclick="ModalController.handleBackdropClick(event, this)"` with `event.stopPropagation()` on the dialog window):
- When a user taps outside the modal bounds, the system must immediately dismiss the dialog and restore the previous viewport or camera scanner stream without requiring a precision tap on the close icon.

## 6. One-Click Clipboard Copy Standard
Quick-copy icons are provided next to primary identifier fields (Asset Description 1 / Asset Name and Inventory Number):
- Clicking copies the raw text using `navigator.clipboard.writeText` (with fallback `document.execCommand('copy')`) and triggers a non-blocking toast confirmation.

## 7. Master Table Integrity & Migration Safety Standard (v1.1.3b)
To safeguard institutional asset registries against duplication and record collision:
- **Duplicate & Contradiction Verification**: The system provides an automated integrity check (`checkMasterTableContradictions`) scanning `Master_Asset` for duplicate inventory numbers and empty ID rows, automatically highlighting conflicting entries in soft red (`#FEE2E2`) on the master spreadsheet.
- **Visual Migration Distinction (Yellow Highlight)**: When syncing from `Master_Asset` to individual room sheets (`migrateMasterToRoomSheets`), newly registered items or items moved from other rooms are appended below the last row and highlighted across all 20 columns in soft yellow (`#FFF2CC`) for immediate visual identification by lab technicians.

## 8. Typography & Responsive Mobile Scaling Standard (v1.1.3b)
Mobile ergonomics for field inventory survey require high readability without manual zoom:
- **Compact Navigation Headers**: Main app bar and modal title bars remain compact (`text-sm`, `text-[10px]` status badges) to preserve maximum vertical screen estate for live camera scanning.
- **Enhanced Body & Interactive Typography**: Body text, card titles, and button labels are scaled up for high legibility (`text-[15px]` to `text-base` for primary asset titles, `text-sm` for inventory numbers and 1-tap thumb action buttons, `text-xs` for metadata chips and notes) while adhering to WCAG AAA contrast and $\ge 44\times 44$px touch targets.

