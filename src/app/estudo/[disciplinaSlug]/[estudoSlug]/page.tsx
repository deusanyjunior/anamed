import { notFound } from 'next/navigation';
import { getDatasetByPath, getDisciplinaBySlug, getEstudoBySlug } from '@/lib/studies';
import { StudyShell } from '@/components/StudyShell';

export default function EstudoPage({
  params
}: {
  params: { disciplinaSlug: string; estudoSlug: string };
}) {
  const disciplina = getDisciplinaBySlug(params.disciplinaSlug);
  const estudo = getEstudoBySlug(params.disciplinaSlug, params.estudoSlug);

  if (!disciplina || !estudo) {
    notFound();
  }

  const dataset = getDatasetByPath(estudo.Exercicios);
  const items = dataset.itens ?? [];

  return (
    <StudyShell
      disciplinaNome={disciplina.Disciplina}
      estudoTitulo={estudo.Titulo}
      disciplinaSlug={params.disciplinaSlug}
      items={items}
    />
  );
}
