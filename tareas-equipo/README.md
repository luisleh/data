# 📋 Tareas del Equipo — sistema compartido en Dropbox

Sistema simple de tareas pendientes para un equipo pequeño, pensado para vivir
dentro de una carpeta compartida de Dropbox. No necesita servidor, ni internet,
ni instalación: es un solo archivo `index.html` que se abre en el navegador.

## Instalación (una sola vez, por persona)

1. Copia el archivo `index.html` a una carpeta compartida de Dropbox,
   por ejemplo `Dropbox/Tareas-Equipo/`.
2. Cada persona del equipo abre ese `index.html` con **Google Chrome** o
   **Microsoft Edge** (doble clic sobre el archivo, o clic derecho → Abrir con).
   > Firefox y Safari no sirven: no permiten que una página lea carpetas.
3. Al abrirlo, pulsa **"Elegir carpeta…"** y selecciona la carpeta
   `Tareas-Equipo` (la misma donde está el archivo). El navegador pedirá
   permiso una vez; en visitas siguientes solo pedirá "Reconectar".
4. Escribe tu nombre cuando lo pida (se usa para mostrar quién editó cada tarea).

La app crea automáticamente una subcarpeta `tareas/` donde guarda cada tarea
como un archivo `.json` independiente.

## Funciones

- **Nombre, próximo paso, responsable y tiempo estimado** por tarea.
- **Lista de equipo editable y compartida** (botón 👥 Equipo): los responsables
  se eligen siempre de esa lista; se guarda como `equipo.json` en la carpeta,
  así todos ven los mismos nombres.
- **Barra de filtros**: por responsable (👤), solo prioritarias (⭐) y buscador
  de texto (busca en nombre, próximo paso, responsable y subtareas). Los
  filtros se recuerdan entre sesiones en cada computadora.
- **Semáforo de fecha límite**: 🟢 verde con tiempo → 🟡 amarillo cuando falta
  un día → 🔴 rojo el día del vencimiento → ⛔ vencida.
- **⭐ Estrella de prioridad**: las tareas prioritarias suben al principio.
- **Subtareas previas**: se expanden con un clic para ver cuáles ya están ✓;
  al completar la tarea principal avisa si quedan subtareas pendientes.
- **Actualización automática** cada 30 segundos (y botón ⟳) para ver los
  cambios que Dropbox sincronizó de otros usuarios.

## ¿Por qué no hay conflictos si dos personas lo usan a la vez?

Cada tarea es **su propio archivo** dentro de `tareas/`. Si tú editas la tarea
A y tu secretaria edita la tarea B al mismo tiempo, se escriben archivos
distintos y Dropbox los sincroniza sin problema.

Solo si dos personas guardan **la misma tarea** casi al mismo tiempo puede
haber choque. Para eso hay dos defensas:

1. Antes de guardar, la app relee el archivo; si otra persona lo modificó
   después de que tú lo cargaste, te pregunta si quieres sobrescribir o
   conservar la versión de la otra persona.
2. Si aun así Dropbox llegara a crear una "copia en conflicto", la app la
   detecta y muestra un aviso amarillo indicando qué archivo revisar.

## Formato de los datos

Los archivos son JSON legibles; en una emergencia se pueden abrir y editar
con el Bloc de notas:

```json
{
  "nombre": "Contrato Pérez",
  "proximoPaso": "Enviar borrador al cliente",
  "responsable": "María",
  "tiempoEstimado": "2 horas",
  "fechaLimite": "2026-09-15",
  "prioridad": true,
  "completada": false,
  "subtareas": [
    { "texto": "Revisar cláusula 4", "hecha": true },
    { "texto": "Firma del gerente", "hecha": false }
  ],
  "creada": "2026-09-10T14:00:00.000Z",
  "ultimaEdicion": { "quien": "Luis", "cuando": "2026-09-10T14:30:00.000Z" }
}
```

## Limitaciones conocidas

- Solo funciona en navegadores basados en Chromium (Chrome, Edge, Brave) y en
  computadora de escritorio; desde el celular no es posible elegir carpetas.
- Los cambios de otros usuarios tardan lo que tarde Dropbox en sincronizar
  (normalmente segundos).
