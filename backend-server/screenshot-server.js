const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
app.use(express.json({limit: '50mb'}));
app.use(function(req,res,next){ res.header('Access-Control-Allow-Origin','*'); res.header('Access-Control-Allow-Headers','Content-Type'); res.header('Access-Control-Allow-Methods','GET,POST,OPTIONS'); if(req.method==='OPTIONS') return res.sendStatus(200); next(); });

const BASE_URL = 'https://f5bd4ae6-64ea-466d-990b.372acb14d1b3.isard.nuvulet.itb.cat/FireSense/';

let pendingState = null;

app.post('/api/screenshot', async (req, res) => {
  try {
    pendingState = req.body; // {nodes, center, zoom}
    const token = Date.now();
    const url = BASE_URL + '?capture=' + token;

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox','--disable-setuid-sandbox','--ignore-certificate-errors']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Exponer función para que la web pueda pedir el estado
    await page.exposeFunction('getCaptureState', () => pendingState);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Esperar a que la web restaure la cobertura
    await new Promise(r => setTimeout(r, 10000));

    const mapEl = await page.$('.map-wrap');
    const img = await mapEl.screenshot({ encoding: 'binary' });
    await browser.close();
    pendingState = null;

    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', 'attachment; filename=cobertura.png');
    res.send(img);
  } catch(e) {
    console.error(e);
    res.status(500).json({error: e.message});
  }
});

app.get('/api/screenshot/state', (req, res) => {
  res.json(pendingState || null);
});

app.listen(3001, () => console.log('Screenshot server running on port 3001'));
