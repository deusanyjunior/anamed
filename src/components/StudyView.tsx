'use client';

import React from 'react';
import type { BoneItem } from '@/types';
import { groupBy } from './utils';

export function StudyView({ items }: { items: BoneItem[] }) {
  const grouped = React.useMemo(() => groupBy(items, (i) => i.Grupo), [items]);
  const groups = React.useMemo(() => Object.keys(grouped).sort(), [grouped]);
  const [open, setOpen] = React.useState<string | null>(null);
  const groupRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="pill">📚 Estudo</div>
          <div className="small" style={{ marginTop: 8 }}>
            Clique em um grupo para carregar os itens. (Renderização sob demanda por grupo.)
          </div>
        </div>
        <div className="pill">{items.length} itens</div>
      </div>

      <div className="divider" />

      <div style={{ display: 'grid', gap: 10 }}>
        {groups.map((g) => {
          const isOpen = open === g;
          return (
            <div key={g} ref={(el) => { groupRefs.current[g] = el; }} className="card" style={{ padding: 12, background: 'rgba(255,255,255,.03)' }}>
              <button
                className="btn"
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => {
                  const next = isOpen ? null : g;
                  setOpen(next);
                  if (next) setTimeout(() => groupRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                }}
                aria-expanded={isOpen}
              >
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 18 }}>{isOpen ? '▾' : '▸'}</span>
                  <span>{g}</span>
                  <span className="pill" style={{ padding: '4px 10px' }}>{grouped[g].length}</span>
                </span>
                <span className="small">{isOpen ? 'Recolher' : 'Abrir'}</span>
              </button>

              {isOpen && (
                <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                  {grouped[g].map((it) => (
                    <div key={`${it.Grupo}-${it.Osso}`} className="card" style={{ padding: 12 }}>
                      <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 16 }}>{it.Osso}</div>
                          <div className="small">Licença: {it.Copyright?.licenca} • Fonte: {it.Copyright?.fonte}</div>
                        </div>
                        <a className="btn" href={it.Imagens[0]} target="_blank" rel="noreferrer">Abrir</a>
                      </div>
                      <div className="grid2" style={{ marginTop: 12 }}>
                        <div className="imgWrap"><img loading="lazy" src={it.Imagens[0]} alt={`${it.Osso} imagem 1`} /></div>
                        <div className="imgWrap"><img loading="lazy" src={it.Imagens[1]} alt={`${it.Osso} imagem 2`} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
