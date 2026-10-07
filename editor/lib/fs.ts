import path from 'path';
import fs from 'fs';
import type { EstudosCatalog, StudyDataset, StudyItem } from '@/types';

export const DOCS_ASSETS = path.resolve(process.cwd(), '..', 'web', 'data');

export function readCatalog(): EstudosCatalog {
  const raw = fs.readFileSync(path.join(DOCS_ASSETS, 'estudos.json'), 'utf-8');
  return JSON.parse(raw);
}

export function writeCatalog(catalog: EstudosCatalog) {
  fs.writeFileSync(
    path.join(DOCS_ASSETS, 'estudos.json'),
    JSON.stringify(catalog, null, 2),
    'utf-8'
  );
}

function datasetFile(exercicios: string, studyRoute?: string) {
  return path.join(DOCS_ASSETS, studyRoute ? studyRoute : '', exercicios);
}

export function readDataset(exercicios: string, studyRoute?: string): StudyDataset {
  const raw = JSON.parse(fs.readFileSync(datasetFile(exercicios, studyRoute), 'utf-8')) as StudyDataset;
  if (!raw.grupos) return raw;
  return {
    ...raw,
    itens: raw.grupos.flatMap(group => group.itens.map(item => ({ ...item, Grupo: group.Grupo }))),
  };
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
    return {
      ID: previous?.ID ?? `grupo-${index + 1}`,
      Grupo: name === '(sem grupo)' ? '' : name,
      itens: items,
    };
  });
  const metadata: Partial<StudyDataset> = { ...dataset };
  delete metadata.itens;
  delete metadata.grupos;
  return { ...metadata, grupos: groups } as StudyDataset;
}

export function writeDataset(exercicios: string, dataset: StudyDataset, studyRoute?: string) {
  const file = datasetFile(exercicios, studyRoute);
  const raw = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) as StudyDataset : dataset;
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(denormalizeGroups(raw, dataset), null, 2), 'utf-8');
}

export function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}
