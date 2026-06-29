import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST   = process.env.HOST   || '127.0.0.1';
const PORT   = process.env.PORT   || 3000;
const ORIGIN = process.env.ORIGIN || `http://${HOST}:${PORT}`;

const distPath = path.resolve(__dirname, '../client/dist');
const samplesPath = process.env.SAMPLES_DIR
  ? path.resolve(process.env.SAMPLES_DIR)
  : path.join(distPath, 'samples');

const app = express();

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

app.use((req, res, next) => {
  const origin = req.headers['origin'];
  if (!SAFE_METHODS.has(req.method) && origin && origin !== ORIGIN) {
    res.status(403).json({ error: 'Forbidden: origin mismatch' });
    return;
  }
  next();
});

app.use('/samples', express.static(samplesPath));
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(Number(PORT), HOST, () => {
  console.log(`PWA Soundboard running at http://${HOST}:${PORT}`);
});
