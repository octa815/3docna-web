/* ═══════════════════════════════════════════════
   3DOCNA — Main JavaScript
   Interactions, scroll reveal, form handling
   ═══════════════════════════════════════════════ */

"use strict";

document.addEventListener("DOMContentLoaded", function () {

  // ── SCROLL REVEAL (IntersectionObserver) ──
  var revealObserver = null;
  if ("IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
  }

  // Red de seguridad: si el observador no llega a dispararse (impresión,
  // capturas, navegadores raros), a los 2,5 s se muestra todo igualmente.
  function forzarVisible() {
    document.querySelectorAll("[data-reveal-init]").forEach(function (el) {
      if (getComputedStyle(el).opacity !== "1") {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }
    });
  }

  function initReveal(scope) {
    var root = scope || document;
    var els = root.querySelectorAll(".product-card, .step, .stat, .contact-chip");
    els.forEach(function (el) {
      if (el.dataset.revealInit) return;
      el.dataset.revealInit = "1";
      if (!revealObserver) return;
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      revealObserver.observe(el);
    });
    setTimeout(forzarVisible, 6000);
  }

  // ── CATEGORY TAB FILTERING (delegado: funciona con tarjetas dinámicas) ──
  document.addEventListener("click", function (e) {
    var tab = e.target.closest && e.target.closest(".cat-tab");
    if (!tab) return;

    var group = tab.parentElement;
    group.querySelectorAll(".cat-tab").forEach(function (t) {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");

    var category = tab.getAttribute("data-filter");
    document.querySelectorAll("[data-category]").forEach(function (card) {
      if (!category || category === "todos") {
        card.style.display = "";
      } else {
        card.style.display = card.getAttribute("data-category") === category ? "" : "none";
      }
    });
  });

  // ── HEX GRID INTERACTION ──
  var hexes = document.querySelectorAll(".hex");
  hexes.forEach(function (hex) {
    hex.addEventListener("click", function () {
      hexes.forEach(function (h) { h.classList.remove("active"); });
      hex.classList.add("active");
    });
  });

  // ── SHOPPING CART (localStorage) ──
  function getCart() {
    try { return JSON.parse(localStorage.getItem("3docna_cart")) || []; }
    catch (e) { return []; }
  }
  function saveCart(cart) {
    localStorage.setItem("3docna_cart", JSON.stringify(cart));
  }

  // Update badge count
  function updateCartBadge() {
    var cart = getCart();
    var total = 0;
    cart.forEach(function (item) { total += item.qty; });
    document.querySelectorAll(".cart-count").forEach(function (badge) {
      badge.textContent = total;
      badge.classList.toggle("visible", total > 0);
    });
  }

  // Render cart drawer
  function renderCartDrawer() {
    var cart = getCart();
    var itemsEl = document.getElementById("cartItems");
    var footerEl = document.getElementById("cartFooter");
    if (!itemsEl) return;

    if (cart.length === 0) {
      itemsEl.innerHTML = '<p class="cart-empty">Tu cesta está vacía</p>';
      if (footerEl) footerEl.style.display = "none";
      return;
    }

    var html = "";
    var grandTotal = 0;
    cart.forEach(function (item, idx) {
      var lineTotal = item.price * item.qty;
      grandTotal += lineTotal;
      html += '<div class="cart-item">' +
        '<div class="cart-item-info">' +
          '<div class="cart-item-name">' + escapeHtml(item.name) + '</div>' +
          '<div class="cart-item-price">' + item.price.toFixed(2).replace(".", ",") + '€</div>' +
        '</div>' +
        '<div class="cart-item-qty">' +
          '<button aria-label="Quitar uno" data-cart-minus="' + idx + '">−</button>' +
          '<span>' + item.qty + '</span>' +
          '<button aria-label="Añadir uno" data-cart-plus="' + idx + '">+</button>' +
        '</div>' +
        '<button class="cart-item-remove" aria-label="Eliminar" data-cart-remove="' + idx + '">✕</button>' +
      '</div>';
    });
    itemsEl.innerHTML = html;

    if (footerEl) {
      footerEl.style.display = "";
      var totalEl = document.getElementById("cartTotal");
      if (totalEl) totalEl.textContent = grandTotal.toFixed(2).replace(".", ",") + "€";
    }

    // Quantity buttons
    itemsEl.querySelectorAll("[data-cart-minus]").forEach(function (b) {
      b.addEventListener("click", function () {
        var c = getCart();
        var i = parseInt(this.getAttribute("data-cart-minus"), 10);
        if (c[i]) {
          c[i].qty--;
          if (c[i].qty <= 0) c.splice(i, 1);
          saveCart(c); renderCartDrawer(); updateCartBadge();
        }
      });
    });
    itemsEl.querySelectorAll("[data-cart-plus]").forEach(function (b) {
      b.addEventListener("click", function () {
        var c = getCart();
        var i = parseInt(this.getAttribute("data-cart-plus"), 10);
        if (c[i]) { c[i].qty++; saveCart(c); renderCartDrawer(); updateCartBadge(); }
      });
    });
    itemsEl.querySelectorAll("[data-cart-remove]").forEach(function (b) {
      b.addEventListener("click", function () {
        var c = getCart();
        var i = parseInt(this.getAttribute("data-cart-remove"), 10);
        c.splice(i, 1);
        saveCart(c); renderCartDrawer(); updateCartBadge();
      });
    });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // Add to cart (delegado: funciona con tarjetas dinámicas)
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("button.add-btn");
    if (!btn) return;

    var card = btn.closest(".product-card");
    if (!card) return;
    var name = card.getAttribute("data-name");
    var price = parseFloat(card.getAttribute("data-price"));
    if (!name || isNaN(price)) return;

    var cart = getCart();
    var found = false;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].name === name) { cart[i].qty++; found = true; break; }
    }
    if (!found) cart.push({ name: name, price: price, qty: 1 });
    saveCart(cart);
    updateCartBadge();
    renderCartDrawer();

    btn.textContent = "\u2713";
    btn.style.background = "var(--neon)";
    btn.style.color = "var(--bg)";
    setTimeout(function () {
      btn.textContent = "+";
      btn.style.background = "";
      btn.style.color = "";
    }, 1200);
  });

  // Cart drawer open/close
  var cartToggle = document.querySelector(".cart-toggle");
  var cartDrawer = document.getElementById("cartDrawer");
  var cartOverlay = document.getElementById("cartOverlay");
  var cartClose = document.querySelector(".cart-close");

  function openCart() {
    if (cartDrawer) cartDrawer.classList.add("open");
    if (cartOverlay) cartOverlay.classList.add("active");
    if (cartToggle) cartToggle.setAttribute("aria-expanded", "true");
    renderCartDrawer();
  }
  function closeCart() {
    if (cartDrawer) cartDrawer.classList.remove("open");
    if (cartOverlay) cartOverlay.classList.remove("active");
    if (cartToggle) cartToggle.setAttribute("aria-expanded", "false");
  }

  if (cartToggle) cartToggle.addEventListener("click", openCart);
  if (cartClose) cartClose.addEventListener("click", closeCart);
  if (cartOverlay) cartOverlay.addEventListener("click", closeCart);

  // Init badge on page load
  updateCartBadge();

  // ── FORM VALIDATION & SUBMISSION ──
  var form = document.getElementById("orderForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      var submitBtn = form.querySelector(".form-submit");
      var isValid = form.checkValidity();

      if (!isValid) {
        e.preventDefault();
        // Show native validation messages
        form.reportValidity();
        return;
      }

      // Visual feedback
      if (submitBtn) {
        submitBtn.textContent = "Enviando...";
        submitBtn.style.opacity = "0.7";
        submitBtn.disabled = true;
      }
    });

    // Check for success redirect
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("success") === "true") {
      form.style.display = "none";
      var summaryEl = document.getElementById("cartSummary");
      if (summaryEl) summaryEl.style.display = "none";
      var successEl = document.getElementById("formSuccess");
      if (successEl) {
        successEl.style.display = "block";
      }
      // Clear cart after successful submission
      localStorage.removeItem("3docna_cart");
      updateCartBadge();
    }

    // Populate cart summary and hidden field on pedido page
    var cartSummary = document.getElementById("cartSummary");
    var cartHidden = document.getElementById("cartHidden");
    var cartData = getCart();
    if (cartData.length > 0 && cartSummary) {
      var summaryHtml = '<h4>🛒 Tu cesta</h4>';
      var total = 0;
      var hiddenLines = [];
      cartData.forEach(function (item) {
        var line = item.price * item.qty;
        total += line;
        summaryHtml += '<div class="cart-summary-item"><span>' +
          escapeHtml(item.name) + ' × ' + item.qty +
          '</span><span>' + line.toFixed(2).replace(".", ",") + '€</span></div>';
        hiddenLines.push(item.name + " x" + item.qty + " (" + item.price.toFixed(2) + "€/u)");
      });
      summaryHtml += '<div class="cart-summary-total"><span>Total estimado</span><span>' +
        total.toFixed(2).replace(".", ",") + '€</span></div>';
      summaryHtml += '<button type="button" class="cart-summary-clear" id="clearCartBtn">Vaciar cesta</button>';
      cartSummary.innerHTML = summaryHtml;
      cartSummary.style.display = "";

      if (cartHidden) cartHidden.value = hiddenLines.join(" | ") + " | TOTAL: " + total.toFixed(2) + "€";

      // Pre-fill description field
      var descEl = document.getElementById("descripcion");
      if (descEl && !descEl.value) {
        descEl.value = "Productos de la cesta:\n" + hiddenLines.join("\n") + "\n\nTotal estimado: " + total.toFixed(2).replace(".", ",") + "€\n\nNotas adicionales: ";
      }

      document.getElementById("clearCartBtn").addEventListener("click", function () {
        localStorage.removeItem("3docna_cart");
        cartSummary.style.display = "none";
        if (cartHidden) cartHidden.value = "";
        if (descEl) descEl.value = "";
        updateCartBadge();
        renderCartDrawer();
      });
    }
  }

  // ── PRODUCT IMAGE CAROUSEL ──
  function initCarousels(scope) {
    var root = scope || document;
    root.querySelectorAll(".product-img-carousel").forEach(function (carousel) {
      if (carousel.dataset.carouselInit) return;
      carousel.dataset.carouselInit = "1";

      var track = carousel.querySelector(".carousel-track");
      var slides = carousel.querySelectorAll(".carousel-slide");
      var dots = carousel.querySelectorAll(".dot");
      var prevBtn = carousel.querySelector(".carousel-arrow.prev");
      var nextBtn = carousel.querySelector(".carousel-arrow.next");
      var current = 0;
      var timer = null;
      if (!track || slides.length < 2) return;

      function goTo(n) {
        current = ((n % slides.length) + slides.length) % slides.length;
        track.style.transform = "translateX(-" + (current * 100) + "%)";
        dots.forEach(function (d, i) { d.classList.toggle("active", i === current); });
      }

      dots.forEach(function (dot, i) {
        dot.addEventListener("click", function () { goTo(i); });
      });
      if (prevBtn) prevBtn.addEventListener("click", function () { goTo(current - 1); });
      if (nextBtn) nextBtn.addEventListener("click", function () { goTo(current + 1); });

      function startAuto() {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        timer = setInterval(function () { goTo(current + 1); }, 3200);
      }
      function stopAuto() { clearInterval(timer); }

      startAuto();
      carousel.addEventListener("mouseenter", stopAuto);
      carousel.addEventListener("mouseleave", startAuto);

      var touchStartX = 0;
      carousel.addEventListener("touchstart", function (e) {
        touchStartX = e.touches[0].clientX;
      }, { passive: true });
      carousel.addEventListener("touchend", function (e) {
        var diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) goTo(current + (diff > 0 ? 1 : -1));
      }, { passive: true });
    });
  }

  // Punto de entrada que usa js/catalog.js tras pintar las tarjetas
  window.DOCNA = window.DOCNA || {};
  window.DOCNA.initProductUI = function (scope) {
    initCarousels(scope);
    initReveal(scope);
  };

  initCarousels(document);
  initReveal(document);

  // ── SMOOTH SCROLL FOR ANCHOR LINKS ──
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      var targetId = this.getAttribute("href");
      if (targetId === "#") return;

      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        var navHeight = document.querySelector("nav").offsetHeight || 72;
        var targetPos = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
        window.scrollTo({ top: targetPos, behavior: "smooth" });
      }
    });
  });

});
