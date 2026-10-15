import fs from 'node:fs';
import path from 'node:path';
import type { EstudosCatalog, EstudoRef, StudyDataset, Tema } from './types';

export const ASSETS_DIR = path.join(process.cwd(), 'data');

function assertSafeRelativePath(value: string) {
  const normalized = value.replaceAll('\\', '/');
  if (!normalized || normalized.startsWith('/') || normalized.split('/').some(part => !part || part === '..' || part === '.')) throw new Error('Caminho de asset inválido');
  return normalized;
}

export function readCatalog(): EstudosCatalog {
  return JSON.parse(fs.readFileSync(path.join(ASSETS_DIR, 'estudos.json'), 'utf8')) as EstudosCatalog;
}

function safeSegment(value: string, label: string) {
  const normalized = value.replaceAll('\\', '/').trim();
  if (!normalized || normalized.startsWith('/') || normalized.endsWith('/') || normalized.includes('..') || normalized.toLowerCase().endsWith('.json')) throw new Error(`${label} inválida`);
  return normalized.split('/').filter(Boolean).join('/');
}

function slugify(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function themeRoute(tema: Pick<Tema, 'Rota' | 'Tema'>) {
  const fallback = tema.Rota || (tema as Tema & { Estudos?: EstudoRef[] }).Estudos?.[0]?.Exercicios?.split(/[\\/]/)[0] || slugify((tema as Tema & { Tema: string }).Tema);
  return safeSegment(fallback, 'Rota de tema');
}

export function studyRelativeRoute(estudo: EstudoRef, tema?: Pick<Tema, 'Rota' | 'Tema'>): string {
  const raw = estudo.Rota || estudo.Exercicios?.replace(/\.json$/i, '') || '';
  const normalized = safeSegment(raw, 'Rota de estudo');
  const prefix = tema?.Rota ? `${safeSegment(tema.Rota, 'Rota de tema')}/` : '';
  if (prefix && normalized.startsWith(prefix)) return normalized.slice(prefix.length);
  const parts = normalized.split('/');
  if (tema?.Rota && parts.length > 1 && parts[0] === tema.Rota) return parts.slice(1).join('/');
  return normalized;
}

export function routeFromStudy(estudo: EstudoRef, tema?: Pick<Tema, 'Rota' | 'Tema'>): string {
  const relative = studyRelativeRoute(estudo, tema);
  return tema?.Rota ? `${themeRoute(tema)}/${relative}` : relative;
}

export function routePartsFromStudy(estudo: EstudoRef, tema?: Pick<Tema, 'Rota' | 'Tema'>) {
  const route = routeFromStudy(estudo, tema).split('/').filter(Boolean);
  return { tema: route[0], estudo: route.slice(1).join('/') };
}

export function allStudies(catalog = readCatalog()) {
  return catalog.itens.flatMap(tema => tema.Estudos.map(estudo => ({ tema, estudo })));
}

export function findStudy(temaSlug: string, estudoSlug: string, catalog = readCatalog()) {
  return allStudies(catalog).find(({ tema, estudo }) => {
    const route = routePartsFromStudy(estudo, tema);
    return route.tema === temaSlug && route.estudo === estudoSlug;
  });
}

function legacyDatasetPath(exercicios: string, studyRoute?: string) {
  const normalized = exercicios.replaceAll('\\', '/').trim();
  if (!normalized || !normalized.toLowerCase().endsWith('.json')) throw new Error('Dataset inválido');
  if (normalized.includes('/')) return assertSafeRelativePath(normalized);
  if (!studyRoute) throw new Error('Rota do estudo ausente');
  return assertSafeRelativePath(`${studyRoute}/${normalized}`);
}

export function datasetPathForStudy(estudo: EstudoRef, tema: Tema) {
  const route = routeFromStudy(estudo, tema);
  const filename = estudo.Exercicios?.split(/[\\/]/).filter(Boolean).at(-1) || `${studyRelativeRoute(estudo, tema).split('/').at(-1)}.json`;
  return assertSafeRelativePath(`${route}/${filename}`);
}

/** Compatibilidade: aceita a referência antiga (basename + rota) e a nova referência estudo+tema. */
export function datasetPath(value: EstudoRef | string, studyRouteOrTema?: string | Tema) {
  if (typeof value !== 'string') return datasetPathForStudy(value, studyRouteOrTema as Tema);
  return legacyDatasetPath(value, typeof studyRouteOrTema === 'string' ? studyRouteOrTema : undefined);
}

export function datasetDirectory(value: EstudoRef | string, studyRouteOrTema?: string | Tema) {
  return datasetPath(value, studyRouteOrTema).replace(/\/[^/]+$/, '');
}

export function readDataset(value: EstudoRef | string, studyRouteOrTema?: string | Tema): StudyDataset {
  const file = path.join(ASSETS_DIR, datasetPath(value, studyRouteOrTema));
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as StudyDataset;
  if (!raw.grupos) return raw;
  return { ...raw, itens: raw.grupos.flatMap(group => group.itens.map(item => ({ ...item, Grupo: group.Grupo }))) };
}

export function imageUrl(url: string) {
  return url.startsWith('/') ? url : `/${url}`;
}

export function coverUrl(estudo: EstudoRef, studyRoute?: string) {
  if (!estudo.Imagem) return '';
  const value = typeof estudo.Imagem === 'string' ? estudo.Imagem : estudo.Imagem[0]?.url;
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('/')) return value;
  if (value.startsWith('assets/')) return imageUrl(value);
  return `/assets/${studyRoute ?? routeFromStudy(estudo)}/${value}`;
}
