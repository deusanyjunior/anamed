import Link from 'next/link';
import { getDisciplinas, getEstudoCapa, slugify } from '@/lib/studies';

export default function Page() {
  const disciplinas = getDisciplinas();

  return (
    <>
      <div className="small" style={{ marginBottom: 10 }}>
        <span>Inicio</span>
      </div>
      <p className="subtitle">
        Escolha uma disciplina para ver os estudos disponiveis.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12
        }}
      >
        {disciplinas.map((d) => {
          const firstStudy = d.Estudos[0];
          const capa = firstStudy ? getEstudoCapa(firstStudy) : { url: undefined };
          return (
            <Link
              key={d.Disciplina}
              href={`/disciplina/${slugify(d.Disciplina)}`}
              className="card"
              style={{ textDecoration: 'none', color: 'inherit', overflow: 'hidden', padding: 0 }}
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
                    alt={d.Disciplina}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div className="small" style={{ padding: 12 }}>Sem imagem</div>
                )}
              </div>
              <div style={{ padding: 14 }}>
                <div className="pill">Disciplina</div>
                <div style={{ fontWeight: 800, fontSize: 18, marginTop: 10 }}>{d.Disciplina}</div>
                <div className="small" style={{ marginTop: 8 }}>
                  {d.Estudos.length} estudo(s)
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
