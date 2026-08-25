/**
 * Turns the downloaded synthetic faces into a structured reference gallery.
 *
 * The faces are GAN-generated (thispersondoesnotexist.com) — no real person is depicted.
 * Each identity gets:
 *   gallery/<slug>/01.jpg    enrolled at seed time
 *   probes/<slug>.jpg        a re-cropped, re-encoded copy used as a live probe
 *
 * The probe is a genuinely different image file — different crop, different scale,
 * different JPEG quantisation — so a match is the recogniser doing real work, not a
 * byte-for-byte comparison.
 *
 * Run once:  node src/seed/reference-galleries/prepare-faces.js
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GALLERY = path.join(HERE, 'faces/gallery');
const PROBES = path.join(HERE, 'faces/probes');

// Which seeded people get an enrolled face. Order matches synth-1..8.
export const FACE_IDENTITIES = [
  'Marcus Vale',
  'Dmitri Sokolov',
  'Elena Rask',
  'Tommy Nguyen',
  'Iris Delacroix',
  'Victor Lindqvist',
  'Nadia Brandt',
  'Jonas Kerr',
];

export const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

async function main() {
  const sources = (await fs.readdir(path.join(HERE, 'faces')))
    .filter((f) => /^synth-\d+\.jpg$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

  if (!sources.length) {
    console.error('No synth-*.jpg found in reference-galleries/faces/. Nothing to prepare.');
    process.exitCode = 1;
    return;
  }

  await fs.mkdir(GALLERY, { recursive: true });
  await fs.mkdir(PROBES, { recursive: true });

  for (const [i, name] of FACE_IDENTITIES.entries()) {
    const source = sources[i];
    if (!source) {
      console.warn(`No image for ${name} — only ${sources.length} source images available.`);
      continue;
    }

    const slug = slugify(name);
    const buffer = await fs.readFile(path.join(HERE, 'faces', source));
    const { width, height } = await sharp(buffer).metadata();

    await fs.mkdir(path.join(GALLERY, slug), { recursive: true });
    await sharp(buffer).resize(512).jpeg({ quality: 92 }).toFile(path.join(GALLERY, slug, '01.jpg'));

    // Probe: tighter crop, smaller, harsher compression. Same identity, different image.
    const inset = Math.round(Math.min(width, height) * 0.12);
    await sharp(buffer)
      .extract({
        left: inset,
        top: Math.round(inset * 0.7),
        width: width - inset * 2,
        height: height - Math.round(inset * 1.4),
      })
      .resize(384)
      .jpeg({ quality: 78 })
      .toFile(path.join(PROBES, `${slug}.jpg`));

    console.log(`${name.padEnd(18)} → gallery/${slug}/01.jpg + probes/${slug}.jpg`);
  }

  // The originals are the raw download; the prepared copies are what the app uses.
  for (const source of sources) await fs.unlink(path.join(HERE, 'faces', source));
  console.log(`\nPrepared ${FACE_IDENTITIES.length} identities. Raw downloads removed.`);
}

// pathToFileURL, not string surgery — a Windows drive letter breaks naive comparison.
if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
