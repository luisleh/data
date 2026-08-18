/**
 * ALTA CLIENTE — Análisis automático de documentación con Gemini
 * ----------------------------------------------------------------
 * Flujo:
 *   1. Un disparador (trigger) ejecuta procesarAltasClientes() cada N minutos.
 *   2. Busca en Gmail correos con asunto "ALTA CLIENTE" que tengan PDFs adjuntos
 *      y que todavía no estén etiquetados como procesados.
 *   3. Envía los PDFs a la API de Gemini junto con las reglas de habilitación
 *      (ver Reglas.gs) y pide un veredicto estructurado en JSON.
 *   4. Manda un email de feedback a EMAIL_FEEDBACK con el resultado
 *      (APROBADO / OBSERVADO / RECHAZADO), documentos encontrados, faltantes
 *      y observaciones.
 *   5. Etiqueta el hilo como "alta-cliente/procesado" (o ".../error" si falló).
 *
 * Configuración necesaria (Script Properties — Configuración del proyecto):
 *   GEMINI_API_KEY  → clave de API de Google AI Studio (https://aistudio.google.com/apikey)
 *   EMAIL_FEEDBACK  → dirección a la que se envía el feedback
 *
 * Primera vez: ejecutar configurarInicial() una sola vez desde el editor.
 */

var CONFIG = {
  // Búsqueda en Gmail. Ajustá el asunto si tus correos usan otra frase.
  GMAIL_QUERY: 'subject:"ALTA CLIENTE" has:attachment filename:pdf newer_than:14d',

  // Etiquetas de control (se crean solas en configurarInicial)
  LABEL_PROCESADO: 'alta-cliente/procesado',
  LABEL_ERROR: 'alta-cliente/error',

  // Modelos de Gemini, en orden de preferencia. Si la API devuelve 404
  // (modelo retirado, como pasó con gemini-2.5-flash), se prueba el siguiente
  // de la lista automáticamente y se avisa en el log.
  GEMINI_MODELS: ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'],

  // Límite de tamaño por PDF (la API acepta hasta ~20 MB por request inline)
  MAX_PDF_MB: 15,

  // Cada cuántos minutos corre el trigger que crea configurarInicial()
  TRIGGER_MINUTOS: 10,

  // Ante errores transitorios de la API (503 saturación, 429 cuota, 500),
  // el hilo se deja sin etiquetar para que el próximo trigger lo reintente.
  // Tras este número de corridas fallidas se marca como error y se avisa.
  MAX_REINTENTOS_TRANSITORIOS: 6
};

/**
 * Ejecutar UNA sola vez desde el editor para dejar todo listo:
 * crea las etiquetas y el disparador periódico.
 */
function configurarInicial() {
  obtenerOCrearEtiqueta(CONFIG.LABEL_PROCESADO);
  obtenerOCrearEtiqueta(CONFIG.LABEL_ERROR);

  // Evitar triggers duplicados si se ejecuta más de una vez
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'procesarAltasClientes') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('procesarAltasClientes')
    .timeBased()
    .everyMinutes(CONFIG.TRIGGER_MINUTOS)
    .create();

  var props = PropertiesService.getScriptProperties();
  var faltan = [];
  if (!props.getProperty('GEMINI_API_KEY')) faltan.push('GEMINI_API_KEY');
  if (!props.getProperty('EMAIL_FEEDBACK')) faltan.push('EMAIL_FEEDBACK');
  if (faltan.length) {
    Logger.log('ATENCIÓN: falta definir en Script Properties: ' + faltan.join(', '));
  } else {
    Logger.log('Configuración completa. El script correrá cada ' + CONFIG.TRIGGER_MINUTOS + ' minutos.');
  }
}

/**
 * Función principal (la ejecuta el trigger).
 */
function procesarAltasClientes() {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('GEMINI_API_KEY');
  var emailFeedback = props.getProperty('EMAIL_FEEDBACK');
  if (!apiKey || !emailFeedback) {
    Logger.log('Falta GEMINI_API_KEY o EMAIL_FEEDBACK en Script Properties. Abortando.');
    return;
  }

  var labelProcesado = obtenerOCrearEtiqueta(CONFIG.LABEL_PROCESADO);
  var labelError = obtenerOCrearEtiqueta(CONFIG.LABEL_ERROR);

  var query = CONFIG.GMAIL_QUERY +
    ' -label:' + CONFIG.LABEL_PROCESADO.replace(/\//g, '-') +
    ' -label:' + CONFIG.LABEL_ERROR.replace(/\//g, '-');
  var hilos = GmailApp.search(query, 0, 10);
  if (!hilos.length) return;

  hilos.forEach(function (hilo) {
    var claveReintentos = 'reintentos_' + hilo.getId();
    try {
      procesarHilo(hilo, apiKey, emailFeedback);
      hilo.addLabel(labelProcesado);
      props.deleteProperty(claveReintentos);
    } catch (e) {
      Logger.log('Error procesando "' + hilo.getFirstMessageSubject() + '": ' + e);

      // Errores transitorios (API saturada, cuota): no etiquetar el hilo,
      // así el próximo trigger lo vuelve a intentar solo. Recién después de
      // MAX_REINTENTOS_TRANSITORIOS corridas fallidas se marca como error.
      if (e && e.esTransitorio) {
        var intentos = Number(props.getProperty(claveReintentos) || 0) + 1;
        if (intentos < CONFIG.MAX_REINTENTOS_TRANSITORIOS) {
          props.setProperty(claveReintentos, String(intentos));
          Logger.log('Error transitorio (intento ' + intentos + '/' +
            CONFIG.MAX_REINTENTOS_TRANSITORIOS + '). Se reintentará en la próxima corrida.');
          return;
        }
        props.deleteProperty(claveReintentos);
      }

      hilo.addLabel(labelError);
      GmailApp.sendEmail(
        emailFeedback,
        '[ALTA CLIENTE] ERROR de procesamiento: ' + hilo.getFirstMessageSubject(),
        'No se pudo analizar automáticamente este correo.\n\n' +
        'Motivo: ' + e + '\n\n' +
        ((e && e.esTransitorio)
          ? 'Se reintentó ' + CONFIG.MAX_REINTENTOS_TRANSITORIOS + ' veces a lo largo de ~' +
            (CONFIG.MAX_REINTENTOS_TRANSITORIOS * CONFIG.TRIGGER_MINUTOS) + ' minutos sin éxito. ' +
            'Cuando el servicio se normalice, ejecutá reprocesarErrores desde el editor.\n\n'
          : '') +
        'Revisalo manualmente. El hilo quedó etiquetado como ' + CONFIG.LABEL_ERROR + '.'
      );
    }
  });
}

/**
 * Procesa un hilo: junta los PDFs, consulta a Gemini y envía el feedback.
 */
function procesarHilo(hilo, apiKey, emailFeedback) {
  var mensajes = hilo.getMessages();
  var ultimo = mensajes[mensajes.length - 1];
  var asunto = hilo.getFirstMessageSubject();
  var remitente = mensajes[0].getFrom();

  // Juntar todos los PDFs adjuntos del hilo
  var pdfs = [];
  mensajes.forEach(function (msg) {
    msg.getAttachments({ includeInlineImages: false, includeAttachments: true })
      .forEach(function (adj) {
        var esPdf = adj.getContentType() === 'application/pdf' ||
          /\.pdf$/i.test(adj.getName());
        if (!esPdf) return;
        var mb = adj.getSize() / (1024 * 1024);
        if (mb > CONFIG.MAX_PDF_MB) {
          Logger.log('PDF omitido por tamaño (' + mb.toFixed(1) + ' MB): ' + adj.getName());
          return;
        }
        pdfs.push(adj);
      });
  });

  if (!pdfs.length) {
    throw new Error('El correo tiene asunto ALTA CLIENTE pero ningún PDF adjunto válido.');
  }

  var cuerpoEmail = ultimo.getPlainBody().substring(0, 3000);
  var analisis = analizarConGemini(apiKey, pdfs, asunto, remitente, cuerpoEmail);
  enviarFeedback(emailFeedback, asunto, remitente, pdfs, analisis);
}

/**
 * Llama a la API de Gemini con los PDFs como datos inline y las reglas
 * definidas en Reglas.gs. Pide respuesta en JSON estructurado.
 */
function analizarConGemini(apiKey, pdfs, asunto, remitente, cuerpoEmail) {
  var partes = [{
    text: construirPrompt(asunto, remitente, cuerpoEmail, pdfs.map(function (p) { return p.getName(); }))
  }];

  pdfs.forEach(function (pdf) {
    partes.push({
      inline_data: {
        mime_type: 'application/pdf',
        data: Utilities.base64Encode(pdf.getBytes())
      }
    });
  });

  var payload = {
    contents: [{ role: 'user', parts: partes }],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: 'application/json',
      response_schema: {
        type: 'OBJECT',
        properties: {
          resultado: { type: 'STRING', enum: ['APROBADO', 'OBSERVADO', 'RECHAZADO'] },
          nombre_cliente: { type: 'STRING' },
          resumen: { type: 'STRING' },
          documentos_encontrados: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                documento: { type: 'STRING' },
                estado: { type: 'STRING', enum: ['OK', 'OBSERVADO', 'INVALIDO'] },
                detalle: { type: 'STRING' }
              },
              required: ['documento', 'estado', 'detalle']
            }
          },
          documentos_faltantes: { type: 'ARRAY', items: { type: 'STRING' } },
          observaciones: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        required: ['resultado', 'resumen', 'documentos_encontrados', 'documentos_faltantes', 'observaciones']
      }
    }
  };

  // Probar los modelos en orden:
  //   404 (modelo retirado)            → pasar al siguiente de la lista.
  //   503/500/429 (saturación o cuota) → reintentar una vez tras una pausa y,
  //                                      si persiste, probar el siguiente modelo.
  //   Otros (p. ej. 400/401/403)       → error de configuración: cortar ya.
  var respuesta = null;
  var modeloUsado = null;
  var ultimoError = null;
  var huboTransitorio = false;

  for (var i = 0; i < CONFIG.GEMINI_MODELS.length && !respuesta; i++) {
    var modelo = CONFIG.GEMINI_MODELS[i];
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
      modelo + ':generateContent';

    for (var intento = 0; intento < 2; intento++) {
      var r = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-goog-api-key': apiKey },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      var codigo = r.getResponseCode();

      if (codigo === 200) {
        respuesta = r;
        modeloUsado = modelo;
        if (i > 0) {
          Logger.log('AVISO: el modelo preferido no está disponible; se usó ' + modelo +
            '. Conviene actualizar CONFIG.GEMINI_MODELS.');
        }
        break;
      }

      ultimoError = 'HTTP ' + codigo + ' con ' + modelo + ': ' +
        r.getContentText().substring(0, 400);

      var esTransitorio = (codigo === 503 || codigo === 500 || codigo === 429);
      if (esTransitorio) {
        huboTransitorio = true;
        if (intento === 0) {
          Logger.log('API saturada (' + codigo + ' con ' + modelo + '), reintentando en 20 s…');
          Utilities.sleep(20000);
          continue; // segundo intento con el mismo modelo
        }
        Logger.log('Sigue saturada, probando el siguiente modelo…');
        break; // pasar al siguiente modelo
      }

      if (codigo === 404) {
        Logger.log('Modelo no disponible (' + modelo + '), probando el siguiente…');
        break; // pasar al siguiente modelo
      }

      // Error de configuración (clave inválida, request mal formado, etc.)
      throw new Error('La API de Gemini devolvió un error no recuperable. ' + ultimoError);
    }
  }

  if (!respuesta) {
    var error = new Error('La API de Gemini falló con todos los modelos configurados. Último error: ' + ultimoError);
    error.esTransitorio = huboTransitorio;
    throw error;
  }

  var datos = JSON.parse(respuesta.getContentText());
  var candidato = datos.candidates && datos.candidates[0];
  if (!candidato || !candidato.content || !candidato.content.parts || !candidato.content.parts[0].text) {
    throw new Error('Respuesta de Gemini sin contenido: ' +
      JSON.stringify(datos).substring(0, 500));
  }

  var analisis = JSON.parse(candidato.content.parts[0].text);
  analisis._modelo_usado = modeloUsado;
  return analisis;
}

/**
 * Arma y envía el email de feedback en HTML.
 */
function enviarFeedback(destino, asunto, remitente, pdfs, a) {
  var colores = { APROBADO: '#1e7e34', OBSERVADO: '#c77700', RECHAZADO: '#c0392b' };
  var color = colores[a.resultado] || '#555';

  var filas = (a.documentos_encontrados || []).map(function (d) {
    return '<tr>' +
      '<td style="padding:6px 10px;border:1px solid #ddd;">' + escaparHtml(d.documento) + '</td>' +
      '<td style="padding:6px 10px;border:1px solid #ddd;">' + escaparHtml(d.estado) + '</td>' +
      '<td style="padding:6px 10px;border:1px solid #ddd;">' + escaparHtml(d.detalle) + '</td>' +
      '</tr>';
  }).join('');

  var listaFaltantes = (a.documentos_faltantes || []).map(function (x) {
    return '<li>' + escaparHtml(x) + '</li>';
  }).join('');

  var listaObs = (a.observaciones || []).map(function (x) {
    return '<li>' + escaparHtml(x) + '</li>';
  }).join('');

  var html =
    '<div style="font-family:Arial,sans-serif;max-width:680px;">' +
    '<h2 style="margin-bottom:4px;">Análisis de alta de cliente</h2>' +
    '<p style="margin:2px 0;"><b>Cliente:</b> ' + escaparHtml(a.nombre_cliente || '(no identificado)') + '</p>' +
    '<p style="margin:2px 0;"><b>Correo original:</b> ' + escaparHtml(asunto) + ' &mdash; de ' + escaparHtml(remitente) + '</p>' +
    '<p style="margin:2px 0;"><b>PDFs analizados:</b> ' +
    escaparHtml(pdfs.map(function (p) { return p.getName(); }).join(', ')) + '</p>' +
    '<p style="font-size:18px;"><b>Resultado: ' +
    '<span style="color:' + color + ';">' + escaparHtml(a.resultado) + '</span></b></p>' +
    '<p>' + escaparHtml(a.resumen) + '</p>' +
    (filas
      ? '<h3>Documentos encontrados</h3>' +
        '<table style="border-collapse:collapse;font-size:13px;">' +
        '<tr style="background:#f2f2f2;">' +
        '<th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Documento</th>' +
        '<th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Estado</th>' +
        '<th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Detalle</th>' +
        '</tr>' + filas + '</table>'
      : '') +
    (listaFaltantes ? '<h3>Documentación faltante</h3><ul>' + listaFaltantes + '</ul>' : '') +
    (listaObs ? '<h3>Observaciones</h3><ul>' + listaObs + '</ul>' : '') +
    '<hr style="border:none;border-top:1px solid #ddd;margin-top:20px;">' +
    '<p style="color:#888;font-size:12px;">Análisis automático generado con Gemini (' +
    escaparHtml(a._modelo_usado || CONFIG.GEMINI_MODELS[0]) +
    '). Verificar antes de habilitar el envío de medios de contraste.</p>' +
    '</div>';

  GmailApp.sendEmail(destino, '[ALTA CLIENTE] ' + a.resultado + ' — ' +
    (a.nombre_cliente || asunto), 'Ver versión HTML del correo.', { htmlBody: html });
}

// ---------------------------------------------------------------- utilidades

function obtenerOCrearEtiqueta(nombre) {
  return GmailApp.getUserLabelByName(nombre) || GmailApp.createLabel(nombre);
}

function escaparHtml(texto) {
  return String(texto == null ? '' : texto)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Para probar manualmente sin esperar al trigger:
 * ejecutar esta función desde el editor con un correo de prueba ya enviado.
 */
function probarAhora() {
  procesarAltasClientes();
}

/**
 * Reintenta los correos que quedaron etiquetados como alta-cliente/error
 * (p. ej. tras corregir la configuración o actualizar el modelo):
 * les quita la etiqueta de error y los procesa de nuevo en el momento.
 */
function reprocesarErrores() {
  var labelError = obtenerOCrearEtiqueta(CONFIG.LABEL_ERROR);
  var hilos = labelError.getThreads(0, 20);
  hilos.forEach(function (hilo) { hilo.removeLabel(labelError); });
  Logger.log('Se quitó la etiqueta de error a ' + hilos.length + ' hilo(s). Reprocesando…');
  procesarAltasClientes();
}
