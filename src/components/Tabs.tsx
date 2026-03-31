'use client';
import React from 'react';
export type TabKey = 'estudo' | 'quiz';

export function Tabs({ value, onChange }: { value: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <div className="row" role="tablist" aria-label="Abas">
      <button className={`btn ${value === 'estudo' ? 'btnPrimary' : ''}`} role="tab" aria-selected={value === 'estudo'} onClick={() => onChange('estudo')}>
        Estudo
      </button>
      <button className={`btn ${value === 'quiz' ? 'btnPrimary' : ''}`} role="tab" aria-selected={value === 'quiz'} onClick={() => onChange('quiz')}>
        Quiz
      </button>
    </div>
  );
}
