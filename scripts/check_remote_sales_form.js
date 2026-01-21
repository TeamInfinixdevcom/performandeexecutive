const https = require('https');
https.get('https://executiveperformancek.web.app/ventas-form.html', res => {
  let d = '';
  res.on('data', c => d += c.toString());
  res.on('end', () => {
    const hasTotal = d.includes('id="totalSaleCard"');
    const hasUnit = d.includes('id="unitPrice"');
    console.log('FOUND_TOTAL_CARD:', hasTotal);
    console.log('FOUND_UNIT_PRICE:', hasUnit);
  });
}).on('error', e => { console.error('ERR', e.message); process.exit(2); });
