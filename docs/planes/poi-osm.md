# C2b · Mobiliario de OSM en `route_poi` (Tasks 160–164)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Ledger: `.superpowers/sdd/poi-osm/progress.md`.

**Goal:** que `route_poi` de `gomad.duckdb` lleve el mobiliario de OSM (fuentes, bancos, papeleras, juegos, áreas caninas) en los 179 municipios, sin duplicar lo que ya da el Ayuntamiento en la capital.

**Causa (comprobada el 17/10):** el mobiliario de OSM solo entra en `clean/poi.parquet` cuando se ejecuta `graph.py` (lo añade al leer el extracto), pero `init_data.sh` y `docs/pendientes-app.md` §6 ejecutan `build_db` **antes** que `graph.py`. Resultado: `route_poi` sin filas `osm` (en el PC: `poi.parquet` 17:28 con 29.235 filas OSM; `gomad.duckdb` 13:23 sin ninguna).

**Arquitectura:** paso ligero nuevo `app/ingest/osm_poi.py` (como `osm_green.py`): una lectura del extracto solo para el mobiliario, con las **mismas etiquetas** (`graph.OSM_POI`) y el **mismo esquema e ids** (`graph.osm_pois`) que el grafo → `clean/osm_poi.parquet`. `build_db main` construye `route_poi` con las filas no OSM de `poi.parquet` + `osm_poi.parquet` (o, si falta, las filas `osm` de `poi.parquet`), quitando de OSM los tipos que en un municipio ya da una fuente oficial. `graph.py` no cambia.

**Tech:** pyosmium, geopandas, DuckDB (sin dependencias nuevas).

**Spec:** ficha C2b (prompt del 17/10), CLAUDE.md §6.1 (`route_poi`) y §7.4.

## Global Constraints
- Código en inglés; comentarios y docstrings en español sin tildes; commits `Datos: …`.
- `build_db.py`: añadir funciones; de las existentes solo la línea imprescindible de `build_main`.
- Valores en `app/config/` (sección nueva `osm_poi` de `routing.yaml`, criterio propio).
- Tipos de `type` existentes: `fountain`, `bench`, `bin`, `dog_area`, `playground` (no se añaden tipos: el contrato y el front no los conocen).
- Geometría EPSG:4326; `source='osm'`; ids `osm:<node|way>/<id>` (los de `graph.osm_pois`).

## Review Focus
1. `poi.parquet` ya trae filas `osm` (añadidas por `graph.py`) → no deben salir dos veces en `route_poi` (Task 162, `test_route_poi_frame_no_double_osm`).
2. Falta `clean/osm_poi.parquet` → `route_poi` usa las filas `osm` de `poi.parquet` (Task 162, `test_route_poi_frame_without_osm_poi`).
3. YAML: `"no"` sin comillas es `False` en PyYAML → la regla de fuera de servicio no casaría (Task 160, `test_out_of_service_config_strings`).
4. Ids del paso nuevo distintos de los del grafo → `fountain_id` del tramo no casaría con `route_poi` (Task 160, `test_read_furniture_matches_graph_reader`).
5. Mobiliario de OSM fuera de la Comunidad o sin municipio (Task 161, `test_extract_filters_region`, slow).

---

### Task 160: lectura del mobiliario de OSM (`osm_poi.py`)

**Files:** Create `app/ingest/osm_poi.py`; Modify `app/config/routing.yaml` (sección `osm_poi`); Test `app/ingest/tests/test_osm_poi.py`.

**Interfaces:**
- Consumes: `graph.OSM_POI` (`{(clave, valor): tipo}`), `graph.osm_pois(osm) -> GeoDataFrame`.
- Produces: `read_furniture(pbf, out_of_service) -> pd.DataFrame` con columnas `osm_type, osm_id, key, value, coords, status` (status = `"clave=valor"` de la primera etiqueta de `out_of_service` que tenga el elemento, o `None`); `furniture_frame(osm) -> GeoDataFrame` con el esquema de `poi.parquet` (`id, type, source, ine_code, status, working, geometry`), `working=False` si hay `status`, si no NA (`boolean`).
- Config: `routing.yaml` → `osm_poi: {out_of_service: {drinking_water: ["no"], operational_status: ["closed"]}, ...}` (etiquetas comprobadas en el extracto real: 11 fuentes `drinking_water=no`, 3 `operational_status=closed`).

- [ ] Step 1: pruebas con un extracto XML mínimo (nodo banco, nodo fuente con `drinking_water=no`, vía cerrada `leisure=playground`, nodo `amenity=bench` fuera de las etiquetas no, nodo `shop=bakery`):
  - `test_read_furniture_types`: 3 filas; tipos `{bench, fountain, playground}` tras `furniture_frame`; CRS 4326; `source` todo `osm`.
  - `test_read_furniture_out_of_service`: la fuente → `status == "drinking_water=no"`, `working is False`; el banco → `status` None, `working` NA.
  - `test_read_furniture_matches_graph_reader`: `ids` de `furniture_frame(read_furniture(...))` == ids de `graph.osm_pois(graph.read_osm(osm, None)[2])`.
  - `test_out_of_service_config_strings`: todos los valores de `routing.yaml["osm_poi"]["out_of_service"]` son `str`.
- [ ] Step 2: `pytest tests/test_osm_poi.py` → Esperado: FAIL (no existe `osm_poi`).
- [ ] Step 3: implementar `read_furniture` (handler de pyosmium con `node` y `way`, `locations=True`) y `furniture_frame` (sobre `graph.osm_pois`); añadir la sección a `routing.yaml`.
- [ ] Step 4: `pytest tests/test_osm_poi.py` → Esperado: PASS.
- [ ] Step 5: commit `Datos: lectura del mobiliario de OSM con las etiquetas del grafo (Task 160)`.

**Terminado cuando:** las 4 pruebas pasan y el grafo y el paso nuevo dan los mismos ids.

### Task 161: `clean/osm_poi.parquet` (`extract`)

**Files:** Modify `app/ingest/osm_poi.py`; Test `app/ingest/tests/test_osm_poi.py`.

**Interfaces:**
- Produces: `extract(pbf=PBF, config=None) -> (Path, int)`: lee con `read_furniture`, `furniture_frame`, se queda con lo que cae en la Comunidad (`municipalities().union_all()`), `assign_municipality`, `write(gdf, "osm_poi")`. CLI `python osm_poi.py` imprime `(ruta, n, segundos)`.

- [ ] Step 1: `test_extract_filters_region` (slow, necesita `municipality.parquet`): extracto mínimo con un banco en Getafe (−3.73, 40.30) y otro en Lisboa (−9.14, 38.72); `extract(pbf, cfg)` escribiendo en `tmp_path` (monkeypatch de `osm_poi.CLEAN` / `common.CLEAN` según use `write`) → 1 fila, `ine_code == "28065"`.
- [ ] Step 2: Esperado: FAIL (`extract` no existe).
- [ ] Step 3: implementar `extract` y el `__main__`.
- [ ] Step 4: Esperado: PASS.
- [ ] Step 5: commit `Datos: paso osm_poi.py → clean/osm_poi.parquet (Task 161)`.

**Terminado cuando:** la prueba pasa y no se escribe en `app/data` durante las pruebas.

### Task 162: `route_poi` con OSM y sin duplicados (`build_db`)

**Files:** Modify `app/ingest/build_db.py` (funciones nuevas + una línea de `build_main`), `app/config/routing.yaml` (`osm_poi.skip_where_official`); Test `app/ingest/tests/test_build_db.py`.

**Interfaces:**
- Produces: `load_osm_poi(path=CLEAN / "osm_poi.parquet") -> GeoDataFrame | None`; `route_poi_frame(poi, osm_poi, skip) -> GeoDataFrame`: filas de `poi` con `source != "osm"` + filas OSM (`osm_poi`, o `poi[source=="osm"]` si es None) sin las de `ine_code in skip and type in skip[ine_code]`; sin ids repetidos; `working` `boolean`.
- Config: `osm_poi.skip_where_official: {"28079": [bench, fountain, dog_area]}` (Ayuntamiento: `ay_bancos`, `ay_fuentes`, `ay_areas_caninas`). `own_criterion: true` ya cubre el fichero.
- `build_main`: `poi = route_poi_frame(gpd.read_parquet(CLEAN / "poi.parquet"), load_osm_poi(), routing["osm_poi"]["skip_where_official"])`.

- [ ] Step 1: pruebas con GeoDataFrames de juguete:
  - `test_route_poi_frame_adds_osm`: poi (`ay_bancos` en 28079) + osm (banco 28065, juego 28079) → 3 filas; fuentes `{ay_bancos, osm}`.
  - `test_route_poi_frame_skips_official_types`: osm banco y fuente en 28079 + papelera 28079 → solo la papelera de OSM en 28079.
  - `test_route_poi_frame_no_double_osm`: `poi` con una fila `osm:node/1` y `osm_poi` con la misma → 1 fila con ese id.
  - `test_route_poi_frame_without_osm_poi`: `osm_poi=None` → usa las filas `osm` de `poi` (aplicando también `skip`).
  - `test_load_osm_poi_missing_is_none(tmp_path)`.
  - En `test_build_main_real` (slow): si existe `osm_poi.parquet`, `route_poi` tiene filas `osm` en 28065 y ninguna `osm` `bench|fountain|dog_area` en 28079.
- [ ] Step 2: Esperado: FAIL (funciones no definidas).
- [ ] Step 3: implementar y cambiar la línea de `build_main`.
- [ ] Step 4: `pytest tests/test_build_db.py` → Esperado: PASS.
- [ ] Step 5: commit `Datos: route_poi con el mobiliario de OSM, sin duplicar el del Ayuntamiento (Task 162)`.

**Terminado cuando:** pruebas en verde (rápidas y slow).

### Task 163: encadenar el paso y documentar

**Files:** Modify `app/ingest/scripts/init_data.sh` (paso `python osm_poi.py` tras `osm_green.py`), `CLAUDE.md` §3.1 (paso 2c) y §6.1 (`route_poi`: OSM y regla de duplicados), `docs/pendientes-app.md` §6 paso 1 (añadir `osm_poi.py` y `osm_green.py` antes de `build_db`).

- [ ] Step 1: `bash -n app/ingest/scripts/init_data.sh` → Esperado: sin salida.
- [ ] Step 2: commit `Datos: osm_poi.py en init_data.sh y documentación (Task 163)`.

**Terminado cuando:** el guion encadena `osm_poi.py` antes de `build_db` y la documentación lo dice.

### Task 164: regenerar los datos reales y medir

- [ ] Step 1: recuentos antes (`route_poi` total y Getafe).
- [ ] Step 2: `time python osm_poi.py` y `python -m build_db main` con `GOMAD_DATA_DIR=/home/manuel/code/GoMad/app/data`, `GOMAD_CONFIG_DIR=<worktree>/app/config`.
- [ ] Step 3: recuentos después; Esperado: filas `osm` en 28065 (bench, fountain, bin, playground…), ninguna `osm` bench/fountain/dog_area en 28079.
- [ ] Step 4: pruebas de `app/ingest` (todas) y `app/api -m "not slow"`.

**Terminado cuando:** recuentos en el informe y pruebas en verde.

## Rulings
- R1: no se añaden tipos nuevos (`toilet`, `outdoor_gym`, `aed` de OSM): el contrato y el front no los conocen y la ficha pide no tocar API ni front.
- R2: DEA solo de la Comunidad (`desfibriladores`): `graph.OSM_POI` no lee `emergency=defibrillator`, así que no hay duplicado posible.
- R3: en Madrid capital no se cargan de OSM `bench`, `fountain`, `dog_area` (los da el Ayuntamiento); papeleras y juegos de OSM sí (el Ayuntamiento no se carga para esos tipos).
- R4: `graph.py` no cambia; su copia del mobiliario OSM en `poi.parquet` se ignora en `route_poi` cuando existe `osm_poi.parquet`. Las etiquetas y los ids son los mismos (`graph.OSM_POI`, `graph.osm_pois`). Diferencia aceptada: el paso nuevo marca `working=False` en 14 fuentes (`drinking_water=no`, `operational_status=closed`); el grafo no, y sus `fountain_id` siguen contándolas.

---

## Correcciones del verificador (Tasks 165–166)

### Task 165: `skip_where_official` solo si la fuente oficial está cargada
**Files:** `app/ingest/build_db.py` (`route_poi_frame`), `app/ingest/tests/test_build_db.py`.
- [ ] Step 1: `test_route_poi_frame_keeps_osm_without_official`: `poi` sin `ay_bancos` en 28079 y OSM con un banco en 28079 → el banco de OSM se queda; con una fila `ay_fuentes` en 28079, la fuente de OSM en 28079 se quita. Esperado: FAIL.
- [ ] Step 2: en `route_poi_frame`, los pares que se saltan = `skip` ∩ pares (`ine_code`, `type`) con filas no OSM en `poi`. Esperado: PASS (y las pruebas anteriores, ajustadas para que tengan su fila oficial).
- [ ] Step 3: commit `Datos: skip_where_official solo con fuente oficial cargada (Task 165, verificador)`.

### Task 166: fuera de servicio solo para fuentes
**Files:** `app/ingest/osm_poi.py` (`read_furniture`), `app/config/routing.yaml` (`osm_poi.out_of_service` pasa a `{tipo: {clave: [valores]}}`, solo `fountain`), `app/ingest/tests/test_osm_poi.py`.
- [ ] Step 1: `test_out_of_service_only_its_type`: parque infantil con `drinking_water=no` → `status` None, `working` NA; la fuente con `drinking_water=no` sigue `working=False`. `test_out_of_service_config_strings` sobre la forma nueva. Esperado: FAIL.
- [ ] Step 2: `read_furniture(pbf, out_of_service)` con `out_of_service = {tipo: {clave: [valores]}}`; el estado se mira con las etiquetas del tipo del elemento (`OSM_POI`). `status` sigue siendo `"clave=valor"` (la etiqueta de origen, como el `status` de las demás fuentes; no se inventa texto). Esperado: PASS.
- [ ] Step 3: commit `Datos: fuera de servicio de OSM solo para fuentes (Task 166, verificador)`.

**Terminado cuando:** pruebas en verde; recuentos de `route_poi` iguales con los datos actuales (si no, se regenera `gomad.duckdb`).
