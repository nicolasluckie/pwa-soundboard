import express from 'express';
import multer from 'multer';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile, readdir, writeFile, mkdir, unlink, rename, access } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml, parseDocument, Document } from 'yaml';

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
const iconsPath = path.join(dataPath, 'icons');
const configYamlPath = path.join(dataPath, 'sounds.yaml');
// Fallback demo content used only if data/sounds.yaml doesn't exist yet, so a
// fresh clone still shows a couple of working sounds out of the box.
const configExampleYamlPath = path.join(dataPath, 'sounds.example.yaml');

const yamlMutex = { locked: false, queue: [] };
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

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

// Loads and validates data/sounds.yaml — the single sound source. This file
// is both hand-editable (for bulk adds at your desk) and written to by the
// upload UI (for on-the-go additions), so entries are validated defensively:
// anything invalid or referencing a missing file is skipped with a warning
// instead of breaking the whole endpoint. Re-read on every call, so editing
// the file and re-fetching (no restart needed) is all that's required to
// add/update/remove sounds.
//
// If data/sounds.yaml doesn't exist yet (e.g. a fresh clone), falls back to
// data/sounds.example.yaml so the app still shows a couple of demo sounds.
async function getConfigSamples() {
  let yamlPath = configYamlPath;
  let raw;
  try {
    raw = await readFile(configYamlPath, 'utf-8');
  } catch {
    // No personal sounds.yaml — try the committed example as a fallback so a
    // fresh clone still serves demo content out of the box.
    try {
      raw = await readFile(configExampleYamlPath, 'utf-8');
      yamlPath = configExampleYamlPath;
    } catch {
      return [];
    }
  }

  let parsed;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    console.warn(`⚠️  Failed to parse ${yamlPath}: ${err.message}`);
    return [];
  }

  const entries = Array.isArray(parsed?.sounds) ? parsed.sounds : [];
  const results = [];
  const seenIds = new Set();

  for (const entry of entries) {
    const id = typeof entry?.id === 'string' ? makeSlug(entry.id) : '';
    if (!id) {
      console.warn(`⚠️  ${yamlPath}: skipping entry with invalid/missing id`);
      continue;
    }
    if (seenIds.has(id)) {
      console.warn(`⚠️  ${yamlPath}: skipping duplicate id "${id}"`);
      continue;
    }

    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    if (!name) {
      console.warn(`⚠️  ${yamlPath}: skipping "${id}" — missing name`);
      continue;
    }

    const file = typeof entry.file === 'string' && entry.file.trim() ? entry.file.trim() : `${id}.mp3`;
    if (file.includes('..') || file.includes('/') || file.includes('\\')) {
      console.warn(`⚠️  ${yamlPath}: skipping "${id}" — invalid file path`);
      continue;
    }
    if (!(await fileExists(path.join(samplesPath, file)))) {
      console.warn(`⚠️  ${yamlPath}: skipping "${id}" — audio file not found (data/audio/${file})`);
      continue;
    }

    const result = {
      id,
      name,
      file,
      color: typeof entry.color === 'string' && entry.color.trim() ? entry.color.trim() : '#00d4ff',
      tags: Array.isArray(entry.tags) ? entry.tags.filter((t) => typeof t === 'string') : [],
    };

    const iconRef = typeof entry.icon === 'string' ? path.basename(entry.icon.trim()) : '';
    if (iconRef && (await fileExists(path.join(iconsPath, iconRef)))) {
      result.icon = `/icons/${iconRef}`;
    } else {
      if (iconRef) {
        console.warn(`⚠️  ${yamlPath}: "${id}" — icon file not found (data/icons/${iconRef}), falling back to emoji`);
      }
      result.emoji = typeof entry.emoji === 'string' && entry.emoji.trim() ? entry.emoji.trim() : '🔊';
    }

    seenIds.add(id);
    results.push(result);
  }

  return results;
}

async function getSamples() {
  return getConfigSamples();
}

// Returns a Map of icon filename -> number of sounds currently referencing it.
async function getIconUsageCounts() {
  const samples = await getSamples();
  const counts = new Map();
  for (const sample of samples) {
    if (sample.icon) {
      const filename = path.basename(sample.icon);
      counts.set(filename, (counts.get(filename) || 0) + 1);
    }
  }
  return counts;
}

// Atomically upserts a sound entry into data/sounds.yaml. If an entry with
// the same id already exists, it's replaced; otherwise the new entry is
// appended. Uses parseDocument so existing comments and formatting are
// preserved. If sounds.yaml doesn't exist yet, creates it. Must be called
// while holding yamlMutex to avoid concurrent-write races.
async function upsertSoundEntry(entry) {
  let doc;
  try {
    const raw = await readFile(configYamlPath, 'utf-8');
    doc = parseDocument(raw);
  } catch {
    doc = new Document({ sounds: [] });
  }

  let sounds = doc.get('sounds');
  if (!sounds) {
    doc.set('sounds', []);
    sounds = doc.get('sounds');
  }

  // Build a clean entry — omit emoji if icon is present (the reader falls
  // back to emoji only when icon is missing/invalid).
  const cleanEntry = { ...entry };
  if (cleanEntry.icon) delete cleanEntry.emoji;

  const idx = sounds.items.findIndex((node) => node.get('id') === entry.id);
  if (idx >= 0) {
    sounds.set(idx, cleanEntry);
  } else {
    sounds.add(cleanEntry);
  }

  const tmp = `${configYamlPath}.tmp`;
  await writeFile(tmp, doc.toString(), 'utf-8');
  await rename(tmp, configYamlPath);
}

// --- static serving ---

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

const ALLOWED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
const ALLOWED_IMAGE_MIMETYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

// Lists icons already on disk (data/icons/) so the upload UI can offer
// reusing one instead of uploading a duplicate.
app.get('/api/icons', async (_req, res) => {
  try {
    let files = [];
    try {
      files = await readdir(iconsPath);
    } catch {
      // icons dir doesn't exist yet — no icons to list
    }

    const usageCounts = await getIconUsageCounts();
    const icons = files
      .filter((f) => ALLOWED_IMAGE_EXTENSIONS.has(path.extname(f).slice(1).toLowerCase()))
      .map((filename) => ({
        filename,
        url: `/icons/${filename}`,
        usageCount: usageCounts.get(filename) || 0,
      }))
      .sort((a, b) => a.filename.localeCompare(b.filename));

    res.json(icons);
  } catch (err) {
    console.error('Failed to list icons:', err);
    res.status(500).json({ error: 'Failed to list icons' });
  }
});

app.delete('/api/icons/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const ext = path.extname(filename).slice(1).toLowerCase();
    if (filename !== req.params.filename || !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
      return res.status(400).json({ error: 'Invalid icon filename' });
    }

    const filePath = path.join(iconsPath, filename);
    if (!(await fileExists(filePath))) {
      return res.status(404).json({ error: 'Icon not found' });
    }

    const usageCounts = await getIconUsageCounts();
    if ((usageCounts.get(filename) || 0) > 0) {
      return res.status(409).json({ error: 'Icon is still used by one or more sounds' });
    }

    await unlink(filePath);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete icon:', err);
    res.status(500).json({ error: 'Failed to delete icon' });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    if (file.fieldname === 'icon') {
      if (ALLOWED_IMAGE_MIMETYPES.has(file.mimetype) && ext && ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid icon file type. Only PNG, JPG, GIF, and WebP images are allowed.'));
      }
      return;
    }

    const isAudioOrVideo = file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/');
    if (isAudioOrVideo && ext && ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio and video files are allowed.'));
    }
  },
});

app.post('/api/upload', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'icon', maxCount: 1 }]), async (req, res) => {
  try {
    const audioFile = req.files?.file?.[0];
    if (!audioFile) {
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
    const tmpInput = path.join(samplesPath, `${slug}.tmp`);
    const outputPath = path.join(samplesPath, `${slug}.mp3`);

    await mkdir(samplesPath, { recursive: true });

    // Write the uploaded buffer to a temp file
    const { buffer } = audioFile;
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
      file: `${slug}.mp3`,
      color,
      emoji,
      tags,
    };

    // Icon: either a freshly uploaded image (converted to WebP), or a
    // reference to an icon already in data/icons/ (picked from the library).
    const iconFile = req.files?.icon?.[0];
    const existingIconName = typeof req.body.existingIcon === 'string' ? req.body.existingIcon.trim() : '';

    if (iconFile) {
      await mkdir(iconsPath, { recursive: true });
      const tmpIconInput = path.join(iconsPath, `${slug}.tmp`);
      const iconFileName = `${slug}.webp`;
      const iconOutputPath = path.join(iconsPath, iconFileName);
      await writeFile(tmpIconInput, iconFile.buffer);
      try {
        await execFileAsync('ffmpeg', ['-y', '-i', tmpIconInput, '-vf', 'scale=\'min(256,iw)\':-1', iconOutputPath]);
      } finally {
        await unlink(tmpIconInput).catch(() => {});
      }
      entry.icon = `/icons/${iconFileName}`;
    } else if (existingIconName) {
      const iconFileName = path.basename(existingIconName);
      const ext = path.extname(iconFileName).slice(1).toLowerCase();
      if (iconFileName !== existingIconName || !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
        return res.status(400).json({ error: 'Invalid existing icon reference' });
      }
      if (!(await fileExists(path.join(iconsPath, iconFileName)))) {
        return res.status(400).json({ error: 'Selected icon no longer exists' });
      }
      entry.icon = `/icons/${iconFileName}`;
    }

    await acquireMutex(yamlMutex);
    try {
      await upsertSoundEntry(entry);
    } finally {
      releaseMutex(yamlMutex);
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
  const indexFile = path.join(distPath, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) {
      res.status(404).json({
        error: 'Client build not found. Run "npm run build --prefix client" or use the Vite dev server at http://localhost:5173',
      });
    }
  });
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError || err.message.includes('Invalid file type') || err.message.includes('Invalid icon file type')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(Number(PORT), HOST, async () => {
  await mkdir(samplesPath, { recursive: true });
  await mkdir(iconsPath, { recursive: true });
  if (!(await fileExists(configYamlPath))) {
    console.log(`ℹ️  No data/sounds.yaml found — using data/sounds.example.yaml as fallback`);
  }
  console.log(`PWA Soundboard running at http://${HOST}:${PORT}`);
});
