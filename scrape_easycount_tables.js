const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://api.kesherhk.co.il/endpoint/connect-easycount', { waitUntil: 'networkidle0' });
  
  const content = await page.evaluate(() => {
    const tables = document.querySelectorAll('table');
    let res = "";
    tables.forEach(table => {
       res += table.innerText + "\n\n";
    });
    return res;
  });
  console.log(content);
  
  await browser.close();
})();
