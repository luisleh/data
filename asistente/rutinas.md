# Rutinas

## Diarias (cada inicio de jornada)
- [ ] (pendiente de definir con Luis)

## Recordatorios persistentes (insistir 1 vez por día hasta que Luis confirme)
Regla: desde el día de inicio, en cada primer saludo del día preguntar si ya se hizo. Dejar de preguntar solo cuando Luis diga que ya lo hizo; entonces marcar `hecho` y programar el próximo ciclo.

| Actividad | Inicia | Ciclo actual | Estado |
|---|---|---|---|
| Enviar a GE: stock de inicio de mes + ventas del mes anterior | día 1 de cada mes | 2026-11 | HECHO (confirmado por Luis 2026-11-17) |
| Enviar mailing mensual desde Odoo (precios y novedades) | primeros días de cada mes (desde día 1) | 2026-12 | PENDIENTE (se activa 2026-12-01) |
| Actualizar precios de contrastes en Kairos (ventana días 1 a 5) | día 1 de cada mes (mail automático a Griselda Groppa y Luis Lehmann, ambos @vistazogroup.com) | 2026-12 | PENDIENTE (se activa 2026-12-01; mail automático por tarea programada (ver estado.md); verificar el 1/12 que salió; seguimiento: preguntar cada día hasta confirmar; si el día 5 sigue sin hacerse, avisar como vencido) |

Próximo ciclo: 2026-12-01 (se activa automáticamente; si el 1 es fin de semana, igual recordar).

## Periódicas
Formato: | Actividad | Cada | Última | Próxima |
Ejemplo: | Revisión de inventario | 15 días | 2026-11-10 | 2026-11-25 |

| Actividad | Cada | Última | Próxima |
|---|---|---|---|
| (pendiente de definir) | | | |
