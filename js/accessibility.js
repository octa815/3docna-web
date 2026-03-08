/* ═══════════════════════════════════════════════
   3DOCNA — Accessibility Controls
   Language switcher, contrast modes, font size
   ═══════════════════════════════════════════════ */

"use strict";

document.addEventListener("DOMContentLoaded", function () {

  // ── TRANSLATIONS ──
  var translations = {
    es: {
      "nav.catalogo": "Catálogo",
      "nav.pedido": "Pedido",
      "nav.contacto": "Contacto",
      "nav.cta": "Pedir ahora",
      "hero.tag": "Catálogo 2025 · Impresión 3D",
      "hero.line1": "DISEÑO",
      "hero.line2": "IMPRESO.",
      "hero.sub": "Creamos objetos únicos con tecnología de impresión 3D. Desde piezas decorativas hasta accesorios personalizados — si lo imaginas, lo imprimimos.",
      "hero.btn1": "Ver catálogo",
      "hero.btn2": "Pedido custom",
      "stat.productos": "Productos",
      "stat.entrega": "Entrega",
      "stat.custom": "Custom",
      "mat.label": "Materiales disponibles",
      "cat.title.pre": "Nuestros ",
      "cat.title.em": "Productos",
      "cat.viewall": "Solicitar todo el catálogo →",
      "tab.todos": "Todos",
      "tab.llaveros": "Llaveros",
      "tab.decoracion": "Decoración",
      "tab.figuras": "Figuras",
      "tab.accesorios": "Accesorios",
      "custom.title": "¿Tienes algo<br>en <em>mente</em>?",
      "custom.desc": "Imprimimos cualquier diseño que nos envíes. Sube tu archivo STL o compártenos tu idea — nosotros lo hacemos realidad.",
      "custom.step1.title": "Comparte tu idea",
      "custom.step1.desc": "Envíanos un archivo STL, imagen de referencia o simplemente descríbenos qué quieres.",
      "custom.step2.title": "Presupuesto en 24h",
      "custom.step2.desc": "Te enviamos precio, material recomendado y tiempo estimado de impresión.",
      "custom.step3.title": "Producción y envío",
      "custom.step3.desc": "Confirmado el pedido, imprimimos y enviamos en 24–48 horas.",
      "custom.from": "Pedidos custom desde",
      "form.title.pre": "Solicita tu ",
      "form.title.em": "presupuesto",
      "form.desc": "Rellena el formulario y te respondemos en menos de 24h con precio y plazo de entrega.",
      "form.nombre": "Nombre *",
      "form.email": "Email *",
      "form.telefono": "Teléfono",
      "form.tipo": "Tipo de producto *",
      "form.material": "Material preferido",
      "form.color": "Color deseado",
      "form.cantidad": "Cantidad",
      "form.descripcion": "Descripción del pedido *",
      "form.submit": "Enviar solicitud →",
      "form.note": "Recibirás respuesta en menos de 24h · Sin compromiso",
      "cta.title": "¿Listo para<br><em>imprimir</em>?",
      "cta.sub": "Escríbenos por el canal que prefieras. Respondemos en menos de 24 horas con presupuesto incluido.",
      "footer.info": "Catálogo 2025 · Impresión 3D personalizada · España",
      "footer.legal": "Precios sin IVA. Sujetos a cambios.",
      "a11y.title": "Accesibilidad",
      "a11y.lang": "Idioma",
      "a11y.contrast": "Contraste",
      "a11y.fontsize": "Tamaño texto",
      "a11y.motion": "Animaciones",
      "a11y.motion.on": "Sí",
      "a11y.motion.off": "No",
      "wa.label": "¿Hablamos?"
    },
    en: {
      "nav.catalogo": "Catalog",
      "nav.pedido": "Order",
      "nav.contacto": "Contact",
      "nav.cta": "Order now",
      "hero.tag": "Catalog 2025 · 3D Printing",
      "hero.line1": "DESIGN",
      "hero.line2": "PRINTED.",
      "hero.sub": "We create unique objects with 3D printing technology. From decorative pieces to custom accessories — if you imagine it, we print it.",
      "hero.btn1": "View catalog",
      "hero.btn2": "Custom order",
      "stat.productos": "Products",
      "stat.entrega": "Delivery",
      "stat.custom": "Custom",
      "mat.label": "Available materials",
      "cat.title.pre": "Our ",
      "cat.title.em": "Products",
      "cat.viewall": "Request full catalog →",
      "tab.todos": "All",
      "tab.llaveros": "Keychains",
      "tab.decoracion": "Decoration",
      "tab.figuras": "Figures",
      "tab.accesorios": "Accessories",
      "custom.title": "Have something<br>in <em>mind</em>?",
      "custom.desc": "We print any design you send us. Upload your STL file or share your idea — we make it real.",
      "custom.step1.title": "Share your idea",
      "custom.step1.desc": "Send us an STL file, reference image, or simply describe what you want.",
      "custom.step2.title": "Quote in 24h",
      "custom.step2.desc": "We send you pricing, recommended material, and estimated print time.",
      "custom.step3.title": "Production & shipping",
      "custom.step3.desc": "Once confirmed, we print and ship within 24–48 hours.",
      "custom.from": "Custom orders from",
      "form.title.pre": "Request a ",
      "form.title.em": "quote",
      "form.desc": "Fill out the form and we'll respond within 24h with pricing and delivery time.",
      "form.nombre": "Name *",
      "form.email": "Email *",
      "form.telefono": "Phone",
      "form.tipo": "Product type *",
      "form.material": "Preferred material",
      "form.color": "Desired color",
      "form.cantidad": "Quantity",
      "form.descripcion": "Order description *",
      "form.submit": "Send request →",
      "form.note": "You'll receive a response within 24h · No commitment",
      "cta.title": "Ready to<br><em>print</em>?",
      "cta.sub": "Write to us through your preferred channel. We respond within 24 hours with a quote included.",
      "footer.info": "Catalog 2025 · Custom 3D printing · Spain",
      "footer.legal": "Prices without VAT. Subject to change.",
      "a11y.title": "Accessibility",
      "a11y.lang": "Language",
      "a11y.contrast": "Contrast",
      "a11y.fontsize": "Font size",
      "a11y.motion": "Animations",
      "a11y.motion.on": "Yes",
      "a11y.motion.off": "No",
      "wa.label": "Let's talk?"
    }
  };

  var currentLang = localStorage.getItem("3docna-lang") || "es";

  // ── APPLY TRANSLATIONS ──
  function applyTranslations(lang) {
    var dict = translations[lang];
    if (!dict) return;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key]) {
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
          el.placeholder = dict[key];
        } else {
          el.innerHTML = dict[key];
        }
      }
    });

    document.documentElement.lang = lang;
    currentLang = lang;
    localStorage.setItem("3docna-lang", lang);

    // Update active state on lang buttons
    document.querySelectorAll("[data-lang]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });
  }

  // ── ACCESSIBILITY PANEL TOGGLE ──
  var toggleBtn = document.querySelector(".accessibility-toggle");
  var panel = document.querySelector(".accessibility-panel");

  if (toggleBtn && panel) {
    toggleBtn.addEventListener("click", function () {
      var isOpen = panel.classList.toggle("open");
      toggleBtn.setAttribute("aria-expanded", isOpen);
    });

    // Close panel on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains("open")) {
        panel.classList.remove("open");
        toggleBtn.setAttribute("aria-expanded", "false");
        toggleBtn.focus();
      }
    });

    // Close panel on click outside
    document.addEventListener("click", function (e) {
      if (!panel.contains(e.target) && !toggleBtn.contains(e.target)) {
        panel.classList.remove("open");
        toggleBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  // ── LANGUAGE SWITCH ──
  document.querySelectorAll("[data-lang]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var lang = this.getAttribute("data-lang");
      applyTranslations(lang);
    });
  });

  // ── CONTRAST MODE ──
  var savedContrast = localStorage.getItem("3docna-contrast") || "default";

  function setContrast(mode) {
    document.documentElement.removeAttribute("data-contrast");
    if (mode !== "default") {
      document.documentElement.setAttribute("data-contrast", mode);
    }
    localStorage.setItem("3docna-contrast", mode);

    document.querySelectorAll("[data-contrast-mode]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-contrast-mode") === mode);
    });
  }

  document.querySelectorAll("[data-contrast-mode]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setContrast(this.getAttribute("data-contrast-mode"));
    });
  });

  // ── FONT SIZE ──
  var savedFontsize = localStorage.getItem("3docna-fontsize") || "normal";

  function setFontSize(size) {
    document.documentElement.setAttribute("data-fontsize", size);
    localStorage.setItem("3docna-fontsize", size);

    document.querySelectorAll("[data-fontsize-btn]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-fontsize-btn") === size);
    });
  }

  document.querySelectorAll("[data-fontsize-btn]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setFontSize(this.getAttribute("data-fontsize-btn"));
    });
  });

  // ── REDUCED MOTION ──
  var savedMotion = localStorage.getItem("3docna-motion") || "normal";

  function setMotion(mode) {
    if (mode === "reduced") {
      document.documentElement.setAttribute("data-motion", "reduced");
    } else {
      document.documentElement.removeAttribute("data-motion");
    }
    localStorage.setItem("3docna-motion", mode);

    document.querySelectorAll("[data-motion-btn]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-motion-btn") === mode);
    });
  }

  document.querySelectorAll("[data-motion-btn]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setMotion(this.getAttribute("data-motion-btn"));
    });
  });

  // ── RESTORE SAVED PREFERENCES ──
  setContrast(savedContrast);
  setFontSize(savedFontsize);
  setMotion(savedMotion);
  if (currentLang !== "es") {
    applyTranslations(currentLang);
  }

  // Init lang button active state
  document.querySelectorAll("[data-lang]").forEach(function (btn) {
    btn.classList.toggle("active", btn.getAttribute("data-lang") === currentLang);
  });

});
