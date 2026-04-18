/* ─── AnaMed app.js ─── */
const BASE = (()=>{
  const p = location.pathname.replace(/\/[^/]*$/, '');
  return p === '/' ? '' : p;
})();

function fetchJSON(path) {
  return fetch(BASE + '/' + path).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
}

function slugify(s) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function normalizeAnswer(s) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

// ── State ──────────────────────────────────────────────────────────────────
const State = {
  catalog: null,          // estudos.json
  datasets: {},           // path -> dataset json
  currentDisciplina: null,
  currentEstudo: null,    // EstudoRef
  currentDataset: null,   // StudyDataset
  quiz: {
    queue: [],
    errorQueue: [],
    errorItems: [],
    current: null,
    total: 0,
    corretas: 0,
    respondidas: 0,
    startedAt: null,
    selectedGroups: [],
  }
};

// ── History ────────────────────────────────────────────────────────────────
function loadHistory() {
  try { return JSON.parse(localStorage.getItem('anamed_history') || '[]'); } catch { return []; }
}
function saveSession(session) {
  const h = loadHistory();
  h.unshift(session);
  localStorage.setItem('anamed_history', JSON.stringify(h.slice(0,50)));
}
function loadSelectedGroups(estudoKey) {
  try { return JSON.parse(localStorage.getItem('anamed_groups_' + estudoKey) || 'null'); } catch { return null; }
}
function saveSelectedGroups(estudoKey, groups) {
  localStorage.setItem('anamed_groups_' + estudoKey, JSON.stringify(groups));
}

// ── Views ──────────────────────────────────────────────────────────────────
function showView(id) {
  ['view-home','view-disciplina','view-estudo'].forEach(v => {
    document.getElementById(v).style.display = v === id ? 'block' : 'none';
  });
}

// ── HOME ───────────────────────────────────────────────────────────────────
function renderHome() {
  showView('view-home');
  const grid = document.getElementById('disciplinas-grid');
  grid.innerHTML = '';
  State.catalog.itens.forEach(d => {
    const firstStudy = d.Estudos[0];
    let imgUrl = '';
    if (firstStudy) {
      const im = firstStudy.Imagem;
      if (typeof im === 'string') imgUrl = im;
      else if (Array.isArray(im) && im[0]) imgUrl = im[0].url;
    }
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'overflow:hidden;cursor:pointer';
    card.innerHTML = `
      <div style="width:100%;aspect-ratio:16/9;background:rgba(255,255,255,.04);overflow:hidden">
        ${imgUrl ? `<img src="${imgUrl}" alt="${d.Disciplina}" style="width:100%;height:100%;object-fit:cover" loading="lazy"/>` : '<div class="small" style="padding:12px">Sem imagem</div>'}
      </div>
      <div style="padding:14px">
        <div class="pill">Disciplina</div>
        <div style="font-weight:800;font-size:18px;margin-top:10px">${d.Disciplina}</div>
        <div class="small" style="margin-top:8px">${d.Estudos.length} estudo(s)</div>
      </div>`;
    card.onclick = () => openDisciplina(d);
    grid.appendChild(card);
  });
}

// ── DISCIPLINA ─────────────────────────────────────────────────────────────
function openDisciplina(d) {
  State.currentDisciplina = d;
  document.getElementById('bc-disciplina').textContent = d.Disciplina;
  showView('view-disciplina');
  const grid = document.getElementById('estudos-grid');
  grid.innerHTML = '';
  d.Estudos.forEach(e => {
    let imgUrl = '';
    const im = e.Imagem;
    if (typeof im === 'string') imgUrl = im;
    else if (Array.isArray(im) && im[0]) imgUrl = im[0].url;
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'overflow:hidden;cursor:pointer';
    card.innerHTML = `
      <div style="width:100%;aspect-ratio:16/9;background:rgba(255,255,255,.04);overflow:hidden">
        ${imgUrl ? `<img src="${imgUrl}" alt="${e.Titulo}" style="width:100%;height:100%;object-fit:cover" loading="lazy"/>` : '<div class="small" style="padding:12px">Sem imagem</div>'}
      </div>
      <div style="padding:14px">
        <div class="pill">Estudo</div>
        <div style="font-weight:800;font-size:18px;margin-top:10px">${e.Titulo}</div>
      </div>`;
    card.onclick = () => openEstudo(e);
    grid.appendChild(card);
  });
}

// ── ESTUDO ─────────────────────────────────────────────────────────────────
async function openEstudo(e) {
  State.currentEstudo = e;
  document.getElementById('bc2-disciplina').textContent = State.currentDisciplina.Disciplina;
  document.getElementById('bc2-estudo').textContent = e.Titulo;
  showView('view-estudo');
  App.showTab('study');

  if (!State.datasets[e.Exercicios]) {
    State.datasets[e.Exercicios] = await fetchJSON('assets/' + e.Exercicios);
  }
  State.currentDataset = State.datasets[e.Exercicios];
  renderStudy();
  setupQuizGroups();
}

// ── STUDY MODE ─────────────────────────────────────────────────────────────
function renderStudy() {
  const ds = State.currentDataset;
  const groups = {};
  ds.itens.forEach(item => {
    (groups[item.Grupo] = groups[item.Grupo] || []).push(item);
  });
  const container = document.getElementById('study-content');
  container.innerHTML = '';
  Object.entries(groups).forEach(([grupo, items]) => {
    const section = document.createElement('div');
    section.style.marginBottom = '8px';
    const header = document.createElement('button');
    header.className = 'accordion-header';
    header.innerHTML = `<span>${grupo}</span><span style="font-size:18px;transition:transform .2s">▾</span>`;
    const body = document.createElement('div');
    body.className = 'accordion-body';
    body.style.display = 'none';
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.cssText = 'padding:14px;margin-bottom:10px';
      const imgs = item.Imagens.map(img => {
        const copyright = img.Copyright;
        const copyrightHtml = copyright ? `
          <div class="small" style="padding:4px 8px 8px;color:rgba(168,178,209,.5)">
            ${copyright.fonte ? `Fonte: ${copyright.urlOriginal ? `<a href="${copyright.urlOriginal}" target="_blank" style="color:rgba(168,178,209,.5)">${copyright.fonte}</a>` : copyright.fonte}` : ''}
            ${copyright.fonte && copyright.licenca ? ' · ' : ''}
            ${copyright.licenca ? `Licença: ${copyright.licenca}` : ''}
          </div>` : '';
        return `<div class="imgWrap">
          ${img.indicação ? `<div class="small" style="padding:6px 8px">${img.indicação}</div>` : ''}
          <img src="${img.url}" alt="${item.Resposta}" loading="lazy"/>
          ${copyrightHtml}
        </div>`;
      }).join('');
      card.innerHTML = `
        <div class="small" style="margin-bottom:4px">${item.Pergunta}</div>
        <div style="font-weight:700;margin-bottom:10px">${item.Resposta}</div>
        <div class="grid2">${imgs}</div>`;
      body.appendChild(card);
    });
    header.onclick = () => {
      const open = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'block';
      header.querySelector('span:last-child').style.transform = open ? '' : 'rotate(180deg)';
    };
    section.appendChild(header);
    const divider = document.createElement('div');
    divider.className = 'divider';
    divider.style.margin = '0';
    section.appendChild(divider);
    section.appendChild(body);
    container.appendChild(section);
  });
}

// ── QUIZ SETUP ─────────────────────────────────────────────────────────────
function estudoKey() {
  return slugify(State.currentDisciplina.Disciplina) + '_' + slugify(State.currentEstudo.Titulo);
}

function setupQuizGroups() {
  const ds = State.currentDataset;
  const groups = [...new Set(ds.itens.map(i => i.Grupo))];
  const saved = loadSelectedGroups(estudoKey()) || groups;
  const container = document.getElementById('quiz-groups');
  container.innerHTML = '';
  groups.forEach(g => {
    const label = document.createElement('label');
    label.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = g;
    cb.checked = saved.includes(g);
    label.appendChild(cb);
    label.appendChild(document.createTextNode(g));
    container.appendChild(label);
  });
}

// ── QUIZ LOGIC ─────────────────────────────────────────────────────────────
function getSelectedGroups() {
  return [...document.querySelectorAll('#quiz-groups input:checked')].map(cb => cb.value);
}

function buildQueue(items) {
  return shuffle(items).map(item => ({ item, retries: 0 }));
}

function showQuizPanel(id) {
  ['quiz-setup','quiz-question','quiz-reveal','quiz-done'].forEach(p => {
    document.getElementById(p).style.display = p === id ? 'block' : 'none';
  });
}

function renderQuizImages(containerId, item) {
  const c = document.getElementById(containerId);
  c.innerHTML = item.Imagens.map(img => {
    const copyright = img.Copyright;
    const copyrightHtml = copyright ? `
          <div class="small" style="padding:4px 8px 8px;color:rgba(168,178,209,.5)">
            ${copyright.fonte ? `Fonte: ${copyright.urlOriginal ? `<a href="${copyright.urlOriginal}" target="_blank" style="color:rgba(168,178,209,.5)">${copyright.fonte}</a>` : copyright.fonte}` : ''}
            ${copyright.fonte && copyright.licenca ? ' · ' : ''}
            ${copyright.licenca ? `Licença: ${copyright.licenca}` : ''}
          </div>` : '';
    return `<div class="imgWrap">
      ${img.indicação ? `<div class="small" style="padding:6px 8px">${img.indicação}</div>` : ''}
      <img src="${img.url}" alt="" loading="lazy"/>
      ${copyrightHtml}
    </div>`;
  }).join('');
}

const App = {
  showTab(tab) {
    document.getElementById('panel-study').style.display = tab === 'study' ? 'block' : 'none';
    document.getElementById('panel-quiz').style.display  = tab === 'quiz'  ? 'block' : 'none';
    document.getElementById('tab-study').className = 'btn' + (tab === 'study' ? ' btn-primary' : '');
    document.getElementById('tab-quiz').className  = 'btn' + (tab === 'quiz'  ? ' btn-primary' : '');
    if (tab === 'quiz') showQuizPanel('quiz-setup');
  },

  startQuiz(items) {
    const groups = getSelectedGroups();
    if (!groups.length) { alert('Selecione ao menos um grupo.'); return; }
    saveSelectedGroups(estudoKey(), groups);
    const pool = items || State.currentDataset.itens.filter(i => groups.includes(i.Grupo));
    if (!pool.length) { alert('Nenhum item nos grupos selecionados.'); return; }
    const q = State.quiz;
    q.queue = buildQueue(pool);
    q.errorQueue = [];
    q.errorItems = [];
    q.total = pool.length;
    q.corretas = 0;
    q.respondidas = 0;
    q.startedAt = new Date().toISOString();
    q.selectedGroups = groups;
    showQuizPanel('quiz-question');
    App._showQuestion();
  },

  _showQuestion() {
    const q = State.quiz;
    if (!q.queue.length && !q.errorQueue.length) { App._finishQuiz(); return; }
    const entry = q.queue.length ? q.queue.shift() : q.errorQueue.shift();
    q.current = entry;
    document.getElementById('quiz-progress').textContent =
      `Pergunta ${q.respondidas + 1} de ${q.total} | Corretas: ${q.corretas}`;
    renderQuizImages('quiz-images', entry.item);
    document.getElementById('quiz-pergunta').textContent = entry.item.Pergunta;
    document.getElementById('quiz-input').value = '';
    setTimeout(() => document.getElementById('quiz-input').focus(), 50);
  },

  submitAnswer(e) {
    e.preventDefault();
    const q = State.quiz;
    const userRaw = document.getElementById('quiz-input').value;
    const user = normalizeAnswer(userRaw);
    const correct = normalizeAnswer(q.current.item.Resposta);
    const isCorrect = user === correct;
    q.respondidas++;
    if (isCorrect) {
      q.corretas++;
    } else {
      if (q.current.retries < 2) {
        q.errorQueue.push({ item: q.current.item, retries: q.current.retries + 1 });
      }
      if (!q.errorItems.find(i => i.Resposta === q.current.item.Resposta)) {
        q.errorItems.push(q.current.item);
      }
    }
    renderQuizImages('quiz-reveal-images', q.current.item);
    document.getElementById('quiz-reveal-pergunta').textContent = q.current.item.Pergunta;
    document.getElementById('quiz-user-answer').textContent = userRaw || '(em branco)';
    document.getElementById('quiz-correct-answer').textContent = q.current.item.Resposta;
    document.getElementById('quiz-reveal-verdict').innerHTML = isCorrect
      ? '<span style="color:#4ade80;font-weight:700">✓ Correto!</span>'
      : '<span style="color:#f87171;font-weight:700">✗ Incorreto</span>';
    showQuizPanel('quiz-reveal');
  },

  nextQuestion() {
    showQuizPanel('quiz-question');
    App._showQuestion();
  },

  _finishQuiz() {
    const q = State.quiz;
    const finishedAt = new Date().toISOString();
    const acuracia = q.total ? Math.round((q.corretas / q.total) * 100) : 0;
    const session = {
      id: uid(), startedAt: q.startedAt, finishedAt,
      grupos: q.selectedGroups, total: q.total,
      respondidas: q.respondidas, corretas: q.corretas,
      acuracia, erros: q.errorItems.length
    };
    saveSession(session);
    document.getElementById('quiz-score').innerHTML = `
      <div class="card" style="padding:16px;display:inline-block">
        <div style="font-size:32px;font-weight:800">${acuracia}%</div>
        <div class="small">${q.corretas} corretas de ${q.total}</div>
      </div>`;
    const btnRetry = document.getElementById('btn-retry-errors');
    btnRetry.style.display = q.errorItems.length ? 'inline-flex' : 'none';
    App._renderHistory();
    showQuizPanel('quiz-done');
  },

  retryErrors() {
    const items = State.quiz.errorItems;
    if (!items.length) return;
    App.startQuiz(items);
  },

  _renderHistory() {
    const h = loadHistory();
    const el = document.getElementById('history-table');
    if (!h.length) { el.innerHTML = '<p class="small">Nenhuma sessão ainda.</p>'; return; }
    el.innerHTML = `<table class="table">
      <thead><tr><th>Data</th><th>Estudo</th><th>Grupos</th><th>Total</th><th>Corretas</th><th>Acurácia</th></tr></thead>
      <tbody>${h.map(s=>`<tr>
        <td>${formatDate(s.finishedAt)}</td>
        <td>${(s.grupos||[]).join(', ')}</td>
        <td>${(s.grupos||[]).length}</td>
        <td>${s.total}</td>
        <td>${s.corretas}</td>
        <td>${s.acuracia}%</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }
};

// ── Breadcrumb navigation ──────────────────────────────────────────────────
document.getElementById('site-title').onclick = () => renderHome();
document.getElementById('bc-home').onclick     = () => renderHome();
document.getElementById('bc2-home').onclick    = () => renderHome();
document.getElementById('bc2-disciplina').onclick = () => openDisciplina(State.currentDisciplina);

// ── Boot ───────────────────────────────────────────────────────────────────
fetchJSON('assets/estudos.json').then(data => {
  State.catalog = data;
  renderHome();
}).catch(err => {
  document.body.innerHTML = `<div style="padding:40px;color:#f87171">Erro ao carregar estudos.json: ${err}</div>`;
});
