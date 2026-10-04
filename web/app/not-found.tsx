import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="error">
      <h2>Estudo não encontrado</h2>
      <p>O tema ou estudo solicitado não existe no catálogo.</p>
      <Link href="/" className="btn btn-primary" style={{ display: 'inline-block', marginTop: 8 }}>Voltar ao início</Link>
    </main>
  );
}
