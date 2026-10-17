# Bloque M — Mapa MapLibre sincronizado con la lista (Tasks 65–67)

> **Para agentes:** SUB-SKILL OBLIGATORIA: `superpowers:executing-plans` (o `superpowers:subagent-driven-development`) con **este** fichero. Su ledger es `.superpowers/sdd/mapa/progress.md`, no el del plan general. Los pasos usan casillas (`- [ ]`).

> Detallado el 16/10 con `superpowers:writing-plans` (rama `front/mapa`). **Especificación:** ficha del bloque M en `docs/trabajo-paralelo.md` §3, fila V-F1 de `docs/plan-implementacion.md` («Mapa MapLibre sincronizado con la lista (RF-11); la lista es el equivalente completo»; prueba «seleccionar tarjeta cambia el marcador activo»), CLAUDE.md §2 (2.10 accesibilidad, 2.11 licencias) y `app/frontend/docs/guia.md`.

**Objetivo:** sustituir el esquema SVG de `MapView.tsx` por un mapa real de MapLibre (react-map-gl) con teselas de OpenFreeMap, con la misma interfaz, la ruta de la pantalla Ruta dibujada encima y la selección sincronizada entre tarjetas y marcadores en Resultados.

**Arquitectura:** `MapView.tsx` conserva su interfaz (`markers`, `selectedId`, `origin`, `route`, `secondaryRoute`, `className`) y añade `onSelect`. Decide qué pintar: si el navegador tiene WebGL, carga **en diferido** (`React.lazy`) `MapCanvas.tsx`, que es el único módulo que importa `maplibre-gl` y `react-map-gl/maplibre` (así MapLibre, ~800 KB, no entra en el paquete inicial); si no hay WebGL, si MapLibre falla (límite de error) o mientras carga, pinta el esquema SVG actual. jsdom no tiene WebGL (`setupTests.ts` devuelve `null` en `getContext`), así que las pruebas de las demás pantallas siguen viendo el esquema sin cambiar nada; las pruebas del mapa simulan `react-map-gl/maplibre`. El mapa entero sigue `aria-hidden` y fuera del orden de tabulación: la lista es el equivalente completo (RF-11).

**Stack:** React 19, TypeScript 6, Vite 8, Vitest 4 + Testing Library + vitest-axe · `maplibre-gl@6.11.2` · `react-map-gl@8.1.3` (entrada `react-map-gl/maplibre`).

## Restricciones globales

- Código en inglés; comentarios en español **sin tildes**; textos visibles en español **con tildes** (CLAUDE.md §2.1).
- **Solo los ficheros del bloque M** (`docs/trabajo-paralelo.md` §3): `src/components/MapView.tsx`, `src/styles/map.css` (nuevo), `package.json`/`package-lock.json` (solo `maplibre-gl` y `react-map-gl`), las pruebas del mapa. Nuevos y solo del mapa: `src/components/MapCanvas.tsx`, `src/components/MapView.test.tsx`, `src/components/MapSync.test.tsx`. En `Results.tsx`, solo el cableado de la selección (Task 67), avisando a F.
- Sin cambios de contrato (`schemas.py`, `openapi.json`, `src/api/*`).
- Teselas de **OpenFreeMap** (decidido 16/10): estilo `https://tiles.openfreemap.org/styles/liberty`, sin clave. Atribución visible: «© OpenStreetMap · OpenMapTiles · OpenFreeMap» (CLAUDE.md §2.11; ODbL; la de su TileJSON, añadida OpenMapTiles tras el verificador). El PMTiles local es del lunes (L-4), fuera de este bloque.
- La lista es el equivalente completo (RF-11): el mapa es `aria-hidden="true"`, sin elementos enfocables (`keyboard={false}`, lienzo con `tabindex="-1"`, marcadores sin botón).
- Pruebas deterministas: nunca la red; `react-map-gl/maplibre` simulado con `vi.mock`; WebGL simulado con `vi.spyOn(HTMLCanvasElement.prototype, "getContext")`.
- Sin push, sin merge, sin PR; no conectarse a la VM. Comandos desde `app/frontend`: `npm ci`, `npm test`, `npm run lint`, `npm run build`.

## Foco de revisión

1. **Navegador sin WebGL o con WebGL que falla al crear el contexto** (móviles viejos, aceleración desactivada): se ve el esquema SVG y la lista funciona; nunca pantalla rota. → Task 65 `sin WebGL dibuja el esquema sin cargar MapLibre`, `si MapLibre falla vuelve al esquema`.
2. **Sin red para las teselas** (OpenFreeMap caído o datos móviles cortados): los marcadores y la ruta se dibujan igual sobre fondo liso; la lista no depende del mapa. → Task 65 `los marcadores no dependen del estilo` (se pintan como `Marker` de React, no como capa del estilo).
3. **Un solo punto o todos los puntos iguales** (un destino sin origen, origen = destino): el encuadre no da zoom infinito ni NaN. → Task 65 `boundsOf con un punto da una caja minima`.
4. **Cambia la lista** («Ver más opciones», recálculo al ajustar preferencias): el mapa reencuadra a los nuevos puntos sin recrearse. → Task 66 `reencuadra cuando cambian los puntos`.
5. **Lector de pantalla y teclado** en Resultados con el mapa real: axe sin violaciones y ningún elemento del mapa en el orden de tabulación. → Task 67 `MapSync.test.tsx` `axe sin violaciones con el mapa real`.

---

### Task 65: M (1/3) · MapLibre con teselas de OpenFreeMap, marcadores, atribución y respaldo sin WebGL

**Rol:** Front · **Servicio:** `app/frontend/` · **Depende de:** nada · **Duración:** 1,5 h

**Ficheros:** Crear `src/components/MapCanvas.tsx`, `src/components/MapView.test.tsx`, `src/styles/map.css`. Modificar `src/components/MapView.tsx`, `package.json`, `package-lock.json`.

**Interfaces:**
- Consume: `Coordinate`, `RouteVariant` (`src/api/types.ts`); `lineCoordinates`, `LonLat` (`src/lib/geometry.ts`).
- Produce:
  - `MapView.tsx` → `export interface MapMarker` (sin cambios), `export interface MapViewProps` (= props actuales + `onSelect?: (id: string) => void`), `export function hasWebGL(): boolean`, `export class MapErrorBoundary` (props `fallback: ReactNode`, `children`), `default MapView`.
  - `MapCanvas.tsx` → `export const TILE_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty"`, `export const MAP_ATTRIBUTION = "© OpenStreetMap · OpenFreeMap"`, `export type Bounds = [LonLat, LonLat]`, `export function boundsOf(points: LonLat[]): Bounds | null`, `export function mapPoints(props: MapViewProps): LonLat[]`, `default MapCanvas(props: MapViewProps)`.
  - Clases CSS: `.map-canvas` (contenedor que llena `.map-view`), `.map-marker`, `.map-marker--selected`, `.map-marker--origin`, `.map-view__attribution`.

- [ ] **Paso 1: dependencias**

Run: `npm install maplibre-gl@6.11.2 react-map-gl@8.1.3 --save-exact` y después `npm ci`.
Esperado: `package.json` con las dos en `dependencies` sin `^`; `npm ls react-map-gl maplibre-gl` sin `UNMET PEER`.

- [ ] **Paso 2: pruebas que fallan** — `src/components/MapView.test.tsx`. Arriba, el simulacro de `react-map-gl/maplibre` (sirve para las tres Tasks): `Map` es un `forwardRef` que expone `{ fitBounds: fitBoundsMock }` por `useImperativeHandle`, pinta `<div data-testid="maplibre" data-style={mapStyle}>{children}</div>` y guarda sus props en `lastMapProps`; `Marker` pinta `<div data-lon data-lat onClick={() => onClick?.({ originalEvent: { stopPropagation() {} } })}>{children}</div>`; `Source` pinta `<div data-source={id} data-coords={JSON.stringify(data.coordinates)}>{children}</div>`; `Layer` pinta `<div data-layer={id} />`. Un `withWebGL()` hace `vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as never)`.

```ts
describe("MapView", () => {
    it("sin WebGL dibuja el esquema sin cargar MapLibre", () => {
        const { container } = render(<MapView markers={MARKERS} origin={ORIGIN} />);
        expect(container.querySelector(".map-view__svg")).not.toBeNull();
        expect(screen.queryByTestId("maplibre")).toBeNull();
        expect(screen.getByText("Mapa simplificado (sin teselas)")).toBeInTheDocument();
    });

    it("con WebGL carga el mapa de MapLibre con las teselas de OpenFreeMap", async () => {
        withWebGL();
        render(<MapView markers={MARKERS} origin={ORIGIN} />);
        expect(await screen.findByTestId("maplibre")).toHaveAttribute(
            "data-style", "https://tiles.openfreemap.org/styles/liberty");
    });

    it("muestra la atribucion de OpenStreetMap y OpenFreeMap", async () => {
        withWebGL();
        render(<MapView markers={MARKERS} />);
        expect(await screen.findByText("© OpenStreetMap · OpenFreeMap")).toBeVisible();
    });

    it("el mapa esta oculto a lectores y fuera del teclado", async () => {
        withWebGL();
        const { container } = render(<MapView markers={MARKERS} />);
        await screen.findByTestId("maplibre");
        expect(container.querySelector(".map-view")).toHaveAttribute("aria-hidden", "true");
        expect(lastMapProps.keyboard).toBe(false);
        expect(lastMapProps.attributionControl).toBe(false);
        expect(container.querySelectorAll("button, a, [tabindex]:not([tabindex='-1'])")).toHaveLength(0);
    });

    it("los marcadores no dependen del estilo: uno numerado por destino y el origen", async () => {
        withWebGL();
        const { container } = render(<MapView markers={MARKERS} origin={ORIGIN} />);
        await screen.findByTestId("maplibre");
        expect([...container.querySelectorAll(".map-marker:not(.map-marker--origin)")].map((m) => m.textContent))
            .toEqual(["1", "2"]);
        expect(container.querySelectorAll(".map-marker--origin")).toHaveLength(1);
    });

    it("si MapLibre falla vuelve al esquema", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const Boom = () => { throw new Error("WebGL context lost"); };
        render(<MapErrorBoundary fallback={<p>esquema</p>}><Boom /></MapErrorBoundary>);
        expect(screen.getByText("esquema")).toBeInTheDocument();
    });
});

describe("boundsOf", () => {
    it("da la caja de los puntos", () => {
        expect(boundsOf([[-3.73, 40.30], [-3.70, 40.32]])).toEqual([[-3.73, 40.30], [-3.70, 40.32]]);
    });
    it("con un punto da una caja minima", () => {
        const [[w, s], [e, n]] = boundsOf([[-3.73, 40.30]])!;
        expect(e - w).toBeCloseTo(0.01);
        expect(n - s).toBeCloseTo(0.01);
    });
    it("sin puntos da null", () => {
        expect(boundsOf([])).toBeNull();
    });
});
```

Con `MARKERS` = dos destinos en Getafe (números 1 y 2) y `ORIGIN = { lon: -3.7315, lat: 40.3057 }`.

- [ ] **Paso 3: comprobar que fallan**

Run: `npx vitest run src/components/MapView.test.tsx`
Esperado: FAIL (no existen `MapCanvas`, `boundsOf`, `MapErrorBoundary`; el texto del esquema es otro).

- [ ] **Paso 4: implementar**
  - `MapCanvas.tsx`: importa `maplibre-gl/dist/maplibre-gl.css` y `../styles/map.css`; `<Map ref mapStyle={TILE_STYLE_URL} attributionControl={false} keyboard={false} initialViewState={{ bounds, fitBoundsOptions: { padding: 40, maxZoom: 16 } }} onLoad={(e) => e.target.getCanvas().setAttribute("tabindex", "-1")} style={{ width: "100%", height: "100%" }}>`; un `<Marker>` por destino con `<span className="map-marker">{number}</span>` y otro para el origen con `<span className="map-marker map-marker--origin" />`; debajo, `<p className="map-view__attribution">{MAP_ATTRIBUTION}</p>`. `mapPoints` junta marcadores, origen y coordenadas de `route`/`secondaryRoute` (con `lineCoordinates`). `boundsOf` con un solo punto (o todos iguales) abre ±0,005° (criterio propio: unos 500 m).
  - `MapView.tsx`: `hasWebGL()` prueba `getContext("webgl2") ?? getContext("webgl")` en un `<canvas>` nuevo, dentro de `try`. `MapErrorBoundary` es una clase con `getDerivedStateFromError`. Con WebGL: `<MapErrorBoundary fallback={schematic}><Suspense fallback={schematic}><MapCanvas {...props} /></Suspense></MapErrorBoundary>` con `const MapCanvas = lazy(() => import("./MapCanvas"))`; sin WebGL, `schematic`. El esquema es el SVG de ahora, con la nota «Mapa simplificado (sin teselas)». Raíz `div.map-view` con `aria-hidden="true"` en los dos casos.
  - `map.css`: `.map-canvas { position: absolute; inset: 0; }`; marcadores redondos de 28 px con número en blanco sobre `--navy` (el seleccionado, 34 px sobre `--green-dark` y `z-index` mayor); origen 16 px `--focus` con borde blanco; `.map-view__attribution` abajo a la derecha, 11 px, fondo blanco al 85 %, texto `--text`. Solo tokens de `main.css`, ningún color a mano salvo `#ffffff`.

- [ ] **Paso 5: comprobar que pasan**

Run: `npx vitest run src/components/MapView.test.tsx` y `npm test`
Esperado: PASS; el resto de pruebas (Resultados, Ruta, Asistente, a11y) sigue en verde sin tocarlas.

- [ ] **Paso 6: commit**

```bash
git add app/frontend/package.json app/frontend/package-lock.json app/frontend/src/components/MapView.tsx app/frontend/src/components/MapCanvas.tsx app/frontend/src/components/MapView.test.tsx app/frontend/src/styles/map.css
git commit -m "Front: mapa MapLibre con teselas de OpenFreeMap y esquema sin WebGL (Task 65)"
```

**Terminado cuando:** con WebGL se ve el mapa de OpenFreeMap con los marcadores numerados y la atribución; sin WebGL o si MapLibre falla, el esquema; `maplibre-gl` va en un trozo aparte en `npm run build`.

---

### Task 66: M (2/3) · Ruta elegida y la otra sobre el mapa, y reencuadre

**Rol:** Front · **Servicio:** `app/frontend/` · **Depende de:** Task 65 · **Duración:** 45 min

**Ficheros:** Modificar `src/components/MapCanvas.tsx`, `src/components/MapView.test.tsx`.

**Interfaces:**
- Consume: `MapCanvas`, `boundsOf`, `mapPoints` (Task 65).
- Produce: fuentes GeoJSON `route-main` y `route-secondary`, capas `route-main-line` y `route-secondary-line`; constantes `ROUTE_MAIN_COLOR = "#135c3a"` y `ROUTE_SECONDARY_COLOR = "#55677a"` (los valores de `--green-dark` y `--muted`: MapLibre no lee variables CSS).

- [ ] **Paso 1: pruebas que fallan** (en `MapView.test.tsx`, `describe("MapCanvas: ruta")`)

```ts
it("dibuja la ruta elegida y la otra con capas distintas", async () => {
    withWebGL();
    const { container } = render(<MapView markers={[]} origin={ORIGIN} route={MAIN} secondaryRoute={OTHER} />);
    await screen.findByTestId("maplibre");
    expect(JSON.parse(container.querySelector("[data-source='route-main']")!.getAttribute("data-coords")!))
        .toEqual(MAIN_COORDS);
    expect(container.querySelector("[data-layer='route-main-line']")).not.toBeNull();
    expect(container.querySelector("[data-layer='route-secondary-line']")).not.toBeNull();
});

it("sin ruta no hay capas de ruta", async () => {
    withWebGL();
    const { container } = render(<MapView markers={MARKERS} />);
    await screen.findByTestId("maplibre");
    expect(container.querySelector("[data-source^='route-']")).toBeNull();
});

it("encuadra la ruta y el origen", () => {
    const [[w, s], [e, n]] = boundsOf(mapPoints({ markers: [], origin: ORIGIN, route: MAIN }))!;
    expect(w).toBeLessThanOrEqual(ORIGIN.lon);
    expect(e).toBeGreaterThanOrEqual(Math.max(...MAIN_COORDS.map((c) => c[0])));
    expect(s).toBeLessThan(n);
});

it("reencuadra cuando cambian los puntos", async () => {
    withWebGL();
    const { rerender } = render(<MapView markers={MARKERS.slice(0, 1)} />);
    await screen.findByTestId("maplibre");
    fitBoundsMock.mockClear();
    rerender(<MapView markers={MARKERS} />);
    expect(fitBoundsMock).toHaveBeenCalledTimes(1);
    rerender(<MapView markers={[...MARKERS]} />);
    expect(fitBoundsMock).toHaveBeenCalledTimes(1);
});
```

Con `MAIN = toLineString(MAIN_COORDS)` y `OTHER = toLineString(...)` de `src/lib/geometry.ts`. La última prueba fija que un array nuevo con los mismos puntos no reencuadra (clave por valor, no por referencia).

- [ ] **Paso 2: comprobar que fallan**

Run: `npx vitest run src/components/MapView.test.tsx`
Esperado: FAIL en las cuatro pruebas nuevas.

- [ ] **Paso 3: implementar** — en `MapCanvas`, `<Source id="route-secondary" type="geojson" data={secondaryRoute}>` + `<Layer id="route-secondary-line" type="line" paint={{ "line-color": ROUTE_SECONDARY_COLOR, "line-width": 4, "line-dasharray": [2, 1.5] }} />` y, encima, `route-main` con `line-width` 6 y `ROUTE_MAIN_COLOR`; solo si `lineCoordinates(...)` tiene ≥ 2 puntos; las fuentes antes de los marcadores. Reencuadre: `useEffect` con dependencia `JSON.stringify(boundsOf(mapPoints(props)))` que, salvo en el primer render (lo hace `initialViewState`), llama a `ref.current?.fitBounds(bounds, { padding: 40, maxZoom: 16, duration: 0 })`.

- [ ] **Paso 4: comprobar que pasan**

Run: `npx vitest run src/components/MapView.test.tsx` y `npm test`
Esperado: PASS.

- [ ] **Paso 5: commit**

```bash
git add app/frontend/src/components/MapCanvas.tsx app/frontend/src/components/MapView.test.tsx
git commit -m "Front: ruta elegida y alternativa sobre el mapa con reencuadre (Task 66)"
```

**Terminado cuando:** en la pantalla Ruta se ven la ruta elegida (verde, gruesa) y la otra (gris, discontinua), igual que la leyenda que ya tiene `RouteView.tsx`, y el mapa encuadra origen, destino y ruta.

---

### Task 67: M (3/3) · Selección sincronizada tarjeta ↔ marcador en Resultados (RF-11)

**Rol:** Front · **Servicio:** `app/frontend/` · **Depende de:** Tasks 65–66 · **Duración:** 1 h

**Ficheros:** Crear `src/components/MapSync.test.tsx`. Modificar `src/components/MapCanvas.tsx`, `src/components/MapView.test.tsx`, `src/components/Results.tsx` (solo el cableado: estado, dos manejadores en la `<ol>` y dos props de `MapView`; avisar a F).

**Interfaces:**
- Consume: `MapViewProps.onSelect`, `selectedId` (Task 65); `renderAt`, `SAMPLE_ORIGIN`, `expectNoAxeViolations` (`src/test/render.tsx`).
- Produce: en `MapCanvas`, el marcador con `id === selectedId` lleva `map-marker--selected`; pulsar un marcador llama a `onSelect(id)`. En `Results.tsx`, `selectedId` es el destino de la tarjeta con foco o bajo el puntero; pulsar un marcador enfoca el enlace de su tarjeta (`scrollIntoView({ block: "nearest" })` + `focus()`), y el foco vuelve a seleccionar ese destino.

- [ ] **Paso 1: pruebas que fallan**

En `MapView.test.tsx` (`describe("MapCanvas: seleccion")`):

```ts
it("el marcador seleccionado lleva la clase de seleccion", async () => {
    withWebGL();
    const { container } = render(<MapView markers={MARKERS} selectedId={MARKERS[1].id} />);
    await screen.findByTestId("maplibre");
    const selected = container.querySelectorAll(".map-marker--selected");
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent("2");
});

it("pulsar un marcador llama a onSelect con su id", async () => {
    withWebGL();
    const onSelect = vi.fn();
    render(<MapView markers={MARKERS} onSelect={onSelect} />);
    fireEvent.click(await screen.findByText("2"));
    expect(onSelect).toHaveBeenCalledWith(MARKERS[1].id);
});
```

`src/components/MapSync.test.tsx` (mismo simulacro de `react-map-gl/maplibre` y `withWebGL()`; búsqueda `{ origin: SAMPLE_ORIGIN, search: { activity: "walk", label: "Caminar" } }`):

```ts
it("enfocar una tarjeta activa su marcador", async () => {
    const { container } = renderAt("/resultados", WITH_SEARCH);
    const links = within(await screen.findByRole("list", { name: "Resultados" })).getAllByRole("link");
    await screen.findByTestId("maplibre");
    links[1].focus();
    await waitFor(() => expect(container.querySelector(".map-marker--selected")).toHaveTextContent("2"));
});

it("pasar el puntero por una tarjeta activa su marcador", async () => { /* fireEvent.mouseOver(links[2]) -> "3" */ });

it("pulsar un marcador lleva el foco a su tarjeta", async () => {
    // fireEvent.click(marcador "3") -> document.activeElement === links[2]
});

it("axe sin violaciones con el mapa real", async () => {
    const { container } = renderAt("/resultados", WITH_SEARCH);
    await screen.findByTestId("maplibre");
    await expectNoAxeViolations(container);
});
```

Antes de las pruebas, `Element.prototype.scrollIntoView ??= () => {}` (jsdom no lo trae; solo en este fichero).

- [ ] **Paso 2: comprobar que fallan**

Run: `npx vitest run src/components/MapView.test.tsx src/components/MapSync.test.tsx`
Esperado: FAIL (sin clase de selección, sin `onSelect`, `Results` no pasa `selectedId`).

- [ ] **Paso 3: implementar**
  - `MapCanvas`: clase `map-marker--selected` y `onClick` del `Marker` → `e.originalEvent.stopPropagation(); onSelect?.(m.id)`.
  - `Results.tsx`: `const [selectedId, setSelectedId] = useState<string | null>(null)`; un `selectFrom(target)` que busca el `li` del evento dentro de `listRef` y toma `items[índice].destination.id`; en la `<ol>`, `onFocus` y `onMouseOver` llaman a `selectFrom` (delegación: `ResultCard` no cambia); en `<MapView>`, `selectedId={selectedId}` y `onSelect={(id) => { const link = listRef.current?.children[items.findIndex(...)]?.querySelector("a"); link?.scrollIntoView({ block: "nearest" }); link?.focus(); }}`.

- [ ] **Paso 4: comprobar que pasan**

Run: `npx vitest run src/components/MapView.test.tsx src/components/MapSync.test.tsx` y `npm test`
Esperado: PASS; `Results.test.tsx` sigue en verde sin cambios.

- [ ] **Paso 5: commit**

```bash
git add app/frontend/src/components/MapCanvas.tsx app/frontend/src/components/MapView.test.tsx app/frontend/src/components/MapSync.test.tsx app/frontend/src/components/Results.tsx
git commit -m "Front: seleccion sincronizada entre tarjetas y marcadores en Resultados (Task 67)"
```

**Terminado cuando:** en Resultados, enfocar o señalar una tarjeta resalta su marcador; pulsar un marcador lleva el foco a su tarjeta; axe sin violaciones; `npm test`, `npm run lint` y `npm run build` en verde.

---

## Cierre del bloque

1. `npm test && npm run lint && npm run build` desde `app/frontend`.
2. `git fetch && git rebase origin/main` y otra vez lo mismo.
3. Comprobación a mano con `npm run dev` (si la API local responde): Resultados y Ruta en escritorio y a 375 px.
4. Revisión final de la rama: solo ficheros del bloque M (+ el cableado de `Results.tsx`).
5. Informe: estado por Task, commits, pruebas con salida real, Rulings, qué desplegar (solo la imagen `frontend`: `deploy.sh` en la VM) y siguiente paso (PMTiles local, L-4).

---

# Corrección C2 — Mapa explorable, ubicación en tiempo real y pines por tipo (Tasks 140–149)

> Escrito el 17/10 con `superpowers:writing-plans` (rama `front/mapa`, base `main` tras la PR #48). **Especificación:** ficha C2 del encargo (corrección pedida por el equipo tras probar la app; no está en `docs/pendientes-app.md`). Por excepción a «front manual guiado», la persona usuaria pidió que el agente haga back y front. Ledger: `.superpowers/sdd/mapa/progress.md` (sección C2).

**Objetivo:** (1) al mover o ampliar el mapa se ven los destinos de la zona visible y, de cerca, los puntos útiles (fuentes, bancos, desfibriladores, áreas caninas), agrupados cuando hay muchos; (2) el punto «Estás aquí» se mueve en tiempo real mientras el mapa está abierto, sin volver a pedir la recomendación salvo que la persona lo pida tras alejarse; (3) pines con icono por tipo, leyenda accesible y texto alternativo, con el pin seleccionado sincronizado con la lista (RF-11).

**Arquitectura:**
- **Back:** `GET /map/points?bbox=oeste,sur,este,norte&kinds=…` → `MapPointsResponse {points, truncated, clipped}`. `services/map_points.py` valida la caja, la recorta a `max_span_deg` alrededor de su centro (`clipped`) y pide a `Repository.map_points` (método nuevo) como mucho `max_points` puntos de `destination` (tipo; `pool` si tiene la actividad `pool_activity`) y `route_poi` (tipo), los más cercanos al centro de la caja (`truncated` si había más). Valores en `app/config/map.yaml` (criterio propio). La caja es la de la vista del mapa y no va a los logs (el middleware solo escribe la ruta; Caddy ya tacha la query).
- **Front:** `src/data/mapPoints.ts` (`getMapPoints`, con datos de ejemplo en pruebas). `src/components/mapIcons.ts`: tipos, etiquetas, colores y trazos de Material Symbols (Apache 2.0, extraídos de la fuente Material Symbols Rounded). `MapCanvas` pide los puntos en `onMoveEnd` (con espera corta y descartando respuestas viejas) y los pinta con una fuente GeoJSON de MapLibre con `cluster: true` (círculo con número) y una capa de símbolos con imágenes de pin por tipo dibujadas en un lienzo (`styleimagemissing`). Por debajo de `NEARBY_MIN_ZOOM` no pide nada; desde `POI_MIN_ZOOM` pide también los puntos útiles. Los destinos recomendados siguen siendo `Marker` de React (numerados, con icono por tipo y `role="img"` + `aria-label`). Leyenda `<details>` con icono + color + texto y el recuento de lo visible; tocar un punto muestra su nombre en un cuadro `role="status"`.
- **Ubicación en tiempo real:** `src/data/livePosition.ts` (`useLivePosition`) usa `watchPosition` solo si la ubicación de la búsqueda vino del GPS o el permiso ya está concedido (nunca abre el aviso de permiso por su cuenta), limita las actualizaciones (`LIVE_MIN_INTERVAL_MS`, `LIVE_MIN_MOVE_M`) y hace `clearWatch` al desmontar. La posición se queda en el navegador. En Resultados, si la persona se aleja más de `LIVE_OFFER_DISTANCE_M` del origen, aparece el botón «Buscar desde aquí» (no se recalcula solo).

**Stack:** el del bloque M; sin dependencias nuevas (los clusters son de MapLibre).

## Restricciones globales (C2)
- Solo estos ficheros. Back: `app/api/services/map_points.py` (nuevo), la función del endpoint en `main.py` (+1 línea en `lifespan` para validar `map.yaml`), un método **nuevo** en `repository.py`, los modelos nuevos en `schemas.py`, `app/config/map.yaml` (nuevo) y su fila en `app/config/README.md`, pruebas nuevas, `tests/test_contract.py` (la ruta nueva) y `tests/mini_data.py` (solo filas añadidas). Front: componentes del mapa y sus pruebas, `src/data/mapPoints.ts`, `src/data/mock/mapPoints.ts`, `src/data/livePosition.ts`, `src/api/{openapi.json,schema.d.ts,types.ts}`, `src/styles/map.css`, `src/test/mapMock.tsx`, y en `Results.tsx`/`RouteView.tsx` solo el cableado (props del mapa y el botón «Buscar desde aquí»). Una constante exportada en `src/data/geolocation.ts` (`BROWSER_LOCATION_LABEL`).
- **No tocar** `geocoding.py` (rama `motor/busqueda`) ni la lógica de `/recommend` y `/route`.
- **Cambia el contrato:** `scripts/export_openapi.py`, `npm run contract`, `test_contract.py`; avisarlo en el informe.
- Privacidad: la caja del mapa nunca va a los logs; la posición en tiempo real nunca sale del navegador salvo como origen de una consulta que la persona pide.
- Código en inglés; comentarios sin tildes; textos visibles con tildes. Sin push, sin merge, sin PR.

## Foco de revisión (C2)
1. **Caja enorme o mal formada** (zoom regional, parámetros manipulados): 422 legible si está mal formada; si es grande se recorta y nunca devuelve más de `max_points`. → Task 140 `test_parse_bbox_rejects…`, `test_clip_bbox…`; Task 142 `test_map_points_bad_bbox_is_422`, `test_map_points_caps_points`.
2. **La caja no va a los logs.** → Task 142 `test_map_points_does_not_log_bbox`.
3. **Ráfaga de movimientos del mapa:** solo cuenta la última respuesta; por debajo del zoom mínimo no se pide nada. → Task 145 `nearbyRequest…`, Task 146 `descarta una respuesta vieja`.
4. **Permiso denegado o sin GPS:** la app sigue con la ubicación escrita, sin errores ni avisos de permiso inesperados; al salir del mapa se para el seguimiento. → Task 148 `no pide permiso si no estaba concedido`, `limpia el seguimiento al desmontar`, `si se deniega deja de seguir`.
5. **Accesibilidad:** cada tipo con icono + color + texto en la leyenda; pines con texto alternativo; axe sin violaciones. → Task 144 y 147.

---

### Task 140: C2 (1/10) · `map.yaml` y validación de la caja

**Rol:** Motor · **Servicio:** `app/api/`

**Ficheros:** Crear `app/config/map.yaml`, `app/api/services/map_points.py`, `app/api/tests/services/test_map_points.py`. Modificar `app/config/README.md` (una fila).

**Interfaces:**
- `map.yaml`: `own_criterion: true`, `max_span_deg` (0.3), `max_points` (1500), `pool_activity` (`swim`).
- `services/map_points.py` → `class InvalidBbox(ValueError)`, `validate_map_config(cfg) -> None` (ValueError si falta o no es positivo), `parse_bbox(text: str) -> tuple[float, float, float, float]`, `clip_bbox(bbox, max_span) -> tuple[bbox, bool]`.

- [ ] **Paso 1: pruebas que fallan** (`tests/services/test_map_points.py`): `test_parse_bbox_reads_four_numbers` (`"-3.75,40.29,-3.70,40.32"` → tupla), `test_parse_bbox_rejects_bad_text` (`"a,b,c,d"`, `"1,2,3"`, `"nan,0,1,1"`, oeste ≥ este, sur ≥ norte, lat > 90 → `InvalidBbox`), `test_clip_bbox_keeps_small_box` (igual y `False`), `test_clip_bbox_centres_big_box` (0,0,1,1 con 0.3 → 0.35,0.35,0.65,0.65 y `True`), `test_validate_map_config_needs_positive_values`, `test_shipped_map_config_is_valid` (lee `settings.load("map")`).
Run: `cd app/api && .venv/bin/pytest tests/services/test_map_points.py -q` · Esperado: FAIL (no existe el módulo).
- [ ] **Paso 2: implementación** mínima de las cuatro funciones y `map.yaml`. Run lo mismo · Esperado: PASS.
- [ ] **Paso 3: commit** `Motor: map.yaml y validacion de la caja del mapa (Task 140)`.

**Terminado cuando:** las pruebas pasan y `map.yaml` está en el README de config.

### Task 141: C2 (2/10) · `Repository.map_points`

**Rol:** Motor · **Servicio:** `app/api/`

**Ficheros:** Modificar `app/api/repository.py` (método nuevo), `app/api/tests/mini_data.py` (una piscina: destino `facility` con actividad `swim`), `app/api/tests/test_repository.py` (pruebas nuevas).

**Interfaces:** `Repository.map_points(bbox, destination_kinds, poi_kinds, limit, pool_activity) -> list[tuple(id, kind, name, source, working, lon, lat)]`, ordenados por cercanía al centro de la caja (distancia equirectangular) y después por id; `limit + 1` filas para que el servicio sepa si hay más. `required=True` (sin base → `DataUnavailable`).

- [ ] **Paso 1: pruebas que fallan:** `test_map_points_filters_by_box_and_kind`, `test_map_points_marks_pools`, `test_map_points_includes_out_of_service_fountains` (con `working False`), `test_map_points_orders_by_centre_and_limits`, `test_map_points_without_db_is_unavailable`. Run: `.venv/bin/pytest tests/test_repository.py -q -k map_points` · Esperado: FAIL (`AttributeError`).
- [ ] **Paso 2: implementación** (una consulta con `UNION ALL`; listas vacías de tipos no consultan esa tabla). Esperado: PASS, y el resto de `test_repository.py` sigue en verde.
- [ ] **Paso 3: commit** `Motor: Repository.map_points para el mapa (Task 141)`.

**Terminado cuando:** pruebas en verde sin cambiar métodos existentes.

### Task 142: C2 (3/10) · `GET /map/points` y contrato

**Rol:** Motor · **Servicio:** `app/api/` (+ `app/frontend/src/api/openapi.json`)

**Ficheros:** Modificar `schemas.py` (modelos nuevos), `services/map_points.py` (`map_points()`), `main.py` (endpoint + validación en `lifespan`), `tests/test_contract.py` (ruta nueva). Crear `tests/test_map_points_endpoint.py`. Regenerar `app/frontend/src/api/openapi.json`.

**Interfaces:**
- `MapPointKind = Literal["facility", "pool", "park", "recreation_area", "trail", "bathing_area", "fountain", "bench", "aed", "dog_area", "playground"]`; `MapPoint {id, kind, name: str | None, coordinate: Coordinate, working: bool | None, source}`; `MapPointsResponse {points, truncated, clipped}`.
- `GET /map/points?bbox=<o,s,e,n>&kinds=<k>&kinds=…` (por defecto, los tipos de destino). 422 si la caja está mal; 503 sin datos.
- `services.map_points.map_points(bbox_text, kinds, repo, cfg) -> MapPointsResponse`.

- [ ] **Paso 1: pruebas que fallan** (con `build_mini_data` y `GOMAD_DATA_DIR` como en `test_endpoints.py`): `test_map_points_returns_destinations_by_default`, `test_map_points_kinds_select_pois`, `test_map_points_bad_bbox_is_422`, `test_map_points_clips_big_box`, `test_map_points_caps_points` (config con `max_points: 2` → 2 puntos y `truncated`), `test_map_points_does_not_log_bbox` (caplog sin los números de la caja), `test_map_points_real_data_latency` (`slow`: Getafe a zoom 15, < 0,5 s). En `test_contract.py`, `("get", "/map/points")` en `ROUTES`. Run · Esperado: FAIL (404 / ruta ausente).
- [ ] **Paso 2: implementación;** `scripts/export_openapi.py`. Run: `.venv/bin/pytest -m "not slow" -q` · Esperado: todo PASS (incluido `test_versioned_openapi_is_up_to_date`).
- [ ] **Paso 3: commit** `Motor: GET /map/points con caja recortada y tope de puntos (Task 142)`.

**Terminado cuando:** endpoint con pruebas, contrato exportado, ninguna prueba previa rota.

### Task 143: C2 (4/10) · Tipos del contrato y `getMapPoints` en el front

**Rol:** Front · **Servicio:** `app/frontend/`

**Ficheros:** Regenerar `src/api/schema.d.ts` (`npm run contract`); modificar `src/api/types.ts` (alias `MapPoint`, `MapPointsResponse`, `MapPointKind`); crear `src/data/mapPoints.ts`, `src/data/mock/mapPoints.ts`; pruebas en `src/test/data.test.ts`.

**Interfaces:** `type Bbox = [number, number, number, number]`; `getMapPoints(bbox: Bbox, kinds: MapPointKind[]): Promise<MapPointsResponse>` → `GET /api/map/points?bbox=…&kinds=…` (en pruebas, `mapPointsMock`: los puntos de ejemplo dentro de la caja y de esos tipos).

- [ ] **Paso 1: prueba que falla:** `getMapPoints filtra los de ejemplo por caja y tipo`; `getMapPoints pide /api/map/points con la caja y los tipos` (modo `production` con `vi.stubEnv` y `fetch` simulado). Run: `npx vitest run src/test/data.test.ts` · Esperado: FAIL.
- [ ] **Paso 2: implementación.** Esperado: PASS; `npx tsc -b` sin errores.
- [ ] **Paso 3: commit** `Front: tipos de /map/points y getMapPoints (Task 143)`.

**Terminado cuando:** pruebas y `tsc` en verde.

### Task 144: C2 (5/10) · Iconos por tipo y pines con texto alternativo

**Rol:** Front · **Servicio:** `app/frontend/`

**Ficheros:** Crear `src/components/mapIcons.ts`, `src/components/MapPin.tsx`, `src/test/MapPins.test.tsx`. Modificar `MapView.tsx` (`MapMarker.kind?`), `MapCanvas.tsx` (marcadores con `MapPin`), `src/styles/map.css`, `Results.tsx` y `RouteView.tsx` (pasan `kind`).

**Interfaces:** `KIND_STYLES: Record<MapPointKind, {label: string; color: string; path: string}>` (`label` en español: «Instalación deportiva», «Piscina», «Parque», «Área recreativa», «Senda», «Zona de baño», «Fuente», «Banco», «Desfibrilador», «Área canina», «Juegos infantiles»); `OUT_OF_SERVICE_COLOR`; `destinationKind(type, activity?) -> MapPointKind`; `MapPin({kind, number?, selected?, label})` → `<span className="map-marker map-marker--<kind>[ map-marker--selected]" role="img" aria-label=…><svg aria-hidden>…</svg>{number}</span>`.

- [ ] **Paso 1: pruebas que fallan:** `cada tipo tiene etiqueta, color con contraste >= 3:1 frente al blanco y trazo`, `el pin lleva el icono de su tipo y un texto alternativo con numero, nombre y tipo`, `el seleccionado lo dice en su texto alternativo`, `destinationKind da piscina a una instalacion de nadar`. Run: `npx vitest run src/test/MapPins.test.tsx` · Esperado: FAIL.
- [ ] **Paso 2: implementación;** los marcadores conservan `.map-marker`, `.map-marker--selected` y el número como texto (las pruebas de Tasks 65–67 siguen igual). Esperado: PASS y `npm test` sin fallos nuevos.
- [ ] **Paso 3: commit** `Front: pines con icono por tipo y texto alternativo (Task 144)`.

**Terminado cuando:** pruebas en verde; el pin seleccionado sigue sincronizado (MapSync).

### Task 145: C2 (6/10) · Qué pedir según el zoom

**Rol:** Front · **Servicio:** `app/frontend/`

**Ficheros:** Modificar `src/components/mapUtils.ts`; pruebas en `src/test/MapNearby.test.tsx` (nuevo).

**Interfaces:** `NEARBY_MIN_ZOOM = 13`, `POI_MIN_ZOOM = 15`, `NEARBY_DEBOUNCE_MS = 300` (criterio propio, documentados); `nearbyRequest(zoom, bounds) -> {bbox, kinds} | null`; `nearbyFeatures(points, excludeIds) -> FeatureCollection` (propiedades `id`, `kind`, `name`, `icon` = `pin-<kind>` o `pin-off` si `working === false`).

- [ ] **Paso 1: pruebas que fallan:** `por debajo del zoom minimo no pide nada`, `entre los dos zooms pide solo destinos`, `de cerca pide tambien fuentes, bancos, desfibriladores, areas caninas y juegos`, `quita los destinos ya numerados y marca las fuentes fuera de servicio`. Esperado: FAIL → PASS tras implementar.
- [ ] **Paso 2: commit** `Front: puntos del mapa segun el zoom (Task 145)`.

**Terminado cuando:** pruebas en verde.

### Task 146: C2 (7/10) · Capa de puntos cercanos con clusters

**Rol:** Front · **Servicio:** `app/frontend/`

**Ficheros:** Modificar `src/components/MapCanvas.tsx`, `MapView.tsx` (prop `explore?: boolean`), `src/test/mapMock.tsx` (el `Map` simulado guarda `onMoveEnd`/`onClick`; `Source` expone `data-cluster` y el número de elementos), `Results.tsx`/`RouteView.tsx` (`explore`); pruebas en `src/test/MapNearby.test.tsx`.

**Interfaces:** con `explore`, `onMoveEnd` y `onLoad` → `nearbyRequest` → `getMapPoints` tras `NEARBY_DEBOUNCE_MS`; respuestas viejas descartadas por contador. Fuente `nearby` (`cluster: true`, `clusterMaxZoom: 16`, `clusterRadius: 44`) con capas `nearby-clusters` (círculo), `nearby-count` (número) y `nearby-points` (símbolo `icon-image: ["get", "icon"]`). Imágenes de pin dibujadas con `Path2D` al saltar `styleimagemissing`. Pulsar un punto → cuadro `role="status"` con «Tipo: nombre» (y «fuera de servicio»); pulsar un grupo → acerca dos niveles.

- [ ] **Paso 1: pruebas que fallan:** `al mover el mapa a zoom cercano pide y pinta los puntos de la zona`, `a poco zoom no pide puntos`, `descarta una respuesta vieja`, `sin explore no pide nada`, `pulsar un punto muestra su nombre y tipo`, `pulsar un grupo acerca el mapa`. Esperado: FAIL → PASS.
- [ ] **Paso 2: commit** `Front: destinos y puntos utiles de la zona visible con clusters (Task 146)`.

**Terminado cuando:** pruebas en verde; Resultados y Ruta exploran.

### Task 147: C2 (8/10) · Leyenda accesible

**Rol:** Front · **Servicio:** `app/frontend/`

**Ficheros:** Crear `src/components/MapLegend.tsx`; modificar `MapCanvas.tsx`, `src/styles/map.css`; pruebas en `src/test/MapNearby.test.tsx`.

**Interfaces:** `MapLegend({kinds, counts, zoom, live, truncated})` → `<details className="map-legend"><summary>Leyenda</summary><ul role="list">…</ul><p>…</p></details>`: una fila por tipo presente (icono + color + texto + recuento), «Estás aquí» si hay posición en vivo, «Fuera de servicio» si hay alguno, y la pista «Acerca el mapa para ver lugares de la zona» / «Acerca más para ver fuentes, bancos y desfibriladores» / «Hay más lugares: acerca el mapa» según el caso.

- [ ] **Paso 1: pruebas que fallan:** `la leyenda lista los tipos visibles con texto y recuento`, `la leyenda pide acercar el mapa a poco zoom`, `axe sin violaciones con puntos y leyenda`. Esperado: FAIL → PASS.
- [ ] **Paso 2: commit** `Front: leyenda accesible del mapa (Task 147)`.

**Terminado cuando:** pruebas y axe en verde.

### Task 148: C2 (9/10) · `useLivePosition`

**Rol:** Front · **Servicio:** `app/frontend/`

**Ficheros:** Crear `src/data/livePosition.ts`, `src/test/livePosition.test.tsx`; modificar `src/data/geolocation.ts` (solo exportar `BROWSER_LOCATION_LABEL` y usarla).

**Interfaces:** `LIVE_MIN_INTERVAL_MS = 5000`, `LIVE_MIN_MOVE_M = 15`, `LIVE_OFFER_DISTANCE_M = 300` (criterio propio); `distanceM(a, b)`; `useLivePosition({ fromBrowser }) -> Coordinate | null`.

- [ ] **Paso 1: pruebas que fallan** (geolocalización y permisos simulados, temporizadores falsos): `con ubicacion del GPS sigue la posicion`, `con permiso concedido sigue aunque la ubicacion sea escrita`, `no pide permiso si no estaba concedido`, `no actualiza por movimientos pequenos ni antes del intervalo`, `limpia el seguimiento al desmontar`, `si se deniega deja de seguir`, `sin HTTPS no sigue`. Esperado: FAIL → PASS.
- [ ] **Paso 2: commit** `Front: ubicacion en tiempo real mientras el mapa esta abierto (Task 148)`.

**Terminado cuando:** pruebas en verde; ninguna llamada de red.

### Task 149: C2 (10/10) · «Estás aquí» en el mapa y «Buscar desde aquí»

**Rol:** Front · **Servicio:** `app/frontend/` (+ docs)

**Ficheros:** Modificar `MapView.tsx` (prop `live?: Coordinate | null`, también en el esquema), `MapCanvas.tsx` (marcador `map-marker--live`, fuera del encuadre), `Results.tsx` (hook + botón), `RouteView.tsx` (hook), `src/styles/map.css`; pruebas en `src/test/MapNearby.test.tsx` y `src/test/MapSync.test.tsx`. Docs: `app/frontend/docs/pendientes.md` (nota corta), `CLAUDE.md` §3.1/§6 (endpoint nuevo, mínimo).

- [ ] **Paso 1: pruebas que fallan:** `dibuja Estas aqui sin reencuadrar`, `en Resultados ofrece buscar desde aqui al alejarse y no recalcula solo`, `buscar desde aqui cambia el origen y recalcula`. Esperado: FAIL → PASS.
- [ ] **Paso 2: verificación completa:** `cd app/api && .venv/bin/pytest -m "not slow" -q` y `-m slow`; `cd app/frontend && npm test && npm run build && npm run lint`. Esperado: verde salvo los fallos que ya había en `main` (anotados en el ledger).
- [ ] **Paso 3: commit** `Front: Estas aqui en tiempo real y buscar desde aqui (Task 149)`.

**Terminado cuando:** las tres peticiones del equipo funcionan con pruebas; informe con contrato cambiado y qué desplegar (imágenes `api` y `frontend`, sin datos nuevos).
