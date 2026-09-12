import fs from 'node:fs';
import path from 'node:path';
import type { EstudosCatalog, EstudoRef, StudyDataset } from './types';

export const ASSETS_DIR = path.join(process.cwd(), 'assets');

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
  return allStudies(catalog).find(({ estudo }) => {
    const route = routePartsFromExercises(estudo.Exercicios);
    return route.tema === temaSlug && route.estudo === estudoSlug;
  });
}

export function readDataset(exercicios: string): StudyDataset {
  const relative = assertSafeRelativePath(exercicios);
  if (!relative.toLowerCase().endsWith('.json')) throw new Error('Dataset inválido');
  const file = path.join(ASSETS_DIR, relative);
  const resolved = path.resolve(file);
  if (resolved !== ASSETS_DIR && !resolved.startsWith(`${path.resolve(ASSETS_DIR)}${path.sep}`)) {
    throw new Error('Dataset fora da pasta de assets');
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')) as StudyDataset;
}

export function imageUrl(url: string) {
  return url.startsWith('/') ? url : `/${url}`;
}

export function coverUrl(estudo: EstudoRef) {
  if (!estudo.Imagem) return '';
  if (typeof estudo.Imagem === 'string') return imageUrl(estudo.Imagem);
  return estudo.Imagem[0]?.url ? imageUrl(estudo.Imagem[0].url) : '';
}
