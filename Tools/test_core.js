/**
 * test_core.js — Automated Verification Suite for ApiClient, AppState, Multi-Sheet Logic,
 * and v1.1.0e Multi-Modal Camera Scanner Engine & Config Sheet Synchronization.
 */

const fs = require('fs');
const html = fs.readFileSync('Output/standalone_preview.html', 'utf8');

global.window = global;
global.document = {
  addEventListener: () => {},
  getElementById: () => null,
  querySelectorAll: () => []
};
global.localStorage = { getItem: () => null, setItem: () => {} };

// Evaluate AppState and ApiClient modules from generated bundle
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
while ((match = scriptRegex.exec(html)) !== null) {
  const code = match[1];
  if (code.includes('AppState =') || code.includes('ApiClient =')) {
    eval(code);
  }
}

async function runTests() {
  console.log('--- 1. Testing ApiClient.getInitialPayload() ---');
  const payload = await ApiClient.getInitialPayload();
  console.log('  User:', payload.user.name, '| Rooms count:', payload.rooms.length, '| Version:', payload.config.APP_VERSION);
  if (payload.rooms.length !== 12) throw new Error('Expected 12 rooms');
  if (payload.config.APP_VERSION !== 'v1.1.0e') throw new Error(`Expected APP_VERSION to be v1.1.0e, got ${payload.config.APP_VERSION}`);

  console.log('\n--- 2. Testing ApiClient.lookupAsset("MUIDS-SCI-204-001") ---');
  const found = await ApiClient.lookupAsset('MUIDS-SCI-204-001');
  console.log('  Found item:', found.asset.itemName, '| Status:', found.asset.status);
  if (!found.found) throw new Error('Asset lookup failed');

  console.log('\n--- 3. Testing ApiClient.updateAssetStatus to Damaged ---');
  const updated = await ApiClient.updateAssetStatus({
    assetId: 'MUIDS-SCI-204-001',
    status: 'Damaged',
    notes: 'Test lens scratch',
    currentRoom: 'Lab 204 (General Science)'
  });
  console.log('  Updated status:', updated.status, '| Notes:', updated.notes);
  if (updated.status !== 'Damaged') throw new Error('Status update failed');

  console.log('\n--- 4. Testing AppState state store & filtering ---');
  AppState.set('summary', updated.roomSummary);
  AppState.set('statusFilter', 'Damaged');
  const damaged = AppState.getFilteredItems();
  console.log('  Damaged items count:', damaged.length);
  if (damaged.length === 0) throw new Error('Filter failed');

  console.log('\n--- 5. Testing v1.1.0e Config Sheet Synchronization ---');
  const configSyncRes = await ApiClient.syncConfigSheet();
  console.log('  Sync result:', configSyncRes.message, '| Version:', configSyncRes.appVersion);
  if (!configSyncRes.success || configSyncRes.appVersion !== 'v1.1.0e') {
    throw new Error('syncConfigSheet failed');
  }

  console.log('\n--- 6. Testing v1.1.0e Row 5 Hardcoded Column M (13) & Repair ---');
  const setupRes = await ApiClient.setupRow5Headers();
  console.log('  Setup result:', setupRes.message, '| Start column:', setupRes.startColumn);
  if (!setupRes.success) throw new Error('setupRow5Headers failed');
  if (setupRes.startColumn !== 'M (Column 13)') throw new Error('Expected startColumn to be M (Column 13)');

  console.log('\n--- 7. Testing Hybrid Master Table & Migration ---');
  const buildRes = await ApiClient.buildMasterTable();
  console.log('  Build result:', buildRes.message, '| Total assets:', buildRes.totalAssets);
  if (!buildRes.success || buildRes.totalAssets === 0) throw new Error('buildMasterTable failed');

  const migrateRes = await ApiClient.migrateMasterToRooms();
  console.log('  Migrate result:', migrateRes.message, '| Migrated count:', migrateRes.rowsMigrated);
  if (!migrateRes.success) throw new Error('migrateMasterToRooms failed');

  const queryRes = await ApiClient.queryMasterTable({ status: 'Damaged' });
  console.log('  Query total:', queryRes.total, '| Room types:', queryRes.roomTypes.join(', '));
  if (queryRes.total === 0) throw new Error('queryMasterTable failed');

  console.log('\n--- 8. Unit Testing Backend Server Logic (Config.js & DatabaseService.js) ---');
  const configJs = fs.readFileSync('App_Script/Config.js', 'utf8');
  const dbServiceJs = fs.readFileSync('App_Script/DatabaseService.js', 'utf8');

  // Verify START_COL_M is 13
  if (!dbServiceJs.includes('const START_COL_M = 13;')) {
    throw new Error('START_COL_M must be strictly 13 in DatabaseService.js');
  }
  console.log('  Verified: START_COL_M is strictly 13 (Column M).');

  // Verify APP_CONFIG.VERSION is v1.1.0e
  if (!configJs.includes('VERSION: "v1.1.0e"')) {
    throw new Error('APP_CONFIG.VERSION must be v1.1.0e in Config.js');
  }
  console.log('  Verified: APP_CONFIG.VERSION is v1.1.0e in Config.js.');

  // Verify Row 5 Columns 1..12 Repair loop is present
  if (!dbServiceJs.includes('PROCUREMENT_ROW5_CANONICAL') || !dbServiceJs.includes('repairedCols.push')) {
    throw new Error('Row 5 Columns 1..12 repair pass missing in DatabaseService.js');
  }
  console.log('  Verified: Row 5 Columns A-L repair and canonical restoration logic is present.');

  // Verify syncConfigSheet preserves user settings
  if (!configJs.includes('function syncConfigSheet(ss)') || !configJs.includes('keyRowMap[item.key]')) {
    throw new Error('syncConfigSheet preserving user settings missing in Config.js');
  }
  console.log('  Verified: syncConfigSheet with user setting preservation is present.');

  console.log('\n--- 9. Verifying v1.1.0e Multi-Modal Camera Scanner Engine ---');
  const scannerHtml = fs.readFileSync('App_Script/ScannerController.html', 'utf8');
  const indexHtml = fs.readFileSync('App_Script/index.html', 'utf8');
  const apiClientHtml = fs.readFileSync('App_Script/ApiClient.html', 'utf8');

  // Verify native camera snap input with capture="environment"
  if (!indexHtml.includes('id="native-camera-input"') || !indexHtml.includes('capture="environment"')) {
    throw new Error('native-camera-input with capture="environment" missing in index.html');
  }
  console.log('  Verified: Native camera snap input (<input capture="environment">) present.');

  // Verify prominent Snap button in placeholder
  if (!indexHtml.includes('📸 SNAP WITH CAMERA') || !indexHtml.includes('ScannerController.openNativeCameraSnap()')) {
    throw new Error('Prominent SNAP WITH CAMERA button missing in index.html');
  }
  console.log('  Verified: Prominent 📸 SNAP WITH CAMERA button present in scanner standby UI.');

  // Verify smart camera enumeration in startScanner
  if (!scannerHtml.includes('Html5Qrcode.getCameras()') || !scannerHtml.includes('openNativeCameraSnap')) {
    throw new Error('Html5Qrcode.getCameras() or openNativeCameraSnap missing in ScannerController.html');
  }
  console.log('  Verified: Html5Qrcode.getCameras() smart webcam detection is present.');

  // Verify accelerated BarcodeDetector & canvas downscaling
  if (!scannerHtml.includes('BarcodeDetector') || !scannerHtml.includes('downscaleImageBlob')) {
    throw new Error('BarcodeDetector or downscaleImageBlob missing in ScannerController.html');
  }
  console.log('  Verified: BarcodeDetector hardware acceleration and canvas downscaling present.');

  // Verify Remote Live GAS Bridge URL
  if (!apiClientHtml.includes('LIVE_GAS_WEBAPP_URL') || !apiClientHtml.includes('AKfycbyX7q6-CSO0JeueXXg9OcNpnNL21DOLS3klvkPjxTs')) {
    throw new Error('LIVE_GAS_WEBAPP_URL missing or invalid in ApiClient.html');
  }
  console.log('  Verified: LIVE_GAS_WEBAPP_URL remote bridge present in ApiClient.html.');

  console.log('\n--- 10. Verifying Matched Asset Details Modal Popup ---');
  const auditHtml = fs.readFileSync('App_Script/AuditController.html', 'utf8');
  const modalHtml = fs.readFileSync('App_Script/ModalController.html', 'utf8');

  // Verify asset-details-modal in index.html
  if (!indexHtml.includes('id="asset-details-modal"') || !indexHtml.includes('id="modal-asset-id"')) {
    throw new Error('asset-details-modal or modal-asset-id missing in index.html');
  }
  console.log('  Verified: #asset-details-modal with #modal-asset-id present in index.html.');

  // Verify modal controller has openAssetDetailsModal
  if (!modalHtml.includes('openAssetDetailsModal') || !modalHtml.includes('closeAssetDetailsModal')) {
    throw new Error('openAssetDetailsModal or closeAssetDetailsModal missing in ModalController.html');
  }
  console.log('  Verified: openAssetDetailsModal and closeAssetDetailsModal present in ModalController.html.');

  // Verify audit controller opens modal on scan and handles modal submit
  if (!auditHtml.includes('ModalController.openAssetDetailsModal') || !auditHtml.includes('submitStatusFromModal')) {
    throw new Error('ModalController.openAssetDetailsModal or submitStatusFromModal missing in AuditController.html');
  }
  console.log('  Verified: AuditController opens modal on scan and handles submitStatusFromModal.');

  console.log('\n======================================================');
  console.log('✅ ALL TESTS PASSED FOR v1.1.0e RELEASE VERIFICATION!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
