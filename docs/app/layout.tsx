import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'AnaMed — Estudo & Quiz de Anatomia',
  description: 'Estudo e memorização de conteúdos de Anatomia.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="container">
          <header className="site-header">
            <Link className="title" href="/">
              <span className="brand-blue">Ana</span><span className="brand-red">Med</span>
              <span> — Criando sinapses com a Turma 94 da EPM</span>
            </Link>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
