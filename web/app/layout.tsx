import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import AuthSessionProvider from '../components/SessionProvider';
import AniahChat from '../components/AniahChat';
import VLibrasWidget from '../components/VLibrasWidget';
import AccessibilityZoom from '../components/AccessibilityZoom';
import BackToTop from '../components/BackToTop';

export const metadata: Metadata = {
  title: 'AnaMed — Anatomia Quiz & Atlas',
  description: 'Ferramenta para estudo e memorização de conteúdos sobre anatomia humana.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="container">
          <header className="site-header">
            <div className="site-header-row">
              <Link className="title" href="/">
                <span className="brand-gradient"><span className="brand-blue">Ana</span><span className="brand-red">Med</span></span>
                <span className="site-title-subtitle"> ⚕ Anatomia Quiz & Atlas</span>
              </Link>
              <AccessibilityZoom />
            </div>
          </header>
          <AuthSessionProvider>
            {children}
            <AniahChat />
            <BackToTop />
            <VLibrasWidget />
          </AuthSessionProvider>
        </div>
      </body>
    </html>
  );
}
