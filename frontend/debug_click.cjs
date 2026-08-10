const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser Error:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('Page Error:', err.message);
  });

  await page.goto('http://localhost:5173/classifieds', { waitUntil: 'networkidle0' });
  
  // Click Post a Free Ad button
  try {
    const postAdBtn = await page.$x("//button[contains(text(), 'Post a Free Ad') or contains(text(), 'POST A FREE AD')]");
    if (postAdBtn.length > 0) {
      await postAdBtn[0].click();
      console.log('Clicked Post Ad');
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (e) {
    console.log('Could not click post ad');
  }

  // Also try clicking a category in the filter
  try {
    const propertyCat = await page.$x("//span[contains(text(), 'Property')]");
    if (propertyCat.length > 0) {
      await propertyCat[0].click();
      console.log('Clicked Property category');
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch(e) {
    console.log('Could not click category');
  }

  await browser.close();
})();
