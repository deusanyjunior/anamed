// POST /api/upload?dir=anatomia/ossos  → salva arquivo na subpasta de mídia do estudo
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { DOCS_ASSETS, ensureDir } from '@/lib/fs';

export async function POST(req: NextRequest) {
  const dir = req.nextUrl.searchParams.get('dir');
  if (!dir) return NextResponse.json({ error: 'missing dir' }, { status: 400 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 });

  const normalizedDir = dir.replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
  if (!normalizedDir || normalizedDir.includes('..') || normalizedDir.split('/').some(part => !part || part === '.')) return NextResponse.json({ error: 'invalid dir' }, { status: 400 });
  const targetDir = path.resolve(DOCS_ASSETS, normalizedDir);
  if (!targetDir.startsWith(`${path.resolve(DOCS_ASSETS)}${path.sep}`)) return NextResponse.json({ error: 'invalid dir' }, { status: 400 });
  ensureDir(targetDir);

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[\\/]/g, '_');
  if (!safeName || safeName === '.' || safeName === '..') return NextResponse.json({ error: 'invalid filename' }, { status: 400 });
  const filePath = path.join(targetDir, safeName);
  await writeFile(filePath, buffer);

  const relativeUrl = `${path.basename(normalizedDir)}/${safeName}`;
  return NextResponse.json({ url: relativeUrl });
}
