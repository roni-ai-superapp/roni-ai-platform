#!/usr/bin/env node
/**
 * Take a screenshot of the dev frontend for verification
 *
 * Usage: node scripts/screenshot.mjs [url] [output]
 *
 * Example: node scripts/screenshot.mjs https://frontend-dev.up.railway.app/pages/sales-report ./screenshot.png
 */

import { chromium } from 'playwright';

const url = process.argv[2] || 'https://frontend-dev-5e53.up.railway.app/pages/sales-report';
const output = process.argv[3] || './screenshot.png';

async function takeScreenshot() {
  console.log(`Taking screenshot of: ${url}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 }
  });

  await page.goto(url, { waitUntil: 'networkidle' });

  // Wait a bit for any dynamic content
  await page.waitForTimeout(2000);

  await page.screenshot({ path: output, fullPage: true });
  console.log(`Screenshot saved to: ${output}`);

  await browser.close();
}

takeScreenshot().catch(err => {
  console.error('Screenshot failed:', err);
  process.exit(1);
});
