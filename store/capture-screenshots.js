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

  // Promo tiles
  const promoPath = path.resolve(__dirname, 'promo-tile.html');
  await page.goto(`file://${promoPath}`, { waitUntil: 'networkidle0' });

  // 小タイル 440x280
  await page.setViewport({ width: 440, height: 280 });
  const tileSmall = await page.$('#tileSmall');
  if (tileSmall) {
    await tileSmall.screenshot({
      path: path.resolve(__dirname, 'promo-small-440x280.png'),
      type: 'png',
    });
    console.log('promo-small-440x280.png saved');
  }

  // 大タイル 920x680
  await page.setViewport({ width: 920, height: 680 });
  const tileLarge = await page.$('#tileLarge');
  if (tileLarge) {
    await tileLarge.screenshot({
      path: path.resolve(__dirname, 'promo-large-920x680.png'),
      type: 'png',
    });
    console.log('promo-large-920x680.png saved');
  }

  // マーキータイル 1400x560 (JPEG、アルファなし)
  await page.setViewport({ width: 1400, height: 560 });
  const tileMarquee = await page.$('#tileMarquee');
  if (tileMarquee) {
    await tileMarquee.screenshot({
      path: path.resolve(__dirname, 'promo-marquee-1400x560.jpg'),
      type: 'jpeg',
      quality: 95,
    });
    console.log('promo-marquee-1400x560.jpg saved');
  }

  await browser.close();
  console.log('Done!');
})();
