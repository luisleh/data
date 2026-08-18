# ALTA CLIENTE — Análisis automático de documentación con Gemini

Automatización en **Google Apps Script** que corre dentro de tu propia cuenta de Google
(sin servidores ni hosting):

1. Cada 10 minutos revisa tu Gmail buscando correos con asunto **"ALTA CLIENTE"** que
   tengan PDFs adjuntos (documentación de habilitación que envía el cliente).
2. Envía los PDFs a la **API de Gemini** junto con las reglas de validación definidas
   en `Reglas.gs` (habilitación sanitaria vigente, director técnico, CUIT, etc.).
   Gemini lee los PDFs directamente, incluso escaneados (hace OCR).
3. Manda un **email de feedback** a la dirección que configures, con el veredicto
   (`APROBADO` / `OBSERVADO` / `RECHAZADO`), tabla de documentos encontrados,
   faltantes y observaciones.
4. Etiqueta el hilo como `alta-cliente/procesado` para no procesarlo dos veces
   (o `alta-cliente/error` si algo falló, avisando también por email).

Los errores transitorios de la API (saturación 503, cuota 429, error interno 500)
no marcan el correo como error: el script lo deja pendiente y lo reintenta solo
en las próximas corridas del trigger. Recién si sigue fallando después de
~1 hora de reintentos lo etiqueta como error y avisa por email.

## Archivos

| Archivo | Qué es |
|---|---|
| `Code.gs` | Lógica principal: búsqueda en Gmail, llamada a Gemini, envío de feedback |
| `Reglas.gs` | **Las reglas de validación y documentos requeridos — es lo que vas a editar** |
| `appsscript.json` | Manifiesto del proyecto (permisos y zona horaria) |

## Instalación (una sola vez, ~10 minutos)

### 1. Conseguir la clave de API de Gemini

1. Entrá a <https://aistudio.google.com/apikey> con tu cuenta de Google.
2. Creá una API key y copiala. El nivel gratuito alcanza de sobra para este volumen
   de uso; con facturación activada, `gemini-2.5-flash` cuesta centavos por alta.

### 2. Crear el proyecto de Apps Script

1. Entrá a <https://script.google.com> **con la cuenta de Gmail que recibe las altas**
   y creá un proyecto nuevo (botón "Nuevo proyecto"). Ponele un nombre, p. ej.
   `Alta Cliente Gemini`.
2. Borrá el contenido del archivo `Código.gs` que viene por defecto y pegá el
   contenido de `Code.gs`.
3. Con el botón **+** junto a "Archivos" agregá una secuencia de comandos llamada
   `Reglas` y pegá el contenido de `Reglas.gs`.
4. En ⚙️ **Configuración del proyecto** activá "Mostrar el archivo de manifiesto
   appsscript.json", volvé al editor y reemplazá su contenido por el
   `appsscript.json` de esta carpeta.

### 3. Configurar las propiedades

En ⚙️ **Configuración del proyecto → Propiedades de la secuencia de comandos**,
agregá dos propiedades:

| Propiedad | Valor |
|---|---|
| `GEMINI_API_KEY` | la clave del paso 1 |
| `EMAIL_FEEDBACK` | el email que recibirá los análisis (puede ser el tuyo u otro) |

> La API key queda guardada en las propiedades del script, nunca en el código.

### 4. Activar

1. En el editor, elegí la función `configurarInicial` en el desplegable y dale **Ejecutar**.
2. Google te va a pedir autorización (acceso a tu Gmail y a servicios externos):
   aceptá con tu cuenta. Si aparece "Google no verificó esta app", usá
   *Configuración avanzada → Ir a … (no seguro)* — es normal para scripts propios.
3. Listo: se crean las etiquetas y el disparador que corre cada 10 minutos.

### 5. Probar

Mandate (o pedile a alguien que te mande) un correo con asunto que contenga
**ALTA CLIENTE** y uno o más PDFs adjuntos. Dentro de los próximos 10 minutos
deberías recibir el email de feedback. Para no esperar, ejecutá `probarAhora`
desde el editor.

Si un correo quedó etiquetado como `alta-cliente/error` (p. ej. por un problema
de configuración ya corregido), ejecutá `reprocesarErrores` desde el editor:
quita la etiqueta de error y vuelve a analizarlo en el momento.

## Personalización

- **Las reglas**: editá `REGLAS_ALTA` y `DOCUMENTOS_REQUERIDOS` en `Reglas.gs`.
  Están en lenguaje natural — agregá, quitá o ajustá requisitos según tu
  jurisdicción y procedimiento.
- **El asunto que dispara el análisis**: `CONFIG.GMAIL_QUERY` en `Code.gs`.
- **El modelo**: `CONFIG.GEMINI_MODELS` es una lista en orden de preferencia
  (`gemini-3.6-flash` por defecto). Si Google retira un modelo (devuelve 404),
  el script prueba automáticamente el siguiente de la lista y lo deja anotado
  en el log. Si querés más precisión en documentos complejos, poné primero un
  modelo Pro vigente.
- **La frecuencia**: `CONFIG.TRIGGER_MINUTOS` (volvé a ejecutar `configurarInicial`
  después de cambiarla).

## Límites y consideraciones

- **PDFs de hasta 15 MB** por archivo (límite configurable; la API acepta ~20 MB
  por solicitud). Archivos más grandes se omiten y quedan registrados en el log.
- Apps Script limita cada ejecución a ~6 minutos; el script procesa hasta 10 hilos
  por corrida, lo que sobra para un flujo normal de altas.
- **El análisis es una ayuda, no reemplaza el control humano**: el pie del email
  lo recuerda. La decisión final de habilitar a un cliente para recibir medios de
  contraste debe validarla una persona, sobre todo por el carácter regulatorio.
- Los PDFs se envían a la API de Gemini para su análisis. Si la documentación es
  sensible, revisá los términos de uso de la API (los datos enviados por la API
  paga no se usan para entrenar modelos, a diferencia del nivel gratuito de
  AI Studio — verificá la política vigente).
