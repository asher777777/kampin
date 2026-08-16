const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://api.kesherhk.co.il/', { waitUntil: 'networkidle0' });
  
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({text: a.textContent.trim(), href: a.href}));
  });
  console.log(JSON.stringify(links, null, 2));
  await browser.close();
})();
