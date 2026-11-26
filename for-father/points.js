// Shared score for the In His Name pages. The main page owns the game state
// (localStorage "inHisName.v2"); sub-pages add or remove points through here.
const PTS_KEY = "inHisName.v2";

function readGame() {
  try { return JSON.parse(localStorage.getItem(PTS_KEY)) || {}; } catch { return {}; }
}

// Add n points (negative to take back). Returns the new total.
function awardPoints(n) {
  const g = readGame();
  g.points = Math.max(0, (g.points || 0) + n);
  try { localStorage.setItem(PTS_KEY, JSON.stringify(g)); } catch {}
  showPoints();
  return g.points;
}

function showPoints() {
  const el = document.getElementById("myPoints");
  if (el) el.textContent = (readGame().points || 0).toLocaleString() + " pts";
}

let ptsTimer;
function pointsToast(msg) {
  let t = document.getElementById("ptsToast");
  if (!t) {
    t = document.createElement("div");
    t.id = "ptsToast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(ptsTimer);
  ptsTimer = setTimeout(() => t.classList.remove("show"), 2000);
}

window.addEventListener("pageshow", showPoints);
window.addEventListener("storage", e => { if (e.key === PTS_KEY) showPoints(); });
