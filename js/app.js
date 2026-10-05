// Pantallas del juego: ingreso, menú, mapa de mundos, ruta guiada y nivel
// (pasos, circuitos, programas, pistas, fichas, explicaciones y estrellas).
const App = (() => {
  const $ = s => document.querySelector(s);
  let nivel = null;
  let sinGuardar = false;

  // ---------- progreso ----------
  const ses = () => Progreso.sesion();
  const esDocente = () => ses().rol === 'docente';
  const tieneRuta = () => esDocente() || !!ses().nee;
  const leer = id => ses().datos.niveles[id] || {};
  const escribir = id => (ses().datos.niveles[id] = ses().datos.niveles[id] || {});
  const nivelesDe = n => NIVELES.filter(l => l.mundo === n);
  const numero = l => nivelesDe(l.mundo).indexOf(l) + 1;
  const mundoDe = l => (l.mundo === RUTA.n ? RUTA : l.mundo === RETOS.n ? RETOS : MUNDOS.find(m => m.n === l.mundo));
  const enRuta = () => nivel && nivel.mundo === RUTA.n;
  const esReto = l => !!l && l.mundo === RETOS.n;
  const deAventura = l => typeof l.mundo === 'number';
  const completo = l => !!leer(l.id).completado;
  // Los mundos sin niveles todavía ("en construcción") no bloquean a los siguientes.
  // Los niveles ⭐ extra son opcionales: no hace falta terminarlos para abrir el mundo siguiente.
  const mundoAbierto = n => n === RUTA.n || esDocente() || MUNDOS.filter(m => m.n < n).every(m => nivelesDe(m.n).filter(l => !l.extra).every(completo));
  const nivelAbierto = l => {
    if (esDocente() || esReto(l)) return true;
    const lista = nivelesDe(l.mundo), i = lista.indexOf(l);
    return mundoAbierto(l.mundo) && (i === 0 || completo(lista[i - 1]));
  };
  // En la ruta guiada y para estudiantes con ruta, las pistas llegan antes.
  const umbrales = () => (enRuta() || ses().nee ? [1, 2, 3] : CONFIG.umbralesPista);
  const estrellas = n => '⭐'.repeat(n) + `<span class="vacia">${'⭐'.repeat(3 - n)}</span>`;

  function resumen() {
    let completados = 0, total = 0, fallos = 0, pistas = 0;
    for (const d of Object.values(ses().datos.niveles)) {
      if (d.completado) { completados++; total += d.estrellas || 0; }
      fallos += d.fallos || 0;
      pistas += d.pistas || 0;
    }
    const sig = NIVELES.find(l => deAventura(l) && !l.extra && !completo(l));
    return {nivelActual: sig ? `Mundo ${sig.mundo} · Nivel ${numero(sig)}` : 'Todo completado', completados, estrellas: total, fallos, pistas};
  }

  async function guardar() {
    sinGuardar = false;
    if (!(await Progreso.guardar(resumen()))) {
      sinGuardar = true;
      toast('⚠️ No se pudo guardar tu avance. Se intentará de nuevo más tarde.');
    }
  }

  // ---------- utilidades de interfaz ----------
  function mostrar(nombre) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.toggle('activa', p.id === 'p-' + nombre));
  }
  let tToast;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(tToast);
    tToast = setTimeout(() => { t.hidden = true; }, 3000);
  }
  let alCerrarModal = null;
  function abrirModal(html, alCerrar) {
    $('#modal-caja').innerHTML = html;
    $('#modal').hidden = false;
    alCerrarModal = alCerrar || null;
    return $('#modal-caja');
  }
  function cerrarModal() {
    $('#modal').hidden = true;
    if (window.speechSynthesis) speechSynthesis.cancel();
    const f = alCerrarModal;
    alCerrarModal = null;
    if (f) f();
  }
  function mensaje(html, tipo) {
    const m = $('#nivel-msg');
    m.className = 'mensaje' + (tipo ? ' ' + tipo : '');
    m.innerHTML = html;
  }

  // Lectura en voz alta (botones 🔊). Usa la voz en español del navegador.
  function hablar(html) {
    if (!window.speechSynthesis) { toast('Este navegador no puede leer en voz alta.'); return; }
    const d = document.createElement('div');
    d.innerHTML = html;
    d.querySelectorAll('button').forEach(b => b.remove());
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(d.textContent.replace(/[→·]/g, ', '));
    const voces = speechSynthesis.getVoices();
    u.voice = voces.find(v => /^es-(419|MX|US|EC|CO)/.test(v.lang)) || voces.find(v => v.lang.startsWith('es')) || null;
    u.lang = u.voice ? u.voice.lang : 'es-ES';
    u.rate = 0.95;
    speechSynthesis.speak(u);
  }
  const botonHablar = sel => `<button class="btn-hablar" data-hablar="${sel}" title="Escuchar">🔊</button>`;

  // ---------- menú y mapa ----------
  function irMenu() {
    const s = ses();
    const etiqueta = esDocente() ? '🎓 Modo docente (todo desbloqueado)' : `${s.curso} · N° ${s.lista}`;
    document.querySelectorAll('.usuario-nombre').forEach(e => { e.textContent = etiqueta; });
    const r = resumen();
    const aventura = NIVELES.filter(l => deAventura(l) && !l.extra);
    $('#menu-progreso').textContent = `⭐ ${r.estrellas} · ${aventura.filter(completo).length}/${aventura.length} niveles`;
    const retos = nivelesDe(RETOS.n).filter(l => !l.libre);
    $('#menu-retos').textContent = `🏆 ${retos.filter(completo).length}/${retos.length} retos superados`;
    $('#btn-reiniciar').hidden = esDocente();
    $('#menu-ruta').hidden = !tieneRuta();
    mostrar('menu');
  }

  function irMapa() {
    const cont = $('#mundos');
    cont.innerHTML = '';
    for (const m of MUNDOS) {
      const todos = nivelesDe(m.n), lista = todos.filter(l => !l.extra), extras = todos.filter(l => l.extra);
      const hechos = lista.filter(completo).length, extrasHechos = extras.filter(completo).length;
      const enObra = lista.length === 0, abierto = mundoAbierto(m.n);
      const etiqueta = enObra ? '🚧 En construcción' : !abierto ? '🔒 Bloqueado' : hechos === lista.length ? '✅ Completado' : '';
      const b = document.createElement('button');
      b.className = 'mundo' + (enObra ? ' construccion' : !abierto ? ' bloqueado' : '');
      b.style.setProperty('--c', m.color);
      b.disabled = enObra || !abierto;
      b.innerHTML = `${etiqueta ? `<span class="m-etiqueta">${etiqueta}</span>` : ''}
        <span class="m-num">Mundo ${m.n}</span><span class="m-icono">${m.icono}</span>
        <span class="m-titulo">${m.titulo}</span><span class="m-tema">${m.tema}</span>
        ${enObra ? '' : `<span class="m-barra"><i style="width:${(100 * hechos) / lista.length}%"></i></span><span class="m-cuenta">${hechos}/${lista.length} niveles${extras.length ? ` · ⭐ ${extrasHechos}/${extras.length} extra` : ''}</span>`}`;
      b.onclick = () => irMundo(m);
      cont.appendChild(b);
    }
    mostrar('mapa');
  }

  function irMundo(m) {
    const lista = nivelesDe(m.n), hechos = lista.filter(completo).length, ruta = m === RUTA;
    $('#mundo-volver').dataset.ir = ruta ? 'menu' : 'mapa';
    $('#mundo-volver').textContent = ruta ? '← Menú' : '← Mundos';
    const cab = $('#mundo-cab');
    cab.style.setProperty('--c', m.color);
    cab.innerHTML = `<span class="mc-icono">${m.icono}</span><div><div class="m-num">${ruta ? 'Ruta guiada' : 'Mundo ' + m.n}</div><h2>${m.titulo}</h2><div>${m.tema} · ${hechos}/${lista.length} completados</div></div>`;
    const cont = $('#subniveles');
    cont.innerHTML = '';
    lista.forEach((l, i) => {
      const d = leer(l.id), abierto = nivelAbierto(l);
      const div = document.createElement('div');
      div.className = 'sub' + (l.extra ? ' extra' : '');
      div.style.setProperty('--c', m.color);
      if (l.extra) div.title = 'Nivel extra (opcional y más desafiante)';
      div.innerHTML = `<button ${abierto ? '' : 'disabled'}>${abierto ? i + 1 : '🔒'}</button>
        <span class="estrellas">${d.completado ? estrellas(d.estrellas) : ''}</span><span class="s-nombre">${l.titulo}</span>`;
      div.querySelector('button').onclick = () => abrirNivel(l);
      cont.appendChild(div);
    });
    mostrar('mundo');
  }

  // ---------- retos (proyectos abiertos: el estudiante arma todo desde cero) ----------
  function irRetos() {
    const cont = $('#retos-lista');
    cont.innerHTML = '';
    for (const l of nivelesDe(RETOS.n)) {
      const d = leer(l.id), b = document.createElement('button');
      b.className = 'reto' + (l.libre ? ' libre' : '') + (d.completado ? ' hecho' : '');
      b.innerHTML = `<span class="r-icono">${l.icono}</span>
        <span class="r-titulo">${l.titulo}</span><span class="r-desc">${l.resumen}</span>
        <span class="r-pie">${l.libre ? '<span class="r-para">Sin evaluación: experimenta</span>'
          : `<span class="r-dif" title="Dificultad">${'🔥'.repeat(l.dificultad)}<span class="vacia">${'🔥'.repeat(3 - l.dificultad)}</span></span><span class="r-para">${l.para}</span>`}
        ${d.completado ? `<span class="r-hecho">${l.meta.manual ? '📤 Entregado' : estrellas(d.estrellas)}</span>` : ''}</span>`;
      b.onclick = () => abrirNivel(l);
      cont.appendChild(b);
    }
    mostrar('retos');
  }

  // ---------- nivel ----------
  function abrirNivel(l) {
    detenerPrograma();
    nivel = l;
    const pasos = l.tipo === 'pasos', guiado = !!l.guia;
    mostrar('nivel');
    const p = $('#p-nivel');
    p.classList.toggle('modo-pasos', pasos);
    p.classList.toggle('modo-programa', !!l.programa);
    p.classList.toggle('modo-ruta', enRuta());
    p.classList.toggle('con-paleta', !!l.programa && !!(l.paleta || []).length);
    const m = mundoDe(l);
    const chip = enRuta() ? `Ruta guiada · Actividad ${numero(l)}` : esReto(l) ? (l.libre ? 'Taller libre' : `Reto ${numero(l)}`)
      : `Mundo ${l.mundo} · Nivel ${numero(l)}${l.extra ? ' · extra' : ''}`;
    $('#nivel-titulo').innerHTML = `<span class="chip" style="background:${m.color}">${chip}</span>${l.titulo}`;
    $('#nivel-mision').innerHTML = l.mision;
    const manual = !!(l.meta && l.meta.manual);
    $('#tarjeta-obj').hidden = pasos || guiado || manual || !(l.objetivos || []).length;
    $('#nivel-paso').hidden = !pasos && !guiado && !manual;
    if (!pasos) $('#nivel-obj').innerHTML = (l.objetivos || []).map(o => `<li>${o}</li>`).join('');
    $('#nivel-ayuda').hidden = !(l.tutorial || guiado || esReto(l)) || pasos;
    mensajeInicial();
    pintarPaleta(l.paleta || [], l.notaPaleta);

    const verRedes = !pasos && (l.verRedes || enRuta());
    $('#h-redes').classList.toggle('activo', verRedes);
    $('#leyenda-redes').hidden = !verRedes;
    if (l.programa) Codigo.abrir(l); else Codigo.mostrar(false);
    Editor.margen(Codigo.ancho());
    Editor.cargar(l.escena, {modo: pasos ? 'pasos' : 'circuito', nombres: pasos ? !!l.nombres : true, verRedes});
    Editor.ajustar();
    botonSim(false);
    actualizarBotonPista();
    if (pasos) { paso = 0; encontrados = new Set(); bloqueoPaso = false; pintarPaso(); }
    if (guiado) { pasoGuia = -1; revisarGuia(); }
    if (manual) { entregaProbada = false; pintarEntrega(); }

    const fichas = l.ficha || [];
    $('#btn-ficha').hidden = !fichas.length && !l.explicacion;
    $('#btn-ficha').textContent = l.explicacion ? '📖 Explicación' : '📘 Ficha';
    const vistas = ses().datos.fichas;
    if (l.explicacion && !vistas.includes('exp:' + l.id)) {
      vistas.push('exp:' + l.id);
      sinGuardar = true;
      mostrarExplicacion(l.explicacion);
    } else {
      const nuevas = fichas.filter(f => !vistas.includes(f));
      if (nuevas.length) { vistas.push(...nuevas); sinGuardar = true; mostrarFichas(nuevas); }
    }
  }

  // Los mensajes guía solo aparecen en los niveles tutoriales.
  function mensajeInicial() {
    if (nivel.libre) mensaje('Arma lo que quieras, prográmalo y presiona <b>▶ Iniciar simulación</b>. Aquí nada se evalúa: ¡experimenta!', 'info');
    else if (esReto(nivel)) mensaje('Arma el circuito <b>desde cero</b> con los componentes de la derecha, prográmalo y presiona <b>▶ Iniciar simulación</b>.', 'info');
    else if (!nivel.tutorial) mensaje('');
    else if (nivel.tipo === 'pasos') mensaje('Lee el paso de arriba y haz clic sobre la placa para responder.', 'info');
    else if (nivel.programa) mensaje('Arma tu programa en el panel de la derecha y presiona <b>▶ Iniciar simulación</b> para probarlo.', 'info');
    else if (nivel.interactivo) mensaje('Arma el circuito y presiona <b>▶ Iniciar simulación</b>. Durante la simulación puedes presionar los botones y girar las perillas.', 'info');
    else mensaje('Arma el circuito y presiona <b>▶ Iniciar simulación</b> para probarlo.', 'info');
  }

  function salirNivel() {
    detenerPrograma();
    if (sinGuardar) guardar();
    const l = nivel;
    nivel = null;
    if (esReto(l)) irRetos(); else irMundo(mundoDe(l));
  }

  function pintarPaleta(tipos, nota) {
    const p = $('#paleta');
    p.innerHTML = '';
    for (const tipo of tipos) {
      const c = COMPONENTES[tipo];
      const item = document.createElement('div');
      item.className = 'item-paleta';
      item.title = 'Arrástralo a la mesa de trabajo';
      const svg = el('svg', {viewBox: c.caja}, item);
      c.dibujar(el('g', {}, svg), 'normal');
      item.insertAdjacentHTML('beforeend', `<span>${c.nombre}</span>`);
      item.addEventListener('pointerdown', e => { e.preventDefault(); Editor.soltarDesdePaleta(tipo, e); });
      p.appendChild(item);
    }
    if (nota || !tipos.length) {
      p.insertAdjacentHTML('beforeend', `<p class="nota-paleta">${nota || 'En este nivel no hay componentes nuevos: trabaja con los que ya están en la mesa.'}</p>`);
    }
  }

  function botonSim(encendida) {
    const b = $('#btn-sim');
    b.textContent = encendida ? '■ Detener simulación' : '▶ Iniciar simulación';
    b.classList.toggle('detener', encendida);
    b.classList.remove('pulso');
  }

  // ---------- simulación ----------
  let ejecucion = null;

  function alternarSim() {
    if (nivel.programa || nivel.interactivo) {
      if (ejecucion) { detenerPrograma(); mensajeInicial(); return; }
      iniciarPrograma();
      return;
    }
    const r = Editor.alternarSimulacion();
    botonSim(!!r);
    if (r) evaluar(r);
    else mensajeInicial();
  }

  function evaluar(r) {
    const meta = nivel.meta, enc = r.encendidos.length, falta = (meta.encendidos || 0) - enc;
    const colorFalta = (meta.colores || []).find(t => !r.encendidos.some(id => r.tipos[id] === t));
    const conexionFalta = (meta.conexiones || []).some(([a, b]) => r.red(a) !== r.red(b));
    const errores = {quemado: r.quemados, invertido: r.invertidos, puenteado: r.puenteados};
    let logrado;
    if (meta.error === 'corto') logrado = r.corto;
    else if (meta.error) logrado = !r.corto && errores[meta.error].length > 0;
    else logrado = !r.corto && !r.quemados.length && falta <= 0 && !colorFalta && !conexionFalta;
    if (logrado) { lograr(); return; }

    let txt;
    if (r.corto && meta.error !== 'corto') txt = '⚡ ¡Cortocircuito! El 5V quedó conectado directo con GND. En la vida real esto puede dañar la placa.';
    else if (meta.error === 'corto') txt = 'Todavía no hay cortocircuito: el 5V tiene que quedar unido con GND sin nada en el medio.';
    else if (meta.error === 'quemado') txt = 'El LED todavía no se quema. ¿Está conectado directo a 5V y GND, sin nada más en el camino?';
    else if (meta.error === 'invertido') txt = enc ? 'El LED se encendió: está bien puesto. Para el experimento, ponlo al revés.' : 'El LED todavía no está conectado al revés entre 5V y GND.';
    else if (meta.error === 'puenteado') txt = 'Las dos patas del LED todavía están en columnas diferentes.';
    else if (r.quemados.length) txt = '💥 ¡Se quemó un LED! Le llegó demasiada corriente. ¿Qué componente lo protege?';
    else if (falta > 0) txt = enc ? `¡Vas bien! Encendiste ${enc} de ${meta.encendidos} LEDs.` : 'El LED no enciende. Revisa que la corriente tenga un camino completo, desde 5V hasta GND.';
    else if (colorFalta) txt = `Falta encender el ${COMPONENTES[colorFalta].nombre}.`;
    else txt = 'Casi: todavía falta alguna conexión del objetivo. Revisa la lista ✅ de la izquierda.';
    fallo(`${txt}<br><small>Detén la simulación para hacer cambios.</small>`);
  }

  function lograr() {
    mensaje(nivel.exito || '¡Funciona! 🎉', 'ok');
    const l = nivel;
    setTimeout(() => { if (nivel === l) completarNivel(); }, 1300);
  }

  function fallo(html) {
    if (nivel.libre) { mensaje(html, 'error'); return; }
    const d = escribir(nivel.id);
    if (!d.completado) { d.fallos = (d.fallos || 0) + 1; sinGuardar = true; }
    mensaje(html, 'error');
    revisarPistas();
  }

  // ---------- simulación con programa (y niveles interactivos: pulsador, perilla, buzzer) ----------
  let obs = null;
  const SIN_PROGRAMA = 'void setup() {}\nvoid loop() {}';

  // Lo que el estudiante tiene que hacer mientras se observa la simulación
  function accionPendiente() {
    const m = nivel.meta;
    if (nivel.accion) return nivel.accion;
    if (nivel.libre || m.manual) return '';
    if (m.contador) return `presiona y suelta el pulsador ${m.contador} veces`;
    if (m.cuentaSerial) return `presiona y suelta el pulsador ${m.cuentaSerial} veces`;
    if (m.temporizador || m.timbre) return 'presiona el pulsador una vez y suéltalo';
    if (m.rgbBoton) return 'presiona y suelta el pulsador varias veces';
    if (m.pulsador || m.alarma || m.conmutar || m.servoBoton || m.parpadeoPresionado || m.error === 'siempre') return 'presiona el pulsador (haz clic sobre él y mantén)';
    if (m.serial || m.perillaBrillo || m.perillaBrilloInverso || m.umbral || m.parpadeoVariable || m.servoPerilla || m.zonas || m.theremin
      || m.rgbPerilla || m.motorPerilla || m.error === 'sinMap') return 'gira la perilla (arrástrala hacia arriba y hacia abajo)';
    return '';
  }

  // Primer número que aparece en un texto del monitor ("Distancia: 25 cm" → 25)
  const numeroDe = txt => { const x = String(txt).match(/-?\d+(?:\.\d+)?/); return x ? parseFloat(x[0]) : null; };
  const sinTildes = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  function iniciarPrograma() {
    const m = nivel.meta;
    Codigo.limpiar();
    const c = Programa.compilar(nivel.programa ? Codigo.obtener() : SIN_PROGRAMA);
    if (!c.ok) {
      Codigo.salida(`❌ Línea ${c.linea}: ${c.error}`, 'error');
      Codigo.marcarLinea(c.linea);
      fallo(`Hay un error en el programa (línea ${c.linea}): ${c.error}`);
      return;
    }
    // Algunos niveles piden escribir el programa de cierta forma (por ejemplo, con funciones propias).
    const falta = (nivel.codigoDebe || []).find(r => !r.re.test(Codigo.obtener()));
    if (falta) { fallo(falta.msg); return; }
    if (nivel.programa) Codigo.salida('▶ Programa cargado en el Arduino.', 'info');
    const interactiva = !!accionPendiente();
    const largo = m.secuencia || m.secuenciaRGB || m.motorSecuencia || m.sos || m.melodia;
    obs = {
      inicio: null, ultimoT: 0, aviso: 0, resuelto: false, leds: {}, subidas: [], juntos: 0,
      limite: nivel.libre || m.manual ? Infinity : esReto(nivel) ? 45000 : largo ? 25000 : interactiva || m.notas || m.escala ? 30000
        : m.servo ? 6000 + 1500 * m.servo.length : m.pitidos || m.fade || m.rafaga || m.sirena || m.servoLento || m.motorRampa ? 12000 : 5000,
      t: {presOn: 0, presOff: 0, sueltoOn: 0, sueltoOff: 0, sonido: 0, invertido: 0, altoOn: 0, altoOff: 0, bajoOn: 0, bajoOff: 0,
        medioSeguido: 0, intermedio: 0, sinEnergia: 0, sbPres: 0, sbSuelto: 0, directo: 0, adelante: 0, atras: 0, lento: 0, rapido: 0,
        lejosOn: 0, lejosOff: 0, activoAntes: 0, scCercaOk: 0, scCercaMal: 0, scLejosOk: 0, scLejosMal: 0,
        mdCercaOk: 0, mdCercaMal: 0, mdLejosOk: 0, mdLejosMal: 0},
      cubeta: null, cubetas: new Set(), sube: 0, baja: 0, patron: '000', patrones: [], rgbHist: [], servoSeguido: {}, servoLlego: {},
      spBajo: false, spAlto: false, posMin: 1, posMax: 0, posActual: null, motorEstado: null, motorDesde: 0, motorAnotado: false, motorSeq: [],
      presiones: 0, presionesT: [], presionadoAntes: false, salidaAntes: false, cambiosSuelto: 0, soltadoEn: null, ultimoSuelto: null,
      trasSoltar: [], tras: [], colorTras: [], cambiosPres: 0,
      pitidos: 0, sonaba: false, notas: [], notasT: [], notaActual: 0, notaDesde: 0, notaAnotada: false,
      fAnterior: 0, fSube: 0, fBaja: 0, fMin: Infinity, fMax: 0, frecs: new Set(), fBajoS: 0, fBajoN: 0, fAltoS: 0, fAltoN: 0,
      serialMin: Infinity, serialMax: -Infinity, serialSet: new Set(), decimal: false, lineaBuf: '', palBajo: 0, palAlto: 0, palMal: 0,
      bajo: false, alto: false, medio: false, vioAlto: false, apagadoArriba: false, invBajo: false, invAlto: false,
      zonas: (m.zonas || []).map(() => ({bien: 0, mal: 0})), rgbPos: {}, svExt: null, cruces: [],
      velCubeta: null, velCubetas: new Set(), velSube: 0, mpBajo: false, mpAlto: false, mpMedio: false,
    };
    const hw = Editor.iniciarPrograma({
      alCuadro: observar,
      alSerial: (txt, salto) => {
        Codigo.salida(txt, 'serie', salto);
        if (!obs) return;
        const n = numeroDe(txt);
        if (n !== null) {
          obs.serialMin = Math.min(obs.serialMin, n);
          obs.serialMax = Math.max(obs.serialMax, n);
          obs.serialSet.add(n);
          if (/\d\.\d/.test(txt)) obs.decimal = true;
        }
        obs.lineaBuf += txt;
        if (salto) { lineaSerial(obs.lineaBuf); obs.lineaBuf = ''; }
      },
      alAviso: txt => Codigo.salida('⚠️ ' + txt, 'aviso'),
    });
    ejecucion = Programa.ejecutar(c.prog, hw, e => {
      Codigo.salida(`❌ Línea ${e.linea}: ${e.message}`, 'error');
      Codigo.marcarLinea(e.linea);
      detenerPrograma();
      fallo(`El programa se detuvo por un error (línea ${e.linea}): ${e.message}`);
    });
    botonSim(true);
    mensaje(`⏳ Observando el circuito…${interactiva ? ` ¡Ahora ${accionPendiente()}!` : ''}`, 'info');
  }

  // Una línea completa del monitor: ¿dice la palabra que corresponde a la luz (o perilla) de ese momento?
  function lineaSerial(linea) {
    const pal = nivel.meta.serialPalabras, pos = obs.posActual;
    if (!pal || pos === null) return;
    const s = sinTildes(linea), b = s.includes(pal.bajo), a = s.includes(pal.alto);
    if (pos < 0.3) { if (b && !a) obs.palBajo++; else if (a) obs.palMal++; }
    if (pos > 0.7) { if (a && !b) obs.palAlto++; else if (b) obs.palMal++; }
  }

  function detenerPrograma() {
    if (!ejecucion) return;
    ejecucion.detener();
    ejecucion = null;
    obs = null;
    Editor.detener();
    botonSim(false);
  }

  // Se llama en cada cuadro de la simulación: registra lo que pasa y decide si se cumplió la meta.
  function observar({t, leds, corto, presionado, buzzers, perillas, rgb, servos, motores}) {
    if (!obs || obs.resuelto) return;
    if (obs.inicio === null) obs.inicio = t;
    const dt = t - obs.ultimoT, m = nivel.meta, T = obs.t;
    obs.ultimoT = t;
    if (nivel.libre || m.manual) { observarLibre(t, corto, leds); return; }
    let prendidos = 0, brillo = 0;
    for (const l of leds) {
      const o = obs.leds[l.id] = obs.leds[l.id] || {tipo: l.tipo, on: false, cambios: [], hist: [], pulsos: [], segs: [], segDesde: t, desde: null};
      const on = l.brillo >= 0.35;
      if (on !== o.on) {
        o.cambios.push(t);
        // pulsos (cuánto dura cada encendido) y segmentos [encendido 1/0, duración]
        if (on) { obs.subidas.push(l.tipo); o.desde = t; } else if (o.desde !== null) o.pulsos.push({ini: o.desde, dur: t - o.desde});
        o.segs.push([o.on ? 1 : 0, t - o.segDesde]);
        o.segDesde = t;
        o.on = on;
        if (presionado) obs.cambiosPres++;
      }
      o.hist.push([t, l.brillo]);
      while (o.hist.length && o.hist[0][0] < t - 1000) o.hist.shift();
      o.quemado = l.quemado;
      if (on) prendidos++;
      brillo = Math.max(brillo, l.brillo);
    }
    if (prendidos > 1) obs.juntos += dt;

    // Pulsador: ¿la salida (LED o buzzer) sigue al botón?
    const sonando = buzzers.find(b => b.f);
    const salida = m.alarma || m.timbre ? !!sonando : prendidos > 0;
    if (presionado) { if (salida) T.presOn += dt; else T.presOff += dt; } else if (salida) T.sueltoOn += dt; else T.sueltoOff += dt;
    if (presionado && !obs.presionadoAntes) { obs.presiones++; obs.presionesT.push(t); }
    if (!presionado && obs.presionadoAntes) { obs.soltadoEn = t; obs.ultimoSuelto = t; }
    if (obs.ultimoSuelto === null) obs.ultimoSuelto = t; // al empezar, el botón cuenta como recién soltado
    if (obs.soltadoEn !== null && !presionado && t - obs.soltadoEn >= 400) { obs.trasSoltar.push(salida); obs.soltadoEn = null; }
    if (!obs.presiones && salida) T.activoAntes += dt; // la salida se activa sin haber presionado nunca
    // Con el botón suelto hace rato: ¿la salida queda apagada?
    if (!presionado && t - obs.ultimoSuelto >= (m.timbre ? 1500 : 700)) { if (salida) T.lejosOn += dt; else T.lejosOff += dt; }
    // Cómo queda la salida después de cada presión (tras[k] = después de la presión número k)
    if (!presionado && t - obs.ultimoSuelto >= 300) {
      const e = obs.tras[obs.presiones];
      if (!e || e.v !== salida) obs.tras[obs.presiones] = {v: salida, desde: t};
    }
    if (!presionado && !obs.presionadoAntes && salida !== obs.salidaAntes && t > obs.inicio) obs.cambiosSuelto++;
    obs.presionadoAntes = presionado;
    obs.salidaAntes = salida;

    // Buzzer: tiempo sonando, pitidos y notas
    if (sonando) T.sonido += dt;
    if (buzzers.some(b => b.invertido)) T.invertido += dt;
    if (sonando && !obs.sonaba) obs.pitidos++;
    obs.sonaba = !!sonando;
    const f = sonando ? Math.round(sonando.f) : 0;
    if (f !== obs.notaActual) { obs.notaActual = f; obs.notaDesde = t; obs.notaAnotada = false; }
    if (f && !obs.notaAnotada && t - obs.notaDesde >= 80) { obs.notas.push(f); obs.notasT.push([f, t]); obs.notaAnotada = true; }
    // Sirena: la frecuencia sube y baja de a poco (los saltos grandes no cuentan)
    if (f) {
      const a = obs.fAnterior;
      if (a && f > a && f / a < 1.33) obs.fSube++;
      if (a && f < a && f / a > 0.75) obs.fBaja++;
      obs.fMin = Math.min(obs.fMin, f);
      obs.fMax = Math.max(obs.fMax, f);
      obs.frecs.add(f);
      obs.fAnterior = f;
    }

    // Perilla, luz o distancia: cómo responde la salida según la posición
    const pos = perillas.length ? perillas[0] : null;
    obs.posActual = pos;
    // Cerca / lejos del sensor: al cambiar de zona, se da un momento para que el servo o el motor reaccionen
    const uz = m.umbral && m.umbral !== true ? m.umbral : {bajo: 0.06, alto: 0.2};
    const zona = pos === null ? null : pos < uz.bajo ? 'cerca' : pos > uz.alto ? 'lejos' : null;
    if (zona !== obs.zonaAct) { obs.zonaAct = zona; obs.zonaDesde = t; }
    const asentado = t - obs.zonaDesde >= 600;
    if (pos !== null) {
      obs.posMin = Math.min(obs.posMin, pos);
      obs.posMax = Math.max(obs.posMax, pos);
      if (brillo < 0.25 && pos < 0.3) obs.bajo = true;
      if (brillo > 0.75 && pos > 0.7) obs.alto = true;
      if (brillo >= 0.3 && brillo <= 0.7) obs.medio = true;
      if (brillo > 0.75 && pos < 0.3) obs.invBajo = true;
      if (brillo < 0.25 && pos > 0.7) obs.invAlto = true;
      if (brillo > 0.5) obs.vioAlto = true;
      if (obs.vioAlto && pos > 0.3 && brillo < 0.12) obs.apagadoArriba = true;
      const u = m.umbral && m.umbral !== true ? m.umbral : {bajo: 0.45, alto: 0.55};
      const activa = m.salida === 'buzzer' ? !!sonando : prendidos > 0;
      if (pos > u.alto) { if (activa) T.altoOn += dt; else T.altoOff += dt; }
      if (pos < u.bajo) { if (activa) T.bajoOn += dt; else T.bajoOff += dt; }
      // Theremin: qué tan aguda suena la nota con la perilla abajo y arriba
      if (f && pos < 0.25) { obs.fBajoS += f; obs.fBajoN++; }
      if (f && pos > 0.75) { obs.fAltoS += f; obs.fAltoN++; }
      // Zonas: en cada tramo de la perilla (o de la luz, o de la distancia) deben encenderse ciertos LEDs
      if (m.zonas) {
        const tiposOn = new Set(leds.filter(l => l.brillo >= 0.35).map(l => l.tipo));
        m.zonas.forEach((z, i) => {
          if (pos < z.de || pos > z.a) return;
          const bien = z.n ? prendidos >= z.n[0] && prendidos <= z.n[1] : z.tipos.length === tiposOn.size && z.tipos.every(x => tiposOn.has(x));
          obs.zonas[i][bien ? 'bien' : 'mal'] += dt;
        });
      }
    }

    // Brillo del LED: medio brillo estable, subidas y bajadas (PWM)
    if (leds.length) {
      // un nivel de brillo cuenta si se mantiene 60 ms (el cuadro de un cambio brusco no cuenta)
      const c = brillo < 0.1 ? 0 : brillo < 0.3 ? 1 : brillo < 0.5 ? 2 : brillo < 0.7 ? 3 : brillo < 0.9 ? 4 : 5;
      if (c !== obs.brCand) { obs.brCand = c; obs.brCandDesde = t; }
      if (t - obs.brCandDesde >= 60 && c !== obs.cubeta) {
        if (obs.cubeta !== null) { if (c > obs.cubeta) obs.sube++; else obs.baja++; }
        obs.cubeta = c;
        obs.cubetas.add(c);
      }
      T.medioSeguido = brillo >= 0.3 && brillo <= 0.7 ? T.medioSeguido + dt : 0;
      if (c > 0 && c < 5) T.intermedio += dt;
    }

    // LED RGB: qué colores se encienden (patrón rojo-verde-azul, por ejemplo '101' = morado)
    for (const r of rgb) {
      const pat = r.c.map(x => (x >= 0.35 ? 1 : 0)).join('');
      obs.rgbHist.push([t, pat]);
      while (obs.rgbHist.length && obs.rgbHist[0][0] < t - 1000) obs.rgbHist.shift();
      // un color cuenta si se mantiene al menos 100 ms (en el cuadro del cambio pueden verse dos a medias)
      if (pat !== obs.patron) { obs.patron = pat; obs.patronDesde = t; obs.patronAnotado = false; }
      if (!obs.patronAnotado && t - obs.patronDesde >= 100) {
        if (pat !== '000' && obs.patrones[obs.patrones.length - 1] !== pat) obs.patrones.push(pat);
        obs.patronAnotado = true;
      }
      // Color según la perilla: abajo, al medio y arriba
      if (m.rgbPerilla && pos !== null) {
        const z = pos < 0.2 ? 'bajo' : pos > 0.8 ? 'alto' : pos > 0.4 && pos < 0.6 ? 'medio' : null;
        if (z && pat === m.rgbPerilla[z]) obs.rgbPos[z] = (obs.rgbPos[z] || 0) + dt;
      }
    }
    // Color después de cada presión del botón
    if (rgb.length && !presionado && t - obs.ultimoSuelto >= 300) {
      const e = obs.colorTras[obs.presiones];
      if (!e || e.v !== obs.patron) obs.colorTras[obs.presiones] = {v: obs.patron, desde: t};
    }

    // Servo: ángulos alcanzados y mantenidos
    const sv = servos[0];
    if (sv) {
      if (sv.sinEnergia) T.sinEnergia += dt;
      for (const a of m.servo || []) {
        obs.servoSeguido[a] = Math.abs(sv.angulo - a) <= 4 ? (obs.servoSeguido[a] || 0) + dt : 0;
        if (obs.servoSeguido[a] >= 300) obs.servoLlego[a] = true;
      }
      if (pos !== null && pos < 0.2 && sv.angulo < 30) obs.spBajo = true;
      if (pos !== null && pos > 0.8 && sv.angulo > 150) obs.spAlto = true;
      if (presionado && sv.angulo >= 80) T.sbPres += dt;
      if (!presionado && sv.angulo <= 10) T.sbSuelto += dt;
      // Barrido: cuánto tarda en ir de un extremo al otro (desde que deja un extremo hasta que llega al otro)
      const lado = sv.angulo <= 10 ? 'bajo' : sv.angulo >= 170 ? 'alto' : null;
      if (lado) {
        if (obs.svExt && obs.svExt.lado !== lado) obs.cruces.push(t - obs.svExt.t);
        obs.svExt = {lado, t};
      }
      // Barrera automática: objeto cerca → 90°, lejos → 0°
      if (zona === 'cerca') { if (sv.angulo >= 80) T.scCercaOk += dt; else if (asentado) T.scCercaMal += dt; }
      if (zona === 'lejos') { if (sv.angulo <= 10) T.scLejosOk += dt; else if (asentado) T.scLejosMal += dt; }
    }

    // Motor: sentido, velocidad y secuencia de movimientos
    const mo = motores[0];
    if (mo) {
      const v = mo.vel || 0;
      if (mo.directo) T.directo += dt;
      if (v > 0.5) T.adelante += dt;
      if (v < -0.5) T.atras += dt;
      if (Math.abs(v) > 0.15 && Math.abs(v) < 0.65) T.lento += dt;
      if (Math.abs(v) > 0.9) T.rapido += dt;
      const estado = v > 0.3 ? 1 : v < -0.3 ? -1 : 0;
      if (estado !== obs.motorEstado) { obs.motorEstado = estado; obs.motorDesde = t; obs.motorAnotado = false; }
      if (!obs.motorAnotado && t - obs.motorDesde >= 400) {
        if (obs.motorSeq[obs.motorSeq.length - 1] !== estado) obs.motorSeq.push(estado);
        obs.motorAnotado = true;
      }
      // Rampa: la velocidad sube por escalones (0 a 5); un escalón cuenta si se mantiene 100 ms
      // (en el cuadro de un cambio brusco se ve una velocidad intermedia que no cuenta)
      const c = Math.min(5, Math.floor(Math.abs(v) * 5 + 1e-6));
      if (c !== obs.velCand) { obs.velCand = c; obs.velCandDesde = t; }
      if (t - obs.velCandDesde >= 100 && c !== obs.velCubeta) {
        if (obs.velCubeta !== null && c > obs.velCubeta) obs.velSube++;
        obs.velCubeta = c;
        obs.velCubetas.add(c);
      }
      if (pos !== null) {
        // Perilla → velocidad
        if (pos < 0.2 && Math.abs(v) < 0.25) obs.mpBajo = true;
        if (pos > 0.8 && Math.abs(v) > 0.75) obs.mpAlto = true;
        if (pos > 0.35 && pos < 0.65 && Math.abs(v) > 0.25 && Math.abs(v) < 0.75) obs.mpMedio = true;
        // Distancia → sentido: cerca retrocede, lejos avanza
        if (zona === 'cerca') { if (v < -0.3) T.mdCercaOk += dt; else if (asentado) T.mdCercaMal += dt; }
        if (zona === 'lejos') { if (v > 0.3) T.mdLejosOk += dt; else if (asentado) T.mdLejosMal += dt; }
      }
    }

    const transcurrido = t - obs.inicio;
    const r = juzgar(transcurrido, corto, transcurrido >= obs.limite);
    if (r) {
      obs.resuelto = true;
      if (r.ok) lograr();
      else fallo(`${r.msg}<br><small>Detén la simulación, haz los cambios y vuelve a probar.</small>`);
    } else if (t - obs.aviso > 500) {
      obs.aviso = t;
      const accion = accionPendiente();
      mensaje(`⏳ Observando el circuito… ${Math.max(0, Math.ceil((obs.limite - transcurrido) / 1000))} s${accion ? `<br><b>¡Ahora ${accion}!</b>` : ''}`, 'info');
    }
  }

  // Taller libre y proyecto libre: la simulación sigue sin evaluar nada; solo se avisan los accidentes.
  function observarLibre(t, corto, leds) {
    const quemado = leds.some(l => l.quemado);
    const txt = corto ? '⚡ ¡Cortocircuito! Un punto con energía quedó unido directo con GND.'
      : quemado ? '💥 ¡Se quemó un LED! ¿Tiene su resistencia?' : '▶ Simulación en marcha. Detén la simulación para hacer cambios.';
    if (corto || quemado) obs.accidente = true;
    if (txt !== obs.ultimoTexto) { obs.ultimoTexto = txt; mensaje(txt, corto || quemado ? 'error' : 'info'); }
    if (nivel.meta.manual && !entregaProbada && !obs.accidente && t - obs.inicio >= 5000) { entregaProbada = true; pintarEntrega(); }
  }

  // ---------- proyecto libre: lista de revisión y entrega ----------
  let entregaProbada = false;
  const ENTRADAS = ['pulsador', 'potenciometro', 'ldr', 'ultrasonico'], SALIDAS = ['led', 'led_amarillo', 'led_verde', 'led_rgb', 'buzzer', 'servo', 'motor'];

  function pintarEntrega() {
    if (!nivel || !nivel.meta.manual) return;
    const tipos = new Set(Editor.analizar().piezas.map(p => p.tipo)), d = leer(nivel.id);
    const items = [
      ['Usa al menos una entrada: pulsador, perilla, luz o distancia', ENTRADAS.some(x => tipos.has(x))],
      ['Usa al menos una salida: LED, buzzer, servo o motor', SALIDAS.some(x => tipos.has(x))],
      ['La simulación funcionó 5 segundos sin errores ni accidentes', entregaProbada],
    ];
    const caja = $('#nivel-paso'), marcado = !!(caja.querySelector('#ent-explico') || {}).checked;
    caja.innerHTML = `<h3>📋 Antes de entregar</h3><ol class="guia">${items.map(([txt, ok]) => `<li class="${ok ? 'hecho' : ''}">${ok ? '✅' : '⬜'} <span>${txt}</span></li>`).join('')}</ol>
      <label class="ent-check"><input type="checkbox" id="ent-explico" ${marcado ? 'checked' : ''}> Puedo explicar qué hace mi proyecto y cómo funciona</label>
      <button class="btn" id="ent-btn">${d.completado ? '📤 Entregar otra vez' : '📤 Entregar proyecto'}</button>`;
    const listo = () => items.every(([, ok]) => ok) && $('#ent-explico').checked;
    $('#ent-btn').disabled = !listo();
    $('#ent-explico').onchange = () => { $('#ent-btn').disabled = !listo(); };
    $('#ent-btn').onclick = () => { if (listo()) completarNivel(); };
  }

  function juzgar(trans, corto, final) {
    const m = nivel.meta, leds = Object.values(obs.leds), T = obs.t;
    const fraccionOn = l => (l.hist.length ? l.hist.filter(([, b]) => b >= 0.35).length / l.hist.length : 0);
    const promedio = l => (l.hist.length ? l.hist.reduce((a, [, b]) => a + b, 0) / l.hist.length : 0);
    const cambiosRecientes = l => l.cambios.filter(t => t >= obs.ultimoT - 1000).length;
    const intervalos = l => l.cambios.slice(1).map((t, i) => t - l.cambios[i]);
    const espera = msg => (final ? {ok: false, msg} : null);
    // distancias (en cm) que corresponden a los umbrales de cerca y lejos del sensor ultrasónico
    const u = m.umbral && m.umbral !== true ? m.umbral : {bajo: 0.06, alto: 0.2};
    const cmCerca = () => Math.floor(2 + 198 * u.bajo), cmLejos = () => Math.ceil(2 + 198 * u.alto);
    if (corto) return {ok: false, msg: '⚡ ¡Cortocircuito! Un punto con energía quedó unido directo con GND.'};
    if (leds.some(l => l.quemado)) return {ok: false, msg: '💥 ¡Se quemó un LED! ¿Tiene su resistencia?'};

    // Errores a propósito
    if (m.error === 'sinDelay') {
      if (trans >= 1000 && leds.some(l => promedio(l) > 0.15 && promedio(l) < 0.85 && cambiosRecientes(l) <= 1)) return {ok: true};
      return espera('El LED todavía parpadea de forma visible. ¿Quitaste los dos bloques de esperar?');
    }
    if (m.error === 'siempre') return T.sueltoOn >= 800 ? {ok: true} : espera('El LED no se enciende sin presionar. ¿Giraste el pulsador antes de ponerlo?');
    if (m.error === 'flotante') return obs.cambiosSuelto >= 3 ? {ok: true} : espera('El LED no cambió solo. Inicia la simulación sin tocar el botón y observa.');
    if (m.error === 'buzzerInvertido') {
      if (T.invertido >= 500) return {ok: true};
      return espera(T.sonido ? 'El buzzer suena: está bien puesto. Para el experimento, ponlo al revés.' : 'El buzzer todavía no está conectado al revés entre 5V y GND.');
    }
    if (m.error === 'sinMap') return obs.apagadoArriba ? {ok: true} : espera('Gira la perilla de punta a punta y mira el LED. ¿Usaste el valor sin convertir (sin map)?');

    // Pulsador
    if (m.pulsador || m.alarma) {
      const malo = T.presOff + T.sueltoOn, bueno = T.presOn + T.sueltoOff;
      if (T.presOn >= 400 && T.sueltoOff >= 400 && malo <= 0.25 * (bueno + malo)) return {ok: true};
      const que = m.alarma ? ['el buzzer suena', 'el buzzer no suena'] : ['el LED se enciende', 'el LED no se enciende'];
      if (T.sueltoOn >= 2000) return {ok: false, msg: `Sin presionar el botón, ${que[0]}. Debe pasar solo mientras lo presionas.`};
      if (T.presOff >= 2000) return {ok: false, msg: `Presionas el botón, pero ${que[1]}.`};
      return espera(obs.presiones ? `Al presionar, ${que[0]}; al soltar, se debe apagar.` : 'No presionaste el botón. Haz clic sobre el pulsador y mantenlo apretado.');
    }
    if (m.conmutar) {
      const e = obs.trasSoltar;
      if (e.length >= 2 && e[e.length - 1] !== e[e.length - 2] && e.includes(true)) return {ok: true};
      if (e.length >= 4) return {ok: false, msg: 'El LED no cambia cada vez que presionas y sueltas el botón.'};
      return espera(obs.presiones ? 'Presiona y suelta el botón varias veces: cada vez el LED debe cambiar (encendido ↔ apagado) y quedarse así.' : 'No presionaste el botón.');
    }

    // Buzzer
    if (m.sonido) return T.sonido >= 500 ? {ok: true} : espera('El buzzer no suena. ¿Hay un camino completo de 5V a GND? ¿La pata + está hacia el 5V?');
    if (m.pitidos) {
      if (obs.pitidos >= m.pitidos) return {ok: true};
      return espera(obs.pitidos ? `Se escucharon ${obs.pitidos} pitido(s); la meta es ${m.pitidos}. ¿Apagas y esperas dentro de "repetir siempre"?` : 'El buzzer no suena. ¿El programa usa el pin al que está conectado?');
    }
    if (m.notas) {
      const n = new Set(obs.notas).size;
      return n >= m.notas ? {ok: true} : espera(`Sonaron ${n} nota(s) diferente(s); la meta es ${m.notas}.`);
    }
    if (m.escala) {
      const d = obs.notas.filter((f, i) => i === 0 || f !== obs.notas[i - 1]);
      for (let i = 0; i + m.escala <= d.length; i++) if (d.slice(i, i + m.escala).every((f, k, a) => k === 0 || f > a[k - 1])) return {ok: true};
      return espera('Las notas tienen que sonar de la más grave a la más aguda, una después de otra: Do, Re, Mi, Fa, Sol.');
    }

    // Potenciómetro y sensores
    if (m.error === 'lecturaFija') {
      if (obs.posMin <= 0.2 && obs.posMax >= 0.8 && obs.serialMax !== -Infinity && obs.serialMax - obs.serialMin < 30) return {ok: true};
      return espera('Cambia la luz de un extremo al otro y mira los números del monitor.');
    }
    if (m.serial) {
      const [bajo, alto] = m.serial === true ? [100, 900] : m.serial;
      if (m.serialTope && obs.serialMax > m.serialTope) return {ok: false, msg: nivel.fallaTope || `Los números del monitor pasan de ${m.serialTope}: revisa la conversión.`};
      if (obs.serialMin <= bajo && obs.serialMax >= alto) {
        if (m.decimales && !obs.decimal) return {ok: false, msg: 'Los números no tienen decimales. Si divides dos números enteros, el resultado pierde los decimales: usa 5.0 en vez de 5.'};
        return {ok: true};
      }
      return espera(obs.serialMax === -Infinity ? 'El monitor no muestra números. ¿El programa escribe en el monitor lo que lee?' : nivel.fallaMeta || `Lleva el control hasta los dos extremos: los números deben llegar a ${bajo} o menos y a ${alto} o más.`);
    }
    if (m.perillaBrillo) return obs.bajo && obs.alto && obs.medio ? {ok: true} : espera('Gira la perilla de punta a punta: el LED debe pasar de apagado a muy brillante, poco a poco.');
    if (m.umbral) {
      const inv = !!m.invertido, encendido = inv ? T.bajoOn : T.altoOn, apagado = inv ? T.altoOff : T.bajoOff;
      const malo = inv ? T.bajoOff + T.altoOn : T.altoOff + T.bajoOn;
      if (encendido >= 400 && apagado >= 400 && malo <= 0.25 * (encendido + apagado + malo)) return {ok: true};
      return espera(nivel.fallaMeta || 'El LED debe encenderse con la perilla en la mitad de arriba (más de 512) y apagarse en la mitad de abajo.');
    }
    if (m.parpadeoVariable) {
      if (leds.some(l => { const iv = intervalos(l).slice(1); return iv.length && Math.min(...iv) < 300 && Math.max(...iv) > 600; })) return {ok: true};
      return espera('Gira la perilla mientras el LED parpadea: con la perilla abajo debe parpadear rápido y con la perilla arriba, lento.');
    }

    // Mundo 8: brillo (PWM) y LED RGB
    if (m.brilloMedio) return T.medioSeguido >= 1000 ? {ok: true} : espera('El LED debe quedar encendido a medias (ni apagado ni al máximo). Prueba con un valor como 100 o 128.');
    if (m.error === 'sinPWM') {
      const l = leds[0];
      if (l && l.cambios.length >= 3 && T.intermedio < 150) return {ok: true};
      return espera('Observa el LED unos segundos: ¿se enciende poco a poco o de golpe?');
    }
    if (m.fade) return obs.sube >= 3 && obs.baja >= 3 && obs.cubetas.size >= 5 ? {ok: true} : espera('El LED tiene que subir su brillo poco a poco y después bajarlo poco a poco.');
    const nombrePatron = pat => ({100: 'rojo', '010': 'verde', '001': 'azul', 110: 'amarillo', 101: 'morado', '011': 'celeste', 111: 'blanco', '000': 'apagado'})[pat];
    if (m.rgb) {
      const meta = m.rgb.join('');
      if (trans >= 1000 && obs.rgbHist.length && obs.rgbHist.every(([, pat]) => pat === meta)) return {ok: true};
      return espera(`El LED RGB se ve ${nombrePatron(obs.patron)}; la meta es ${nombrePatron(meta)}. Revisa qué colores (pines) enciendes.`);
    }
    if (m.secuenciaRGB) {
      const sec = m.secuenciaRGB.map(c => c.join('')), sub = obs.patrones, n = sec.length;
      for (let i = 0; i + n < sub.length; i++) {
        const j = sec.indexOf(sub[i]);
        if (j >= 0 && [...Array(n + 1)].every((_, k) => sub[i + k] === sec[(j + k) % n])) return {ok: true};
      }
      return espera(`Los colores deben seguir este orden y repetirse: ${sec.map(nombrePatron).join(' → ')}.`);
    }

    // Mundo 9: servomotor
    if (m.error === 'servoSinEnergia') return T.sinEnergia >= 1000 ? {ok: true} : espera('¿Quitaste el cable rojo (5V) del servo? Elimínalo y vuelve a probar.');
    if (m.servo) {
      const faltan = m.servo.filter(a => !obs.servoLlego[a]);
      if (!faltan.length) return {ok: true};
      return espera(`El servo todavía no llegó a ${faltan.map(a => a + '°').join(' ni a ')}. Recuerda esperar un poco después de moverlo.`);
    }
    if (m.servoPerilla) return obs.spBajo && obs.spAlto ? {ok: true} : espera(nivel.fallaMeta || 'Gira la perilla de punta a punta: el servo debe ir de 0° a 180°.');
    if (m.servoBoton) return T.sbPres >= 300 && T.sbSuelto >= 300 ? {ok: true} : espera('Al presionar, la barrera (servo) debe subir a 90°; al soltar, bajar a 0°.');

    // Mundo 11: motor
    if (m.error === 'motorDirecto') return T.directo >= 800 ? {ok: true} : espera('Inicia la simulación y mira el motor: ¿gira?');
    if (m.motor) {
      const bien = m.motor > 0 ? T.adelante : T.atras, mal = m.motor > 0 ? T.atras : T.adelante;
      if (bien >= 1000 && mal < 200) return {ok: true};
      if (mal >= 1000) return {ok: false, msg: 'El motor gira, pero hacia el otro lado. Intercambia los valores de IN1 e IN2.'};
      return espera(T.directo ? 'El motor está conectado directo a un pin: necesita el driver.' : `El motor no gira. Para ${m.motor > 0 ? 'adelante' : 'atrás'}: IN1 en ${m.motor > 0 ? 'ALTO' : 'BAJO'} e IN2 en ${m.motor > 0 ? 'BAJO' : 'ALTO'}.`);
    }
    if (m.motorDirecciones) return T.adelante >= 300 && T.atras >= 300 ? {ok: true} : espera('El motor debe girar hacia adelante un rato y después hacia atrás.');
    if (m.motorLento) {
      if (T.lento >= 1000) return {ok: true};
      return espera(T.rapido > 1500 ? 'El motor va a toda velocidad. Usa "poner pin ~10 al valor" con un número menor, como 120.' : 'El motor no gira. Revisa IN1, IN2 y el valor de ENA (pin ~10).');
    }
    if (m.motorSecuencia) {
      const sec = m.motorSecuencia, sub = obs.motorSeq;
      for (let i = 0; i + sec.length <= sub.length; i++) if (sec.every((x, k) => sub[i + k] === x)) return {ok: true};
      return espera('El motor debe avanzar, detenerse y luego retroceder (en ese orden).');
    }

    // ---------- Niveles extra y retos ----------
    // Patrones de luz
    if (m.sos) {
      for (const l of leds) {
        const p = l.pulsos.map(x => x.dur);
        for (let i = 0; i + 9 <= p.length; i++) {
          const v = p.slice(i, i + 9), lo = Math.min(...v), hi = Math.max(...v), u = (lo + hi) / 2;
          if (hi >= 1.8 * lo && v.map(d => (d < u ? 'c' : 'L')).join('') === 'cccLLLccc') return {ok: true};
        }
      }
      return espera('El LED debe formar S-O-S: 3 destellos cortos, 3 largos (el triple de tiempo) y 3 cortos, y después una pausa.');
    }
    if (m.rafaga) {
      const n = m.rafaga;
      for (const l of leds) {
        // grupos de destellos separados por apagados largos (700 ms o más)
        const s = l.segs.concat([[l.on ? 1 : 0, obs.ultimoT - l.segDesde]]);
        let grupo = null;
        for (const [on, d] of s) {
          if (!on && d >= 700) {
            if (grupo && grupo.ok && grupo.n === n) return {ok: true};
            if (grupo && grupo.ok && grupo.n && final) return {ok: false, msg: `Cada ráfaga tiene ${grupo.n} destellos; la meta es ${n}.`};
            grupo = {n: 0, ok: true};
          } else if (grupo && on) { grupo.n++; if (d > 400) grupo.ok = false; }
        }
      }
      return espera(`El LED debe dar ${n} destellos rápidos (cortos), hacer una pausa de 1 segundo y repetir.`);
    }
    // Pulsador
    if (m.contador) {
      const n = m.contador, e = obs.tras;
      for (let k = 0; k < n; k++) {
        if (e[k] && e[k].v) return {ok: false, msg: k ? `El LED se encendió después de ${k} presión${k > 1 ? 'es' : ''}; debe encenderse recién en la presión número ${n}. ¿Cuentas cada presión una sola vez?` : 'El LED está encendido antes de presionar el botón.'};
      }
      const f = e[n];
      if (f && f.v && obs.ultimoT - f.desde >= 500) return {ok: true};
      if (obs.presiones > n || (f && !f.v && obs.ultimoT - f.desde >= 1500)) return {ok: false, msg: `Presionaste ${obs.presiones} veces y el LED no se encendió en la presión número ${n}.`};
      return espera(`Presiona y suelta el botón ${n} veces (llevas ${obs.presiones}).`);
    }
    if (m.parpadeoPresionado) {
      if (T.lejosOn >= 600) return {ok: false, msg: 'Con el botón suelto, el LED sigue encendido o parpadeando. Debe apagarse.'};
      if (obs.cambiosPres >= 4 && T.lejosOff >= 500 && obs.presiones && obs.ultimoSuelto > obs.presionesT[0]) return {ok: true};
      if (obs.presiones && T.presOn + T.presOff >= 2500 && obs.cambiosPres < 2) return {ok: false, msg: 'Mientras presionas, el LED no parpadea.'};
      return espera(obs.presiones ? 'Mantén presionado un rato (el LED debe parpadear) y después suelta (el LED debe apagarse).' : 'No presionaste el botón.');
    }
    if (m.temporizador) {
      const meta = m.temporizador, seg = x => (x / 1000).toFixed(1).replace('.0', '');
      if (T.activoAntes >= 400) return {ok: false, msg: 'El LED se enciende sin presionar el botón.'};
      for (const l of leds) {
        for (const pu of l.pulsos) {
          if (!obs.presionesT.some(p => pu.ini >= p - 50 && pu.ini <= p + 700)) continue;
          if (Math.abs(pu.dur - meta) <= meta * 0.2) return {ok: true};
          return {ok: false, msg: `El LED se quedó encendido ${seg(pu.dur)} s; la meta es ${seg(meta)} s.`};
        }
        if (l.on && l.desde !== null && obs.ultimoT - l.desde > meta * 1.5) return {ok: false, msg: `El LED lleva más de ${seg(meta * 1.5)} s encendido: tiene que apagarse solo a los ${seg(meta)} s.`};
      }
      return espera(obs.presiones ? `Presiona y suelta el botón una vez: el LED debe quedar encendido ${seg(meta)} s y apagarse solo.` : 'No presionaste el botón.');
    }
    if (m.cuentaSerial) {
      const n = m.cuentaSerial;
      if (obs.serialMax > obs.presiones + 1) return {ok: false, msg: 'El número sube más que tus presiones: cuenta solo cuando el botón pasa de suelto a presionado (guarda cómo estaba antes).'};
      if (obs.presiones >= n && [...Array(n)].every((_, i) => obs.serialSet.has(i + 1))) return {ok: true};
      return espera(obs.serialMax === -Infinity ? 'El monitor no muestra la cuenta. ¿Usas Serial.println?' : `Presiona y suelta el botón: el monitor debe mostrar 1, 2, 3… hasta ${n} (llevas ${obs.presiones}).`);
    }
    // Sonido
    if (m.sirena) {
      if (obs.fMax - obs.fMin >= 300 && obs.fSube >= 5 && obs.fBaja >= 5 && obs.frecs.size >= 8) return {ok: true};
      return espera(obs.fMax ? 'La sirena debe subir de tono poco a poco y después bajar poco a poco (al menos 300 Hz de diferencia).' : 'El buzzer no suena. ¿Usas tone() en el pin 8?');
    }
    if (m.melodia) {
      const unicas = a => a.filter((f, i) => i === 0 || f !== a[i - 1]);
      const meta = unicas(m.melodia), oido = unicas(obs.notas), igual = (a, b) => Math.abs(a - b) <= b * 0.03;
      for (let i = 0; i + meta.length <= oido.length; i++) if (meta.every((f, k) => igual(oido[i + k], f))) return {ok: true};
      return espera('La melodía no coincide todavía. Revisa el orden y las frecuencias de las notas.');
    }
    if (m.timbre) {
      if (T.activoAntes >= 300) return {ok: false, msg: 'El timbre suena sin presionar el botón.'};
      if (T.lejosOn >= 1500) return {ok: false, msg: 'El timbre sigue sonando aunque ya soltaste el botón. Después del "din-don" debe callarse.'};
      const p0 = obs.presionesT[0], n = obs.notasT.filter(([, t]) => p0 !== undefined && t >= p0 - 50);
      const dinDon = n.some(([a, ta], i) => i + 1 < n.length && a > n[i + 1][0] * 1.05 && n[i + 1][1] - ta < 1500);
      if (dinDon && T.lejosOff >= 500) return {ok: true};
      if (dinDon) return espera('¡Suena el din-don! Suelta el botón y espera: el timbre debe callarse.');
      return espera(obs.presiones ? 'Al presionar deben sonar dos notas: primero una aguda ("din") y después una más grave ("don").' : 'No presionaste el botón.');
    }
    if (m.theremin) {
      const bajo = obs.fBajoN ? obs.fBajoS / obs.fBajoN : null, alto = obs.fAltoN ? obs.fAltoS / obs.fAltoN : null;
      if (bajo !== null && alto !== null && alto - bajo >= 300 && obs.frecs.size >= 3) return {ok: true};
      return espera(obs.fMax ? 'Gira la perilla de punta a punta: abajo la nota debe ser grave y arriba, aguda.' : 'El buzzer no suena. ¿Usas tone() con lo que lees de A0?');
    }
    // Zonas de la perilla / luz / distancia
    if (m.zonas) {
      const z = obs.zonas, bien = z.reduce((a, x) => a + x.bien, 0), mal = z.reduce((a, x) => a + x.mal, 0);
      if (z.every(x => x.bien >= 400) && mal <= 0.3 * (bien + mal)) return {ok: true};
      const i = z.findIndex(x => x.mal >= 1500 && x.mal > x.bien);
      if (i >= 0) return {ok: false, msg: `No funciona en este tramo: ${m.zonas[i].txt}.`};
      const falta = m.zonas.filter((_, k) => z[k].bien < 400).map(x => x.txt);
      return espera(`Prueba todos los tramos. Falta comprobar: ${falta.join('; ')}.`);
    }
    if (m.perillaBrilloInverso) return obs.invBajo && obs.invAlto && obs.medio ? {ok: true} : espera('Gira la perilla de punta a punta: abajo el LED debe brillar al máximo y arriba, quedar casi apagado.');
    if (m.rgbPerilla) {
      const r = obs.rgbPos, nombre = pat => ({100: 'rojo', '001': 'azul', 101: 'morado', '010': 'verde', 110: 'amarillo', '011': 'celeste'})[pat] || pat;
      if (['bajo', 'medio', 'alto'].every(k => (r[k] || 0) >= 300)) return {ok: true};
      const p = m.rgbPerilla;
      return espera(`Gira la perilla despacio: abajo ${nombre(p.bajo)}, al medio ${nombre(p.medio)} y arriba ${nombre(p.alto)}.`);
    }
    if (m.rgbBoton) {
      // colores después de 3 presiones seguidas: siempre encendido, distinto del anterior y al menos 3 colores
      const c = obs.colorTras.map(x => (x ? x.v : null)), k = obs.presiones, e = obs.colorTras[k];
      for (let i = 0; i + 4 <= c.length; i++) {
        const v = c.slice(i, i + 4);
        if (v.every(x => x && x !== '000') && v.every((x, j) => j === 0 || x !== v[j - 1]) && new Set(v).size >= 3) return {ok: true};
      }
      if (k && e && c[k - 1] && e.v === c[k - 1] && obs.ultimoT - e.desde >= 600) return {ok: false, msg: 'Presionaste el botón, pero el color no cambió.'};
      return espera(`Presiona y suelta el botón varias veces: en cada presión el LED debe cambiar de color (llevas ${obs.presiones}).`);
    }
    // Servo
    if (m.servoLento) {
      if (obs.cruces.some(d => d >= 1500)) return {ok: true};
      if (obs.cruces.length >= 2) return {ok: false, msg: `El servo va de un extremo al otro en ${(Math.max(...obs.cruces) / 1000).toFixed(1)} s: muy rápido. Muévelo de 1 en 1 grado, con una pequeña espera en cada paso.`};
      return espera('El servo debe ir despacio de 0° a 180° y volver.');
    }
    if (m.servoCerca) {
      const ok = T.scCercaOk + T.scLejosOk, mal = T.scCercaMal + T.scLejosMal;
      if (T.scCercaOk >= 400 && T.scLejosOk >= 400 && mal <= 0.3 * (ok + mal)) return {ok: true};
      if (T.scCercaMal >= 2500) return {ok: false, msg: 'El objeto está cerca, pero la barrera (servo) no sube a 90°.'};
      if (T.scLejosMal >= 2500) return {ok: false, msg: 'El objeto está lejos, pero la barrera (servo) no baja a 0°.'};
      return espera(`Acerca el objeto a menos de ${cmCerca()} cm (la barrera sube a 90°) y aléjalo a más de ${cmLejos()} cm (la barrera baja a 0°).`);
    }
    if (m.serialPalabras) {
      const p = m.serialPalabras, buenos = obs.palBajo + obs.palAlto;
      if (obs.palBajo >= 2 && obs.palAlto >= 2 && obs.palMal <= 0.2 * (buenos + obs.palMal)) return {ok: true};
      if (obs.palMal >= 6 && obs.palMal > buenos) return {ok: false, msg: `Las palabras están al revés o no corresponden: con poca luz debe decir "${p.bajo.toUpperCase()}" y con mucha luz, "${p.alto.toUpperCase()}".`};
      return espera(`Lleva la luz a los dos extremos: el monitor debe decir "${p.bajo.toUpperCase()}" con poca luz y "${p.alto.toUpperCase()}" con mucha luz.`);
    }
    // Motor
    if (m.motorRampa) return obs.velSube >= 3 && obs.velCubetas.size >= 4 ? {ok: true} : espera(T.rapido > 1000 && obs.velCubetas.size <= 2 ?'El motor arranca de golpe a toda velocidad. Sube el valor de ENA (pin ~10) poco a poco con un for.' : 'El motor debe arrancar despacio e ir acelerando poco a poco.');
    if (m.motorPerilla) return obs.mpBajo && obs.mpAlto && obs.mpMedio ? {ok: true} : espera('Gira la perilla de punta a punta: abajo el motor casi parado, al medio a media velocidad y arriba a toda velocidad.');
    if (m.motorDistancia) {
      const ok = T.mdCercaOk + T.mdLejosOk, mal = T.mdCercaMal + T.mdLejosMal;
      if (T.mdCercaOk >= 400 && T.mdLejosOk >= 400 && mal <= 0.3 * (ok + mal)) return {ok: true};
      if (T.mdCercaMal >= 2500) return {ok: false, msg: 'Hay un obstáculo cerca, pero el robot no retrocede.'};
      if (T.mdLejosMal >= 2500) return {ok: false, msg: 'El camino está libre, pero el robot no avanza.'};
      return espera(`Acerca el obstáculo a menos de ${cmCerca()} cm (el robot retrocede) y aléjalo a más de ${cmLejos()} cm (el robot avanza).`);
    }

    // Mundo 4
    if (m.encendidos) {
      if (trans >= 1000 && leds.filter(l => fraccionOn(l) === 1).length >= m.encendidos) return {ok: true};
      return espera(leds.some(l => l.cambios.length >= 3) ? 'El LED parpadea, pero la meta es que quede encendido todo el tiempo.' : 'El LED no se enciende. ¿Pusiste el pin en ALTO? ¿Es el pin al que está conectado el LED?');
    }
    if (m.parpadea) {
      const l = leds.find(x => x.cambios.length >= 4);
      if (l) {
        if (!m.duracion) return {ok: true};
        const iv = intervalos(l), prom = iv.reduce((a, b) => a + b, 0) / iv.length;
        if (Math.abs(prom - m.duracion) <= m.duracion * 0.25) return {ok: true};
        if (l.cambios.length >= 6 || final) return {ok: false, msg: `El LED parpadea, pero cada cambio dura unos ${Math.round(prom)} ms. La meta es ${m.duracion} ms.`};
        return null;
      }
      if (!final) return null;
      if (leds.some(x => fraccionOn(x) > 0.9)) return {ok: false, msg: 'El LED está encendido, pero no parpadea. ¿Lo apagas y esperas dentro de "repetir siempre"?'};
      return {ok: false, msg: 'El LED no parpadea. Revisa que el programa use el pin al que está conectado el LED.'};
    }
    if (m.secuencia) {
      if (obs.juntos > 300) return {ok: false, msg: 'Dos luces estuvieron encendidas al mismo tiempo. Apaga una antes de encender la siguiente.'};
      const sub = obs.subidas, n = m.secuencia.length;
      for (let i = 0; i + n < sub.length; i++) {
        const j = m.secuencia.indexOf(sub[i]);
        if (j >= 0 && [...Array(n + 1)].every((_, k) => sub[i + k] === m.secuencia[(j + k) % n])) return {ok: true};
      }
      const orden = m.secuencia.concat(m.secuencia[0]).map(t => COMPONENTES[t].nombre.replace('LED ', '')).join(' → ');
      return espera(new Set(sub).size < n ? 'No se encendieron todas las luces.' : `Las luces no siguen el orden: ${orden}.`);
    }
    return espera('No se cumplió el objetivo.');
  }

  // ---------- fin del nivel ----------
  function completarNivel() {
    const d = escribir(nivel.id);
    if (!d.completado) {
      d.completado = true;
      d.estrellas = !d.fallos ? 3 : !d.pistas ? 2 : 1;
      d.fecha = new Date().toISOString();
      guardar();
    }
    const lista = nivelesDe(nivel.mundo).filter(l => !l.libre), sig = lista[lista.indexOf(nivel) + 1];
    const frases = {3: '¡Perfecto! Lo lograste al primer intento.', 2: '¡Muy bien! Lo lograste sin usar pistas.', 1: 'Lo lograste con ayuda de las pistas. ¡Sigue practicando!'};
    const porque = nivel.porque ? `<div class="porque"><h4>🤔 ¿Por qué pasó? ${botonHablar('.porque p')}</h4><p>${nivel.porque}</p></div>` : '';
    const reto = esReto(nivel), manual = !!nivel.meta.manual;
    const titulo = manual ? '¡Proyecto entregado!' : reto ? '¡Reto superado!' : enRuta() ? '¡Actividad completada!' : '¡Nivel completado!';
    const final = reto ? (lista.every(completo) ? '<p><b>🏁 ¡Superaste todos los retos!</b></p>' : '')
      : !sig ? `<p><b>🏁 ¡Terminaste ${enRuta() ? 'todas las actividades de tu ruta' : 'todos los niveles de este mundo'}!</b></p>`
      : !nivel.extra && sig.extra ? '<p><b>🏁 ¡Terminaste este mundo!</b> Ya puedes pasar al siguiente. Si quieres más desafío, sigue con los niveles ⭐ extra.</p>' : '';
    abrirModal(`<div class="resultado"><div class="grandes">${manual ? '📤' : estrellas(d.estrellas)}</div>
      <h2>${titulo}</h2><p>${manual ? 'Muéstrale tu proyecto funcionando a tu profesor y explícale cómo lo hiciste.' : frases[d.estrellas]}</p>${porque}
      ${final}
      <div class="modal-botones centro"><button class="btn btn-sec" id="m-volver">Volver</button>
      ${sig ? '<button class="btn" id="m-sig">Siguiente →</button>' : ''}</div></div>`);
    $('#m-volver').onclick = () => { cerrarModal(); salirNivel(); };
    if (sig) $('#m-sig').onclick = () => { cerrarModal(); abrirNivel(sig); };
  }

  // ---------- niveles de pasos (hacer clic en partes y responder preguntas) ----------
  let paso = 0, encontrados = new Set(), bloqueoPaso = false;
  const cantidadDe = p => (p.objetivo && p.objetivo.cantidad) || 1;

  function pintarPaso() {
    const lista = nivel.pasos, p = lista[paso];
    const puntos = lista.map((_, i) => `<i class="${i < paso ? 'hecho' : i === paso ? 'actual' : ''}"></i>`).join('');
    const cuerpo = p.pregunta
      ? `<p class="texto-paso">${p.pregunta}</p><div class="opciones">${p.opciones.map((o, i) => `<button class="opcion" data-op="${i}">${o}</button>`).join('')}</div>`
      : `<p class="texto-paso">${p.texto}</p>${cantidadDe(p) > 1 ? `<div class="contador">${encontrados.size} de ${cantidadDe(p)}</div>` : ''}`;
    const caja = $('#nivel-paso');
    caja.innerHTML = `<h3>👉 Paso ${paso + 1} de ${lista.length} ${botonHablar('#nivel-paso .texto-paso')}</h3><div class="puntos">${puntos}</div>${cuerpo}`;
    caja.querySelectorAll('.opcion').forEach(b => { b.onclick = () => responder(+b.dataset.op, b); });
    Editor.resaltar(p.resaltar || []);
  }

  function alClic({terminal, parte, nombre}) {
    const p = nivel && nivel.pasos && nivel.pasos[paso];
    if (!p || p.pregunta || bloqueoPaso) return;
    const valido = (p.objetivo.terminales || []).includes(terminal) || (p.objetivo.partes || []).includes(parte);
    if (!valido) { fallo(`Eso es: <b>${nombre}</b>. Intenta de nuevo.`); return; }
    const clave = terminal || parte;
    if (encontrados.has(clave)) { mensaje('Ese ya lo encontraste. Busca otro.', 'info'); return; }
    encontrados.add(clave);
    const faltan = cantidadDe(p) - encontrados.size;
    if (faltan > 0) {
      mensaje(`¡Bien! Eso es: <b>${nombre}</b>. Te ${faltan === 1 ? 'falta 1' : `faltan ${faltan}`}.`, 'ok');
      pintarPaso();
      return;
    }
    acierto(`¡Correcto! Eso es: <b>${nombre}</b>.`);
  }

  function responder(i, boton) {
    if (bloqueoPaso) return;
    if (i !== nivel.pasos[paso].correcta) {
      boton.classList.add('mal');
      boton.disabled = true;
      fallo('Esa no es. Piénsalo otra vez.');
      return;
    }
    boton.classList.add('bien');
    acierto('¡Correcto!');
  }

  function acierto(html) {
    mensaje(html, 'ok');
    bloqueoPaso = true;
    const l = nivel;
    setTimeout(() => {
      if (nivel !== l) return;
      bloqueoPaso = false;
      paso++;
      encontrados = new Set();
      if (paso >= l.pasos.length) { completarNivel(); return; }
      mensaje('');
      pintarPaso();
    }, 900);
  }

  // ---------- guía paso a paso al armar un circuito (ruta guiada) ----------
  let pasoGuia = -1;

  function cumple(c, a) {
    if (c.codigo) return c.codigo.test(Codigo.obtener());
    if (c.conexion) return a.red(c.conexion[0]) === a.red(c.conexion[1]);
    const req = c.pieza;
    return a.piezas.some(p => p.tipo === req.tipo
      && Object.entries(req.en || {}).every(([pata, hueco]) => a.inserciones[p.id + '.' + pata] === hueco)
      && (req.huecos || []).every(h => Object.keys(a.inserciones).some(k => k.startsWith(p.id + '.') && a.inserciones[k] === h)));
  }

  function revisarGuia() {
    if (!nivel || !nivel.guia) return;
    const a = Editor.analizar(), lista = nivel.guia;
    let actual = lista.findIndex(c => !cumple(c, a));
    if (actual === -1) actual = lista.length;
    if (actual === pasoGuia) return;
    const avanzo = actual > pasoGuia && pasoGuia >= 0;
    pasoGuia = actual;
    const items = lista.map((c, i) => `<li class="${i < actual ? 'hecho' : i === actual ? 'actual' : ''}">${i < actual ? '✅' : i === actual ? '👉' : '⬜'} <span>${c.texto}</span></li>`).join('');
    const cab = actual < lista.length ? `👉 Paso ${actual + 1} de ${lista.length}` : '🎉 ¡Todo listo!';
    const final = actual < lista.length ? '' : '<p class="texto-paso"><b>Ahora presiona ▶ Iniciar simulación.</b></p>';
    $('#nivel-paso').innerHTML = `<h3>${cab} ${botonHablar('#nivel-paso .actual span, #nivel-paso .texto-paso')}</h3><ol class="guia">${items}</ol>${final}`;
    Editor.resaltar(actual < lista.length ? lista[actual].resaltar || [] : []);
    if (actual === lista.length) $('#btn-sim').classList.add('pulso');
    if (avanzo) mensaje(actual < lista.length ? '✅ ¡Muy bien! Sigue con el próximo paso.' : '✅ ¡Muy bien!', 'ok');
  }

  // ---------- pistas ----------
  const pistasDe = l => l.pistas.map(p => (typeof p === 'string' ? {texto: p} : p));
  const disponibles = () => Math.min(umbrales().filter(u => (leer(nivel.id).fallos || 0) >= u).length, nivel.pistas.length);

  function actualizarBotonPista() {
    const n = disponibles(), b = $('#btn-pista');
    b.disabled = n === 0;
    b.textContent = n ? `💡 Pistas (${n})` : '💡 Pista';
    const falta = n < nivel.pistas.length ? umbrales()[n] - (leer(nivel.id).fallos || 0) : 0;
    b.title = falta > 0 ? `Nueva pista después de ${falta} intento${falta > 1 ? 's' : ''} más` : '';
  }

  function revisarPistas() {
    const d = escribir(nivel.id), n = disponibles();
    actualizarBotonPista();
    if (n > (d.pistas || 0)) {
      d.pistas = n;
      sinGuardar = true;
      const l = nivel;
      setTimeout(() => { if (nivel === l) mostrarPistas(); }, 1300);
    }
  }

  function mostrarPistas() {
    const n = disponibles(), lista = pistasDe(nivel).slice(0, n);
    abrirModal(`<div class="pista-caja"><h2>💡 Pistas</h2>
      ${lista.map((p, i) => `<div class="ficha-sec${i === n - 1 ? ' nueva' : ''}"><div class="ic">${i + 1}</div><p>${p.texto}</p>${botonHablar(`.pista-caja .ficha-sec:nth-of-type(${i + 1}) p`)}</div>`).join('')}
      <div class="modal-botones"><button class="btn" data-cerrar>Entendido</button></div></div>`);
    const ultima = lista[n - 1];
    if (ultima && ultima.resaltar) Editor.resaltar(ultima.resaltar);
  }

  // ---------- fichas y explicaciones ----------
  function mostrarFichas(lista) {
    if (lista.length) mostrarFicha(lista[0], lista.length > 1, () => mostrarFichas(lista.slice(1)));
  }

  function mostrarFicha(id, hayMas, alCerrar) {
    const f = FICHAS[id];
    const boton = hayMas ? 'Siguiente ficha →' : '¡Entendido, a jugar!';
    const caja = abrirModal(`<div class="ficha">
      <div class="ficha-cab"><span class="etq">${f.etiqueta}</span><div><h2>${f.titulo}</h2><div class="subt">${f.subtitulo}</div></div></div>
      <div class="ficha-dibujo">${f.codigo ? `<pre class="ficha-codigo">${f.codigo}</pre>` : ''}</div>
      <div>${f.secciones.map(s => `<div class="ficha-sec${s.cuidado ? ' cuidado' : ''}"><div class="ic">${s.icono}</div>
        <div><h4>${s.titulo}</h4><p>${s.texto}</p></div>${s.mini ? `<svg class="mini-quemado" data-mini="${s.mini}" viewBox="-14 -46 40 50"></svg>` : ''}</div>`).join('')}</div>
      <div class="modal-botones"><button class="btn" data-cerrar>${boton}</button></div></div>`, alCerrar);
    if (f.dibujo) dibujoFicha(id, caja.querySelector('.ficha-dibujo'));
    caja.querySelectorAll('[data-mini]').forEach(m => COMPONENTES[m.dataset.mini].dibujar(el('g', {}, m), 'quemado'));
  }

  // Dibujo grande del componente con sus partes señaladas (el Laboratorio 3D vendrá después).
  function dibujoFicha(id, cont) {
    const d = FICHAS[id].dibujo, comp = COMPONENTES[d.tipo];
    const svg = el('svg', {viewBox: d.viewBox, width: '100%'}, cont);
    const g = el('g', {transform: `translate(${d.x || 0} ${d.y || 0}) scale(${d.escala || 1})`}, svg);
    comp.dibujar(g, 'normal');
    if (d.patasLargas) { dibujarPata(g, 'M0 0 V26'); dibujarPata(g, 'M12 0 V16'); }
    for (const tid of d.resaltar || []) {
      const t = comp.terminales.find(x => x.id === tid);
      el('rect', {x: t.x - 4.5, y: t.y - 4.5, width: 9, height: 9, rx: 2, class: 'tira'}, g);
    }
    for (const [x1, y1, x2, y2, t1, t2, ancla] of d.etiquetas || []) {
      el('line', {x1, y1, x2, y2, stroke: '#94A3B8', 'stroke-width': 1.5, 'stroke-dasharray': '3 3'}, svg);
      const centrado = ancla === 'middle';
      const tx = centrado ? x2 : x2 + (ancla === 'end' ? -4 : 4), ty = centrado ? y2 + 14 : y2 - 2;
      texto(svg, tx, ty, t1, {'text-anchor': ancla, 'font-weight': 800, 'font-size': 13, fill: '#1F2937'});
      texto(svg, tx, ty + 14, t2, {'text-anchor': ancla, 'font-size': 11, fill: '#6B7280'});
    }
  }

  // Diapositivas sencillas antes de una actividad de la ruta guiada.
  function mostrarExplicacion(lista, i = 0) {
    const s = lista[i], ultima = i === lista.length - 1;
    const caja = abrirModal(`<div class="explicacion">
      <div class="exp-puntos">${lista.map((_, k) => `<i class="${k === i ? 'actual' : ''}"></i>`).join('')}</div>
      <div class="exp-visual">${s.dibujo ? '' : `<span>${s.icono}</span>`}</div>
      <h2>${s.dibujo ? s.icono + ' ' : ''}${s.titulo}</h2>
      <p class="exp-texto">${s.texto} ${botonHablar('.exp-texto')}</p>
      <div class="modal-botones centro">
        ${i > 0 ? '<button class="btn btn-sec" id="exp-atras">← Anterior</button>' : ''}
        <button class="btn" id="exp-sig">${ultima ? '¡Empezar! 🚀' : 'Siguiente →'}</button>
      </div></div>`);
    if (s.dibujo) dibujoFicha(s.dibujo, caja.querySelector('.exp-visual'));
    $('#exp-sig').onclick = () => (ultima ? cerrarModal() : mostrarExplicacion(lista, i + 1));
    if (i > 0) $('#exp-atras').onclick = () => mostrarExplicacion(lista, i - 1);
  }

  // Ventana temporal para comparar los estilos de dibujo.
  function mostrarEstilos() {
    const op = (clave, valor, txt) => `<button class="btn ${CONFIG[clave] === valor ? '' : 'btn-sec'}" data-estilo="${clave}:${valor}">${txt}</button>`;
    const caja = abrirModal(`<div class="pista-caja"><h2>🎨 Comparar estilos</h2>
      <p><b>Arduino y protoboard</b></p><div class="modal-botones izq">${op('estiloPlaca', 'pixel', 'Pixel (8 bits)')}${op('estiloPlaca', 'detallado', 'Detallada')}${op('estiloPlaca', 'simple', 'Simple')}</div>
      <p><b>LED y resistencia</b></p><div class="modal-botones izq">${op('estiloComponentes', 'v2', 'Versión 2')}${op('estiloComponentes', 'pixel', 'Pixel (8 bits)')}${op('estiloComponentes', 'v1', 'Versión 1')}</div>
      <div class="modal-botones"><button class="btn" data-cerrar>Listo</button></div></div>`);
    caja.querySelectorAll('[data-estilo]').forEach(b => {
      b.onclick = () => {
        const [clave, valor] = b.dataset.estilo.split(':');
        CONFIG[clave] = valor;
        Editor.redibujarTodo();
        pintarPaleta(nivel.paleta || [], nivel.notaPaleta);
        mostrarEstilos();
      };
    });
  }

  // ---------- arranque ----------
  function iniciar() {
    Editor.iniciar($('#lienzo'), {avisar: toast, alClic, alCambiar: () => {
      revisarGuia();
      if (nivel && nivel.meta && nivel.meta.manual) { entregaProbada = false; pintarEntrega(); }
    }});
    Codigo.iniciar({alCambiar: revisarGuia});
    $('#aviso-local').hidden = !Progreso.esLocal();

    $('#form-ingreso').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = e.target.querySelector('button');
      btn.disabled = true;
      btn.textContent = Progreso.esLocal() ? 'Entrar' : 'Conectando…';
      $('#ingreso-error').textContent = '';
      try {
        const r = await Progreso.ingresar($('#in-codigo').value);
        if (r.ok) irMenu(); else $('#ingreso-error').textContent = r.error;
      } catch (err) {
        $('#ingreso-error').textContent = 'No hay conexión con el servidor. Revisa el internet e inténtalo de nuevo.';
      }
      btn.disabled = false;
      btn.textContent = 'Entrar';
    });

    document.addEventListener('click', e => {
      const ir = e.target.closest('[data-ir]');
      if (ir) {
        const destino = ir.dataset.ir;
        if (destino === 'menu') irMenu();
        else if (destino === 'mapa') irMapa();
        else if (destino === 'ruta') irMundo(RUTA);
        else if (destino === 'retos') irRetos();
        else if (destino === 'lab') { mostrar('lab'); Laboratorio.abrir(); }
        else toast('🚧 Esta sección se está construyendo. ¡Muy pronto podrás usarla!');
      }
      const voz = e.target.closest('[data-hablar]');
      if (voz) hablar([...document.querySelectorAll(voz.dataset.hablar)].map(n => n.innerHTML).join('. '));
      if (e.target.closest('[data-cerrar]') || e.target.id === 'modal') cerrarModal();
    });

    $('#btn-salir').onclick = async () => {
      if (sinGuardar) await guardar();
      Progreso.salir();
      $('#in-codigo').value = '';
      mostrar('ingreso');
    };
    $('#btn-reiniciar').onclick = async () => {
      if (!confirm('¿Seguro? Se borrará todo tu avance y empezarás desde el primer nivel.')) return;
      Progreso.reiniciar();
      await guardar();
      irMenu();
    };

    $('#btn-salir-nivel').onclick = salirNivel;
    $('#btn-sim').onclick = alternarSim;
    $('#btn-pista').onclick = mostrarPistas;
    $('#btn-ficha').onclick = () => (nivel.explicacion ? mostrarExplicacion(nivel.explicacion) : mostrarFichas(nivel.ficha));
    $('#btn-codigo').onclick = () => {
      Codigo.mostrar($('#panel-codigo').hidden);
      Editor.margen(Codigo.ancho());
      Editor.ajustar();
    };
    $('#pc-cerrar').onclick = () => $('#btn-codigo').click();
    $('#h-girar').onclick = () => Editor.girar();
    $('#h-borrar').onclick = () => Editor.borrar();
    $('#h-reiniciar').onclick = () => {
      if (!confirm('¿Volver a armar el nivel desde el inicio?')) return;
      detenerPrograma();
      Editor.reiniciar();
      Editor.ajustar();
      botonSim(false);
      mensajeInicial();
      if (nivel.guia) { pasoGuia = -1; revisarGuia(); }
    };
    $('#h-mas').onclick = () => Editor.zoom(1.2);
    $('#h-menos').onclick = () => Editor.zoom(1 / 1.2);
    $('#h-ajustar').onclick = () => Editor.ajustar();
    $('#h-redes').onclick = () => {
      const activo = !$('#h-redes').classList.contains('activo');
      $('#h-redes').classList.toggle('activo', activo);
      $('#leyenda-redes').hidden = !activo;
      Editor.verRedes(activo);
    };
    $('#h-ayuda').onclick = () => abrirModal(`<div class="pista-caja"><h2>❓ Cómo se usa</h2><p class="ayuda-modal">${$('#nivel-ayuda').innerHTML}</p>
      <div class="modal-botones"><button class="btn" data-cerrar>Entendido</button></div></div>`);
    $('#h-estilo').onclick = mostrarEstilos;
    $('#h-sonido').onclick = () => {
      CONFIG.sonido = !CONFIG.sonido;
      $('#h-sonido').textContent = CONFIG.sonido ? '🔊' : '🔇';
      if (!CONFIG.sonido) Editor.callar();
    };
    Editor.COLORES.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'color' + (i === 0 ? ' activo' : '');
      b.style.background = c;
      b.onclick = () => {
        Editor.color(c);
        document.querySelectorAll('.color').forEach(x => x.classList.toggle('activo', x === b));
      };
      $('#h-colores').appendChild(b);
    });

    window.addEventListener('beforeunload', () => { if (sinGuardar && ses()) Progreso.guardarAlCerrar(resumen()); });

    if (Progreso.restaurar()) irMenu(); else mostrar('ingreso');
  }

  iniciar();
  return {irMenu, irMapa, verFicha: id => mostrarFichas([id])};
})();
