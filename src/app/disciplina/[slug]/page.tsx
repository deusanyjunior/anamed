import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDisciplinaBySlug, getEstudoCapa, slugify } from '@/lib/studies';

export default function DisciplinaPage({ params }: { params: { slug: string } }) {
  const disciplina = getDisciplinaBySlug(params.slug);

  if (!disciplina) {
    notFound();
  }

  return (
    <>
      <div className="small" style={{ marginBottom: 10 }}>
        <Link href="/" style={{ color: 'inherit' }}>Inicio</Link>
        {' > '}
        <span>{disciplina.Disciplina}</span>
      </div>

      <h1 className="title">{disciplina.Disciplina}</h1>
      <p className="subtitle">Selecione um estudo para abrir a area de estudo e quiz.</p>

      <div style={{ marginBottom: 14 }}>
        <Link href="/" className="btn">← Voltar para disciplinas</Link>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12
        }}
      >
        {disciplina.Estudos.map((e) => {
          const capa = getEstudoCapa(e);
          return (
            <div
              key={e.Titulo}
              className="btn"
              style={{
                textAlign: 'left',
                padding: 0,
                overflow: 'hidden',
                borderRadius: 14,
                color: 'inherit'
              }}
            >
              <Link
                href={`/estudo/${params.slug}/${slugify(e.Titulo)}`}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit'
                }}
              >
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    background: 'rgba(255,255,255,.04)',
                    overflow: 'hidden'
                  }}
                >
                  {capa.url ? (
                    <img
                      src={capa.url}
                      alt={e.Titulo}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="small" style={{ padding: 12 }}>Sem imagem</div>
                  )}
                </div>
                {capa.copyright && (
                  <div className="small" style={{ padding: '8px 10px 0' }}>
                    Licença: {capa.copyright.licenca} • Fonte: {capa.copyright.fonte}
                  </div>
                )}
                <div style={{ padding: 10 }}>
                  <div style={{ fontWeight: 700 }}>{e.Titulo}</div>
                  <div className="small">{e.Exercicios}</div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
