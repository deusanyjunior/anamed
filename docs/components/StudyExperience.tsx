'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StudyAudio, StudyDataset, StudyImage, StudyItem, StudyVideo } from '../lib/types';

type DeepLink = { itemId?: string; audioId?: string; autoplay?: boolean };
type Props = { dataset: StudyDataset; studyTitle: string; studyKey: string; deepLink?: DeepLink };
type Entry = { item: StudyItem; retries: number };
type Session = { id: string; finishedAt: string; grupos: string[]; total: number; corretas: number; acuracia: number };

type Phase = 'study' | 'setup' | 'question' | 'reveal' | 'done';

function imageUrl(url: string) {
  return url.startsWith('/') ? url : `/${url}`;
}

function normalizeAnswer(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function studyLink(params: { itemId: string; audioId?: string; autoplay?: boolean }) {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('item', params.itemId);
  if (params.audioId) url.searchParams.set('audio', params.audioId);
  if (params.autoplay) url.searchParams.set('autoplay', '1');
  return url.toString();
}

function CopyLinkButton({ itemId, audioId, autoplay = false }: { itemId: string; audioId?: string; autoplay?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const link = studyLink({ itemId, audioId, autoplay });
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

function Images({ images, alt = '' }: { images: StudyImage[]; alt?: string }) {
  return (
    <div className="grid2">
      {images.map((image, index) => (
        <div className="img-wrap" key={`${image.url}-${index}`}>
          {image.indicação && <div className="small" style={{ padding: '6px 8px' }}>{image.indicação}</div>}
          <img src={imageUrl(image.url)} alt={alt} loading="lazy" />
          {copyrightText(image)}
        </div>
      ))}
    </div>
  );
}

function AudioWithTranscript({
  audio,
  itemId,
  registerAudio,
  autoplayBlocked,
  onAutoplaySuccess,
  onAutoplayFailure,
}: {
  audio: StudyAudio;
  itemId?: string;
  registerAudio: (id: string | undefined, element: HTMLAudioElement | null) => void;
  autoplayBlocked: boolean;
  onAutoplaySuccess: () => void;
  onAutoplayFailure: () => void;
}) {
  const hasTranscript = Boolean(audio.Transcricao?.trim());
  const [showTranscript, setShowTranscript] = useState(false);
  const audioElement = useRef<HTMLAudioElement | null>(null);
  const fallbackButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (autoplayBlocked) fallbackButton.current?.focus();
  }, [autoplayBlocked]);

  const setAudioElement = useCallback((element: HTMLAudioElement | null) => {
    audioElement.current = element;
    registerAudio(audio.id, element);
  }, [audio.id, registerAudio]);

  async function playAudio() {
    if (!audioElement.current) return;
    try {
      await audioElement.current.play();
      onAutoplaySuccess();
    } catch {
      onAutoplayFailure();
    }
  }

  return (
    <div>
      <div className="media-heading">
        <div>
          {audio.Titulo && <div className="small">{audio.Titulo}</div>}
          {audio.id && <div className="media-id">ID do áudio: <code>{audio.id}</code> {itemId && <CopyLinkButton itemId={itemId} audioId={audio.id} autoplay />}</div>}
        </div>
      </div>
      <audio
        ref={setAudioElement}
        controls
        preload="metadata"
        src={imageUrl(audio.url)}
        style={{ width: '100%' }}
      />
      {autoplayBlocked && (
        <button
          ref={fallbackButton}
          type="button"
          className="btn btn-primary"
          aria-label={`Reproduzir ${audio.Titulo || 'áudio'}`}
          onClick={playAudio}
          style={{ marginTop: 6 }}
        >
          ▶ Reproduzir áudio
        </button>
      )}
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

function VideoMedia({ video }: { video: StudyVideo }) {
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

  return <video controls preload="metadata" src={imageUrl(video.url)} style={{ width: '100%', borderRadius: 12 }} />;
}

function Media({
  itemId,
  audios = [],
  videos = [],
  registerAudio,
  autoplayAudioId,
  autoplayBlockedAudioId,
  onAutoplaySuccess,
  onAutoplayFailure,
}: {
  itemId?: string;
  audios?: StudyAudio[];
  videos?: StudyVideo[];
  registerAudio: (id: string | undefined, element: HTMLAudioElement | null) => void;
  autoplayAudioId?: string;
  autoplayBlockedAudioId?: string;
  onAutoplaySuccess: () => void;
  onAutoplayFailure: () => void;
}) {
  if (!audios.length && !videos.length) return null;
  return (
    <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
      {audios.map((audio, index) => <AudioWithTranscript
        key={audio.id ?? `audio-${audio.url}-${index}`}
        audio={audio}
        itemId={itemId}
        registerAudio={registerAudio}
        autoplayBlocked={audio.id === autoplayBlockedAudioId && audio.id === autoplayAudioId}
        onAutoplaySuccess={onAutoplaySuccess}
        onAutoplayFailure={onAutoplayFailure}
      />)}
      {videos.map((video, index) => <div key={`video-${video.url}-${index}`}>
        {video.Titulo && <div className="small" style={{ marginBottom: 4 }}>{video.Titulo}</div>}
        <VideoMedia video={video} />
      </div>)}
    </div>
  );
}

export default function StudyExperience({ dataset, studyTitle, studyKey, deepLink }: Props) {
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
  const audioElements = useRef(new Map<string, HTMLAudioElement>());
  const autoplayAttempt = useRef<string | null>(null);
  const [audioRegistryVersion, setAudioRegistryVersion] = useState(0);
  const [autoplayBlockedAudioId, setAutoplayBlockedAudioId] = useState<string>();
  const [autoplayMessage, setAutoplayMessage] = useState('');

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

    if (deepLink.autoplay && deepLink.audioId) {
      const audio = audioElements.current.get(deepLink.audioId);
      const attemptKey = `${deepLink.itemId}:${deepLink.audioId}`;
      if (audio && autoplayAttempt.current !== attemptKey) {
        autoplayAttempt.current = attemptKey;
        audio.play().then(() => {
          setAutoplayBlockedAudioId(undefined);
          setAutoplayMessage('Áudio reproduzido.');
        }).catch(() => {
          setAutoplayBlockedAudioId(deepLink.audioId);
          setAutoplayMessage('O navegador bloqueou a reprodução automática. Pressione o botão Reproduzir áudio.');
        });
      }
    }

    return () => cancelAnimationFrame(frame);
  }, [audioRegistryVersion, dataset.itens, deepLink?.audioId, deepLink?.autoplay, deepLink?.itemId, expandedGroups, expandedItems, phase]);

  const registerAudio = useCallback((id: string | undefined, element: HTMLAudioElement | null) => {
    if (!id) return;
    if (element) audioElements.current.set(id, element); else audioElements.current.delete(id);
    setAudioRegistryVersion(previous => previous + 1);
  }, []);

  function handleAutoplaySuccess() {
    setAutoplayBlockedAudioId(undefined);
    setAutoplayMessage('Áudio reproduzido.');
  }

  function handleAutoplayFailure() {
    setAutoplayMessage('Não foi possível reproduzir o áudio. Tente novamente.');
  }

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
      {autoplayMessage && <div role="status" aria-live="polite" className="small" style={{ marginTop: 10 }}>{autoplayMessage}</div>}

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
                    <Images images={item.Imagens ?? []} alt={item.Item} />
                    <Media
                      itemId={item.id}
                      audios={item.Audios}
                      videos={item.Videos}
                      registerAudio={registerAudio}
                      autoplayAudioId={deepLink?.audioId}
                      autoplayBlockedAudioId={autoplayBlockedAudioId}
                      onAutoplaySuccess={handleAutoplaySuccess}
                      onAutoplayFailure={handleAutoplayFailure}
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
        <Images images={current.item.Imagens ?? []} />
        <Media
          itemId={current.item.id}
          audios={current.item.Audios}
          videos={current.item.Videos}
          registerAudio={registerAudio}
          autoplayAudioId={deepLink?.audioId}
          autoplayBlockedAudioId={autoplayBlockedAudioId}
          onAutoplaySuccess={handleAutoplaySuccess}
          onAutoplayFailure={handleAutoplayFailure}
        />
        <p style={{ margin: '14px 0 6px', fontWeight: 700 }}>{current.item.Descricao}</p>
        <form onSubmit={submitAnswer}>
          <input className="input" value={answer} onChange={event => setAnswer(event.target.value)} autoFocus autoComplete="off" placeholder="Digite o item…" style={{ marginBottom: 10 }} />
          <button className="btn btn-primary" type="submit">Confirmar</button>
        </form>
      </div>}

      {phase === 'reveal' && current && <div className="quiz-panel">
        <Images images={current.item.Imagens ?? []} />
        <Media
          itemId={current.item.id}
          audios={current.item.Audios}
          videos={current.item.Videos}
          registerAudio={registerAudio}
          autoplayAudioId={deepLink?.audioId}
          autoplayBlockedAudioId={autoplayBlockedAudioId}
          onAutoplaySuccess={handleAutoplaySuccess}
          onAutoplayFailure={handleAutoplayFailure}
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
