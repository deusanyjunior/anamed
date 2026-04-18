// POST /api/rename-estudo
// body: { disciplina: "Anatomia", tituloAntigo: "Nome dos ossos", tituloNovo: "Ossos do corpo" }
// renomeia o arquivo JSON, a pasta de imagens e atualiza estudos.json
import { NextRequest, NextResponse } from 'next/server';
import { rename, access } from 'fs/promises';
import path from 'path';
import { DOCS_ASSETS, readCatalog, writeCatalog } from '@/lib/fs';

function slugify(s: string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function POST(req: NextRequest) {
  const { disciplina, tituloAntigo, tituloNovo } = await req.json();
  if (!disciplina || !tituloAntigo || !tituloNovo) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 });
  }

  const catalog = readCatalog();
  const disc = catalog.itens.find(d => d.Disciplina === disciplina);
  if (!disc) return NextResponse.json({ error: 'disciplina não encontrada' }, { status: 404 });

  const estudo = disc.Estudos.find(e => e.Titulo === tituloAntigo);
  if (!estudo) return NextResponse.json({ error: 'estudo não encontrado' }, { status: 404 });

  const discSlug = slugify(disciplina);
  const novoSlug = slugify(tituloNovo);
  const novoExercicios = `${discSlug}/${novoSlug}.json`;

  // renomear arquivo JSON
  const oldJsonPath = path.join(DOCS_ASSETS, estudo.Exercicios);
  const newJsonPath = path.join(DOCS_ASSETS, novoExercicios);
  await rename(oldJsonPath, newJsonPath);

  // renomear pasta de imagens se existir
  const oldDir = path.join(DOCS_ASSETS, estudo.Exercicios.replace(/\.json$/, ''));
  const newDir = path.join(DOCS_ASSETS, novoExercicios.replace(/\.json$/, ''));
  try {
    await access(oldDir);
    await rename(oldDir, newDir);
  } catch {
    // pasta não existe, tudo bem
  }

  // atualizar estudos.json
  const updated = {
    ...catalog,
    itens: catalog.itens.map(d =>
      d.Disciplina !== disciplina ? d : {
        ...d,
        Estudos: d.Estudos.map(e =>
          e.Titulo !== tituloAntigo ? e : { ...e, Titulo: tituloNovo, Exercicios: novoExercicios }
        ),
      }
    ),
  };
  writeCatalog(updated);

  return NextResponse.json({ ok: true, novoExercicios });
}
