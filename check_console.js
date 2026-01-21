const puppeteer = require('puppeteer');
(async () => {
  const url = 'https://executiveperformancek.web.app/';
  const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();

  const errors = [];
  const warnings = [];
  const networkFailures = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') errors.push(text);
    if (type === 'warning') warnings.push(text);
  });

  page.on('requestfailed', req => {
    networkFailures.push({url: req.url(), errorText: req.failure().errorText});
  });

  page.on('response', async res => {
    try {
      const req = res.request();
      if (req.url().endsWith('/data/planes.json')) {
        const status = res.status();
        if (status !== 200) networkFailures.push({url: req.url(), status});
      }
    } catch (e) {}
  });

  try {
    await page.goto(url, {waitUntil: 'networkidle2', timeout: 30000});
    // Some Puppeteer installs may not expose `page.waitForTimeout`.
    // Use a lightweight fallback to pause briefly.
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (e) {
    errors.push('Navigation error: ' + e.message);
  }
  // Try to read the totals card content if present
  try {
    const cardText = await page.evaluate(() => {
      const el = document.getElementById('totalSaleCard');
      return el ? el.innerText : null;
    });
    if (cardText) {
      console.log('TOTALS_CARD_TEXT:');
      console.log(cardText);
    } else {
      console.log('TOTALS_CARD_TEXT: not found');
    }
  } catch (e) {
    // ignore
  }
  console.log('--- RESULTS ---');
  console.log('errors_count:', errors.length);
  if (errors.length) console.log('errors:', errors);
  console.log('warnings_count:', warnings.length);
  if (warnings.length) console.log('warnings:', warnings);
  console.log('networkFailures_count:', networkFailures.length);
  if (networkFailures.length) console.log('networkFailures:', networkFailures);

  await browser.close();

  if (errors.length || networkFailures.length) process.exit(2);
  process.exit(0);
})();
