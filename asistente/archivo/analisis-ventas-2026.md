# Análisis de ventas 2026 (reunión de ventas Uruguay, 19-20/11/2026)
Solo metodología y punteros: sin cifras de ventas ni datos de clientes en el repo. Gráficos y Excel se generaron en un scratchpad efímero: se rehacen con estas reglas.

## Fuentes
- Planilla "Detalle de Facturación LAN" (xlsx que sube Luis). Hojas: Facturación (datos desde fila 6), Datos Cliente (provincia por CUIT), Ctde.yVentas (stock por lote), Resumen Deudores.
- Odoo (ver `preferencias.md`): API JSON-2, modelos crm.lead, sale.order, res.partner; clave en el entorno.

## Reglas de cálculo (hoja Facturación; índices de columna base 0)
- Solo productos: código que empieza con `PT` (excluye flete/ajustes `ADM*`). Período=0, vendedor=2, condición=3, canal=4, CUIT=5, cliente=6, código=9, cantidad=11, subtotal=20, total=22, fecha factura=14, vencimiento=23, depósito=25, saldo=31.
- Notas de crédito de producto (subtotal < 0) restan unidades. Unir clientes por CUIT.
- Vendedor: "Corporativo" = Lehmann, Luis + "Cuenta Corp."; Caló, Franco; Drittanti, Silvia. Leandro Ruano no figura en la planilla (sus clientes aparecen como Caló).
- Productos: Omnipaque 300 (PT1201235), Omnipaque 350 (PT1201237), Visipaque 320 (PT1201241).
- Noviembre en la planilla estaba sin actualizar; Luis indicó 2.685 u. en total para el mes.
- Cobranza: días = fecha depósito - fecha factura; solo facturas > AR$100 mil, sin NC/ND. Capital inmovilizado = monto x días / 365.
- Stock y cobertura: hoja Ctde.yVentas (saldo final); ritmo = unidades/mes en meses completos.
- Odoo CRM: oportunidades = crm.lead type=opportunity (incluye archivadas); los "leads" (type=lead) son prospectos sin trabajar, no se cuentan.

## Análisis hechos
Unidades por mes y trimestre, mix de producto, concentración de clientes, canal, geografía, ticket y frecuencia, cobranza, condiciones de venta, cobertura de stock, cartera de oportunidades de Leandro, pedidos confirmados oct-nov por vendedor (Odoo), distribución de clientes oct-nov (planilla), Omnipaque 350 por cliente y mes.

## Entregables
- Diapositiva "Valor vs. precio" (artifact): https://claude.ai/artifact/SAw6ztiwrP4hmErmFVg5WR
- Excel de clientes para precio especial (bloques: compran mucho / objetivo Bayer / resto / oportunidades Odoo): Luis lo completa y lo devuelve.
