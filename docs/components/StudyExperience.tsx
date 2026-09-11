'use client';

import { useEffect, useMemo, useState } from 'react';
import type { StudyDataset, StudyImage, StudyItem } from '../lib/types';

type Props = { dataset: StudyDataset; studyTitle: string; studyKey: string };
type Entry = { item: StudyItem; retries: number };
type Session = { id: string; finishedAt: string; grupos: string[]; total: number; corretas: number; acuracia: number };

type Phase = 'study' | 'setup' | 'question' | 'reveal' | 'done';

function imageUrl(url: string) {
  return url.startsWith('/') ? url : `/${url}`;
}

function normalizeAnswer(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
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

export default function StudyExperience({ dataset, studyTitle, studyKey }: Props) {
  const groups = useMemo(() => [...new Set(dataset.itens.map(item => item.Grupo))], [dataset.itens]);
  const [phase, setPhase] = useState<Phase>('study');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
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

  function toggleGroup(group: string) {
    setExpandedGroups(previous => {
      const next = new Set(previous);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
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
    const isCorrect = normalizeAnswer(answer) === normalizeAnswer(current.item.Resposta);
    const nextAnswered = answered + 1;
    const nextCorrect = correctCount + (isCorrect ? 1 : 0);
    setAnswered(nextAnswered);
    setCorrectCount(nextCorrect);
    setUserAnswer(answer);
    setCorrect(isCorrect);
    if (!isCorrect && current.retries < 2) setErrorQueue(previous => [...previous, { item: current.item, retries: current.retries + 1 }]);
    if (!isCorrect) setErrorItems(previous => previous.some(item => item.Resposta === current.item.Resposta) ? previous : [...previous, current.item]);
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
          {groups.map(group => {
            const open = expandedGroups.has(group);
            const items = dataset.itens.filter(item => item.Grupo === group);
            return <div key={group}>
              <button className="accordion-header" onClick={() => toggleGroup(group)}><span>{group}</span><span style={{ transform: open ? 'rotate(180deg)' : undefined }}>▾</span></button>
              <div className="divider" style={{ margin: 0 }} />
              {open && <div className="accordion-body">{items.map((item, index) => <article className="card" style={{ padding: 14, marginBottom: 10 }} key={`${item.Resposta}-${index}`}>
                <div className="small" style={{ marginBottom: 4 }}>{item.Pergunta}</div>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>{item.Resposta}</div>
                <Images images={item.Imagens} alt={item.Resposta} />
              </article>)}</div>}
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
        <div className="small" style={{ marginBottom: 10 }}>Pergunta {answered + 1} de {total} | Corretas: {correctCount}</div>
        <Images images={current.item.Imagens} />
        <p style={{ margin: '14px 0 6px', fontWeight: 700 }}>{current.item.Pergunta}</p>
        <form onSubmit={submitAnswer}>
          <input className="input" value={answer} onChange={event => setAnswer(event.target.value)} autoFocus autoComplete="off" placeholder="Digite a resposta…" style={{ marginBottom: 10 }} />
          <button className="btn btn-primary" type="submit">Confirmar</button>
        </form>
      </div>}

      {phase === 'reveal' && current && <div className="quiz-panel">
        <Images images={current.item.Imagens} />
        <p style={{ margin: '14px 0 4px', fontWeight: 700 }}>{current.item.Pergunta}</p>
        <p className="small quiz-answer">Sua resposta: <strong>{userAnswer || '(em branco)'}</strong></p>
        <p className="quiz-answer">Resposta correta: <strong>{current.item.Resposta}</strong></p>
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
