# Verde OSM para destinos — plan de implementación (Tasks 110–113)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Pasos con casillas (`- [ ]`). Ledger: `.superpowers/sdd/verde-osm/progress.md`.

**Objetivo:** que el factor «zona verde» de los destinos de los municipios sin VPLA (sobre todo Madrid capital, 1.766 destinos con `green` NULL) se calcule con los polígonos verdes de OSM, con la misma regla que ya usan las rutas.

**Arquitectura:** un paso de ingesta nuevo y ligero, `app/ingest/osm_green.py`, lee solo las áreas verdes del extracto OSM (mismas etiquetas `osm_green` de `app/config/routing.yaml`) y escribe `app/data/clean/osm_green.parquet`. `build_db.green_fraction` acepta un parámetro opcional `osm_green=None`: los destinos de municipios sin VPLA que tengan algún polígono OSM (regla de `graph.osm_green_coverage`) toman la fracción del círculo de `GREEN_RADIUS_M` cubierta por esos polígonos; el resto, igual que hoy. La API cita OSM como fuente del verde cuando el municipio del destino no está en VPLA.

**Tech stack:** Python 3.12, pyosmium, geopandas, DuckDB, FastAPI, pytest.

**Spec:** encargo de la persona del 17/10 (no es fila de `docs/pendientes-app.md`); CLAUDE.md §2, §3.1, §6.1, §7.3.

## Global Constraints

- `graph.py` no cambia (ni firmas ni resultados) y **no se ejecuta**: reescribe `app/data/graph/` y `clean/poi.parquet`.
- `build_db.py` y `repository.py` son compartidos: añadir funciones/métodos; `green_fraction` solo gana un parámetro opcional al final.
- Sin `clean/osm_green.parquet`, `build_db main` produce exactamente lo de hoy (NULL fuera de VPLA).
- Municipios con VPLA: `green` idéntico al de antes.
- Sin cambios en `schemas.py` ni en `openapi.json` (el contrato no cambia).
- Ningún import entre `app/api` y `app/ingest`. Etiquetas OSM verdes solo en `routing.yaml` (`osm_green`).
- Código en inglés; comentarios y docstrings en español sin tildes; textos visibles con tildes.
- OSM ya es fuente aprobada (ODbL); no hay fuente nueva.

## Review Focus

1. **Destino justo en el borde de un municipio sin VPLA**: el círculo puede tocar polígonos OSM del municipio vecino; se cuentan (es verde real alrededor), igual que VPLA hoy. Sin prueba propia: es el comportamiento del overlay actual.
2. **Polígonos OSM solapados** (bosque dentro de parque): no deben contar dos veces → `green_fraction` disuelve por destino; prueba `test_green_fraction_osm_overlapping_counts_once` (Task 111).
3. **Municipio sin VPLA y sin ningún polígono OSM**: `green` NULL, no 0 → `test_green_fraction_osm_only_where_municipality_has_osm` (Task 111).
4. **Falta `clean/osm_green.parquet`** (equipo nuevo o VM sin el paso): `build_main` no falla y deja NULL → `test_load_osm_green_missing_is_none` (Task 111).
5. **Destino de fuente `osm` con verde de OSM**: no repetir la fuente en `sources` → `test_green_source_osm_outside_vpla` comprueba que no hay duplicados (Task 112).

---

### Task 110: extracción de áreas verdes de OSM a `clean/osm_green.parquet`

**Rol:** Datos · **Servicio:** ingest

**Files:**
- Create: `app/ingest/osm_green.py`
- Test: `app/ingest/tests/test_osm_green.py`

**Interfaces:**
- Produces: `read_green_areas(pbf: Path, green_tags: dict[str, list[str]]) -> GeoDataFrame` (columnas `osm_id`, `geometry`, EPSG:4326); `extract(pbf=PBF, config=None) -> Path` (lee `routing.yaml` → `osm_green`, recorta a los polígonos que tocan la Comunidad con `common.municipalities()`, escribe con `common.write(gdf, "osm_green")`); orden `python osm_green.py`.
- Ruling previsto: se replica la lectura de áreas de `graph.read_osm` (handler `area` de pyosmium, mismo `WKBFactory`, mismas geometrías rotas saltadas) en vez de extraer una función común, para no tocar `graph.py`. Una prueba garantiza que ambos dan los mismos polígonos.

- [ ] **Step 1: pruebas que fallan** en `tests/test_osm_green.py`, con el mismo extracto XML mínimo de `test_graph.py::test_read_osm_green_areas` (parque en vía cerrada + edificio):
  - `test_read_green_areas_only_green_tags`: `len(g) == 1`, `g.crs.to_epsg() == 4326`, área > 0, columnas `{"osm_id", "geometry"}`.
  - `test_read_green_areas_matches_graph_reader`: `read_green_areas(osm, tags)` y `graph.read_osm(osm, None, tags)[3]` tienen los mismos `osm_id` y geometrías iguales (`geom_equals`).
  - `test_read_green_areas_empty_tags`: con `{}` devuelve 0 filas con CRS 4326.
- [ ] **Step 2:** `cd app/ingest && .venv/bin/pytest tests/test_osm_green.py -q` → Esperado: FAIL (`ModuleNotFoundError: osm_green`).
- [ ] **Step 3:** implementar `osm_green.py` (handler solo con `area`; sin `locations` de vías peatonales que no hacen falta, pero `locations=True` es obligatorio para ensamblar áreas).
- [ ] **Step 4:** misma orden → Esperado: 3 passed.
- [ ] **Step 5:** ejecutar sobre el extracto real: `.venv/bin/python osm_green.py` → Esperado: imprime ruta y nº de polígonos; `app/data/clean/osm_green.parquet` existe. `graph/` y `poi.parquet` sin tocar (comparar `stat` antes/después).
- [ ] **Step 6: commit** `Datos: osm_green.py extrae las áreas verdes de OSM a clean/osm_green.parquet (Task 110)`.

**Terminado cuando:** pruebas verdes y el parquet real generado sin modificar `graph/` ni `poi.parquet`.

### Task 111: `build_db` calcula el verde de los destinos sin VPLA con OSM

**Rol:** Datos · **Servicio:** ingest

**Files:**
- Modify: `app/ingest/build_db.py` (`green_fraction` + funciones nuevas + una línea en `build_main`)
- Test: `app/ingest/tests/test_build_db.py`

**Interfaces:**
- Consumes: `clean/osm_green.parquet` (Task 110); `graph.osm_green_coverage(munis, vpla_codes, osm_green)` (misma regla que las rutas).
- Produces: `green_fraction(destinations, green, municipalities, osm_green=None) -> np.ndarray`; `load_osm_green(path=CLEAN / "osm_green.parquet") -> GeoDataFrame | None`; `_circle_fraction(circles, zones) -> pd.Series` (fracción por id, refactor interno del cálculo actual).

- [ ] **Step 1: pruebas que fallan** (municipios cuadrados de juguete en EPSG:25830, uno con `in_vpla` y dos sin):
  - `test_green_fraction_without_osm_unchanged`: sin `osm_green` (o `None`), el destino sin VPLA da `None` y el de VPLA su fracción (≈0,5 con medio círculo verde, `abs=0.02`).
  - `test_green_fraction_osm_fills_without_vpla`: con un polígono OSM que cubre medio círculo del destino sin VPLA → ≈0,5; el de VPLA no cambia aunque haya polígono OSM encima.
  - `test_green_fraction_osm_only_where_municipality_has_osm`: el segundo municipio sin VPLA sin polígonos OSM → `None`.
  - `test_green_fraction_osm_overlapping_counts_once`: dos polígonos OSM idénticos sobre medio círculo → ≈0,5, no 1.
  - `test_load_osm_green_missing_is_none`: `load_osm_green(tmp_path / "no.parquet") is None`.
  - Actualizar `test_build_main_real` (slow): la aserción «sin VPLA → 0 no nulos» pasa a depender de `osm_green.parquet`: si no existe, 0; si existe, todo destino sin VPLA con `green` no nulo está en un municipio de `osm_green_coverage`, y hay al menos uno en 28079. (Ruling: cambia la regla, no se debilita.)
- [ ] **Step 2:** `.venv/bin/pytest tests/test_build_db.py -q -m "not slow"` → Esperado: FAIL (`unexpected keyword argument 'osm_green'`, `load_osm_green` no existe).
- [ ] **Step 3:** implementar. En `green_fraction`: el cálculo VPLA como hoy; si `osm_green` no es `None` ni vacío, `codes = osm_green_coverage(municipalities, set(in_vpla), osm_green)["ine_code"]`, y para los destinos de esos códigos `frac_osm` con los mismos círculos (prefiltrando polígonos con `sjoin`). `build_main` pasa `osm_green=load_osm_green()`.
- [ ] **Step 4:** `.venv/bin/pytest -q -m "not slow"` → Esperado: todo verde.
- [ ] **Step 5:** copia de seguridad ya hecha en `scratchpad/gomad.duckdb.bak`; `.venv/bin/python -m build_db main` y comparar con un guion en scratchpad: filas por tabla iguales (salvo `source_date`, que gana la fila `osm` del manifiesto), `green` idéntico en municipios con VPLA, NULL por municipio antes/después.
- [ ] **Step 6:** `.venv/bin/pytest tests/test_build_db.py -q` (incluye slow) → Esperado: passed.
- [ ] **Step 7: commit** `Datos: build_db calcula el verde de los destinos sin VPLA con las áreas verdes de OSM (Task 111)`.

**Terminado cuando:** pruebas (con slow) verdes y comparación antes/después registrada en el ledger.

### Task 112: la API cita OSM como fuente del verde fuera de VPLA

**Rol:** Motor · **Servicio:** api

**Files:**
- Modify: `app/api/repository.py` (método nuevo), `app/api/services/recommend.py` (`_sources`), `app/config/sources.yaml` (etiqueta `osm`)
- Test: `app/api/tests/services/test_recommend.py`

**Interfaces:**
- Produces: `Repository.vpla_codes() -> set[str]` (`SELECT ine_code FROM municipality WHERE in_vpla`, cacheado; sin base → `set()`).
- `_sources`: si `c.green` no es nulo, fuente del verde = `vpla_redes` si `c.ine_code` está en `vpla_codes()`, si no `osm`; no se añade si coincide con `c.source`. Un repositorio sin `vpla_codes` (dobles de prueba) se trata como hoy (`vpla_redes`).
- Etiqueta `osm` en `sources.yaml`: «Red peatonal, mobiliario y zonas verdes (© colaboradores de OpenStreetMap)» (así `/sources` también lo dice; sin entrada nueva en `catalog`).

- [ ] **Step 1: pruebas que fallan:**
  - `test_green_source_osm_outside_vpla`: tras `build_mini_data`, `UPDATE destination SET green = 0.4 WHERE id = 'ay_parques:1'`; en su recomendación hay una fuente `osm` y ninguna `vpla_redes`; sin fuentes repetidas. El destino de Getafe con verde sigue citando `vpla_redes`.
  - `test_vpla_codes`: `Repository(base).vpla_codes() == {"28065"}`.
- [ ] **Step 2:** `cd app/api && .venv/bin/pytest tests/services/test_recommend.py -q -k "green_source or vpla_codes"` → Esperado: FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** `.venv/bin/pytest -q -m "not slow"` → Esperado: todo verde (incluido `test_contract.py`, sin cambios en el contrato).
- [ ] **Step 5: commit** `Motor: /recommend cita OSM como fuente del verde en los municipios sin VPLA (Task 112)`.

**Terminado cuando:** pruebas de la API verdes y contrato intacto.

### Task 113: documentación

**Rol:** Datos · **Files:** `CLAUDE.md` (§3.1 flujo, §6.1 `destination.green`, §7.3 «Parques y verde»), `docs/assets/requisitos_fuentes.json` solo si cita la fuente del verde de destinos.

- [ ] **Step 1:** CLAUDE.md §3.1: paso nuevo `python osm_green.py` → `clean/osm_green.parquet` (tras descargar `osm`, antes de `build_db main`); §7.3: «Parques y verde» añade OSM como respaldo del verde fuera de VPLA.
- [ ] **Step 2:** registrar como pendiente (en el ledger y el informe) que `services/route.py:141` cita `vpla_redes` también cuando el verde de la ruta sale de OSM (fichero de rutas, fuera de este encargo).
- [ ] **Step 3: commit** `Docs: verde OSM de destinos en CLAUDE.md (Task 113)`.

**Terminado cuando:** documentación al día y pendientes registrados.
