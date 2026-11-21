import "./style.css";
import { GLIMT, SITUASJONER, byNr, isKrise, matchesSituasjon } from "./data/glimt.ts";
import type { Glimt, Inngang, Nivaa, Oyne, Varighet } from "./data/parse.ts";
import { BILKJORING, HJELP, INTRO, VANLIG } from "./data/veiledning.ts";
import { store, type Tema } from "./store.ts";
import { bell, unlockAudio } from "./bell.ts";

const app = document.getElementById("app")!;
const TIDER: Varighet[] = ["10 sek", "1 min", "5 min"];
const SEKUNDER: Record<Varighet, number> = { "10 sek": 10, "1 min": 60, "5 min": 300 };

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- selection ----------

function pool(sit: string | null, tid: string | null): Glimt[] {
  return GLIMT.filter(
    (g) => (!sit || matchesSituasjon(g, sit)) && (!tid || g.varighet.includes(tid as Varighet)),
  );
}

function pickRandom(): Glimt | null {
  const { sit, tid } = store.filter;
  let p = pool(sit, tid);
  if (!p.length) return null;
  // Avoid repeating the most recent ones while the pool allows it.
  const recent = new Set(store.sett.slice(0, Math.min(10, p.length - 1)));
  const fresh = p.filter((g) => !recent.has(g.nr));
  if (fresh.length) p = fresh;
  return p[Math.floor(Math.random() * p.length)];
}

function dagensGlimt(): Glimt {
  const d = new Date();
  const key = d.getFullYear() * 1000 + Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 864e5);
  // Multiplicative hash so consecutive days don't give consecutive numbers.
  return GLIMT[(key * 2654435761) % GLIMT.length >>> 0] ?? GLIMT[0];
}

// ---------- shared pieces ----------

function header(back = true): string {
  return `<header class="top">
    ${back ? `<a class="back" href="#/" aria-label="Til forsiden">←</a>` : `<span></span>`}
    <a class="brand" href="#/">glimt</a>
    <a class="iconlink" href="#/alle" aria-label="Alle glimt">☰</a>
  </header>`;
}

function chips(g: Glimt): string {
  const sit = g.situasjon.map((s) => `<span class="chip">${esc(s.tag)}${s.note ? ` <em>(${esc(s.note)})</em>` : ""}</span>`);
  const rest = [g.oyneTekst, ...g.inngang, g.varighetTekst, g.nivaa].map((t) => `<span class="chip soft">${esc(t)}</span>`);
  return `<div class="chips">${sit.join("")}${rest.join("")}</div>`;
}

function hjelpBox(): string {
  return `<aside class="help" role="note">
    <h3>Trenger du noen å snakke med?</h3>
    <ul>${HJELP.map((h) => `<li><a href="tel:${h.nummer.replace(/\s/g, "")}"><strong>${esc(h.nummer)}</strong> ${esc(h.navn)}</a><span>${esc(h.info)}</span></li>`).join("")}</ul>
  </aside>`;
}

function bilBox(): string {
  return `<aside class="warn" role="note"><strong>Bilkjøring:</strong> ${esc(BILKJORING)}</aside>`;
}

function chipRow(name: string, values: readonly string[], selected: string | null, anyLabel: string): string {
  return `<div class="pick" data-group="${name}">
    <button class="pill ${selected === null ? "on" : ""}" data-v="">${anyLabel}</button>
    ${values.map((v) => `<button class="pill ${selected === v ? "on" : ""}" data-v="${esc(v)}">${esc(cap(v))}</button>`).join("")}
  </div>`;
}

const TEMA: [Tema, string][] = [["system", "System"], ["light", "Lys"], ["dark", "Mørk"]];

function applyTema(t: Tema): void {
  const root = document.documentElement;
  if (t === "system") delete root.dataset.theme;
  else root.dataset.theme = t;
  const light = "#f6f1e8";
  const dark = "#14161c";
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = t === "system" ? (m.media.includes("dark") ? dark : light) : t === "dark" ? dark : light;
  });
}

// ---------- views ----------

function viewHome(): void {
  const { sit, tid } = store.filter;
  const n = pool(sit, tid).length;
  const dag = dagensGlimt();
  app.innerHTML = `${header(false)}
  <main class="home">
    <p class="intro">${esc(INTRO)}</p>
    <section>
      <h2>Hvor er du nå?</h2>
      ${chipRow("sit", SITUASJONER, sit, "Hvor som helst")}
    </section>
    <section>
      <h2>Hvor lang tid har du?</h2>
      ${chipRow("tid", TIDER, tid, "Uansett")}
    </section>
    ${sit === "bilkjøring" ? bilBox() : ""}
    <button class="big" id="go" ${n ? "" : "disabled"}>Gi meg et glimt</button>
    <p class="count">${n ? `${n} glimt passer` : "Ingen glimt passer akkurat denne kombinasjonen"}</p>

    <a class="card today" href="#/g/${dag.nr}">
      <span class="label">Dagens glimt</span>
      <span class="title">${dag.nr}. ${esc(dag.tittel)}</span>
    </a>

    <nav class="links">
      <a href="#/alle">Alle glimt <span>${GLIMT.length}</span></a>
      <a href="#/alle?fav=1">Favoritter <span>${store.favoritter.size}</span></a>
      <a href="#/veiledning">Hvordan være til vanlig</a>
      <a href="#/hjelp" class="muted">Har du det tungt?</a>
    </nav>

    <section class="theme">
      <h2>Utseende</h2>
      <div class="pick" id="tema">
        ${TEMA.map(([v, l]) => `<button class="pill ${store.tema === v ? "on" : ""}" data-t="${v}">${l}</button>`).join("")}
      </div>
    </section>
  </main>`;

  document.getElementById("tema")!.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!b) return;
    store.setTema(b.dataset.t as Tema);
    applyTema(store.tema);
    viewHome();
  });

  app.querySelectorAll<HTMLElement>(".pick[data-group]").forEach((row) =>
    row.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("button");
      if (!b) return;
      const v = b.dataset.v || null;
      const f = { ...store.filter, [row.dataset.group!]: v };
      store.setFilter(f);
      viewHome();
    }),
  );
  document.getElementById("go")!.addEventListener("click", () => {
    unlockAudio();
    const g = pickRandom();
    if (g) location.hash = `#/g/${g.nr}?r=1`;
  });
}

let timer: { stop(): void } | null = null;

function viewGlimt(nr: number, fromRandom: boolean): void {
  const g = byNr(nr);
  if (!g) return viewNotFound();
  store.markSett(nr);
  const fav = store.favoritter.has(nr);
  const showBil = store.filter.sit === "bilkjøring" && g.situasjon.some((s) => s.tag === "bilkjøring");
  app.innerHTML = `${header()}
  <main class="glimt">
    ${showBil ? bilBox() : ""}
    <p class="nr">Glimt ${g.nr}${g.ny ? ` · <span class="new">ny</span>` : ""}</p>
    <h1>${esc(g.tittel)}</h1>
    <div class="text">${g.tekst.split("\n").map((p) => `<p>${esc(p)}</p>`).join("")}</div>
    ${isKrise(g) ? hjelpBox() : ""}
    ${chips(g)}

    <section class="timer" id="timer">
      <div class="timer-buttons">
        ${g.varighet.map((v) => `<button class="pill" data-s="${SEKUNDER[v]}">◷ ${v}</button>`).join("")}
      </div>
      <div class="ring hidden" id="ring">
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="track" cx="60" cy="60" r="54"/><circle class="arc" id="arc" cx="60" cy="60" r="54"/></svg>
        <span id="left"></span>
        <button class="link" id="stop">Avslutt</button>
      </div>
    </section>

    <div class="actions">
      <button class="icon ${fav ? "on" : ""}" id="fav" aria-pressed="${fav}" aria-label="Favoritt">${fav ? "★" : "☆"}</button>
      <button class="big" id="next">${fromRandom ? "Et nytt glimt" : "Tilfeldig glimt"}</button>
      <button class="icon" id="share" aria-label="Del">↗</button>
    </div>
    <nav class="prevnext">
      ${nr > 1 ? `<a href="#/g/${nr - 1}">← ${nr - 1}</a>` : "<span></span>"}
      ${nr < GLIMT.length ? `<a href="#/g/${nr + 1}">${nr + 1} →</a>` : "<span></span>"}
    </nav>
  </main>`;

  document.getElementById("fav")!.addEventListener("click", (e) => {
    const on = store.toggleFav(nr);
    const b = e.currentTarget as HTMLButtonElement;
    b.classList.toggle("on", on);
    b.textContent = on ? "★" : "☆";
    b.setAttribute("aria-pressed", String(on));
  });
  document.getElementById("next")!.addEventListener("click", () => {
    unlockAudio();
    const n = pickRandom();
    if (n) location.hash = `#/g/${n.nr}?r=1`;
  });
  document.getElementById("share")!.addEventListener("click", () => share(g));
  document.querySelectorAll<HTMLButtonElement>(".timer-buttons button").forEach((b) =>
    b.addEventListener("click", () => startTimer(Number(b.dataset.s))),
  );
  document.getElementById("stop")!.addEventListener("click", () => timer?.stop());
}

function startTimer(total: number): void {
  unlockAudio();
  timer?.stop();
  const ring = document.getElementById("ring")!;
  const buttons = document.querySelector<HTMLElement>(".timer-buttons")!;
  const arc = document.getElementById("arc") as unknown as SVGCircleElement;
  const left = document.getElementById("left")!;
  const C = 2 * Math.PI * 54;
  arc.style.strokeDasharray = `${C}`;
  ring.classList.remove("hidden");
  buttons.classList.add("hidden");
  let lock: WakeLockSentinel | null = null;
  navigator.wakeLock?.request("screen").then((l) => (lock = l), () => {});
  const start = performance.now();
  bell();
  let raf = 0;
  const tick = () => {
    const t = Math.min(1, (performance.now() - start) / (total * 1000));
    const s = Math.ceil(total * (1 - t));
    left.textContent = s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}`;
    arc.style.strokeDashoffset = `${C * t}`;
    if (t >= 1) {
      bell();
      left.textContent = "✓";
      stop(false);
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  const stop = (reset = true) => {
    cancelAnimationFrame(raf);
    void lock?.release().catch(() => {});
    timer = null;
    if (reset) {
      ring.classList.add("hidden");
      buttons.classList.remove("hidden");
    } else {
      setTimeout(() => {
        if (!document.body.contains(ring)) return;
        ring.classList.add("hidden");
        buttons.classList.remove("hidden");
      }, 4000);
    }
  };
  timer = { stop: () => stop(true) };
  tick();
}

async function share(g: Glimt): Promise<void> {
  const url = `${location.origin}/#/g/${g.nr}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: `Glimt: ${g.tittel}`, text: `${g.tittel}\n\n${g.tekst}`, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast("Lenke kopiert");
  } catch {
    /* user cancelled */
  }
}

function toast(msg: string): void {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 2000);
}

interface BrowseState {
  q: string;
  sit: string | null;
  inngang: Inngang | null;
  oyne: Oyne | null;
  tid: Varighet | null;
  nivaa: Nivaa | null;
  fav: boolean;
  ny: boolean;
}
const browse: BrowseState = { q: "", sit: null, inngang: null, oyne: null, tid: null, nivaa: null, fav: false, ny: false };

function browseMatches(g: Glimt): boolean {
  const b = browse;
  if (b.sit && !matchesSituasjon(g, b.sit)) return false;
  if (b.inngang && !g.inngang.includes(b.inngang)) return false;
  if (b.oyne && g.oyne !== b.oyne && g.oyne !== "begge") return false;
  if (b.tid && !g.varighet.includes(b.tid)) return false;
  if (b.nivaa && g.nivaa !== b.nivaa) return false;
  if (b.fav && !store.favoritter.has(g.nr)) return false;
  if (b.ny && !g.ny) return false;
  if (b.q) {
    const q = b.q.toLowerCase();
    const hay = `${g.nr} ${g.tittel} ${g.tekst} ${g.situasjon.map((s) => s.tag).join(" ")}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function viewAlle(params: URLSearchParams): void {
  if (params.get("fav") === "1") browse.fav = true;
  const select = (name: keyof BrowseState, label: string, values: readonly string[]) =>
    `<label class="sel"><span>${label}</span><select data-k="${name}">
      <option value="">Alle</option>
      ${values.map((v) => `<option value="${esc(v)}" ${browse[name] === v ? "selected" : ""}>${esc(cap(v))}</option>`).join("")}
    </select></label>`;

  app.innerHTML = `${header()}
  <main class="alle">
    <h1>Alle glimt</h1>
    <input type="search" id="q" placeholder="Søk i glimt" value="${esc(browse.q)}" autocomplete="off" />
    <div class="filters">
      ${select("sit", "Situasjon", [...SITUASJONER, "krise"])}
      ${select("inngang", "Inngang", ["syn", "lyd", "kropp", "tanke", "følelse"])}
      ${select("oyne", "Øyne", ["åpne", "lukkede"])}
      ${select("tid", "Varighet", TIDER)}
      ${select("nivaa", "Nivå", ["nybegynner", "erfaren"])}
    </div>
    <div class="toggles">
      <button class="pill ${browse.fav ? "on" : ""}" data-t="fav">★ Favoritter</button>
      <button class="pill ${browse.ny ? "on" : ""}" data-t="ny">Nye</button>
    </div>
    <div id="bil"></div>
    <p class="count" id="count"></p>
    <ol class="list" id="list"></ol>
  </main>`;

  const renderList = () => {
    const items = GLIMT.filter(browseMatches);
    document.getElementById("count")!.textContent = `${items.length} av ${GLIMT.length}`;
    document.getElementById("bil")!.innerHTML = browse.sit === "bilkjøring" ? bilBox() : "";
    document.getElementById("list")!.innerHTML = items.length
      ? items
          .map(
            (g) => `<li><a href="#/g/${g.nr}">
            <span class="n">${g.nr}</span>
            <span class="body"><span class="title">${esc(g.tittel)}${store.favoritter.has(g.nr) ? " <span class=\"star\">★</span>" : ""}</span>
            <span class="meta">${esc(g.varighetTekst)} · ${esc(g.inngang.join(", "))} · ${esc(g.nivaa)}</span></span>
          </a></li>`,
          )
          .join("")
      : `<li class="empty">Ingen glimt passer filteret.</li>`;
  };

  const q = document.getElementById("q") as HTMLInputElement;
  q.addEventListener("input", () => {
    browse.q = q.value.trim();
    renderList();
  });
  app.querySelectorAll<HTMLSelectElement>("select").forEach((s) =>
    s.addEventListener("change", () => {
      (browse as unknown as Record<string, string | null>)[s.dataset.k!] = s.value || null;
      renderList();
    }),
  );
  app.querySelectorAll<HTMLButtonElement>(".toggles button").forEach((b) =>
    b.addEventListener("click", () => {
      const k = b.dataset.t as "fav" | "ny";
      browse[k] = !browse[k];
      b.classList.toggle("on", browse[k]);
      renderList();
    }),
  );
  renderList();
}

function viewVeiledning(): void {
  app.innerHTML = `${header()}
  <main class="page">
    <h1>Hvordan være til vanlig</h1>
    <ol class="guide">${VANLIG.map((v) => `<li><h3>${esc(v.tittel)}</h3><p>${esc(v.tekst)}</p></li>`).join("")}</ol>
  </main>`;
}

function viewHjelp(): void {
  app.innerHTML = `${header()}
  <main class="page">
    <h1>Har du det tungt?</h1>
    <p>Du trenger ikke klare det alene. Ring noen du stoler på, eller en av disse:</p>
    ${hjelpBox()}
    <p><a href="#/g/40">Glimt 40: Når det er krise</a></p>
  </main>`;
}

function viewNotFound(): void {
  app.innerHTML = `${header()}<main class="page"><h1>Fant ikke glimtet</h1><p><a href="#/">Til forsiden</a></p></main>`;
}

// ---------- router ----------

function route(): void {
  timer?.stop();
  const [path, query = ""] = location.hash.replace(/^#/, "").split("?");
  const params = new URLSearchParams(query);
  const m = path.match(/^\/g\/(\d+)$/);
  if (m) viewGlimt(Number(m[1]), params.get("r") === "1");
  else if (path === "/alle") viewAlle(params);
  else if (path === "/veiledning") viewVeiledning();
  else if (path === "/hjelp") viewHjelp();
  else viewHome();
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
applyTema(store.tema);
route();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/sw.js"));
}
