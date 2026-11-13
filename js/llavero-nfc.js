/* 3DOCNA — página del llavero NFC: configurador por piezas, colores, visor 3D y recambios.
   Precios y piezas salen de data/productos.json (productos «llavero-nfc» y «llavero-nfc-recambios»). */
import { $, $$, euros, addToCart, motionOK } from "./app.js";

// Colores que se pueden elegir. Para añadir uno: [nombre, color en pantalla]
const COLORS = [
  ["Blanco", "#f1efe9"], ["Negro", "#1b1b1f"], ["Gris", "#8f9096"], ["Naranja", "#e8742f"],
  ["Rojo", "#c8202f"], ["Amarillo", "#f3c233"], ["Verde", "#2f8a4f"], ["Azul", "#2f6fd6"],
];
const GROUPS = [
  { id: "marco", label: "Marco del llavero", def: "Negro" },
  { id: "piezas", label: "Frontal, cajones, estación y clip", def: "Blanco" },
  { id: "iconos", label: "Iconos", def: "Naranja" },
];
// Qué grupos de color lleva cada pieza (para que el pedido diga solo lo que importa)
const USES = {
  pack: ["marco", "piezas", "iconos"], "cajon-contacto": ["piezas", "iconos"], "cajon-redes": ["piezas", "iconos"],
  estacion: ["piezas"], clip: ["piezas"],
  carcasa: ["marco"], frontal: ["piezas", "iconos"], cajon: ["piezas", "iconos"],
};

const esc = (s) => { const d = document.createElement("div"); d.textContent = String(s ?? ""); return d.innerHTML; };
const hex = (name) => (COLORS.find((c) => c[0] === name) || COLORS[0])[1];

const color = Object.fromEntries(GROUPS.map((g) => [g.id, g.def]));
const qty = {};
const recQty = {};
let product, recambios, viewer = null;

const colorText = (id) => (USES[id] || []).map((g) => `${g} ${color[g].toLowerCase()}`).join(", ");

function stepper(id, name, n, prefix = "") {
  return `<span class="var-qty" role="group" aria-label="Cantidad de ${esc(name)}">
    <button type="button" data-${prefix}dec="${id}" aria-label="Quitar una pieza de ${esc(name)}"${n ? "" : " disabled"}>−</button><output data-${prefix}q="${id}">${n}</output><button type="button" data-${prefix}inc="${id}" aria-label="Añadir una pieza de ${esc(name)}">+</button>
  </span>`;
}

/* ---------- Configurador ---------- */
function renderPieces() {
  $("#nfcPieces").innerHTML = product.variantes.map((v) => `
    <li class="nfc-piece${qty[v.id] ? " is-on" : ""}" data-piece="${v.id}">
      <div class="nfc-piece-txt"><b>${esc(v.nombre)}</b><span>${esc(v.medidas || "")}</span></div>
      <span class="nfc-piece-price">${euros(v.precio)}</span>
      ${stepper(v.id, v.nombre, qty[v.id] || 0)}
    </li>`).join("");
}

function renderColors() {
  $("#nfcColors").insertAdjacentHTML("beforeend", GROUPS.map((g) => `
    <div class="nfc-color-row">
      <span class="nfc-color-label">${esc(g.label)} <b data-color-name="${g.id}">${esc(color[g.id])}</b></span>
      <div class="nfc-swatches" role="radiogroup" aria-label="${esc(g.label)}">
        ${COLORS.map(([n, c]) => `<button type="button" role="radio" class="sw" style="--sw:${c}" data-group="${g.id}" data-color="${n}" aria-label="${n}" aria-checked="${n === color[g.id]}"></button>`).join("")}
      </div>
    </div>`).join("") + `<p class="form-note">¿Otro color? Escríbenoslo en el pedido y te decimos si lo tenemos.</p>`);
}

function total() { return product.variantes.reduce((s, v) => s + (qty[v.id] || 0) * v.precio, 0); }

function paint() {
  const t = total();
  $("#nfcTotal").textContent = euros(t);
  $$("[data-nfc-total]").forEach((e) => (e.textContent = euros(t)));
  const n = Object.values(qty).reduce((a, b) => a + b, 0);
  $("#nfcAdd").disabled = !n;
  $("#nfcAdd span").textContent = n ? `Añadir ${n} ${n === 1 ? "pieza" : "piezas"} · ${euros(t)}` : "Elige alguna pieza";
  $$("[data-nfc-add]").forEach((b) => (b.disabled = !n));
  product.variantes.forEach((v) => {
    const q = qty[v.id] || 0;
    const row = $(`[data-piece="${v.id}"]`);
    if (!row) return;
    $(`[data-q="${v.id}"]`, row).textContent = q;
    $(`[data-dec="${v.id}"]`, row).disabled = q === 0;
    row.classList.toggle("is-on", q > 0);
  });
  $$("[data-card-n]").forEach((e) => { const q = qty[e.dataset.cardN] || 0; e.textContent = q ? `${q} en tu sistema` : ""; });
  viewer?.set(counts());
}

function counts() {
  const c = {};
  for (const v of product.variantes) if (v.modelo) c[v.modelo] = (c[v.modelo] || 0) + (qty[v.id] || 0);
  return c;
}

function bump(id, d) {
  qty[id] = Math.max(0, Math.min(20, (qty[id] || 0) + d));
  paint();
}

function addAll(from) {
  const items = product.variantes.filter((v) => qty[v.id] > 0)
    .map((v) => ({ name: `${product.varLabel}: ${v.nombre} · ${colorText(v.id)}`, price: v.precio, qty: qty[v.id] }));
  if (!items.length) return;
  addToCart(items, from);
  const b = $("#nfcAdd");
  b.classList.add("is-added");
  $("span", b).textContent = "Añadido a la cesta";
  setTimeout(() => { b.classList.remove("is-added"); paint(); }, 1600);
}

/* ---------- Pieza a pieza ---------- */
function renderCards() {
  $("#nfcCards").innerHTML = product.variantes.map((v) => {
    const fotos = v.fotos || [];
    return `<article class="nfc-card">
      <div class="nfc-card-media">
        ${fotos.map(([src, kind], i) => `<img src="/${esc(src)}" width="1200" height="${kind === "Render" ? 750 : 900}" loading="lazy" decoding="async" alt="${esc(v.nombre)} (${kind.toLowerCase()})"${i ? " hidden" : ""} data-shot="${i}">`).join("")}
        ${fotos.length > 1 ? `<div class="nfc-card-tabs" role="group" aria-label="Ver foto o render">${fotos.map(([, kind], i) => `<button type="button" data-tab="${i}" aria-pressed="${i === 0}">${kind}</button>`).join("")}</div>` : `<span class="nfc-card-kind">${fotos[0]?.[1] || ""}</span>`}
      </div>
      <div class="nfc-card-body">
        <h3>${esc(v.nombre)} <span>${euros(v.precio)}</span></h3>
        <p>${esc(v.detalle || v.medidas || "")}</p>
        <div class="nfc-card-foot">
          <button class="add" type="button" data-card-add="${v.id}">Añadir al sistema</button>
          <small data-card-n="${v.id}"></small>
        </div>
      </div>
    </article>`;
  }).join("");
  $("#nfcCards").addEventListener("click", (e) => {
    const tab = e.target.closest("[data-tab]");
    if (tab) {
      const media = tab.closest(".nfc-card-media");
      $$("[data-tab]", media).forEach((b) => b.setAttribute("aria-pressed", String(b === tab)));
      $$("[data-shot]", media).forEach((img) => (img.hidden = img.dataset.shot !== tab.dataset.tab));
      return;
    }
    const add = e.target.closest("[data-card-add]");
    if (!add) return;
    bump(add.dataset.cardAdd, 1);
    // Te lleva al visor para ver la pieza que acaba de entrar
    const stage = $("#nfcStage");
    const r = stage.getBoundingClientRect();
    if (r.bottom < 80 || r.top > innerHeight - 80) stage.scrollIntoView({ behavior: motionOK() ? "smooth" : "auto", block: "center" });
  });
}

/* ---------- Recambios ---------- */
function renderRecambios() {
  if (!recambios) { $("#recambios").hidden = true; return; }
  if (recambios.aviso) { $("#recAviso").textContent = recambios.aviso; $("#recAviso").hidden = false; }
  $("#recList").innerHTML = recambios.variantes.map((v) => `
    <li class="nfc-piece" data-rpiece="${v.id}">
      <div class="nfc-piece-txt"><b>${esc(v.nombre)}</b><span>${esc(v.medidas || "")}</span></div>
      <span class="nfc-piece-price">${euros(v.precio)}</span>
      ${stepper(v.id, v.nombre, 0, "r")}
    </li>`).join("");
  const recTotal = () => recambios.variantes.reduce((s, v) => s + (recQty[v.id] || 0) * v.precio, 0);
  const paintRec = () => {
    const n = Object.values(recQty).reduce((a, b) => a + b, 0);
    $("#recTotal").textContent = euros(recTotal());
    $("#recAdd").disabled = !n;
    $("#recAdd").textContent = n ? `Añadir ${n} · ${euros(recTotal())}` : "Añadir recambios";
    recambios.variantes.forEach((v) => {
      const q = recQty[v.id] || 0;
      $(`[data-rq="${v.id}"]`).textContent = q;
      $(`[data-rdec="${v.id}"]`).disabled = q === 0;
      $(`[data-rpiece="${v.id}"]`).classList.toggle("is-on", q > 0);
    });
  };
  $("#recList").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const id = b.dataset.rinc || b.dataset.rdec;
    if (!id) return;
    recQty[id] = Math.max(0, (recQty[id] || 0) + (b.dataset.rinc ? 1 : -1));
    paintRec();
  });
  $("#recAdd").addEventListener("click", (e) => {
    const items = recambios.variantes.filter((v) => recQty[v.id] > 0)
      .map((v) => ({ name: `${recambios.varLabel}: ${v.nombre} · ${colorText(v.id)}`, price: v.precio, qty: recQty[v.id] }));
    if (!items.length) return;
    addToCart(items, e.currentTarget);
    for (const k in recQty) recQty[k] = 0;
    paintRec();
  });
  paintRec();
}

/* ---------- Visor 3D: se carga solo al acercarse ---------- */
function initViewer() {
  const stage = $("#nfcStage");
  const hasGL = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } })();
  if (!hasGL) { stage.classList.add("no-3d"); return; }
  const start = async () => {
    stage.classList.add("is-loading");
    try {
      const { createViewer } = await import("./nfc-viewer.js");
      viewer = await createViewer(stage, { colors: Object.fromEntries(GROUPS.map((g) => [g.id, hex(color[g.id])])), reduced: !motionOK() });
      viewer.set(counts());
      stage.classList.add("is-ready");
    } catch (err) {
      console.error("[3DOCNA] No se pudo cargar el visor 3D:", err);
      stage.classList.add("no-3d");
    } finally {
      stage.classList.remove("is-loading");
    }
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); start(); } }, { rootMargin: "300px" });
    io.observe(stage);
  } else start();
}

/* ---------- Vídeo: como un GIF, solo mientras se ve ---------- */
function initVideo() {
  $$(".work-video").forEach((v) => {
    const box = v.closest(".work");
    if (!motionOK() || !("IntersectionObserver" in window)) { v.controls = true; return; }
    const play = () => { v.play()?.catch(() => {}); box?.classList.add("is-playing"); };
    const stop = () => { v.pause(); box?.classList.remove("is-playing"); };
    new IntersectionObserver(([e]) => (e.isIntersecting ? play() : stop()), { threshold: 0.35 }).observe(v);
    v.addEventListener("click", () => (v.paused ? play() : stop()));
  });
}

/* ---------- Barra de compra en móvil ---------- */
function initBar() {
  const bar = $("#nfcBar"), buy = $("#nfcBuy");
  if (!bar || !("IntersectionObserver" in window)) return;
  let buyVisible = true, inZone = true;
  const sync = () => {
    const show = !buyVisible && inZone && total() > 0;
    bar.classList.toggle("is-on", show);
    bar.setAttribute("aria-hidden", String(!show));
    $("button", bar).tabIndex = show ? 0 : -1;
  };
  new IntersectionObserver(([e]) => { buyVisible = e.isIntersecting; sync(); }).observe(buy);
  // Solo mientras estás en el configurador o en «pieza a pieza»
  const zone = new Set();
  const zio = new IntersectionObserver((es) => {
    es.forEach((e) => (e.isIntersecting ? zone.add(e.target) : zone.delete(e.target)));
    inZone = zone.size > 0;
    sync();
  });
  [$(".nfc"), $("#piezas")].forEach((el) => el && zio.observe(el));
  document.addEventListener("nfc:change", sync);
}

async function main() {
  let data;
  try {
    const r = await fetch("/data/productos.json", { cache: "no-cache" });
    data = await r.json();
  } catch (err) {
    $("#nfcPieces").innerHTML = '<li>No hemos podido cargar las piezas. <a class="link-arrow" href="/pedido.html?pieza=Llavero%20NFC#pedido">Pídelo por aquí</a></li>';
    return;
  }
  product = data.productos.find((p) => p.id === "llavero-nfc");
  recambios = data.productos.find((p) => p.id === "llavero-nfc-recambios");
  if (!product) return;
  product.variantes.forEach((v) => (qty[v.id] = v.id === "pack" ? 1 : 0));
  if (product.aviso) { $("#nfcAviso").textContent = product.aviso; $("#nfcAviso").hidden = false; }

  renderPieces();
  renderColors();
  renderCards();
  renderRecambios();

  $("#nfcPieces").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.inc) bump(b.dataset.inc, 1);
    if (b.dataset.dec) bump(b.dataset.dec, -1);
    document.dispatchEvent(new Event("nfc:change"));
  });
  $("#nfcColors").addEventListener("click", (e) => {
    const sw = e.target.closest(".sw");
    if (!sw) return;
    color[sw.dataset.group] = sw.dataset.color;
    $$(`.sw[data-group="${sw.dataset.group}"]`).forEach((b) => b.setAttribute("aria-checked", String(b === sw)));
    $(`[data-color-name="${sw.dataset.group}"]`).textContent = sw.dataset.color;
    viewer?.setColors({ [sw.dataset.group]: hex(sw.dataset.color) });
  });
  $("#nfcAdd").addEventListener("click", (e) => addAll(e.currentTarget));
  $$("[data-nfc-add]").forEach((b) => b.addEventListener("click", (e) => addAll(e.currentTarget)));

  paint();
  initViewer();
  initVideo();
  initBar();
}
main();
