import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import AuthSessionProvider from '../components/SessionProvider';
import AniahChat from '../components/AniahChat';

export const metadata: Metadata = {
  title: 'AnaMed — Anatomia para todos',
  description: 'Ferramenta para estudo e memorização de conteúdos sobre anatomia humana.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="container">
          <header className="site-header">
            <Link className="title" href="/">
              <span className="brand-blue">Ana</span><span className="brand-red">Med</span>
              <span> — Anatomia para todos</span>
            </Link>
          </header>
          <AuthSessionProvider>
            {children}
            <AniahChat />
          </AuthSessionProvider>
        </div>
      </body>
    </html>
  );
}
