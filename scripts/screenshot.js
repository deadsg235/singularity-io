#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const VIEWPORTS = [
  { name: 'iphone-15-pro-393x852', width: 393, height: 852 },
  { name: 'desktop-1920x1080', width: 1920, height: 1080 },
  { name: 'fullscreen-2560x1440', width: 2560, height: 1440 },
];

const TARGET_URL = process.env.SCREENSHOT_URL || 'http://localhost:3210';

function createTimestampFolder() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').split('.')[0];
  const folder = path.join(__dirname, '..', 'screenshots', timestamp);
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

async function takeScreenshots() {
  console.log(`\n📸 Starting screenshot capture from ${TARGET_URL}\n`);

  const outputDir = createTimestampFolder();
  console.log(`📁 Output directory: ${outputDir}\n`);

  const browser = await chromium.launch({ headless: true });

  for (const viewport of VIEWPORTS) {
    console.log(`📱 Capturing ${viewport.name}...`);

    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2,
    });

    const page = await context.newPage();

    try {
      await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });

      const screenshotPath = path.join(outputDir, `${viewport.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      console.log(`   ✓ Saved: ${viewport.name}.png`);
    } catch (error) {
      console.error(`   ✗ Failed: ${error.message}`);
    } finally {
      await context.close();
    }
  }

  await browser.close();

  console.log(`\n✅ Screenshot capture complete!`);
  console.log(`📂 Location: ${outputDir}\n`);
}

takeScreenshots().catch((error) => {
  console.error('\n❌ Screenshot capture failed:', error);
  process.exit(1);
});
