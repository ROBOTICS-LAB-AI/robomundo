// Panel de programación: bloques (Blockly, estilo Scratch) y texto (código Arduino), más el monitor.
// Los bloques generan código Arduino de verdad, que es el mismo que ejecuta el simulador; por eso
// también se puede pegar código escrito a mano o generado por una IA en la pestaña Texto.
const Codigo = (() => {
  const BLOCKLY = 'https://unpkg.com/blockly@10.4.3/';
  const $ = s => document.querySelector(s);
  const PINES = [...Array(14).keys()].map(n => [String(n), String(n)]).concat(['A0', 'A1', 'A2', 'A3', 'A4', 'A5'].map(a => [a, a]));
  const PINES_PWM = [3, 5, 6, 9, 10, 11].map(n => ['~' + n, String(n)]);
  let ws = null, gen = null, carga = null, pestana = 'bloques', textoEditado = false, alCambiar = () => {};

  // ---------- carga de Blockly (solo cuando hace falta) ----------
  function cargarBlockly() {
    if (carga) return carga;
    const script = src => new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = mal;
      document.head.appendChild(s);
    });
    carga = script(BLOCKLY + 'blockly_compressed.js')
      .then(() => script(BLOCKLY + 'blocks_compressed.js'))
      .then(() => script(BLOCKLY + 'msg/es.js'))
      .then(() => { definirBloques(); gen = crearGenerador(); });
    carga.catch(() => { carga = null; });
    return carga;
  }

  function definirBloques() {
    const instruccion = {previousStatement: null, nextStatement: null, inputsInline: true};
    const pin = (nombre = 'PIN', opciones = PINES) => ({type: 'field_dropdown', name: nombre, options: opciones});
    const cuerpo = [{type: 'input_dummy'}, {type: 'input_statement', name: 'CUERPO'}];
    Blockly.common.defineBlocksWithJsonArray([
      {type: 'ar_inicio', message0: 'al iniciar %1 %2', args0: cuerpo, colour: 40, tooltip: 'Se ejecuta una sola vez, cuando el Arduino se enciende (setup).'},
      {type: 'ar_siempre', message0: 'repetir siempre %1 %2', args0: cuerpo, colour: 40, tooltip: 'Se repite una y otra vez, sin parar (loop).'},
      Object.assign({type: 'ar_escribir', message0: 'poner pin %1 en %2', colour: 160, tooltip: 'digitalWrite: ALTO enciende (5V), BAJO apaga (0V).',
        args0: [pin(), {type: 'field_dropdown', name: 'VALOR', options: [['ALTO', 'HIGH'], ['BAJO', 'LOW']]}]}, instruccion),
      Object.assign({type: 'ar_pwm', message0: 'poner pin %1 al valor %2', colour: 160, tooltip: 'analogWrite: 0 = apagado, 255 = máximo.',
        args0: [pin('PIN', PINES_PWM), {type: 'input_value', name: 'VALOR', check: 'Number'}]}, instruccion),
      Object.assign({type: 'ar_esperar', message0: 'esperar %1 milisegundos', colour: 120, tooltip: '1000 milisegundos = 1 segundo.',
        args0: [{type: 'input_value', name: 'MS', check: 'Number'}]}, instruccion),
      {type: 'ar_milis', message0: 'milisegundos desde el inicio', output: 'Number', colour: 120},
      {type: 'ar_leer', message0: 'leer pin digital %1', args0: [pin()], output: null, colour: 200, tooltip: 'digitalRead: 1 = ALTO (con 5V), 0 = BAJO.'},
      {type: 'ar_leer_analogico', message0: 'leer pin analógico %1', args0: [pin('PIN', PINES.slice(14))], output: 'Number', colour: 200, tooltip: 'analogRead: de 0 a 1023.'},
      Object.assign({type: 'ar_tono', message0: 'sonar en pin %1 la nota de %2 Hz', colour: 330, tooltip: 'tone: 262 = Do, 294 = Re, 330 = Mi, 349 = Fa, 392 = Sol, 440 = La, 494 = Si.',
        args0: [pin(), {type: 'input_value', name: 'FREC', check: 'Number'}]}, instruccion),
      Object.assign({type: 'ar_silencio', message0: 'silenciar pin %1', colour: 330, tooltip: 'noTone: deja de sonar.', args0: [pin()]}, instruccion),
      {type: 'ar_mapear', message0: 'convertir %1 de 0–%2 a 0–%3', inputsInline: true, output: 'Number', colour: 230,
        tooltip: 'map: cambia un valor de una escala a otra (por ejemplo, de 0–1023 a 0–255).',
        args0: [{type: 'input_value', name: 'VALOR', check: 'Number'}, {type: 'input_value', name: 'DE', check: 'Number'}, {type: 'input_value', name: 'A', check: 'Number'}]},
      Object.assign({type: 'ar_servo', message0: 'mover servo del pin %1 a %2 grados', colour: 20, tooltip: 'Servo: de 0 a 180 grados.',
        args0: [pin(), {type: 'input_value', name: 'ANG', check: 'Number'}]}, instruccion),
      {type: 'ar_distancia', message0: 'distancia en cm (TRIG %1 ECHO %2)', args0: [pin('TRIG'), pin('ECHO')], output: 'Number', colour: 200,
        tooltip: 'Sensor ultrasónico: mide la distancia hasta el objeto (de 2 a 200 cm).'},
      Object.assign({type: 'ar_imprimir', message0: 'escribir en el monitor %1', colour: 290, args0: [{type: 'input_value', name: 'VALOR'}]}, instruccion),
    ]);
  }

  const numero = n => ({shadow: {type: 'math_number', fields: {NUM: n}}});
  const TOOLBOX = {
    kind: 'categoryToolbox',
    contents: [
      {kind: 'category', name: 'Arduino', colour: '40', contents: [{kind: 'block', type: 'ar_inicio'}, {kind: 'block', type: 'ar_siempre'}]},
      {kind: 'category', name: 'Salidas', colour: '160', contents: [
        {kind: 'block', type: 'ar_escribir', fields: {PIN: '13'}}, {kind: 'block', type: 'ar_pwm', fields: {PIN: '9'}, inputs: {VALOR: numero(128)}}]},
      {kind: 'category', name: 'Tiempo', colour: '120', contents: [
        {kind: 'block', type: 'ar_esperar', inputs: {MS: numero(1000)}}, {kind: 'block', type: 'ar_milis'}]},
      {kind: 'category', name: 'Control', colour: '210', contents: [
        {kind: 'block', type: 'controls_repeat_ext', inputs: {TIMES: numero(3)}}, {kind: 'block', type: 'controls_if'},
        {kind: 'block', type: 'controls_for', inputs: {FROM: numero(0), TO: numero(180), BY: numero(1)}},
        {kind: 'block', type: 'controls_whileUntil'}]},
      {kind: 'category', name: 'Lógica', colour: '210', contents: [
        {kind: 'block', type: 'logic_compare'}, {kind: 'block', type: 'logic_operation'}, {kind: 'block', type: 'logic_negate'}, {kind: 'block', type: 'logic_boolean'}]},
      {kind: 'category', name: 'Números', colour: '230', contents: [
        {kind: 'block', type: 'math_number'}, {kind: 'block', type: 'math_arithmetic'},
        {kind: 'block', type: 'math_random_int', inputs: {FROM: numero(1), TO: numero(10)}}]},
      {kind: 'category', name: 'Variables', colour: '330', custom: 'VARIABLE'},
      {kind: 'category', name: 'Entradas', colour: '200', contents: [{kind: 'block', type: 'ar_leer', fields: {PIN: '2'}}, {kind: 'block', type: 'ar_leer_analogico'},
        {kind: 'block', type: 'ar_mapear', inputs: {DE: numero(1023), A: numero(255)}}]},
      {kind: 'category', name: 'Sensores', colour: '200', contents: [{kind: 'block', type: 'ar_distancia', fields: {TRIG: '7', ECHO: '6'}}]},
      {kind: 'category', name: 'Motores', colour: '20', contents: [{kind: 'block', type: 'ar_servo', fields: {PIN: '9'}, inputs: {ANG: numero(90)}}]},
      {kind: 'category', name: 'Sonido', colour: '330', contents: [{kind: 'block', type: 'ar_tono', fields: {PIN: '8'}, inputs: {FREC: numero(262)}}, {kind: 'block', type: 'ar_silencio', fields: {PIN: '8'}}]},
      {kind: 'category', name: 'Monitor', colour: '290', contents: [{kind: 'block', type: 'ar_imprimir'}, {kind: 'block', type: 'text'}]},
    ],
  };

  // ---------- de bloques a código Arduino ----------
  function crearGenerador() {
    const G = new Blockly.Generator('Arduino');
    const O = {ATOMO: 0, UNARIO: 2, MULT: 3, SUMA: 4, REL: 6, IGUAL: 7, Y: 11, O: 12, NADA: 99};
    G.INDENT = '  ';
    G.scrub_ = (bloque, codigo, soloEste) => {
      const sig = bloque.nextConnection && bloque.nextConnection.targetBlock();
      return codigo + (sig && !soloEste ? G.blockToCode(sig) : '');
    };
    const valor = (b, nombre, orden, porDefecto = '0') => G.valueToCode(b, nombre, orden) || porDefecto;
    const variable = b => G.nombres.getName(b.getFieldValue('VAR'), 'VARIABLE');
    const f = G.forBlock;
    f.ar_escribir = b => { G.salidas.add(b.getFieldValue('PIN')); return `digitalWrite(${b.getFieldValue('PIN')}, ${b.getFieldValue('VALOR')});\n`; };
    f.ar_pwm = b => `analogWrite(${b.getFieldValue('PIN')}, ${valor(b, 'VALOR', O.NADA)});\n`;
    f.ar_esperar = b => `delay(${valor(b, 'MS', O.NADA)});\n`;
    f.ar_milis = () => ['millis()', O.ATOMO];
    f.ar_leer = b => { G.entradas.add(b.getFieldValue('PIN')); return [`digitalRead(${b.getFieldValue('PIN')})`, O.ATOMO]; };
    f.ar_servo = b => { const p = b.getFieldValue('PIN'); G.servos.add(p); return `servo${p}.write(${valor(b, 'ANG', O.NADA)});\n`; };
    f.ar_distancia = b => {
      const t = b.getFieldValue('TRIG'), e = b.getFieldValue('ECHO');
      G.salidas.add(t); G.entradas.add(e); G.usaDistancia = true;
      return [`medirDistancia(${t}, ${e})`, O.ATOMO];
    };
    f.ar_tono = b => `tone(${b.getFieldValue('PIN')}, ${valor(b, 'FREC', O.NADA)});\n`;
    f.ar_silencio = b => `noTone(${b.getFieldValue('PIN')});\n`;
    f.ar_mapear = b => [`map(${valor(b, 'VALOR', O.NADA)}, 0, ${valor(b, 'DE', O.NADA)}, 0, ${valor(b, 'A', O.NADA)})`, O.ATOMO];
    f.ar_leer_analogico = b => [`analogRead(${b.getFieldValue('PIN')})`, O.ATOMO];
    f.ar_imprimir = b => { G.usaSerial = true; return `Serial.println(${valor(b, 'VALOR', O.NADA, '""')});\n`; };
    f.math_number = b => [String(b.getFieldValue('NUM')), O.ATOMO];
    f.text = b => [JSON.stringify(b.getFieldValue('TEXT')), O.ATOMO];
    f.math_arithmetic = b => {
      const op = b.getFieldValue('OP');
      if (op === 'POWER') return [`pow(${valor(b, 'A', O.NADA)}, ${valor(b, 'B', O.NADA)})`, O.ATOMO];
      const [simbolo, orden] = {ADD: ['+', O.SUMA], MINUS: ['-', O.SUMA], MULTIPLY: ['*', O.MULT], DIVIDE: ['/', O.MULT]}[op];
      return [`${valor(b, 'A', orden)} ${simbolo} ${valor(b, 'B', orden - 0.5)}`, orden];
    };
    f.math_random_int = b => [`random(${valor(b, 'FROM', O.NADA)}, ${valor(b, 'TO', O.SUMA)} + 1)`, O.ATOMO];
    f.logic_compare = b => {
      const op = {EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>='}[b.getFieldValue('OP')];
      const orden = op === '==' || op === '!=' ? O.IGUAL : O.REL;
      return [`${valor(b, 'A', orden)} ${op} ${valor(b, 'B', orden)}`, orden];
    };
    f.logic_operation = b => {
      const y = b.getFieldValue('OP') === 'AND', orden = y ? O.Y : O.O;
      return [`${valor(b, 'A', orden, 'false')} ${y ? '&&' : '||'} ${valor(b, 'B', orden, 'false')}`, orden];
    };
    f.logic_negate = b => [`!${valor(b, 'BOOL', O.UNARIO, 'true')}`, O.UNARIO];
    f.logic_boolean = b => [b.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false', O.ATOMO];
    f.controls_if = b => {
      let codigo = '', n = 0;
      do {
        codigo += `${n ? ' else ' : ''}if (${valor(b, 'IF' + n, O.NADA, 'false')}) {\n${G.statementToCode(b, 'DO' + n)}}`;
        n++;
      } while (b.getInput('IF' + n));
      if (b.getInput('ELSE')) codigo += ` else {\n${G.statementToCode(b, 'ELSE')}}`;
      return codigo + '\n';
    };
    f.controls_repeat_ext = b => {
      const i = G.nombres.getDistinctName('i', 'VARIABLE');
      return `for (int ${i} = 0; ${i} < ${valor(b, 'TIMES', O.REL)}; ${i}++) {\n${G.statementToCode(b, 'DO')}}\n`;
    };
    // contar con i desde … hasta … de a …: si el inicio es mayor que el final, cuenta hacia atrás
    f.controls_for = b => {
      const v = variable(b), de = valor(b, 'FROM', O.NADA), a = valor(b, 'TO', O.REL), paso = String(valor(b, 'BY', O.NADA, '1')).replace(/^-/, '');
      const baja = !isNaN(de) && !isNaN(a) && +de > +a;
      return `for (${v} = ${de}; ${v} ${baja ? '>=' : '<='} ${a}; ${v} ${baja ? '-' : '+'}= ${paso}) {\n${G.statementToCode(b, 'DO')}}\n`;
    };
    f.controls_whileUntil = b => {
      const hasta = b.getFieldValue('MODE') === 'UNTIL';
      const cond = valor(b, 'BOOL', hasta ? O.UNARIO : O.NADA, 'false');
      return `while (${hasta ? '!' + cond : cond}) {\n${G.statementToCode(b, 'DO')}}\n`;
    };
    f.variables_get = b => [variable(b), O.ATOMO];
    f.variables_set = b => `${variable(b)} = ${valor(b, 'VALUE', O.NADA)};\n`;
    f.math_change = b => `${variable(b)} += ${valor(b, 'DELTA', O.SUMA)};\n`;
    return G;
  }

  // Programa completo. Como en Tinkercad, los pines que se usan como salida reciben su pinMode solos.
  function generar() {
    const G = gen;
    G.nombres = new Blockly.Names('setup,loop,int,void,if,else,for,while,return,delay,digitalWrite,pinMode');
    G.nombres.setVariableMap(ws.getVariableMap());
    G.salidas = new Set();
    G.entradas = new Set();
    G.servos = new Set();
    G.usaDistancia = false;
    G.usaSerial = false;
    G.init(ws);
    const arriba = ws.getTopBlocks(true);
    const cuerpoDe = tipo => { const b = arriba.find(x => x.type === tipo); return b ? G.statementToCode(b, 'CUERPO') : ''; };
    const setup = cuerpoDe('ar_inicio'), loop = cuerpoDe('ar_siempre');
    const variables = ws.getAllVariables().map(v => `int ${G.nombres.getName(v.getId(), 'VARIABLE')} = 0;\n`).join('');
    const servos = [...G.servos];
    const cabecera = (servos.length ? '#include <Servo.h>\n' + servos.map(p => `Servo servo${p};\n`).join('') + '\n' : '') + variables + (variables ? '\n' : '');
    const funciones = G.usaDistancia ? '\n// Mide la distancia con el sensor ultrasónico (en cm)\nlong medirDistancia(int trig, int echo) {\n  digitalWrite(trig, LOW);\n  delayMicroseconds(2);\n  digitalWrite(trig, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(trig, LOW);\n  return pulseIn(echo, HIGH) / 58;\n}\n' : '';
    const previos = (G.usaSerial ? '  Serial.begin(9600);\n' : '') + servos.map(p => `  servo${p}.attach(${p});\n`).join('') + [...G.entradas].filter(p => !G.salidas.has(p)).map(p => `  pinMode(${p}, INPUT);\n`).join('')
      + [...G.salidas].map(p => `  pinMode(${p}, OUTPUT);\n`).join('');
    return `${cabecera}void setup() {\n${previos}${setup}}\n\nvoid loop() {\n${loop}}\n${funciones}`;
  }

  // Estado inicial de bloques a partir de una lista simple: [['escribir', 13, 'HIGH'], ['esperar', 1000]]
  function estadoBloques({setup = [], loop = []} = {}) {
    const bloque = ([tipo, a, b]) => (tipo === 'escribir' ? {type: 'ar_escribir', fields: {PIN: String(a), VALOR: b}}
      : tipo === 'servo' ? {type: 'ar_servo', fields: {PIN: String(a)}, inputs: {ANG: numero(b)}}
      : tipo === 'pwm' ? {type: 'ar_pwm', fields: {PIN: String(a)}, inputs: {VALOR: numero(b)}}
      : {type: 'ar_esperar', inputs: {MS: numero(a)}});
    const encadenar = lista => lista.reduceRight((sig, x) => { const b = bloque(x); if (sig) b.next = {block: sig}; return b; }, null);
    const sombrero = (type, y, lista) => {
      const b = {type, x: 24, y}, c = encadenar(lista);
      if (c) b.inputs = {CUERPO: {block: c}};
      return b;
    };
    return {blocks: {languageVersion: 0, blocks: [sombrero('ar_inicio', 24, setup), sombrero('ar_siempre', 40 + 46 * (setup.length + 2), loop)]}};
  }

  // ---------- panel ----------
  function cambiarPestana(nueva) {
    if (nueva === 'texto' && pestana === 'bloques' && ws) {
      if (!textoEditado || confirm('¿Reemplazar el texto con el código de los bloques? Se perderán los cambios que escribiste.')) {
        $('#pc-texto').value = generar();
        textoEditado = false;
      }
    }
    pestana = nueva;
    alCambiar();
    document.querySelectorAll('.pc-tab').forEach(b => b.classList.toggle('activa', b.dataset.tab === nueva));
    $('#pc-bloques').hidden = nueva !== 'bloques';
    $('#pc-texto').hidden = nueva !== 'texto';
    if (nueva === 'bloques' && ws) Blockly.svgResize(ws);
  }

  async function abrir(nivel) {
    mostrar(true);
    limpiar();
    $('#pc-texto').value = nivel.codigo || '';
    textoEditado = !!nivel.codigo;
    cambiarPestana(nivel.inicio || 'bloques');
    try {
      await cargarBlockly();
      if (!ws) {
        ws = Blockly.inject('pc-bloques', {
          toolbox: TOOLBOX, renderer: 'zelos', trashcan: true, move: {scrollbars: true, drag: true, wheel: false},
          zoom: {controls: true, wheel: true, startScale: 0.75}, grid: {spacing: 24, length: 2, colour: '#E5E7EB', snap: true},
        });
        ws.addChangeListener(e => { if (!e.isUiEvent) alCambiar(); });
      }
      ws.clear();
      Blockly.serialization.workspaces.load(estadoBloques(nivel.bloques), ws);
      Blockly.svgResize(ws);
      alCambiar();
    } catch (e) {
      salida('No se pudieron cargar los bloques (¿hay internet?). Puedes programar en la pestaña Texto.', 'aviso');
      cambiarPestana('texto');
    }
  }

  function mostrar(si) {
    $('#panel-codigo').hidden = !si;
    if (si && ws) Blockly.svgResize(ws);
  }

  // Código a ejecutar: el de la pestaña que se está viendo.
  function obtener() {
    if (pestana === 'bloques') return ws && gen ? generar() : '';
    return $('#pc-texto').value;
  }

  // Selecciona la línea del error en la pestaña Texto (si se está viendo).
  function marcarLinea(n) {
    if (pestana !== 'texto' || !n) return;
    const area = $('#pc-texto'), lineas = area.value.split('\n');
    const inicio = lineas.slice(0, n - 1).join('\n').length + (n > 1 ? 1 : 0);
    area.focus();
    area.setSelectionRange(inicio, inicio + (lineas[n - 1] || '').length);
  }

  let lineaAbierta = null;
  function salida(txt, tipo = 'serie', salto = true) {
    const pre = $('#pc-salida');
    if (tipo === 'serie' && lineaAbierta) lineaAbierta.textContent += txt;
    else {
      const d = document.createElement('div');
      d.className = 'm-' + tipo;
      d.textContent = txt;
      pre.appendChild(d);
      lineaAbierta = tipo === 'serie' ? d : null;
    }
    if (salto || tipo !== 'serie') lineaAbierta = null;
    while (pre.childNodes.length > 200) pre.removeChild(pre.firstChild);
    pre.scrollTop = pre.scrollHeight;
  }
  function limpiar() { $('#pc-salida').innerHTML = ''; lineaAbierta = null; }

  function iniciar(opc = {}) {
    if (opc.alCambiar) alCambiar = opc.alCambiar;
    document.querySelectorAll('.pc-tab').forEach(b => { b.onclick = () => cambiarPestana(b.dataset.tab); });
    const area = $('#pc-texto');
    area.addEventListener('input', () => { textoEditado = true; alCambiar(); });
    area.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      area.setRangeText('  ', area.selectionStart, area.selectionEnd, 'end');
      textoEditado = true;
    });
  }

  return {iniciar, abrir, mostrar, obtener, salida, limpiar, marcarLinea, ancho: () => ($('#panel-codigo').hidden ? 0 : $('#panel-codigo').offsetWidth)};
})();
