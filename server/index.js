import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const execFileAsync = promisify(execFile);

const HOST   = process.env.HOST   || '127.0.0.1';
const PORT   = process.env.PORT   || 3000;
const ORIGINS = (process.env.ORIGIN || `http://${HOST}:${PORT}`)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const dataPath = path.resolve(__dirname, '../data');
const distPath = path.resolve(__dirname, '../client/dist');
const samplesPath = process.env.SAMPLES_DIR
  ? path.resolve(process.env.SAMPLES_DIR)
  : path.join(dataPath, 'audio');
const samplesJsonPath = process.env.SAMPLES_JSON
  ? path.resolve(process.env.SAMPLES_JSON)
  : path.join(dataPath, 'samples.json');

const app = express();

// --- middleware ---

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

app.use((req, res, next) => {
  const origin = req.headers['origin'];
  if (!SAFE_METHODS.has(req.method) && origin && !ORIGINS.includes(origin)) {
    res.status(403).json({ error: 'Forbidden: origin mismatch' });
    return;
  }
  next();
});

app.use(express.json());

// --- helpers ---

function makeSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function readSamplesJson() {
  try {
    const raw = await readFile(samplesJsonPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeSamplesJson(data) {
  await writeFile(samplesJsonPath, JSON.stringify(data, null, 2), 'utf-8');
}

// --- static serving ---

app.use('/samples', express.static(samplesPath));
app.use(express.static(distPath));

// --- API ---

app.get('/api/samples', async (_req, res) => {
  try {
    const samples = await readSamplesJson();
    res.json(samples);
  } catch (err) {
    console.error('Failed to read samples.json:', err);
    res.status(500).json({ error: 'Failed to load samples' });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const slug = makeSlug(req.body.slug || name);
    if (!slug) {
      return res.status(400).json({ error: 'Invalid slug' });
    }

    const emoji = (req.body.emoji || '🔊').trim();
    const color = (req.body.color || '#00d4ff').trim();
    const tagsRaw = req.body.tags || 'meme';
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    // Check for slug collision
    const existing = await readSamplesJson();
    const collision = existing.find((s) => s.id === slug);

    // Write uploaded file to temp path for ffmpeg
    const tmpInput = path.join(samplesPath, `${slug}.tmp`);
    const outputPath = path.join(samplesPath, `${slug}.mp3`);

    await mkdir(samplesPath, { recursive: true });

    // Write the uploaded buffer to a temp file
    const { buffer } = req.file;
    await writeFile(tmpInput, buffer);

    // Normalize with ffmpeg
    try {
      await execFileAsync('ffmpeg', [
        '-y', '-i', tmpInput,
        '-filter:a', 'loudnorm=I=-16:TP=-1.5:LRA=11',
        '-vn',
        outputPath,
      ]);
    } finally {
      try { await unlink(tmpInput); } catch {}
    }

    if (!await readFile(outputPath).then(() => true).catch(() => false)) {
      return res.status(500).json({ error: 'ffmpeg conversion failed' });
    }

    // Build the sample entry
    const entry = {
      id: slug,
      name,
      file: `${slug}.mp3`,
      color,
      emoji,
      tags,
    };

    // Update samples.json
    let samples = await readSamplesJson();
    if (collision) {
      samples = samples.map((s) => (s.id === slug ? entry : s));
    } else {
      samples.push(entry);
    }
    await writeSamplesJson(samples);

    console.log(`✅ Added sample: ${name} (${slug})`);
    res.json({ success: true, sample: entry });
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// --- SPA fallback ---

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(Number(PORT), HOST, () => {
  console.log(`PWA Soundboard running at http://${HOST}:${PORT}`);
});
