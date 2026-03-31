import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AnaMed — Criando sinapses com a Turma 94 da EPM',
  description: 'Plataforma de estudo e quiz de anatomia óssea.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
