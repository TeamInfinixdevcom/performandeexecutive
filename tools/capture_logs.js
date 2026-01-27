const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  if (!fs.existsSync('logs')) fs.mkdirSync('logs');
  const outJson = 'logs/console-log.json';
  const outPng = 'logs/page-screenshot.png';
  const url = 'https://executiveperformancek.web.app';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const logs = [];

  page.on('console', msg => {
    try {
      logs.push({ type: 'console', level: msg.type(), text: msg.text(), location: msg.location() });
    } catch (e) {
      logs.push({ type: 'console', level: msg.type(), text: msg.text() });
    }
  });

  page.on('pageerror', err => {
    logs.push({ type: 'pageerror', message: err.message, stack: err.stack });
  });

  page.on('requestfailed', req => {
    logs.push({ type: 'requestfailed', url: req.url(), method: req.method(), failure: req.failure() ? req.failure().errorText : null });
  });

  page.on('response', async res => {
    // capture 4xx/5xx responses
    try {
      if (res.status() >= 400) {
        logs.push({ type: 'badresponse', url: res.url(), status: res.status(), statusText: res.statusText() });
      }
    } catch (e) {}
  });

  console.log('Opening', url);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  } catch (err) {
    logs.push({ type: 'gotoError', message: err.message });
  }

  // wait extra time for lazy-loaded scripts and user-simulated delays
  await page.waitForTimeout(8000);

  // capture a screenshot and save logs
  try {
    await page.screenshot({ path: outPng, fullPage: true });
  } catch (e) {
    logs.push({ type: 'screenshotError', message: e.message });
  }

  fs.writeFileSync(outJson, JSON.stringify(logs, null, 2));
  console.log('Captured', logs.length, 'events. Saved to', outJson, 'and', outPng);

  await browser.close();
})();
