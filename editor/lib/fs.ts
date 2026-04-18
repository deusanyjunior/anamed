import path from 'path';
import fs from 'fs';
import type { EstudosCatalog, StudyDataset } from '@/types';

export const DOCS_ASSETS = path.resolve(process.cwd(), '..', 'docs', 'assets');

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

export function readDataset(exercicios: string): StudyDataset {
  const raw = fs.readFileSync(path.join(DOCS_ASSETS, exercicios), 'utf-8');
  return JSON.parse(raw);
}

export function writeDataset(exercicios: string, dataset: StudyDataset) {
  fs.writeFileSync(
    path.join(DOCS_ASSETS, exercicios),
    JSON.stringify(dataset, null, 2),
    'utf-8'
  );
}

export function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}
