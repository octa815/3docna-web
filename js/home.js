/* 3DOCNA — portada: cuenta atrás de la campaña y la mascota que sigue al cursor.
   El resto de la portada es HTML y CSS. */
import { $, clamp, finePointer, motionOK } from "./app.js";

const cd = $(".countdown");
if (cd) {
  const end = new Date(cd.dataset.deadline).getTime();
  const tick = () => {
    const ms = end - Date.now();
    if (ms <= 0) { cd.innerHTML = '<div><b>Cerrado</b><span>pedidos de esta campaña</span></div>'; return; }
    const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
    $('[data-cd="d"]', cd).textContent = d;
    $('[data-cd="h"]', cd).textContent = String(h).padStart(2, "0");
    $('[data-cd="m"]', cd).textContent = String(m).padStart(2, "0");
    setTimeout(tick, 30000);
  };
  tick();
}

/* Mientras la mascota se imprime, el rótulo cuenta las capas (es decorativo: la figura va con aria-hidden) */
const spec = $(".hero-spec[data-spec]");
if (spec && motionOK()) {
  const LAYERS = 26, T0 = 250, DUR = 1500;
  const t0 = performance.now();
  const step = () => {
    const k = clamp(Math.ceil(((performance.now() - t0 - T0) / DUR) * LAYERS), 0, LAYERS);
    if (k >= LAYERS) { spec.textContent = spec.dataset.spec; return; }
    spec.textContent = `Imprimiendo · capa ${String(k).padStart(2, "0")}/${LAYERS}`;
    setTimeout(step, 60);
  };
  step();
}

/* Ordenador: la mascota se inclina hacia el cursor y una luz lo acompaña por la portada */
const hero = $(".hero");
const stage = $(".stage", hero || document);
const glow = $(".hero-glow", hero || document);
if (hero && stage && finePointer && motionOK()) {
  let raf = 0, x = 0, y = 0;
  const paint = () => {
    raf = 0;
    const r = hero.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    const dx = clamp((x - (s.left + s.width / 2)) / (r.width / 2), -1, 1);
    const dy = clamp((y - (s.top + s.height / 2)) / (r.height / 2), -1, 1);
    stage.style.setProperty("--ry", `${dx * 14}deg`);
    stage.style.setProperty("--rx", `${-dy * 10}deg`);
    if (glow) glow.style.transform = `translate3d(${x - r.left}px, ${y - r.top}px, 0)`;
  };
  hero.addEventListener("pointermove", (e) => {
    x = e.clientX; y = e.clientY;
    hero.classList.add("is-live"); stage.classList.add("is-live");
    if (!raf) raf = requestAnimationFrame(paint);
  }, { passive: true });
  hero.addEventListener("pointerleave", () => {
    hero.classList.remove("is-live"); stage.classList.remove("is-live");
    stage.style.removeProperty("--rx"); stage.style.removeProperty("--ry");
  });
}
