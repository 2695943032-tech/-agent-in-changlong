import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outDir = path.join(root, 'public', 'audio');
await mkdir(outDir, {recursive: true});

const sampleRate = 48000;
const seconds = 6;
const channels = 2;
const frames = sampleRate * seconds;
const samples = new Int16Array(frames * channels);
let seed = 73421;
let filteredNoise = 0;
const noise = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed / 2147483647) * 2 - 1;
};
const tone = (t, start, frequency, decay, level) => {
  if (t < start) return 0;
  const age = t - start;
  const env = Math.exp(-age * decay);
  return level * env * (
    Math.sin(2 * Math.PI * frequency * age) +
    .5 * Math.sin(2 * Math.PI * frequency * 2.01 * age) +
    .2 * Math.sin(2 * Math.PI * frequency * 3.98 * age)
  );
};

for (let i = 0; i < frames; i++) {
  const t = i / sampleRate;
  filteredNoise += .035 * (noise() - filteredNoise);

  const linePos = Math.max(0, Math.min(1, (t - .5) / 2.65));
  const lineEnv = linePos > 0 && linePos < 1 ? Math.sin(Math.PI * linePos) ** 2 : 0;
  const lineWhoosh = filteredNoise * lineEnv * .095;

  const flyPos = Math.max(0, Math.min(1, (t - 2.15) / 1.85));
  const flyEnv = flyPos > 0 && flyPos < 1 ? Math.sin(Math.PI * flyPos) : 0;
  const flyTone = Math.sin(2 * Math.PI * (520 + 720 * flyPos) * t) * flyEnv * .025;

  // 两次清晰的“噔、噔”：第一次沉一点，第二次更亮，落在补笔前后。
  const dingOne = tone(t, 3.72, 392, 5.5, .15) + tone(t, 3.72, 783.99, 7.2, .045);
  const dingTwo = tone(t, 4.12, 523.25, 5.8, .17) + tone(t, 4.12, 1046.5, 7.5, .055);
  const pad = .012 * Math.sin(2 * Math.PI * 130.81 * t) + .008 * Math.sin(2 * Math.PI * 196 * t);
  const signal = pad + lineWhoosh + flyTone + dingOne + dingTwo;
  const fade = t > 5.6 ? Math.max(0, (6 - t) / .4) : Math.min(1, t / .18);
  samples[i * 2] = Math.round(Math.max(-1, Math.min(1, signal * fade)) * 32767);
  samples[i * 2 + 1] = Math.round(Math.max(-1, Math.min(1, signal * .97)) * 32767);
}

const bytes = samples.byteLength;
const buffer = Buffer.alloc(44 + bytes);
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + bytes, 4);
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
buffer.writeUInt32LE(bytes, 40);
Buffer.from(samples.buffer).copy(buffer, 44);
await writeFile(path.join(outDir, 'qiyu-firefly-v3.wav'), buffer);
console.log('Generated aligned firefly sound design without final slash whoosh.');
