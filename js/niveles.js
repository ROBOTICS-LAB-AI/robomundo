// Contenido del juego: mundos, niveles y fichas de componentes.
// Para agregar un nivel basta con agregar un objeto a NIVELES; el motor no se toca.
//
// Campos comunes: id, mundo, titulo, mision (HTML), escena {piezas, cables}, pistas
//   ficha: lista de componentes que se presentan antes de jugar (solo la primera vez)
//   tutorial: true → muestra "Cómo se usa" y los mensajes guía (solo en los primeros niveles)
//   pistas: se desbloquean tras 2, 4 y 6 intentos fallidos. resaltar: agujeros/pines/patas que parpadean
//   Una pieza de la escena puede ubicarse con en: 'bb.c5' (su primera pata en ese agujero).
//
// tipo 'pasos' (observar y hacer clic): nombres (mostrar nombres al pasar el mouse) y pasos:
//   {texto, objetivo: {partes: [...]}}                 clic en una parte de la placa (usb, chip, reset…)
//   {texto, objetivo: {terminales: [...], cantidad}}   clic en pines/agujeros (cantidad = cuántos distintos)
//   {pregunta, opciones: [...], correcta}               pregunta de opción múltiple
//   resaltar: [...] marca agujeros o pines durante ese paso
//
// tipo 'circuito' (por defecto): objetivos (texto), paleta, notaPaleta, exito (mensaje al lograrlo) y meta:
//   encendidos: n · colores: [tipos de LED que deben encender]
//   conexiones: [[a, b], …] pares de terminales que deben quedar conectados. Nunca vale un cortocircuito.
//   error: 'corto' | 'quemado' | 'invertido' | 'puenteado' → el objetivo ES cometer ese error ("error a propósito")
//   verRedes: true → los agujeros se pintan según el pin al que están conectados (primeros circuitos)
//   porque: explicación que aparece al terminar ("¿Por qué pasó?")
//
// interactivo: true → la simulación queda corriendo para presionar pulsadores y girar perillas (sin programa).
// metas con componentes interactivos: pulsador · alarma (buzzer con botón) · conmutar · sonido · pitidos: n · notas: n
//   escala: n · serial (valores de 0 a 1023 en el monitor) · perillaBrillo · umbral · parpadeoVariable
//   errores: 'siempre' (pulsador girado) · 'flotante' · 'buzzerInvertido' · 'sinMap'
// programa: true (Mundo 4 en adelante): se arma/usa el circuito y se programa con bloques o texto.
//   inicio: 'bloques' | 'texto' · bloques: {setup: [...], loop: [...]} · codigo: texto inicial
//   meta: encendidos · parpadea (+ duracion en ms) · secuencia: [tipos de LED en orden] · error: 'sinDelay'
//
//   más metas con programa: notas · escala · pitidos · serial ([mín, máx], + serialTope, decimales) · perillaBrillo
//   umbral ({bajo, alto} en posición 0-1 de la perilla/luz/distancia, + invertido, salida: 'buzzer') · parpadeoVariable
//   brilloMedio · fade · rgb: [r, g, b] · secuenciaRGB · servo: [ángulos] · servoPerilla · servoBoton · motor: ±1
//   motorDirecciones · motorLento · motorSecuencia: [1, 0, -1] · errores 'sinPWM' 'servoSinEnergia' 'lecturaFija' 'motorDirecto'
// metas de los niveles ⭐ extra y de los retos:
//   sos · rafaga: n · contador: n · parpadeoPresionado · temporizador: ms · cuentaSerial: n · sirena · melodia: [Hz…]
//   timbre · theremin · zonas: [{de, a, n: [mín, máx] | tipos: [...], txt}] · perillaBrilloInverso
//   rgbPerilla: {bajo, medio, alto} · rgbBoton · servoLento · servoCerca · serialPalabras: {bajo, alto}
//   motorRampa · motorPerilla · motorDistancia · manual (proyecto libre: lista de revisión y "Entregar")
// extra: true → nivel opcional y más difícil (no hace falta para abrir el mundo siguiente)
// accion: texto de lo que el estudiante debe hacer durante la simulación · fallaMeta / fallaTope: mensajes propios
// codigoDebe: [{re, msg}] → el código tiene que cumplir esas expresiones (por ejemplo, tener ciertas funciones)
// libre: true → taller sin evaluación (solo en Retos)
//
// guia (ruta guiada): pasos que se marcan solos mientras el estudiante arma el circuito o el programa:
//   {texto, resaltar, conexion: [a, b]} o {texto, resaltar, pieza: {tipo, en: {anodo, catodo}} | {tipo, huecos: [...]}}
//   o {texto, codigo: /expresión/} (el programa generado por los bloques debe cumplirla)
// explicacion: diapositivas sencillas que se muestran antes de empezar ({icono, titulo, texto, dibujo})

const MUNDOS = [
  {n: 1, titulo: 'Conoce la placa', tema: 'Arduino UNO', icono: '🧠', color: '#00979D'},
  {n: 2, titulo: 'La protoboard', tema: 'Protoboard y cables', icono: '🔌', color: '#F28C28'},
  {n: 3, titulo: 'Primer circuito', tema: 'LED y resistencia', icono: '💡', color: '#E5484D'},
  {n: 4, titulo: 'Primer programa', tema: 'Hacer parpadear un LED', icono: '⌨️', color: '#7C5CFF'},
  {n: 5, titulo: 'Entrada digital', tema: 'Pulsador', icono: '🔘', color: '#2F80ED'},
  {n: 6, titulo: 'Sonido', tema: 'Buzzer', icono: '🔊', color: '#EB5757'},
  {n: 7, titulo: 'Señal analógica', tema: 'Potenciómetro', icono: '🎛️', color: '#27AE60'},
  {n: 8, titulo: 'Brillo y colores', tema: 'LED RGB y PWM', icono: '🌈', color: '#D946EF'},
  {n: 9, titulo: 'Movimiento preciso', tema: 'Servomotor', icono: '🦾', color: '#0EA5E9'},
  {n: 10, titulo: 'Sensores', tema: 'LDR y ultrasónico', icono: '📡', color: '#F59E0B'},
  {n: 11, titulo: 'Motores', tema: 'Motor DC y driver L298N', icono: '⚙️', color: '#64748B'},
];

// ---------- mesas y ayudas para escribir niveles ----------
const ARDUINO_SOLO = [{id: 'ard', tipo: 'arduino', x: 0, y: 40, fijo: true}];
const PROTO_SOLA = [{id: 'bb', tipo: 'protoboard', x: 0, y: 0, fijo: true}];
const MESA_BASE = [ARDUINO_SOLO[0], {id: 'bb', tipo: 'protoboard', x: 380, y: 52, fijo: true}];

const agujeros = filtro => AGUJEROS_PROTO.filter(filtro).map(h => 'bb.' + h.id);
const conectadosCon = id => { const h = AGUJEROS_PROTO.find(x => x.id === id); return agujeros(x => x.red === h.red && x.id !== id); };
const RIELES_MAS = agujeros(h => h.red === 'p1' || h.red === 'p2');
const RIELES_MENOS = agujeros(h => h.red === 'n1' || h.red === 'n2');
const GND = ['ard.GND1', 'ard.GND2', 'ard.GND3'];
const PWM = [3, 5, 6, 9, 10, 11].map(n => 'ard.D' + n);
const SI_NO = ['Sí, están conectados', 'No, no están conectados'];

// Circuito armado sin el LED: resistencia en c5–c9, 5V a la columna 5 y GND a la columna 10
const CABLES_LED = [
  {desde: 'ard.5V', hasta: 'bb.a5', color: '#E53935', puntos: [{x: 142, y: 306}, {x: 458, y: 306}]},
  {desde: 'ard.GND2', hasta: 'bb.a10', color: '#212121', puntos: [{x: 154, y: 318}, {x: 518, y: 318}]},
];
const CIRCUITO_SIN_LED = {piezas: MESA_BASE.concat([{id: 'r1', tipo: 'resistencia', en: 'bb.c5'}]), cables: CABLES_LED};

// Mesa para programar: cada circuito va de un pin del Arduino a la columna col (resistencia de col a col+4,
// LED en col+4/col+5) y vuelve a GND por el riel − de abajo. Los cables van por carriles que no se cruzan.
function mesaPrograma(circuitos) {
  const piezas = MESA_BASE.slice(), cables = [];
  circuitos.forEach(([pin, led, col], k) => {
    // LED: resistencia de col a col+4 y LED en col+4/col+5. Buzzer: pata + en col y pata − en col+2.
    const vuelta = led === 'buzzer' ? col + 2 : col + 5;
    if (led === 'buzzer') piezas.push({id: 'buz' + k, tipo: 'buzzer', en: 'bb.e' + col});
    else piezas.push({id: 'r' + k, tipo: 'resistencia', en: 'bb.c' + col}, {id: 'led' + k, tipo: led, en: 'bb.e' + (col + 4)});
    cables.push(
      cablePin(pin, 'bb.a' + col, k),
      {desde: 'bb.a' + vuelta, hasta: 'bb.n2-' + vuelta, color: '#212121'});
  });
  cables.push({desde: 'bb.n2-30', hasta: 'ard.GND3', color: '#212121', puntos: [{x: 758, y: 330}, {x: 166, y: 330}]});
  return {piezas, cables};
}
const COLORES_CABLE_PROGRAMA = ['#1565C0', '#8E24AA', '#EF6C00', '#00897B'];

// Cable de un pin de arriba del Arduino hasta un agujero (o hasta x, y): sube a su carril, baja por la
// derecha de la placa y entra por abajo. Con k distinto para cada cable, los recorridos no se cruzan.
function cablePin(pin, hasta, k, destino) {
  const px = PINES_ARDUINO.find(p => p.id === pin).x;
  const h = destino || (t => ({x: 380 + t.x, y: 52 + t.y}))(AGUJEROS_PROTO.find(t => 'bb.' + t.id === hasta));
  const yArriba = 14 + 8 * k, xBajada = 368 - 8 * k, yAbajo = Math.max(288, h.y + 8) + 12 * k;
  return {desde: 'ard.' + pin, hasta, color: COLORES_CABLE_PROGRAMA[k % 4], puntos: [{x: px, y: yArriba}, {x: xBajada, y: yArriba}, {x: xBajada, y: yAbajo}, {x: h.x, y: yAbajo}]};
}

// LED RGB en e10–e13 (R, común, G, B) con una resistencia por color hacia los pines ~11, ~10 y ~9.
function mesaRGB() {
  const m = mesaPrograma([]);
  m.piezas.push({id: 'rgb', tipo: 'led_rgb', en: 'bb.e10'},
    {id: 'rR', tipo: 'resistencia', en: 'bb.b10', rot: 180}, {id: 'rG', tipo: 'resistencia', en: 'bb.c12'}, {id: 'rB', tipo: 'resistencia', en: 'bb.d13'});
  m.cables.push(cablePin('D11', 'bb.a6', 0), cablePin('D10', 'bb.a16', 1), cablePin('D9', 'bb.a17', 2), {desde: 'bb.a11', hasta: 'bb.n2-11', color: '#212121'});
  return m;
}

// Servo fuera de la protoboard: marrón a GND, rojo a 5V y naranja (señal) al pin 9.
function mesaServo(m, {sinEnergia = false} = {}) {
  const conProto = m.piezas.some(p => p.tipo === 'protoboard'), y = conProto ? 370 : 250, xr = conProto ? 800 : 500;
  m.piezas.push({id: 'servo', tipo: 'servo', x: 440, y, angulo: 90});
  m.cables.push({desde: 'ard.GND3', hasta: 'servo.gnd', color: '#212121', carril: y + 50});
  if (!sinEnergia) m.cables.push({desde: 'ard.5V', hasta: 'servo.vcc', color: '#E53935', carril: y + 60});
  m.cables.push({desde: 'ard.D9', hasta: 'servo.senal', color: '#F59E0B', puntos: [{x: 166, y: 6}, {x: xr, y: 6}, {x: xr, y: y + 20}, {x: 464, y: y + 20}]});
  return m;
}

// 5V al riel + de abajo (una sola vez aunque varias piezas lo necesiten)
function rielCinco(m) {
  if (!m.cables.some(c => c.desde === 'ard.5V' && c.hasta === 'bb.p2-2')) m.cables.push({desde: 'ard.5V', hasta: 'bb.p2-2', color: '#E53935', puntos: [{x: 142, y: 250}]});
}

// Fotorresistencia en e15–e16: un lado a 5V y el otro a A0, con la resistencia de 10 kΩ a GND (divisor de voltaje).
function mesaLDR(m, {sin10k = false} = {}) {
  m.piezas.push({id: 'ldr', tipo: 'ldr', en: 'bb.e15'});
  rielCinco(m);
  m.cables.push(
    {desde: 'bb.a15', hasta: 'bb.p2-15', color: '#E53935'},
    {desde: 'bb.a16', hasta: 'ard.A0', color: '#0D9488', carril: 322});
  if (!sin10k) {
    m.piezas.push({id: 'r10k', tipo: 'resistencia_10k', en: 'bb.c16'});
    m.cables.push({desde: 'bb.a20', hasta: 'bb.n2-20', color: '#212121'});
  }
  return m;
}

// Sensor ultrasónico en e15–e18 (VCC, TRIG, ECHO, GND): TRIG al pin 7 y ECHO al pin 6.
// col cambia la columna de la pata VCC (las otras tres van a su derecha).
function mesaUltra(m, k0 = 0, col = 15) {
  m.piezas.push({id: 'ultra', tipo: 'ultrasonico', en: 'bb.e' + col, pos: 0.3});
  rielCinco(m);
  m.cables.push(
    {desde: 'bb.a' + col, hasta: 'bb.p2-' + col, color: '#E53935'},
    {desde: 'bb.a' + (col + 3), hasta: 'bb.n2-' + (col + 3), color: '#212121'},
    cablePin('D7', 'bb.a' + (col + 1), k0), cablePin('D6', 'bb.a' + (col + 2), k0 + 1));
  return m;
}

// Motor con driver L298N (sin protoboard): ENA ← ~10, IN1 ← 8, IN2 ← 7; el driver se alimenta con 5V y GND.
function mesaMotor() {
  return {
    piezas: ARDUINO_SOLO.concat([{id: 'drv', tipo: 'l298n', x: 420, y: 280}, {id: 'mot', tipo: 'motor', x: 444, y: 150}]),
    cables: [
      cablePin('D10', 'drv.ena', 0, {x: 432, y: 280}), cablePin('D8', 'drv.in1', 1, {x: 444, y: 280}), cablePin('D7', 'drv.in2', 2, {x: 456, y: 280}),
      {desde: 'ard.GND3', hasta: 'drv.gnd', color: '#212121', carril: 324},
      {desde: 'ard.5V', hasta: 'drv.vcc', color: '#E53935', carril: 334},
      {desde: 'drv.out1', hasta: 'mot.a', color: '#E53935'},
      {desde: 'drv.out2', hasta: 'mot.b', color: '#212121'},
    ],
  };
}

// Motor conectado directo al pin 8 y a GND (error a propósito)
function mesaMotorDirecto() {
  return {
    piezas: ARDUINO_SOLO.concat([{id: 'mot', tipo: 'motor', x: 444, y: 150}]),
    cables: [
      {desde: 'ard.D8', hasta: 'mot.a', color: '#1565C0', puntos: [{x: 178, y: 22}, {x: 420, y: 22}, {x: 420, y: 170}, {x: 444, y: 170}]},
      {desde: 'mot.b', hasta: 'ard.GND3', color: '#212121', puntos: [{x: 480, y: 300}, {x: 166, y: 300}]},
    ],
  };
}

// Pulsador cruzando el canal (patas en e23, e25, f23 y f25) leído por el pin 2.
// Normal: lado 1 a 5V y resistencia pull-down de 10 kΩ a GND. pullup: lado 1 a GND (para INPUT_PULLUP).
function mesaBoton(m, {pulldown = true, pullup = false} = {}) {
  m.piezas.push({id: 'btn', tipo: 'pulsador', en: 'bb.e23'});
  m.cables.push({desde: 'ard.D2', hasta: 'bb.j25', color: '#F9A825', carril: 34});
  if (pullup) m.cables.push({desde: 'bb.a23', hasta: 'bb.n2-23', color: '#212121'});
  else m.cables.push({desde: 'ard.5V', hasta: 'bb.a23', color: '#E53935', carril: 338});
  if (pulldown && !pullup) {
    m.piezas.push({id: 'r10k', tipo: 'resistencia_10k', en: 'bb.c25'});
    m.cables.push({desde: 'bb.a29', hasta: 'bb.n2-29', color: '#212121'});
  }
  return m;
}

// Potenciómetro en e15–e17: extremos a GND (columna 15) y 5V (columna 17), cursor (columna 16) al pin A0.
// col cambia la columna de la primera pata (por ejemplo 26, para dejar libre el resto de la protoboard).
function mesaPot(m, col = 15) {
  m.piezas.push({id: 'pot', tipo: 'potenciometro', en: 'bb.e' + col});
  rielCinco(m);
  m.cables.push(
    {desde: 'bb.a' + (col + 2), hasta: 'bb.p2-' + (col + 2), color: '#E53935'},
    {desde: 'bb.a' + col, hasta: 'bb.n2-' + col, color: '#212121'},
    {desde: 'bb.a' + (col + 1), hasta: 'ard.A0', color: '#0D9488', carril: 322});
  return m;
}

// Motor con driver y potenciómetro suelto (a la derecha): izquierda a GND, derecha a 5V, centro a A0.
function mesaMotorPot() {
  const m = mesaMotor();
  m.piezas.push({id: 'pot', tipo: 'potenciometro', x: 580, y: 150});
  m.cables.push(
    {desde: 'ard.GND2', hasta: 'pot.izq', color: '#212121', carril: 344},
    {desde: 'ard.5V', hasta: 'pot.der', color: '#E53935', carril: 354},
    {desde: 'ard.A0', hasta: 'pot.cursor', color: '#0D9488', carril: 364});
  return m;
}

// Motor con driver y sensor ultrasónico suelto (a la derecha): TRIG al pin 4 y ECHO al pin 3.
function mesaMotorUltra() {
  const m = mesaMotor(), x = id => PINES_ARDUINO.find(p => p.id === id).x;
  m.piezas.push({id: 'ultra', tipo: 'ultrasonico', x: 600, y: 150, pos: 0.3});
  m.cables.push(
    {desde: 'ard.GND2', hasta: 'ultra.gnd', color: '#212121', carril: 344},
    {desde: 'ard.5V', hasta: 'ultra.vcc', color: '#E53935', carril: 354},
    {desde: 'ard.D4', hasta: 'ultra.trig', color: '#00897B', puntos: [{x: x('D4'), y: 38}, {x: 690, y: 38}, {x: 690, y: 384}, {x: 612, y: 384}]},
    {desde: 'ard.D3', hasta: 'ultra.echo', color: '#8E24AA', puntos: [{x: x('D3'), y: 46}, {x: 700, y: 46}, {x: 700, y: 394}, {x: 624, y: 394}]});
  return m;
}
// Todos los componentes (para los retos y el taller libre)
const PALETA_TODO = ['led', 'led_amarillo', 'led_verde', 'resistencia', 'resistencia_10k', 'pulsador', 'buzzer', 'potenciometro', 'ldr', 'ultrasonico', 'led_rgb', 'servo', 'l298n', 'motor'];
const MESA_LED13 = mesaPrograma([['D13', 'led', 7]]);
const MESA_SEMAFORO = mesaPrograma([['D12', 'led', 7], ['D11', 'led_amarillo', 13], ['D10', 'led_verde', 19]]);

// Cables ya tendidos: 5V al riel + de abajo y GND al riel − de arriba
const CABLES_RIELES = [
  {desde: 'ard.5V', hasta: 'bb.p2-2', color: '#E53935', puntos: [{x: 142, y: 300}, {x: 370, y: 300}, {x: 370, y: 250}]},
  {desde: 'ard.GND1', hasta: 'bb.n1-2', color: '#212121', puntos: [{x: 106, y: 30}, {x: 370, y: 30}, {x: 370, y: 82}]},
];

const NIVELES = [
  // ================= MUNDO 1: Conoce la placa =================
  {
    id: '1-1', mundo: 1, tipo: 'pasos', titulo: '¡Hola, Arduino!', ficha: ['arduino'], tutorial: true, nombres: true,
    mision: 'Esta es la placa <b>Arduino UNO</b>. Pasa el mouse sobre sus partes para descubrir cómo se llaman y luego sigue los pasos.',
    escena: {piezas: ARDUINO_SOLO},
    pasos: [
      {texto: 'Haz clic en el <b>conector USB</b>.', objetivo: {partes: ['usb']}},
      {texto: 'Haz clic en el <b>botón RESET</b>.', objetivo: {partes: ['reset']}},
      {texto: 'Haz clic en el <b>microcontrolador</b>, el cerebro de la placa.', objetivo: {partes: ['chip']}},
    ],
    pistas: [
      'Pasa el mouse lentamente sobre la placa: aparece el nombre de cada parte.',
      'El conector USB es la pieza plateada del borde izquierdo. El botón RESET tiene un círculo rojo.',
      'El microcontrolador es el rectángulo negro más grande, con patitas plateadas a los lados.',
    ],
  },
  {
    id: '1-2', mundo: 1, tipo: 'pasos', titulo: 'La energía de la placa',
    mision: 'La placa necesita energía para funcionar. ¿Por dónde le llega? Esta vez los nombres no aparecen: ¡confía en lo que aprendiste!',
    escena: {piezas: ARDUINO_SOLO},
    pasos: [
      {texto: 'Haz clic en la parte por donde la placa recibe energía <b>desde la computadora</b>.', objetivo: {partes: ['usb']}},
      {texto: 'Ahora haz clic en el conector para una <b>batería o adaptador</b>.', objetivo: {partes: ['jack']}},
      {pregunta: '¿Qué hace el <b>regulador de voltaje</b>?', opciones: ['Guarda los programas', 'Convierte la energía que llega en 5 V estables', 'Enciende el LED L'], correcta: 1},
      {texto: 'Encuentra el <b>regulador de voltaje</b>: está junto al conector de alimentación.', objetivo: {partes: ['regulador']}},
    ],
    pistas: [
      'La computadora se conecta a la placa con un cable USB.',
      'El conector de alimentación es el bloque negro con un círculo, abajo a la izquierda.',
      'El regulador es una pieza negra pequeña con una pestaña plateada, a la derecha del conector de alimentación.',
    ],
  },
  {
    id: '1-3', mundo: 1, tipo: 'pasos', titulo: 'El cerebro de la placa',
    mision: 'El <b>microcontrolador</b> es una computadora diminuta: ejecuta el programa que tú le cargas.',
    escena: {piezas: ARDUINO_SOLO},
    pasos: [
      {texto: 'Haz clic en el <b>microcontrolador</b> ATmega328P.', objetivo: {partes: ['chip']}},
      {pregunta: '¿Qué hace el microcontrolador?', opciones: ['Ejecuta el programa que tú escribes', 'Da luz a la placa', 'Sirve para conectar el cable USB'], correcta: 0},
      {texto: 'Haz clic en el <b>cristal</b> que le marca el ritmo (tiene escrito 16.000).', objetivo: {partes: ['cristal']}},
      {texto: 'Haz clic en el <b>chip USB</b>, el que traduce la comunicación con la computadora.', objetivo: {partes: ['chipusb']}},
    ],
    pistas: [
      'El microcontrolador es el chip más grande de la placa.',
      'El cristal es una pieza plateada ovalada con el número 16.000.',
      'El chip USB es un cuadrado negro pequeño, cerca del conector USB.',
    ],
  },
  {
    id: '1-4', mundo: 1, tipo: 'pasos', titulo: 'Pines de energía',
    mision: 'Los <b>pines</b> son los agujeros donde conectas tus componentes. Los de <b>energía</b> están en la regleta de abajo, en la zona que dice POWER. ¡Lee las etiquetas con atención!',
    escena: {piezas: ARDUINO_SOLO},
    pasos: [
      {texto: 'Haz clic en el pin <b>5V</b>.', objetivo: {terminales: ['ard.5V']}},
      {texto: 'Haz clic en el pin <b>3.3V</b>.', objetivo: {terminales: ['ard.3V3']}},
      {texto: 'Haz clic en un pin <b>GND</b> (tierra, el negativo del circuito).', objetivo: {terminales: GND}},
      {pregunta: '¿Qué pasa si conectas el pin 5V directo con GND?', opciones: ['Se enciende la placa', 'Es un cortocircuito y puede dañar la placa', 'No pasa nada'], correcta: 1},
    ],
    pistas: [
      'Las etiquetas de los pines están escritas en blanco, junto a cada pin.',
      'Los pines de energía están en la regleta de abajo, debajo de la palabra POWER.',
      {texto: 'Mira los pines que parpadean: ahí están 3.3V, 5V y GND.', resaltar: ['ard.3V3', 'ard.5V', 'ard.GND2']},
    ],
  },
  {
    id: '1-5', mundo: 1, tipo: 'pasos', titulo: '¡Todos los GND!',
    mision: 'La placa tiene <b>tres</b> pines GND, y todos están conectados entre sí por dentro. ¿Puedes encontrarlos?',
    escena: {piezas: ARDUINO_SOLO},
    pasos: [
      {texto: 'Haz clic en los <b>3 pines GND</b> de la placa.', objetivo: {terminales: GND, cantidad: 3}},
      {pregunta: '¿Por qué la placa tiene varios GND?', opciones: ['Porque cada uno da un voltaje distinto', 'Para conectar varios componentes a tierra con comodidad', 'Porque son de colores diferentes'], correcta: 1},
    ],
    pistas: [
      'Hay GND en la regleta de arriba y también en la de abajo.',
      'En la regleta de abajo hay dos GND seguidos; arriba hay uno, entre AREF y el pin 13.',
      {texto: 'Los tres GND parpadean ahora.', resaltar: GND},
    ],
  },
  {
    id: '1-6', mundo: 1, tipo: 'pasos', titulo: 'Pines digitales',
    mision: 'Los <b>pines digitales</b> (del 0 al 13) están en la regleta de arriba. Sirven para encender o apagar cosas: solo tienen dos estados, <b>encendido (HIGH)</b> o <b>apagado (LOW)</b>.',
    escena: {piezas: ARDUINO_SOLO},
    pasos: [
      {texto: 'Haz clic en el pin digital <b>13</b>.', objetivo: {terminales: ['ard.D13']}},
      {texto: 'Haz clic en el pin digital <b>7</b>.', objetivo: {terminales: ['ard.D7']}},
      {texto: 'Haz clic en el pin digital <b>2</b>.', objetivo: {terminales: ['ard.D2']}},
      {pregunta: '¿Cuántos pines digitales tiene el Arduino UNO?', opciones: ['6', '14 (del 0 al 13)', '20'], correcta: 1},
    ],
    pistas: [
      'Los pines digitales están arriba, bajo la palabra DIGITAL.',
      'Los números van de derecha a izquierda: el 0 está a la derecha y el 13 a la izquierda.',
      {texto: 'Los pines 13, 7 y 2 parpadean ahora.', resaltar: ['ard.D13', 'ard.D7', 'ard.D2']},
    ],
  },
  {
    id: '1-7', mundo: 1, tipo: 'pasos', titulo: 'Los pines con ~',
    mision: 'Algunos pines digitales tienen el símbolo <b>~</b> (se llama <b>PWM</b>). Pueden dar "medio encendido": sirven para cambiar el brillo de un LED o la velocidad de un motor.',
    escena: {piezas: ARDUINO_SOLO},
    pasos: [
      {texto: 'Encuentra <b>3 pines</b> que tengan el símbolo ~.', objetivo: {terminales: PWM, cantidad: 3}},
      {pregunta: 'El pin 7, ¿tiene el símbolo ~?', opciones: ['Sí', 'No'], correcta: 1},
      {pregunta: '¿Para qué sirven los pines con ~ (PWM)?', opciones: ['Para cambiar el brillo de un LED poco a poco', 'Para conectar el cable USB', 'Para dar 5 V siempre'], correcta: 0},
    ],
    pistas: [
      'Mira con atención las etiquetas de arriba: algunas tienen una rayita ondulada ~ antes del número.',
      'Los pines con ~ son el 3, 5, 6, 9, 10 y 11.',
      {texto: 'Los pines con ~ parpadean ahora.', resaltar: PWM},
    ],
  },
  {
    id: '1-8', mundo: 1, tipo: 'pasos', titulo: 'Pines analógicos',
    mision: 'Los <b>pines analógicos</b> (A0 a A5) están abajo a la derecha. No solo leen encendido/apagado: leen valores que cambian poco a poco, como la luz o la posición de una perilla.',
    escena: {piezas: ARDUINO_SOLO},
    pasos: [
      {texto: 'Haz clic en el pin <b>A0</b>.', objetivo: {terminales: ['ard.A0']}},
      {texto: 'Haz clic en el pin <b>A5</b>.', objetivo: {terminales: ['ard.A5']}},
      {texto: 'Haz clic en el pin <b>A3</b>.', objetivo: {terminales: ['ard.A3']}},
      {pregunta: '¿Qué componente leerías con un pin analógico?', opciones: ['Un potenciómetro (perilla)', 'Un cable', 'El botón RESET'], correcta: 0},
    ],
    pistas: [
      'Busca la zona que dice ANALOG IN.',
      'Van en orden de izquierda a derecha: A0, A1, A2, A3, A4, A5.',
      {texto: 'A0, A3 y A5 parpadean ahora.', resaltar: ['ard.A0', 'ard.A3', 'ard.A5']},
    ],
  },
  {
    id: '1-9', mundo: 1, tipo: 'pasos', titulo: 'Las lucecitas de la placa',
    mision: 'La placa tiene sus propios LEDs pequeñitos que te avisan qué está pasando.',
    escena: {piezas: ARDUINO_SOLO},
    pasos: [
      {texto: 'Haz clic en el LED <b>ON</b>, que indica que la placa tiene energía.', objetivo: {partes: ['ledON']}},
      {texto: 'Haz clic en el LED <b>L</b>.', objetivo: {partes: ['ledL']}},
      {pregunta: '¿A qué pin está conectado el LED L?', opciones: ['Al pin 13', 'Al pin 0', 'A GND'], correcta: 0},
      {texto: 'Haz clic en uno de los LEDs que parpadean cuando la placa se comunica (<b>TX</b> o <b>RX</b>).', objetivo: {partes: ['ledTX', 'ledRX']}},
    ],
    pistas: [
      'Los LEDs de la placa son rectangulitos amarillos y uno verde.',
      'Lee las letras impresas al lado de cada LED: ON, L, TX y RX.',
      'El LED ON está a la derecha (es verde). L, TX y RX están juntos cerca del botón RESET.',
    ],
  },
  {
    id: '1-10', mundo: 1, tipo: 'pasos', titulo: 'Desafío final: experto en Arduino',
    mision: '¡Demuestra todo lo que aprendiste! Sin nombres y sin ayuda.',
    escena: {piezas: ARDUINO_SOLO},
    pasos: [
      {texto: 'Haz clic en el pin <b>5V</b>.', objetivo: {terminales: ['ard.5V']}},
      {texto: 'Haz clic en el pin digital <b>~9</b>.', objetivo: {terminales: ['ard.D9']}},
      {texto: 'Haz clic en el pin analógico <b>A2</b>.', objetivo: {terminales: ['ard.A2']}},
      {texto: 'Haz clic en un pin <b>GND</b>.', objetivo: {terminales: GND}},
      {texto: 'Haz clic en el <b>botón RESET</b>.', objetivo: {partes: ['reset']}},
      {pregunta: '¿Qué pin usarías para leer un sensor de luz?', opciones: ['5V', 'A0', 'GND'], correcta: 1},
      {pregunta: '¿Qué parte ejecuta tu programa?', opciones: ['El cristal', 'El regulador de voltaje', 'El microcontrolador'], correcta: 2},
    ],
    pistas: [
      'Recuerda: energía abajo a la izquierda (POWER), digitales arriba, analógicos abajo a la derecha.',
      'El pin 9 tiene el símbolo ~ y está en la regleta de arriba.',
      'Los sensores que cambian poco a poco se leen con los pines analógicos (A0–A5).',
    ],
  },

  // ================= MUNDO 2: La protoboard =================
  {
    id: '2-1', mundo: 2, tipo: 'pasos', titulo: 'Conoce la protoboard', ficha: ['protoboard'], tutorial: true, nombres: true,
    mision: 'La <b>protoboard</b> sirve para armar circuitos sin soldar. Pasa el mouse sobre los agujeros: se iluminan en verde todos los que están <b>conectados</b> entre sí.',
    escena: {piezas: PROTO_SOLA},
    pasos: [
      {texto: 'Haz clic en un agujero de un riel <b>positivo (+)</b>, los que tienen la línea roja.', objetivo: {terminales: RIELES_MAS}},
      {texto: 'Haz clic en un agujero de un riel <b>negativo (−)</b>, los que tienen la línea azul.', objetivo: {terminales: RIELES_MENOS}},
      {texto: 'Haz clic en cualquier agujero de la <b>columna 10</b>.', objetivo: {terminales: agujeros(h => /^[a-j]10$/.test(h.id))}},
      {pregunta: 'En la zona central, ¿cuántos agujeros están conectados en cada columna (de la a hasta la e)?', opciones: ['2', '5', '30'], correcta: 1},
    ],
    pistas: [
      'Los rieles son las filas largas de arriba y de abajo, marcadas con + y −.',
      'Los números de las columnas están escritos arriba: 1, 5, 10, 15…',
      'Pasa el mouse sobre la columna 10 y cuenta cuántos agujeros se iluminan en verde.',
    ],
  },
  {
    id: '2-2', mundo: 2, tipo: 'pasos', titulo: 'Agujeros conectados',
    mision: 'Ahora sin ayuda: el agujero que <b>parpadea</b> es tu punto de partida. Encuentra otro agujero que esté <b>conectado</b> con él.',
    escena: {piezas: PROTO_SOLA},
    pasos: [
      {texto: 'Haz clic en un agujero conectado con el que parpadea (columna 5, fila c).', objetivo: {terminales: conectadosCon('c5')}, resaltar: ['bb.c5']},
      {texto: 'Haz clic en un agujero conectado con el que parpadea (columna 12, fila h).', objetivo: {terminales: conectadosCon('h12')}, resaltar: ['bb.h12']},
      {texto: 'Este está en un riel. Haz clic en otro agujero conectado con él.', objetivo: {terminales: conectadosCon('p1-8')}, resaltar: ['bb.p1-8']},
      {texto: 'Haz clic en un agujero conectado con el que parpadea (columna 20, fila a).', objetivo: {terminales: conectadosCon('a20')}, resaltar: ['bb.a20']},
    ],
    pistas: [
      'En la zona central, los agujeros se conectan en columnas (de arriba hacia abajo), no en filas.',
      'El canal del centro separa la parte a–e de la parte f–j: no están conectadas entre sí.',
      'Los rieles se conectan a lo largo, de izquierda a derecha.',
    ],
  },
  {
    id: '2-3', mundo: 2, tipo: 'pasos', titulo: '¿Conectados o no?',
    mision: 'Mira los dos agujeros que parpadean en cada pregunta y decide si están conectados por dentro.',
    escena: {piezas: PROTO_SOLA},
    pasos: [
      {pregunta: 'Columna 5: ¿la fila <b>a</b> y la fila <b>e</b> están conectadas?', opciones: SI_NO, correcta: 0, resaltar: ['bb.a5', 'bb.e5']},
      {pregunta: 'Fila a: ¿la columna <b>5</b> y la columna <b>6</b> están conectadas?', opciones: SI_NO, correcta: 1, resaltar: ['bb.a5', 'bb.a6']},
      {pregunta: 'Columna 8: ¿la fila <b>e</b> y la fila <b>f</b> están conectadas?', opciones: SI_NO, correcta: 1, resaltar: ['bb.e8', 'bb.f8']},
      {pregunta: 'Riel + de arriba: ¿un agujero del inicio y otro del final están conectados?', opciones: SI_NO, correcta: 0, resaltar: ['bb.p1-3', 'bb.p1-28']},
      {pregunta: '¿El riel + y el riel − de arriba están conectados entre sí?', opciones: SI_NO, correcta: 1, resaltar: ['bb.p1-10', 'bb.n1-10']},
    ],
    pistas: [
      'En la zona central: misma columna y mismo lado del canal = conectados.',
      'El canal del centro corta la conexión entre la fila e y la fila f.',
      'Cada riel está unido a lo largo, pero el riel + y el riel − son caminos separados.',
    ],
  },
  {
    id: '2-4', mundo: 2, titulo: 'Tu primer cable', tutorial: true, verRedes: true,
    mision: 'Lleva la energía del Arduino a la protoboard: conecta el pin <b>5V</b> al riel <b>+</b> de arriba y un pin <b>GND</b> al riel <b>−</b> de arriba.',
    objetivos: ['5V conectado al riel + de arriba', 'GND conectado al riel − de arriba', 'Sin cortocircuitos'],
    meta: {conexiones: [['ard.5V', 'bb.p1-2'], ['ard.GND1', 'bb.n1-2']]},
    paleta: [], notaPaleta: 'En este nivel solo usas cables: haz clic en un pin o agujero y luego en otro.',
    escena: {piezas: MESA_BASE},
    pistas: [
      'Para hacer un cable: clic en el pin 5V del Arduino y luego clic en un agujero del riel.',
      'El riel + de arriba es la fila con la línea roja; el riel − es la fila con la línea azul.',
      {texto: 'Une los puntos que parpadean: 5V con el riel + y GND con el riel −.', resaltar: ['ard.5V', 'bb.p1-3', 'ard.GND1', 'bb.n1-3']},
    ],
  },
  {
    id: '2-5', mundo: 2, titulo: 'Energía arriba y abajo', verRedes: true,
    mision: 'Ahora los <b>cuatro</b> rieles deben tener energía: los dos <b>+</b> con 5V y los dos <b>−</b> con GND. Truco: puedes unir un riel con otro usando un cable.',
    objetivos: ['Los dos rieles + con 5V', 'Los dos rieles − con GND', 'Sin cortocircuitos'],
    meta: {conexiones: [['ard.5V', 'bb.p1-2'], ['ard.5V', 'bb.p2-2'], ['ard.GND1', 'bb.n1-2'], ['ard.GND1', 'bb.n2-2']]},
    paleta: [], notaPaleta: 'En este nivel solo usas cables.',
    escena: {piezas: MESA_BASE},
    pistas: [
      'Puedes hacerlo con cuatro cables desde el Arduino, o con dos cables más que unan los rieles de arriba con los de abajo.',
      'Un riel + solo se une con otro riel +, y un riel − con otro riel −. ¡No los mezcles!',
      {texto: 'Por ejemplo: 5V al riel + de arriba, GND al riel − de arriba, y luego dos cables largos de arriba hacia abajo.', resaltar: ['bb.p1-29', 'bb.p2-29', 'bb.n1-30', 'bb.n2-30']},
    ],
  },
  {
    id: '2-6', mundo: 2, titulo: 'Lleva la energía a una columna', verRedes: true,
    mision: 'Los cables a los rieles ya están puestos. Desde los rieles, lleva <b>5V a la columna 10</b> y <b>GND a la columna 20</b>, en la zona de la fila a a la e.',
    objetivos: ['Columna 10 (a–e) con 5V', 'Columna 20 (a–e) con GND', 'Sin cortocircuitos'],
    meta: {conexiones: [['ard.5V', 'bb.a10'], ['ard.GND1', 'bb.a20']]},
    paleta: [], notaPaleta: 'En este nivel solo usas cables.',
    escena: {piezas: MESA_BASE, cables: CABLES_RIELES},
    pistas: [
      'El riel + de abajo ya tiene 5V y el riel − de arriba ya tiene GND.',
      'Un cable corto desde el riel + de abajo hasta la columna 10 basta para llevarle 5V.',
      {texto: 'Une los puntos que parpadean.', resaltar: ['bb.p2-10', 'bb.a10', 'bb.n1-20', 'bb.e20']},
    ],
  },
  {
    id: '2-6b', mundo: 2, titulo: '🧪 Error a propósito: cortocircuito', verRedes: true,
    mision: 'En la vida real <b>nunca</b> lo hagas, pero aquí puedes experimentar: une el pin <b>5V</b> con un pin <b>GND</b> sin nada en el medio (con un cable directo o a través de los rieles) y mira qué pasa.',
    objetivos: ['Provocar un cortocircuito', 'Observar qué se marca en rojo'],
    meta: {error: 'corto'},
    exito: '⚡ ¡Cortocircuito! Mira: todo lo que quedó unido se marcó en rojo.',
    porque: 'El 5V y el GND quedaron unidos solo por cables, sin ningún componente en el medio que frene la corriente. Entonces pasa muchísima corriente de golpe: los cables se calientan y la placa se puede dañar (o se apaga para protegerse). Por eso, entre 5V y GND siempre tiene que haber algo que use la energía, como un LED con su resistencia.',
    paleta: [], notaPaleta: 'En este nivel solo usas cables.',
    escena: {piezas: MESA_BASE},
    pistas: [
      'Un cortocircuito es cuando el 5V y el GND quedan unidos directamente.',
      'Puedes llevar 5V a un riel y GND al mismo riel.',
      {texto: 'Une los dos puntos que parpadean con un cable.', resaltar: ['ard.5V', 'ard.GND2']},
    ],
  },
  {
    id: '2-7', mundo: 2, titulo: '¡Cortocircuito escondido!', verRedes: true,
    mision: 'Alguien conectó mal unos cables y hay un <b>cortocircuito</b>: el 5V llega a GND sin pasar por ningún componente. Encuentra el cable que sobra y elimínalo (selecciónalo y presiona <b>Supr</b>).',
    objetivos: ['Sin cortocircuitos', '5V sigue en el riel + y GND en el riel −'],
    meta: {conexiones: [['ard.5V', 'bb.p2-2'], ['ard.GND1', 'bb.n1-2']]},
    paleta: [], notaPaleta: 'Selecciona un cable con un clic y elimínalo con Supr o con el botón 🗑.',
    escena: {
      piezas: MESA_BASE,
      cables: CABLES_RIELES.concat([
        {desde: 'bb.p2-10', hasta: 'bb.a10', color: '#F9A825'},
        {desde: 'bb.e10', hasta: 'bb.n1-10', color: '#1565C0'},
      ]),
    },
    pistas: [
      'Sigue el camino desde el 5V: ¿a dónde llega la energía a través de los cables?',
      'El cable amarillo lleva 5V a la columna 10, y el cable azul une esa misma columna con GND.',
      'Elimina el cable amarillo o el azul: cualquiera de los dos corta el cortocircuito.',
    ],
  },
  {
    id: '2-8', mundo: 2, titulo: 'Desafío final: cruza el canal', verRedes: true,
    mision: 'El canal del centro separa la protoboard en dos mitades. Lleva <b>5V a la columna 5, fila j</b> (mitad de arriba) y <b>GND a la columna 25, fila a</b> (mitad de abajo).',
    objetivos: ['5V en la columna 5 (f–j)', 'GND en la columna 25 (a–e)', 'Sin cortocircuitos'],
    meta: {conexiones: [['ard.5V', 'bb.j5'], ['ard.GND1', 'bb.a25']]},
    paleta: [], notaPaleta: 'En este nivel solo usas cables.',
    escena: {piezas: MESA_BASE},
    pistas: [
      'Primero lleva 5V y GND a los rieles; desde ahí es más fácil llegar a cualquier columna.',
      'La fila j está en la mitad de arriba, cerca del riel de arriba. La fila a está en la mitad de abajo, cerca del riel de abajo.',
      {texto: 'Una forma: 5V al riel + de arriba y de ahí a la columna 5; GND al riel − de abajo y de ahí a la columna 25.', resaltar: ['bb.p1-5', 'bb.j5', 'bb.n2-26', 'bb.a25']},
    ],
  },
  {
    id: '2-9', mundo: 2, extra: true, titulo: '⭐ Reparte la energía', verRedes: true,
    mision: 'Reto extra: lleva <b>5V</b> a la columna <b>5 (fila a)</b>, a la columna <b>15 (fila j)</b> y a la columna <b>25 (fila a)</b>, y <b>GND</b> a la columna <b>10 (fila j)</b> y a la columna <b>20 (fila a)</b>. Usa los rieles para no llenar la mesa de cables largos.',
    objetivos: ['5V en las columnas 5, 15 y 25', 'GND en las columnas 10 y 20', 'Sin cortocircuitos'],
    meta: {conexiones: [['ard.5V', 'bb.a5'], ['ard.5V', 'bb.j15'], ['ard.5V', 'bb.a25'], ['ard.GND1', 'bb.j10'], ['ard.GND1', 'bb.a20']]},
    paleta: [], notaPaleta: 'En este nivel solo usas cables.',
    escena: {piezas: MESA_BASE},
    pistas: [
      'Necesitas energía arriba y abajo del canal. Empieza llevando 5V y GND a los rieles.',
      'Los rieles de arriba y los de abajo no están unidos entre sí, pero puedes unirlos con un cable: riel + con riel + y riel − con riel −.',
      {texto: 'Una forma: 5V al riel + de abajo y GND al riel − de abajo; une cada riel de abajo con el de arriba. Después, cables cortos de los rieles a cada columna.', resaltar: ['bb.p2-5', 'bb.a5', 'bb.p1-15', 'bb.j15', 'bb.p2-26', 'bb.a25', 'bb.n1-10', 'bb.j10', 'bb.n2-20', 'bb.a20']},
    ],
  },

  // ================= MUNDO 3: Primer circuito =================
  {
    id: '3-1', mundo: 3, titulo: 'Enciende tu primer LED', ficha: ['led', 'resistencia'], tutorial: true, verRedes: true,
    mision: 'Usa la energía del pin <b>5V</b> del Arduino para encender un LED. La corriente debe salir por 5V, pasar por una <b>resistencia</b> (protege al LED) y por el <b>LED</b>, y regresar al pin <b>GND</b>.',
    objetivos: ['Encender 1 LED', 'Que ningún LED se queme'],
    meta: {encendidos: 1},
    paleta: ['led', 'resistencia'],
    escena: {piezas: MESA_BASE},
    pistas: [
      'Un circuito es como una pista cerrada: la corriente sale del pin 5V, pasa por los componentes y tiene que volver al pin GND. Si el camino se corta en algún punto, nada enciende.',
      'Pon la resistencia y el LED de modo que compartan una columna. Y recuerda: la pata larga del LED (+) va hacia el lado del 5V.',
      {
        texto: 'Prueba así: resistencia en la fila c, de la columna 5 a la 9. LED en la fila e: pata larga (+) en la columna 9 y pata corta (−) en la columna 10. Luego un cable del pin 5V a la columna 5 (fila a) y otro de la columna 10 (fila a) a un pin GND.',
        resaltar: ['bb.c5', 'bb.c9', 'bb.e9', 'bb.e10', 'bb.a5', 'bb.a10', 'ard.5V', 'ard.GND2'],
      },
    ],
  },
  {
    id: '3-1b', mundo: 3, titulo: '🧪 Error a propósito: LED al revés', verRedes: true,
    mision: 'La resistencia y los cables ya están puestos. Coloca el LED <b>al revés a propósito</b>: la pata corta (−) en la columna 9 y la pata larga (+) en la columna 10. ¿Se enciende? ¿Se daña?',
    objetivos: ['Poner el LED al revés', 'Observar qué pasa'],
    meta: {error: 'invertido'},
    exito: '🔎 ¡No enciende! Pero tampoco se dañó.',
    porque: 'El LED es un <b>diodo</b>: deja pasar la corriente en un solo sentido, del ánodo (+, pata larga) al cátodo (−, pata corta). Al revés, la corriente no puede pasar y el LED se queda apagado. No se daña: basta con darle la vuelta.',
    paleta: ['led'],
    escena: CIRCUITO_SIN_LED,
    pistas: [
      'Para ponerlo al revés, la pata larga (la del doblez) tiene que quedar del lado de GND.',
      'Gira el LED dos veces con la tecla R: así la pata larga queda a la derecha.',
      {texto: 'Pata corta en la columna 9 y pata larga en la columna 10, en la fila e.', resaltar: ['bb.e9', 'bb.e10']},
    ],
  },
  {
    id: '3-2', mundo: 3, titulo: '¡Algo anda mal!', verRedes: true,
    mision: 'Alguien armó este circuito con prisa y el LED no enciende. Todas las piezas están, pero hay un error. <b>Encuéntralo y corrígelo.</b>',
    objetivos: ['Encender el LED', 'Que ningún LED se queme'],
    meta: {encendidos: 1},
    paleta: [],
    escena: {
      piezas: MESA_BASE.concat([
        {id: 'r1', tipo: 'resistencia', en: 'bb.c5'},
        {id: 'led1', tipo: 'led', en: 'bb.e10', rot: 180},
      ]),
      cables: [
        {desde: 'ard.5V', hasta: 'bb.a5', color: '#E53935', puntos: [{x: 142, y: 306}, {x: 458, y: 306}]},
        {desde: 'ard.GND2', hasta: 'bb.a10', color: '#212121', puntos: [{x: 154, y: 318}, {x: 518, y: 318}]},
      ],
    },
    pistas: [
      'Los cables y la resistencia están bien puestos. Fíjate en cómo está colocado el LED.',
      'El LED solo deja pasar la corriente en un sentido: entra por la pata larga (+) y sale por la pata corta (−). La pata larga es la que tiene el doblez.',
      {texto: 'Selecciona el LED, gíralo con la tecla R hasta que quede hacia arriba y colócalo con la pata larga (+) en la columna 9 y la corta (−) en la columna 10, en la fila e.', resaltar: ['bb.e9', 'bb.e10']},
    ],
  },
  {
    id: '3-3', mundo: 3, titulo: '🧪 Error a propósito: sin resistencia', verRedes: true,
    mision: 'Un experimento que en la vida real <b>no debes hacer</b>: conecta un LED directo a 5V y GND, <b>sin resistencia</b>, y mira qué pasa.',
    objetivos: ['Conectar el LED sin resistencia', 'Observar qué le pasa'],
    meta: {error: 'quemado'},
    exito: '💥 ¡Se quemó! Por eso el LED siempre lleva una resistencia.',
    porque: 'Sin resistencia, nada frena la corriente: pasa demasiada por el LED, se calienta y se quema para siempre. La resistencia limita la corriente a una cantidad segura, como una llave de agua medio cerrada.',
    paleta: ['led'],
    escena: {piezas: MESA_BASE},
    pistas: [
      'Coloca el LED en la protoboard y lleva un cable de 5V a la columna de su pata larga.',
      'Luego lleva un cable desde la columna de la pata corta hasta un pin GND.',
      {texto: 'LED en la fila e, columnas 9 y 10. Cable de 5V a la columna 9 y cable de la columna 10 a GND.', resaltar: ['bb.e9', 'bb.e10', 'bb.a9', 'bb.a10', 'ard.5V', 'ard.GND2']},
    ],
  },
  {
    id: '3-3b', mundo: 3, titulo: '🧪 Error a propósito: misma columna', verRedes: true,
    mision: 'Otro experimento: pon el LED con <b>sus dos patas en la misma columna</b>. Para eso, gíralo con R hasta que quede de lado (una pata arriba de la otra) y colócalo en la columna 9.',
    objetivos: ['Las dos patas del LED en la misma columna', 'Observar qué pasa'],
    meta: {error: 'puenteado'},
    exito: '🔎 ¡No enciende! La corriente se fue por otro lado.',
    porque: 'Los 5 agujeros de una columna están unidos por dentro. Si las dos patas del LED están en la misma columna, la corriente toma el camino fácil por dentro de la protoboard y no pasa por el LED. Por eso cada pata debe ir en una columna distinta.',
    paleta: ['led'],
    escena: CIRCUITO_SIN_LED,
    pistas: [
      'Gira el LED una vez con la tecla R: las patas quedan una arriba de la otra.',
      'Ahora colócalo para que las dos patas caigan en la columna 9, por ejemplo en las filas d y e.',
      {texto: 'Una pata en d9 y la otra en e9.', resaltar: ['bb.d9', 'bb.e9']},
    ],
  },
  {
    id: '3-4', mundo: 3, titulo: 'Sin protoboard',
    mision: 'No siempre hace falta protoboard: también puedes conectar los cables <b>directo a las patas</b> de los componentes. Enciende el LED usando solo cables.',
    objetivos: ['Encender el LED', 'Que ningún LED se queme'],
    meta: {encendidos: 1},
    paleta: [], notaPaleta: 'Usa el LED y la resistencia que ya están en la mesa. Haz clic en la punta naranja de una pata para conectarle un cable.',
    escena: {
      piezas: ARDUINO_SOLO.concat([
        {id: 'led1', tipo: 'led', x: 430, y: 150},
        {id: 'r1', tipo: 'resistencia', x: 400, y: 230},
      ]),
    },
    pistas: [
      'Cada conexión se hace con un cable: haz clic en la punta naranja de una pata y luego en el pin o pata de destino.',
      'El camino es: 5V → resistencia → pata larga del LED → pata corta del LED → GND.',
      {texto: 'Tres cables: 5V a una pata de la resistencia; la otra pata de la resistencia a la pata larga del LED; la pata corta del LED a GND.', resaltar: ['ard.5V', 'r1.a', 'r1.b', 'led1.anodo', 'led1.catodo', 'ard.GND2']},
    ],
  },
  {
    id: '3-5', mundo: 3, titulo: 'Doble luz',
    mision: 'Ahora enciende <b>dos LEDs al mismo tiempo</b>. Cada LED necesita su propia protección. Truco: los <b>rieles</b> reparten 5V y GND por toda la protoboard.',
    objetivos: ['Encender 2 LEDs', 'Que ningún LED se queme'],
    meta: {encendidos: 2},
    paleta: ['led', 'resistencia'],
    escena: {piezas: MESA_BASE},
    pistas: [
      'Conecta primero el pin 5V a un riel + y el pin GND a un riel −. Así tendrás energía en toda la protoboard.',
      'Cada LED arma su propio camino: riel + → resistencia → LED (pata larga primero) → riel −.',
      {
        texto: 'Prueba así: cable de 5V al riel + de abajo y cable de GND al riel − de abajo. Resistencia vertical (gírala con R) entre el riel + y la fila c de la columna 5; LED en la fila e con la pata larga en la columna 5 y la corta en la 6; cable de la columna 6 (fila a) al riel −. Repite lo mismo en las columnas 15 y 16.',
        resaltar: ['bb.p2-5', 'bb.c5', 'bb.e5', 'bb.e6', 'bb.a6', 'bb.n2-6', 'bb.p2-15', 'bb.c15', 'bb.e15', 'bb.e16', 'bb.a16', 'bb.n2-16'],
      },
    ],
  },
  {
    id: '3-6', mundo: 3, titulo: 'Desafío final: semáforo',
    mision: 'Arma un <b>semáforo</b>: un LED <b>rojo</b>, uno <b>amarillo</b> y uno <b>verde</b>, los tres encendidos y cada uno con su resistencia. (En el Mundo 4 aprenderás a programarlo para que cambie solo).',
    objetivos: ['LED rojo encendido', 'LED amarillo encendido', 'LED verde encendido', 'Que ningún LED se queme'],
    meta: {encendidos: 3, colores: ['led', 'led_amarillo', 'led_verde']},
    paleta: ['led', 'led_amarillo', 'led_verde', 'resistencia'],
    escena: {piezas: MESA_BASE},
    pistas: [
      'Usa los rieles: 5V al riel + y GND al riel −. Luego arma tres caminos iguales, uno por cada color.',
      'Cada camino: riel + → resistencia → pata larga del LED → pata corta → riel −. Deja espacio entre un LED y otro.',
      {texto: 'Repite el circuito del nivel "Doble luz" en las columnas 5-6, 14-15 y 23-24.', resaltar: ['bb.p2-5', 'bb.c5', 'bb.e5', 'bb.e6', 'bb.a6', 'bb.n2-6', 'bb.p2-14', 'bb.c14', 'bb.e14', 'bb.e15', 'bb.a15', 'bb.n2-15', 'bb.p2-23', 'bb.c23', 'bb.e23', 'bb.e24', 'bb.a24', 'bb.n2-24']},
    ],
  },
  {
    id: '3-7', mundo: 3, extra: true, titulo: '⭐ Cuatro luces',
    mision: 'Reto extra: enciende <b>cuatro LEDs</b> al mismo tiempo (al menos uno rojo, uno amarillo y uno verde), cada uno con su propia resistencia. Organízate bien para que te alcance el espacio.',
    objetivos: ['4 LEDs encendidos', 'Rojo, amarillo y verde', 'Que ningún LED se queme'],
    meta: {encendidos: 4, colores: ['led', 'led_amarillo', 'led_verde']},
    paleta: ['led', 'led_amarillo', 'led_verde', 'resistencia'],
    escena: {piezas: MESA_BASE},
    pistas: [
      'Es como el semáforo, con un LED más. Cada LED arma su propio camino: riel + → resistencia → LED (pata larga primero) → riel −.',
      'Deja al menos una columna libre entre un circuito y otro, para que no se toquen.',
      {texto: 'Usa las columnas 5-6, 11-12, 17-18 y 23-24, con cada resistencia de pie entre el riel + y la fila c.', resaltar: ['bb.p2-5', 'bb.e5', 'bb.e6', 'bb.p2-11', 'bb.e11', 'bb.e12', 'bb.p2-17', 'bb.e17', 'bb.e18', 'bb.p2-23', 'bb.e23', 'bb.e24']},
    ],
  },
  {
    id: '3-8', mundo: 3, extra: true, titulo: '⭐ Los tres errores', verRedes: true,
    mision: 'Reto extra: estos tres circuitos deberían encender un LED cada uno, pero <b>cada uno tiene un error diferente</b>. Encuentra los tres y corrígelos (puedes mover piezas, girarlas y poner o quitar cables).',
    objetivos: ['Los 3 LEDs encendidos', 'Que ningún LED se queme'],
    meta: {encendidos: 3},
    paleta: [], notaPaleta: 'Usa las piezas que ya están en la mesa. También puedes agregar cables.',
    escena: {
      piezas: MESA_BASE.concat([
        {id: 'r1', tipo: 'resistencia', en: 'bb.c3'}, {id: 'led1', tipo: 'led', en: 'bb.e8'},
        {id: 'r2', tipo: 'resistencia', en: 'bb.c11'}, {id: 'led2', tipo: 'led_amarillo', en: 'bb.e16', rot: 180},
        {id: 'r3', tipo: 'resistencia', en: 'bb.c20'}, {id: 'led3', tipo: 'led_verde', en: 'bb.e24'},
      ]),
      cables: [
        {desde: 'ard.5V', hasta: 'bb.p2-2', color: '#E53935', puntos: [{x: 142, y: 250}]},
        {desde: 'bb.n2-30', hasta: 'ard.GND3', color: '#212121', puntos: [{x: 758, y: 330}, {x: 166, y: 330}]},
        {desde: 'bb.p2-3', hasta: 'bb.a3', color: '#E53935'}, {desde: 'bb.a9', hasta: 'bb.n2-9', color: '#212121'},
        {desde: 'bb.p2-11', hasta: 'bb.a11', color: '#E53935'}, {desde: 'bb.a16', hasta: 'bb.n2-16', color: '#212121'},
        {desde: 'bb.p2-20', hasta: 'bb.a20', color: '#E53935'},
      ],
    },
    pistas: [
      'Revisa un circuito a la vez: ¿la corriente puede ir del riel + a la resistencia, de la resistencia a la pata larga del LED, y de la pata corta al riel −?',
      'Primer LED: no comparte columna con su resistencia. Segundo LED: está al revés. Tercer LED: le falta el camino de regreso a GND.',
      {texto: 'Arreglos: un cable de la columna 7 a la columna 8 (o mueve el LED); gira el LED amarillo; y un cable de la columna 25 al riel −.', resaltar: ['bb.c7', 'bb.e8', 'bb.e15', 'bb.e16', 'bb.a25', 'bb.n2-26']},
    ],
  },

  // ================= MUNDO 4: Primer programa =================
  {
    id: '4-1', mundo: 4, titulo: 'Tu primer programa', ficha: ['programa'], tutorial: true, programa: true, verRedes: true,
    mision: 'Ahora el LED no está conectado a 5V sino al <b>pin 13</b>. Ese pin solo da energía si el programa se lo ordena. Arrastra el bloque <b>poner pin 13 en ALTO</b> (categoría Salidas) dentro de <b>al iniciar</b>.',
    objetivos: ['El LED se queda encendido'],
    meta: {encendidos: 1},
    escena: MESA_LED13, bloques: {},
    pistas: [
      'Los bloques están en las categorías de la izquierda del panel de código. "poner pin … en …" está en Salidas.',
      'El bloque tiene que quedar encajado dentro de "al iniciar"; si queda suelto, no se ejecuta.',
      'Elige el pin 13 y el valor ALTO. Luego presiona ▶ Iniciar simulación.',
    ],
  },
  {
    id: '4-2', mundo: 4, titulo: '¡Parpadea!', programa: true, verRedes: true,
    mision: 'Haz que el LED se encienda y se apague una y otra vez. Dentro de <b>repetir siempre</b>: enciende el pin 13, <b>espera</b> 1000 milisegundos, apágalo y <b>espera</b> otra vez.',
    objetivos: ['El LED parpadea sin parar'],
    meta: {parpadea: true},
    escena: MESA_LED13, bloques: {},
    pistas: [
      'Necesitas 4 bloques dentro de "repetir siempre": poner pin, esperar, poner pin, esperar.',
      'El bloque "esperar … milisegundos" está en la categoría Tiempo. 1000 milisegundos = 1 segundo.',
      'Orden: poner pin 13 en ALTO → esperar 1000 → poner pin 13 en BAJO → esperar 1000.',
    ],
  },
  {
    id: '4-3', mundo: 4, titulo: 'Más rápido', programa: true,
    mision: 'Este programa hace parpadear el LED cada segundo. Cámbialo para que parpadee <b>rápido</b>: 250 milisegundos encendido y 250 apagado.',
    objetivos: ['El LED parpadea cada 250 ms'],
    meta: {parpadea: true, duracion: 250},
    escena: MESA_LED13, bloques: {loop: [['escribir', 13, 'HIGH'], ['esperar', 1000], ['escribir', 13, 'LOW'], ['esperar', 1000]]},
    pistas: [
      'No hace falta agregar bloques: solo cambia los números.',
      'Haz clic en el número 1000 de cada bloque "esperar" y escribe otro valor.',
      'Los dos bloques "esperar" deben decir 250.',
    ],
  },
  {
    id: '4-4', mundo: 4, titulo: '🧪 Error a propósito: sin esperar', programa: true,
    mision: 'Experimento: <b>quita los dos bloques de esperar</b> (arrástralos a la papelera) y prueba el programa. ¿El LED sigue parpadeando?',
    objetivos: ['Quitar los dos bloques "esperar"', 'Observar cómo se ve el LED'],
    meta: {error: 'sinDelay'},
    exito: '🔎 ¡Parece siempre encendido, pero más débil!',
    porque: 'Sin esperar, el Arduino enciende y apaga el LED <b>miles de veces por segundo</b>. Tus ojos no alcanzan a ver tantos cambios: parece encendido todo el tiempo, pero más débil, porque pasa la mitad del tiempo apagado. Por eso necesitamos delay(): para que los cambios sean lo bastante lentos como para verlos.',
    escena: MESA_LED13, bloques: {loop: [['escribir', 13, 'HIGH'], ['esperar', 500], ['escribir', 13, 'LOW'], ['esperar', 500]]},
    pistas: [
      'Arrastra cada bloque "esperar" fuera de "repetir siempre", hasta la papelera.',
      'Ten cuidado de no sacar los bloques "poner pin": arrastra solo los de esperar.',
      'Dentro de "repetir siempre" deben quedar solo: poner pin 13 en ALTO y poner pin 13 en BAJO.',
    ],
  },
  {
    id: '4-5', mundo: 4, titulo: 'Cambia de pin', programa: true, verRedes: true,
    mision: 'Ahora el LED está conectado al <b>pin 8</b>, pero el programa sigue usando el pin 13. Arréglalo para que el LED parpadee.',
    objetivos: ['El LED del pin 8 parpadea'],
    meta: {parpadea: true},
    escena: mesaPrograma([['D8', 'led', 7]]), bloques: {loop: [['escribir', 13, 'HIGH'], ['esperar', 500], ['escribir', 13, 'LOW'], ['esperar', 500]]},
    pistas: [
      'Sigue el cable desde el LED hasta el Arduino: ¿a qué pin llega?',
      'En cada bloque "poner pin", haz clic en el número del pin para cambiarlo.',
      'Los dos bloques "poner pin" deben usar el pin 8.',
    ],
  },
  {
    id: '4-6', mundo: 4, titulo: 'El código de verdad', programa: true, inicio: 'texto',
    mision: 'Los bloques en realidad escriben <b>código</b>. Aquí tienes el código del parpadeo: <b>setup()</b> es "al iniciar" y <b>loop()</b> es "repetir siempre". Cambia los números para que el LED parpadee cada <b>500</b> milisegundos.',
    objetivos: ['El LED parpadea cada 500 ms'],
    meta: {parpadea: true, duracion: 500},
    escena: MESA_LED13,
    codigo: '// Parpadeo del LED en el pin 13\nvoid setup() {\n  pinMode(13, OUTPUT);   // el pin 13 es una salida\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH); // enciende\n  delay(1000);            // espera 1 segundo\n  digitalWrite(13, LOW);  // apaga\n  delay(1000);\n}\n',
    pistas: [
      'delay(1000) es igual que el bloque "esperar 1000 milisegundos".',
      'Hay dos delay(1000) en el código: cambia los dos.',
      'Deben quedar así: delay(500); — no borres el punto y coma del final.',
    ],
  },
  {
    id: '4-7', mundo: 4, titulo: 'Desafío final: semáforo programado', programa: true, verRedes: true,
    mision: 'Programa el semáforo: <b>rojo</b> (pin 12), luego <b>verde</b> (pin 10), luego <b>amarillo</b> (pin 11), y otra vez rojo. Solo una luz encendida a la vez. Puedes usar bloques, o pedirle a una IA el código y pegarlo en la pestaña <b>Texto</b>.',
    objetivos: ['Orden: rojo → verde → amarillo → rojo', 'Una sola luz encendida a la vez'],
    meta: {secuencia: ['led', 'led_verde', 'led_amarillo']},
    escena: MESA_SEMAFORO, bloques: {},
    pistas: [
      'Cada luz es como el parpadeo: encender, esperar, apagar. Repite eso para las tres luces dentro de "repetir siempre".',
      'Apaga cada luz antes de encender la siguiente; si no, quedarán dos encendidas a la vez.',
      'Orden: pin 12 ALTO, esperar, pin 12 BAJO, pin 10 ALTO, esperar, pin 10 BAJO, pin 11 ALTO, esperar, pin 11 BAJO.',
    ],
  },
  {
    id: '4-8', mundo: 4, extra: true, titulo: '⭐ S-O-S en código Morse', programa: true,
    mision: 'Reto extra: haz que el LED (pin 13) pida ayuda en <b>código Morse</b>. <b>S</b> = 3 destellos cortos (200 ms encendido), <b>O</b> = 3 destellos largos (600 ms encendido), <b>S</b> = 3 cortos. Entre destellos, 200 ms apagado. Al final, una pausa de 2 segundos y otra vez.',
    objetivos: ['3 destellos cortos', '3 destellos largos', '3 destellos cortos', 'Pausa y se repite'],
    meta: {sos: true},
    escena: MESA_LED13, bloques: {},
    pistas: [
      'Cada destello es: encender, esperar, apagar, esperar 200. En los cortos el LED queda encendido 200 ms y en los largos, 600 ms.',
      'Usa el bloque "repetir 3 veces" (Control) para no poner 36 bloques: un repetir para la S, otro para la O y otro para la S.',
      'repetir 3 veces (ALTO, esperar 200, BAJO, esperar 200) → repetir 3 veces (ALTO, esperar 600, BAJO, esperar 200) → repetir 3 veces (ALTO, esperar 200, BAJO, esperar 200) → esperar 2000.',
    ],
  },
  {
    id: '4-9', mundo: 4, extra: true, titulo: '⭐ Luces de advertencia', programa: true, verRedes: true,
    mision: 'Reto extra: como las luces de un cruce de tren, el LED <b>rojo</b> (pin 13) y el <b>amarillo</b> (pin 12) se encienden <b>por turnos</b>: cuando uno se enciende, el otro se apaga. Medio segundo cada uno, sin parar.',
    objetivos: ['El rojo y el amarillo se turnan', 'Nunca los dos encendidos a la vez'],
    meta: {secuencia: ['led', 'led_amarillo']},
    escena: mesaPrograma([['D13', 'led', 7], ['D12', 'led_amarillo', 13]]), bloques: {},
    pistas: [
      'Necesitas dos pasos dentro de "repetir siempre": uno con el rojo encendido y otro con el amarillo encendido.',
      'En cada paso, apaga una luz y enciende la otra, y después espera 500 ms.',
      'pin 13 ALTO, pin 12 BAJO, esperar 500 → pin 13 BAJO, pin 12 ALTO, esperar 500.',
    ],
  },
  {
    id: '4-10', mundo: 4, extra: true, titulo: '⭐ Ráfagas', programa: true,
    mision: 'Reto extra: haz que el LED (pin 13) dé <b>5 destellos rápidos</b> (100 ms encendido y 100 ms apagado) y después haga una <b>pausa de 1 segundo</b>, una y otra vez, como la luz de una ambulancia.',
    objetivos: ['5 destellos rápidos', 'Pausa de 1 segundo', 'Se repite'],
    meta: {rafaga: 5},
    escena: MESA_LED13, bloques: {},
    pistas: [
      'Usa el bloque "repetir … veces" (Control) con el parpadeo adentro.',
      'Dentro del repetir: ALTO, esperar 100, BAJO, esperar 100. Cambia el 3 del repetir por 5.',
      'Después del bloque repetir (debajo, no adentro), pon esperar 1000.',
    ],
  },

  // ================= MUNDO 5: Entrada digital (pulsador) =================
  {
    id: '5-1', mundo: 5, titulo: 'El pulsador', ficha: ['pulsador'], tutorial: true, interactivo: true, verRedes: true,
    mision: 'Arma un circuito en el que el LED se encienda <b>solo mientras presionas el botón</b>. Durante la simulación, haz clic sobre el pulsador y mantenlo apretado.',
    objetivos: ['Al presionar, el LED se enciende', 'Al soltar, el LED se apaga'],
    meta: {pulsador: true},
    paleta: ['pulsador', 'resistencia', 'led'],
    escena: {piezas: MESA_BASE},
    pistas: [
      'El pulsador va en el camino de la corriente, como un puente que se abre y se cierra: 5V → pulsador → resistencia → LED → GND.',
      'Coloca el pulsador cruzando el canal del centro: dos patas arriba del canal y dos abajo.',
      {texto: 'Prueba así: pulsador con sus patas en e23, e25, f23 y f25. Cable de 5V a la columna 23 (fila a). Resistencia de c25 a c29. LED con la pata larga en e29 y la corta en e30. Cable de la columna 30 a GND.', resaltar: ['bb.e23', 'bb.e25', 'bb.f23', 'bb.f25', 'bb.a23', 'ard.5V', 'bb.c25', 'bb.c29', 'bb.e29', 'bb.e30', 'bb.a30', 'ard.GND2']},
    ],
  },
  {
    id: '5-2', mundo: 5, titulo: '🧪 Error a propósito: pulsador girado', interactivo: true, verRedes: true,
    mision: 'Todo está armado menos el pulsador. Experimento: <b>gíralo una vez</b> (selecciónalo y presiona R) y colócalo sin cruzar el canal, en los agujeros que parpadean. Inicia la simulación <b>sin presionar</b> el botón.',
    objetivos: ['Colocar el pulsador girado', 'Observar el LED sin presionar'],
    meta: {error: 'siempre'},
    exito: '🔎 ¡El LED está encendido aunque no presionas!',
    porque: 'Las dos patas de cada lado del pulsador están <b>unidas siempre</b> por dentro. Si lo giras, esas patas unidas quedan conectando las dos columnas todo el tiempo, y el botón ya no corta nada. Por eso el pulsador se pone cruzando el canal.',
    paleta: ['pulsador'],
    escena: {
      piezas: MESA_BASE.concat([{id: 'r1', tipo: 'resistencia', en: 'bb.c25'}, {id: 'led1', tipo: 'led', en: 'bb.e29'}]),
      cables: [{desde: 'ard.5V', hasta: 'bb.a23', color: '#E53935', carril: 300}, {desde: 'bb.a30', hasta: 'ard.GND2', color: '#212121', carril: 312}],
    },
    pistas: [
      'Primero arrastra el pulsador a la mesa; después selecciónalo y presiona R una vez.',
      'Girado, sus patas quedan en dos filas de la mitad de abajo de la protoboard.',
      {texto: 'Coloca sus patas en c23, c25, a23 y a25.', resaltar: ['bb.c23', 'bb.c25', 'bb.a23', 'bb.a25']},
    ],
  },
  {
    id: '5-3', mundo: 5, titulo: 'El programa escucha al botón', programa: true, verRedes: true,
    mision: 'El botón está conectado al <b>pin 2</b> y el LED al <b>pin 13</b>. Programa: <b>si</b> "leer pin digital 2" es igual a 1, poner pin 13 en ALTO; <b>si no</b>, ponerlo en BAJO. Todo dentro de "repetir siempre".',
    objetivos: ['Al presionar, el LED se enciende', 'Al soltar, el LED se apaga'],
    meta: {pulsador: true},
    escena: mesaBoton(mesaPrograma([['D13', 'led', 7]])), bloques: {},
    pistas: [
      'Usa el bloque "si … hacer" de Control. Con el engranaje del bloque puedes agregarle un "si no".',
      'La condición se arma con el bloque de comparación (Lógica) y "leer pin digital 2" (Entradas): leer pin digital 2 = 1.',
      'Dentro de "hacer": poner pin 13 en ALTO. Dentro de "si no": poner pin 13 en BAJO.',
    ],
  },
  {
    id: '5-4', mundo: 5, titulo: '🧪 Error a propósito: pin flotante', programa: true, inicio: 'texto', verRedes: true,
    mision: 'Este circuito es igual al anterior, pero <b>sin la resistencia de 10 kΩ</b>. Inicia la simulación <b>sin tocar el botón</b> y observa el LED durante unos segundos.',
    objetivos: ['Observar el LED sin presionar el botón'],
    meta: {error: 'flotante'},
    exito: '🔎 ¡El LED se enciende y se apaga solo!',
    porque: 'Sin la resistencia, cuando no presionas, el pin 2 no está conectado a nada: queda <b>flotando</b> y lee "ruido", a veces 1 y a veces 0. La resistencia de 10 kΩ (llamada <b>pull-down</b>) lo mantiene en 0 hasta que presionas el botón.',
    escena: mesaBoton(mesaPrograma([['D13', 'led', 7]]), {pulldown: false}),
    codigo: 'void setup() {\n  pinMode(2, INPUT);\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  if (digitalRead(2) == HIGH) {\n    digitalWrite(13, HIGH);\n  } else {\n    digitalWrite(13, LOW);\n  }\n}\n',
    pistas: [
      'No cambies nada: solo inicia la simulación y mira el LED sin presionar el botón.',
      'Espera unos segundos: el cambio no es inmediato.',
      'Fíjate en la columna 25: sin la resistencia, no hay nada que la conecte a GND cuando sueltas el botón.',
    ],
  },
  {
    id: '5-5', mundo: 5, titulo: 'Al revés: INPUT_PULLUP', programa: true, inicio: 'texto', verRedes: true,
    mision: 'Otra forma de conectar el botón: entre el pin 2 y <b>GND</b>, sin resistencia, usando <b>INPUT_PULLUP</b>. Así el pin lee 1 cuando <b>no</b> presionas y 0 cuando presionas. El programa tiene un error: el LED hace lo contrario de lo que debería. ¡Corrígelo!',
    objetivos: ['Al presionar, el LED se enciende', 'Al soltar, el LED se apaga'],
    meta: {pulsador: true},
    escena: mesaBoton(mesaPrograma([['D13', 'led', 7]]), {pullup: true}),
    codigo: 'void setup() {\n  pinMode(2, INPUT_PULLUP); // resistencia interna hacia 5V\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  if (digitalRead(2) == HIGH) {\n    digitalWrite(13, HIGH);\n  } else {\n    digitalWrite(13, LOW);\n  }\n}\n',
    pistas: [
      'Con INPUT_PULLUP, presionar el botón hace que el pin lea LOW (0), no HIGH.',
      'Solo hay que cambiar una palabra en la condición del if.',
      'Cambia "digitalRead(2) == HIGH" por "digitalRead(2) == LOW".',
    ],
  },
  {
    id: '5-6', mundo: 5, titulo: 'Desafío final: interruptor', programa: true, inicio: 'texto', verRedes: true,
    mision: 'Haz un interruptor: presionas y sueltas una vez → el LED <b>se queda encendido</b>; presionas y sueltas otra vez → <b>se queda apagado</b>. Necesitas una variable que recuerde si el LED está encendido.',
    objetivos: ['Cada vez que presionas y sueltas, el LED cambia', 'El LED se queda así hasta la próxima vez'],
    meta: {conmutar: true},
    escena: mesaBoton(mesaPrograma([['D13', 'led', 7]])),
    codigo: 'bool encendido = false;   // ¿el LED está encendido?\nint anterior = LOW;        // cómo estaba el botón antes\n\nvoid setup() {\n  pinMode(2, INPUT);\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  int ahora = digitalRead(2);\n  // Completa aquí: si el botón se acaba de presionar (antes LOW y ahora HIGH), cambia "encendido"\n\n  anterior = ahora;\n  digitalWrite(13, encendido);\n}\n',
    pistas: [
      'El botón "se acaba de presionar" cuando antes estaba en LOW y ahora está en HIGH.',
      'Para cambiar una variable bool al valor contrario se usa: encendido = !encendido;',
      'Escribe en el espacio marcado: if (anterior == LOW && ahora == HIGH) { encendido = !encendido; }',
    ],
  },
  {
    id: '5-7', mundo: 5, extra: true, titulo: '⭐ La caja fuerte', programa: true, inicio: 'texto', verRedes: true,
    mision: 'Reto extra: una caja fuerte con clave. El LED (pin 13) se enciende recién cuando presionas el botón <b>3 veces</b>. Cuenta cada presión <b>una sola vez</b>: aunque mantengas el botón apretado, es una sola presión.',
    objetivos: ['Presiones 1 y 2: el LED sigue apagado', 'Presión 3: el LED se enciende y se queda encendido'],
    meta: {contador: 3},
    escena: mesaBoton(mesaPrograma([['D13', 'led', 7]])),
    codigo: 'int cuenta = 0;          // cuántas veces se presionó el botón\nint anterior = LOW;      // cómo estaba el botón antes\n\nvoid setup() {\n  pinMode(2, INPUT);\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  int ahora = digitalRead(2);\n  // Completa: si el botón se acaba de presionar, suma 1 a la cuenta\n\n  // Completa: si la cuenta llegó a 3, enciende el LED\n\n  anterior = ahora;\n}\n',
    pistas: [
      'El botón "se acaba de presionar" cuando antes estaba en LOW y ahora está en HIGH, como en el desafío del interruptor.',
      'Para sumar 1 a la cuenta: cuenta++;',
      'if (anterior == LOW && ahora == HIGH) { cuenta++; }   y debajo:   if (cuenta >= 3) { digitalWrite(13, HIGH); }',
    ],
  },
  {
    id: '5-8', mundo: 5, extra: true, titulo: '⭐ Luz intermitente', programa: true, verRedes: true,
    mision: 'Reto extra: como la luz direccional de un carro. Mientras mantienes presionado el botón (pin 2), el LED (pin 13) <b>parpadea</b>; cuando lo sueltas, el LED se queda <b>apagado</b>.',
    objetivos: ['Botón presionado: el LED parpadea', 'Botón suelto: el LED apagado'],
    meta: {parpadeoPresionado: true},
    escena: mesaBoton(mesaPrograma([['D13', 'led', 7]])), bloques: {},
    pistas: [
      'Usa "si … hacer … si no" con la condición leer pin digital 2 = 1.',
      'En "hacer" va un parpadeo completo: ALTO, esperar 250, BAJO, esperar 250.',
      'En "si no": poner pin 13 en BAJO. Todo dentro de "repetir siempre".',
    ],
  },
  {
    id: '5-9', mundo: 5, extra: true, titulo: '⭐ Luz de escalera', programa: true, verRedes: true,
    mision: 'Reto extra: como la luz de las escaleras de un edificio. Al presionar el botón una vez, el LED (pin 13) se enciende y se queda encendido <b>3 segundos</b>; después se apaga solo.',
    objetivos: ['Sin presionar: LED apagado', 'Al presionar: encendido 3 segundos', 'Después se apaga solo'],
    meta: {temporizador: 3000},
    escena: mesaBoton(mesaPrograma([['D13', 'led', 7]])), bloques: {},
    pistas: [
      'Si el botón está presionado: encender, esperar y apagar.',
      'Tres segundos son 3000 milisegundos.',
      'si (leer pin digital 2 = 1) hacer: poner pin 13 en ALTO → esperar 3000 → poner pin 13 en BAJO.',
    ],
  },
  {
    id: '5-10', mundo: 5, extra: true, titulo: '⭐ Contador de visitas', programa: true, inicio: 'texto', verRedes: true,
    mision: 'Reto extra: cuenta cuántas personas entran a una tienda. Cada vez que presionas el botón, el número aumenta en 1 y se escribe en el <b>monitor</b>: 1, 2, 3… Presiona <b>5 veces</b>.',
    objetivos: ['Cada presión suma 1', 'El monitor muestra 1, 2, 3, 4 y 5'],
    meta: {cuentaSerial: 5},
    escena: mesaBoton(mesaPrograma([['D13', 'led', 7]])),
    codigo: 'int visitas = 0;\nint anterior = LOW;\n\nvoid setup() {\n  pinMode(2, INPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int ahora = digitalRead(2);\n  if (anterior == LOW && ahora == HIGH) {\n    // Completa: suma 1 a las visitas y escribe el número en el monitor\n\n  }\n  anterior = ahora;\n}\n',
    pistas: [
      'Todo va dentro del if, que solo se cumple en el momento en que presionas.',
      'Primero suma 1: visitas++;   y después escríbelo en el monitor.',
      'Dentro del if escribe: visitas++;   y en la línea siguiente:   Serial.println(visitas);',
    ],
  },

  // ================= MUNDO 6: Sonido (buzzer) =================
  {
    id: '6-1', mundo: 6, titulo: '¡Que suene!', ficha: ['buzzer'], tutorial: true, interactivo: true, verRedes: true,
    mision: 'Conecta el <b>buzzer</b> para que suene: su pata <b>+</b> hacia el pin 5V y su pata <b>−</b> hacia GND. Activa el sonido con el botón 🔊 de la mesa si quieres escucharlo.',
    objetivos: ['El buzzer suena'],
    meta: {sonido: true},
    paleta: ['buzzer'],
    escena: {piezas: MESA_BASE},
    pistas: [
      'El buzzer necesita un camino completo, igual que el LED: 5V → buzzer → GND.',
      'La pata + es la de la izquierda (la que tiene el signo + rojo al lado).',
      {texto: 'Buzzer con la pata + en e10 y la − en e12. Cable de 5V a la columna 10 y cable de la columna 12 a GND.', resaltar: ['bb.e10', 'bb.e12', 'bb.a10', 'bb.a12', 'ard.5V', 'ard.GND2']},
    ],
  },
  {
    id: '6-2', mundo: 6, titulo: '🧪 Error a propósito: buzzer al revés', interactivo: true, verRedes: true,
    mision: 'Los cables ya están puestos. Experimento: coloca el buzzer <b>al revés</b>, con la pata <b>+</b> hacia GND (columna 12) y la <b>−</b> hacia 5V (columna 10). ¿Suena?',
    objetivos: ['Poner el buzzer al revés', 'Observar si suena'],
    meta: {error: 'buzzerInvertido'},
    exito: '🔎 ¡No suena!',
    porque: 'Este buzzer tiene <b>polaridad</b>, como el LED: por dentro tiene un circuito que solo funciona si la corriente entra por la pata +. Al revés, se queda en silencio (y no se daña).',
    paleta: ['buzzer'],
    escena: {piezas: MESA_BASE, cables: [{desde: 'ard.5V', hasta: 'bb.a10', color: '#E53935', carril: 300}, {desde: 'bb.a12', hasta: 'ard.GND2', color: '#212121', carril: 312}]},
    pistas: [
      'Gira el buzzer dos veces con R: así la pata + queda a la derecha.',
      'La pata + tiene que quedar en la columna 12 y la − en la columna 10.',
      {texto: 'Pata + en e12 y pata − en e10.', resaltar: ['bb.e10', 'bb.e12']},
    ],
  },
  {
    id: '6-3', mundo: 6, titulo: 'Pitidos', programa: true, verRedes: true,
    mision: 'El buzzer está conectado al <b>pin 8</b>. Haz que dé pitidos cortos: encender el pin 8, esperar 200 ms, apagarlo y esperar 800 ms, una y otra vez.',
    objetivos: ['Se escuchan al menos 3 pitidos'],
    meta: {pitidos: 3},
    escena: mesaPrograma([['D8', 'buzzer', 7]]), bloques: {},
    pistas: [
      'Es igual que hacer parpadear un LED, pero con el pin 8.',
      'Dentro de "repetir siempre": poner pin 8 en ALTO, esperar, poner pin 8 en BAJO, esperar.',
      'Usa 200 milisegundos en la primera espera y 800 en la segunda.',
    ],
  },
  {
    id: '6-4', mundo: 6, titulo: 'Notas musicales', programa: true,
    mision: 'Con el bloque <b>sonar en pin … la nota de … Hz</b> (categoría Sonido) puedes elegir la nota. Haz sonar <b>3 notas diferentes</b>, una después de otra. Do = 262, Re = 294, Mi = 330.',
    objetivos: ['Suenan 3 notas diferentes'],
    meta: {notas: 3},
    escena: mesaPrograma([['D8', 'buzzer', 7]]), bloques: {},
    pistas: [
      'Cada nota necesita dos bloques: "sonar en pin 8 la nota de …" y "esperar …".',
      'Cambia el número de cada nota: 262, 294 y 330.',
      'Al final puedes agregar "silenciar pin 8" y una espera, para que se note dónde empieza otra vez.',
    ],
  },
  {
    id: '6-5', mundo: 6, titulo: 'Alarma con botón', programa: true, verRedes: true,
    mision: 'Arma una alarma: el buzzer (pin 8) debe sonar <b>solo mientras presionas</b> el botón (pin 2).',
    objetivos: ['Al presionar, el buzzer suena', 'Al soltar, se calla'],
    meta: {alarma: true},
    escena: mesaBoton(mesaPrograma([['D8', 'buzzer', 7]])), bloques: {},
    pistas: [
      'Es como el nivel "El programa escucha al botón", pero en vez del LED usas el buzzer.',
      'Si leer pin digital 2 = 1 → poner pin 8 en ALTO (o sonar una nota). Si no → poner pin 8 en BAJO (o silenciar).',
      'Usa el bloque "si … hacer … si no" y pon todo dentro de "repetir siempre".',
    ],
  },
  {
    id: '6-6', mundo: 6, titulo: 'Desafío final: la escala', programa: true,
    mision: 'Toca la escala musical subiendo: <b>Do (262), Re (294), Mi (330), Fa (349), Sol (392)</b>. Puedes usar bloques o código: <code>tone(8, 262); delay(300);</code>',
    objetivos: ['Suenan 5 notas, de la más grave a la más aguda'],
    meta: {escala: 5},
    escena: mesaPrograma([['D8', 'buzzer', 7]]), bloques: {},
    pistas: [
      'Cada nota: sonar la nota y esperar un poco (por ejemplo, 300 ms).',
      'El orden importa: 262, 294, 330, 349, 392.',
      'En código: tone(8, 262); delay(300); tone(8, 294); delay(300); … y así hasta 392.',
    ],
  },
  {
    id: '6-7', mundo: 6, extra: true, titulo: '⭐ Sirena', programa: true, inicio: 'texto',
    mision: 'Reto extra: haz una <b>sirena</b> con el buzzer (pin 8): el sonido sube poco a poco de 400 Hz a 1000 Hz y después baja poco a poco, sin parar. El primer <b>for</b> ya sube el tono: agrega otro que lo baje.',
    objetivos: ['El tono sube poco a poco', 'Y después baja poco a poco'],
    meta: {sirena: true},
    escena: mesaPrograma([['D8', 'buzzer', 7]]),
    codigo: 'void setup() {\n}\n\nvoid loop() {\n  for (int f = 400; f <= 1000; f = f + 10) {   // sube\n    tone(8, f);\n    delay(10);\n  }\n  // Escribe aquí otro for que baje de 1000 a 400\n\n}\n',
    pistas: [
      'El segundo for es como el primero, pero al revés.',
      'Empieza en 1000, sigue mientras f >= 400 y resta 10 cada vez.',
      'for (int f = 1000; f >= 400; f = f - 10) { tone(8, f); delay(10); }',
    ],
  },
  {
    id: '6-8', mundo: 6, extra: true, titulo: '⭐ Estrellita', programa: true, inicio: 'texto',
    mision: 'Reto extra: toca el comienzo de <b>"Estrellita, ¿dónde estás?"</b>: Do Do Sol Sol La La Sol — Fa Fa Mi Mi Re Re Do. La función <b>nota()</b> ya hace sonar una nota: completa la melodía en el loop.',
    objetivos: ['Suena la melodía completa, en orden'],
    meta: {melodia: [262, 262, 392, 392, 440, 440, 392, 349, 349, 330, 330, 294, 294, 262]},
    escena: mesaPrograma([['D8', 'buzzer', 7]]),
    codigo: '// Do = 262, Re = 294, Mi = 330, Fa = 349, Sol = 392, La = 440\n\nvoid nota(int frecuencia, int duracion) {\n  tone(8, frecuencia);\n  delay(duracion);\n  noTone(8);\n  delay(50);         // un silencio cortito para separar las notas\n}\n\nvoid setup() {\n}\n\nvoid loop() {\n  nota(262, 400);    // Do\n  nota(262, 400);    // Do\n  // Completa la melodía\n\n  delay(1500);\n}\n',
    pistas: [
      'Cada nota de la canción es una línea nota(frecuencia, 400); en el orden de la canción.',
      'Después de los dos Do vienen Sol, Sol (392), La, La (440) y Sol (392, un poco más largo: 800).',
      'Segunda parte: Fa, Fa (349), Mi, Mi (330), Re, Re (294) y Do (262, más largo).',
    ],
  },
  {
    id: '6-9', mundo: 6, extra: true, titulo: '⭐ El timbre de la casa', programa: true, verRedes: true,
    mision: 'Reto extra: programa un timbre. Al presionar el botón (pin 2), el buzzer (pin 8) hace <b>"din-don"</b>: primero una nota aguda (659 Hz) y luego una más grave (523 Hz). Después se calla.',
    objetivos: ['Al presionar: "din" (agudo) y después "don" (grave)', 'Después, silencio'],
    meta: {timbre: true},
    escena: mesaBoton(mesaPrograma([['D8', 'buzzer', 7]])), bloques: {},
    pistas: [
      'Usa "si leer pin digital 2 = 1" y pon las dos notas adentro.',
      'Cada nota: "sonar en pin 8 la nota de …" y "esperar …". Al final, "silenciar pin 8".',
      'si (leer pin digital 2 = 1): sonar 659 → esperar 400 → sonar 523 → esperar 600 → silenciar pin 8.',
    ],
  },
  {
    id: '6-10', mundo: 6, extra: true, titulo: '⭐ Theremin', programa: true, verRedes: true,
    mision: 'Reto extra: el <b>theremin</b> es un instrumento que se toca sin tocarlo. Haz uno con la perilla: el buzzer (pin 8) suena todo el tiempo y la perilla cambia la nota: abajo grave, arriba aguda. Pista: convierte lo que lees de A0 en una frecuencia.',
    objetivos: ['El buzzer suena sin parar', 'Perilla abajo: nota grave', 'Perilla arriba: nota aguda'],
    meta: {theremin: true},
    escena: mesaPot(mesaPrograma([['D8', 'buzzer', 7]])), bloques: {},
    pistas: [
      'Dentro de "repetir siempre" usa "sonar en pin 8 la nota de …".',
      'En el hueco de la frecuencia pon "convertir (leer pin analógico A0) de 0–1023 a 0–2000".',
      'Para que la nota nunca baje de 200 Hz, súmale 200 con el bloque de suma (Números).',
    ],
  },

  // ================= MUNDO 7: Señal analógica (potenciómetro) =================
  {
    id: '7-1', mundo: 7, titulo: 'Leer la perilla', ficha: ['potenciometro'], tutorial: true, programa: true, inicio: 'texto', verRedes: true,
    mision: 'El potenciómetro está conectado a 5V, a GND y su pata del centro al pin <b>A0</b>. Este programa escribe en el <b>monitor</b> el valor que lee. Inicia la simulación y <b>gira la perilla</b> (arrástrala hacia arriba y hacia abajo) hasta los dos extremos.',
    objetivos: ['Ver en el monitor un número cerca de 0', 'Ver en el monitor un número cerca de 1023'],
    meta: {serial: true},
    escena: mesaPot(mesaPrograma([])),
    codigo: 'void setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int valor = analogRead(A0);  // lee la perilla: de 0 a 1023\n  Serial.println(valor);       // lo escribe en el monitor\n  delay(200);\n}\n',
    pistas: [
      'El monitor es el recuadro negro de abajo, en el panel del código.',
      'Haz clic en la perilla blanca del potenciómetro y arrastra hacia arriba (sube) o hacia abajo (baja).',
      'Gira hasta el fondo hacia abajo (cerca de 0) y luego hasta arriba (cerca de 1023).',
    ],
  },
  {
    id: '7-2', mundo: 7, titulo: 'Brillo con perilla', programa: true, verRedes: true,
    mision: 'Ahora el LED está en el pin <b>~9</b>. Haz que la perilla controle su brillo: en "repetir siempre", <b>poner pin ~9 al valor</b> (convertir (leer pin analógico A0) de 0–1023 a 0–255).',
    objetivos: ['Con la perilla abajo, el LED casi apagado', 'Con la perilla arriba, el LED brillante', 'En el medio, brillo medio'],
    meta: {perillaBrillo: true},
    escena: mesaPot(mesaPrograma([['D9', 'led', 7]])), bloques: {},
    pistas: [
      'Necesitas tres bloques, uno dentro de otro: "poner pin ~9 al valor", "convertir" y "leer pin analógico A0".',
      'El bloque "convertir … de 0–1023 a 0–255" está en Entradas.',
      'Encaja "leer pin analógico A0" dentro de "convertir", y "convertir" dentro de "poner pin ~9 al valor".',
    ],
  },
  {
    id: '7-3', mundo: 7, titulo: '🧪 Error a propósito: sin convertir', programa: true, inicio: 'texto',
    mision: 'Experimento: en la última línea cambia <b>analogWrite(9, brillo)</b> por <b>analogWrite(9, valor)</b>, sin convertir. Luego inicia la simulación y gira la perilla lentamente de abajo hacia arriba.',
    objetivos: ['Usar el valor sin convertir', 'Observar el LED mientras giras la perilla'],
    meta: {error: 'sinMap'},
    exito: '🔎 ¡El LED se apaga de golpe aunque sigues subiendo la perilla!',
    porque: 'analogWrite solo entiende valores de <b>0 a 255</b>. La perilla da valores hasta <b>1023</b>; cuando el número pasa de 255, "da la vuelta" y vuelve a empezar desde 0. Por eso el LED se apaga y se enciende varias veces. <b>map()</b> convierte la escala de 0–1023 a 0–255.',
    escena: mesaPot(mesaPrograma([['D9', 'led', 7]])),
    codigo: 'void setup() {\n  pinMode(9, OUTPUT);\n}\n\nvoid loop() {\n  int valor = analogRead(A0);                // de 0 a 1023\n  int brillo = map(valor, 0, 1023, 0, 255);  // de 0 a 255\n  analogWrite(9, brillo);\n}\n',
    pistas: [
      'Solo hay que cambiar una palabra de la última línea del loop.',
      'Deja la línea así: analogWrite(9, valor);',
      'Después gira la perilla despacio desde abajo: fíjate qué pasa un poco antes de llegar a un cuarto.',
    ],
  },
  {
    id: '7-4', mundo: 7, titulo: 'Interruptor de perilla', programa: true, verRedes: true,
    mision: 'El LED está en el pin 13. Haz que se encienda solo cuando la perilla pase de la mitad: <b>si</b> leer pin analógico A0 <b>&gt; 512</b> → poner pin 13 en ALTO; <b>si no</b> → BAJO.',
    objetivos: ['Perilla arriba de la mitad: LED encendido', 'Perilla abajo de la mitad: LED apagado'],
    meta: {umbral: true},
    escena: mesaPot(mesaPrograma([['D13', 'led', 7]])), bloques: {},
    pistas: [
      'Usa "si … hacer … si no" con una comparación: leer pin analógico A0 > 512.',
      'El valor de la perilla va de 0 a 1023: 512 es la mitad.',
      'Después de iniciar, gira la perilla arriba y abajo de la mitad para probar.',
    ],
  },
  {
    id: '7-5', mundo: 7, titulo: 'Desafío final: velocidad con perilla', programa: true,
    mision: 'Haz que el LED (pin 13) parpadee y que la perilla controle la <b>velocidad</b>: perilla abajo = parpadeo rápido, perilla arriba = parpadeo lento. Pista: usa lo que lees de A0 como el tiempo de espera.',
    objetivos: ['El LED parpadea', 'La perilla cambia la velocidad'],
    meta: {parpadeoVariable: true},
    escena: mesaPot(mesaPrograma([['D13', 'led', 7]])), bloques: {},
    pistas: [
      'Es el parpadeo de siempre, pero en vez de "esperar 1000" usas "esperar (leer pin analógico A0)".',
      'Encaja "leer pin analógico A0" dentro del hueco del número de cada "esperar".',
      'Gira la perilla mientras parpadea: abajo debe ir rápido y arriba, lento.',
    ],
  },
  {
    id: '7-6', mundo: 7, extra: true, titulo: '⭐ Medidor de nivel', programa: true, verRedes: true,
    mision: 'Reto extra: un medidor con 3 LEDs, como el de la batería de un celular. Con la perilla abajo, ninguno encendido. Si la lectura de A0 pasa de <b>256</b>, se enciende el verde (pin 11); si pasa de <b>512</b>, también el amarillo (pin 12); si pasa de <b>768</b>, también el rojo (pin 13).',
    objetivos: ['Menos de 256: ningún LED', 'Más de 256: 1 LED', 'Más de 512: 2 LEDs', 'Más de 768: 3 LEDs'],
    meta: {zonas: [
      {de: 0, a: 0.18, n: [0, 0], txt: 'con la perilla abajo (menos de 256) no debe haber LEDs encendidos'},
      {de: 0.3, a: 0.45, n: [1, 1], txt: 'entre 256 y 512 debe haber 1 LED encendido'},
      {de: 0.55, a: 0.7, n: [2, 2], txt: 'entre 512 y 768 debe haber 2 LEDs encendidos'},
      {de: 0.82, a: 1, n: [3, 3], txt: 'con la perilla arriba (más de 768) deben estar los 3 LEDs encendidos'},
    ]},
    escena: mesaPot(mesaPrograma([['D11', 'led_verde', 3], ['D12', 'led_amarillo', 9], ['D13', 'led', 15]]), 26), bloques: {},
    pistas: [
      'Cada LED tiene su propia condición. Usa tres bloques "si … hacer … si no", uno por cada LED.',
      'Verde: si leer pin analógico A0 > 256 → pin 11 ALTO, si no → BAJO. Haz lo mismo con el amarillo (512, pin 12) y el rojo (768, pin 13).',
      'Pon los tres bloques "si" uno debajo del otro dentro de "repetir siempre" (no uno dentro de otro).',
    ],
  },
  {
    id: '7-7', mundo: 7, extra: true, titulo: '⭐ El voltímetro', programa: true, inicio: 'texto',
    mision: 'Reto extra: el pin A0 da un número de 0 a 1023, pero en realidad está midiendo un <b>voltaje</b> de 0 a 5 V. Convierte la lectura a voltios y escríbela en el monitor (por ejemplo, 2.50). Después gira la perilla de punta a punta.',
    objetivos: ['El monitor muestra voltios, de 0 a 5', 'Con decimales'],
    meta: {serial: [0.5, 4.5], serialTope: 5.5, decimales: true},
    fallaTope: 'Los números pasan de 5: todavía no son voltios. Multiplica la lectura por 5.0 y divídela entre 1023.0.',
    escena: mesaPot(mesaPrograma([])),
    codigo: 'void setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int valor = analogRead(A0);    // de 0 a 1023\n  float voltaje = valor;         // Completa: conviértelo a voltios (de 0 a 5)\n  Serial.println(voltaje);\n  delay(200);\n}\n',
    pistas: [
      '1023 corresponde a 5 voltios, y 0 a 0 voltios.',
      'Es una regla de tres: voltaje = valor × 5 ÷ 1023.',
      'float voltaje = valor * 5.0 / 1023.0;',
    ],
  },
  {
    id: '7-8', mundo: 7, extra: true, titulo: '⭐ Termómetro de colores', programa: true, verRedes: true,
    mision: 'Reto extra: imagina que la perilla es la temperatura de un horno. Menos de <b>341</b>: solo el LED <b>verde</b> (pin 10). De 341 a 681: solo el <b>amarillo</b> (pin 11). <b>682</b> o más: solo el <b>rojo</b> (pin 12). Siempre una sola luz.',
    objetivos: ['Perilla abajo: verde', 'Perilla al medio: amarillo', 'Perilla arriba: rojo', 'Una sola luz a la vez'],
    meta: {zonas: [
      {de: 0, a: 0.28, tipos: ['led_verde'], txt: 'con la perilla abajo debe estar encendido solo el verde'},
      {de: 0.38, a: 0.62, tipos: ['led_amarillo'], txt: 'con la perilla al medio debe estar encendido solo el amarillo'},
      {de: 0.72, a: 1, tipos: ['led'], txt: 'con la perilla arriba debe estar encendido solo el rojo'},
    ]},
    escena: mesaPot(mesaPrograma([['D12', 'led', 7], ['D11', 'led_amarillo', 13], ['D10', 'led_verde', 19]]), 26), bloques: {},
    pistas: [
      'Usa un "si … si no si … si no": haz clic en el engranaje del bloque "si" para agregarle partes.',
      'si A0 < 341 → verde; si no, si A0 < 682 → amarillo; si no → rojo.',
      'En cada parte enciende una luz y apaga las otras dos.',
    ],
  },
  {
    id: '7-9', mundo: 7, extra: true, titulo: '⭐ Al revés', programa: true, inicio: 'texto', verRedes: true,
    mision: 'Reto extra: haz que la perilla funcione <b>al revés</b>: perilla abajo → LED (pin ~9) al máximo; perilla arriba → LED casi apagado. Solo hay que cambiar la conversión.',
    objetivos: ['Perilla abajo: LED muy brillante', 'Perilla arriba: LED casi apagado', 'En el medio: brillo medio'],
    meta: {perillaBrilloInverso: true},
    escena: mesaPot(mesaPrograma([['D9', 'led', 7]])),
    codigo: 'void setup() {\n  pinMode(9, OUTPUT);\n}\n\nvoid loop() {\n  int valor = analogRead(A0);\n  int brillo = map(valor, 0, 1023, 0, 255);\n  analogWrite(9, brillo);\n}\n',
    pistas: [
      'map(valor, desde_min, desde_max, hasta_min, hasta_max). ¿Qué pasa si cambias el orden de los dos últimos números?',
      'Con map(valor, 0, 1023, 255, 0), cuando valor es 0 el resultado es 255.',
      'int brillo = map(valor, 0, 1023, 255, 0);',
    ],
  },
  {
    id: '7-10', mundo: 7, extra: true, titulo: '⭐ Tanque lleno', programa: true, verRedes: true,
    mision: 'Reto extra: la perilla es el nivel de agua de un tanque. Cuando la lectura pasa de <b>900</b>, el buzzer (pin 8) suena para avisar que el agua se va a desbordar; si no, se queda en silencio.',
    objetivos: ['Más de 900: el buzzer suena', 'Menos de 900: silencio'],
    meta: {umbral: {bajo: 0.8, alto: 0.92}, salida: 'buzzer'},
    fallaMeta: 'El buzzer debe sonar solo cuando la perilla pasa de 900 (casi arriba del todo) y callarse por debajo.',
    escena: mesaPot(mesaPrograma([['D8', 'buzzer', 7]])), bloques: {},
    pistas: [
      'Usa "si … hacer … si no" con la comparación leer pin analógico A0 > 900.',
      'En "hacer": poner pin 8 en ALTO. En "si no": poner pin 8 en BAJO.',
      'Para probar, sube la perilla casi hasta el tope (más del 88 %) y después bájala.',
    ],
  },

  // ================= MUNDO 8: Brillo y colores (PWM y LED RGB) =================
  {
    id: '8-1', mundo: 8, titulo: 'Medio brillo', ficha: ['pwm'], tutorial: true, programa: true, verRedes: true,
    mision: 'El LED está en el pin <b>~9</b>. El bloque <b>poner pin ~9 al valor</b> controla el brillo: 0 = apagado, 255 = máximo. Ahora está en 255: cámbialo para que el LED quede a <b>medio brillo</b>.',
    objetivos: ['El LED queda encendido a medias'],
    meta: {brilloMedio: true},
    escena: mesaPrograma([['D9', 'led', 7]]), bloques: {loop: [['pwm', 9, 255]]},
    pistas: ['Solo hay que cambiar el número del bloque.', 'La mitad de 255 es más o menos 128.', 'Escribe 100 o 128 en el bloque "poner pin ~9 al valor".'],
  },
  {
    id: '8-2', mundo: 8, titulo: '🧪 Error a propósito: pin sin ~', programa: true, inicio: 'texto', verRedes: true,
    mision: 'Este programa debería encender el LED <b>poco a poco</b>, pero el LED está en el pin <b>8</b>, que no tiene el símbolo ~. Inicia la simulación y observa el LED unos segundos.',
    objetivos: ['Observar cómo se enciende el LED'],
    meta: {error: 'sinPWM'},
    exito: '🔎 ¡Se enciende y se apaga de golpe, sin pasos intermedios!',
    porque: 'Solo los pines con <b>~</b> (3, 5, 6, 9, 10 y 11) pueden hacer <b>PWM</b>: encender y apagar el pin muy rápido para que el LED se vea a medias. En los demás pines, analogWrite solo apaga (valores menores que 128) o enciende del todo (128 o más).',
    escena: mesaPrograma([['D8', 'led', 7]]),
    codigo: 'void setup() {\n  pinMode(8, OUTPUT);\n}\n\nvoid loop() {\n  for (int b = 0; b <= 255; b++) {   // sube el brillo\n    analogWrite(8, b);\n    delay(4);\n  }\n  for (int b = 255; b >= 0; b--) {   // baja el brillo\n    analogWrite(8, b);\n    delay(4);\n  }\n}\n',
    pistas: ['No cambies nada: solo inicia la simulación y mira el LED.', 'Fíjate si el LED pasa por brillos intermedios o salta de apagado a encendido.', 'Compara con un pin que tenga ~, como el 9.'],
  },
  {
    id: '8-3', mundo: 8, titulo: 'El LED que respira', programa: true, inicio: 'texto', verRedes: true,
    mision: 'El primer <b>for</b> sube el brillo del LED (pin ~9) poco a poco. Completa el programa con otro <b>for</b> que lo <b>baje</b> poco a poco, para que el LED "respire".',
    objetivos: ['El brillo sube poco a poco', 'Y después baja poco a poco'],
    meta: {fade: true},
    escena: mesaPrograma([['D9', 'led', 7]]),
    codigo: 'void setup() {\n  pinMode(9, OUTPUT);\n}\n\nvoid loop() {\n  for (int b = 0; b <= 255; b++) {   // sube el brillo\n    analogWrite(9, b);\n    delay(4);\n  }\n  // Escribe aquí otro for que baje el brillo de 255 a 0\n\n}\n',
    pistas: ['El segundo for es casi igual al primero, pero al revés.', 'Empieza en 255, sigue mientras b >= 0 y resta 1 cada vez (b--).', 'for (int b = 255; b >= 0; b--) { analogWrite(9, b); delay(4); }'],
  },
  {
    id: '8-4', mundo: 8, titulo: 'El LED RGB', ficha: ['rgb'], programa: true, verRedes: true,
    mision: 'Este LED tiene <b>tres colores</b> dentro: rojo (pin ~11), verde (pin ~10) y azul (pin ~9). Haz que se encienda de color <b>rojo</b>.',
    objetivos: ['El LED RGB se ve rojo'],
    meta: {rgb: [1, 0, 0]},
    escena: mesaRGB(), bloques: {},
    pistas: ['Cada color tiene su propio pin: el rojo es el 11.', 'Usa "poner pin 11 en ALTO" dentro de "al iniciar".', 'Deja apagados los pines 10 y 9 (verde y azul).'],
  },
  {
    id: '8-5', mundo: 8, titulo: 'Mezcla de colores', programa: true, verRedes: true,
    mision: 'Los colores se <b>mezclan</b>: rojo + azul = <b>morado</b>, rojo + verde = amarillo. Haz que el LED RGB se vea <b>morado</b>.',
    objetivos: ['El LED RGB se ve morado'],
    meta: {rgb: [1, 0, 1]},
    escena: mesaRGB(), bloques: {},
    pistas: ['Morado = rojo + azul.', 'Enciende el pin 11 (rojo) y el pin 9 (azul).', 'El pin 10 (verde) debe quedar apagado.'],
  },
  {
    id: '8-6', mundo: 8, titulo: 'Desafío final: arcoíris', programa: true, verRedes: true,
    mision: 'Haz que el LED RGB cambie de color sin parar: <b>rojo → verde → azul</b>, y otra vez rojo. Un color a la vez, con una espera entre cada uno.',
    objetivos: ['Rojo → verde → azul → rojo…'],
    meta: {secuenciaRGB: [[1, 0, 0], [0, 1, 0], [0, 0, 1]]},
    escena: mesaRGB(), bloques: {},
    pistas: ['Es como el semáforo programado, pero con los tres colores del mismo LED.', 'Para cada color: enciende su pin, espera, apágalo.', 'Pin 11 ALTO, esperar, pin 11 BAJO, pin 10 ALTO, esperar, pin 10 BAJO, pin 9 ALTO, esperar, pin 9 BAJO.'],
  },
  {
    id: '8-7', mundo: 8, extra: true, titulo: '⭐ Luz blanca', programa: true, verRedes: true,
    mision: 'Reto extra: con los tres colores de luz juntos (rojo + verde + azul) se forma la luz <b>blanca</b>. Haz que el LED RGB se vea blanco.',
    objetivos: ['El LED RGB se ve blanco'],
    meta: {rgb: [1, 1, 1]},
    escena: mesaRGB(), bloques: {},
    pistas: ['Blanco = rojo + verde + azul, los tres a la vez.', 'Enciende los pines 11, 10 y 9.', 'Tres bloques "poner pin … en ALTO" dentro de "al iniciar": 11, 10 y 9.'],
  },
  {
    id: '8-8', mundo: 8, extra: true, titulo: '⭐ Mezcla con perilla', programa: true, inicio: 'texto', verRedes: true,
    mision: 'Reto extra: la perilla mezcla los colores. Perilla abajo: <b>azul</b>; al medio: <b>morado</b> (rojo + azul); arriba: <b>rojo</b>. El rojo ya sube con la perilla: haz que el azul baje.',
    objetivos: ['Perilla abajo: azul', 'Perilla al medio: morado', 'Perilla arriba: rojo'],
    meta: {rgbPerilla: {bajo: '001', medio: '101', alto: '100'}},
    escena: mesaPot(mesaRGB(), 26),
    codigo: 'void setup() {\n}\n\nvoid loop() {\n  int valor = analogRead(A0);\n  int rojo = map(valor, 0, 1023, 0, 255);   // sube con la perilla\n  int azul = 0;                               // Completa: que baje con la perilla\n  analogWrite(11, rojo);\n  analogWrite(9, azul);\n}\n',
    pistas: [
      'El azul tiene que hacer lo contrario que el rojo: 255 con la perilla abajo y 0 con la perilla arriba.',
      'En map(), cambia el orden de los dos últimos números.',
      'int azul = map(valor, 0, 1023, 255, 0);',
    ],
  },
  {
    id: '8-9', mundo: 8, extra: true, titulo: '⭐ Arcoíris completo', programa: true, verRedes: true,
    mision: 'Reto extra: haz que el LED RGB pase por <b>seis colores</b> y vuelva a empezar: <b>rojo → amarillo → verde → celeste → azul → morado</b>. Recuerda: amarillo = rojo + verde, celeste = verde + azul y morado = rojo + azul.',
    objetivos: ['Rojo → amarillo → verde → celeste → azul → morado → rojo…'],
    meta: {secuenciaRGB: [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1], [1, 0, 1]]},
    escena: mesaRGB(), bloques: {},
    pistas: [
      'Fíjate en que de un color al siguiente solo cambia un pin: de rojo a amarillo se enciende el verde; de amarillo a verde se apaga el rojo…',
      'Entonces cada paso es: un solo "poner pin" y un "esperar 500".',
      'rojo ALTO, esperar · verde ALTO, esperar · rojo BAJO, esperar · azul ALTO, esperar · verde BAJO, esperar · rojo ALTO, esperar · azul BAJO.',
    ],
  },
  {
    id: '8-10', mundo: 8, extra: true, titulo: '⭐ Cambia con el botón', programa: true, inicio: 'texto', verRedes: true,
    mision: 'Reto extra: cada vez que presionas el botón (pin 2), el LED RGB cambia al color siguiente: <b>rojo → verde → azul → rojo…</b> El programa ya enciende el color según la variable <b>color</b>: completa la parte del botón.',
    objetivos: ['Cada presión cambia el color', 'Rojo → verde → azul → rojo…'],
    meta: {rgbBoton: true},
    escena: mesaBoton(mesaRGB()),
    codigo: 'int color = 0;           // 0 = rojo, 1 = verde, 2 = azul\nint anterior = LOW;\n\nvoid setup() {\n  pinMode(2, INPUT);\n  pinMode(11, OUTPUT);\n  pinMode(10, OUTPUT);\n  pinMode(9, OUTPUT);\n}\n\nvoid loop() {\n  int ahora = digitalRead(2);\n  // Completa: si el botón se acaba de presionar, pasa al color siguiente (después del 2 vuelve al 0)\n\n  anterior = ahora;\n  digitalWrite(11, color == 0);   // rojo\n  digitalWrite(10, color == 1);   // verde\n  digitalWrite(9, color == 2);    // azul\n}\n',
    pistas: [
      'El botón se acaba de presionar cuando antes estaba en LOW y ahora en HIGH.',
      'Dentro de ese if suma 1 a color; y si color llega a 3, vuelve a 0.',
      'if (anterior == LOW && ahora == HIGH) { color++; if (color > 2) { color = 0; } }',
    ],
  },

  // ================= MUNDO 9: Movimiento preciso (servomotor) =================
  {
    id: '9-1', mundo: 9, titulo: 'Conoce el servo', ficha: ['servo'], tutorial: true, programa: true,
    mision: 'El <b>servomotor</b> gira a un ángulo exacto, de 0° a 180°. Su señal está en el pin <b>9</b>. Ahora el programa lo pone en 90°: cámbialo para que gire a <b>180°</b>.',
    objetivos: ['El servo llega a 180°'],
    meta: {servo: [180]},
    escena: mesaServo({piezas: ARDUINO_SOLO.slice(), cables: []}), bloques: {setup: [['servo', 9, 90]]},
    pistas: ['Solo cambia el número del bloque "mover servo".', 'Los ángulos van de 0 a 180.', 'Escribe 180 en el bloque "mover servo del pin 9 a … grados".'],
  },
  {
    id: '9-2', mundo: 9, titulo: 'Ida y vuelta', programa: true,
    mision: 'Haz que el servo vaya a <b>0°</b>, espere, vaya a <b>180°</b>, espere, y así sin parar.',
    objetivos: ['El servo llega a 0°', 'El servo llega a 180°'],
    meta: {servo: [0, 180]},
    escena: mesaServo({piezas: ARDUINO_SOLO.slice(), cables: []}), bloques: {},
    pistas: ['Usa "repetir siempre" con dos bloques "mover servo" y dos "esperar".', 'El servo necesita tiempo para llegar: espera al menos 1000 ms.', 'mover a 0 → esperar 1000 → mover a 180 → esperar 1000.'],
  },
  {
    id: '9-3', mundo: 9, titulo: '🧪 Error a propósito: servo sin energía', programa: true, inicio: 'texto',
    mision: 'En este circuito el <b>cable rojo (5V)</b> del servo no está conectado. El programa sí le envía órdenes por el pin 9. Inicia la simulación: ¿se mueve?',
    objetivos: ['Observar el servo sin energía'],
    meta: {error: 'servoSinEnergia'},
    exito: '🔎 ¡No se mueve, aunque recibe la orden!',
    porque: 'El pin 9 solo envía la <b>señal</b> (la orden de a qué ángulo ir), pero el motor del servo necesita <b>energía</b>: el cable rojo a 5V y el marrón a GND. Sin energía, la orden llega pero no hay fuerza para moverse.',
    escena: mesaServo({piezas: ARDUINO_SOLO.slice(), cables: []}, {sinEnergia: true}),
    codigo: '#include <Servo.h>\nServo miServo;\n\nvoid setup() {\n  miServo.attach(9);   // la señal está en el pin 9\n}\n\nvoid loop() {\n  miServo.write(0);\n  delay(1000);\n  miServo.write(180);\n  delay(1000);\n}\n',
    pistas: ['No cambies nada: solo inicia la simulación.', 'Mira los cables del servo: ¿cuál falta?', 'Falta el cable rojo, el de la energía (5V).'],
  },
  {
    id: '9-4', mundo: 9, titulo: 'Servo con perilla', programa: true, verRedes: true,
    mision: 'Controla el servo con la perilla: <b>mover servo del pin 9 a</b> (convertir (leer pin analógico A0) de 0–1023 a 0–<b>180</b>).',
    objetivos: ['Perilla abajo: servo cerca de 0°', 'Perilla arriba: servo cerca de 180°'],
    meta: {servoPerilla: true},
    escena: mesaServo(mesaPot(mesaPrograma([]))), bloques: {},
    pistas: ['Es como el brillo con perilla, pero el valor final va de 0 a 180 (los ángulos del servo).', 'En el bloque "convertir", cambia el 255 por 180.', 'mover servo del pin 9 a (convertir (leer pin analógico A0) de 0–1023 a 0–180), dentro de "repetir siempre".'],
  },
  {
    id: '9-5', mundo: 9, titulo: 'Desafío final: la barrera', programa: true, verRedes: true,
    mision: 'Programa la barrera de un estacionamiento: mientras presionas el botón (pin 2), el servo sube a <b>90°</b>; al soltarlo, baja a <b>0°</b>.',
    objetivos: ['Al presionar: servo a 90°', 'Al soltar: servo a 0°'],
    meta: {servoBoton: true},
    escena: mesaServo(mesaBoton(mesaPrograma([]))), bloques: {},
    pistas: ['Usa "si … hacer … si no" con "leer pin digital 2 = 1".', 'En "hacer": mover servo a 90. En "si no": mover servo a 0.', 'Pon todo dentro de "repetir siempre" y presiona el botón un rato para que el servo alcance a llegar.'],
  },
  {
    id: '9-6', mundo: 9, extra: true, titulo: '⭐ En cámara lenta', programa: true, inicio: 'texto',
    mision: 'Reto extra: ahora el servo salta de 0° a 180° de golpe. Haz que vaya <b>despacio</b>: de 1 en 1 grado, esperando 15 ms en cada paso, y que vuelva igual de despacio. Usa un <b>for</b>.',
    objetivos: ['El servo va de 0° a 180° despacio', 'Y vuelve despacio'],
    meta: {servoLento: true},
    escena: mesaServo({piezas: ARDUINO_SOLO.slice(), cables: []}),
    codigo: '#include <Servo.h>\nServo miServo;\n\nvoid setup() {\n  miServo.attach(9);\n}\n\nvoid loop() {\n  miServo.write(0);\n  delay(1000);\n  miServo.write(180);    // Cámbialo: que llegue a 180 de 1 en 1 grado\n  delay(1000);\n}\n',
    pistas: [
      'Un for puede recorrer todos los ángulos: for (int a = 0; a <= 180; a++) { … }',
      'Dentro del for: miServo.write(a); delay(15);',
      'Para volver, otro for que empiece en 180 y reste: for (int a = 180; a >= 0; a--) { miServo.write(a); delay(15); }',
    ],
  },
  {
    id: '9-7', mundo: 9, extra: true, titulo: '⭐ Tres posiciones', programa: true,
    mision: 'Reto extra: haz que el servo pase por <b>0°</b>, <b>90°</b> y <b>180°</b>, esperando 1 segundo en cada posición, y que vuelva a empezar.',
    objetivos: ['El servo llega a 0°', 'El servo llega a 90°', 'El servo llega a 180°'],
    meta: {servo: [0, 90, 180]},
    escena: mesaServo({piezas: ARDUINO_SOLO.slice(), cables: []}), bloques: {},
    pistas: ['Necesitas tres bloques "mover servo" y tres "esperar" dentro de "repetir siempre".', 'Cada espera de 1000 ms le da tiempo al servo para llegar.', 'mover a 0 → esperar 1000 → mover a 90 → esperar 1000 → mover a 180 → esperar 1000.'],
  },
  {
    id: '9-8', mundo: 9, extra: true, titulo: '⭐ El minutero', programa: true,
    mision: 'Reto extra: como la aguja de un reloj, el servo avanza <b>de 30 en 30 grados</b> (0°, 30°, 60°… hasta 180°), esperando 1 segundo en cada paso. Después vuelve a 0°. Usa el bloque <b>contar con i</b> (Control).',
    objetivos: ['El servo pasa por 0°, 30°, 60°, 90°, 120°, 150° y 180°'],
    meta: {servo: [0, 30, 60, 90, 120, 150, 180]},
    escena: mesaServo({piezas: ARDUINO_SOLO.slice(), cables: []}), bloques: {},
    pistas: [
      'El bloque "contar con i desde 0 hasta 180 de a …" repite lo de adentro con i = 0, luego con el siguiente valor, y así.',
      'Cambia el "de a 1" por "de a 30". Adentro: mover servo a i (la variable i está en Variables) y esperar 1000.',
      'contar con i desde 0 hasta 180 de a 30: mover servo del pin 9 a i → esperar 1000.',
    ],
  },
  {
    id: '9-9', mundo: 9, extra: true, titulo: '⭐ El girasol', programa: true, verRedes: true,
    accion: 'cambia la luz: arrastra el sol hacia arriba y hacia abajo',
    mision: 'Reto extra: un girasol que sigue la luz. El servo se mueve según la <b>fotorresistencia</b> (A0): con poca luz, cerca de 0°; con mucha luz, cerca de 180°.',
    objetivos: ['Poca luz: servo cerca de 0°', 'Mucha luz: servo cerca de 180°'],
    meta: {servoPerilla: true},
    fallaMeta: 'Lleva la luz de un extremo al otro: con poca luz el servo debe quedar cerca de 0° y con mucha luz, cerca de 180°.',
    escena: mesaServo(mesaLDR(mesaPrograma([]))), bloques: {},
    pistas: ['Es igual que el servo con perilla: la fotorresistencia también da un valor de 0 a 1023 en A0.', 'mover servo del pin 9 a (convertir (leer pin analógico A0) de 0–1023 a 0–180).', 'Todo dentro de "repetir siempre". Después de iniciar, mueve el sol de punta a punta.'],
  },
  {
    id: '9-10', mundo: 9, extra: true, titulo: '⭐ Barrera automática', programa: true, verRedes: true,
    accion: 'acerca y aleja el objeto (arrástralo)',
    mision: 'Reto extra: la barrera de un estacionamiento que se abre sola. Si el sensor ultrasónico detecta un carro (el objeto) a <b>menos de 15 cm</b>, el servo sube a <b>90°</b>; si no, baja a <b>0°</b>.',
    objetivos: ['Objeto cerca: servo a 90°', 'Objeto lejos: servo a 0°'],
    meta: {servoCerca: true},
    escena: mesaServo(mesaUltra(mesaPrograma([]))), bloques: {},
    pistas: ['Usa "si … hacer … si no" con la comparación: distancia en cm < 15 (Sensores).', 'En "hacer": mover servo a 90. En "si no": mover servo a 0.', 'Todo dentro de "repetir siempre". Después acerca el objeto a menos de 15 cm y aléjalo.'],
  },

  // ================= MUNDO 10: Sensores (luz y distancia) =================
  {
    id: '10-1', mundo: 10, titulo: 'La fotorresistencia', ficha: ['ldr'], tutorial: true, programa: true, inicio: 'texto', verRedes: true,
    accion: 'cambia la luz: arrastra el sol hacia arriba (más luz) y hacia abajo (menos luz)',
    mision: 'La <b>fotorresistencia</b> (LDR) cambia según la luz. Junto con la resistencia de 10 kΩ, le da al pin <b>A0</b> un valor de 0 a 1023. Inicia la simulación y cambia la luz arrastrando el <b>sol</b> que está al lado.',
    objetivos: ['Ver en el monitor un número bajo (oscuro)', 'Ver en el monitor un número alto (mucha luz)'],
    meta: {serial: [100, 900]},
    escena: mesaLDR(mesaPrograma([])),
    codigo: 'void setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int luz = analogRead(A0);   // 0 = oscuro, 1023 = mucha luz\n  Serial.println(luz);\n  delay(200);\n}\n',
    pistas: ['Haz clic en el sol amarillo y arrástralo hacia arriba o hacia abajo.', 'Lleva el sol hasta los dos extremos: noche (luna) y mucha luz.', 'Mira el monitor (recuadro negro): los números deben bajar y subir.'],
  },
  {
    id: '10-2', mundo: 10, titulo: 'Luz de noche', programa: true, verRedes: true,
    accion: 'cambia la luz: arrastra el sol hacia arriba y hacia abajo',
    mision: 'Haz una luz de noche: el LED (pin 13) se enciende cuando hay <b>poca luz</b> y se apaga cuando hay mucha. <b>Si</b> leer pin analógico A0 <b>&lt; 500</b> → LED en ALTO; si no → BAJO.',
    objetivos: ['Poca luz: LED encendido', 'Mucha luz: LED apagado'],
    meta: {umbral: {bajo: 0.35, alto: 0.65}, invertido: true},
    fallaMeta: 'El LED debe encenderse cuando hay poca luz (sol abajo) y apagarse cuando hay mucha luz (sol arriba).',
    escena: mesaLDR(mesaPrograma([['D13', 'led', 7]])), bloques: {},
    pistas: ['Usa "si … hacer … si no" con una comparación: leer pin analógico A0 < 500.', 'Ojo: es "menor que" (<), porque queremos que se encienda con poca luz.', 'En "hacer": pin 13 ALTO. En "si no": pin 13 BAJO. Todo dentro de "repetir siempre".'],
  },
  {
    id: '10-3', mundo: 10, titulo: '🧪 Error a propósito: sin la resistencia fija', programa: true, inicio: 'texto', verRedes: true,
    accion: 'cambia la luz de un extremo al otro (arrastra el sol)',
    mision: 'En este circuito <b>falta la resistencia de 10 kΩ</b>. Inicia la simulación, cambia la luz de un extremo al otro y mira los números del monitor.',
    objetivos: ['Cambiar la luz', 'Observar los números del monitor'],
    meta: {error: 'lecturaFija'},
    exito: '🔎 ¡El número no cambia aunque cambies la luz!',
    porque: 'La fotorresistencia sola no alcanza: necesita una <b>resistencia fija</b> para formar un <b>divisor de voltaje</b>. Las dos se "reparten" los 5V según la luz, y el pin A0 lee el punto del medio. Sin la resistencia fija, el pin siempre recibe los mismos 5V.',
    escena: mesaLDR(mesaPrograma([]), {sin10k: true}),
    codigo: 'void setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  Serial.println(analogRead(A0));\n  delay(200);\n}\n',
    pistas: ['No cambies el programa: inicia la simulación y mueve el sol.', 'Lleva el sol de abajo hasta arriba.', 'Compara los números con los del nivel "La fotorresistencia".'],
  },
  {
    id: '10-4', mundo: 10, titulo: 'Sensor de distancia', ficha: ['ultrasonico'], programa: true, inicio: 'texto', verRedes: true,
    accion: 'mueve el objeto: arrástralo hacia arriba (más lejos) y hacia abajo (más cerca)',
    mision: 'El <b>sensor ultrasónico</b> mide distancias con sonido, como un murciélago: TRIG lanza el sonido y ECHO escucha el eco. Inicia la simulación y <b>mueve el objeto</b> gris: acércalo a menos de 10 cm y aléjalo a más de 100 cm.',
    objetivos: ['Ver en el monitor 10 cm o menos', 'Ver en el monitor 100 cm o más'],
    meta: {serial: [10, 100]},
    escena: mesaUltra(mesaPrograma([])),
    codigo: 'const int TRIG = 7;\nconst int ECHO = 6;\n\nvoid setup() {\n  pinMode(TRIG, OUTPUT);\n  pinMode(ECHO, INPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  digitalWrite(TRIG, LOW);\n  delayMicroseconds(2);\n  digitalWrite(TRIG, HIGH);      // lanza el sonido\n  delayMicroseconds(10);\n  digitalWrite(TRIG, LOW);\n  long tiempo = pulseIn(ECHO, HIGH);  // espera el eco (microsegundos)\n  long cm = tiempo / 58;              // lo convierte a centímetros\n  Serial.println(cm);\n  delay(200);\n}\n',
    pistas: ['Haz clic en el bloque gris que está sobre el sensor y arrástralo.', 'Arriba = más lejos; abajo = más cerca. El número aparece encima del objeto.', 'Lleva el objeto muy cerca (menos de 10 cm) y después lejos (más de 100 cm).'],
  },
  {
    id: '10-5', mundo: 10, titulo: 'Desafío final: alarma de retroceso', programa: true, verRedes: true,
    accion: 'acerca y aleja el objeto (arrástralo)',
    mision: 'Como el sensor de un carro al retroceder: el buzzer (pin 8) debe sonar cuando el objeto esté a <b>menos de 20 cm</b>, y callarse cuando esté lejos. Usa el bloque <b>distancia en cm</b> (Sensores).',
    objetivos: ['Objeto cerca: el buzzer suena', 'Objeto lejos: el buzzer se calla'],
    meta: {umbral: {bajo: 0.06, alto: 0.2}, invertido: true, salida: 'buzzer'},
    fallaMeta: 'El buzzer debe sonar cuando el objeto está a menos de 20 cm y callarse cuando está lejos.',
    escena: mesaUltra(mesaPrograma([['D8', 'buzzer', 7]]), 1), bloques: {},
    pistas: ['El bloque "distancia en cm (TRIG 7 ECHO 6)" da la distancia: compárala con 20.', 'si distancia < 20 → poner pin 8 en ALTO; si no → poner pin 8 en BAJO.', 'Todo dentro de "repetir siempre". Después de iniciar, acerca el objeto a menos de 20 cm.'],
  },
  {
    id: '10-6', mundo: 10, extra: true, titulo: '⭐ Barra de distancia', programa: true, verRedes: true,
    accion: 'acerca y aleja el objeto (arrástralo) poco a poco',
    mision: 'Reto extra: <b>arma tú</b> tres circuitos de LED (en los pines 11, 12 y 13) y prográmalos como el sensor de un carro: a menos de <b>50 cm</b>, 1 LED encendido; a menos de <b>25 cm</b>, 2 LEDs; a menos de <b>10 cm</b>, los 3. Lejos, ninguno.',
    objetivos: ['Lejos: ningún LED', 'Menos de 50 cm: 1 LED', 'Menos de 25 cm: 2 LEDs', 'Menos de 10 cm: 3 LEDs'],
    meta: {zonas: [
      {de: 0.3, a: 1, n: [0, 0], txt: 'con el objeto lejos (más de 60 cm) no debe haber LEDs encendidos'},
      {de: 0.14, a: 0.22, n: [1, 1], txt: 'entre 30 y 45 cm debe haber 1 LED encendido'},
      {de: 0.055, a: 0.1, n: [2, 2], txt: 'entre 13 y 21 cm debe haber 2 LEDs encendidos'},
      {de: 0, a: 0.03, n: [3, 3], txt: 'con el objeto pegado (menos de 8 cm) deben estar los 3 LEDs encendidos'},
    ]},
    paleta: ['led', 'led_amarillo', 'led_verde', 'resistencia'],
    escena: mesaUltra(mesaPrograma([]), 0, 26), bloques: {},
    pistas: [
      'Cada LED: pin del Arduino → resistencia → pata larga del LED → pata corta → riel − (ya tiene GND).',
      'En el programa, un "si … si no" por cada LED: distancia < 50 → pin 11; distancia < 25 → pin 12; distancia < 10 → pin 13.',
      'Guarda la distancia en una variable al principio de "repetir siempre" y usa esa variable en los tres "si".',
    ],
  },
  {
    id: '10-7', mundo: 10, extra: true, titulo: '⭐ ¿De día o de noche?', programa: true, inicio: 'texto', verRedes: true,
    accion: 'cambia la luz: arrastra el sol hacia arriba y hacia abajo',
    mision: 'Reto extra: en vez de números, haz que el monitor escriba palabras: <b>OSCURO</b> cuando la lectura de la fotorresistencia es menor que 500 y <b>CLARO</b> cuando es 500 o más.',
    objetivos: ['Poca luz: el monitor dice OSCURO', 'Mucha luz: el monitor dice CLARO'],
    meta: {serialPalabras: {bajo: 'oscuro', alto: 'claro'}},
    escena: mesaLDR(mesaPrograma([])),
    codigo: 'void setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int luz = analogRead(A0);\n  // Completa: si luz es menor que 500, escribe "OSCURO"; si no, escribe "CLARO"\n\n  delay(300);\n}\n',
    pistas: ['Usa un if … else con la condición luz < 500.', 'Para escribir una palabra, ponla entre comillas: Serial.println("OSCURO");', 'if (luz < 500) { Serial.println("OSCURO"); } else { Serial.println("CLARO"); }'],
  },
  {
    id: '10-8', mundo: 10, extra: true, titulo: '⭐ Semáforo de distancia', programa: true, verRedes: true,
    accion: 'acerca y aleja el objeto (arrástralo)',
    mision: 'Reto extra: un semáforo que avisa qué tan cerca está algo. A menos de <b>20 cm</b>: solo el <b>rojo</b> (pin 12). De 20 a 49 cm: solo el <b>amarillo</b> (pin 11). A <b>50 cm</b> o más: solo el <b>verde</b> (pin 10).',
    objetivos: ['Cerca: rojo', 'Distancia media: amarillo', 'Lejos: verde', 'Una sola luz a la vez'],
    meta: {zonas: [
      {de: 0, a: 0.07, tipos: ['led'], txt: 'con el objeto cerca (menos de 15 cm) debe estar encendido solo el rojo'},
      {de: 0.12, a: 0.21, tipos: ['led_amarillo'], txt: 'entre 25 y 43 cm debe estar encendido solo el amarillo'},
      {de: 0.28, a: 1, tipos: ['led_verde'], txt: 'con el objeto lejos (más de 57 cm) debe estar encendido solo el verde'},
    ]},
    escena: mesaUltra(mesaPrograma([['D12', 'led', 7], ['D11', 'led_amarillo', 13], ['D10', 'led_verde', 19]]), 3, 26), bloques: {},
    pistas: [
      'Usa un "si … si no si … si no" (con el engranaje del bloque "si").',
      'si distancia < 20 → rojo; si no, si distancia < 50 → amarillo; si no → verde.',
      'En cada parte enciende una luz y apaga las otras dos.',
    ],
  },
  {
    id: '10-9', mundo: 10, extra: true, titulo: '⭐ Alarma del cajón', programa: true, verRedes: true,
    accion: 'cambia la luz: arrastra el sol hacia arriba y hacia abajo',
    mision: 'Reto extra: dentro de un cajón cerrado está oscuro. Si alguien lo abre, entra luz. Haz que el buzzer (pin 8) suene cuando la lectura de la fotorresistencia pasa de <b>600</b>, y que se calle con poca luz.',
    objetivos: ['Mucha luz (cajón abierto): el buzzer suena', 'Poca luz (cajón cerrado): silencio'],
    meta: {umbral: {bajo: 0.35, alto: 0.65}, salida: 'buzzer'},
    fallaMeta: 'El buzzer debe sonar con mucha luz (sol arriba) y callarse con poca luz (sol abajo).',
    escena: mesaLDR(mesaPrograma([['D8', 'buzzer', 7]])), bloques: {},
    pistas: ['Usa "si … hacer … si no" con la comparación leer pin analógico A0 > 600.', 'En "hacer": poner pin 8 en ALTO. En "si no": poner pin 8 en BAJO.', 'Todo dentro de "repetir siempre". Después mueve el sol de punta a punta.'],
  },
  {
    id: '10-10', mundo: 10, extra: true, titulo: '⭐ Cinta métrica', programa: true, inicio: 'texto', verRedes: true,
    accion: 'mueve el objeto: pégalo al sensor y después aléjalo a más de 150 cm',
    mision: 'Reto extra: convierte el sensor en una cinta métrica de precisión: haz que el monitor muestre la distancia en <b>milímetros</b> (1 cm = 10 mm). Después lleva el objeto muy cerca y muy lejos.',
    objetivos: ['El monitor muestra milímetros', 'Ver 50 mm o menos', 'Ver 1500 mm o más'],
    meta: {serial: [50, 1500], serialTope: 2100},
    fallaTope: 'Los números son demasiado grandes: ¿estás mostrando el tiempo del eco en vez de la distancia?',
    fallaMeta: 'Los números no llegan a 1500. ¿Ya los convertiste a milímetros? Lleva el objeto muy cerca y después muy lejos.',
    escena: mesaUltra(mesaPrograma([])),
    codigo: 'const int TRIG = 7;\nconst int ECHO = 6;\n\nvoid setup() {\n  pinMode(TRIG, OUTPUT);\n  pinMode(ECHO, INPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  digitalWrite(TRIG, LOW);\n  delayMicroseconds(2);\n  digitalWrite(TRIG, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(TRIG, LOW);\n  long tiempo = pulseIn(ECHO, HIGH);\n  long cm = tiempo / 58;\n  Serial.println(cm);       // Cámbialo: muestra milímetros\n  delay(200);\n}\n',
    pistas: ['1 cm son 10 mm: multiplica los centímetros por 10.', 'Crea otra variable: long mm = cm * 10;', 'Cambia la línea del monitor por Serial.println(mm);'],
  },

  // ================= MUNDO 11: Motores (motor DC y driver L298N) =================
  {
    id: '11-1', mundo: 11, titulo: 'El motor y su driver', ficha: ['motor', 'l298n'], tutorial: true, programa: true,
    mision: 'El motor se controla con el <b>driver L298N</b>: IN1 (pin 8) e IN2 (pin 7) eligen el sentido, y ENA (pin ~10) la velocidad. Haz girar el motor <b>hacia adelante</b>: pin 10 en ALTO, pin 8 en ALTO y pin 7 en BAJO.',
    objetivos: ['El motor gira hacia adelante'],
    meta: {motor: 1},
    escena: mesaMotor(), bloques: {},
    pistas: ['Necesitas tres bloques "poner pin" dentro de "al iniciar".', 'Pin 10 (ENA) en ALTO = velocidad máxima.', 'Pin 8 (IN1) en ALTO y pin 7 (IN2) en BAJO = hacia adelante.'],
  },
  {
    id: '11-2', mundo: 11, titulo: 'Reversa', programa: true,
    mision: 'Este programa hace girar el motor hacia adelante. Cámbialo para que gire <b>hacia atrás</b>.',
    objetivos: ['El motor gira hacia atrás'],
    meta: {motor: -1},
    escena: mesaMotor(), bloques: {setup: [['escribir', 10, 'HIGH'], ['escribir', 8, 'HIGH'], ['escribir', 7, 'LOW']]},
    pistas: ['El sentido depende de IN1 (pin 8) e IN2 (pin 7).', 'Para ir hacia atrás, intercambia sus valores.', 'Pin 8 en BAJO y pin 7 en ALTO.'],
  },
  {
    id: '11-3', mundo: 11, titulo: '🧪 Error a propósito: motor directo', programa: true, inicio: 'texto',
    mision: 'Aquí el motor está conectado <b>directo</b> al pin 8, sin driver. El programa pone el pin 8 en ALTO. Inicia la simulación: ¿gira?',
    objetivos: ['Observar el motor conectado directo a un pin'],
    meta: {error: 'motorDirecto'},
    exito: '🔎 ¡El motor no gira!',
    porque: 'Un pin del Arduino da muy poquita corriente (unos 20 mA). Un motor necesita mucha más, y además, al girar, genera picos de voltaje que pueden <b>dañar el Arduino</b>. Por eso se usa un <b>driver</b> como el L298N: el Arduino le da órdenes y el driver le entrega al motor la energía que necesita.',
    escena: mesaMotorDirecto(),
    codigo: 'void setup() {\n  pinMode(8, OUTPUT);\n  digitalWrite(8, HIGH);   // ¿alcanza para mover el motor?\n}\n\nvoid loop() {\n}\n',
    pistas: ['No cambies nada: solo inicia la simulación.', 'Mira el motor: ¿la hélice gira?', 'Fíjate en el signo de alerta rojo junto al motor.'],
  },
  {
    id: '11-4', mundo: 11, titulo: 'Adelante y atrás', programa: true,
    mision: 'Haz que el motor gire <b>2 segundos hacia adelante</b> y <b>2 segundos hacia atrás</b>, una y otra vez.',
    objetivos: ['Gira hacia adelante', 'Gira hacia atrás'],
    meta: {motorDirecciones: true},
    escena: mesaMotor(), bloques: {setup: [['escribir', 10, 'HIGH']]},
    pistas: ['ENA (pin 10) ya está en ALTO en "al iniciar". Ahora trabaja en "repetir siempre".', 'Adelante: pin 8 ALTO y pin 7 BAJO. Atrás: pin 8 BAJO y pin 7 ALTO.', 'adelante → esperar 2000 → atrás → esperar 2000.'],
  },
  {
    id: '11-5', mundo: 11, titulo: 'Más despacio', programa: true,
    mision: 'ENA controla la <b>velocidad</b> con PWM: 255 = máxima, 0 = parado. Cambia "poner pin 10 en ALTO" por <b>poner pin ~10 al valor 120</b> para que el motor gire despacio.',
    objetivos: ['El motor gira despacio'],
    meta: {motorLento: true},
    escena: mesaMotor(), bloques: {setup: [['escribir', 10, 'HIGH'], ['escribir', 8, 'HIGH'], ['escribir', 7, 'LOW']]},
    pistas: ['El bloque "poner pin ~ al valor" está en Salidas.', 'Quita "poner pin 10 en ALTO" y pon "poner pin ~10 al valor 120" en su lugar.', 'Prueba valores entre 80 y 150.'],
  },
  {
    id: '11-6', mundo: 11, titulo: 'Desafío final: avanza, para y retrocede', programa: true,
    mision: 'Programa un pequeño robot: <b>avanza</b> 2 segundos, se <b>detiene</b> 1 segundo y <b>retrocede</b> 2 segundos. Para detenerlo, pon IN1 e IN2 en BAJO.',
    objetivos: ['Avanza', 'Se detiene', 'Retrocede'],
    meta: {motorSecuencia: [1, 0, -1]},
    escena: mesaMotor(), bloques: {setup: [['escribir', 10, 'HIGH']]},
    pistas: ['Son tres movimientos dentro de "repetir siempre", cada uno con su espera.', 'Detener = pin 8 BAJO y pin 7 BAJO.', 'adelante → esperar 2000 → parar → esperar 1000 → atrás → esperar 2000.'],
  },
  {
    id: '11-7', mundo: 11, extra: true, titulo: '⭐ Arranque suave', programa: true, inicio: 'texto',
    mision: 'Reto extra: los motores grandes no arrancan de golpe, aceleran poco a poco. Haz que la velocidad (ENA, pin ~10) suba <b>de 0 a 255 poco a poco</b> en unos 2 segundos, se quede un rato al máximo y después el motor se detenga.',
    objetivos: ['El motor arranca despacio', 'Va acelerando poco a poco'],
    meta: {motorRampa: true},
    escena: mesaMotor(),
    codigo: 'void setup() {\n  pinMode(8, OUTPUT);\n  pinMode(7, OUTPUT);\n  digitalWrite(8, HIGH);    // hacia adelante\n  digitalWrite(7, LOW);\n}\n\nvoid loop() {\n  analogWrite(10, 255);     // Cámbialo: que la velocidad suba de 0 a 255 poco a poco\n  delay(2000);\n  analogWrite(10, 0);\n  delay(1000);\n}\n',
    pistas: [
      'Un for puede recorrer todas las velocidades: for (int v = 0; v <= 255; v++) { … }',
      'Dentro del for: analogWrite(10, v); delay(8);   (256 pasos × 8 ms ≈ 2 segundos).',
      'Reemplaza la primera línea del loop por el for completo y deja lo demás igual.',
    ],
  },
  {
    id: '11-8', mundo: 11, extra: true, titulo: '⭐ Ventilador con perilla', programa: true,
    mision: 'Reto extra: un ventilador con perilla de velocidad. La perilla (A0) controla qué tan rápido gira el motor: abajo casi parado, arriba a toda velocidad. El sentido ya está listo en "al iniciar".',
    objetivos: ['Perilla abajo: motor casi parado', 'Perilla al medio: media velocidad', 'Perilla arriba: máxima velocidad'],
    meta: {motorPerilla: true},
    escena: mesaMotorPot(), bloques: {setup: [['escribir', 8, 'HIGH'], ['escribir', 7, 'LOW']]},
    pistas: [
      'La velocidad se da con "poner pin ~10 al valor" (Salidas).',
      'El valor sale de la perilla, convertido de 0–1023 a 0–255.',
      'Dentro de "repetir siempre": poner pin ~10 al valor (convertir (leer pin analógico A0) de 0–1023 a 0–255).',
    ],
  },
  {
    id: '11-9', mundo: 11, extra: true, titulo: '⭐ Mis propias funciones', programa: true, inicio: 'texto',
    mision: 'Reto extra: los programadores ordenan su código en <b>funciones</b>. Ya está la función <b>adelante()</b>: escribe también <b>atras()</b> y <b>parar()</b>, y úsalas en el loop para que el motor avance 2 s, pare 1 s, retroceda 2 s y pare 1 s.',
    objetivos: ['Funciones adelante(), atras() y parar()', 'Avanza, para, retrocede y para'],
    meta: {motorSecuencia: [1, 0, -1, 0]},
    codigoDebe: [
      {re: /void\s+atras\s*\(\s*\)/, msg: 'Falta la función atras(). Escríbela fuera del loop, igual que adelante(): void atras() { … }'},
      {re: /void\s+parar\s*\(\s*\)/, msg: 'Falta la función parar(). Escríbela fuera del loop: void parar() { … }'},
    ],
    escena: mesaMotor(),
    codigo: 'void adelante() {\n  digitalWrite(8, HIGH);\n  digitalWrite(7, LOW);\n}\n\n// Completa: escribe aquí las funciones atras() y parar()\n\nvoid setup() {\n  pinMode(8, OUTPUT);\n  pinMode(7, OUTPUT);\n  pinMode(10, OUTPUT);\n  digitalWrite(10, HIGH);   // velocidad máxima\n}\n\nvoid loop() {\n  adelante();\n  delay(2000);\n  // Completa: parar 1 s, atrás 2 s y parar 1 s\n\n}\n',
    pistas: [
      'atras() es como adelante(), pero con los valores de los pines 8 y 7 intercambiados.',
      'parar() pone los dos pines (8 y 7) en LOW.',
      'En el loop: adelante(); delay(2000); parar(); delay(1000); atras(); delay(2000); parar(); delay(1000);',
    ],
  },
  {
    id: '11-10', mundo: 11, extra: true, titulo: '⭐ Robot que esquiva', programa: true,
    accion: 'acerca y aleja el obstáculo (arrástralo)',
    mision: 'Reto extra: un robot que no choca. Si el sensor ultrasónico (TRIG en el pin <b>4</b>, ECHO en el pin <b>3</b>) detecta un obstáculo a <b>menos de 20 cm</b>, el motor gira <b>hacia atrás</b>; si no, avanza.',
    objetivos: ['Obstáculo cerca: el motor retrocede', 'Camino libre: el motor avanza'],
    meta: {motorDistancia: true},
    escena: mesaMotorUltra(), bloques: {setup: [['escribir', 10, 'HIGH']]},
    pistas: [
      'En el bloque "distancia en cm", cambia TRIG a 4 y ECHO a 3: así está conectado el sensor.',
      'si distancia < 20 → atrás (pin 8 BAJO, pin 7 ALTO); si no → adelante (pin 8 ALTO, pin 7 BAJO).',
      'Todo dentro de "repetir siempre". Después acerca el obstáculo a menos de 20 cm y aléjalo.',
    ],
  },

  // ================= RUTA GUIADA (solo estudiantes con la ruta activada) =================
  {
    id: 'G1', mundo: 'G', tipo: 'pasos', titulo: 'Conoce el Arduino', nombres: true,
    explicacion: [
      {icono: '🧠', titulo: '¿Qué es Arduino?', texto: 'Arduino es una placa. Es como una computadora muy pequeñita. La podemos programar para encender luces, hacer sonidos y mover motores.', dibujo: 'arduino'},
      {icono: '🔌', titulo: '¿Cómo se conecta?', texto: 'Se conecta a la computadora con un cable USB. Por ese cable recibe energía y programas.'},
    ],
    mision: 'Vamos a conocer dos partes de la placa. Si pasas el mouse por encima, verás el nombre de cada parte.',
    escena: {piezas: ARDUINO_SOLO},
    pasos: [
      {texto: 'Busca el <b>conector USB</b>. Es la pieza <b>gris</b> del lado izquierdo. Haz clic en ella.', objetivo: {partes: ['usb']}},
      {texto: 'Ahora busca el <b>microcontrolador</b>. Es el rectángulo <b>negro y largo</b>. Es el cerebro. Haz clic en él.', objetivo: {partes: ['chip']}},
      {pregunta: 'El Arduino es como…', opciones: ['una computadora pequeñita', 'una linterna', 'un parlante'], correcta: 0},
    ],
    pistas: ['Pasa el mouse despacio por la placa y lee los nombres.', 'El conector USB está en el borde izquierdo, arriba.', 'El microcontrolador está abajo, a la derecha. Es el más grande.'],
  },
  {
    id: 'G2', mundo: 'G', tipo: 'pasos', titulo: 'Los pines de energía', nombres: true,
    explicacion: [
      {icono: '📍', titulo: 'Los pines', texto: 'Los pines son los agujeritos negros de los bordes. Ahí conectamos los cables.'},
      {icono: '➕', titulo: '5V es el positivo', texto: 'El pin 5V da la energía. Es como el lado + de una pila.'},
      {icono: '➖', titulo: 'GND es el negativo', texto: 'El pin GND es por donde regresa la energía. Es como el lado − de una pila.'},
    ],
    mision: 'Vamos a encontrar los pines de energía. Están en la zona que parpadea.',
    escena: {piezas: ARDUINO_SOLO},
    pasos: [
      {texto: 'Haz clic en el pin <b>5V</b>. Está en la zona que parpadea.', objetivo: {terminales: ['ard.5V']}, resaltar: ['ard.3V3', 'ard.5V', 'ard.GND2', 'ard.GND3']},
      {texto: 'Ahora haz clic en un pin <b>GND</b>. También está en la zona que parpadea.', objetivo: {terminales: GND}, resaltar: ['ard.3V3', 'ard.5V', 'ard.GND2', 'ard.GND3']},
      {pregunta: '¿Cuál es el pin positivo (+)?', opciones: ['5V', 'GND'], correcta: 0},
    ],
    pistas: ['Pasa el mouse por los pines que parpadean y lee su nombre.', 'El 5V está justo antes de los dos GND.', 'Recuerda: 5V es el positivo y GND es el negativo.'],
  },
  {
    id: 'G3', mundo: 'G', tipo: 'pasos', titulo: 'La protoboard', nombres: true,
    explicacion: [
      {icono: '🧩', titulo: 'La protoboard', texto: 'La protoboard tiene muchos agujeros. Ahí ponemos los componentes y los cables. No hay que soldar.', dibujo: 'protoboard'},
      {icono: '🟩', titulo: 'Agujeros unidos', texto: 'Los agujeros de una misma columna están unidos por dentro. Si pasas el mouse, se pintan de verde todos los que están unidos.'},
    ],
    mision: 'Vamos a descubrir qué agujeros están unidos.',
    escena: {piezas: PROTO_SOLA},
    pasos: [
      {texto: 'Pasa el mouse por el agujero que parpadea: se pinta de verde su columna. Haz clic en <b>otro agujero verde</b>.', objetivo: {terminales: conectadosCon('c5')}, resaltar: ['bb.c5']},
      {pregunta: 'Los agujeros que se pintan de verde juntos…', opciones: ['están unidos por dentro', 'no están unidos'], correcta: 0},
    ],
    pistas: ['Pon el mouse encima del agujero que parpadea y mira qué otros se pintan de verde.', 'Los agujeros verdes están arriba y abajo del que parpadea, en la misma columna.', 'Haz clic en el agujero de justo arriba del que parpadea.'],
  },
  {
    id: 'G4', mundo: 'G', titulo: 'Mi primer cable',
    explicacion: [
      {icono: '〰️', titulo: 'Los cables', texto: 'Un cable une dos puntos. Para poner un cable: haz clic en un punto y después haz clic en otro punto.'},
      {icono: '🎨', titulo: 'Los colores', texto: 'Cuando conectas el pin 5V a la protoboard, esos agujeros se pintan de rojo. Así sabes que tienen energía. GND se pinta de azul.'},
    ],
    mision: 'Vamos a llevar la energía del Arduino a la protoboard con dos cables.',
    objetivos: ['5V unido al riel +', 'GND unido al riel −'],
    meta: {conexiones: [['ard.5V', 'bb.p1-3'], ['ard.GND1', 'bb.n1-3']]},
    paleta: [], notaPaleta: 'Solo usas cables: clic en un punto y clic en otro.',
    escena: {piezas: MESA_BASE},
    guia: [
      {texto: 'Haz clic en el pin <b>5V</b> (parpadea). Después haz clic en el agujero que parpadea en la protoboard.', resaltar: ['ard.5V', 'bb.p1-3'], conexion: ['ard.5V', 'bb.p1-3']},
      {texto: 'Ahora une el pin <b>GND</b> con el otro agujero que parpadea.', resaltar: ['ard.GND1', 'bb.n1-3'], conexion: ['ard.GND1', 'bb.n1-3']},
    ],
    pistas: ['Primero un clic en el pin que parpadea, después un clic en el agujero que parpadea.', 'Si te equivocas, haz clic en el cable y presiona Supr para borrarlo.', 'El pin GND que parpadea está arriba, a la izquierda del pin 13.'],
  },
  {
    id: 'G5', mundo: 'G', titulo: 'Enciendo un LED',
    explicacion: [
      {icono: '💡', titulo: 'El LED', texto: 'El LED es una lucecita. Tiene una pata larga (+) y una pata corta (−).', dibujo: 'led'},
      {icono: '🛡️', titulo: 'La resistencia', texto: 'La resistencia cuida al LED para que no se queme. Siempre van juntos.', dibujo: 'resistencia'},
    ],
    mision: 'Vamos a encender un LED paso a paso. Sigue los pasos de la izquierda.',
    objetivos: ['El LED se enciende'],
    meta: {encendidos: 1},
    paleta: ['resistencia', 'led'],
    escena: {piezas: MESA_BASE},
    guia: [
      {texto: 'Arrastra la <b>resistencia</b> desde la derecha y ponla en los agujeros que parpadean.', resaltar: ['bb.c5', 'bb.c9'], pieza: {tipo: 'resistencia', huecos: ['bb.c5', 'bb.c9']}},
      {texto: 'Arrastra el <b>LED</b>. La pata larga (con el doblez) va en el agujero de la izquierda que parpadea.', resaltar: ['bb.e9', 'bb.e10'], pieza: {tipo: 'led', en: {anodo: 'bb.e9', catodo: 'bb.e10'}}},
      {texto: 'Une el pin <b>5V</b> con el agujero que parpadea.', resaltar: ['ard.5V', 'bb.a5'], conexion: ['ard.5V', 'bb.a5']},
      {texto: 'Une el agujero que parpadea con un pin <b>GND</b>.', resaltar: ['bb.a10', 'ard.GND2'], conexion: ['bb.a10', 'ard.GND2']},
    ],
    pistas: ['Mira los puntos que parpadean: ahí va cada cosa.', 'El LED tiene que tener la pata larga a la izquierda. Si quedó al revés, selecciónalo y presiona R dos veces.', 'Cuando todos los pasos tengan ✓, presiona ▶ Iniciar simulación.'],
  },
  {
    id: 'G6', mundo: 'G', titulo: '🧪 ¿Por qué se quema?',
    explicacion: [
      {icono: '🧪', titulo: 'Un experimento', texto: 'Vamos a probar qué pasa si conectamos el LED <b>sin</b> resistencia. En la vida real no se hace, ¡pero aquí sí podemos probar!'},
    ],
    mision: 'Conecta el LED sin resistencia y mira qué pasa.',
    objetivos: ['Conectar el LED sin resistencia'],
    meta: {error: 'quemado'},
    exito: '💥 ¡Se quemó!',
    porque: 'Sin resistencia pasa demasiada energía por el LED. Se calienta mucho y se quema. La resistencia es como un escudo que lo protege.',
    paleta: ['led'],
    escena: {piezas: MESA_BASE},
    guia: [
      {texto: 'Arrastra el <b>LED</b>. La pata larga va en el agujero de la izquierda que parpadea.', resaltar: ['bb.e9', 'bb.e10'], pieza: {tipo: 'led', en: {anodo: 'bb.e9', catodo: 'bb.e10'}}},
      {texto: 'Une el pin <b>5V</b> con el agujero que parpadea.', resaltar: ['ard.5V', 'bb.a9'], conexion: ['ard.5V', 'bb.a9']},
      {texto: 'Une el agujero que parpadea con un pin <b>GND</b>.', resaltar: ['bb.a10', 'ard.GND2'], conexion: ['bb.a10', 'ard.GND2']},
    ],
    pistas: ['Sigue los puntos que parpadean.', 'Esta vez no usamos resistencia: es el experimento.', 'Cuando todos los pasos tengan ✓, presiona ▶ Iniciar simulación.'],
  },
  {
    id: 'G7', mundo: 'G', titulo: 'Dos luces',
    explicacion: [
      {icono: '🛤️', titulo: 'Los rieles', texto: 'Los rieles son las filas largas de arriba y de abajo. Si conectas 5V a un riel, toda esa fila tiene energía.'},
      {icono: '✌️', titulo: 'Dos LEDs', texto: 'Cada LED necesita su propia resistencia. Vamos a armar dos caminos iguales.'},
    ],
    mision: 'Vamos a encender dos LEDs usando los rieles.',
    objetivos: ['Los dos LEDs se encienden'],
    meta: {encendidos: 2},
    paleta: ['resistencia', 'led'],
    escena: {piezas: MESA_BASE},
    guia: [
      {texto: 'Une el pin <b>5V</b> con el riel + de abajo (parpadea).', resaltar: ['ard.5V', 'bb.p2-2'], conexion: ['ard.5V', 'bb.p2-2']},
      {texto: 'Une un pin <b>GND</b> con el riel − de abajo (parpadea).', resaltar: ['ard.GND3', 'bb.n2-2'], conexion: ['ard.GND3', 'bb.n2-2']},
      {texto: 'Pon una <b>resistencia de pie</b> (gírala con R) entre los agujeros que parpadean.', resaltar: ['bb.p2-5', 'bb.c5'], pieza: {tipo: 'resistencia', huecos: ['bb.p2-5', 'bb.c5']}},
      {texto: 'Pon un <b>LED</b>: pata larga en el agujero de la izquierda que parpadea.', resaltar: ['bb.e5', 'bb.e6'], pieza: {tipo: 'led', en: {anodo: 'bb.e5', catodo: 'bb.e6'}}},
      {texto: 'Une los dos agujeros que parpadean con un cable.', resaltar: ['bb.a6', 'bb.n2-6'], conexion: ['bb.a6', 'bb.n2-6']},
      {texto: 'Ahora el segundo LED: otra <b>resistencia de pie</b> en los agujeros que parpadean.', resaltar: ['bb.p2-15', 'bb.c15'], pieza: {tipo: 'resistencia', huecos: ['bb.p2-15', 'bb.c15']}},
      {texto: 'Pon el otro <b>LED</b>: pata larga a la izquierda.', resaltar: ['bb.e15', 'bb.e16'], pieza: {tipo: 'led', en: {anodo: 'bb.e15', catodo: 'bb.e16'}}},
      {texto: 'Une los dos agujeros que parpadean con un cable.', resaltar: ['bb.a16', 'bb.n2-16'], conexion: ['bb.a16', 'bb.n2-16']},
    ],
    pistas: ['Sigue los puntos que parpadean, paso por paso.', 'Para poner la resistencia de pie, selecciónala y presiona R.', 'Cuando todos los pasos tengan ✓, presiona ▶ Iniciar simulación.'],
  },
  {
    id: 'G8', mundo: 'G', titulo: 'El botón', interactivo: true,
    explicacion: [
      {icono: '🔘', titulo: 'El pulsador', texto: 'El pulsador es un botón. Mientras lo aprietas, deja pasar la energía. Cuando lo sueltas, la corta.', dibujo: 'pulsador'},
      {icono: '👆', titulo: 'Cómo se usa aquí', texto: 'Cuando la simulación está encendida, haz clic sobre el botón rojo y mantenlo apretado.'},
    ],
    mision: 'Vamos a encender un LED con un botón.',
    objetivos: ['Al apretar el botón, el LED se enciende'],
    meta: {pulsador: true},
    paleta: ['pulsador', 'resistencia', 'led'],
    escena: {piezas: MESA_BASE},
    guia: [
      {texto: 'Arrastra el <b>pulsador</b> a los agujeros que parpadean (cruza el canal del centro).', resaltar: ['bb.e23', 'bb.e25', 'bb.f23', 'bb.f25'], pieza: {tipo: 'pulsador', en: {'1a': 'bb.e23', '2a': 'bb.e25'}}},
      {texto: 'Une el pin <b>5V</b> con el agujero que parpadea.', resaltar: ['ard.5V', 'bb.a23'], conexion: ['ard.5V', 'bb.a23']},
      {texto: 'Pon la <b>resistencia</b> en los agujeros que parpadean.', resaltar: ['bb.c25', 'bb.c29'], pieza: {tipo: 'resistencia', huecos: ['bb.c25', 'bb.c29']}},
      {texto: 'Pon el <b>LED</b>: pata larga en el agujero de la izquierda que parpadea.', resaltar: ['bb.e29', 'bb.e30'], pieza: {tipo: 'led', en: {anodo: 'bb.e29', catodo: 'bb.e30'}}},
      {texto: 'Une el agujero que parpadea con un pin <b>GND</b>.', resaltar: ['bb.a30', 'ard.GND2'], conexion: ['bb.a30', 'ard.GND2']},
    ],
    pistas: ['Sigue los puntos que parpadean.', 'Cuando la simulación esté encendida, aprieta el botón rojo con el mouse y no lo sueltes.', 'Aprieta el botón un rato y después suéltalo.'],
  },
  {
    id: 'G9', mundo: 'G', titulo: 'Mi primer programa', programa: true,
    explicacion: [
      {icono: '⌨️', titulo: 'Un programa', texto: 'Un programa es una lista de órdenes para el Arduino. Las armamos con bloques, como piezas de rompecabezas.'},
      {icono: '🧩', titulo: 'Los bloques', texto: 'Los bloques están a la derecha, en categorías de colores. Arrastras un bloque y lo encajas dentro de otro.'},
      {icono: '💡', titulo: 'El pin 13', texto: 'El LED está conectado al pin 13. Si el programa pone el pin 13 en ALTO, el LED se enciende.'},
    ],
    mision: 'Vamos a encender el LED con un programa. Sigue los pasos de la izquierda.',
    objetivos: ['El LED se enciende'],
    meta: {encendidos: 1},
    escena: MESA_LED13, bloques: {},
    guia: [
      {texto: 'En la categoría <b>Salidas</b> (panel del código), arrastra el bloque <b>poner pin 13 en ALTO</b> y encájalo <b>dentro</b> de <b>al iniciar</b>.', codigo: /void setup\(\) \{[^}]*digitalWrite\(13, HIGH\)/},
    ],
    pistas: ['El bloque verde "poner pin … en …" está en la categoría Salidas.', 'Suéltalo dentro de "al iniciar": tiene que quedar encajado, no suelto.', 'Revisa que diga pin 13 y ALTO. Después presiona ▶ Iniciar simulación.'],
  },
  {
    id: 'G10', mundo: 'G', titulo: 'Parpadea', programa: true,
    explicacion: [
      {icono: '🔁', titulo: 'Repetir siempre', texto: 'Lo que pones dentro de "repetir siempre" se hace una y otra vez, sin parar.'},
      {icono: '⏱️', titulo: 'Esperar', texto: 'El bloque "esperar" detiene el programa un ratito. 1000 milisegundos es 1 segundo.'},
    ],
    mision: 'Vamos a hacer que el LED se encienda y se apague solo. Sigue los pasos de la izquierda.',
    objetivos: ['El LED parpadea'],
    meta: {parpadea: true},
    escena: MESA_LED13, bloques: {},
    guia: [
      {texto: 'Pon el bloque <b>poner pin 13 en ALTO</b> dentro de <b>repetir siempre</b>.', codigo: /void loop\(\) \{\s*digitalWrite\(13, HIGH\);/},
      {texto: 'Debajo, pon <b>esperar 1000 milisegundos</b> (categoría Tiempo).', codigo: /void loop\(\) \{\s*digitalWrite\(13, HIGH\);\s*delay\(\d+\);/},
      {texto: 'Debajo, pon otro <b>poner pin 13</b> y cámbialo a <b>BAJO</b>.', codigo: /void loop\(\) \{\s*digitalWrite\(13, HIGH\);\s*delay\(\d+\);\s*digitalWrite\(13, LOW\);/},
      {texto: 'Al final, otro <b>esperar 1000 milisegundos</b>.', codigo: /void loop\(\) \{\s*digitalWrite\(13, HIGH\);\s*delay\(\d+\);\s*digitalWrite\(13, LOW\);\s*delay\(\d+\);/},
    ],
    pistas: ['Los bloques van dentro de "repetir siempre", uno debajo del otro.', 'El orden es: encender, esperar, apagar, esperar.', 'Para cambiar ALTO por BAJO, haz clic en la palabra ALTO del bloque.'],
  },
  {
    id: 'G11', mundo: 'G', titulo: '¡Que suene!', interactivo: true,
    explicacion: [
      {icono: '🔊', titulo: 'El buzzer', texto: 'El buzzer hace sonidos. Tiene una pata + y una pata −, como el LED.', dibujo: 'buzzer'},
      {icono: '🔇', titulo: 'El sonido', texto: 'Para escucharlo, revisa que el botón 🔊 de la mesa esté activado.'},
    ],
    mision: 'Vamos a hacer sonar el buzzer. Sigue los pasos de la izquierda.',
    objetivos: ['El buzzer suena'],
    meta: {sonido: true},
    paleta: ['buzzer'],
    escena: {piezas: MESA_BASE},
    guia: [
      {texto: 'Arrastra el <b>buzzer</b>. La pata <b>+</b> va en el agujero de la izquierda que parpadea.', resaltar: ['bb.e10', 'bb.e12'], pieza: {tipo: 'buzzer', en: {mas: 'bb.e10', menos: 'bb.e12'}}},
      {texto: 'Une el pin <b>5V</b> con el agujero que parpadea.', resaltar: ['ard.5V', 'bb.a10'], conexion: ['ard.5V', 'bb.a10']},
      {texto: 'Une el agujero que parpadea con un pin <b>GND</b>.', resaltar: ['bb.a12', 'ard.GND2'], conexion: ['bb.a12', 'ard.GND2']},
    ],
    pistas: ['Sigue los puntos que parpadean.', 'La pata + del buzzer tiene un signo + rojo al lado. Va a la izquierda.', 'Cuando todos los pasos tengan ✓, presiona ▶ Iniciar simulación.'],
  },
  {
    id: 'G12', mundo: 'G', titulo: 'El servo', programa: true,
    explicacion: [
      {icono: '🦾', titulo: 'El servomotor', texto: 'El servo es un motor que gira hasta el ángulo que le digas, de 0 a 180 grados, y se queda ahí.', dibujo: 'servo'},
      {icono: '📐', titulo: 'Los ángulos', texto: '0 grados es un extremo, 90 es la mitad y 180 es el otro extremo.'},
    ],
    mision: 'Vamos a mover el servo con un programa. Sigue los pasos de la izquierda.',
    objetivos: ['El servo llega a 180°'],
    meta: {servo: [180]},
    escena: mesaServo({piezas: ARDUINO_SOLO.slice(), cables: []}), bloques: {},
    guia: [
      {texto: 'En la categoría <b>Motores</b>, arrastra el bloque <b>mover servo</b> dentro de <b>al iniciar</b>.', codigo: /void setup\(\) \{[^}]*servo9\.write\(/},
      {texto: 'Haz clic en el número <b>90</b> del bloque y cámbialo por <b>180</b>.', codigo: /void setup\(\) \{[^}]*servo9\.write\(180\)/},
    ],
    pistas: ['El bloque naranja "mover servo" está en la categoría Motores.', 'Encájalo dentro de "al iniciar".', 'Cambia el número a 180 y presiona ▶ Iniciar simulación.'],
  },

  // ================= RETOS (proyectos: se arma todo desde cero) =================
  {
    id: 'R1', mundo: 'R', icono: '🚦', titulo: 'Semáforo de la escuela', dificultad: 1, para: '8vo y 9no', programa: true,
    resumen: 'Arma y programa el semáforo del cruce de la entrada.',
    mision: 'En la entrada del colegio hace falta un semáforo. Arma <b>tú</b> el circuito con un LED <b>rojo</b>, uno <b>amarillo</b> y uno <b>verde</b> (cada uno en su propio pin y con su resistencia) y prográmalo: <b>rojo → verde → amarillo → rojo…</b>, con una sola luz encendida a la vez.',
    objetivos: ['Orden: rojo → verde → amarillo → rojo', 'Una sola luz a la vez', 'Ningún LED quemado'],
    meta: {secuencia: ['led', 'led_verde', 'led_amarillo']},
    paleta: PALETA_TODO, escena: {piezas: MESA_BASE}, bloques: {},
    pistas: [
      'Cada LED va así: pin del Arduino → resistencia → pata larga del LED → pata corta → GND. Lleva GND a un riel − para compartirlo entre los tres.',
      'Usa un pin distinto para cada color, por ejemplo 12 (rojo), 11 (amarillo) y 10 (verde).',
      'Programa: rojo ALTO, esperar, rojo BAJO, verde ALTO, esperar, verde BAJO, amarillo ALTO, esperar, amarillo BAJO.',
    ],
  },
  {
    id: 'R2', mundo: 'R', icono: '🔦', titulo: 'Linterna con interruptor', dificultad: 2, para: '8vo y 9no', programa: true,
    resumen: 'Un clic la enciende y otro clic la apaga.',
    mision: 'Una linterna se enciende con un clic y se apaga con otro. Arma un circuito con un <b>pulsador</b> (con su resistencia de 10 kΩ) y un <b>LED</b>, y prográmalo: cada vez que presionas y sueltas el botón, el LED cambia entre encendido y apagado, y se queda así.',
    objetivos: ['Cada clic cambia el LED', 'El LED se queda así hasta el próximo clic'],
    meta: {conmutar: true},
    paleta: PALETA_TODO, escena: {piezas: MESA_BASE}, bloques: {},
    pistas: [
      'El botón se conecta como en el Mundo 5: un lado a 5V, el otro al pin de entrada y, desde ese mismo lado, la resistencia de 10 kΩ a GND.',
      'Necesitas dos variables: una que recuerde si el LED está encendido y otra con cómo estaba el botón antes.',
      'Revisa el desafío final del Mundo 5 ("interruptor"): es la misma idea.',
    ],
  },
  {
    id: 'R3', mundo: 'R', icono: '🚪', titulo: 'Alarma de puerta', dificultad: 1, para: '8vo y 9no', programa: true,
    resumen: 'Cuando la puerta se abre, suena la alarma.',
    mision: 'Un sensor de puerta funciona como un botón. Arma un circuito con un <b>pulsador</b> y un <b>buzzer</b>: mientras el botón está presionado (puerta abierta), el buzzer suena; al soltarlo, se calla.',
    objetivos: ['Botón presionado: el buzzer suena', 'Botón suelto: silencio'],
    meta: {alarma: true},
    paleta: PALETA_TODO, escena: {piezas: MESA_BASE}, bloques: {},
    pistas: [
      'El buzzer va de un pin del Arduino (pata +) a GND (pata −).',
      'El botón va con su resistencia de 10 kΩ, como en el Mundo 5.',
      'si leer pin digital (el del botón) = 1 → buzzer en ALTO; si no → BAJO.',
    ],
  },
  {
    id: 'R4', mundo: 'R', icono: '💡', titulo: 'Lámpara regulable', dificultad: 2, para: '8vo y 9no', programa: true,
    resumen: 'Una perilla controla el brillo de la luz.',
    mision: 'Las lámparas modernas tienen una perilla para elegir el brillo. Arma un circuito con un <b>potenciómetro</b> y un <b>LED en un pin con ~</b>, y prográmalo: perilla abajo, LED apagado; perilla arriba, LED al máximo; en el medio, brillo medio.',
    objetivos: ['Perilla abajo: LED casi apagado', 'Perilla arriba: LED brillante', 'En el medio: brillo medio'],
    meta: {perillaBrillo: true},
    paleta: PALETA_TODO, escena: {piezas: MESA_BASE}, bloques: {},
    pistas: [
      'El potenciómetro: un extremo a 5V, el otro a GND y la pata del centro a A0.',
      'El LED tiene que ir en un pin con ~ (3, 5, 6, 9, 10 u 11) para poder variar el brillo.',
      'poner pin ~ al valor (convertir (leer pin analógico A0) de 0–1023 a 0–255).',
    ],
  },
  {
    id: 'R5', mundo: 'R', icono: '🌙', titulo: 'Lámpara automática', dificultad: 2, para: '9no y 10mo', programa: true,
    accion: 'cambia la luz: arrastra el sol de la fotorresistencia hacia arriba y hacia abajo',
    resumen: 'La luz de la calle que se enciende sola de noche.',
    mision: 'Las luces de la calle se encienden solas cuando oscurece. Arma un circuito con una <b>fotorresistencia</b> (con su resistencia de 10 kΩ) y un <b>LED</b>: con poca luz el LED se enciende y con mucha luz se apaga.',
    objetivos: ['Poca luz: LED encendido', 'Mucha luz: LED apagado'],
    meta: {umbral: {bajo: 0.35, alto: 0.65}, invertido: true},
    fallaMeta: 'El LED debe encenderse con poca luz (sol abajo) y apagarse con mucha luz (sol arriba).',
    paleta: PALETA_TODO, escena: {piezas: MESA_BASE}, bloques: {},
    pistas: [
      'La fotorresistencia forma un divisor de voltaje: un lado a 5V, el otro a A0, y desde A0 la resistencia de 10 kΩ a GND.',
      'Compara la lectura de A0 con 500: menos de 500 es "oscuro".',
      'si leer pin analógico A0 < 500 → LED en ALTO; si no → BAJO.',
    ],
  },
  {
    id: 'R6', mundo: 'R', icono: '🚗', titulo: 'Sensor de estacionamiento', dificultad: 3, para: '9no y 10mo', programa: true,
    accion: 'acerca y aleja el objeto del sensor (arrástralo)',
    resumen: 'Un pitido avisa cuando el carro está por chocar.',
    mision: 'Al retroceder, muchos carros avisan con un pitido si hay algo detrás. Arma un circuito con el <b>sensor ultrasónico</b> y un <b>buzzer</b>: si hay un objeto a <b>menos de 20 cm</b>, el buzzer suena; si no, silencio.',
    objetivos: ['Objeto cerca: el buzzer suena', 'Objeto lejos: silencio'],
    meta: {umbral: {bajo: 0.06, alto: 0.2}, invertido: true, salida: 'buzzer'},
    fallaMeta: 'El buzzer debe sonar cuando el objeto está a menos de 20 cm y callarse cuando está lejos.',
    paleta: PALETA_TODO, escena: {piezas: MESA_BASE}, bloques: {},
    pistas: [
      'El sensor: VCC a 5V, GND a GND, TRIG y ECHO a dos pines digitales (por ejemplo 7 y 6).',
      'En el bloque "distancia en cm", elige los mismos pines que usaste para TRIG y ECHO.',
      'si distancia < 20 → buzzer en ALTO; si no → BAJO.',
    ],
  },
  {
    id: 'R7', mundo: 'R', icono: '🚧', titulo: 'Barrera automática', dificultad: 3, para: '9no y 10mo', programa: true,
    accion: 'acerca y aleja el objeto del sensor (arrástralo)',
    resumen: 'La pluma del estacionamiento sube sola al llegar un carro.',
    mision: 'Arma la barrera de un estacionamiento con un <b>sensor ultrasónico</b> y un <b>servomotor</b>: si llega un carro (objeto a menos de 15 cm), la barrera sube a <b>90°</b>; si no, baja a <b>0°</b>.',
    objetivos: ['Objeto cerca: servo a 90°', 'Objeto lejos: servo a 0°'],
    meta: {servoCerca: true},
    paleta: PALETA_TODO, escena: {piezas: MESA_BASE}, bloques: {},
    pistas: [
      'El servo tiene 3 cables: marrón a GND, rojo a 5V y naranja (señal) a un pin, por ejemplo el 9.',
      'Usa la protoboard para repartir 5V y GND entre el sensor y el servo.',
      'si distancia < 15 → mover servo a 90; si no → mover servo a 0.',
    ],
  },
  {
    id: 'R8', mundo: 'R', icono: '🎹', titulo: 'Piano de 3 teclas', dificultad: 3, para: '9no y 10mo', programa: true,
    accion: 'toca el piano: presiona los botones, uno por uno',
    resumen: 'Tres botones, tres notas musicales.',
    mision: 'Construye un piano: <b>tres pulsadores</b> y un <b>buzzer</b>. Cada botón hace sonar una nota distinta (por ejemplo Do = 262, Re = 294 y Mi = 330) mientras lo presionas.',
    objetivos: ['Cada botón suena con su propia nota', 'Se escuchan 3 notas diferentes'],
    meta: {notas: 3},
    paleta: PALETA_TODO, escena: {piezas: MESA_BASE}, bloques: {},
    pistas: [
      'Cada botón necesita su propio pin de entrada y su propia resistencia de 10 kΩ a GND.',
      'Usa un "si … si no si … si no si … si no": un caso por cada botón, y al final silenciar.',
      'si botón 1 = 1 → sonar 262; si no, si botón 2 = 1 → sonar 294; si no, si botón 3 = 1 → sonar 330; si no → silenciar.',
    ],
  },
  {
    id: 'R9', mundo: 'R', icono: '🌀', titulo: 'Ventilador con perilla', dificultad: 3, para: '10mo', programa: true,
    resumen: 'Motor DC, driver y potenciómetro para elegir la velocidad.',
    mision: 'Construye un ventilador: un <b>motor DC</b> conectado a un <b>driver L298N</b> y un <b>potenciómetro</b> que controla la velocidad. Perilla abajo: casi parado; arriba: a toda velocidad.',
    objetivos: ['Perilla abajo: motor casi parado', 'Perilla al medio: media velocidad', 'Perilla arriba: máxima velocidad'],
    meta: {motorPerilla: true},
    paleta: PALETA_TODO, escena: {piezas: MESA_BASE}, bloques: {},
    pistas: [
      'El driver: ENA a un pin con ~, IN1 e IN2 a dos pines digitales, GND a GND y VCC a 5V. El motor va a OUT1 y OUT2.',
      'En "al iniciar" elige el sentido: IN1 en ALTO e IN2 en BAJO.',
      'En "repetir siempre": poner pin ~ (ENA) al valor (convertir (leer pin analógico A0) de 0–1023 a 0–255).',
    ],
  },
  {
    id: 'R10', mundo: 'R', icono: '🤖', titulo: 'Robot que esquiva', dificultad: 3, para: '10mo', programa: true,
    accion: 'acerca y aleja el obstáculo del sensor (arrástralo)',
    resumen: 'Si hay un obstáculo cerca, retrocede.',
    mision: 'Construye el "cerebro" de un robot: un <b>sensor ultrasónico</b>, un <b>driver L298N</b> y un <b>motor DC</b>. Si hay un obstáculo a <b>menos de 20 cm</b>, el motor gira hacia atrás; si el camino está libre, avanza.',
    objetivos: ['Obstáculo cerca: retrocede', 'Camino libre: avanza'],
    meta: {motorDistancia: true},
    paleta: PALETA_TODO, escena: {piezas: MESA_BASE}, bloques: {},
    pistas: [
      'Cuidado con los pines: el sensor y el driver no pueden usar los mismos.',
      'ENA en ALTO en "al iniciar" (velocidad máxima). El sentido se decide con IN1 e IN2.',
      'si distancia < 20 → IN1 BAJO e IN2 ALTO (atrás); si no → IN1 ALTO e IN2 BAJO (adelante).',
    ],
  },
  {
    id: 'R11', mundo: 'R', icono: '🎨', titulo: 'Proyecto libre', dificultad: 3, para: '10mo', programa: true,
    resumen: 'Inventa tu propio proyecto y entrégaselo a tu profesor.',
    mision: 'Diseña <b>tu propio proyecto</b> para resolver un problema real de tu casa, tu colegio o tu barrio. Debe tener al menos una <b>entrada</b> (sensor o botón) y una <b>salida</b> (luz, sonido o movimiento). Cuando funcione, revisa la lista de la izquierda y entrégalo.',
    meta: {manual: true},
    paleta: PALETA_TODO, escena: {piezas: MESA_BASE}, bloques: {},
    pistas: [
      'Empieza por el problema: ¿qué quieres que pase y cuándo? Por ejemplo: "si hace mucho calor, que se encienda un ventilador".',
      'Arma y prueba una parte a la vez: primero la entrada (mira sus valores en el monitor), después la salida.',
      'Si algo no funciona, revisa los niveles del mundo de ese componente: ahí está cómo se conecta.',
    ],
  },
  {
    id: 'TL', mundo: 'R', icono: '🛠️', titulo: 'Taller libre', libre: true, programa: true,
    resumen: 'Todos los componentes, sin reglas ni evaluación. ¡Experimenta!',
    mision: 'Este es tu taller: usa cualquier componente, arma lo que quieras y prográmalo. Aquí nada se evalúa.',
    objetivos: [], meta: {}, pistas: [],
    paleta: PALETA_TODO, escena: {piezas: MESA_BASE}, bloques: {},
  },
];

// Ruta guiada: actividades adaptadas, más sencillas y con explicaciones paso a paso.
// Solo la ven los estudiantes marcados en la hoja de progreso (columna "Ruta guiada") y el docente.
const RUTA = {n: 'G', titulo: 'Mi ruta guiada', tema: 'Aprende paso a paso, a tu ritmo', icono: '🌟', color: '#0EA5A4'};

// Retos: proyectos abiertos (siempre desbloqueados). dificultad 1-3, para: cursos sugeridos, resumen: texto de la tarjeta.
// meta.manual: el estudiante entrega su proyecto con una lista de revisión. libre: taller sin evaluación.
const RETOS = {n: 'R', titulo: 'Retos', tema: 'Proyectos para resolver problemas reales', icono: '🏆', color: '#F77F00'};

// ---------- Fichas de componentes ----------
// dibujo: cómo se muestra el componente (viewBox, posición, escala, agujeros resaltados y etiquetas).
// etiquetas: [x1, y1, x2, y2, título, detalle, alineación]
const FICHAS = {
  arduino: {
    etiqueta: 'Conoce tu herramienta', titulo: 'Arduino UNO', subtitulo: 'Placa programable',
    dibujo: {tipo: 'arduino', viewBox: '-20 -8 360 268'},
    secciones: [
      {icono: '🧠', titulo: '¿Qué es?', texto: 'Una placa con una computadora diminuta (el <b>microcontrolador</b>) que puedes programar para controlar luces, sonidos, motores y sensores.'},
      {icono: '📍', titulo: 'Sus pines', texto: '<b>Digitales</b> (0–13): encienden o apagan. <b>Analógicos</b> (A0–A5): leen valores que cambian. <b>Energía</b>: 5V, 3.3V y GND.'},
      {icono: '⚠️', titulo: '¡Cuidado!', texto: 'Nunca unas el pin <b>5V</b> directo con <b>GND</b>: es un cortocircuito y puede dañar la placa.', cuidado: true},
      {icono: '🔎', titulo: 'Dato curioso', texto: 'Arduino nació en Italia en 2005 para que estudiantes de diseño pudieran crear proyectos electrónicos sin ser expertos.'},
    ],
  },
  protoboard: {
    etiqueta: 'Componente nuevo', titulo: 'Protoboard', subtitulo: 'Placa de pruebas (breadboard)',
    dibujo: {tipo: 'protoboard', viewBox: '-6 -6 420 240', resaltar: ['a5', 'b5', 'c5', 'd5', 'e5', 'f12', 'g12', 'h12', 'i12', 'j12'].concat(AGUJEROS_PROTO.filter(h => h.red === 'p1').map(h => h.id))},
    secciones: [
      {icono: '🧩', titulo: '¿Qué es?', texto: 'Una placa con agujeros para armar circuitos <b>sin soldar</b>: los componentes y cables se insertan y se pueden sacar cuando quieras.'},
      {icono: '🔗', titulo: '¿Cómo se conecta por dentro?', texto: 'Cada <b>columna de 5 agujeros</b> (a–e o f–j) está unida por dentro; el canal del centro las separa. Los <b>rieles</b> + y − están unidos a lo largo. En el dibujo, lo verde está conectado.'},
      {icono: '⚠️', titulo: '¡Cuidado!', texto: 'Si pones las dos patas de un componente en la <b>misma columna</b>, quedan unidas y el componente no funciona.', cuidado: true},
      {icono: '🔎', titulo: 'Dato curioso', texto: 'En inglés se llama <i>breadboard</i>, "tabla de pan": los primeros aficionados armaban sus circuitos clavando piezas sobre tablas de cocina.'},
    ],
  },
  led: {
    etiqueta: 'Componente nuevo', titulo: 'LED', subtitulo: 'Diodo emisor de luz',
    dibujo: {
      tipo: 'led', viewBox: '0 0 350 225', x: 150, y: 135, escala: 3, patasLargas: true,
      etiquetas: [[147, 202, 90, 202, 'Ánodo (+)', 'pata larga', 'end'], [189, 172, 232, 172, 'Cátodo (−)', 'pata corta', 'start'], [199, 52, 232, 52, 'Cápsula', 'por aquí sale la luz', 'start']],
    },
    secciones: [
      {icono: '✨', titulo: '¿Qué hace?', texto: 'Convierte la electricidad en luz. Lo encuentras en semáforos, pantallas, linternas… ¡y en la misma placa Arduino!'},
      {icono: '➕', titulo: '¿Cómo se conecta?', texto: 'Tiene <b>polaridad</b>: la corriente solo pasa en un sentido. La <b>pata larga (ánodo, +)</b> va hacia el positivo y la <b>pata corta (cátodo, −)</b> hacia GND. Si lo pones al revés no se daña, pero no enciende.'},
      {icono: '⚠️', titulo: '¡Cuidado!', texto: 'Nunca lo conectes directo a 5V: necesita una <b>resistencia</b> (por ejemplo, de 220 Ω) que limite la corriente. Sin ella… ¡se quema!', cuidado: true, mini: 'led'},
      {icono: '🔎', titulo: 'Dato curioso', texto: 'LED viene del inglés <i>Light Emitting Diode</i>. Gastan muy poca energía; por eso hoy reemplazan a los focos tradicionales.'},
    ],
  },
  resistencia: {
    etiqueta: 'Componente nuevo', titulo: 'Resistencia', subtitulo: 'Limita la corriente',
    dibujo: {
      tipo: 'resistencia', viewBox: '0 0 350 190', x: 74, y: 75, escala: 4.2,
      etiquetas: [[134, 102, 134, 128, 'Bandas de colores', 'indican su valor: 220 Ω', 'middle'], [265, 75, 265, 128, 'Patas', 'no tienen polaridad', 'middle']],
    },
    secciones: [
      {icono: '🚰', titulo: '¿Qué hace?', texto: '<b>Frena</b> la corriente que pasa por el circuito, como una llave de agua medio cerrada. Así protege a componentes delicados como el LED.'},
      {icono: '↔️', titulo: '¿Cómo se conecta?', texto: 'No tiene polaridad: puedes ponerla en cualquier sentido. Va en el camino de la corriente, antes o después del LED.'},
      {icono: '🎨', titulo: 'Su código de colores', texto: 'Las bandas indican su valor en ohmios (Ω). Rojo-rojo-marrón = <b>220 Ω</b>, la que usamos con el LED.'},
      {icono: '🔎', titulo: 'Dato curioso', texto: 'El ohmio (Ω) se llama así en honor al físico alemán Georg Ohm, que estudió cómo se comporta la corriente.'},
    ],
  },
  pulsador: {
    etiqueta: 'Componente nuevo', titulo: 'Pulsador', subtitulo: 'Botón de entrada',
    dibujo: {
      tipo: 'pulsador', viewBox: '0 0 300 215', x: 96, y: 140, escala: 3.5,
      etiquetas: [[96, 144, 60, 172, 'Lado 1', 'patas unidas', 'middle'], [180, 144, 222, 172, 'Lado 2', 'patas unidas', 'middle']],
    },
    secciones: [
      {icono: '👆', titulo: '¿Qué hace?', texto: 'Mientras lo presionas, deja pasar la corriente; al soltarlo, la corta. Es una <b>entrada</b>: le avisa algo al Arduino.'},
      {icono: '🔗', titulo: '¿Cómo se conecta?', texto: 'Tiene 4 patas. Las dos de cada lado están <b>unidas siempre</b>; al presionar, se unen los dos lados. Por eso se coloca <b>cruzando el canal</b> del centro de la protoboard.'},
      {icono: '⚠️', titulo: '¡Cuidado!', texto: 'Si lo pones girado, las patas que siempre están unidas conectan el circuito todo el tiempo y el botón ya no corta nada.', cuidado: true},
      {icono: '🔎', titulo: 'Dato curioso', texto: 'Los teclados y los controles de videojuegos tienen un pulsador debajo de cada botón.'},
    ],
  },
  buzzer: {
    etiqueta: 'Componente nuevo', titulo: 'Buzzer', subtitulo: 'Zumbador',
    dibujo: {
      tipo: 'buzzer', viewBox: '0 0 300 215', x: 100, y: 150, escala: 3.5,
      etiquetas: [[100, 154, 70, 178, 'Pata +', 'hacia el pin o 5V', 'middle'], [184, 154, 214, 178, 'Pata −', 'hacia GND', 'middle']],
    },
    secciones: [
      {icono: '🔊', titulo: '¿Qué hace?', texto: 'Convierte la electricidad en sonido. Es una <b>salida</b>, como el LED, pero para los oídos.'},
      {icono: '➕', titulo: '¿Cómo se conecta?', texto: 'Tiene polaridad: la pata <b>+</b> va hacia el pin o el 5V, y la pata <b>−</b> hacia GND.'},
      {icono: '🎵', titulo: 'Las notas', texto: 'Con <b>tone(pin, frecuencia)</b> eliges la nota: 262 Hz es Do, 294 Re, 330 Mi, 349 Fa, 392 Sol. Con <b>noTone(pin)</b> se calla.'},
      {icono: '🔎', titulo: 'Dato curioso', texto: 'En este simulador, con 5V suena un tono fijo (como un buzzer "activo"); con tone() suena la nota que elijas (como uno "pasivo").'},
    ],
  },
  potenciometro: {
    etiqueta: 'Componente nuevo', titulo: 'Potenciómetro', subtitulo: 'Perilla',
    dibujo: {
      tipo: 'potenciometro', viewBox: '0 0 300 215', x: 108, y: 160, escala: 3.5,
      etiquetas: [[108, 164, 78, 182, 'Extremo', 'a GND', 'middle'], [150, 164, 150, 182, 'Centro', 'al pin A0', 'middle'], [192, 164, 222, 182, 'Extremo', 'a 5V', 'middle']],
    },
    secciones: [
      {icono: '🎛️', titulo: '¿Qué hace?', texto: 'Es una perilla. Conectado al Arduino, le dice al programa <b>cuánto</b> la giraste.'},
      {icono: '🔗', titulo: '¿Cómo se conecta?', texto: 'Los <b>extremos</b> van a 5V y a GND, y la <b>pata del centro</b> va a un pin analógico (A0). Al girar, el pin recibe un voltaje entre 0 y 5V.'},
      {icono: '📏', titulo: 'Sus valores', texto: '<b>analogRead(A0)</b> da un número de <b>0 a 1023</b>. Para el brillo de un LED (de 0 a 255) se convierte con <b>map()</b>.'},
      {icono: '🔎', titulo: 'Dato curioso', texto: 'Las perillas de volumen de los parlantes y de las guitarras eléctricas son potenciómetros.'},
    ],
  },
  pwm: {
    etiqueta: 'Concepto nuevo', titulo: 'PWM', subtitulo: 'Brillo y velocidad a medias',
    codigo: 'void loop() {\n  analogWrite(9, 0);    // apagado\n  delay(1000);\n  analogWrite(9, 128);  // a medias\n  delay(1000);\n  analogWrite(9, 255);  // máximo\n  delay(1000);\n}',
    secciones: [
      {icono: '〰️', titulo: '¿Qué es?', texto: 'Un pin digital solo sabe dar 5V o 0V. Con <b>PWM</b> se enciende y se apaga <b>muy rápido</b> (cientos de veces por segundo): el LED se ve a medias.'},
      {icono: '🎚️', titulo: 'analogWrite', texto: '<b>analogWrite(pin, valor)</b>: el valor va de <b>0</b> (apagado) a <b>255</b> (máximo). 128 es más o menos la mitad.'},
      {icono: '⚠️', titulo: '¡Cuidado!', texto: 'Solo funciona en los pines con <b>~</b>: 3, 5, 6, 9, 10 y 11.', cuidado: true},
      {icono: '🔎', titulo: 'Dato curioso', texto: 'Con PWM también se controla la velocidad de los motores y el brillo de las pantallas.'},
    ],
  },
  rgb: {
    etiqueta: 'Componente nuevo', titulo: 'LED RGB', subtitulo: 'Tres colores en un LED',
    dibujo: {
      tipo: 'led_rgb', viewBox: '0 0 300 230', x: 90, y: 175, escala: 3,
      etiquetas: [[90, 179, 90, 190, 'R', 'rojo', 'middle'], [126, 179, 126, 190, '−', 'GND', 'middle'], [162, 179, 162, 190, 'G', 'verde', 'middle'], [198, 179, 198, 190, 'B', 'azul', 'middle']],
    },
    secciones: [
      {icono: '🌈', titulo: '¿Qué es?', texto: 'Un LED con <b>tres LEDs dentro</b>: rojo, verde y azul. Mezclándolos se forman otros colores.'},
      {icono: '🔗', titulo: '¿Cómo se conecta?', texto: 'La pata más larga es la <b>común</b> y va a GND. Cada color va a su propio pin, <b>con su propia resistencia</b>.'},
      {icono: '🎨', titulo: 'Mezclas', texto: 'Rojo + verde = <b>amarillo</b>. Rojo + azul = <b>morado</b>. Verde + azul = <b>celeste</b>. Los tres = <b>blanco</b>.'},
      {icono: '🔎', titulo: 'Dato curioso', texto: 'Cada pixel de la pantalla de tu celular tiene puntitos rojos, verdes y azules que se mezclan igual.'},
    ],
  },
  servo: {
    etiqueta: 'Componente nuevo', titulo: 'Servomotor', subtitulo: 'Motor que gira a un ángulo exacto',
    dibujo: {
      tipo: 'servo', viewBox: '0 0 300 235', x: 110, y: 205, escala: 2.4,
      etiquetas: [[180, 75, 230, 60, 'Brazo', 'de 0° a 180°', 'start'], [139, 205, 200, 222, 'Cables', 'GND · 5V · señal', 'start']],
    },
    secciones: [
      {icono: '📐', titulo: '¿Qué hace?', texto: 'Gira hasta un <b>ángulo exacto</b>, de 0° a 180°, y se queda ahí. Se usa en barreras, brazos robóticos y timones.'},
      {icono: '🔗', titulo: '¿Cómo se conecta?', texto: 'Cable <b>marrón a GND</b>, <b>rojo a 5V</b> y <b>naranja (señal) a un pin</b>. La señal da la orden; el 5V da la fuerza.'},
      {icono: '⌨️', titulo: 'En código', texto: '<code>#include &lt;Servo.h&gt;</code>, luego <code>miServo.attach(9);</code> y <code>miServo.write(90);</code> para ir a 90°.'},
      {icono: '🔎', titulo: 'Dato curioso', texto: 'Por dentro tiene un motor, engranajes y un potenciómetro que le dice en qué ángulo está.'},
    ],
  },
  ldr: {
    etiqueta: 'Componente nuevo', titulo: 'Fotorresistencia', subtitulo: 'Sensor de luz (LDR)',
    dibujo: {tipo: 'ldr', viewBox: '0 0 300 215', x: 100, y: 175, escala: 3.5, etiquetas: [[121, 179, 121, 192, 'Patas', 'sin polaridad', 'middle']]},
    secciones: [
      {icono: '☀️', titulo: '¿Qué hace?', texto: 'Cambia su resistencia según la luz: con <b>mucha luz</b> deja pasar más corriente; a <b>oscuras</b>, menos.'},
      {icono: '🔗', titulo: '¿Cómo se conecta?', texto: 'Junto con una <b>resistencia fija</b> (10 kΩ) forma un <b>divisor de voltaje</b>: el punto del medio va a un pin analógico (A0).'},
      {icono: '📏', titulo: 'Sus valores', texto: '<b>analogRead(A0)</b> da un número de 0 a 1023: más alto cuanto más luz.'},
      {icono: '🔎', titulo: 'Dato curioso', texto: 'Las luces de la calle que se encienden solas al anochecer usan un sensor de luz.'},
    ],
  },
  ultrasonico: {
    etiqueta: 'Componente nuevo', titulo: 'Sensor ultrasónico', subtitulo: 'Mide distancias (HC-SR04)',
    dibujo: {
      tipo: 'ultrasonico', viewBox: '0 0 320 240', x: 120, y: 215, escala: 1.5,
      etiquetas: [[129, 179, 72, 179, 'Emisor', 'lanza el sonido', 'end'], [165, 179, 222, 179, 'Receptor', 'escucha el eco', 'start']],
    },
    secciones: [
      {icono: '🦇', titulo: '¿Qué hace?', texto: 'Lanza un sonido muy agudo (que no oímos) y mide cuánto tarda en volver el <b>eco</b>. Así calcula la distancia, como un murciélago.'},
      {icono: '🔗', titulo: '¿Cómo se conecta?', texto: '<b>VCC</b> a 5V, <b>GND</b> a GND, <b>TRIG</b> a un pin de salida (lanza el sonido) y <b>ECHO</b> a un pin de entrada (recibe el eco).'},
      {icono: '📏', titulo: 'En código', texto: '<b>pulseIn(ECHO, HIGH)</b> da el tiempo del eco en microsegundos; dividido entre <b>58</b> da los centímetros.'},
      {icono: '🔎', titulo: 'Dato curioso', texto: 'Los sensores de retroceso de los carros funcionan con ultrasonido.'},
    ],
  },
  motor: {
    etiqueta: 'Componente nuevo', titulo: 'Motor DC', subtitulo: 'Motor de corriente continua',
    dibujo: {tipo: 'motor', viewBox: '0 0 300 240', x: 110, y: 212, escala: 2.4},
    secciones: [
      {icono: '🌀', titulo: '¿Qué hace?', texto: 'Convierte la electricidad en <b>giro</b>. Mueve las ruedas de los robots, los ventiladores y los juguetes.'},
      {icono: '🔁', titulo: 'El sentido', texto: 'Si inviertes la corriente (cambias + por −), gira <b>al revés</b>.'},
      {icono: '⚠️', titulo: '¡Cuidado!', texto: 'Nunca lo conectes directo a un pin del Arduino: necesita mucha corriente. Usa un <b>driver</b>.', cuidado: true},
      {icono: '🔎', titulo: 'Dato curioso', texto: 'Un motor DC también funciona al revés: si lo haces girar con la mano, ¡genera electricidad!'},
    ],
  },
  l298n: {
    etiqueta: 'Componente nuevo', titulo: 'Driver L298N', subtitulo: 'El "músculo" del Arduino',
    dibujo: {tipo: 'l298n', viewBox: '0 0 300 235', x: 50, y: 210, escala: 2.2},
    secciones: [
      {icono: '💪', titulo: '¿Qué hace?', texto: 'Recibe órdenes del Arduino y le entrega al motor la <b>energía</b> que necesita. El Arduino es el cerebro; el driver, el músculo.'},
      {icono: '🧭', titulo: 'IN1 e IN2: el sentido', texto: 'IN1 en ALTO e IN2 en BAJO → adelante. Al revés → atrás. Los dos iguales → se detiene.'},
      {icono: '🎚️', titulo: 'ENA: la velocidad', texto: 'Con <b>analogWrite</b> en ENA (un pin con ~) eliges la velocidad: 0 = parado, 255 = máxima.'},
      {icono: '🔋', titulo: 'En la vida real', texto: 'El motor se alimenta con <b>pilas o una batería</b> en +V (aquí usamos los 5V del Arduino para simplificar).'},
    ],
  },
  programa: {
    etiqueta: 'Concepto nuevo', titulo: 'Programa', subtitulo: 'Instrucciones para el Arduino',
    codigo: 'void setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(1000);\n  digitalWrite(13, LOW);\n  delay(1000);\n}',
    secciones: [
      {icono: '📜', titulo: '¿Qué es un programa?', texto: 'Una lista de instrucciones que el Arduino sigue <b>en orden</b>, una por una, muy rápido.'},
      {icono: '1️⃣', titulo: 'al iniciar · setup()', texto: 'Lo que pongas aquí se hace <b>una sola vez</b>, cuando el Arduino se enciende.'},
      {icono: '🔁', titulo: 'repetir siempre · loop()', texto: 'Lo que pongas aquí se repite <b>una y otra vez</b>, sin parar.'},
      {icono: '💡', titulo: 'poner pin en ALTO / BAJO', texto: '<b>ALTO</b> (HIGH) le da 5V al pin y enciende lo que tenga conectado; <b>BAJO</b> (LOW) lo apaga. En código: digitalWrite().'},
      {icono: '⏱️', titulo: 'esperar · delay()', texto: 'Hace que el programa espere. <b>1000 milisegundos = 1 segundo.</b>'},
    ],
  },
};
