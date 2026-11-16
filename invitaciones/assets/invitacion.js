/* Plantilla de invitación de boda · 3DOCNA */
(() => {
  const raiz = document.documentElement;
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Sobre de entrada ---------- */
  const intro = document.getElementById("intro");
  const sobre = intro && intro.querySelector(".sobre");

  function mostrarPortada() {
    raiz.classList.add("listo");
    document.body.classList.remove("bloqueado");
    crearPetalos();
  }

  if (sobre) {
    document.body.classList.add("bloqueado");
    let abierto = false;
    const abrir = () => {
      if (abierto) return;
      abierto = true;
      if (quieto) {
        intro.classList.add("e4");
        mostrarPortada();
        return;
      }
      const pasos = [["e1", 0], ["e2", 350], ["e3", 900], ["e4", 2300]];
      pasos.forEach(([c, t]) => setTimeout(() => intro.classList.add(c), t));
      setTimeout(mostrarPortada, 2300);
      setTimeout(() => intro.remove(), 3300);
    };
    sobre.addEventListener("click", abrir);
  } else {
    mostrarPortada();
  }

  /* ---------- Pétalos ---------- */
  function crearPetalos() {
    const caja = document.querySelector(".petalos");
    if (!caja || quieto || caja.childElementCount) return;
    const n = innerWidth < 600 ? 14 : 24;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.className = "petalo";
      p.style.setProperty("--x", Math.random() * 100 + "%");
      p.style.setProperty("--t", 8 + Math.random() * 9 + "px");
      p.style.setProperty("--d", 9 + Math.random() * 9 + "s");
      p.style.setProperty("--r", -Math.random() * 12 + "s");
      p.style.setProperty("--v", (Math.random() * 120 - 60).toFixed(0) + "px");
      caja.appendChild(p);
    }
  }

  /* ---------- Apariciones al hacer scroll ---------- */
  const revelables = document.querySelectorAll(".revela");
  if ("IntersectionObserver" in window && !quieto) {
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("visible");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    // escalonado dentro de cada grupo
    document.querySelectorAll(".eventos, .programa, .infos, .faq, .paleta").forEach((g) => {
      g.querySelectorAll(":scope > .revela").forEach((el, i) => (el.style.transitionDelay = i * 0.12 + "s"));
    });
    revelables.forEach((el) => io.observe(el));
  } else {
    revelables.forEach((el) => el.classList.add("visible"));
  }

  /* ---------- Línea del programa que se dibuja con el scroll ---------- */
  const programa = document.querySelector(".programa");
  const linea = programa && programa.querySelector(".programa-linea");
  if (linea) {
    let pendiente = false;
    const actualizar = () => {
      pendiente = false;
      const r = programa.getBoundingClientRect();
      const p = (innerHeight * 0.75 - r.top) / r.height;
      linea.style.setProperty("--p", Math.min(1, Math.max(0, p)).toFixed(3));
    };
    if (quieto) linea.style.setProperty("--p", 1);
    else {
      addEventListener("scroll", () => { if (!pendiente) { pendiente = true; requestAnimationFrame(actualizar); } }, { passive: true });
      actualizar();
    }
  }

  /* ---------- Cuenta atrás ---------- */
  const cuenta = document.querySelector(".cuenta");
  if (cuenta) {
    const celdas = {};
    cuenta.querySelectorAll("[data-u]").forEach((s) => (celdas[s.dataset.u] = s));
    const pinta = () => {
      const meta = new Date(cuenta.dataset.fecha).getTime(); // se lee cada vez: la demo la cambia en directo
      let resto = Math.max(0, meta - Date.now());
      if (!resto) {
        cuenta.hidden = true;
        document.querySelector(".cuenta-fin").hidden = false;
        return false;
      }
      resto = Math.floor(resto / 1000);
      const v = { d: Math.floor(resto / 86400), h: Math.floor(resto / 3600) % 24, m: Math.floor(resto / 60) % 60, s: resto % 60 };
      for (const k in v) {
        const t = k === "d" ? String(v[k]) : String(v[k]).padStart(2, "0");
        if (celdas[k].textContent !== t) celdas[k].textContent = t;
      }
      return true;
    };
    if (pinta()) {
      const id = setInterval(() => { if (!pinta()) clearInterval(id); }, 1000);
    }
  }

  /* ---------- Confirmación de asistencia ---------- */
  const form = document.querySelector(".rsvp");
  if (form) {
    const estado = form.querySelector(".rsvp-estado");
    const gracias = document.querySelector(".rsvp-gracias");
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
      const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:";
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
      } catch {
        estado.textContent = "No se ha podido enviar. Inténtalo de nuevo en unos minutos.";
        boton.disabled = false;
      }
    });
  }

  /* ---------- Mostrar y copiar el número de cuenta ---------- */
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
