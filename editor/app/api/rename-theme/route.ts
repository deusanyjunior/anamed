import { rename } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { DOCS_ASSETS, readCatalog, writeCatalog } from '@/lib/fs';

function slug(value: string) {
  const result = value.replaceAll('\\', '/').trim();
  if (!result || result.startsWith('/') || result.endsWith('/') || result.includes('/') || result.includes('..') || result.toLowerCase().endsWith('.json')) throw new Error('Rota de tema inválida');
  return result;
}
function safePath(root: string, relative: string) {
  const result = path.resolve(root, relative);
  if (!result.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error('Caminho fora da pasta de dados');
  return result;
}
export async function POST(req: NextRequest) {
  try {
    const { tema, nomeNovo, rotaNova } = await req.json() as { tema?: string; nomeNovo?: string; rotaNova?: string };
    if (!tema || !nomeNovo?.trim() || !rotaNova) return NextResponse.json({ error: 'missing params' }, { status: 400 });
    const catalog = readCatalog();
    const current = catalog.itens.find(item => item.Tema === tema);
    if (!current) return NextResponse.json({ error: 'tema não encontrado' }, { status: 404 });
    const oldRoute = slug(current.Rota || tema.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    const nextRoute = slug(rotaNova);
    if (catalog.itens.some(item => item !== current && (item.Rota || item.Tema) === nextRoute)) return NextResponse.json({ error: 'rota já usada' }, { status: 409 });
    if (oldRoute !== nextRoute) await rename(safePath(DOCS_ASSETS, oldRoute), safePath(DOCS_ASSETS, nextRoute));
    current.Tema = nomeNovo.trim();
    current.Rota = nextRoute;
    writeCatalog(catalog);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível renomear o tema' }, { status: 400 }); }
}
