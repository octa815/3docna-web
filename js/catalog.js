/* 3DOCNA — catálogo
   Lee data/productos.json y pinta las tarjetas. Para añadir productos no se toca este archivo:
   se edita el JSON (instrucciones en img/README.md). */
import { $, $$, euros, addToCart, reveal } from "./app.js";

const DATA_URL = "/data/productos.json";

// Dibujos de relleno mientras no haya foto (usan var(--neon) y var(--neon2))
const ICONS = {
  litofania:
    '<rect x="40" y="28" width="80" height="86" rx="3" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
    '<rect x="50" y="38" width="60" height="66" rx="2" fill="var(--neon)" opacity="0.08"/>' +
    '<circle cx="80" cy="62" r="14" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
    '<path d="M56 100c6-16 16-22 24-22s18 6 24 22" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
    '<path d="M22 60h10M22 72h10M128 60h10M128 72h10" stroke="var(--neon)" stroke-width="2" opacity="0.5"/>' +
    '<text x="80" y="142" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">TU FOTO</text>',
  generico:
    '<rect x="40" y="46" width="80" height="68" rx="4" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
    '<path d="M40 92l22-20 18 16 14-12 26 22" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
    '<circle cx="64" cy="66" r="7" fill="var(--neon)" opacity="0.5"/>' +
    '<text x="80" y="140" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">3DOCNA</text>',
  copo:
    '<g fill="none" stroke="var(--neon)" stroke-width="2.5" stroke-linecap="round">' +
    [0, 60, 120, 180, 240, 300].map((a) => `<g transform="rotate(${a} 80 74)"><path d="M80 74V30M80 46l-9-9M80 46l9-9M80 58l-12-8M80 58l12-8"/></g>`).join("") +
    '</g><circle cx="80" cy="74" r="13" fill="var(--paper-2)" stroke="var(--neon2)" stroke-width="2"/>' +
    '<text x="80" y="142" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">TU NOMBRE</text>',
  bola:
    '<circle cx="80" cy="78" r="36" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
    '<rect x="71" y="34" width="18" height="9" rx="1.5" fill="none" stroke="var(--neon2)" stroke-width="2"/><circle cx="80" cy="29" r="4" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
    '<path d="M60 78h40" stroke="var(--neon2)" stroke-width="3" stroke-linecap="round"/><path d="M68 92h24" stroke="var(--neon2)" stroke-width="2" stroke-linecap="round" opacity="0.6"/>' +
    '<text x="80" y="142" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">TU NOMBRE</text>',
  bombo:
    '<path d="M42 104a38 38 0 0 1 76 0z" fill="none" stroke="var(--neon)" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M108 74c8-6 16-6 20 0s-4 14-12 12" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
    '<text x="80" y="94" text-anchor="middle" fill="var(--neon2)" font-size="17" font-family="monospace" font-weight="700">00000</text>' +
    '<text x="80" y="140" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">TU NÚMERO</text>',
  marcasitio:
    '<rect x="26" y="52" width="108" height="42" rx="6" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
    '<path d="M44 84l9-22 9 22z" fill="none" stroke="var(--neon2)" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M72 73h46" stroke="var(--neon2)" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M46 94l-6 16h80l-6-16" fill="none" stroke="var(--neon)" stroke-width="2" opacity="0.6"/>' +
    '<text x="80" y="140" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">TU NOMBRE</text>'
};
const BADGES = ["purple", "red", "green"];

const esc = (s) => { const d = document.createElement("div"); d.textContent = String(s ?? ""); return d.innerHTML; };

// Cómo se cuentan las variantes: pares (pendientes) por defecto, o lo que diga "varUnidad"
const unidades = (p) => (Array.isArray(p.varUnidad) && p.varUnidad.length === 2 ? p.varUnidad : ["par", "pares"]);

function card(p, n = 99) {
  const imgs = (Array.isArray(p.imgs) ? p.imgs : []).filter(Boolean);
  const slides = imgs.length
    ? imgs.map((src, i) => `<div class="slide"><img src="/${esc(src.replace(/^\//, ""))}" alt="${esc((p.alts && p.alts[i]) || p.nombre)}${imgs.length > 1 ? ` (${i + 1} de ${imgs.length})` : ""}" ${n < 2 && i === 0 ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"></div>`).join("")
    : `<div class="slide ph-${(p.nombre.length) % 4}"><svg viewBox="0 0 160 160" aria-hidden="true">${ICONS[p.icono] || ICONS.generico}</svg></div>`;
  const multi = imgs.length > 1;
  const nav = multi
    ? `<button class="sl-btn sl-prev" type="button" aria-label="Foto anterior"><span></span></button><button class="sl-btn sl-next" type="button" aria-label="Foto siguiente"><span></span></button>
       <div class="dots">${imgs.map((_, i) => `<button type="button" aria-label="Foto ${i + 1}"${i === 0 ? ' aria-current="true"' : ""}></button>`).join("")}</div>`
    : "";
  const price = p.precioTexto ? esc(p.precioTexto) : typeof p.precio === "number" ? euros(p.precio) : "Consultar";
  const unit = p.unidad ? ` <small>${esc(p.unidad)}</small>` : "";
  const vars = Array.isArray(p.variantes) && p.variantes.length && typeof p.precio === "number" ? p.variantes : null;
  const [u1, u2] = unidades(p);
  const action = vars
    ? `<button class="add" type="button" data-add-vars disabled aria-describedby="sum-${esc(p.id)}">Añadir</button>`
    : typeof p.precio === "number"
    ? `<button class="add" type="button" data-add="${esc(p.id)}" aria-label="Añadir ${esc(p.nombre)} a la cesta">Añadir</button>`
    : `<a class="add is-quote" href="/pedido.html?pieza=${encodeURIComponent(p.nombre)}#pedido">Presupuesto</a>`;
  const picker = vars ? `
      <fieldset class="vars">
        <legend>Elige diseños y cuántos ${u2} de cada uno</legend>
        <ul class="vars-list">${vars.map((v, k) => `
          <li class="var">
            ${v.img ? `<img src="/${esc(v.img.replace(/^\//, ""))}" width="56" height="56" alt="" loading="lazy" decoding="async">` : ""}
            <span class="var-name">${esc(v.nombre)}${v.medidas ? `<small>${esc(v.medidas)}</small>` : ""}</span>
            <span class="var-qty" role="group" aria-label="${u2[0].toUpperCase() + u2.slice(1)} de ${esc(v.nombre)}">
              <button type="button" data-dec="${k}" aria-label="Quitar un ${u1} de ${esc(v.nombre)}" disabled>−</button><output data-q="${k}" aria-live="off">0</output><button type="button" data-inc="${k}" aria-label="Añadir un ${u1} de ${esc(v.nombre)}">+</button>
            </span>
          </li>`).join("")}
        </ul>
        <p class="vars-sum" id="sum-${esc(p.id)}" aria-live="polite">Ningún ${u1} elegido</p>
      </fieldset>` : "";
  return `<article class="card${p.wide ? " is-wide" : ""}${vars ? " has-vars" : ""}" data-category="${esc(p.categoria)}" id="p-${esc(p.id)}">
    <div class="card-media"><div class="slides">${slides}</div>${imgs.length ? "" : '<span class="grid-lines" aria-hidden="true"></span>'}${p.badge ? `<span class="badge${BADGES.includes(p.badgeColor) ? ` is-${p.badgeColor}` : ""}">${esc(p.badge)}</span>` : ""}${nav}</div>
    <div class="card-body">
      <p class="card-cat">${esc(p.catLabel || "")}</p>
      <h3 class="card-name">${esc(p.nombre)}</h3>
      <p class="card-desc">${esc(p.desc || "")}</p>${picker}
      <div class="card-foot"><p class="price">${price}${unit}</p>${action}</div>
    </div>
  </article>`;
}

function wireCard(el, p) {
  // Carrusel
  const track = $(".slides", el);
  const dots = $$(".dots button", el);
  let i = 0;
  const go = (n) => {
    i = (n + dots.length) % dots.length;
    track.style.transform = `translateX(${-i * 100}%)`;
    dots.forEach((d, k) => d.setAttribute("aria-current", String(k === i)));
  };
  if (dots.length) {
    $(".sl-prev", el).addEventListener("click", () => go(i - 1));
    $(".sl-next", el).addEventListener("click", () => go(i + 1));
    dots.forEach((d, k) => d.addEventListener("click", () => go(k)));
    let x0 = null;
    track.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    track.addEventListener("touchend", (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); x0 = null; });
  }
  // Añadir a la cesta
  const add = $("[data-add]", el);
  add?.addEventListener("click", () => {
    addToCart({ name: p.nombre, price: p.precio, qty: 1 }, add);
    add.classList.add("is-added");
    add.textContent = "Añadido";
    setTimeout(() => { add.classList.remove("is-added"); add.textContent = "Añadir"; }, 1400);
  });
  // Selector de diseños (pendientes): cantidad por diseño y un solo botón para añadirlos
  const addVars = $("[data-add-vars]", el);
  if (addVars) {
    const qty = p.variantes.map(() => 0);
    const sum = $(".vars-sum", el);
    const paint = () => {
      const n = qty.reduce((a, b) => a + b, 0);
      qty.forEach((q, k) => {
        $(`[data-q="${k}"]`, el).textContent = q;
        $(`[data-dec="${k}"]`, el).disabled = q === 0;
        $(`[data-q="${k}"]`, el).closest(".var").classList.toggle("is-on", q > 0);
      });
      addVars.disabled = n === 0;
      addVars.textContent = n ? `Añadir ${n} · ${euros(n * p.precio)}` : "Añadir";
      const [u1, u2] = unidades(p);
      sum.textContent = n ? `${n} ${n === 1 ? u1 : u2} · ${euros(n * p.precio)}` : `Ningún ${u1} elegido`;
    };
    $(".vars", el).addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      if (btn.dataset.inc) qty[btn.dataset.inc]++;
      if (btn.dataset.dec && qty[btn.dataset.dec] > 0) qty[btn.dataset.dec]--;
      paint();
    });
    addVars.addEventListener("click", () => {
      const label = p.varLabel || p.nombre;
      const items = p.variantes.map((v, k) => ({ name: `${label}: ${v.nombre}`, price: p.precio, qty: qty[k] })).filter((i) => i.qty > 0);
      if (!items.length) return;
      addToCart(items, addVars);
      qty.fill(0);
      paint();
      addVars.classList.add("is-added");
      addVars.textContent = "Añadido";
      sum.textContent = "Añadido a la cesta";
      setTimeout(() => { addVars.classList.remove("is-added"); paint(); }, 1400);
    });
    paint();
  }
}

function renderGrid(grid, list, all) {
  if (!list.length) { grid.innerHTML = '<p class="grid-status">No hay productos en esta categoría todavía.</p>'; return []; }
  grid.innerHTML = list.map((p, n) => card(p, n)).join("");
  const els = $$(".card", grid);
  els.forEach((el, k) => wireCard(el, list[k]));
  return els;
}

function initFilters(bar, cats, onPick, initial) {
  bar.innerHTML = `<span class="pill-bg" aria-hidden="true"></span>` +
    cats.map((c) => `<button type="button" data-f="${esc(c.id)}" aria-pressed="${c.id === initial}">${esc(c.label)}</button>`).join("");
  const pill = $(".pill-bg", bar);
  const move = (btn) => {
    pill.style.width = btn.offsetWidth + "px";
    pill.style.height = btn.offsetHeight + "px";
    pill.style.transform = `translate(${btn.offsetLeft}px, ${btn.offsetTop}px)`;
  };
  const pick = (id, push = true) => {
    const btn = $(`[data-f="${CSS.escape(id)}"]`, bar) || $("button[data-f]", bar);
    $$("button[data-f]", bar).forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    move(btn);
    onPick(btn.dataset.f);
    if (push) history.replaceState(null, "", btn.dataset.f === "todos" ? location.pathname : "#" + btn.dataset.f);
  };
  bar.addEventListener("click", (e) => { const b = e.target.closest("button[data-f]"); if (b) pick(b.dataset.f); });
  addEventListener("resize", () => move($('[aria-pressed="true"]', bar)));
  pick(initial, false);
}

async function main() {
  const grids = $$("[data-catalog]");
  if (!grids.length) return;
  let data;
  try {
    const r = await fetch(DATA_URL, { cache: "no-cache" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    data = await r.json();
  } catch (err) {
    console.error("[3DOCNA] No se pudo cargar el catálogo:", err);
    grids.forEach((g) => (g.innerHTML = '<p class="grid-status">No hemos podido cargar el catálogo. <a class="link-arrow" href="/pedido.html">Pide presupuesto por aquí</a></p>'));
    return;
  }
  const productos = data.productos || [];
  for (const grid of grids) {
    let list = grid.dataset.catalog === "destacados" ? productos.filter((p) => p.destacado) : productos;
    const limit = parseInt(grid.dataset.limit, 10);
    if (!isNaN(limit)) list = list.slice(0, limit);
    const bar = $("[data-catalog-tabs]");
    if (bar && grid.dataset.catalog !== "destacados" && data.categorias) {
      const hash = decodeURIComponent(location.hash.slice(1));
      const initial = data.categorias.some((c) => c.id === hash) ? hash : "todos";
      let first = true;
      initFilters(bar, data.categorias, (id) => {
        const sel = id === "todos" ? list : list.filter((p) => p.categoria === id);
        const els = renderGrid(grid, sel, list);
        if (first) { reveal(els); first = false; }
      }, initial);
    } else {
      reveal(renderGrid(grid, list, list));
    }
  }
}
main();
