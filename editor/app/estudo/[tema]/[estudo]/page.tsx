'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { StudyAudio, StudyDataset, StudyImage, StudyItem, StudyVideo } from '@/types';

const DOCS_BASE = 'http://localhost:8000';

function youtubeEmbedUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    let videoId = '';
    if (hostname === 'youtu.be') videoId = url.pathname.split('/').filter(Boolean)[0] ?? '';
    else if (hostname === 'youtube.com' || hostname === 'youtube-nocookie.com') {
      if (url.pathname === '/watch') videoId = url.searchParams.get('v') ?? '';
      else if (/^\/(shorts|embed)\/[^/]+/.test(url.pathname)) videoId = url.pathname.split('/')[2] ?? '';
    }
    return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

function videoFileUrl(url: string) {
  return /^https?:\/\//i.test(url) || url.startsWith('/') ? url : `${DOCS_BASE}/${url}`;
}

function newEntityId(prefix: string) {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
}

function normalizeDataset(dataset: StudyDataset): StudyDataset {
  return {
    ...dataset,
    itens: dataset.itens.map((item, itemIdx) => {
      const id = item.id || `item-${itemIdx + 1}`;
      return {
        ...item,
        id,
        Audios: (item.Audios ?? []).map((audio, audioIdx) => ({ ...audio, id: audio.id || `${id}-audio-${audioIdx + 1}` })),
      };
    }),
  };
}

function emptyItem(): StudyItem {
  return { id: newEntityId('item'), Grupo: '', Descricao: '', Item: '', Imagens: [], Audios: [], Videos: [] };
}

export default function EstudoEditor() {
  const params = useParams();
  const searchParams = useSearchParams();
  const datasetPath = searchParams.get('path') ?? '';
  const studyDir = datasetPath.replace(/\.json$/, '');
  const imageDir = `${studyDir}/imagens`;
  const audioDir = `${studyDir}/audios`;
  const videoDir = studyDir;

  const [dataset, setDataset] = useState<StudyDataset | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [expandedCopyright, setExpandedCopyright] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFor, setUploadingFor] = useState<number | null>(null);

  useEffect(() => {
    if (!datasetPath) return;
    fetch(`/api/dataset?path=${datasetPath}`).then(r => r.json()).then(body => setDataset(normalizeDataset(body)));
  }, [datasetPath]);

  async function save(ds: StudyDataset) {
    setSaving(true);
    await fetch(`/api/dataset?path=${datasetPath}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ds),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updateItem(idx: number, updated: StudyItem) {
    if (!dataset) return;
    const itens = dataset.itens.map((it, i) => i === idx ? updated : it);
    setDataset({ ...dataset, itens });
  }

  function moveItem(idx: number, dir: -1 | 1) {
    if (!dataset) return;
    const itens = [...dataset.itens];
    const target = idx + dir;
    if (target < 0 || target >= itens.length) return;
    [itens[idx], itens[target]] = [itens[target], itens[idx]];
    setDataset({ ...dataset, itens });
    setExpandedIdx(target);
  }

  function deleteItem(idx: number) {
    if (!dataset || !confirm('Excluir este item?')) return;
    const itens = dataset.itens.filter((_, i) => i !== idx);
    setDataset({ ...dataset, itens });
    setExpandedIdx(null);
  }

  function addItem() {
    if (!dataset) return;
    const itens = [...dataset.itens, emptyItem()];
    setDataset({ ...dataset, itens });
    setExpandedIdx(itens.length - 1);
  }

  async function uploadImage(idx: number, file: File) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/upload?dir=${imageDir}`, { method: 'POST', body: form });
    const { url } = await res.json();
    if (!dataset) return;
    const item = dataset.itens[idx];
    updateItem(idx, { ...item, Imagens: [...item.Imagens, { url, indicação: '' }] });
  }

  async function addByUrl(idx: number) {
    const input = document.getElementById(`url-input-${idx}`) as HTMLInputElement;
    const originalUrl = input?.value.trim();
    if (!originalUrl || !dataset) return;
    input.disabled = true;
    try {
      const res = await fetch('/api/download-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: originalUrl, dir: imageDir }),
      });
      const { url, error } = await res.json();
      if (error) { alert('Erro ao baixar imagem: ' + error); return; }
      const item = dataset.itens[idx];
      updateItem(idx, {
        ...item,
        Imagens: [...item.Imagens, {
          url,
          indicação: '',
          Copyright: { urlOriginal: originalUrl },
        }],
      });
      input.value = '';
    } finally {
      input.disabled = false;
    }
  }

  function removeImage(itemIdx: number, imgIdx: number) {
    if (!dataset) return;
    const item = dataset.itens[itemIdx];
    updateItem(itemIdx, { ...item, Imagens: item.Imagens.filter((_, i) => i !== imgIdx) });
  }

  function moveImage(itemIdx: number, imgIdx: number, dir: -1 | 1) {
    if (!dataset) return;
    const item = dataset.itens[itemIdx];
    const imgs = [...item.Imagens];
    const target = imgIdx + dir;
    if (target < 0 || target >= imgs.length) return;
    [imgs[imgIdx], imgs[target]] = [imgs[target], imgs[imgIdx]];
    updateItem(itemIdx, { ...item, Imagens: imgs });
  }

  function updateImage(itemIdx: number, imgIdx: number, updated: StudyImage) {
    if (!dataset) return;
    const item = dataset.itens[itemIdx];
    updateItem(itemIdx, { ...item, Imagens: item.Imagens.map((img, i) => i === imgIdx ? updated : img) });
  }

  function updateAudio(itemIdx: number, audioIdx: number, updated: StudyAudio) {
    if (!dataset) return;
    const item = dataset.itens[itemIdx];
    const audios = item.Audios ?? [];
    updateItem(itemIdx, { ...item, Audios: audios.map((audio, i) => i === audioIdx ? updated : audio) });
  }

  function removeAudio(itemIdx: number, audioIdx: number) {
    if (!dataset) return;
    const item = dataset.itens[itemIdx];
    updateItem(itemIdx, { ...item, Audios: (item.Audios ?? []).filter((_, i) => i !== audioIdx) });
  }

  function moveAudio(itemIdx: number, audioIdx: number, dir: -1 | 1) {
    if (!dataset) return;
    const item = dataset.itens[itemIdx];
    const audios = [...(item.Audios ?? [])];
    const target = audioIdx + dir;
    if (target < 0 || target >= audios.length) return;
    [audios[audioIdx], audios[target]] = [audios[target], audios[audioIdx]];
    updateItem(itemIdx, { ...item, Audios: audios });
  }

  function updateVideo(itemIdx: number, videoIdx: number, updated: StudyVideo) {
    if (!dataset) return;
    const item = dataset.itens[itemIdx];
    const videos = item.Videos ?? [];
    updateItem(itemIdx, { ...item, Videos: videos.map((video, i) => i === videoIdx ? updated : video) });
  }

  function removeVideo(itemIdx: number, videoIdx: number) {
    if (!dataset) return;
    const item = dataset.itens[itemIdx];
    updateItem(itemIdx, { ...item, Videos: (item.Videos ?? []).filter((_, i) => i !== videoIdx) });
  }

  function moveVideo(itemIdx: number, videoIdx: number, dir: -1 | 1) {
    if (!dataset) return;
    const item = dataset.itens[itemIdx];
    const videos = [...(item.Videos ?? [])];
    const target = videoIdx + dir;
    if (target < 0 || target >= videos.length) return;
    [videos[videoIdx], videos[target]] = [videos[target], videos[videoIdx]];
    updateItem(itemIdx, { ...item, Videos: videos });
  }

  async function uploadAudio(itemIdx: number, file: File) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/upload?dir=${audioDir}`, { method: 'POST', body: form });
    const { url } = await res.json();
    if (!dataset) return;
    const item = dataset.itens[itemIdx];
    updateItem(itemIdx, { ...item, Audios: [...(item.Audios ?? []), { id: newEntityId('audio'), url, Titulo: file.name.replace(/\.[^.]+$/, '') }] });
  }

  async function uploadVideo(itemIdx: number, file: File) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/upload?dir=${videoDir}`, { method: 'POST', body: form });
    const { url } = await res.json();
    if (!dataset) return;
    const item = dataset.itens[itemIdx];
    updateItem(itemIdx, { ...item, Videos: [...(item.Videos ?? []), { url, Titulo: file.name.replace(/\.[^.]+$/, ''), Tipo: 'arquivo' }] });
  }

  function addAudioByUrl(itemIdx: number) {
    if (!dataset) return;
    const url = window.prompt('URL do áudio:')?.trim();
    if (!url) return;
    const titulo = window.prompt('Título do áudio:', url.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '')?.trim() ?? '';
    const item = dataset.itens[itemIdx];
    updateItem(itemIdx, { ...item, Audios: [...(item.Audios ?? []), { id: newEntityId('audio'), url, Titulo: titulo || undefined }] });
  }

  function addVideoByUrl(itemIdx: number) {
    if (!dataset) return;
    const url = window.prompt('URL do vídeo:')?.trim();
    if (!url) return;
    const titulo = window.prompt('Título do vídeo:', url.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '')?.trim() ?? '';
    const item = dataset.itens[itemIdx];
    updateItem(itemIdx, { ...item, Videos: [...(item.Videos ?? []), { url, Titulo: titulo || undefined, Tipo: 'arquivo' }] });
  }

  if (!dataset) return <p className="text-slate-600">Carregando...</p>;

  const grupos = [...new Set(dataset.itens.map(i => i.Grupo).filter(Boolean))];
  const exemploDescricao = dataset.itens.find(i => i.Descricao)?.Descricao ?? 'Ex: Nome do osso';
  const exemploItem = dataset.itens.find(i => i.Item)?.Item ?? 'Ex: Osso frontal';
  const exemploGrupo = grupos[0] ?? 'Ex: Crânio > Neurocrânio';

  // placeholders de copyright baseados no primeiro item que tiver imagem com copyright
  const copyrightPlaceholders: Record<string, string> = {
    licenca:     'Ex: CC BY-SA 2.1 JP',
    fonte:       'Ex: Wikimedia Commons',
    observacao:  'Ex: Verifique a página do arquivo no Wikimedia Commons',
    urlOriginal: 'Ex: https://commons.wikimedia.org/wiki/...',
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-slate-600 mb-4">
        <Link href="/" className="hover:text-blue-700">Início</Link>
        <span className="mx-2 text-slate-500">›</span>
        <span className="text-slate-700">{params.tema} / {params.estudo}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold capitalize">{String(params.estudo).replace(/-/g, ' ')}</h2>
          <p className="text-xs text-slate-600 mt-1">{datasetPath} — {dataset.itens.length} itens</p>
        </div>
        <button
          onClick={() => save(dataset)}
          disabled={saving}
          className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm">
          {saving ? 'Salvando…' : saved ? '✓ Salvo' : 'Salvar'}
        </button>
      </div>

      {/* Lista de itens */}
      <div className="space-y-2 mb-4">
        {dataset.itens.map((item, idx) => (
          <div key={idx} className="border border-slate-300 rounded-xl overflow-hidden bg-white">
            {/* Cabeçalho do item */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveItem(idx, -1)} disabled={idx === 0}
                  className="text-slate-600 hover:text-slate-800 disabled:opacity-20 text-xs leading-none">▲</button>
                <button onClick={() => moveItem(idx, 1)} disabled={idx === dataset.itens.length - 1}
                  className="text-slate-600 hover:text-slate-800 disabled:opacity-20 text-xs leading-none">▼</button>
              </div>
              <span className="text-xs text-slate-600 w-6 text-center">{idx + 1}</span>
              <button
                className="flex-1 text-left text-sm truncate text-slate-900"
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}>
                <span className="text-slate-500 text-xs mr-2">{item.Grupo || '(sem grupo)'}</span>
                {item.Item || <span className="text-slate-500 italic">sem item</span>}
              </button>
              <button onClick={() => deleteItem(idx)} className="text-red-500 hover:text-red-400 text-xs px-2">✕</button>
            </div>

            {/* Corpo expandido */}
            {expandedIdx === idx && (
              <div className="p-4 space-y-3 border-t border-slate-200 bg-white">
                <div>
                  <label className="text-xs text-slate-600 block mb-1">ID do item</label>
                  <input
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500"
                    value={item.id ?? ''}
                    placeholder="Identificador estável do item"
                    onChange={e => updateItem(idx, { ...item, id: e.target.value || undefined })}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 block mb-1">Descrição</label>
                  <input
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500"
                    placeholder={exemploDescricao}
                    value={item.Descricao}
                    onChange={e => updateItem(idx, { ...item, Descricao: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 block mb-1">Item</label>
                  <input
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500"
                    placeholder={exemploItem}
                    value={item.Item}
                    onChange={e => updateItem(idx, { ...item, Item: e.target.value })}
                  />
                </div>

                {/* Grupo com sugestões */}
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Grupo</label>
                  <input
                    list={`grupos-${idx}`}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500"
                    placeholder={exemploGrupo}
                    value={item.Grupo}
                    onChange={e => updateItem(idx, { ...item, Grupo: e.target.value })}
                  />
                  <datalist id={`grupos-${idx}`}>
                    {grupos.map(g => <option key={g} value={g} />)}
                  </datalist>
                </div>

                {/* Imagens */}
                <div>
                  <label className="text-xs text-slate-600 block mb-2">Imagens</label>
                  <div className="space-y-2">
                    {item.Imagens.map((img, imgIdx) => (
                      <div key={imgIdx} className="flex gap-3 items-start bg-slate-50 rounded-lg p-2">
                        {/* Preview */}
                        <div className="w-20 flex-shrink-0 rounded overflow-hidden bg-slate-100 border border-slate-200">
                          <img
                            src={`${DOCS_BASE}/${img.url}`}
                            alt=""
                            className="w-full h-auto"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div>
                            <label className="text-xs text-slate-600 block mb-0.5">URL</label>
                            <div className="flex gap-1.5 items-center">
                              <input
                                readOnly
                                className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 cursor-default select-all outline-none"
                                value={img.url}
                              />
                              {img.url.startsWith('assets/') && (
                                <button
                                  type="button"
                                  className="text-xs bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded px-2 py-1 whitespace-nowrap text-slate-700"
                                  onClick={async () => {
                                    const current = img.url.split('/').pop() ?? '';
                                    const newName = window.prompt('Novo nome do arquivo:', current);
                                    if (!newName || newName === current) return;
                                    const res = await fetch('/api/rename', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ oldUrl: img.url, newName }),
                                    });
                                    const { url, error } = await res.json();
                                    if (error) { alert('Erro: ' + error); return; }
                                    updateImage(idx, imgIdx, { ...img, url });
                                  }}>
                                  Renomear
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-slate-600 block mb-0.5">Indicação</label>
                            <input
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:border-blue-500"
                              placeholder={dataset.itens.flatMap(i => i.Imagens).find(img => img.indicação)?.indicação ?? 'sem indicação'}
                              value={img.indicação ?? ''}
                              onChange={e => updateImage(idx, imgIdx, { ...img, indicação: e.target.value })}
                            />
                          </div>
                          {/* Copyright colapsável */}
                          <button
                            type="button"
                            onClick={() => {
                              const key = `${idx}-${imgIdx}`;
                              setExpandedCopyright(expandedCopyright === key ? null : key);
                            }}
                            className="text-xs text-slate-600 hover:text-slate-800">
                            {expandedCopyright === `${idx}-${imgIdx}` ? '▾' : '▸'} Copyright
                          </button>
                          {expandedCopyright === `${idx}-${imgIdx}` && (
                            <div className="space-y-1.5 pl-2 border-l border-slate-200">
                              {([['Licença', 'licenca'], ['Fonte', 'fonte'], ['Observação', 'observacao'], ['URL original', 'urlOriginal']] as const).map(([label, field]) => (
                                <div key={field}>
                                  <label className="text-xs text-slate-600 block mb-0.5">{label}</label>
                                  <input
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:border-blue-500"
                                    placeholder={copyrightPlaceholders[field]}
                                    value={(img.Copyright as Record<string,string> | undefined)?.[field] ?? ''}
                                    onChange={e => updateImage(idx, imgIdx, { ...img, Copyright: { ...img.Copyright, [field]: e.target.value } })}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <button onClick={() => moveImage(idx, imgIdx, -1)} disabled={imgIdx === 0}
                            className="text-slate-600 hover:text-slate-800 disabled:opacity-20 text-xs">▲</button>
                          <button onClick={() => moveImage(idx, imgIdx, 1)} disabled={imgIdx === item.Imagens.length - 1}
                            className="text-slate-600 hover:text-slate-800 disabled:opacity-20 text-xs">▼</button>
                          <button onClick={() => removeImage(idx, imgIdx)}
                            className="text-red-600 hover:text-red-700 text-xs">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Upload / URL */}
                  <div className="mt-2 space-y-2">
                    <input
                      ref={uploadingFor === idx ? fileInputRef : undefined}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async e => {
                        const files = Array.from(e.target.files ?? []);
                        for (const f of files) await uploadImage(idx, f);
                        e.target.value = '';
                      }}
                    />
                    <button
                      onClick={() => { setUploadingFor(idx); setTimeout(() => fileInputRef.current?.click(), 50); }}
                      className="text-xs bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700">
                      ↑ Upload imagem
                    </button>
                    <div className="flex gap-2">
                      <input
                        id={`url-input-${idx}`}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500"
                        placeholder="Adicionar por URL…"
                        onKeyDown={e => {
                          if (e.key === 'Enter') addByUrl(idx);
                        }}
                      />
                      <button
                        onClick={() => addByUrl(idx)}
                        className="text-xs bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700">
                        + Adicionar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Áudios */}
                <div>
                  <label className="text-xs text-slate-600 block mb-2">Áudios</label>
                  <div className="space-y-2">
                    {(item.Audios ?? []).map((audio, audioIdx) => (
                      <div key={audioIdx} className="flex gap-3 items-center bg-slate-50 rounded-lg p-2">
                        <audio controls preload="metadata" src={`${DOCS_BASE}/${audio.url}`} className="max-w-full" />
                        <div className="flex-1 space-y-2">
                          <div>
                            <label className="text-xs text-slate-600 block mb-0.5" htmlFor={`audio-id-${idx}-${audioIdx}`}>ID do áudio</label>
                            <input id={`audio-id-${idx}-${audioIdx}`} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs" value={audio.id ?? ''} placeholder="Informe um ID estável" onChange={e => updateAudio(idx, audioIdx, { ...audio, id: e.target.value || undefined })} />
                          </div>
                          <div>
                            <label className="text-xs text-slate-600 block mb-0.5" htmlFor={`audio-title-${idx}-${audioIdx}`}>Título do áudio</label>
                            <input id={`audio-title-${idx}-${audioIdx}`} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs" value={audio.Titulo ?? ''} placeholder="Informe o título do áudio" onChange={e => updateAudio(idx, audioIdx, { ...audio, Titulo: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-xs text-slate-600 block mb-0.5" htmlFor={`audio-transcript-${idx}-${audioIdx}`}>Transcrição</label>
                            <textarea id={`audio-transcript-${idx}-${audioIdx}`} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs min-h-16" value={audio.Transcricao ?? ''} placeholder="Transcrição opcional" onChange={e => updateAudio(idx, audioIdx, { ...audio, Transcricao: e.target.value || undefined })} />
                          </div>
                          <div>
                            <span className="text-xs text-slate-600 block mb-0.5">Arquivo ou URL do áudio</span>
                            <div className="small break-all">{audio.url}</div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button onClick={() => moveAudio(idx, audioIdx, -1)} disabled={audioIdx === 0} className="text-xs disabled:opacity-20">▲</button>
                          <button onClick={() => moveAudio(idx, audioIdx, 1)} disabled={audioIdx === (item.Audios ?? []).length - 1} className="text-xs disabled:opacity-20">▼</button>
                          <button onClick={() => removeAudio(idx, audioIdx)} className="text-red-600 text-xs">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input id={`audio-upload-${idx}`} type="file" accept="audio/*" className="hidden" onChange={async e => { const file = e.target.files?.[0]; if (file) await uploadAudio(idx, file); e.target.value = ''; }} />
                    <button onClick={() => document.getElementById(`audio-upload-${idx}`)?.click()} className="text-xs bg-slate-200 border border-slate-300 rounded-lg px-3 py-1.5">↑ Upload áudio</button>
                    <button onClick={() => addAudioByUrl(idx)} className="text-xs bg-slate-200 border border-slate-300 rounded-lg px-3 py-1.5">+ Áudio por URL</button>
                  </div>
                </div>

                {/* Vídeos */}
                <div>
                  <label className="text-xs text-slate-600 block mb-2">Vídeos</label>
                  <div className="space-y-2">
                    {(item.Videos ?? []).map((video, videoIdx) => (
                      <div key={videoIdx} className="flex gap-3 items-center bg-slate-50 rounded-lg p-2">
                        {video.Tipo === 'youtube' ? (youtubeEmbedUrl(video.url) ? <iframe src={youtubeEmbedUrl(video.url) ?? undefined} title={video.Titulo || 'Prévia do YouTube'} className="w-40 aspect-video rounded max-w-full" /> : <div className="w-40 text-xs text-red-600">URL do YouTube inválida</div>) : <video controls preload="metadata" src={videoFileUrl(video.url)} className="w-40 max-w-full" />}
                        <div className="flex-1 space-y-2">
                          <div>
                            <label className="text-xs text-slate-600 block mb-0.5" htmlFor={`video-type-${idx}-${videoIdx}`}>Tipo do vídeo</label>
                            <select id={`video-type-${idx}-${videoIdx}`} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs" value={video.Tipo ?? 'arquivo'} onChange={e => updateVideo(idx, videoIdx, { ...video, Tipo: e.target.value as StudyVideo['Tipo'] })}>
                              <option value="arquivo">Arquivo de vídeo</option>
                              <option value="youtube">YouTube</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-slate-600 block mb-0.5" htmlFor={`video-title-${idx}-${videoIdx}`}>Título do vídeo</label>
                            <input id={`video-title-${idx}-${videoIdx}`} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs" value={video.Titulo ?? ''} placeholder="Informe o título do vídeo" onChange={e => updateVideo(idx, videoIdx, { ...video, Titulo: e.target.value })} />
                          </div>
                          <div>
                            <span className="text-xs text-slate-600 block mb-0.5">Arquivo ou URL do vídeo</span>
                            <div className="small break-all">{video.url}</div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button onClick={() => moveVideo(idx, videoIdx, -1)} disabled={videoIdx === 0} className="text-xs disabled:opacity-20">▲</button>
                          <button onClick={() => moveVideo(idx, videoIdx, 1)} disabled={videoIdx === (item.Videos ?? []).length - 1} className="text-xs disabled:opacity-20">▼</button>
                          <button onClick={() => removeVideo(idx, videoIdx)} className="text-red-600 text-xs">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input id={`video-upload-${idx}`} type="file" accept="video/*" className="hidden" onChange={async e => { const file = e.target.files?.[0]; if (file) await uploadVideo(idx, file); e.target.value = ''; }} />
                    <button onClick={() => document.getElementById(`video-upload-${idx}`)?.click()} className="text-xs bg-slate-200 border border-slate-300 rounded-lg px-3 py-1.5">↑ Upload vídeo</button>
                    <button onClick={() => addVideoByUrl(idx)} className="text-xs bg-slate-200 border border-slate-300 rounded-lg px-3 py-1.5">+ Vídeo por URL</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Adicionar item */}
      <button
        onClick={addItem}
        className="w-full border border-dashed border-slate-300 hover:border-blue-500 text-slate-600 hover:text-blue-700 rounded-xl py-3 text-sm transition-colors">
        + Adicionar item
      </button>

      {/* Salvar fixo no rodapé */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={() => save(dataset)}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg text-sm">
          {saving ? 'Salvando…' : saved ? '✓ Salvo' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
