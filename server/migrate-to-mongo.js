#!/usr/bin/env node
/**
 * Migration script: flat JSON + filesystem → MongoDB
 *
 * - Reads demos.json and user_data.json
 * - Upserts sound + asset documents into MongoDB
 * - Moves audio files from data/audio/demos/ and data/audio/user/ → data/audio/
 * - Moves icon files from data/audio/icons/demos/ and data/audio/icons/user/ → data/icons/
 * - Idempotent: safe to re-run
 *
 * Usage:
 *   npm run migrate            (from repo root or server/)
 *   MONGODB_URI=mongodb://... DATA_DIR=/data npm run migrate
 */

import { MongoClient } from 'mongodb';
import { readFile, rename, mkdir, access } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/soundboard';
const DB_NAME = new URL(uri).pathname.slice(1) || 'soundboard';

const dataPath = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '../data');

const legacyAudioDemos = path.join(dataPath, 'audio', 'demos');
const legacyAudioUser  = path.join(dataPath, 'audio', 'user');
const legacyIconsDemos = path.join(dataPath, 'audio', 'icons', 'demos');
const legacyIconsUser  = path.join(dataPath, 'audio', 'icons', 'user');
const newAudioPath     = path.join(dataPath, 'audio');
const newIconsPath     = path.join(dataPath, 'icons');

const demosJsonPath     = path.join(dataPath, 'demos.json');
const userDataJsonPath  = path.join(dataPath, 'user_data.json');

async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function moveFile(src, dest) {
  if (!(await fileExists(src))) return false;
  if (await fileExists(dest)) {
    console.log(`  ↳ already moved: ${path.basename(dest)}`);
    return false;
  }
  await rename(src, dest);
  console.log(`  ↳ moved: ${path.basename(src)} → ${path.relative(dataPath, dest)}`);
  return true;
}

async function upsertAsset(assetsCol, doc) {
  const filter = doc.type === 'emoji'
    ? { type: 'emoji', value: doc.value }
    : { type: 'custom', value: doc.value };
  const result = await assetsCol.findOneAndUpdate(
    filter,
    { $setOnInsert: doc },
    { upsert: true, returnDocument: 'after' }
  );
  return result._id;
}

async function upsertSound(soundsCol, doc) {
  await soundsCol.updateOne(
    { slug: doc.slug },
    { $set: doc },
    { upsert: true }
  );
}

async function migrateSounds(soundsCol, assetsCol, sounds, source, legacyAudioDir, legacyIconsDir) {
  let migrated = 0;
  for (const sound of sounds) {
    const slug = sound.id;
    const emoji = sound.emoji || '🔊';

    // Determine asset
    let assetDoc;
    let iconFilename = null;

    if (sound.icon) {
      // icon path is like /icons/user/bubbles.png or /icons/demos/bruh_icon.webp
      iconFilename = path.basename(sound.icon);
      assetDoc = { type: 'custom', value: iconFilename };
    } else {
      assetDoc = { type: 'emoji', value: emoji };
    }

    const assetId = await upsertAsset(assetsCol, assetDoc);

    await upsertSound(soundsCol, {
      slug,
      name: sound.name,
      source,
      color: sound.color || '#00d4ff',
      tags: sound.tags || [],
      asset_id: assetId,
    });

    // Move audio file
    const audioFilename = path.basename(sound.file); // e.g. boing.mp3
    const srcAudio = path.join(legacyAudioDir, audioFilename);
    const destAudio = path.join(newAudioPath, audioFilename);
    await moveFile(srcAudio, destAudio);

    // Move icon file
    if (iconFilename) {
      const srcIcon = path.join(legacyIconsDir, iconFilename);
      const destIcon = path.join(newIconsPath, iconFilename);
      await moveFile(srcIcon, destIcon);
    }

    migrated++;
  }
  return migrated;
}

async function run() {
  console.log('🔌 Connecting to MongoDB…');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(DB_NAME);
  const soundsCol = db.collection('sounds');
  const assetsCol = db.collection('assets');

  console.log('📐 Ensuring indexes…');
  await soundsCol.createIndex({ slug: 1 }, { unique: true });
  await assetsCol.createIndex({ file_hash: 1 }, { unique: true, sparse: true });

  console.log('📁 Ensuring target directories…');
  await mkdir(newAudioPath, { recursive: true });
  await mkdir(newIconsPath, { recursive: true });

  let total = 0;

  // --- Demos ---
  try {
    const raw = await readFile(demosJsonPath, 'utf-8');
    const demos = JSON.parse(raw);
    console.log(`\n🎵 Migrating ${demos.length} demo sound(s)…`);
    const n = await migrateSounds(soundsCol, assetsCol, demos, 'demo', legacyAudioDemos, legacyIconsDemos);
    total += n;
    console.log(`   ✅ ${n} demo sound(s) upserted`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('   ⚠️  demos.json not found, skipping');
    } else {
      throw err;
    }
  }

  // --- User sounds ---
  try {
    const raw = await readFile(userDataJsonPath, 'utf-8');
    const userSounds = JSON.parse(raw);
    console.log(`\n🎵 Migrating ${userSounds.length} user sound(s)…`);
    const n = await migrateSounds(soundsCol, assetsCol, userSounds, 'user', legacyAudioUser, legacyIconsUser);
    total += n;
    console.log(`   ✅ ${n} user sound(s) upserted`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('   ⚠️  user_data.json not found, skipping');
    } else {
      throw err;
    }
  }

  await client.close();
  console.log(`\n🏁 Migration complete — ${total} sound(s) processed`);
}

export { run };

// Run directly when executed as a script (not imported as a module)
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  run().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
