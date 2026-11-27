# Estado actual (actualizado: 2026-11-27)

## Jornada
Inicio de hoy: 2026-11-27 05:51 (hora Argentina). Briefing ya entregado: sí
Luis en Uruguay (HQ Vistazo) 19 y 20/11 presentando análisis de ventas; prepara con el asistente antes de empezar.

## Pendientes abiertos
Formato: `- [ ] tarea (añadido AAAA-MM-DD; vence AAAA-MM-DD opcional)`
- [ ] Definir con Luis las rutinas diarias y periódicas (añadido 2026-11-17)
- [ ] Registrar preferencias de trabajo de Luis (añadido 2026-11-17)
- [ ] Reunión de ventas (método en `archivo/analisis-ventas-2026.md`): faltan clientes activos/dormidos, precio por producto, página resumen. Pedir a Luis Excel actualizado y producto/canal del ajuste de nov (2.685 u.) (añadido 2026-11-18)
- [ ] Luis completa el Excel de clientes para precio especial (objetivo Bayer, prioridad, precio) y lo devuelve para ordenarlo (añadido 2026-11-19)
- [ ] Omnipaque 350: stock crítico (~3 semanas al 18/11) -> decidir pedido de importación (añadido 2026-11-18)
- [ ] Ver la lista de Bassani (añadido 2026-11-25)
- [ ] URGENTE: arreglar el envío de Ocasa a San Vicente (añadido 2026-11-25; vence 2026-11-26)
- [ ] Consulta IECS N° 1102 (iodixanol) (añadido 2026-11-27; vence 2026-12-06): ver sección abajo. DECISIÓN de Daniel Costa (27/11): pasar el tema a GE y que GE defina los pasos; Vistazo NO responde ni contacta al IECS hasta tener instrucciones. Falta: enviar mail formal en inglés a Othon y Tiago (GE), cc Mauricio Arambillet y Daniel Costa (borrador en Gmail solo con emails de Luis; NO enviar)

- [ ] Cadencia de recompra para vendedores (añadido 2026-11-21): ver sección abajo; falta que Luis confirme si llegó el mail de prueba y autorice el envío semanal (añadido 2026-11-21)

## Proyecto: cadencia de recompra (vendedores)
- Script: `asistente/herramientas/cadencia.py` (solo lectura Odoo; commit e94851e). Base: pedidos confirmados `sale.order` state sale/done (no hay facturas en Odoo). Cadencia = mediana de intervalos con >=3 compras, si no 30 días por defecto. Semáforo: verde <0,8, amarillo 0,8-1,3, rojo 1,3-2, en riesgo >2 (días sin comprar / cadencia).
- 21 clientes, 3 vendedores (Luis Lehmann, Leandro Ruano, Silvia Drittanti); los 3 tienen email en Odoo. Posible cliente duplicado: Imágenes Pilar S.A. / Diagnóstico por Imágenes Pilar SA (fusionar en Odoo).
- Prueba de envío por Odoo (2026-11-21): `mail.mail` id 261 a Luis, estado `sent`, sin error; Luis aún no lo recibió (revisar spam / dirección en su usuario Odoo). Si no llega: probar por Gmail.
- Odoo cobra por código dentro de Odoo (Studio), pero NO por API: el plan es script + tarea programada (cron) en la nube, sin código en Odoo.
- Pendiente de decidir: autorización explícita de Luis para envío semanal automático solo a vendedores (cada uno su cartera), día/hora (propuesto lunes 8:00 Córdoba), copia a Luis, umbral de baja de cantidad (ej. <70%). Hasta entonces NO enviar nada a vendedores.

## Consulta IECS 1102 iodixanol (2026-11-27)
- Informe v3 (fuentes primarias, URL/fecha/fragmento): `asistente/archivo/iecs-1102-investigacion.md` (commit 8b765c8). Leerlo solo si Luis lo pide.
- Formulario: https://ets.iecs.org.ar/formulario-consulta-publica/inicial/2473 (cierra 06/12). Solicitante, financiador, PICO y autores NO son públicos; origen sin determinar (ninguna hipótesis confirmada ni descartada; Bayer vía CAEME posible por mecanismo, sin evidencia).
- Evidencia: neutra vs iopromida (Reed RR 0,93); posible valor vs iohexol (Omnipaque) en intraarterial con insuf. renal (Heinrich, Reed). No citar metaanálisis 2022 (retractado 2023). Comparación de precio podría ser vs Omnipaque.
- Reglas: no atribuir intención a Bayer/CAEME en escritos; declarar COI de GE/Vistazo; no sobrevender Visipaque.
- No verificado: COI de Reed/Heinrich, KHA-CARI, cargo Glaser/Londero, estudios patrocinados por GE. Bloqueados: PubMed (anti-bot, no evadir), jacc.org, sciencedirect, bvsalud, valueinhealthjournal.
- Red: Default tiene ~34 hosts habilitados para esta investigación (editable en Settings).

## En espera de terceros
- Tanja (GE), folleto medio de contraste v.II: ella ya corrigió decimales (2026-11-18). Falta: Zane revisa redondeo (100,0); Lisandra evalúa aprobación para todo LATAM; al llegar el JB LATAM se quitan marcas DRAFT/JB y se genera versión imprimible/digital.

## Mail mensual Kairos (2026-11-25)
- Plantilla Odoo id 40 OK (prueba recibida por Luis). Tarea programada `trig_0124Lgq3GQJEXVSrh1PtSLtz` ACTIVA: día 1, 9:07 Córdoba, envía la plantilla por la API de Odoo (sin código en Odoo ni Gmail). Autorizado por Luis sin confirmación cada vez.
- Primer envío real: 2026-12-01. Verificar ese día que salió (sin probar antes para no mandar mail a Griselda); si falló, enviarlo con Luis. Seguimiento de la actividad Kairos: persistente en rutinas.md.

## Notas operativas (2026-11-25)
- Actividades Odoo de Luis: `mail.activity` (search_read por `date_deadline`, filtrar user_id Luis Lehmann = res.users id 2). Solo lectura salvo OK de Luis. Vencidas al 25/11: llamada Pablo Quintana (DM Diagnóstico Médico), hablar con Sturla (GENEA).
- Envíos desde Odoo: `mail.template/send_mail` (ids, res_id, force_send). Crear código en Odoo por API fue denegado y podría tener costo (Studio): no hacerlo.
