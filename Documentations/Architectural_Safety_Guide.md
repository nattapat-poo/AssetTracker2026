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
