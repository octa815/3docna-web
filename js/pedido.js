/* 3DOCNA — formulario de pedido: resumen de la cesta, validación y confirmación */
import { $, $$, euros, getCart, cartTotal, renderCart } from "./app.js";

const form = $("#orderForm");
const ok = $("#orderOk");
const params = new URLSearchParams(location.search);

if (form) {
  // Vuelta desde FormSubmit tras enviar
  if (params.has("ok") || params.get("success") === "true") {
    form.hidden = true;
    ok.hidden = false;
    try { localStorage.removeItem("3docna_cart"); } catch {}
    renderCart();
    setTimeout(() => ok.focus(), 300);
  }

  // Si se llega desde "Presupuesto" de un producto, se rellena la descripción
  const pieza = params.get("pieza");
  if (pieza) {
    $("#f-desc").value = `Me interesa: ${pieza}.\n`;
    $("#f-tipo").value = "Producto del catálogo";
  }

  const summary = $("#cartSummary");
  const hidden = $("#cartHidden");
  function paintSummary() {
    const cart = getCart();
    if (!cart.length) { summary.hidden = true; hidden.value = ""; return; }
    summary.hidden = false;
    summary.innerHTML = `<h3>Tu cesta</h3><ul>${cart.map((i) => `<li><span>${i.qty} × ${i.name.replace(/</g, "&lt;")}</span><span>${euros(i.price * i.qty)}</span></li>`).join("")}<li class="sum-total"><span>Total estimado</span><span>${euros(cartTotal(cart))}</span></li></ul>`;
    hidden.value = cart.map((i) => `${i.qty} × ${i.name} (${euros(i.price)}/ud.)`).join(" | ") + ` — Total estimado: ${euros(cartTotal(cart))}`;
    if (!$("#f-tipo").value) $("#f-tipo").value = "Producto del catálogo";
  }
  paintSummary();
  document.addEventListener("cart:change", paintSummary);

  const rules = {
    "f-nombre": (v) => (v.trim().length >= 2 ? "" : "Dinos tu nombre."),
    "f-email": (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Revisa el email, parece que falta algo."),
    "f-tipo": (v) => (v ? "" : "Elige el tipo de pieza."),
    "f-desc": (v) => (v.trim().length >= 10 ? "" : "Cuéntanos un poco más (al menos una frase)."),
  };
  function check(id) {
    const input = $("#" + id);
    const msg = rules[id](input.value);
    const field = input.closest(".field");
    field.classList.toggle("is-invalid", Boolean(msg));
    $("[data-err]", field).textContent = msg;
    input.setAttribute("aria-invalid", String(Boolean(msg)));
    return !msg;
  }
  Object.keys(rules).forEach((id) => $("#" + id).addEventListener("blur", () => check(id)));

  form.addEventListener("submit", (e) => {
    const results = Object.keys(rules).map(check);
    const priv = $("#f-priv").checked;
    $("[data-err-priv]").textContent = priv ? "" : "Necesitamos que aceptes la política de privacidad para responderte.";
    if (results.includes(false) || !priv) {
      e.preventDefault();
      const first = $('[aria-invalid="true"]', form) || $("#f-priv");
      first.focus();
      return;
    }
    const btn = $("#orderSend");
    btn.disabled = true;
    $("span", btn).textContent = "Enviando…";
  });
}
