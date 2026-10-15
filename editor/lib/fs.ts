import path from 'path';
import fs from 'fs';
import type { EstudosCatalog, EstudoRef, StudyDataset, StudyItem, Tema } from '@/types';

export const DOCS_ASSETS = path.resolve(process.cwd(), '..', 'web', 'data');

export function readCatalog(): EstudosCatalog {
  return JSON.parse(fs.readFileSync(path.join(DOCS_ASSETS, 'estudos.json'), 'utf-8'));
}

export function writeCatalog(catalog: EstudosCatalog) {
  fs.writeFileSync(path.join(DOCS_ASSETS, 'estudos.json'), JSON.stringify(catalog, null, 2), 'utf-8');
}

function safeRelative(value: string) {
  const normalized = value.replaceAll('\\', '/').trim();
  if (!normalized || normalized.startsWith('/') || normalized.split('/').some(part => !part || part === '..' || part === '.')) throw new Error('Caminho inválido');
  return normalized;
}

export function studyRoute(tema: Tema, estudo: EstudoRef) {
  const theme = (tema.Rota || '').replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
  const raw = (estudo.Rota || estudo.Exercicios?.replace(/\.json$/i, '') || '').replaceAll('\\', '/');
  const relative = theme && raw.startsWith(`${theme}/`) ? raw.slice(theme.length + 1) : raw.split('/').at(-1) === raw.split('/').at(-2) ? raw.split('/').slice(-2, -1)[0] : raw;
  return safeRelative(`${theme}/${relative}`);
}

export function datasetName(tema: Tema, estudo: EstudoRef) {
  const fallback = estudo.Rota?.split('/').filter(Boolean).at(-1) || estudo.Exercicios?.split(/[\\/]/).filter(Boolean).at(-1)?.replace(/\.json$/i, '') || 'estudo';
  return `${fallback}.json`;
}

function datasetFile(exercicios: string, studyRoute: string) {
  const normalized = exercicios.replaceAll('\\', '/').trim();
  if (!normalized || normalized.includes('..') || normalized.startsWith('/') || !normalized.toLowerCase().endsWith('.json')) throw new Error('Dataset inválido');
  const relative = normalized.includes('/') ? normalized : `${studyRoute}/${normalized}`;
  const root = path.resolve(DOCS_ASSETS);
  const result = path.resolve(root, safeRelative(relative));
  if (!result.startsWith(`${root}${path.sep}`)) throw new Error('Dataset fora da pasta de dados');
  return result;
}

export function readDataset(exercicios: string, studyRoute: string): StudyDataset {
  const raw = JSON.parse(fs.readFileSync(datasetFile(exercicios, studyRoute), 'utf-8')) as StudyDataset;
  if (!raw.grupos) return raw;
  return { ...raw, itens: raw.grupos.flatMap(group => group.itens.map(item => ({ ...item, Grupo: group.Grupo }))) };
}

function denormalizeGroups(raw: StudyDataset, dataset: StudyDataset) {
  if (!raw.grupos) return dataset;
  const names = [...new Set(dataset.itens.map(item => item.Grupo || '(sem grupo)'))];
  const groups = names.map((name, index) => {
    const previous = raw.grupos?.find(group => group.Grupo === name);
    const items = dataset.itens.filter(item => (item.Grupo || '(sem grupo)') === name).map(item => {
      const copy = { ...item } as Partial<StudyItem>;
      delete copy.Grupo;
      return copy as Omit<StudyItem, 'Grupo'>;
    });
    return { ID: previous?.ID ?? `grupo-${index + 1}`, Grupo: name === '(sem grupo)' ? '' : name, itens: items };
  });
  const metadata: Partial<StudyDataset> = { ...dataset };
  delete metadata.itens;
  delete metadata.grupos;
  return { ...metadata, grupos: groups } as StudyDataset;
}

export function writeDataset(exercicios: string, dataset: StudyDataset, studyRoute: string) {
  const file = datasetFile(exercicios, studyRoute);
  const raw = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) as StudyDataset : dataset;
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(denormalizeGroups(raw, dataset), null, 2), 'utf-8');
}

export function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}
