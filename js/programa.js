// Intérprete de un subconjunto de Arduino (C/C++) para la simulación.
// Entiende lo que se enseña en clase: variables, arreglos, if/else, for, while, funciones propias,
// pinMode, digitalWrite, digitalRead, analogWrite, analogRead, delay, millis, map, random, Serial…
// También la librería Servo (attach, write, read) y pulseIn para el sensor ultrasónico.
// Si el código usa algo fuera de eso (por ejemplo, otras librerías), muestra un mensaje claro con la línea.
//
// El tiempo es simulado: cada instrucción cuesta COSTO ms y delay() avanza el reloj. Así, un loop
// sin delay enciende y apaga un LED tan rápido que se ve "a medias", igual que en la placa real.
const Programa = (() => {
  const COSTO = 0.004; // ms simulados por instrucción
  const TIPOS = new Set(['void', 'int', 'long', 'short', 'float', 'double', 'bool', 'boolean', 'byte', 'char', 'word',
    'unsigned', 'signed', 'const', 'static', 'volatile', 'uint8_t', 'uint16_t', 'uint32_t', 'int8_t', 'int16_t', 'int32_t', 'String', 'size_t', 'Servo']);
  const CONSTANTES = {HIGH: 1, LOW: 0, INPUT: 0, OUTPUT: 1, INPUT_PULLUP: 2, true: 1, false: 0, LED_BUILTIN: 13,
    A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19};

  class ErrorPrograma extends Error {
    constructor(mensaje, linea) { super(mensaje); this.linea = linea; }
  }

  // ---------- léxico ----------
  const PATRON = /\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/|(0[xX][0-9a-fA-F]+|\d+\.?\d*(?:[eE][-+]?\d+)?|\.\d+)[uUlLfF]*|([A-Za-z_]\w*)|("(?:\\.|[^"\\\n])*")|('(?:\\.|[^'\\])')|(\+\+|--|[-+*\/%]=|==|!=|<=|>=|&&|\|\||<<|>>|[{}()\[\];,=<>+\-*\/%!&|^~?:.])/y;

  function tokenizar(fuente) {
    const defines = {};
    const texto = fuente.split('\n').map(l => {
      const m = l.match(/^\s*#\s*define\s+(\w+)\s+(.*)$/);
      if (m) { defines[m[1]] = m[2].replace(/\/\/.*$/, '').trim(); return ''; }
      return /^\s*#/.test(l) ? '' : l; // #include y similares se ignoran
    }).join('\n');
    return leer(texto, defines, 1, 0);
  }

  function leer(texto, defines, lineaBase, profundidad) {
    const tokens = [];
    let linea = lineaBase;
    PATRON.lastIndex = 0;
    while (PATRON.lastIndex < texto.length) {
      const inicio = PATRON.lastIndex, m = PATRON.exec(texto);
      if (!m) throw new ErrorPrograma(`No entiendo el símbolo "${texto[inicio]}"`, linea);
      const [todo, num, id, str, chr, op] = m;
      if (num) {
        const hex = /^0[xX]/.test(num), real = !hex && /[.eE]/.test(num); // 5.0 es decimal (float) aunque valga lo mismo que 5
        tokens.push({t: 'num', v: hex ? parseInt(num, 16) : parseFloat(num), real, linea});
      }
      else if (id) {
        if (defines[id] !== undefined && profundidad < 5) {
          const guardado = PATRON.lastIndex;
          tokens.push(...leer(defines[id], defines, linea, profundidad + 1).map(tk => Object.assign(tk, {linea})));
          PATRON.lastIndex = guardado;
        } else tokens.push({t: 'id', v: id, linea});
      } else if (str) tokens.push({t: 'str', v: JSON.parse(str), linea});
      else if (chr) tokens.push({t: 'num', v: JSON.parse('"' + chr.slice(1, -1) + '"').charCodeAt(0), linea});
      else if (op) tokens.push({t: 'op', v: op, linea});
      linea += (todo.match(/\n/g) || []).length;
    }
    return tokens;
  }

  // ---------- sintaxis ----------
  const BINARIOS = [['||'], ['&&'], ['|'], ['^'], ['&'], ['==', '!='], ['<', '>', '<=', '>='], ['<<', '>>'], ['+', '-'], ['*', '/', '%']];

  function analizar(tokens) {
    let i = 0;
    const fin = {t: 'fin', v: '', linea: tokens.length ? tokens[tokens.length - 1].linea : 1};
    const ver = (k = 0) => tokens[i + k] || fin;
    const es = v => ver().v === v && ver().t !== 'str';
    const tomar = () => tokens[i++] || fin;
    const esperar = v => {
      if (es(v)) return tomar();
      const anterior = tokens[i - 1];
      if (v === ';' && anterior) throw new ErrorPrograma('Falta un punto y coma ; al final de esta línea', anterior.linea);
      throw new ErrorPrograma(`Se esperaba "${v}" pero encontré "${ver().v || 'el final del código'}"`, ver().linea);
    };
    const esTipo = () => ver().t === 'id' && TIPOS.has(ver().v);
    const tomarId = () => {
      if (ver().t !== 'id') throw new ErrorPrograma(`Se esperaba un nombre pero encontré "${ver().v || 'el final del código'}"`, ver().linea);
      return tomar().v;
    };
    function tipo() {
      const partes = [];
      while (esTipo()) partes.push(tomar().v);
      while (es('*') || es('&')) tomar();
      return partes.join(' ');
    }

    function programa() {
      const globales = [], funciones = {};
      while (ver().t !== 'fin') {
        const linea = ver().linea;
        if (ver().t === 'id' && ver(1).t === 'id' && !esTipo()) throw new ErrorPrograma(`No conozco el tipo "${ver().v}". Este simulador solo conoce la librería Servo.`, linea);
        if (!esTipo()) throw new ErrorPrograma(`No entiendo "${ver().v}" aquí. Fuera de las funciones solo puede haber variables o funciones (¿falta una llave { o }?)`, linea);
        const t = tipo(), nombre = tomarId();
        if (es('(')) {
          const f = funcion(t, linea);
          if (f) funciones[nombre] = f;
        } else globales.push(...declaracion(t, nombre, linea));
      }
      return {globales, funciones};
    }

    function funcion(t, linea) {
      esperar('(');
      const params = [];
      if (es('void') && ver(1).v === ')') tomar();
      else if (!es(')')) {
        do {
          const pt = tipo(), pn = tomarId();
          if (es('[')) { tomar(); esperar(']'); }
          params.push({nombre: pn, tipo: pt});
        } while (es(',') && tomar());
      }
      esperar(')');
      if (es(';')) { tomar(); return null; } // prototipo
      return {tipo: t, params, cuerpo: bloque(), linea};
    }

    function declaracion(t, nombre, linea) {
      const decls = [];
      for (;;) {
        let tam = null, esArreglo = false, init = null;
        if (es('[')) { tomar(); esArreglo = true; if (!es(']')) tam = expresion(); esperar(']'); }
        if (es('=')) { tomar(); init = es('{') ? lista() : expresion(); }
        decls.push({t, nombre, esArreglo, tam, init, linea});
        if (!es(',')) break;
        tomar();
        nombre = tomarId();
      }
      esperar(';');
      return decls;
    }

    function lista() {
      esperar('{');
      const elementos = [];
      while (!es('}')) { elementos.push(expresion()); if (!es('}')) esperar(','); }
      esperar('}');
      return {tipo: 'lista', elementos};
    }

    function bloque() {
      const linea = esperar('{').linea, cuerpo = [];
      while (!es('}')) {
        if (ver().t === 'fin') throw new ErrorPrograma('Falta cerrar una llave }', linea);
        cuerpo.push(sentencia());
      }
      tomar();
      return {tipo: 'bloque', cuerpo, linea};
    }

    function sentencia() {
      const linea = ver().linea, v = ver().v;
      if (es('{')) return bloque();
      if (es(';')) { tomar(); return {tipo: 'vacio', linea}; }
      if (esTipo()) { const t = tipo(); return {tipo: 'decl', decls: declaracion(t, tomarId(), linea), linea}; }
      if (ver().t === 'id') {
        if (v === 'if') {
          tomar(); esperar('(');
          const cond = expresion();
          esperar(')');
          const si = sentencia();
          let no = null;
          if (es('else')) { tomar(); no = sentencia(); }
          return {tipo: 'if', cond, si, no, linea};
        }
        if (v === 'while') { tomar(); esperar('('); const cond = expresion(); esperar(')'); return {tipo: 'while', cond, cuerpo: sentencia(), linea}; }
        if (v === 'do') {
          tomar();
          const cuerpo = sentencia();
          esperar('while'); esperar('(');
          const cond = expresion();
          esperar(')'); esperar(';');
          return {tipo: 'do', cuerpo, cond, linea};
        }
        if (v === 'for') {
          tomar(); esperar('(');
          let init = null;
          if (esTipo()) { const t = tipo(); init = {tipo: 'decl', decls: declaracion(t, tomarId(), linea), linea}; }
          else { if (!es(';')) init = {tipo: 'expr', e: expresion(), linea}; esperar(';'); }
          const cond = es(';') ? null : expresion();
          esperar(';');
          const paso = es(')') ? null : expresion();
          esperar(')');
          return {tipo: 'for', init, cond, paso, cuerpo: sentencia(), linea};
        }
        if (v === 'return') { tomar(); const e = es(';') ? null : expresion(); esperar(';'); return {tipo: 'return', e, linea}; }
        if (v === 'break' || v === 'continue') { tomar(); esperar(';'); return {tipo: v, linea}; }
      }
      const e = expresion();
      esperar(';');
      return {tipo: 'expr', e, linea};
    }

    function expresion() {
      const izq = ternario();
      if (ver().t === 'op' && ['=', '+=', '-=', '*=', '/=', '%='].includes(ver().v)) {
        const op = tomar().v;
        return {tipo: 'asig', op, destino: izq, valor: expresion(), linea: izq.linea};
      }
      return izq;
    }
    function ternario() {
      const c = binario(0);
      if (!es('?')) return c;
      tomar();
      const a = expresion();
      esperar(':');
      return {tipo: 'tern', c, a, b: expresion(), linea: c.linea};
    }
    function binario(n) {
      if (n === BINARIOS.length) return unario();
      let izq = binario(n + 1);
      while (ver().t === 'op' && BINARIOS[n].includes(ver().v)) {
        const op = tomar().v;
        izq = {tipo: 'bin', op, a: izq, b: binario(n + 1), linea: izq.linea};
      }
      return izq;
    }
    function unario() {
      const linea = ver().linea;
      if (ver().t === 'op' && ['!', '-', '+', '~'].includes(ver().v)) { const op = tomar().v; return {tipo: 'un', op, a: unario(), linea}; }
      if (es('++') || es('--')) { const op = tomar().v; return {tipo: 'inc', op, pre: true, destino: unario(), linea}; }
      if (es('(') && ver(1).t === 'id' && TIPOS.has(ver(1).v)) { tomar(); tipo(); esperar(')'); return unario(); } // conversión (int)x
      return postfijo();
    }
    function postfijo() {
      let e = primario();
      for (;;) {
        if (es('(')) {
          if (e.tipo !== 'var') throw new ErrorPrograma('Solo se puede llamar a funciones por su nombre', e.linea);
          tomar();
          const args = [];
          if (!es(')')) do args.push(expresion()); while (es(',') && tomar());
          esperar(')');
          e = {tipo: 'llamada', nombre: e.nombre, args, linea: e.linea};
        } else if (es('[')) {
          tomar();
          const idx = expresion();
          esperar(']');
          e = {tipo: 'indice', arr: e, idx, linea: e.linea};
        } else if (es('++') || es('--')) {
          e = {tipo: 'inc', op: tomar().v, pre: false, destino: e, linea: e.linea};
        } else if (es('.') && e.tipo === 'var') {
          tomar();
          e = {tipo: 'var', nombre: e.nombre + '.' + tomarId(), linea: e.linea};
        } else return e;
      }
    }
    function primario() {
      const tk = tomar();
      if (tk.t === 'num') return {tipo: 'num', v: tk.v, real: tk.real, linea: tk.linea};
      if (tk.t === 'str') return {tipo: 'str', v: tk.v, linea: tk.linea};
      if (tk.t === 'id') return {tipo: 'var', nombre: tk.v, linea: tk.linea};
      if (tk.v === '(') { const e = expresion(); esperar(')'); return e; }
      throw new ErrorPrograma(`No esperaba "${tk.v || 'el final del código'}" aquí`, tk.linea);
    }

    return programa();
  }

  // ---------- ejecución ----------
  const esEntero = t => t && !/float|double|String/.test(t);
  function convertir(t, v) {
    if (typeof v !== 'number' || !t) return v;
    if (/bool/.test(t)) return v ? 1 : 0;
    if (esEntero(t)) { v = Math.trunc(v); if (/byte|uint8_t/.test(t)) v &= 255; }
    return v;
  }
  const texto = v => (typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2) : String(v));

  function crear(prog, hw) {
    const globales = new Map();
    let pila = [], profundidad = 0;

    const buscar = nombre => {
      for (let k = pila.length - 1; k >= 0; k--) if (pila[k].has(nombre)) return pila[k].get(nombre);
      return globales.get(nombre) || null;
    };
    const pin = (p, linea) => {
      if (!(p >= 0 && p <= 19)) throw new ErrorPrograma(`El pin ${p} no existe en el Arduino UNO`, linea);
      return p;
    };

    const INTERNAS = {
      pinMode: ([p, m], l) => hw.pinMode(pin(p, l), m),
      digitalWrite: ([p, v], l) => hw.digitalWrite(pin(p, l), v ? 1 : 0, l),
      digitalRead: ([p], l) => hw.digitalRead(pin(p, l)),
      analogWrite: ([p, v], l) => hw.analogWrite(pin(p, l), v),
      analogRead: ([p], l) => hw.analogRead(pin(p < 14 ? p + 14 : p, l)),
      delay: function* ([ms]) { yield Math.max(0, ms); },
      delayMicroseconds: function* ([us]) { yield Math.max(0, us) / 1000; },
      // Espera el eco: devuelve los microsegundos que tardó (0 si no llega en el tiempo límite, 1 s por defecto)
      pulseIn: function* ([p, , limite = 1000000], l) {
        const us = hw.pulseIn(pin(p, l));
        if (!us || us > limite) { yield limite / 1000; return 0; }
        yield us / 1000;
        return us;
      },
      millis: () => Math.floor(hw.tiempo()),
      micros: () => Math.floor(hw.tiempo() * 1000),
      tone: ([p, f, d], l) => hw.tone(pin(p, l), f, d),
      noTone: ([p], l) => hw.noTone(pin(p, l)),
      map: ([x, a, b, c, d]) => Math.trunc(((x - a) * (d - c)) / (b - a) + c),
      constrain: ([x, a, b]) => Math.min(Math.max(x, a), b),
      min: ([a, b]) => Math.min(a, b),
      max: ([a, b]) => Math.max(a, b),
      abs: ([a]) => Math.abs(a),
      pow: ([a, b]) => Math.pow(a, b),
      sqrt: ([a]) => Math.sqrt(a),
      random: ([a, b]) => (b === undefined ? Math.floor(Math.random() * a) : a + Math.floor(Math.random() * (b - a))),
      randomSeed: () => {},
      String: ([v]) => texto(v),
      'Serial.begin': () => {},
      'Serial.print': ([v]) => hw.serial(texto(v), false),
      'Serial.println': ([v]) => hw.serial(v === undefined ? '' : texto(v), true),
    };

    // ¿La expresión es decimal (float/double)? Así 5.0 / 2 da 2.5 aunque los dos valores sean "enteros".
    function esReal(e) {
      switch (e.tipo) {
        case 'num': return !!e.real;
        case 'var': { const x = buscar(e.nombre); return !!(x && /float|double/.test(x.t || '')); }
        case 'indice': return esReal(e.arr) || /float|double/.test(((buscar(e.arr.nombre) || {}).t) || '');
        case 'bin': return ['+', '-', '*', '/', '%'].includes(e.op) && (esReal(e.a) || esReal(e.b));
        case 'un': return esReal(e.a);
        case 'tern': return esReal(e.a) || esReal(e.b);
        case 'asig': return esReal(e.destino);
        case 'llamada': return ['sqrt', 'pow', 'sin', 'cos', 'tan'].includes(e.nombre) || /float|double/.test((prog.funciones[e.nombre] || {}).tipo || '');
      }
      return false;
    }

    function operar(op, a, b, linea, real) {
      switch (op) {
        case '+': return typeof a === 'string' || typeof b === 'string' ? texto(a) + texto(b) : a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/':
          if (b === 0) throw new ErrorPrograma('No se puede dividir entre 0', linea);
          return !real && Number.isInteger(a) && Number.isInteger(b) ? Math.trunc(a / b) : a / b;
        case '%': return a % b;
        case '==': return a == b ? 1 : 0; // eslint-disable-line eqeqeq
        case '!=': return a != b ? 1 : 0; // eslint-disable-line eqeqeq
        case '<': return a < b ? 1 : 0;
        case '>': return a > b ? 1 : 0;
        case '<=': return a <= b ? 1 : 0;
        case '>=': return a >= b ? 1 : 0;
        case '&': return a & b;
        case '|': return a | b;
        case '^': return a ^ b;
        case '<<': return a << b;
        case '>>': return a >> b;
      }
      throw new ErrorPrograma(`Operación desconocida ${op}`, linea);
    }

    function* referencia(d) {
      if (d.tipo === 'var') {
        const x = buscar(d.nombre);
        if (!x) throw new ErrorPrograma(`No conozco la variable "${d.nombre}". ¿La declaraste antes de usarla?`, d.linea);
        return {
          leer: () => x.v,
          escribir: v => {
            if (x.constante) throw new ErrorPrograma(`"${d.nombre}" es constante (const): no se puede cambiar`, d.linea);
            x.v = convertir(x.t, v);
          },
        };
      }
      if (d.tipo === 'indice') {
        const arr = yield* evaluar(d.arr), k = yield* evaluar(d.idx);
        if (!Array.isArray(arr)) throw new ErrorPrograma('Eso no es un arreglo', d.linea);
        if (k < 0 || k >= arr.length) throw new ErrorPrograma(`La posición ${k} está fuera del arreglo (tiene ${arr.length} elementos)`, d.linea);
        return {leer: () => arr[k], escribir: v => { arr[k] = convertir(arr.tipo, v); }};
      }
      throw new ErrorPrograma('Solo se le puede asignar un valor a una variable', d.linea);
    }

    function* evaluar(e) {
      switch (e.tipo) {
        case 'num': case 'str': return e.v;
        case 'var': {
          const x = buscar(e.nombre);
          if (x) return x.v;
          if (e.nombre in CONSTANTES) return CONSTANTES[e.nombre];
          throw new ErrorPrograma(`No conozco "${e.nombre}". ¿La declaraste antes de usarla?`, e.linea);
        }
        case 'bin':
          if (e.op === '&&') return (yield* evaluar(e.a)) && (yield* evaluar(e.b)) ? 1 : 0;
          if (e.op === '||') return (yield* evaluar(e.a)) || (yield* evaluar(e.b)) ? 1 : 0;
          return operar(e.op, yield* evaluar(e.a), yield* evaluar(e.b), e.linea, e.op === '/' && esReal(e));
        case 'un': {
          const a = yield* evaluar(e.a);
          return e.op === '!' ? (a ? 0 : 1) : e.op === '-' ? -a : e.op === '~' ? ~a : +a;
        }
        case 'tern': return (yield* evaluar(e.c)) ? yield* evaluar(e.a) : yield* evaluar(e.b);
        case 'asig': {
          const ref = yield* referencia(e.destino);
          let v = yield* evaluar(e.valor);
          if (e.op !== '=') v = operar(e.op[0], ref.leer(), v, e.linea, esReal(e.destino) || esReal(e.valor));
          ref.escribir(v);
          return ref.leer();
        }
        case 'inc': {
          const ref = yield* referencia(e.destino), antes = ref.leer();
          ref.escribir(antes + (e.op === '++' ? 1 : -1));
          return e.pre ? ref.leer() : antes;
        }
        case 'indice': {
          const arr = yield* evaluar(e.arr), k = yield* evaluar(e.idx);
          if (!Array.isArray(arr)) throw new ErrorPrograma('Eso no es un arreglo', e.linea);
          if (k < 0 || k >= arr.length) throw new ErrorPrograma(`La posición ${k} está fuera del arreglo (tiene ${arr.length} elementos)`, e.linea);
          return arr[k];
        }
        case 'llamada': return yield* llamar(e);
        case 'lista': throw new ErrorPrograma('Una lista { } solo se puede usar al crear un arreglo', e.linea);
      }
      throw new ErrorPrograma('Expresión desconocida', e.linea);
    }

    function* declarar(d, ambito) {
      let v;
      if (d.esArreglo) {
        const tam = d.tam ? yield* evaluar(d.tam) : d.init ? d.init.elementos.length : 0;
        v = new Array(tam).fill(0);
        v.tipo = d.t;
        if (d.init) for (let k = 0; k < d.init.elementos.length && k < tam; k++) v[k] = convertir(d.t, yield* evaluar(d.init.elementos[k]));
      } else if (d.t === 'Servo') {
        v = {servo: true, pin: null, angulo: 90};
      } else {
        v = d.init ? convertir(d.t, yield* evaluar(d.init)) : /String/.test(d.t) ? '' : 0;
      }
      ambito.set(d.nombre, {t: d.t, v, constante: /const/.test(d.t)});
    }

    function* ejecutar(s) {
      yield COSTO;
      switch (s.tipo) {
        case 'bloque':
          pila.push(new Map());
          try {
            for (const x of s.cuerpo) { const r = yield* ejecutar(x); if (r) return r; }
          } finally { pila.pop(); }
          return null;
        case 'decl':
          for (const d of s.decls) yield* declarar(d, pila[pila.length - 1]);
          return null;
        case 'expr': yield* evaluar(s.e); return null;
        case 'if':
          if (yield* evaluar(s.cond)) return yield* ejecutar(s.si);
          return s.no ? yield* ejecutar(s.no) : null;
        case 'while':
          while (yield* evaluar(s.cond)) {
            const r = yield* ejecutar(s.cuerpo);
            if (r && r.t === 'break') break;
            if (r && r.t === 'return') return r;
          }
          return null;
        case 'do':
          do {
            const r = yield* ejecutar(s.cuerpo);
            if (r && r.t === 'break') break;
            if (r && r.t === 'return') return r;
          } while (yield* evaluar(s.cond));
          return null;
        case 'for':
          pila.push(new Map());
          try {
            if (s.init) yield* ejecutar(s.init);
            while (!s.cond || (yield* evaluar(s.cond))) {
              const r = yield* ejecutar(s.cuerpo);
              if (r && r.t === 'break') break;
              if (r && r.t === 'return') return r;
              if (s.paso) yield* evaluar(s.paso);
            }
          } finally { pila.pop(); }
          return null;
        case 'return': return {t: 'return', v: s.e ? yield* evaluar(s.e) : undefined};
        case 'break': case 'continue': return {t: s.tipo};
        default: return null;
      }
    }

    function* llamar(e) {
      const args = [];
      for (const a of e.args) args.push(yield* evaluar(a));
      const f = prog.funciones[e.nombre];
      if (f) {
        if (args.length !== f.params.length) throw new ErrorPrograma(`La función ${e.nombre} necesita ${f.params.length} dato(s) y le diste ${args.length}`, e.linea);
        if (++profundidad > 200) throw new ErrorPrograma('Demasiadas llamadas una dentro de otra (¿una función se llama a sí misma sin parar?)', e.linea);
        const anterior = pila, local = new Map();
        f.params.forEach((p, k) => local.set(p.nombre, {t: p.tipo, v: convertir(p.tipo, args[k])}));
        pila = [local];
        try {
          const r = yield* ejecutar(f.cuerpo);
          return r && r.t === 'return' ? convertir(f.tipo, r.v) : undefined;
        } finally { pila = anterior; profundidad--; }
      }
      // Métodos de un objeto Servo: miServo.attach(9), miServo.write(90), miServo.read()
      const [base, metodo] = e.nombre.split('.');
      const obj = metodo && buscar(base);
      if (obj && obj.v && obj.v.servo) {
        const sv = obj.v;
        if (metodo === 'attach') { sv.pin = pin(args[0], e.linea); return 1; }
        if (metodo === 'write') {
          sv.angulo = Math.max(0, Math.min(180, args[0]));
          if (sv.pin === null) throw new ErrorPrograma(`Antes de mover el servo usa ${base}.attach(pin) para decirle en qué pin está`, e.linea);
          hw.servo(sv.pin, sv.angulo);
          return undefined;
        }
        if (metodo === 'writeMicroseconds') { sv.angulo = Math.max(0, Math.min(180, ((args[0] - 1000) / 1000) * 180)); if (sv.pin !== null) hw.servo(sv.pin, sv.angulo); return undefined; }
        if (metodo === 'read') return Math.round(sv.angulo);
        if (metodo === 'detach' || metodo === 'attached') return 1;
        throw new ErrorPrograma(`El servo no tiene la instrucción "${metodo}". Usa attach, write o read.`, e.linea);
      }
      // Como en el Arduino, un número decimal (float) se escribe en el monitor con 2 decimales: 5.00
      if (/^Serial\.print(ln)?$/.test(e.nombre) && typeof args[0] === 'number' && esReal(e.args[0])) args[0] = args[0].toFixed(args[1] >= 0 && args[1] <= 6 ? args[1] : 2);
      const interna = INTERNAS[e.nombre];
      if (!interna) throw new ErrorPrograma(`No conozco la instrucción "${e.nombre}". Este simulador entiende: pinMode, digitalWrite, digitalRead, analogWrite, analogRead, delay, millis, map, random, tone, pulseIn, Serial.println, Servo y tus propias funciones.`, e.linea);
      const r = interna(args, e.linea);
      return r && typeof r.next === 'function' ? yield* r : r;
    }

    function* principal() {
      for (const d of prog.globales) yield* declarar(d, globales);
      yield* llamar({nombre: 'setup', args: [], linea: prog.funciones.setup.linea});
      for (;;) {
        yield* llamar({nombre: 'loop', args: [], linea: prog.funciones.loop.linea});
        yield COSTO;
      }
    }
    return principal();
  }

  // ---------- API ----------
  function compilar(codigo) {
    try {
      const prog = analizar(tokenizar(codigo));
      if (!prog.funciones.setup) throw new ErrorPrograma('Falta la función void setup() { … }', 1);
      if (!prog.funciones.loop) throw new ErrorPrograma('Falta la función void loop() { … }', 1);
      return {ok: true, prog};
    } catch (e) {
      if (e instanceof ErrorPrograma) return {ok: false, error: e.message, linea: e.linea};
      throw e;
    }
  }

  // hw: pinMode, digitalWrite, digitalRead, analogWrite, analogRead, tone, noTone, serial,
  //     inicioCuadro(t), finCuadro(t). Se le agrega hw.tiempo() con el reloj simulado.
  function ejecutar(prog, hw, alError) {
    const gen = crear(prog, hw);
    let t = 0, reloj = 0, activo = true, ultimo = performance.now();
    hw.tiempo = () => t;
    function cuadro(ahora) {
      if (!activo) return;
      const anterior = reloj;
      reloj += Math.min(50, ahora - ultimo);
      ultimo = ahora;
      hw.inicioCuadro(anterior);
      try {
        let pasos = 0;
        while (t < reloj && pasos++ < 150000) {
          const r = gen.next();
          if (r.done) { activo = false; break; }
          t += r.value;
        }
        if (t < reloj) t = reloj; // demasiadas instrucciones en este cuadro: el tiempo igual avanza
      } catch (e) {
        activo = false;
        alError(e instanceof ErrorPrograma ? e : new ErrorPrograma('Error inesperado: ' + e.message, 0));
        return;
      }
      hw.finCuadro(reloj);
      requestAnimationFrame(cuadro);
    }
    requestAnimationFrame(cuadro);
    return {detener() { activo = false; }};
  }

  return {compilar, ejecutar};
})();
