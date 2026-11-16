/* 3DOCNA — web de ejemplo de invitación, en directo.
   La página «Invitaciones con NFC» le manda los datos que escribe el visitante y aquí se colocan
   en su sitio. Además, en la demo el formulario de asistencia no se envía de verdad. */
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (t) => { const d = document.createElement("div"); d.textContent = String(t ?? ""); return d.innerHTML; };
  const setTxt = (sel, t) => $$(sel).forEach((el) => (el.textContent = t));

  function aplicar(d) {
    const uno = d.uno || "Nico", dos = d.dos || "Eunice";
    const nombres = `${esc(uno)} <span class="amp">&amp;</span> ${esc(dos)}`;
    document.title = `${uno} & ${dos} · ${d.fechaTexto || ""}`;
    setTxt(".carta-lema, .portada-lema", d.lema || "");
    $$(".carta-nombres, .pie-nombres").forEach((el) => (el.innerHTML = nombres));
    setTxt(".carta-fecha, .portada-fecha, #cuenta .seccion-sub", d.fechaTexto || "");
    const sello = $(".sello span");
    if (sello) sello.innerHTML = `${esc(uno.trim()[0] || "")}<i class="amp">&amp;</i>${esc(dos.trim()[0] || "")}`;
    setTxt(".portada-txt .n1", uno);
    setTxt(".portada-txt .n2", dos);
    setTxt(".portada-ciudad", d.ciudad || "");
    setTxt(".portada-frase", d.frase || "");
    const cuenta = $(".cuenta");
    if (cuenta && d.inicio) cuenta.dataset.fecha = d.inicio;
    const evs = $$(".evento");
    (d.eventos || []).forEach((ev, i) => {
      const el = evs[i];
      if (!el) return;
      el.querySelector(".evento-hora").textContent = `${ev.hora} h`;
      el.querySelector(".evento-lugar").textContent = ev.lugar;
      el.querySelector(".evento-dir").textContent = ev.direccion || "";
    });
    const tag = $(".hashtag strong");
    if (tag) tag.textContent = `#${uno.replace(/\s+/g, "")}Y${dos.replace(/\s+/g, "")}${(d.inicio || "").slice(0, 4)}`;
    // El color del texto de la tarjeta tiñe también los detalles dorados de la web
    if (d.acento) {
      document.documentElement.style.setProperty("--oro", d.acento);
      document.documentElement.style.setProperty("--oro-claro", `color-mix(in srgb, ${d.acento} 55%, #fff)`);
    }
  }

  addEventListener("message", (e) => {
    if (e.origin !== location.origin || !e.data || e.data.tipo !== "invitacion") return;
    aplicar(e.data.datos);
  });

  // Demo: la confirmación no sale de aquí
  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (!form.matches?.(".rsvp[data-demo]")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const gracias = $(".rsvp-gracias");
    form.hidden = true;
    gracias.hidden = false;
    const nombre = (form.nombre.value || "").trim().split(" ")[0];
    gracias.querySelector("p:last-child").textContent =
      `Así le llegaría la confirmación a los novios${nombre ? ", " + nombre : ""}. (En esta demo no se envía nada.)`;
  }, true);

  // Avisa a la página de fuera de que ya puede mandar datos
  addEventListener("DOMContentLoaded", () => parent !== window && parent.postMessage({ tipo: "invitacion-lista" }, location.origin));
})();
