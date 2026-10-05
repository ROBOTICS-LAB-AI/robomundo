/**
 * RoboMundo: servidor de progreso (Google Apps Script vinculado a una hoja de cálculo).
 *
 * 1) Ejecuta configurar() UNA sola vez: crea una pestaña por paralelo con los códigos y la pestaña "Docente".
 * 2) Implementar > Nueva implementación > App web · Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario.
 * 3) Copia la URL de la App web en js/config.js (API_URL).
 *
 * En la hoja solo hay códigos y números de lista: ningún nombre de estudiante.
 * Columna "Ruta guiada": marca la casilla de los estudiantes que deben ver la ruta guiada (actividades adaptadas).
 * Para agregar un paralelo, súmalo a CURSOS y vuelve a ejecutar configurar() (no toca las pestañas existentes).
 * Menú "RoboMundo" de la hoja: agregar paralelos nuevos y crear el documento con las tarjetas de códigos para imprimir.
 */
const CURSOS = ['8A', '8B', '8C', '9A', '9B', '9C', '10A', '10B', '10C'];
const URL_JUEGO = 'https://robotics-lab-ai.github.io/robomundo/'; // dirección del juego publicado (se imprime en las tarjetas)
const ESTUDIANTES_POR_CURSO = 35; // ~30 por paralelo + 5 de respaldo
const ENCABEZADOS = ['N° lista', 'Código', 'Nivel actual', 'Niveles completados', 'Estrellas', 'Intentos fallidos', 'Pistas usadas', 'Última conexión', 'Datos (no editar)', 'Ruta guiada'];
const COL_RUTA = 10;
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I para evitar confusiones

function configurar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usados = new Set();
  CURSOS.forEach(c => {
    const h = ss.getSheetByName(c);
    if (h && h.getLastRow() > 1) h.getRange(2, 2, h.getLastRow() - 1, 1).getValues().forEach(f => usados.add(f[0]));
  });

  CURSOS.forEach(curso => {
    if (ss.getSheetByName(curso)) return; // nunca sobrescribe una pestaña existente
    const hoja = ss.insertSheet(curso);
    const filas = [];
    for (let i = 1; i <= ESTUDIANTES_POR_CURSO; i++) filas.push([i, nuevoCodigo_(curso, usados), '', 0, 0, 0, 0, '', '', false]);
    hoja.getRange(1, 1, 1, ENCABEZADOS.length).setValues([ENCABEZADOS])
      .setFontWeight('bold').setBackground('#00979D').setFontColor('#FFFFFF').setWrap(true);
    hoja.getRange(2, 1, filas.length, ENCABEZADOS.length).setValues(filas);
    hoja.getRange(2, 2, filas.length, 1).setFontFamily('Roboto Mono').setFontWeight('bold');
    hoja.getRange(2, 8, filas.length, 1).setNumberFormat('dd/mm/yyyy hh:mm');
    hoja.setFrozenRows(1);
    hoja.setColumnWidths(1, 8, 125);
    hoja.hideColumns(9);
    hoja.getRange(2, COL_RUTA, filas.length, 1).insertCheckboxes();
    hoja.getRange(1, COL_RUTA).setBackground('#0E7C7B');
    // Verde = más niveles completados; rojo = menos.
    hoja.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule()
        .setGradientMinpoint('#FDE2E2').setGradientMaxpoint('#B7F0C9')
        .setRanges([hoja.getRange(2, 4, filas.length, 1)]).build(),
    ]);
  });

  // Columna "Ruta guiada" (también en pestañas creadas con una versión anterior de este script)
  CURSOS.forEach(curso => {
    const hoja = ss.getSheetByName(curso);
    if (!hoja || hoja.getLastRow() < 2) return;
    const titulo = hoja.getRange(1, COL_RUTA);
    if (titulo.getValue() === 'Ruta guiada') return;
    titulo.setValue('Ruta guiada').setFontWeight('bold').setBackground('#0E7C7B').setFontColor('#FFFFFF');
    hoja.getRange(2, COL_RUTA, hoja.getLastRow() - 1, 1).insertCheckboxes();
  });

  if (!ss.getSheetByName('Docente')) {
    const hoja = ss.insertSheet('Docente');
    hoja.getRange('A1:B1').setValues([['Código docente (desbloquea todo y no guarda progreso)', nuevoCodigo_('PROFE', usados)]]).setFontWeight('bold');
    hoja.setColumnWidth(1, 380);
  }
  const inicial = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (inicial && inicial.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(inicial);
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('RoboMundo')
    .addItem('Agregar paralelos nuevos', 'configurar')
    .addItem('Crear documento con los códigos para imprimir', 'imprimirCodigos')
    .addToUi();
}

// Crea un documento de Google con una tarjeta por estudiante (paralelo, N° de lista y código), lista para recortar.
function imprimirCodigos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const doc = DocumentApp.create('RoboMundo · Códigos de los estudiantes');
  const cuerpo = doc.getBody().setMarginTop(36).setMarginBottom(36).setMarginLeft(36).setMarginRight(36);
  const COLUMNAS = 4, centro = DocumentApp.HorizontalAlignment.CENTER;
  let primero = true;
  CURSOS.forEach(curso => {
    const hoja = ss.getSheetByName(curso);
    if (!hoja || hoja.getLastRow() < 2) return;
    const filas = hoja.getRange(2, 1, hoja.getLastRow() - 1, 2).getValues().filter(f => f[1]);
    if (!primero) cuerpo.appendPageBreak();
    primero = false;
    cuerpo.appendParagraph('RoboMundo · ' + curso).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    cuerpo.appendParagraph('Recorta las tarjetas y entrega a cada estudiante la de su número de lista.'
      + (URL_JUEGO ? ' Dirección del juego: ' + URL_JUEGO : ''));
    const celdas = [];
    for (let i = 0; i < filas.length; i += COLUMNAS) {
      celdas.push([...Array(COLUMNAS)].map((_, k) => (filas[i + k] ? `RoboMundo · ${curso} · N° ${filas[i + k][0]}` : '')));
    }
    const tabla = cuerpo.appendTable(celdas);
    for (let r = 0; r < tabla.getNumRows(); r++) {
      for (let c = 0; c < COLUMNAS; c++) {
        const celda = tabla.getCell(r, c), dato = filas[r * COLUMNAS + c];
        celda.setPaddingTop(10).setPaddingBottom(10);
        celda.getChild(0).asParagraph().setAlignment(centro).editAsText().setFontSize(9).setForegroundColor('#6B7280');
        if (!dato) continue;
        celda.appendParagraph(String(dato[1])).setAlignment(centro).editAsText().setFontSize(18).setBold(true).setFontFamily('Roboto Mono').setForegroundColor('#111827');
        celda.appendParagraph('Tu código para entrar').setAlignment(centro).editAsText().setFontSize(8).setBold(false).setFontFamily('Arial').setForegroundColor('#6B7280');
      }
    }
  });
  const vacio = cuerpo.getChild(0);
  if (vacio.getType() === DocumentApp.ElementType.PARAGRAPH && !vacio.asParagraph().getText() && cuerpo.getNumChildren() > 1) vacio.removeFromParent();
  doc.saveAndClose();
  const html = HtmlService.createHtmlOutput(`<p style="font-family:Arial">Documento creado (está en tu Google Drive):</p><p style="font-family:Arial"><a href="${doc.getUrl()}" target="_blank">Abrir el documento con los códigos</a></p>`).setWidth(380).setHeight(130);
  SpreadsheetApp.getUi().showModalDialog(html, 'Códigos de RoboMundo');
}

function doPost(e) {
  try {
    const p = JSON.parse(e.postData.contents);
    const codigo = String(p.codigo || '').trim().toUpperCase();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const docente = ss.getSheetByName('Docente');
    if (docente && codigo && codigo === String(docente.getRange('B1').getValue()).toUpperCase()) {
      return json_({ok: true, rol: 'docente', curso: 'Docente', lista: '-', datos: null});
    }

    const reg = buscar_(ss, codigo);
    if (!reg) return json_({ok: false, error: 'Código no encontrado. Revísalo con tu profesor.'});

    if (p.accion === 'ingresar') {
      reg.hoja.getRange(reg.fila, 8).setValue(new Date());
      let datos = null;
      try { datos = reg.valores[8] ? JSON.parse(reg.valores[8]) : null; } catch (err) { datos = null; }
      return json_({ok: true, rol: 'estudiante', curso: reg.hoja.getName(), lista: reg.valores[0], nee: reg.valores[COL_RUTA - 1] === true, datos});
    }
    if (p.accion === 'guardar') {
      const r = p.resumen || {};
      reg.hoja.getRange(reg.fila, 3, 1, 7).setValues([[
        r.nivelActual || '', r.completados || 0, r.estrellas || 0, r.fallos || 0, r.pistas || 0, new Date(), JSON.stringify(p.datos || {}),
      ]]);
      return json_({ok: true});
    }
    return json_({ok: false, error: 'Acción desconocida.'});
  } catch (err) {
    return json_({ok: false, error: 'Error del servidor: ' + err});
  }
}

function doGet() {
  return json_({ok: true, mensaje: 'Servidor de RoboMundo activo.'});
}

function buscar_(ss, codigo) {
  if (!codigo) return null;
  for (const curso of CURSOS) {
    const hoja = ss.getSheetByName(curso);
    if (!hoja || hoja.getLastRow() < 2) continue;
    const valores = hoja.getRange(2, 1, hoja.getLastRow() - 1, ENCABEZADOS.length).getValues();
    const i = valores.findIndex(f => String(f[1]).toUpperCase() === codigo);
    if (i >= 0) return {hoja, fila: i + 2, valores: valores[i]};
  }
  return null;
}

function nuevoCodigo_(prefijo, usados) {
  let codigo;
  do {
    codigo = prefijo + '-' + Array.from({length: 4}, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('');
  } while (usados.has(codigo));
  usados.add(codigo);
  return codigo;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
