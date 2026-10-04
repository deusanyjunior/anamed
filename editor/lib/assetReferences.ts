import fs from 'fs';
import path from 'path';
import { DOCS_ASSETS, readCatalog, readDataset } from './fs';

type AssetReference = {
  source: string;
  itemId?: string;
  item?: string;
};

function sameUrl(value: string | undefined, target: string) {
  return value === target;
}

export function assetReferences(targetUrl: string): AssetReference[] {
  const references: AssetReference[] = [];
  const catalog = readCatalog();

  for (const tema of catalog.itens ?? []) {
    for (const estudo of tema.Estudos ?? []) {
      const cover = typeof estudo.Imagem === 'string' ? estudo.Imagem : estudo.Imagem?.[0]?.url;
      if (sameUrl(cover, targetUrl)) {
        references.push({ source: `${tema.Tema} / ${estudo.Titulo} (capa)` });
      }

      try {
        const dataset = readDataset(estudo.Exercicios);
        dataset.itens.forEach((item, itemIndex) => {
          item.Imagens?.forEach(image => {
            if (sameUrl(image.url, targetUrl)) {
              references.push({
                source: estudo.Exercicios,
                itemId: item.id ?? `item-${itemIndex + 1}`,
                item: item.Item,
              });
            }
          });
        });
      } catch {
        // Um dataset inválido não deve impedir a verificação dos demais.
      }
    }
  }

  return references;
}

export function resolveAssetUrl(url: string) {
  if (!url.startsWith('assets/')) throw new Error('Somente assets locais podem ser removidos');
  const relative = url.slice('assets/'.length).replaceAll('\\', '/');
  if (!relative || relative.includes('..') || relative.startsWith('/')) throw new Error('Caminho de asset inválido');
  const root = path.resolve(DOCS_ASSETS);
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error('Asset fora da pasta de dados');
  return resolved;
}

export function listImages(dir: string) {
  const root = path.resolve(DOCS_ASSETS);
  const relative = dir.replace(/^assets\/?/, '').replaceAll('\\', '/');
  if (!relative || relative.includes('..') || relative.startsWith('/')) throw new Error('Diretório inválido');
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error('Diretório fora da pasta de dados');
  if (!fs.existsSync(resolved)) return [];
  return fs.readdirSync(resolved, { withFileTypes: true })
    .filter(entry => entry.isFile() && /\.(png|jpe?g|gif|webp|svg)$/i.test(entry.name))
    .map(entry => ({ name: entry.name, url: `assets/${relative}/${entry.name}` }));
}
