import { chromium } from 'playwright';
import path from 'node:path';

async function main() {
  const [,, htmlFile, outFile] = process.argv;
  if (!htmlFile || !outFile) {
    console.error('Usage: node render-card.mjs <input.html> <output.png>');
    process.exit(1);
  }

  const resolvedHtml = path.resolve(htmlFile);
  const resolvedOut = path.resolve(outFile);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 1200 },
    deviceScaleFactor: 2,
  });

  await page.goto(`file://${resolvedHtml}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: resolvedOut, type: 'png' });
  console.log(`Successfully generated: ${resolvedOut}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
