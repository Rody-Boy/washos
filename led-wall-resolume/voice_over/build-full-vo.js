const { execSync } = require('child_process');
const ffmpegPath = require('../../node_modules/@ffmpeg-installer/ffmpeg').path;
const path = require('path');
const fs = require('fs');

// Scene start times (cumulative from dur array)
const sceneStarts = [0, 30, 40, 60, 80, 90, 108, 143, 167, 185, 201, 219];
const TOTAL_DURATION = 248;

// VO clips mapped to scene indices
const clips = [
  { scene: 0,  file: 'vo_slide01.mp3' },
  { scene: 1,  file: 'vo_slide02.mp3' },
  { scene: 2,  file: 'vo_slide03.mp3' },
  { scene: 3,  file: 'vo_slide04.mp3' },
  { scene: 4,  file: 'vo_slide05.mp3' },
  { scene: 5,  file: 'vo_slide06.mp3' },
  { scene: 6,  file: 'vo_slide07.mp3' },
  { scene: 7,  file: 'vo_slide08.mp3' },
  { scene: 8,  file: 'vo_slide09.mp3' },
  { scene: 9,  file: 'vo_slide10.mp3' },
  { scene: 10, file: 'vo_slide11.mp3' },  // plays during SC11, covers SC12 closing too
];

const OUTPUT = path.resolve(__dirname, 'vo_full_timed.mp3');
const dir = __dirname;

// Build FFmpeg complex filter to place each clip at its scene start time
// Using amerge with adelay for each clip
let inputs = '';
let filterParts = [];
let mergeInputs = '';

clips.forEach((c, i) => {
  const delayMs = sceneStarts[c.scene] * 1000;
  inputs += ` -i "${path.join(dir, c.file)}"`;
  filterParts.push(`[${i}]adelay=${delayMs}|${delayMs},apad[a${i}]`);
  mergeInputs += `[a${i}]`;
});

const filter = filterParts.join(';') + `;${mergeInputs}amix=inputs=${clips.length}:duration=longest[out]`;

const cmd = `"${ffmpegPath}" -y${inputs} -filter_complex "${filter}" -map "[out]" -t ${TOTAL_DURATION} -acodec libmp3lame -q:a 2 "${OUTPUT}"`;

console.log('Building full timed voiceover track (248s)...');
console.log(`  ${clips.length} clips → scene-aligned audio\n`);

clips.forEach(c => {
  console.log(`  SC${c.scene + 1} starts at ${sceneStarts[c.scene]}s → ${c.file}`);
});

execSync(cmd, { stdio: 'inherit' });

console.log(`\nDone! Output: ${OUTPUT}`);
console.log(`Duration: ${TOTAL_DURATION}s — ready to mux into video`);
