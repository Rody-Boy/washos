const { execSync } = require('child_process');
const ffmpegPath = require('../../node_modules/@ffmpeg-installer/ffmpeg').path;
const path = require('path');

const INPUT = path.resolve(__dirname, 'VO.mp3');
const TOTAL_DURATION = 165.41; // 2:45.41

// Estimated timestamps based on word count proportional to 165s
// Adjust these after listening — these are best-guess splits
const cuts = [
  { slide: 1,  start: 0,      end: 28.5,  file: 'vo_slide01.mp3' },
  { slide: 2,  start: 28.5,   end: 33.2,  file: 'vo_slide02.mp3' },
  { slide: 3,  start: 33.2,   end: 46.8,  file: 'vo_slide03.mp3' },
  { slide: 4,  start: 46.8,   end: 60.5,  file: 'vo_slide04.mp3' },
  { slide: 5,  start: 60.5,   end: 68.8,  file: 'vo_slide05.mp3' },
  { slide: 6,  start: 68.8,   end: 78.7,  file: 'vo_slide06.mp3' },
  { slide: 7,  start: 78.7,   end: 110.9, file: 'vo_slide07.mp3' },
  { slide: 8,  start: 110.9,  end: 132.1, file: 'vo_slide08.mp3' },
  { slide: 9,  start: 132.1,  end: 140.7, file: 'vo_slide09.mp3' },
  { slide: 10, start: 140.7,  end: 150.0, file: 'vo_slide10.mp3' },
  { slide: 11, start: 150.0,  end: 165.4, file: 'vo_slide11.mp3' },  // covers slide 11+12
];

// Presentation scene start times (cumulative from dur array)
// Slide 1: 0s, Slide 2: 20s, Slide 3: 40s, Slide 4: 60s, Slide 5: 78s
// Slide 6: 103s, Slide 7: 121s, Slide 8: 143s, Slide 9: 163s
// Slide 10: 181s, Slide 11: 197s, Slide 12: 213s, End: 248s

console.log('Cutting VO.mp3 into per-slide clips...\n');

cuts.forEach(c => {
  const duration = (c.end - c.start).toFixed(2);
  const output = path.resolve(__dirname, c.file);
  const cmd = `"${ffmpegPath}" -y -i "${INPUT}" -ss ${c.start} -t ${duration} -acodec libmp3lame -q:a 2 "${output}"`;

  // Add 0.25s silence at the start of each clip
  const silenceCmd = `"${ffmpegPath}" -y -f lavfi -t 0.25 -i anullsrc=r=44100:cl=mono -i "${INPUT}" -ss ${c.start} -t ${duration} -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[out]" -map "[out]" -acodec libmp3lame -q:a 2 "${output}"`;
  console.log(`  Slide ${c.slide}: ${c.start}s → ${c.end}s (${duration}s + 0.25s delay) → ${c.file}`);
  execSync(silenceCmd, { stdio: 'pipe' });
});

console.log('\nDone! All clips saved to voice_over/');
console.log('\nTimestamp summary for fine-tuning:');
cuts.forEach(c => {
  const mins = Math.floor(c.start / 60);
  const secs = (c.start % 60).toFixed(1);
  const emin = Math.floor(c.end / 60);
  const esec = (c.end % 60).toFixed(1);
  console.log(`  Slide ${String(c.slide).padStart(2)}: ${mins}:${secs.padStart(4,'0')} → ${emin}:${esec.padStart(4,'0')}  (${(c.end-c.start).toFixed(1)}s)`);
});
