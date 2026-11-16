/* 3DOCNA — invitaciones con NFC: el formulario actualiza al momento la tarjeta 3D y la web de ejemplo. */
import { $, $$, motionOK } from "./app.js";

const FONDOS = [["Crema", "#F4EFE6"], ["Blanco", "#FAF8F3"], ["Piedra", "#BDB8B0"], ["Salvia", "#A9B59B"], ["Rosa", "#E7CBC4"], ["Azul noche", "#26304A"], ["Negro", "#1E1E22"]];
const TEXTOS = [["Oro", "#B8935A"], ["Negro", "#22201E"], ["Blanco", "#F7F4EE"], ["Terracota", "#C07A58"], ["Verde oliva", "#5E6E52"], ["Burdeos", "#7E2E36"]];
const color = { fondo: "Crema", texto: "Oro" };
const hexDe = (lista, n) => (lista.find((c) => c[0] === n) || lista[0])[1];

const DIAS = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function datos() {
  const f = $("#invForm");
  const v = (n) => (f.elements[n].value || "").trim();
  const fecha = v("fecha") || "2027-06-12";
  const [y, m, d] = fecha.split("-");
  let largo = "";
  try { largo = DIAS.format(new Date(`${fecha}T12:00:00Z`)); } catch { largo = fecha; }
  largo = largo.charAt(0).toUpperCase() + largo.slice(1);
  const h1 = v("h1") || "12:30", h2 = v("h2") || "14:00";
  const ciudad = v("ciudad");
  return {
    uno: v("uno") || "Nico", dos: v("dos") || "Eunice", lema: v("lema") || "Nos casamos",
    ciudad, frase: v("frase"),
    fechaTexto: largo, fechaCorta: `${d} · ${m} · ${y}`,
    inicio: `${fecha}T${h1}:00+02:00`,
    eventos: [
      { hora: h1, lugar: v("l1") || "Ceremonia", direccion: ciudad },
      { hora: h2, lugar: v("l2") || "Celebración", direccion: ciudad },
    ],
    fondo: hexDe(FONDOS, color.fondo), texto: hexDe(TEXTOS, color.texto),
    // En la web, el dorado se cambia por el color del texto (si es claro, se queda el dorado)
    acento: ["Blanco"].includes(color.texto) ? "#A8844E" : hexDe(TEXTOS, color.texto),
  };
}

/* ---------- Colores ---------- */
function renderColors() {
  const fila = (id, label, lista) => `
    <div class="nfc-color-row">
      <span class="nfc-color-label">${label} <b data-color-name="${id}">${color[id]}</b></span>
      <div class="nfc-swatches" role="radiogroup" aria-label="${label}">
        ${lista.map(([n, c]) => `<button type="button" role="radio" class="sw" style="--sw:${c}" data-group="${id}" data-color="${n}" aria-label="${n}" aria-checked="${n === color[id]}"></button>`).join("")}
      </div>
    </div>`;
  $("#invColors").insertAdjacentHTML("beforeend", fila("fondo", "Fondo", FONDOS) + fila("texto", "Texto y dibujo", TEXTOS));
  $("#invColors").addEventListener("click", (e) => {
    const sw = e.target.closest(".sw");
    if (!sw) return;
    color[sw.dataset.group] = sw.dataset.color;
    $$(`.sw[data-group="${sw.dataset.group}"]`).forEach((b) => b.setAttribute("aria-checked", String(b === sw)));
    $(`[data-color-name="${sw.dataset.group}"]`).textContent = sw.dataset.color;
    actualizar();
  });
}

/* ---------- Tarjeta 3D y web ---------- */
let viewer = null, pendiente = 0;
const frame = $("#invFrame");

function enviarWeb() {
  // Si la web aún no ha cargado, el mensaje se pierde, pero ella avisa al estar lista y se reenvía
  if (!frame.contentWindow) return;
  frame.contentWindow.postMessage({ tipo: "invitacion", datos: datos() }, location.origin);
}
function actualizar() {
  // Se agrupan los cambios: como mucho uno por fotograma
  if (pendiente) return;
  pendiente = requestAnimationFrame(() => {
    pendiente = 0;
    const d = datos();
    viewer?.set(d);
    enviarWeb();
  });
}
addEventListener("message", (e) => {
  if (e.origin === location.origin && e.data?.tipo === "invitacion-lista") enviarWeb();
});
frame.addEventListener("load", enviarWeb);

function initViewer() {
  const stage = $("#invStage");
  const hasGL = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } })();
  if (!hasGL) { stage.classList.add("no-3d"); return; }
  const start = async () => {
    stage.classList.add("is-loading");
    try {
      const { createInvitacionViewer } = await import("./invitacion-viewer.js");
      viewer = await createInvitacionViewer(stage, datos(), { reduced: !motionOK() });
      // Si se pulsó «Ver el NFC» mientras cargaba, se aplica ahora
      viewer.verNfc($("#invNfc").getAttribute("aria-pressed") === "true");
      stage.classList.add("is-ready");
    } catch (err) {
      console.error("[3DOCNA] No se pudo cargar la tarjeta 3D:", err);
      stage.classList.add("no-3d");
    } finally {
      stage.classList.remove("is-loading");
    }
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); start(); } }, { rootMargin: "300px" });
    io.observe(stage);
  } else start();
  $("#invNfc").addEventListener("click", (e) => {
    const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
    e.currentTarget.setAttribute("aria-pressed", String(on));
    e.currentTarget.textContent = on ? "Ocultar el NFC" : "Ver el NFC por dentro";
    viewer?.verNfc(on);
  });
}

/* ---------- Móvil: el iframe es un teléfono de 390 px escalado al hueco ---------- */
function initPhone() {
  const phone = $("#invPhone");
  const fit = () => phone.style.setProperty("--k", (phone.clientWidth / 390).toFixed(4));
  new ResizeObserver(fit).observe(phone);
  fit();
}

/* ---------- Pestañas (en móvil se ve una vista cada vez) ---------- */
function initTabs() {
  const tabs = $$(".inv-tabs [role=tab]");
  const pick = (t) => {
    tabs.forEach((b) => b.setAttribute("aria-selected", String(b === t)));
    $(".inv-panes").dataset.vista = t.id === "tabWeb" ? "web" : "card";
  };
  tabs.forEach((t) => t.addEventListener("click", () => pick(t)));
  pick(tabs[0]);
}

function main() {
  // Fuentes de la invitación (alojadas aquí): Cormorant Garamond sustituye a Gabriola donde no está instalada
  const css = document.createElement("link");
  css.rel = "stylesheet"; css.href = "/invitaciones/assets/fuentes.css";
  document.head.append(css);
  renderColors();
  const f = $("#invForm");
  f.addEventListener("input", actualizar);
  f.addEventListener("submit", (e) => e.preventDefault());
  f.addEventListener("reset", () => {
    color.fondo = "Crema"; color.texto = "Oro";
    $$(".sw").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.color === color[b.dataset.group])));
    $$("[data-color-name]").forEach((el) => (el.textContent = color[el.dataset.colorName]));
    setTimeout(actualizar, 0);
  });
  initTabs();
  initPhone();
  initViewer();
  enviarWeb(); // por si la web ya había cargado antes que este script
}
main();
