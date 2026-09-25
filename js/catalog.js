/* 3DOCNA — catálogo
   Lee data/productos.json y pinta las tarjetas. Para añadir productos no se toca este archivo:
   se edita el JSON (instrucciones en img/README.md). */
import { $, $$, euros, addToCart, hasGsap, motionOK, finePointer } from "./app.js";

const DATA_URL = "/data/productos.json";

// Dibujos de relleno mientras no haya foto (usan var(--neon) y var(--neon2))
const ICONS = {
  farol:
    '<path d="M62 34h36M70 34v-8h20v8" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
    '<path d="M56 40h48l8 70a10 10 0 0 1-10 11H58a10 10 0 0 1-10-11z" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
    '<ellipse cx="80" cy="80" rx="22" ry="26" fill="var(--neon)" opacity="0.10"/>' +
    '<path d="M68 72c4-6 8-6 12 0s8 6 12 0" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
    '<circle cx="72" cy="92" r="3.5" fill="var(--neon2)"/><circle cx="88" cy="92" r="3.5" fill="var(--neon2)"/>' +
    '<text x="80" y="145" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">TU NOMBRE</text>',
  escaparate:
    '<rect x="24" y="26" width="112" height="84" rx="4" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
    '<line x1="24" y1="42" x2="136" y2="42" stroke="var(--neon)" stroke-width="1.5" opacity="0.5"/>' +
    '<circle cx="52" cy="76" r="14" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
    '<rect x="78" y="62" width="34" height="28" rx="3" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
    '<line x1="40" y1="110" x2="40" y2="126" stroke="var(--neon)" stroke-width="1.5" opacity="0.4"/>' +
    '<line x1="120" y1="110" x2="120" y2="126" stroke="var(--neon)" stroke-width="1.5" opacity="0.4"/>' +
    '<text x="80" y="145" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">ESCAPARATE</text>',
  cuenco:
    '<path d="M34 62h92l-10 44a16 16 0 0 1-16 12H60a16 16 0 0 1-16-12z" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
    '<ellipse cx="80" cy="62" rx="46" ry="10" fill="none" stroke="var(--neon)" stroke-width="2"/>' +
    '<circle cx="64" cy="50" r="7" fill="var(--neon2)" opacity="0.5"/>' +
    '<circle cx="82" cy="44" r="8" fill="var(--neon)" opacity="0.4"/>' +
    '<circle cx="98" cy="52" r="6" fill="var(--neon2)" opacity="0.5"/>' +
    '<text x="80" y="146" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">CON TU APELLIDO</text>',
  colgantes:
    '<line x1="20" y1="30" x2="140" y2="30" stroke="var(--neon)" stroke-width="1.5" opacity="0.5"/>' +
    '<line x1="46" y1="30" x2="46" y2="52" stroke="var(--neon)" stroke-width="1"/>' +
    '<line x1="80" y1="30" x2="80" y2="70" stroke="var(--neon)" stroke-width="1"/>' +
    '<line x1="114" y1="30" x2="114" y2="46" stroke="var(--neon)" stroke-width="1"/>' +
    '<path d="M28 62c8-10 12 2 18-4 6 6 10-6 18 4-6 4-10 10-18 10s-12-6-18-10z" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
    '<circle cx="80" cy="80" r="9" fill="none" stroke="var(--neon)" stroke-width="2"/>' +
    '<path d="M71 74l-8-6M89 74l8-6M71 86l-8 6M89 86l8 6" stroke="var(--neon)" stroke-width="1.5"/>' +
    '<path d="M96 56c8-10 12 2 18-4 6 6 10-6 18 4-6 4-10 10-18 10s-12-6-18-10z" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
    '<text x="80" y="146" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">PACK DE 12</text>',
  carta:
    '<path d="M46 118V54l34-16 34 16v64z" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
    '<rect x="64" y="62" width="32" height="32" rx="2" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
    '<rect x="70" y="68" width="8" height="8" fill="var(--neon2)"/><rect x="82" y="68" width="8" height="8" fill="var(--neon2)"/>' +
    '<rect x="70" y="80" width="8" height="8" fill="var(--neon2)"/><rect x="84" y="82" width="5" height="5" fill="var(--neon2)"/>' +
    '<line x1="58" y1="106" x2="102" y2="106" stroke="var(--neon)" stroke-width="2" opacity="0.6"/>' +
    '<text x="80" y="146" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">TU LOGO AQUÍ</text>',
  base:
    '<rect x="34" y="96" width="92" height="18" rx="3" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
    '<rect x="52" y="40" width="56" height="52" rx="3" fill="none" stroke="var(--neon2)" stroke-width="2.5" stroke-dasharray="6,4"/>' +
    '<path d="M108 66h18M120 60l6 6-6 6" stroke="var(--neon)" stroke-width="2" fill="none"/>' +
    '<rect x="24" y="52" width="22" height="28" rx="2" fill="var(--neon)" opacity="0.15"/>' +
    '<text x="80" y="140" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">FRONTAL INTERCAMBIABLE</text>',
  expositor:
    '<path d="M32 112h96" stroke="var(--neon)" stroke-width="2.5"/>' +
    '<path d="M44 112V88h28v24M72 112V70h28v42M100 112V52h20v60" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
    '<circle cx="58" cy="78" r="6" fill="var(--neon2)" opacity="0.6"/>' +
    '<circle cx="86" cy="60" r="6" fill="var(--neon2)" opacity="0.6"/>' +
    '<circle cx="110" cy="42" r="6" fill="var(--neon2)" opacity="0.6"/>' +
    '<text x="80" y="142" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">A MEDIDA</text>',
  litofania:
    '<rect x="40" y="28" width="80" height="86" rx="3" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
    '<rect x="50" y="38" width="60" height="66" rx="2" fill="var(--neon)" opacity="0.08"/>' +
    '<circle cx="80" cy="62" r="14" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
    '<path d="M56 100c6-16 16-22 24-22s18 6 24 22" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
    '<path d="M22 60h10M22 72h10M128 60h10M128 72h10" stroke="var(--neon)" stroke-width="2" opacity="0.5"/>' +
    '<text x="80" y="142" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">TU FOTO</text>',
  organizador:
    '<rect x="26" y="44" width="108" height="70" rx="3" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
    '<line x1="62" y1="44" x2="62" y2="114" stroke="var(--neon)" stroke-width="1.5"/>' +
    '<line x1="98" y1="44" x2="98" y2="114" stroke="var(--neon)" stroke-width="1.5"/>' +
    '<line x1="62" y1="80" x2="134" y2="80" stroke="var(--neon)" stroke-width="1.5"/>' +
    '<rect x="34" y="52" width="20" height="54" rx="2" fill="var(--neon2)" opacity="0.18"/>' +
    '<path d="M26 32h108M26 26v12M134 26v12" stroke="var(--neon2)" stroke-width="1.5"/>' +
    '<text x="80" y="140" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">TUS MEDIDAS</text>',
  moto:
    '<circle cx="42" cy="94" r="20" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
    '<circle cx="118" cy="94" r="20" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
    '<path d="M42 94l22-30h26l12 30M64 64h34M90 64l16 30" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
    '<rect x="76" y="30" width="26" height="20" rx="3" fill="none" stroke="var(--neon2)" stroke-width="2.5"/>' +
    '<line x1="89" y1="50" x2="89" y2="62" stroke="var(--neon2)" stroke-width="2.5"/>' +
    '<text x="80" y="140" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">PARA TU MODELO</text>',
  pieza:
    '<path d="M80 34l10 6h12l4 11 10 7-2 12 6 11-8 9 1 12-12 3-6 11-12-3-11 6-8-9-12-1-2-12-9-8 5-11-4-12 11-5 5-11z" fill="none" stroke="var(--neon)" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<circle cx="80" cy="78" r="18" fill="none" stroke="var(--neon2)" stroke-width="2.5"/>' +
    '<circle cx="80" cy="78" r="6" fill="var(--neon2)" opacity="0.4"/>' +
    '<text x="80" y="140" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">LA REPRODUCIMOS</text>',
  generico:
    '<rect x="40" y="46" width="80" height="68" rx="4" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
    '<path d="M40 92l22-20 18 16 14-12 26 22" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
    '<circle cx="64" cy="66" r="7" fill="var(--neon)" opacity="0.5"/>' +
    '<text x="80" y="140" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">3DOCNA</text>'
};

const esc = (s) => { const d = document.createElement("div"); d.textContent = String(s ?? ""); return d.innerHTML; };

function card(p) {
  const imgs = (Array.isArray(p.imgs) ? p.imgs : []).filter(Boolean);
  const slides = imgs.length
    ? imgs.map((src, i) => `<div class="slide"><img src="/${esc(src.replace(/^\//, ""))}" alt="${esc(p.nombre)}${imgs.length > 1 ? ` (${i + 1} de ${imgs.length})` : ""}" loading="lazy" decoding="async"></div>`).join("")
    : `<div class="slide ph-${(p.nombre.length) % 4}"><svg viewBox="0 0 160 160" aria-hidden="true">${ICONS[p.icono] || ICONS.generico}</svg></div>`;
  const multi = imgs.length > 1;
  const nav = multi
    ? `<button class="sl-btn sl-prev" type="button" aria-label="Foto anterior"><span></span></button><button class="sl-btn sl-next" type="button" aria-label="Foto siguiente"><span></span></button>
       <div class="dots">${imgs.map((_, i) => `<button type="button" aria-label="Foto ${i + 1}"${i === 0 ? ' aria-current="true"' : ""}></button>`).join("")}</div>`
    : "";
  const price = p.precioTexto ? esc(p.precioTexto) : typeof p.precio === "number" ? euros(p.precio) : "Consultar";
  const unit = p.unidad ? ` <small>${esc(p.unidad)}</small>` : "";
  const action = typeof p.precio === "number"
    ? `<button class="add" type="button" data-add="${esc(p.id)}" aria-label="Añadir ${esc(p.nombre)} a la cesta">Añadir</button>`
    : `<a class="add is-quote" href="/pedido.html?pieza=${encodeURIComponent(p.nombre)}#pedido">Presupuesto</a>`;
  return `<article class="card${p.wide ? " is-wide" : ""}" data-category="${esc(p.categoria)}" id="p-${esc(p.id)}">
    <div class="card-media"><div class="slides">${slides}</div>${imgs.length ? "" : '<span class="grid-lines" aria-hidden="true"></span>'}${p.badge ? `<span class="badge${p.badgeColor === "purple" ? " is-purple" : ""}">${esc(p.badge)}</span>` : ""}${nav}</div>
    <div class="card-body">
      <p class="card-cat">${esc(p.catLabel || "")}</p>
      <h3 class="card-name">${esc(p.nombre)}</h3>
      <p class="card-desc">${esc(p.desc || "")}</p>
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
  // Inclinación 3D suave con el ratón
  if (finePointer && hasGsap && motionOK()) {
    const { gsap } = window;
    const rx = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3.out" });
    const ry = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3.out" });
    gsap.set(el, { transformPerspective: 900 });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 7);
      rx(((e.clientY - r.top) / r.height - 0.5) * -7);
    });
    el.addEventListener("pointerleave", () => { rx(0); ry(0); });
  }
}

function reveal(cards) {
  if (!hasGsap || !motionOK()) return;
  const { gsap } = window;
  gsap.fromTo(cards, { clipPath: "inset(100% 0 0 0 round 22px)" }, {
    clipPath: "inset(0% 0 0 0 round 22px)", duration: 0.9, ease: "steps(12)", stagger: 0.08,
    scrollTrigger: { trigger: cards[0], start: "top 92%", once: true },
    onComplete: () => gsap.set(cards, { clearProps: "clipPath" }),
  });
  gsap.fromTo(cards, { y: 30 }, { y: 0, duration: 0.9, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: cards[0], start: "top 92%", once: true } });
}

function renderGrid(grid, list, all) {
  if (!list.length) { grid.innerHTML = '<p class="grid-status">No hay productos en esta categoría todavía.</p>'; return []; }
  grid.innerHTML = list.map(card).join("");
  const els = $$(".card", grid);
  els.forEach((el, k) => wireCard(el, list[k]));
  window.ScrollTrigger?.refresh();
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
        else if (hasGsap && motionOK()) window.gsap.from(els, { y: 24, opacity: 0, duration: 0.5, ease: "expo.out", stagger: 0.04 });
      }, initial);
    } else {
      reveal(renderGrid(grid, list, list));
    }
  }
}
main();
