// API route: PUT /api/catalog  → salva estudos.json
import { NextRequest, NextResponse } from 'next/server';
import { readCatalog, writeCatalog } from '@/lib/fs';
import type { EstudosCatalog } from '@/types';

function validateCatalog(catalog: EstudosCatalog) {
  const routes = new Set<string>();
  const themeRoutes = new Set<string>();
  for (const tema of catalog.itens ?? []) {
    if (tema.Rota) {
      const rotaTema = tema.Rota.replaceAll('\\', '/').trim();
      if (!rotaTema || rotaTema.startsWith('/') || rotaTema.endsWith('/') || rotaTema.includes('/') || rotaTema.includes('..') || rotaTema.toLowerCase().endsWith('.json')) {
        throw new Error(`Rota de tema inválida: ${tema.Rota}`);
      }
      if (themeRoutes.has(rotaTema)) throw new Error(`Rota de tema duplicada: ${rotaTema}`);
      themeRoutes.add(rotaTema);
      tema.Rota = rotaTema;
    }
    for (const estudo of tema.Estudos ?? []) {
      if (!estudo.Rota) continue;
      const rota = estudo.Rota.replaceAll('\\', '/').trim();
      const parts = rota.split('/').filter(Boolean);
      if (!rota || rota.startsWith('/') || rota.endsWith('/') || rota.includes('..') || rota.toLowerCase().endsWith('.json') || parts.length < 2) {
        throw new Error(`Rota inválida: ${estudo.Rota}`);
      }
      const normalized = parts.join('/');
      if (routes.has(normalized)) throw new Error(`Rota duplicada: ${normalized}`);
      routes.add(normalized);
      estudo.Rota = normalized;
    }
  }
}

export async function GET() {
  return NextResponse.json(readCatalog());
}

export async function PUT(req: NextRequest) {
  const body = await req.json() as EstudosCatalog;
  try {
    validateCatalog(body);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Catálogo inválido' }, { status: 400 });
  }
  writeCatalog(body);
  return NextResponse.json({ ok: true });
}
