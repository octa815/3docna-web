/* Efectos de sonido de la apertura: grabaciones reales de BigSoundBank (CC0, ver sonidos/_LICENCIAS.md),
   recortadas y comprimidas (~250 KB en total). Se descargan y decodifican al cargar la página; suenan con
   Web Audio, con una sala de reverberación común para que todo parezca grabado en el mismo sitio.
   window.SFX.desbloquear() va en el toque del invitado (los navegadores no dejan sonar nada sin un gesto);
   tarjeta3d.js lanza cada efecto en su momento exacto de la animación. Si algo falla, no suena y ya está. */
(() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const base = new URL("sonidos/", document.currentScript ? document.currentScript.src : location.href);
  const NOMBRES = ["toque", "lacre", "solapa", "luz", "desliza", "subida", "caida", "impacto", "brillo", "cohete", "fuego1", "fuego2", "fuego3",
    "papel1", "papel2", "papel3", "golpe1", "golpe2", "crujido"];
  const buf = {};
  let ctx = null, salida = null, sala = null;

  // descarga y decodifica ya (sin esperar al toque), con un contexto sin salida que no necesita gesto
  if (AC && OAC) {
    const deco = new OAC(1, 1, 44100);
    NOMBRES.forEach((n) => {
      fetch(new URL(n + ".mp3", base))
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then((a) => new Promise((ok, mal) => deco.decodeAudioData(a, ok, mal)))
        .then((b) => (buf[n] = b))
        .catch(() => {});
    });
  }

  function desbloquear() {
    if (!AC) return;
    if (!ctx) {
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12; comp.ratio.value = 3;
      salida = ctx.createGain(); salida.gain.value = 1;
      salida.connect(comp).connect(ctx.destination);
      sala = ctx.createConvolver();   // sala grande y cálida: ruido con caída exponencial, algo filtrado
      const n = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c);
        let prev = 0;
        for (let i = 0; i < n; i++) { prev = prev * .6 + (Math.random() * 2 - 1) * .4; d[i] = prev * Math.pow(1 - i / n, 3); }
      }
      sala.buffer = ir;
      const vuelta = ctx.createGain(); vuelta.gain.value = .45;
      sala.connect(vuelta).connect(salida);
    }
    if (ctx.state === "suspended") ctx.resume();
  }

  // reproduce un efecto: volumen, retraso (s), velocidad (tono), panorama y cuánta sala
  function tocar(nombre, { vol = 1, retraso = 0, vel = 1, pan = 0, reverb = .25 } = {}) {
    if (!ctx || !buf[nombre]) return;
    const t = ctx.currentTime + retraso;
    const s = ctx.createBufferSource();
    s.buffer = buf[nombre];
    s.playbackRate.value = vel;
    const g = ctx.createGain(); g.gain.value = vol;
    let nodo = s.connect(g);
    if (ctx.createStereoPanner && pan) { const p = ctx.createStereoPanner(); p.pan.value = pan; nodo = nodo.connect(p); }
    nodo.connect(salida);
    if (reverb) { const r = ctx.createGain(); r.gain.value = reverb; nodo.connect(r).connect(sala); }
    s.start(t);
  }
  const azar = (a, b) => a + Math.random() * (b - a);

  window.SFX = {
    desbloquear,
    duracion: (n) => (buf[n] ? buf[n].duration : 0),
    // la música de fondo por Web Audio: volumen controlable también en iPhone
    conectarMusica(audio) {
      if (!ctx) return null;
      try {
        const g = ctx.createGain();
        ctx.createMediaElementSource(audio).connect(g).connect(ctx.destination);
        return {
          poner: (v) => g.gain.setValueAtTime(v, ctx.currentTime),
          fundir: (v, s) => {
            const t = ctx.currentTime;
            g.gain.cancelScheduledValues(t);
            g.gain.setValueAtTime(g.gain.value, t);
            g.gain.linearRampToValueAtTime(v, t + s);
          },
        };
      } catch { return null; }
    },
    // ¿ya puede sonar? (el navegador solo deja después de un toque del invitado)
    activo: () => !!ctx && ctx.state === "running",
    // el sobre forcejea: papel que se arruga, la solapa que golpea, el pliegue que cruje
    papel: (vol = 1) => tocar("papel" + (1 + ((Math.random() * 3) | 0)), { vol: vol * azar(.6, .9), vel: azar(.9, 1.15), pan: azar(-.3, .3), reverb: .15 }),
    golpePapel: (vol = 1) => tocar("golpe" + (1 + ((Math.random() * 2) | 0)), { vol: vol * azar(.8, 1.1), vel: azar(.85, 1.05), reverb: .2 }),
    crujido: (vol = 1) => tocar("crujido", { vol: vol * azar(.7, .95), vel: azar(.9, 1.1), reverb: .15 }),
    toque: () => tocar("toque", { vol: .7, reverb: .2 }),             // golpe sordo al tocar el sobre
    temblor: () => {},                                                   // el temblor va en silencio: el lacre lo remata
    lacre: () => tocar("lacre", { vol: 1.6, reverb: .3 }),             // la cera se resquebraja
    solapa: () => tocar("solapa", { vol: 1.2, vel: .92, reverb: .2 }), // el papel de la solapa se despega
    luz: () => tocar("luz", { vol: .8, reverb: .6 }),                  // campanillas cuando sale la luz
    desliza: () => tocar("desliza", { vol: 1, reverb: .15 }),          // la tarjeta roza el sobre al salir
    subida: () => tocar("subida", { vol: .9, reverb: .4 }),            // golpe al revés: la tensión sube hasta el impacto
    caida: () => tocar("caida", { vol: .8, vel: .85, reverb: .3 }),    // el sobre cae
    impacto: () => {                                                     // llega la tarjeta: golpe grave y destello
      tocar("impacto", { vol: 1.1, reverb: .5 });
      tocar("brillo", { vol: .7, retraso: .06, reverb: .7 });
      tocar("luz", { vol: .35, retraso: .25, vel: 1.12, reverb: .8 });
    },
    cohete: () => tocar("cohete", { vol: .35, vel: azar(.9, 1.15), pan: azar(-.6, .6), reverb: .3 }),
    fuego: () => tocar("fuego" + (1 + ((Math.random() * 3) | 0)), { vol: azar(.45, .8), vel: azar(.9, 1.08), pan: azar(-.7, .7), reverb: .35 }),
  };
})();
