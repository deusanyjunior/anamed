'use client';

import React from 'react';
import dataset from '@/data/bones.json';
import type { BonesDataset, BoneItem } from '@/types';
import { Tabs, type TabKey } from '@/components/Tabs';
import { StudyView } from '@/components/StudyView';
import { QuizView } from '@/components/QuizView';

export default function Page() {
  const [tab, setTab] = React.useState<TabKey>('estudo');
  const data = dataset as unknown as BonesDataset;
  const items = (data.itens ?? []) as BoneItem[];

  return (
    <>
      <h1 className="title">
        <span className="brandBlue">Ana</span>
        <span className="brandRed">Med</span>
        {" "}— Criando sinapses com a Turma 94 da EPM
      </h1>
      <p className="subtitle">
        ✅ Estudo: Reveja cada grupo de ossos.<br />
        ✅ Quiz: Avalie sua memorização.
      </p>

      <Tabs value={tab} onChange={setTab} />

      <div style={{ marginTop: 14 }}>
        {tab === 'estudo' ? <StudyView items={items} /> : <QuizView items={items} />}
      </div>

      <div style={{ marginTop: 14 }} className="small">
        Dataset em <code>src/data/bones.json</code>. Imagens via URLs externas (Wikimedia Commons).
      </div>
    </>
  );
}
