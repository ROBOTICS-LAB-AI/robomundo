// Mesa de trabajo tipo Tinkercad: colocar componentes, tender cables, girar, borrar y simular.
//
// Simulación por reglas (no eléctrica real):
//  1. Se agrupan los terminales conectados entre sí en "redes" (pines internos de la placa,
//     columnas/rieles de la protoboard, patas insertadas en agujeros y cables).
//  2. Las resistencias y los LEDs son caminos entre redes (el LED solo en sentido ánodo → cátodo).
//  3. Un LED enciende si hay camino de una fuente (5V, 3.3V o un pin en ALTO) al ánodo y del cátodo
//     a GND (o a un pin en BAJO). Sin ninguna resistencia en ese camino, se quema.
//     Una fuente unida directo con GND es un cortocircuito.
const Editor = (() => {
  const COLORES = ['#2E7D32', '#1565C0', '#F9A825', '#EF6C00', '#8E24AA', '#E53935', '#212121'];
  // "Ver conexiones": color de los agujeros según el pin del Arduino al que están conectados
  const COLOR_RED = {'5V': '#EF4444', '3V3': '#F97316', GND: '#2563EB', digital: '#9333EA', analogico: '#0D9488'};
  const SALIDA = 1, ENTRADA_PULLUP = 2;
  let svg, mundo, capaFija, capaRedes, capaHover, capaMarcas, capaPiezas, capaCables, capaUI, anillo, previa, tooltip;
  let opciones = {};
  // modo 'circuito': se arma y se simula. modo 'pasos': solo se hace clic en partes/pines (opciones.alClic).
  // nombres: false oculta los nombres al pasar el mouse (para no regalar la respuesta).
  // verRedes: pinta los agujeros según el pin al que están conectados.
  let cfg = {modo: 'circuito', nombres: true, verRedes: false};
  let escena = null, piezas = [], cables = [], fijos = [];
  let sel = null, arr = null, cableNuevo = null;
  let simulando = false, resultado = null, prog = null, resaltados = [], redesPin = null, redActual = null;
  let vista = {x: 0, y: 0, z: 1}, cont = 0, colorActual = COLORES[0], margenDerecho = 0;

  // ---------- geometría y terminales ----------
  function posicion(p, t) {
    const r = (p.rot || 0) * Math.PI / 180, c = Math.round(Math.cos(r)), s = Math.round(Math.sin(r));
    return {x: p.x + t.x * c - t.y * s, y: p.y + t.x * s + t.y * c};
  }
  const terminalesDe = p => COMPONENTES[p.tipo].terminales.map(t => Object.assign({id: p.id + '.' + t.id, pieza: p, t}, posicion(p, t)));
  const terminales = () => fijos.concat(...piezas.filter(p => !p.fijo).map(terminalesDe));
  const buscar = id => terminales().find(t => t.id === id);
  const clave = q => Math.round(q.x) + ',' + Math.round(q.y);
  const esSel = (tipo, id) => sel && sel.tipo === tipo && sel.id === id;
  const clase = p => COMPONENTES[p.tipo].clase;
  const activo = () => svg && svg.getBoundingClientRect().width > 0 && !document.querySelector('.modal:not([hidden])');
  const idPin = n => (n < 14 ? 'D' + n : 'A' + (n - 14));

  // Terminal más cercano; los agujeros y pines tienen prioridad sobre las patas de componentes.
  function cercano(x, y, radio, soloFijos) {
    let mejor = null, dmin = radio * radio;
    const revisar = lista => {
      for (const t of lista) {
        const d = (t.x - x) ** 2 + (t.y - y) ** 2;
        if (d <= dmin) { dmin = d; mejor = t; }
      }
    };
    revisar(fijos);
    if (!mejor && !soloFijos) revisar(terminales().slice(fijos.length));
    return mejor;
  }

  // Patas que no están insertadas en ningún agujero: desde ellas se pueden tender cables
  // (así se arman circuitos sin protoboard).
  function pataSuelta(w) {
    const agujeros = new Set(fijos.map(clave));
    return terminales().slice(fijos.length).find(t => !agujeros.has(clave(t)) && (t.x - w.x) ** 2 + (t.y - w.y) ** 2 <= 25);
  }

  // Cables alineados (como en Tinkercad): cada tramo va en horizontal, vertical o a 45°.
  function alinear(desde, w) {
    const ang = Math.atan2(w.y - desde.y, w.x - desde.x), recto = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
    const l = Math.hypot(w.x - desde.x, w.y - desde.y) * Math.cos(ang - recto);
    return {x: Math.round(desde.x + l * Math.cos(recto)), y: Math.round(desde.y + l * Math.sin(recto))};
  }
  // Último tramo hasta un terminal: si no queda alineado, se agrega un codo en L.
  function codo(pts, destino) {
    const a = pts[pts.length - 1], dx = Math.abs(destino.x - a.x), dy = Math.abs(destino.y - a.y);
    if (dx < 1 || dy < 1 || Math.abs(dx - dy) < 1) return [];
    const previo = pts[pts.length - 2];
    const veniaVertical = previo ? Math.abs(previo.x - a.x) < 1 : false;
    return [veniaVertical ? {x: destino.x, y: a.y} : {x: a.x, y: destino.y}];
  }

  // La primera pata de cada componente está en su origen: se encaja en el agujero más cercano.
  function ajustarAGrilla(p) {
    const t = cercano(p.x, p.y, 10, true);
    if (t) { p.x = t.x; p.y = t.y; }
  }

  // ---------- redes y caminos ----------
  function calcularRedes(presionados) {
    const padre = new Map();
    const raiz = a => { while (padre.get(a) !== a) a = padre.get(a); return a; };
    const unir = (a, b) => { const ra = raiz(a), rb = raiz(b); if (ra !== rb) padre.set(ra, rb); };
    const todos = terminales();
    todos.forEach(t => padre.set(t.id, t.id));
    const internas = new Map(), agujeros = new Map();
    for (const t of todos) {
      if (t.t.red) {
        const k = t.pieza.id + ':' + t.t.red;
        if (internas.has(k)) unir(t.id, internas.get(k)); else internas.set(k, t.id);
      }
      if (t.pieza.fijo) agujeros.set(clave(t), t.id);
    }
    for (const t of todos) if (!t.pieza.fijo && agujeros.has(clave(t))) unir(t.id, agujeros.get(clave(t)));
    // Uniones internas (lados del pulsador) y pulsadores presionados
    for (const p of piezas) {
      for (const [a, b] of COMPONENTES[p.tipo].uniones || []) unir(p.id + '.' + a, p.id + '.' + b);
      if (presionados && presionados.has(p.id)) unir(p.id + '.1a', p.id + '.2a');
    }
    for (const c of cables) if (padre.has(c.desde) && padre.has(c.hasta)) unir(c.desde, c.hasta);
    return id => (padre.has(id) ? raiz(id) : id);
  }

  function crearAristas(red) {
    const aristas = [];
    for (const p of piezas) {
      if (clase(p) === 'resistencia') {
        const a = red(p.id + '.a'), b = red(p.id + '.b');
        if (a !== b) aristas.push({de: a, a: b, peso: 1, id: p.id}, {de: b, a: a, peso: 1, id: p.id});
      } else if (clase(p) === 'led') {
        const a = red(p.id + '.anodo'), k = red(p.id + '.catodo');
        if (a !== k) aristas.push({de: a, a: k, peso: 0, id: p.id});
      } else if (clase(p) === 'potenciometro') {
        const [i, c, d] = ['izq', 'cursor', 'der'].map(t => red(p.id + '.' + t));
        [[i, c], [c, d], [i, d]].forEach(([a, b]) => { if (a !== b) aristas.push({de: a, a: b, peso: 1, id: p.id}, {de: b, a: a, peso: 1, id: p.id}); });
      } else if (clase(p) === 'buzzer') {
        const m = red(p.id + '.mas'), n = red(p.id + '.menos');
        if (m !== n) aristas.push({de: m, a: n, peso: 1, id: p.id});
      } else if (clase(p) === 'rgb') {
        const k = red(p.id + '.k');
        for (const c of ['r', 'g', 'b']) { const a = red(p.id + '.' + c); if (a !== k) aristas.push({de: a, a: k, peso: 0, id: p.id + ':' + c}); }
      } else if (clase(p) === 'ldr') {
        const a = red(p.id + '.a'), b = red(p.id + '.b');
        if (a !== b) aristas.push({de: a, a: b, peso: 1, id: p.id}, {de: b, a: a, peso: 1, id: p.id});
      }
    }
    return aristas;
  }

  // Menor cantidad de resistencias en un camino (Dijkstra pequeño). No atraviesa los nodos bloqueados.
  function distancia(aristas, bloqueados, origenes, destino, excluir) {
    const dist = new Map(), cola = [];
    origenes.forEach(o => { dist.set(o, 0); cola.push(o); });
    while (cola.length) {
      let i = 0;
      for (let j = 1; j < cola.length; j++) if (dist.get(cola[j]) < dist.get(cola[i])) i = j;
      const n = cola.splice(i, 1)[0];
      if (n === destino) return dist.get(n);
      if (bloqueados.has(n) && !origenes.includes(n)) continue;
      for (const e of aristas) {
        if (e.de !== n || e.id === excluir) continue;
        const d = dist.get(n) + e.peso;
        if (!dist.has(e.a) || d < dist.get(e.a)) { dist.set(e.a, d); cola.push(e.a); }
      }
    }
    return Infinity;
  }

  // Simulación sin programa (solo 5V y 3.3V como fuentes)
  function simular() {
    const red = calcularRedes();
    const res = {encendidos: [], quemados: [], invertidos: [], puenteados: [], corto: false, redCorto: null, red, tipos: {}};
    piezas.forEach(p => { res.tipos[p.id] = p.tipo; });
    const ard = piezas.find(p => p.tipo === 'arduino');
    if (!ard) return res;
    const gnd = red(ard.id + '.GND1');
    const fuentes = [red(ard.id + '.5V'), red(ard.id + '.3V3')];
    if (fuentes.includes(gnd)) { res.corto = true; res.redCorto = gnd; return res; }
    const aristas = crearAristas(red), bloqueados = new Set([gnd, ...fuentes]);
    const dist = (o, d, x) => distancia(aristas, bloqueados, o, d, x);
    for (const p of piezas.filter(q => clase(q) === 'led')) {
      const A = red(p.id + '.anodo'), K = red(p.id + '.catodo');
      if (A === K) { res.puenteados.push(p.id); continue; } // las dos patas en la misma red
      const d1 = dist(fuentes, A, p.id), d2 = dist([K], gnd, p.id);
      if (d1 < Infinity && d2 < Infinity) (d1 + d2 === 0 ? res.quemados : res.encendidos).push(p.id);
      else if (dist(fuentes, K, p.id) < Infinity && dist([A], gnd, p.id) < Infinity) res.invertidos.push(p.id);
    }
    return res;
  }

  // Nombre y color de cada red conectada a un pin del Arduino
  function calcularRedesPin(red) {
    const mapa = new Map(), ard = piezas.find(p => p.tipo === 'arduino');
    if (!ard) return mapa;
    for (const t of PINES_ARDUINO) {
      const n = red(ard.id + '.' + t.id);
      if (mapa.has(n)) continue;
      const tipo = t.red === '5V' ? '5V' : t.red === '3V3' ? '3V3' : t.red === 'GND' ? 'GND' : /^A\d$/.test(t.id) ? 'analogico' : /^D\d/.test(t.id) ? 'digital' : null;
      if (!tipo) continue;
      const nombre = tipo === 'digital' ? 'pin ' + t.nombre : tipo === 'analogico' ? 'pin ' + t.nombre : t.nombre;
      mapa.set(n, {nombre, color: COLOR_RED[tipo]});
    }
    return mapa;
  }

  // ---------- dibujo ----------
  function dibujar() {
    capaRedes.innerHTML = capaMarcas.innerHTML = capaPiezas.innerHTML = capaCables.innerHTML = capaUI.innerHTML = '';
    const porId = new Map(terminales().map(t => [t.id, t]));
    const agujeros = new Set(fijos.map(clave));

    redActual = prog ? prog.red : resultado ? resultado.red : cfg.verRedes ? calcularRedes() : null;
    redesPin = cfg.verRedes && cfg.modo === 'circuito' ? calcularRedesPin(redActual) : null;
    if (redesPin) {
      for (const f of fijos) {
        const info = f.pieza.tipo === 'protoboard' && redesPin.get(redActual(f.id));
        if (info) el('rect', {x: f.x - 4.5, y: f.y - 4.5, width: 9, height: 9, rx: 2, fill: info.color, 'fill-opacity': 0.3, stroke: info.color, 'stroke-width': 1.2, 'pointer-events': 'none'}, capaRedes);
      }
    }

    for (const p of piezas) {
      if (p.fijo) continue;
      // Marca verde en cada agujero que tiene una pata insertada
      for (const t of terminalesDe(p)) if (agujeros.has(clave(t))) el('rect', {x: t.x - 3.5, y: t.y - 3.5, width: 7, height: 7, rx: 1.5, class: 'insertada'}, capaMarcas);
      let estado = 'normal', valor = 1;
      const cl = clase(p);
      if (cl === 'potenciometro' || cl === 'ldr' || cl === 'ultrasonico') valor = p.pos;
      else if (cl === 'servo') valor = p.angulo;
      else if (cl === 'motor') valor = {ang: p.giro || 0, directo: !!(prog && (prog.motores.get(p.id) || {}).directo)};
      else if (cl === 'rgb') {
        valor = ['r', 'g', 'b'].map(c => (prog && prog.brillos.get(p.id + ':' + c)) || 0);
        estado = prog && prog.quemados.has(p.id) ? 'quemado' : valor.some(x => x > 0.02) ? 'encendido' : 'normal';
      }
      else if (cl === 'pulsador') estado = prog && prog.presionados.has(p.id) ? 'presionado' : 'normal';
      else if (cl === 'buzzer') estado = prog && prog.sonidos.has(p.id) ? 'sonando' : 'normal';
      else if (prog) {
        valor = prog.brillos.get(p.id) || 0;
        estado = prog.quemados.has(p.id) ? 'quemado' : valor > 0.02 ? 'encendido' : 'normal';
      } else if (resultado) {
        estado = resultado.quemados.includes(p.id) ? 'quemado' : resultado.encendidos.includes(p.id) ? 'encendido' : 'normal';
      }
      const g = el('g', {transform: `translate(${p.x} ${p.y}) rotate(${p.rot})`, class: 'pieza' + (esSel('pieza', p.id) ? ' seleccionada' : ''), 'data-pieza': p.id, 'data-clase': cl || ''}, capaPiezas);
      COMPONENTES[p.tipo].dibujar(g, estado, valor);
      for (const t of COMPONENTES[p.tipo].terminales) {
        if (!agujeros.has(clave(posicion(p, t)))) el('circle', {cx: t.x, cy: t.y, r: 2.5, class: 'pata-suelta'}, g);
      }
      if (estado === 'quemado') humo(p);
    }
    for (const c of cables) {
      const a = porId.get(c.desde), b = porId.get(c.hasta);
      if (!a || !b) continue;
      const pts = [a, ...c.puntos, b].map(q => q.x + ',' + q.y).join(' ');
      const g = el('g', {class: 'cable' + (esSel('cable', c.id) ? ' seleccionado' : ''), 'data-cable': c.id}, capaCables);
      el('polyline', {points: pts, class: 'cable-toque'}, g);
      el('polyline', {points: pts, class: 'cable-linea', stroke: c.color}, g);
      el('circle', {cx: a.x, cy: a.y, r: 3.2, fill: c.color}, g);
      el('circle', {cx: b.x, cy: b.y, r: 3.2, fill: c.color}, g);
    }
    // Cortocircuito: se marca en rojo todo lo que quedó unido
    const redCorto = prog ? prog.redCorto : resultado && resultado.redCorto;
    if (redCorto) {
      for (const f of fijos) if (redActual(f.id) === redCorto) el('rect', {x: f.x - 5, y: f.y - 5, width: 10, height: 10, rx: 2, class: 'corto'}, capaUI);
      const p5 = porId.get('ard.5V');
      if (p5) texto(capaUI, p5.x, p5.y - 22, '⚡', {class: 'chispa', 'text-anchor': 'middle'});
    }
    for (const id of resaltados) {
      const t = porId.get(id);
      if (t) el('circle', {cx: t.x, cy: t.y, r: 7, class: 'resaltado'}, capaUI);
    }
  }

  function humo(p) {
    const c = posicion(p, COMPONENTES[p.tipo].centro);
    for (let i = 0; i < 3; i++) el('circle', {cx: c.x + (i - 1) * 5, cy: c.y, r: 4, class: 'humo', style: `animation-delay:${i * 0.5}s`}, capaUI);
  }

  function actualizarPrevia(w) {
    if (!cableNuevo) { previa.setAttribute('visibility', 'hidden'); return; }
    if (!w) return;
    const pts = [buscar(cableNuevo.desde), ...cableNuevo.puntos];
    const t = cercano(w.x, w.y, 7);
    if (t && t.id !== cableNuevo.desde) pts.push(...codo(pts, t), t);
    else pts.push(alinear(pts[pts.length - 1], w));
    previa.setAttribute('points', pts.map(q => q.x + ',' + q.y).join(' '));
    previa.setAttribute('visibility', 'visible');
  }

  // Al pasar el mouse por un agujero se iluminan todos los que están conectados con él.
  let tiraActual = null;
  function resaltarTira(t) {
    const k = t && t.pieza.fijo && t.t.red ? t.pieza.id + ':' + t.t.red : null;
    if (k === tiraActual) return;
    tiraActual = k;
    capaHover.innerHTML = '';
    if (!k) return;
    for (const f of fijos) {
      if (f.pieza.id + ':' + f.t.red === k) el('rect', {x: f.x - 4.5, y: f.y - 4.5, width: 9, height: 9, rx: 2, class: 'tira'}, capaHover);
    }
  }

  function nombreTerminal(t) {
    const info = redesPin && redActual && redesPin.get(redActual(t.id));
    const conectado = info && t.pieza.tipo !== 'arduino' ? ` · conectado a ${info.nombre}` : '';
    return `${COMPONENTES[t.pieza.tipo].nombre} · ${t.t.desc || t.t.nombre}${conectado}`;
  }

  function mostrarTooltip(e, txt) {
    const r = svg.getBoundingClientRect();
    tooltip.textContent = txt;
    tooltip.hidden = false;
    tooltip.style.left = (e.clientX - r.left + 14) + 'px';
    tooltip.style.top = (e.clientY - r.top + 16) + 'px';
  }
  function ocultarHover() { tooltip.hidden = true; anillo.setAttribute('visibility', 'hidden'); resaltarTira(null); }

  // ---------- vista (zoom y desplazamiento) ----------
  function aplicarVista() { mundo.setAttribute('transform', `translate(${vista.x} ${vista.y}) scale(${vista.z})`); }
  function aMundo(e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(mundo.getScreenCTM().inverse());
  }
  function zoom(f, cx, cy) {
    const r = svg.getBoundingClientRect();
    if (cx == null) { cx = (r.width - margenDerecho) / 2; cy = r.height / 2; }
    const z = Math.min(5, Math.max(0.4, vista.z * f)), k = z / vista.z;
    vista.x = cx - (cx - vista.x) * k;
    vista.y = cy - (cy - vista.y) * k;
    vista.z = z;
    vistaManual = true;
    aplicarVista();
  }

  // Caja que encierra placas, componentes y cables (sin los elementos auxiliares de la interfaz).
  function cajaContenido() {
    let b = null;
    for (const capa of [capaFija, capaPiezas, capaCables]) {
      if (!capa.childNodes.length) continue;
      const c = capa.getBBox();
      if (!c.width) continue;
      b = !b ? {x1: c.x, y1: c.y, x2: c.x + c.width, y2: c.y + c.height}
        : {x1: Math.min(b.x1, c.x), y1: Math.min(b.y1, c.y), x2: Math.max(b.x2, c.x + c.width), y2: Math.max(b.y2, c.y + c.height)};
    }
    return b;
  }

  // Centra y agranda la vista sobre el circuito (sin contar el panel de código, si está abierto).
  // Mientras el estudiante no haga zoom ni mueva la vista, se vuelve a centrar sola si cambia la ventana.
  let ajustePendiente = false, vistaManual = false;
  function ajustar() {
    const r = svg.getBoundingClientRect(), b = cajaContenido();
    ajustePendiente = !r.width || !b;
    if (ajustePendiente) return;
    const m = 24, arriba = 64, ancho = r.width - margenDerecho, w = b.x2 - b.x1, h = b.y2 - b.y1;
    const z = Math.min((ancho - 2 * m) / w, (r.height - arriba - m) / h, 3);
    vista = {z, x: (ancho - w * z) / 2 - b.x1 * z, y: arriba + (r.height - arriba - m - h * z) / 2 - b.y1 * z};
    vistaManual = false;
    aplicarVista();
  }

  // ---------- eventos ----------
  const avisarEdicion = () => opciones.avisar('Detén la simulación para editar el circuito.');
  const cambio = () => { dibujar(); opciones.alCambiar(); };

  function alPresionar(e) {
    if (e.button !== 0) return;
    const w = aMundo(e);
    if (cfg.modo === 'pasos') {
      const t = cercano(w.x, w.y, 7), parte = t ? null : e.target.closest('[data-id]');
      if (t) opciones.alClic({terminal: t.id, nombre: t.t.desc || t.t.nombre});
      else if (parte) opciones.alClic({parte: parte.dataset.id, nombre: parte.dataset.parte.split(':')[0]});
      else iniciarPan(e);
      return;
    }
    const gp = e.target.closest('[data-pieza]'), gc = e.target.closest('[data-cable]');
    const pieza = gp && piezas.find(q => q.id === gp.dataset.pieza);
    if (pieza && e.target.closest('[data-perilla]')) {
      arr = {modo: 'perilla', p: pieza, x0: e.clientX, y0: e.clientY, pos0: pieza.pos};
      return;
    }
    if (simulando) {
      if (pieza && clase(pieza) === 'pulsador') { presionar(pieza.id, true); arr = {modo: 'boton', id: pieza.id}; }
      else if (gp || gc) avisarEdicion();
      else iniciarPan(e);
      return;
    }
    if (cableNuevo) {
      const t = cercano(w.x, w.y, 7);
      if (t && t.id !== cableNuevo.desde) terminarCable(t.id);
      else if (!t) {
        const pts = cableNuevo.puntos, ultimo = pts.length ? pts[pts.length - 1] : buscar(cableNuevo.desde);
        pts.push(alinear(ultimo, w));
      }
      actualizarPrevia(w);
      return;
    }
    const suelta = pataSuelta(w);
    if (suelta) { sel = null; cableNuevo = {desde: suelta.id, puntos: []}; actualizarPrevia(w); dibujar(); return; }
    if (gp) {
      const p = piezas.find(q => q.id === gp.dataset.pieza);
      sel = {tipo: 'pieza', id: p.id};
      arr = {modo: 'pieza', p, dx: w.x - p.x, dy: w.y - p.y};
      dibujar();
      return;
    }
    if (gc) { sel = {tipo: 'cable', id: gc.dataset.cable}; dibujar(); return; }
    const t = cercano(w.x, w.y, 6);
    sel = null;
    if (t) { cableNuevo = {desde: t.id, puntos: []}; actualizarPrevia(w); dibujar(); return; }
    dibujar();
    iniciarPan(e);
  }

  function iniciarPan(e) {
    arr = {modo: 'pan', sx: e.clientX, sy: e.clientY, vx: vista.x, vy: vista.y};
    svg.style.cursor = 'grabbing';
  }

  function alMover(e) {
    if (!activo()) return;
    if (arr && arr.modo === 'pan') {
      vista.x = arr.vx + e.clientX - arr.sx;
      vista.y = arr.vy + e.clientY - arr.sy;
      vistaManual = true;
      aplicarVista();
      return;
    }
    if (arr && arr.modo === 'perilla') {
      arr.p.pos = Math.min(1, Math.max(0, arr.pos0 + (e.clientX - arr.x0 - (e.clientY - arr.y0)) / 160));
      mostrarTooltip(e, textoControl(arr.p));
      dibujar();
      return;
    }
    const w = aMundo(e);
    if (arr && arr.modo === 'pieza') {
      arr.p.x = w.x - arr.dx;
      arr.p.y = w.y - arr.dy;
      arr.movio = true;
      ajustarAGrilla(arr.p);
      ocultarHover();
      dibujar();
      return;
    }
    if (cableNuevo) actualizarPrevia(w);
    if (!svg.contains(e.target)) { ocultarHover(); return; }
    const t = cercano(w.x, w.y, 6);
    resaltarTira(cfg.nombres ? t : null);
    if (t) {
      anillo.setAttribute('cx', t.x);
      anillo.setAttribute('cy', t.y);
      anillo.setAttribute('visibility', 'visible');
      if (cfg.nombres) mostrarTooltip(e, nombreTerminal(t)); else tooltip.hidden = true;
      return;
    }
    anillo.setAttribute('visibility', 'hidden');
    const parte = cfg.nombres && e.target.closest('[data-parte]');
    if (parte) mostrarTooltip(e, parte.dataset.parte); else tooltip.hidden = true;
  }

  function alSoltar(e) {
    if (!arr) return;
    if (arr.modo === 'pieza') {
      const encima = document.elementFromPoint(e.clientX, e.clientY);
      if (arr.nueva && !(encima && svg.contains(encima))) { piezas = piezas.filter(p => p !== arr.p); sel = null; }
      if (arr.nueva || arr.movio) cambio(); else dibujar();
    }
    if (arr.modo === 'boton') presionar(arr.id, false);
    svg.style.cursor = '';
    arr = null;
  }

  const textoControl = p => (clase(p) === 'ldr' ? `Luz: ${Math.round(p.pos * 100)}%`
    : clase(p) === 'ultrasonico' ? `Distancia: ${Math.round(2 + p.pos * 198)} cm` : `Perilla: ${Math.round(p.pos * 100)}%`);

  function alRueda(e) {
    e.preventDefault();
    const gp = e.target.closest('[data-perilla]') && e.target.closest('[data-pieza]');
    if (gp) {
      const p = piezas.find(q => q.id === gp.dataset.pieza);
      p.pos = Math.min(1, Math.max(0, p.pos + (e.deltaY < 0 ? 0.04 : -0.04)));
      mostrarTooltip(e, textoControl(p));
      dibujar();
      return;
    }
    const r = svg.getBoundingClientRect();
    zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
  }

  function alTecla(e) {
    if (!activo() || cfg.modo === 'pasos' || e.target.matches('input, textarea') || e.target.closest('.panel-codigo')) return;
    if (e.key === 'Escape') { cableNuevo = null; actualizarPrevia(); sel = null; dibujar(); }
    else if (e.key === 'r' || e.key === 'R') girar();
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); borrar(); }
  }

  function terminarCable(hasta) {
    const pinArduino = id => { const t = buscar(id); return t && t.pieza.tipo === 'arduino' ? t.t.red : null; };
    const redes = [pinArduino(cableNuevo.desde), pinArduino(hasta)];
    const color = redes.includes('GND') ? '#212121' : (redes.includes('5V') || redes.includes('3V3')) ? '#E53935' : colorActual;
    const puntos = cableNuevo.puntos.concat(codo([buscar(cableNuevo.desde), ...cableNuevo.puntos], buscar(hasta)));
    cables.push({id: 'c' + (++cont), desde: cableNuevo.desde, hasta, puntos, color});
    cableNuevo = null;
    cambio();
  }

  // ---------- simulación con programa ----------
  // Devuelve el "hardware" que usa el intérprete (Programa.ejecutar). Cada cuadro se calcula
  // cuánto tiempo estuvo en ALTO cada pin (ciclo de trabajo) y con eso el brillo de cada LED.
  function iniciarPrograma(eventos) {
    cableNuevo = null; actualizarPrevia(); sel = null; resultado = null;
    simulando = true;
    prog = {
      modo: Array(20).fill(0), nivel: Array(20).fill(0), alto: Array(20).fill(0), cambio: Array(20).fill(0), t0: 0,
      tono: Array(20).fill(null), ruido: [], presionados: new Set(), servoObjetivo: Array(20).fill(null),
      servos: new Map(), motores: new Map(), drivers: [],
      brillos: new Map(), quemados: new Set(), sonidos: new Map(), buzzInvertidos: new Set(), corto: false, redCorto: null, avisos: new Set(),
    };
    const P = prog;
    prepararRedes(P);
    sonido.preparar();
    const acumular = p => { const t = hw.tiempo(); P.alto[p] += P.nivel[p] * (t - P.cambio[p]); P.cambio[p] = t; };
    const hw = {
      tiempo: () => 0,
      pinMode(p, m) { P.modo[p] = m; },
      digitalWrite(p, v, linea) {
        if (P.modo[p] !== SALIDA && v && !P.avisos.has('pm' + p)) {
          P.avisos.add('pm' + p);
          eventos.alAviso(`Línea ${linea}: usaste digitalWrite en el pin ${p} sin pinMode(${p}, OUTPUT). El LED se verá muy débil.`);
        }
        acumular(p);
        P.nivel[p] = v;
        P.tono[p] = null;
      },
      // Como en el Arduino real: 255 = siempre encendido; valores mayores "dan la vuelta" (se pierden los bits altos).
      analogWrite(p, v) {
        P.modo[p] = SALIDA;
        acumular(p);
        v = Math.trunc(v);
        P.nivel[p] = [3, 5, 6, 9, 10, 11].includes(p) ? (v <= 0 ? 0 : v === 255 ? 1 : (v & 255) / 255) : v >= 128 ? 1 : 0;
        P.tono[p] = null;
      },
      digitalRead: p => leerPin(p),
      analogRead: p => leerAnalogico(p),
      tone(p, f, d) {
        P.modo[p] = SALIDA;
        acumular(p);
        P.nivel[p] = 0.5;
        P.tono[p] = {f, hasta: d ? hw.tiempo() + d : Infinity};
      },
      noTone(p) { acumular(p); P.nivel[p] = 0; P.tono[p] = null; },
      servo(p, angulo) { P.servoObjetivo[p] = Math.max(0, Math.min(180, angulo)); },
      // pulseIn en el pin ECHO de un sensor ultrasónico con energía y con TRIG conectado a un pin de salida
      pulseIn(p) {
        for (const u of piezas.filter(q => clase(q) === 'ultrasonico')) {
          const R = t => P.red(u.id + '.' + t);
          if (R('echo') !== P.redPin[p] || R('vcc') !== P.v5 || R('gnd') !== P.gnd) continue;
          if (!P.redPin.some((r, q) => r === R('trig') && P.modo[q] === SALIDA)) continue;
          return Math.round((2 + u.pos * 198) * 58);
        }
        return 0;
      },
      serial: (txt, salto) => eventos.alSerial(txt, salto),
      inicioCuadro(t0) { P.t0 = t0; P.alto.fill(0); P.cambio.fill(t0); },
      finCuadro(t1) {
        if (prog !== P) return;
        P.tono.forEach((x, p) => { if (x && x.hasta <= t1) { P.tono[p] = null; P.nivel[p] = 0; } });
        const dur = t1 - P.t0;
        const duty = P.nivel.map((nv, p) => (dur > 0 ? (P.alto[p] + nv * (t1 - P.cambio[p])) / dur : nv));
        evaluarLeds(duty);
        moverActuadores(duty, dur);
        piezas.filter(p => clase(p) === 'buzzer').forEach(p => sonido.poner(p.id, P.sonidos.get(p.id)));
        dibujar();
        eventos.alCuadro({
          t: t1, corto: P.corto, presionado: P.presionados.size > 0,
          leds: piezas.filter(p => clase(p) === 'led').map(p => ({id: p.id, tipo: p.tipo, brillo: P.brillos.get(p.id) || 0, quemado: P.quemados.has(p.id)})),
          buzzers: piezas.filter(p => clase(p) === 'buzzer').map(p => ({id: p.id, f: P.sonidos.get(p.id) || 0, invertido: P.buzzInvertidos.has(p.id)})),
          perillas: piezas.filter(p => ['potenciometro', 'ldr', 'ultrasonico'].includes(clase(p))).map(p => p.pos),
          rgb: piezas.filter(p => clase(p) === 'rgb').map(p => ({id: p.id, c: ['r', 'g', 'b'].map(c => P.brillos.get(p.id + ':' + c) || 0)})),
          servos: piezas.filter(p => clase(p) === 'servo').map(p => ({id: p.id, angulo: p.angulo, sinEnergia: !!(P.servos.get(p.id) || {}).sinEnergia})),
          motores: piezas.filter(p => clase(p) === 'motor').map(p => Object.assign({id: p.id}, P.motores.get(p.id) || {vel: 0})),
        });
      },
    };
    P.hw = hw;
    dibujar();
    return hw;
  }

  function prepararRedes(P) {
    const red = calcularRedes(P.presionados), ard = piezas.find(p => p.tipo === 'arduino');
    Object.assign(P, {
      red, redPin: [...Array(20)].map((_, n) => red(ard.id + '.' + idPin(n))), aristas: crearAristas(red),
      gnd: red(ard.id + '.GND1'), v5: red(ard.id + '.5V'), v33: red(ard.id + '.3V3'),
    });
  }

  function presionar(id, si) {
    if (!prog) return;
    if (si) prog.presionados.add(id); else prog.presionados.delete(id);
    prepararRedes(prog);
    dibujar();
  }

  // Cada LED es un diodo; el LED RGB son tres diodos (rojo, verde y azul) con el cátodo en común.
  function diodos() {
    const lista = [];
    for (const p of piezas) {
      if (clase(p) === 'led') lista.push({id: p.id, pieza: p.id, a: p.id + '.anodo', k: p.id + '.catodo'});
      else if (clase(p) === 'rgb') for (const c of ['r', 'g', 'b']) lista.push({id: p.id + ':' + c, pieza: p.id, a: p.id + '.' + c, k: p.id + '.k'});
    }
    return lista;
  }

  function evaluarLeds(duty) {
    const P = prog, fuentes = [{n: P.v5, b: 1}, {n: P.v33, b: 1}], sumideros = [{n: P.gnd, f: 1}];
    for (let p = 0; p < 20; p++) {
      if (P.modo[p] === SALIDA) {
        if (duty[p] > 0.01) fuentes.push({n: P.redPin[p], b: duty[p], pin: p, f: P.tono[p] && P.tono[p].f});
        if (duty[p] < 0.99) sumideros.push({n: P.redPin[p], f: 1 - duty[p], pin: p});
      } else if (P.nivel[p]) fuentes.push({n: P.redPin[p], b: 0.08, pin: p}); // pull-up interno: muy débil
    }
    const unidos = fuentes.find(s => s.b > 0.3 && sumideros.some(k => k.n === s.n && k.pin !== s.pin && k.f > 0.3));
    P.corto = !!unidos;
    P.redCorto = unidos ? unidos.n : null;
    P.brillos = new Map();
    P.sonidos = new Map();
    if (P.corto) return;
    const bloqueados = new Set([...fuentes, ...sumideros].map(x => x.n));
    for (const d of diodos()) {
      if (P.quemados.has(d.pieza)) continue;
      const A = P.red(d.a), K = P.red(d.k);
      if (A === K) continue;
      let mejor = 0;
      for (const k of sumideros) {
        const d2 = distancia(P.aristas, bloqueados, [K], k.n, d.id);
        if (d2 === Infinity) continue;
        for (const s of fuentes) {
          if (s.pin !== undefined && s.pin === k.pin) continue;
          const d1 = distancia(P.aristas, bloqueados, [s.n], A, d.id);
          if (d1 === Infinity) continue;
          const v = s.b * k.f;
          if (d1 + d2 === 0 && v > 0.5) P.quemados.add(d.pieza);
          mejor = Math.max(mejor, v);
        }
      }
      if (!P.quemados.has(d.pieza) && mejor > 0.02) P.brillos.set(d.id, mejor);
    }
    // Buzzers: suenan si hay camino fuente → + y − → GND. Con 5V o un pin en ALTO dan un tono fijo; con tone(), su nota.
    P.sonidos = new Map();
    P.buzzInvertidos = new Set();
    const hayCamino = (desde, hasta, excluir) => distancia(P.aristas, bloqueados, [desde], hasta, excluir) < Infinity;
    for (const p of piezas) {
      if (clase(p) !== 'buzzer') continue;
      const M = P.red(p.id + '.mas'), N = P.red(p.id + '.menos');
      if (M === N) continue;
      let f = 0, alReves = false;
      for (const k of sumideros) {
        for (const s of fuentes) {
          if ((s.pin !== undefined && s.pin === k.pin) || s.b * k.f < 0.3) continue;
          if (hayCamino(s.n, M, p.id) && hayCamino(N, k.n, p.id)) f = Math.max(f, s.f || 1000);
          else if (hayCamino(s.n, N, p.id) && hayCamino(M, k.n, p.id)) alReves = true;
        }
      }
      if (f) P.sonidos.set(p.id, f); else if (alReves) P.buzzInvertidos.add(p.id);
    }
  }

  // Servos: se mueven hacia el ángulo pedido si tienen energía (marrón a GND, rojo a 5V) y su señal llega del pin.
  // Driver L298N: IN1/IN2 eligen el sentido y ENA la velocidad (sin conectar = velocidad máxima, como con el puente puesto).
  // Motor: gira solo si está en las salidas del driver; conectado directo a un pin no gira (el pin no da tanta corriente).
  function moverActuadores(duty, dur) {
    const P = prog, alto = n => { const v = voltaje(n); return v !== null && v >= 2.5; };
    const pinEn = n => P.redPin.findIndex((r, q) => r === n && P.modo[q] === SALIDA);
    for (const sv of piezas.filter(q => clase(q) === 'servo')) {
      const R = t => P.red(sv.id + '.' + t), q = P.redPin.findIndex((r, i) => r === R('senal') && P.servoObjetivo[i] != null);
      const objetivo = q >= 0 ? P.servoObjetivo[q] : null, energia = R('vcc') === P.v5 && R('gnd') === P.gnd;
      P.servos.set(sv.id, {sinEnergia: objetivo !== null && !energia});
      if (objetivo === null || !energia) continue;
      const paso = 0.3 * dur;
      sv.angulo += Math.max(-paso, Math.min(paso, objetivo - sv.angulo));
    }
    P.drivers = [];
    for (const d of piezas.filter(q => clase(q) === 'driver')) {
      const R = t => P.red(d.id + '.' + t), energia = R('vcc') === P.v5 && R('gnd') === P.gnd;
      const qEna = pinEn(R('ena')), ena = qEna >= 0 ? duty[qEna] : voltaje(R('ena')) === null ? 1 : alto(R('ena')) ? 1 : 0;
      const vel = energia ? ena * ((alto(R('in1')) ? 1 : 0) - (alto(R('in2')) ? 1 : 0)) : 0;
      P.drivers.push({vel, out1: R('out1'), out2: R('out2')});
    }
    for (const m of piezas.filter(q => clase(q) === 'motor')) {
      const A = P.red(m.id + '.a'), B = P.red(m.id + '.b');
      let vel = 0, directo = false;
      for (const d of P.drivers) {
        if (A === d.out1 && B === d.out2) vel = d.vel;
        else if (A === d.out2 && B === d.out1) vel = -d.vel;
      }
      const va = voltaje(A), vb = voltaje(B);
      if (!vel && va !== null && vb !== null && va !== vb) {
        if (pinEn(A) >= 0 || pinEn(B) >= 0) directo = true;
        else vel = (va - vb) / 5;
      }
      P.motores.set(m.id, {vel, directo});
      m.giro = ((m.giro || 0) + vel * dur * 0.72) % 360;
    }
  }

  // Sonido de los buzzers (onda cuadrada, volumen bajo). CONFIG.sonido = false lo silencia.
  const sonido = (() => {
    let ctx = null;
    const osc = new Map();
    return {
      preparar() {
        if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (C) ctx = new C(); }
        if (ctx && ctx.state === 'suspended') ctx.resume();
      },
      poner(id, f) {
        let o = osc.get(id);
        if (!f || !ctx || !CONFIG.sonido) { if (o) { o.os.stop(); osc.delete(id); } return; }
        if (!o) {
          const os = ctx.createOscillator(), gan = ctx.createGain();
          os.type = 'square';
          gan.gain.value = 0.04;
          os.connect(gan).connect(ctx.destination);
          os.start();
          o = {os};
          osc.set(id, o);
        }
        o.os.frequency.setValueAtTime(f, ctx.currentTime);
      },
      callar() { osc.forEach(o => o.os.stop()); osc.clear(); },
    };
  })();

  // ---------- entradas ----------
  // Voltaje de una red si está fijado por 5V, 3.3V, GND o un pin de salida (null si no).
  function voltaje(n) {
    const P = prog;
    if (n === P.v5) return 5;
    if (n === P.v33) return 3.3;
    if (n === P.gnd) return 0;
    for (let q = 0; q < 20; q++) if (P.modo[q] === SALIDA && P.redPin[q] === n) return P.nivel[q] * 5;
    return null;
  }

  // Voltaje que "ve" un pin de entrada: directo, por el cursor de un potenciómetro
  // o a través de una resistencia (pull-up / pull-down). null = pin flotante.
  function voltajeEntrada(p) {
    const P = prog, n = P.redPin[p];
    const v = voltaje(n);
    if (v !== null) return v;
    for (const pot of piezas) {
      if (clase(pot) !== 'potenciometro' || P.red(pot.id + '.cursor') !== n) continue;
      const vi = voltaje(P.red(pot.id + '.izq')), vd = voltaje(P.red(pot.id + '.der'));
      if (vi !== null && vd !== null) return vi + (vd - vi) * pot.pos;
      if (vi !== null || vd !== null) return vi !== null ? vi : vd;
    }
    // Fotorresistencia: con una resistencia fija forma un divisor de voltaje (más luz → más voltaje).
    // Sin la resistencia fija, el pin solo "ve" el voltaje del otro lado y la lectura no cambia.
    for (const l of piezas) {
      if (clase(l) !== 'ldr') continue;
      const A = P.red(l.id + '.a'), B = P.red(l.id + '.b');
      if (A !== n && B !== n) continue;
      const vs = voltaje(A === n ? B : A);
      if (vs === null) continue;
      const fija = P.aristas.find(e => e.de === n && e.peso === 1 && e.id !== l.id && voltaje(e.a) !== null);
      if (!fija) return vs;
      const vr = voltaje(fija.a);
      return vr + (vs - vr) * l.pos;
    }
    for (const e of P.aristas) {
      if (e.de !== n || e.peso !== 1) continue;
      const w = voltaje(e.a);
      if (w !== null) return w;
    }
    return null;
  }

  // Un pin sin nada conectado "flota": lee valores al azar que cambian cada tanto.
  function ruido(p) {
    const P = prog, t = P.hw.tiempo(), r = P.ruido[p];
    if (!r || t >= r.hasta) P.ruido[p] = {v: Math.random(), hasta: t + 250 + Math.random() * 450};
    return P.ruido[p].v;
  }

  function leerPin(p) {
    const v = voltajeEntrada(p);
    if (v !== null) return v >= 2.5 ? 1 : 0;
    if (prog.modo[p] === ENTRADA_PULLUP) return 1;
    return ruido(p) > 0.5 ? 1 : 0;
  }

  function leerAnalogico(p) {
    const v = voltajeEntrada(p);
    if (v !== null) return Math.round((Math.max(0, Math.min(5, v)) / 5) * 1023);
    return Math.round(ruido(p) * 1023);
  }

  function detener() {
    sonido.callar();
    simulando = false;
    prog = null;
    resultado = null;
    dibujar();
  }

  // ---------- acciones públicas ----------
  function iniciar(svgEl, opc) {
    svg = svgEl;
    opciones = Object.assign({avisar: () => {}, alCambiar: () => {}, alClic: () => {}}, opc);
    tooltip = svg.parentNode.querySelector('.tooltip');
    const defs = el('defs', {}, svg);
    for (const color in COLORES_LED) {
      const grad = el('radialGradient', {id: 'brillo-' + color}, defs);
      el('stop', {offset: '0%', 'stop-color': COLORES_LED[color].brillo, 'stop-opacity': 0.85}, grad);
      el('stop', {offset: '100%', 'stop-color': COLORES_LED[color].brillo, 'stop-opacity': 0}, grad);
    }
    mundo = el('g', {}, svg);
    [capaFija, capaRedes, capaHover, capaMarcas, capaPiezas, capaCables, capaUI] = [0, 1, 2, 3, 4, 5, 6].map(() => el('g', {}, mundo));
    anillo = el('circle', {r: 6, class: 'anillo', visibility: 'hidden'}, mundo);
    previa = el('polyline', {class: 'previa', visibility: 'hidden'}, mundo);
    svg.addEventListener('pointerdown', alPresionar);
    svg.addEventListener('wheel', alRueda, {passive: false});
    window.addEventListener('pointermove', alMover);
    window.addEventListener('pointerup', alSoltar);
    window.addEventListener('keydown', alTecla);
    new ResizeObserver(() => { if (ajustePendiente || !vistaManual) ajustar(); }).observe(svg);
  }

  function cargar(esc, config) {
    escena = esc;
    if (config) cfg = Object.assign({modo: 'circuito', nombres: true, verRedes: false}, config);
    piezas = esc.piezas.map(p => Object.assign({rot: 0}, p));
    fijos = [].concat(...piezas.filter(p => p.fijo).map(terminalesDe));
    piezas.forEach(p => {
      if (p.en) { const t = fijos.find(f => f.id === p.en); p.x = t.x; p.y = t.y; }
      if (['potenciometro', 'ldr'].includes(clase(p)) && p.pos == null) p.pos = 0.5;
      if (clase(p) === 'ultrasonico' && p.pos == null) p.pos = 0.3;
      if (clase(p) === 'servo' && p.angulo == null) p.angulo = 90;
    });
    cables = (esc.cables || []).map(c => {
      let puntos = (c.puntos || []).map(q => Object.assign({}, q));
      if (c.carril != null) { const a = buscar(c.desde), b = buscar(c.hasta); puntos = [{x: a.x, y: c.carril}, {x: b.x, y: c.carril}]; }
      return Object.assign({}, c, {id: 'c' + (++cont), puntos});
    });
    sel = arr = cableNuevo = resultado = prog = null;
    simulando = false;
    resaltados = [];
    redibujarFijos();
    actualizarPrevia();
    ocultarHover();
    dibujar();
  }

  function redibujarFijos() {
    svg.classList.toggle('pixel', CONFIG.estiloPlaca === 'pixel');
    capaFija.innerHTML = '';
    piezas.filter(p => p.fijo).forEach(p => COMPONENTES[p.tipo].dibujar(el('g', {transform: `translate(${p.x} ${p.y})`}, capaFija)));
  }

  function soltarDesdePaleta(tipo, e) {
    if (simulando) { opciones.avisar('Detén la simulación para agregar componentes.'); return; }
    cableNuevo = null;
    actualizarPrevia();
    const w = aMundo(e), ag = COMPONENTES[tipo].agarre;
    const p = {id: tipo + '_' + (++cont), tipo, x: w.x - ag.x, y: w.y - ag.y, rot: 0, pos: tipo === 'ultrasonico' ? 0.3 : 0.5, angulo: 90};
    piezas.push(p);
    sel = {tipo: 'pieza', id: p.id};
    arr = {modo: 'pieza', p, dx: ag.x, dy: ag.y, nueva: true};
    dibujar();
  }

  function girar() {
    if (simulando) { avisarEdicion(); return; }
    if (!sel || sel.tipo !== 'pieza') { opciones.avisar('Primero selecciona un componente.'); return; }
    const p = piezas.find(q => q.id === sel.id);
    p.rot = (p.rot + 90) % 360;
    cambio();
  }

  function borrar() {
    if (simulando) { avisarEdicion(); return; }
    if (!sel) return;
    if (sel.tipo === 'pieza') {
      piezas = piezas.filter(p => p.id !== sel.id || p.fijo);
      cables = cables.filter(c => !c.desde.startsWith(sel.id + '.') && !c.hasta.startsWith(sel.id + '.'));
    } else {
      cables = cables.filter(c => c.id !== sel.id);
    }
    sel = null;
    cambio();
  }

  function color(c) {
    colorActual = c;
    if (sel && sel.tipo === 'cable') { cables.find(q => q.id === sel.id).color = c; dibujar(); }
  }

  function alternarSimulacion() {
    cableNuevo = null;
    actualizarPrevia();
    simulando = !simulando;
    resultado = simulando ? simular() : null;
    if (simulando) sel = null;
    dibujar();
    return resultado;
  }

  // Estado del circuito para los niveles guiados: redes y en qué agujero está cada pata.
  function analizar() {
    const red = calcularRedes(), porClave = new Map(fijos.map(f => [clave(f), f.id])), inserciones = {};
    for (const t of terminales().slice(fijos.length)) {
      const h = porClave.get(clave(t));
      if (h) inserciones[t.id] = h;
    }
    return {red, inserciones, piezas: piezas.filter(p => !p.fijo).map(p => ({id: p.id, tipo: p.tipo}))};
  }

  function resaltar(ids) { resaltados = ids || []; dibujar(); }
  function reiniciar() { cargar(escena); }
  function verRedes(v) { cfg.verRedes = v; dibujar(); }
  function margen(px) { margenDerecho = px; }
  function redibujarTodo() { redibujarFijos(); dibujar(); }

  // Ayudas para probar el motor desde la consola.
  const prueba = {
    agregar(tipo, en, rot) { const t = buscar(en); piezas.push({id: tipo + '_' + (++cont), tipo, x: t.x, y: t.y, rot: rot || 0, pos: 0.5, angulo: 90}); cambio(); },
    presionar,
    perilla(id, pos) { piezas.find(p => p.id === id).pos = pos; },
    cable(desde, hasta) { cables.push({id: 'c' + (++cont), desde, hasta, puntos: [], color: COLORES[0]}); cambio(); },
    simular,
  };

  return {
    iniciar, cargar, redibujarTodo, soltarDesdePaleta, girar, borrar, color, alternarSimulacion, iniciarPrograma, detener,
    analizar, resaltar, reiniciar, verRedes, margen, zoom, ajustar, COLORES, prueba, callar: () => sonido.callar(),
  };
})();
