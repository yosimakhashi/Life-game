// SSC Edge app logic. Hash-routed single page; all progress lives in
// localStorage under one key so it can be exported and imported as JSON.

const KEY = 'ssc-edge-v1';
const $app = document.getElementById('app');
const $top = document.getElementById('top');
const REV_GAPS = [1, 3, 7, 21];           // spaced-revision intervals in days
const REASONS = {
    concept: { label: 'Concept gap', fix: 'Relearn the lesson, then redo its practice set.' },
    silly: { label: 'Silly mistake', fix: 'Slow down on this question type and re-read the question before marking.' },
    time: { label: 'Time pressure', fix: 'Do short timed drills of this topic until it fits the time budget.' },
    guess: { label: 'Guessed', fix: 'Only guess after eliminating at least one option (two in Tier 2).' }
};

// ---------- state ----------
function blank() {
    return {
        profile: { exam: 'cgl1', date: '', hours: 6, rating: { quant: 3, reason: 3, eng: 3, ga: 3 }, target: '' },
        done: {}, rev: {}, qs: {}, wrong: {}, mocks: [], tasks: {}, study: {}, active: {}, drills: []
    };
}
let S = blank();
try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    S = Object.assign(blank(), saved);
    S.profile = Object.assign(blank().profile, saved.profile || {});
} catch (e) { /* storage blocked: start fresh */ }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

// ---------- helpers ----------
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
function dayKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
const today = () => dayKey(new Date());
function addDays(key, n) { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n)); }
function daysUntil(key) {
    const [y, m, d] = key.split('-').map(Number);
    const n = new Date(); n.setHours(0, 0, 0, 0);
    return Math.round((new Date(y, m - 1, d) - n) / 86400000);
}
function fmtDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2400); }
const uid = () => Math.random().toString(36).slice(2, 9);
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const fmtSec = s => s < 60 ? Math.round(s) + 's' : Math.floor(s / 60) + 'm ' + String(Math.round(s % 60)).padStart(2, '0') + 's';

const SEC = Object.fromEntries(SECTIONS.map(s => [s.id, s]));
const lkey = (sid, lid) => sid + '/' + lid;
function lesson(sid, lid) { return SEC[sid] && SEC[sid].lessons.find(l => l.id === lid); }
function allLessons() { return SECTIONS.flatMap(s => s.lessons.map(l => ({ s, l }))); }
function allQuestions() {
    return SECTIONS.flatMap(s => s.lessons.flatMap(l => l.qs.map((q, i) => ({
        key: lkey(s.id, l.id) + '#' + i, sid: s.id, lid: l.id, q: q[0], o: q[1], a: q[2], e: q[3]
    }))));
}
const QMAP = Object.fromEntries(allQuestions().map(q => [q.key, q]));
const exam = () => EXAMS[S.profile.exam] || EXAMS.cgl1;
// Target seconds per question for a section, from the exam's time budget.
function targetSec(sid) { const e = exam(); return Math.round(e.budget[sid] * 60 / e.sections[sid]); }

function markActive() { S.active[today()] = true; }
function streak() {
    let n = 0, k = today();
    if (!S.active[k]) k = addDays(k, -1);
    while (S.active[k]) { n++; k = addDays(k, -1); }
    return n;
}
function addStudy(min) { const k = today(); S.study[k] = (S.study[k] || 0) + min; markActive(); save(); }

// Accuracy stats for a lesson or section from the per-question log.
function statsFor(filter) {
    let n = 0, ok = 0, t = 0;
    for (const [k, v] of Object.entries(S.qs)) {
        const q = QMAP[k]; if (!q || !filter(q)) continue;
        n += v.n; ok += v.ok; t += v.t;
    }
    return { n, ok, acc: n ? ok / n : null, avg: n ? t / n : null };
}
const lessonStats = (sid, lid) => statsFor(q => q.sid === sid && q.lid === lid);
const sectionStats = sid => statsFor(q => q.sid === sid);

// Readiness 0–100 per section: 40% lessons learned, 60% practice accuracy
// (falls back to the self-rating until there is practice data).
function readiness(sid) {
    const s = SEC[sid];
    const learned = s.lessons.filter(l => S.done[lkey(sid, l.id)]).length / s.lessons.length;
    const st = sectionStats(sid);
    const acc = st.n >= 4 ? st.acc : (S.profile.rating[sid] - 1) / 4 * 0.7;
    return Math.round((learned * 0.4 + acc * 0.6) * 100);
}
function weakestSection() { return SECTIONS.map(s => s.id).sort((a, b) => readiness(a) - readiness(b))[0]; }

// ---------- spaced revision ----------
function revDue() {
    const t = today();
    return Object.entries(S.rev).filter(([, r]) => r.due && r.due <= t).map(([k]) => k);
}
function learnLesson(sid, lid) {
    const k = lkey(sid, lid);
    S.done[k] = today();
    S.rev[k] = { stage: 0, due: addDays(today(), REV_GAPS[0]) };
    autoTask('lesson:' + k); markActive(); save();
}
function reviseLesson(k) {
    const r = S.rev[k] || { stage: 0 };
    const stage = r.stage + 1;
    S.rev[k] = stage >= REV_GAPS.length ? { stage, due: null } : { stage, due: addDays(today(), REV_GAPS[stage]) };
    autoTask('rev:' + k); markActive(); save();
}

// ---------- planning ----------
function phaseInfo() {
    const p = S.profile;
    if (!p.date) return null;
    const left = daysUntil(p.date);
    if (left < 0) return { left, name: 'Exam over', key: 'done' };
    // Phase split of the remaining days: foundation 45%, practice 35%, final 20%,
    // but the final phase is at least 14 days (or all of it if less remain).
    const final = Math.min(left, Math.max(14, Math.round(left * 0.2)));
    const practice = Math.min(left - final, Math.round(left * 0.35));
    const foundation = left - final - practice;
    const t = today();
    const phases = [
        { key: 'foundation', name: 'Foundation', days: foundation, from: t, to: addDays(t, foundation - 1), what: 'Finish every lesson. Sectional tests only. Build your short notes.' },
        { key: 'practice', name: 'Practice', days: practice, from: addDays(t, foundation), to: addDays(t, foundation + practice - 1), what: 'Timed drills on weak topics, 2–3 full mocks a week, previous-year papers.' },
        { key: 'final', name: 'Final sprint', days: final, from: addDays(t, foundation + practice), to: addDays(t, left - 1), what: 'One full mock a day with analysis. Revise only from your notes and Mistake Book.' }
    ].filter(ph => ph.days > 0);
    return { left, phases, key: phases[0] ? phases[0].key : 'final', name: phases[0] ? phases[0].name : 'Exam day' };
}
// Daily hours split, weighted towards weaker sections.
function hourSplit() {
    const base = { quant: 1.25, reason: 1, eng: 1, ga: 0.85 };
    const ph = phaseInfo();
    const mockShare = !ph ? 0 : ph.key === 'final' ? 0.35 : ph.key === 'practice' ? 0.2 : 0.05;
    const hours = Math.max(1, Number(S.profile.hours) || 6);
    const studyH = hours * (1 - mockShare);
    const w = {}; let sum = 0;
    for (const s of SECTIONS) { w[s.id] = base[s.id] * (6 - S.profile.rating[s.id] + (100 - readiness(s.id)) / 50); sum += w[s.id]; }
    const out = SECTIONS.map(s => ({ s, h: Math.round(studyH * w[s.id] / sum * 4) / 4 }));
    return { rows: out, mock: Math.round(hours * mockShare * 4) / 4, hours };
}

// ---------- today's mission ----------
function nextLesson(sid) { return SEC[sid].lessons.find(l => !S.done[lkey(sid, l.id)]); }
function buildTasks() {
    const list = [];
    const due = revDue().slice(0, 3);
    for (const k of due) {
        const [sid, lid] = k.split('/'); const l = lesson(sid, lid);
        if (l) list.push({ id: 'rev:' + k, text: 'Revise: ' + l.title, sub: 'Spaced revision, ~10 min', href: '#/lesson/' + sid + '/' + lid });
    }
    const order = SECTIONS.map(s => s.id).sort((a, b) => readiness(a) - readiness(b));
    let added = 0;
    for (const sid of order) {
        const l = nextLesson(sid); if (!l || added >= 2) continue;
        list.push({ id: 'lesson:' + lkey(sid, l.id), text: 'Learn: ' + l.title, sub: SEC[sid].short + ' · ' + l.time + ' min + practice', href: '#/lesson/' + sid + '/' + l.id });
        added++;
    }
    list.push({ id: 'drill', text: 'Timed drill: 15 weak-spot questions', sub: 'Aim for the target seconds per question', href: '#/drill' });
    list.push({ id: 'ga', text: '30 min current affairs from one source', sub: 'GA is memory: frequency beats length', href: null });
    if (Object.keys(S.wrong).length) list.push({ id: 'mistakes', text: 'Re-solve your Mistake Book', sub: Object.keys(S.wrong).length + ' questions waiting', href: '#/mistakes' });
    const ph = phaseInfo();
    const dow = new Date().getDay();
    if (ph && (ph.key === 'final' || (ph.key === 'practice' && [1, 3, 6].includes(dow))))
        list.push({ id: 'mock', text: 'Full mock + analysis', sub: 'Log it in the Mocks tab', href: '#/mocks' });
    else if (ph && ph.key === 'foundation' && dow === 0)
        list.push({ id: 'mock', text: 'Weekly sectional test', sub: 'One section, timed, then log it', href: '#/mocks' });
    return list;
}
function todayTasks() {
    const k = today();
    if (!S.tasks[k]) {
        S.tasks[k] = { list: buildTasks(), done: {} };
        // Keep only the last 30 days of task history.
        for (const d of Object.keys(S.tasks)) if (d < addDays(k, -30)) delete S.tasks[d];
        save();
    }
    return S.tasks[k];
}
function autoTask(id) { const t = S.tasks[today()]; if (t && t.list.some(x => x.id === id)) t.done[id] = true; }

// ---------- header ----------
function header(title, back, extra) {
    $top.innerHTML = `${back ? `<a class="back" href="${back}" aria-label="Back">‹</a>` : ''}<h1>${esc(title)}</h1>${extra || ''}<span class="chip" title="Study streak">🔥 ${streak()}</span><a class="chip" href="#/settings" aria-label="Settings">⚙︎</a>`;
}

// ---------- router ----------
let quiz = null;      // running quiz state
let timerInt = null;  // interval for quiz clock or focus timer
let focus = null;     // running focus session
function route() {
    clearInterval(timerInt); timerInt = null;
    const parts = (location.hash.slice(2) || 'home').split('/');
    const [view, a, b] = parts;
    const tab = { home: 'home', plan: 'plan', learn: 'learn', sec: 'learn', lesson: 'learn', tips: 'learn', pattern: 'learn', drill: 'drill', quiz: 'drill', result: 'drill', mistakes: 'drill', mocks: 'mocks', mockedit: 'mocks' }[view] || '';
    document.querySelectorAll('nav.tabbar a').forEach(x => x.classList.toggle('on', x.dataset.tab === tab));
    const views = { home, plan, learn, sec: () => sectionView(a), lesson: () => lessonView(a, b), tips, pattern, drill, quiz: quizView, result: resultView, mistakes, mocks, mockedit: () => mockEdit(a), settings };
    (views[view] || home)();
    window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
const go = h => { if (location.hash === h) route(); else location.hash = h; };

// ---------- home ----------
function home() {
    header('SSC Edge', '../');
    const ph = phaseInfo();
    const tasks = todayTasks();
    const doneN = tasks.list.filter(t => tasks.done[t.id]).length;
    const due = revDue();
    const tip = TIPS.flatMap(c => c.tips.map(t => ({ ...t, cat: c.cat, icon: c.icon })));
    const tod = tip[Math.floor(Date.now() / 86400000) % tip.length];
    $app.innerHTML = `
    <section class="card hero">
        ${ph ? `<div class="label">${esc(exam().name)} · ${esc(fmtDate(S.profile.date))}</div>
            <div class="row" style="align-items:flex-end;margin-top:6px"><div class="big">${Math.max(ph.left, 0)}</div><div class="muted" style="padding-bottom:4px">days left · <b style="color:var(--fg)">${esc(ph.name)}</b> phase</div></div>`
        : `<div class="label">Set up your plan</div><p style="margin:6px 0 12px">Tell SSC Edge which exam you're taking and when. It builds a phased plan, splits your daily hours by weakness and sets today's mission.</p><a class="btn primary" href="#/plan">Set exam & date</a>`}
    </section>

    <section class="card">
        <div class="row"><h2 style="margin:0">Today's mission</h2><span class="spacer"></span><span class="tag">${doneN}/${tasks.list.length}</span></div>
        <div class="bar green" style="margin:10px 0 12px"><i style="width:${pct(doneN, tasks.list.length)}%"></i></div>
        <div class="list">${tasks.list.map(t => `
            <div class="task">
                <button class="tick ${tasks.done[t.id] ? 'on' : ''}" data-task="${esc(t.id)}" aria-label="Toggle done">${tasks.done[t.id] ? '✓' : ''}</button>
                ${t.href ? `<a class="txt" href="${t.href}">` : '<div class="txt">'}<b class="${tasks.done[t.id] ? 'struck' : ''}">${esc(t.text)}</b><span class="small muted">${esc(t.sub)}</span>${t.href ? '</a>' : '</div>'}
            </div>`).join('')}
        </div>
    </section>

    ${due.length ? `<section class="card">
        <h2>Due for revision <span class="tag">${due.length}</span></h2>
        <p class="small muted" style="margin:0 0 10px">Revise on day 1, 3, 7 and 21 after learning. Open the lesson, recall it, then tap Revised.</p>
        <div class="list">${due.map(k => { const [sid, lid] = k.split('/'); const l = lesson(sid, lid); return l ? `<a class="item" href="#/lesson/${sid}/${lid}"><span class="ico">${SEC[sid].icon}</span><span class="txt"><b>${esc(l.title)}</b><span class="small muted">Revision ${(S.rev[k].stage || 0) + 1} of ${REV_GAPS.length}</span></span><span class="chev">›</span></a>` : ''; }).join('')}</div>
    </section>` : ''}

    <section class="card">
        <div class="row"><h2 style="margin:0">Readiness</h2></div>
        <p class="small muted" style="margin:4px 0 0">40% lessons learned + 60% practice accuracy (your self-rating until you have practised).</p>
        <div style="display:grid;gap:12px;margin-top:12px">${SECTIONS.map(s => { const r = readiness(s.id); const st = sectionStats(s.id); return `
            <div><div class="row small"><b>${s.icon} ${esc(s.short)}</b><span class="spacer"></span><span class="muted">${st.n ? pct(st.ok, st.n) + '% acc · ' + fmtSec(st.avg) + '/Q' : 'no practice yet'}</span><b style="width:42px;text-align:right">${r}</b></div>
            <div class="bar ${r >= 70 ? 'green' : r < 40 ? 'red' : ''}" style="margin-top:4px"><i style="width:${r}%"></i></div></div>`; }).join('')}
        </div>
        <p class="small muted" style="margin:12px 0 0">Weakest right now: <b style="color:var(--fg)">${esc(SEC[weakestSection()].name)}</b>. Today's mission leans towards it.</p>
    </section>

    <section class="card tipcard">
        <div class="label">${tod.icon} Tip of the day · ${esc(tod.cat)}</div>
        <h2 style="margin:6px 0">${esc(tod.t)}</h2>
        <p style="margin:0 0 8px">${md(tod.b)}</p>
        <p class="small" style="margin:0"><b>Do today:</b> ${md(tod.do)}</p>
    </section>

    <div class="grid2">
        <a class="btn" href="#/mistakes">❌ Mistake Book</a>
        <a class="btn" href="#/tips">💡 All tips</a>
        <a class="btn" href="#/pattern">📋 Exam patterns</a>
        <a class="btn" href="#/plan">⏱ Focus timer</a>
    </div>`;
    $app.querySelectorAll('[data-task]').forEach(b => b.onclick = () => {
        const id = b.dataset.task;
        tasks.done[id] = !tasks.done[id];
        if (tasks.done[id]) markActive();
        save(); home();
        if (tasks.list.every(t => tasks.done[t.id])) toast('Mission complete. That is how ranks are built. 🔥');
    });
}

// ---------- plan ----------
function plan() {
    header('Plan', '#/home');
    const p = S.profile; const ph = phaseInfo(); const split = hourSplit();
    const days = []; for (let i = 6; i >= 0; i--) days.push(addDays(today(), -i));
    const maxMin = Math.max(60, ...days.map(d => S.study[d] || 0));
    $app.innerHTML = `
    <section class="card">
        <h2>Your exam</h2>
        <div style="display:grid;gap:10px">
            <label class="field">Exam<select id="pExam">${Object.entries(EXAMS).map(([k, e]) => `<option value="${k}" ${k === p.exam ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label>
            <div class="grid2">
                <label class="field">Exam date<input type="date" id="pDate" value="${esc(p.date)}"></label>
                <label class="field">Study hours / day<input type="number" id="pHours" min="1" max="16" step="0.5" value="${esc(p.hours)}"></label>
            </div>
            <label class="field">Target score (cutoff + 10–15 margin)<input type="number" id="pTarget" min="0" placeholder="e.g. 160" value="${esc(p.target)}"></label>
            <div class="label" style="margin-top:4px">Rate yourself honestly (1 = weak, 5 = strong)</div>
            ${SECTIONS.map(s => `<div class="row"><span style="flex:1">${s.icon} ${esc(s.short)}</span><div class="seg" data-rate="${s.id}">${[1, 2, 3, 4, 5].map(n => `<button class="${p.rating[s.id] === n ? 'on' : ''}" data-n="${n}">${n}</button>`).join('')}</div></div>`).join('')}
            <button class="btn primary" id="pSave">Save & rebuild plan</button>
        </div>
    </section>

    ${ph && ph.phases ? `<section class="card">
        <h2>Your roadmap · ${ph.left} days</h2>
        <div class="phases">${ph.phases.map((x, i) => `
            <div class="phase ${i === 0 ? 'now' : ''}">
                <div class="row"><b>${i + 1}. ${esc(x.name)}</b><span class="spacer"></span><span class="tag">${x.days} days</span></div>
                <div class="small muted">${esc(fmtDate(x.from))} → ${esc(fmtDate(x.to))}</div>
                <div class="small" style="margin-top:4px">${esc(x.what)}</div>
            </div>`).join('')}
        </div>
    </section>` : ph ? `<section class="card"><p style="margin:0">Your exam date has passed. Set the next one above.</p></section>` : ''}

    <section class="card">
        <h2>Daily split · ${split.hours} h</h2>
        <p class="small muted" style="margin:0 0 10px">Weighted towards your weaker sections (self-rating + measured readiness). Quant gets a little extra because it is the slowest to build.</p>
        ${split.rows.map(r => `<div class="row" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>${r.s.icon} ${esc(r.s.short)}</span><span class="spacer"></span><b>${r.h} h</b></div>`).join('')}
        ${split.mock ? `<div class="row" style="padding:6px 0"><span>📊 Mocks & analysis</span><span class="spacer"></span><b>${split.mock} h</b></div>` : ''}
        <p class="small muted" style="margin:10px 0 0">Per-question time targets for ${esc(exam().name)}: ${SECTIONS.map(s => `${esc(s.short)} ${targetSec(s.id)}s`).join(' · ')}</p>
    </section>

    <section class="card">
        <h2>Focus timer</h2>
        <div class="timer" id="fClock">${focus ? '' : '50:00'}</div>
        <div class="row" style="justify-content:center;margin:10px 0">
            ${focus ? `<button class="btn danger" id="fStop">Stop & log</button>` : `<button class="btn primary" data-min="50">Deep 50</button><button class="btn" data-min="25">Sprint 25</button>`}
        </div>
        <p class="small muted" style="margin:0;text-align:center">Phone in another room. Logged minutes count towards your streak.</p>
    </section>

    <section class="card">
        <h2>Study minutes · last 7 days</h2>
        <div class="week">${days.map(d => { const m = S.study[d] || 0; return `<div><div class="col"><i style="height:${Math.round(m / maxMin * 100)}%"></i></div><span>${new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday: 'narrow' })}</span><b>${m || ''}</b></div>`; }).join('')}</div>
    </section>`;

    $app.querySelectorAll('.seg').forEach(seg => seg.querySelectorAll('button').forEach(b => b.onclick = () => {
        seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    }));
    document.getElementById('pSave').onclick = () => {
        p.exam = document.getElementById('pExam').value;
        p.date = document.getElementById('pDate').value;
        p.hours = Number(document.getElementById('pHours').value) || 6;
        p.target = document.getElementById('pTarget').value;
        $app.querySelectorAll('.seg').forEach(seg => { const on = seg.querySelector('.on'); if (on) p.rating[seg.dataset.rate] = Number(on.dataset.n); });
        delete S.tasks[today()];   // rebuild today's mission with the new plan
        save(); toast('Plan saved'); plan();
    };
    $app.querySelectorAll('[data-min]').forEach(b => b.onclick = () => { focus = { start: Date.now(), min: Number(b.dataset.min) }; plan(); });
    const stop = document.getElementById('fStop');
    if (stop) stop.onclick = () => endFocus(true);
    if (focus) {
        const tick = () => {
            const left = focus.min * 60 - (Date.now() - focus.start) / 1000;
            const el = document.getElementById('fClock'); if (!el) return;
            if (left <= 0) { endFocus(false); return; }
            el.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(Math.floor(left % 60)).padStart(2, '0');
        };
        tick(); timerInt = setInterval(tick, 500);
    }
}
function endFocus(early) {
    const mins = Math.min(focus.min, Math.round((Date.now() - focus.start) / 60000));
    focus = null; clearInterval(timerInt);
    if (mins > 0) addStudy(mins);
    toast(early ? `Logged ${mins} min` : `Session done: ${mins} min logged. Take a 10-minute break.`);
    if (!early && navigator.vibrate) navigator.vibrate([200, 100, 200]);
    if (location.hash.startsWith('#/plan')) plan();
}

// ---------- learn ----------
function learn() {
    header('Learn', '#/home');
    $app.innerHTML = `
    <div class="list">${SECTIONS.map(s => {
        const d = s.lessons.filter(l => S.done[lkey(s.id, l.id)]).length;
        return `<a class="item" href="#/sec/${s.id}"><span class="ico">${s.icon}</span><span class="txt"><b>${esc(s.name)}</b><span class="small muted">${d}/${s.lessons.length} lessons learned</span><div class="bar green" style="margin-top:6px"><i style="width:${pct(d, s.lessons.length)}%"></i></div></span><span class="chev">›</span></a>`;
    }).join('')}</div>
    <div class="grid2">
        <a class="item" href="#/tips"><span class="ico">💡</span><span class="txt"><b>Study tips</b><span class="small muted">${TIPS.reduce((n, c) => n + c.tips.length, 0)} strategies</span></span></a>
        <a class="item" href="#/pattern"><span class="ico">📋</span><span class="txt"><b>Exam patterns</b><span class="small muted">Marks & timing</span></span></a>
    </div>
    <section class="card small muted">How to use a lesson: read the concept, close the screen and recall the formulas, attempt the practice set, then tap <b>Mark as learned</b>. SSC Edge schedules revisions on day 1, 3, 7 and 21.</section>`;
}
function sectionView(sid) {
    const s = SEC[sid]; if (!s) return learn();
    header(s.short, '#/learn');
    $app.innerHTML = `<div class="list">${s.lessons.map(l => {
        const k = lkey(sid, l.id); const st = lessonStats(sid, l.id); const r = S.rev[k];
        const status = !S.done[k] ? 'Not started' : r && r.due === null ? 'Mastered ✓' : r ? `Revision ${r.stage + 1}/${REV_GAPS.length} due ${fmtDate(r.due)}` : 'Learned';
        return `<a class="item" href="#/lesson/${sid}/${l.id}"><span class="tick ${S.done[k] ? 'on' : ''}">${S.done[k] ? '✓' : ''}</span><span class="txt"><b>${esc(l.title)}</b><span class="small muted">${l.time} min · ${status}${st.n ? ' · ' + pct(st.ok, st.n) + '% acc' : ''}</span></span><span class="chev">›</span></a>`;
    }).join('')}</div>
    <button class="btn primary block" id="secDrill">Timed drill: all ${esc(s.short)} questions</button>`;
    document.getElementById('secDrill').onclick = () => startQuiz({ title: s.short + ' drill', items: shuffle(allQuestions().filter(q => q.sid === sid)).slice(0, 15), mode: 'exam', back: '#/sec/' + sid });
}
function lessonView(sid, lid) {
    const l = lesson(sid, lid); if (!l) return learn();
    const k = lkey(sid, lid); const st = lessonStats(sid, lid); const r = S.rev[k];
    const isDue = r && r.due && r.due <= today();
    header(SEC[sid].short, '#/sec/' + sid);
    $app.innerHTML = `
    <section class="card">
        <div class="label">${SEC[sid].icon} ${esc(SEC[sid].name)} · ${l.time} min</div>
        <h2 style="font-size:20px;margin:4px 0 0">${esc(l.title)}</h2>
        ${st.n ? `<p class="small muted" style="margin:6px 0 0">Your accuracy: <b style="color:var(--fg)">${pct(st.ok, st.n)}%</b> over ${st.n} answers · ${fmtSec(st.avg)} per question (target ${targetSec(sid)}s)</p>` : ''}
    </section>
    <section class="card notes"><h2>Core concepts</h2><ul>${l.concept.map(c => `<li>${md(c)}</li>`).join('')}</ul></section>
    <section class="card trick"><div class="label">⚡ Shortcut</div><p style="margin:6px 0 0">${md(l.trick)}</p></section>
    <section class="card">
        <h2>Worked example</h2>
        <p style="margin:0 0 10px">${md(l.example.q)}</p>
        <div id="steps" hidden><ol class="steps">${l.example.steps.map(x => `<li>${md(x)}</li>`).join('')}</ol></div>
        <button class="btn block" id="showSteps">Try it first, then show steps</button>
    </section>
    <section class="card notes trap"><h2>⚠️ Traps</h2><ul>${l.traps.map(c => `<li>${md(c)}</li>`).join('')}</ul></section>
    <button class="btn primary block" id="practice">Practise (${l.qs.length} questions, instant feedback)</button>
    ${!S.done[k] ? `<button class="btn block" id="learned">✓ Mark as learned & schedule revisions</button>`
        : isDue ? `<button class="btn block" id="revised">✓ Revised (recalled it without notes)</button>`
        : `<p class="small muted" style="text-align:center;margin:0">${r && r.due === null ? 'Mastered: all four revisions done.' : r ? `Next revision: ${fmtDate(r.due)}` : 'Learned'}</p>`}`;
    document.getElementById('showSteps').onclick = e => { document.getElementById('steps').hidden = false; e.target.remove(); };
    document.getElementById('practice').onclick = () => startQuiz({ title: l.title, items: l.qs.map((q, i) => QMAP[k + '#' + i]), mode: 'instant', back: '#/lesson/' + sid + '/' + lid });
    const lb = document.getElementById('learned'); if (lb) lb.onclick = () => { learnLesson(sid, lid); toast('Learned. First revision tomorrow.'); lessonView(sid, lid); };
    const rb = document.getElementById('revised'); if (rb) rb.onclick = () => { reviseLesson(k); toast('Revision logged'); lessonView(sid, lid); };
}
function tips() {
    header('Study tips', '#/learn');
    $app.innerHTML = TIPS.map(c => `
    <section class="card">
        <h2>${c.icon} ${esc(c.cat)}</h2>
        <div class="list">${c.tips.map(t => `<details class="tip"><summary>${esc(t.t)}</summary><p>${md(t.b)}</p><p class="small"><b>Do today:</b> ${md(t.do)}</p></details>`).join('')}</div>
    </section>`).join('');
}
function pattern() {
    header('Exam patterns', '#/learn');
    $app.innerHTML = Object.entries(EXAMS).map(([k, e]) => `
    <section class="card ${k === S.profile.exam ? 'hero' : ''}">
        <h2>${esc(e.name)} ${k === S.profile.exam ? '<span class="tag">your exam</span>' : ''}</h2>
        <p class="small" style="margin:0 0 10px">${esc(e.note)}</p>
        <table class="tbl"><tr><th>Section</th><th>Qs</th><th>Time budget</th><th>Per Q</th></tr>
        ${SECTIONS.map(s => `<tr><td>${s.icon} ${esc(s.short)}</td><td>${e.sections[s.id]}</td><td>${e.budget[s.id]} min</td><td>${Math.round(e.budget[s.id] * 60 / e.sections[s.id])}s</td></tr>`).join('')}
        </table>
    </section>`).join('') + `<p class="small muted" style="text-align:center">Patterns change. Always confirm with the latest official notice on ssc.gov.in. Time budgets are suggested splits, not official limits.</p>`;
}

// ---------- drill ----------
let drillCfg = { sec: 'all', pick: 'weak', n: 15, mode: 'exam' };
function drill() {
    header('Drill', '#/home');
    const last = S.drills.slice(-5).reverse();
    const seg = (name, opts) => `<div class="seg wide" data-cfg="${name}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(drillCfg[name]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    $app.innerHTML = `
    <section class="card">
        <h2>Build a drill</h2>
        <div style="display:grid;gap:12px">
            <div><div class="label">Section</div>${seg('sec', [['all', 'Mixed'], ...SECTIONS.map(s => [s.id, s.short])])}</div>
            <div><div class="label">Questions</div>${seg('pick', [['weak', 'Weak spots'], ['new', 'Unseen first'], ['random', 'Random']])}</div>
            <div><div class="label">Count</div>${seg('n', [[10, '10'], [15, '15'], [25, '25']])}</div>
            <div><div class="label">Mode</div>${seg('mode', [['exam', '⏱ Timed, exam-style'], ['instant', '💡 Instant feedback']])}</div>
            <button class="btn primary" id="go">Start drill</button>
        </div>
    </section>
    <section class="card small muted">Timed drills record your seconds per question. The result screen sorts every answer into <b>fast & right</b>, <b>slow & right</b>, <b>fast & wrong</b> and <b>slow & wrong</b> — four different problems with four different fixes.</section>
    <a class="item" href="#/mistakes"><span class="ico">❌</span><span class="txt"><b>Mistake Book</b><span class="small muted">${Object.keys(S.wrong).length} questions to re-solve</span></span><span class="chev">›</span></a>
    ${last.length ? `<section class="card"><h2>Recent drills</h2>${last.map(d => `<div class="row small" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>${esc(fmtDate(d.date))}</span><span class="muted" style="flex:1">${esc(d.title)}</span><b>${d.ok}/${d.n}</b><span class="muted">${fmtSec(d.avg)}/Q</span></div>`).join('')}</section>` : ''}`;
    $app.querySelectorAll('[data-cfg]').forEach(seg => seg.querySelectorAll('button').forEach(b => b.onclick = () => {
        drillCfg[seg.dataset.cfg] = isNaN(b.dataset.v) ? b.dataset.v : Number(b.dataset.v); drill();
    }));
    document.getElementById('go').onclick = () => {
        let pool = allQuestions().filter(q => drillCfg.sec === 'all' || q.sid === drillCfg.sec);
        if (drillCfg.pick === 'weak') {
            const score = q => S.wrong[q.key] ? -1 : S.qs[q.key] ? S.qs[q.key].ok / S.qs[q.key].n : 0.5;
            pool = shuffle(pool).sort((a, b) => score(a) - score(b));
        } else if (drillCfg.pick === 'new') {
            pool = shuffle(pool).sort((a, b) => (S.qs[a.key] ? S.qs[a.key].n : 0) - (S.qs[b.key] ? S.qs[b.key].n : 0));
        } else pool = shuffle(pool);
        const secName = drillCfg.sec === 'all' ? 'Mixed' : SEC[drillCfg.sec].short;
        startQuiz({ title: secName + ' · ' + { weak: 'weak spots', new: 'unseen', random: 'random' }[drillCfg.pick], items: shuffle(pool.slice(0, drillCfg.n)), mode: drillCfg.mode, back: '#/drill', task: 'drill' });
    };
}

// ---------- quiz engine ----------
function startQuiz(cfg) {
    if (!cfg.items.length) { toast('No questions to practise'); return; }
    const limit = cfg.items.reduce((n, q) => n + targetSec(q.sid), 0);
    quiz = { ...cfg, ans: cfg.items.map(() => null), times: cfg.items.map(() => 0), cur: 0, shown: false, qStart: Date.now(), began: Date.now(), limit };
    go('#/quiz');
}
function stampTime() { if (!quiz) return; quiz.times[quiz.cur] += (Date.now() - quiz.qStart) / 1000; quiz.qStart = Date.now(); }
function quizView() {
    if (!quiz) return go('#/drill');
    const q = quiz.items[quiz.cur]; const n = quiz.items.length; const sel = quiz.ans[quiz.cur];
    const instant = quiz.mode === 'instant'; const revealed = instant && sel !== null;
    header(quiz.title, null, quiz.mode === 'exam' ? `<span class="chip" id="clock">⏱</span>` : '');
    $app.innerHTML = `
    <section class="card">
        <div class="row small muted"><span>Q ${quiz.cur + 1} of ${n} · ${SEC[q.sid].icon} ${esc(SEC[q.sid].short)}</span><span class="spacer"></span><span id="qclock">target ${targetSec(q.sid)}s</span></div>
        <p class="q">${md(q.q)}</p>
        <div class="opts">${q.o.map((o, i) => {
            let cls = '';
            if (revealed) cls = i === q.a ? 'right' : i === sel ? 'wrong' : '';
            else if (sel === i) cls = 'sel';
            return `<button class="opt ${cls}" data-i="${i}" ${revealed ? 'disabled' : ''}><b>${'ABCD'[i]}.</b> ${md(o)}</button>`;
        }).join('')}</div>
        ${revealed ? `<div class="explain" style="margin-top:10px">${sel === q.a ? '✅ Correct. ' : '❌ '}${md(q.e)}</div>` : ''}
    </section>
    <div class="row">
        <button class="btn" id="prev" ${quiz.cur === 0 ? 'disabled' : ''}>‹ Prev</button>
        ${!instant && sel !== null ? '<button class="btn ghost" id="clear">Clear</button>' : ''}
        <span class="spacer"></span>
        ${quiz.cur < n - 1 ? `<button class="btn primary" id="next">${!instant && sel === null ? 'Skip ›' : 'Next ›'}</button>` : `<button class="btn primary" id="finish">Submit</button>`}
    </div>
    ${!instant ? `<div class="dots">${quiz.items.map((_, i) => `<button class="${quiz.ans[i] !== null ? 'ans' : ''} ${i === quiz.cur ? 'cur' : ''}" data-j="${i}">${i + 1}</button>`).join('')}</div>` : ''}
    <button class="btn ghost danger block" id="quit">Quit without saving</button>`;
    $app.querySelectorAll('.opt').forEach(b => b.onclick = () => { stampTime(); quiz.ans[quiz.cur] = Number(b.dataset.i); quizView(); });
    const nav = to => { stampTime(); quiz.cur = to; quizView(); };
    document.getElementById('prev').onclick = () => nav(quiz.cur - 1);
    const nx = document.getElementById('next'); if (nx) nx.onclick = () => nav(quiz.cur + 1);
    const cl = document.getElementById('clear'); if (cl) cl.onclick = () => { quiz.ans[quiz.cur] = null; quizView(); };
    const fin = document.getElementById('finish');
    if (fin) fin.onclick = () => { const un = quiz.ans.filter(a => a === null).length; if (!un || confirm(`${un} unanswered. Submit anyway?`)) finishQuiz(); };
    $app.querySelectorAll('[data-j]').forEach(b => b.onclick = () => nav(Number(b.dataset.j)));
    document.getElementById('quit').onclick = () => { if (confirm('Quit this drill? Nothing will be saved.')) { const back = quiz.back; quiz = null; go(back); } };
    clearInterval(timerInt);
    const tick = () => {
        if (!quiz) return;
        const onQ = quiz.times[quiz.cur] + (Date.now() - quiz.qStart) / 1000;
        const qc = document.getElementById('qclock');
        if (qc) { qc.textContent = `${Math.round(onQ)}s / ${targetSec(q.sid)}s`; qc.style.color = onQ > targetSec(q.sid) ? 'var(--red)' : ''; }
        const c = document.getElementById('clock');
        if (c) {
            const left = quiz.limit - (Date.now() - quiz.began) / 1000;
            if (left <= 0) { toast('Time up'); finishQuiz(); return; }
            c.textContent = '⏱ ' + Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');
            c.style.color = left < 60 ? 'var(--red)' : '';
        }
    };
    tick(); timerInt = setInterval(tick, 500);
}
function finishQuiz() {
    stampTime(); clearInterval(timerInt);
    let ok = 0;
    quiz.items.forEach((q, i) => {
        const a = quiz.ans[i]; if (a === null) return;
        const st = S.qs[q.key] || (S.qs[q.key] = { n: 0, ok: 0, t: 0 });
        st.n++; st.t += quiz.times[i];
        if (a === q.a) { st.ok++; ok++; delete S.wrong[q.key]; }
        else S.wrong[q.key] = { reason: (S.wrong[q.key] || {}).reason || '', at: today() };
    });
    const answered = quiz.ans.filter(a => a !== null).length;
    const total = quiz.times.reduce((a, b) => a + b, 0);
    quiz.result = { ok, answered, total };
    S.drills.push({ date: today(), title: quiz.title, n: quiz.items.length, ok, avg: answered ? total / answered : 0 });
    if (S.drills.length > 100) S.drills = S.drills.slice(-100);
    if (quiz.task) autoTask(quiz.task);
    if (quiz.fromMistakes) autoTask('mistakes');
    S.study[today()] = (S.study[today()] || 0) + Math.round(total / 60);
    markActive(); save();
    go('#/result');
}
function resultView() {
    if (!quiz || !quiz.result) return go('#/drill');
    header('Result', null);
    const { ok, answered } = quiz.result; const n = quiz.items.length;
    const e = exam();
    const marks = ok * e.plus - (answered - ok) * e.minus;
    const rows = quiz.items.map((q, i) => {
        const a = quiz.ans[i]; const t = quiz.times[i]; const fast = t <= targetSec(q.sid);
        const kind = a === null ? 'skip' : a === q.a ? (fast ? 'fr' : 'sr') : (fast ? 'fw' : 'sw');
        return { q, a, t, kind, i };
    });
    const count = k => rows.filter(r => r.kind === k).length;
    const quad = [
        ['fr', '⚡ Fast & right', 'Strength. Keep it warm with occasional drills.'],
        ['sr', '🐢 Slow & right', 'You know it, but too slowly. Drill the shortcut until it fits the target time.'],
        ['fw', '💥 Fast & wrong', 'Careless or overconfident. Re-read the question and check units before marking.'],
        ['sw', '🧱 Slow & wrong', 'Concept gap. Go back to the lesson before drilling again.']
    ];
    const wrongRows = rows.filter(r => r.kind === 'fw' || r.kind === 'sw');
    $app.innerHTML = `
    <section class="card hero" style="text-align:center">
        <div class="label">${esc(quiz.title)}</div>
        <div class="big" style="margin:8px 0">${ok}/${n}</div>
        <div class="muted">${pct(ok, answered)}% accuracy · ${fmtSec(answered ? quiz.result.total / answered : 0)} per question · ${marks.toFixed(2).replace(/\.00$/, '')} marks (${esc(e.name)} scheme)</div>
    </section>
    <section class="card">
        <h2>Fine-tune map</h2>
        <div class="quad">${quad.map(([k, l, tip]) => `<div class="qd ${k}"><b>${count(k)}</b><span>${l}</span><small>${tip}</small></div>`).join('')}</div>
        ${count('skip') ? `<p class="small muted" style="margin:10px 0 0">${count('skip')} skipped.</p>` : ''}
    </section>
    ${wrongRows.length ? `<section class="card">
        <h2>Why did you miss these?</h2>
        <p class="small muted" style="margin:0 0 10px">Tag each one. The Mistake Book turns your tags into a fix list.</p>
        <div class="list">${wrongRows.map(r => `
            <div class="wq">
                <p style="margin:0 0 6px"><b>${md(r.q.q)}</b></p>
                <p class="small" style="margin:0 0 4px">You: <span style="color:var(--red)">${md(r.q.o[r.a])}</span> · Answer: <span style="color:var(--green)">${md(r.q.o[r.q.a])}</span> · ${fmtSec(r.t)}</p>
                <p class="small muted" style="margin:0 0 8px">${md(r.q.e)}</p>
                <div class="seg wide" data-why="${esc(r.q.key)}">${Object.entries(REASONS).map(([k, v]) => `<button data-v="${k}" class="${(S.wrong[r.q.key] || {}).reason === k ? 'on' : ''}">${v.label}</button>`).join('')}</div>
            </div>`).join('')}</div>
    </section>` : ''}
    <section class="card"><h2>All answers</h2>${rows.map(r => `<div class="row small" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>${r.kind === 'skip' ? '⏭' : r.a === r.q.a ? '✅' : '❌'}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.q.q)}</span><span class="${r.t > targetSec(r.q.sid) ? 'bad' : 'muted'}">${fmtSec(r.t)}</span></div>`).join('')}</section>
    <div class="grid2"><a class="btn" href="${quiz.back}">Done</a><button class="btn primary" id="again">Retry wrong ones</button></div>`;
    $app.querySelectorAll('[data-why]').forEach(seg => seg.querySelectorAll('button').forEach(b => b.onclick = () => {
        const k = seg.dataset.why; S.wrong[k] = S.wrong[k] || { at: today() }; S.wrong[k].reason = b.dataset.v; save();
        seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    }));
    document.getElementById('again').onclick = () => {
        const items = rows.filter(r => r.kind !== 'fr' && r.kind !== 'sr').map(r => r.q);
        if (!items.length) { toast('Nothing wrong to retry. 🎯'); return; }
        startQuiz({ title: 'Retry', items, mode: 'instant', back: quiz.back });
    };
}
function mistakes() {
    header('Mistake Book', '#/drill');
    const keys = Object.keys(S.wrong).filter(k => QMAP[k]);
    const by = {}; keys.forEach(k => { const r = S.wrong[k].reason || 'untagged'; by[r] = (by[r] || 0) + 1; });
    const top = Object.entries(by).filter(([r]) => r !== 'untagged').sort((a, b) => b[1] - a[1])[0];
    $app.innerHTML = !keys.length ? `<section class="card" style="text-align:center"><div class="big">🎯</div><p>No open mistakes. Every question you get wrong lands here until you answer it right.</p><a class="btn primary" href="#/drill">Start a drill</a></section>` : `
    <section class="card">
        <h2>Why you lose marks</h2>
        <div class="quad">${Object.entries(REASONS).map(([k, v]) => `<div class="qd"><b>${by[k] || 0}</b><span>${v.label}</span></div>`).join('')}</div>
        ${by.untagged ? `<p class="small muted" style="margin:10px 0 0">${by.untagged} untagged — tag them below.</p>` : ''}
        ${top ? `<div class="explain" style="margin-top:10px"><b>Biggest leak: ${REASONS[top[0]].label}.</b> ${REASONS[top[0]].fix}</div>` : ''}
    </section>
    <button class="btn primary block" id="redo">Re-solve all ${keys.length} (instant feedback)</button>
    <div class="list">${keys.map(k => { const q = QMAP[k]; return `
        <div class="wq">
            <div class="small muted">${SEC[q.sid].icon} ${esc(lesson(q.sid, q.lid).title)} · ${esc(fmtDate(S.wrong[k].at))}</div>
            <p style="margin:4px 0 6px"><b>${md(q.q)}</b></p>
            <details><summary class="small">Show answer</summary><p class="small" style="margin:6px 0"><span style="color:var(--green)">${md(q.o[q.a])}</span> — ${md(q.e)}</p></details>
            <div class="seg wide" data-why="${esc(k)}" style="margin-top:8px">${Object.entries(REASONS).map(([r, v]) => `<button data-v="${r}" class="${S.wrong[k].reason === r ? 'on' : ''}">${v.label}</button>`).join('')}</div>
        </div>`; }).join('')}</div>`;
    $app.querySelectorAll('[data-why]').forEach(seg => seg.querySelectorAll('button').forEach(b => b.onclick = () => { S.wrong[seg.dataset.why].reason = b.dataset.v; save(); mistakes(); }));
    const rd = document.getElementById('redo');
    if (rd) rd.onclick = () => startQuiz({ title: 'Mistake Book', items: shuffle(keys.map(k => QMAP[k])), mode: 'instant', back: '#/mistakes', fromMistakes: true });
}

// ---------- mocks ----------
function mockScore(m) {
    const e = EXAMS[m.exam] || EXAMS.cgl1;
    let score = 0, max = 0, right = 0, wrong = 0;
    for (const s of SECTIONS) {
        const x = m.sec[s.id] || { r: 0, w: 0 };
        score += x.r * e.plus - x.w * e.minus; max += e.sections[s.id] * e.plus; right += x.r; wrong += x.w;
    }
    return { score, max, right, wrong, att: right + wrong, acc: right + wrong ? right / (right + wrong) : 0 };
}
function mockInsights(list) {
    const out = [];
    if (!list.length) return out;
    const last = list[list.length - 1]; const e = EXAMS[last.exam] || EXAMS.cgl1;
    const secs = SECTIONS.map(s => {
        const x = last.sec[s.id] || { r: 0, w: 0 }; const att = x.r + x.w; const tot = e.sections[s.id];
        return { s, att, acc: att ? x.r / att : 0, cov: att / tot, sc: (x.r * e.plus - x.w * e.minus) / (tot * e.plus) };
    });
    const weak = secs.slice().sort((a, b) => a.sc - b.sc)[0];
    out.push(`🎯 Weakest section in your last mock: <b>${esc(weak.s.name)}</b> (${Math.round(weak.sc * 100)}% of its marks). Give it the first study block every day this week.`);
    for (const x of secs) {
        if (x.att >= 5 && x.acc < 0.8) out.push(`⚠️ <b>${esc(x.s.short)}</b>: ${Math.round(x.acc * 100)}% accuracy on ${x.att} attempts. You're over-attempting — negative marks are eating your score. Skip questions you can't narrow down.`);
        else if (x.acc >= 0.9 && x.cov < 0.7) out.push(`🐢 <b>${esc(x.s.short)}</b>: ${Math.round(x.acc * 100)}% accuracy but only ${x.att} of ${e.sections[x.s.id]} attempted. Speed is your bottleneck — do timed drills.`);
    }
    if (list.length >= 4) {
        const sc = list.map(m => { const r = mockScore(m); return r.score / r.max; });
        const recent = sc.slice(-2).reduce((a, b) => a + b) / 2; const prev = sc.slice(-4, -2).reduce((a, b) => a + b) / 2;
        const d = Math.round((recent - prev) * 100);
        out.push(d > 1 ? `📈 Up ${d} points (as % of max) over your last two mocks. Whatever you changed, keep doing it.` : d < -1 ? `📉 Down ${-d} points over your last two mocks. Check whether you've cut revision time or are taking mocks without analysing them.` : `➖ Your score is flat over the last four mocks. Change something: more analysis, a different section order, or a weak-topic sprint.`);
    }
    const target = Number(S.profile.target);
    if (target) { const r = mockScore(last); out.push(r.score >= target ? `✅ Last mock (${r.score}) cleared your target of ${target}. Now make it consistent.` : `🏁 ${(target - r.score).toFixed(1).replace(/\.0$/, '')} marks short of your target ${target}. Usually the fastest gain is cutting wrong answers in your lowest-accuracy section.`); }
    return out;
}
function mocks() {
    header('Mocks', '#/home');
    const list = S.mocks.slice().sort((a, b) => a.date.localeCompare(b.date));
    const pts = list.slice(-12).map(m => { const r = mockScore(m); return r.score / r.max; });
    const W = 300, H = 110;
    const xy = pts.map((p, i) => [pts.length === 1 ? W / 2 : 10 + i * (W - 20) / (pts.length - 1), H - 10 - p * (H - 20)]);
    const tgt = Number(S.profile.target);
    const tgtY = tgt ? H - 10 - Math.min(1, tgt / mockScore({ exam: S.profile.exam, sec: {} }).max) * (H - 20) : null;
    $app.innerHTML = `
    <a class="btn primary block" href="#/mockedit/new">+ Log a mock test</a>
    ${list.length ? `
    <section class="card">
        <h2>Score trend <span class="small muted">(% of max)</span></h2>
        <svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Mock score trend">
            ${[0.25, 0.5, 0.75].map(g => `<line x1="0" x2="${W}" y1="${H - 10 - g * (H - 20)}" y2="${H - 10 - g * (H - 20)}" class="grid"/>`).join('')}
            ${tgtY !== null && tgtY > 0 && tgtY < H ? `<line x1="0" x2="${W}" y1="${tgtY}" y2="${tgtY}" class="tgt"/>` : ''}
            <polyline points="${xy.map(p => p.join(',')).join(' ')}" class="line"/>
            ${xy.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4" class="pt"/>`).join('')}
        </svg>
        ${tgtY !== null ? '<p class="small muted" style="margin:4px 0 0">Dashed line: your target score.</p>' : ''}
    </section>
    <section class="card"><h2>Insights</h2><div class="list">${mockInsights(list).map(t => `<div class="explain">${t}</div>`).join('')}</div></section>
    <section class="card"><h2>History</h2>${list.slice().reverse().map(m => { const r = mockScore(m); return `
        <a class="row" href="#/mockedit/${m.id}" style="padding:8px 0;border-bottom:1px solid var(--line);text-decoration:none">
            <span style="flex:1"><b>${esc(m.name || (EXAMS[m.exam] || {}).name || 'Mock')}</b><br><span class="small muted">${esc(fmtDate(m.date))} · ${r.att} attempted · ${Math.round(r.acc * 100)}% acc</span></span>
            <b>${+r.score.toFixed(2)}</b><span class="muted small">/${r.max}</span>
        </a>`; }).join('')}</section>`
    : `<section class="card"><p style="margin:0">Log every full mock or sectional test here — right and wrong per section. SSC Edge scores it with the right marking scheme, tracks your trend, and tells you whether accuracy or speed is costing you marks.</p></section>`}`;
}
function mockEdit(id) {
    const m = id === 'new' ? { id: uid(), date: today(), exam: S.profile.exam, name: '', sec: {} } : S.mocks.find(x => x.id === id);
    if (!m) return mocks();
    header(id === 'new' ? 'Log mock' : 'Edit mock', '#/mocks');
    const e = EXAMS[m.exam] || EXAMS.cgl1;
    $app.innerHTML = `
    <section class="card" style="display:grid;gap:10px">
        <label class="field">Name (optional)<input type="text" id="mName" value="${esc(m.name)}" placeholder="e.g. Testbook Mock 12"></label>
        <div class="grid2">
            <label class="field">Date<input type="date" id="mDate" value="${esc(m.date)}"></label>
            <label class="field">Pattern<select id="mExam">${Object.entries(EXAMS).map(([k, x]) => `<option value="${k}" ${k === m.exam ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
        </div>
        <table class="tbl"><tr><th>Section</th><th>Right</th><th>Wrong</th><th>of</th></tr>
        ${SECTIONS.map(s => { const x = m.sec[s.id] || {}; return `<tr><td>${s.icon} ${esc(s.short)}</td><td><input type="number" min="0" max="${e.sections[s.id]}" data-r="${s.id}" value="${x.r ?? ''}" inputmode="numeric"></td><td><input type="number" min="0" max="${e.sections[s.id]}" data-w="${s.id}" value="${x.w ?? ''}" inputmode="numeric"></td><td class="muted">${e.sections[s.id]}</td></tr>`; }).join('')}
        </table>
        <div class="explain" id="mLive"></div>
        <button class="btn primary" id="mSave">Save</button>
        ${id !== 'new' ? '<button class="btn ghost danger" id="mDel">Delete</button>' : ''}
    </section>`;
    const read = () => {
        const sec = {};
        for (const s of SECTIONS) sec[s.id] = { r: Math.max(0, Number($app.querySelector(`[data-r="${s.id}"]`).value) || 0), w: Math.max(0, Number($app.querySelector(`[data-w="${s.id}"]`).value) || 0) };
        return { ...m, name: document.getElementById('mName').value.trim(), date: document.getElementById('mDate').value || today(), exam: document.getElementById('mExam').value, sec };
    };
    const live = () => { const r = mockScore(read()); document.getElementById('mLive').innerHTML = `Score <b>${+r.score.toFixed(2)}</b> / ${r.max} · ${r.att} attempted · ${Math.round(r.acc * 100)}% accuracy`; };
    $app.querySelectorAll('input').forEach(i => i.oninput = live); live();
    document.getElementById('mExam').onchange = () => { Object.assign(m, read()); mockEdit(id); };
    document.getElementById('mSave').onclick = () => {
        const x = read(); const ex = EXAMS[x.exam];
        const bad = SECTIONS.find(s => x.sec[s.id].r + x.sec[s.id].w > ex.sections[s.id]);
        if (bad) { toast(`${bad.short}: right + wrong is more than ${ex.sections[bad.id]}`); return; }
        S.mocks = S.mocks.filter(y => y.id !== x.id).concat(x);
        if (x.date === today()) autoTask('mock');
        markActive(); save(); toast('Mock saved'); go('#/mocks');
    };
    const del = document.getElementById('mDel');
    if (del) del.onclick = () => { if (confirm('Delete this mock?')) { S.mocks = S.mocks.filter(y => y.id !== m.id); save(); go('#/mocks'); } };
}

// ---------- settings ----------
function settings() {
    header('Settings', '#/home');
    $app.innerHTML = `
    <section class="card">
        <h2>Backup</h2>
        <p class="small muted" style="margin:0 0 10px">Your progress is stored only in this browser. Export it now and then, especially before clearing browser data or switching phones.</p>
        <div class="grid2"><button class="btn" id="exp">⬇ Export</button><label class="btn">⬆ Import<input type="file" id="imp" accept="application/json" hidden></label></div>
    </section>
    <section class="card">
        <h2>Reset</h2>
        <button class="btn danger block" id="reset">Erase all progress</button>
    </section>
    <p class="small muted" style="text-align:center">SSC Edge works offline once loaded. Add it to your home screen from the browser menu.</p>`;
    document.getElementById('exp').onclick = () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }));
        a.download = 'ssc-edge-' + today() + '.json'; a.click();
    };
    document.getElementById('imp').onchange = ev => {
        const f = ev.target.files[0]; if (!f) return;
        f.text().then(t => { const d = JSON.parse(t); S = Object.assign(blank(), d); S.profile = Object.assign(blank().profile, d.profile || {}); save(); toast('Imported'); go('#/home'); }).catch(() => toast('That file could not be read'));
    };
    document.getElementById('reset').onclick = () => { if (confirm('Erase all progress? This cannot be undone.')) { S = blank(); save(); go('#/home'); } };
}

route();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
