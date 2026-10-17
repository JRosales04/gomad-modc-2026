# Corrección C3 «Datos de municipios» — plan de implementación (Tasks 170–174)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Pasos con casillas (`- [ ]`). Ledger: `.superpowers/sdd/indicadores-municipio/progress.md`.

**Objetivo:** que la vista de municipio (F5, `GET /municipality/{ine_code}`) tenga menos «sin datos» y valores más completos, usando solo fuentes ya descargadas y la estrategia de cobertura de CLAUDE.md §7.3, sin indicadores nuevos ni cambio de contrato.

**Arquitectura:** `build_db.indicator_table` acepta, además de una `Series`, un `DataFrame` con `value`, `source` y `year` por municipio; así un indicador puede tomar una fuente complementaria donde la principal no llega. `source` de la fila pasa a ser la lista de fuentes usadas en ese municipio separada por comas (la principal primero). `indicators.yaml` gana el campo opcional `complement` (fuentes que se usan solo donde aportan). La API (`services/municipality.py`) parte esa lista: la primera va a `source` y el resto a `extra_sources`, junto con las fuentes fijas del YAML (padrón en las tasas).

**Tech stack:** Python 3.12, geopandas, DuckDB, FastAPI, pytest.

**Spec:** encargo C3 del 17/10 (ficha en el mensaje del equipo: «faltan indicadores: salen muchos sin datos»); CLAUDE.md §2, §5 (F5, RF-17–RF-19), §7.2–7.3, §11 DEC-09.

## Diagnóstico (17/10, `app/data/gomad.duckdb` construido el 17/10 20:16, solo lectura)

Municipios con valor (no NULL) de 179, y por qué falta el resto:

| Indicador | Con valor | NULL | Ceros | Causa de los NULL / observaciones |
|---|---|---|---|---|
| `sport_facilities` | 178 | 1 | 0 | Patones (28107) sin filas en Nomecalles `deporte` (regla `null`). No es falta real: EIEL tiene 4 instalaciones en Patones, y la única fila de Nomecalles situada en Patones declara `CMUN` 106 (Parla). Además Nomecalles cuenta poco en los grandes: Getafe 19, Madrid 596 (EIEL no cubre los grandes; OSM y Ayto. sí están en `destination`) |
| `sport_facilities_per_1000` | 178 | 1 | 0 | Igual |
| `catalog_activities` | 179 | 0 | 0 | — |
| `green_m2_per_inhabitant` | 167 | 12 | 4 | Los 12 sin VPLA (Madrid, Boadilla, Brunete, Ciempozuelos, Guadarrama, Pinto, Pozuelo, Rivas, Las Rozas, Torrelodones, Villanueva de la Cañada, Villanueva del Pardillo). `clean/osm_green.parquet` (36.436 polígonos) los cubre a todos y ya lo usa el verde de destinos y rutas. Comprobación: Getafe con OSM da 168,9 m²/hab. frente a 172,8 de VPLA. Los 4 ceros son municipios de VPLA sin zonas verdes (correcto) |
| `drove_roads_km` | 179 | 0 | 8 | — |
| `recreation_areas` | 179 | 0 | 124 | Registro regional de 84 áreas en 55 municipios: ceros reales |
| `bus_stops_per_1000` | 179 | 0 | 0 | — |
| `rail_stations` | 179 | 0 | 140 | Ceros reales (metro + cercanías en 39 municipios) |
| `health_centres` | 179 | 0 | 0 | 430 centros; 39 filas de `sanitarios` sin municipio (nombre vacío) se pierden |
| `pharmacies_per_1000` | 179 | 0 | 19 | Registro completo (2.956 farmacias en 160 municipios); ceros reales |
| `aed_per_1000` | 179 | 0 | 7 | — |
| `schools` | 179 | 0 | 23 | 3.906 centros en ALTA en 156 municipios; todos los `CDMUNI` se unen; ceros reales |
| `good_3g_pct` | 155 | 24 | 5 | Fuente parcial: EIEL `nucleos` solo 155 municipios (no Getafe ni Madrid). No hay otra fuente de conectividad entre las descargadas (§7.3: «Resto: sin datos») |
| `social_centres` | 179 | 0 | 41 | 2.468 centros no «RESERVADO» en 138 municipios; todos se unen |

Uniones por código comprobadas contra el cruce espacial: educativos y atención social 0 discrepancias; sanitarios 39 de 15.716; Nomecalles `deporte` 8 de 1.358 (p. ej. 106→107), `estcerca` 1, `estmetro` 0; `busparadas` ya va por cruce espacial. **No hay errores de unión por códigos sin ceros** (`common.ine_code` los rellena). La causa de «muchos sin datos» en local es solo la cobertura de VPLA, EIEL `nucleos` y Nomecalles; si en la VM salen más, su `gomad.duckdb` es anterior (desplegar el nuevo).

## Global Constraints

- Sin indicadores nuevos ni fuentes nuevas: solo `complement` con ids ya descargados (`eiel_deporte`, `osm`, `ay_polideportivos`, `ay_piscinas`, `ay_idb`).
- Sin cambio de contrato (`schemas.py`, `openapi.json`): `source` sigue siendo un id; las demás fuentes van en `extra_sources`.
- `build_db.py` compartido con la PR `datos/poi-osm`: no tocar `route_poi_frame`, `load_osm_poi` ni `build_main`.
- Lo que siga sin cobertura (`good_3g_pct` fuera de EIEL) sigue NULL («sin datos»).
- Radio de duplicados entre fuentes: el de `app/config/recommend.yaml` `dedupe_radius_m` (50 m, criterio propio ya existente).
- Código en inglés; comentarios y docstrings en español sin tildes; textos visibles con tildes. Sin dependencias nuevas. Commits «Datos: …» / «Motor: …».

## Review Focus

1. **Instalación duplicada entre fuentes** (la misma piscina en Nomecalles y en OSM): cuenta una vez → `test_sport_union_dedupes_across_sources` (Task 171).
2. **Duplicado de otra fuente en el municipio vecino** (Nomecalles mal codificado junto a EIEL de Patones): solo se deduplica dentro del mismo municipio → `test_sport_union_dedupes_only_within_municipality` (Task 171).
3. **Polígonos OSM solapados** (bosque dentro de parque): el área cuenta una vez y solo dentro del municipio → `test_osm_green_area_counts_overlap_once_and_clips` (Task 172).
4. **Municipio de VPLA**: su valor y fuente no cambian por el complemento OSM → `test_green_vpla_unchanged_osm_outside` (Task 172, slow).
5. **Base antigua** (fila con un solo id, sin comas): la API sigue igual → `test_municipality_single_source_row_unchanged` (Task 173).

---

### Task 170: `indicator_table` con fuente y año por municipio

**Rol:** Datos · **Servicio:** ingest

**Files:** Modify `app/ingest/build_db.py` (`indicator_table`), `app/ingest/indicators.py` (campo `complement`); Test `app/ingest/tests/test_municipality_indicator.py`, `app/ingest/tests/test_indicators.py`.

**Interfaces:**
- Produces: `indicator_table(config, ine_codes, values)` donde `values[key]` es una `Series` (como hoy: fuente `ind["source"][0]`, año del YAML) **o** un `DataFrame` indexado por `ine_code` con columnas `value`, `source` (str con ids separados por comas) y `year` (Int64/None). Municipios ausentes del DataFrame: regla `no_rows`, fuente y año del YAML.
- `indicators.validate`: `complement` opcional, lista no vacía de str.
- Ruling previsto: se cambia `indicator_table` (función de indicadores existente) porque sin fuente por fila no se cumple RF-19 con complementos.

- [ ] **Step 1:** pruebas que fallan: `test_frame_values_carry_row_source_and_year` (DataFrame con `28065` → `source "nmc_deporte,osm"`, `year None`; `28107` ausente → NULL con `source` del YAML y `year` del YAML) y `test_complement_must_be_list_of_ids` (`complement: "osm"` → `IndicatorConfigError` con «complement»).
- [ ] **Step 2:** `.venv/bin/pytest tests/test_municipality_indicator.py tests/test_indicators.py -q -m "not slow"` → Esperado: 2 failed.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** misma orden → Esperado: todo verde.
- [ ] **Step 5:** commit `Datos: indicadores con fuente y año por municipio y campo complement (Task 170)`.

**Terminado cuando:** pruebas rápidas verdes; las Series siguen dando lo mismo.

### Task 171: instalaciones deportivas = Nomecalles + EIEL + Ayto. + OSM sin duplicados

**Rol:** Datos · **Servicio:** ingest

**Files:** Modify `app/ingest/build_db.py` (función nueva + su uso en `indicator_values`), `app/config/indicators.yaml` (`complement` de los dos de deporte); Test `app/ingest/tests/test_municipality_indicator.py`.

**Interfaces:**
- Produces: `SPORT_SOURCES = ("nmc_deporte", "eiel_deporte", "ay_polideportivos", "ay_piscinas", "ay_idb", "osm_sport")` (orden de prioridad; `osm_sport` se cita como `osm`) y `sport_union(facilities: DataFrame[id, source, ine_code, lon, lat], radius_m: float) -> DataFrame[value, source]` indexado por `ine_code`: dentro de cada municipio, un punto de una fuente se descarta si está a ≤ `radius_m` de uno ya contado de una fuente anterior; los de la misma fuente nunca se descartan entre sí (son instalaciones distintas en origen). `source` = fuentes que aportan, en el orden de prioridad.
- `indicator_values`: `sport_facilities` y `sport_facilities_per_1000` salen de `destination` (`type = 'facility'`) con `sport_union`; la tasa usa `per_1000` sobre `value`.
- YAML: `complement: [eiel_deporte, ay_polideportivos, ay_piscinas, ay_idb, osm]`; `no_rows` sigue `null`.

- [ ] **Step 1:** pruebas: `test_sport_union_dedupes_across_sources` (nmc y osm a 10 m en 28065 → 1, `source "nmc_deporte"`; osm a 500 m → 2, `"nmc_deporte,osm"`), `test_sport_union_keeps_same_source_neighbours` (2 EIEL a 5 m → 2), `test_sport_union_dedupes_only_within_municipality` (nmc en 28106 a 10 m de EIEL en 28107 → 28107 vale 1 con `"eiel_deporte"`).
- [ ] **Step 2:** `.venv/bin/pytest tests/test_municipality_indicator.py -q -m "not slow"` → Esperado: FAIL (`sport_union` no existe).
- [ ] **Step 3:** implementar (EPSG:25830, `sjoin_nearest` con `max_distance`).
- [ ] **Step 4:** misma orden → Esperado: verde.
- [ ] **Step 5:** commit `Datos: instalaciones deportivas con Nomecalles, EIEL, Ayuntamiento y OSM sin duplicados (Task 171)`.

**Terminado cuando:** pruebas verdes.

### Task 172: zonas verdes por habitante con OSM fuera de VPLA

**Rol:** Datos · **Servicio:** ingest

**Files:** Modify `app/ingest/build_db.py` (función nueva + uso), `app/config/indicators.yaml` (`complement: [osm]`); Test `app/ingest/tests/test_municipality_indicator.py`.

**Interfaces:**
- Produces: `osm_green_area(municipalities: GeoDataFrame[ine_code, geometry], osm_green: GeoDataFrame | None) -> Series` (m² de la unión de polígonos OSM recortada a cada municipio, EPSG:25830; solo municipios que tocan algún polígono; `None`/vacío → Series vacía).
- `indicator_values`: VPLA como hoy (`source "vpla_redes"`, año 2025); municipios sin VPLA con área OSM → `source "osm"`, `year None`; el resto NULL.
- Ruling previsto: OSM incluye bosque y pradera (`routing.yaml` `osm_green`), así que en municipios rurales da más que VPLA; la fila lo dice con su fuente. Solo se usa fuera de VPLA.

- [ ] **Step 1:** `test_osm_green_area_counts_overlap_once_and_clips` (dos cuadrados de 100 × 100 m solapados al 50 % dentro de un municipio → 15.000 m²; un tercero mitad fuera → solo cuenta la mitad), `test_osm_green_area_none_is_empty`.
- [ ] **Step 2:** ejecutar → Esperado: FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** ejecutar → Esperado: verde.
- [ ] **Step 5:** commit `Datos: zonas verdes por habitante con OSM en los municipios sin planeamiento (Task 172)`.

**Terminado cuando:** pruebas verdes.

### Task 173: la API reparte la lista de fuentes de la fila

**Rol:** Motor · **Servicio:** api

**Files:** Modify `app/api/services/municipality.py` (`indicators`); Test `app/api/tests/test_municipality.py`, `app/api/tests/mini_data.py`.

**Interfaces:**
- Consumes: `source` de `municipality_indicator` con ids separados por comas (Task 170).
- `indicators()`: `ids = source.split(",")`; `source = ids[0]`; `extra_sources = ids[1:] +` las de `ind["source"][1:]` que no estén ya (orden: las de la fila primero). Sin fila: como hoy.

- [ ] **Step 1:** mini_data: fila `28079 green 82.1 year None source "osm"`. Pruebas: `test_municipality_row_sources_split` (Madrid green → `source "osm"`, `extra_sources ["padron"]`, `year None`) y `test_municipality_single_source_row_unchanged` (Getafe green → `vpla_redes` + `["padron"]`); ajustar `test_municipality_missing_is_null` para usar otro indicador NULL (`good_3g_pct` de Getafe).
- [ ] **Step 2:** `.venv/bin/pytest tests/test_municipality.py -q -m "not slow"` → Esperado: FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** misma orden y `tests/test_contract.py` → Esperado: verde, contrato sin cambios.
- [ ] **Step 5:** commit `Motor: la vista de municipio cita todas las fuentes de cada valor (Task 173)`.

**Terminado cuando:** pruebas verdes y `openapi.json` sin cambios.

### Task 174: pruebas con datos reales, regenerar `gomad.duckdb` y documentación

**Rol:** Datos · **Servicio:** ingest + api

**Files:** Modify `app/ingest/tests/test_municipality_indicator.py` (slow), `app/api/tests/test_municipality.py` (slow), `CLAUDE.md`, `docs/assets/requisitos_fuentes.json`, este plan (tabla «después»).

- [ ] **Step 1:** actualizar las slow: Patones con valor (4, `eiel_deporte`), Madrid green con valor y fuente `osm`, coberturas nuevas, `test_green_vpla_unchanged_osm_outside` (municipios de VPLA con `source 'vpla_redes'` y año 2025; fuera de VPLA, `osm` y año NULL), fuentes por fila.
- [ ] **Step 2:** `cd app/ingest && .venv/bin/python -m build_db main` → Esperado: ruta de `gomad.duckdb`.
- [ ] **Step 3:** `.venv/bin/pytest` en ingest y api → Esperado: verde salvo las dos ajenas conocidas.
- [ ] **Step 4:** tabla antes/después en este plan; CLAUDE.md §7.3 y RF-17 de `requisitos_fuentes.json`.
- [ ] **Step 5:** commit `Datos: pruebas reales, documentación y tabla de cobertura de indicadores (Task 174)`.

**Terminado cuando:** base regenerada, pruebas verdes y documentación al día.

## Resultado (17/10, `gomad.duckdb` regenerado con `python -m build_db main`)

| Indicador | Con valor antes → después | > 0 antes → después |
|---|---|---|
| `sport_facilities` | 178 → **179** | 178 → 179 |
| `sport_facilities_per_1000` | 178 → **179** | 178 → 179 |
| `green_m2_per_inhabitant` | 167 → **179** | 163 → 175 |
| `good_3g_pct` | 155 → 155 | 150 → 150 |
| Los otros 10 | 179 → 179 | sin cambios |

Filas NULL: 38 → 24 (solo `good_3g_pct` fuera de EIEL). Ejemplos: Getafe deporte 19 → 28 (`nmc_deporte,osm`); Madrid deporte 596 → 1.119 y zonas verdes «sin datos» → 82,1 m²/hab. (`osm`); San Lorenzo de El Escorial deporte 4 → 11 (`nmc_deporte,eiel_deporte`); Patones «sin datos» → 4 (`eiel_deporte`); La Acebeda (28001) sin cambios.
