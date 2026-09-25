#!/usr/bin/env python3
"""Genera las páginas HTML de 3DOCNA.

Cabecera, cesta, pie y scripts comunes están aquí una sola vez.
El contenido propio de cada página vive en tools/pages/<nombre>.html.
La primera línea de cada archivo es un comentario con sus datos en JSON:

  <!-- {"title": "...", "desc": "...", "nav": "catalogo", "scripts": ["js/catalog.js"]} -->

Uso:  python3 tools/build.py      (escribe los .html en la raíz)
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / "tools" / "pages"

WA = "34694455979"
WA_MSG = "Hola! Me interesa hacer un pedido de impresión 3D"

NAV = [
    ("catalogo", "/catalogo.html", "Catálogo"),
    ("configurador", "/configurador.html", "Configurador"),
    ("pedido", "/pedido.html", "Pedido a medida"),
    ("contacto", "/contacto.html", "Contacto"),
]

ICON_SUN = '<svg class="i-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>'
ICON_MOON = '<svg class="i-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/></svg>'
ICON_CART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 10.6a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.2L21 8H6.2"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/></svg>'
ICON_PREFS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>'
ICON_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.2-.2-.4-.3Z"/></svg>'


def head(meta):
    title = meta["title"]
    full = title if title.startswith("3DOCNA") else f"{title} · 3DOCNA"
    extra = ""
    if meta.get("three"):
        extra += '\n<script type="importmap">{ "imports": { "three": "/vendor/three.module.min.js" } }</script>'
    scripts = "".join(f'\n<script type="module" src="/{s}"></script>' for s in meta.get("scripts", []))
    robots = '\n<meta name="robots" content="noindex, follow">' if meta.get("noindex") else ""
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{full}</title>
<meta name="description" content="{meta['desc']}">{robots}
<meta name="theme-color" content="#f5f2ee">
<link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/img/favicon-180.png">
<meta property="og:type" content="website">
<meta property="og:title" content="{full}">
<meta property="og:description" content="{meta['desc']}">
<meta property="og:locale" content="es_ES">
<meta property="og:image" content="/img/brand/mascota-480.webp">
<script>
  (function () {{
    var d = document.documentElement, g = function (k) {{ try {{ return localStorage.getItem(k); }} catch (e) {{ return null; }} }};
    var t = g("3docna_theme");
    if (!t) t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    d.dataset.theme = t;
    var fs = g("3docna_fs"); if (fs) d.dataset.fs = fs;
    var mo = g("3docna_motion"); if (mo) d.dataset.motion = mo;
    d.classList.add("js");
  }})();
</script>
<link rel="preload" href="/fonts/BricolageGrotesque-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/site.css">{extra}
<script src="/vendor/gsap.min.js" defer></script>
<script src="/vendor/ScrollTrigger.min.js" defer></script>
<script src="/vendor/lenis.min.js" defer></script>
<script type="module" src="/js/app.js"></script>{scripts}
</head>
<body data-page="{meta.get('nav', '')}">
<a class="skip" href="#main">Saltar al contenido</a>
<div class="progress" aria-hidden="true"></div>
"""


def header(current):
    links = "\n".join(
        f'      <a href="{href}"{" aria-current=\"page\"" if key == current else ""}>{label}</a>'
        for key, href, label in NAV
    )
    return f"""<header class="hdr">
  <div class="hdr-row">
    <a class="brand glass" href="/" aria-label="3DOCNA, inicio">
      <img src="/img/brand/mascota-96.webp" width="30" height="42" alt="">
      <span class="brand-word">3D<span class="oc">OC</span><span class="na">NA</span></span>
    </a>
    <nav class="nav glass" id="nav" aria-label="Principal">
{links}
    </nav>
    <div class="hdr-actions">
      <button class="icon-btn glass prefs-toggle" type="button" aria-label="Ajustes de visualización" aria-expanded="false" aria-controls="prefs">{ICON_PREFS}</button>
      <button class="icon-btn glass theme-toggle" type="button" aria-label="Cambiar a modo oscuro">{ICON_SUN}{ICON_MOON}</button>
      <button class="icon-btn glass cart-toggle" type="button" aria-label="Abrir la cesta" aria-expanded="false" aria-controls="drawer">{ICON_CART}<span class="cart-count" aria-hidden="true">0</span></button>
      <a class="btn btn-solid btn-sm hdr-cta" href="/pedido.html"><span>Pedir</span></a>
      <button class="icon-btn glass menu-toggle" type="button" aria-expanded="false" aria-controls="nav" aria-label="Abrir menú"><span></span><span></span></button>
    </div>
  </div>
</header>

<section class="prefs" id="prefs" aria-label="Ajustes de visualización">
  <h2>Ajustes</h2>
  <div class="pref-row"><span>Tema</span><div class="seg" data-pref="theme"><button type="button" data-v="light">Claro</button><button type="button" data-v="dark">Oscuro</button></div></div>
  <div class="pref-row"><span>Tamaño del texto</span><div class="seg" data-pref="fs"><button type="button" data-v="small">A−</button><button type="button" data-v="normal">A</button><button type="button" data-v="large">A+</button><button type="button" data-v="xlarge">A++</button></div></div>
  <div class="pref-row"><span>Animaciones</span><div class="seg" data-pref="motion"><button type="button" data-v="on">Sí</button><button type="button" data-v="off">No</button></div></div>
</section>

<div class="drawer-backdrop" data-close-drawer></div>
<aside class="drawer" id="drawer" aria-label="Tu cesta" aria-hidden="true">
  <div class="drawer-head">
    <h2>Tu cesta</h2>
    <button class="icon-btn" type="button" data-close-drawer aria-label="Cerrar la cesta"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
  </div>
  <div class="drawer-items" id="drawerItems"></div>
  <div class="drawer-foot" id="drawerFoot" hidden>
    <div class="drawer-total"><span>Total estimado</span><strong id="drawerTotal">0,00 €</strong></div>
    <a class="btn btn-solid" href="/pedido.html#pedido"><span>Solicitar pedido</span></a>
    <p class="drawer-note">No pagas nada ahora. Te confirmamos diseño, plazo y precio final en menos de 24 h.</p>
  </div>
</aside>
"""


def footer():
    links = "\n".join(f'        <a href="{href}">{label}</a>' for _, href, label in NAV)
    return f"""<footer class="ftr">
  <div class="wrap">
    <p class="ftr-mark" aria-hidden="true"><span>3D<span class="oc">OC</span><span class="na">NA</span></span></p>
    <div class="ftr-row">
      <p>Impresión 3D en Elda · Octavio y Natalia</p>
      <nav class="ftr-links" aria-label="Secundaria">
{links}
      </nav>
      <nav class="ftr-links" aria-label="Legal">
        <a href="/aviso-legal.html">Aviso legal</a>
        <a href="/condiciones.html">Condiciones de venta</a>
        <a href="/privacidad.html">Privacidad</a>
        <a href="/cookies.html">Cookies</a>
      </nav>
      <p class="muted">© <span data-year>2026</span> 3DOCNA</p>
    </div>
  </div>
</footer>

<a class="wa-float" href="https://wa.me/{WA}?text={WA_MSG.replace(' ', '%20')}" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">{ICON_WA}<span>¿Hablamos?</span></a>
</body>
</html>
"""


def build():
    count = 0
    for src in sorted(PAGES.glob("*.html")):
        text = src.read_text(encoding="utf-8")
        m = re.match(r"\s*<!--\s*(\{.*?\})\s*-->\s*", text, re.S)
        if not m:
            raise SystemExit(f"{src.name}: falta la cabecera JSON")
        meta = json.loads(m.group(1))
        body = text[m.end():]
        html = head(meta) + header(meta.get("nav", "")) + '\n<main id="main">\n' + body.rstrip() + "\n</main>\n\n" + footer()
        (ROOT / src.name).write_text(html, encoding="utf-8")
        count += 1
    print(f"{count} páginas generadas")


if __name__ == "__main__":
    build()
