const https = require('https');

function gasRequest(action, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL('https://script.google.com/macros/s/AKfycbxYlZkDw5te1-b4dbGPX7aIrR4RaL-Hqth7QnmFQ2Ryckd74E5GJmPPBldzXUnxjI6q/exec');
    url.searchParams.set('action', action);
    url.searchParams.set('payload', JSON.stringify(payload));
    url.searchParams.set('callback', 'cb_test');

    function fetchUrl(targetUrl) {
      https.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchUrl(res.headers.location);
          return;
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({ status: res.statusCode, data: data });
        });
      }).on('error', reject);
    }

    fetchUrl(url.toString());
  });
}

async function test() {
  try {
    console.log('1. Testing verifyMahidolUser...');
    let r1 = await gasRequest('verifyMahidolUser', { email: 'nattapat.poo@mahidol.ac.th' });
    console.log('verifyMahidolUser:', r1.data.slice(0, 150));

    console.log('\n2. Testing lookupAsset for 4356000-911000001559-0...');
    let r2 = await gasRequest('lookupAsset', { assetCode: '4356000-911000001559-0' });
    console.log('lookupAsset:', r2.data.slice(0, 250));

    console.log('\n3. Testing updateAssetStatus...');
    let r3 = await gasRequest('updateAssetStatus', {
      assetId: '4356000-911000001559-0',
      status: 'ใช้งานอยู่',
      scanned69: 'ใช้งานอยู่',
      sticker: 'ปกติ',
      notes: 'v1.1.8k test sync',
      clientEmail: 'nattapat.poo@mahidol.ac.th'
    });
    console.log('updateAssetStatus:', r3.data.slice(0, 300));
  } catch (e) {
    console.error('Test error:', e);
  }
}

test();
