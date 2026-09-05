/* ═══════════════════════════════════════════════
   3DOCNA — Configurador del farol calado
   Precio en vivo + enlace de WhatsApp prerellenado
   ═══════════════════════════════════════════════ */

"use strict";

(function () {

  var PRECIOS = { casa: 20.00, escaparate: 45.00 };
  var PRECIO_VELA = 3.00;
  var WA = "https://wa.me/34694455979?text=";

  var form = document.getElementById("cfgForm");
  if (!form) return;

  var elNombre = document.getElementById("cfgNombre");
  var elTamano = document.getElementById("cfgTamano");
  var elCant   = document.getElementById("cfgCantidad");
  var elVela   = document.getElementById("cfgVela");

  var outUnit  = document.getElementById("cfgUnit");
  var outQty   = document.getElementById("cfgQty");
  var outTotal = document.getElementById("cfgTotal");
  var outSvg   = document.getElementById("cfgSvgText");
  var outWa    = document.getElementById("cfgWa");

  function euros(n) { return n.toFixed(2).replace(".", ",") + "€"; }

  function limpiar(txt) {
    return txt.toUpperCase().replace(/\s+/g, " ").trim().slice(0, 16);
  }

  function actualizar() {
    var nombre = limpiar(elNombre.value);
    var tamano = elTamano.value;
    var cantidad = Math.max(1, Math.min(50, parseInt(elCant.value, 10) || 1));
    var vela = elVela.checked;

    var unidad = (PRECIOS[tamano] || PRECIOS.casa) + (vela ? PRECIO_VELA : 0);
    var total = unidad * cantidad;

    outUnit.textContent = euros(unidad);
    outQty.textContent = String(cantidad);
    outTotal.textContent = euros(total);

    // Vista previa: el texto se encoge para que quepa en el farol
    outSvg.textContent = nombre || "TU NOMBRE";
    var size = nombre.length > 11 ? 10 : nombre.length > 7 ? 13 : 16;
    outSvg.setAttribute("font-size", String(size));
    outSvg.setAttribute("opacity", nombre ? "1" : "0.45");

    var etiquetaTamano = tamano === "escaparate"
      ? "escaparate (22 cm)"
      : "casa (12 cm)";

    var msg =
      "Hola! Quiero pedir un farol calado.\n" +
      "• Texto: " + (nombre || "(por decidir)") + "\n" +
      "• Tamaño: " + etiquetaTamano + "\n" +
      "• Unidades: " + cantidad + "\n" +
      "• Vela LED: " + (vela ? "sí" : "no") + "\n" +
      "• Total estimado: " + euros(total);

    outWa.href = WA + encodeURIComponent(msg);
  }

  ["input", "change"].forEach(function (ev) {
    form.addEventListener(ev, actualizar);
  });

  // No recargar la página si alguien pulsa Enter
  form.addEventListener("submit", function (e) { e.preventDefault(); });

  actualizar();

})();
