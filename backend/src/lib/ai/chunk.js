/**
 * Paragraph-aware chunking with overlap. Overlap keeps a sentence that straddles a
 * boundary retrievable from either side.
 */
export function chunkText(text, { size = 1200, overlap = 200 } = {}) {
  const clean = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\n\n+/);
  const chunks = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > size) {
      chunks.push(current.trim());
      current = current.slice(-overlap);
    }
    current += (current ? '\n\n' : '') + paragraph;

    // A single paragraph longer than `size` still has to be split.
    while (current.length > size * 1.5) {
      chunks.push(current.slice(0, size).trim());
      current = current.slice(size - overlap);
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.map((content, index) => ({
    chunkId: `c${index}`,
    index,
    content,
    // Rough page estimate for citations — the extractors give us flat text, not pages.
    pageNumber: Math.floor((index * (size - overlap)) / 2500) + 1,
  }));
}
