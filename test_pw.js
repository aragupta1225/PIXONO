const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.error('BROWSER ERROR:', error));
  await page.goto('http://localhost:8000/index.html', { waitUntil: 'load' });
  await page.click('#introStartBtn');
  await page.click('[data-style="pastel"]');
  await page.click('#modeDecorate');
  
  const img = await page.waitForSelector('.sticker-opt-img');
  await img.click();
  await page.waitForTimeout(500);

  const sticker = await page.$('.diary-sticker');
  console.log('Sticker found:', !!sticker);
  
  if (sticker) {
      const box = await sticker.boundingBox();
      console.log('Original Box:', box);

      await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
      await page.mouse.down();
      await page.mouse.move(box.x + 200, box.y + 200, {steps: 10});
      await page.mouse.up();
      
      const newBox = await sticker.boundingBox();
      console.log('New Box:', newBox);
  }
  
  await browser.close();
})();
