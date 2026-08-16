const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://api.kesherhk.co.il/endpoint/connect-easycount', { waitUntil: 'networkidle0' });
  
  const content = await page.evaluate(() => document.body.innerText);
  console.log(content);
  
  await browser.close();
})();
