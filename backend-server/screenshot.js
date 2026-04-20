const puppeteer = require('puppeteer');

async function screenshot(url, outputPath, waitMs = 8000) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, waitMs));
  const mapEl = await page.$('#map');
  if(mapEl){
    await mapEl.screenshot({ path: outputPath });
  } else {
    await page.screenshot({ path: outputPath });
  }
  await browser.close();
  console.log('Screenshot saved:', outputPath);
}

const url  = process.argv[2] || 'http://localhost';
const out  = process.argv[3] || 'screenshot.png';
const wait = parseInt(process.argv[4]) || 8000;
screenshot(url, out, wait).catch(console.error);
