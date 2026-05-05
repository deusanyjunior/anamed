'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { EstudosCatalog, Disciplina, EstudoRef } from '@/types';

const DOCS_BASE = 'http://localhost:8000';

function getCapaUrl(e: EstudoRef): string {
  if (!e.Imagem) return '';
  if (typeof e.Imagem === 'string') return e.Imagem;
  if (Array.isArray(e.Imagem) && e.Imagem[0]) return e.Imagem[0].url;
  return '';
}

export default function Home() {
  const [catalog, setCatalog] = useState<EstudosCatalog | null>(null);
  const [newDisciplina, setNewDisciplina] = useState('');
  const [newTitulo, setNewTitulo] = useState('');
  const [newDisciplinaTarget, setNewDisciplinaTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedCapa, setExpandedCapa] = useState<string | null>(null); // "disciplina::titulo"
  const [capaUrl, setCapaUrl] = useState('');
  const [capaIndicacao, setCapaIndicacao] = useState('');
  const [capaCopyright, setCapaCopyright] = useState<{ licenca?: string; fonte?: string; urlOriginal?: string; observacao?: string }>({});
  const [capaExpandedCopyright, setCapaExpandedCopyright] = useState(false);
  const [capaDownloading, setCapaDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetch('/api/catalog').then(r => r.json()).then(setCatalog); }, []);

  function slugify(s: string) {
    return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  async function saveCatalog(updated: EstudosCatalog) {
    setSaving(true);
    await fetch('/api/catalog', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    setCatalog(updated);
    setSaving(false);
  }

  function openCapa(disciplina: string, e: EstudoRef) {
    const key = `${disciplina}::${e.Titulo}`;
    if (expandedCapa === key) { setExpandedCapa(null); return; }
    setExpandedCapa(key);
    setCapaUrl(getCapaUrl(e));
    const img = Array.isArray(e.Imagem) ? e.Imagem[0] : undefined;
    setCapaIndicacao('');
    setCapaCopyright(img?.Copyright ?? {});
    setCapaExpandedCopyright(false);
  }

  async function saveCapa(disciplina: string, titulo: string) {
    if (!catalog) return;
    const imagem = capaUrl
      ? [{ url: capaUrl, ...(Object.keys(capaCopyright).some(k => (capaCopyright as Record<string,string>)[k]) ? { Copyright: capaCopyright } : {}) }]
      : undefined;
    const updated: EstudosCatalog = {
      ...catalog,
      itens: catalog.itens.map(d =>
        d.Disciplina !== disciplina ? d : {
          ...d,
          Estudos: d.Estudos.map(e =>
            e.Titulo !== titulo ? e : { ...e, Imagem: imagem }
          ),
        }
      ),
    };
    await saveCatalog(updated);
    setExpandedCapa(null);
  }

  async function uploadCapa(disciplina: string, titulo: string, file: File) {
    const dir = `${slugify(disciplina)}/${slugify(titulo)}`;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/upload?dir=${dir}`, { method: 'POST', body: form });
    const { url } = await res.json();
    setCapaUrl(url);
  }

  async function downloadCapa(disciplina: string, titulo: string) {
    const urlInput = document.getElementById('capa-url-input') as HTMLInputElement;
    const originalUrl = urlInput?.value.trim();
    if (!originalUrl) return;
    setCapaDownloading(true);
    try {
      const dir = `${slugify(disciplina)}/${slugify(titulo)}`;
      const res = await fetch('/api/download-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: originalUrl, dir }),
      });
      const { url, error } = await res.json();
      if (error) { alert('Erro ao baixar imagem: ' + error); return; }
      setCapaUrl(url);
      setCapaCopyright(prev => ({ ...prev, urlOriginal: originalUrl }));
      urlInput.value = '';
    } finally {
      setCapaDownloading(false);
    }
  }

  async function addDisciplina() {
    if (!newDisciplina.trim() || !catalog) return;
    const updated = { ...catalog, itens: [...catalog.itens, { Disciplina: newDisciplina.trim(), Estudos: [] }] };
    await saveCatalog(updated);
    setNewDisciplina('');
  }

  async function deleteDisciplina(nome: string) {
    if (!catalog || !confirm(`Excluir disciplina "${nome}"?`)) return;
    await saveCatalog({ ...catalog, itens: catalog.itens.filter(d => d.Disciplina !== nome) });
  }

  async function addEstudo() {
    if (!newTitulo.trim() || !newDisciplinaTarget || !catalog) return;
    const disc = slugify(newDisciplinaTarget);
    const est = slugify(newTitulo.trim());
    const exercicios = `${disc}/${est}.json`;
    await fetch(`/api/dataset?path=${exercicios}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens: [] }),
    });
    const updated: EstudosCatalog = {
      ...catalog,
      itens: catalog.itens.map(d =>
        d.Disciplina === newDisciplinaTarget
          ? { ...d, Estudos: [...d.Estudos, { Titulo: newTitulo.trim(), Exercicios: exercicios }] }
          : d
      ),
    };
    await saveCatalog(updated);
    setNewTitulo('');
  }

  async function renameEstudo(disciplina: string, tituloAntigo: string) {
    const tituloNovo = window.prompt('Novo nome do estudo:', tituloAntigo);
    if (!tituloNovo || tituloNovo === tituloAntigo) return;
    const res = await fetch('/api/rename-estudo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disciplina, tituloAntigo, tituloNovo }),
    });
    const { error } = await res.json();
    if (error) { alert('Erro: ' + error); return; }
    const updated = await fetch('/api/catalog').then(r => r.json());
    setCatalog(updated);
    setExpandedCapa(null);
  }

  async function deleteEstudo(disciplina: string, titulo: string) {
    if (!catalog || !confirm(`Excluir estudo "${titulo}"?`)) return;
    const updated: EstudosCatalog = {
      ...catalog,
      itens: catalog.itens.map(d =>
        d.Disciplina === disciplina
          ? { ...d, Estudos: d.Estudos.filter(e => e.Titulo !== titulo) }
          : d
      ),
    };
    await saveCatalog(updated);
  }

  if (!catalog) return <p className="text-slate-600">Carregando...</p>;

  return (
    <div>
      <p className="text-slate-700 mb-6">Gerencie disciplinas e estudos do site.</p>

      {catalog.itens.map((d: Disciplina) => (
        <div key={d.Disciplina} className="mb-6 border border-slate-300 rounded-xl bg-slate-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900">{d.Disciplina}</h2>
            <button onClick={() => deleteDisciplina(d.Disciplina)} className="text-xs text-red-600 hover:text-red-700">
              Excluir disciplina
            </button>
          </div>

          <div className="space-y-2 mb-4">
            {d.Estudos.map(e => {
              const key = `${d.Disciplina}::${e.Titulo}`;
              const capaAtual = getCapaUrl(e);
              return (
                <div key={e.Titulo} className="border border-slate-300 rounded-lg overflow-hidden bg-white">
                  {/* linha principal */}
                  <div className="flex items-center justify-between bg-slate-100 px-3 py-2">
                    <div className="flex items-center gap-3">
                      {/* thumbnail */}
                      <div className="w-10 h-10 rounded overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                        {capaAtual
                          ? <img src={capaAtual.startsWith('assets/') ? `${DOCS_BASE}/${capaAtual}` : capaAtual}
                              alt="" className="w-full h-full object-cover"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          : <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">?</div>
                        }
                      </div>
                      <span className="text-sm text-slate-900">{e.Titulo}</span>
                    </div>
                    <div className="flex gap-3">
                      <Link href={`/estudo/${slugify(d.Disciplina)}/${slugify(e.Titulo)}?path=${e.Exercicios}`}
                        className="text-xs text-blue-600 hover:text-blue-700">Editar</Link>
                      <button onClick={() => openCapa(d.Disciplina, e)}
                        className="text-xs text-purple-600 hover:text-purple-700">Capa</button>
                      <button onClick={() => renameEstudo(d.Disciplina, e.Titulo)}
                        className="text-xs text-amber-600 hover:text-amber-700">Renomear</button>
                      <button onClick={() => deleteEstudo(d.Disciplina, e.Titulo)}
                        className="text-xs text-red-600 hover:text-red-700">Excluir</button>
                    </div>
                  </div>

                  {/* painel de capa */}
                  {expandedCapa === key && (
                    <div className="border-t border-slate-200 p-3 space-y-3 bg-white">
                      <div className="flex gap-3 items-start bg-slate-50 rounded-lg p-2">
                        {/* preview */}
                        <div className="w-20 flex-shrink-0 rounded overflow-hidden bg-slate-100 border border-slate-200">
                          {capaUrl
                            ? <img src={capaUrl.startsWith('assets/') ? `${DOCS_BASE}/${capaUrl}` : capaUrl}
                                alt="" className="w-full h-auto"
                                onError={ev => { (ev.target as HTMLImageElement).style.display = 'none'; }} />
                            : <div className="w-full h-16 flex items-center justify-center text-slate-500 text-xs">sem imagem</div>
                          }
                        </div>
                        <div className="flex-1 space-y-1.5">
                          {/* URL (readonly + renomear) */}
                          <div>
                            <label className="text-xs text-slate-600 block mb-0.5">URL</label>
                            <div className="flex gap-1.5 items-center">
                              <input readOnly
                                className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 cursor-default select-all outline-none"
                                value={capaUrl}
                              />
                              {capaUrl.startsWith('assets/') && (
                                <button type="button"
                                  className="text-xs bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded px-2 py-1 whitespace-nowrap"
                                  onClick={async () => {
                                    const current = capaUrl.split('/').pop() ?? '';
                                    const newName = window.prompt('Novo nome do arquivo:', current);
                                    if (!newName || newName === current) return;
                                    const res = await fetch('/api/rename', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ oldUrl: capaUrl, newName }),
                                    });
                                    const { url, error } = await res.json();
                                    if (error) { alert('Erro: ' + error); return; }
                                    setCapaUrl(url);
                                  }}>
                                  Renomear
                                </button>
                              )}
                            </div>
                          </div>
                          {/* Copyright colapsável */}
                          <button type="button"
                            onClick={() => setCapaExpandedCopyright(v => !v)}
                            className="text-xs text-slate-600 hover:text-slate-800">
                            {capaExpandedCopyright ? '▾' : '▸'} Copyright
                          </button>
                          {capaExpandedCopyright && (
                            <div className="space-y-1.5 pl-2 border-l border-slate-200">
                              {([['Licença', 'licenca', 'Ex: CC BY-SA 2.1 JP'], ['Fonte', 'fonte', 'Ex: Wikimedia Commons'], ['Observação', 'observacao', 'Ex: Verifique a página do arquivo'], ['URL original', 'urlOriginal', 'Ex: https://commons.wikimedia.org/...']] as const).map(([label, field, placeholder]) => (
                                <div key={field}>
                                  <label className="text-xs text-slate-600 block mb-0.5">{label}</label>
                                  <input
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                                    placeholder={placeholder}
                                    value={(capaCopyright as Record<string,string>)[field] ?? ''}
                                    onChange={ev => setCapaCopyright(prev => ({ ...prev, [field]: ev.target.value }))}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Upload / URL */}
                      <div className="space-y-2">
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                          onChange={async ev => {
                            const f = ev.target.files?.[0];
                            if (f) await uploadCapa(d.Disciplina, e.Titulo, f);
                            ev.target.value = '';
                          }} />
                        <button onClick={() => fileInputRef.current?.click()}
                          className="text-xs bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded-lg px-3 py-1.5">
                          ↑ Upload
                        </button>
                        <div className="flex gap-2">
                          <input id="capa-url-input"
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                            placeholder="Adicionar por URL…"
                            onKeyDown={ev => { if (ev.key === 'Enter') downloadCapa(d.Disciplina, e.Titulo); }}
                          />
                          <button onClick={() => downloadCapa(d.Disciplina, e.Titulo)}
                            disabled={capaDownloading}
                            className="text-xs bg-slate-200 hover:bg-slate-300 disabled:opacity-50 border border-slate-300 rounded-lg px-3 py-1.5">
                            {capaDownloading ? 'Baixando…' : '+ Adicionar'}
                          </button>
                        </div>
                      </div>
                      {/* Salvar / Cancelar */}
                      <div className="flex gap-2">
                        <button onClick={() => saveCapa(d.Disciplina, e.Titulo)} disabled={saving}
                          className="text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg px-3 py-1.5">
                          Salvar
                        </button>
                        <button onClick={() => setExpandedCapa(null)}
                          className="text-xs text-slate-600 hover:text-slate-800 px-2">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {d.Estudos.length === 0 && <p className="text-xs text-slate-600">Nenhum estudo.</p>}
          </div>

          {/* Adicionar estudo */}
          <div className="flex gap-2">
            <input
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500"
              placeholder="Título do novo estudo"
              value={newDisciplinaTarget === d.Disciplina ? newTitulo : ''}
              onFocus={() => setNewDisciplinaTarget(d.Disciplina)}
              onChange={e => { setNewDisciplinaTarget(d.Disciplina); setNewTitulo(e.target.value); }}
              onKeyDown={e => e.key === 'Enter' && addEstudo()}
            />
            <button
              onClick={addEstudo}
              disabled={saving || newDisciplinaTarget !== d.Disciplina || !newTitulo.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm px-3 py-1.5 rounded-lg">
              + Estudo
            </button>
          </div>
        </div>
      ))}

      {/* Adicionar disciplina */}
      <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-white">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Nova disciplina</h3>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500"
            placeholder="Nome da disciplina"
            value={newDisciplina}
            onChange={e => setNewDisciplina(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addDisciplina()}
          />
          <button
            onClick={addDisciplina}
            disabled={saving || !newDisciplina.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm px-3 py-1.5 rounded-lg">
            + Disciplina
          </button>
        </div>
      </div>
    </div>
  );
}
