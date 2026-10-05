// Ingreso con código y guardado del progreso.
// Con CONFIG.API_URL: Google Sheets vía Apps Script (servidor/Codigo.gs).
// Sin CONFIG.API_URL: modo de prueba local (localStorage de esta computadora).
// La sesión vive en sessionStorage: al cerrar la pestaña o con "Salir", el siguiente estudiante
// no hereda el avance del anterior.
const Progreso = (() => {
  const CLAVE_SESION = 'robomundo-sesion';
  let sesion = null;

  const esLocal = () => !CONFIG.API_URL;
  const vacio = () => ({niveles: {}, fichas: []});
  const normalizar = d => Object.assign(vacio(), d || {});
  const recordar = () => sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));

  // Sin encabezado Content-Type el navegador envía text/plain: Apps Script lo acepta sin preflight CORS.
  // Apps Script a veces tarda en "despertar" o falla si muchos se conectan a la vez: se reintenta 2 veces.
  async function api(cuerpo, intentos = 3) {
    for (let i = 1; ; i++) {
      try {
        const r = await fetch(CONFIG.API_URL, {method: 'POST', body: JSON.stringify(cuerpo)});
        return await r.json();
      } catch (e) {
        if (i >= intentos) throw e;
        await new Promise(listo => setTimeout(listo, 1500 * i));
      }
    }
  }

  async function ingresar(codigo) {
    codigo = String(codigo || '').toUpperCase().replace(/\s+/g, '');
    if (!codigo) return {ok: false, error: 'Escribe tu código.'};
    if (esLocal()) {
      if (codigo === CONFIG.codigoDocenteLocal) {
        sesion = {codigo, rol: 'docente', curso: 'Docente', lista: '-', datos: vacio()};
      } else if (codigo === CONFIG.codigoRutaLocal || /^\d{1,2}[A-Z]-[A-Z0-9]{4}$/.test(codigo)) {
        let guardado = null;
        try { guardado = JSON.parse(localStorage.getItem('robomundo-' + codigo)); } catch (e) { /* sin datos */ }
        const ruta = codigo === CONFIG.codigoRutaLocal;
        sesion = {codigo, rol: 'estudiante', nee: ruta, curso: ruta ? 'Prueba' : codigo.split('-')[0], lista: '?', datos: normalizar(guardado)};
      } else {
        return {ok: false, error: 'El código debe tener la forma 8A-K7M2.'};
      }
    } else {
      const r = await api({accion: 'ingresar', codigo});
      if (!r.ok) return {ok: false, error: r.error || 'Código no encontrado. Revísalo con tu profesor.'};
      sesion = {codigo, rol: r.rol, nee: !!r.nee, curso: r.curso, lista: r.lista, datos: normalizar(r.datos)};
    }
    recordar();
    return {ok: true};
  }

  async function guardar(resumen) {
    if (!sesion) return false;
    recordar();
    if (sesion.rol === 'docente') return true;
    if (esLocal()) {
      try { localStorage.setItem('robomundo-' + sesion.codigo, JSON.stringify(sesion.datos)); return true; } catch (e) { return false; }
    }
    try {
      const r = await api({accion: 'guardar', codigo: sesion.codigo, datos: sesion.datos, resumen});
      return !!r.ok;
    } catch (e) {
      return false;
    }
  }

  // Al cerrar la pestaña no se puede esperar una respuesta: sendBeacon envía y listo.
  function guardarAlCerrar(resumen) {
    if (!sesion || sesion.rol === 'docente') return;
    if (esLocal()) { guardar(resumen); return; }
    const cuerpo = JSON.stringify({accion: 'guardar', codigo: sesion.codigo, datos: sesion.datos, resumen});
    navigator.sendBeacon(CONFIG.API_URL, new Blob([cuerpo], {type: 'text/plain'}));
  }

  function restaurar() {
    try { sesion = JSON.parse(sessionStorage.getItem(CLAVE_SESION)); } catch (e) { sesion = null; }
    return !!sesion;
  }
  function salir() { sessionStorage.removeItem(CLAVE_SESION); sesion = null; }
  function reiniciar() { if (sesion) sesion.datos = vacio(); }

  return {ingresar, guardar, guardarAlCerrar, restaurar, salir, reiniciar, esLocal, sesion: () => sesion};
})();
