/**
 * SMOKE-TEST FIXTURE — not a demo gallery, and not enrolled by the seed.
 *
 * Generates procedural spiral ridge images to exercise the AFIS pipeline end to end:
 * SourceAFIS extracts ~100 real minutiae from each and returns real match scores, so this
 * proves /extract and /match work. When gallery and probe crops align, a same-finger pair
 * scores 20-35 against a runner-up of 1-3.
 *
 * It is NOT a substitute for a real dataset, and it is deliberately not wired into the
 * seed. Measured behaviour across the 8 generated identities: only about half of probes
 * rank their own finger first, and cross-identity false matches occur (one probe matched
 * a different identity at 15.7). The cause is that every print comes from the same
 * generator, so they share global ridge topology in a way real fingers do not. Tuning
 * density and topology made it worse, not better.
 *
 * For a working fingerprint gallery, drop a real dataset into
 *   fingerprints/gallery/<person-slug>/<finger>.png
 * SOCOFing (Kaggle) and NIST SD302/SD4 both work. The seed enrols whatever is there.
 *
 * Output goes to fingerprints/smoke-test/ so it can never be mistaken for the gallery.
 *
 * Run:  node src/seed/reference-galleries/generate-fingerprints.js
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GALLERY = path.join(HERE, 'fingerprints/smoke-test/gallery');
const PROBES = path.join(HERE, 'fingerprints/smoke-test/probes');

// Rendered large in "finger space", then cropped down. The probe is derived by
// transforming the SAME canonical render, so its minutiae move with the finger — which
// is what a second impression of one finger actually looks like to a matcher.
const CANVAS = 560;
const SIZE = 400;

// Same people as the face gallery, so a case can have both biometrics on one person.
export const FINGERPRINT_IDENTITIES = [
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

/** Deterministic PRNG so an identity's print is the same on every run. */
function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * One canonical print in finger space. Three things create the minutiae a matcher needs:
 *  - a spiral flow around a core, plus a second singular point where flows collide
 *  - a smooth low-frequency phase warp, which makes ridges converge and fork (bifurcations)
 *  - small ridge breaks, which sever a ridge and leave an ending
 */
function renderCanonical(seed) {
  const random = rng(seed);
  const cx = CANVAS / 2 + (random() - 0.5) * 40;
  const cy = CANVAS / 2 + (random() - 0.5) * 40;
  // Tuned empirically against SourceAFIS: this yields 56-100 minutiae per print across
  // every seed. Coarser ridge fields produced under 10, which the extractor rightly rejects.
  const frequency = 1.15 + random() * 0.1;
  const twist = 6 + random() * 7;
  const skew = 0.75 + random() * 0.4;
  const deltaX = cx + 80 + random() * 50;
  const deltaY = cy + 70 + random() * 50;

  // Smooth warp components — these bend the ridge flow and produce forks.
  const warp = Array.from({ length: 5 }, () => ({
    ax: (random() - 0.5) * 0.06,
    ay: (random() - 0.5) * 0.06,
    fx: 0.006 + random() * 0.022,
    fy: 0.006 + random() * 0.022,
    phase: random() * Math.PI * 2,
  }));

  // Ridge breaks — each leaves a pair of ridge endings.
  const breaks = Array.from({ length: 240 }, () => ({
    x: cx + (random() - 0.5) * 330,
    y: cy + (random() - 0.5) * 350,
    r: 2 + random() * 3.5,
  }));

  // Ridge islands — isolated dots, another common minutia type.
  const dots = Array.from({ length: 110 }, () => ({
    x: cx + (random() - 0.5) * 330,
    y: cy + (random() - 0.5) * 350,
    r: 1.5 + random() * 2,
  }));

  const pixels = Buffer.alloc(CANVAS * CANVAS);

  for (let y = 0; y < CANVAS; y++) {
    for (let x = 0; x < CANVAS; x++) {
      const dx = x - cx;
      const dy = (y - cy) * skew;
      const radius = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const d2 = Math.hypot(x - deltaX, y - deltaY);

      let phase = frequency * radius + twist * angle + 0.3 * frequency * d2;
      for (const w of warp) {
        phase += w.ax * CANVAS * Math.sin(w.fx * x + w.phase) + w.ay * CANVAS * Math.cos(w.fy * y + w.phase);
      }

      // Logistic curve sharpens the sinusoid into ridge/valley bands with crisp edges,
      // which is what the extractor's binarisation expects.
      let value = 1 / (1 + Math.exp(-(0.5 * Math.sin(phase)) * 20));

      for (const b of breaks) {
        if (Math.hypot(x - b.x, y - b.y) < b.r) value = 1; // white gap severs the ridge
      }
      for (const d of dots) {
        if (Math.hypot(x - d.x, y - d.y) < d.r) value = 0; // dark island
      }

      // Elliptical finger mask, fading out like a rolled impression.
      const edge = Math.hypot((x - CANVAS / 2) / (CANVAS * 0.40), (y - CANVAS / 2) / (CANVAS * 0.46));
      if (edge > 1) value = 1;
      else if (edge > 0.85) value += ((edge - 0.85) / 0.15) * (1 - value);

      pixels[y * CANVAS + x] = Math.max(0, Math.min(255, Math.round(value * 255)));
    }
  }
  return pixels;
}

const canonical = (pixels) =>
  sharp(pixels, { raw: { width: CANVAS, height: CANVAS, channels: 1 } });

const centre = Math.round((CANVAS - SIZE) / 2);

/** Enrolled impression: straight centre crop. */
const galleryImage = (pixels) =>
  canonical(pixels)
    .extract({ left: centre, top: centre, width: SIZE, height: SIZE })
    .normalise()
    .png()
    .toBuffer();

/**
 * Probe: the same finger presented differently — rotated, shifted, softer.
 *
 * The crop is centred on the ROTATED image, then nudged. Cropping at a fixed offset from
 * the original centre silently drifts once sharp expands the canvas to fit the rotation,
 * which leaves gallery and probe covering different parts of the finger — and a matcher
 * comparing two different regions of one finger correctly reports no match.
 */
async function probeImage(pixels) {
  const rotated = await canonical(pixels).rotate(6, { background: '#ffffff' }).png().toBuffer();
  const { width, height } = await sharp(rotated).metadata();
  return sharp(rotated)
    .extract({
      left: Math.round((width - SIZE) / 2) + 10,
      top: Math.round((height - SIZE) / 2) - 6,
      width: SIZE,
      height: SIZE,
    })
    .blur(0.4)
    .normalise()
    .png()
    .toBuffer();
}

async function main() {
  await fs.mkdir(GALLERY, { recursive: true });
  await fs.mkdir(PROBES, { recursive: true });

  for (const [i, name] of FINGERPRINT_IDENTITIES.entries()) {
    const slug = slugify(name);
    const seed = 1000 + i * 977;

    const pixels = renderCanonical(seed);

    await fs.mkdir(path.join(GALLERY, slug), { recursive: true });
    await fs.writeFile(path.join(GALLERY, slug, 'right-index.png'), await galleryImage(pixels));
    await fs.writeFile(path.join(PROBES, `${slug}.png`), await probeImage(pixels));

    console.log(`${name.padEnd(18)} → smoke-test/gallery/${slug}/ + smoke-test/probes/${slug}.png`);
  }

  console.log(`\nGenerated ${FINGERPRINT_IDENTITIES.length} synthetic identities.`);
  console.log('These are NOT real fingerprints — see the note at the top of this file.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
