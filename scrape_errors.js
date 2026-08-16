const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://api.kesherhk.co.il/', { waitUntil: 'networkidle0' });
  
  const content = await page.evaluate(() => document.body.innerText);
  
  const lines = content.split('\n');
  const errorLines = lines.filter(line => line.includes('416') || line.includes('משתמש'));
  console.log("Found error mentions:");
  console.log(errorLines.join('\n'));
  
  // also let's just print a bunch of text near "416"
  const idx = content.indexOf('416');
  if (idx !== -1) {
      console.log("Context around 416:");
      console.log(content.substring(idx - 100, idx + 200));
  }
  
  await browser.close();
})();
