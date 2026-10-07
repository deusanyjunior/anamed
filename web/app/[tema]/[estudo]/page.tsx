import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import StudyExperience from '../../../components/StudyExperience';
import { allStudies, findStudy, readCatalog, readDataset, routePartsFromStudy, routeFromStudy } from '../../../lib/catalog';

type PageProps = {
  params: Promise<{ tema: string; estudo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateStaticParams() {
  return allStudies().map(({ tema, estudo }) => routePartsFromStudy(estudo, tema));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tema, estudo } = await params;
  const found = findStudy(tema, estudo);
  return { title: found ? `${found.estudo.Titulo} — AnaMed` : 'Estudo — AnaMed' };
}

export default async function StudyPage({ params, searchParams }: PageProps) {
  const { tema, estudo } = await params;
  const query = await searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const itemId = first(query.item);
  const found = findStudy(tema, estudo, readCatalog());
  if (!found) notFound();

  let dataset;
  try {
    dataset = readDataset(found.estudo.Exercicios, routeFromStudy(found.estudo, found.tema));
  } catch {
    notFound();
  }

  const mediaBase = `/assets/${routeFromStudy(found.estudo, found.tema)}`;

  return (
    <main>
      <nav className="breadcrumb">
        <Link href="/">Início</Link><span> › </span>
        <Link href="/">{found.tema.Tema}</Link><span> › </span>
        <span>{found.estudo.Titulo}</span>
      </nav>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 26 }}>{found.estudo.Titulo}</h2>
        <p className="small" style={{ marginTop: 6 }}>{dataset.itens.length} itens</p>
      </div>
      <StudyExperience
        dataset={dataset}
        studyTitle={found.estudo.Titulo}
        studyKey={routeFromStudy(found.estudo, found.tema)}
        mediaBase={mediaBase}
        deepLink={{ itemId }}
      />
    </main>
  );
}
