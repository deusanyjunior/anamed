// POST /api/rename
// body: { oldUrl: "assets/anatomia/ossos/Foo.png", newName: "Bar.png" }
// renomeia o arquivo em disco e retorna a nova URL
import { NextRequest, NextResponse } from 'next/server';
import { rename } from 'fs/promises';
import path from 'path';
import { DOCS_ASSETS } from '@/lib/fs';

export async function POST(req: NextRequest) {
  const { oldUrl, newName, baseDir } = await req.json();
  if (!oldUrl || !newName) return NextResponse.json({ error: 'missing params' }, { status: 400 });

  const isLegacy = oldUrl.startsWith('assets/');
  const relative = isLegacy ? oldUrl.slice('assets/'.length) : path.join(baseDir || '', oldUrl);
  const safeRelative = relative.replaceAll('\\', '/');
  if (!safeRelative || safeRelative.includes('..') || safeRelative.startsWith('/')) return NextResponse.json({ error: 'caminho inválido' }, { status: 400 });
  const oldRel = safeRelative;
  const dir = path.dirname(oldRel);
  const oldPath = path.join(DOCS_ASSETS, oldRel);
  const cleanName = String(newName).trim();
  if (!cleanName || cleanName.includes('/') || cleanName.includes('\\') || cleanName === '.' || cleanName === '..') return NextResponse.json({ error: 'nome inválido' }, { status: 400 });
  const newPath = path.join(DOCS_ASSETS, dir, cleanName);
  const root = path.resolve(DOCS_ASSETS);
  if (!newPath.startsWith(`${root}${path.sep}`)) return NextResponse.json({ error: 'caminho inválido' }, { status: 400 });

  await rename(oldPath, newPath);
  const newUrl = isLegacy ? `assets/${dir}/${cleanName}` : `${path.basename(dir)}/${cleanName}`;
  return NextResponse.json({ url: newUrl });
}
