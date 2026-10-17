# Frontend — pendientes

**Fecha:** 14/10/2026 · **Para:** la persona que programa el front. Lista de trabajo ordenada; el detalle de cada punto está en `guia.md` (desajustes D1–D17, pasos 0–8) y `pantallas.md` (cada pantalla).

**Paso 1 hecho el 15/10** (rama `front/jue15-todas-pantallas`): todas las pantallas con datos de ejemplo; decisiones en `pantallas.md`, «Decisiones tomadas al construir (15/10)». Queda el paso 2 (Docker y VM) y el paso 3 (API, mapa, GPS).

**Decisiones del 14/10:** se mantienen React 19 / Vite 8 / TypeScript 6 y se corrige lo que esté mal · barra de navegación inferior · iconos con Google Material Symbols desde un fichero de fuente propio (**aplazado**) · la parte de API, en la **siguiente sesión**.

Marcar `[x]` al terminar. Cada punto dice cuándo está hecho.

---

## A. Ahora (no depende de la API)

### A1. Despliegue y base técnica
- [x] **Dockerfile multi-stage + `.dockerignore`** (🔴 D1). Avisar a Motor antes de fusionar. *(15/10, paso 2: `node:22.23.3-alpine` + `caddy:2.8.4`; `npm ci` funciona con su npm 10.9.9 sin tocar el lock. Comprobado sin `dist/` local: `docker compose build frontend` en 13 s, imagen de 71,2 MB con solo `/srv/web`; `/`, rutas profundas e inexistentes → 200 con el mismo `index.html`, `/assets/…` y `/fonts/…` con su tipo, `/api/health` → `{"status":"ok"}`.)*
  *Hecho cuando:* `cd app/deploy && docker compose build frontend` funciona sin `dist/`.
- [x] **Node ≥ 20.19 en local** (mejor 22 LTS). Vite 8 no arranca con Node 18. *(15/10: Node 20.20.2; ojo, su npm 10.8.2 falla al instalar vitest: usar `npx npm@11 install`.)*
  *Hecho cuando:* `node -v` ≥ 20.19 y `npm run dev` arranca.
- [x] **Vitest + axe** y script `"test": "vitest run"` (🟠 D6). Configuración en `guia.md` §3, paso 0, puntos 2–4.
  *Hecho cuando:* `npm test` pasa con la prueba base (un `h1` y axe sin violaciones).
- [x] **README del servicio** con cómo arrancar y probar (🟡 D17). El actual es el de la plantilla.

- [ ] **`try_files` también responde a assets inexistentes:** `/assets/nope.js` → 200 con el `index.html` (no 404), porque el `Caddyfile` manda todo a `/index.html`. No rompe la SPA, pero un JS perdido tras un despliegue da un error de MIME confuso en vez de un 404. Si se arregla: `handle /assets/*` con `file_server` sin `try_files`. *(Visto en la verificación del paso 2, 15/10; no se toca el `Caddyfile` en este paso.)*

### A2. Navegación
- [x] **React Router 7** con una URL por pantalla (🔴 D3). Rutas en `guia.md` §3, paso 0, punto 5. Las pantallas que no existan: página «Próximamente» con su `h1`. *(todas las pantallas existen; 404 con su `h1`.)*
  *Hecho cuando:* el «atrás» del móvil vuelve de Resultados a Inicio y recargar `/resultados` no da 404 (Caddy ya hace `try_files`).
- [x] **Al cambiar de pantalla:** `document.title` y foco al `h1` (🟠 D8). Hoy solo `window.scrollTo` (`App.tsx:17`).
- [x] **Barra de navegación inferior** (decidida). Especificación en `pantallas.md` §9.1: `nav aria-label="Principal"`, texto visible en cada destino, `aria-current` según la pantalla, ≥ 44 px, `safe-area-inset-bottom`, `padding-bottom` en `main`, convivencia con la hoja inferior de Resultados, quitar la hamburguesa (`Header.tsx:23,43-52`, `main.css:152-181`).
  *Hecho cuando:* en 375 px de ancho la barra está siempre visible, no tapa contenido y se recorre con teclado; en ≥ 768 px la navegación va arriba.

### A3. Privacidad
- [x] **Figtree desde nuestro servidor** (🟠 D4): quitar `index.html:10-14`, `.woff2` en `public/fonts/` con su licencia OFL y `@font-face` en `main.css` (`guia.md` §3, paso 0, punto 6).
  *Hecho cuando:* `grep -rn "googleapis\|gstatic" index.html src` no devuelve nada y la pestaña Red no muestra peticiones a terceros.

### A4. Accesibilidad de lo que ya existe
- [x] Resultados como `ul`/`ol` > `li` (`Results.tsx:200-202`).
- [x] Nota accesible «Nota 8,7 sobre 10, muy buena opción» (`Results.tsx:224-231`).
- [x] Región `aria-live="polite"` presente desde el primer render en Resultados.
- [x] Chips de filtro a 44 px de alto (`main.css:633`, hoy 40 px).
- [x] Veredicto a ≥ 14 px (`main.css:737`, hoy 11 px).
- [x] Asa de la hoja inferior con contraste ≥ 3:1 (`main.css:580`, hoy 1,28:1).
- [x] Filtros: o se quitan, o llevan `aria-pressed` y hacen algo (`Results.tsx:79-113`; P-03 en `pantallas.md`).
  *Hecho cuando:* checklist de `guia.md` §5 (parte de accesibilidad) cumplido en Inicio y Resultados.

### A5. Contenido y datos de ejemplo
- [x] **Aviso «no es consejo médico» en todas las pantallas** con recomendaciones, no solo en Inicio (`App.tsx:46-55`), y enlace a «Fuentes y aviso» en el pie.
- [x] **Datos de ejemplo con nombres ficticios** marcados «(ejemplo)» en vez de parques reales de Getafe con notas inventadas (`Results.tsx:18,31,44`).
- [x] **`h1` de Inicio no fijo** (`Hero.tsx:75`): «Hoy es un gran día para moverte» contradice a Carmen con 36 °C. Mientras no haya datos, un `h1` neutro (P-01).
- [x] **Actividad por `id`**, no por etiqueta; «Sorpréndeme» = sin actividad (`null`), no la cadena «Sorpréndeme» (`Home.tsx:29,43`, `Results.tsx:57-60`).
- [ ] **Logo** de 516 KB → WebP o SVG < 50 KB, con `width`/`height` (`public/images/logo.png`). *(15/10: ya lleva `width`/`height`; falta convertirlo: no hay `cwebp`, `sharp`, ImageMagick ni Pillow en el equipo. Sigue pendiente.)*

### A6. Pantallas que faltan, maquetadas con datos de ejemplo
Se pueden maquetar ya con datos de ejemplo **con la forma del contrato** (campos en `pantallas.md`), para conectarlas a la API en la siguiente sesión sin rehacerlas.
- [x] Estados de Resultados: cargando, error con «Reintentar», vacío con «Ajustar preferencias», `warnings`, «Alternativa cubierta» (`pantallas.md` §2).
- [x] Perfil / preferencias como hoja o diálogo desde «Ajustar» (`Home.tsx:59`) y desde «Perfil» (`pantallas.md` §6).
- [x] Detalle «¿Por qué te recomendamos este lugar?» (`pantallas.md` §3).
- [x] Municipio (`pantallas.md` §5).
- [x] Ruta (`pantallas.md` §4), sin mapa real todavía.
- [x] Fuentes y aviso (`pantallas.md` §8).
- [x] Asistente (`pantallas.md` §7). Último: es el primer recorte.
  *Hecho cuando:* cada pantalla tiene un `h1`, pasa axe y cumple la parte de accesibilidad de su sección.

---

## B. Siguiente sesión — parte de API

Depende de que el contrato (Task 11) esté en `main`: `app/frontend/src/api/openapi.json` lo genera y versiona Motor; **no crearlo a mano**.
- [x] Tipos con `openapi-typescript` por `npx` (`npm run contract` → `src/api/schema.d.ts`, alias en `src/api/types.ts`).
- [x] Cliente (`/api`) y, si se quiere, MSW (`guia.md` §4.3) y TanStack Query (`useAsync` de `src/data/useAsync.ts` se puede cambiar por `useQuery` sin tocar pantallas). *(16/10: `src/data/http.ts` con `getJson`/`postJson`, tiempo límite de 15 s y `ApiError(status, mensaje)`; `status` 0 = sin conexión o tiempo agotado. Sin MSW ni TanStack Query.)*
- [ ] **Sustituir el cuerpo de las funciones de `src/data/`** *(16/10, parcial: `getActivities`, `recommend`, `getRoute` y `searchLocation` ya llaman a la API; en `MODE=test` siguen con los datos de ejemplo (`src/data/mode.ts`). `getMunicipality`, `listMunicipalities`, `getSources`, `interpret` y `assistantRoute` siguen de ejemplo porque sus endpoints están en 501.)* (cada una lleva «paso 3: sustituir por la llamada real a /api/…»): `getActivities()` → `GET /api/activities`; `searchLocation(text)` → `GET /api/location?text=`; `recommend(req)` → `POST /api/recommend`; `getRoute(req)` → `POST /api/route`; `getMunicipality(ine)` → `GET /api/municipality/{ine_code}`; `listMunicipalities()` → decidir fuente (P-09); `interpret(text)` → `POST /api/assistant/interpret` (solo `text`); `assistantRoute(req)` → `POST /api/assistant/route`; `getSources()` → `GET /api/sources`. Lanzar `ApiError(status, …)` (`src/data/errors.ts`) en 404/422/5xx.
- [ ] *(16/10, parcial: quitados «· datos de ejemplo» de Resultados y el selector de escenarios de Fuentes; `src/data/mock/` y `scenarios.ts` se quedan para las pruebas y para lo que sigue en ejemplo.)* Borrar los datos de ejemplo: `src/data/mock/` (salvo `municipalities.ts` si se queda la lista estática), `src/data/scenarios.ts` y el selector «Datos de ejemplo» de `Sources.tsx`; quitar «(ejemplo)», el aviso «Cifras de ejemplo» de `Municipality.tsx` y el texto «· datos de ejemplo» del subtítulo de `Results.tsx`; `SAMPLE_GPS` de `src/data/mock/location.ts`.
- [x] Proxy de `/api` en `vite.config.ts` para desarrollo (`guia.md` §3, paso 0, punto 3).
- [x] *(16/10: `currentLocation()` → `navigator.geolocation` con mensajes si se deniega, no hay HTTPS o se está fuera de la Comunidad; municipio por contorno con `municipalityShapes.json`; la de ejemplo solo en pruebas y como respaldo en desarrollo, con su aviso.)* Ubicación: GPS tras un gesto (hoy «Usar mi ubicación» llama a `sampleLocation()` de `src/data/location.ts`, que devuelve una de ejemplo) con su mensaje si se deniega; **nunca** en `localStorage`, URL ni título. Quitar también `isSampleLocation()` y su aviso «Es una ubicación de ejemplo» en `LocationPicker.tsx`.
- [ ] Conectar Inicio, Resultados, Detalle, Perfil, Ruta, Municipio, Fuentes y Asistente a sus endpoints.
- [ ] Mapa con react-map-gl + MapLibre sincronizado con la lista: sustituir el interior de `src/components/MapView.tsx` (misma interfaz: `markers`, `selectedId`, `origin`, `route`, `secondaryRoute`) y añadir la selección tarjeta ↔ marcador; atribución © OpenStreetMap y decir en Fuentes quién sirve las teselas.
- [x] *(16/10, Task 30: contrato con `LineString`.)* **Petición a Motor:** tipar `RouteVariant.geometry` como GeoJSON `LineString` en el contrato (hoy sale `Record<string, never>`; ver `src/lib/geometry.ts`).
- [ ] Preguntas que bloquean esta parte: P-01 a P-11 (`pantallas.md` §10) y Q-05 a Q-13 (`guia.md` §6).

---

### B2. Diferido de la revisión final del paso 1 (15/10)
- [ ] **Prueba manual en móvil real** (Chrome Android y Safari iOS): tocar una tarjeta de Resultados abre el Detalle, arrastrar la hoja, Tab hasta un resultado. jsdom no puede probar los gestos.
- [ ] Probar a 320 px y con zoom al 200 % y 400 %: Resultados (hoja y mapa), cabecera del Detalle, formulario de ubicación. *(15/10: tarjetas de resultado arregladas en CSS — pastillas que se parten y nota debajo del título por debajo de 400 px —; **comprobar a 320 px en navegador**, jsdom no lo mide.)*
- [x] Mensajes de carga con `role="status"` que se insertan ya con texto (`Home.tsx`, `Municipality.tsx`, `Sources.tsx`): pasarlos a una región viva persistente. *(15/10: región `sr-only` siempre montada; Inicio también anuncia «Ahora en <municipio>: …».)*
- [ ] Asistente: descartar respuestas viejas si se pulsa dos veces y marcar la ruta como desactualizada al editar los campos; `aria-invalid`/`aria-describedby` en distancia y duración.
- [ ] Volver del Detalle a Resultados repite la petición y pierde «Ver más» (lo resuelve la caché de TanStack Query en el paso 3).
- [ ] `RouteView`: comprobar que la ruta corresponde al destino si cambia `:id` en la misma instancia.
- [x] Lista atenuada al recalcular (`opacity: 0.55`) baja el contraste mientras carga; cambiar por otro indicador. *(15/10: sin atenuar; `aria-busy` + «Actualizando…» visible.)*
- [x] `role="list"` en listas con `list-style: none` (VoiceOver); nombre «Ajustar preferencias» en los dos botones «Ajustar»; quitar CSS muerto (`.filter-chip`, `.results-filter-chips`). *(15/10)*
- [ ] Categorías del municipio como `h3`; fecha absoluta con `<time>` en Fuentes; números del mapa ilegibles (se va con MapLibre); `useAsync` escribe un ref en el render.

### B3. Corrección C2 del mapa (17/10, hecha por el agente a petición del equipo)
- [x] **Mapa explorable:** al mover o ampliar el mapa (Resultados y Ruta) se piden a `GET /api/map/points` los destinos de la zona visible desde el zoom 13 y, desde el 15, también fuentes, bancos, desfibriladores y áreas caninas; MapLibre los agrupa (clusters). Constantes en `components/mapUtils.ts`; topes de la API en `app/config/map.yaml`. Plan: `docs/planes/mapa.md`, Tasks 140–149.
- [x] **Pines por tipo** (`components/mapIcons.ts`, `MapPin.tsx`) con Material Symbols, texto alternativo y leyenda plegable (`MapLegend.tsx`); tocar un punto lo nombra en un `role="status"`.
- [x] **«Estás aquí» en tiempo real** (`data/livePosition.ts`): `watchPosition` solo si la ubicación vino del GPS o el permiso ya estaba dado; en Resultados, a más de 300 m del origen aparece «Buscar desde aquí» (no recalcula solo).

## C. Aplazado

- [ ] **Iconos:** Google Material Symbols con un fichero `.woff`/`.woff2` propio en `public/fonts/` (sin pedir nada a Google), `@font-face` y clase en `icons.css`. Decidir si se recorta (el `.woff2` completo de Rounded pesa 5,4 MB). Mientras tanto, solo **cerrar el comentario de `icons.css:1`**, que está abierto. Cuando lleguen: icono + color + texto en cada indicador y en la barra inferior. *(15/10: comentario de `icons.css` cerrado; componente `Icon` ya colocado en pastillas, actividades y categorías.)*
- [ ] Variables de tema oscuro en `main.css` (🟡 D11; el modo oscuro en sí está fuera del MVP).

---

## D. Con otros roles

- [ ] **Primer despliegue (vie 16, con Motor):** HTTP hecho con `app/deploy/deploy.sh` (paso 2; pendiente de confirmar en la VM), **HTTPS pendiente de dominio** (DEC-10). `guia.md` §3, paso 5.
- [ ] **Validar con la maquetadora** las secciones «Validar con la maquetadora» de `pantallas.md`, empezando por Inicio, Resultados y la barra inferior.
- [ ] **Accesibilidad final (lun 19):** `a11y-architect`, teclado y lector de pantalla en el flujo principal (`guia.md` §3, paso 8).
