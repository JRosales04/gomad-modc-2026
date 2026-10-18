# Ruta entre dos direcciones — plan de implementación (Tasks 179–181)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Pasos con casillas (`- [ ]`). Ledger: `.superpowers/sdd/ruta-entre-direcciones/progress.md`.

**Objetivo:** pantalla nueva y complementaria donde la persona escribe una **dirección de inicio** y una **dirección de fin** y ve la **ruta recomendada (la más verde, menos tráfico)** entre ambas, con la directa como alternativa. Hoy solo se puede pedir ruta desde la ubicación de la persona hasta un destino recomendado (`/ruta/:id`); eso **no cambia**.

**Arquitectura:** solo front. La API ya lo permite: `POST /route` recibe `origin` y `destination` como `Coordinate` (`app/api/schemas.py` `RouteRequest`) y `GET /location` geocodifica texto (`app/frontend/src/data/location.ts` `searchLocation`). Se añade:
- `src/components/AddressField.tsx`: campo de dirección con buscador (`searchLocation`) y lista de candidatos; **controlado por props** (`value`, `onChange`), **no** usa `setOrigin` ni toca el estado global. Opción «Usar mi ubicación» con `currentLocation` solo en el campo de inicio (prop opcional).
- `src/components/RouteBetween.tsx`: pantalla en la ruta `/trayecto`, con dos `AddressField` («Desde», «Hasta»), botón «Calcular ruta» y, con resultado, el mismo resumen que `RouteView` (mapa con ruta seleccionada y alternativa, selector recomendada/directa, distancia, tiempo, % verde, tráfico, desnivel «sin datos», PDI en el camino, descripción, avisos, fuentes). Llama a `getRoute` (`src/data/route.ts`) con `profile: preferences.profile` y `weights: null`.
- Entrada: enlace en `Home.tsx` junto al del asistente («Ruta entre dos direcciones») y la ruta nueva en `AppRoutes.tsx`.

**Tech stack:** React 19, TypeScript, React Router, Vitest + Testing Library + axe (`src/test/`).

**Spec:** encargo de la persona del 18/10 (no es fila de `docs/pendientes-app.md`); CLAUDE.md §2, §5 (F3, RF-12, RF-13, RF-19), §3.1 «Front».

## Global Constraints

- **Nada existente cambia de comportamiento.** `RouteView.tsx`, `LocationPicker.tsx`, `Results`, `Recommendation`, el estado global (`src/state/`) y las pruebas actuales quedan igual; las pruebas existentes siguen pasando **sin editarlas**. Cambios permitidos en ficheros existentes: solo **añadir** la `<Route path="trayecto">` en `AppRoutes.tsx` y **añadir** el enlace en `Home.tsx`. Si se quiere reutilizar marcado de `RouteView`, **no** se extrae de `RouteView` (no se refactoriza): se escribe en el componente nuevo.
- Elegir direcciones en `/trayecto` **no** modifica `origin` del estado global (la búsqueda de Inicio no debe cambiar).
- Sin cambios en `app/api` (ni `schemas.py` ni `openapi.json`); sin dependencias nuevas.
- Privacidad (CLAUDE.md §2.8): las coordenadas solo van en el cuerpo de `POST /route`; nunca en la URL ni en `localStorage`.
- Accesibilidad (CLAUDE.md §2.10): cada campo con `<label>`, lista de candidatos navegable con teclado, `role="status"` para «Calculando la ruta…», prueba `expectNoAxeViolations`. Móvil primero.
- Textos visibles en español con tildes; identificadores en inglés; comentarios sin tildes. Usar `formatDistance`, `formatMinutes`, `poiCount` y los estilos/clases ya existentes (`route-page`, `route-metrics`, `seg seg--routes`…) en lugar de CSS nuevo; CSS nuevo solo si hace falta, en el fichero de estilos existente.
- Modo de datos de ejemplo (`sampleDataMode()`) debe funcionar: `searchLocation` y `getRoute` ya tienen mock.
- Comandos desde `app/frontend`: `npm test`, `npm run lint`, `npm run build`. En este equipo (Windows) se usa la shell bash o PowerShell; no hay venv de Python implicado.

## Review Focus

1. **Inicio y fin iguales** (misma coordenada): no se llama a la API; se muestra «El inicio y el final son el mismo punto.» → `test: misma direccion no calcula ruta` (Task 180).
2. **Solo una dirección elegida**: botón «Calcular ruta» deshabilitado (o aviso) y no se llama a `getRoute` → prueba en Task 180.
3. **Ruta aproximada** (`approximate: true`, sin red peatonal): aviso visible igual que en `RouteView` → prueba en Task 180 con `getRoute` mockeado.
4. **Error de red** en `getRoute`: `ErrorMessage` con «Reintentar» → prueba en Task 180.
5. **No toca el estado global**: tras elegir direcciones en `/trayecto`, Inicio sigue sin origen (o con el que tenía) → prueba en Task 180.

---

### Task 179: `AddressField`, campo de dirección controlado

**Servicio:** `app/frontend`
**Crear:** `src/components/AddressField.tsx`, `src/test/AddressField.test.tsx`
**Produce:** `export default function AddressField(props: { label: string; value: LocationCandidate | null; onChange: (c: LocationCandidate | null) => void; allowCurrentLocation?: boolean })`

- [ ] **Step 1: tests que fallan** (`src/test/AddressField.test.tsx`), con `searchLocation` mockeado (`vi.spyOn` sobre `../data/location`):
  - escribir ≥ 3 letras muestra candidatos y elegir uno llama a `onChange` con ese candidato;
  - con `value` no nulo muestra la etiqueta elegida y un botón «Cambiar» que llama a `onChange(null)`;
  - sin `allowCurrentLocation` no aparece «Usar mi ubicación»; con él, sí;
  - error de búsqueda → mensaje «No se pudo buscar la dirección.»;
  - `expectNoAxeViolations`.
- [ ] **Step 2:** ejecutar `npx vitest run src/test/AddressField.test.tsx` → Esperado: FALLA (no existe el módulo).
- [ ] **Step 3: implementar** tomando como referencia `LocationPicker.tsx` (búsqueda con espera, estados idle/loading/done/error, prefijos de 3+ letras), pero **sin** `useAppState`. `id` con `useId`; candidatos como lista de botones.
- [ ] **Step 4:** `npx vitest run src/test/AddressField.test.tsx` → Esperado: PASA.
- [ ] **Step 5: commit** `Front: campo de dirección controlado para la ruta entre dos direcciones (Task 179)`.

### Task 180: pantalla `/trayecto`

**Servicio:** `app/frontend`
**Crear:** `src/components/RouteBetween.tsx`, `src/test/RouteBetween.test.tsx`
**Modificar (solo añadir):** `src/AppRoutes.tsx` (`<Route path="trayecto" element={<RouteBetween />} />`)

- [ ] **Step 1: tests que fallan** (`src/test/RouteBetween.test.tsx`, con `renderAt("/trayecto")` de `src/test/render.tsx`; `searchLocation` y `getRoute` mockeados cuando haga falta):
  - título h1 «Ruta entre dos direcciones», campos «Desde» y «Hasta»;
  - con las dos direcciones elegidas y «Calcular ruta», llama a `getRoute` con `{origin, destination, profile, weights: null}` y muestra la lista «Resumen de la ruta» con distancia, tiempo y «Zonas verdes»; por defecto seleccionada «Ruta recomendada»; cambiar a «Ruta directa» cambia las métricas;
  - los cinco casos de «Review Focus»;
  - `expectNoAxeViolations` con resultado en pantalla.
- [ ] **Step 2:** `npx vitest run src/test/RouteBetween.test.tsx` → Esperado: FALLA.
- [ ] **Step 3: implementar** `RouteBetween.tsx`: estado local `from`/`to` (`LocationCandidate | null`); el cálculo se lanza al pulsar el botón (no en cada tecleo); mapa `MapView` con `origin={from.coordinate}`, `route`, `secondaryRoute` y un marcador para el fin; mismo bloque de métricas, PDI, descripción, avisos y `SourceList` que `RouteView` (copiado, no extraído). Enlace «Volver» a `/`.
- [ ] **Step 4:** añadir la ruta en `AppRoutes.tsx`.
- [ ] **Step 5:** `npx vitest run src/test/RouteBetween.test.tsx` → PASA; `npm test` → todas pasan (las existentes sin tocar).
- [ ] **Step 6: commit** `Front: pantalla de ruta entre dos direcciones (Task 180)`.

### Task 181: enlace desde Inicio y verificación final

**Servicio:** `app/frontend`
**Modificar (solo añadir):** `src/components/Home.tsx`; `src/test/Home.test.tsx` (solo **añadir** un test nuevo)

- [ ] **Step 1: test que falla** en `Home.test.tsx`: existe el enlace «Ruta entre dos direcciones» con `href="/trayecto"`.
- [ ] **Step 2:** implementar el enlace junto al del asistente, con las mismas clases de panel/acción e `Icon name="route"`.
- [ ] **Step 3:** `npm test`, `npm run lint`, `npm run build` → Esperado: todo pasa sin errores.
- [ ] **Step 4: commit** `Front: enlace a la ruta entre dos direcciones desde Inicio (Task 181)`.
