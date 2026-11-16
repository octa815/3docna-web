/* 3DOCNA — página del estuche ASMAX F1 Pro: visor 3D que se abre y se cierra, colores y cesta.
   El precio sale de data/productos.json (producto «estuche-asmax-f1-pro»). */
import { $, $$, euros, addToCart, motionOK } from "./app.js";

const COLORS = [
  ["Naranja", "#e8742f"], ["Rosa", "#e85fc4"], ["Negro", "#1b1b1f"], ["Blanco", "#f1efe9"],
  ["Gris", "#8f9096"], ["Rojo", "#c8202f"], ["Amarillo", "#f3c233"], ["Verde", "#2f8a4f"], ["Azul", "#2f6fd6"],
];
const GROUPS = [
  { id: "base", label: "Base", def: "Naranja" },
  { id: "tapa", label: "Tapa y puerta", def: "Rosa" },
];
const hex = (n) => (COLORS.find((c) => c[0] === n) || COLORS[0])[1];
const color = Object.fromEntries(GROUPS.map((g) => [g.id, g.def]));
let product, qty = 1, viewer = null;

function renderColors() {
  $("#axColors").insertAdjacentHTML("beforeend", GROUPS.map((g) => `
    <div class="nfc-color-row">
      <span class="nfc-color-label">${g.label} <b data-color-name="${g.id}">${color[g.id]}</b></span>
      <div class="nfc-swatches" role="radiogroup" aria-label="Color de ${g.label.toLowerCase()}">
        ${COLORS.map(([n, c]) => `<button type="button" role="radio" class="sw" style="--sw:${c}" data-group="${g.id}" data-color="${n}" aria-label="${n}" aria-checked="${n === color[g.id]}"></button>`).join("")}
      </div>
    </div>`).join("") + `<p class="form-note">¿Otro color? Escríbenoslo en el pedido y te decimos si lo tenemos.</p>`);
  $("#axColors").addEventListener("click", (e) => {
    const sw = e.target.closest(".sw");
    if (!sw) return;
    color[sw.dataset.group] = sw.dataset.color;
    $$(`.sw[data-group="${sw.dataset.group}"]`).forEach((b) => b.setAttribute("aria-checked", String(b === sw)));
    $(`[data-color-name="${sw.dataset.group}"]`).textContent = sw.dataset.color;
    viewer?.setColors({ [sw.dataset.group]: hex(sw.dataset.color) });
  });
}

function paint() {
  const t = product.precio * qty;
  $("#axQty").textContent = qty;
  $('[data-axq="-1"]').disabled = qty <= 1;
  $("#axPrice").textContent = euros(t);
  $$("[data-ax-total]").forEach((e) => (e.textContent = euros(t)));
  $("#axAdd span").textContent = `Añadir ${qty > 1 ? qty + " · " : ""}${euros(t)}`;
}

function add(from) {
  addToCart({ name: `${product.nombre} · base ${color.base.toLowerCase()}, tapa ${color.tapa.toLowerCase()}`, price: product.precio, qty }, from);
  const b = $("#axAdd");
  $("span", b).textContent = "Añadido a la cesta";
  b.classList.add("is-added");
  setTimeout(() => { b.classList.remove("is-added"); paint(); }, 1600);
}

/* ---------- Botones del visor ---------- */
const LABELS = { tapa: ["Abrir tapa", "Cerrar tapa"], puerta: ["Abrir puerta de carga", "Cerrar puerta de carga"] };
function syncButtons(s) {
  for (const k of ["tapa", "puerta"]) {
    const b = $(`[data-ax="${k}"]`);
    if (!b) continue;
    const open = s[k] >= 0.5 || s[k + "T"] >= 0.5;
    b.setAttribute("aria-pressed", String(open));
    b.textContent = LABELS[k][open ? 1 : 0];
  }
}

function initViewer() {
  const stage = $("#axStage");
  const hasGL = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } })();
  if (!hasGL) { stage.classList.add("no-3d"); return; }
  const start = async () => {
    stage.classList.add("is-loading");
    try {
      const { createAsmaxViewer } = await import("./asmax-viewer.js");
      viewer = await createAsmaxViewer(stage, { colors: { base: hex(color.base), tapa: hex(color.tapa) }, reduced: !motionOK() });
      viewer.onState((s) => syncButtons({ tapa: s.tapaT, puerta: s.puertaT }));
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

  stage.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ax]");
    if (!b || !viewer) return;
    if (b.dataset.ax === "intercom") {
      const on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", String(on));
      viewer.showIntercom(on);
      return;
    }
    viewer.toggle(b.dataset.ax);
  });

  // «Cómo funciona»: cada tarjeta pone el modelo en la posición que explica y te lleva a él
  $(".ax-how")?.addEventListener("click", (e) => {
    const c = e.target.closest("[data-show]");
    if (!c || !viewer) return;
    const s = c.dataset.show;
    viewer.set("tapa", s === "tapa" || s === "imanes" || s === "fundas");
    viewer.set("puerta", s === "puerta");
    viewer.showIntercom(s !== "fundas");
    $('[data-ax="intercom"]').setAttribute("aria-pressed", String(s !== "fundas"));
    const r = stage.getBoundingClientRect();
    if (r.bottom < 80 || r.top > innerHeight - 80) stage.scrollIntoView({ behavior: motionOK() ? "smooth" : "auto", block: "center" });
  });
}

function initBar() {
  const bar = $("#axBar"), buy = $("#axBuy");
  if (!bar || !("IntersectionObserver" in window)) return;
  let buyVisible = true, inZone = true;
  const sync = () => {
    const show = !buyVisible && inZone;
    bar.classList.toggle("is-on", show);
    bar.setAttribute("aria-hidden", String(!show));
    $("button", bar).tabIndex = show ? 0 : -1;
  };
  new IntersectionObserver(([e]) => { buyVisible = e.isIntersecting; sync(); }).observe(buy);
  const zone = new Set();
  const zio = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? zone.add(e.target) : zone.delete(e.target))); inZone = zone.size > 0; sync(); });
  [$(".nfc"), $("#como"), $("#fotos")].forEach((el) => el && zio.observe(el));
}

async function main() {
  try {
    const r = await fetch("/data/productos.json", { cache: "no-cache" });
    product = (await r.json()).productos.find((p) => p.id === "estuche-asmax-f1-pro");
  } catch { /* sin datos: se queda el precio escrito en la página */ }
  product = product || { nombre: "Estuche para 2 intercom ASMAX F1 Pro", precio: 15 };
  renderColors();
  $$("[data-axq]").forEach((b) => b.addEventListener("click", () => { qty = Math.max(1, Math.min(10, qty + Number(b.dataset.axq))); paint(); }));
  $("#axAdd").addEventListener("click", (e) => add(e.currentTarget));
  $$("[data-ax-add]").forEach((b) => b.addEventListener("click", (e) => add(e.currentTarget)));
  paint();
  initViewer();
  initBar();
}
main();
