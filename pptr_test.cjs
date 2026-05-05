const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('CONSOLE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    await page.goto('https://tempmail.amircexitech.com/app', { waitUntil: 'networkidle0' });
    
    // Check if ErrorBoundary rendered
    const errorText = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (h1 && h1.textContent.includes('Something went wrong')) {
        const pre = document.querySelector('pre');
        return pre ? pre.textContent : 'Error details missing';
      }
      return null;
    });
    
    if (errorText) {
      console.log('CRASH CAUGHT BY ERROR BOUNDARY:', errorText);
    } else {
      console.log('App loaded without ErrorBoundary.');
    }
    
    await browser.close();
  } catch (e) {
    console.error('Puppeteer failed:', e.message);
  }
})();
