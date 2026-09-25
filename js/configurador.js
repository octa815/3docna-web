/* 3DOCNA — configurador del farol calado: precio en vivo, cesta y WhatsApp */
import { $, $$, euros, addToCart, WA, hasGsap, motionOK } from "./app.js";

const PRECIOS = { casa: 20, escaparate: 45 };
const VELA = 3;
const form = $("#cfgForm");

if (form) {
  const el = {
    nombre: $("#cfgNombre"), count: $("#cfgCount"), cant: $("#cfgCantidad"), vela: $("#cfgVela"),
    unit: $("#cfgUnit"), qty: $("#cfgQty"), total: $("#cfgTotal"), svg: $("#cfgSvgText"), wall: $("#cfgWall"),
    flame: $("#cfgFlame"), stage: $("#cfgStage"), wa: $("#cfgWa"), add: $("#cfgAdd"),
  };
  const limpiar = (t) => t.toUpperCase().replace(/\s+/g, " ").trimStart().slice(0, 16);
  let last = { total: 20 };

  function state() {
    const nombre = limpiar(el.nombre.value).trim();
    const size = $('input[name="size"]:checked', form).value;
    const cantidad = Math.max(1, Math.min(50, parseInt(el.cant.value, 10) || 1));
    const vela = el.vela.checked;
    const unidad = PRECIOS[size] + (vela ? VELA : 0);
    return { nombre, size, cantidad, vela, unidad, total: unidad * cantidad };
  }

  function update() {
    const s = state();
    el.count.textContent = s.nombre.length;
    el.unit.textContent = euros(s.unidad);
    el.qty.textContent = s.cantidad;
    // El total cuenta hasta el nuevo valor
    if (hasGsap && motionOK()) {
      const o = { v: last.total };
      window.gsap.to(o, { v: s.total, duration: 0.4, ease: "power2.out", onUpdate: () => (el.total.textContent = euros(o.v)) });
    } else el.total.textContent = euros(s.total);
    last = s;

    const txt = s.nombre || "TU NOMBRE";
    el.svg.textContent = txt;
    el.svg.setAttribute("font-size", s.nombre.length > 11 ? "9" : s.nombre.length > 7 ? "11" : "13");
    el.svg.setAttribute("opacity", s.nombre ? "1" : "0.5");
    el.wall.textContent = txt;
    el.flame.setAttribute("opacity", s.vela ? "1" : "0");
    el.stage.classList.toggle("is-lit", s.vela);

    const tam = s.size === "escaparate" ? "escaparate (22 cm)" : "casa (12 cm)";
    const msg = `Hola! Quiero pedir un farol calado.\n• Texto: ${s.nombre || "(por decidir)"}\n• Tamaño: ${tam}\n• Unidades: ${s.cantidad}\n• Vela LED: ${s.vela ? "sí" : "no"}\n• Total estimado: ${euros(s.total)}`;
    el.wa.href = WA + encodeURIComponent(msg);
  }

  $$("[data-step]", form).forEach((b) => b.addEventListener("click", () => {
    el.cant.value = Math.max(1, Math.min(50, (parseInt(el.cant.value, 10) || 1) + Number(b.dataset.step)));
    update();
  }));
  el.nombre.addEventListener("input", () => {
    const pos = el.nombre.selectionStart;
    el.nombre.value = limpiar(el.nombre.value);
    el.nombre.setSelectionRange(pos, pos);
  });
  ["input", "change"].forEach((ev) => form.addEventListener(ev, update));
  form.addEventListener("submit", (e) => e.preventDefault());

  el.add.addEventListener("click", () => {
    const s = state();
    const name = `Farol calado «${s.nombre || "por decidir"}» · ${s.size === "escaparate" ? "escaparate 22 cm" : "casa 12 cm"}${s.vela ? " · con vela LED" : ""}`;
    addToCart({ name, price: s.unidad, qty: s.cantidad }, el.add);
    $("span", el.add).textContent = "Añadido a la cesta";
    setTimeout(() => ($("span", el.add).textContent = "Añadir a la cesta"), 1600);
  });

  update();
}
