/* Plantilla de invitación de boda · 3DOCNA · v3 «La pieza»
   - Un toque en cualquier punto del escenario abre el sobre; ese gesto desbloquea el sonido (sonidos.js)
     y la música, que sube cuando la tarjeta ya está fuera ("invitacion:revelada").
   - El sobre y la tarjeta 3D viven en tarjeta3d.js: aquí solo se avisa con el evento "invitacion:abrir".
   - GSAP es opcional: si no carga, todo funciona igual sin animación. */
(() => {
  const raiz = document.documentElement;
  // la invitación siempre empieza arriba, en el sobre (sin que el navegador recuerde un scroll anterior)
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const conGsap = () => !quieto && window.gsap;
  const $ = (s, c = document) => c.querySelector(s);

  /* ---------------------------------------------------------------- MÚSICA */
  // La música pasa por Web Audio (sonidos.js) para poder subirla y bajarla también en iPhone,
  // donde audio.volume no hace nada. Arranca muda con el toque y sube cuando la tarjeta está fuera.
  const audio = $("#musica");
  const botonMusica = $(".musica-boton");
  const SFX = window.SFX || {};
  let quiereMusica = false, volumen = null;

  function preparar() {   // dentro del gesto del invitado
    try { SFX.desbloquear && SFX.desbloquear(); } catch { /* sin Web Audio */ }
    if (!audio) return;
    if (!volumen) volumen = (SFX.conectarMusica && SFX.conectarMusica(audio)) || {
      poner: (v) => (audio.volume = v),
      fundir: (v, s) => {
        const ini = audio.volume, t0 = performance.now();
        const paso = (t) => { const k = Math.min(1, (t - t0) / (s * 1000)); audio.volume = ini + (v - ini) * k; if (k < 1) requestAnimationFrame(paso); };
        requestAnimationFrame(paso);
      },
    };
    volumen.poner(0);
    quiereMusica = true;
    const p = audio.play();
    if (p && p.catch) p.catch(() => marcar(false));
  }
  function sonar(segundos = 3, nivel = .75) {
    if (!audio || !volumen) return;
    quiereMusica = true;
    if (audio.paused) audio.play().catch(() => {});
    volumen.fundir(nivel, segundos);
    marcar(true);
  }
  function callar() {
    quiereMusica = false;
    marcar(false);
    volumen.fundir(0, .5);
    setTimeout(() => { if (!quiereMusica) audio.pause(); }, 550);
  }
  function marcar(suena) {
    if (!botonMusica) return;
    botonMusica.hidden = false;
    botonMusica.setAttribute("aria-pressed", String(suena));
    botonMusica.setAttribute("aria-label", suena ? "Pausar la música" : "Poner la música");
  }
  if (botonMusica) botonMusica.addEventListener("click", () => (audio.paused || !quiereMusica ? (preparar(), sonar(1)) : callar()));
  document.addEventListener("visibilitychange", () => {   // no seguir sonando con el móvil en el bolsillo
    if (!audio) return;
    if (document.hidden) audio.pause();
    else if (quiereMusica) audio.play().catch(() => {});
  });

  /* ---------------------------------------------------------------- PANTALLA DE CARGA
     Se queda hasta que está todo: la letra, la página, el sobre 3D y los sonidos (o 20 s como mucho).
     Así el invitado no ve nada a medio cargar ni ningún adelanto de la invitación. */
  const carga = $("#carga");
  function pantallaDeCarga(hay3dCarga) {
    if (!carga) { raiz.classList.remove("cargando"); raiz.classList.add("cargado"); return; }
    const barra = carga.querySelector(".carga-barra");
    const tareas = [
      document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise((ok) => (document.readyState === "complete" ? ok() : addEventListener("load", ok, { once: true }))),
      hay3dCarga ? new Promise((ok) => { addEventListener("invitacion:lista", ok, { once: true }); addEventListener("invitacion:sin3d", ok, { once: true }); }) : Promise.resolve(),
      (window.SFX && window.SFX.listos) || Promise.resolve(),
    ];
    let hechas = 0;
    tareas.forEach((t) => t.then(() => barra.style.setProperty("--p", (.1 + .9 * ++hechas / tareas.length).toFixed(2))));
    const minimo = new Promise((ok) => setTimeout(ok, 900));   // que no sea un parpadeo
    Promise.race([Promise.all([...tareas, minimo]), new Promise((ok) => setTimeout(ok, 20000))]).then(() => {
      barra.style.setProperty("--p", 1);
      setTimeout(() => {
        scrollTo(0, 0);
        carga.classList.add("fuera");
        raiz.classList.remove("cargando");
        raiz.classList.add("cargado");
        dispatchEvent(new CustomEvent("invitacion:cargada"));
        setTimeout(() => carga.remove(), 1000);
      }, 250);
    });
  }

  /* ---------------------------------------------------------------- APERTURA */
  // Se abre tocando en cualquier punto del escenario (el sobre, el botón o el fondo).
  // Si el 3D aún está cargando, el toque se guarda y el sobre se abre en cuanto está listo.
  const escenario = $(".escenario");
  const abrir = $(".abrir");
  const titular = $(".titular");
  const hay3d = !!(escenario && escenario.dataset.modelo);
  let listo = !hay3d, revelado = false;

  function mostrarTitular() {
    if (revelado) return;
    revelado = true;
    raiz.classList.add("revelado");
    sonar(3.5);
    scrollEscenario();
    if (!conGsap()) return;
    window.gsap.timeline()
      .fromTo(".lema", { opacity: 0, letterSpacing: ".8em" }, { opacity: 1, letterSpacing: ".32em", duration: 1.4, ease: "power2.out" })
      .fromTo(".escenario h1 span", { opacity: 0, yPercent: 40, filter: "blur(8px)" }, { opacity: 1, yPercent: 0, filter: "blur(0px)", duration: 1.2, stagger: .22, ease: "power3.out" }, "-=1")
      .fromTo(".cuando", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .9, ease: "power2.out" }, "-=.6")
      .fromTo(".bajar", { opacity: 0 }, { opacity: 1, duration: .8 }, "-=.3");
  }
  addEventListener("invitacion:revelada", mostrarTitular);

  // Incitar a bajar: la pastilla «Desliza para ver los detalles» y, si en unos segundos no ha bajado,
  // la página se asoma sola un poco (enseña el principio del texto) y vuelve. Solo una vez.
  addEventListener("scroll", () => raiz.classList.toggle("ha-bajado", scrollY > 60), { passive: true });
  addEventListener("invitacion:revelada", () => {
    if (quieto) return;
    let tocado = false;
    const marcar = () => (tocado = true);
    addEventListener("touchstart", marcar, { once: true, passive: true });
    addEventListener("wheel", marcar, { once: true, passive: true });
    setTimeout(() => {
      if (tocado || scrollY > 10) return;
      scrollTo({ top: Math.round(innerHeight * .22), behavior: "smooth" });
      setTimeout(() => { if (!tocado && scrollY < innerHeight * .3) scrollTo({ top: 0, behavior: "smooth" }); }, 1100);
    }, 4500);
  });

  // destello dorado de pantalla en el golpe final
  const destello = $(".destello");
  addEventListener("invitacion:destello", () => {
    if (destello && conGsap()) window.gsap.fromTo(destello, { opacity: 0 }, { keyframes: [{ opacity: .9, duration: .08 }, { opacity: 0, duration: 1.1, ease: "power2.out" }] });
  });

  function abrirInvitacion() {
    if (raiz.classList.contains("abierto")) return;
    if (!raiz.classList.contains("despierto")) preparar();
    else if (volumen) volumen.fundir(.08, .8);    // la música se aparta mientras se abre el sobre
    scrollTo(0, 0);
    raiz.classList.remove("bloqueado");
    raiz.classList.add("abierto");
    if (conGsap()) window.gsap.to(abrir, { opacity: 0, scale: .9, duration: .4, ease: "power2.in", onComplete: () => (abrir.hidden = true) });
    else abrir.hidden = true;
    if (listo && hay3d && !raiz.classList.contains("sin-3d")) {
      dispatchEvent(new CustomEvent("invitacion:abrir"));
    } else if (hay3d && !listo) {
      window.__abrirPendiente = true;          // tarjeta3d.js lo abrirá al terminar de cargar
    } else {
      try { SFX.luz && SFX.luz(); } catch { /* */ }
      mostrarTitular();
    }
  }

  function dosToques() { return hay3d && !quieto && !raiz.classList.contains("sin-3d"); }
  function despertar() {
    preparar();                                   // desbloquea el sonido con este toque
    raiz.classList.add("despierto");
    sonar(2.5, .18);                              // la música entra muy baja; sube al revelarse la tarjeta
    const txt = abrir.querySelector(".abrir-txt");
    txt.firstChild.textContent = "Tócalo otra vez para abrirlo";
    if (conGsap()) window.gsap.fromTo(txt, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: .6, ease: "power2.out" });
    dispatchEvent(new CustomEvent("invitacion:despertar"));
  }

  function marcarListo() {
    if (listo) return;
    listo = true;
    if (abrir && !raiz.classList.contains("despierto")) abrir.querySelector(".abrir-txt").firstChild.textContent = dosToques() ? "Toca el sobre" : "Toca para abrir";
    if (conGsap() && !raiz.classList.contains("abierto")) window.gsap.fromTo(abrir, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" });
  }
  function sin3d() {
    raiz.classList.add("sin-3d");
    marcarListo();
    if (window.__abrirPendiente) { window.__abrirPendiente = false; mostrarTitular(); }
  }
  addEventListener("invitacion:lista", marcarListo);

  // Llamada a tocar: si en unos segundos no ha tocado, aparece en el centro «Toca el sobre»;
  // tras el primer toque, si vuelve a quedarse quieto, «Tócalo otra vez». Se esconde al tocar.
  const llamada = $(".llamada");
  let reloj = null;
  function programarLlamada(segundos) {
    if (!llamada) return;
    clearTimeout(reloj);
    llamada.classList.remove("visible");
    raiz.classList.remove("llamando");
    if (raiz.classList.contains("abierto")) return;
    reloj = setTimeout(() => {
      if (raiz.classList.contains("abierto")) return;
      const despierto = raiz.classList.contains("despierto");
      llamada.querySelector(".llamada-txt").textContent = despierto ? "Tócalo otra vez" : "Toca el sobre";
      llamada.querySelector("small").textContent = despierto ? "y descubre lo que guarda" : "tu invitación te espera";
      llamada.classList.add("visible");
      raiz.classList.add("llamando");
    }, segundos * 1000);
  }
  addEventListener("invitacion:cargada", () => programarLlamada(4));
  addEventListener("invitacion:despertar", () => programarLlamada(5));
  addEventListener("invitacion:abrir", () => { clearTimeout(reloj); raiz.classList.remove("llamando"); llamada && llamada.classList.remove("visible"); });
  // el botón «Toca el sobre» aparece cuando se quita la pantalla de carga
  addEventListener("invitacion:cargada", () => {
    if (abrir && conGsap() && !raiz.classList.contains("abierto")) window.gsap.fromTo(abrir, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1.2, delay: .6, ease: "power2.out" });
  });
  addEventListener("invitacion:sin3d", sin3d);
  pantallaDeCarga(hay3d);
  if (hay3d) setTimeout(() => { if (!listo) sin3d(); }, 20000);   // red muy lenta: se sigue sin 3D

  if (abrir) {
    raiz.classList.add("bloqueado");
    if (!listo) abrir.querySelector(".abrir-txt").firstChild.textContent = "Preparando tu invitación";
    // Dos toques: los navegadores no dejan sonar nada hasta que el invitado toca la página. El primer toque
    // despierta el sobre (empieza a sonar: forcejea, cruje, golpea, y entra la música muy baja); el segundo lo abre.
    // Sin 3D o con «reducir movimiento» basta un toque.
    escenario.addEventListener("click", (e) => {
      if (raiz.classList.contains("abierto") || e.target.closest(".bajar")) return;
      if (dosToques() && !raiz.classList.contains("despierto")) despertar();
      else abrirInvitacion();
    });
    // con teclado: el botón (Intro / espacio) ya lanza un click que sube hasta el escenario
  } else {
    raiz.classList.add("abierto", "revelado");
    addEventListener("load", scrollEscenario);
  }

  /* ---------------------------------------------------------------- SCROLL */
  // se monta al abrir: antes el titular está oculto y GSAP guardaría ese estado como el de partida
  let scrollMontado = false;
  function scrollEscenario() {
    if (scrollMontado || !conGsap() || !window.ScrollTrigger) return;
    scrollMontado = true;
    const g = window.gsap;
    g.registerPlugin(window.ScrollTrigger);
    g.fromTo(titular, { yPercent: 0, opacity: 1 }, { yPercent: -30, opacity: 0, ease: "none", immediateRender: false,
      scrollTrigger: { trigger: ".escenario", start: "top top", end: "bottom 30%", scrub: true } });
    g.from(".frase", { opacity: 0, y: 30, duration: 1.2, ease: "power2.out", scrollTrigger: { trigger: ".frase", start: "top 85%" } });
  }

  // hilo del programa: se dibuja según se baja
  const programa = $(".programa");
  const hilo = programa && $(".programa-hilo", programa);
  if (hilo) {
    if (quieto) hilo.style.setProperty("--p", 1);
    else {
      let pendiente = false;
      const actualizar = () => {
        pendiente = false;
        const r = programa.getBoundingClientRect();
        hilo.style.setProperty("--p", Math.min(1, Math.max(0, (innerHeight * .7 - r.top) / r.height)).toFixed(3));
      };
      addEventListener("scroll", () => { if (!pendiente) { pendiente = true; requestAnimationFrame(actualizar); } }, { passive: true });
      actualizar();
    }
  }

  /* ---------------------------------------------------------------- CUENTA ATRÁS (en una frase) */
  const cuenta = $(".cuenta");
  if (cuenta) {
    const nombres = { d: ["día", "días"], h: ["hora", "horas"], m: ["minuto", "minutos"] };
    const pinta = () => {
      const resto = Math.max(0, new Date(cuenta.dataset.fecha).getTime() - Date.now());
      if (!resto) {
        cuenta.hidden = true;
        $(".cuenta-fin").hidden = false;
        return false;
      }
      const min = Math.floor(resto / 60000);
      const val = { d: Math.floor(min / 1440), h: Math.floor(min / 60) % 24, m: min % 60 };
      for (const k in val) {
        const b = $(`[data-u="${k}"]`, cuenta), t = String(val[k]);
        if (b.textContent !== t) {
          b.textContent = t;
          $(`[data-l="${k}"]`, cuenta).textContent = nombres[k][val[k] === 1 ? 0 : 1];
          if (!quieto) { b.classList.remove("cambia"); void b.offsetWidth; b.classList.add("cambia"); }
        }
      }
      return true;
    };
    if (pinta()) {
      const id = setInterval(() => { if (!pinta()) clearInterval(id); }, 1000);
    }
  }

  /* ---------------------------------------------------------------- CONFIRMACIÓN */
  const form = $(".rsvp");
  if (form) {
    const estado = $(".rsvp-estado", form);
    const gracias = $(".rsvp-gracias");
    const sincronizar = () => {
      const no = form.querySelector('input[name="asistencia"]:checked')?.value === "No";
      form.classList.toggle("no-asiste", no);
    };
    form.addEventListener("change", sincronizar);
    sincronizar();

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const boton = form.querySelector('button[type="submit"]');
      boton.disabled = true;
      estado.textContent = "Enviando…";
      const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:" || form.dataset.demo;
      try {
        if (!local) {
          const r = await fetch("/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(new FormData(form)).toString(),
          });
          if (!r.ok) throw new Error(r.status);
        }
        form.hidden = true;
        gracias.hidden = false;
        gracias.focus();
        const nombre = form.nombre.value.trim().split(" ")[0];
        const no = form.asistencia.value === "No";
        gracias.querySelector("p:last-child").textContent = no
          ? `Te echaremos de menos, ${nombre}. Gracias por avisarnos.`
          : `¡Qué ilusión, ${nombre}! Hemos recibido tu confirmación.`;
        if (!no) window.dispatchEvent(new CustomEvent("invitacion:confirmada"));
        if (conGsap()) window.gsap.from(gracias, { opacity: 0, y: 16, scale: .98, duration: .8, ease: "power3.out" });
      } catch {
        estado.textContent = "No se ha podido enviar. Revisa tu conexión y vuelve a intentarlo.";
        boton.disabled = false;
      }
    });
  }

  /* ---------------------------------------------------------------- NÚMERO DE CUENTA */
  document.querySelectorAll("[data-mostrar]").forEach((b) =>
    b.addEventListener("click", () => {
      document.getElementById(b.dataset.mostrar).hidden = false;
      b.hidden = true;
    }));
  document.querySelectorAll("[data-copiar]").forEach((b) =>
    b.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copiar);
        b.textContent = "¡Copiado!";
      } catch {
        b.textContent = "Mantén pulsado para copiar";
      }
      setTimeout(() => (b.textContent = "Copiar"), 2200);
    }));
})();
