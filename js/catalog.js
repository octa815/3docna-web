/* ═══════════════════════════════════════════════
   3DOCNA — Catálogo dinámico
   Lee data/productos.json y pinta las tarjetas.
   Para añadir un producto NO se toca este archivo:
   se edita data/productos.json. Ver img/README.md
   ═══════════════════════════════════════════════ */

"use strict";

(function () {

  var DATA_URL = "data/productos.json";

  // ── Dibujos de relleno mientras no haya foto real ──
  // Usan variables CSS, así que respetan el modo de contraste.
  var ICONS = {
    farol:
      '<path d="M62 34h36M70 34v-8h20v8" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
      '<path d="M56 40h48l8 70a10 10 0 0 1-10 11H58a10 10 0 0 1-10-11z" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
      '<ellipse cx="80" cy="80" rx="22" ry="26" fill="var(--neon)" opacity="0.10"/>' +
      '<path d="M68 72c4-6 8-6 12 0s8 6 12 0" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
      '<circle cx="72" cy="92" r="3.5" fill="var(--neon2)"/><circle cx="88" cy="92" r="3.5" fill="var(--neon2)"/>' +
      '<text x="80" y="145" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">TU NOMBRE</text>',
    escaparate:
      '<rect x="24" y="26" width="112" height="84" rx="4" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
      '<line x1="24" y1="42" x2="136" y2="42" stroke="var(--neon)" stroke-width="1.5" opacity="0.5"/>' +
      '<circle cx="52" cy="76" r="14" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
      '<rect x="78" y="62" width="34" height="28" rx="3" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
      '<line x1="40" y1="110" x2="40" y2="126" stroke="var(--neon)" stroke-width="1.5" opacity="0.4"/>' +
      '<line x1="120" y1="110" x2="120" y2="126" stroke="var(--neon)" stroke-width="1.5" opacity="0.4"/>' +
      '<text x="80" y="145" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">ESCAPARATE</text>',
    cuenco:
      '<path d="M34 62h92l-10 44a16 16 0 0 1-16 12H60a16 16 0 0 1-16-12z" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
      '<ellipse cx="80" cy="62" rx="46" ry="10" fill="none" stroke="var(--neon)" stroke-width="2"/>' +
      '<circle cx="64" cy="50" r="7" fill="var(--neon2)" opacity="0.5"/>' +
      '<circle cx="82" cy="44" r="8" fill="var(--neon)" opacity="0.4"/>' +
      '<circle cx="98" cy="52" r="6" fill="var(--neon2)" opacity="0.5"/>' +
      '<text x="80" y="146" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">CON TU APELLIDO</text>',
    colgantes:
      '<line x1="20" y1="30" x2="140" y2="30" stroke="var(--neon)" stroke-width="1.5" opacity="0.5"/>' +
      '<line x1="46" y1="30" x2="46" y2="52" stroke="var(--neon)" stroke-width="1"/>' +
      '<line x1="80" y1="30" x2="80" y2="70" stroke="var(--neon)" stroke-width="1"/>' +
      '<line x1="114" y1="30" x2="114" y2="46" stroke="var(--neon)" stroke-width="1"/>' +
      '<path d="M28 62c8-10 12 2 18-4 6 6 10-6 18 4-6 4-10 10-18 10s-12-6-18-10z" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
      '<circle cx="80" cy="80" r="9" fill="none" stroke="var(--neon)" stroke-width="2"/>' +
      '<path d="M71 74l-8-6M89 74l8-6M71 86l-8 6M89 86l8 6" stroke="var(--neon)" stroke-width="1.5"/>' +
      '<path d="M96 56c8-10 12 2 18-4 6 6 10-6 18 4-6 4-10 10-18 10s-12-6-18-10z" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
      '<text x="80" y="146" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">PACK DE 12</text>',
    carta:
      '<path d="M46 118V54l34-16 34 16v64z" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
      '<rect x="64" y="62" width="32" height="32" rx="2" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
      '<rect x="70" y="68" width="8" height="8" fill="var(--neon2)"/><rect x="82" y="68" width="8" height="8" fill="var(--neon2)"/>' +
      '<rect x="70" y="80" width="8" height="8" fill="var(--neon2)"/><rect x="84" y="82" width="5" height="5" fill="var(--neon2)"/>' +
      '<line x1="58" y1="106" x2="102" y2="106" stroke="var(--neon)" stroke-width="2" opacity="0.6"/>' +
      '<text x="80" y="146" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">TU LOGO AQUÍ</text>',
    base:
      '<rect x="34" y="96" width="92" height="18" rx="3" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
      '<rect x="52" y="40" width="56" height="52" rx="3" fill="none" stroke="var(--neon2)" stroke-width="2.5" stroke-dasharray="6,4"/>' +
      '<path d="M108 66h18M120 60l6 6-6 6" stroke="var(--neon)" stroke-width="2" fill="none"/>' +
      '<rect x="24" y="52" width="22" height="28" rx="2" fill="var(--neon)" opacity="0.15"/>' +
      '<text x="80" y="140" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">FRONTAL INTERCAMBIABLE</text>',
    expositor:
      '<path d="M32 112h96" stroke="var(--neon)" stroke-width="2.5"/>' +
      '<path d="M44 112V88h28v24M72 112V70h28v42M100 112V52h20v60" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
      '<circle cx="58" cy="78" r="6" fill="var(--neon2)" opacity="0.6"/>' +
      '<circle cx="86" cy="60" r="6" fill="var(--neon2)" opacity="0.6"/>' +
      '<circle cx="110" cy="42" r="6" fill="var(--neon2)" opacity="0.6"/>' +
      '<text x="80" y="142" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">A MEDIDA</text>',
    litofania:
      '<rect x="40" y="28" width="80" height="86" rx="3" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
      '<rect x="50" y="38" width="60" height="66" rx="2" fill="var(--neon)" opacity="0.08"/>' +
      '<circle cx="80" cy="62" r="14" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
      '<path d="M56 100c6-16 16-22 24-22s18 6 24 22" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
      '<path d="M22 60h10M22 72h10M128 60h10M128 72h10" stroke="var(--neon)" stroke-width="2" opacity="0.5"/>' +
      '<text x="80" y="142" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">TU FOTO</text>',
    organizador:
      '<rect x="26" y="44" width="108" height="70" rx="3" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
      '<line x1="62" y1="44" x2="62" y2="114" stroke="var(--neon)" stroke-width="1.5"/>' +
      '<line x1="98" y1="44" x2="98" y2="114" stroke="var(--neon)" stroke-width="1.5"/>' +
      '<line x1="62" y1="80" x2="134" y2="80" stroke="var(--neon)" stroke-width="1.5"/>' +
      '<rect x="34" y="52" width="20" height="54" rx="2" fill="var(--neon2)" opacity="0.18"/>' +
      '<path d="M26 32h108M26 26v12M134 26v12" stroke="var(--neon2)" stroke-width="1.5"/>' +
      '<text x="80" y="140" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">TUS MEDIDAS</text>',
    moto:
      '<circle cx="42" cy="94" r="20" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
      '<circle cx="118" cy="94" r="20" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
      '<path d="M42 94l22-30h26l12 30M64 64h34M90 64l16 30" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
      '<rect x="76" y="30" width="26" height="20" rx="3" fill="none" stroke="var(--neon2)" stroke-width="2.5"/>' +
      '<line x1="89" y1="50" x2="89" y2="62" stroke="var(--neon2)" stroke-width="2.5"/>' +
      '<text x="80" y="140" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">PARA TU MODELO</text>',
    pieza:
      '<path d="M80 34l10 6h12l4 11 10 7-2 12 6 11-8 9 1 12-12 3-6 11-12-3-11 6-8-9-12-1-2-12-9-8 5-11-4-12 11-5 5-11z" fill="none" stroke="var(--neon)" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<circle cx="80" cy="78" r="18" fill="none" stroke="var(--neon2)" stroke-width="2.5"/>' +
      '<circle cx="80" cy="78" r="6" fill="var(--neon2)" opacity="0.4"/>' +
      '<text x="80" y="140" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">LA REPRODUCIMOS</text>',
    generico:
      '<rect x="40" y="46" width="80" height="68" rx="4" fill="none" stroke="var(--neon)" stroke-width="2.5"/>' +
      '<path d="M40 92l22-20 18 16 14-12 26 22" fill="none" stroke="var(--neon2)" stroke-width="2"/>' +
      '<circle cx="64" cy="66" r="7" fill="var(--neon)" opacity="0.5"/>' +
      '<text x="80" y="140" text-anchor="middle" fill="var(--neon)" font-size="9" font-family="monospace" letter-spacing="2" opacity="0.75">3DOCNA</text>'
  };

  var BGS = ["img-bg-llave", "img-bg-deco", "img-bg-fig", "img-bg-mix"];

  function esc(str) {
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(String(str == null ? "" : str)));
    return d.innerHTML;
  }

  function euros(n) {
    return n.toFixed(2).replace(".", ",") + "€";
  }

  function placeholderSlide(prod, i) {
    var icon = ICONS[prod.icono] || ICONS.generico;
    return '<div class="carousel-slide ' + BGS[i % BGS.length] + '">' +
      '<svg width="220" height="160" viewBox="0 0 160 160" aria-hidden="true">' + icon + "</svg>" +
      "</div>";
  }

  function photoSlide(prod, src, i) {
    return '<div class="carousel-slide ' + BGS[i % BGS.length] + '">' +
      '<img src="' + esc(src) + '" alt="' + esc(prod.nombre) + '" loading="lazy" ' +
      'style="width:100%;height:100%;object-fit:cover;display:block;">' +
      "</div>";
  }

  function buildCard(prod) {
    var imgs = Array.isArray(prod.imgs) ? prod.imgs.filter(Boolean) : [];
    var slides = "";
    var count;

    if (imgs.length) {
      imgs.forEach(function (src, i) { slides += photoSlide(prod, src, i); });
      count = imgs.length;
    } else {
      slides = placeholderSlide(prod, 0);
      count = 1;
    }

    var dots = "";
    var arrows = "";
    if (count > 1) {
      for (var i = 0; i < count; i++) {
        dots += '<button class="dot' + (i === 0 ? " active" : "") +
          '" aria-label="Imagen ' + (i + 1) + '"></button>';
      }
      dots = '<div class="carousel-dots">' + dots + "</div>";
      arrows =
        '<button class="carousel-arrow prev" aria-label="Imagen anterior">&#8249;</button>' +
        '<button class="carousel-arrow next" aria-label="Imagen siguiente">&#8250;</button>';
    }

    var badge = prod.badge
      ? '<div class="product-badge' + (prod.badgeColor === "purple" ? " purple" : "") + '">' +
        esc(prod.badge) + "</div>"
      : "";

    var precioTxt = prod.precioTexto
      ? esc(prod.precioTexto)
      : (typeof prod.precio === "number" ? euros(prod.precio) : "Consultar");
    var unidad = prod.unidad ? " <span>" + esc(prod.unidad) + "</span>" : "";

    var accion;
    if (typeof prod.precio === "number") {
      accion = '<button class="add-btn" aria-label="Añadir ' + esc(prod.nombre) +
        ' a la consulta">+</button>';
    } else {
      accion = '<a href="pedido.html" class="add-btn" style="text-decoration:none;display:grid;place-items:center;" ' +
        'aria-label="Pedir presupuesto de ' + esc(prod.nombre) + '">→</a>';
    }

    var priceAttr = typeof prod.precio === "number" ? prod.precio.toFixed(2) : "";

    return '<article class="product-card' + (prod.wide ? " card-wide" : "") + '"' +
      ' data-category="' + esc(prod.categoria) + '"' +
      ' data-name="' + esc(prod.nombre) + '"' +
      ' data-price="' + priceAttr + '">' +
      '<div class="product-img-carousel">' +
        '<div class="carousel-track">' + slides + "</div>" +
        badge + dots + arrows +
      "</div>" +
      '<div class="product-info">' +
        '<div class="product-cat">' + esc(prod.catLabel || "") + "</div>" +
        '<h3 class="product-name">' + esc(prod.nombre) + "</h3>" +
        '<p class="product-desc">' + esc(prod.desc || "") + "</p>" +
        '<div class="product-footer">' +
          '<div class="product-price">' + precioTxt + unidad + "</div>" +
          accion +
        "</div>" +
      "</div>" +
    "</article>";
  }

  function render(grid, productos) {
    grid.innerHTML = productos.map(buildCard).join("");
    if (window.DOCNA && window.DOCNA.initProductUI) {
      window.DOCNA.initProductUI(grid);
    }
  }

  function renderTabs(container, categorias) {
    container.innerHTML = categorias.map(function (c, i) {
      return '<button class="cat-tab' + (i === 0 ? " active" : "") +
        '" data-filter="' + esc(c.id) + '" role="tab" aria-selected="' +
        (i === 0 ? "true" : "false") + '">' + esc(c.label) + "</button>";
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var grids = document.querySelectorAll("[data-catalog]");
    if (!grids.length) return;

    fetch(DATA_URL, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var productos = data.productos || [];

        var tabsEl = document.querySelector("[data-catalog-tabs]");
        if (tabsEl && data.categorias) renderTabs(tabsEl, data.categorias);

        grids.forEach(function (grid) {
          var lista = productos;
          if (grid.getAttribute("data-catalog") === "destacados") {
            lista = productos.filter(function (p) { return p.destacado; });
          }
          var limite = parseInt(grid.getAttribute("data-limit"), 10);
          if (!isNaN(limite)) lista = lista.slice(0, limite);
          render(grid, lista);
        });
      })
      .catch(function (err) {
        console.error("[3DOCNA] No se pudo cargar el catálogo:", err);
        grids.forEach(function (grid) {
          grid.innerHTML =
            '<p style="grid-column:1/-1;color:var(--muted);padding:40px 0;text-align:center;">' +
            "No hemos podido cargar el catálogo. " +
            '<a href="pedido.html" style="color:var(--neon)">Pide presupuesto por aquí</a>.</p>';
        });
      });
  });

})();
