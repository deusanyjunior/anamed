import { unlink } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { assetReferences, listImages, resolveAssetUrl } from '@/lib/assetReferences';

export async function GET(req: NextRequest) {
  const dir = req.nextUrl.searchParams.get('dir');
  if (!dir) return NextResponse.json({ error: 'missing dir' }, { status: 400 });
  try {
    return NextResponse.json({ images: listImages(dir) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Diretório inválido' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const { url } = await req.json() as { url?: string };
  if (!url) return NextResponse.json({ error: 'missing url' }, { status: 400 });
  const references = assetReferences(url);
  if (references.length) {
    return NextResponse.json({ error: 'Imagem ainda está sendo usada por itens ou capas.', references }, { status: 409 });
  }
  try {
    await unlink(resolveAssetUrl(url));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível remover o arquivo' }, { status: 400 });
  }
}
