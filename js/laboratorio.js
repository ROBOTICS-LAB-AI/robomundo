// Laboratorio de componentes en 3D (Three.js r128, cargado solo cuando se abre).
// El componente flota en el espacio y se gira con el mouse; al pasar el mouse por una parte aparece su
// nombre y al hacer clic, su mini ficha. Los experimentos muestran qué pasa si se conecta bien o mal
// (brilla, no enciende, se quema, se daña…). Las medidas de los modelos están en milímetros.
const Laboratorio = (() => {
  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  const ESCALA_2D = 2.54 / 12; // 1 unidad de los dibujos 2D = 0,2117 mm (12 unidades = 2,54 mm)
  const $ = s => document.querySelector(s);
  let T = null, carga = null;
  let renderer, escena, camara, raiz, piso, sol, cielo, rayo, puntero;
  let estilo = CONFIG.estiloLab || 'cubos';
  let texHumoCubo = null, texChispaCubo = null;
  let def = null, comp = null, radio = 40;
  let activo = false, ultimo = 0, tiempo = 0;
  let rot = {x: -0.3, y: 0.7, vx: 0, vy: 0}, zoom = 1, arrastre = null, quieto = 0;
  let hover = null, seleccion = null, expActual = null;
  const particulas = [];
  let texHumo = null, texBrillo = null, audio = null;

  // ---------- catálogo ----------
  const CATALOGO = [
    {id: 'led', nombre: 'LED', icono: '💡', crear: () => crearLED(), vista: -0.15, cubo: 0.55,
      desc: 'Un diodo que convierte la electricidad en luz. Gira el modelo: la cápsula es transparente y se ven las piezas de adentro.'},
    {id: 'resistencia', nombre: 'Resistencia', icono: '〰️', crear: () => crearResistencia(), vista: 0.35, cubo: 0.6,
      desc: 'Frena la corriente para proteger a otros componentes. Sus bandas de colores dicen cuánto la frena.'},
    {id: 'arduino', nombre: 'Arduino UNO', icono: '🧠', crear: () => crearArduino(), vista: 0.85, cubo: 1.27,
      desc: 'La placa programable: un microcontrolador con todo lo necesario para conectarlo, alimentarlo y programarlo.'},
    {id: 'protoboard', nombre: 'Protoboard', icono: '🔌', crear: () => crearProtoboard(), vista: 0.85, cubo: 1.27,
      desc: 'La placa de pruebas para armar circuitos sin soldar. Pasa el mouse por los agujeros: se iluminan los que están conectados.'},
    {id: 'pulsador', nombre: 'Pulsador', icono: '🔘', crear: () => crearPulsador(), vista: 0.25, cubo: 0.5,
      desc: 'Un botón: mientras lo presionas une sus dos lados y deja pasar la corriente.'},
    {id: 'buzzer', nombre: 'Buzzer', icono: '🔊', crear: () => crearBuzzer(), vista: 0.2, cubo: 0.8,
      desc: 'Convierte la electricidad en sonido haciendo vibrar un disco muy rápido.'},
    {id: 'potenciometro', nombre: 'Potenciómetro', icono: '🎛️', crear: () => crearPotenciometro(), vista: 0.35, cubo: 0.6,
      desc: 'Una perilla: al girarla cambia el voltaje que recibe el pin analógico.'},
    {id: 'rgb', nombre: 'LED RGB', icono: '🌈', crear: () => crearRGB(), vista: -0.15, cubo: 0.55,
      desc: 'Tres LEDs (rojo, verde y azul) dentro de una sola cápsula. Mezclándolos se forman otros colores.'},
    {id: 'servo', nombre: 'Servomotor', icono: '🦾', crear: () => crearServo(), vista: 0.3, cubo: 1.2,
      desc: 'Un motor que gira hasta un ángulo exacto (de 0° a 180°) y se queda ahí.'},
    {id: 'motor', nombre: 'Motor DC', icono: '⚙️', crear: () => crearMotor(), vista: 0.2, cubo: 1.1,
      desc: 'Convierte la electricidad en giro. Mueve ruedas, hélices y ventiladores.'},
    {id: 'ldr', nombre: 'Fotorresistencia', icono: '☀️', crear: () => crearLDR(), vista: 0.5, cubo: 0.45,
      desc: 'Un sensor de luz: deja pasar más corriente cuanta más luz recibe.'},
    {id: 'ultrasonico', nombre: 'Sensor ultrasónico', icono: '🦇', crear: () => crearUltrasonico(), vista: 0.3, cubo: 1,
      desc: 'Mide distancias con sonido, como un murciélago: lanza un sonido y espera su eco.'},
  ];

  // ---------- ayudas de modelado ----------
  const M = (color, extra) => new T.MeshStandardMaterial(Object.assign({color, roughness: 0.55, metalness: 0.05}, extra));
  const METAL = () => M(0xc7cdd6, {metalness: 0.85, roughness: 0.3});
  function malla(geo, mat, parte, pos, datos) {
    const m = new T.Mesh(geo, mat);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    m.castShadow = true;
    m.receiveShadow = true;
    if (parte) m.userData.parte = parte;
    Object.assign(m.userData, datos);
    return m;
  }
  const caja = (w, h, d, mat, parte, pos, datos) => malla(new T.BoxGeometry(w, h, d), mat, parte, pos, datos);
  const cil = (r1, r2, h, mat, parte, pos, datos, seg = 24) => malla(new T.CylinderGeometry(r1, r2, h, seg), mat, parte, pos, datos);
  // Barra recta entre dos puntos del plano xy (para patas dobladas, hilos y cables)
  function segmento(x1, y1, x2, y2, grosor, mat, parte, z = 0, datos) {
    const largo = Math.hypot(x2 - x1, y2 - y1);
    const m = caja(grosor, largo, grosor, mat, parte, [(x1 + x2) / 2, (y1 + y2) / 2, z], datos);
    m.rotation.z = Math.atan2(x1 - x2, y2 - y1);
    return m;
  }
  function nuevoComp() { return {grupo: new T.Group(), partes: {}, experimentos: [], aplicar() {}, actualizar() {}}; }

  function texturaCanvas(ancho, alto, pintar) {
    const cv = document.createElement('canvas');
    cv.width = ancho; cv.height = alto;
    pintar(cv.getContext('2d'));
    const t = new T.CanvasTexture(cv);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }
  function texturaRadial(c1, c2) {
    return texturaCanvas(128, 128, x => {
      const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    });
  }

  // ---------- efectos: humo, chispas y brillo ----------
  function humo(local, cantidad = 1) {
    for (let i = 0; i < cantidad; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({map: estilo === 'cubos' ? texHumoCubo : texHumo, transparent: true, depthWrite: false, opacity: 0.55}));
      s.position.copy(comp.grupo.localToWorld(local.clone())).add(new T.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2));
      s.scale.setScalar(3);
      escena.add(s);
      particulas.push({s, vida: 0, max: 2.4 + Math.random(), tipo: 'humo', v: new T.Vector3((Math.random() - 0.5) * 3, 9 + Math.random() * 5, (Math.random() - 0.5) * 3)});
    }
  }
  function chispas(local, cantidad = 14) {
    for (let i = 0; i < cantidad; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({map: estilo === 'cubos' ? texChispaCubo : texBrillo, color: 0xffd166, transparent: true, depthWrite: false, blending: T.AdditiveBlending}));
      s.position.copy(comp.grupo.localToWorld(local.clone()));
      s.scale.setScalar(1.6);
      escena.add(s);
      particulas.push({s, vida: 0, max: 0.5 + Math.random() * 0.4, tipo: 'chispa', v: new T.Vector3((Math.random() - 0.5) * 50, 20 + Math.random() * 30, (Math.random() - 0.5) * 50)});
    }
  }
  function moverParticulas(dt) {
    for (let i = particulas.length - 1; i >= 0; i--) {
      const p = particulas[i];
      p.vida += dt;
      if (p.tipo === 'chispa') p.v.y -= 90 * dt;
      p.s.position.addScaledVector(p.v, dt);
      const f = p.vida / p.max;
      if (p.tipo === 'humo') { p.s.scale.setScalar(3 + f * 10); p.s.material.opacity = 0.5 * (1 - f); }
      else p.s.material.opacity = 1 - f;
      if (f >= 1) { escena.remove(p.s); p.s.material.dispose(); particulas.splice(i, 1); }
    }
  }
  function brillo(color, tam) {
    const s = new T.Sprite(new T.SpriteMaterial({map: texBrillo, color, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0}));
    s.scale.setScalar(tam);
    s.userData.sinRayo = true;
    return s;
  }
  // "¡Pum!" corto con ruido (si el sonido está activado)
  function pum() {
    if (!CONFIG.sonido) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    audio = audio || new C();
    const n = audio.sampleRate * 0.25, buf = audio.createBuffer(1, n, audio.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const src = audio.createBufferSource(), gan = audio.createGain();
    gan.gain.value = 0.25;
    src.buffer = buf;
    src.connect(gan).connect(audio.destination);
    src.start();
  }
  const brilloMalla = (m, c, i) => { m.userData.brillo = c === null ? null : {c, i}; };

  // =====================================================================================
  // LED (5 mm). Ánodo en x = −1,27 (pata larga, con doblez) y cátodo en x = +1,27.
  // =====================================================================================
  function crearLED() {
    const c = nuevoComp(), g = c.grupo;
    c.partes = {
      capsula: {nombre: 'Cápsula', texto: 'Plástico transparente que protege el interior. Su punta redonda funciona como una lupa: concentra la luz hacia adelante.'},
      borde: {nombre: 'Borde con lado plano', texto: 'El borde de abajo tiene un lado plano: ese lado marca el cátodo (−). Sirve para reconocerlo aunque las patas estén cortadas.'},
      anodo: {nombre: 'Ánodo (+) · pata larga', texto: 'Por aquí entra la corriente. Se conecta hacia el positivo (5V o un pin), pasando por una resistencia.'},
      catodo: {nombre: 'Cátodo (−) · pata corta', texto: 'Por aquí sale la corriente. Se conecta hacia GND.'},
      chip: {nombre: 'Chip semiconductor', texto: 'Un cristal diminuto que brilla cuando la corriente lo atraviesa en el sentido correcto. ¡Es lo que realmente da la luz!'},
      yunque: {nombre: 'Copa reflectora (yunque)', texto: 'La pieza grande de adentro: sostiene el chip, refleja su luz hacia arriba y está unida al cátodo.'},
      poste: {nombre: 'Poste e hilo de oro', texto: 'La pieza pequeña de adentro: un hilo de oro finísimo la une con el chip y lleva la corriente desde el ánodo.'},
    };
    const rojo = op => M(0xf0202e, {transparent: true, opacity: op, roughness: 0.1, depthWrite: false});
    // patas
    [[-1.27, 1, -1.27, -9], [-1.27, -9, -2.4, -10.3], [-2.4, -10.3, -1.27, -11.6], [-1.27, -11.6, -1.27, -28]]
      .forEach(([x1, y1, x2, y2]) => g.add(segmento(x1, y1, x2, y2, 0.5, METAL(), 'anodo')));
    g.add(segmento(1.27, 1, 1.27, -24, 0.5, METAL(), 'catodo'));
    // interior
    const dentro = {interior: true};
    g.add(caja(0.5, 4.3, 0.5, METAL(), 'poste', [-1.0, 3.15, 0], dentro));
    g.add(caja(0.7, 4, 0.5, METAL(), 'yunque', [1.0, 3, 0], dentro));
    g.add(cil(1.15, 0.6, 0.9, METAL(), 'yunque', [0.7, 5.45, 0], dentro, 20));
    c.chip = caja(0.5, 0.3, 0.5, M(0x1f2937), 'chip', [0.7, 6.05, 0], dentro);
    g.add(c.chip);
    g.add(segmento(-1.0, 5.3, 0.6, 6.25, 0.1, M(0xd4a017, {metalness: 0.9, roughness: 0.3}), 'poste', 0, dentro));
    // cápsula: cilindro, cúpula y borde con lado plano (del lado del cátodo)
    c.cuerpo = malla(new T.CylinderGeometry(2.5, 2.5, 5.6, 40, 1, true), rojo(0.62), 'capsula', [0, 3.8, 0], {vidrio: true});
    c.cupula = malla(new T.SphereGeometry(2.5, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), rojo(0.62), 'capsula', [0, 6.6, 0], {vidrio: true});
    const forma = new T.Shape(), a = Math.acos(2.4 / 2.9);
    forma.absarc(0, 0, 2.9, a, 2 * Math.PI - a, false);
    const geoBorde = new T.ExtrudeGeometry(forma, {depth: 1, bevelEnabled: false, curveSegments: 32});
    geoBorde.rotateX(-Math.PI / 2);
    c.borde = malla(geoBorde, rojo(0.75), 'borde', [0, 0, 0], {vidrio: true});
    g.add(c.cuerpo, c.cupula, c.borde);
    c.luz = new T.PointLight(0xff3b3b, 0, 60);
    c.luz.position.set(0, 6, 0);
    c.halo = brillo(0xff4d55, 26);
    c.halo.position.set(0, 6.5, 0);
    g.add(c.luz, c.halo);

    c.experimentos = [
      {id: 'bien', icono: '✅', nombre: 'Conectarlo bien (con resistencia)', texto: '¡Brilla! La corriente entra por el ánodo, atraviesa el chip y sale por el cátodo. La resistencia la mantiene en un nivel seguro.'},
      {id: 'reves', icono: '🔄', nombre: 'Conectarlo al revés', texto: 'No se enciende: el LED es un <b>diodo</b> y solo deja pasar la corriente en un sentido. Tampoco se daña: basta con darle la vuelta.'},
      {id: 'quemar', icono: '💥', nombre: 'Conectarlo sin resistencia', texto: '¡Se quemó! Pasó demasiada corriente: el chip se recalentó, se puso negro y la cápsula se partió. Ese LED ya no sirve.'},
    ];
    const encender = int => {
      [c.cuerpo, c.cupula, c.borde].forEach(m => brilloMalla(m, 0xff2a2a, 0.9 * int));
      brilloMalla(c.chip, 0xffd0d0, 2 * int);
      c.luz.intensity = 2.2 * int;
      c.halo.material.opacity = 0.9 * int;
    };
    c.aplicar = id => {
      c.anim = null;
      if (id === 'bien') encender(1);
      else if (id === 'reves') encender(0);
      else if (id === 'quemar') c.anim = {t: 0, pum: false};
    };
    c.actualizar = dt => {
      const an = c.anim;
      if (!an) return;
      an.t += dt;
      if (an.t < 0.35) { encender(1.8); return; }
      if (!an.pum) {
        an.pum = true;
        encender(0);
        pum();
        chispas(new T.Vector3(0, 7, 0), 18);
        [c.cuerpo, c.cupula, c.borde].forEach(m => { m.material.color.setHex(0x3a1d14); m.material.opacity = 0.85; });
        c.chip.material.color.setHex(0x050505);
      }
      const k = Math.min(1, (an.t - 0.35) / 0.4);               // la punta de la cápsula salta y queda torcida
      c.cupula.position.set(0.8 * k, 6.6 + 3.5 * Math.sin(k * Math.PI * 0.8), 0);
      c.cupula.rotation.z = -0.7 * k;
      if (Math.random() < (an.t < 4 ? 0.5 : 0.08)) humo(new T.Vector3(0, 7, 0));
    };
    return c;
  }

  // =====================================================================================
  // Resistencia 220 Ω, acostada a lo largo del eje x, con las patas dobladas hacia abajo.
  // =====================================================================================
  function crearResistencia() {
    const c = nuevoComp(), g = c.grupo;
    c.partes = {
      cuerpo: {nombre: 'Cuerpo', texto: 'Por dentro tiene una capa de carbón (o de metal) enrollada: es la que frena la corriente. Por fuera, pintura que la aísla.'},
      banda1: {nombre: '1.ª banda: primer número', texto: 'Rojo = 2. Es el primer número del valor.'},
      banda2: {nombre: '2.ª banda: segundo número', texto: 'Rojo = 2. Junto con la primera forman 22.'},
      banda3: {nombre: '3.ª banda: multiplicador', texto: 'Marrón = ×10. Entonces: 22 × 10 = <b>220 Ω</b> (ohmios).'},
      banda4: {nombre: '4.ª banda: tolerancia', texto: 'Dorado = ±5 %: el valor real puede variar un poquito (entre 209 y 231 Ω).'},
      patas: {nombre: 'Patas (terminales)', texto: 'No tienen polaridad: la resistencia funciona igual puesta en cualquier sentido.'},
    };
    const perfil = [[0, -6], [1.05, -6], [1.3, -5.6], [1.3, -3.7], [1.02, -3.2], [1.02, 3.2], [1.3, 3.7], [1.3, 5.6], [1.05, 6], [0, 6]].map(([r, y]) => new T.Vector2(r, y));
    c.cuerpo = malla(new T.LatheGeometry(perfil, 40), M(0xe6cfa0, {roughness: 0.75}), 'cuerpo');
    c.cuerpo.rotation.z = Math.PI / 2;
    g.add(c.cuerpo);
    c.bandas = [[-4.6, 1.34, 0xc81e1e, 'banda1'], [-2.3, 1.06, 0xc81e1e, 'banda2'], [-0.8, 1.06, 0x5c3414, 'banda3'], [4.6, 1.34, 0xc9a227, 'banda4']].map(([x, r, col, parte]) => {
      const b = cil(r, r, 0.8, M(col, parte === 'banda4' ? {metalness: 0.6, roughness: 0.35} : {}), parte, [x, 0, 0], null, 32);
      b.rotation.z = Math.PI / 2;
      g.add(b);
      return b;
    });
    [[-6, 0, -19, 0], [-19, 0, -19, -14], [6, 0, 19, 0], [19, 0, 19, -14]].forEach(([x1, y1, x2, y2]) => g.add(segmento(x1, y1, x2, y2, 0.6, METAL(), 'patas')));
    // "electrones" que recorren la resistencia (experimento de la corriente)
    c.camino = new T.CatmullRomCurve3([[-19, -14], [-19, 0], [-6, 0], [6, 0], [19, 0], [19, -14]].map(([x, y]) => new T.Vector3(x, y, 0)), false, 'catmullrom', 0);
    c.electrones = [...Array(16)].map((_, i) => {
      const e = brillo(0x60a5fa, 2.2);
      e.material.opacity = 0;
      e.userData.u = i / 16;
      g.add(e);
      return e;
    });
    c.experimentos = [
      {id: 'corriente', icono: '⚡', nombre: 'Hacer pasar corriente', texto: 'La corriente pasa, pero la resistencia la <b>frena</b>: los "electrones" se amontonan y van más despacio al cruzarla. Así protege al LED.'},
      {id: 'calor', icono: '🔥', nombre: 'Demasiada corriente', texto: 'Si pasa demasiada corriente, la resistencia se calienta tanto que se quema: se pone negra y suelta humo. Cada resistencia aguanta una potencia máxima.'},
    ];
    c.aplicar = id => { c.modo = id; c.t = 0; c.electrones.forEach(e => { e.material.opacity = id ? 0.9 : 0; }); };
    c.actualizar = dt => {
      if (!c.modo) return;
      c.t += dt;
      const rapido = c.modo === 'calor' ? 3 : 1;
      c.electrones.forEach(e => {
        const enCuerpo = e.userData.u > 0.38 && e.userData.u < 0.62;
        e.userData.u = (e.userData.u + dt * (enCuerpo ? 0.035 : 0.12) * rapido) % 1;
        e.position.copy(c.camino.getPointAt(e.userData.u));
      });
      if (c.modo === 'calor') {
        const k = Math.min(1, c.t / 2.5);
        brilloMalla(c.cuerpo, 0xff4500, 1.2 * k * (c.t < 4 ? 1 : Math.max(0, 1 - (c.t - 4) / 2)));
        if (c.t > 3) { c.cuerpo.material.color.setHex(0x3b2a20); c.bandas.forEach(b => b.material.color.multiplyScalar(0.98)); }
        if (c.t > 1.2 && Math.random() < 0.4) humo(new T.Vector3((Math.random() - 0.5) * 8, 1.5, 0));
        if (c.t > 6) c.electrones.forEach(e => { e.material.opacity = 0; });
      }
    };
    return c;
  }

  // =====================================================================================
  // Arduino UNO: la posición de cada pieza sale del mismo dibujo 2D del juego (324 × 252 unidades).
  // =====================================================================================
  function crearArduino() {
    const c = nuevoComp(), g = c.grupo, s = ESCALA_2D;
    const P = (x2, y2, alto = 0) => [(x2 - 162) * s, 0.8 + alto, (y2 - 126) * s];
    c.partes = {
      placa: {nombre: 'Placa (PCB)', texto: 'La tarjeta verde-azulada. Por dentro y por encima tiene caminos de cobre que unen todas las piezas.'},
      usb: {nombre: 'Conector USB', texto: 'Conecta la placa a la computadora: por aquí recibe energía (5V) y los programas.'},
      jack: {nombre: 'Conector de alimentación', texto: 'Para una batería o un adaptador de 7 a 12 V, cuando la placa no está conectada a la computadora.'},
      reset: {nombre: 'Botón RESET', texto: 'Reinicia el programa desde el principio, como apagar y volver a encender.'},
      chip: {nombre: 'Microcontrolador ATmega328P', texto: 'El cerebro: una computadora diminuta que ejecuta tu programa. Tiene 28 patas.'},
      chipusb: {nombre: 'Chip USB (ATmega16U2)', texto: 'Traduce la comunicación entre la computadora y el microcontrolador.'},
      cristal: {nombre: 'Cristal de 16 MHz', texto: 'Marca el ritmo: hace que el microcontrolador trabaje a 16 millones de pasos por segundo.'},
      regulador: {nombre: 'Regulador de voltaje', texto: 'Convierte la energía del conector de alimentación en 5V estables para toda la placa.'},
      condensador: {nombre: 'Condensadores', texto: 'Guardan un poquito de energía para que el voltaje no tenga saltos.'},
      icsp: {nombre: 'Conector ICSP', texto: 'Para programar el chip directamente, sin el USB (uso avanzado).'},
      ledL: {nombre: 'LED «L»', texto: 'Un LED que ya viene en la placa, conectado al pin 13. ¡Sirve para probar programas sin armar nada!'},
      ledsTXRX: {nombre: 'LEDs TX y RX', texto: 'Parpadean cuando la placa envía (TX) o recibe (RX) datos por el USB.'},
      ledON: {nombre: 'LED ON', texto: 'Se enciende cuando la placa tiene energía.'},
      pinesDigitales: {nombre: 'Pines digitales (0–13)', texto: 'Encienden o apagan cosas (HIGH/LOW) y leen botones. Los que tienen ~ pueden hacer PWM.'},
      pinesEnergia: {nombre: 'Pines de energía', texto: '5V y 3.3V dan energía; GND es el negativo (tierra). VIN recibe energía de una batería.'},
      pinesAnalogicos: {nombre: 'Pines analógicos (A0–A5)', texto: 'Leen valores que cambian poco a poco (de 0 a 1023), como una perilla o un sensor de luz.'},
    };
    // placa con su serigrafía (las letras blancas) pintada en una textura
    const k = 4;
    const serigrafia = texturaCanvas(324 * k, 252 * k, x => {
      x.fillStyle = '#0F8C94'; x.fillRect(0, 0, 324 * k, 252 * k);
      x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 3; x.strokeRect(8 * k, 6 * k, 308 * k, 240 * k);
      x.fillStyle = '#fff';
      [[306, 34], [306, 218], [64, 214]].forEach(([cx, cy]) => { x.beginPath(); x.arc(cx * k, cy * k, 7 * k, 0, 7); x.fill(); x.fillStyle = '#9FB5B7'; x.beginPath(); x.arc(cx * k, cy * k, 5 * k, 0, 7); x.fill(); x.fillStyle = '#fff'; });
      const fuente = tam => `${tam * k}px Silkscreen, monospace`;
      for (const p of PINES_ARDUINO) {
        const arriba = p.y < 100;
        x.save();
        x.translate((p.x + 3) * k, (arriba ? 24 : 230) * k);
        x.rotate(-Math.PI / 2);
        x.textAlign = arriba ? 'right' : 'left';
        x.font = fuente(8);
        x.fillText(p.etiqueta, 0, 0);
        x.restore();
      }
      x.textAlign = 'center';
      x.font = fuente(7); x.fillText('DIGITAL (PWM~)', 238 * k, 56 * k);
      x.fillText('POWER', 136 * k, 202 * k); x.fillText('ANALOG IN', 232 * k, 202 * k);
      x.fillText('ICSP', 305 * k, 186 * k);
      x.textAlign = 'left'; x.font = fuente(6);
      [['L', 54], ['TX', 66], ['RX', 78]].forEach(([t, y]) => x.fillText(t, 110 * k, y * k));
      x.fillText('ON', 276 * k, 102 * k);
      x.lineWidth = 3.5 * k; x.strokeStyle = '#fff';
      [146, 164].forEach(cx => { x.beginPath(); x.arc(cx * k, 102 * k, 9 * k, 0, 7); x.stroke(); });
      x.fillRect(142 * k, 101 * k, 8 * k, 2 * k); x.fillRect(160 * k, 101 * k, 8 * k, 2 * k); x.fillRect(163 * k, 98 * k, 2 * k, 8 * k);
      x.font = `bold ${26 * k}px Silkscreen, monospace`; x.fillText('UNO', 180 * k, 114 * k);
      x.font = fuente(9); x.fillText('ARDUINO', 182 * k, 128 * k);
    });
    const lados = M(0x0a6a70);
    g.add(malla(new T.BoxGeometry(324 * s, 1.6, 252 * s), [lados, lados, M(0xffffff, {map: serigrafia, roughness: 0.6}), lados, lados, lados], 'placa', [0, 0, 0]));
    // conectores y botón
    g.add(caja(58 * s, 11, 52 * s, METAL(), 'usb', P(17, 52, 5.5)));
    g.add(caja(0.4, 7.5, 8, M(0x30353c), 'usb', [-37.2, 6.6, P(17, 52)[2]]));
    g.add(caja(52 * s, 11, 46 * s, M(0x1f2328), 'jack', P(16, 195, 5.5)));
    const hueco = cil(2.2, 2.2, 0.6, M(0x050505), 'jack', [-36.6, 6.3, P(16, 195)[2]], null, 20);
    hueco.rotation.z = Math.PI / 2;
    g.add(hueco);
    g.add(caja(3.8, 1.5, 3.8, M(0xd0d5dc), 'reset', P(61, 41, 0.75)));
    g.add(cil(1.2, 1.2, 1.2, M(0xe5484d), 'reset', P(61, 41, 2.1)));
    // microcontrolador con sus 28 patas
    c.chip = caja(140 * s, 3.5, 34 * s, M(0x23262c, {roughness: 0.7}), 'chip', P(220, 167, 2.3));
    g.add(c.chip);
    for (let i = 0; i < 14; i++) for (const lado of [-1, 1]) g.add(caja(0.5, 2.6, 0.8, METAL(), 'chip', [P(220, 167)[0] - 14.3 + i * 2.2, 1.6, P(220, 167)[2] + lado * 4.1]));
    g.add(cil(0.7, 0.7, 0.2, M(0x3b3f46), 'chip', [P(220, 167)[0] - 13.5, 4.9, P(220, 167)[2]]));
    g.add(caja(5, 1, 5, M(0x23262c), 'chipusb', P(66, 102, 0.5)));
    g.add(caja(6.3, 3, 2.5, METAL(), 'cristal', P(99, 126, 1.5)));
    c.regulador = caja(4.2, 2.5, 3.4, M(0x23262c), 'regulador', P(60, 181, 1.25));
    g.add(c.regulador, caja(4.2, 0.4, 1.8, METAL(), 'regulador', P(60, 169, 0.2)));
    [[88, 172], [108, 172]].forEach(([x2, y2]) => { g.add(cil(1.7, 1.7, 4, METAL(), 'condensador', P(x2, y2, 2))); g.add(cil(1.72, 1.72, 0.15, M(0x1f2937), 'condensador', P(x2, y2, 4.05))); });
    g.add(caja(22 * s, 2.5, 32 * s, M(0x1e2126), 'icsp', P(305, 156, 1.25)));
    for (const x2 of [300, 310]) for (const y2 of [146, 156, 166]) g.add(caja(0.6, 6, 0.6, M(0xd4a017, {metalness: 0.8, roughness: 0.3}), 'icsp', P(x2, y2, 3)));
    const led = (x2, y2, col, parte) => { const m = caja(1.8, 0.8, 1.1, M(col, {roughness: 0.3}), parte, P(x2, y2, 0.4)); g.add(m); return m; };
    c.ledL = led(102, 50, 0xf5c542, 'ledL');
    c.ledTX = led(102, 62, 0xf5c542, 'ledsTXRX');
    c.ledRX = led(102, 74, 0xf5c542, 'ledsTXRX');
    c.ledON = led(296, 98, 0x4ade80, 'ledON');
    // regletas de pines (con sus agujeros)
    [[124, 14, 120, 'pinesDigitales'], [238, 14, 96, 'pinesDigitales'], [136, 238, 96, 'pinesEnergia'], [232, 238, 72, 'pinesAnalogicos']].forEach(([x2, y2, ancho, parte]) => g.add(caja(ancho * s, 8.5, 2.54, M(0x1e2126), parte, P(x2, y2, 4.25))));
    for (const p of PINES_ARDUINO) {
      const parte = p.y < 100 ? 'pinesDigitales' : /^A\d$/.test(p.id) ? 'pinesAnalogicos' : 'pinesEnergia';
      g.add(caja(1, 0.1, 1, M(0x050608), parte, P(p.x, p.y, 8.55)));
    }
    g.add(caja(1, 0.1, 1, M(0x050608), 'pinesEnergia', P(94, 238, 8.55)));

    c.experimentos = [
      {id: 'usb', icono: '🔌', nombre: 'Conectarla por USB', texto: 'Se enciende el LED ON y el LED «L» parpadea: muchas placas vienen con el programa de parpadeo ya cargado. TX y RX titilan mientras la computadora y la placa se comunican.'},
      {id: 'corto', icono: '⚡', nombre: 'Cortocircuito: unir 5V con GND', texto: '¡Se dañó! El cable rojo unió el 5V con GND sin nada en el medio: pasó muchísima corriente, saltaron chispas y el regulador se recalentó. En la vida real la placa puede quedar inservible (o se apaga para protegerse).'},
    ];
    const pin = id => { const p = PINES_ARDUINO.find(q => q.id === id); return new T.Vector3(...P(p.x, p.y, 8.6)); };
    c.aplicar = id => {
      c.modo = id;
      c.t = 0;
      if (id === 'corto' && !c.cable) {
        const a = pin('5V'), b = pin('GND2'), medio = a.clone().add(b).multiplyScalar(0.5).add(new T.Vector3(0, 9, 4));
        c.cable = malla(new T.TubeGeometry(new T.QuadraticBezierCurve3(a, medio, b), 24, 0.55, 8), M(0xe53935), null);
        g.add(c.cable);
      }
    };
    c.actualizar = dt => {
      if (!c.modo) return;
      c.t += dt;
      if (c.modo === 'usb') {
        brilloMalla(c.ledON, 0x22ff66, 1.6);
        brilloMalla(c.ledL, 0xffd23f, Math.floor(c.t * 2) % 2 ? 0 : 1.8);
        const comunica = c.t < 2.5 && Math.random() < 0.5;
        brilloMalla(c.ledTX, 0xffd23f, comunica ? 1.5 : 0);
        brilloMalla(c.ledRX, 0xffd23f, comunica && Math.random() < 0.5 ? 1.5 : 0);
      } else if (c.modo === 'corto') {
        brilloMalla(c.ledL, null);
        brilloMalla(c.ledON, 0x22ff66, c.t < 0.8 && Math.random() < 0.5 ? 1.6 : 0);
        if (!c.chispazo) { c.chispazo = true; pum(); chispas(pin('5V'), 22); chispas(pin('GND2'), 22); }
        if (c.t > 0.8 && !c.danado) {
          c.danado = true;
          c.regulador.material.color.setHex(0x120a06);
          g.add(caja(8, 0.12, 4, M(0x1a0e08, {roughness: 1}), 'chip', [P(220, 167)[0] - 6, 4.92, P(220, 167)[2]]));
        }
        if (Math.random() < (c.t < 5 ? 0.45 : 0.06)) humo(new T.Vector3(...P(60, 181, 3)));
        if (c.t < 5 && Math.random() < 0.2) humo(new T.Vector3(...P(140, 238, 9)));
      }
    };
    return c;
  }

  // =====================================================================================
  // Protoboard: mismo trazado que el dibujo 2D (408 × 228 unidades); las partes se reconocen por
  // la posición donde apunta el mouse sobre la cara de arriba.
  // =====================================================================================
  function crearProtoboard() {
    const c = nuevoComp(), g = c.grupo, s = ESCALA_2D, k = 4, alto = 8.5;
    const X = x2 => (x2 - 204) * s, Z = y2 => (y2 - 114) * s;
    c.partes = {
      columna: {nombre: 'Columna de 5 agujeros', texto: 'Los 5 agujeros de una columna (a–e o f–j) están unidos por dentro: se iluminan juntos en verde.'},
      riel: {nombre: 'Riel (+ o −)', texto: 'Una fila larga: todos sus agujeros están unidos a lo largo. Sirve para repartir 5V (riel +) o GND (riel −) por toda la placa.'},
      canal: {nombre: 'Canal central', texto: 'Separa las dos mitades: las columnas de arriba y las de abajo <b>no</b> están unidas. Ahí se ponen los pulsadores y los chips.'},
      cuerpo: {nombre: 'Cuerpo de plástico', texto: 'Aísla: la corriente solo puede pasar por las tiras de metal de adentro.'},
      tira: {nombre: 'Tira metálica (por dentro)', texto: 'Una lámina con "pinzas" que aprietan las patas de los componentes y unen los agujeros de una columna o de un riel.'},
    };
    const cara = texturaCanvas(408 * k, 228 * k, x => {
      x.fillStyle = '#F4F1E8'; x.fillRect(0, 0, 408 * k, 228 * k);
      x.fillStyle = '#DCD5C3'; x.fillRect(6 * k, 110 * k, 396 * k, 8 * k);
      [[9, '#E5484D'], [39, '#3B82F6'], [189, '#E5484D'], [219, '#3B82F6']].forEach(([y, col]) => { x.fillStyle = col; x.fillRect(20 * k, (y - 1) * k, 368 * k, 2 * k); });
      x.textAlign = 'center';
      x.font = `${8 * k}px Silkscreen, monospace`;
      x.fillStyle = '#8A847A';
      for (const f in FILAS_PROTO) { x.fillText(f, 14 * k, (FILAS_PROTO[f] + 3) * k); x.fillText(f, 394 * k, (FILAS_PROTO[f] + 3) * k); }
      [1, 5, 10, 15, 20, 25, 30].forEach(col => x.fillText(col, colProto(col) * k, 47 * k));
      for (const [r, y] of RIELES_PROTO) { x.fillStyle = r[0] === 'p' ? '#E5484D' : '#3B82F6'; x.fillText(r[0] === 'p' ? '+' : '-', 12 * k, (y + 3) * k); x.fillText(r[0] === 'p' ? '+' : '-', 396 * k, (y + 3) * k); }
      x.fillStyle = '#4B5260';
      for (const h of AGUJEROS_PROTO) x.fillRect((h.x - 2.5) * k, (h.y - 2.5) * k, 5 * k, 5 * k);
    });
    c.mats = [0, 1, 2, 3, 4, 5].map(i => M(0xffffff, i === 2 ? {map: cara, roughness: 0.8} : {color: 0xf4f1e8, roughness: 0.8}));
    c.cuerpo = malla(new T.BoxGeometry(408 * s, alto, 228 * s), c.mats, 'cuerpo', [0, 0, 0]);
    g.add(c.cuerpo);
    // tiras metálicas (solo se ven con rayos X)
    c.tiras = [];
    const tira = (x2, y2, ancho, largo) => { const m = caja(ancho * s, 3, largo * s, METAL(), 'tira', [X(x2), 1.5, Z(y2)]); m.visible = false; c.tiras.push(m); g.add(m); };
    for (let col = 1; col <= 30; col++) { tira(colProto(col), 150, 6, 56); tira(colProto(col), 78, 6, 56); }
    for (const [, y] of RIELES_PROTO) { const m = caja(344 * s, 3, 6 * s, METAL(), 'tira', [X(210), 1.5, Z(y)]); m.visible = false; c.tiras.push(m); g.add(m); }
    // zona iluminada al pasar el mouse
    c.zona = caja(1, 0.3, 1, M(0x22c55e, {transparent: true, opacity: 0.45, emissive: 0x22c55e, emissiveIntensity: 0.6}), null, [0, alto / 2 + 0.2, 0]);
    c.zona.visible = false;
    c.zona.userData.noVox = true;
    c.zona.raycast = () => {};
    c.zona.castShadow = false;
    g.add(c.zona);
    const zona = (x1, y1, x2, y2) => {
      c.zona.visible = true;
      c.zona.scale.set((x2 - x1) * s, 1, (y2 - y1) * s);
      c.zona.position.set(X((x1 + x2) / 2), alto / 2 + 0.2, Z((y1 + y2) / 2));
    };
    c.limpiar = () => { c.zona.visible = false; };
    c.resolver = h => {
      if (h.object !== c.cuerpo) return h.object.userData.parte;
      const p = c.grupo.worldToLocal(h.point.clone());
      if (p.y < alto / 2 - 0.6) return 'cuerpo';
      const x2 = p.x / s + 204, y2 = p.z / s + 114;
      if (x2 < 22 || x2 > 386) return 'cuerpo';
      const riel = RIELES_PROTO.find(([, y]) => Math.abs(y2 - y) <= 6);
      if (riel) { zona(36, riel[1] - 5, 384, riel[1] + 5); return 'riel'; }
      if (y2 > 108 && y2 < 120) return 'canal';
      if (y2 < 46 || y2 > 182) return 'cuerpo';
      const col = Math.max(1, Math.min(30, Math.round((x2 - 30) / 12) + 1)), arriba = y2 < 114;
      zona(colProto(col) - 5, arriba ? 48 : 120, colProto(col) + 5, arriba ? 108 : 180);
      return 'columna';
    };

    c.experimentos = [
      {id: 'rayosx', icono: '🔍', nombre: 'Ver por dentro (rayos X)', texto: 'Por dentro hay <b>tiras de metal</b>: cada tira une los 5 agujeros de una columna, y las tiras largas forman los rieles. Por eso los agujeros de una misma columna están conectados.'},
      {id: 'led', icono: '💡', nombre: 'Insertar un LED', texto: 'Cada pata del LED queda en una columna distinta (en rojo la del ánodo, en azul la del cátodo). Todo lo que conectes en la columna de la pata larga quedará unido a ella.'},
    ];
    c.aplicar = id => {
      if (id === 'rayosx') {
        c.mats.forEach(m => { m.transparent = true; m.opacity = 0.22; m.depthWrite = false; m.needsUpdate = true; });
        c.tiras.forEach(m => { m.visible = true; });
      } else if (id === 'led' && !c.led) {
        // LED del laboratorio, con las patas en e9 (ánodo) y e10 (cátodo), y sus columnas marcadas
        c.led = crearLED();
        c.led.grupo.position.set(X(colProto(9) + 6), alto / 2 + 22, Z(126));
        c.led.grupo.traverse(o => { if (o.isMesh) o.userData.parte = null; });
        g.add(c.led.grupo);
        [[9, 0xef4444], [10, 0x3b82f6]].forEach(([col, color]) => {
          const m = caja(10 * s, 0.3, 60 * s, M(color, {transparent: true, opacity: 0.5, emissive: color, emissiveIntensity: 0.6}), null, [X(colProto(col)), alto / 2 + 0.2, Z(150)]);
          m.raycast = () => {};
          m.userData.noVox = true;
          g.add(m);
        });
      }
    };
    return c;
  }


  // ---------- ayudas para los modelos con interior ----------
  // Vuelve transparentes las carcasas y muestra (o esconde) las piezas de adentro.
  function verDentro(c, si) {
    (c.carcasas || []).forEach(m => {
      const mt = m.material;
      mt.transparent = si || !!mt.userData.transparente;
      mt.opacity = si ? 0.2 : mt.userData.opacidad || 1;
      mt.depthWrite = !si;
      mt.needsUpdate = true;
    });
    (c.interior || []).forEach(m => { m.visible = si; });
  }
  const oculto = m => { m.visible = false; return m; };

  // Cartel flotante con texto (valores de un experimento)
  function cartel(txt) {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 128;
    const tex = new T.CanvasTexture(cv);
    const s = new T.Sprite(new T.SpriteMaterial({map: tex, transparent: true, depthWrite: false}));
    s.userData.sinRayo = true;
    s.escribir = t => {
      const x = cv.getContext('2d');
      x.clearRect(0, 0, 512, 128);
      x.fillStyle = 'rgba(31,41,55,.88)';
      x.beginPath(); x.roundRect ? x.roundRect(8, 8, 496, 112, 28) : x.rect(8, 8, 496, 112); x.fill();
      x.fillStyle = '#fff'; x.font = 'bold 54px Nunito, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(t, 256, 66);
      tex.needsUpdate = true;
    };
    s.escribir(txt);
    return s;
  }

  // Pitido del buzzer (si el sonido está activado)
  function pitido(f, dur) {
    if (!CONFIG.sonido) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    audio = audio || new C();
    const o = audio.createOscillator(), gan = audio.createGain();
    o.type = 'square'; o.frequency.value = f; gan.gain.value = 0.04;
    o.connect(gan).connect(audio.destination);
    o.start(); o.stop(audio.currentTime + dur);
  }

  // =====================================================================================
  // Pulsador (6 × 6 mm). Las patas del lado 1 (x −) y del lado 2 (x +) están unidas de a pares por dentro.
  // =====================================================================================
  function crearPulsador() {
    const c = nuevoComp(), g = c.grupo;
    c.partes = {
      boton: {nombre: 'Botón', texto: 'La parte que presionas. Empuja hacia abajo una lámina de metal que está adentro.'},
      marco: {nombre: 'Marco de metal', texto: 'Sujeta el botón a la base y lo mantiene en su lugar.'},
      cuerpo: {nombre: 'Base de plástico', texto: 'Aísla y sostiene las piezas de metal de adentro.'},
      lado1: {nombre: 'Patas del lado 1', texto: 'Estas dos patas están <b>unidas siempre</b> por dentro, por una tira de metal.'},
      lado2: {nombre: 'Patas del lado 2', texto: 'Estas dos también están unidas siempre entre ellas. Al presionar, el lado 1 y el lado 2 se unen.'},
      domo: {nombre: 'Lámina de contacto (domo)', texto: 'Una lámina curva que no toca las tiras… hasta que presionas el botón. Entonces las une y la corriente pasa.'},
    };
    const base = caja(6, 3.4, 6, M(0x2b2f36), 'cuerpo', [0, 1.7, 0]);
    const marco = caja(6.2, 0.4, 6.2, METAL(), 'marco', [0, 3.6, 0]);
    g.add(base, marco);
    [-1, 1].forEach(sx => g.add(caja(0.4, 2.6, 2, METAL(), 'marco', [sx * 3.1, 2.4, 0])));
    c.boton = new T.Group();
    c.boton.add(cil(1.8, 1.8, 1.2, M(0x3b3f46), 'boton', [0, 4.4, 0]), cil(3, 3, 2.6, M(0xe5484d), 'boton', [0, 6, 0], null, 32));
    g.add(c.boton);
    for (const [x, parte] of [[-3.25, 'lado1'], [3.25, 'lado2']]) for (const z of [-2.25, 2.25]) {
      g.add(segmento(x * 0.9, 0.8, x, -0.4, 0.6, METAL(), parte, z), segmento(x, -0.4, x, -4, 0.6, METAL(), parte, z));
    }
    const dentro = {interior: true};
    c.tiras = [-2, 2].map((x, i) => oculto(caja(0.8, 0.3, 5, METAL(), i ? 'lado2' : 'lado1', [x, 0.9, 0], dentro)));
    c.domo = oculto(cil(1.8, 2.3, 0.4, M(0xd4d8de, {metalness: 0.8, roughness: 0.3}), 'domo', [0, 2.4, 0], dentro, 24));
    g.add(...c.tiras, c.domo);
    c.carcasas = [base, marco, ...c.boton.children];
    c.interior = [...c.tiras, c.domo];
    c.experimentos = [
      {id: 'rayosx', icono: '🔍', nombre: 'Ver por dentro', texto: 'Hay dos tiras de metal: cada una une las dos patas de su lado. Encima, una lámina curva (domo) que no las toca… hasta que presionas.'},
      {id: 'presionar', icono: '👆', nombre: 'Presionarlo', texto: 'Al presionar, la lámina baja y toca las dos tiras: los dos lados quedan unidos y la corriente pasa (en verde). Al soltar, la lámina sube y corta el paso.'},
    ];
    c.aplicar = id => { c.modo = id; c.t = 0; verDentro(c, true); };
    c.actualizar = dt => {
      if (c.modo !== 'presionar') return;
      c.t += dt;
      const abajo = Math.floor(c.t / 1.1) % 2 === 1;
      c.boton.position.y += ((abajo ? -0.9 : 0) - c.boton.position.y) * Math.min(1, dt * 14);
      c.domo.scale.y = abajo ? 0.4 : 1;
      c.domo.position.y = abajo ? 1.3 : 2.4;
      c.tiras.forEach(t => brilloMalla(t, abajo ? 0x22c55e : null, 1.4));
      brilloMalla(c.domo, abajo ? 0x22c55e : null, 1.4);
    };
    return c;
  }

  // =====================================================================================
  // Buzzer (12 mm). Pata + en x −3,8 (la larga) y pata − en x +3,8.
  // =====================================================================================
  function crearBuzzer() {
    const c = nuevoComp(), g = c.grupo;
    c.partes = {
      carcasa: {nombre: 'Carcasa', texto: 'El cilindro negro: protege las piezas y hace que el sonido salga más fuerte (como la caja de una guitarra).'},
      agujero: {nombre: 'Agujero de sonido', texto: 'Por aquí sale el sonido.'},
      marca: {nombre: 'Marca +', texto: 'Indica de qué lado está la pata positiva.'},
      mas: {nombre: 'Pata + (larga)', texto: 'Va hacia el pin del Arduino o hacia 5V.'},
      menos: {nombre: 'Pata − (corta)', texto: 'Va hacia GND.'},
      disco: {nombre: 'Disco piezoeléctrico', texto: 'Un disco de metal y cerámica que se dobla muy rápido cuando recibe electricidad. Esa vibración mueve el aire: ¡eso es el sonido!'},
      circuito: {nombre: 'Circuito oscilador', texto: 'En un buzzer "activo", este circuito hace vibrar el disco solo con darle 5V.'},
    };
    const carcasa = cil(6, 6, 9.5, M(0x1f2328, {roughness: 0.7}), 'carcasa', [0, 4.75, 0], null, 40);
    g.add(carcasa, cil(1, 1, 0.3, M(0x050505), 'agujero', [0, 9.6, 0]));
    g.add(caja(1.8, 0.12, 0.45, M(0xffffff), 'marca', [-3.4, 9.56, 0]), caja(0.45, 0.12, 1.8, M(0xffffff), 'marca', [-3.4, 9.56, 0]));
    g.add(segmento(-3.8, 0.3, -3.8, -11, 0.6, METAL(), 'mas'), segmento(3.8, 0.3, 3.8, -8, 0.6, METAL(), 'menos'));
    const dentro = {interior: true};
    c.disco = new T.Group();
    c.disco.add(oculto(cil(4.6, 4.6, 0.25, M(0xd4a017, {metalness: 0.8, roughness: 0.3}), 'disco', [0, 0, 0], dentro, 32)), oculto(cil(3, 3, 0.35, M(0xf1f5f9), 'disco', [0, 0.05, 0], dentro, 32)));
    c.disco.position.y = 6.5;
    g.add(c.disco, oculto(caja(5, 0.8, 3, M(0x15803d), 'circuito', [0, 1.6, 0], dentro)));
    c.carcasas = [carcasa];
    c.interior = [];
    g.traverse(o => { if (o.userData.interior) c.interior.push(o); });
    c.ondas = [];
    c.experimentos = [
      {id: 'sonar', icono: '🔊', nombre: 'Conectarlo bien', texto: '¡Suena! El disco vibra cientos de veces por segundo y empuja el aire: esas ondas llegan a tus oídos como sonido.'},
      {id: 'reves', icono: '🔄', nombre: 'Conectarlo al revés', texto: 'No suena: este buzzer tiene polaridad. Su circuito interno solo funciona si la corriente entra por la pata +.'},
      {id: 'rayosx', icono: '🔍', nombre: 'Ver por dentro', texto: 'Adentro hay un disco piezoeléctrico (dorado y blanco) y un pequeño circuito que lo hace vibrar.'},
    ];
    c.aplicar = id => { c.modo = id; c.t = 0; c.prox = 0; verDentro(c, true); };
    c.actualizar = dt => {
      if (c.modo !== 'sonar') return;
      c.t += dt;
      const suena = c.t % 0.6 < 0.3;
      c.disco.scale.y = suena ? 1 + 0.6 * Math.sin(c.t * 120) : 1;
      if (suena && c.t >= c.prox) {
        c.prox = c.t + 0.6;
        pitido(1000, 0.3);
      }
      if (suena && Math.random() < 0.35) {
        const anillo = malla(new T.RingGeometry(0.8, 1.3, 32), M(0x8b5cf6, {transparent: true, opacity: 0.8, side: T.DoubleSide, emissive: 0x8b5cf6, emissiveIntensity: 0.6}), null, [0, 10, 0], {noVox: true, sinRayo: true});
        anillo.rotation.x = -Math.PI / 2;
        anillo.castShadow = false;
        g.add(anillo);
        c.ondas.push(anillo);
      }
      for (let i = c.ondas.length - 1; i >= 0; i--) {
        const a = c.ondas[i];
        a.position.y += dt * 8;
        a.scale.multiplyScalar(1 + dt * 2.2);
        a.material.opacity -= dt * 0.8;
        if (a.material.opacity <= 0) { g.remove(a); c.ondas.splice(i, 1); }
      }
    };
    return c;
  }

  // =====================================================================================
  // Potenciómetro: cuerpo azul con perilla blanca; patas en x −2,54 / 0 / +2,54.
  // =====================================================================================
  function crearPotenciometro() {
    const c = nuevoComp(), g = c.grupo;
    c.partes = {
      perilla: {nombre: 'Perilla', texto: 'La giras con los dedos (o con un destornillador). Mueve el cursor que está adentro.'},
      cuerpo: {nombre: 'Cuerpo', texto: 'Protege la pista de resistencia y el cursor.'},
      extremo1: {nombre: 'Extremo 1', texto: 'Una punta de la pista. Se conecta a GND (o a 5V).'},
      extremo2: {nombre: 'Extremo 2', texto: 'La otra punta de la pista. Se conecta a 5V (o a GND).'},
      centro: {nombre: 'Pata del centro (cursor)', texto: 'Está unida al cursor. Va a un pin analógico (A0): recibe un voltaje entre 0 y 5V según cuánto gires.'},
      pista: {nombre: 'Pista de carbón', texto: 'Una resistencia en forma de herradura. Sus dos puntas son los extremos.'},
      cursor: {nombre: 'Cursor', texto: 'Un contacto de metal que se desliza sobre la pista al girar la perilla. Cuanto más cerca de la punta de 5V, más voltaje recibe.'},
    };
    const cuerpo = caja(10, 5, 10, M(0x2563eb), 'cuerpo', [0, 2.5, 0]);
    g.add(cuerpo);
    c.giro = new T.Group();
    c.giro.position.y = 5;
    c.giro.add(cil(3.6, 3.6, 2.6, M(0xf3f4f6), 'perilla', [0, 1.3, 0], null, 32), caja(5.4, 0.4, 0.9, M(0x111827), 'perilla', [0, 2.65, 0]));
    const dentro = {interior: true};
    c.cursor = oculto(caja(3.2, 0.3, 0.6, METAL(), 'cursor', [1.6, -1.6, 0], dentro));
    c.giro.add(c.cursor);
    g.add(c.giro);
    const geoPista = new T.TorusGeometry(3, 0.5, 8, 40, Math.PI * 1.5);
    geoPista.rotateX(Math.PI / 2);
    geoPista.rotateY(Math.PI * 0.75);
    g.add(oculto(malla(geoPista, M(0x3f2a1d, {roughness: 0.9}), 'pista', [0, 3.2, 0], dentro)));
    [[-2.54, 'extremo1'], [0, 'centro'], [2.54, 'extremo2']].forEach(([x, parte]) => g.add(segmento(x, 0.2, x, -6, 0.6, METAL(), parte, 4)));
    c.carcasas = [cuerpo];
    c.interior = [];
    g.traverse(o => { if (o.userData.interior) c.interior.push(o); });
    c.valor = cartel('A0 = 512');
    c.valor.scale.set(20, 5, 1);
    c.valor.position.set(0, 13, 0);
    c.valor.visible = false;
    g.add(c.valor);
    c.experimentos = [
      {id: 'girar', icono: '🎛️', nombre: 'Girar la perilla', texto: 'Al girar, el cursor recorre la pista: cerca de una punta recibe casi 0V (A0 ≈ 0) y cerca de la otra, casi 5V (A0 ≈ 1023).'},
      {id: 'rayosx', icono: '🔍', nombre: 'Ver por dentro', texto: 'Adentro hay una pista de carbón en forma de herradura y un cursor de metal que la recorre al girar.'},
    ];
    c.aplicar = id => { c.modo = id; c.t = 0; verDentro(c, true); c.valor.visible = id === 'girar'; };
    c.actualizar = dt => {
      if (c.modo !== 'girar') return;
      c.t += dt;
      const pos = 0.5 - 0.5 * Math.cos(c.t * 0.9);
      c.giro.rotation.y = Math.PI * 0.75 - pos * Math.PI * 1.5;
      c.valor.escribir(`A0 = ${Math.round(pos * 1023)}`);
    };
    return c;
  }

  // =====================================================================================
  // LED RGB de cátodo común: patas R (x −3,81), común (x −1,27, la más larga), G (+1,27) y B (+3,81).
  // =====================================================================================
  function crearRGB() {
    const c = nuevoComp(), g = c.grupo;
    c.partes = {
      capsula: {nombre: 'Cápsula difusa', texto: 'Plástico lechoso: mezcla la luz de los tres chips para que se vea un solo color.'},
      chips: {nombre: 'Tres chips: rojo, verde y azul', texto: 'Cada uno da su color. Encendiendo varios a la vez se mezclan: rojo + verde = amarillo, rojo + azul = morado…'},
      r: {nombre: 'Pata R (rojo)', texto: 'Enciende el chip rojo. Va a un pin con ~, a través de una resistencia.'},
      comun: {nombre: 'Pata común (−)', texto: 'La más larga: es el cátodo de los tres chips. Va a GND.'},
      gpata: {nombre: 'Pata G (verde)', texto: 'Enciende el chip verde (con su propia resistencia).'},
      bpata: {nombre: 'Pata B (azul)', texto: 'Enciende el chip azul (con su propia resistencia).'},
    };
    const blanco = op => M(0xf4f4f5, {transparent: true, opacity: op, roughness: 0.4, depthWrite: false});
    [[-3.81, 'r', -24], [1.27, 'gpata', -24], [3.81, 'bpata', -24]].forEach(([x, parte, y2]) => g.add(segmento(x * 0.6, 1, x, -1.5, 0.5, METAL(), parte), segmento(x, -1.5, x, y2, 0.5, METAL(), parte)));
    g.add(segmento(-1.27, 1, -1.27, -28, 0.5, METAL(), 'comun'));
    const dentro = {interior: true};
    g.add(cil(1.3, 0.8, 0.8, METAL(), 'comun', [-0.6, 5.4, 0], dentro, 20), caja(0.6, 4.4, 0.5, METAL(), 'comun', [-1.1, 3.2, 0], dentro));
    c.chips = [[-0.9, 0xb91c1c], [-0.3, 0x15803d], [0.3, 0x1d4ed8]].map(([x, col]) => caja(0.45, 0.3, 0.45, M(col), 'chips', [x - 0.3, 5.95, 0], dentro));
    g.add(...c.chips);
    c.cuerpo = malla(new T.CylinderGeometry(2.5, 2.5, 5.6, 40, 1, true), blanco(0.55), 'capsula', [0, 3.8, 0], {vidrio: true});
    c.cupula = malla(new T.SphereGeometry(2.5, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), blanco(0.55), 'capsula', [0, 6.6, 0], {vidrio: true});
    c.borde = cil(2.9, 2.9, 1, blanco(0.7), 'capsula', [0, 0.5, 0], {vidrio: true}, 40);
    g.add(c.cuerpo, c.cupula, c.borde);
    c.luz = new T.PointLight(0xffffff, 0, 60);
    c.luz.position.set(0, 6, 0);
    c.halo = brillo(0xffffff, 26);
    c.halo.position.set(0, 6.5, 0);
    g.add(c.luz, c.halo);
    const COLORES = [['rojo', [1, 0, 0]], ['verde', [0, 1, 0]], ['azul', [0, 0, 1]], ['amarillo', [1, 1, 0]], ['morado', [1, 0, 1]], ['celeste', [0, 1, 1]], ['blanco', [1, 1, 1]]];
    c.cartel = cartel('rojo');
    c.cartel.scale.set(20, 5, 1);
    c.cartel.position.set(0, 16, 0);
    c.cartel.visible = false;
    g.add(c.cartel);
    const mostrar = ([r, v, a], int = 1) => {
      const color = new T.Color(r, v, a);
      [c.cuerpo, c.cupula, c.borde].forEach(m => brilloMalla(m, color.getHex(), 0.9 * int));
      c.chips.forEach((ch, i) => brilloMalla(ch, [0xff2020, 0x20ff40, 0x3060ff][i], [r, v, a][i] * 2 * int));
      c.luz.color = color; c.luz.intensity = 2 * int * Math.max(r, v, a);
      c.halo.material.color = color; c.halo.material.opacity = 0.85 * int * Math.max(r, v, a);
    };
    c.experimentos = [
      {id: 'mezclar', icono: '🌈', nombre: 'Mezclar colores', texto: 'Con un solo chip encendido se ve su color. Con dos: rojo + verde = <b>amarillo</b>, rojo + azul = <b>morado</b>, verde + azul = <b>celeste</b>. ¡Los tres juntos dan <b>blanco</b>!'},
      {id: 'quemar', icono: '💥', nombre: 'Conectarlo sin resistencias', texto: '¡Se quemó! Cada color necesita su propia resistencia. Sin ellas pasa demasiada corriente y los chips se queman.'},
    ];
    c.aplicar = id => { c.modo = id; c.t = 0; c.cartel.visible = id === 'mezclar'; };
    c.actualizar = dt => {
      if (!c.modo) return;
      c.t += dt;
      if (c.modo === 'mezclar') {
        const [nombre, col] = COLORES[Math.floor(c.t / 1.3) % COLORES.length];
        mostrar(col);
        c.cartel.escribir(nombre);
        return;
      }
      if (c.t < 0.35) { mostrar([1, 1, 1], 1.8); return; }
      if (!c.quemado) {
        c.quemado = true;
        mostrar([0, 0, 0], 0);
        pum();
        chispas(new T.Vector3(0, 7, 0), 18);
        [c.cuerpo, c.cupula, c.borde].forEach(m => { m.material.color.setHex(0x4a3428); m.material.opacity = 0.85; });
        c.chips.forEach(ch => ch.material.color.setHex(0x050505));
      }
      if (Math.random() < (c.t < 4 ? 0.5 : 0.08)) humo(new T.Vector3(0, 7, 0));
    };
    return c;
  }

  // =====================================================================================
  // Servomotor SG90: cuerpo azul, brazo blanco y cable marrón-rojo-naranja con su conector.
  // =====================================================================================
  function crearServo() {
    const c = nuevoComp(), g = c.grupo;
    c.partes = {
      carcasa: {nombre: 'Carcasa', texto: 'La caja azul. Adentro tiene un motor, engranajes, un potenciómetro y un circuito.'},
      orejas: {nombre: 'Orejas', texto: 'Tienen agujeros para atornillar el servo a tu proyecto.'},
      eje: {nombre: 'Eje de salida', texto: 'Gira hasta el ángulo exacto que le pide el programa (de 0° a 180°).'},
      brazo: {nombre: 'Brazo (horn)', texto: 'Se encaja en el eje: es lo que mueve tu barrera, tu brazo robótico o tu timón.'},
      cables: {nombre: 'Cables y conector', texto: 'Marrón = GND, rojo = 5V (la energía) y naranja = señal (la orden, desde un pin).'},
      motorInt: {nombre: 'Motor', texto: 'Un pequeño motor DC: gira muy rápido pero con poca fuerza.'},
      engranajes: {nombre: 'Engranajes', texto: 'Reducen la velocidad del motor y aumentan su fuerza.'},
      potInt: {nombre: 'Potenciómetro interno', texto: 'Gira junto con el eje y le dice al circuito en qué ángulo está, para detenerse justo donde debe.'},
      circuito: {nombre: 'Circuito de control', texto: 'Compara el ángulo que pide la señal con el ángulo real y mueve el motor hasta que coinciden.'},
    };
    const azul = M(0x2f6fe4, {roughness: 0.4});
    const cuerpo = caja(23, 22, 12, azul, 'carcasa', [0, 11, 0]);
    const tapa = cil(6, 6, 4, M(0x2f6fe4, {roughness: 0.4}), 'carcasa', [5.5, 24, 0], null, 32);
    const orejas = caja(32, 2.5, 12, M(0x2f6fe4, {roughness: 0.4}), 'orejas', [0, 15.5, 0]);
    g.add(cuerpo, tapa, orejas, cil(2.3, 2.3, 3, M(0xf3f4f6), 'eje', [5.5, 27.5, 0]));
    c.brazo = new T.Group();
    c.brazo.position.set(5.5, 29.6, 0);
    c.brazo.add(cil(3.4, 3.4, 1.6, M(0xf9fafb), 'brazo', [0, 0, 0], null, 28), caja(16, 1.6, 4.4, M(0xf9fafb), 'brazo', [8, 0, 0]));
    g.add(c.brazo);
    [[0x7c4a1e, -1.2], [0xdc2626, 0], [0xf59e0b, 1.2]].forEach(([col, z]) => {
      const camino = new T.CatmullRomCurve3([new T.Vector3(-11.5, 4, z), new T.Vector3(-18, 3, z), new T.Vector3(-25, 1, z * 0.8), new T.Vector3(-30, 1, z * 0.8)]);
      g.add(malla(new T.TubeGeometry(camino, 20, 0.55, 8), M(col), 'cables'));
    });
    g.add(caja(7.5, 2.6, 4.2, M(0x111827), 'cables', [-33.5, 1, 0]));
    const dentro = {interior: true};
    g.add(oculto(cil(5, 5, 12, METAL(), 'motorInt', [-5, 8, 0], dentro, 24)), oculto(caja(5, 5, 6, M(0x1e3a8a), 'potInt', [5.5, 10, 0], dentro)), oculto(caja(20, 1, 10, M(0x15803d), 'circuito', [0, 2, 0], dentro)));
    c.engranajes = [[5.5, 21, 5.2, 0xf8fafc], [-1, 20, 3.6, 0xfde68a], [-5.5, 21.5, 3, 0xf8fafc]].map(([x, y, r, col]) => {
      const e = oculto(cil(r, r, 1.6, M(col), 'engranajes', [x, y, 0], dentro, 12));
      g.add(e);
      return e;
    });
    c.carcasas = [cuerpo, tapa, orejas];
    c.interior = [];
    g.traverse(o => { if (o.userData.interior) c.interior.push(o); });
    c.angulo = 90;
    c.cartel = cartel('90°');
    c.cartel.scale.set(22, 5.5, 1);
    c.cartel.position.set(5.5, 40, 0);
    c.cartel.visible = false;
    g.add(c.cartel);
    c.experimentos = [
      {id: 'mover', icono: '🦾', nombre: 'Moverlo de 0° a 180°', texto: 'El circuito recibe la orden por el cable naranja, mueve el motor y los engranajes, y el potenciómetro interno le avisa cuándo llegó al ángulo pedido.'},
      {id: 'sinEnergia', icono: '🔌', nombre: 'Sin el cable de 5V', texto: 'No se mueve: la señal llega (la orden), pero sin el cable rojo de 5V el motor no tiene energía para girar.'},
      {id: 'rayosx', icono: '🔍', nombre: 'Ver por dentro', texto: 'Adentro hay un motor, varios engranajes, un potenciómetro y un circuito de control.'},
    ];
    c.aplicar = id => { c.modo = id; c.t = 0; verDentro(c, true); c.cartel.visible = id !== 'rayosx'; };
    c.actualizar = dt => {
      if (!c.modo || c.modo === 'rayosx') return;
      c.t += dt;
      const objetivo = Math.floor(c.t / 2) % 2 ? 180 : 0;
      if (c.modo === 'mover') {
        const paso = 180 * dt;
        const antes = c.angulo;
        c.angulo += Math.max(-paso, Math.min(paso, objetivo - c.angulo));
        c.engranajes.forEach((e, i) => { e.rotation.y += (c.angulo - antes) * 0.05 * (i % 2 ? -3 : 1); });
        c.cartel.escribir(`${Math.round(c.angulo)}°`);
      } else c.cartel.escribir(`pide ${objetivo}° · sin energía`);
      c.brazo.rotation.y = ((c.angulo - 90) * Math.PI) / 180;
    };
    return c;
  }

  // =====================================================================================
  // Motor DC (tipo 130) de pie, con una hélice en el eje.
  // =====================================================================================
  function crearMotor() {
    const c = nuevoComp(), g = c.grupo;
    c.partes = {
      carcasa: {nombre: 'Carcasa', texto: 'El cilindro de metal: adentro están los imanes y las bobinas.'},
      tapa: {nombre: 'Tapa', texto: 'Sostiene las escobillas y los terminales.'},
      terminales: {nombre: 'Terminales', texto: 'Aquí se conectan los cables. Si los inviertes, el motor gira al revés.'},
      eje: {nombre: 'Eje', texto: 'Sale del motor y gira: ahí se pone la rueda o la hélice.'},
      helice: {nombre: 'Hélice', texto: 'Gira con el eje y mueve el aire.'},
      imanes: {nombre: 'Imanes', texto: 'Crean un campo magnético fijo alrededor de las bobinas.'},
      bobina: {nombre: 'Bobinas de cobre (rotor)', texto: 'Al pasar corriente se convierten en imanes que empujan contra los imanes fijos: ¡por eso gira!'},
      escobillas: {nombre: 'Escobillas', texto: 'Llevan la corriente a las bobinas mientras giran.'},
    };
    const carcasa = cil(10, 10, 25, METAL(), 'carcasa', [0, 12.5, 0], null, 40);
    g.add(carcasa, cil(10, 10, 4, M(0x1f2937), 'tapa', [0, -2, 0], null, 40));
    g.add(caja(1, 5, 3, M(0xd4a017, {metalness: 0.7, roughness: 0.3}), 'terminales', [-5, -6.5, 0]), caja(1, 5, 3, M(0xd4a017, {metalness: 0.7, roughness: 0.3}), 'terminales', [5, -6.5, 0]));
    g.add(cil(1, 1, 8, METAL(), 'eje', [0, 29, 0]));
    c.helice = new T.Group();
    c.helice.position.y = 33;
    c.helice.add(cil(3, 3, 3, M(0xf97316), 'helice', [0, 0, 0]), caja(32, 1.2, 5, M(0xfb923c), 'helice', [0, 0, 0]));
    g.add(c.helice);
    const dentro = {interior: true};
    g.add(oculto(caja(3, 20, 12, M(0x6b7280), 'imanes', [-7.5, 12.5, 0], dentro)), oculto(caja(3, 20, 12, M(0x6b7280), 'imanes', [7.5, 12.5, 0], dentro)));
    c.rotor = oculto(cil(5.5, 5.5, 16, M(0xb87333, {metalness: 0.6, roughness: 0.4}), 'bobina', [0, 13, 0], dentro, 6));
    g.add(c.rotor, oculto(caja(6, 1.2, 1.2, M(0x374151), 'escobillas', [0, 1.5, 0], dentro)));
    c.carcasas = [carcasa];
    c.interior = [];
    g.traverse(o => { if (o.userData.interior) c.interior.push(o); });
    c.alerta = cartel('⚠️ El pin no da tanta corriente');
    c.alerta.scale.set(26, 6.5, 1);
    c.alerta.position.set(0, 46, 0);
    c.alerta.visible = false;
    g.add(c.alerta);
    c.experimentos = [
      {id: 'girar', icono: '🌀', nombre: 'Hacerlo girar', texto: 'La corriente convierte las bobinas en imanes que empujan contra los imanes fijos: el rotor gira y con él la hélice.'},
      {id: 'reves', icono: '🔁', nombre: 'Invertir los cables', texto: 'Si inviertes los cables (+ por −), la corriente va al revés y el motor gira hacia el otro lado.'},
      {id: 'directo', icono: '⚠️', nombre: 'Conectarlo directo a un pin', texto: 'No gira: un pin del Arduino da muy poca corriente para un motor y puede dañarse. Por eso se usa un driver (como el L298N).'},
    ];
    c.aplicar = id => { c.modo = id; verDentro(c, id !== 'directo'); c.alerta.visible = id === 'directo'; };
    c.actualizar = dt => {
      const vel = c.modo === 'girar' ? 1 : c.modo === 'reves' ? -1 : 0;
      c.helice.rotation.y += vel * dt * 14;
      c.rotor.rotation.y += vel * dt * 14;
    };
    return c;
  }

  // =====================================================================================
  // Fotorresistencia (LDR): disco con la pista en zigzag; patas en x ±1,27.
  // =====================================================================================
  function crearLDR() {
    const c = nuevoComp(), g = c.grupo;
    c.partes = {
      pista: {nombre: 'Pista sensible a la luz', texto: 'La línea en zigzag es de un material especial (sulfuro de cadmio): con luz deja pasar más corriente; a oscuras, mucho menos.'},
      disco: {nombre: 'Base de cerámica', texto: 'Sostiene la pista. Está cubierta con un barniz transparente.'},
      patas: {nombre: 'Patas', texto: 'No tienen polaridad. Una va a 5V y la otra al pin A0 (junto con una resistencia de 10 kΩ a GND).'},
    };
    const cara = texturaCanvas(256, 256, x => {
      x.fillStyle = '#E8C39E'; x.fillRect(0, 0, 256, 256);
      x.strokeStyle = '#8B1E1E'; x.lineWidth = 16;
      x.beginPath(); x.moveTo(40, 50);
      for (let i = 0; i < 6; i++) x.lineTo(i % 2 ? 40 : 216, 50 + i * 32);
      x.stroke();
      x.fillStyle = '#C0C6CF'; x.fillRect(0, 0, 256, 34); x.fillRect(0, 222, 256, 34);
    });
    const lado = M(0xd9b48f);
    c.disco = malla(new T.CylinderGeometry(3.4, 3.4, 2, 40), [lado, M(0xffffff, {map: cara}), lado], 'disco', [0, 3, 0]);
    c.disco.userData.parteArriba = 'pista';
    g.add(c.disco);
    g.add(segmento(-1.27, 2, -1.27, -9, 0.6, METAL(), 'patas'), segmento(1.27, 2, 1.27, -9, 0.6, METAL(), 'patas'));
    c.lampara = brillo(0xfff3b0, 18);
    c.lampara.position.set(0, 14, 0);
    g.add(c.lampara);
    c.cartel = cartel('');
    c.cartel.scale.set(30, 7.5, 1);
    c.cartel.position.set(0, 21, 0);
    c.cartel.visible = false;
    g.add(c.cartel);
    c.experimentos = [
      {id: 'luz', icono: '☀️', nombre: 'Con mucha luz', texto: 'Con mucha luz, la pista deja pasar mucha corriente (su resistencia baja a unos 1 000 Ω). En el pin A0 se lee un número alto, como 900.'},
      {id: 'oscuro', icono: '🌙', nombre: 'A oscuras', texto: 'A oscuras, la pista casi no deja pasar corriente (su resistencia sube a unos 100 000 Ω). En el pin A0 se lee un número bajo, como 90.'},
    ];
    c.aplicar = id => {
      iluminar(id === 'oscuro' ? 0.18 : 1.25);
      c.lampara.material.opacity = id === 'luz' ? 0.9 : 0;
      c.cartel.visible = true;
      c.cartel.escribir(id === 'luz' ? '≈ 1 kΩ · A0 ≈ 900' : '≈ 100 kΩ · A0 ≈ 90');
      brilloMalla(c.disco, id === 'luz' ? 0xffd27a : null, 0.35);
    };
    return c;
  }

  // =====================================================================================
  // Sensor ultrasónico HC-SR04: placa vertical, emisor (T) y receptor (R) mirando hacia +z.
  // =====================================================================================
  function crearUltrasonico() {
    const c = nuevoComp(), g = c.grupo;
    c.partes = {
      emisor: {nombre: 'Emisor (T)', texto: 'Lanza un sonido muy agudo (ultrasonido) que las personas no podemos oír.'},
      receptor: {nombre: 'Receptor (R)', texto: 'Escucha el eco del sonido cuando rebota en un objeto.'},
      placa: {nombre: 'Placa', texto: 'Tiene el circuito que mide cuánto tarda el eco en volver.'},
      pines: {nombre: 'Pines', texto: 'VCC (5V), TRIG (la orden de lanzar el sonido), ECHO (avisa cuánto tardó el eco) y GND.'},
      cristal: {nombre: 'Cristal', texto: 'Marca el ritmo del circuito para medir el tiempo con precisión.'},
      pared: {nombre: 'Objeto', texto: 'El sonido rebota en él. Mientras más lejos esté, más tarda en volver el eco.'},
    };
    const frente = texturaCanvas(900, 400, x => {
      x.fillStyle = '#1D4ED8'; x.fillRect(0, 0, 900, 400);
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = 'bold 44px Silkscreen, monospace';
      x.fillText('HC-SR04', 450, 60);
      x.font = 'bold 40px Silkscreen, monospace'; x.fillText('T', 190, 380); x.fillText('R', 710, 380);
      x.font = 'bold 30px Silkscreen, monospace';
      ['VCC', 'TRIG', 'ECHO', 'GND'].forEach((t, i) => x.fillText(t, 450 + (i - 1.5) * 52 * 2.2, 372));
    });
    const azul = M(0x1d4ed8);
    g.add(malla(new T.BoxGeometry(45, 20, 1.6), [azul, azul, azul, azul, M(0xffffff, {map: frente}), azul], 'placa', [0, 10, 0]));
    [[-13, 'emisor'], [13, 'receptor']].forEach(([x, parte]) => {
      const t = cil(8, 8, 12, METAL(), parte, [x, 11, 6.8], null, 40);
      t.rotation.x = Math.PI / 2;
      const red = cil(7, 7, 0.3, M(0x4b5563, {roughness: 0.9}), parte, [x, 11, 12.9], null, 40);
      red.rotation.x = Math.PI / 2;
      g.add(t, red);
    });
    g.add(caja(4, 2.5, 1.5, METAL(), 'cristal', [0, 15, 1.6]));
    [-3.81, -1.27, 1.27, 3.81].forEach(x => g.add(segmento(x, 0.5, x, -7, 0.6, METAL(), 'pines', -0.2)));
    c.pared = caja(40, 24, 3, M(0xa8a29e, {transparent: true, opacity: 0.55, depthWrite: false}), 'pared', [0, 11, 40]);
    c.pared.visible = false;
    g.add(c.pared);
    c.pulsos = [];
    c.cartel = cartel('');
    c.cartel.scale.set(24, 6, 1);
    c.cartel.position.set(0, 30, 14);
    c.cartel.visible = false;
    g.add(c.cartel);
    c.experimentos = [
      {id: 'medir', icono: '🦇', nombre: 'Medir la distancia', texto: 'El emisor lanza un pulso de sonido, rebota en el objeto y vuelve al receptor. El Arduino mide cuánto tardó: con eso calcula la distancia (tiempo ÷ 58 = centímetros).'},
    ];
    c.aplicar = () => { c.modo = 'medir'; c.t = 0; c.pared.visible = true; c.cartel.visible = true; };
    c.actualizar = dt => {
      if (!c.modo) return;
      c.t += dt;
      const cm = [30, 15, 50][Math.floor(c.t / 2.4) % 3], z = 18 + cm * 0.5, fase = (c.t % 2.4) / 1.6;
      c.pared.position.z = z;
      c.cartel.escribir(`Distancia: ${cm} cm`);
      if (!c.pulsos.length) for (let i = 0; i < 3; i++) {
        const p = malla(new T.SphereGeometry(1.4, 12, 8), M(0x93c5fd, {emissive: 0x60a5fa, emissiveIntensity: 1}), null, [0, 0, 0], {noVox: true, sinRayo: true});
        p.castShadow = false;
        g.add(p);
        c.pulsos.push(p);
      }
      c.pulsos.forEach((p, i) => {
        const f = fase - i * 0.06;
        p.visible = f > 0 && f < 1;
        if (!p.visible) return;
        const ida = f < 0.5, k = ida ? f * 2 : (f - 0.5) * 2, zPared = z - 1.5;
        if (ida) p.position.set(-13 + 13 * k, 11, 13 + (zPared - 13) * k);   // del emisor al objeto
        else p.position.set(13 * k, 11, zPared - (zPared - 13) * k);         // del objeto al receptor
      });
    };
    return c;
  }

  // =====================================================================================
  // Estilo "cubitos": cada pieza se rellena con cubos alineados a una grilla (vóxeles).
  // Los cubos usan el mismo material que la pieza original (así los experimentos los cambian igual)
  // y la pieza original pasa a la capa 1: no se dibuja, pero sigue recibiendo el mouse.
  // En las caras con dibujo (placa del Arduino, protoboard…) cada cubo toma el color del dibujo.
  // =====================================================================================
  const CAPA_ORIGINAL = 1;
  const geoCubos = new Map(), imagenes = new Map(), paridad = new Map();
  let cubos = [], rayoVox = null;
  const DIR_PARIDAD = () => new T.Vector3(1, 0.013, 0.007).normalize();

  // ¿El punto p (en coordenadas de la geometría) está dentro de la pieza?
  function dentroDe(geo, p) {
    const q = geo.parameters || {};
    switch (geo.type) {
      case 'BoxGeometry':
        return Math.abs(p.x) <= q.width / 2 && Math.abs(p.y) <= q.height / 2 && Math.abs(p.z) <= q.depth / 2;
      case 'CylinderGeometry': {
        if (Math.abs(p.y) > q.height / 2) return false;
        const r = q.radiusBottom + (q.radiusTop - q.radiusBottom) * (p.y / q.height + 0.5);
        return p.x * p.x + p.z * p.z <= r * r;
      }
      case 'SphereGeometry':
        return p.length() <= q.radius && (q.thetaLength >= Math.PI || p.y >= 0);
      case 'LatheGeometry': {
        const pts = q.points;
        for (let i = 1; i < pts.length; i++) {
          if (p.y < pts[i - 1].y || p.y > pts[i].y) continue;
          const a = pts[i - 1], b = pts[i], r = b.y === a.y ? Math.max(a.x, b.x) : a.x + ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y);
          return p.x * p.x + p.z * p.z <= r * r;
        }
        return false;
      }
      default: { // forma cualquiera (cerrada): se cuenta cuántas veces un rayo cruza su superficie
        let m = paridad.get(geo);
        if (!m) { m = new T.Mesh(geo, new T.MeshBasicMaterial({side: T.DoubleSide})); m.updateMatrixWorld(); paridad.set(geo, m); }
        rayoVox = rayoVox || new T.Raycaster();
        rayoVox.set(p, DIR_PARIDAD());
        return rayoVox.intersectObject(m, false).length % 2 === 1;
      }
    }
  }

  function colorTextura(mapa, u, v) {
    let img = imagenes.get(mapa);
    if (!img) {
      const cv = mapa.image;
      img = {d: cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, w: cv.width, h: cv.height};
      imagenes.set(mapa, img);
    }
    const x = Math.min(img.w - 1, Math.max(0, Math.floor(u * img.w))), y = Math.min(img.h - 1, Math.max(0, Math.floor(v * img.h))), i = (y * img.w + x) * 4;
    return new T.Color(img.d[i] / 255, img.d[i + 1] / 255, img.d[i + 2] / 255).convertSRGBToLinear();
  }

  function voxelizar(o, v) {
    o.userData.vox = true;
    const geo = o.geometry;
    const inv = new T.Matrix4().copy(comp.grupo.matrixWorld).invert();
    o.updateWorldMatrix(true, false);
    const rel = new T.Matrix4().multiplyMatrices(inv, o.matrixWorld), relInv = rel.clone().invert();
    if (!geo.boundingBox) geo.computeBoundingBox();
    const caja3 = geo.boundingBox.clone().applyMatrix4(rel);
    const pts = new Map(), q = new T.Vector3();
    const agregar = pt => { const k = [Math.round(pt.x / v), Math.round(pt.y / v), Math.round(pt.z / v)]; pts.set(k.join(','), k); };
    if (geo.type === 'TubeGeometry') {
      for (let i = 0; i <= 80; i++) agregar(geo.parameters.path.getPointAt(i / 80).applyMatrix4(rel));
    } else {
      for (let i = Math.ceil(caja3.min.x / v); i <= Math.floor(caja3.max.x / v); i++)
        for (let j = Math.ceil(caja3.min.y / v); j <= Math.floor(caja3.max.y / v); j++)
          for (let k = Math.ceil(caja3.min.z / v); k <= Math.floor(caja3.max.z / v); k++) {
            q.set(i * v, j * v, k * v).applyMatrix4(relInv);
            if (dentroDe(geo, q)) pts.set(i + ',' + j + ',' + k, [i, j, k]);
          }
    }
    if (!pts.size) { // pieza más fina que un cubo: una fila de cubos a lo largo de su lado más largo
      const t = caja3.getSize(new T.Vector3()), centro = caja3.getCenter(new T.Vector3());
      const eje = t.x >= t.y && t.x >= t.z ? 'x' : t.y >= t.z ? 'y' : 'z';
      for (let a = caja3.min[eje]; a <= caja3.max[eje] + 1e-6; a += v / 2) { const p = centro.clone(); p[eje] = a; agregar(p); }
    }
    // cara con dibujo: en una caja, el material 2 es la cara de arriba y el 4 la de adelante; en un cilindro, el 1 es la tapa
    const mats = [].concat(o.material), iTex = mats.findIndex(m => m.map);
    const cara = iTex < 0 ? null : geo.type === 'CylinderGeometry' ? 'arriba' : iTex === 2 ? 'arriba' : iTex === 4 ? 'adelante' : null;
    const material = iTex >= 0 ? M(0xffffff, {roughness: 0.7}) : mats[0];
    let geoCubo = geoCubos.get(v);
    if (!geoCubo) { geoCubo = new T.BoxGeometry(v * 0.94, v * 0.94, v * 0.94); geoCubos.set(v, geoCubo); }
    const lista = [...pts.values()], im = new T.InstancedMesh(geoCubo, material, lista.length);
    const m4 = new T.Matrix4(), col = new T.Color(), w = caja3.max.x - caja3.min.x || 1;
    const jMax = Math.max(...lista.map(t => t[1])), kMax = Math.max(...lista.map(t => t[2])); // la capa de afuera lleva el dibujo
    lista.forEach(([i, j, k], n) => {
      const x = i * v, y = j * v, z = k * v;
      m4.makeTranslation(x, y, z);
      im.setMatrixAt(n, m4);
      if (cara === 'arriba' && j === jMax) im.setColorAt(n, colorTextura(mats[iTex].map, (x - caja3.min.x) / w, (z - caja3.min.z) / (caja3.max.z - caja3.min.z || 1)));
      else if (cara === 'adelante' && k === kMax) im.setColorAt(n, colorTextura(mats[iTex].map, (x - caja3.min.x) / w, (caja3.max.y - y) / (caja3.max.y - caja3.min.y || 1)));
      else if (iTex >= 0) im.setColorAt(n, col.copy(mats[0].color));
      else { const gris = 0.88 + Math.random() * 0.12; im.setColorAt(n, col.setRGB(gris, gris, gris)); }
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = im.receiveShadow = true;
    im.matrixAutoUpdate = false;
    im.userData = Object.assign({}, o.userData, {orig: o, rel0Inv: relInv, conTextura: iTex >= 0});
    delete im.userData.vox;
    comp.grupo.add(im);
    cubos.push(im);
    o.layers.set(CAPA_ORIGINAL);
  }

  // Cada cuadro: los cubos siguen a su pieza (posición, visibilidad, brillo) y se convierten las piezas nuevas.
  function sincronizarCubos() {
    const nuevas = [];
    comp.grupo.traverse(o => { if (o.isMesh && !o.isInstancedMesh && !o.userData.vox && !o.userData.noVox) nuevas.push(o); });
    nuevas.forEach(o => voxelizar(o, def.cubo));
    const inv = new T.Matrix4().copy(comp.grupo.matrixWorld).invert();
    for (const im of cubos) {
      const o = im.userData.orig;
      im.visible = !!o.parent && visible(o);
      im.userData.brillo = o.userData.brillo;
      o.updateWorldMatrix(true, false);
      im.matrix.multiplyMatrices(inv, o.matrixWorld).multiply(im.userData.rel0Inv);
      if (im.userData.conTextura) {
        const mo = [].concat(o.material)[0];
        im.material.transparent = mo.transparent; im.material.opacity = mo.opacity; im.material.depthWrite = mo.depthWrite;
      }
    }
  }

  // =====================================================================================
  // Escena, cámara e interacción
  // =====================================================================================
  function cargarThree() {
    if (carga) return carga;
    carga = new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = THREE_URL; s.onload = ok; s.onerror = mal;
      document.head.appendChild(s);
    }).then(() => document.fonts.load('16px Silkscreen')).then(() => { T = window.THREE; prepararEscena(); });
    carga.catch(() => { carga = null; });
    return carga;
  }

  function prepararEscena() {
    const cont = $('#lab-escena');
    renderer = new T.WebGLRenderer({antialias: true, alpha: true});
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    cont.prepend(renderer.domElement);
    escena = new T.Scene();
    camara = new T.PerspectiveCamera(35, 1, 0.5, 3000);
    cielo = new T.HemisphereLight(0xffffff, 0x8899aa, 0.85);
    escena.add(cielo);
    sol = new T.DirectionalLight(0xffffff, 0.85);
    sol.position.set(60, 140, 90);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    escena.add(sol);
    piso = new T.Mesh(new T.CircleGeometry(1, 64), new T.ShadowMaterial({opacity: 0.16}));
    piso.rotation.x = -Math.PI / 2;
    piso.receiveShadow = true;
    escena.add(piso);
    raiz = new T.Group();
    escena.add(raiz);
    rayo = new T.Raycaster();
    puntero = new T.Vector2();
    texHumo = texturaRadial('rgba(90,90,95,0.9)', 'rgba(90,90,95,0)');
    texBrillo = texturaRadial('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    const cuadrado = color => texturaCanvas(16, 16, x => { x.fillStyle = color; x.fillRect(2, 2, 12, 12); });
    texHumoCubo = cuadrado('rgba(90,90,95,0.85)');
    texChispaCubo = cuadrado('rgba(255,255,255,1)');
    document.querySelectorAll('[data-estilo-lab]').forEach(b => {
      b.onclick = () => { estilo = b.dataset.estiloLab; marcarEstilo(); if (def) construir(); };
    });
    marcarEstilo();

    const lienzo = renderer.domElement;
    lienzo.addEventListener('pointerdown', e => { arrastre = {x: e.clientX, y: e.clientY, mov: 0}; quieto = 0; });
    window.addEventListener('pointermove', alMover);
    window.addEventListener('pointerup', e => {
      if (!arrastre) return;
      if (arrastre.mov < 5 && e.target === lienzo) seleccionar(parteBajo(e));
      arrastre = null;
    });
    lienzo.addEventListener('wheel', e => { e.preventDefault(); zoom = Math.min(2.2, Math.max(0.45, zoom * (e.deltaY > 0 ? 1.1 : 1 / 1.1))); }, {passive: false});
    lienzo.addEventListener('dblclick', vistaInicial);
    new ResizeObserver(ajustarTamano).observe(cont);
  }

  function marcarEstilo() { document.querySelectorAll('[data-estilo-lab]').forEach(b => b.classList.toggle('activo', b.dataset.estiloLab === estilo)); }

  // Luz general de la escena (para el experimento "a oscuras" de la fotorresistencia)
  function iluminar(f) { cielo.intensity = 0.85 * f; sol.intensity = 0.85 * f; }

  function ajustarTamano() {
    const cont = $('#lab-escena'), w = cont.clientWidth, h = cont.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
  }

  function visible(o) { for (; o; o = o.parent) if (!o.visible) return false; return true; }

  function parteBajo(e) {
    if (!comp) return null;
    const r = renderer.domElement.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(puntero, camara);
    rayo.layers.set(estilo === 'cubos' ? CAPA_ORIGINAL : 0);
    const hits = rayo.intersectObject(comp.grupo, true).filter(h => visible(h.object) && !h.object.userData.sinRayo);
    if (comp.limpiar) comp.limpiar();
    // La cápsula del LED es transparente: si detrás hay una pieza interior, se elige esa.
    let h = hits[0];
    if (h && h.object.userData.vidrio) h = hits.find(x => x.object.userData.interior) || h;
    if (!h) return null;
    return comp.resolver ? comp.resolver(h) : h.object.userData.parte || null;
  }

  function alMover(e) {
    if (!comp || !$('#p-lab').classList.contains('activa')) return;
    if (arrastre) {
      const dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y;
      arrastre.mov += Math.abs(dx) + Math.abs(dy);
      arrastre.x = e.clientX; arrastre.y = e.clientY;
      rot.vy = dx * 0.01; rot.vx = dy * 0.01;
      rot.y += rot.vy; rot.x = Math.max(-1.4, Math.min(1.4, rot.x + rot.vx));
      $('.lab-tip').hidden = true;
      return;
    }
    const tip = $('.lab-tip');
    if (e.target !== renderer.domElement) { if (hover) { hover = null; pintar(); } tip.hidden = true; return; }
    const p = parteBajo(e);
    if (p !== hover) { hover = p; pintar(); }
    if (p && comp.partes[p]) {
      const r = $('#lab-escena').getBoundingClientRect();
      tip.textContent = comp.partes[p].nombre;
      tip.style.left = (e.clientX - r.left + 14) + 'px';
      tip.style.top = (e.clientY - r.top + 14) + 'px';
      tip.hidden = false;
      renderer.domElement.style.cursor = 'pointer';
    } else { tip.hidden = true; renderer.domElement.style.cursor = 'grab'; }
  }

  // Color de cada pieza: seleccionada (azul), bajo el mouse (celeste) o su brillo propio (LED encendido, calor…)
  function pintar() {
    if (!comp) return;
    comp.grupo.traverse(o => {
      if (!o.isMesh || !o.material || Array.isArray(o.material) && !o.material.length) return;
      const p = o.userData.parte, b = o.userData.brillo;
      for (const mt of [].concat(o.material)) {
        if (!mt.emissive || o === comp.zona) continue;
        if (p && p === seleccion) { mt.emissive.setHex(0x2563eb); mt.emissiveIntensity = 0.55; }
        else if (p && p === hover) { mt.emissive.setHex(0x60a5fa); mt.emissiveIntensity = 0.35; }
        else if (b) { mt.emissive.setHex(b.c); mt.emissiveIntensity = b.i; }
        else { mt.emissive.setHex(0); mt.emissiveIntensity = 1; }
      }
    });
  }

  // Encuadra el modelo: lo centra y ajusta la cámara y el piso a su tamaño
  function encuadrar() {
    comp.grupo.position.set(0, 0, 0);
    comp.grupo.updateMatrixWorld(true);
    const inv = new T.Matrix4().copy(comp.grupo.matrixWorld).invert(), caja3 = new T.Box3(), parte = new T.Box3();
    comp.grupo.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || o.userData.noVox || !visible(o)) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      caja3.union(parte.copy(o.geometry.boundingBox).applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld)));
    });
    const centro = caja3.getCenter(new T.Vector3());
    comp.grupo.position.sub(centro);
    radio = caja3.getSize(new T.Vector3()).length() / 2;
    piso.scale.setScalar(radio * 1.3);
    piso.position.y = -radio * 0.75;
    const cam = sol.shadow.camera;
    cam.left = cam.bottom = -radio * 1.5; cam.right = cam.top = radio * 1.5; cam.near = 1; cam.far = 600;
    cam.updateProjectionMatrix();
  }

  function cuadro(ahora) {
    if (!activo) return;
    if (!$('#p-lab').classList.contains('activa')) { activo = false; return; }
    const dt = Math.min(0.05, (ahora - ultimo) / 1000 || 0);
    ultimo = ahora;
    tiempo += dt;
    if (!arrastre) {
      quieto += dt;
      rot.vy *= 0.92; rot.vx *= 0.92;
      rot.y += rot.vy + (quieto > 4 ? dt * 0.25 : 0);
      rot.x = Math.max(-1.4, Math.min(1.4, rot.x + rot.vx));
    }
    raiz.rotation.set(rot.x, rot.y, 0);
    raiz.position.y = Math.sin(tiempo * 1.4) * radio * 0.02;
    // distancia para que el modelo quepa, mirando el lado más estrecho de la pantalla (alto o ancho)
    const mitadV = (camara.fov * Math.PI) / 360, mitadH = Math.atan(Math.tan(mitadV) * camara.aspect);
    const d = (radio / Math.sin(Math.min(mitadV, mitadH))) * 1.05 * zoom;
    camara.position.set(0, d * 0.18, d);
    camara.lookAt(0, 0, 0);
    if (comp) {
      comp.actualizar(dt, tiempo);
      if (estilo === 'cubos') { escena.updateMatrixWorld(); sincronizarCubos(); }
      pintar();
    }
    moverParticulas(dt);
    renderer.render(escena, camara);
    requestAnimationFrame(cuadro);
  }

  // ---------- panel ----------
  function pintarLista() {
    $('#lab-lista').innerHTML = CATALOGO.map(d => `<button class="lab-item${def && d.id === def.id ? ' activo' : ''}" data-lab="${d.id}" ${d.pronto ? 'disabled' : ''}>
      <span class="lab-ic">${d.icono}</span><span>${d.nombre}</span>${d.pronto ? '<small>Próximamente</small>' : ''}</button>`).join('');
    document.querySelectorAll('[data-lab]').forEach(b => { b.onclick = () => mostrarComponente(b.dataset.lab); });
  }

  function pintarPanel() {
    const partes = Object.entries(comp.partes);
    const parte = seleccion && comp.partes[seleccion];
    $('#lab-info').innerHTML = `
      <h2>${def.icono} ${def.nombre}</h2>
      <p class="lab-desc">${def.desc}</p>
      <h3>🔎 Sus partes</h3>
      <div class="lab-partes">${partes.map(([id, p]) => `<button class="lab-chip${id === seleccion ? ' activo' : ''}" data-parte-lab="${id}">${p.nombre}</button>`).join('')}</div>
      <div class="lab-parte">${parte ? `<h4>📍 ${parte.nombre} ${'<button class="btn-hablar" data-hablar=".lab-parte p" title="Escuchar">🔊</button>'}</h4><p>${parte.texto}</p>` : '<p class="lab-vacio">Pasa el mouse por el componente y haz clic en una parte para ver qué es.</p>'}</div>
      <h3>🧪 Experimentos</h3>
      <div class="lab-exps">${comp.experimentos.map(x => `<button class="lab-exp${x.id === expActual ? ' activo' : ''}" data-exp="${x.id}">${x.icono} ${x.nombre}</button>`).join('')}
        <button class="lab-exp" data-exp="nuevo">↺ Volver a como nuevo</button></div>
      ${expActual ? `<div class="porque lab-res"><h4>🤔 ¿Qué pasó? <button class="btn-hablar" data-hablar=".lab-res p" title="Escuchar">🔊</button></h4><p>${comp.experimentos.find(x => x.id === expActual).texto}</p></div>` : ''}
      ${FICHAS[def.id] ? '<button class="btn btn-sec lab-ficha" id="lab-ficha">📘 Ver su ficha</button>' : ''}`;
    document.querySelectorAll('[data-parte-lab]').forEach(b => { b.onclick = () => seleccionar(b.dataset.parteLab === seleccion ? null : b.dataset.parteLab); });
    document.querySelectorAll('[data-exp]').forEach(b => { b.onclick = () => experimento(b.dataset.exp); });
    const f = $('#lab-ficha');
    if (f) f.onclick = () => App.verFicha(def.id);
  }

  function seleccionar(p) {
    seleccion = p;
    pintar();
    pintarPanel();
  }

  function experimento(id) {
    if (id === 'nuevo' || expActual) { construir(); if (id === 'nuevo') return; }
    expActual = id;
    comp.aplicar(id);
    pintarPanel();
  }

  // Crea (o vuelve a crear) el modelo del componente elegido, conservando el ángulo de la vista
  function construir() {
    if (comp) raiz.remove(comp.grupo);
    particulas.splice(0).forEach(p => escena.remove(p.s));
    iluminar(1);
    cubos = [];
    comp = def.crear();
    raiz.add(comp.grupo);
    if (estilo === 'cubos') { escena.updateMatrixWorld(); sincronizarCubos(); }
    encuadrar();
    expActual = null;
    hover = null;
    pintar();
    pintarPanel();
  }

  // Ángulo de partida de cada componente (las placas planas se ven mejor desde arriba)
  function vistaInicial() {
    rot = {x: def.vista || 0, y: 0.5, vx: 0, vy: 0};
    zoom = 1;
    quieto = 0;
  }

  function mostrarComponente(id) {
    def = CATALOGO.find(d => d.id === id);
    seleccion = null;
    vistaInicial();
    construir();
    pintarLista();
  }

  async function abrir() {
    pintarLista();
    $('#lab-cargando').hidden = false;
    $('#lab-cargando').textContent = 'Cargando el laboratorio 3D…';
    try {
      await cargarThree();
    } catch (e) {
      $('#lab-cargando').textContent = 'No se pudo cargar el laboratorio 3D. Revisa la conexión a internet y vuelve a intentarlo.';
      return;
    }
    $('#lab-cargando').hidden = true;
    ajustarTamano();
    if (!def) mostrarComponente('led');
    if (!activo) { activo = true; ultimo = performance.now(); requestAnimationFrame(cuadro); }
  }

  return {abrir};
})();
