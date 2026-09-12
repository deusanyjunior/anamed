import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ASSETS_DIR } from '../../../lib/catalog';

const contentTypes: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params;
  const relative = segments.join('/').replaceAll('\\', '/');
  const root = path.resolve(ASSETS_DIR);
  const file = path.resolve(root, relative);
  if (!relative || relative.includes('..') || (file !== root && !file.startsWith(`${root}${path.sep}`))) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const data = await readFile(file);
    const type = contentTypes[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
    return new Response(data, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
