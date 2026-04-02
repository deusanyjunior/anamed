import estudosData from '@/data/estudos.json';
import ossosData from '@/data/anatomia/ossos.json';
import epitelialData from '@/data/histologia/epitelial.json';
import conjuntivoData from '@/data/histologia/conjuntivo.json';
import fasesData from '@/data/embriologia/fases.json';
import type { CopyrightInfo, Disciplina, EstudoRef, EstudosCatalog, StudyDataset } from '@/types';

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getCatalog() {
  return estudosData as EstudosCatalog;
}

export function getDisciplinas() {
  return getCatalog().itens ?? [];
}

export function getDisciplinaBySlug(slug: string): Disciplina | undefined {
  return getDisciplinas().find((d) => slugify(d.Disciplina) === slug);
}

export function getEstudoBySlug(disciplinaSlug: string, estudoSlug: string) {
  const disciplina = getDisciplinaBySlug(disciplinaSlug);
  if (!disciplina) return undefined;
  return disciplina.Estudos.find((e) => slugify(e.Titulo) === estudoSlug);
}

/** Primeira imagem do catalogo e copyright (string legacy ou array com url/Copyright). */
export function getEstudoCapa(estudo: EstudoRef): {
  url: string | undefined;
  copyright: CopyrightInfo | undefined;
} {
  const { Imagem, Copyright } = estudo;
  if (!Imagem) {
    return { url: undefined, copyright: Copyright };
  }
  if (typeof Imagem === 'string') {
    return { url: Imagem, copyright: Copyright };
  }
  const first = Imagem[0];
  if (!first) {
    return { url: undefined, copyright: Copyright };
  }
  return {
    url: first.url,
    copyright: first.Copyright ?? Copyright
  };
}

export function getDatasetByPath(path: string): StudyDataset {
  const datasetsByPath: Record<string, StudyDataset> = {
    'anatomia/ossos.json': ossosData as StudyDataset,
    'histologia/epitelial.json': epitelialData as StudyDataset,
    'histologia/conjuntivo.json': conjuntivoData as StudyDataset,
    'embriologia/fases.json': fasesData as StudyDataset
  };
  return datasetsByPath[path] ?? { itens: [] };
}
