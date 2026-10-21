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
    '<text x="80" y="140" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">3DOCNA</text>'
};

const esc = (s) => { const d = document.createElement("div"); d.textContent = String(s ?? ""); return d.innerHTML; };

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
  const action = vars
    ? `<button class="add" type="button" data-add-vars disabled aria-describedby="sum-${esc(p.id)}">Añadir</button>`
    : typeof p.precio === "number"
    ? `<button class="add" type="button" data-add="${esc(p.id)}" aria-label="Añadir ${esc(p.nombre)} a la cesta">Añadir</button>`
    : `<a class="add is-quote" href="/pedido.html?pieza=${encodeURIComponent(p.nombre)}#pedido">Presupuesto</a>`;
  const picker = vars ? `
      <fieldset class="vars">
        <legend>Elige diseños y cuántos pares de cada uno</legend>
        <ul class="vars-list">${vars.map((v, k) => `
          <li class="var">
            ${v.img ? `<img src="/${esc(v.img.replace(/^\//, ""))}" width="56" height="56" alt="" loading="lazy" decoding="async">` : ""}
            <span class="var-name">${esc(v.nombre)}${v.medidas ? `<small>${esc(v.medidas)}</small>` : ""}</span>
            <span class="var-qty" role="group" aria-label="Pares de ${esc(v.nombre)}">
              <button type="button" data-dec="${k}" aria-label="Quitar un par de ${esc(v.nombre)}" disabled>−</button><output data-q="${k}" aria-live="off">0</output><button type="button" data-inc="${k}" aria-label="Añadir un par de ${esc(v.nombre)}">+</button>
            </span>
          </li>`).join("")}
        </ul>
        <p class="vars-sum" id="sum-${esc(p.id)}" aria-live="polite">Ningún par elegido</p>
      </fieldset>` : "";
  return `<article class="card${p.wide ? " is-wide" : ""}${vars ? " has-vars" : ""}" data-category="${esc(p.categoria)}" id="p-${esc(p.id)}">
    <div class="card-media"><div class="slides">${slides}</div>${imgs.length ? "" : '<span class="grid-lines" aria-hidden="true"></span>'}${p.badge ? `<span class="badge${p.badgeColor === "purple" ? " is-purple" : ""}">${esc(p.badge)}</span>` : ""}${nav}</div>
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
      sum.textContent = n ? `${n} ${n === 1 ? "par" : "pares"} · ${euros(n * p.precio)}` : "Ningún par elegido";
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
