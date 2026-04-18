// POST /api/upload?dir=anatomia/ossos  → salva arquivo em docs/assets/anatomia/ossos/
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

  const targetDir = path.join(DOCS_ASSETS, dir);
  ensureDir(targetDir);

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(targetDir, file.name);
  await writeFile(filePath, buffer);

  const relativeUrl = `assets/${dir}/${file.name}`;
  return NextResponse.json({ url: relativeUrl });
}
