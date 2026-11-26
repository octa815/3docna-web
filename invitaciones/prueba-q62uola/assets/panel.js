/* Panel de los novios · 3DOCNA
   Pide la clave del panel (o la toma de la dirección: …/panel/#clave), llama a panel_boda en la base de datos
   y enseña: cifras, la lista de invitaciones con su última respuesta, filtros, recordatorio por WhatsApp a quien
   no ha contestado y descarga en CSV (se abre en Excel). La clave se queda solo en esta pestaña. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const cuerpo = document.body;
  const API = cuerpo.dataset.apiUrl, API_CLAVE = cuerpo.dataset.apiClave || "", SLUG = cuerpo.dataset.slug, WEB = cuerpo.dataset.web;
  const entrar = $(".panel-entrar"), datos = $(".panel-datos"), error = $(".panel-error");
  let clave = decodeURIComponent(location.hash.slice(1)) || sessionStorage.getItem("panel:" + SLUG) || "";
  let filas = [], filtro = "todas";
  if (location.hash) history.replaceState(null, "", location.pathname);   // que la clave no se quede en el historial

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

  const estadoDe = (f) => (!f.asistencia ? "pendiente" : f.asistencia === "Sí" ? "si" : "no");
  const personasDe = (f) => (estadoDe(f) !== "si" ? 0 : Number(f.personas) || 1);

  function cifras() {
    const si = filas.filter((f) => estadoDe(f) === "si"), no = filas.filter((f) => estadoDe(f) === "no");
    const pend = filas.filter((f) => estadoDe(f) === "pendiente");
    const personas = si.reduce((a, f) => a + personasDe(f), 0);
    const plazas = filas.reduce((a, f) => a + f.plazas, 0);
    const bus = si.filter((f) => f.autobus === "Sí").reduce((a, f) => a + personasDe(f), 0);
    const alergias = si.filter((f) => (f.alergias || "").trim()).length;
    const caja = $(".panel-cifras");
    caja.textContent = "";
    for (const [n, t] of [[personas, `personas vienen (de ${plazas} plazas)`], [si.length, "invitaciones dicen que sí"],
      [no.length, "no podrán venir"], [pend.length, "sin contestar"], [bus, "personas en autobús"], [alergias, "con alergias o menú especial"]]) {
      const d = document.createElement("div");
      const b = document.createElement("b"), s = document.createElement("span");
      b.textContent = n; s.textContent = t;
      d.append(b, s);
      caja.append(d);
    }
  }

  function tabla() {
    const tb = $(".panel-tabla tbody");
    tb.textContent = "";
    for (const f of filas.filter((f) => filtro === "todas" || estadoDe(f) === filtro)) {
      const tr = document.createElement("tr");
      const est = estadoDe(f);
      const celdas = [
        f.invitacion + (f.notas ? ` (${f.notas})` : ""),
        est === "si" ? "Viene" : est === "no" ? "No viene" : "Sin contestar",
        est === "si" ? `${personasDe(f)} de ${f.plazas}` : `— de ${f.plazas}`,
        est === "si" ? f.acompanantes || "" : "", est === "si" ? f.alergias || "" : "", est === "si" ? f.autobus || "" : "",
        est === "si" ? f.cancion || "" : "", f.mensaje || "",
      ];
      celdas.forEach((t, i) => {
        const td = document.createElement("td");
        td.textContent = t;
        if (i === 1) td.className = "estado estado-" + est;
        tr.append(td);
      });
      const td = document.createElement("td");
      if (est === "pendiente" && WEB) {   // recordatorio: un mensaje de WhatsApp con su enlace personal
        const a = document.createElement("a");
        a.className = "enlace";
        a.target = "_blank"; a.rel = "noopener";
        a.href = "https://wa.me/?text=" + encodeURIComponent(`¡Hola! Te recordamos que puedes confirmar tu asistencia a nuestra boda aquí: ${WEB}?i=${f.clave}`);
        a.textContent = "WhatsApp";
        td.append(a);
      }
      tr.append(td);
      tb.append(tr);
    }
  }

  function csv() {
    const cab = ["Invitación", "Plazas", "Estado", "Personas", "Nombre", "Acompañantes", "Alergias o menú", "Autobús", "Canción", "Mensaje", "Notas", "Clave", "Fecha"];
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lineas = [cab.map(q).join(";")].concat(filas.map((f) => [f.invitacion, f.plazas,
      { si: "Viene", no: "No viene", pendiente: "Sin contestar" }[estadoDe(f)], personasDe(f) || "", f.nombre, f.acompanantes, f.alergias,
      f.autobus, f.cancion, f.mensaje, f.notas, f.clave, f.fecha].map(q).join(";")));
    const blob = new Blob(["﻿" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `invitados-${SLUG}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function cargar() {
    try {
      const res = await rpc("panel_boda", { p_slug: SLUG, p_clave: clave });
      sessionStorage.setItem("panel:" + SLUG, clave);
      filas = res.invitaciones || [];
      entrar.hidden = true; datos.hidden = false;
      cifras(); tabla();
    } catch (e) {
      sessionStorage.removeItem("panel:" + SLUG);
      entrar.hidden = false; datos.hidden = true;
      error.textContent = e.codigo === "clave_incorrecta" ? "La clave no es correcta." : "No se ha podido conectar. Inténtalo en un momento.";
    }
  }

  entrar.addEventListener("submit", (e) => { e.preventDefault(); clave = entrar.clave.value.trim(); error.textContent = "Comprobando…"; cargar(); });
  $(".panel-filtros").addEventListener("click", (e) => {
    const b = e.target.closest("[data-filtro]");
    if (!b) return;
    filtro = b.dataset.filtro;
    document.querySelectorAll("[data-filtro]").forEach((x) => x.classList.toggle("activo", x === b));
    tabla();
  });
  $("[data-exportar]").addEventListener("click", csv);
  $("[data-recargar]").addEventListener("click", cargar);
  if (clave) cargar(); else entrar.hidden = false;
})();
