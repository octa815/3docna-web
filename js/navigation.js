/* ═══════════════════════════════════════════════
   3DOCNA — Navigation (Mobile menu)
   ═══════════════════════════════════════════════ */

"use strict";

document.addEventListener("DOMContentLoaded", function () {

  var hamburger = document.querySelector(".hamburger");
  var mobileMenu = document.querySelector(".mobile-menu");

  if (!hamburger || !mobileMenu) return;

  function toggleMenu() {
    var isOpen = mobileMenu.classList.toggle("active");
    hamburger.setAttribute("aria-expanded", String(isOpen));
    document.body.style.overflow = isOpen ? "hidden" : "";
  }

  function closeMenu() {
    mobileMenu.classList.remove("active");
    hamburger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  hamburger.addEventListener("click", toggleMenu);

  // Close on link click
  mobileMenu.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeMenu);
  });

  // Close on Escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && mobileMenu.classList.contains("active")) {
      closeMenu();
      hamburger.focus();
    }
  });

  // Close menu on resize to desktop
  var mediaQuery = window.matchMedia("(min-width: 901px)");
  mediaQuery.addEventListener("change", function (e) {
    if (e.matches) {
      closeMenu();
    }
  });

});
