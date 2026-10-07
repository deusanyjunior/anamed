'use client';

import Image from 'next/image';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { StudyAudio, StudyDataset, StudyImage, StudyItem, StudyOverlay, StudyVideo } from '../lib/types';

type DeepLink = { itemId?: string };
type Props = { dataset: StudyDataset; studyTitle: string; studyKey: string; mediaBase: string; deepLink?: DeepLink };
type Entry = { item: StudyItem; retries: number };
type Session = { id: string; finishedAt: string; grupos: string[]; total: number; corretas: number; acuracia: number };

type Phase = 'study' | 'setup' | 'question' | 'reveal' | 'done';

function imageUrl(url: string, mediaBase = '') {
  if (/^https?:\/\//i.test(url) || url.startsWith('/')) return url;
  if (url.startsWith('assets/')) return `/${url}`;
  return `${mediaBase}/${url}`;
}

function normalizeAnswer(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function studyLink(itemId: string) {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('item', itemId);
  return url.toString();
}

function CopyLinkButton({ itemId }: { itemId: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const link = studyLink(itemId);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="copy-link-button" onClick={copyLink}>
      <span aria-hidden="true">⧉</span> {copied ? 'Link copiado' : 'Copiar link'}
    </button>
  );
}

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function copyrightText(image: StudyImage) {
  const copyright = image.Copyright;
  if (!copyright) return null;
  return (
    <div className="small" style={{ padding: '4px 8px 8px' }}>
      {copyright.fonte && <>Fonte: {copyright.urlOriginal ? <a href={copyright.urlOriginal} target="_blank" rel="noreferrer">{copyright.fonte}</a> : copyright.fonte}</>}
      {copyright.fonte && copyright.licenca && ' · '}
      {copyright.licenca && <>Licença: {copyright.licenca}</>}
    </div>
  );
}

function OverlaySvg({ overlays = [] }: { overlays?: StudyOverlay[] }) {
  const svgPrefix = useId().replaceAll(':', '');
  if (!overlays.length) return null;
  const orderedOverlays = [...overlays].sort((first, second) => Number(first.tipo === 'orientacao') - Number(second.tipo === 'orientacao'));
  return (
    <svg className="study-overlay" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        {overlays.filter(overlay => overlay.tipo === 'seta').map(overlay => (
          <marker key={`arrow-${overlay.id}`} id={`${svgPrefix}-arrow-${overlay.id}`} markerWidth="0.08" markerHeight="0.08" refX="0.07" refY="0.04" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M 0 0 L 0.08 0.04 L 0 0.08 z" fill={overlay.cor ?? '#dc2626'} />
          </marker>
        ))}
        {overlays.filter(overlay => overlay.tipo === 'area-inversa').map(overlay => (
          <mask key={`mask-${overlay.id}`} id={`${svgPrefix}-inverse-${overlay.id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="1" height="1">
            <rect width="1" height="1" fill="white" />
            <polygon points={overlay.pontos.map(point => `${point.x},${point.y}`).join(' ')} fill="black" />
          </mask>
        ))}
      </defs>
      {orderedOverlays.map(overlay => {
        const points = overlay.pontos.map(point => `${point.x},${point.y}`).join(' ');
        const color = overlay.cor ?? '#dc2626';
        const width = overlay.espessura ?? 0.006;
        const opacity = overlay.opacidade ?? 1;
        if (overlay.tipo === 'orientacao' && (overlay.posicao || overlay.pontos[0])) {
          const position = overlay.posicao ?? overlay.pontos[0];
          const [horizontal = 'direita-esquerda', vertical = 'superior-inferior'] = (overlay.orientacao ?? '').split('__');
          const [horizontalStart, horizontalEnd] = horizontal.split('-');
          const [verticalStart, verticalEnd] = vertical.split('-');
          return <g key={overlay.id} transform={`translate(${position.x} ${position.y})`} opacity={opacity}>
            <line x1="-0.045" y1="0" x2="0.045" y2="0" stroke={color} strokeWidth="0.003" />
            <line x1="0" y1="-0.045" x2="0" y2="0.045" stroke={color} strokeWidth="0.003" />
            <circle cx="0" cy="0" r="0.006" fill={color} />
            <text x="-0.052" y="0.008" textAnchor="end" fontSize="0.019" fontWeight="700" fill={color}>{horizontalStart}</text>
            <text x="0.052" y="0.008" textAnchor="start" fontSize="0.019" fontWeight="700" fill={color}>{horizontalEnd}</text>
            <text x="0" y="-0.055" textAnchor="middle" fontSize="0.019" fontWeight="700" fill={color}>{verticalStart}</text>
            <text x="0" y="0.07" textAnchor="middle" fontSize="0.019" fontWeight="700" fill={color}>{verticalEnd}</text>
          </g>;
        }
        if (overlay.tipo === 'seta' && overlay.pontos.length >= 2) {
          const start = overlay.pontos[0];
          const end = overlay.pontos[overlay.pontos.length - 1];
          return <line key={overlay.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={color} strokeWidth={width} strokeLinecap="round" markerEnd={`url(#${svgPrefix}-arrow-${overlay.id})`} opacity={opacity} />;
        }
        if (overlay.tipo === 'linha' && overlay.pontos.length >= 2) {
          return <polyline key={overlay.id} points={points} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round" opacity={opacity} />;
        }
        if (overlay.tipo === 'area-inversa' && overlay.pontos.length >= 3) {
          return <g key={overlay.id}>
            <rect x="0" y="0" width="1" height="1" fill={color} fillOpacity={Math.min(opacity, 0.35)} mask={`url(#${svgPrefix}-inverse-${overlay.id})`} />
            <polygon points={points} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" opacity={opacity} />
          </g>;
        }
        if ((overlay.tipo === 'area' || overlay.tipo === 'area-preenchida') && overlay.pontos.length >= 3) {
          return <polygon key={overlay.id} points={points} fill={overlay.tipo === 'area-preenchida' ? color : 'none'} fillOpacity={overlay.tipo === 'area-preenchida' ? Math.min(opacity, 0.35) : 0} stroke={color} strokeWidth={width} strokeLinejoin="round" opacity={opacity} />;
        }
        return null;
      })}
    </svg>
  );
}

function Images({ images, alt = '', mediaBase }: { images: StudyImage[]; alt?: string; mediaBase: string }) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  function updateCurrentIndex() {
    const carousel = carouselRef.current;
    if (!carousel || !carousel.children.length) return;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    Array.from(carousel.children).forEach((child, index) => {
      const distance = Math.abs((child as HTMLElement).offsetLeft - carousel.scrollLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    setCurrentIndex(closestIndex);
  }

  function scrollToImage(index: number) {
    const carousel = carouselRef.current;
    const target = carousel?.children[index] as HTMLElement | undefined;
    if (!carousel || !target) return;
    carousel.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
    setCurrentIndex(index);
  }

  if (!images.length) return null;
  const lastIndex = images.length - 1;

  return (
    <div className="study-image-carousel-shell">
      <div ref={carouselRef} className="study-image-carousel" role="region" aria-label="Imagens do estudo" onScroll={updateCurrentIndex}>
        {images.map((image, index) => (
          <div className="img-wrap" key={`${image.url}-${index}`}>
            {image.indicação && <div className="small" style={{ padding: '6px 8px' }}>{image.indicação}</div>}
            <div className="study-image-frame">
              <Image src={imageUrl(image.url, mediaBase)} alt={alt} fill sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw" />
              <OverlaySvg overlays={image.overlays} />
            </div>
            {copyrightText(image)}
          </div>
        ))}
      </div>
      {images.length > 1 && <>
        <button type="button" className="study-carousel-arrow study-carousel-arrow-left" onClick={() => scrollToImage(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} aria-label="Imagem anterior">‹</button>
        <button type="button" className="study-carousel-arrow study-carousel-arrow-right" onClick={() => scrollToImage(Math.min(lastIndex, currentIndex + 1))} disabled={currentIndex === lastIndex} aria-label="Próxima imagem">›</button>
        <div className="study-carousel-dots" aria-label={`Imagem ${currentIndex + 1} de ${images.length}`}>
          {images.map((image, index) => <button key={`${image.url}-dot-${index}`} type="button" className={index === currentIndex ? 'active' : ''} onClick={() => scrollToImage(index)} aria-label={`Exibir imagem ${index + 1}`} aria-current={index === currentIndex ? 'true' : undefined} />)}
        </div>
      </>}
    </div>
  );
}

function AudioWithTranscript({
  audio,
  mediaBase,
}: {
  audio: StudyAudio;
  mediaBase: string;
}) {
  const hasTranscript = Boolean(audio.Transcricao?.trim());
  const [showTranscript, setShowTranscript] = useState(false);

  return (
    <div>
      <div className="media-heading">
        <div>
          {audio.Titulo && <div className="small">{audio.Titulo}</div>}
          {audio.id && <div className="media-id">ID do áudio: <code>{audio.id}</code></div>}
        </div>
      </div>
      <audio
        controls
        preload="metadata"
        src={imageUrl(audio.url, mediaBase)}
        style={{ width: '100%' }}
      />
      {hasTranscript && (
        <div style={{ marginTop: 6 }}>
          <button
            type="button"
            className="btn"
            aria-expanded={showTranscript}
            onClick={() => setShowTranscript(previous => !previous)}
            style={{ fontSize: 12, padding: '5px 9px' }}
          >
            {showTranscript ? 'Ocultar transcrição' : 'Exibir transcrição'}
          </button>
          {showTranscript && (
            <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{audio.Transcricao}</p>
          )}
        </div>
      )}
    </div>
  );
}

function youtubeEmbedUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    let videoId = '';

    if (hostname === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] ?? '';
    } else if (hostname === 'youtube.com' || hostname === 'youtube-nocookie.com') {
      if (url.pathname === '/watch') videoId = url.searchParams.get('v') ?? '';
      else if (/^\/(shorts|embed)\/[^/]+/.test(url.pathname)) videoId = url.pathname.split('/')[2] ?? '';
    }

    return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

function VideoMedia({ video, mediaBase }: { video: StudyVideo; mediaBase: string }) {
  if (video.Tipo === 'youtube') {
    const embedUrl = youtubeEmbedUrl(video.url);
    if (!embedUrl) return <div className="small">URL do YouTube inválida.</div>;
    return <iframe
      src={embedUrl}
      title={video.Titulo || 'Vídeo do YouTube'}
      style={{ width: '100%', aspectRatio: '16 / 9', border: 0, borderRadius: 12 }}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />;
  }

  return <video controls preload="metadata" src={imageUrl(video.url, mediaBase)} style={{ width: '100%', borderRadius: 12 }} />;
}

function Media({
  audios = [],
  videos = [],
  mediaBase,
}: {
  audios?: StudyAudio[];
  videos?: StudyVideo[];
  mediaBase: string;
}) {
  if (!audios.length && !videos.length) return null;
  return (
    <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
      {audios.map((audio, index) => <AudioWithTranscript
        key={audio.id ?? `audio-${audio.url}-${index}`}
        audio={audio}
        mediaBase={mediaBase}
      />)}
      {videos.map((video, index) => <div key={`video-${video.url}-${index}`}>
        {video.Titulo && <div className="small" style={{ marginBottom: 4 }}>{video.Titulo}</div>}
        <VideoMedia video={video} mediaBase={mediaBase} />
      </div>)}
    </div>
  );
}

export default function StudyExperience({ dataset, studyTitle, studyKey, mediaBase, deepLink }: Props) {
  const groups = useMemo(() => [...new Set(dataset.itens.map(item => item.Grupo))], [dataset.itens]);
  const [phase, setPhase] = useState<Phase>('study');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<string[]>(groups);
  const [queue, setQueue] = useState<Entry[]>([]);
  const [errorQueue, setErrorQueue] = useState<Entry[]>([]);
  const [errorItems, setErrorItems] = useState<StudyItem[]>([]);
  const [current, setCurrent] = useState<Entry | null>(null);
  const [answer, setAnswer] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [correct, setCorrect] = useState(false);
  const [total, setTotal] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [history, setHistory] = useState<Session[]>([]);

  useEffect(() => {
    try {
      const savedGroups = JSON.parse(localStorage.getItem(`anamed_groups_${studyKey}`) || 'null');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(savedGroups)) setSelectedGroups(savedGroups);
      const savedHistory = JSON.parse(localStorage.getItem('anamed_history') || '[]');
      if (Array.isArray(savedHistory)) setHistory(savedHistory);
    } catch { /* localStorage indisponível */ }
  }, [studyKey]);

  useEffect(() => {
    if (!deepLink?.itemId) return;
    const targetIndex = dataset.itens.findIndex(item => item.id === deepLink.itemId);
    const target = targetIndex >= 0 ? dataset.itens[targetIndex] : undefined;
    if (!target) return;
    const targetKey = target.id ?? `item-${targetIndex}`;
    const frame = requestAnimationFrame(() => {
      setExpandedGroups(previous => previous.has(target.Grupo) ? previous : new Set(previous).add(target.Grupo));
      setExpandedItems(previous => previous.has(targetKey) ? previous : new Set(previous).add(targetKey));
    });
    return () => cancelAnimationFrame(frame);
  }, [dataset.itens, deepLink?.itemId]);

  useEffect(() => {
    if (!deepLink?.itemId || phase !== 'study') return;
    const targetIndex = dataset.itens.findIndex(item => item.id === deepLink.itemId);
    const target = targetIndex >= 0 ? dataset.itens[targetIndex] : undefined;
    const targetKey = target?.id ?? (targetIndex >= 0 ? `item-${targetIndex}` : '');
    if (!target || !expandedGroups.has(target.Grupo) || !expandedItems.has(targetKey)) return;

    const itemElement = document.getElementById(`study-item-${target.id}`);
    if (!itemElement) return;
    const frame = requestAnimationFrame(() => {
      if (!itemElement.isConnected) return;
      itemElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      itemElement.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [dataset.itens, deepLink?.itemId, expandedGroups, expandedItems, phase]);

  function toggleGroup(group: string) {
    setExpandedGroups(previous => {
      const next = new Set(previous);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  }

  function toggleItem(itemKey: string) {
    setExpandedItems(previous => {
      const next = new Set(previous);
      if (next.has(itemKey)) next.delete(itemKey); else next.add(itemKey);
      return next;
    });
  }
  function expandAll() {
    setExpandedGroups(new Set(groups));
    setExpandedItems(new Set(dataset.itens.map((item, index) => item.id ?? `item-${index}`)));
  }

  function collapseAll() {
    setExpandedGroups(new Set());
    setExpandedItems(new Set());
  }

  function startQuiz(items = dataset.itens.filter(item => selectedGroups.includes(item.Grupo))) {
    if (!selectedGroups.length) { alert('Selecione ao menos um grupo.'); return; }
    if (!items.length) { alert('Nenhum item nos grupos selecionados.'); return; }
    localStorage.setItem(`anamed_groups_${studyKey}`, JSON.stringify(selectedGroups));
    const entries = shuffle(items).map(item => ({ item, retries: 0 }));
    setQueue(entries);
    setErrorQueue([]);
    setErrorItems([]);
    setCurrent(null);
    setAnswer('');
    setAnswered(0);
    setCorrectCount(0);
    setTotal(items.length);
    setPhase('question');
    setTimeout(() => showNext(entries, []), 0);
  }

  function showNext(nextQueue = queue, nextErrors = errorQueue) {
    const next = nextQueue.length ? nextQueue[0] : nextErrors[0];
    if (!next) {
      finishQuiz();
      return;
    }
    if (nextQueue.length) setQueue(nextQueue.slice(1)); else setErrorQueue(nextErrors.slice(1));
    setCurrent(next);
    setAnswer('');
    setPhase('question');
  }

  function submitAnswer(event: React.FormEvent) {
    event.preventDefault();
    if (!current) return;
    const isCorrect = normalizeAnswer(answer) === normalizeAnswer(current.item.Item);
    const nextAnswered = answered + 1;
    const nextCorrect = correctCount + (isCorrect ? 1 : 0);
    setAnswered(nextAnswered);
    setCorrectCount(nextCorrect);
    setUserAnswer(answer);
    setCorrect(isCorrect);
    if (!isCorrect && current.retries < 2) setErrorQueue(previous => [...previous, { item: current.item, retries: current.retries + 1 }]);
    if (!isCorrect) setErrorItems(previous => previous.some(item => item.Item === current.item.Item) ? previous : [...previous, current.item]);
    setPhase('reveal');
  }

  function nextQuestion() {
    showNext();
  }

  function finishQuiz() {
    const accuracy = total ? Math.round((correctCount / total) * 100) : 0;
    const session: Session = { id: `${Date.now()}`, finishedAt: new Date().toISOString(), grupos: selectedGroups, total, corretas: correctCount, acuracia: accuracy };
    const nextHistory = [session, ...history].slice(0, 50);
    setHistory(nextHistory);
    localStorage.setItem('anamed_history', JSON.stringify(nextHistory));
    setPhase('done');
  }

  function retryErrors() {
    if (errorItems.length) startQuiz(errorItems);
  }

  const accuracy = total ? Math.round((correctCount / total) * 100) : 0;

  return (
    <section>
      <div className="form-row">
        <button className={`btn ${phase === 'study' ? 'btn-primary' : ''}`} onClick={() => setPhase('study')}>Estudo</button>
        <button className={`btn ${phase !== 'study' ? 'btn-primary' : ''}`} onClick={() => setPhase('setup')}>Quiz</button>
      </div>

      {phase === 'study' && (
        <div>
          <div className="study-expansion-controls" role="group" aria-label="Controles de expansão">
            <button type="button" className="study-expansion-button" onClick={expandAll}><span aria-hidden="true">＋</span> Expandir tudo</button>
            <button type="button" className="study-expansion-button" onClick={collapseAll}><span aria-hidden="true">−</span> Recolher tudo</button>
          </div>
          {groups.map(group => {
            const open = expandedGroups.has(group);
            const items = dataset.itens.filter(item => item.Grupo === group);
            return <div key={group}>
              <button className="accordion-header" onClick={() => toggleGroup(group)}><span>{group}</span><span style={{ transform: open ? 'rotate(180deg)' : undefined }}>▾</span></button>
              <div className="divider" style={{ margin: 0 }} />
              {open && <div className="accordion-body">{items.map(item => {
                const itemIndex = dataset.itens.indexOf(item);
                const itemKey = item.id ?? `item-${itemIndex}`;
                const contentId = `study-item-content-${encodeURIComponent(itemKey)}`;
                const itemOpen = expandedItems.has(itemKey);
                return <article
                  className="card"
                  style={{ padding: 14, marginBottom: 10 }}
                  key={itemKey}
                  id={item.id ? `study-item-${item.id}` : undefined}
                  tabIndex={item.id ? -1 : undefined}
                  aria-label={item.id ? `Item ${item.Item}` : undefined}
                >
                  {item.id && <div className="item-id">ID do item: <code>{item.id}</code> <CopyLinkButton itemId={item.id} /></div>}
                  <button
                    type="button"
                    className="item-accordion-header"
                    aria-expanded={itemOpen}
                    aria-controls={contentId}
                    onClick={() => toggleItem(itemKey)}
                  >
                    <span className="item-accordion-labels">
                      <span className="small">Item</span>
                      <strong>{item.Item || 'Item sem nome'}</strong>
                      <span className="small">Descrição</span>
                      <span>{item.Descricao || 'Sem descrição'}</span>
                    </span>
                    <span aria-hidden="true" style={{ transform: itemOpen ? 'rotate(180deg)' : undefined }}>▾</span>
                  </button>
                  {itemOpen && <div id={contentId} className="item-accordion-body">
                    <Images images={item.Imagens ?? []} alt={item.Item} mediaBase={mediaBase} />
                    <Media
                      mediaBase={mediaBase}
                      audios={item.Audios}
                      videos={item.Videos}
                    />
                  </div>}
                </article>;
              })}</div>}
            </div>;
          })}
        </div>
      )}

      {phase === 'setup' && <div className="quiz-panel">
        <p className="subtitle">Selecione os grupos que deseja incluir no quiz.</p>
        <fieldset style={{ marginBottom: 14 }}>
          <legend>Grupos</legend>
          {groups.map(group => <label key={group} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer' }}>
            <input type="checkbox" checked={selectedGroups.includes(group)} onChange={() => setSelectedGroups(previous => previous.includes(group) ? previous.filter(item => item !== group) : [...previous, group])} />
            {group}
          </label>)}
        </fieldset>
        <button className="btn btn-primary" onClick={() => startQuiz()}>Iniciar Quiz</button>
      </div>}

      {phase === 'question' && current && <div className="quiz-panel">
        <div className="small" style={{ marginBottom: 10 }}>Descrição de {total} | Corretas: {correctCount}</div>
        <Images images={current.item.Imagens ?? []} mediaBase={mediaBase} />
        <Media
          mediaBase={mediaBase}
          audios={current.item.Audios}
          videos={current.item.Videos}
        />
        <p style={{ margin: '14px 0 6px', fontWeight: 700 }}>{current.item.Descricao}</p>
        <form onSubmit={submitAnswer}>
          <input className="input" value={answer} onChange={event => setAnswer(event.target.value)} autoFocus autoComplete="off" placeholder="Digite o item…" style={{ marginBottom: 10 }} />
          <button className="btn btn-primary" type="submit">Confirmar</button>
        </form>
      </div>}

      {phase === 'reveal' && current && <div className="quiz-panel">
        <Images images={current.item.Imagens ?? []} mediaBase={mediaBase} />
        <Media
          mediaBase={mediaBase}
          audios={current.item.Audios}
          videos={current.item.Videos}
        />
        <p style={{ margin: '14px 0 4px', fontWeight: 700 }}>{current.item.Descricao}</p>
        <p className="small quiz-answer">Seu item: <strong>{userAnswer || '(em branco)'}</strong></p>
        <p className="quiz-answer">Item correto: <strong>{current.item.Item}</strong></p>
        <div style={{ marginBottom: 14, color: correct ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{correct ? '✓ Correto!' : '✗ Incorreto'}</div>
        <button className="btn btn-primary" onClick={nextQuestion}>Próxima</button>
      </div>}

      {phase === 'done' && <div className="quiz-panel">
        <h2 style={{ margin: '0 0 10px' }}>Quiz concluído!</h2>
        <div className="card score-card" style={{ marginBottom: 18 }}><div style={{ fontSize: 32, fontWeight: 800 }}>{accuracy}%</div><div className="small">{correctCount} corretas de {total}</div></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setPhase('setup')}>Novo Quiz</button>
          <button className="btn btn-danger" onClick={retryErrors} style={{ display: errorItems.length ? 'inline-flex' : 'none' }}>Refazer erros</button>
        </div>
        <div style={{ marginTop: 28 }}><h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Histórico de sessões</h3>
          {!history.length ? <p className="small">Nenhuma sessão ainda.</p> : <table className="history"><thead><tr><th>Data</th><th>Estudo</th><th>Grupos</th><th>Total</th><th>Corretas</th><th>Acurácia</th></tr></thead><tbody>{history.map(session => <tr key={session.id}><td>{new Date(session.finishedAt).toLocaleString('pt-BR')}</td><td>{studyTitle}</td><td>{session.grupos.length}</td><td>{session.total}</td><td>{session.corretas}</td><td>{session.acuracia}%</td></tr>)}</tbody></table>}
        </div>
      </div>}
    </section>
  );
}
