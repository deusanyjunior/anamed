'use client';

import React from 'react';
import type { BoneItem, QuizSession } from '@/types';
import { normalizeAnswer, shuffle, groupBy, uid, formatDateTime } from './utils';

type Phase = 'setup' | 'question' | 'reveal' | 'done';

type Score = {
  corretas: number;
  respondidas: number;
};

const HISTORY_KEY = 'anatomia_quiz_history_v1';
const SETTINGS_KEY = 'anatomia_quiz_settings_v1';
const MAX_AUTO_RETRY_PER_ITEM = 2;

function keyOf(it: BoneItem) {
  return `${it.Grupo}|||${it.Osso}`;
}

export function QuizView({ items }: { items: BoneItem[] }) {
  const grouped = React.useMemo(() => groupBy(items, (i) => i.Grupo), [items]);
  const groupNames = React.useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const [selectedGroups, setSelectedGroups] = React.useState<string[]>([]);
  const [phase, setPhase] = React.useState<Phase>('setup');

  const [deck, setDeck] = React.useState<BoneItem[]>([]);
  const [idx, setIdx] = React.useState(0);
  const [answer, setAnswer] = React.useState('');
  const [isCorrect, setIsCorrect] = React.useState<boolean | null>(null);
  const [score, setScore] = React.useState<Score>({ corretas: 0, respondidas: 0 });

  // Auto-retry state
  const [retryQueue, setRetryQueue] = React.useState<BoneItem[]>([]);
  const [attemptsByKey, setAttemptsByKey] = React.useState<Record<string, number>>({});
  const [mistakeKeys, setMistakeKeys] = React.useState<Record<string, true>>({});
  const [mistakeList, setMistakeList] = React.useState<BoneItem[]>([]);

  // Session timing + history
  const [startedAt, setStartedAt] = React.useState<string>('');
  const [history, setHistory] = React.useState<QuizSession[]>([]);

  // Load persisted settings + history
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const s = JSON.parse(raw) as { selectedGroups?: string[] };
        if (Array.isArray(s.selectedGroups)) setSelectedGroups(s.selectedGroups);
      }
    } catch {}

    try {
      const rawH = localStorage.getItem(HISTORY_KEY);
      if (rawH) {
        const h = JSON.parse(rawH) as QuizSession[];
        if (Array.isArray(h)) setHistory(h);
      }
    } catch {}
  }, []);

  // default: select all if none
  React.useEffect(() => {
    if (groupNames.length && selectedGroups.length === 0) {
      setSelectedGroups(groupNames);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupNames.join('|')]);

  // Persist settings when changed
  React.useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ selectedGroups }));
    } catch {}
  }, [selectedGroups]);

  const filteredItems = React.useMemo(() => {
    const sel = new Set(selectedGroups);
    return items.filter((it) => sel.has(it.Grupo));
  }, [items, selectedGroups]);

  const current = deck[idx];

  const startQuiz = (overrideItems?: BoneItem[]) => {
    const base = overrideItems ?? (filteredItems.length ? filteredItems : items);
    setDeck(shuffle(base));
    setIdx(0);
    setAnswer('');
    setIsCorrect(null);
    setScore({ corretas: 0, respondidas: 0 });
    setRetryQueue([]);
    setAttemptsByKey({});
    setMistakeKeys({});
    setMistakeList([]);
    const now = new Date().toISOString();
    setStartedAt(now);
    setPhase('question');
  };

  const goSetup = () => {
    setPhase('setup');
  };

  const submit = () => {
    if (!current) return;

    const user = normalizeAnswer(answer);
    const correct = normalizeAnswer(current.Osso);
    const ok = user.length > 0 && (user === correct || correct.includes(user) || user.includes(correct));

    setIsCorrect(ok);
    setScore((s) => ({ corretas: s.corretas + (ok ? 1 : 0), respondidas: s.respondidas + 1 }));

    if (!ok) {
      const k = keyOf(current);
      const attempts = (attemptsByKey[k] ?? 0) + 1;
      setAttemptsByKey((m) => ({ ...m, [k]: attempts }));

      // register mistake once for history/redo list
      if (!mistakeKeys[k]) {
        setMistakeKeys((mk) => ({ ...mk, [k]: true }));
        setMistakeList((lst) => [...lst, current]);
      }

      // auto-queue for retry (bounded)
      if (attempts <= MAX_AUTO_RETRY_PER_ITEM) {
        setRetryQueue((q) => [...q, current]);
      }
    }

    setPhase('reveal');
  };

  const next = () => {
    const nextIdx = idx + 1;

    // If finished this deck, but have retry queue => immediately continue with errors (automatic)
    if (nextIdx >= deck.length) {
      if (retryQueue.length > 0) {
        const newDeck = shuffle(retryQueue);
        setDeck(newDeck);
        setIdx(0);
        setRetryQueue([]);
        setAnswer('');
        setIsCorrect(null);
        setPhase('question');
        return;
      }

      // otherwise finish
      finish();
      return;
    }

    setIdx(nextIdx);
    setPhase('question');
    setAnswer('');
    setIsCorrect(null);
  };

  const finish = () => {
    const finishedAt = new Date().toISOString();
    const total = (filteredItems.length ? filteredItems.length : items.length);
    const respondidas = score.respondidas;
    const corretas = score.corretas;
    const acuracia = respondidas ? Math.round((corretas / respondidas) * 100) : 0;
    const erros = respondidas - corretas;

    const session: QuizSession = {
      id: uid('sess'),
      startedAt: startedAt || finishedAt,
      finishedAt,
      grupos: selectedGroups,
      total,
      respondidas,
      corretas,
      acuracia,
      erros
    };

    const newHistory = [session, ...history].slice(0, 50);
    setHistory(newHistory);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch {}

    setPhase('done');
  };

  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
  };

  const toggleAll = (checked: boolean) => {
    setSelectedGroups(checked ? groupNames : []);
  };

  const toggleGroup = (g: string) => {
    setSelectedGroups((prev) => {
      const set = new Set(prev);
      if (set.has(g)) set.delete(g); else set.add(g);
      return Array.from(set);
    });
  };

  // --- SETUP ---
  if (phase === 'setup') {
    const allChecked = selectedGroups.length === groupNames.length;
    const countSelected = filteredItems.length;

    return (
      <div className="card" style={{ padding: 16 }}>
        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="pill">🧠 Quiz</div>
            <div className="small" style={{ marginTop: 8 }}>
              Selecione os grupos e inicie. O quiz é randômico e refaz automaticamente os erros.
            </div>
          </div>
          <div className="pill">{countSelected} itens selecionados</div>
        </div>

        <div className="divider" />

        <fieldset>
          <legend>Modo (filtrar por grupo)</legend>
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <label className="small" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} />
              Selecionar todos
            </label>
            <div className="small">Você pode focar em “Crânio”, “Coluna” ou “Tórax”.</div>
          </div>

          <div className="divider" />

          <div style={{ display: 'grid', gap: 8 }}>
            {groupNames.map((g) => (
              <label key={g} className="small" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="checkbox" checked={selectedGroups.includes(g)} onChange={() => toggleGroup(g)} />
                <span style={{ flex: 1 }}>{g}</span>
                <span className="pill" style={{ padding: '4px 10px' }}>{grouped[g].length}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="divider" />

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btnPrimary" onClick={() => startQuiz()} disabled={countSelected === 0}>
            Iniciar quiz
          </button>
        </div>

        {countSelected === 0 && (
          <div className="small" style={{ marginTop: 10 }}>Selecione pelo menos um grupo para começar.</div>
        )}

        <div className="divider" />

        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="pill">📈 Histórico de sessões</div>
          <button className="btn btnDanger" onClick={clearHistory} disabled={history.length === 0}>Limpar histórico</button>
        </div>

        {history.length === 0 ? (
          <div className="small" style={{ marginTop: 10 }}>Nenhuma sessão salva ainda.</div>
        ) : (
          <div style={{ marginTop: 10, overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Corretas</th>
                  <th>Respondidas</th>
                  <th>Acurácia</th>
                  <th>Erros</th>
                  <th>Grupos</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 8).map((h) => (
                  <tr key={h.id}>
                    <td>{formatDateTime(h.finishedAt)}</td>
                    <td>{h.corretas}</td>
                    <td>{h.respondidas}</td>
                    <td>{h.acuracia}%</td>
                    <td>{h.erros}</td>
                    <td style={{ maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.grupos.join(' • ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="small" style={{ marginTop: 8 }}>Mostrando até 8 sessões (máximo armazenado: 50).</div>
          </div>
        )}
      </div>
    );
  }

  // --- DONE ---
  if (phase === 'done') {
    const total = score.respondidas;
    const pct = total ? Math.round((score.corretas / total) * 100) : 0;
    const canRedoMistakes = mistakeList.length > 0;

    return (
      <div className="card" style={{ padding: 16 }}>
        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="pill">✅ Quiz finalizado</div>
            <div className="small" style={{ marginTop: 8 }}>
              Pontuação: <strong>{score.corretas}</strong> / {total} ({pct}%) • Erros: {total - score.corretas}
            </div>
            {canRedoMistakes && (
              <div className="small" style={{ marginTop: 6 }}>
                Você errou {mistakeList.length} item(ns). Pode refazer apenas os erros.
              </div>
            )}
          </div>
          <div className="row">
            <button className="btn" onClick={goSetup}>Alterar grupos</button>
            <button className="btn btnPrimary" onClick={() => startQuiz()}>Recomeçar (randômico)</button>
            {canRedoMistakes && (
              <button className="btn btnGood" onClick={() => startQuiz(mistakeList)}>Refazer erros</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- QUESTION/REVEAL ---
  if (!current) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <div className="pill">🧠 Quiz</div>
        <div className="divider" />
        <div className="small">Sem itens para exibir.</div>
        <div className="divider" />
        <button className="btn" onClick={goSetup}>Voltar</button>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="pill">🧠 Quiz</div>
          <div className="small" style={{ marginTop: 8 }}>Qual é o nome do osso?</div>
        </div>

        <div className="row" style={{ alignItems: 'center' }}>
          <div className="pill">{idx + 1} / {deck.length}{retryQueue.length ? ` (+${retryQueue.length} erros pendentes)` : ''}</div>
          <div className="pill">Pontuação: {score.corretas}/{score.respondidas}</div>
          <button className="btn" onClick={goSetup}>Configurar</button>
        </div>
      </div>

      <div className="divider" />

      <div className="grid2">
        <div className="imgWrap"><img src={current.Imagens[0]} alt="Imagem 1" /></div>
        <div className="imgWrap"><img src={current.Imagens[1]} alt="Imagem 2" /></div>
      </div>

      <div style={{ marginTop: 14 }}>
        {phase === 'question' && (
          <>
            <label className="small" htmlFor="answer">Digite o nome do osso</label>
            <div className="row" style={{ marginTop: 8 }}>
              <input
                id="answer"
                className="input"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Ex.: Esfenoide"
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
              <button className="btn btnPrimary" onClick={submit} disabled={answer.trim().length === 0}>
                Avançar
              </button>
            </div>
          </>
        )}

        {phase === 'reveal' && (
          <>
            <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Resposta correta: {current.Osso}</div>
                <div className="small">Grupo: {current.Grupo}</div>
                <div className="small">Licença: {current.Copyright?.licenca} • Fonte: {current.Copyright?.fonte}</div>
              </div>
              <div className="pill" style={{ borderColor: isCorrect ? 'rgba(34,197,94,.55)' : 'rgba(239,68,68,.55)', color: isCorrect ? '#bbf7d0' : '#fecaca' }}>
                {isCorrect ? '✔ Você acertou' : '✘ Você errou'}
              </div>
            </div>

            <div className="divider" />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btnGood" onClick={next}>Próximo</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
