import fs from 'node:fs';
import path from 'node:path';
import type { EstudosCatalog, EstudoRef, StudyDataset } from './types';

export const ASSETS_DIR = path.join(process.cwd(), 'data');

function assertSafeRelativePath(value: string) {
  const normalized = value.replaceAll('\\', '/');
  if (!normalized || normalized.startsWith('/') || normalized.includes('..')) {
    throw new Error('Caminho de asset inválido');
  }
  return normalized;
}

export function readCatalog(): EstudosCatalog {
  const file = path.join(ASSETS_DIR, 'estudos.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')) as EstudosCatalog;
}

export function routeFromExercises(exercicios: string): string {
  const safe = assertSafeRelativePath(exercicios);
  const withoutExtension = safe.replace(/\.json$/i, '');
  const parts = withoutExtension.split('/').filter(Boolean);
  const filename = parts.at(-1);
  const parent = parts.at(-2);
  if (filename && filename === parent) return parts.slice(0, -1).join('/');
  return withoutExtension;
}

function assertSafeThemeRoute(value: string) {
  const normalized = value.replaceAll('\\', '/').trim();
  if (!normalized || normalized.startsWith('/') || normalized.endsWith('/') || normalized.includes('/') || normalized.includes('..') || normalized.toLowerCase().endsWith('.json')) {
    throw new Error('Rota de tema inválida');
  }
  return normalized;
}

export function routeFromStudy(estudo: EstudoRef, tema?: { Rota?: string }): string {
  const route = estudo.Rota ? assertSafeRoute(estudo.Rota) : routeFromExercises(estudo.Exercicios);
  const parts = route.split('/').filter(Boolean);
  return tema?.Rota ? `${assertSafeThemeRoute(tema.Rota)}/${parts.slice(1).join('/')}` : route;
}

function assertSafeRoute(value: string) {
  const normalized = value.replaceAll('\\', '/').trim();
  const parts = normalized.split('/').filter(Boolean);
  if (!normalized || normalized.startsWith('/') || normalized.endsWith('/') || normalized.includes('..') || normalized.toLowerCase().endsWith('.json') || parts.length < 2) {
    throw new Error('Rota de estudo inválida');
  }
  return parts.join('/');
}

export function routePartsFromStudy(estudo: EstudoRef, tema?: { Rota?: string }) {
  const route = routeFromStudy(estudo, tema);
  const parts = route.split('/').filter(Boolean);
  return { tema: parts[0], estudo: parts.slice(1).join('/') };
}

export function routePartsFromExercises(exercicios: string) {
  const route = routeFromExercises(exercicios);
  const parts = route.split('/').filter(Boolean);
  if (parts.length < 2) throw new Error(`Exercicios inválido: ${exercicios}`);
  return { tema: parts[0], estudo: parts.slice(1).join('/') };
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

export function readDataset(exercicios: string, studyRoute?: string): StudyDataset {
  const relative = assertSafeRelativePath(studyRoute ? `${studyRoute}/${exercicios}` : exercicios);
  if (!relative.toLowerCase().endsWith('.json')) throw new Error('Dataset inválido');
  const file = path.join(ASSETS_DIR, relative);
  const resolved = path.resolve(file);
  if (resolved !== ASSETS_DIR && !resolved.startsWith(`${path.resolve(ASSETS_DIR)}${path.sep}`)) {
    throw new Error('Dataset fora da pasta de dados');
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as StudyDataset;
  if (!raw.grupos) return raw;
  return {
    ...raw,
    itens: raw.grupos.flatMap(group => group.itens.map(item => ({ ...item, Grupo: group.Grupo }))),
  };
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
  const base = studyRoute ?? estudo.Exercicios.replace(/\/[^/]+$/, '');
  return `/assets/${base}/${value}`;
}
