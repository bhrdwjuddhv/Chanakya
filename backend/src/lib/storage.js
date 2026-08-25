import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ponytail: local disk only. Cloudinary goes behind the same two functions when
// CLOUDINARY_* is set and someone actually needs remote storage.
export const UPLOAD_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../uploads',
);

export async function saveFile(buffer, filename) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const safe = `${Date.now()}-${filename.replace(/[^\w.\-]/g, '_')}`;
  await fs.writeFile(path.join(UPLOAD_DIR, safe), buffer);
  return { storageUrl: `/uploads/${safe}`, absolutePath: path.join(UPLOAD_DIR, safe) };
}

export function absolutePath(storageUrl) {
  return path.join(UPLOAD_DIR, path.basename(storageUrl));
}

export const readFile = (storageUrl) => fs.readFile(absolutePath(storageUrl));
