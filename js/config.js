// Configuración general del juego.
const CONFIG = {
  // URL de la App web de Google Apps Script (ver docs/juego-robotica.md → "Pasos para activar el servidor").
  // Vacía = modo de prueba local: el progreso se guarda solo en el navegador de esta computadora.
  API_URL: 'https://script.google.com/macros/s/AKfycbzRkIkzgJtCJpwjhlQCw9bHZIUdtWC69de3f-rDvcPOb4GSWauB_o8bBiAu3Ci6SnIbiQ/exec',
  // Código que desbloquea todo en el modo local (con servidor, el código docente está en la hoja "Docente").
  codigoDocenteLocal: 'DOCENTE',
  // Código de prueba en modo local para ver la ruta guiada como la vería un estudiante con ruta activada.
  codigoRutaLocal: 'RUTA',
  // Intentos fallidos para desbloquear la pista 1, 2 y 3 (para ajustar la dificultad).
  // Los estudiantes con ruta guiada siempre las reciben antes: 1, 2 y 3.
  umbralesPista: [2, 4, 6],
  // Estilo del dibujo del Arduino y la protoboard: 'pixel' (8 bits), 'detallado' o 'simple' (el botón 🎨 los compara).
  estiloPlaca: 'pixel',
  // Estilo del LED y la resistencia: 'v2' (cuerpo grande, patas cortas), 'pixel' (8 bits) o 'v1' (primera versión).
  estiloComponentes: 'v2',
  // Sonido de los buzzers (también se puede silenciar con el botón 🔊 de la mesa).
  sonido: true,
  // Estilo del laboratorio 3D: 'cubos' (vóxeles) o 'real'.
  estiloLab: 'real',
};
