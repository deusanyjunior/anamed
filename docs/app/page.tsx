import Link from 'next/link';
import { coverUrl, readCatalog, routeFromExercises } from '../lib/catalog';

export default function HomePage() {
  const catalog = readCatalog();

  return (
    <main>
      <p className="subtitle">Escolha um tema para ver os estudos disponíveis.</p>
      <div className="grid-auto">
        {catalog.itens.map(tema => (
          <section className="card" key={tema.Tema}>
            <div className="card-body">
              <div className="pill">Tema</div>
              <h2 style={{ margin: '10px 0 8px', fontSize: 21 }}>{tema.Tema}</h2>
              <div className="small">{tema.Estudos.length} estudo(s)</div>
            </div>
            <div className="grid-auto" style={{ padding: '0 14px 14px' }}>
              {tema.Estudos.map(estudo => {
                const href = `/${routeFromExercises(estudo.Exercicios)}`;
                const capa = coverUrl(estudo);
                return (
                  <Link className="card card-clickable" href={href} key={estudo.Exercicios}>
                    <div className="card-media">
                      {capa ? <img src={capa} alt={estudo.Titulo} loading="lazy" /> : <div className="small" style={{ padding: 12 }}>Sem imagem</div>}
                    </div>
                    <div className="card-body">
                      <div className="pill">Estudo</div>
                      <div style={{ fontWeight: 800, fontSize: 18, marginTop: 10 }}>{estudo.Titulo}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
