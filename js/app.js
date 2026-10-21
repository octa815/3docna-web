/* 3DOCNA — común a todas las páginas
   Tema y ajustes, menú, cesta y apariciones suaves.
   Sin librerías: scroll nativo del navegador y animaciones en CSS (más rápido en móvil). */

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
  if (k === "fs") { v === "normal" ? (delete root.dataset.fs, store.del("3docna_fs")) : (root.dataset.fs = v, store.set("3docna_fs", v)); }
  if (k === "motion") {
    if (v === "on") { delete root.dataset.motion; store.del("3docna_motion"); }
    else { root.dataset.motion = "off"; store.set("3docna_motion", "off"); }
    location.reload();
  }
  applyPrefs();
}));
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
   Enlaces internos (#ancla): scroll nativo, suave solo si hay animaciones
   ===================================================================== */
// Mientras el menú o la cesta están abiertos, la página de detrás no se mueve
const lockScroll = (on) => root.classList.toggle("no-scroll", on);
function scrollToTarget(target) {
  target.scrollIntoView({ behavior: motionOK() ? "smooth" : "auto", block: "start" });
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
  lockScroll(open);
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
  lockScroll(true);
  setTimeout(() => $("[data-close-drawer].icon-btn", drawer)?.focus(), 50);
}
export function closeDrawer() {
  if (!drawer?.classList.contains("is-open")) return;
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  $(".drawer-backdrop").classList.remove("is-open");
  cartBtn?.setAttribute("aria-expanded", "false");
  lockScroll(false);
  lastFocus?.focus?.({ preventScroll: true });
}
cartBtn?.addEventListener("click", openDrawer);
$$("[data-close-drawer]").forEach((el) => el.addEventListener("click", closeDrawer));

// items: uno ({name, price, qty}) o varios a la vez (pendientes de un juego)
export function addToCart(items, fromEl) {
  const cart = getCart();
  (Array.isArray(items) ? items : [items]).forEach((item) => {
    const found = cart.find((i) => i.name === item.name);
    if (found) found.qty += item.qty || 1;
    else cart.push({ name: item.name, price: item.price, qty: item.qty || 1 });
  });
  saveCart(cart);
  // La cabecera vuelve a la vista para que se vea la cesta sumar
  $(".hdr")?.classList.remove("is-hidden");
  const badge = $(".cart-count");
  const bump = () => { badge?.classList.remove("bump"); void badge?.offsetWidth; badge?.classList.add("bump"); };
  // Un punto "vuela" hasta la cesta (animación nativa del navegador, sin librerías)
  const b = cartBtn?.getBoundingClientRect();
  if (fromEl && b?.width && motionOK() && Element.prototype.animate) {
    const a = fromEl.getBoundingClientRect();
    const dot = document.createElement("span");
    dot.className = "fly-dot";
    document.body.append(dot);
    const x0 = a.left + a.width / 2 - 8, y0 = a.top + a.height / 2 - 8;
    const x1 = b.left + b.width / 2 - 8, y1 = b.top + b.height / 2 - 8;
    const peak = Math.min(y0, y1) - 120;
    dot.animate([
      { transform: `translate(${x0}px, ${y0}px)` },
      { transform: `translate(${(x0 + x1) / 2}px, ${peak}px)`, offset: 0.45 },
      { transform: `translate(${x1}px, ${y1}px) scale(0.5)` },
    ], { duration: 650, easing: "ease-in-out" }).finished.then(() => { dot.remove(); bump(); });
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
   Apariciones al hacer scroll
   Una sola IntersectionObserver para toda la página; el movimiento está en CSS
   (.rv / .rv.in). Sin JavaScript o con "Animaciones: No", todo se ve desde el principio.
   ===================================================================== */
export function reveal(els) {
  if (!motionOK() || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    io.unobserve(e.target);
  }), { rootMargin: "0px 0px -8% 0px" });
  els.forEach((el, i) => {
    // Lo que ya está en pantalla al cargar no se esconde: así no tapa el primer pintado
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight * 0.92 && r.bottom > 0) return;
    el.classList.add("rv");
    if (el.dataset.print) el.style.setProperty("--d", `${Number(el.dataset.print) * 80}ms`);
    io.observe(el);
  });
}

export function initReveals() {
  reveal($$("[data-rise], [data-split], [data-print], .bead, .steps"));
}

/* Cabecera: se esconde al bajar y vuelve al subir */
const hdr = $(".hdr");
if (hdr) {
  let lastY = scrollY, ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      const hide = y > lastY && y > innerHeight * 1.2 && !nav?.classList.contains("is-open") && !drawer?.classList.contains("is-open");
      if (Math.abs(y - lastY) > 6) { hdr.classList.toggle("is-hidden", hide); lastY = y; }
      ticking = false;
    });
  }, { passive: true });
}

initReveals();
