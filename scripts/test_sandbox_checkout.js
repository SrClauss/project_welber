// Headless test: create sandbox preference then open sandbox_init_point and attempt payment with test card
// Usage: node scripts/test_sandbox_checkout.js

const { chromium } = require('playwright');
const fetch = require('node-fetch');
const fs = require('fs');

(async () => {
  try {
    console.log('Creating sandbox preference...');
    const prefRes = await fetch('http://localhost:3000/api/mercadopago/create-checkout?sandbox=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ title: 'Test Sandbox Checkout Headless', quantity: 1, unit_price: 7.5 }], external_reference: `headless_${Date.now()}` })
    });
    const prefJson = await prefRes.json();
    console.log('Preference response status:', prefRes.status);
    // save response
    fs.writeFileSync('tmp/pref_response.json', JSON.stringify(prefJson, null, 2));
    if (!prefJson?.preference) {
      console.error('No preference returned:', prefJson);
      process.exit(1);
    }
    const sandboxLink = prefJson.preference.sandbox_init_point || prefJson.preference.sandbox_init_point || prefJson.preference.init_point;
    console.log('Sandbox link:', sandboxLink);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    console.log('Navigating to sandbox checkout...');
    await page.goto(sandboxLink, { waitUntil: 'networkidle' });

    // Wait for checkout iframe or card form to appear.
    // Mercado Pago checkout uses multiple frames; try to detect card input fields by role/placeholder

    // Give it some time to load dynamic content
    await page.waitForTimeout(2000);

    // Try to click the credit card payment method button (text varies). We'll search for button containing "Cartão".
    const cardButton = await page.locator('text=/Cart[aã]o|Credit card/i').first();
    if (await cardButton.count() > 0) {
      await cardButton.click().catch(() => {});
      console.log('Clicked card option');
    } else {
      console.log('Card option not found by text; trying alternative selectors');
    }

    // Mercado Pago embeds a card iframe where inputs live. Try to find iframe and its inputs.
    const frames = page.frames();
    console.log('Frames count:', frames.length);

    // Try to find any iframe that contains 'card[number]' input by evaluating
    let cardFrame = null;
    for (const f of frames) {
      try {
        const hasNumber = await f.$('input[name="cardnumber"], input[name="card[number]"], input[placeholder*="Número"]');
        if (hasNumber) { cardFrame = f; break; }
      } catch(e) {}
    }

    if (!cardFrame) {
      console.log('Card iframe not found via selectors; listing frames for debugging:');
      for (const f of frames) console.log('Frame:', f.url());
    } else {
      console.log('Found card frame, attempting to fill test card');
      // Try filling typical inputs
      try {
        await cardFrame.fill('input[name="cardnumber"], input[name="card[number]"]', '4509953566233704');
      } catch (e) {}
      try { await cardFrame.fill('input[name="expiry"], input[name="card_expiration_date"], input[name="card[expiration_month]"]', '12/28'); } catch(e){}
      try { await cardFrame.fill('input[name="security_code"], input[name="card[security_code]"], input[name="card[cvc]"]', '123'); } catch(e){}
    }

    // Try to click pay button
    const payButton = await page.locator('button:has-text("Pagar")').first();
    if (await payButton.count() > 0) {
      await payButton.click().catch(() => {});
      console.log('Clicked Pagar button');
    } else {
      console.log('Pay button not found by text, trying generic submit');
      const generic = await page.$('button[type=submit]');
      if (generic) { await generic.click().catch(()=>{}); console.log('Clicked submit'); }
    }

    // Wait and capture possible error message on page
    await page.waitForTimeout(4000);

    // Capture page screenshot and html
    await page.screenshot({ path: 'tmp/checkout_screenshot.png', fullPage: true });
    const html = await page.content();
    fs.writeFileSync('tmp/checkout_page.html', html);

    // Try to extract any visible error text
    const errorText = await page.locator('text=/parte.*teste|teste.*parte|test user|Uma das partes|is a test/iu').allTextContents().catch(()=>[]);
    console.log('Error text matches found:', errorText);

    await browser.close();

    console.log('Done. Saved tmp/pref_response.json, tmp/checkout_screenshot.png, tmp/checkout_page.html');
  } catch (err) {
    console.error('Error in script', err);
    process.exit(1);
  }
})();
