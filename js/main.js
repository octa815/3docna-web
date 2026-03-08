/* ═══════════════════════════════════════════════
   3DOCNA — Main JavaScript
   Interactions, scroll reveal, form handling
   ═══════════════════════════════════════════════ */

"use strict";

document.addEventListener("DOMContentLoaded", function () {

  // ── SCROLL REVEAL (IntersectionObserver) ──
  const revealElements = document.querySelectorAll(
    ".product-card, .step, .stat, .contact-chip"
  );

  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver(
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

    revealElements.forEach(function (el) {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      revealObserver.observe(el);
    });
  }

  // ── CATEGORY TAB FILTERING ──
  const tabs = document.querySelectorAll(".cat-tab");
  const productCards = document.querySelectorAll("[data-category]");

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");

      var category = tab.getAttribute("data-filter");

      productCards.forEach(function (card) {
        if (!category || category === "todos") {
          card.style.display = "";
        } else {
          var cardCat = card.getAttribute("data-category");
          card.style.display = cardCat === category ? "" : "none";
        }
      });
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

  // ── ADD-TO-INQUIRY BUTTON ANIMATION ──
  document.querySelectorAll(".add-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var self = this;
      self.textContent = "\u2713";
      self.style.background = "var(--neon)";
      self.style.color = "var(--bg)";
      setTimeout(function () {
        self.textContent = "+";
        self.style.background = "";
        self.style.color = "";
      }, 1500);
    });
  });

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
      var successEl = document.getElementById("formSuccess");
      if (successEl) {
        successEl.style.display = "block";
        document.getElementById("pedido").scrollIntoView({ behavior: "smooth" });
      }
    }
  }

  // ── PRODUCT IMAGE CAROUSEL ──
  document.querySelectorAll(".product-img-carousel").forEach(function(carousel) {
    var track = carousel.querySelector(".carousel-track");
    var slides = carousel.querySelectorAll(".carousel-slide");
    var dots = carousel.querySelectorAll(".dot");
    var prevBtn = carousel.querySelector(".carousel-arrow.prev");
    var nextBtn = carousel.querySelector(".carousel-arrow.next");
    var current = 0;
    var timer = null;

    function goTo(n) {
      current = ((n % slides.length) + slides.length) % slides.length;
      track.style.transform = "translateX(-" + (current * 100) + "%)";
      dots.forEach(function(d, i) { d.classList.toggle("active", i === current); });
    }

    dots.forEach(function(dot, i) {
      dot.addEventListener("click", function() { goTo(i); });
    });
    if (prevBtn) prevBtn.addEventListener("click", function() { goTo(current - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function() { goTo(current + 1); });

    function startAuto() { timer = setInterval(function() { goTo(current + 1); }, 3200); }
    function stopAuto() { clearInterval(timer); }

    startAuto();
    carousel.addEventListener("mouseenter", stopAuto);
    carousel.addEventListener("mouseleave", startAuto);

    var touchStartX = 0;
    carousel.addEventListener("touchstart", function(e) {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    carousel.addEventListener("touchend", function(e) {
      var diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) goTo(current + (diff > 0 ? 1 : -1));
    }, { passive: true });
  });

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
