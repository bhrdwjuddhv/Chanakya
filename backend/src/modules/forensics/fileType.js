/**
 * Magic-byte sniffing. The extension is a claim; the leading bytes are evidence.
 * A mismatch between the two is itself a forensic finding, which is why this exists
 * rather than trusting the mime type the browser sent.
 *
 * ponytail: a table of signatures, not the `file-type` package. We care about a dozen
 * formats an investigation actually sees.
 */

const SIGNATURES = [
  { type: 'png', mime: 'image/png', class: 'image', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: 'jpeg', mime: 'image/jpeg', class: 'image', bytes: [0xff, 0xd8, 0xff] },
  { type: 'gif', mime: 'image/gif', class: 'image', bytes: [0x47, 0x49, 0x46, 0x38] },
  { type: 'bmp', mime: 'image/bmp', class: 'image', bytes: [0x42, 0x4d] },
  { type: 'webp', mime: 'image/webp', class: 'image', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, also: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] } },
  { type: 'tiff', mime: 'image/tiff', class: 'image', bytes: [0x49, 0x49, 0x2a, 0x00] },
  { type: 'tiff', mime: 'image/tiff', class: 'image', bytes: [0x4d, 0x4d, 0x00, 0x2a] },
  { type: 'pdf', mime: 'application/pdf', class: 'document', bytes: [0x25, 0x50, 0x44, 0x46] },
  // DOCX/XLSX/PPTX are ZIP containers; the inner path disambiguates them.
  { type: 'zip', mime: 'application/zip', class: 'archive', bytes: [0x50, 0x4b, 0x03, 0x04] },
  { type: 'rar', mime: 'application/vnd.rar', class: 'archive', bytes: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07] },
  { type: '7z', mime: 'application/x-7z-compressed', class: 'archive', bytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] },
  { type: 'gzip', mime: 'application/gzip', class: 'archive', bytes: [0x1f, 0x8b] },
  // Executables matter: an .exe renamed to .jpg is the classic finding.
  { type: 'pe-executable', mime: 'application/vnd.microsoft.portable-executable', class: 'executable', bytes: [0x4d, 0x5a] },
  { type: 'elf-executable', mime: 'application/x-elf', class: 'executable', bytes: [0x7f, 0x45, 0x4c, 0x46] },
  { type: 'mach-o', mime: 'application/x-mach-binary', class: 'executable', bytes: [0xcf, 0xfa, 0xed, 0xfe] },
  { type: 'sqlite', mime: 'application/vnd.sqlite3', class: 'data', bytes: [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65] },
  { type: 'mp4', mime: 'video/mp4', class: 'video', bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  { type: 'wav', mime: 'audio/wav', class: 'audio', bytes: [0x52, 0x49, 0x46, 0x46], also: { offset: 8, bytes: [0x57, 0x41, 0x56, 0x45] } },
  { type: 'mp3', mime: 'audio/mpeg', class: 'audio', bytes: [0x49, 0x44, 0x33] },
];

const matches = (buffer, bytes, offset = 0) =>
  bytes.every((byte, i) => buffer[offset + i] === byte);

const EXTENSION_MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp',
  webp: 'image/webp', tif: 'image/tiff', tiff: 'image/tiff', pdf: 'application/pdf',
  zip: 'application/zip', docx: 'application/zip', xlsx: 'application/zip', pptx: 'application/zip',
  exe: 'application/vnd.microsoft.portable-executable', dll: 'application/vnd.microsoft.portable-executable',
  mp4: 'video/mp4', wav: 'audio/wav', mp3: 'audio/mpeg', db: 'application/vnd.sqlite3',
  sqlite: 'application/vnd.sqlite3', gz: 'application/gzip', rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
};

export function detectFileType(buffer, filename = '') {
  for (const sig of SIGNATURES) {
    if (!matches(buffer, sig.bytes, sig.offset || 0)) continue;
    if (sig.also && !matches(buffer, sig.also.bytes, sig.also.offset)) continue;
    return refineZip(buffer, sig, filename);
  }

  // No signature: decide between text and opaque binary by scanning for control bytes.
  const sample = buffer.subarray(0, 4096);
  const controlBytes = sample.filter((b) => b < 9 || (b > 13 && b < 32)).length;
  if (sample.length && controlBytes / sample.length < 0.02) {
    return { type: 'text', mime: 'text/plain', classification: 'document' };
  }
  return { type: 'unknown', mime: 'application/octet-stream', classification: 'unknown' };
}

/** A ZIP whose directory names an OOXML part is really a document, not an archive. */
function refineZip(buffer, sig, filename) {
  if (sig.type !== 'zip') return { type: sig.type, mime: sig.mime, classification: sig.class };

  const head = buffer.subarray(0, Math.min(buffer.length, 8192)).toString('latin1');
  if (head.includes('word/')) return { type: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', classification: 'document' };
  if (head.includes('xl/')) return { type: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', classification: 'document' };
  if (head.includes('ppt/')) return { type: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', classification: 'document' };
  return { type: 'zip', mime: sig.mime, classification: 'archive', hint: filename };
}

/** True when the extension claims one format and the bytes say another. */
export function extensionMismatch(filename, detectedMime) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const claimed = EXTENSION_MIME[ext];
  if (!claimed || !detectedMime) return false;
  // OOXML files are ZIPs — that is not a mismatch.
  if (claimed === 'application/zip' && detectedMime.includes('officedocument')) return false;
  return claimed !== detectedMime;
}
