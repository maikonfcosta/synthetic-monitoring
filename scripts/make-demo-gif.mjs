import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { TARGETS } from '../src/config/targets.ts';

const tempDir = path.resolve(process.cwd(), 'demo-temp');
const docsDir = path.resolve(process.cwd(), 'docs');
const outGif = path.join(docsDir, 'demo.gif');

mkdirSync(tempDir, { recursive: true });
mkdirSync(docsDir, { recursive: true });

console.log('Recording probe tour across targets...');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  recordVideo: {
    dir: tempDir,
    size: { width: 1280, height: 720 },
  },
  viewport: { width: 1280, height: 720 },
});

const page = await context.newPage();

for (const target of TARGETS) {
  console.log(`Probing: ${target.name} (${target.url})`);
  await page.goto(target.url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
}

await context.close();
await browser.close();

const videoFiles = readdirSync(tempDir).filter((f) => f.endsWith('.webm'));
if (videoFiles.length === 0) {
  throw new Error('No recorded video found in temp dir');
}

const videoPath = path.join(tempDir, videoFiles[0]);
const palettePath = path.join(tempDir, 'palette.png');
const filters = 'fps=10,scale=960:-1:flags=lanczos';

console.log('Converting video to high quality GIF via ffmpeg...');
execFileSync('ffmpeg', ['-y', '-i', videoPath, '-vf', `${filters},palettegen`, palettePath], {
  stdio: 'ignore',
});

execFileSync(
  'ffmpeg',
  [
    '-y',
    '-i',
    videoPath,
    '-i',
    palettePath,
    '-lavfi',
    `${filters} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5`,
    outGif,
  ],
  { stdio: 'ignore' }
);

rmSync(tempDir, { recursive: true, force: true });

const sizeMb = (statSync(outGif).size / 1024 / 1024).toFixed(2);
console.log(`Demo GIF created at ${outGif} (${sizeMb} MB)`);
