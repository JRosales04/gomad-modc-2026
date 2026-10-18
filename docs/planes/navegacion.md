# Navegación en las rutas (seguir mi ubicación) — plan de implementación (Tasks 182–185)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Pasos con casillas (`- [ ]`). Ledger: `.superpowers/sdd/navegacion/progress.md`.

**Objetivo:** en **todas** las pantallas que muestran una ruta, la persona puede pulsar «Seguir mi ubicación» y el mapa pasa a modo navegación, como Google Maps: su punto se mueve en el mapa mientras camina, el mapa la sigue y ve cuánto le queda. Las pantallas son tres:
- `/ruta/:id` (`RouteView.tsx`): rutas que vienen de «¿Desde dónde sales?» y de «Sorpréndeme».
- `/trayecto` (`RouteBetween.tsx`): ruta entre dos direcciones.
- `/asistente` (`Assistant.tsx`): ruta propuesta por el asistente.

**Arquitectura:** solo front, sin cambios en `app/api`.
- `src/data/navigation.ts` (nuevo) tiene la lógica pura:
  - `progressAlong(route, position)`: proyecta la posición sobre la línea de la ruta y devuelve `{ remaining_m, off_route_m }`.
  - `useNavigation(active, deps?)`: hook que sigue la posición con `navigator.geolocation.watchPosition` **solo cuando `active`**. Devuelve `{ position, error }`.
- `MapView`/`MapCanvas` reciben dos props **opcionales** nuevas:
  - `follow?: boolean`: con `true` y con `live`, la cámara se centra en `live` en cada actualización (zoom mínimo `NAV_ZOOM`).
  - `onUserMove?: () => void`: se llama cuando la persona arrastra o hace zoom en el mapa, para soltar el seguimiento.
  - Sin estas props, el comportamiento es exactamente el de hoy.
- `src/components/RouteNavigation.tsx` (nuevo) tiene la interfaz común:
  - Botones «Seguir mi ubicación» y «Dejar de seguir» (`aria-pressed`), y «Centrar en mí» cuando la persona mueve el mapa.
  - Panel con «Te quedan 1,2 km · 15 min», «Te has alejado de la ruta» y «Has llegado».
  - Mensajes de error (sin permiso, sin HTTPS, navegador sin GPS).
  - Expone `live` y `follow` para el mapa con un hook `useRouteNavigation(variant)`.
- Integración en las tres pantallas: el botón va junto al mapa, o dentro de la hoja en `RouteBetween`. El mapa recibe `live` y `follow` del hook.

**Tech stack:** React 19, TypeScript, MapLibre (react-map-gl), Vitest + Testing Library + axe.

**Spec:** encargo de la persona del 18/10 («en TODAS las rutas… que des tu ubicación y sea como Google Maps, que te va moviendo tu ubicación»); CLAUDE.md §2.8 (privacidad), §2.10 (accesibilidad), §5 F3.

## Global Constraints

- **Privacidad (CLAUDE.md §2.8):** la posición se queda en el navegador. No se envía a la API, no va en URL, logs ni `localStorage`, y no se recalcula la ruta al moverse. El aviso de permiso del navegador **solo** aparece al pulsar «Seguir mi ubicación», nunca al abrir la pantalla.
- **Se deja de seguir:** al pulsar «Dejar de seguir», al salir de la pantalla (desmontar) o al cambiar de ruta o variante. Siempre con `clearWatch`.
- **Sin regresiones:**
  - `useLivePosition` y su comportamiento actual en Resultados y en `RouteView` (el «Estás aquí» automático con permiso ya dado) no cambian.
  - Las props nuevas de `MapView` son opcionales y no alteran nada si faltan.
  - Las pruebas existentes no se editan, salvo para **añadir** casos.
- **Umbrales:** van como constantes con nombre, criterio propio, en `src/data/navigation.ts`, comentadas «criterio propio»:
  - `NAV_MIN_INTERVAL_MS = 1000`: como mucho una actualización por segundo.
  - `NAV_MIN_MOVE_M = 3`.
  - `OFF_ROUTE_M = 40`: más lejos de la línea que esto, «Te has alejado de la ruta».
  - `ARRIVED_M = 25`: a menos de esto del final, «Has llegado».
  - `NAV_ZOOM = 17`.
- **Tiempo restante:** `remaining_m / distance_m * duration_min` de la variante mostrada. Así no hay velocidades nuevas en el front.
- **Accesibilidad:**
  - Un `role="status"` solo anuncia los cambios de estado: «Siguiendo tu ubicación», «Te has alejado de la ruta», «Has llegado» y «Has dejado de seguir tu ubicación». No anuncia cada metro.
  - Los botones tienen nombre accesible, el panel lleva texto e icono además del color, y hay prueba axe en cada pantalla con la navegación activa.
- **Móvil primero.** Los botones miden al menos `var(--tap-min)` y no tapan los controles de zoom ni el asa de la hoja.
- **Idioma y código:** código en inglés, comentarios en español sin tildes y textos visibles con tildes. Sin dependencias nuevas. CSS en `src/styles/main.css` o `map.css`, reutilizando clases existentes cuando se pueda.
- **Comandos** desde `app/frontend`: `npx vitest run <fichero>`, `npm test`, `npm run lint`, `npm run build`.

## Review Focus

1. **Permiso denegado o sin HTTPS:** se muestra «No podemos seguir tu ubicación…» con la causa, el botón vuelve a «Seguir mi ubicación» y no hay bucle. Prueba en Task 182 (hook) y en Task 184 (texto).
2. **Desmontar con la navegación activa:** se llama a `clearWatch` con el id devuelto por `watchPosition`. Prueba en Task 182.
3. **Arrastrar el mapa mientras sigue:** se suelta el seguimiento y aparece «Centrar en mí». Al pulsarlo vuelve a seguir. Prueba en Task 183 (prop `onUserMove`) y en Task 184.
4. **Proyección sobre la ruta:**
   - Un punto en la mitad de una línea de 1 km da `remaining_m` ≈ 500.
   - Un punto a 100 m de la línea da `off_route_m` ≈ 100.
   - Una ruta de 2 puntos funciona.
   - Pruebas en Task 182, con tolerancia de 1 %.
5. **No se abre el permiso al entrar:** al montar cualquiera de las tres pantallas, `watchPosition` y `getCurrentPosition` no se llaman hasta pulsar el botón. Prueba en Task 185, una por pantalla.

---

### Task 182: `navigation.ts`, proyección y hook de seguimiento

**Servicio:** `app/frontend`
**Crear:** `src/data/navigation.ts`, `src/test/navigation.test.ts`
**Produce:**
- `export function progressAlong(route: LonLat[], position: Coordinate): { remaining_m: number; off_route_m: number }`
- `export function useNavigation(active: boolean, deps?: LiveDeps): { position: Coordinate | null; error: NavigationError | null }`
- `export type NavigationError = "denied" | "insecure" | "unavailable"`
- Constantes `NAV_MIN_INTERVAL_MS`, `NAV_MIN_MOVE_M`, `OFF_ROUTE_M`, `ARRIVED_M` y `NAV_ZOOM`

- [ ] **Step 1: tests que fallan.**
  - Casos de `progressAlong` del Review Focus 4.
  - `useNavigation`, con `geo` simulado como en `src/test/livePosition.test.tsx`:
    - con `active=false` no llama a `watchPosition`;
    - al activarse, lo llama con `enableHighAccuracy: true`;
    - aplica `NAV_MIN_INTERVAL_MS` y `NAV_MIN_MOVE_M`;
    - el error de código 1 da `"denied"` y para;
    - sin contexto seguro da `"insecure"`;
    - sin `geo` da `"unavailable"`;
    - al desactivar o desmontar llama a `clearWatch` (Review Focus 1 y 2).
- [ ] **Step 2:** `npx vitest run src/test/navigation.test.ts` → Esperado: FALLA.
- [ ] **Step 3: implementar.**
  - Distancias con `distanceM` de `livePosition.ts` (importar, no copiar).
  - La proyección en metros locales: equirectangular alrededor de la posición, suficiente a escala de una ruta a pie.
- [ ] **Step 4:** PASA.
- [ ] **Step 5: commit** `Front: progreso sobre la ruta y seguimiento de la ubicación para navegar (Task 182)`.

### Task 183: el mapa sigue la ubicación

**Servicio:** `app/frontend`
**Modificar (solo añadir):** `src/components/MapView.tsx` (props `follow` y `onUserMove` en `MapViewProps`, pasadas a `MapCanvas`) y `src/components/MapCanvas.tsx`
**Tests:** añadir casos en `src/test/MapView.test.tsx`, o crear `src/test/MapFollow.test.tsx` con el mock de `src/test/mapMock.tsx`

- [ ] **Step 1: tests que fallan.**
  - Con `follow` y `live`, al cambiar `live` se mueve la cámara (`easeTo` o `flyTo` del mock) al nuevo centro.
  - Sin `follow`, no se mueve.
  - Un `dragstart` o `zoomstart` originado por la persona (`originalEvent` presente) llama a `onUserMove`; el movimiento programado no lo llama.
  - Sin las props nuevas, las pruebas de mapa existentes siguen igual.
- [ ] **Step 2:** FALLA.
- [ ] **Step 3: implementar.**
  - En `MapCanvas`, un `useEffect` sobre `[follow, live?.lat, live?.lon]` hace `mapRef.current?.easeTo({ center, zoom: max(zoom actual, NAV_ZOOM), duration: 500 })`, o `duration: 0` con `prefers-reduced-motion`.
  - `onDragStart` y `onZoomStart` con `e.originalEvent` llaman a `onUserMove`.
  - El esquema SVG de respaldo ignora `follow`.
- [ ] **Step 4:** PASA, y `npm test` en verde.
- [ ] **Step 5: commit** `Front: el mapa puede seguir la ubicación en tiempo real (Task 183)`.

### Task 184: `RouteNavigation`, controles y panel comunes

**Servicio:** `app/frontend`
**Crear:** `src/components/RouteNavigation.tsx`, `src/test/RouteNavigation.test.tsx`
**Produce:** `export function useRouteNavigation(variant: RouteVariant | null): { live: Coordinate | null; follow: boolean; onUserMove: () => void; controls: ReactNode }`

- [ ] **Step 1: tests que fallan,** con un componente de prueba que usa el hook y `geo` simulado.
  - Botón «Seguir mi ubicación»; al pulsarlo cambia a «Dejar de seguir» con `aria-pressed="true"`.
  - Con posiciones simuladas sobre la ruta muestra «Te quedan …» (km y min formateados con `formatDistance` y `formatMinutes`).
  - Lejos de la línea, «Te has alejado de la ruta».
  - Cerca del final, «Has llegado».
  - `onUserMove()` hace aparecer «Centrar en mí», que vuelve a `follow=true`.
  - Error `"denied"`: el mensaje es «No podemos seguir tu ubicación: el navegador no tiene permiso. Actívalo en los ajustes del navegador.».
  - Error `"insecure"`: el mensaje dice que hace falta HTTPS.
  - El `role="status"` anuncia solo los cambios de estado.
  - axe sin violaciones.
- [ ] **Step 2:** FALLA.
- [ ] **Step 3: implementar** con `useNavigation` y `progressAlong`. Cambiar `variant` (otra ruta) reinicia el estado de llegada.
- [ ] **Step 4:** PASA.
- [ ] **Step 5: commit** `Front: controles de navegación comunes para las rutas (Task 184)`.

### Task 185: navegación en las tres pantallas de ruta

**Servicio:** `app/frontend`
**Modificar (solo añadir):** `src/components/RouteView.tsx`, `src/components/RouteBetween.tsx`, `src/components/Assistant.tsx` y CSS
**Tests (solo añadir casos):** `src/test/RouteView.test.tsx`, `src/test/RouteBetween.test.tsx`, `src/test/Assistant.test.tsx`

- [ ] **Step 1: tests que fallan,** uno por pantalla con su ruta en pantalla.
  - Existe «Seguir mi ubicación».
  - Al montar no se llama a `watchPosition` ni a `getCurrentPosition` (Review Focus 5).
  - Al pulsar, se llama a `watchPosition` y aparece el panel de navegación.
  - axe sin violaciones con la navegación activa.
- [ ] **Step 2:** FALLA.
- [ ] **Step 3: integrar.**
  - En cada pantalla: `const nav = useRouteNavigation(variant)`. El mapa recibe `live={nav.live ?? live}` en `RouteView`, donde se conserva el `live` automático actual, y `nav.live` en las otras dos. También recibe `follow={nav.follow}` y `onUserMove={nav.onUserMove}`. `{nav.controls}` va junto al mapa.
  - En `RouteBetween`, los controles van al principio de la hoja (visibles con la hoja recogida). Al pulsar «Seguir mi ubicación» la hoja se recoge para ver el mapa.
  - En `Assistant`, solo cuando hay ruta propuesta.
- [ ] **Step 4:** PASA. `npm test`, `npm run lint` y `npm run build` en verde.
- [ ] **Step 5: commit** `Front: seguir mi ubicación en todas las rutas (Task 185)`.
