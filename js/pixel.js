// Estilo pixel (8 bits) para la placa Arduino, la protoboard, el LED y la resistencia.
// Todo se dibuja con rectángulos sobre una grilla de 2 unidades, con bordes biselados
// (luz arriba/izquierda, sombra abajo/derecha) como en los juegos clásicos.
const FUENTE_PIXEL = "'Silkscreen', monospace";
const PX = {
  placa: ['#0F8C94', '#3FC1C9', '#0A6A70', '#05484C'],
  negro: ['#2B2F36', '#4A505B', '#16181C', '#0B0C0E'],
  plata: ['#B9C0CA', '#E6EAEF', '#7D8692', '#4B525C'],
  gris: ['#C9CED6', '#EEF1F4', '#8D96A3', '#4B525C'],
  amarillo: ['#F5C542', '#FFE699', '#B8901F', '#5C470F'],
  verde: ['#4ADE80', '#A7F3C0', '#16A34A', '#0B4F24'],
  proto: ['#F4F1E8', '#FFFFFF', '#D6CFBE', '#9C9584'],
};

// Rectángulo con esquinas escalonadas (s = tamaño del escalón; 0 = esquinas rectas)
function escalonado(x, y, w, h, s) {
  if (!s) return `M${x} ${y}h${w}v${h}h${-w}Z`;
  return `M${x + 2 * s} ${y}H${x + w - 2 * s}v${s}h${s}v${s}h${s}V${y + h - 2 * s}h${-s}v${s}h${-s}v${s}H${x + 2 * s}v${-s}h${-s}v${-s}h${-s}V${y + 2 * s}h${s}v${-s}h${s}Z`;
}

// Bloque biselado: contorno, sombra (abajo/derecha), luz (arriba/izquierda) y color base.
function bloque(padre, x, y, w, h, c, attrs, s = 0) {
  const g = el('g', attrs || {}, padre);
  el('path', {d: escalonado(x, y, w, h, s), fill: c[3]}, g);
  el('path', {d: escalonado(x + 2, y + 2, w - 4, h - 4, s), fill: c[2]}, g);
  el('path', {d: escalonado(x + 2, y + 2, w - 6, h - 6, s), fill: c[1]}, g);
  el('path', {d: escalonado(x + 4, y + 4, w - 8, h - 8, s), fill: c[0]}, g);
  return g;
}

// "Círculo" pixelado: dos rectángulos cruzados
function pixelCirculo(padre, cx, cy, r, color, attrs) {
  const g = el('g', Object.assign({'pointer-events': 'none'}, attrs), padre);
  el('rect', {x: cx - r + 2, y: cy - r, width: 2 * r - 4, height: 2 * r, fill: color}, g);
  el('rect', {x: cx - r, y: cy - r + 2, width: 2 * r, height: 2 * r - 4, fill: color}, g);
  return g;
}

// Dibuja un sprite: cada letra de cada fila es un "pixel" de tam × tam (se unen los pixeles seguidos).
function sprite(g, filas, ox, oy, colores, tam = 2) {
  filas.forEach((fila, r) => {
    for (let c = 0; c < fila.length;) {
      let fin = c;
      while (fin + 1 < fila.length && fila[fin + 1] === fila[c]) fin++;
      if (colores[fila[c]]) el('rect', {x: ox + c * tam, y: oy + r * tam, width: (fin - c + 1) * tam, height: tam, fill: colores[fila[c]]}, g);
      c = fin + 1;
    }
  });
}

function dibujarArduinoPixel(g) {
  g.setAttribute('shape-rendering', 'crispEdges');
  const blanco = {fill: '#fff', 'font-family': FUENTE_PIXEL, 'font-size': 7};
  const nada = {'pointer-events': 'none'};
  const r = (x, y, w, h, fill) => el('rect', Object.assign({x, y, width: w, height: h, fill}, nada), g);

  bloque(g, 0, 0, 324, 252, PX.placa, null, 4);
  [[306, 34], [306, 218], [64, 214]].forEach(([x, y]) => { pixelCirculo(g, x, y, 6, PX.placa[3]); pixelCirculo(g, x, y, 4, '#E8ECEF'); });

  // Partes con nombre (se muestran al pasar el mouse)
  bloque(g, -12, 26, 58, 52, PX.plata, {'data-parte': 'Conector USB: conecta la placa a la computadora para darle energía y cargarle programas'});
  r(-4, 38, 34, 28, '#5E6672'); r(-4, 38, 34, 4, '#3F4650');
  bloque(g, -10, 172, 52, 46, PX.negro, {'data-parte': 'Conector de alimentación: para una batería o adaptador (7–12 V)'});
  pixelCirculo(g, 10, 195, 8, PX.negro[3]);
  bloque(g, 52, 32, 18, 18, PX.gris, {'data-parte': 'Botón RESET: reinicia tu programa desde el inicio'});
  pixelCirculo(g, 61, 41, 5, '#E5484D');
  bloque(g, 150, 150, 140, 34, PX.negro, {'data-parte': 'Microcontrolador ATmega328P: el «cerebro» que ejecuta tu programa'});
  for (let i = 0; i < 14; i++) { r(154 + i * 10, 144, 4, 6, PX.plata[0]); r(154 + i * 10, 184, 4, 6, PX.plata[0]); }
  r(154, 162, 4, 8, PX.negro[3]);
  bloque(g, 54, 90, 24, 24, PX.negro, {'data-parte': 'Chip USB (ATmega16U2): traduce la comunicación entre la computadora y el microcontrolador'});
  bloque(g, 84, 120, 30, 12, PX.plata, {'data-parte': 'Cristal de 16 MHz: marca el ritmo (reloj) al que trabaja el microcontrolador'});
  texto(g, 99, 129, '16.000', {'text-anchor': 'middle', 'font-size': 5, fill: '#374151', 'font-family': FUENTE_PIXEL});
  const reg = el('g', {'data-parte': 'Regulador de voltaje: convierte la energía del conector en 5 V estables'}, g);
  bloque(reg, 50, 164, 20, 10, PX.plata);
  bloque(reg, 50, 172, 20, 18, PX.negro);
  const cond = el('g', {'data-parte': 'Condensador: guarda un poco de energía para mantener estable el voltaje'}, g);
  [[88, 172], [108, 172]].forEach(([cx, cy]) => {
    el('rect', {x: cx - 8, y: cy - 8, width: 16, height: 16, fill: 'transparent'}, cond);
    pixelCirculo(cond, cx, cy, 8, '#4B525C');
    pixelCirculo(cond, cx, cy, 6, '#C9CED6');
    el('rect', {x: cx - 6, y: cy - 6, width: 12, height: 5, fill: '#1F2937', 'pointer-events': 'none'}, cond);
  });
  bloque(g, 294, 140, 22, 32, PX.negro, {'data-parte': 'Conector ICSP: para programar el chip directamente (uso avanzado)'});
  for (const x of [300, 310]) for (const y of [146, 156, 166]) r(x - 2, y - 2, 4, 4, '#C9A227');
  texto(g, 305, 182, 'ICSP', Object.assign({}, blanco, {'text-anchor': 'middle', 'font-size': 5}));
  [[122, 48], [122, 60], [122, 72]].forEach(([x, y]) => r(x, y, 8, 4, '#E8D9B5'));
  [[262, 124], [272, 124], [282, 124]].forEach(([x, y]) => r(x, y, 4, 8, '#3B3F46'));

  const ledPlaca = (x, y, c, parte) => { const lg = el('g', {'data-parte': parte}, g); el('rect', {x, y, width: 8, height: 6, fill: c[3]}, lg); el('rect', {x: x + 2, y: y + 2, width: 4, height: 2, fill: c[0]}, lg); };
  ledPlaca(98, 48, PX.amarillo, 'LED «L»: un LED que ya viene en la placa, conectado al pin 13');
  ledPlaca(98, 60, PX.amarillo, 'LED TX: parpadea cuando la placa envía datos');
  ledPlaca(98, 72, PX.amarillo, 'LED RX: parpadea cuando la placa recibe datos');
  ledPlaca(292, 96, PX.verde, 'LED ON: indica que la placa tiene energía');
  texto(g, 110, 54, 'L', blanco);
  texto(g, 110, 66, 'TX', blanco);
  texto(g, 110, 78, 'RX', blanco);
  texto(g, 288, 102, 'ON', Object.assign({'text-anchor': 'end'}, blanco));

  // Logo: dos anillos cuadrados con − y +
  [138, 156].forEach(x => { r(x, 93, 18, 18, '#fff'); r(x + 4, 97, 10, 10, PX.placa[0]); });
  r(143, 101, 8, 2, '#fff'); r(161, 101, 8, 2, '#fff'); r(164, 98, 2, 8, '#fff');
  texto(g, 180, 112, 'UNO', {fill: '#fff', 'font-size': 22, 'font-weight': 700, 'font-family': FUENTE_PIXEL});
  texto(g, 181, 126, 'ARDUINO', {fill: '#fff', 'font-size': 8, 'font-family': FUENTE_PIXEL, opacity: 0.85});
  const seccion = Object.assign({}, blanco, {'text-anchor': 'middle', 'font-size': 6.5});
  texto(g, 238, 55, 'DIGITAL (PWM~)', seccion);
  texto(g, 136, 201, 'POWER', seccion);
  texto(g, 232, 201, 'ANALOG IN', seccion);

  // Regletas de pines
  bloque(g, 64, 8, 120, 12, PX.negro);
  bloque(g, 190, 8, 96, 12, PX.negro);
  bloque(g, 88, 232, 96, 12, PX.negro);
  bloque(g, 196, 232, 72, 12, PX.negro);
  r(91, 235, 6, 6, '#6B717B'); r(93, 237, 2, 2, PX.negro[3]);
  for (const p of PINES_ARDUINO) {
    el('rect', {x: p.x - 3, y: p.y - 3, width: 6, height: 6, fill: '#6B717B'}, g);
    r(p.x - 1, p.y - 1, 2, 2, PX.negro[3]);
    const arriba = p.y < 100, y = arriba ? 24 : 230;
    texto(g, p.x + 3, y, p.etiqueta, {class: 'etq-pin-pixel', 'text-anchor': arriba ? 'end' : 'start', transform: `rotate(-90 ${p.x + 3} ${y})`});
  }
  asignarIdsPartes(g);
}

function dibujarProtoboardPixel(g) {
  g.setAttribute('shape-rendering', 'crispEdges');
  bloque(g, 0, 0, 408, 228, PX.proto, null, 4);
  el('rect', {x: 6, y: 110, width: 396, height: 8, fill: '#DCD5C3'}, g);
  el('rect', {x: 6, y: 116, width: 396, height: 2, fill: '#C7BFAB'}, g);
  [[8, '#E5484D'], [38, '#3B82F6'], [188, '#E5484D'], [218, '#3B82F6']].forEach(([y, c]) => el('rect', {x: 20, y, width: 368, height: 2, fill: c}, g));
  const gris = {fill: '#8A847A', 'font-size': 7, 'text-anchor': 'middle', 'font-family': FUENTE_PIXEL};
  for (const [riel, y] of RIELES_PROTO) {
    const signo = riel[0] === 'p' ? '+' : '-', color = riel[0] === 'p' ? '#E5484D' : '#3B82F6';
    texto(g, 12, y + 3, signo, Object.assign({}, gris, {fill: color, 'font-size': 10}));
    texto(g, 396, y + 3, signo, Object.assign({}, gris, {fill: color, 'font-size': 10}));
  }
  for (const f in FILAS_PROTO) {
    texto(g, 14, FILAS_PROTO[f] + 3, f, gris);
    texto(g, 394, FILAS_PROTO[f] + 3, f, gris);
  }
  [1, 5, 10, 15, 20, 25, 30].forEach(c => texto(g, colProto(c), 47, c, gris));
  for (const h of AGUJEROS_PROTO) {
    el('rect', {x: h.x - 2, y: h.y - 2, width: 4, height: 4, fill: '#5A616D'}, g);
    el('rect', {x: h.x - 2, y: h.y - 2, width: 2, height: 2, fill: '#2E333B'}, g);
  }
}

// LED: 13 × 21 pixeles. Patas en las columnas 3 (ánodo, con doblez) y 9 (cátodo).
const SPRITE_LED = [
  '....kkkkk....',
  '...khhbbbk...',
  '..khhbbbbbk..',
  '..khbbbbbbk..',
  '.khbbbbbbbsk.',
  '.khbbbbbbbsk.',
  '.kbbbbbbbbsk.',
  '.kbbbbbbbbsk.',
  '.kbbbbbbbbsk.',
  '.kbbbbbbbbsk.',
  'kkkkkkkkkkkkk',
  'kbbbbbbbbbbsk',
  'kkkkkkkkkkkk.',
  '...l.....l...',
  '...l.....l...',
  '..l......l...',
  '...l.....l...',
  '...l.....l...',
  '...l.....l...',
  '...l.....l...',
  '...l.....l...',
];

function dibujarLedPixel(g, estado, color, brillo) {
  g.setAttribute('shape-rendering', 'crispEdges');
  el('rect', {x: -7, y: -42, width: 26, height: 44, fill: 'transparent'}, g);
  const c = COLORES_LED[color];
  let pal = {k: c.borde, b: c.cuerpo, h: c.claro, s: c.oscuro};
  if (estado === 'quemado') pal = {k: '#111', b: '#3B3B3E', h: '#5A5A5F', s: '#242426'};
  else if (estado === 'encendido' && brillo >= 0.3) pal = {k: c.borde, b: c.encendido, h: '#FFFFFF', s: c.cuerpo};
  pal.l = '#AEB6C1';
  if (estado === 'encendido') {
    [[48, 0.12], [38, 0.2], [30, 0.3]].forEach(([s, o]) =>
      el('rect', {x: 6 - s / 2, y: -26 - s / 2, width: s, height: s, fill: c.brillo, opacity: o * Math.min(1, brillo), 'pointer-events': 'none'}, g));
  }
  sprite(g, SPRITE_LED, -7, -41, pal);
  if (estado === 'quemado') [[1, -35], [3, -33], [5, -31], [7, -29], [5, -27]].forEach(([x, y]) => el('rect', {x, y, width: 2, height: 2, fill: '#000'}, g));
}

// Resistencia: 25 × 7 pixeles; 1–4 son las bandas de colores.
const SPRITE_RESISTENCIA = [
  '.....kkkkkkkkkkkkkkk.....',
  '....khh1h2h3hhhhh4hhk....',
  '....kbb1b2b3bbbbb4bbk....',
  'llllkbb1b2b3bbbbb4bbkllll',
  '....kbb1b2b3bbbbb4bbk....',
  '....kss1s2s3sssss4ssk....',
  '.....kkkkkkkkkkkkkkk.....',
];

function dibujarResistenciaPixel(g, bandas) {
  g.setAttribute('shape-rendering', 'crispEdges');
  el('rect', {x: -3, y: -9, width: 54, height: 18, fill: 'transparent'}, g);
  sprite(g, SPRITE_RESISTENCIA, -1, -7, {k: '#6E5128', h: '#F6E7C4', b: '#E6CFA0', s: '#C9A86E', l: '#AEB6C1', 1: bandas[0], 2: bandas[1], 3: bandas[2], 4: bandas[3]});
}
