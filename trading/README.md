# Alien Wave Composer v3.0 — Descomposición Fourier real

**Archivo: `alien-wave-composer-v3.pine`** (el indicador nuevo, reconstruido desde cero)

## La teoría que pedías, aplicada de verdad

La intuición "toda onda se compone de más ondas, describibles con senos y
cosenos" es exactamente la **Transformada Discreta de Fourier (DFT)**: cualquier
serie de N barras se puede escribir *exactamente* como

```
precio(t) = tendencia lineal + Σ [ aₖ·cos(2πkt/N) + bₖ·sin(2πkt/N) ]
```

v2.2 no hacía esto: solo tomaba la posición del precio en la caja y le aplicaba
un seno y un coseno de una sola vuelta — el precio disfrazado, sin capacidad de
anticipar. v3.0 hace la descomposición real:

1. **Detrend**: quita la tendencia lineal de las últimas N barras (default 128).
2. **DFT**: mide la energía (amplitud) de cada frecuencia posible en el residuo.
3. **Selección**: se queda con las K ondas de mayor energía (default 5) y
   descarta el resto como ruido (y todo período menor a `minPer`).
4. **Reconstrucción**: dibuja la suma de esas K ondas sobre el pasado (curva
   celeste) para que veas qué tan bien describe lo que ya pasó.
5. **Extrapolación**: prolonga la suma de ondas hacia adelante (curva amarilla
   punteada) y marca el primer valle y la primera cresta proyectados:
   **"GIRO ↑ en ~N barras"** y **"GIRO ↓ en ~N barras"**.

## Cómo leerlo

- **Curva celeste (pasado)**: el modelo de K ondas ajustado. Si no sigue bien
  al precio, las ondas de este activo/timeframe son débiles — no confíes en la
  proyección ahí.
- **Curva amarilla punteada (futuro)**: la extrapolación de las ondas actuales,
  amortiguada barra a barra (input `Amortiguación`) porque la confianza decae
  con el horizonte.
- **Etiquetas GIRO ↑ / GIRO ↓**: cuántas barras faltan para el próximo valle o
  cresta *si las ondas actuales persisten*. Esta es la respuesta directa a
  "¿cuál es el último rombo?": cuando el GIRO ↑ proyectado está a pocas barras,
  los rebotes que veas son candidatos a ser los últimos.
- **Triángulos VALLE / CRESTA (histórico)**: en cada barra del pasado, marcados
  cuando la suma de ondas giró usando **solo datos disponibles hasta esa
  barra** (sin repintado). Sirven para backtestear visualmente si el método
  funciona en tu activo antes de creerle a la proyección.
- **Tabla (arriba a la derecha)**: las K ondas dominantes con su período,
  amplitud y % de energía. La primera fila (amarilla) es el ciclo dominante.
- **Data Window**: período dominante, valor del compuesto y dirección
  proyectada (+1/-1).

## Límite honesto

Descomponer es matemática exacta; **extrapolar supone que las ondas medidas
persisten** (cuasi-estacionariedad). En mercados eso se cumple por tramos: los
ciclos derivan, cambian de período y mueren. Por eso el modelo se re-estima en
cada barra, la proyección se amortigua, y las etiquetas de giro son un
escenario probable — no una certeza. Reglas prácticas:

- Operá la proyección solo cuando la curva celeste venía siguiendo bien al
  precio en las últimas décadas de barras.
- Preferí giros proyectados del ciclo dominante (período largo, mucha
  % energía) sobre giros de ondas cortas.
- Combiná con el Trend Power / Recovery Line de v2.x como confirmación.
- Backtesteá con los triángulos VALLE/CRESTA históricos antes de usar capital.

---

# Alien Long Weather v2.3 + Phase Navigator (versión anterior)

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
