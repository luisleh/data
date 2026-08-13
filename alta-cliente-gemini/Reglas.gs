/**
 * Reglas de validación para el alta de clientes.
 * ------------------------------------------------
 * ESTE ES EL ARCHIVO QUE VAS A EDITAR MÁS SEGUIDO.
 * Acá se definen los requisitos que Gemini debe verificar en los PDFs.
 * Ajustalas a tu jurisdicción y a tu procedimiento interno real.
 */

var REGLAS_ALTA = [
  // --- Habilitación sanitaria ---
  'Debe existir una disposición o resolución de habilitación sanitaria del establecimiento, ' +
  'emitida por la autoridad competente (p. ej. ministerio de salud provincial o nacional, ANMAT si aplica).',

  'La habilitación debe estar VIGENTE: si tiene fecha de vencimiento, no puede estar vencida a la fecha de hoy. ' +
  'Si está vencida o vence en menos de 60 días, marcarlo como observación.',

  'La habilitación debe corresponder al mismo establecimiento y domicilio que figura en el resto de la documentación. ' +
  'Si hay discrepancia de razón social o domicilio entre documentos, marcarlo como observación grave.',

  'El rubro habilitado debe ser compatible con la recepción y uso de especialidades medicinales / ' +
  'productos médicos (p. ej. farmacia, droguería, establecimiento de salud, servicio de diagnóstico por imágenes).',

  // --- Dirección técnica ---
  'Debe constar un director técnico o responsable sanitario designado, con su matrícula profesional. ' +
  'Si el documento de designación no está o no se identifica la matrícula, listarlo como faltante u observación.',

  // --- Identificación fiscal y comercial ---
  'Debe constar el CUIT del cliente y la constancia de inscripción en AFIP/ARCA. ' +
  'La razón social del CUIT debe coincidir con la de la habilitación sanitaria.',

  // --- Legibilidad y autenticidad ---
  'Todos los documentos deben ser legibles. Si un PDF está ilegible, incompleto, cortado o parece ' +
  'una foto de mala calidad, marcarlo como INVALIDO y pedir que lo reenvíen.',

  'Si un documento presenta indicios de adulteración (tipografías inconsistentes, fechas superpuestas, ' +
  'sellos ilegibles donde debería haberlos), señalarlo como observación grave y NO aprobar.',

  // --- Criterio de decisión final ---
  'RESULTADO = APROBADO solo si están todos los documentos requeridos, vigentes y consistentes entre sí.',
  'RESULTADO = OBSERVADO si la documentación está mayormente completa pero hay vencimientos próximos, ' +
  'datos inconsistentes menores o documentos poco legibles que conviene pedir de nuevo.',
  'RESULTADO = RECHAZADO si falta la habilitación sanitaria, está vencida, el rubro no es compatible, ' +
  'o hay indicios de adulteración.'
];

/**
 * Lista de documentos que se esperan en toda alta. Gemini la usa para
 * detectar faltantes. Editá según tu procedimiento.
 */
var DOCUMENTOS_REQUERIDOS = [
  'Disposición / resolución de habilitación sanitaria del establecimiento',
  'Designación del director técnico o responsable sanitario (con matrícula)',
  'Constancia de inscripción en AFIP/ARCA (CUIT)',
  'Nota de solicitud de alta con datos del establecimiento (razón social, domicilio, contacto)'
];

/**
 * Construye el prompt completo que se envía a Gemini junto con los PDFs.
 * En general no hace falta tocar esta función: editá REGLAS_ALTA y
 * DOCUMENTOS_REQUERIDOS arriba.
 */
function construirPrompt(asunto, remitente, cuerpoEmail, nombresPdfs) {
  var hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');

  return (
    'Sos un asistente experto en asuntos regulatorios de una empresa que vende medios de contraste ' +
    'para diagnóstico por imágenes. Tu tarea es revisar la documentación que envía un cliente nuevo ' +
    'para darse de alta como establecimiento habilitado para recibir estos productos.\n\n' +

    'FECHA DE HOY: ' + hoy + '\n\n' +

    'CONTEXTO DEL CORREO RECIBIDO:\n' +
    '- Asunto: ' + asunto + '\n' +
    '- Remitente: ' + remitente + '\n' +
    '- PDFs adjuntos: ' + nombresPdfs.join(', ') + '\n' +
    '- Cuerpo del correo (puede tener datos útiles del cliente):\n"""\n' + cuerpoEmail + '\n"""\n\n' +

    'DOCUMENTOS REQUERIDOS PARA EL ALTA:\n' +
    DOCUMENTOS_REQUERIDOS.map(function (d, i) { return (i + 1) + '. ' + d; }).join('\n') + '\n\n' +

    'REGLAS DE VALIDACIÓN (aplicalas todas):\n' +
    REGLAS_ALTA.map(function (r, i) { return (i + 1) + '. ' + r; }).join('\n') + '\n\n' +

    'INSTRUCCIONES:\n' +
    '- Analizá TODOS los PDFs adjuntos (pueden venir varios documentos en un mismo PDF).\n' +
    '- Identificá qué documento es cada uno, extraé razón social, CUIT, domicilio, fechas de emisión ' +
    'y vencimiento, autoridad emisora y número de disposición cuando existan.\n' +
    '- Cruzá los datos entre documentos para detectar inconsistencias.\n' +
    '- Indicá con precisión qué falta y qué está observado, citando el documento y el dato concreto.\n' +
    '- Sé conservador: ante la duda, preferí OBSERVADO antes que APROBADO.\n' +
    '- Respondé únicamente con el JSON del esquema pedido, con todos los textos en español.'
  );
}
