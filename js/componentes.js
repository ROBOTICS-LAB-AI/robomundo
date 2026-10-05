// Dibujos SVG de los componentes (estilo plano, parecido a Tinkercad) y sus terminales.
// Unidad base: PASO = 12 px = separación entre agujeros de la protoboard (0,1 pulgadas).
// Cada componente se define una sola vez aquí y lo usan todas las secciones del juego.
const SVGNS = 'http://www.w3.org/2000/svg';
const PASO = 12;

function el(tag, attrs, padre) {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (padre) padre.appendChild(n);
  return n;
}

function texto(padre, x, y, contenido, attrs) {
  const n = el('text', Object.assign({x, y, 'pointer-events': 'none'}, attrs), padre);
  n.textContent = contenido;
  return n;
}

// ---------- Arduino UNO (324 × 252, USB a la izquierda) ----------

function descripcionPin(n) {
  if (/^\d+$/.test(n)) {
    const pwm = [3, 5, 6, 9, 10, 11].includes(+n) ? ' (PWM ~)' : '';
    const serie = n === '0' ? ' · RX' : n === '1' ? ' · TX' : '';
    return `Pin digital ${n}${pwm}${serie}`;
  }
  if (/^A\d$/.test(n)) return `Pin analógico ${n}`;
  return {
    GND: 'GND · tierra (−)', '5V': '5V · positivo (+)', '3.3V': '3.3V · positivo (+)',
    VIN: 'VIN · entrada de energía', RESET: 'RESET · reinicia la placa', IOREF: 'IOREF · referencia de voltaje',
    AREF: 'AREF · referencia analógica', SDA: 'SDA · comunicación I2C', SCL: 'SCL · comunicación I2C',
  }[n];
}

const PINES_ARDUINO = (() => {
  const lista = [];
  let gnd = 0;
  const agregar = (n, x, y) => {
    const id = n === 'GND' ? 'GND' + (++gnd) : n === '3.3V' ? '3V3' : /^\d+$/.test(n) ? 'D' + n : n;
    // Los tres GND están unidos dentro de la placa: comparten la misma "red".
    const etiqueta = [3, 5, 6, 9, 10, 11].includes(+n) ? '~' + n : n; // los pines PWM llevan ~ como en la placa real
    lista.push({id, nombre: n, etiqueta, desc: descripcionPin(n), x, y, red: n === 'GND' ? 'GND' : id});
  };
  ['SCL', 'SDA', 'AREF', 'GND', '13', '12', '11', '10', '9', '8'].forEach((n, i) => agregar(n, 70 + i * PASO, 14));
  ['7', '6', '5', '4', '3', '2', '1', '0'].forEach((n, i) => agregar(n, 196 + i * PASO, 14));
  ['IOREF', 'RESET', '3.3V', '5V', 'GND', 'GND', 'VIN'].forEach((n, i) => agregar(n, 106 + i * PASO, 238));
  ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'].forEach((n, i) => agregar(n, 202 + i * PASO, 238));
  return lista;
})();

// CONFIG.estiloPlaca: 'pixel' (8 bits, en pixel.js), 'detallado' (con regulador, cristal, etc.) o 'simple'.
function dibujarArduino(g) {
  if (CONFIG.estiloPlaca === 'pixel') { dibujarArduinoPixel(g); return; }
  const detallado = CONFIG.estiloPlaca !== 'simple';
  const blanco = {fill: '#fff', 'font-size': 7, 'font-weight': 700};
  const sinToque = {'pointer-events': 'none'};

  if (detallado) {
    el('path', {d: 'M10 0 H304 L324 20 V232 L304 252 H10 Q0 252 0 242 V10 Q0 0 10 0 Z', fill: '#0F8C94', stroke: '#0A6A70', 'stroke-width': 2}, g);
    el('path', Object.assign({d: 'M8 6 H301 L317 22 V230 L301 246 H8', fill: 'none', stroke: 'rgba(255,255,255,.18)'}, sinToque), g);
  } else {
    el('rect', {x: 0, y: 0, width: 324, height: 252, rx: 12, fill: '#0F8C94', stroke: '#0A6A70', 'stroke-width': 2}, g);
  }
  [[306, 34], [306, 218], [64, 214]].forEach(([cx, cy]) => el('circle', {cx, cy, r: 6, fill: '#EEF1F5', stroke: '#0A6A70'}, g));

  // Partes con nombre (se muestran al pasar el mouse)
  el('rect', {x: -12, y: 26, width: 58, height: 52, rx: 4, fill: '#C3C9D1', stroke: '#8D96A3', 'stroke-width': 2, 'data-parte': 'Conector USB: conecta la placa a la computadora para darle energía y cargarle programas'}, g);
  el('rect', {x: -10, y: 172, width: 52, height: 46, rx: 5, fill: '#2B2F36', 'data-parte': 'Conector de alimentación: para una batería o adaptador (7–12 V)'}, g);
  el('circle', Object.assign({cx: 10, cy: 195, r: 8, fill: '#16181C'}, sinToque), g);
  el('rect', {x: 52, y: 32, width: 18, height: 18, rx: 3, fill: '#D0D5DC', 'data-parte': 'Botón RESET: reinicia tu programa desde el inicio'}, g);
  el('circle', Object.assign({cx: 61, cy: 41, r: 5.5, fill: '#E5484D'}, sinToque), g);
  el('rect', {x: 150, y: 150, width: 140, height: 34, rx: 3, fill: '#2B2F36', 'data-parte': 'Microcontrolador ATmega328P: el «cerebro» que ejecuta tu programa'}, g);
  for (let i = 0; i < 14; i++) {
    el('rect', Object.assign({x: 155 + i * 9.6, y: 145, width: 4, height: 5, fill: '#B8BEC7'}, sinToque), g);
    el('rect', Object.assign({x: 155 + i * 9.6, y: 184, width: 4, height: 5, fill: '#B8BEC7'}, sinToque), g);
  }
  el('circle', Object.assign({cx: 157, cy: 167, r: 3, fill: '#4B5059'}, sinToque), g);

  if (detallado) {
    el('rect', Object.assign({x: -6, y: 34, width: 40, height: 36, rx: 2, fill: '#A9B0BA'}, sinToque), g);
    el('rect', Object.assign({x: 0, y: 42, width: 26, height: 20, fill: '#5E6672'}, sinToque), g);
    for (let i = 0; i < 4; i++) el('line', Object.assign({x1: 22 + i * 5, y1: 176, x2: 22 + i * 5, y2: 214, stroke: '#3D424B', 'stroke-width': 1.5}, sinToque), g);
    el('rect', {x: 54, y: 90, width: 24, height: 24, rx: 2, fill: '#2B2F36', 'data-parte': 'Chip USB (ATmega16U2): traduce la comunicación entre la computadora y el microcontrolador'}, g);
    el('rect', {x: 84, y: 120, width: 30, height: 12, rx: 6, fill: '#D6DAE0', stroke: '#9AA1AB', 'data-parte': 'Cristal de 16 MHz: marca el ritmo (reloj) al que trabaja el microcontrolador'}, g);
    texto(g, 99, 128.5, '16.000', {'text-anchor': 'middle', 'font-size': 6, fill: '#4B5563', 'font-weight': 700});
    el('rect', {x: 50, y: 166, width: 20, height: 6, fill: '#C3C9D1', 'data-parte': 'Regulador de voltaje: convierte la energía del conector en 5 V estables'}, g);
    el('rect', {x: 50, y: 172, width: 20, height: 16, rx: 1, fill: '#2B2F36', 'data-parte': 'Regulador de voltaje: convierte la energía del conector en 5 V estables'}, g);
    [[88, 172], [108, 172]].forEach(([cx, cy]) => {
      el('circle', {cx, cy, r: 8, fill: '#C9CED6', stroke: '#8D96A3', 'data-parte': 'Condensador: guarda un poco de energía para mantener estable el voltaje'}, g);
      el('path', Object.assign({d: `M${cx - 8} ${cy} A8 8 0 0 1 ${cx + 8} ${cy} Z`, fill: '#1F2937', opacity: 0.75}, sinToque), g);
    });
    el('rect', {x: 294, y: 140, width: 22, height: 32, rx: 2, fill: '#1E2126', 'data-parte': 'Conector ICSP: para programar el chip directamente (uso avanzado)'}, g);
    for (const x of [300, 310]) for (const y of [146, 156, 166]) el('rect', Object.assign({x: x - 2, y: y - 2, width: 4, height: 4, fill: '#C9A227'}, sinToque), g);
    texto(g, 305, 182, 'ICSP', Object.assign({}, blanco, {'text-anchor': 'middle', 'font-size': 6}));
    [[122, 49], [122, 61], [122, 73]].forEach(([x, y]) => el('rect', Object.assign({x, y, width: 7, height: 3.5, fill: '#E8D9B5'}, sinToque), g));
    [[262, 124], [272, 124], [282, 124]].forEach(([x, y]) => el('rect', Object.assign({x, y, width: 4, height: 7, fill: '#3B3F46'}, sinToque), g));
  }

  el('rect', {x: 98, y: 48, width: 8, height: 5, rx: 1, fill: '#F5C542', 'data-parte': 'LED «L»: un LED que ya viene en la placa, conectado al pin 13'}, g);
  el('rect', {x: 98, y: 60, width: 8, height: 5, rx: 1, fill: '#F5C542', 'data-parte': 'LED TX: parpadea cuando la placa envía datos'}, g);
  el('rect', {x: 98, y: 72, width: 8, height: 5, rx: 1, fill: '#F5C542', 'data-parte': 'LED RX: parpadea cuando la placa recibe datos'}, g);
  el('rect', {x: 292, y: 96, width: 8, height: 5, rx: 1, fill: '#4ADE80', 'data-parte': 'LED ON: indica que la placa tiene energía'}, g);
  texto(g, 110, 53, 'L', blanco);
  texto(g, 110, 65, 'TX', blanco);
  texto(g, 110, 77, 'RX', blanco);
  texto(g, 288, 101, 'ON', Object.assign({'text-anchor': 'end'}, blanco));

  // Logo e inscripciones
  const anillo = Object.assign({fill: 'none', stroke: '#fff', 'stroke-width': 3.5, opacity: 0.92}, sinToque);
  el('circle', Object.assign({cx: 146, cy: 102, r: 9}, anillo), g);
  el('circle', Object.assign({cx: 164, cy: 102, r: 9}, anillo), g);
  el('path', Object.assign({d: 'M142 102 H150 M160 102 H168 M164 98 V106', stroke: '#fff', 'stroke-width': 2}, sinToque), g);
  texto(g, 180, 112, 'UNO', {fill: '#fff', 'font-size': 30, 'font-weight': 800, opacity: 0.95});
  texto(g, 182, 128, 'ARDUINO', {fill: '#fff', 'font-size': 10, 'font-weight': 700, 'letter-spacing': 2, opacity: 0.8});
  const seccion = Object.assign({}, blanco, {'text-anchor': 'middle', 'font-size': 8.5});
  texto(g, 238, 54, 'DIGITAL (PWM ~)', seccion);
  texto(g, 136, 200, 'POWER', seccion);
  texto(g, 232, 200, 'ANALOG IN', seccion);

  // Regletas de pines
  const negro = {fill: '#1E2126', rx: 2};
  el('rect', Object.assign({x: 64, y: 8, width: 120, height: 12}, negro), g);
  el('rect', Object.assign({x: 190, y: 8, width: 96, height: 12}, negro), g);
  el('rect', Object.assign({x: 88, y: 232, width: 96, height: 12}, negro), g);
  el('rect', Object.assign({x: 196, y: 232, width: 72, height: 12}, negro), g);
  el('rect', {x: 92, y: 236, width: 4, height: 4, rx: 1, fill: '#6B717B'}, g); // pin sin conexión
  for (const p of PINES_ARDUINO) {
    el('rect', {x: p.x - 2.5, y: p.y - 2.5, width: 5, height: 5, rx: 1, fill: '#6B717B'}, g);
    const arriba = p.y < 100, y = arriba ? 24 : 230;
    texto(g, p.x + 3.2, y, p.etiqueta, {class: 'etq-pin', 'text-anchor': arriba ? 'end' : 'start', transform: `rotate(-90 ${p.x + 3.2} ${y})`});
  }

  asignarIdsPartes(g);
}

// Identificador corto de cada parte (lo usan los niveles de "haz clic en…")
function asignarIdsPartes(g) {
  g.querySelectorAll('[data-parte]').forEach(n => {
    const k = Object.keys(ID_PARTES).find(nombre => n.dataset.parte.startsWith(nombre));
    if (k) n.dataset.id = ID_PARTES[k];
  });
}

const ID_PARTES = {
  'Conector USB': 'usb', 'Conector de alimentación': 'jack', 'Botón RESET': 'reset', 'Microcontrolador': 'chip',
  'Chip USB': 'chipusb', 'Cristal': 'cristal', 'Regulador': 'regulador', 'Condensador': 'condensador',
  'Conector ICSP': 'icsp', 'LED «L»': 'ledL', 'LED TX': 'ledTX', 'LED RX': 'ledRX', 'LED ON': 'ledON',
};

// ---------- Protoboard (30 columnas, filas a–j y 4 rieles) ----------

const FILAS_PROTO = {j: 54, i: 66, h: 78, g: 90, f: 102, e: 126, d: 138, c: 150, b: 162, a: 174};
const RIELES_PROTO = [
  ['p1', 18, 'Riel + superior (positivo)'], ['n1', 30, 'Riel − superior (negativo)'],
  ['p2', 198, 'Riel + inferior (positivo)'], ['n2', 210, 'Riel − inferior (negativo)'],
];
const colProto = c => 30 + (c - 1) * PASO;

const AGUJEROS_PROTO = (() => {
  const lista = [];
  for (let c = 1; c <= 30; c++) {
    for (const f in FILAS_PROTO) {
      // Los 5 agujeros de una columna (a–e o f–j) están unidos por dentro.
      lista.push({id: f + c, desc: `Columna ${c}, fila ${f}`, x: colProto(c), y: FILAS_PROTO[f], red: 'c' + c + ('abcde'.includes(f) ? 'ae' : 'fj')});
    }
    if (c % 6 !== 1) {
      // Rieles en grupos de 5 agujeros; cada riel está unido a lo largo de toda la protoboard.
      for (const [r, y, desc] of RIELES_PROTO) lista.push({id: `${r}-${c}`, desc, x: colProto(c), y, red: r});
    }
  }
  return lista;
})();

function dibujarProtoboard(g) {
  if (CONFIG.estiloPlaca === 'pixel') { dibujarProtoboardPixel(g); return; }
  el('rect', {x: 0, y: 0, width: 408, height: 228, rx: 8, fill: '#F7F7F5', stroke: '#C9CDD3', 'stroke-width': 1.5}, g);
  el('rect', {x: 6, y: 111, width: 396, height: 6, rx: 3, fill: '#E4E6EA'}, g);
  [[9, '#E5484D'], [39, '#3B82F6'], [189, '#E5484D'], [219, '#3B82F6']].forEach(([y, c]) =>
    el('line', {x1: 20, y1: y, x2: 388, y2: y, stroke: c, 'stroke-width': 1.5}, g));
  const gris = {fill: '#8A9099', 'font-size': 8, 'font-weight': 700, 'text-anchor': 'middle'};
  for (const [r, y] of RIELES_PROTO) {
    const signo = r[0] === 'p' ? '+' : '−', color = r[0] === 'p' ? '#E5484D' : '#3B82F6';
    texto(g, 12, y + 4, signo, Object.assign({}, gris, {fill: color, 'font-size': 12}));
    texto(g, 396, y + 4, signo, Object.assign({}, gris, {fill: color, 'font-size': 12}));
  }
  for (const f in FILAS_PROTO) {
    texto(g, 14, FILAS_PROTO[f] + 3, f, gris);
    texto(g, 394, FILAS_PROTO[f] + 3, f, gris);
  }
  [1, 5, 10, 15, 20, 25, 30].forEach(c => texto(g, colProto(c), 46, c, gris));
  for (const h of AGUJEROS_PROTO) el('rect', {x: h.x - 2, y: h.y - 2, width: 4, height: 4, rx: 0.8, fill: '#7D838C'}, g);
}

// ---------- Patas metálicas: plateadas con borde oscuro para que resalten sobre la protoboard ----------

function dibujarPata(g, d) {
  const base = {d, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'};
  el('path', Object.assign({stroke: '#3F4652', 'stroke-width': 3.8}, base), g);
  el('path', Object.assign({stroke: '#DDE2E8', 'stroke-width': 1.8}, base), g);
}

// ---------- LED (patas en (0,0) y (12,0), cuerpo hacia arriba) ----------
// CONFIG.estiloComponentes: 'pixel' (8 bits), 'v2' (cuerpo grande y patas cortas) o 'v1' (primera versión).

const COLORES_LED = {
  rojo: {cuerpo: '#E0313A', borde: '#8B1A1F', encendido: '#FF5A60', brillo: '#FF6B6B', claro: '#FF8A8F', oscuro: '#A51D25'},
  amarillo: {cuerpo: '#F2C200', borde: '#8A6D00', encendido: '#FFE24D', brillo: '#FFE066', claro: '#FFF09A', oscuro: '#B58F00'},
  verde: {cuerpo: '#1FA34A', borde: '#0F5A28', encendido: '#4BE07A', brillo: '#5BF08A', claro: '#7EE89E', oscuro: '#137A35'},
};

// brillo (0–1): con un programa, un LED puede verse a medias (PWM o parpadeo muy rápido).
function dibujarLed(g, estado, color, brillo = 1) {
  if (CONFIG.estiloComponentes === 'pixel') { dibujarLedPixel(g, estado, color, brillo); return; }
  const c = COLORES_LED[color];
  const relleno = estado === 'quemado' ? '#3B3B3E' : estado === 'encendido' && brillo >= 0.3 ? c.encendido : c.cuerpo;
  const borde = estado === 'quemado' ? '#111' : c.borde;
  const contorno = {stroke: borde, 'stroke-width': 1.2};
  el('rect', {x: -7, y: -42, width: 26, height: 44, fill: 'transparent'}, g); // área para agarrarlo

  if (CONFIG.estiloComponentes === 'v1') {
    dibujarPata(g, 'M0 0 V-6 L-3 -10 L0 -14 V-19'); // ánodo: pata doblada (la larga)
    dibujarPata(g, 'M12 0 V-19');
    if (estado === 'encendido') el('circle', {cx: 6, cy: -32, r: 26, fill: `url(#brillo-${color})`, opacity: Math.min(1, brillo), 'pointer-events': 'none'}, g);
    el('rect', Object.assign({x: -5, y: -23, width: 22, height: 5, rx: 1.5, fill: relleno}, contorno), g);
    el('path', Object.assign({d: 'M-3 -23 V-32 A9 9 0 0 1 15 -32 V-23 Z', fill: relleno}, contorno), g);
    if (estado === 'quemado') el('path', {d: 'M2 -39 L6 -31 L3 -29 L9 -25', stroke: '#000', 'stroke-width': 1.3, fill: 'none'}, g);
    else el('path', {d: 'M1 -26 V-32 A5 5 0 0 1 5 -37', stroke: 'rgba(255,255,255,.7)', 'stroke-width': 1.8, fill: 'none', 'stroke-linecap': 'round'}, g);
    return;
  }
  // v2: las patas salen juntas del cuerpo y se abren hasta los agujeros
  dibujarPata(g, 'M0 0 V-3 L-2 -5 L0 -7 L2.5 -9.5 V-13'); // ánodo: con doblez (la pata larga)
  dibujarPata(g, 'M12 0 V-5 L9.5 -9.5 V-13');
  if (estado === 'encendido') el('circle', {cx: 6, cy: -28, r: 28, fill: `url(#brillo-${color})`, opacity: Math.min(1, brillo), 'pointer-events': 'none'}, g);
  el('path', Object.assign({d: 'M-6 -11 V-15 Q-6 -16 -5 -16 H17 Q18 -16 18 -15 V-11 Z', fill: relleno}, contorno), g); // borde con lado plano
  el('path', Object.assign({d: 'M-4 -16 V-28 A10 10 0 0 1 16 -28 V-16 Z', fill: relleno}, contorno), g);
  if (estado === 'quemado') el('path', {d: 'M3 -35 L7 -27 L4 -25 L10 -19', stroke: '#000', 'stroke-width': 1.3, fill: 'none'}, g);
  else el('path', {d: 'M0 -19 V-28 A6 6 0 0 1 4 -33.5', stroke: 'rgba(255,255,255,.7)', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round'}, g);
}

// ---------- Resistencias (patas en (0,0) y (48,0)) ----------
// bandas: los 4 colores del código (220 Ω = rojo-rojo-marrón-dorado; 10 kΩ = marrón-negro-naranja-dorado)

function dibujarResistencia(g, bandas) {
  if (CONFIG.estiloComponentes === 'pixel') { dibujarResistenciaPixel(g, bandas); return; }
  el('rect', {x: -3, y: -9, width: 54, height: 18, fill: 'transparent'}, g);
  dibujarPata(g, 'M0 0 H48');
  if (CONFIG.estiloComponentes === 'v1') {
    el('rect', {x: 9, y: -6.5, width: 30, height: 13, rx: 6, fill: '#E2C391', stroke: '#8A6A3A', 'stroke-width': 1.2}, g);
    [14, 19.5, 25, 32].forEach((x, i) => el('rect', {x, y: -6.2, width: 3.2, height: 12.4, fill: bandas[i]}, g));
    return;
  }
  // v2: cuerpo con los extremos abultados, como una resistencia real
  el('path', {d: 'M13 -5.5 C9.5 -5.5 9.5 5.5 13 5.5 H16 C18 5.5 18 4 20 4 H28 C30 4 30 5.5 32 5.5 H35 C38.5 5.5 38.5 -5.5 35 -5.5 H32 C30 -5.5 30 -4 28 -4 H20 C18 -4 18 -5.5 16 -5.5 Z', fill: '#E6CFA0', stroke: '#7A5A2E', 'stroke-width': 1.2}, g);
  [[13, 5.3], [20.5, 3.8], [24.5, 3.8], [32.5, 5.3]].forEach(([x, h], i) => el('rect', {x, y: -h, width: 2.6, height: 2 * h, fill: bandas[i]}, g));
}

// ---------- Componentes interactivos (se usan durante la simulación) ----------
// Se dibujan con bloques de pixeles, así combinan con todos los estilos.

const patita = (g, x, y) => {
  el('rect', {x: x - 2, y: y - 2, width: 4, height: 4, fill: '#C9CFD8'}, g);
  el('rect', {x: x - 2, y: y - 2, width: 4, height: 1, fill: '#4B525C'}, g);
};

// Pulsador: 4 patas. Las de cada lado (1a–1b y 2a–2b) están unidas siempre; al presionar se unen los dos lados.
function dibujarPulsador(g, estado) {
  g.setAttribute('shape-rendering', 'crispEdges');
  el('rect', {x: -6, y: -30, width: 36, height: 36, fill: 'transparent'}, g);
  bloque(g, -2, -26, 28, 28, ['#3A3F47', '#5B626D', '#24282E', '#111317']);
  el('rect', {x: 2, y: -20, width: 2, height: 16, fill: '#6B7280'}, g); // lado 1 (unido por dentro)
  el('rect', {x: 20, y: -20, width: 2, height: 16, fill: '#6B7280'}, g); // lado 2
  const presionado = estado === 'presionado';
  pixelCirculo(g, 12, -12, 8, '#111317');
  pixelCirculo(g, 12, -12, presionado ? 6 : 7, presionado ? '#9B1C1C' : '#EF4444');
  if (!presionado) el('rect', {x: 8, y: -17, width: 4, height: 2, fill: '#FCA5A5', 'pointer-events': 'none'}, g);
  [[0, 0], [24, 0], [0, -24], [24, -24]].forEach(([x, y]) => patita(g, x, y));
}

// Buzzer: pata + en (0,0) y pata − en (24,0).
function dibujarBuzzer(g, estado) {
  g.setAttribute('shape-rendering', 'crispEdges');
  el('rect', {x: -10, y: -36, width: 44, height: 38, fill: 'transparent'}, g);
  el('rect', {x: -1, y: -6, width: 2, height: 6, fill: '#AEB6C1'}, g);
  el('rect', {x: 23, y: -6, width: 2, height: 6, fill: '#AEB6C1'}, g);
  pixelCirculo(g, 12, -18, 14, '#0B0C0E');
  pixelCirculo(g, 12, -18, 12, '#2B2F36');
  pixelCirculo(g, 12, -18, 8, '#1F2328');
  pixelCirculo(g, 12, -18, 3, '#0B0C0E');
  el('rect', {x: 4, y: -28, width: 6, height: 2, fill: '#4A505B', 'pointer-events': 'none'}, g);
  el('rect', {x: -9, y: -15, width: 6, height: 2, fill: '#EF4444'}, g); // signo +
  el('rect', {x: -7, y: -17, width: 2, height: 6, fill: '#EF4444'}, g);
  if (estado === 'sonando') {
    const ondas = el('g', {class: 'ondas', 'pointer-events': 'none'}, g);
    [[30, -24, 8], [34, -28, 16], [38, -32, 24]].forEach(([x, y, h]) => el('rect', {x, y, width: 2, height: h, fill: '#7C3AED'}, ondas));
  }
  patita(g, 0, 0);
  patita(g, 24, 0);
}

// Potenciómetro: patas izquierda (0,0), cursor (12,0) y derecha (24,0). valor = posición de la perilla (0–1).
function dibujarPotenciometro(g, estado, valor = 0.5) {
  g.setAttribute('shape-rendering', 'crispEdges');
  el('rect', {x: -6, y: -38, width: 36, height: 40, fill: 'transparent'}, g);
  [0, 12, 24].forEach(x => el('rect', {x: x - 1, y: -6, width: 2, height: 6, fill: '#AEB6C1'}, g));
  bloque(g, -4, -36, 32, 32, ['#2563EB', '#60A5FA', '#1E40AF', '#172554']);
  const perilla = el('g', {'data-perilla': '1', class: 'perilla'}, g);
  pixelCirculo(perilla, 12, -20, 11, '#111827', {'pointer-events': 'auto'});
  pixelCirculo(perilla, 12, -20, 9, '#E5E7EB', {'pointer-events': 'auto'});
  const flecha = el('g', {transform: `rotate(${-135 + valor * 270} 12 -20)`, 'pointer-events': 'none'}, perilla);
  el('rect', {x: 11, y: -29, width: 2, height: 9, fill: '#111827'}, flecha);
  [0, 12, 24].forEach(x => patita(g, x, 0));
}

// ---------- Catálogo ----------
// terminales: puntos de conexión. uniones: terminales unidos por dentro. caja: viewBox para la miniatura.
// agarre: punto de la pieza que sigue al mouse. clase: comportamiento en la simulación.

const crearLed = (color, nombre) => ({
  nombre, clase: 'led', caja: '-14 -44 40 50', agarre: {x: 6, y: -14}, centro: {x: 6, y: -30},
  dibujar: (g, estado, brillo) => dibujarLed(g, estado, color, brillo),
  terminales: [
    {id: 'anodo', nombre: 'Ánodo (+) · pata larga', x: 0, y: 0},
    {id: 'catodo', nombre: 'Cátodo (−) · pata corta', x: PASO, y: 0},
  ],
});

const crearResistencia = (nombre, bandas) => ({
  nombre, clase: 'resistencia', caja: '-4 -14 56 28', agarre: {x: 24, y: 0}, centro: {x: 24, y: 0},
  dibujar: g => dibujarResistencia(g, bandas),
  terminales: [
    {id: 'a', nombre: 'Terminal 1', x: 0, y: 0},
    {id: 'b', nombre: 'Terminal 2', x: 4 * PASO, y: 0},
  ],
});

const COMPONENTES = {
  arduino: {nombre: 'Arduino UNO', terminales: PINES_ARDUINO, dibujar: dibujarArduino},
  protoboard: {nombre: 'Protoboard', terminales: AGUJEROS_PROTO, dibujar: dibujarProtoboard},
  led: crearLed('rojo', 'LED rojo'),
  led_amarillo: crearLed('amarillo', 'LED amarillo'),
  led_verde: crearLed('verde', 'LED verde'),
  resistencia: crearResistencia('Resistencia 220 Ω', ['#D11F1F', '#D11F1F', '#6B3E1A', '#C9A227']),
  resistencia_10k: crearResistencia('Resistencia 10 kΩ', ['#6B3E1A', '#111111', '#F97316', '#C9A227']),
  pulsador: {
    nombre: 'Pulsador', clase: 'pulsador', caja: '-8 -32 40 40', agarre: {x: 12, y: -12}, centro: {x: 12, y: -12},
    dibujar: dibujarPulsador, uniones: [['1a', '1b'], ['2a', '2b']],
    terminales: [
      {id: '1a', nombre: 'Pata del lado 1', x: 0, y: 0}, {id: '2a', nombre: 'Pata del lado 2', x: 2 * PASO, y: 0},
      {id: '1b', nombre: 'Pata del lado 1', x: 0, y: -2 * PASO}, {id: '2b', nombre: 'Pata del lado 2', x: 2 * PASO, y: -2 * PASO},
    ],
  },
  buzzer: {
    nombre: 'Buzzer', clase: 'buzzer', caja: '-12 -38 52 44', agarre: {x: 12, y: -16}, centro: {x: 12, y: -18}, dibujar: dibujarBuzzer,
    terminales: [{id: 'mas', nombre: 'Pata + (positivo)', x: 0, y: 0}, {id: 'menos', nombre: 'Pata − (negativo)', x: 2 * PASO, y: 0}],
  },
  potenciometro: {
    nombre: 'Potenciómetro', clase: 'potenciometro', caja: '-8 -40 40 46', agarre: {x: 12, y: -18}, centro: {x: 12, y: -20}, dibujar: dibujarPotenciometro,
    terminales: [
      {id: 'izq', nombre: 'Pata izquierda', x: 0, y: 0}, {id: 'cursor', nombre: 'Pata del centro (cursor)', x: PASO, y: 0},
      {id: 'der', nombre: 'Pata derecha', x: 2 * PASO, y: 0},
    ],
  },
};

// ---------- Mundos 8 a 11: LED RGB, servo, fotorresistencia, ultrasónico, motor y driver ----------
// Mismo estilo de bloques de pixeles que los componentes interactivos.

const AZUL = ['#2563EB', '#60A5FA', '#1E40AF', '#172554'];
const etiquetaPixel = (g, x, y, txt, attrs) => texto(g, x, y, txt, Object.assign({'text-anchor': 'middle', 'font-size': 5, fill: '#fff', 'font-family': "'Silkscreen', monospace"}, attrs));

// LED RGB de cátodo común: patas R (0,0), común − (12,0, la más larga), G (24,0) y B (36,0).
// valor = [rojo, verde, azul], cada uno de 0 a 1: el color se mezcla.
function dibujarRGB(g, estado, valor) {
  g.setAttribute('shape-rendering', 'crispEdges');
  const [r, v, a] = Array.isArray(valor) ? valor : [0, 0, 0];
  el('rect', {x: -6, y: -52, width: 48, height: 54, fill: 'transparent'}, g);
  [0, 24, 36].forEach(x => el('rect', {x: x - 1, y: -16, width: 2, height: 16, fill: '#AEB6C1'}, g));
  [[11, -16, 8], [9, -8, 4], [11, -4, 4]].forEach(([x, y, h]) => el('rect', {x, y, width: 2, height: h, fill: '#AEB6C1'}, g)); // común, con doblez
  [[0, '#EF4444'], [24, '#22C55E'], [36, '#3B82F6']].forEach(([x, c]) => el('rect', {x: x - 2, y: -13, width: 4, height: 3, fill: c}, g));
  const quemado = estado === 'quemado', encendido = estado === 'encendido';
  const color = quemado ? '#3B3B3E' : encendido ? `rgb(${Math.round(90 + 165 * r)},${Math.round(90 + 165 * v)},${Math.round(90 + 165 * a)})` : '#E8EAEE';
  if (encendido) [[56, 0.14], [42, 0.24]].forEach(([s, o]) => el('rect', {x: 18 - s / 2, y: -33 - s / 2, width: s, height: s, fill: color, opacity: o, 'pointer-events': 'none'}, g));
  const borde = quemado ? '#111' : '#8A93A1';
  el('path', {d: escalonado(2, -50, 32, 34, 4), fill: borde}, g);
  el('path', {d: escalonado(4, -48, 28, 30, 4), fill: color}, g);
  el('rect', {x: 0, y: -20, width: 36, height: 4, fill: borde}, g);
  if (!quemado) el('rect', {x: 10, y: -44, width: 4, height: 8, fill: '#FFFFFF', opacity: 0.7, 'pointer-events': 'none'}, g);
  [0, 12, 24, 36].forEach(x => patita(g, x, 0));
}

// Servomotor: cables marrón (GND, 0,0), rojo (5V, 12,0) y naranja (señal, 24,0). valor = ángulo (0–180).
function dibujarServo(g, estado, angulo = 90) {
  g.setAttribute('shape-rendering', 'crispEdges');
  el('rect', {x: -24, y: -82, width: 72, height: 84, fill: 'transparent'}, g);
  [[0, '#7C4A1E'], [12, '#DC2626'], [24, '#F59E0B']].forEach(([x, c]) => el('rect', {x: x - 1, y: -30, width: 2, height: 28, fill: c}, g));
  bloque(g, -6, -14, 36, 10, PX.negro);
  el('rect', {x: -22, y: -62, width: 8, height: 10, fill: '#1E40AF'}, g);
  el('rect', {x: 38, y: -62, width: 8, height: 10, fill: '#1E40AF'}, g);
  bloque(g, -16, -74, 56, 44, AZUL, null, 2);
  etiquetaPixel(g, 12, -36, `${Math.round(angulo)}°`, {'font-size': 7});
  // brazo: 0° apunta a la derecha, 90° hacia arriba, 180° a la izquierda
  pixelCirculo(g, 12, -54, 7, '#F3F4F6');
  const brazo = el('g', {transform: `rotate(${-angulo} 12 -54)`, 'pointer-events': 'none'}, g);
  el('rect', {x: 12, y: -57, width: 28, height: 6, fill: '#F9FAFB', stroke: '#6B7280', 'stroke-width': 0.8}, brazo);
  el('rect', {x: 34, y: -55, width: 2, height: 2, fill: '#6B7280'}, brazo);
  pixelCirculo(g, 12, -54, 3, '#9CA3AF');
  [0, 12, 24].forEach(x => patita(g, x, 0));
}

// Fotorresistencia (LDR): patas en (0,0) y (12,0). El sol se arrastra para cambiar la luz (valor 0–1).
function dibujarLDR(g, estado, luz = 0.5) {
  g.setAttribute('shape-rendering', 'crispEdges');
  el('rect', {x: -8, y: -32, width: 28, height: 34, fill: 'transparent'}, g);
  [0, 12].forEach(x => el('rect', {x: x - 1, y: -10, width: 2, height: 10, fill: '#AEB6C1'}, g));
  pixelCirculo(g, 6, -18, 10, '#7C2D12');
  pixelCirculo(g, 6, -18, 8, '#FDBA74');
  [[0, -23], [4, -20], [0, -17], [4, -14]].forEach(([x, y]) => el('rect', {x: x + 1, y, width: 7, height: 1.5, fill: '#7C2D12', 'pointer-events': 'none'}, g));
  const sol = el('g', {'data-perilla': '1'}, g);
  el('rect', {x: 16, y: -44, width: 24, height: 24, fill: 'transparent'}, sol);
  const r = 4 + Math.round(luz * 3) * 2;
  if (luz > 0.6) [[27, -45, 2, 4], [27, -23, 2, 4], [16, -34, 4, 2], [36, -34, 4, 2]].forEach(([x, y, w, h]) => el('rect', {x, y, width: w, height: h, fill: '#F59E0B'}, sol));
  pixelCirculo(sol, 28, -33, r, luz > 0.15 ? '#FACC15' : '#94A3B8');
  if (luz <= 0.15) pixelCirculo(sol, 31, -35, r - 2, '#1F2937');
  [0, 12].forEach(x => patita(g, x, 0));
}

// Sensor ultrasónico HC-SR04: VCC (0,0), TRIG (12,0), ECHO (24,0), GND (36,0).
// El objeto de arriba se arrastra para cambiar la distancia (valor 0–1 → 2 a 200 cm).
function dibujarUltrasonico(g, estado, pos = 0.3) {
  g.setAttribute('shape-rendering', 'crispEdges');
  el('rect', {x: -8, y: -42, width: 52, height: 44, fill: 'transparent'}, g);
  [0, 12, 24, 36].forEach(x => el('rect', {x: x - 1, y: -6, width: 2, height: 6, fill: '#AEB6C1'}, g));
  bloque(g, -8, -40, 52, 34, AZUL);
  [6, 30].forEach(cx => { pixelCirculo(g, cx, -24, 10, '#6B7280'); pixelCirculo(g, cx, -24, 8, '#D1D5DB'); pixelCirculo(g, cx, -24, 4, '#374151'); });
  ['V', 'T', 'E', 'G'].forEach((t, i) => etiquetaPixel(g, i * 12, -8, t));
  const dist = 2 + pos * 198, y = -52 - pos * 70;
  for (let yy = -44; yy > y + 6; yy -= 8) [4, 28].forEach(x => el('rect', {x, y: yy, width: 4, height: 2, fill: '#93C5FD', 'pointer-events': 'none'}, g));
  const obj = el('g', {'data-perilla': '1'}, g);
  el('rect', {x: -6, y: y - 16, width: 48, height: 20, fill: 'transparent'}, obj);
  el('rect', {x: -4, y: y - 4, width: 44, height: 8, fill: '#78716C'}, obj);
  el('rect', {x: -4, y: y - 4, width: 44, height: 2, fill: '#A8A29E'}, obj);
  etiquetaPixel(obj, 18, y - 7, `${Math.round(dist)} cm`, {fill: '#1F2937', 'font-size': 7});
  [0, 12, 24, 36].forEach(x => patita(g, x, 0));
}

// Motor DC: patas en (0,0) y (36,0). valor = {ang: giro de la hélice, directo: conectado a un pin sin driver}.
function dibujarMotor(g, estado, valor) {
  g.setAttribute('shape-rendering', 'crispEdges');
  const v = valor && typeof valor === 'object' ? valor : {};
  el('rect', {x: -8, y: -84, width: 52, height: 86, fill: 'transparent'}, g);
  el('rect', {x: -1, y: -16, width: 2, height: 16, fill: '#DC2626'}, g);
  el('rect', {x: 35, y: -16, width: 2, height: 16, fill: '#1F2937'}, g);
  bloque(g, -4, -48, 44, 34, ['#9CA3AF', '#D1D5DB', '#6B7280', '#374151'], null, 2);
  el('rect', {x: 2, y: -38, width: 32, height: 4, fill: '#6B7280'}, g);
  el('rect', {x: 16, y: -58, width: 4, height: 10, fill: '#D1D5DB'}, g);
  const helice = el('g', {transform: `rotate(${v.ang || 0} 18 -62)`, 'pointer-events': 'none'}, g);
  el('rect', {x: -2, y: -64, width: 40, height: 4, fill: '#F97316'}, helice);
  el('rect', {x: 16, y: -82, width: 4, height: 40, fill: '#FB923C'}, helice);
  pixelCirculo(g, 18, -62, 3, '#7C2D12');
  if (v.directo) { el('rect', {x: 40, y: -54, width: 4, height: 10, fill: '#DC2626'}, g); el('rect', {x: 40, y: -42, width: 4, height: 4, fill: '#DC2626'}, g); }
  [0, 36].forEach(x => patita(g, x, 0));
}

// Driver L298N (canal A). Abajo: ENA (12,0), IN1 (24,0), IN2 (36,0), GND (60,0), +V (72,0). Arriba: OUT1 (24,-84) y OUT2 (60,-84).
function dibujarL298N(g) {
  g.setAttribute('shape-rendering', 'crispEdges');
  el('rect', {x: -4, y: -90, width: 92, height: 94, fill: 'transparent'}, g);
  bloque(g, 0, -84, 84, 84, ['#DC2626', '#F87171', '#991B1B', '#450A0A'], null, 2);
  for (let i = 0; i < 6; i++) el('rect', {x: 28 + i * 6, y: -76, width: 4, height: 24, fill: '#1F2937'}, g);
  el('rect', {x: 26, y: -54, width: 36, height: 4, fill: '#111827'}, g);
  [24, 60].forEach(x => bloque(g, x - 8, -84, 16, 12, AZUL));
  bloque(g, 52, -12, 28, 12, AZUL);
  bloque(g, 4, -10, 40, 10, PX.negro);
  etiquetaPixel(g, 44, -32, 'L298N', {'font-size': 7});
  [['ENA', 12], ['IN1', 24], ['IN2', 36]].forEach(([t, x]) => etiquetaPixel(g, x, -14, t, {'font-size': 4.5}));
  [['GND', 60], ['+V', 72]].forEach(([t, x]) => etiquetaPixel(g, x, -16, t, {'font-size': 4.5}));
  [['OUT1', 24], ['OUT2', 60]].forEach(([t, x]) => etiquetaPixel(g, x, -64, t, {'font-size': 4.5}));
  [[12, 0], [24, 0], [36, 0], [60, 0], [72, 0], [24, -84], [60, -84]].forEach(([x, y]) => patita(g, x, y));
}

Object.assign(COMPONENTES, {
  led_rgb: {
    nombre: 'LED RGB', clase: 'rgb', caja: '-8 -54 52 58', agarre: {x: 18, y: -20}, centro: {x: 18, y: -33}, dibujar: dibujarRGB,
    terminales: [
      {id: 'r', nombre: 'Pata R (rojo)', x: 0, y: 0}, {id: 'k', nombre: 'Pata común (−), la más larga', x: PASO, y: 0},
      {id: 'g', nombre: 'Pata G (verde)', x: 2 * PASO, y: 0}, {id: 'b', nombre: 'Pata B (azul)', x: 3 * PASO, y: 0},
    ],
  },
  servo: {
    nombre: 'Servomotor', clase: 'servo', caja: '-26 -84 76 90', agarre: {x: 12, y: -40}, centro: {x: 12, y: -54}, dibujar: dibujarServo,
    terminales: [
      {id: 'gnd', nombre: 'Cable marrón: GND', x: 0, y: 0}, {id: 'vcc', nombre: 'Cable rojo: 5V', x: PASO, y: 0},
      {id: 'senal', nombre: 'Cable naranja: señal (va a un pin)', x: 2 * PASO, y: 0},
    ],
  },
  ldr: {
    nombre: 'Fotorresistencia (LDR)', clase: 'ldr', caja: '-10 -48 54 52', agarre: {x: 6, y: -16}, centro: {x: 6, y: -18}, dibujar: dibujarLDR,
    terminales: [{id: 'a', nombre: 'Pata 1', x: 0, y: 0}, {id: 'b', nombre: 'Pata 2', x: PASO, y: 0}],
  },
  ultrasonico: {
    nombre: 'Sensor ultrasónico', clase: 'ultrasonico', caja: '-10 -140 56 146', agarre: {x: 18, y: -22}, centro: {x: 18, y: -24}, dibujar: dibujarUltrasonico,
    terminales: [
      {id: 'vcc', nombre: 'VCC: 5V', x: 0, y: 0}, {id: 'trig', nombre: 'TRIG: dispara el sonido (pin de salida)', x: PASO, y: 0},
      {id: 'echo', nombre: 'ECHO: recibe el eco (pin de entrada)', x: 2 * PASO, y: 0}, {id: 'gnd', nombre: 'GND', x: 3 * PASO, y: 0},
    ],
  },
  motor: {
    nombre: 'Motor DC', clase: 'motor', caja: '-10 -86 56 92', agarre: {x: 18, y: -30}, centro: {x: 18, y: -30}, dibujar: dibujarMotor,
    terminales: [{id: 'a', nombre: 'Terminal 1 del motor', x: 0, y: 0}, {id: 'b', nombre: 'Terminal 2 del motor', x: 3 * PASO, y: 0}],
  },
  l298n: {
    nombre: 'Driver L298N', clase: 'driver', caja: '-6 -92 96 98', agarre: {x: 42, y: -42}, centro: {x: 42, y: -42}, dibujar: dibujarL298N,
    terminales: [
      {id: 'ena', nombre: 'ENA: velocidad (pin con ~)', x: PASO, y: 0}, {id: 'in1', nombre: 'IN1: dirección', x: 2 * PASO, y: 0},
      {id: 'in2', nombre: 'IN2: dirección', x: 3 * PASO, y: 0}, {id: 'gnd', nombre: 'GND', x: 5 * PASO, y: 0},
      {id: 'vcc', nombre: '+V: energía para el motor', x: 6 * PASO, y: 0},
      {id: 'out1', nombre: 'OUT1: al motor', x: 2 * PASO, y: -7 * PASO}, {id: 'out2', nombre: 'OUT2: al motor', x: 5 * PASO, y: -7 * PASO},
    ],
  },
});
