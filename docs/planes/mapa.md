# Bloque M — Mapa MapLibre sincronizado con la lista (Tasks 65–67)

> **Para agentes:** SUB-SKILL OBLIGATORIA: `superpowers:executing-plans` (o `superpowers:subagent-driven-development`) con **este** fichero. Su ledger es `.superpowers/sdd/mapa/progress.md`, no el del plan general. Los pasos usan casillas (`- [ ]`).

> Detallado el 16/10 con `superpowers:writing-plans` (rama `front/mapa`). **Especificación:** ficha del bloque M en `docs/trabajo-paralelo.md` §3, fila V-F1 de `docs/plan-implementacion.md` («Mapa MapLibre sincronizado con la lista (RF-11); la lista es el equivalente completo»; prueba «seleccionar tarjeta cambia el marcador activo»), CLAUDE.md §2 (2.10 accesibilidad, 2.11 licencias) y `app/frontend/docs/guia.md`.

**Objetivo:** sustituir el esquema SVG de `MapView.tsx` por un mapa real de MapLibre (react-map-gl) con teselas de OpenFreeMap, con la misma interfaz, la ruta de la pantalla Ruta dibujada encima y la selección sincronizada entre tarjetas y marcadores en Resultados.

**Arquitectura:** `MapView.tsx` conserva su interfaz (`markers`, `selectedId`, `origin`, `route`, `secondaryRoute`, `className`) y añade `onSelect`. Decide qué pintar: si el navegador tiene WebGL, carga **en diferido** (`React.lazy`) `MapCanvas.tsx`, que es el único módulo que importa `maplibre-gl` y `react-map-gl/maplibre` (así MapLibre, ~800 KB, no entra en el paquete inicial); si no hay WebGL, si MapLibre falla (límite de error) o mientras carga, pinta el esquema SVG actual. jsdom no tiene WebGL (`setupTests.ts` devuelve `null` en `getContext`), así que las pruebas de las demás pantallas siguen viendo el esquema sin cambiar nada; las pruebas del mapa simulan `react-map-gl/maplibre`. El mapa entero sigue `aria-hidden` y fuera del orden de tabulación: la lista es el equivalente completo (RF-11).

**Stack:** React 19, TypeScript 6, Vite 8, Vitest 4 + Testing Library + vitest-axe · `maplibre-gl@5.24.0` · `react-map-gl@8.1.3` (entrada `react-map-gl/maplibre`).

## Restricciones globales

- Código en inglés; comentarios en español **sin tildes**; textos visibles en español **con tildes** (CLAUDE.md §2.1).
- **Solo los ficheros del bloque M** (`docs/trabajo-paralelo.md` §3): `src/components/MapView.tsx`, `src/styles/map.css` (nuevo), `package.json`/`package-lock.json` (solo `maplibre-gl` y `react-map-gl`), las pruebas del mapa. Nuevos y solo del mapa: `src/components/MapCanvas.tsx`, `src/components/MapView.test.tsx`, `src/components/MapSync.test.tsx`. En `Results.tsx`, solo el cableado de la selección (Task 67), avisando a F.
- Sin cambios de contrato (`schemas.py`, `openapi.json`, `src/api/*`).
- Teselas de **OpenFreeMap** (decidido 16/10): estilo `https://tiles.openfreemap.org/styles/liberty`, sin clave. Atribución visible: «© OpenStreetMap · OpenFreeMap» (CLAUDE.md §2.11; ODbL). El PMTiles local es del lunes (L-4), fuera de este bloque.
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

Run: `npm install maplibre-gl@5.24.0 react-map-gl@8.1.3 --save-exact` y después `npm ci`.
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
