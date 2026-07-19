import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outDir = path.join(root, 'public', 'audio');
await mkdir(outDir, {recursive: true});

const sampleRate = 48000;
const seconds = 3;
const channels = 2;
const frames = sampleRate * seconds;
const samples = new Int16Array(frames * channels);
let seed = 9137;
const noise = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed / 2147483647) * 2 - 1;
};
const smooth = (x) => x * x * (3 - 2 * x);
const tone = (t, start, frequency, decay, level) => {
  if (t < start) return 0;
  const age = t - start;
  const env = Math.exp(-age * decay);
  return level * env * (
    Math.sin(2 * Math.PI * frequency * age) +
    .42 * Math.sin(2 * Math.PI * frequency * 2.01 * age) +
    .18 * Math.sin(2 * Math.PI * frequency * 3.98 * age)
  );
};

for (let i = 0; i < frames; i++) {
  const t = i / sampleRate;
  const whooshPos = Math.max(0, Math.min(1, (t - .08) / .88));
  const whooshEnv = whooshPos > 0 && whooshPos < 1 ? Math.sin(Math.PI * whooshPos) ** 2 : 0;
  const whoosh = noise() * whooshEnv * .065 * (0.3 + smooth(whooshPos) * .7);
  const signal =
    whoosh +
    tone(t, .38, 392, 4.1, .12) +
    tone(t, .67, 523.25, 3.6, .13) +
    tone(t, 1.48, 783.99, 4.6, .07);
  const fade = t > 2.62 ? Math.max(0, (3 - t) / .38) : 1;
  samples[i * 2] = Math.round(Math.max(-1, Math.min(1, signal * fade)) * 32767);
  samples[i * 2 + 1] = Math.round(Math.max(-1, Math.min(1, (signal * .97 + whoosh * .12) * fade)) * 32767);
}

const dataBytes = samples.byteLength;
const buffer = Buffer.alloc(44 + dataBytes);
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataBytes, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(channels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * channels * 2, 28);
buffer.writeUInt16LE(channels * 2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(dataBytes, 40);
Buffer.from(samples.buffer).copy(buffer, 44);
await writeFile(path.join(outDir, 'qiyu-title.wav'), buffer);
console.log('Generated 3-second title sound design.');
