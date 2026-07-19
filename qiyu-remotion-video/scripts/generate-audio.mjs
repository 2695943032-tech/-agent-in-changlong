import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outDir = path.join(root, 'public', 'audio');
await mkdir(outDir, {recursive: true});

const sampleRate = 44100;
const seconds = 76;
const channels = 2;
const samples = sampleRate * seconds;
const data = new Int16Array(samples * channels);

const chords = [
  [130.81, 164.81, 196.0, 246.94],
  [110.0, 130.81, 164.81, 196.0],
  [87.31, 130.81, 174.61, 220.0],
  [98.0, 146.83, 196.0, 220.0],
];

const smooth = (x) => x * x * (3 - 2 * x);
let seed = 8217;
const noise = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed / 2147483647) * 2 - 1;
};

for (let i = 0; i < samples; i++) {
  const t = i / sampleRate;
  const chordIndex = Math.floor(t / 8) % chords.length;
  const local = (t % 8) / 8;
  const fade = smooth(Math.min(local * 6, 1)) * smooth(Math.min((1 - local) * 6, 1));
  let pad = 0;
  chords[chordIndex].forEach((freq, index) => {
    pad += Math.sin(Math.PI * 2 * freq * t + index * 0.37) * (0.028 / (index + 1));
  });
  const beat = t * 100 / 60;
  const beatPhase = beat % 1;
  const kick = Math.sin(Math.PI * 2 * (55 - beatPhase * 22) * t) * Math.exp(-beatPhase * 18) * 0.055;
  const eighth = (beat * 2) % 1;
  const tick = noise() * Math.exp(-eighth * 42) * 0.012;
  const shimmer = Math.sin(Math.PI * 2 * 523.25 * t) * Math.sin(Math.PI * 2 * 0.08 * t) * 0.006;
  const master = Math.min(1, t / 2, (seconds - t) / 2);
  const value = Math.max(-0.88, Math.min(0.88, (pad * fade + kick + tick + shimmer) * master));
  const left = value * (0.98 + Math.sin(t * 0.37) * 0.02);
  const right = value * (0.98 + Math.cos(t * 0.31) * 0.02);
  data[i * 2] = Math.round(left * 32767);
  data[i * 2 + 1] = Math.round(right * 32767);
}

const byteRate = sampleRate * channels * 2;
const blockAlign = channels * 2;
const buffer = Buffer.alloc(44 + data.byteLength);
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + data.byteLength, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(channels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(byteRate, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(data.byteLength, 40);
Buffer.from(data.buffer).copy(buffer, 44);

await writeFile(path.join(outDir, 'qiyu-ambient.wav'), buffer);
console.log('Generated original ambient soundtrack.');
