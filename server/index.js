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
const ORIGINS = (process.env.ORIGIN || `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const dataPath = path.resolve(__dirname, '../data');
const distPath = path.resolve(__dirname, '../client/dist');
const samplesPath = process.env.SAMPLES_DIR
  ? path.resolve(process.env.SAMPLES_DIR)
  : path.join(dataPath, 'audio');
const SOURCES = new Set(
  (process.env.SOURCES || 'demos,user')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);
const demosPath = path.join(dataPath, 'audio', 'demos');
const userPath = path.join(dataPath, 'audio', 'user');
const demosJsonPath = path.join(dataPath, 'demos.json');
const userSamplesJsonPath = path.join(dataPath, 'user-samples.json');

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

async function getSamples() {
  const samples = [];

  if (SOURCES.has('demos')) {
    try {
      const demosRaw = await readFile(demosJsonPath, 'utf-8');
      const demos = JSON.parse(demosRaw);
      samples.push(...demos.map(d => ({ ...d, file: `demos/${d.file}` })));
    } catch (err) {
      console.warn('No demos.json found, skipping repo demos');
    }
  }

  if (SOURCES.has('user')) {
    try {
      const userRaw = await readFile(userSamplesJsonPath, 'utf-8');
      const userSamples = JSON.parse(userRaw);
      samples.push(...userSamples.map(d => ({ ...d, file: `user/${d.file}` })));
    } catch {
      // user-samples.json doesn't exist, that's fine
    }
  }

  return samples;
}

// --- static serving ---

app.use('/samples', express.static(samplesPath));
app.use(express.static(distPath));

// --- API ---

app.get('/api/samples', async (_req, res) => {
  try {
    const samples = await getSamples();
    res.json(samples);
  } catch (err) {
    console.error('Failed to load samples:', err);
    res.status(500).json({ error: 'Failed to load samples' });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!SOURCES.has('user')) {
      return res.status(403).json({ error: 'Uploads disabled: user sounds source not enabled' });
    }

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
    const existing = await getSamples();
    const collision = existing.find((s) => s.id === slug);

    // Write uploaded file to temp path for ffmpeg
    const tmpInput = path.join(userPath, `${slug}.tmp`);
    const outputPath = path.join(userPath, `${slug}.mp3`);

    await mkdir(userPath, { recursive: true });

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
      file: `user/${slug}.mp3`,
      color,
      emoji,
      tags,
    };

    // Update user-samples.json (without the user/ prefix)
    const userEntry = { ...entry, file: `${slug}.mp3` };
    let userSamples = [];
    try {
      const userRaw = await readFile(userSamplesJsonPath, 'utf-8');
      userSamples = JSON.parse(userRaw);
    } catch {
      // user-samples.json doesn't exist yet
    }
    if (userSamples.find((s) => s.id === slug)) {
      userSamples = userSamples.map((s) => (s.id === slug ? userEntry : s));
    } else {
      userSamples.push(userEntry);
    }
    await writeFile(userSamplesJsonPath, JSON.stringify(userSamples, null, 2), 'utf-8');

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
  console.log(`Sources: ${[...SOURCES].join(', ')}`);
});
