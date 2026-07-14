# Alien Long Weather v2.3 + Phase Navigator

Indicador Pine Script v6 para TradingView. Evolución de "Alien Long Weather v2.2":
mismo dibujo (caja, líneas, seno/coseno, rombos), más un **Phase Navigator** que
intenta responder la pregunta que v2.2 no podía responder:

> "Nunca sé cuál de los rombos verdes/amarillos es el último antes de que la
> tendencia gire hacia arriba."

## Por qué v2.2 no podía predecir el giro

1. **El seno y el coseno no son un modelo de ondas: son el precio re-dibujado.**
   `angle = positionInBox * 2π` convierte la posición del precio dentro de la
   caja (un estocástico) en un ángulo, y luego le aplica seno y coseno. Eso
   significa que la "ola" gira **en la misma barra** en que gira el precio,
   nunca antes. Es un indicador coincidente disfrazado de cíclico: describe,
   no anticipa.

2. **Repintado por `lookahead_on`.** v2.2 pedía el `close` actual del HTF con
   `lookahead=barmerge.lookahead_on`: las barras históricas veían el futuro del
   timeframe superior. Por eso el gráfico hacia atrás queda "muy lindo" pero en
   vivo las señales no aparecen igual. v2.3 usa solo closes HTF ya confirmados
   (`close[1]` / `close[2]` con lookahead), el patrón estándar anti-repintado.

## Qué hace el Phase Navigator

No predice el futuro (nada lo hace); mide **agotamiento del fondo**: seis
condiciones que estadísticamente suelen aparecer *antes* de que la línea
amarilla (coseno) arranque su subida desde abajo, sumadas en un score 0–100:

| Condición | Puntos | Idea |
|---|---|---|
| El piso de la caja lleva N barras sin hacer mínimo nuevo | 30 | Los vendedores se agotaron |
| Divergencia alcista precio/RSI (mínimo más bajo en precio, más alto en RSI) | 25 | La caída pierde fuerza |
| La posición dentro de la caja viene subiendo (EMA 5) | 15 | El precio empieza a trepar |
| La Recovery Line gira hacia arriba | 12 | Primer giro estructural |
| El HTF ya no cae | 10 | El marco mayor deja de empujar en contra |
| El rango de la caja se comprime | 8 | Volatilidad de venta apagándose |

## Cómo leerlo para planear

- **Fondo amarillo + etiqueta "ÚLTIMOS ROMBOS?"** — el score superó el umbral
  de aviso con el precio todavía en la mitad baja de la caja. Los rombos que
  aparezcan desde acá tienen alta probabilidad de ser los finales. Es zona de
  **acumulación escalonada** (entradas parciales), no de entrada completa.
- **Rombo naranja "FINAL?"** — un rebote (rombo) que ocurre con el aviso
  activo: candidato concreto a último rombo.
- **Etiqueta verde "GIRO ✓" + fondo verde** — la posición en la caja cruzó la
  mitad hacia arriba con score alto y precio sobre la Recovery Line. Es el
  momento en que la línea amarilla arranca "de bien abajo hacia arriba" — giro
  confirmado, se puede completar la posición.
- **`Bottom Score %` en la Data Window** — el score en vivo, para ver cómo se
  va armando el giro barra a barra.

Plan sugerido: nada de posición mientras el score está bajo → entradas
parciales en rombos "FINAL?" con aviso amarillo activo → completar en "GIRO ✓"
→ gestionar con las señales SALIR/STOP de siempre.

## Advertencias

- Es un score de probabilidad, no una certeza: habrá avisos amarillos que se
  cancelan porque el piso vuelve a romperse (el score cae solo cuando pasa).
- Los pivotes de divergencia se confirman `divRight` barras después del mínimo
  (default 3): es el costo de no repintar.
- Backtestear los umbrales (`Score de aviso`, `Score de confirmación`,
  `Barras con piso sin caer`) por activo y timeframe antes de operar en real.

## Archivos

- `alien-long-weather-v2.3-phase-navigator.pine` — el indicador completo
  (pegar en el editor Pine de TradingView).
