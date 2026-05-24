/* ═══════════════════════════════════════════
   VLTX — Theme System
   ═══════════════════════════════════════════ */

const PRESETS = [
  {
    id: "default",
    name: "Roxo Neon",
    sub: "Padrão",
    accent: "#bf00ff",
    accent2: "#7c3aed",
    dark: {
      bg: "#0a0010",
      surface: "#100020",
      surface2: "#1a003a",
      text: "#f8f5ff",
      muted: "#7a6a8a",
    },
    light: {
      bg: "#f5f0ff",
      surface: "#ffffff",
      surface2: "#ede5ff",
      text: "#1a0d2e",
      muted: "#7a6a8a",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    sub: "Azul profundo",
    accent: "#6366f1",
    accent2: "#22d3ee",
    dark: {
      bg: "#040814",
      surface: "#0c1220",
      surface2: "#131d30",
      text: "#e0eaff",
      muted: "#5a7080",
    },
    light: {
      bg: "#eef2ff",
      surface: "#ffffff",
      surface2: "#e0e7ff",
      text: "#1e1b4b",
      muted: "#6070a0",
    },
  },
  {
    id: "ember",
    name: "Ember",
    sub: "Fogo",
    accent: "#f97316",
    accent2: "#ef4444",
    dark: {
      bg: "#0f0802",
      surface: "#1a1008",
      surface2: "#241808",
      text: "#fff1e0",
      muted: "#8a6040",
    },
    light: {
      bg: "#fff7ed",
      surface: "#ffffff",
      surface2: "#ffedd5",
      text: "#431407",
      muted: "#8a5030",
    },
  },
  {
    id: "matrix",
    name: "Matrix",
    sub: "Terminal",
    accent: "#00ff41",
    accent2: "#00cc33",
    dark: {
      bg: "#000800",
      surface: "#001200",
      surface2: "#002000",
      text: "#ccffcc",
      muted: "#2a6a2a",
    },
    light: {
      bg: "#f0fff0",
      surface: "#ffffff",
      surface2: "#e0ffe0",
      text: "#002000",
      muted: "#2a6a2a",
    },
  },
  {
    id: "gold",
    name: "Ouro Negro",
    sub: "Luxo",
    accent: "#ffd700",
    accent2: "#ff8c00",
    dark: {
      bg: "#080600",
      surface: "#120e00",
      surface2: "#1a1400",
      text: "#fff8e0",
      muted: "#806040",
    },
    light: {
      bg: "#fffbeb",
      surface: "#ffffff",
      surface2: "#fef3c7",
      text: "#1c1000",
      muted: "#806040",
    },
  },
  {
    id: "mono",
    name: "Mono",
    sub: "Minimalista",
    accent: "#e0e0e0",
    accent2: "#a0a0a0",
    dark: {
      bg: "#080808",
      surface: "#111111",
      surface2: "#1a1a1a",
      text: "#f0f0f0",
      muted: "#666666",
    },
    light: {
      bg: "#f5f5f5",
      surface: "#ffffff",
      surface2: "#ebebeb",
      text: "#111111",
      muted: "#888888",
    },
  },
];

let curTheme = { presetId: "default", mode: "dark", custom: {} };

/* ── Panel open / close ──────────────────── */
function openTheme() {
  document.getElementById("overlay").classList.add("open");
}
function closeTheme() {
  document.getElementById("overlay").classList.remove("open");
}
function handleOverlay(e) {
  if (e.target === document.getElementById("overlay")) closeTheme();
}

/* ── Build preset buttons ────────────────── */
function buildPresetGrid() {
  const grid = document.getElementById("presetGrid");
  grid.innerHTML = "";
  PRESETS.forEach((p) => {
    const b = curTheme.mode === "dark" ? p.dark : p.light;
    const el = document.createElement("div");
    el.className = "preset-btn" + (curTheme.presetId === p.id ? " active" : "");
    el.style.background = b.surface;
    el.innerHTML = `
      <div class="preset-swatch">
        <span style="background:${p.accent}"></span>
        <span style="background:${p.accent2}"></span>
        <span style="background:${b.bg}"></span>
      </div>
      <div class="preset-name" style="color:${b.text}">${p.name}</div>
      <div class="preset-sub">${p.sub}</div>
      <div class="preset-check">✓</div>`;
    el.onclick = () => applyPreset(p.id);
    grid.appendChild(el);
  });
}

function applyPreset(id) {
  curTheme.presetId = id;
  curTheme.custom = {};
  applyTheme();
  buildPresetGrid();
  saveTheme();
}

/* ── Mode toggle ─────────────────────────── */
function setMode(m) {
  curTheme.mode = m;
  document.getElementById("modeDark").classList.toggle("active", m === "dark");
  document
    .getElementById("modeLight")
    .classList.toggle("active", m === "light");
  applyTheme();
  buildPresetGrid();
  saveTheme();
}

/* ── Apply theme vars to :root ───────────── */
function applyTheme() {
  const p = PRESETS.find((x) => x.id === curTheme.presetId) || PRESETS[0];
  const b = curTheme.mode === "dark" ? p.dark : p.light;
  const acc = curTheme.custom.accent || p.accent;
  const ac2 = curTheme.custom.accent2 || p.accent2;
  const bg = curTheme.custom.bg || b.bg;
  const txt = curTheme.custom.text || b.text;
  const rv = hexToRgb(acc);
  const rv2 = hexToRgb(ac2);

  const vars = {
    "--neon": acc,
    "--p300": acc,
    "--p400": acc,
    "--p200": lighten(acc, 0.3),
    "--neon2": ac2,
    "--p500": darken(acc, 0.2),
    "--p600": darken(acc, 0.4),
    "--p900": bg,
    "--p800": b.surface,
    "--p700": b.surface2,
    "--white": txt,
    "--muted": b.muted,
  };
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);

  /* Update bg glows */
  if (rv) {
    document.querySelector(".bg-glow").style.background = [
      `radial-gradient(ellipse 70% 50% at 15% 20%, rgba(${rv.r},${rv.g},${rv.b},0.18) 0%, transparent 60%)`,
      `radial-gradient(ellipse 60% 40% at 85% 80%, rgba(${rv.r},${rv.g},${rv.b},0.12) 0%, transparent 60%)`,
    ].join(",");
  }
  if (rv2) {
    document.querySelector(".bg-grid").style.backgroundImage = [
      `linear-gradient(rgba(${rv2.r},${rv2.g},${rv2.b},0.06) 1px, transparent 1px)`,
      `linear-gradient(90deg, rgba(${rv2.r},${rv2.g},${rv2.b},0.06) 1px, transparent 1px)`,
    ].join(",");
  }

  updatePickerUI("accent", acc);
  updatePickerUI("bg", bg);
  updatePickerUI("text", txt);
}

function applyCustomColor(key, val) {
  curTheme.custom[key] = val;
  curTheme.presetId = "custom";
  document
    .querySelectorAll(".preset-btn")
    .forEach((el) => el.classList.remove("active"));
  applyTheme();
  saveTheme();
}

function updatePickerUI(key, val) {
  const pv = document.getElementById("prev-" + key);
  const pk = document.getElementById("pick-" + key);
  const vl = document.getElementById("val-" + key);
  if (pv) pv.style.background = val;
  if (pk && /^#[0-9a-f]{6}$/i.test(val)) pk.value = val;
  if (vl) vl.textContent = val;
}

function resetTheme() {
  curTheme = { presetId: "default", mode: "dark", custom: {} };
  document.getElementById("modeDark").classList.add("active");
  document.getElementById("modeLight").classList.remove("active");
  applyTheme();
  buildPresetGrid();
  saveTheme();
  showToast("Tema restaurado!", "success");
}

function saveTheme() {
  try {
    localStorage.setItem("vltx_theme", JSON.stringify(curTheme));
  } catch (_) {}
}

function loadTheme() {
  try {
    const s = localStorage.getItem("vltx_theme");
    if (s) {
      const x = JSON.parse(s);
      curTheme = { ...curTheme, ...x };
    }
    if (curTheme.mode === "light") {
      document.getElementById("modeLight").classList.add("active");
      document.getElementById("modeDark").classList.remove("active");
    }
  } catch (_) {}
  applyTheme();
  buildPresetGrid();
}

/* ── Color math helpers ──────────────────── */
function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r
    ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) }
    : null;
}
function lighten(hex, amt) {
  const c = hexToRgb(hex);
  if (!c) return hex;
  return `rgb(${Math.min(255, (c.r + amt * 255) | 0)},${Math.min(255, (c.g + amt * 255) | 0)},${Math.min(255, (c.b + amt * 255) | 0)})`;
}
function darken(hex, amt) {
  const c = hexToRgb(hex);
  if (!c) return hex;
  return `rgb(${Math.max(0, (c.r - amt * 255) | 0)},${Math.max(0, (c.g - amt * 255) | 0)},${Math.max(0, (c.b - amt * 255) | 0)})`;
}

/* ── Toast (shared) ─────────────────────── */
function showToast(msg, type = "") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "show " + type;
  setTimeout(() => (t.className = ""), 3800);
}

/* ── Tab system (shared) ─────────────────── */
function switchTab(id, btn) {
  document
    .querySelectorAll(".tab-panel")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("tab-" + id).classList.add("active");
  btn.classList.add("active");
}

/* Init */
document.addEventListener("DOMContentLoaded", loadTheme);
