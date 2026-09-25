/* 3DOCNA — común a todas las páginas
   Tema y ajustes, menú, cesta, scroll suave y animaciones de aparición. */

export const $ = (s, c = document) => c.querySelector(s);
export const $$ = (s, c = document) => [...c.querySelectorAll(s)];
export const root = document.documentElement;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const euros = (n) => n.toFixed(2).replace(".", ",") + " €";
export const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
export const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
export const motionOK = () => !matchMedia("(prefers-reduced-motion: reduce)").matches && root.dataset.motion !== "off";
export const WA = "https://wa.me/34694455979?text=";

const { gsap, ScrollTrigger } = window;
export const hasGsap = Boolean(gsap && ScrollTrigger);
if (hasGsap) {
  gsap.registerPlugin(ScrollTrigger);
  // En móvil la barra de direcciones cambia la altura al hacer scroll: no recalcular por eso (evita saltos)
  ScrollTrigger.config({ ignoreMobileResize: true });
}

/* =====================================================================
   Ajustes: tema, tamaño de texto, animaciones
   ===================================================================== */
const themeMeta = $('meta[name="theme-color"]');
function applyPrefs() {
  const dark = root.dataset.theme === "dark";
  if (themeMeta) themeMeta.content = dark ? "#111013" : "#f5f2ee";
  $$(".theme-toggle").forEach((b) => b.setAttribute("aria-label", dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"));
  const current = { theme: root.dataset.theme, fs: root.dataset.fs || "normal", motion: root.dataset.motion || "on" };
  $$(".seg[data-pref]").forEach((seg) => {
    $$("button", seg).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === current[seg.dataset.pref])));
  });
}
function setTheme(next) {
  store.set("3docna_theme", next);
  const apply = () => { root.dataset.theme = next; applyPrefs(); };
  if (document.startViewTransition && motionOK()) document.startViewTransition(apply);
  else apply();
}
$$(".theme-toggle").forEach((b) => b.addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark")));
$$(".seg[data-pref]").forEach((seg) => seg.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const k = seg.dataset.pref, v = b.dataset.v;
  if (k === "theme") return setTheme(v);
  if (k === "fs") { v === "normal" ? (delete root.dataset.fs, store.del("3docna_fs")) : (root.dataset.fs = v, store.set("3docna_fs", v)); ScrollTrigger?.refresh(); }
  if (k === "motion") {
    if (v === "on") { delete root.dataset.motion; store.del("3docna_motion"); }
    else { root.dataset.motion = "off"; store.set("3docna_motion", "off"); }
    location.reload();
  }
  applyPrefs();
}));
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  if (!store.get("3docna_theme")) { root.dataset.theme = e.matches ? "dark" : "light"; applyPrefs(); }
});
applyPrefs();

const prefs = $("#prefs");
const prefsBtn = $(".prefs-toggle");
function setPrefs(open) {
  prefs?.classList.toggle("is-open", open);
  prefsBtn?.setAttribute("aria-expanded", String(open));
}
prefsBtn?.addEventListener("click", (e) => { e.stopPropagation(); setPrefs(!prefs.classList.contains("is-open")); });
document.addEventListener("click", (e) => { if (prefs?.classList.contains("is-open") && !prefs.contains(e.target)) setPrefs(false); });

$$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

/* =====================================================================
   Scroll suave
   ===================================================================== */
export let lenis = null;
if (hasGsap && motionOK() && window.Lenis) {
  lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
function scrollToTarget(target, offset = -10) {
  if (lenis) lenis.scrollTo(target, { offset, duration: 1.3, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else if (typeof target === "number") window.scrollTo(0, target);
  else target.scrollIntoView();
}
$$('a[href*="#"]').forEach((a) => a.addEventListener("click", (e) => {
  const url = new URL(a.href);
  if (url.pathname !== location.pathname || !url.hash) return;
  const target = $(url.hash);
  if (!target) return;
  e.preventDefault();
  setMenu(false);
  closeDrawer();
  scrollToTarget(target);
  history.replaceState(null, "", url.hash);
}));

/* =====================================================================
   Menú móvil
   ===================================================================== */
const nav = $("#nav");
const menuBtn = $(".menu-toggle");
export function setMenu(open) {
  if (!nav || !menuBtn) return;
  nav.classList.toggle("is-open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  open ? lenis?.stop() : lenis?.start();
}
menuBtn?.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  setMenu(false); setPrefs(false); closeDrawer();
});

/* =====================================================================
   Cesta (localStorage, mismo formato que la web anterior)
   ===================================================================== */
const CART_KEY = "3docna_cart";
export function getCart() {
  try { return (JSON.parse(store.get(CART_KEY)) || []).filter((i) => i && i.name && typeof i.price === "number" && i.qty > 0); }
  catch { return []; }
}
function saveCart(cart) { store.set(CART_KEY, JSON.stringify(cart)); renderCart(); }
export const cartTotal = (cart = getCart()) => cart.reduce((s, i) => s + i.price * i.qty, 0);

const drawer = $("#drawer");
const drawerItems = $("#drawerItems");
const drawerFoot = $("#drawerFoot");
const cartBtn = $(".cart-toggle");
let lastFocus = null;

function esc(s) { const d = document.createElement("div"); d.textContent = String(s ?? ""); return d.innerHTML; }

export function renderCart() {
  const cart = getCart();
  const n = cart.reduce((s, i) => s + i.qty, 0);
  $$(".cart-count").forEach((c) => { c.textContent = String(n); c.classList.toggle("has", n > 0); });
  cartBtn?.setAttribute("aria-label", n ? `Abrir la cesta, ${n} ${n === 1 ? "producto" : "productos"}` : "Abrir la cesta");
  if (!drawerItems) return;
  if (!cart.length) {
    drawerItems.innerHTML = `<div class="drawer-empty"><img src="/img/brand/mascota-96.webp" width="70" height="98" alt=""><p>Tu cesta está vacía.</p><a class="link-arrow" href="/catalogo.html">Ver el catálogo</a></div>`;
    drawerFoot.hidden = true;
  } else {
    drawerItems.innerHTML = cart.map((i, idx) => `
      <div class="ci">
        <div><div class="ci-name">${esc(i.name)}</div><div class="ci-price">${euros(i.price)} / ud.</div></div>
        <div class="ci-total">${euros(i.price * i.qty)}</div>
        <div class="qty" role="group" aria-label="Cantidad de ${esc(i.name)}">
          <button type="button" data-dec="${idx}" aria-label="Quitar una unidad">−</button><span>${i.qty}</span><button type="button" data-inc="${idx}" aria-label="Añadir una unidad">+</button>
        </div>
        <button class="ci-remove" type="button" data-del="${idx}">Quitar</button>
      </div>`).join("");
    drawerFoot.hidden = false;
    $("#drawerTotal").textContent = euros(cartTotal(cart));
  }
  document.dispatchEvent(new CustomEvent("cart:change", { detail: cart }));
}
drawerItems?.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const cart = getCart();
  if (b.dataset.inc) cart[b.dataset.inc].qty++;
  if (b.dataset.dec) { const i = cart[b.dataset.dec]; i.qty--; if (i.qty <= 0) cart.splice(b.dataset.dec, 1); }
  if (b.dataset.del) cart.splice(b.dataset.del, 1);
  saveCart(cart);
});

export function openDrawer() {
  if (!drawer) return;
  lastFocus = document.activeElement;
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  $(".drawer-backdrop").classList.add("is-open");
  cartBtn?.setAttribute("aria-expanded", "true");
  lenis?.stop();
  setTimeout(() => $("[data-close-drawer].icon-btn", drawer)?.focus(), 50);
}
export function closeDrawer() {
  if (!drawer?.classList.contains("is-open")) return;
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  $(".drawer-backdrop").classList.remove("is-open");
  cartBtn?.setAttribute("aria-expanded", "false");
  lenis?.start();
  lastFocus?.focus?.({ preventScroll: true });
}
cartBtn?.addEventListener("click", openDrawer);
$$("[data-close-drawer]").forEach((el) => el.addEventListener("click", closeDrawer));

export function addToCart(item, fromEl) {
  const cart = getCart();
  const found = cart.find((i) => i.name === item.name);
  if (found) found.qty += item.qty || 1;
  else cart.push({ name: item.name, price: item.price, qty: item.qty || 1 });
  saveCart(cart);
  const badge = $(".cart-count");
  const bump = () => { badge?.classList.remove("bump"); void badge?.offsetWidth; badge?.classList.add("bump"); };
  // Un punto "vuela" hasta la cesta
  if (fromEl && cartBtn && hasGsap && motionOK()) {
    const a = fromEl.getBoundingClientRect(), b = cartBtn.getBoundingClientRect();
    const dot = document.createElement("span");
    dot.className = "fly-dot";
    document.body.append(dot);
    const x0 = a.left + a.width / 2 - 8, y0 = a.top + a.height / 2 - 8;
    const x1 = b.left + b.width / 2 - 8, y1 = b.top + b.height / 2 - 8;
    gsap.set(dot, { x: x0, y: y0 });
    gsap.to(dot, { x: x1, duration: 0.7, ease: "power2.inOut" });
    gsap.to(dot, { y: Math.min(y0, y1) - 120, duration: 0.3, ease: "power2.out" });
    gsap.to(dot, { y: y1, scale: 0.5, duration: 0.4, delay: 0.3, ease: "power2.in", onComplete: () => { dot.remove(); bump(); } });
  } else bump();
}
window.addEventListener("storage", (e) => { if (e.key === CART_KEY) renderCart(); });
renderCart();

/* =====================================================================
   WhatsApp flotante: oculto en portada y en zonas de contacto
   ===================================================================== */
// También se aparta mientras bajas leyendo, para no tapar botones, y vuelve al subir
const wa = $(".wa-float");
if (wa) {
  const seen = new Set();
  let goingDown = false, lastY = scrollY;
  const paint = () => wa.classList.toggle("is-hidden", seen.size > 0 || goingDown);
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
      paint();
    }, { threshold: 0.05 });
    $$("[data-hide-wa]").forEach((el) => io.observe(el));
  }
  addEventListener("scroll", () => {
    const y = scrollY;
    if (Math.abs(y - lastY) < 8) return;
    const down = y > lastY && y > 200;
    lastY = y;
    if (down !== goingDown) { goingDown = down; paint(); }
  }, { passive: true });
}

/* =====================================================================
   Preguntas frecuentes: apertura suave
   ===================================================================== */
$$(".faq details").forEach((d) => {
  const sum = $("summary", d);
  const body = $(".faq-a", d);
  if (!sum || !body || !hasGsap) return;
  sum.addEventListener("click", (e) => {
    if (!motionOK()) return;
    e.preventDefault();
    if (d.open) {
      gsap.to(body, { height: 0, duration: 0.25, ease: "power2.out", onComplete: () => { d.open = false; gsap.set(body, { clearProps: "height" }); } });
    } else {
      d.open = true;
      gsap.fromTo(body, { height: 0 }, { height: "auto", duration: 0.35, ease: "power3.out", clearProps: "height" });
    }
  });
});

/* =====================================================================
   Animaciones de aparición
   ===================================================================== */
export function splitWords(el) {
  const out = [];
  const walk = (node, parent) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { parent.append(document.createTextNode(" ")); return; }
          const w = document.createElement("span"); w.className = "w";
          const inner = document.createElement("span"); inner.textContent = part;
          w.append(inner); parent.append(w); out.push(inner);
        });
      } else if (n.nodeType === 1) {
        const clone = n.cloneNode(false);
        // Un degradado de texto no se puede partir sin perderse: se anima entero
        if (n.classList.contains("hl")) { clone.innerHTML = n.innerHTML; const w = document.createElement("span"); w.className = "w"; w.append(clone); parent.append(w); out.push(clone); return; }
        parent.append(clone); walk(n, clone);
      }
    });
  };
  const frag = document.createDocumentFragment();
  walk(el, frag);
  el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
  el.replaceChildren(frag);
  [...el.children].forEach((c) => c.setAttribute("aria-hidden", "true"));
  return out;
}

// La línea de filamento de cada separador; la portada añade la boquilla 3D encima
export const beadHooks = [];

export function initReveals() {
  if (!hasGsap) return;
  if (!motionOK()) {
    $$("[data-rise], [data-split], [data-print]").forEach((el) => gsap.from(el, { opacity: 0, duration: 0.4, ease: "none", scrollTrigger: { trigger: el, start: "top 92%", once: true } }));
    $$(".bead-line").forEach((l) => gsap.set(l, { scaleX: 1 }));
    return;
  }
  $$("[data-split]").forEach((el) => {
    const words = splitWords(el);
    gsap.from(words, { yPercent: 115, rotate: 3, duration: 1.1, ease: "expo.out", stagger: 0.05, scrollTrigger: { trigger: el, start: "top 88%", once: true } });
  });
  $$("[data-rise]").forEach((el) => {
    gsap.from(el, { y: 34, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 92%", once: true } });
  });
  // "Se imprime": aparece de abajo arriba en capas
  $$("[data-print]").forEach((el, i) => {
    gsap.fromTo(el, { clipPath: "inset(100% 0 0 0)" }, {
      clipPath: "inset(0% 0 0 0)", duration: 0.9, ease: "steps(14)", delay: (Number(el.dataset.print) || 0) * 0.08,
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
      onComplete: () => gsap.set(el, { clearProps: "clipPath" }),
    });
  });
  // Separadores: el avance se suaviza (scrub 0.6) para que un scroll brusco no dé tirones
  $$(".bead").forEach((bead, i) => {
    const line = $(".bead-line", bead);
    const st = { p: 0 };
    gsap.to(st, {
      p: 1, ease: "none",
      scrollTrigger: { trigger: bead, start: "top 88%", end: "top 30%", scrub: 0.6 },
      onUpdate: () => {
        line.style.transform = `scaleX(${st.p})`;
        const active = st.p > 0.002 && st.p < 0.998;
        beadHooks.forEach((h) => h(bead, st.p, active, i));
      },
    });
  });
  const mark = $(".ftr-mark span");
  if (mark) gsap.from(mark, { yPercent: 100, ease: "none", scrollTrigger: { trigger: ".ftr", start: "top bottom", end: "top 35%", scrub: true } });
  gsap.to(".progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: true } });

  // Cabecera: se esconde al bajar y vuelve al subir
  const hdr = $(".hdr");
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: (self) => hdr.classList.toggle("is-hidden", self.direction === 1 && self.scroll() > window.innerHeight * 1.2 && !nav?.classList.contains("is-open") && !drawer?.classList.contains("is-open")),
  });

  // Botones magnéticos
  if (finePointer) {
    $$(".magnetic").forEach((el) => {
      const qx = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
      const qy = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        qx((e.clientX - r.left - r.width / 2) * 0.25); qy((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener("pointerleave", () => { qx(0); qy(0); });
    });
  }
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
}

// Las páginas sin portada animada arrancan las apariciones solas
if (!document.body.dataset.page || document.body.dataset.page !== "inicio") {
  queueMicrotask(initReveals);
}
