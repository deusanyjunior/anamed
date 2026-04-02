'use client';

import React from 'react';
import Link from 'next/link';
import type { StudyItem } from '@/types';
import { Tabs, type TabKey } from '@/components/Tabs';
import { StudyView } from '@/components/StudyView';
import { QuizView } from '@/components/QuizView';

export function StudyShell({
  disciplinaNome,
  estudoTitulo,
  disciplinaSlug,
  items
}: {
  disciplinaNome: string;
  estudoTitulo: string;
  disciplinaSlug: string;
  items: StudyItem[];
}) {
  const [tab, setTab] = React.useState<TabKey>('estudo');

  return (
    <>
      <div className="small" style={{ marginBottom: 10 }}>
        <Link href="/" style={{ color: 'inherit' }}>Inicio</Link>
        {' > '}
        <Link href={`/disciplina/${disciplinaSlug}`} style={{ color: 'inherit' }}>{disciplinaNome}</Link>
        {' > '}
        <span>{estudoTitulo}</span>
      </div>

      <h1 className="title">{disciplinaNome}</h1>
      <p className="subtitle">{estudoTitulo}</p>

      <div className="row" style={{ marginBottom: 14 }}>
        <Link href="/" className="btn">← Disciplinas</Link>
        <Link href={`/disciplina/${disciplinaSlug}`} className="btn">← Estudos</Link>
      </div>

      <Tabs value={tab} onChange={setTab} />

      <div style={{ marginTop: 14 }}>
        {tab === 'estudo' ? <StudyView items={items} /> : <QuizView items={items} />}
      </div>
    </>
  );
}
