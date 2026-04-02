import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AnaMed — Criando sinapses com a Turma 94 da EPM',
  description: 'Plataforma de estudo e quiz de anatomia óssea.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>
        <div className="container">
          <header style={{ marginBottom: 18 }}>
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <h1 className="title" style={{ marginBottom: 6 }}>
                <span className="brandBlue">Ana</span>
                <span className="brandRed">Med</span>
                {" "}— Criando sinapses com a Turma 94 da EPM
              </h1>
            </Link>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
