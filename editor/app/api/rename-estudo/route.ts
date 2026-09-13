// POST /api/rename-estudo
// body: { tema: "Anatomia", exercicios: "ossos/cingulo/cingulo.json", tituloNovo: "Cíngulo" }
// altera somente o título exibido, preservando rota, dataset e arquivos físicos
import { NextRequest, NextResponse } from 'next/server';
import { readCatalog, writeCatalog } from '@/lib/fs';

export async function POST(req: NextRequest) {
  const { tema: temaNome, exercicios, tituloNovo } = await req.json();
  if (!temaNome || !exercicios || !tituloNovo?.trim()) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 });
  }

  const catalog = readCatalog();
  const tema = catalog.itens.find(d => d.Tema === temaNome);
  if (!tema) return NextResponse.json({ error: 'tema não encontrado' }, { status: 404 });

  const estudo = tema.Estudos.find(e => e.Exercicios === exercicios);
  if (!estudo) return NextResponse.json({ error: 'estudo não encontrado' }, { status: 404 });

  const titulo = tituloNovo.trim();
  const updated = {
    ...catalog,
    itens: catalog.itens.map(d => d.Tema !== temaNome ? d : {
      ...d,
      Estudos: d.Estudos.map(e => e.Exercicios === exercicios ? { ...e, Titulo: titulo } : e),
    }),
  };
  writeCatalog(updated);

  return NextResponse.json({ ok: true, titulo, exercicios, rota: estudo.Rota });
}
