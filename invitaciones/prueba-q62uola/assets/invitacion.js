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

  // Desplazamiento propio, lento y con aceleración suave (el «smooth» del navegador es demasiado brusco).
  // Se corta en cuanto el invitado toca o mueve la página.
  function deslizar(hasta, ms, cortar = () => false) {
    return new Promise((ok) => {
      const desde = scrollY, t0 = performance.now();
      raiz.style.scrollBehavior = "auto";
      const paso = (t) => {
        if (cortar()) { raiz.style.scrollBehavior = ""; return ok(); }
        const k = Math.min(1, (t - t0) / ms), e = .5 - .5 * Math.cos(Math.PI * k);   // seno: entra y sale suave
        scrollTo(0, desde + (hasta - desde) * e);
        if (k < 1) requestAnimationFrame(paso); else { raiz.style.scrollBehavior = ""; ok(); }
      };
      requestAnimationFrame(paso);
    });
  }
  // el botón «Desliza para ver más» baja solo lo justo para que empiece el texto, despacio
  const bajar = $(".bajar");
  if (bajar) bajar.addEventListener("click", (e) => {
    e.preventDefault();
    if (quieto) { scrollTo(0, escenario.offsetHeight); return; }
    let tocado = false;
    addEventListener("touchstart", () => (tocado = true), { once: true, passive: true });
    addEventListener("wheel", () => (tocado = true), { once: true, passive: true });
    deslizar(Math.round(escenario.offsetHeight - innerHeight * .4), 1700, () => tocado);
  });

  // Incitar a bajar: la pastilla «Desliza para ver los detalles» y, si en unos segundos no ha bajado,
  // la página se asoma sola un poco (enseña el principio del texto) y vuelve. Solo una vez.
  addEventListener("scroll", () => raiz.classList.toggle("ha-bajado", scrollY > 60), { passive: true });
  addEventListener("invitacion:revelada", () => {
    if (quieto) return;
    let tocado = false;
    const marcar = () => (tocado = true);
    addEventListener("touchstart", marcar, { once: true, passive: true });
    addEventListener("wheel", marcar, { once: true, passive: true });
    addEventListener("keydown", marcar, { once: true });
    setTimeout(async () => {
      if (tocado || scrollY > 10) return;
      await deslizar(Math.round(innerHeight * .16), 1600, () => tocado);           // se asoma despacio
      if (!tocado) await new Promise((ok) => setTimeout(ok, 700));                // deja ver el principio del texto
      if (!tocado) await deslizar(0, 1800, () => tocado);                          // y vuelve con calma
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

  /* ---------------------------------------------------------------- CONFIRMACIÓN
     La respuesta se envía a Netlify Forms y además se guarda en este móvil (localStorage). Al volver a entrar,
     en lugar del formulario se ve «Tu respuesta», con botones para cambiarla o cancelar la asistencia hasta la
     fecha límite (rsvp.limiteFecha en evento.json). Cada cambio llega a Netlify como una respuesta más, con el
     mismo «respuesta_id» y el «tipo» (nueva, cambio o cancelación): la buena es la última de cada id.
     Con base de datos (evento.json "api") y el enlace personal de la tarjeta (?i=CLAVE), la respuesta se guarda y se
     lee en el servidor: se ve y se cambia desde cualquier móvil, y el formulario sabe para quién es y cuántas plazas tiene.
     Si el servidor no responde, sigue funcionando como sin base de datos. */
  const form = $(".rsvp");
  if (form) {
    const estado = $(".rsvp-estado", form);
    const gracias = $(".rsvp-gracias");
    const resumen = $(".rsvp-resumen");
    const cerrado = $(".rsvp-cerrado");
    const claveInv = (new URLSearchParams(location.search).get("i") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const API = form.dataset.apiUrl, API_CLAVE = form.dataset.apiClave || "";
    let servidor = !!(API && claveInv), abiertoServidor = null;
    const CLAVE = "rsvp:" + form.getAttribute("name") + (claveInv ? ":" + claveInv : "");
    const limite = form.dataset.limite ? new Date(form.dataset.limite + "T23:59:59") : null;
    const plazoAbierto = () => (abiertoServidor !== null ? abiertoServidor : !limite || Date.now() <= limite.getTime());
    const ETIQUETAS = { nombre: "Nombre", asistencia: "¿Vendrás?", personas: "Personas", acompanantes: "Acompañantes", alergias: "Alergias o menú especial",
      autobus: "Autobús", cancion: "Canción", mensaje: "Mensaje para los novios" };
    // las mismas tres funciones que basedatos/esquema.sql (Supabase) o basedatos/servidor_local.py
    async function rpc(fn, args) {
      const r = await fetch(`${API}/rest/v1/rpc/${fn}`, {
        method: "POST",
        // clave publicable nueva de Supabase (sb_publishable_…): solo «apikey»; la antigua «anon» (un JWT) también en Authorization
        headers: { "Content-Type": "application/json", apikey: API_CLAVE, ...(API_CLAVE.startsWith("eyJ") ? { Authorization: "Bearer " + API_CLAVE } : {}) },
        body: JSON.stringify(args),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(j.message || r.status), { codigo: j.message });
      return j;
    }
    const deServidor = (r) => ({
      nombre: r.nombre || "", asistencia: r.asistencia || "", personas: r.personas == null ? "" : String(r.personas),
      acompanantes: r.acompanantes || "", alergias: r.alergias || "", autobus: r.autobus || "", cancion: r.cancion || "", mensaje: r.mensaje || "",
    });
    const MENSAJES = { plazo_cerrado: "El plazo para confirmar ya terminó.", demasiadas_personas: "Sois más personas de las que tiene esta invitación.",
      falta_consentimiento: "Marca la casilla de los datos para poder enviarlo.", demasiados_envios: "Has enviado muchas veces seguidas. Espera un minuto y vuelve a intentarlo.",
      datos_invalidos: "Revisa los datos: falta el nombre o hay algo que no es válido.", invitacion_desconocida: "No encontramos esta invitación. Revisa el enlace." };
    const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE)); } catch { return null; } };
    const guardar = (r) => { try { localStorage.setItem(CLAVE, JSON.stringify(r)); } catch { /* modo privado: no se recuerda */ } };
    const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

    const sincronizar = () => {
      const no = form.querySelector('input[name="asistencia"]:checked')?.value === "No";
      form.classList.toggle("no-asiste", no);
    };
    form.addEventListener("change", sincronizar);

    function rellenar(campos) {   // vuelve a poner en el formulario lo que ya contestó
      for (const [k, v] of Object.entries(campos)) {
        const el = form.elements[k];
        if (!el) continue;
        if (el instanceof RadioNodeList || (el.length && el[0] && el[0].type === "radio")) {
          [...el].forEach((r) => (r.checked = r.value === v));
        } else el.value = v;
      }
      sincronizar();
    }

    function verResumen(r, recien) {
      const c = r.campos, va = c.asistencia === "Sí", nombre = (c.nombre || "").trim().split(" ")[0];
      $(".resumen-tit", resumen).textContent = recien
        ? (va ? `¡Qué ilusión, ${nombre}!` : `Te echaremos de menos, ${nombre}`)
        : `Hola de nuevo, ${nombre}`;
      $(".resumen-sub", resumen).textContent = va ? "Esta es tu confirmación:" : "Nos dijiste que no podrás venir.";
      const dl = $(".resumen-datos", resumen);
      dl.textContent = "";
      for (const [k, etiqueta] of Object.entries(ETIQUETAS)) {
        const v = (c[k] || "").trim();
        if (!v || (!va && ["personas", "acompanantes", "alergias", "autobus", "cancion"].includes(k))) continue;
        const fila = document.createElement("div");
        const dt = document.createElement("dt"), dd = document.createElement("dd");
        dt.textContent = etiqueta; dd.textContent = v;
        fila.append(dt, dd); dl.append(fila);
      }
      const abierto = plazoAbierto();
      $(".resumen-acciones", resumen).hidden = !abierto;
      const cancelar = $('[data-accion="cancelar"]', resumen);
      cancelar.hidden = !va;   // si ya dijo que no, solo «Cambiar mi respuesta»
      $(".resumen-plazo", resumen).textContent = abierto
        ? (limite ? `Puedes cambiar tu respuesta hasta el ${form.dataset.limiteTexto}.` : "")
        : `El plazo para hacer cambios terminó el ${form.dataset.limiteTexto}. Si necesitas algo, escríbenos.`;
      form.hidden = true; gracias.hidden = true; cerrado.hidden = true;
      resumen.hidden = false;
      if (recien) {
        resumen.focus();
        if (conGsap()) window.gsap.from(resumen, { opacity: 0, y: 16, scale: .98, duration: .8, ease: "power3.out" });
      }
    }

    async function enviar(campos, tipo) {
      if (servidor) {
        const res = await rpc("responder", { p_clave: claveInv, p_datos: { ...campos, consentimiento: true, tipo } });
        abiertoServidor = res.abierto;
        const g = { id: claveInv, campos: deServidor(res.respuesta), tipo: res.respuesta.tipo, fecha: res.respuesta.fecha };
        guardar(g);   // copia en el móvil por si luego no hay conexión
        return g;
      }
      const previa = leer();
      const id = (previa && previa.id) || nuevoId();
      const datos = new FormData(form);
      for (const k of Object.keys(ETIQUETAS)) datos.set(k, campos[k] || "");
      datos.set("respuesta_id", id);
      datos.set("tipo", tipo);
      const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:" || form.dataset.demo || /\.test$/.test(location.hostname);
      if (!local) {
        const r = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(datos).toString() });
        if (!r.ok) throw new Error(r.status);
      }
      const guardada = { id, campos, tipo, fecha: new Date().toISOString() };
      guardar(guardada);
      return guardada;
    }

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (!plazoAbierto()) return;
      const boton = form.querySelector('button[type="submit"]');
      boton.disabled = true;
      estado.textContent = "Enviando…";
      const campos = {};
      for (const k of Object.keys(ETIQUETAS)) campos[k] = (form.elements[k] && form.elements[k].value) || "";
      if (!servidor) campos.personas = "";
      try {
        const r = await enviar(campos, leer() ? "cambio" : "nueva");
        estado.textContent = "";
        boton.disabled = false;
        verResumen(r, true);
        if (campos.asistencia === "Sí") window.dispatchEvent(new CustomEvent("invitacion:confirmada"));
      } catch (err) {
        estado.textContent = MENSAJES[err.codigo] || "No se ha podido enviar. Revisa tu conexión y vuelve a intentarlo.";
        boton.disabled = false;
      }
    });

    resumen.addEventListener("click", async (ev) => {
      const b = ev.target.closest("[data-accion]");
      if (!b || !plazoAbierto()) return;
      const r = leer();
      if (b.dataset.accion === "editar") {
        rellenar(r ? r.campos : {});
        resumen.hidden = true; form.hidden = false;
        form.querySelector('button[type="submit"]').textContent = "Guardar los cambios";
        form.elements.nombre.focus();
      } else if (b.dataset.accion === "cancelar") {
        if (!confirm("¿Seguro que ya no podrás venir? Avisaremos a los novios.")) return;
        b.disabled = true;
        try {
          const nueva = await enviar({ ...r.campos, asistencia: "No" }, "cancelación");
          verResumen(nueva, true);
        } catch {
          $(".resumen-plazo", resumen).textContent = "No se ha podido enviar. Revisa tu conexión y vuelve a intentarlo.";
        }
        b.disabled = false;
      }
    });

    // al entrar: ¿ya contestó?, ¿se acabó el plazo?
    function iniciar() {
      const previa = leer();
      if (previa) verResumen(previa, false);
      else if (!plazoAbierto()) {
        form.hidden = true;
        cerrado.hidden = false;
        cerrado.textContent = `El plazo para confirmar terminó el ${form.dataset.limiteTexto}. Si aún quieres venir, escríbenos.`;
      }
      sincronizar();
    }
    if (servidor) {
      // con el enlace personal: para quién es, cuántas plazas tiene y qué contestó (desde cualquier móvil)
      rpc("obtener_invitacion", { p_clave: claveInv }).then((res) => {
        abiertoServidor = res.abierto;
        const para = $(".rsvp-para", form);
        para.textContent = `Invitación para ${res.invitacion} · ${res.plazas} ${res.plazas === 1 ? "plaza" : "plazas"}`;
        para.hidden = false;
        const sel = form.elements.personas;
        sel.textContent = "";
        for (let n = 1; n <= res.plazas; n++) sel.add(new Option(n === 1 ? "1 persona" : `${n} personas`, String(n)));
        sel.value = String(res.plazas);
        $(".campo-personas", form).hidden = false;
        if (res.respuesta) guardar({ id: claveInv, campos: deServidor(res.respuesta), tipo: res.respuesta.tipo, fecha: res.respuesta.fecha });
        else try { localStorage.removeItem(CLAVE); } catch { /* */ }
        iniciar();
      }).catch((err) => {
        if (err.codigo === "invitacion_desconocida") { estado.textContent = MENSAJES.invitacion_desconocida; }
        servidor = false;   // sin conexión con la base de datos: como siempre
        iniciar();
      });
    } else iniciar();
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
