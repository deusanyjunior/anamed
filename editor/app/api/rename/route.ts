// POST /api/rename
// body: { oldUrl: "assets/anatomia/ossos/Foo.png", newName: "Bar.png" }
// renomeia o arquivo em disco e retorna a nova URL
import { NextRequest, NextResponse } from 'next/server';
import { rename } from 'fs/promises';
import path from 'path';
import { DOCS_ASSETS } from '@/lib/fs';

export async function POST(req: NextRequest) {
  const { oldUrl, newName } = await req.json();
  if (!oldUrl || !newName) return NextResponse.json({ error: 'missing params' }, { status: 400 });

  // oldUrl ex: "assets/anatomia/ossos/Foo.png"
  const oldRel = oldUrl.replace(/^assets\//, '');
  const dir = path.dirname(oldRel);
  const oldPath = path.join(DOCS_ASSETS, oldRel);
  const newPath = path.join(DOCS_ASSETS, dir, newName);

  await rename(oldPath, newPath);

  const newUrl = `assets/${dir}/${newName}`;
  return NextResponse.json({ url: newUrl });
}
