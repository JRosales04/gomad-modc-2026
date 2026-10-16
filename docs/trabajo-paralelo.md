# Trabajo en paralelo hasta la demo — GoMad (16–20/10/2026)

**Para qué sirve:** repartir lo que falta en **bloques que se pueden ejecutar a la vez**, cada uno en su conversación y su rama, sin pisarse. Dice qué ficheros son de cada bloque, qué decisiones necesita y en qué orden hay que lanzarlos para tener **el MVP listo para probar** cuanto antes.

- **Escrito:** viernes 16/10/2026, madrugada. Estado de partida: `main` en `e933ae2` (PR #23).
- **Ya funciona en local:** las 9 pantallas, `/activities`, `/recommend` (con explicación), `/route` (Getafe y capital con grafo) y `/location`. Siguen en 501: `/municipality`, `/sources`, `/assistant/*`.
- **Desplegado (16/10, 11:40):** https://example.com con `main` en `5e57b33`, datos copiados y HTTPS (bloque D, pasos 1–3 ✅). Aire y previsión de la VM, los copiados (los recarga B2).

---

## 1. Cómo se trabaja en paralelo sin pisarse

1. **Un bloque = una rama = una conversación.** La rama sale de `main` actualizado y entra por PR.
2. **Cada bloque solo toca SUS ficheros** (tabla de cada bloque, «Es suyo»). Si necesita uno que es de otro bloque, se para y se avisa.
3. **Cada bloque escribe su plan en su propio fichero**, `docs/planes/<bloque>.md`, con sus Tasks numeradas en su rango (tabla del §3). Así no hay conflictos en `docs/plan-implementacion.md` y cada bloque tiene su propio ledger (`.superpowers/sdd/<bloque>/progress.md`).
4. **Ficheros compartidos** (puntos calientes): cada bloque puede tocarlos **solo en su trozo** y con cambios pequeños. Antes de abrir la PR: `git fetch && git rebase origin/main` y resolver.

| Fichero compartido | Regla |
|---|---|
| `app/api/main.py` | Cada bloque solo cambia **la función de su endpoint** (y, si hace falta, una línea en `lifespan`). Nada de reordenar ni reformatear |
| `app/api/schemas.py` + `app/frontend/src/api/openapi.json` | **El contrato.** Un solo bloque a la vez puede cambiarlo; si lo cambia: `scripts/export_openapi.py`, `npm run contract`, `test_contract.py` y avisar a los demás. Preferible no cambiarlo |
| `app/ingest/build_db.py` | Cada bloque añade **sus funciones y su tabla**; no cambia las existentes |
| `app/api/repository.py` | Cada bloque añade **métodos nuevos**; no cambia los existentes salvo B2 (caché ante caídas) |
| `app/deploy/docker-compose.yml` | Solo B2 (servicio `ingest`) y el despliegue (montar `~/.oci`, bloque D) |
| `app/config/*.yaml` | Cada bloque solo su fichero (tabla de cada bloque) |
| `app/frontend/src/data/*.ts` | Los bloques de backend cambian **solo la función de su endpoint** (sustituir datos de ejemplo por la llamada real). F no los toca |
| `app/frontend/src/components/*.tsx` | **De F.** Los bloques de backend solo pueden quitar textos de «(ejemplo)» de su pantalla, en un commit aparte y pequeño |
| `CLAUDE.md`, `docs/guia-ejecucion.md`, `docs/arquitectura.md` | Solo en el commit final de cada bloque, cambios mínimos; mejor recogerlos todos en una PR de documentación al cierre del día |

---

## 2. Orden de prioridad hacia el MVP

**Hito «MVP listo para probar»:** la app en la VM con HTTPS, se abre en el móvil, F1–F5 con datos reales y el mapa. Con eso se pueden hacer las pruebas con las personas de la demo.

| Orden | Qué | Bloque | Por qué en este orden | Cuándo |
|---|---|---|---|---|
| **0** | Desplegar lo que ya hay: arrancar la VM, copiar `app/data`, `deploy.sh`, **dominio + HTTPS** | **D (manual, tú)** | Sin HTTPS el móvil no da GPS; sin despliegue no se prueba nada fuera de tu PC | Vie mañana |
| **0** | Decisiones: ✅ DEC-09 (indicadores F5), ✅ DEC-13 (cuota AEMET), ✅ DEC-06 (calor) — cerradas el 16/10; ✅ dominio (DuckDNS), ✅ teselas (OpenFreeMap → PMTiles), ✅ hueco de Getafe (OSM filtrado) | Equipo | Bloquean B1, B2, B3 y M | Vie 12:00 |
| **1** | Vista de municipio y fuentes (F5, RF-19) | **B1** | F5 es MVP y Fuentes da la trazabilidad que puntúa en 1.1 | Vie |
| **1** | Mapa sincronizado con la lista (RF-11, Must) | **M** | Es Must y lo que más se ve en la demo | Vie |
| **1** | Diseño del front | **F** | No depende de nadie; empieza ya | Vie → dom |
| **2** | Datos vivos: recarga automática, caché ante caídas, aire futuro | **B2** | Sin esto, el aire y la previsión de la demo serán viejos | Vie → sáb |
| **2** | Calor y hueco de Getafe | **B3** | Carmen (36 °C) y nadar/tenis en el piloto | Sáb |
| **→** | **🎯 MVP listo para probar** = 0 + B1 + M desplegados | — | — | **Sáb mediodía** |
| **3** | Grafo de toda la Comunidad + desnivel | **B4** | Mejora la ruta fuera de Getafe y capital; no es Must | Sáb |
| **3** | F6 asistente + ruta circular | **B5** | Should; primer recorte | Sáb → dom |
| **4** | Ensayo, guion, demo sin red, accesibilidad final | **L** | Nada nuevo | Lun |

**Congelación de alcance: domingo 18 a las 23:59.** Orden de recorte si falta tiempo: B5 (F6) → B4 (grafo regional, se queda Getafe + capital) → desnivel → V-D3 (aire futuro: se queda la última medición con aviso).

Simultaneidad máxima recomendada: **F + M + B1 + B2** a la vez (vie); **F + B3 + B4 + B5** (sáb).

---

## 3. Bloques

Rangos de Task para que no choquen los números: **B1 33–39 · B2 40–46 · B3 47–51 · B4 52–57 · B5 58–64 · M 65–67**. F no usa Tasks (es diseño, por lista de comprobación).

### Bloque F — Front: solo diseño
- **Rama:** `front/diseno` · **Conversación:** una, larga (se puede retomar).
- **Qué:** que la app se vea terminada y coherente, sin cambiar qué datos muestra ni de dónde vienen.
  - Iconos: Material Symbols con fuente propia recortada a los iconos usados (`public/fonts/`, `icons.css`; el componente `Icon` ya está colocado). Cumple «icono + color + texto» (CLAUDE.md §2.10).
  - Logo de 516 KB → WebP o SVG < 50 KB.
  - Repaso visual de las 9 pantallas contra el prototipo (`docs/idea/`) y `app/frontend/docs/pantallas.md`; escritorio (≥ 768 px) y móvil (320–430 px).
  - Pendientes visuales de `app/frontend/docs/pendientes.md` B2: 320 px y zoom al 200/400 %, `h3` en categorías del municipio, `<time>` en Fuentes, estados vacíos y de error homogéneos.
  - Lo que diga la maquetadora (A-02).
- **Es suyo:** `app/frontend/src/styles/*`, `app/frontend/src/components/*.tsx` (marcado, clases y textos; **no** la lógica de datos), `app/frontend/public/*`, `app/frontend/index.html`, `app/frontend/docs/pantallas.md` (sus decisiones).
- **No toca:** `src/data/`, `src/api/`, `src/lib/request.ts`, `src/state/`, rutas (`AppRoutes.tsx`), `MapView.tsx` (es de M), `package.json` salvo que sea imprescindible.
- **Pruebas:** `npm test && npm run build && npm run lint` en verde; axe sin violaciones; no debilitar pruebas.
- **Necesita:** nada. Puede empezar ya.

### Bloque M — Mapa
- **Rama:** `front/mapa` · Tasks 65–67 en `docs/planes/mapa.md`.
- **Qué:** V-F1 y el mapa de la pantalla Ruta: MapLibre con react-map-gl dentro de `MapView.tsx` (misma interfaz: `markers`, `selectedId`, `origin`, `route`, `secondaryRoute`), selección tarjeta ↔ marcador, la lista sigue siendo el equivalente completo, atribución © OpenStreetMap y quién sirve las teselas.
- **Es suyo:** `app/frontend/src/components/MapView.tsx`, `app/frontend/src/styles/map.css` (nuevo), `package.json`/`package-lock.json` (solo `maplibre-gl` y `react-map-gl`), la prueba de `MapView`.
- **No toca:** el resto de componentes (si necesita un cambio en `Results.tsx` o `RouteView.tsx` para la selección, una línea y avisando a F).
- **Decidido (16/10): teselas de OpenFreeMap** (online, gratis, sin clave) desde ya; **PMTiles local de la Comunidad el lunes** para la demo sin red (L-4). Atribución: © OpenStreetMap y OpenFreeMap. Puede empezar ya.

### Bloque B1 — Municipio y fuentes (F5, RF-19)
- **Rama:** `datos/municipio-fuentes` · Tasks 33–39 en `docs/planes/municipio-fuentes.md`.
- **Qué:** V-D1 (normalizador de servicios + `municipality_indicator` según DEC-09), S-M1 (`/municipality/{ine_code}` con «sin datos» explícito y encaje, sin rankings), S-D1 (`/sources` con licencia, URL, última recarga y último fallo desde `manifest.json`), y conectar `getMunicipality`, `listMunicipalities` y `getSources` en `src/data/`.
- **Es suyo:** `app/ingest/normalize/services.py`, sus funciones en `build_db.py`, `app/config/indicators.yaml`, `app/config/sources.yaml`, `app/api/services/municipality.py`, `app/api/services/sources.py`, las funciones `municipality` y `sources` de `main.py`, `src/data/municipality.ts` y `src/data/sources.ts`.
- **Decidido (DEC-09, 16/10; detalle en `docs/decisiones-pendientes.md` D-09):** estos 14 indicadores en `config/indicators.yaml`. Regla: registro regional completo y municipio sin filas → **0**; fuente parcial fuera de su cobertura → **NULL** («sin datos»). Población para las tasas: `clean/population.parquet`, año 2025 (179). `year`: el del dato si la fuente lo da (EIEL 2023, VPLA 2025, padrón 2025); si no, `null` y la fecha va en `source`.

| `key` | `category` | Etiqueta | Fuente (id) | Cálculo | Unidad | Sin filas | Cobertura (16/10) |
|---|---|---|---|---|---|---|---|
| `sport_facilities` | sport | Instalaciones deportivas | `nmc_deporte` | n.º de filas por `CMUN` | instalaciones | NULL | 178 (Patones NULL) |
| `sport_facilities_per_1000` | sport | Instalaciones deportivas por 1.000 hab. | `nmc_deporte` + `padron` | n.º / población × 1000 | por 1.000 hab. | NULL | 178 |
| `catalog_activities` | sport | Actividades del catálogo disponibles | `destination_activity` (todas las fuentes de destinos) | n.º de las 8 actividades de `activities.yaml` con ≥ 1 destino | de 8 | 0 | 179 |
| `green_m2_per_inhabitant` | nature | Zonas verdes por habitante | `vpla_redes` (`clean/green.parquet`) | Σ `area_m2` / población | m²/hab. | NULL (fuera de VPLA) | 162 |
| `drove_roads_km` | nature | Vías pecuarias | `vias_pecuarias` | Σ `NM_LONG` / 1000 por `CD_MUNI` (comprobar que `NM_LONG` está en metros); ignorar los `CD_MUNI` `289xx` que no son municipios | km | 0 | 169 |
| `recreation_areas` | nature | Áreas recreativas | `areas_recreativas` | n.º | áreas | 0 | 55 |
| `bus_stops_per_1000` | mobility | Paradas de autobús por 1.000 hab. | `nmc_busparadas` | n.º por **cruce espacial** con `municipality.geom` (no `CMUN`: trae 209 códigos) / población × 1000 | por 1.000 hab. | 0 | 179 |
| `rail_stations` | mobility | Estaciones de metro y cercanías | `nmc_estmetro` + `nmc_estcerca` | n.º por `CMUN` | estaciones | 0 | metro 15, cercanías 33 |
| `health_centres` | health | Centros de salud y consultorios | `sanitarios` | `centro_nro_registro` distintos con `centro_tipo` ∈ {«Centro de salud», «Consultorio de atención primaria»}, por `municipio_nombre` normalizado (8 no tienen coordenadas) | centros | 0 | 179 (430 el 16/10; 429 el 14/10) |
| `pharmacies_per_1000` | health | Farmacias por 1.000 hab. | `farmacias` | n.º por cruce espacial (coma decimal) / población × 1000 | por 1.000 hab. | 0 | 160 |
| `aed_per_1000` | health | Desfibriladores por 1.000 hab. | `desfibriladores` | n.º por cruce espacial (como `route_poi` `aed`; no `municipio_codigo`, que da 161) / población × 1000 | por 1.000 hab. | 0 | 172 |
| `schools` | education | Centros educativos | `educativos` | n.º con `SITUACIÓN` = ALTA por `CDMUNI` | centros | 0 | 156 (3.906) |
| `good_3g_pct` | connectivity | Núcleos con buena cobertura 3G | `eiel_nucleos` | % de núcleos con `CALIDADUMT` = «BUENO» | % | NULL (fuera de EIEL) | 155 |
| `social_centres` | social | Centros de atención social | `atencion_social` | n.º sin los «RESERVADO» (`direccion_coor_x`; 175 el 16/10, 177 el 14/10), por `municipio_codigo` | centros | 0 | 138 (2.468 el 16/10) |

  - **Encaje (RF-18), sin ranking:** `fit` (ya en el contrato, `list[str]`). Primera frase: «Cumple N de M» (y «K sin datos» si hay). Después, una por preferencia: cada actividad elegida («Pádel: sí, 4 sitios» / «Pádel: no hay en este municipio»); y por perfil: `senior` → `health_centres` y `aed_per_1000`; «Salgo con…» `kids` → `schools`; `stroller` → `green_m2_per_inhabitant`; `dog` → áreas caninas de `route_poi` (OSM/Ayto. parcial: «Sí» o «Sin datos», nunca «No»). NULL → «Sin datos». Nunca nota, orden ni percentil. Va en `indicators.yaml` (sección `fit`, `own_criterion: true`).
  - **Contrato:** `/municipality/{ine_code}` necesita parámetros opcionales `activities`, `profile` y `companions` para el encaje. Es un cambio de contrato: B1 lo hace como dice el §1 (`export_openapi.py`, `npm run contract`, avisar).
  - **Pruebas de V-D1 a corregir:** educativos ALTA 3.906 en **156** municipios (no 170); DEA en 172.

### Bloque B2 — Datos vivos
- **Rama:** `datos/recarga` · Tasks 40–46 en `docs/planes/recarga.md`.
- **Qué:** S-D2 (guiones `ingest/jobs/{hourly,daily,weekly,reference}.sh` que no reconstruyen si no hay cambios), D-D1 (servicio `ingest` en Compose con cron; caché ante caídas: si `realtime.duckdb` tiene más de 2 h, la API sigue y avisa con la hora real), DEC-13 + P-13 (cuota de AEMET y `AEMET_PAUSE_S`), V-D3 (patrón horario del aire para las horas futuras).
- **Es suyo:** `app/ingest/jobs/`, `app/ingest/Dockerfile`, el servicio `ingest` en `app/deploy/docker-compose.yml`, `app/.env.example` (AEMET), `app/ingest/normalize/air.py` y la función `air_pattern` en `build_db.py`, el aviso de datos viejos en `repository.py`.
- **Decidido (DEC-13, 16/10; detalle en `docs/decisiones-pendientes.md` DEC-13):** pilotos cada hora + rotación. Propuesta para `app/.env.example` (lo cambia B2 con su TDD):

```
# Universo de municipios con prevision: 'todos' (179) o codigos INE separados por comas
AEMET_MUNICIPALITIES=todos
# Se piden en cada ejecucion horaria (pilotos de ruta)
AEMET_HOURLY=28065,28079,28131
# El resto se reparte en N porciones; cada hora se pide la porcion (hora % N): todos cada N horas.
# 0 = solo AEMET_HOURLY (si hay 429 sostenido); 1 = todos en una ejecucion (~90 min, carga inicial)
AEMET_ROTATION_SLICES=6
# Pausa entre municipios en segundos. Cada municipio son 2 peticiones: 30 s = 4 peticiones/min.
# Comprobado el 14/10: 7 peticiones en ~1 min dieron 429; a los ~100 s volvio a responder.
AEMET_PAUSE_S=30
# Tras un 429, esperar y reintentar una vez; si vuelve a fallar, se salta ese municipio
AEMET_RETRY_429_S=120
```

  - Ejecución horaria ≈ 3 + ~30 municipios × 30 s ≈ **16,5 min** (debe acabar en < 60 min; usar `manifest.lock` para que no se solapen). ≈ 1.550 peticiones/día.
  - `download_aemet` deja de ser todo o nada: un municipio fallido se apunta en `last_failure` del manifiesto y los demás siguen; su fichero anterior se conserva.
  - Previsión vieja: la API usa la última previsión que cubra la hora y muestra `forecast.issued` (`elaborado` de AEMET, RF-19); aviso «previsión antigua» si `issued` tiene **más de 12 h** (criterio propio, distinto de las 2 h de aire y tráfico); si ninguna cubre la hora, «Previsión: sin datos» (ya existe en `recommend.py`) y no se evalúan lluvia ni calor.
  - Corregir después la frase de CLAUDE.md §7.1 que remite a «la propuesta en `app/.env.example`».

### Bloque B3 — Calor y hueco de Getafe
- **Rama:** `motor/calor-getafe` · Tasks 47–51 en `docs/planes/calor-getafe.md`.
- **Qué:** DEC-06 (umbral de calor por zona meteosalud con `heat_zones.csv`: ampliar `rules.yaml` y `engine/rules.py`, que hoy solo admiten un umbral único) y el hueco de Getafe (0 destinos de nadar, tenis y baloncesto: más palabras clave en `activities.yaml` y/o OSM `sport=*` como fuente de destinos).
- **Es suyo:** `app/config/rules.yaml` (sección `heat`), `app/api/engine/rules.py`, `app/config/activities.yaml`, `app/ingest/normalize/sports.py` (si entra OSM `sport=*`).
- **Decidido (DEC-06, 16/10; detalle en `docs/decisiones-pendientes.md` D-06): opción C, «día de calor» simple, sin niveles.** Día de calor = máximo de `forecast.temp` horario del día > umbral de la zona del municipio. Con perfil de riesgo (`senior`, `stroller` o `kids` en «Salgo con…»), las horas 14–18 (de 14:00 a 19:00) dan `outdoor_ok=False` con motivo «Día de calor (máx. prevista 38 °C, umbral de tu zona 37,4 °C): mejor evitar de 14:00 a 19:00». Entre las horas válidas de un día de calor, desempate por menor `feels_like`. Resto de perfiles: aviso «Día de calor en tu zona», sin bloqueo. Sustituye a `max_feels_like_c` (y a su aviso «todavía no hay un umbral oficial cargado» en `recommend.py`). Propuesta de `heat` en `rules.yaml` (la escribe B3 con su TDD):

```yaml
heat:            # DEC-06 (16/10): «dia de calor» por zona meteosalud, sin niveles de la Ecuacion 1
  zones:         # Plan Nacional ... Exceso de Temperaturas 2026, Anexo I pag. 41: umbral de Tmax diaria (°C)
    "722801": {name: "Sierra de Madrid", max_temp_c: 35.8}
    "722802": {name: "Metropolitana y Henares", max_temp_c: 37.4}
    "722803": {name: "Sur, Vegas y Oeste", max_temp_c: 39.2}
  zone_table: heat_zones.csv        # copia de docs/assets/heat_zones.csv (ine_code -> zone_code) en app/config/
  risk_profiles: [senior, stroller] # Anexo V pag. 52: mayores de 65 y menores de 4 anos; carrito = menor de 4 es lectura propia
  risk_companions: [kids]           # «Salgo con... ninos» como menores de 4 anos: lectura propia
  avoid_hours: [14, 19]             # Anexo V pag. 52 «especialmente entre las 14:00h y las 19:00h»; bloquear = criterio propio
  tiebreak: feels_like              # en dia de calor, entre horas validas, la de menor sensTermica (criterio propio)
  source: "Ministerio de Sanidad, Plan Nacional de Actuaciones Preventivas de los Efectos del Exceso de Temperaturas sobre la Salud 2026: Anexo I pag. 41 (umbrales y zonas), Anexo V pag. 52 (grupos de riesgo y horas)"
  own_criterion: true               # los umbrales y zonas son oficiales; la regla de aplicacion no
  own_criterion_items: [daily_max_from_hourly, day_by_day_no_3day_sum, stroller_kids_as_under_4, avoid_hours_block, feels_like_tiebreak, all_year]
```

  - **Ficheros que añade a «Es suyo»:** `app/config/heat_zones.csv` (copia; `docs/` no se monta en el contenedor), `app/api/engine/slots.py` (solo el desempate) y en `app/api/services/recommend.py` solo pasar `companions` y la Tmáx del día a `evaluate_outdoor` y cambiar el aviso de calor. `validate_rules` comprueba las 3 zonas y que la tabla cubre los 179 municipios.
  - **Caso de Carmen (guion):** 36 °C en Getafe no es día de calor (umbral 37,4). Prueba y respuesta de reserva con **38 °C** en Getafe → «Ahora no: mejor a las 21:00» + alternativa cubierta.
- **Decidido (hueco de Getafe, 16/10): OSM filtrado como fuente de destinos** (aprobada por el equipo, CLAUDE.md §2.12). Getafe no está en EIEL y sus 19 instalaciones de Nomecalles no nombran piscina, tenis ni baloncesto: las palabras clave no lo arreglan. En el extracto ya descargado (`raw/osm/madrid-latest.osm.pbf`, `pyosmium` ya en `ingest/.venv`) entran **solo** los elementos con poca duda (lo demás son a menudo comunidades de vecinos o colegios):
  - `leisure=sports_centre|stadium` con `sport=*` **y** `name` → actividades según `sport` (`swimming`→swim, `tennis`, `basketball`, `padel`, `soccer`→football, `athletics`→run, `fitness`→gym);
  - `leisure=pitch` con `sport=tennis|basketball|padel` **solo** si tiene `name` o `access=yes|public`;
  - `leisure=swimming_pool` **solo** con `name` o `access=public`; nunca las piscinas sin nombre ni las `access=private` (769 en la caja de Getafe).
  - `suitability: 0.8` (por debajo de las fuentes oficiales, criterio propio); `id` = `osm:<tipo><id>`; nombre que falte → «Pista de tenis (OpenStreetMap)».
  - Recuento previo en la caja de Getafe (incluye algo de los bordes): Piscina Municipal El Carrascal y Forus Getafe (nadar), Ciudad Deportiva Europa (tenis, baloncesto, atletismo), Zona Deportiva Buenavista (baloncesto, fútbol). Sirve también para los grandes municipios sin EIEL (nadar hoy solo en 58 de 179).
  - **Ficheros:** `app/ingest/normalize/sports.py` (función OSM), su función en `build_db.py`, reglas `source: osm_sport` en `activities.yaml`. Actualizar `docs/assets/requisitos_fuentes.json` (OSM como fuente de RF-04) y pedir a B1 la entrada de atribución ODbL en `config/sources.yaml` (es de B1).
  - Prueba: Getafe con ≥ 1 destino de nadar, tenis y baloncesto; ninguna piscina sin nombre ni privada.

### Bloque B4 — Grafo de toda la Comunidad y desnivel
- **Rama:** `rutas/regional` · Tasks 52–57 en `docs/planes/regional.md`.
- **Qué:** S-R1 (grafo de los 179 municipios, `green_pct` en los 13 sin VPLA, validación en capital, San Lorenzo y uno sin mobiliario; memoria y latencia → DEC-A11 a las 14:00 del sábado) y desnivel (DEC-12: MDT05 por WCS en teselas de ≤ 4096 px, `rasterio` en `ingest`, altura por nodo y pendiente por tramo; «evitar cuestas»).
- **Es suyo:** `app/ingest/graph.py`, `app/ingest/pyproject.toml` (`rasterio`), `app/api/routing/graph.py` (solo lo que añada la pendiente), `app/config/routing.yaml`.
- **Necesita:** nada; DEC-A11 lo decide con sus propias cifras.
- **Cuidado:** construir el grafo regional gasta ~3 GB de RAM; no a la vez que otro proceso pesado en el mismo PC.

### Bloque B5 — Asistente F6 (Should, primer recorte)
- **Rama:** `motor/asistente` · Tasks 58–64 en `docs/planes/asistente.md`.
- **Qué:** D-M1 (`/assistant/interpret` con OCI Language + diccionario RF-21 + negaciones; `/assistant/route` comprueba cada condición con el motor y redacta con plantillas; `written_by_ai=False`; respuestas grabadas) y D-R1 (ruta circular por distancia ±10 %). Conectar `interpret` y `assistantRoute` en `src/data/assistant.ts`.
- **Es suyo:** `app/api/ai/*`, `app/api/services/assistant.py`, `app/api/routing/loop.py`, las funciones `assistant_*` de `main.py`, `src/data/assistant.ts`.
- **Necesita:** `~/.oci/config` y `OCI_*` en `app/.env` (ya en tu PC; en la VM, bloque D).
- **Empieza** cuando B4 haya fijado la interfaz del grafo (o usa la actual de `routing/graph.py` sin cambiarla).

### Bloque D — Despliegue (manual, tú)
1. ✅ Arrancar la VM (consola OCI → `gomad-vm` → Start).
2. ✅ (16/10) Copiar los datos y desplegar: `docs/arquitectura.md` §6.1 (`gomad.duckdb`, `realtime.duckdb`, `graph/`, `clean/addresses.parquet` y lo que use la API; después `restart api`).
3. ✅ (16/10, **https://example.com**) **Dominio + HTTPS (V-F4):** subdominio gratuito de **DuckDNS** apuntando a `YOUR_SERVER_IP`; `DOMAIN=<subdominio>` en `app/deploy/.env` **de la VM**; `deploy.sh`; Caddy saca el certificado solo.
4. Montar `~/.oci` (solo lectura) en el contenedor `api` cuando entre B5.
5. Repetir el despliegue cada vez que se fusione un bloque: `GOMAD_URL=https://example.com app/deploy/deploy.sh` en la VM; si el bloque cambia datos, copiarlos antes y `restart api` (`docs/arquitectura.md` §6.1).
6. Pendientes menores del despliegue (no bloquean, `docs/guia-ejecucion.md` L3): la api corre como root, falta publicar `443/udp` (HTTP/3), `/api` sin barra cae en la SPA, la `/config` de Caddy no tiene volumen y `build/` entra en la imagen de la api.

### Bloque L — Demo (lunes, todos)
L-1 ensayo con las personas (Carmen, Lucía, Dani, Ana, familia que se muda) y «dos personas, mismo sitio, distinta respuesta» · L-2 correcciones (nada nuevo) · L-3 guion de 10 min ligado a los criterios · L-4 **demo sin red** (Compose en un portátil, datos congelados, PMTiles) · L-5 accesibilidad final (`a11y-architect`, teclado, lector de pantalla).

---

## 4. Prompt base para lanzar un bloque de backend o el mapa

Una conversación nueva por bloque. Cambiar lo que va entre `<…>`:

```
BLOQUE=<B1>   RAMA=<datos/municipio-fuentes>   BASE=main   PLAN=<docs/planes/municipio-fuentes.md>   TASKS=<33–39>

Lee docs/trabajo-paralelo.md (§1 reglas de paralelo y la ficha de tu BLOQUE en §3) y CLAUDE.md §2.
1) Usa superpowers:writing-plans para escribir en PLAN las Tasks de tu bloque, numeradas en TASKS,
   con el formato de las Tasks 26–32 de docs/plan-implementacion.md (Rol, Servicio, Ficheros,
   Interfaces, pasos TDD con «Esperado:», commit, «Terminado cuando»), partiendo de las filas del
   plan que cita tu ficha. Commit «Plan: <bloque> (Tasks …)».
2) Usa superpowers:executing-plans con PLAN (su ledger es el de PLAN, no el del plan general).
Reglas: rama RAMA desde BASE actualizada; solo los ficheros «Es suyo» de tu ficha; en los ficheros
compartidos, solo tu trozo (tabla del §1); no cambies el contrato salvo imprescindible (y entonces
como dice el §1); valores en app/config/, nunca en código; sin push, sin merge, sin PR; no te
conectes a la VM. Si te falta una decisión de tu ficha, haz lo que no dependa de ella y para.
Al terminar: pruebas de cada servicio tocado, `git fetch && git rebase origin/main` y pruebas otra
vez, revisión final de la rama, e informe (estado por Task, commits, pruebas con salida real,
Rulings, qué hay que desplegar y siguiente paso).
```

Para el **bloque F** (diseño): el mismo encabezado con `BLOQUE=F RAMA=front/diseno` y, en lugar de los puntos 1 y 2, «trabaja por la lista de la ficha F con superpowers:test-driven-development; sin Tasks ni PLAN; decisiones en `app/frontend/docs/pantallas.md`».

**Verificador:** `docs/prompt_task_checker.md` con `TAREAS={<rango>}` y añadiendo «el plan está en PLAN, no en docs/plan-implementacion.md; comprueba también que la rama solo toca los ficheros de su ficha en docs/trabajo-paralelo.md».

---

## 5. Orden de fusión (para que los conflictos sean pequeños)

1. **F** cuando quiera (no toca backend).
2. **B1** y **M** (independientes entre sí).
3. **B2** (toca `docker-compose.yml` y `repository.py`).
4. **B3**, **B4**, **B5**, en ese orden.

Cada PR: rebase sobre `main`, verificador ✅, fusionar, desplegar (bloque D) y comprobar en el móvil.
