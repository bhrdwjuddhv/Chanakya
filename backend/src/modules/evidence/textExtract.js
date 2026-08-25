import mammoth from 'mammoth';
import { createRequire } from 'node:module';

// pdf-parse's index.js runs a debug harness on import; require the lib entry directly.
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

/** Returns plain text, or throws with a message the UI can show as processingError. */
export async function extractText(buffer, { mimeType, filename }) {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (mimeType === 'application/pdf' || ext === 'pdf') {
    const { text } = await pdfParse(buffer);
    return text;
  }
  if (ext === 'docx' || mimeType?.includes('wordprocessingml')) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  if (['txt', 'md', 'csv', 'json', 'log', 'eml'].includes(ext) || mimeType?.startsWith('text/')) {
    return buffer.toString('utf8');
  }
  throw new Error(`Cannot extract text from .${ext || mimeType} — supported: pdf, docx, txt, md, csv, log`);
}

export const isTextExtractable = (filename, mimeType) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return (
    ['pdf', 'docx', 'txt', 'md', 'csv', 'json', 'log', 'eml'].includes(ext) ||
    mimeType?.startsWith('text/')
  );
};
