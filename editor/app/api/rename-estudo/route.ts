import { mkdir, rename } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { DOCS_ASSETS, readCatalog, writeCatalog } from '@/lib/fs';

function safe(value: string, minParts = 1) {
  const normalized = value.replaceAll('\\', '/').trim();
  const parts = normalized.split('/').filter(Boolean);
  if (!normalized || normalized.startsWith('/') || normalized.endsWith('/') || normalized.includes('..') || normalized.toLowerCase().endsWith('.json') || parts.length < minParts) throw new Error('Rota inválida');
  return parts.join('/');
}
function dataPath(relative: string) {
  const root = path.resolve(DOCS_ASSETS);
  const result = path.resolve(root, relative);
  if (!result.startsWith(`${root}${path.sep}`)) throw new Error('Caminho fora da pasta de dados');
  return result;
}
function relativeRoute(theme: { Rota?: string }, study: { Rota?: string; Exercicios?: string }) {
  const raw = (study.Rota || study.Exercicios?.replace(/\.json$/i, '') || '').replaceAll('\\', '/');
  const prefix = `${theme.Rota}/`;
  return raw.startsWith(prefix) ? raw.slice(prefix.length) : raw.split('/').filter(Boolean).at(-1) || raw;
}

export async function POST(req: NextRequest) {
  try {
    const { tema: temaNome, exercicios, rota, rotaNova, tituloNovo } = await req.json() as { tema?: string; exercicios?: string; rota?: string; rotaNova?: string; tituloNovo?: string };
    if (!temaNome || (!exercicios && !rota)) return NextResponse.json({ error: 'missing params' }, { status: 400 });
    if (tituloNovo !== undefined && !tituloNovo.trim()) return NextResponse.json({ error: 'título inválido' }, { status: 400 });
    const catalog = readCatalog();
    const tema = catalog.itens.find(item => item.Tema === temaNome);
    if (!tema) return NextResponse.json({ error: 'tema não encontrado' }, { status: 404 });
    const estudo = tema.Estudos.find(item => (rota && relativeRoute(tema, item) === rota) || (exercicios && item.Exercicios === exercicios));
    if (!estudo) return NextResponse.json({ error: 'estudo não encontrado' }, { status: 404 });
    const currentRelative = relativeRoute(tema, estudo);
    const nextRelative = rotaNova === undefined ? currentRelative : safe(rotaNova);
    const oldDir = `${tema.Rota}/${currentRelative}`;
    const nextDir = `${tema.Rota}/${nextRelative}`;
    const oldFile = `${oldDir}/${estudo.Exercicios?.split(/[\\/]/).filter(Boolean).at(-1) || `${currentRelative.split('/').at(-1)}.json`}`;
    const nextFile = `${nextDir}/${nextRelative.split('/').at(-1)}.json`;
    if (oldDir !== nextDir || oldFile !== nextFile) {
      await mkdir(path.dirname(dataPath(nextDir)), { recursive: true });
      if (oldDir !== nextDir) await rename(dataPath(oldDir), dataPath(nextDir));
      if (oldFile !== nextFile) await rename(dataPath(oldDir === nextDir ? oldFile : `${nextDir}/${path.basename(oldFile)}`), dataPath(nextFile));
    }
    estudo.Rota = nextRelative;
    delete estudo.Exercicios;
    if (tituloNovo !== undefined) estudo.Titulo = tituloNovo.trim();
    writeCatalog(catalog);
    return NextResponse.json({ ok: true, rota: nextRelative, exercicios: `${nextRelative.split('/').at(-1)}.json`, titulo: estudo.Titulo });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível renomear o estudo' }, { status: 400 }); }
}
