'use client';

import React from 'react';
import type { StudyItem } from '@/types';
import { groupBy } from './utils';

export function StudyView({ items }: { items: StudyItem[] }) {
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
                    <div key={`${it.Grupo}-${it.Pergunta}-${it.Resposta}`} className="card" style={{ padding: 12 }}>
                      {(() => {
                        const firstImage = it.Imagens?.[0];
                        const license = firstImage?.Copyright?.licenca ?? 'desconhecida';
                        const source = firstImage?.Copyright?.fonte ?? 'Wikimedia Commons';
                        return (
                      <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 16 }}>{it.Resposta}</div>
                          <div className="small">{it.Pergunta}</div>
                          <div className="small">Licença: {license} • Fonte: {source}</div>
                        </div>
                        <a className="btn" href={firstImage?.url} target="_blank" rel="noreferrer">Abrir</a>
                      </div>
                        );
                      })()}
                      <div style={{ marginTop: 12, display: 'grid', gap: 10, gridTemplateColumns: `repeat(${Math.min((it.Imagens ?? []).length, 2)}, 1fr)` }}>
                        {(it.Imagens ?? []).map((img, idx) => (
                          <div key={`${img.url}-${idx}`}>
                            <div className="imgWrap">
                              <img loading="lazy" src={img.url} alt={`${it.Resposta} imagem ${idx + 1}`} />
                            </div>
                            {img.indicação && (
                              <div className="small" style={{ marginTop: 6 }}>Indicação: {img.indicação}</div>
                            )}
                            {img.Copyright && (
                              <div className="small" style={{ marginTop: 4, opacity: 0.6 }}>
                                {img.Copyright.licenca} • {img.Copyright.fonte}
                              </div>
                            )}
                          </div>
                        ))}
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
