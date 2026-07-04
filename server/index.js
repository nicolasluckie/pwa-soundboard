import express from 'express';
import multer from 'multer';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, mkdir, unlink, rename, access } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execFileAsync = promisify(execFile);

const HOST   = process.env.HOST   || '127.0.0.1';
const PORT   = process.env.PORT   || 3000;
const ORIGIN_ENV = process.env.ORIGIN;
const ORIGINS = ORIGIN_ENV
  ? ORIGIN_ENV.split(',').map((o) => o.trim()).filter(Boolean)
  : [];
const ORIGIN_CHECK_ENABLED = ORIGINS.length > 0;
if (!ORIGIN_CHECK_ENABLED) {
  console.warn('⚠️  ORIGIN not set — origin check disabled. Set ORIGIN in production to prevent CSRF.');
}

const dataPath = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '../data');
const distPath = path.resolve(__dirname, '../client/dist');
const samplesPath = path.join(dataPath, 'audio');
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

const jsonMutex = { locked: false, queue: [] };
function acquireMutex(mutex) {
  if (!mutex.locked) {
    mutex.locked = true;
    return Promise.resolve();
  }
  return new Promise((resolve) => mutex.queue.push(resolve));
}
function releaseMutex(mutex) {
  const next = mutex.queue.shift();
  if (next) {
    next();
  } else {
    mutex.locked = false;
  }
}

const app = express();

// --- middleware ---

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

app.use((req, res, next) => {
  if (!ORIGIN_CHECK_ENABLED) return next();
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
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (slug.includes('..') || slug.includes('/')) return '';
  return slug;
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

const iconsPath = path.join(dataPath, 'audio', 'icons');
app.use('/samples', express.static(samplesPath));
app.use('/icons', express.static(iconsPath));
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

const ALLOWED_EXTENSIONS = new Set([
  'mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma',
  'mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    const isAudioOrVideo = file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/');
    if (isAudioOrVideo && ext && ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio and video files are allowed.'));
    }
  },
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
      try { await unlink(tmpInput); } catch (e) { console.warn('Failed to clean up temp file:', e.message); }
    }

    try {
      await access(outputPath);
    } catch {
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
    await acquireMutex(jsonMutex);
    try {
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
      const tmpJson = `${userSamplesJsonPath}.tmp`;
      await writeFile(tmpJson, JSON.stringify(userSamples, null, 2), 'utf-8');
      await rename(tmpJson, userSamplesJsonPath);
    } finally {
      releaseMutex(jsonMutex);
    }

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

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError || err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(Number(PORT), HOST, async () => {
  if (SOURCES.has('user')) {
    await mkdir(userPath, { recursive: true });
    try {
      await access(userSamplesJsonPath);
    } catch {
      await writeFile(userSamplesJsonPath, '[]', 'utf-8');
    }
  }
  console.log(`PWA Soundboard running at http://${HOST}:${PORT}`);
  console.log(`Sources: ${[...SOURCES].join(', ')}`);
});
