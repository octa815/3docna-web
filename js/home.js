/* 3DOCNA — portada: cuenta atrás de la campaña. El resto de la portada es HTML y CSS. */
import { $ } from "./app.js";

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
