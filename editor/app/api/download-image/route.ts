// POST /api/download-image
// body: { url: "https://...", dir: "anatomia/ossos" }
// baixa a imagem e salva em docs/assets/<dir>/, retorna a URL relativa
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { DOCS_ASSETS, ensureDir } from '@/lib/fs';

export async function POST(req: NextRequest) {
  const { url, dir } = await req.json();
  if (!url || !dir) return NextResponse.json({ error: 'missing params' }, { status: 400 });

  // converter URL de página do Wikimedia para URL direta do arquivo
  let fetchUrl = url;
  const fileMatch2 = decodeURIComponent(url).match(/[#&?/]File:([^#&?]+)/i);
  if (fileMatch2) {
    fetchUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileMatch2[1])}`;
  }

  const res = await fetch(fetchUrl, {
    headers: { 'User-Agent': 'AnaMed-Editor/1.0 (educational tool; contact: local)' },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) return NextResponse.json({ error: `fetch falhou: ${res.status}` }, { status: 400 });

  // inferir nome do arquivo a partir da URL
  // extrair nome do arquivo da URL
  // suporta URLs do Wikimedia como /wiki/..#/media/File:Nome.ext
  // e URLs diretas como /path/to/Nome.ext
  let rawName = '';
  const fileMatch = decodeURIComponent(url).match(/[#&?/]File:([^#&?]+)/i);
  if (fileMatch) {
    rawName = fileMatch[1];
  } else {
    const urlPath = new URL(url).pathname;
    rawName = decodeURIComponent(path.basename(urlPath));
  }
  rawName = rawName || 'imagem';
  const ext = path.extname(rawName);
  const baseName = path.basename(rawName, ext || undefined);
  const safeBase = baseName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'imagem';
  const fileName = safeBase + (ext || '.png');

  const targetDir = path.join(DOCS_ASSETS, dir);
  ensureDir(targetDir);

  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(path.join(targetDir, fileName), buffer);

  return NextResponse.json({ url: `assets/${dir}/${fileName}` });
}
