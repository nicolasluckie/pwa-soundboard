import express from 'express';
import multer from 'multer';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, unlink, access, readFile } from 'fs/promises';
import { createHash } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, soundsCol, assetsCol } from './db.js';

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
const audioPath = path.join(dataPath, 'audio');
const iconsPath = path.join(dataPath, 'icons');
const SOURCES = new Set(
  (process.env.SOURCES || 'demo,user')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

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

function baseSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function generateUniqueSlug(name, excludeSlug = null) {
  const base = baseSlug(name);
  if (!base || base.includes('..') || base.includes('/')) return '';
  let slug = base;
  let counter = 1;
  while (true) {
    const existing = await soundsCol().findOne({ slug });
    if (!existing || existing.slug === excludeSlug) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
}

// --- static serving ---

app.use('/audio', express.static(audioPath));
app.use('/icons', express.static(iconsPath));
app.use(express.static(distPath));

// --- API ---

app.get('/api/samples', async (_req, res) => {
  try {
    const sourceFilter = [...SOURCES];
    const pipeline = [
      { $match: { source: { $in: sourceFilter } } },
      {
        $lookup: {
          from: 'assets',
          localField: 'asset_id',
          foreignField: '_id',
          as: 'asset',
        },
      },
      { $unwind: '$asset' },
      {
        $project: {
          _id: 0,
          id: '$slug',
          name: 1,
          file: { $concat: ['$slug', '.mp3'] },
          color: 1,
          tags: 1,
          emoji: {
            $cond: [{ $eq: ['$asset.type', 'emoji'] }, '$asset.value', '$$REMOVE'],
          },
          icon: {
            $cond: [
              { $eq: ['$asset.type', 'custom'] },
              { $concat: ['/icons/', '$asset.value'] },
              '$$REMOVE',
            ],
          },
        },
      },
    ];
    const samples = await soundsCol().aggregate(pipeline).toArray();
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
    if (!SOURCES.has('user')) {
      return res.status(403).json({ error: 'Uploads disabled: user sounds source not enabled' });
    }

    const audioFile = req.files?.file?.[0];
    if (!audioFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const requestedSlug = req.body.slug ? baseSlug(req.body.slug) : null;
    const slug = requestedSlug || await generateUniqueSlug(name);
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

    await mkdir(audioPath, { recursive: true });

    const tmpInput = path.join(audioPath, `${slug}.tmp`);
    const outputPath = path.join(audioPath, `${slug}.mp3`);

    await writeFile(tmpInput, audioFile.buffer);

    try {
      await execFileAsync('ffmpeg', [
        '-y', '-i', tmpInput,
        '-filter:a', 'loudnorm=I=-16:TP=-1.5:LRA=11',
        '-vn',
        outputPath,
      ]);
    } finally {
      await unlink(tmpInput).catch((e) => console.warn('Failed to clean up temp file:', e.message));
    }

    try {
      await access(outputPath);
    } catch {
      return res.status(500).json({ error: 'ffmpeg conversion failed' });
    }

    // Determine asset: custom icon or emoji
    const iconFile = req.files?.icon?.[0];
    let assetId;
    let iconPath = null;

    if (iconFile) {
      await mkdir(iconsPath, { recursive: true });
      const iconFileName = `${slug}.webp`;
      const iconOutputPath = path.join(iconsPath, iconFileName);
      const tmpIconInput = path.join(iconsPath, `${slug}.tmp`);
      await writeFile(tmpIconInput, iconFile.buffer);
      try {
        await execFileAsync('ffmpeg', ['-y', '-i', tmpIconInput, '-vf', 'scale=\'min(256,iw)\':-1', iconOutputPath]);
      } finally {
        await unlink(tmpIconInput).catch(() => {});
      }
      const iconBytes = await readFile(iconOutputPath);
      const fileHash = createHash('sha256').update(iconBytes).digest('hex');

      const existing = await assetsCol().findOne({ file_hash: fileHash });
      if (existing) {
        assetId = existing._id;
        iconPath = `/icons/${existing.value}`;
      } else {
        const assetDoc = { type: 'custom', value: iconFileName, file_hash: fileHash };
        const { insertedId } = await assetsCol().insertOne(assetDoc);
        assetId = insertedId;
        iconPath = `/icons/${iconFileName}`;
      }
    } else {
      const existing = await assetsCol().findOne({ type: 'emoji', value: emoji });
      if (existing) {
        assetId = existing._id;
      } else {
        const { insertedId } = await assetsCol().insertOne({ type: 'emoji', value: emoji });
        assetId = insertedId;
      }
    }

    await soundsCol().updateOne(
      { slug },
      { $set: { name, slug, source: 'user', color, tags, asset_id: assetId } },
      { upsert: true }
    );

    const entry = {
      id: slug,
      name,
      file: `${slug}.mp3`,
      color,
      tags,
      ...(iconPath ? { icon: iconPath } : { emoji }),
    };

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

async function autoSeedIfEmpty() {
  const count = await soundsCol().countDocuments();
  if (count > 0) return;
  console.log('🌱 Empty database detected — seeding demo sounds...');
  try {
    const { run } = await import('./migrate-to-mongo.js');
    await run();
  } catch (err) {
    console.warn('⚠️  Auto-seed failed (non-fatal):', err.message);
  }
}

async function start() {
  await connectDB();
  await mkdir(audioPath, { recursive: true });
  await mkdir(iconsPath, { recursive: true });
  await autoSeedIfEmpty();
  app.listen(Number(PORT), HOST, () => {
    console.log(`PWA Soundboard running at http://${HOST}:${PORT}`);
    console.log(`Sources: ${[...SOURCES].join(', ')}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
