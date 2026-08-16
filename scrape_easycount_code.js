const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://api.kesherhk.co.il/endpoint/connect-easycount', { waitUntil: 'networkidle0' });
  
  const content = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.font-mono, code, .token, pre, table')).map(x => x.innerText).join('\n---\n');
  });
  console.log(content);
  
  await browser.close();
})();
