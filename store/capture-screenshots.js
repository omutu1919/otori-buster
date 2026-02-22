/**
 * スクリーンショット生成スクリプト
 * Usage: node store/capture-screenshots.js
 */
const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const mockPath = path.resolve(__dirname, 'screenshot-mock.html');
  await page.goto(`file://${mockPath}`, { waitUntil: 'networkidle0' });

  // Screenshot 1: メイン機能 (1280x800)
  await page.setViewport({ width: 1280, height: 800 });
  const el1 = await page.$('#screenshot1');
  if (el1) {
    await el1.screenshot({
      path: path.resolve(__dirname, 'screenshot-1-main.png'),
      type: 'png',
    });
    console.log('screenshot-1-main.png saved');
  }

  // Screenshot 2: ポップアップ (1280x800)
  const el2 = await page.$('#screenshot2');
  if (el2) {
    await el2.screenshot({
      path: path.resolve(__dirname, 'screenshot-2-popup.png'),
      type: 'png',
    });
    console.log('screenshot-2-popup.png saved');
  }

  await browser.close();
  console.log('Done!');
})();
