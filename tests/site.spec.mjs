import { test, expect } from "@playwright/test";

const isMobile = (ti) => ti.project.name === "movil";
const PAGES = ["/", "/catalogo.html", "/configurador.html", "/pedido.html", "/contacto.html", "/aviso-legal.html", "/condiciones.html", "/privacidad.html", "/cookies.html", "/404.html"];

test.describe("Todas las páginas", () => {
  for (const path of PAGES) {
    test(`${path} carga sin errores y sin llamadas a terceros`, async ({ page }) => {
      const errors = [], external = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("request", (r) => { if (!r.url().startsWith("http://127.0.0.1")) external.push(r.url()); });
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page.locator("h1")).toHaveCount(1);
      await page.waitForTimeout(600);
      expect(errors).toEqual([]);
      expect(external).toEqual([]);
    });
  }

  test("el pie enlaza a las cuatro páginas legales", async ({ page }) => {
    await page.goto("/contacto.html");
    for (const name of ["Aviso legal", "Condiciones de venta", "Privacidad", "Cookies"]) {
      await expect(page.locator(".ftr").getByRole("link", { name })).toHaveCount(1);
    }
  });
});

test.describe("Catálogo y cesta", () => {
  test.beforeEach(async ({ page }) => { await page.goto("/"); await page.evaluate(() => localStorage.clear()); });

  test("pinta todos los productos del JSON y filtra por categoría", async ({ page, request }) => {
    const data = await (await request.get("/data/productos.json")).json();
    await page.goto("/catalogo.html");
    await expect(page.locator(".card")).toHaveCount(data.productos.length);
    await page.locator(".filters").getByRole("button", { name: "Halloween" }).click();
    const n = data.productos.filter((p) => p.categoria === "halloween").length;
    await expect(page.locator(".card")).toHaveCount(n);
    await expect(page).toHaveURL(/#halloween$/);
  });

  test("un enlace con categoría abre el filtro ya elegido", async ({ page }) => {
    await page.goto("/catalogo.html#negocios");
    await expect(page.locator('.filters [aria-pressed="true"]')).toHaveText("Para negocios");
  });

  test("la portada enseña solo destacados", async ({ page, request }) => {
    const data = await (await request.get("/data/productos.json")).json();
    await page.goto("/");
    await expect(page.locator("#destacados .card")).toHaveCount(Math.min(6, data.productos.filter((p) => p.destacado).length));
  });

  test("añadir a la cesta, cambiar cantidades y total", async ({ page }) => {
    await page.goto("/catalogo.html");
    const card = page.locator("#p-cuenco-caramelos");
    await card.locator("[data-add]").click();
    await card.locator("[data-add]").click();
    await expect(page.locator(".cart-count")).toHaveText("2");
    await page.locator(".cart-toggle").click();
    const drawer = page.locator("#drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer.locator("#drawerTotal")).toHaveText("44,00 €");
    await drawer.getByRole("button", { name: "Quitar una unidad" }).click();
    await expect(drawer.locator("#drawerTotal")).toHaveText("22,00 €");
    await page.reload();
    await expect(page.locator(".cart-count")).toHaveText("1");
  });

  test("la cesta vieja (formato anterior) se sigue leyendo", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("3docna_cart", JSON.stringify([{ name: "Pack 12 colgantes articulados", price: 15, qty: 3 }])));
    await page.goto("/pedido.html");
    await expect(page.locator(".cart-count")).toHaveText("3");
    await expect(page.locator("#cartSummary")).toContainText("45,00 €");
  });
});

test.describe("Configurador y pedido", () => {
  test("configurador calcula el precio y prepara WhatsApp", async ({ page }) => {
    await page.goto("/configurador.html");
    await page.fill("#cfgNombre", "bar manolo");
    await expect(page.locator("#cfgNombre")).toHaveValue("BAR MANOLO");
    await page.locator('label[for="szEsc"]').click();
    await page.check("#cfgVela");
    await page.locator('[data-step="1"]').click();
    await expect(page.locator("#cfgTotal")).toHaveText("96,00 €");
    const wa = decodeURIComponent(await page.locator("#cfgWa").getAttribute("href"));
    expect(wa).toContain("Texto: BAR MANOLO");
    expect(wa).toContain("escaparate (22 cm)");
    await page.locator("#cfgAdd").click();
    await expect(page.locator(".cart-count")).toHaveText("2");
  });

  test("el pedido no se envía sin datos obligatorios", async ({ page }) => {
    let posted = false;
    await page.route("**/formsubmit.co/**", (r) => { posted = true; r.abort(); });
    await page.goto("/pedido.html");
    await page.locator("#orderSend").click();
    await expect(page.locator("#f-nombre")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("[data-err-priv]")).not.toBeEmpty();
    expect(posted).toBe(false);
  });

  test("el pedido completo se envía a FormSubmit con la cesta", async ({ page }) => {
    let body = "";
    await page.route("**/formsubmit.co/**", async (r) => { body = r.request().postData() || ""; await r.fulfill({ status: 200, body: "ok" }); });
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("3docna_cart", JSON.stringify([{ name: "Litofanía-retrato con marco", price: 24, qty: 1 }])));
    await page.goto("/pedido.html");
    await page.fill("#f-nombre", "Ana");
    await page.fill("#f-email", "ana@example.com");
    await page.fill("#f-desc", "Una litofanía con la foto de mi perro, por favor.");
    await page.check("#f-priv");
    await page.locator("#orderSend").click();
    await expect.poll(() => body).toContain("Litofan");
    expect(body).toContain("ana%40example.com");
  });

  test("la vuelta de FormSubmit muestra la confirmación y vacía la cesta", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("3docna_cart", JSON.stringify([{ name: "X", price: 1, qty: 1 }])));
    await page.goto("/pedido.html?ok=1");
    await expect(page.locator("#orderOk")).toBeVisible();
    await expect(page.locator("#orderForm")).toBeHidden();
    await expect(page.locator(".cart-count")).toHaveText("0");
  });
});

test.describe("Portada en movimiento", () => {
  test("la impresora 3D se enciende y la pieza avanza con el scroll", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".gl-canvas")).toHaveClass(/is-on/, { timeout: 8000 });
    await page.waitForTimeout(3000);
    const before = Number(await page.locator('[data-hud="pct"]').first().textContent());
    await page.evaluate(() => window.scrollTo(0, innerHeight * 1));
    await expect.poll(async () => Number(await page.locator('[data-hud="pct"]').first().textContent()), { timeout: 6000 }).toBeGreaterThan(before + 20);
  });

  test("las copias del laminado no se leen ni duplican títulos", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".layer[aria-hidden='true']")).toHaveCount(5);
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("con animaciones desactivadas no hay 3D y todo se ve", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".gl-canvas")).toHaveCount(0);
    await expect(page.locator(".hero-fallback")).toBeVisible();
    await expect(page.locator('[data-hud="pct"]')).toHaveText("100");
  });

  test("ajustes: tema y tamaño de texto se recuerdan", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/contacto.html");
    await page.locator(".prefs-toggle").click();
    await page.locator('.seg[data-pref="theme"] [data-v="dark"]').click();
    await page.locator('.seg[data-pref="fs"] [data-v="large"]').click();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("html")).toHaveAttribute("data-fs", "large");
  });

  test("menú móvil a pantalla completa", async ({ page }, ti) => {
    test.skip(!isMobile(ti), "solo móvil");
    await page.goto("/contacto.html");
    await page.locator(".menu-toggle").click();
    const nav = page.locator("#nav");
    await expect(nav).toBeVisible();
    expect((await nav.boundingBox()).height).toBeGreaterThan(page.viewportSize().height * 0.9);
  });

  test("sin scroll horizontal", async ({ page }) => {
    for (const path of ["/", "/catalogo.html", "/pedido.html"]) {
      await page.goto(path);
      await page.waitForTimeout(500);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    }
  });
});
