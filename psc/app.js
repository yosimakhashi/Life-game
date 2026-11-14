// PSC Padanam app logic. Hash-routed single page; all progress lives in
// localStorage under one key so it can be exported and imported as JSON.

const KEY = 'psc-padanam-v1';
const $app = document.getElementById('app');
const $top = document.getElementById('top');

// ---------- state ----------
function blank() {
    return { done: {}, videos: {}, mynotes: {}, exams: [], wrong: {}, attempts: [], study: {}, log: [], last: null, goal: 60 };
}
let S = blank();
try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* storage blocked: start fresh */ }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

// ---------- helpers ----------
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
const plain = s => s.replace(/\*\*?/g, '');
const today = () => dayKey(new Date());
function dayKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function daysUntil(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const t = new Date(y, m - 1, d); const n = new Date(); n.setHours(0, 0, 0, 0);
    return Math.round((t - n) / 86400000);
}
function fmtDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2200); }
function uid() { return Math.random().toString(36).slice(2, 9); }

const SUBJ = Object.fromEntries(SUBJECTS.map(s => [s.id, s]));
function topic(sid, tid) { return SUBJ[sid] && SUBJ[sid].topics.find(t => t.id === tid); }
const tkey = (sid, tid) => sid + '/' + tid;
function allTopics() { return SUBJECTS.flatMap(s => s.topics.map(t => ({ s, t }))); }
function allQuestions() {
    return SUBJECTS.flatMap(s => s.topics.flatMap(t => t.qs.map((q, i) => ({ key: tkey(s.id, t.id) + '#' + i, sid: s.id, tid: t.id, subj: s.name, q: q[0], opts: q[1], ans: q[2], ex: q[3] }))));
}
function subjProgress(s) { const n = s.topics.length; const d = s.topics.filter(t => S.done[tkey(s.id, t.id)]).length; return { n, d, pct: n ? Math.round(d / n * 100) : 0 }; }
function overall() { const all = allTopics(); const d = all.filter(x => S.done[tkey(x.s.id, x.t.id)]).length; return { n: all.length, d, pct: Math.round(d / all.length * 100) }; }
function streak() {
    let n = 0; const d = new Date();
    if (!S.study[dayKey(d)]) d.setDate(d.getDate() - 1); // today not started yet doesn't break the streak
    while (S.study[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
}
function addStudy(min) { const k = today(); S.study[k] = (S.study[k] || 0) + min; save(); }
function nextExam() { return S.exams.filter(e => daysUntil(e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date))[0]; }

function ytId(url) {
    url = url.trim();
    if (/^[\w-]{11}$/.test(url)) return url;
    const m = url.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : null;
}
const ytSearch = q => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
const ytEmbed = id => 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&modestbranding=1&autoplay=1';
const ytThumb = id => 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg';

function header(title, back, right) {
    $top.innerHTML = (back ? `<a class="back" href="${back}" aria-label="Back">‹</a>` : '<span style="font-size:22px">🪔</span>') +
        `<h1>${esc(title)}</h1>` + (right || '');
}
const fireChip = () => `<span class="chip" title="Study streak">🔥 ${streak()}</span>`;

// ---------- router ----------
let quiz = null;      // running quiz/mock state
let timerInt = null;  // study timer interval
function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const [view, a, b, c] = parts.length ? parts : ['home'];
    document.querySelectorAll('nav.tabbar a').forEach(el => {
        const tab = el.dataset.tab;
        el.classList.toggle('on', tab === view || (tab === 'learn' && (view === 'subject' || view === 'topic')) || (tab === 'practice' && ['quiz', 'flash', 'log', 'mistakes', 'result'].includes(view)));
    });
    if (view !== 'quiz' && quiz && quiz.tick) { clearInterval(quiz.tick); quiz.tick = null; }
    const views = { home, learn, subject, topic: topicView, videos, practice, quiz: quizView, result: resultView, flash, log: logView, mistakes, exams, exam: examEdit, settings, timer: timerView };
    (views[view] || home)(a, b, c);
    window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

// ---------- Home ----------
function home() {
    header('PSC Padanam', null, fireChip() + ` <a class="chip" href="#/settings" aria-label="Settings">⚙️</a>`);
    const ex = nextExam(); const o = overall();
    const min = S.study[today()] || 0; const goal = S.goal || 60;
    const last = S.last && topic(...S.last.split('/')) ? S.last.split('/') : null;
    const facts = allTopics().flatMap(x => x.t.notes.map(n => ({ n, x })));
    const dayNum = Math.floor(Date.now() / 86400000);
    const fact = facts[dayNum % facts.length];
    const weak = weakestSubject();
    $app.innerHTML = `
    ${ex ? `<a class="card hero" href="#/exams" style="text-decoration:none">
        <div class="label">Next exam heads-up</div>
        <div class="row" style="margin-top:6px"><div class="big">${daysUntil(ex.date)}</div><div><b>${daysUntil(ex.date) === 1 ? 'day' : 'days'} left</b><div class="small muted">${daysUntil(ex.date) === 0 ? 'Exam is today. All the best!' : ''}</div></div></div>
        <div style="margin-top:8px"><b>${esc(ex.name)}</b>${ex.cat ? ` <span class="small muted">· Cat. ${esc(ex.cat)}</span>` : ''}<div class="small muted">${fmtDate(ex.date)}</div></div>
        ${headsUp(ex).slice(0, 2).map(h => `<div class="small" style="margin-top:6px">⚠️ ${esc(h)}</div>`).join('')}
    </a>` : `<div class="card hero"><div class="label">Next exam heads-up</div>
        <p style="margin:6px 0 12px">Add your exam date and the app will count down and remind you what to do before it.</p>
        <a class="btn primary" href="#/exam/new">+ Add my exam</a></div>`}

    <div class="grid2">
        <div class="stat"><span class="label">Syllabus done</span><b>${o.pct}%</b><div class="bar green" style="margin-top:6px"><i style="width:${o.pct}%"></i></div><span class="small muted">${o.d} of ${o.n} topics</span></div>
        <div class="stat"><span class="label">Studied today</span><b>${min} min</b><div class="bar" style="margin-top:6px"><i style="width:${Math.min(100, min / goal * 100)}%"></i></div><span class="small muted">Goal ${goal} min</span></div>
    </div>

    <div class="row">
        <a class="btn primary" style="flex:1" href="#/timer">⏱ Study timer</a>
        <a class="btn" style="flex:1" href="#/quiz/quick">⚡ Quick quiz</a>
    </div>

    ${last ? `<a class="item" href="#/topic/${last[0]}/${last[1]}"><div class="ico">${SUBJ[last[0]].icon}</div><div class="txt"><span class="label">Continue</span><b>${esc(topic(last[0], last[1]).title)}</b><span class="small muted">${esc(SUBJ[last[0]].name)}</span></div><span class="chev">›</span></a>` : ''}

    <div class="card"><div class="label">Fact of the day</div><p style="margin:6px 0 4px">${md(fact.n)}</p><a class="small muted" href="#/topic/${fact.x.s.id}/${fact.x.t.id}">${esc(fact.x.s.name)} › ${esc(fact.x.t.title)}</a></div>

    ${weak ? `<a class="item" href="#/quiz/subject/${weak.id}"><div class="ico">🎯</div><div class="txt"><span class="label">Needs work</span><b>${esc(weak.name)}</b><span class="small muted">${weak.acc}% correct in your quizzes. Practise it now.</span></div><span class="chev">›</span></a>` : ''}

    <div class="card"><h2>Last 7 days</h2>${weekChart()}</div>
    `;
}
function weekChart() {
    const days = []; const d = new Date(); d.setDate(d.getDate() - 6);
    for (let i = 0; i < 7; i++) { days.push({ k: dayKey(d), l: d.toLocaleDateString(undefined, { weekday: 'narrow' }) }); d.setDate(d.getDate() + 1); }
    const max = Math.max(S.goal || 60, ...days.map(x => S.study[x.k] || 0));
    return `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;align-items:end;height:110px">` +
        days.map(x => { const v = S.study[x.k] || 0; return `<div style="display:grid;gap:4px;justify-items:center;height:100%;align-content:end"><span class="small muted">${v || ''}</span><div style="width:100%;max-width:28px;height:${Math.max(4, v / max * 70)}px;border-radius:6px;background:${v ? 'var(--accent)' : 'var(--panel-2)'}"></div><span class="small muted">${x.l}</span></div>`; }).join('') + `</div>`;
}
function weakestSubject() {
    const stats = {};
    S.attempts.forEach(a => (a.per || []).forEach(p => { const s = stats[p.sid] || (stats[p.sid] = { c: 0, n: 0 }); s.n++; if (p.ok) s.c++; }));
    const list = Object.entries(stats).filter(([, v]) => v.n >= 4).map(([id, v]) => ({ id, name: SUBJ[id] ? SUBJ[id].name : id, acc: Math.round(v.c / v.n * 100) })).sort((a, b) => a.acc - b.acc);
    return list[0] && list[0].acc < 80 ? list[0] : null;
}

// ---------- Study timer ----------
function timerView() {
    header('Study timer', '#/home', fireChip());
    const presets = [25, 45, 60];
    const t = timerView.state || (timerView.state = { len: 25, left: 25 * 60, running: false, endAt: 0, credited: 0 });
    $app.innerHTML = `
    <div class="card" style="text-align:center">
        <div class="label">Focus session</div>
        <div class="timer" id="tm">--:--</div>
        <div class="row" style="justify-content:center;margin:10px 0">${presets.map(p => `<button class="btn ${t.len === p ? 'primary' : ''}" data-len="${p}">${p} min</button>`).join('')}</div>
        <div class="row" style="justify-content:center"><button class="btn primary" id="go">${t.running ? 'Pause' : 'Start'}</button><button class="btn ghost" id="rs">Reset</button></div>
        <p class="small muted" style="margin-bottom:0">Each finished minute is added to today's study time, even if you stop early.</p>
    </div>
    <div class="card"><h2>Add time studied elsewhere</h2><div class="row"><input type="number" id="manual" min="1" max="600" placeholder="Minutes"><button class="btn" id="addm">Add</button></div></div>
    <div class="card"><h2>Daily goal</h2><div class="row"><input type="number" id="goal" min="10" max="900" value="${S.goal || 60}"><button class="btn" id="setg">Save</button></div></div>`;
    const tm = document.getElementById('tm');
    function paint() {
        if (t.running) t.left = Math.max(0, Math.round((t.endAt - Date.now()) / 1000));
        const used = Math.floor((t.len * 60 - t.left) / 60);
        if (used > t.credited) { addStudy(used - t.credited); t.credited = used; }
        tm.textContent = String(Math.floor(t.left / 60)).padStart(2, '0') + ':' + String(t.left % 60).padStart(2, '0');
        if (t.running && t.left === 0) { t.running = false; clearInterval(timerInt); toast('Session complete! Take a 5-minute break.'); try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {} timerView(); }
    }
    clearInterval(timerInt); if (t.running) timerInt = setInterval(paint, 500);
    paint();
    $app.querySelectorAll('[data-len]').forEach(b => b.onclick = () => { if (t.running) return; t.len = +b.dataset.len; t.left = t.len * 60; t.credited = 0; timerView(); });
    document.getElementById('go').onclick = () => {
        if (t.running) { t.running = false; clearInterval(timerInt); paint(); }
        else { if (t.left === 0) { t.left = t.len * 60; t.credited = 0; } t.running = true; t.endAt = Date.now() + t.left * 1000; }
        timerView();
    };
    document.getElementById('rs').onclick = () => { t.running = false; clearInterval(timerInt); t.left = t.len * 60; t.credited = 0; timerView(); };
    document.getElementById('addm').onclick = () => { const v = parseInt(document.getElementById('manual').value, 10); if (v > 0) { addStudy(v); toast(`Added ${v} min`); timerView(); } };
    document.getElementById('setg').onclick = () => { const v = parseInt(document.getElementById('goal').value, 10); if (v > 0) { S.goal = v; save(); toast('Goal saved'); } };
}

// ---------- Learn ----------
function learn() {
    header('Syllabus', null, fireChip());
    const o = overall();
    $app.innerHTML = `
    <div class="card"><div class="row"><div style="flex:1"><div class="label">Overall progress</div><b style="font-size:22px">${o.d} / ${o.n} topics</b></div><b style="font-size:28px;color:var(--green)">${o.pct}%</b></div><div class="bar green" style="margin-top:8px"><i style="width:${o.pct}%"></i></div></div>
    <input type="text" id="q" placeholder="🔍 Search notes (e.g. Vaikom, Article 32)">
    <div id="res" class="list"></div>
    <div class="list" id="subs">${SUBJECTS.map(s => { const p = subjProgress(s); return `
        <a class="item" href="#/subject/${s.id}"><div class="ico">${s.icon}</div><div class="txt"><b>${esc(s.name)}</b><span class="small muted ml">${esc(s.ml)}</span>
        <div class="row" style="margin-top:6px"><div class="bar green" style="flex:1"><i style="width:${p.pct}%"></i></div><span class="small muted">${p.d}/${p.n}</span><span class="tag ${s.weight}">${s.weight}</span></div></div><span class="chev">›</span></a>`; }).join('')}</div>
    <p class="small muted">Based on the common Kerala PSC preliminary syllabus. Check the official syllabus for your category number on keralapsc.gov.in.</p>`;
    const q = document.getElementById('q'), res = document.getElementById('res'), subs = document.getElementById('subs');
    q.oninput = () => {
        const v = q.value.trim().toLowerCase();
        if (v.length < 2) { res.innerHTML = ''; subs.hidden = false; return; }
        subs.hidden = true;
        const hits = [];
        allTopics().forEach(({ s, t }) => t.notes.forEach(n => { if (plain(n).toLowerCase().includes(v)) hits.push({ s, t, n }); }));
        res.innerHTML = hits.length ? hits.slice(0, 40).map(h => `<a class="card" style="text-decoration:none" href="#/topic/${h.s.id}/${h.t.id}"><div class="small muted">${h.s.icon} ${esc(h.s.name)} › ${esc(h.t.title)}</div><div>${md(h.n)}</div></a>`).join('') : '<p class="muted">No notes match that search.</p>';
    };
}
function subject(sid) {
    const s = SUBJ[sid]; if (!s) return learn();
    header(s.name, '#/learn', fireChip());
    const nq = s.topics.reduce((a, t) => a + t.qs.length, 0);
    $app.innerHTML = `
    <div class="card"><div class="row"><div class="ico" style="font-size:32px">${s.icon}</div><div><b>${esc(s.name)}</b><div class="ml muted small">${esc(s.ml)}</div></div><span class="spacer"></span><span class="tag ${s.weight}">${s.weight} weight</span></div></div>
    <div class="list">${s.topics.map(t => { const on = S.done[tkey(s.id, t.id)]; const nv = (S.videos[tkey(s.id, t.id)] || []).length; return `
        <a class="item" href="#/topic/${s.id}/${t.id}"><span class="tick ${on ? 'on' : ''}">${on ? '✓' : ''}</span><div class="txt"><b>${esc(t.title)}</b><span class="small muted">${t.notes.length} notes · ${t.qs.length} questions${nv ? ` · ${nv} videos` : ''}</span></div><span class="chev">›</span></a>`; }).join('')}</div>
    ${nq ? `<a class="btn primary block" href="#/quiz/subject/${s.id}">📝 Practise all ${nq} questions</a>` : ''}`;
}
function topicView(sid, tid, tab) {
    const s = SUBJ[sid], t = topic(sid, tid); if (!t) return learn();
    tab = tab || 'notes';
    const k = tkey(sid, tid); S.last = k; save();
    header(t.title, '#/subject/' + sid, fireChip());
    const vids = S.videos[k] || [];
    const tabs = [['notes', '📖 Notes'], ['videos', `▶️ Videos${vids.length ? ' (' + vids.length + ')' : ''}`], ['quiz', `📝 Quiz${t.qs.length ? ' (' + t.qs.length + ')' : ''}`], ['mine', '✏️ My notes']];
    let body = '';
    if (tab === 'notes') {
        body = `<div class="card notes"><ul>${t.notes.map(n => `<li>${md(n)}</li>`).join('')}</ul></div>
        <div class="row"><a class="btn" style="flex:1" href="#/flash/${sid}/${tid}">🃏 Flashcards</a><a class="btn" style="flex:1" href="#/topic/${sid}/${tid}/videos">▶️ Watch a class</a></div>`;
    } else if (tab === 'videos') {
        body = videoPanel(k, t.video, s.name + ' › ' + t.title);
    } else if (tab === 'quiz') {
        body = t.qs.length ? `<div class="card"><p style="margin-top:0">${t.qs.length} questions with explanations. You see the answer right after each question.</p><a class="btn primary block" href="#/quiz/topic/${sid}/${tid}">Start quiz</a></div>` : `<div class="card muted">No fixed questions for this topic. Add facts to My log on the Practice tab and revise them as flashcards.</div>`;
    } else {
        body = `<div class="card"><p class="small muted" style="margin-top:0">Your own notes for this topic. Saved on this device as you type.</p><textarea id="mine" placeholder="Shortcuts, mnemonics, points from the class video…">${esc(S.mynotes[k] || '')}</textarea></div>`;
    }
    const on = S.done[k];
    $app.innerHTML = `
    <div class="tabs">${tabs.map(([id, l]) => `<a class="${id === tab ? 'on' : ''}" href="#/topic/${sid}/${tid}/${id}">${l}</a>`).join('')}</div>
    ${body}
    <button class="btn ${on ? '' : 'primary'} block" id="done">${on ? '✓ Completed · tap to undo' : 'Mark topic as completed'}</button>`;
    document.getElementById('done').onclick = () => { if (on) delete S.done[k]; else { S.done[k] = today(); toast('Topic completed 🎉'); } save(); topicView(sid, tid, tab); };
    const mine = document.getElementById('mine');
    if (mine) mine.oninput = () => { S.mynotes[k] = mine.value; save(); };
    if (tab === 'videos') bindVideoPanel(k, () => topicView(sid, tid, 'videos'));
}

// ---------- Videos ----------
function videoPanel(k, query, label) {
    const vids = S.videos[k] || [];
    return `
    <div class="card">
        <div class="player" id="player" ${vids.length ? '' : 'hidden'}></div>
        <div class="list" style="margin-top:${vids.length ? 12 : 0}px">${vids.map((v, i) => `
            <div class="vid" data-i="${i}"><img src="${ytThumb(v.id)}" alt="" loading="lazy"><div class="txt"><b>${esc(v.title || 'Class video')}</b><span class="small muted">Tap to play</span></div><button class="btn ghost danger" data-del="${i}" aria-label="Remove">✕</button></div>`).join('')}</div>
        ${vids.length ? '' : `<p style="margin-top:0">No videos saved for this topic yet.</p>`}
    </div>
    <div class="card">
        <h2>1. Find a class</h2>
        <a class="btn primary block" target="_blank" rel="noopener" href="${ytSearch(query)}">Search YouTube: “${esc(query)}”</a>
        <h2 style="margin-top:16px">2. Save it here</h2>
        <p class="small muted" style="margin-top:0">On YouTube tap Share › Copy link, then paste it below. It will play inside the app${label ? ' under ' + esc(label) : ''}.</p>
        <div style="display:grid;gap:8px"><input type="url" id="vurl" placeholder="https://youtu.be/…"><input type="text" id="vtitle" placeholder="Title (optional)"><button class="btn" id="vadd">+ Save video</button></div>
    </div>`;
}
function bindVideoPanel(k, rerender) {
    const vids = S.videos[k] || [];
    const player = document.getElementById('player');
    function play(i) {
        player.hidden = false;
        player.innerHTML = `<iframe src="${ytEmbed(vids[i].id)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="${esc(vids[i].title || 'Video')}"></iframe>`;
        $app.querySelectorAll('.vid').forEach(el => el.classList.toggle('playing', +el.dataset.i === i));
    }
    if (vids.length && player) { player.innerHTML = `<button class="btn primary" style="position:absolute;inset:0;margin:auto;width:max-content;height:max-content" id="pl0">▶ Play “${esc(vids[0].title || 'Class video')}”</button>`; document.getElementById('pl0').onclick = () => play(0); }
    $app.querySelectorAll('.vid').forEach(el => el.onclick = e => { if (e.target.closest('[data-del]')) return; play(+el.dataset.i); });
    $app.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (!confirm('Remove this video?')) return; vids.splice(+b.dataset.del, 1); S.videos[k] = vids; save(); rerender(); });
    document.getElementById('vadd').onclick = () => {
        const id = ytId(document.getElementById('vurl').value);
        if (!id) { toast('That does not look like a YouTube link'); return; }
        vids.push({ id, title: document.getElementById('vtitle').value.trim() }); S.videos[k] = vids; save(); toast('Video saved'); rerender();
    };
}
function videos(sel) {
    header('Video classes', null, fireChip());
    const saved = allTopics().flatMap(({ s, t }) => (S.videos[tkey(s.id, t.id)] || []).map(v => ({ v, s, t })));
    $app.innerHTML = `
    ${saved.length ? `<div class="card"><div class="player" id="gplayer"><button class="btn primary" style="position:absolute;inset:0;margin:auto;width:max-content;height:max-content" id="gpl">▶ Play</button></div><div id="nowp" class="small muted" style="margin-top:8px"></div></div>
    <div class="list">${saved.map((x, i) => `<div class="vid" data-g="${i}"><img src="${ytThumb(x.v.id)}" alt="" loading="lazy"><div class="txt"><b>${esc(x.v.title || 'Class video')}</b><span class="small muted">${x.s.icon} ${esc(x.t.title)}</span></div></div>`).join('')}</div>`
    : `<div class="card"><h2>Your video library</h2><p style="margin:0">Open any topic, tap <b>Videos</b>, search YouTube for a class and paste the link. Saved videos show up here and play inside the app.</p></div>`}
    <div class="card"><h2>Find classes by topic</h2><div class="list">${allTopics().map(({ s, t }) => `
        <div class="row"><span>${s.icon}</span><div style="flex:1;min-width:0"><b class="small">${esc(t.title)}</b><div class="small muted">${esc(s.name)}</div></div>
        <a class="btn" target="_blank" rel="noopener" href="${ytSearch(t.video)}">YouTube</a><a class="btn ghost" href="#/topic/${s.id}/${t.id}/videos">Save</a></div>`).join('')}</div></div>`;
    const gp = document.getElementById('gplayer');
    function play(i) {
        const x = saved[i];
        gp.innerHTML = `<iframe src="${ytEmbed(x.v.id)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="${esc(x.v.title || 'Video')}"></iframe>`;
        document.getElementById('nowp').innerHTML = `Now playing · <a href="#/topic/${x.s.id}/${x.t.id}">${esc(x.s.name)} › ${esc(x.t.title)} notes</a>`;
        $app.querySelectorAll('[data-g]').forEach(el => el.classList.toggle('playing', +el.dataset.g === i));
    }
    if (gp) { document.getElementById('gpl').onclick = () => play(0); $app.querySelectorAll('[data-g]').forEach(el => el.onclick = () => { play(+el.dataset.g); window.scrollTo({ top: 0, behavior: 'smooth' }); }); }
}

// ---------- Practice ----------
function practice() {
    header('Practice', null, fireChip());
    const nWrong = Object.keys(S.wrong).length;
    const recent = S.attempts.slice(-5).reverse();
    $app.innerHTML = `
    <a class="item" href="#/quiz/mock"><div class="ico">🧾</div><div class="txt"><b>Mock test</b><span class="small muted">25 questions · 25 minutes · +1 right, −⅓ wrong (Kerala PSC style)</span></div><span class="chev">›</span></a>
    <a class="item" href="#/quiz/quick"><div class="ico">⚡</div><div class="txt"><b>Quick quiz</b><span class="small muted">10 random questions with instant answers</span></div><span class="chev">›</span></a>
    <a class="item" href="#/mistakes"><div class="ico">🎯</div><div class="txt"><b>Revise my mistakes</b><span class="small muted">${nWrong ? nWrong + ' questions you got wrong' : 'Nothing yet. Wrong answers collect here.'}</span></div><span class="chev">›</span></a>
    <a class="item" href="#/flash"><div class="ico">🃏</div><div class="txt"><b>Flashcards</b><span class="small muted">Rapid revision of every note</span></div><span class="chev">›</span></a>
    <a class="item" href="#/log"><div class="ico">📰</div><div class="txt"><b>My current affairs log</b><span class="small muted">${S.log.length} facts saved</span></div><span class="chev">›</span></a>
    <div class="card"><h2>Practise by subject</h2><div class="row wrap">${SUBJECTS.filter(s => s.topics.some(t => t.qs.length)).map(s => `<a class="btn" href="#/quiz/subject/${s.id}">${s.icon} ${esc(s.name.split(' ')[0])}</a>`).join('')}</div></div>
    ${recent.length ? `<div class="card"><h2>Recent scores</h2>${recent.map(a => `<div class="row small" style="padding:6px 0;border-top:1px solid var(--line)"><span>${esc(a.label)}</span><span class="spacer"></span><b>${a.mode === 'mock' ? a.score.toFixed(2) + ' / ' + a.n : a.right + ' / ' + a.n}</b><span class="muted">${a.date.slice(5)}</span></div>`).join('')}</div>` : ''}`;
}
function startQuiz(mode, a, b) {
    let pool = allQuestions(), label = 'Quick quiz', n = 10, limit = 0;
    if (mode === 'mock') { n = 25; limit = 25 * 60; label = 'Mock test'; }
    if (mode === 'subject') { pool = pool.filter(q => q.sid === a); n = pool.length; label = SUBJ[a] ? SUBJ[a].name : 'Subject'; }
    if (mode === 'topic') { pool = pool.filter(q => q.sid === a && q.tid === b); n = pool.length; const t = topic(a, b); label = t ? t.title : 'Topic'; }
    if (mode === 'mistakes') { pool = pool.filter(q => S.wrong[q.key]); n = pool.length; label = 'Mistakes'; }
    const qs = shuffle(pool).slice(0, n).map(q => { const order = shuffle(q.opts.map((_, i) => i)); return Object.assign({}, q, { order }); });
    quiz = { mode, label, qs, i: 0, picks: Array(qs.length).fill(null), limit, start: Date.now(), done: false, back: mode === 'topic' ? `#/topic/${a}/${b}/quiz` : '#/practice' };
}
function quizView(mode, a, b) {
    if (!quiz || quiz.done || quiz.key !== location.hash) { startQuiz(mode || 'quick', a, b); quiz.key = location.hash; }
    if (!quiz.qs.length) { header('Quiz', '#/practice'); $app.innerHTML = '<div class="card">No questions here yet.</div>'; return; }
    const isMock = quiz.mode === 'mock';
    header(quiz.label, quiz.back, isMock ? `<span class="chip" id="clock">--:--</span>` : `<span class="chip">${quiz.i + 1}/${quiz.qs.length}</span>`);
    const q = quiz.qs[quiz.i], pick = quiz.picks[quiz.i];
    const reveal = !isMock && pick !== null;
    $app.innerHTML = `
    ${isMock ? `<div class="dots">${quiz.qs.map((_, i) => `<button class="${quiz.picks[i] !== null ? 'ans' : ''} ${i === quiz.i ? 'cur' : ''}" data-go="${i}">${i + 1}</button>`).join('')}</div>` : `<div class="bar"><i style="width:${(quiz.i) / quiz.qs.length * 100}%"></i></div>`}
    <div class="card">
        <div class="small muted">${esc(q.subj)} · Question ${quiz.i + 1} of ${quiz.qs.length}</div>
        <p class="q">${esc(q.q)}</p>
        <div class="opts">${q.order.map((oi, idx) => {
            let cls = '';
            if (reveal) { if (oi === q.ans) cls = 'right'; else if (oi === pick) cls = 'wrong'; }
            else if (oi === pick) cls = 'sel';
            return `<button class="opt ${cls}" data-o="${oi}" ${reveal ? 'disabled' : ''}><b>${'ABCD'[idx]}.</b> ${esc(q.opts[oi])}</button>`;
        }).join('')}</div>
        ${reveal ? `<div class="explain" style="margin-top:12px">${pick === q.ans ? '✅ Correct.' : '❌ Answer: <b>' + esc(q.opts[q.ans]) + '</b>.'} ${esc(q.ex || '')}</div>` : ''}
    </div>
    <div class="row">
        ${quiz.i > 0 ? `<button class="btn" id="prev">‹ Back</button>` : ''}
        <span class="spacer"></span>
        ${isMock && pick !== null ? `<button class="btn ghost" id="clear">Clear</button>` : ''}
        ${quiz.i < quiz.qs.length - 1 ? `<button class="btn ${reveal || isMock ? 'primary' : ''}" id="next">${isMock || reveal ? 'Next ›' : 'Skip ›'}</button>` : `<button class="btn primary" id="finish">Finish</button>`}
    </div>`;
    $app.querySelectorAll('[data-o]').forEach(el => el.onclick = () => { quiz.picks[quiz.i] = +el.dataset.o; quizView(); });
    $app.querySelectorAll('[data-go]').forEach(el => el.onclick = () => { quiz.i = +el.dataset.go; quizView(); });
    const on = (id, f) => { const el = document.getElementById(id); if (el) el.onclick = f; };
    on('prev', () => { quiz.i--; quizView(); });
    on('next', () => { quiz.i++; quizView(); });
    on('clear', () => { quiz.picks[quiz.i] = null; quizView(); });
    on('finish', () => {
        const left = quiz.picks.filter(p => p === null).length;
        if (isMock && left && !confirm(`${left} questions unanswered. Submit anyway?`)) return;
        finishQuiz();
    });
    if (isMock) {
        const clock = document.getElementById('clock');
        const paint = () => {
            const left = Math.max(0, quiz.limit - Math.floor((Date.now() - quiz.start) / 1000));
            clock.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
            if (left === 0) { toast('Time is up!'); finishQuiz(); }
        };
        clearInterval(quiz.tick); quiz.tick = setInterval(paint, 1000); paint();
    }
}
function finishQuiz() {
    clearInterval(quiz.tick); quiz.tick = null; quiz.done = true;
    let right = 0, wrong = 0;
    const per = quiz.qs.map((q, i) => {
        const p = quiz.picks[i];
        if (p === null) return { sid: q.sid, ok: false, skip: true };
        if (p === q.ans) { right++; delete S.wrong[q.key]; return { sid: q.sid, ok: true }; }
        wrong++; S.wrong[q.key] = 1; return { sid: q.sid, ok: false };
    });
    const score = right - wrong / 3;
    const mins = Math.max(1, Math.round((Date.now() - quiz.start) / 60000));
    S.attempts.push({ mode: quiz.mode, label: quiz.label, n: quiz.qs.length, right, wrong, score, date: today(), per: per.filter(p => !p.skip) });
    if (S.attempts.length > 200) S.attempts = S.attempts.slice(-200);
    addStudy(mins);
    save();
    location.hash = '#/result';
}
function resultView() {
    if (!quiz || !quiz.done) { location.hash = '#/practice'; return; }
    header('Result', quiz.back);
    const a = S.attempts[S.attempts.length - 1];
    const skipped = a.n - a.right - a.wrong;
    const pct = Math.round(a.right / a.n * 100);
    $app.innerHTML = `
    <div class="card hero" style="text-align:center">
        <div class="label">${esc(a.label)}</div>
        <div class="big" style="margin:8px 0">${a.mode === 'mock' ? a.score.toFixed(2) : a.right}<span style="font-size:20px" class="muted"> / ${a.n}</span></div>
        <div>${pct >= 80 ? '🏆 Excellent!' : pct >= 50 ? '👍 Good, keep going.' : '💪 Revise the notes and try again.'}</div>
    </div>
    <div class="grid2" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat"><span class="label">Right</span><b style="color:var(--green)">${a.right}</b></div>
        <div class="stat"><span class="label">Wrong</span><b style="color:var(--red)">${a.wrong}</b></div>
        <div class="stat"><span class="label">Skipped</span><b>${skipped}</b></div>
    </div>
    ${a.mode === 'mock' ? `<p class="small muted" style="margin:0">Score = right − wrong ÷ 3 = ${a.right} − ${(a.wrong / 3).toFixed(2)}.</p>` : ''}
    <div class="row"><a class="btn primary" style="flex:1" href="${quiz.key}" id="again">Try again</a><a class="btn" style="flex:1" href="#/practice">Practice menu</a></div>
    <h2 style="margin:8px 0 0;font-size:16px">Review answers</h2>
    ${quiz.qs.map((q, i) => { const p = quiz.picks[i]; const ok = p === q.ans; return `
        <div class="card"><div class="small muted">${i + 1}. ${esc(q.subj)}</div><b>${esc(q.q)}</b>
        <div class="small" style="margin-top:6px">${p === null ? '⏭ Skipped' : ok ? '✅ ' + esc(q.opts[p]) : '❌ You: ' + esc(q.opts[p])}${ok ? '' : ` · Answer: <b style="color:var(--green)">${esc(q.opts[q.ans])}</b>`}</div>
        <div class="small muted" style="margin-top:4px">${esc(q.ex || '')} <a href="#/topic/${q.sid}/${q.tid}">Notes ›</a></div></div>`; }).join('')}`;
    document.getElementById('again').onclick = e => { e.preventDefault(); const k = quiz.key; quiz = null; if (location.hash === k) route(); else location.hash = k; };
}
function mistakes() {
    header('My mistakes', '#/practice');
    const qs = allQuestions().filter(q => S.wrong[q.key]);
    $app.innerHTML = qs.length ? `<a class="btn primary block" href="#/quiz/mistakes">Re-test all ${qs.length}</a>
        <p class="small muted" style="margin:0">A question leaves this list once you answer it correctly.</p>
        ${qs.map(q => `<div class="card"><div class="small muted">${esc(q.subj)}</div><b>${esc(q.q)}</b><div class="small" style="margin-top:6px">Answer: <b style="color:var(--green)">${esc(q.opts[q.ans])}</b> · ${esc(q.ex)}</div></div>`).join('')}`
        : `<div class="card">No mistakes saved. Take a quiz and any wrong answers will collect here for revision.</div>`;
}
function flash(sid, tid) {
    let cards;
    if (sid && tid && topic(sid, tid)) cards = topic(sid, tid).notes.map(n => ({ n, src: topic(sid, tid).title }));
    else cards = allTopics().flatMap(({ s, t }) => t.notes.map(n => ({ n, src: s.icon + ' ' + t.title })));
    cards = cards.concat(!sid ? S.log.map(l => ({ n: l.text, src: '📰 My log · ' + l.date })) : []);
    const st = flash.st && flash.st.key === location.hash ? flash.st : (flash.st = { key: location.hash, cards: shuffle(cards), i: 0, show: false });
    header('Flashcards', sid ? `#/topic/${sid}/${tid}` : '#/practice', `<span class="chip">${st.i + 1}/${st.cards.length}</span>`);
    const c = st.cards[st.i];
    // Front: the fact with its bold keywords hidden. Back: the full fact.
    const front = esc(c.n).replace(/\*\*(.+?)\*\*/g, '<strong>_____</strong>').replace(/\*(.+?)\*/g, '$1');
    const hasBlank = /\*\*/.test(c.n);
    $app.innerHTML = `
    <div class="card flash" id="fc"><div><div class="small muted" style="margin-bottom:10px">${esc(c.src)}</div><div>${st.show || !hasBlank ? md(c.n) : front}</div>${!st.show && hasBlank ? '<div class="small muted" style="margin-top:12px">Tap to reveal</div>' : ''}</div></div>
    <div class="row"><button class="btn" id="fp" ${st.i === 0 ? 'disabled' : ''}>‹ Prev</button><span class="spacer"></span><button class="btn ghost" id="fs">🔀 Shuffle</button><button class="btn primary" id="fn">Next ›</button></div>`;
    document.getElementById('fc').onclick = () => { st.show = !st.show; flash(sid, tid); };
    document.getElementById('fp').onclick = () => { st.i--; st.show = false; flash(sid, tid); };
    document.getElementById('fn').onclick = () => { st.i = (st.i + 1) % st.cards.length; st.show = false; flash(sid, tid); };
    document.getElementById('fs').onclick = () => { st.cards = shuffle(st.cards); st.i = 0; st.show = false; flash(sid, tid); };
}
function logView() {
    header('Current affairs log', '#/practice');
    $app.innerHTML = `
    <div class="card"><p class="small muted" style="margin-top:0">Save one-line facts from the news. Put the key word in **double stars** and it becomes a fill-in-the-blank flashcard.</p>
    <textarea id="lt" style="min-height:80px" placeholder="e.g. **Name** won the 2026 Jnanpith award"></textarea><button class="btn primary block" id="la" style="margin-top:8px">Save fact</button></div>
    <a class="btn" href="#/topic/current-affairs/how-to/videos">▶️ Current affairs videos</a>
    <div class="list">${S.log.slice().reverse().map(l => `<div class="card row"><div style="flex:1"><div class="small muted">${l.date}</div>${md(l.text)}</div><button class="btn ghost danger" data-d="${l.id}" aria-label="Delete">✕</button></div>`).join('') || '<p class="muted">No facts saved yet.</p>'}</div>`;
    document.getElementById('la').onclick = () => { const v = document.getElementById('lt').value.trim(); if (!v) return; S.log.push({ id: uid(), date: today(), text: v }); save(); logView(); toast('Saved'); };
    $app.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { S.log = S.log.filter(l => l.id !== b.dataset.d); save(); logView(); });
}

// ---------- Exams ----------
const CHECKS = [
    ['confirm', 'Confirmation submitted in Thulasi profile'],
    ['syllabus', 'Downloaded the syllabus for this category'],
    ['ticket', 'Admission ticket downloaded and printed'],
    ['id', 'Original ID proof ready'],
    ['centre', 'Checked the exam centre and travel route'],
    ['mock', 'Took at least 3 mock tests'],
    ['revise', 'Revised mistakes and flashcards'],
];
function headsUp(e) {
    const d = daysUntil(e.date), c = e.checks || {}, out = [];
    if (!c.confirm) out.push('Submit your confirmation in your Thulasi profile if this exam asks for one.');
    if (d <= 20 && !c.ticket) out.push('Admission tickets usually come out about 2 weeks before. Check your profile.');
    if (d <= 3 && !c.id) out.push('Keep your original ID proof with your admission ticket.');
    if (d <= 3 && !c.centre) out.push('Check where your centre is and how you will get there.');
    if (d <= 30 && !c.mock) out.push('Take a full mock test every day this month.');
    if (d > 30) out.push(`${Math.ceil((overall().n - overall().d) / Math.max(1, Math.floor(d / 7)))} topics a week will finish the syllabus in time.`);
    return out;
}
function exams() {
    header('Exam heads-up', null, fireChip());
    const up = S.exams.filter(e => daysUntil(e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date));
    const past = S.exams.filter(e => daysUntil(e.date) < 0).sort((a, b) => b.date.localeCompare(a.date));
    $app.innerHTML = `
    <a class="btn primary block" href="#/exam/new">+ Add an exam</a>
    ${up.length ? up.map(e => { const d = daysUntil(e.date), c = e.checks || {}, nd = CHECKS.filter(x => c[x[0]]).length; return `
        <div class="card ${e === up[0] ? 'hero' : ''}">
            <div class="row"><div style="flex:1"><b style="font-size:17px">${esc(e.name)}</b><div class="small muted">${fmtDate(e.date)}${e.cat ? ' · Cat. ' + esc(e.cat) : ''}</div></div><div style="text-align:right"><div class="big" style="font-size:34px">${d}</div><div class="small muted">${d === 0 ? 'today' : d === 1 ? 'day' : 'days'}</div></div></div>
            ${headsUp(e).map(h => `<div class="small" style="margin-top:6px">⚠️ ${esc(h)}</div>`).join('')}
            <div class="label" style="margin-top:12px">Checklist ${nd}/${CHECKS.length}</div>
            <div style="display:grid;gap:6px;margin-top:6px">${CHECKS.map(([k, l]) => `<label class="row small" style="cursor:pointer"><input type="checkbox" data-e="${e.id}" data-k="${k}" ${c[k] ? 'checked' : ''} style="width:20px;height:20px">${l}</label>`).join('')}</div>
            ${e.note ? `<p class="small" style="margin-bottom:0">📝 ${esc(e.note)}</p>` : ''}
            <div class="row" style="margin-top:10px"><a class="btn" href="#/exam/${e.id}">Edit</a><a class="btn ghost" href="#/quiz/mock">Mock test</a></div>
        </div>`; }).join('') : `<div class="card"><p style="margin:0">No upcoming exams added. Find your exam date in the monthly exam programme on keralapsc.gov.in and add it here.</p></div>`}
    <div class="card"><h2>Before every exam</h2><ul style="margin:0;padding-left:20px;display:grid;gap:6px">${EXAM_TIPS.map(t => `<li class="small">${esc(t)}</li>`).join('')}</ul>
    <div class="row wrap" style="margin-top:12px"><a class="btn" target="_blank" rel="noopener" href="https://www.keralapsc.gov.in/">Kerala PSC website</a><a class="btn" target="_blank" rel="noopener" href="https://thulasi.psc.kerala.gov.in/thulasi/">Thulasi login</a></div></div>
    ${past.length ? `<div class="card"><h2>Past exams</h2>${past.map(e => `<div class="row small" style="padding:6px 0;border-top:1px solid var(--line)"><span style="flex:1">${esc(e.name)}</span><span class="muted">${e.date}</span><a href="#/exam/${e.id}">Edit</a></div>`).join('')}</div>` : ''}`;
    $app.querySelectorAll('[data-e]').forEach(cb => cb.onchange = () => { const e = S.exams.find(x => x.id === cb.dataset.e); e.checks = e.checks || {}; e.checks[cb.dataset.k] = cb.checked; save(); exams(); });
}
function examEdit(id) {
    const e = id === 'new' ? { id: uid(), name: '', date: '', cat: '', note: '', checks: {} } : S.exams.find(x => x.id === id);
    if (!e) return exams();
    header(id === 'new' ? 'Add exam' : 'Edit exam', '#/exams');
    $app.innerHTML = `
    <div class="card" style="display:grid;gap:12px">
        <label class="field">Exam / post name<input type="text" id="en" value="${esc(e.name)}" placeholder="e.g. LDC Preliminary (10th level)"></label>
        <label class="field">Exam date<input type="date" id="ed" value="${esc(e.date)}"></label>
        <label class="field">Category number (optional)<input type="text" id="ec" value="${esc(e.cat)}" placeholder="e.g. 123/2026"></label>
        <label class="field">Note (optional)<input type="text" id="eo" value="${esc(e.note || '')}" placeholder="Centre, time, confirmation deadline…"></label>
        <button class="btn primary" id="es">Save</button>
        ${id !== 'new' ? `<button class="btn danger" id="ex">Delete exam</button>` : ''}
    </div>`;
    document.getElementById('es').onclick = () => {
        const name = document.getElementById('en').value.trim(), date = document.getElementById('ed').value;
        if (!name || !date) { toast('Add a name and a date'); return; }
        Object.assign(e, { name, date, cat: document.getElementById('ec').value.trim(), note: document.getElementById('eo').value.trim() });
        if (id === 'new') S.exams.push(e);
        save(); location.hash = '#/exams';
    };
    const del = document.getElementById('ex');
    if (del) del.onclick = () => { if (confirm('Delete this exam?')) { S.exams = S.exams.filter(x => x.id !== e.id); save(); location.hash = '#/exams'; } };
}

// ---------- Settings ----------
function settings() {
    header('Settings', '#/home');
    $app.innerHTML = `
    <div class="card"><h2>Back up your progress</h2><p class="small muted" style="margin-top:0">Everything is stored on this device only. Download a backup to move it to another phone.</p>
    <div class="row wrap"><button class="btn" id="exp">⬇ Download backup</button><label class="btn">⬆ Restore backup<input type="file" id="imp" accept="application/json" hidden></label></div></div>
    <div class="card"><h2>Reset</h2><button class="btn danger" id="rst">Erase all progress</button></div>
    <div class="card small muted">PSC Padanam · notes follow the common Kerala PSC preliminary syllabus. Always confirm dates and syllabus on the official site.</div>
    <a class="btn ghost" href="../index.html">‹ Back to Life RPG</a>`;
    document.getElementById('exp').onclick = () => {
        const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'psc-padanam-backup-' + today() + '.json'; a.click();
    };
    document.getElementById('imp').onchange = ev => {
        const f = ev.target.files[0]; if (!f) return;
        f.text().then(t => { S = Object.assign(blank(), JSON.parse(t)); save(); toast('Backup restored'); }).catch(() => toast('Could not read that file'));
    };
    document.getElementById('rst').onclick = () => { if (confirm('Erase all progress, videos, notes and exams?')) { S = blank(); save(); toast('Reset done'); location.hash = '#/home'; } };
}

route();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
