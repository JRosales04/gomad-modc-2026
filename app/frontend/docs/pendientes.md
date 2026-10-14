# Frontend — pendientes

**Fecha:** 14/10/2026 · **Para:** la persona que programa el front. Lista de trabajo ordenada; el detalle de cada punto está en `guia.md` (desajustes D1–D17, pasos 0–8) y `pantallas.md` (cada pantalla).

**Decisiones del 14/10:** se mantienen React 19 / Vite 8 / TypeScript 6 y se corrige lo que esté mal · barra de navegación inferior · iconos con Google Material Symbols desde un fichero de fuente propio (**aplazado**) · la parte de API, en la **siguiente sesión**.

Marcar `[x]` al terminar. Cada punto dice cuándo está hecho.

---

## A. Ahora (no depende de la API)

### A1. Despliegue y base técnica
- [ ] **Dockerfile multi-stage + `.dockerignore`** (🔴 D1). El actual copia `dist/` local y falla en un clon limpio. Texto listo en `guia.md` §3, paso 0, punto 7 (comprobado con `docker build`). Avisar a Motor antes de fusionar.
  *Hecho cuando:* `cd app/deploy && docker compose build frontend` funciona sin `dist/`.
- [ ] **Node ≥ 20.19 en local** (mejor 22 LTS). Vite 8 no arranca con Node 18.
  *Hecho cuando:* `node -v` ≥ 20.19 y `npm run dev` arranca.
- [ ] **Vitest + axe** y script `"test": "vitest run"` (🟠 D6). Configuración en `guia.md` §3, paso 0, puntos 2–4.
  *Hecho cuando:* `npm test` pasa con la prueba base (un `h1` y axe sin violaciones).
- [ ] **README del servicio** con cómo arrancar y probar (🟡 D17). El actual es el de la plantilla.

### A2. Navegación
- [ ] **React Router 7** con una URL por pantalla (🔴 D3). Rutas en `guia.md` §3, paso 0, punto 5. Las pantallas que no existan: página «Próximamente» con su `h1`.
  *Hecho cuando:* el «atrás» del móvil vuelve de Resultados a Inicio y recargar `/resultados` no da 404 (Caddy ya hace `try_files`).
- [ ] **Al cambiar de pantalla:** `document.title` y foco al `h1` (🟠 D8). Hoy solo `window.scrollTo` (`App.tsx:17`).
- [ ] **Barra de navegación inferior** (decidida). Especificación en `pantallas.md` §9.1: `nav aria-label="Principal"`, texto visible en cada destino, `aria-current` según la pantalla, ≥ 44 px, `safe-area-inset-bottom`, `padding-bottom` en `main`, convivencia con la hoja inferior de Resultados, quitar la hamburguesa (`Header.tsx:23,43-52`, `main.css:152-181`).
  *Hecho cuando:* en 375 px de ancho la barra está siempre visible, no tapa contenido y se recorre con teclado; en ≥ 768 px la navegación va arriba.

### A3. Privacidad
- [ ] **Figtree desde nuestro servidor** (🟠 D4): quitar `index.html:10-14`, `.woff2` en `public/fonts/` con su licencia OFL y `@font-face` en `main.css` (`guia.md` §3, paso 0, punto 6).
  *Hecho cuando:* `grep -rn "googleapis\|gstatic" index.html src` no devuelve nada y la pestaña Red no muestra peticiones a terceros.

### A4. Accesibilidad de lo que ya existe
- [ ] Resultados como `ul`/`ol` > `li` (`Results.tsx:200-202`).
- [ ] Nota accesible «Nota 8,7 sobre 10, muy buena opción» (`Results.tsx:224-231`).
- [ ] Región `aria-live="polite"` presente desde el primer render en Resultados.
- [ ] Chips de filtro a 44 px de alto (`main.css:633`, hoy 40 px).
- [ ] Veredicto a ≥ 14 px (`main.css:737`, hoy 11 px).
- [ ] Asa de la hoja inferior con contraste ≥ 3:1 (`main.css:580`, hoy 1,28:1).
- [ ] Filtros: o se quitan, o llevan `aria-pressed` y hacen algo (`Results.tsx:79-113`; P-03 en `pantallas.md`).
  *Hecho cuando:* checklist de `guia.md` §5 (parte de accesibilidad) cumplido en Inicio y Resultados.

### A5. Contenido y datos de ejemplo
- [ ] **Aviso «no es consejo médico» en todas las pantallas** con recomendaciones, no solo en Inicio (`App.tsx:46-55`), y enlace a «Fuentes y aviso» en el pie.
- [ ] **Datos de ejemplo con nombres ficticios** marcados «(ejemplo)» en vez de parques reales de Getafe con notas inventadas (`Results.tsx:18,31,44`).
- [ ] **`h1` de Inicio no fijo** (`Hero.tsx:75`): «Hoy es un gran día para moverte» contradice a Carmen con 36 °C. Mientras no haya datos, un `h1` neutro (P-01).
- [ ] **Actividad por `id`**, no por etiqueta; «Sorpréndeme» = sin actividad (`null`), no la cadena «Sorpréndeme» (`Home.tsx:29,43`, `Results.tsx:57-60`).
- [ ] **Logo** de 516 KB → WebP o SVG < 50 KB, con `width`/`height` (`public/images/logo.png`).

### A6. Pantallas que faltan, maquetadas con datos de ejemplo
Se pueden maquetar ya con datos de ejemplo **con la forma del contrato** (campos en `pantallas.md`), para conectarlas a la API en la siguiente sesión sin rehacerlas.
- [ ] Estados de Resultados: cargando, error con «Reintentar», vacío con «Ajustar preferencias», `warnings`, «Alternativa cubierta» (`pantallas.md` §2).
- [ ] Perfil / preferencias como hoja o diálogo desde «Ajustar» (`Home.tsx:59`) y desde «Perfil» (`pantallas.md` §6).
- [ ] Detalle «¿Por qué te recomendamos este lugar?» (`pantallas.md` §3).
- [ ] Municipio (`pantallas.md` §5).
- [ ] Ruta (`pantallas.md` §4), sin mapa real todavía.
- [ ] Fuentes y aviso (`pantallas.md` §8).
- [ ] Asistente (`pantallas.md` §7). Último: es el primer recorte.
  *Hecho cuando:* cada pantalla tiene un `h1`, pasa axe y cumple la parte de accesibilidad de su sección.

---

## B. Siguiente sesión — parte de API

Depende de que el contrato (Task 11) esté en `main`: `app/frontend/src/api/openapi.json` lo genera y versiona Motor; **no crearlo a mano**.
- [ ] Tipos con `openapi-typescript` por `npx` (`guia.md` §4.2), cliente (`/api`), MSW (`guia.md` §4.3), TanStack Query.
- [ ] Proxy de `/api` en `vite.config.ts` para desarrollo (`guia.md` §3, paso 0, punto 3).
- [ ] Ubicación: GPS tras un gesto y búsqueda con `/location`; **nunca** en `localStorage`, URL ni título.
- [ ] Conectar Inicio, Resultados, Detalle, Perfil, Ruta, Municipio, Fuentes y Asistente a sus endpoints.
- [ ] Mapa con react-map-gl + MapLibre sincronizado con la lista.
- [ ] Preguntas que bloquean esta parte: P-01 a P-11 (`pantallas.md` §10) y Q-05 a Q-13 (`guia.md` §6).

---

## C. Aplazado

- [ ] **Iconos:** Google Material Symbols con un fichero `.woff`/`.woff2` propio en `public/fonts/` (sin pedir nada a Google), `@font-face` y clase en `icons.css`. Decidir si se recorta (el `.woff2` completo de Rounded pesa 5,4 MB). Mientras tanto, solo **cerrar el comentario de `icons.css:1`**, que está abierto. Cuando lleguen: icono + color + texto en cada indicador y en la barra inferior.
- [ ] Variables de tema oscuro en `main.css` (🟡 D11; el modo oscuro en sí está fuera del MVP).

---

## D. Con otros roles

- [ ] **Primer despliegue HTTPS (vie 16, con Motor):** necesita A1 (Dockerfile). `guia.md` §3, paso 5.
- [ ] **Validar con la maquetadora** las secciones «Validar con la maquetadora» de `pantallas.md`, empezando por Inicio, Resultados y la barra inferior.
- [ ] **Accesibilidad final (lun 19):** `a11y-architect`, teclado y lector de pantalla en el flujo principal (`guia.md` §3, paso 8).
