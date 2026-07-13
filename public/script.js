import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getFirestore, collection, getDocs, doc, getDoc, updateDoc,
  query, orderBy, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const cfg = {
  apiKey: "AIzaSyAIqxYEo-flmj1KKz3f0x1CnKG8KoUMBrM",
  authDomain: "jowiland-2.firebaseapp.com",
  projectId: "jowiland-2",
  storageBucket: "jowiland-2.firebasestorage.app",
  messagingSenderId: "301719973403",
  appId: "1:301719973403:web:827b9a8df3e17ad74992be"
};

const app  = getApps().length ? getApp() : initializeApp(cfg);
const auth = getAuth(app);
const db   = getFirestore(app);

let currentUser = null;
let pinSession  = null;
let allMembers  = [];
let novedades   = [];
const MAX_PTS   = 7;

// ── AUTH STATE ───────────────────────────────────────────────
onAuthStateChanged(auth, async fbUser => {
  if (fbUser) {
    try {
      const snap = await getDoc(doc(db, "users", fbUser.uid));
      if (!snap.exists()) { await signOut(auth); return; }
      const data = snap.data();
      if (data.status === "inactive") { showErr("Tu cuenta está inactiva."); await signOut(auth); return; }
      currentUser = { uid: fbUser.uid, ...data };
      pinSession  = null;
      bootApp();
    } catch(e) { showErr("Error al cargar tu perfil: " + e.message); }
  } else if (!pinSession) {
    showLoginScreen();
  }
});

// ── LOGIN SWITCH ──────────────────────────────────────────────
window.switchLogin = (type) => {
  document.getElementById("form-pin").style.display   = type==="pin"   ? "block" : "none";
  document.getElementById("form-email").style.display = type==="email" ? "block" : "none";
  document.getElementById("tab-pin").classList.toggle("active",   type==="pin");
  document.getElementById("tab-email").classList.toggle("active", type==="email");
  document.getElementById("login-err").style.display = "none";
};

// ── LOGIN EMAIL ───────────────────────────────────────────────
window.loginWithEmail = async () => {
  const email = document.getElementById("em-email").value.trim();
  const pass  = document.getElementById("em-pass").value;
  const btn   = document.getElementById("btn-email");
  if (!email || !pass) return showErr("Completá los dos campos.");
  btn.disabled = true; btn.textContent = "Ingresando…";
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch(e) {
    showErr(friendlyErr(e.code));
    btn.disabled = false; btn.textContent = "Entrar";
  }
};
document.getElementById("em-pass").addEventListener("keydown", e => { if(e.key==="Enter") window.loginWithEmail(); });

// ── LOGIN PIN ─────────────────────────────────────────────────
window.loginWithPin = async () => {
  const nameRaw = document.getElementById("pin-name").value.trim();
  const pin     = document.getElementById("pin-code").value.trim();
  const btn     = document.getElementById("btn-pin");
  if (!nameRaw || !pin) return showErr("Ingresá tu nombre y PIN.");
  if (pin.length !== 4 || isNaN(pin)) return showErr("El PIN debe ser de 4 dígitos.");
  btn.disabled = true; btn.textContent = "Verificando…";
  try {
    const snap  = await getDocs(collection(db, "users"));
    const match = snap.docs.map(d => ({ uid: d.id, ...d.data() }))
      .find(u => u.role === "user" && u.pin === pin && (u.name||"").toLowerCase() === nameRaw.toLowerCase());
    if (!match)               { showErr("Nombre o PIN incorrecto."); btn.disabled=false; btn.textContent="Entrar"; return; }
    if (match.status==="inactive") { showErr("Tu cuenta está inactiva."); btn.disabled=false; btn.textContent="Entrar"; return; }
    currentUser = match;
    pinSession  = true;
    bootApp();
  } catch(e) {
    showErr("Error: " + e.message);
    btn.disabled = false; btn.textContent = "Entrar";
  }
};
document.getElementById("pin-code").addEventListener("keydown", e => { if(e.key==="Enter") window.loginWithPin(); });

// ── LOGOUT ────────────────────────────────────────────────────
window.doLogout = async () => {
  if (!pinSession) await signOut(auth);
  currentUser = null; pinSession = null; allMembers = []; novedades = [];
  showLoginScreen();
  ["pin-name","pin-code","em-email","em-pass"].forEach(id => { document.getElementById(id).value = ""; });
};

// ── BOOT ─────────────────────────────────────────────────────
async function bootApp() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app").style.display = "block";

  const name = currentUser.name || "—";
  const role = currentUser.role || "user";

  document.getElementById("uc-name").textContent   = name;
  document.getElementById("uc-role").textContent   = roleName(role);
  document.getElementById("uc-avatar").textContent = name.charAt(0).toUpperCase();
  document.getElementById("uc-avatar").className   = "uc-avatar av-" + role;

  await loadMembers();
  await loadNovedades();

  if (role === "user") {
    setupUserView();
  } else {
    setupStaffView();
  }
}

// ── CARGAR MIEMBROS ───────────────────────────────────────────
async function loadMembers() {
  try {
    const snap = await getDocs(query(collection(db, "users"), orderBy("points", "desc")));
    allMembers = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    const me = allMembers.find(u => u.uid === currentUser.uid);
    if (me) currentUser.points = me.points;
  } catch(e) { console.error("Error cargando miembros:", e); }
}

// ── CARGAR NOVEDADES ──────────────────────────────────────────
async function loadNovedades() {
  try {
    const snap = await getDocs(query(collection(db, "novedades"), orderBy("fecha", "desc")));
    novedades = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {
    // Si la colección no existe aún, no es error
    novedades = [];
  }
}

// ── REGISTRAR NOVEDAD (interno) ───────────────────────────────
async function logNovedad(texto) {
  try {
    await addDoc(collection(db, "novedades"), {
      texto,
      fecha: serverTimestamp(),
      autor: currentUser.name || "Sistema"
    });
    await loadNovedades();
    renderNovedades();
  } catch(e) { console.error("Error al registrar novedad:", e); }
}

// ══════════════════════════════════════════
// VISTA USUARIO
// ══════════════════════════════════════════
function setupUserView() {
  document.getElementById("stats-section").style.display = "none";
  document.getElementById("tabs-nav").style.display      = "none";
  document.querySelectorAll(".tab-content").forEach(el => { el.style.display="none"; el.classList.remove("active"); });

  const uv = document.getElementById("user-view");
  uv.style.display = "block";
  uv.classList.add("active");

  const pts = currentUser.points || 0;
  document.getElementById("my-pts-value").textContent = pts.toFixed(1);
  document.getElementById("my-pts-bar").style.width   = `${Math.min((pts/MAX_PTS)*100,100)}%`;
  document.getElementById("my-pts-bar").className     = "upc-bar " + ptBarClass(pts);
  document.getElementById("my-pts-state").innerHTML   = ptStateFull(pts);

  const ucPts = document.getElementById("uc-pts");
  ucPts.style.display = "block";
  ucPts.textContent   = `⭐ ${pts.toFixed(1)} puntos`;
}

// ══════════════════════════════════════════
// VISTA STAFF
// ══════════════════════════════════════════
function setupStaffView() {
  document.getElementById("stats-section").style.display = "";
  document.getElementById("tabs-nav").style.display      = "";

  // Activar primera pestaña
  document.querySelectorAll(".tab-content").forEach(el => { el.style.display="none"; el.classList.remove("active"); });
  document.getElementById("points-tab").style.display = "block";
  document.getElementById("points-tab").classList.add("active");
  document.querySelector(".tab").classList.add("active");

  renderStats();
  renderPointsTable();
  renderStaffTable();
  renderNovedades();
}

// ── STATS ─────────────────────────────────────────────────────
function renderStats() {
  // Stats solo sobre no-admins (los que tienen puntos relevantes)
  const staff = allMembers.filter(u => u.role !== "admin");
  const total  = staff.length;
  const pts    = staff.reduce((s,u) => s+(u.points||0), 0);
  document.getElementById("total-members").textContent = total;
  document.getElementById("avg-points").textContent    = total ? (pts/total).toFixed(1) : "0";
  document.getElementById("staff-at-risk").textContent = staff.filter(u => (u.points||0) <= 2).length;
  document.getElementById("staff-optimal").textContent = staff.filter(u => (u.points||0) >= 6).length;
  document.getElementById("total-points").textContent  = pts.toFixed(0);
}

// ── TABLA PUNTOS (sin admins) ─────────────────────────────────
function renderPointsTable() {
  const tb      = document.getElementById("pts-full-body");
  const role    = currentUser?.role;
  const canEdit = role === "admin" || role === "inspector";

  // Filtrar: nunca mostrar admins en la tabla de puntos
  const list = allMembers
    .filter(u => u.role !== "admin")
    .sort((a,b) => (b.points||0)-(a.points||0));

  // Header dinámico
  const thRow = document.getElementById("pts-thead-row");
  if (thRow) {
    thRow.innerHTML = canEdit
      ? "<th>#</th><th>Nombre</th><th>Puntos</th><th>Estado</th><th>Ajustar</th>"
      : "<th>#</th><th>Nombre</th><th>Puntos</th><th>Estado</th>";
  }

  if (!list.length) {
    tb.innerHTML = `<tr><td colspan="${canEdit?5:4}" class="t-empty">Sin miembros aún.</td></tr>`;
    return;
  }

  tb.innerHTML = list.map((u, i) => {
    const pts    = u.points || 0;
    const isMe   = u.uid === currentUser.uid;
    const adjust = canEdit ? `
      <td>
        <div class="adj-btns">
          <button class="adj-btn minus" onclick="adjPoints('${u.uid}',-1)">−</button>
          <span class="adj-val" id="av-${u.uid}">${pts.toFixed(1)}</span>
          <button class="adj-btn plus"  onclick="adjPoints('${u.uid}',+1)">+</button>
        </div>
      </td>` : "";
    return `
      <tr ${isMe ? 'class="my-row"' : ""}>
        <td class="rank-col">${i+1}</td>
        <td>
          <span class="member-av av-${u.role}">${(u.name||"?").charAt(0).toUpperCase()}</span>
          <b>${esc(u.name||"—")}</b>
          ${isMe ? '<span class="you-tag">tú</span>' : ""}
        </td>
        <td>
          <span class="pts-number" id="pn-${u.uid}" style="color:${ptColor(pts)}">${pts.toFixed(1)}</span>
          <div class="pts-mini-bar-wrap">
            <div class="pts-mini-bar ${ptBarClass(pts)}" id="pb-${u.uid}" style="width:${Math.min((pts/MAX_PTS)*100,100)}%"></div>
          </div>
        </td>
        <td id="ps-${u.uid}">${ptStateBadge(pts)}</td>
        ${adjust}
      </tr>`;
  }).join("");
}

// ── AJUSTAR PUNTOS ────────────────────────────────────────────
window.adjPoints = async (uid, delta) => {
  const role = currentUser?.role;
  if (role !== "admin" && role !== "inspector") return;

  const member = allMembers.find(u => u.uid === uid);
  if (!member) return;

  const oldVal = member.points || 0;
  const newVal = Math.round(Math.min(MAX_PTS, Math.max(0, oldVal + delta)) * 10) / 10;
  if (newVal === oldVal) return;

  member.points = newVal;
  updatePointCells(uid, newVal);

  try {
    await updateDoc(doc(db, "users", uid), { points: newVal });
    const accion = delta > 0 ? `sumó ${delta} punto(s)` : `restó ${Math.abs(delta)} punto(s)`;
    showToast(`${delta>0?"➕":"➖"} ${Math.abs(delta)} pt a ${member.name||"usuario"}`, "ok");
    // Registrar en novedades
    await logNovedad(`${member.name || "Un usuario"} ${accion} → ahora tiene ${newVal} pts`);
    renderStats();
  } catch(e) {
    member.points = oldVal;
    updatePointCells(uid, oldVal);
    showToast("Error al guardar: " + e.message, "err");
  }
};

function updatePointCells(uid, pts) {
  const pn = document.getElementById("pn-" + uid);
  const pb = document.getElementById("pb-" + uid);
  const ps = document.getElementById("ps-" + uid);
  const av = document.getElementById("av-" + uid);
  if (pn) { pn.textContent = pts.toFixed(1); pn.style.color = ptColor(pts); }
  if (pb) { pb.style.width = `${Math.min((pts/MAX_PTS)*100,100)}%`; pb.className = `pts-mini-bar ${ptBarClass(pts)}`; }
  if (ps) ps.innerHTML = ptStateBadge(pts);
  if (av) av.textContent = pts.toFixed(1);
}

// ── TABLA STAFF (con rango, cargos, estado) ───────────────────
function renderStaffTable() {
  const tb = document.getElementById("staff-full-body");
  if (!allMembers.length) {
    tb.innerHTML = '<tr><td colspan="4" class="t-empty">Sin miembros.</td></tr>';
    return;
  }
  tb.innerHTML = allMembers.map(u => {
    // Cargos: campo libre en Firestore (array o string), o el rol de la página si no existe
    const cargos = Array.isArray(u.cargos)
      ? u.cargos.map(c => `<span class="tag">${esc(c)}</span>`).join(" ")
      : u.cargos
        ? `<span class="tag">${esc(u.cargos)}</span>`
        : `<span style="color:var(--muted)">—</span>`;

    // Rango del servidor (campo separado del role de la página)
    const rango = u.rango || "—";

    return `
      <tr>
        <td><b>${esc(u.name||"—")}</b></td>
        <td><span class="rango-tag">${esc(rango)}</span></td>
        <td>${cargos}</td>
        <td>${statusBadge(u.status)}</td>
      </tr>`;
  }).join("");
}

// ── NOVEDADES ─────────────────────────────────────────────────
function renderNovedades() {
  const el = document.getElementById("novedades-list");
  if (!el) return;

  if (!novedades.length) {
    el.innerHTML = `
      <div class="novedad-empty">
        <div style="font-size:32px;margin-bottom:8px">📋</div>
        <div>No hay novedades registradas aún.</div>
        <div style="font-size:12px;margin-top:4px;color:var(--muted)">Los cambios de puntos y movimientos del staff aparecerán acá.</div>
      </div>`;
    return;
  }

  el.innerHTML = novedades.map(n => {
    const fecha = n.fecha?.toDate ? fmtFecha(n.fecha.toDate()) : "—";
    const icono = getNovedadIcon(n.texto||"");
    return `
      <div class="novedad-item">
        <div class="nov-icon">${icono}</div>
        <div class="nov-body">
          <div class="nov-texto">${esc(n.texto||"")}</div>
          <div class="nov-meta">${fecha}${n.autor ? ` · por ${esc(n.autor)}` : ""}</div>
        </div>
      </div>`;
  }).join("");
}

function getNovedadIcon(texto) {
  const t = texto.toLowerCase();
  if (t.includes("sumó") || t.includes("+"))      return "➕";
  if (t.includes("restó") || t.includes("−"))     return "➖";
  if (t.includes("eliminado") || t.includes("baj")) return "🗑️";
  if (t.includes("creado") || t.includes("nuevo")) return "✨";
  if (t.includes("inactivo") || t.includes("suspendido")) return "⏸️";
  if (t.includes("apelación"))                      return "📨";
  return "📌";
}

function fmtFecha(date) {
  return date.toLocaleString("es-AR", {
    day:"2-digit", month:"short", year:"numeric",
    hour:"2-digit", minute:"2-digit"
  });
}

// ── TABS ─────────────────────────────────────────────────────
window.switchTab = (id, btn) => {
  document.querySelectorAll(".tab-content").forEach(s => { s.classList.remove("active"); s.style.display="none"; });
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.getElementById(id).style.display = "block";
  document.getElementById(id).classList.add("active");
  btn.classList.add("active");
};

// ── TOAST ─────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type="ok") {
  const t = document.getElementById("toast");
  t.textContent    = msg;
  t.style.display  = "block";
  t.className      = "notification" + (type==="err" ? " notif-err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.add("hide");
    setTimeout(() => { t.style.display="none"; t.classList.remove("hide"); }, 300);
  }, 2800);
}

// ── UTILS ─────────────────────────────────────────────────────
function showLoginScreen() {
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("app").style.display = "none";
  const bp = document.getElementById("btn-pin");
  const be = document.getElementById("btn-email");
  if(bp){ bp.disabled=false; bp.textContent="Entrar"; }
  if(be){ be.disabled=false; be.textContent="Entrar"; }
}

function showErr(msg) {
  const el = document.getElementById("login-err");
  el.textContent = msg;
  el.style.display = "block";
}

function ptColor(p) {
  if (p === 0) return "#ff5c75";
  if (p <= 2)  return "#ff9f43";
  if (p <= 4)  return "#ffd166";
  if (p <= 6)  return "#4cc9f0";
  return "#57cc99";
}

function ptBarClass(p) {
  if (p === 0) return "bar-0";
  if (p <= 2)  return "bar-2";
  if (p <= 4)  return "bar-4";
  if (p <= 6)  return "bar-6";
  return "bar-7";
}

function ptStateBadge(p) {
  if (p === 0) return '<span class="pts-badge badge-0">Crítico</span>';
  if (p <= 2)  return '<span class="pts-badge badge-2">Riesgo alto</span>';
  if (p <= 4)  return '<span class="pts-badge badge-4">Seguimiento</span>';
  if (p <= 6)  return '<span class="pts-badge badge-6">Estable</span>';
  return '<span class="pts-badge badge-7">Óptimo</span>';
}

function ptStateFull(p) {
  const states = [
    { max:0, cls:"pts-badge badge-0", icon:"🚨", label:"Crítico",     desc:"Apelación abierta" },
    { max:2, cls:"pts-badge badge-2", icon:"⚠️",  label:"Riesgo alto", desc:"Aumentá tu actividad urgente" },
    { max:4, cls:"pts-badge badge-4", icon:"👀",  label:"Seguimiento", desc:"Mantené el ritmo activo" },
    { max:6, cls:"pts-badge badge-6", icon:"👍",  label:"Estable",     desc:"Vas bien" },
    { max:7, cls:"pts-badge badge-7", icon:"🌟",  label:"Óptimo",      desc:"Excelente desempeño" },
  ];
  const s = states.find(x => p <= x.max) || states[states.length-1];
  return `<span class="${s.cls}">${s.icon} ${s.label} — ${s.desc}</span>`;
}

function roleName(r) {
  return { admin:"Administrador", inspector:"Inspector", user:"Usuario" }[r] || r;
}

function roleBadge(r) {
  const cl = { admin:"rb-admin", inspector:"rb-inspector", user:"rb-user" };
  const lb = { admin:"Admin", inspector:"Inspector", user:"Usuario" };
  return `<span class="role-badge ${cl[r]||"rb-user"}">${lb[r]||r}</span>`;
}

function statusBadge(s) {
  return s==="inactive"
    ? '<span class="status-badge status-en-riesgo">Inactivo</span>'
    : '<span class="status-badge status-activo">Activo</span>';
}

function esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function friendlyErr(code) {
  const m = {
    "auth/wrong-password":"Contraseña incorrecta.",
    "auth/user-not-found":"No existe cuenta con ese email.",
    "auth/invalid-email":"Email inválido.",
    "auth/invalid-credential":"Email o contraseña incorrectos.",
    "auth/too-many-requests":"Demasiados intentos, esperá unos minutos.",
    "auth/network-request-failed":"Error de red.",
  };
  return m[code] || "Error al iniciar sesión.";
}