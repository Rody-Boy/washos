const puppeteer = require('puppeteer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);

const HTML_FILE = path.resolve(__dirname, 'samsung_washos_keynote.html');
const FRAMES_DIR = path.resolve(__dirname, 'frames');
const OUTPUT = path.resolve(__dirname, 'samsung_washos_keynote_resolume.mp4');
const FPS = 30;

// LED Wall: 4224 × 896 native, rendered at 2x for sharpness then downscaled
const WIDTH = 4224;
const HEIGHT = 896;
const DEVICE_SCALE = 2; // Capture at 8448×1792, downscale to 4224×896

const FRAME_DURATION_MS = 1000 / FPS;

// Scene durations from the HTML (in ms)
const durations = [30000, 10000, 20000, 20000, 10000, 18000, 35000, 24000, 18000, 16000, 18000, 29000];
const TOTAL_MS = durations.reduce((a, b) => a + b, 0);
const TOTAL_FRAMES = Math.ceil((TOTAL_MS / 1000) * FPS);

// Helper: advance browser virtual time by `ms` milliseconds using CDP.
async function advanceVirtualTime(client, ms) {
  return new Promise((resolve) => {
    const onExpired = () => {
      client.off('Emulation.virtualTimeBudgetExpired', onExpired);
      resolve();
    };
    client.on('Emulation.virtualTimeBudgetExpired', onExpired);
    client.send('Emulation.setVirtualTimePolicy', {
      policy: 'advance',
      budget: ms,
    });
  });
}

async function main() {
  if (fs.existsSync(FRAMES_DIR)) {
    fs.rmSync(FRAMES_DIR, { recursive: true });
  }
  fs.mkdirSync(FRAMES_DIR);

  console.log(`LED Wall (Resolume): ${WIDTH}x${HEIGHT} @ ${DEVICE_SCALE}x = ${WIDTH * DEVICE_SCALE}x${HEIGHT * DEVICE_SCALE} capture`);
  console.log(`Total duration: ${TOTAL_MS / 1000}s | Frames to capture: ${TOTAL_FRAMES}`);
  console.log('Launching browser...');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu-compositing',   // Prevent GPU rasterization artifacts
      '--force-device-scale-factor=1' // Let Puppeteer handle DPR
    ],
  });

  const page = await browser.newPage();
  const client = await page.createCDPSession();

  // Set viewport at native LED wall resolution with 2x device scale
  await page.setViewport({
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: DEVICE_SCALE
  });

  await page.goto(`file://${HTML_FILE}`, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for fonts to load
  await page.waitForFunction(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 2000));

  // Stop autoplay so we control timing
  await page.evaluate(() => { stop(); });

  // Enable CDP virtual time — freezes the browser's internal clock
  await client.send('Emulation.setVirtualTimePolicy', {
    policy: 'pause',
  });

  console.log('Capturing frames with CDP virtual time...');

  let frameNum = 0;
  for (let sceneIdx = 0; sceneIdx < durations.length; sceneIdx++) {
    const sceneDuration = durations[sceneIdx];
    const sceneFrames = Math.ceil((sceneDuration / 1000) * FPS);

    console.log(`  Scene ${sceneIdx + 1}/12 — ${sceneDuration / 1000}s (${sceneFrames} frames)`);

    await page.evaluate((i) => { show(i); }, sceneIdx);

    for (let f = 0; f < sceneFrames; f++) {
      await advanceVirtualTime(client, FRAME_DURATION_MS);

      const padded = String(frameNum).padStart(6, '0');
      await page.screenshot({
        path: path.join(FRAMES_DIR, `frame_${padded}.png`),
        type: 'png',
      });

      frameNum++;
      if (frameNum % 100 === 0) {
        console.log(`    ${frameNum}/${TOTAL_FRAMES} frames captured`);
      }
    }
  }

  console.log(`Done capturing ${frameNum} frames at ${WIDTH * DEVICE_SCALE}x${HEIGHT * DEVICE_SCALE}.`);
  await browser.close();

  // Encode frames to MP4
  // Input: 8448×1792 PNGs (2x capture)
  // Output: 4224×896 MP4 with high-quality Lanczos downscale
  console.log('Encoding MP4 with Lanczos downscale...');
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(path.join(FRAMES_DIR, 'frame_%06d.png'))
      .inputFPS(FPS)
      .videoCodec('libx264')
      .outputOptions([
        `-vf scale=${WIDTH}:${HEIGHT}:flags=lanczos`,  // Sharp downscale from 2x
        '-pix_fmt yuv420p',
        '-crf 12',
        '-preset veryslow',
        '-tune animation',
        '-profile:v high',
        '-level 5.1',
        `-r ${FPS}`,
        '-movflags +faststart',  // Resolume-friendly: moov atom at start
      ])
      .output(OUTPUT)
      .on('progress', (p) => {
        if (p.percent) process.stdout.write(`\r  Encoding: ${p.percent.toFixed(1)}%`);
      })
      .on('end', () => {
        console.log(`\nDone! Output: ${OUTPUT}`);
        console.log(`Resolution: ${WIDTH}x${HEIGHT} | Codec: H.264 High@5.1 | CRF 12`);
        fs.rmSync(FRAMES_DIR, { recursive: true });
        console.log('Cleaned up temporary frames.');
        resolve();
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err.message);
        reject(err);
      })
      .run();
  });
}

main().catch(console.error);
