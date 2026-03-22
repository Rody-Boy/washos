const puppeteer = require('puppeteer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);

const HTML_FILE = path.resolve(__dirname, 'samsung_washos_keynote.html');
const FRAMES_DIR = path.resolve(__dirname, 'frames');
const OUTPUT = path.resolve(__dirname, 'samsung_washos_keynote.mp4');
const FPS = 60;
const WIDTH = 3840;
const HEIGHT = 2160;
const FRAME_DURATION_MS = 1000 / FPS; // 33.333ms per frame

// Scene durations from the HTML (in ms)
const durations = [20000, 20000, 20000, 18000, 25000, 18000, 22000, 20000, 18000, 16000, 16000, 35000];
const TOTAL_MS = durations.reduce((a, b) => a + b, 0); // 120000ms = 2 minutes
const TOTAL_FRAMES = Math.ceil((TOTAL_MS / 1000) * FPS);

// Helper: advance browser virtual time by `ms` milliseconds using CDP.
// This advances the browser's INTERNAL clock — setTimeout, setInterval,
// requestAnimationFrame, CSS animations, CSS transitions all use this clock.
// Time is frozen between advances, so screenshot duration doesn't cause drift.
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
  // Create frames directory
  if (fs.existsSync(FRAMES_DIR)) {
    fs.rmSync(FRAMES_DIR, { recursive: true });
  }
  fs.mkdirSync(FRAMES_DIR);

  console.log(`Total duration: ${TOTAL_MS / 1000}s | Frames to capture: ${TOTAL_FRAMES}`);
  console.log('Launching browser...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const client = await page.createCDPSession();
  await page.setViewport({ width: WIDTH, height: HEIGHT });

  // Load the HTML file
  await page.goto(`file://${HTML_FILE}`, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for fonts to load
  await page.waitForFunction(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 2000));

  // Stop autoplay so we control timing
  await page.evaluate(() => { stop(); });

  // Enable virtual time — this freezes the browser's internal clock.
  // ALL timing is now controlled: setTimeout, setInterval, requestAnimationFrame,
  // CSS animations, CSS transitions, performance.now(), Date.now(), etc.
  // Nothing advances until we explicitly grant a time budget.
  await client.send('Emulation.setVirtualTimePolicy', {
    policy: 'pause',
  });

  console.log('Capturing frames with CDP virtual time...');

  let frameNum = 0;
  for (let sceneIdx = 0; sceneIdx < durations.length; sceneIdx++) {
    const sceneDuration = durations[sceneIdx];
    const sceneFrames = Math.ceil((sceneDuration / 1000) * FPS);

    console.log(`  Scene ${sceneIdx + 1}/12 — ${sceneDuration / 1000}s (${sceneFrames} frames)`);

    // Trigger this scene — show() adds .active class and schedules
    // .on class additions via setTimeout per the anim[] timing map.
    // These setTimeouts will fire at the correct virtual times when
    // we advance the clock below.
    await page.evaluate((i) => { show(i); }, sceneIdx);

    // Capture frames over the scene duration
    for (let f = 0; f < sceneFrames; f++) {
      // Advance the browser's virtual clock by exactly one frame (33.333ms).
      // This causes:
      //  - Any setTimeout/setInterval callbacks due in this window to fire
      //  - CSS transitions to interpolate by 33.333ms
      //  - CSS @keyframes animations to advance by 33.333ms
      //  - requestAnimationFrame callbacks to fire
      // The browser processes all of this instantly (faster than real-time),
      // then pauses again when the budget is exhausted.
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

  console.log(`Done capturing ${frameNum} frames.`);
  await browser.close();

  // Encode frames to MP4
  console.log('Encoding MP4...');
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(path.join(FRAMES_DIR, 'frame_%06d.png'))
      .inputFPS(FPS)
      .videoCodec('libx264')
      .outputOptions([
        '-pix_fmt yuv420p',
        '-crf 12',
        '-preset veryslow',
        '-tune animation',
        '-profile:v high',
        '-level 5.1',
        `-r ${FPS}`,
      ])
      .output(OUTPUT)
      .on('progress', (p) => {
        if (p.percent) process.stdout.write(`\r  Encoding: ${p.percent.toFixed(1)}%`);
      })
      .on('end', () => {
        console.log(`\nDone! Output: ${OUTPUT}`);
        // Clean up frames
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
