import { rename } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { DOCS_ASSETS, readCatalog, writeCatalog } from '@/lib/fs';
import type { EstudosCatalog } from '@/types';

function safeRoute(value: string, label: string) {
  const normalized = value.replaceAll('\\', '/').trim();
  if (!normalized || normalized.startsWith('/') || normalized.endsWith('/') || normalized.includes('..') || normalized.toLowerCase().endsWith('.json') || normalized.split('/').some(part => !part || part === '.')) throw new Error(`${label} inválida`);
  return normalized.split('/').filter(Boolean).join('/');
}
function themeRoute(tema: { Rota?: string; Tema: string }) { return safeRoute(tema.Rota || tema.Tema.toLowerCase().replace(/[^a-z0-9]+/g, '-'), 'Rota de tema'); }
function studyRoute(tema: { Rota?: string; Tema: string }, estudo: { Rota?: string; Exercicios?: string }) {
  const raw = estudo.Rota || estudo.Exercicios?.replace(/\.json$/i, '') || '';
  const prefix = `${themeRoute(tema)}/`;
  return raw.startsWith(prefix) ? raw.slice(prefix.length) : raw.split('/').filter(Boolean).at(-1) ?? raw;
}
function safePath(relative: string) {
  const root = path.resolve(DOCS_ASSETS);
  const target = path.resolve(root, relative);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Caminho fora da pasta de dados');
  return target;
}
function validateCatalog(catalog: EstudosCatalog) {
  const themeRoutes = new Set<string>();
  const studyRoutes = new Set<string>();
  for (const tema of catalog.itens ?? []) {
    const tr = themeRoute(tema);
    if (themeRoutes.has(tr)) throw new Error(`Rota de tema duplicada: ${tr}`);
    themeRoutes.add(tr);
    tema.Rota = tr;
    for (const estudo of tema.Estudos ?? []) {
      const sr = safeRoute(studyRoute(tema, estudo), 'Rota de estudo');
      if (studyRoutes.has(`${tr}/${sr}`)) throw new Error(`Rota duplicada: ${tr}/${sr}`);
      studyRoutes.add(`${tr}/${sr}`);
      estudo.Rota = sr;
      delete estudo.Exercicios;
    }
  }
}

export async function GET() { return NextResponse.json(readCatalog()); }

export async function PUT(req: NextRequest) {
  const body = await req.json() as EstudosCatalog;
  try {
    const previous = readCatalog();
    validateCatalog(body);
    for (const nextTema of body.itens) {
      const oldTema = previous.itens.find(item => item.Tema === nextTema.Tema);
      if (!oldTema) continue;
      const oldRoute = themeRoute(oldTema);
      const newRoute = themeRoute(nextTema);
      if (oldRoute !== newRoute) {
        const oldPath = safePath(oldRoute);
        const newPath = safePath(newRoute);
        if (oldPath !== newPath) await rename(oldPath, newPath);
      }
    }
    writeCatalog(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Catálogo inválido' }, { status: 400 });
  }
}
