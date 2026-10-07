import { mkdir, rename } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { DOCS_ASSETS, readCatalog, writeCatalog } from '@/lib/fs';

function normalizeStudyRoute(value: string) {
  const normalized = value.replaceAll('\\', '/').trim();
  const parts = normalized.split('/').filter(Boolean);
  if (!normalized || normalized.startsWith('/') || normalized.endsWith('/') || normalized.includes('..') || normalized.toLowerCase().endsWith('.json') || parts.length < 2) {
    throw new Error('Rota de estudo inválida. Use o formato tema/estudo.');
  }
  return parts.join('/');
}

function safeDataPath(relative: string) {
  const root = path.resolve(DOCS_ASSETS);
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error('Caminho fora da pasta de dados');
  return resolved;
}

export async function POST(req: NextRequest) {
  const { tema: temaNome, exercicios, tituloNovo, rotaNova, baseDir } = await req.json();
  if (!temaNome || !exercicios) return NextResponse.json({ error: 'missing params' }, { status: 400 });
  if (tituloNovo !== undefined && !tituloNovo?.trim()) return NextResponse.json({ error: 'título inválido' }, { status: 400 });

  const catalog = readCatalog();
  const tema = catalog.itens.find(d => d.Tema === temaNome);
  if (!tema) return NextResponse.json({ error: 'tema não encontrado' }, { status: 404 });
  const estudo = tema.Estudos.find(e => e.Exercicios === exercicios);
  if (!estudo) return NextResponse.json({ error: 'estudo não encontrado' }, { status: 404 });

  let nextExercises = exercicios;
  let nextRoute = estudo.Rota;
  if (rotaNova !== undefined) {
    nextRoute = normalizeStudyRoute(rotaNova);
    const routeParts = nextRoute.split('/');
    const newDir = routeParts.join('/');
    const newFile = `${routeParts.at(-1)}.json`;
    const oldDir = baseDir || path.posix.dirname(exercicios.replaceAll('\\', '/'));
    const oldFile = `${oldDir.replaceAll('\\', '/')}/${exercicios.replaceAll('\\', '/')}`;
    const newExercises = `${newDir}/${newFile}`;
    const oldPath = safeDataPath(oldFile);
    const newPath = safeDataPath(newExercises);

    if (oldFile !== newExercises) {
      const newDirPath = safeDataPath(newDir);
      if (oldDir !== newDir) {
        await mkdir(path.dirname(newDirPath), { recursive: true });
        await rename(safeDataPath(oldDir), newDirPath);
      }
      if (oldFile !== newExercises) {
        if (oldDir === newDir) await rename(oldPath, newPath);
        else await rename(path.join(newDirPath, path.basename(oldFile)), newPath);
      }
    }
    nextExercises = newExercises;
  }

  const updated = {
    ...catalog,
    itens: catalog.itens.map(d => d.Tema !== temaNome ? d : {
      ...d,
      Estudos: d.Estudos.map(e => e.Exercicios !== exercicios ? e : {
        ...e,
        ...(tituloNovo !== undefined ? { Titulo: tituloNovo.trim() } : {}),
        ...(rotaNova !== undefined ? { Rota: nextRoute, Exercicios: nextExercises } : {}),
      }),
    }),
  };
  writeCatalog(updated);

  return NextResponse.json({ ok: true, titulo: tituloNovo?.trim() ?? estudo.Titulo, exercicios: nextExercises, rota: nextRoute });
}
