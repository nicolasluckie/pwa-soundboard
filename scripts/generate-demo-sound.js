import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleRate = 44100;
const duration = 0.25;
const freq = 880;
const amplitude = 0.5;
const numSamples = Math.floor(sampleRate * duration);
const buffer = new Int16Array(numSamples);

for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  const envelope = 1 - i / numSamples;
  buffer[i] = Math.sin(2 * Math.PI * freq * t) * amplitude * envelope * 32767;
}

const wavHeader = Buffer.alloc(44);
const dataSize = numSamples * 2;

wavHeader.write('RIFF', 0);
wavHeader.writeUInt32LE(36 + dataSize, 4);
wavHeader.write('WAVE', 8);
wavHeader.write('fmt ', 12);
wavHeader.writeUInt32LE(16, 16);
wavHeader.writeUInt16LE(1, 20);
wavHeader.writeUInt16LE(1, 22);
wavHeader.writeUInt32LE(sampleRate, 24);
wavHeader.writeUInt32LE(sampleRate * 2, 28);
wavHeader.writeUInt16LE(2, 32);
wavHeader.writeUInt16LE(16, 34);
wavHeader.write('data', 36);
wavHeader.writeUInt32LE(dataSize, 40);

const dataBuffer = Buffer.from(buffer.buffer);
const outPath = path.resolve(__dirname, '../client/public/samples/demo-beep.wav');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, Buffer.concat([wavHeader, dataBuffer]));

console.log(`Generated demo sound: ${outPath}`);
