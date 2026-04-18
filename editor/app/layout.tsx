import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AnaMed Editor',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body className="min-h-screen bg-gray-950 text-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-2xl font-bold">
              <span className="text-blue-500">Ana</span>
              <span className="text-red-500">Med</span>
              <span className="text-gray-400 font-normal"> — Editor</span>
            </h1>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
