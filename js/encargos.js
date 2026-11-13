/* 3DOCNA — encargos: el vídeo se comporta como un GIF (en bucle y sin sonido),
   pero solo se descarga y se reproduce mientras está en pantalla. */
import { $$, motionOK } from "./app.js";

$$(".work-video").forEach((v) => {
  const box = v.closest(".work");
  const play = () => { const p = v.play(); if (p) p.catch(() => {}); box?.classList.add("is-playing"); };
  const stop = () => { v.pause(); box?.classList.remove("is-playing"); };

  // Sin animaciones: no arranca solo; se reproduce al tocarlo, con los controles del navegador
  if (!motionOK() || !("IntersectionObserver" in window)) {
    v.controls = true;
    return;
  }
  new IntersectionObserver(([e]) => (e.isIntersecting ? play() : stop()), { threshold: 0.35 }).observe(v);
  // Un toque también lo pausa o lo reanuda
  v.addEventListener("click", () => (v.paused ? play() : stop()));
});
