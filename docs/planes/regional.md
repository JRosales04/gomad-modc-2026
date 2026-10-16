# Bloque B4 — Grafo de toda la Comunidad (fase A: Tasks 52–55)

> **Para agentes:** SUB-SKILL OBLIGATORIA: `superpowers:executing-plans` con **este** fichero. Su ledger es `.superpowers/sdd/regional/progress.md`, no el del plan general. Los pasos usan casillas (`- [ ]`).

> Detallado el 16/10 con `superpowers:writing-plans` (rama `rutas/regional`). **Especificación:** ficha B4 en `docs/trabajo-paralelo.md` §3, fila S-R1 de `docs/plan-implementacion.md` («Grafo de toda la Comunidad (`python -m graph all` en `ingest`; si se queda sin memoria, `osmium extract` por caja); `green_pct` en los 13 sin VPLA con parques OSM o cubierta terrestre por `bbox`; validación: capital, San Lorenzo (28131) y uno sin mobiliario; memoria y latencia → DEC-A11»), Tasks 20–22 del plan general y `docs/arquitectura.md` §3.4 y §4.4. **Fase B (desnivel, DEC-12, Tasks 56–57) se escribe solo cuando la persona diga que siga.**

**Objetivo:** grafo peatonal de los 179 municipios en `app/data/graph/region/`, con `green_pct` también donde no hay VPLA (Madrid capital y los demás sin planeamiento), cargado por la API y validado con rutas < 5 s; cifras para cerrar DEC-A11.

**Arquitectura:** `graph.py` ya sabe construir sin caja (`all`). Se añade, en la misma lectura del extracto, la lectura de **polígonos verdes de OSM** (áreas multipolígono de pyosmium con las etiquetas de `routing.yaml: osm_green`). `edge_factors` mantiene VPLA donde la hay y, en los tramos que quedan en `NaN`, usa el verde de OSM **solo si el punto medio cae en un municipio sin VPLA que tenga algún polígono verde de OSM**; fuera de eso, `NaN` (sin dato, nunca 0). La API no cambia: `GraphStore.load` ya carga cada subdirectorio de `data/graph/` y `locate` prueba de la zona más pequeña a la más grande (Getafe → capital → región). Si la memoria de la API pasase de ~6 GB con las tres zonas, se apunta en DEC-A11 (no se toca `store.py` sin preguntar).

**Stack:** Python 3.12, pyosmium 3.7 (`SimpleHandler.area`, `osmium.geom.WKBFactory`), geopandas/shapely 2, igraph, scipy; pytest (`-m slow` con datos reales).

## Restricciones globales

- Código en inglés; comentarios y docstrings en español **sin tildes**; textos visibles con tildes (CLAUDE.md §2.1).
- **Solo los ficheros del bloque B4** (`docs/trabajo-paralelo.md` §3): `app/ingest/graph.py`, `app/config/routing.yaml`, sus pruebas (`app/ingest/tests/test_graph.py`, `app/api/tests/routing/test_latency.py`, nueva `app/api/tests/routing/test_region.py`) y, en el commit final, `docs/arquitectura.md` §4.4 (DEC-A11). La interfaz pública de `app/api/routing/graph.py` (`load_graph`, `nearest_node`, `edge_costs`, `shortest_path`, `bounded_distances`, `summarize`) **no cambia**.
- Valores en `app/config/routing.yaml`, nunca en código (etiquetas OSM de verde).
- `green_pct` = **NaN si no hay dato, nunca 0** (Task 20, arquitectura §4.4).
- RNF: ruta < 5 s, recomendación < 3 s. Memoria de la API ≤ ~6 GB (VM E5.Flex de 16 GB).
- No construir el grafo regional si hay otro proceso pesado en el PC (preguntar). Salidas largas a fichero (`> $SCRATCH/x.log 2>&1; tail`).
- Sin push, sin merge, sin PR; no conectarse a la VM. Commits en español con prefijo `Rutas:`.
- Comandos: `cd app/ingest && .venv/bin/pytest`, `cd app/api && .venv/bin/pytest`.

## Foco de revisión

1. **Tramo en un municipio sin VPLA y sin ningún polígono verde de OSM** (pueblo de sierra mal cartografiado): `green_pct` NaN, no 0. → Task 52 `test_osm_green_only_where_municipality_has_osm_green`.
2. **Tramo de la caja/extracto fuera de la Comunidad** (Geofabrik incluye bordes de Toledo, Guadalajara, Ávila, Segovia, Cuenca): NaN aunque haya bosque OSM. → Task 52, mismo test (tramo fuera de todo municipio).
3. **Municipio con VPLA y también parques OSM**: manda VPLA (no se mezclan fuentes en un mismo municipio). → Task 52 `test_vpla_wins_over_osm_green`.
4. **Ruta en un municipio sin mobiliario OSM** (Algete, 28009): ruta real (no `approximate`), 0 fuentes/bancos sin error, < 5 s. → Task 54 `test_region_routes_under_5s`.
5. **Origen en la capital con tres zonas cargadas** (Getafe, capital, región): `locate` elige la más pequeña que contiene los dos puntos y la ruta sale igual de rápido que antes. → Task 54 `test_store_prefers_smallest_zone`.

---

### Task 52: B4 (1/4) · Verde de OSM donde no hay VPLA

**Rol:** Rutas · **Servicio:** `app/ingest/` · **Depende de:** nada · **Duración:** 1 h

**Ficheros:** Modificar `app/ingest/graph.py`, `app/config/routing.yaml`. Pruebas en `app/ingest/tests/test_graph.py`.

**Interfaces:**
- Consume: `routing.yaml` (nueva clave `osm_green: {leisure: [...], landuse: [...], natural: [...]}`), `common.municipalities()`, `clean/green.parquet` (VPLA).
- Produce:
  - `read_osm(pbf, bbox, green_tags=None) -> (nodes, edges, osm, green)`; `green` = `GeoDataFrame` EPSG:4326 con columnas `osm_id`, `geometry` (multipolígonos) de las áreas cuyas etiquetas están en `green_tags`; vacío si `green_tags` es `None`.
  - `edge_factors(edges, green, poi, config, has_green, covered=None, osm_green=None, osm_covered=None)`: igual que antes y, si `osm_green` y `osm_covered` no están vacíos, rellena con OSM los tramos en NaN cuyo punto medio cae en `osm_covered`.
  - `osm_green_coverage(munis, vpla_codes, osm_green) -> GeoDataFrame`: municipios **sin VPLA** que intersecan algún polígono verde de OSM.

- [ ] **Paso 1: pruebas que fallan** (`tests/test_graph.py`, reutiliza `_two_edges`, `NO_POI`, `CONFIG`):

```python
PARK = Polygon([(-3.7300, 40.3040), (-3.7294, 40.3040), (-3.7294, 40.3060), (-3.7300, 40.3060)])
LEFT = Polygon([(-3.7310, 40.3000), (-3.7288, 40.3000), (-3.7288, 40.3100), (-3.7310, 40.3100)])   # tramo 0
RIGHT = Polygon([(-3.7288, 40.3000), (-3.7260, 40.3000), (-3.7260, 40.3100), (-3.7288, 40.3100)])  # tramo 1


def _gdf(*polys):
    return gpd.GeoDataFrame(geometry=list(polys), crs=4326)


def test_osm_green_fills_municipalities_without_vpla():
    # sin VPLA en ningun sitio: el verde de OSM da el porcentaje en el municipio cubierto por OSM
    f = edge_factors(_two_edges(), _gdf(), NO_POI, CONFIG, has_green=False,
                     osm_green=_gdf(PARK), osm_covered=_gdf(LEFT, RIGHT))
    assert f.loc[0, "green_pct"] == pytest.approx(0.5, abs=0.05)
    assert f.loc[1, "green_pct"] == pytest.approx(0.0, abs=0.01)


def test_osm_green_only_where_municipality_has_osm_green():
    # tramo 1 fuera de todo municipio con verde OSM (sin dato o fuera de la Comunidad): NaN, nunca 0
    f = edge_factors(_two_edges(), _gdf(), NO_POI, CONFIG, has_green=False,
                     osm_green=_gdf(PARK), osm_covered=_gdf(LEFT))
    assert f.loc[0, "green_pct"] == pytest.approx(0.5, abs=0.05)
    assert pd.isna(f.loc[1, "green_pct"])


def test_vpla_wins_over_osm_green():
    # tramo 0 en municipio con VPLA (sin zona verde en VPLA): 0 aunque OSM tenga parque; tramo 1 sin VPLA: OSM
    big_park = Polygon([(-3.7310, 40.3040), (-3.7260, 40.3040), (-3.7260, 40.3060), (-3.7310, 40.3060)])
    far_zone = _gdf(Polygon([(-3.7309, 40.3090), (-3.7308, 40.3090), (-3.7308, 40.3091)]))
    f = edge_factors(_two_edges(), far_zone, NO_POI, CONFIG, has_green=True, covered=_gdf(LEFT),
                     osm_green=_gdf(big_park), osm_covered=_gdf(RIGHT))
    assert f.loc[0, "green_pct"] == pytest.approx(0.0, abs=0.01)
    assert f.loc[1, "green_pct"] == pytest.approx(1.0, abs=0.01)


def test_osm_green_coverage_excludes_vpla_and_bare_municipalities():
    munis = gpd.GeoDataFrame({"ine_code": ["28001", "28002", "28003"]}, geometry=[LEFT, RIGHT, LEFT], crs=4326)
    cov = osm_green_coverage(munis.iloc[:2], {"28001"}, _gdf(PARK))
    assert list(cov["ine_code"]) == []                    # 28001 tiene VPLA; 28002 no toca el parque
    cov = osm_green_coverage(munis.iloc[[2]], set(), _gdf(PARK))
    assert list(cov["ine_code"]) == ["28003"]


def test_read_osm_green_areas(tmp_path):
    # extracto minimo en XML: un parque (via cerrada) y un edificio; solo el parque es verde
    osm = tmp_path / "mini.osm"
    nodes = "".join(f'<node id="{i}" version="1" lat="{lat}" lon="{lon}"/>' for i, (lon, lat) in enumerate(
        [(-3.73, 40.30), (-3.729, 40.30), (-3.729, 40.301), (-3.73, 40.301)], start=1))
    ways = ('<way id="10" version="1"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/>'
            '<tag k="leisure" v="park"/></way>'
            '<way id="11" version="1"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="1"/>'
            '<tag k="building" v="yes"/></way>')
    osm.write_text(f'<?xml version="1.0"?><osm version="0.6">{nodes}{ways}</osm>', encoding="utf-8")
    _, _, _, green = read_osm(osm, None, {"leisure": ["park"]})
    assert len(green) == 1 and green.crs.to_epsg() == 4326
    assert green.geometry.iloc[0].area > 0
```

Importar arriba: `from graph import edge_factors, index_nodes, osm_green_coverage, read_osm`.

- [ ] **Paso 2: ver que fallan.** Run: `cd app/ingest && .venv/bin/pytest tests/test_graph.py -q -m "not slow" 2>&1 | tail -5`. Esperado: `ImportError: cannot import name 'osm_green_coverage'`.

- [ ] **Paso 3: configuración** (`app/config/routing.yaml`, al final antes de `own_criterion`):

```yaml
# Poligonos de OSM que cuentan como zona verde en los municipios sin VPLA (S-R1, criterio propio).
# Solo se usan donde no hay planeamiento; donde hay VPLA manda VPLA.
osm_green:
  leisure: [park, garden, nature_reserve]
  landuse: [forest, grass, recreation_ground, village_green, meadow]
  natural: [wood]
```

- [ ] **Paso 4: implementación** (`graph.py`):
  - En `read_osm`, nuevo parámetro `green_tags=None`; en `Reader`, `def area(self, a)` (pyosmium ensambla multipolígonos al aplicar el fichero si el manejador define `area`): si alguna `(clave, valor)` de `a.tags` está en `green_tags`, `wkb = osmium.geom.WKBFactory().create_multipolygon(a)` (en `try/except RuntimeError`: geometría rota → se salta) y se guarda `(a.orig_id(), wkb)`. Al final, `green = gpd.GeoDataFrame({"osm_id": ids}, geometry=shapely.from_wkb(bytes.fromhex(w) for w in wkbs), crs=4326)`; si la caja existe, solo los que la intersecan. Devolver `nodes, edges, osm, green`. **Solo se define `area` si `green_tags`** (si no, se crea una subclase sin él: la reconstrucción de áreas cuesta una segunda pasada).
  - `edge_factors`: `e["green_pct"] = np.nan` de partida; el bloque VPLA igual que ahora; después

```python
    if osm_green is not None and len(osm_green) and osm_covered is not None and len(osm_covered):
        # municipios sin VPLA: verde de OSM, solo donde el municipio tiene algun poligono verde de OSM
        missing = e[e["green_pct"].isna()]
        middle = gpd.GeoDataFrame(geometry=missing.geometry.interpolate(0.5, normalized=True), crs=25830)
        inside = gpd.sjoin(middle, osm_covered[["geometry"]].to_crs(25830), how="inner", predicate="within")
        idx = inside.index.unique()
        if len(idx):
            sub = e.loc[idx]
            e.loc[idx, "green_pct"] = (_green_length(sub, osm_green.to_crs(25830)) / sub["length_m"]).clip(0, 1)
```

  (`_green_length` usa `e.index`, así que con `sub` devuelve una serie con las mismas etiquetas.)
  - `osm_green_coverage(munis, vpla_codes, osm_green)`: `m = munis[~munis["ine_code"].isin(vpla_codes)]`; `hit = gpd.sjoin(m[["ine_code", "geometry"]], osm_green[["geometry"]], predicate="intersects")`; devolver `m[m["ine_code"].isin(hit["ine_code"])]`.
  - `build_graph`: `nodes, edges, osm, osm_green = read_osm(pbf, bbox, config.get("osm_green"))`; `munis = municipalities()`; `vpla_codes = set(green["ine_code"].dropna())`; `covered = munis[munis["ine_code"].isin(vpla_codes)]`; `osm_covered = osm_green_coverage(munis, vpla_codes, osm_green)`; pasar `osm_green`, `osm_covered` a `edge_factors`; devolver además `"osm_green": len(osm_green)`. `has_green=len(green) > 0` se mantiene.

- [ ] **Paso 5: ver que pasan.** Run: `.venv/bin/pytest tests/test_graph.py -q -m "not slow" 2>&1 | tail -3`. Esperado: todas en verde (incluidas las 7 anteriores rápidas).

- [ ] **Paso 6: commit.** `git add app/ingest/graph.py app/ingest/tests/test_graph.py app/config/routing.yaml && git commit -m "Rutas: verde de OSM en los municipios sin VPLA (B4 Task 52)"`.

**Terminado cuando:** las pruebas rápidas de `test_graph.py` pasan y `read_osm` devuelve los polígonos verdes.

---

### Task 53: B4 (2/4) · Construir el grafo regional (y rehacer capital y Getafe)

**Rol:** Rutas · **Servicio:** `app/ingest/` · **Depende de:** Task 52 · **Duración:** 1 h (construcción ~5–10 min)

**Ficheros:** Modificar `app/ingest/tests/test_graph.py` (pruebas `slow` con datos reales). Datos generados (no van al repo): `app/data/graph/{region,madrid,getafe}/`, `app/data/clean/poi.parquet`.

**Interfaces:**
- Consume: `build_graph(pbf, bbox, out_dir, config)` de Task 52.
- Produce: `app/data/graph/region/{nodes,edges}.parquet` con el esquema de siempre (`u`, `v`, `length_m`, `highway`, `traffic`, `green_pct`, `near_*`, `*_id`, `geom`). Cifras: nodos, tramos, segundos y pico de memoria (`/usr/bin/time -v`, «Maximum resident set size»).

- [ ] **Paso 1: prueba que falla** (`tests/test_graph.py`):

```python
def _edge_municipality(e):
    import shapely
    from common import municipalities
    middle = gpd.GeoSeries(shapely.from_wkb(e["geom"]), crs=4326).to_crs(25830).interpolate(0.5, normalized=True)
    muni = gpd.sjoin(gpd.GeoDataFrame(geometry=middle.to_crs(4326)), municipalities()[["ine_code", "geometry"]],
                     predicate="within")
    return muni["ine_code"][~muni.index.duplicated()].reindex(e.index)


@pytest.mark.slow
def test_region_graph_covers_all_municipalities():
    d = DATA_DIR / "graph" / "region"
    if not (d / "edges.parquet").exists():
        pytest.skip("sin grafo regional (python graph.py all)")
    e = pd.read_parquet(d / "edges.parquet")
    n = pd.read_parquet(d / "nodes.parquet")
    assert e[["u", "v"]].max().max() < len(n) and (e["length_m"] > 0).all()
    ine = _edge_municipality(e)
    assert ine.nunique() == 179                                            # los 179 municipios con red
    assert e.loc[ine == "28079", "green_pct"].notna().mean() > 0.9         # capital: verde de OSM
    assert e.loc[ine == "28065", "green_pct"].notna().mean() > 0.9         # Getafe: VPLA
    assert e.loc[ine.isna(), "green_pct"].isna().all()                     # fuera de la Comunidad: sin dato
```

Y en `test_getafe_graph_exists` cambiar la última línea (la capital ya no es NaN, ahora tiene verde de OSM):

```python
    assert e.loc[ine == "28079", "green_pct"].notna().mean() > 0.9         # Madrid capital: verde de OSM (S-R1)
```

(reutilizando `_edge_municipality` en lugar del bloque de `sjoin` que tenía).

- [ ] **Paso 2: ver que falla.** Run: `.venv/bin/pytest tests/test_graph.py -q -m slow 2>&1 | tail -5`. Esperado: `test_region_graph_covers_all_municipalities` SKIPPED (sin grafo) y `test_getafe_graph_exists` FAILED (el grafo de Getafe aún es el antiguo).

- [ ] **Paso 3: comprobar que no hay otro proceso pesado** (`free -g`, `ps aux --sort=-%mem | head`). Si lo hay, parar y preguntar.

- [ ] **Paso 4: construir.** Desde `app/ingest`:

```bash
/usr/bin/time -v .venv/bin/python graph.py all   > $SCRATCH/region.log 2>&1; tail -30 $SCRATCH/region.log
/usr/bin/time -v .venv/bin/python graph.py 28079 > $SCRATCH/madrid.log 2>&1; tail -30 $SCRATCH/madrid.log
/usr/bin/time -v .venv/bin/python graph.py 28065 > $SCRATCH/getafe.log 2>&1; tail -30 $SCRATCH/getafe.log
```

Esperado: un dict `{'nodes': …, 'edges': …, 'osm_poi': …, 'osm_green': …, 'seconds': …}` y «Maximum resident set size» < 8 GB. **Si se queda sin memoria** (Killed / MemoryError): `osmium extract -b <caja> madrid-latest.osm.pbf -o <zona>.pbf` por cuadrantes y grafos por zona (`data/graph/region_<n>/`), y apuntarlo en el Ruling.

- [ ] **Paso 5: ver que pasan.** Run: `.venv/bin/pytest tests/test_graph.py -q 2>&1 | tail -3`. Esperado: todas en verde, ninguna saltada.

- [ ] **Paso 6: comprobar `green_pct` en los municipios sin VPLA.** Script corto (no al repo) que, con `_edge_municipality`, saque para cada municipio sin VPLA el % de tramos con `green_pct` no nulo; apuntar los que queden en NaN (sin polígono verde OSM) para DEC-A11.

- [ ] **Paso 7: commit.** `git add app/ingest/tests/test_graph.py && git commit -m "Rutas: grafo regional de los 179 municipios y su prueba (B4 Task 53)"`.

**Terminado cuando:** existe `data/graph/region/`, la prueba regional pasa con los 179 municipios y hay cifras de construcción.

---

### Task 54: B4 (3/4) · La API con el grafo regional: memoria y latencia

**Rol:** Rutas · **Servicio:** `app/api/` · **Depende de:** Task 53 · **Duración:** 1 h

**Ficheros:** Modificar `app/api/tests/routing/test_latency.py` (añadir `"region"`). Crear `app/api/tests/routing/test_region.py`.

**Interfaces:**
- Consume: `GraphStore.load(directory)`, `Zone`, `routing.graph.load_graph`, `services.route.route(req, repo, graphs)`, `Repository(data_dir)`, `schemas.RouteRequest`, `settings.DATA_DIR`. Sin cambios en ninguno.
- Produce: cifras de carga, memoria (RSS) y latencia p50/máx por grafo.

- [ ] **Paso 1: pruebas que fallan** — `test_latency.py`: `params=["getafe", "madrid", "region"]`. Nueva `test_region.py`:

```python
"""Validacion de S-R1 con el grafo regional: rutas reales < 5 s en capital, San Lorenzo y un municipio sin mobiliario."""
import time

import pytest

import schemas as s
from repository import Repository
from routing.graph import load_graph
from routing.store import GraphStore, Zone
from services.route import route
from settings import DATA_DIR

pytestmark = pytest.mark.slow
REGION = DATA_DIR / "graph" / "region"
# (origen, destino) a 1-2 km dentro de cada municipio
SAMPLES = {
    "madrid_28079": ((-3.7038, 40.4168), (-3.6846, 40.4153)),       # Sol -> Retiro
    "san_lorenzo_28131": ((-4.1476, 40.5891), (-4.1393, 40.5822)),  # Monasterio -> estacion
    "algete_28009": ((-3.4979, 40.5966), (-3.5085, 40.5998)),       # sin mobiliario en OSM
}


@pytest.fixture(scope="module")
def region_store():
    if not (REGION / "edges.parquet").exists():
        pytest.skip("sin grafo regional")
    g = load_graph(REGION)
    return GraphStore([Zone("region", g, (g.lon.min(), g.lat.min(), g.lon.max(), g.lat.max()))])


@pytest.fixture(scope="module")
def repo():
    return Repository(DATA_DIR)


@pytest.mark.parametrize("name", SAMPLES)
def test_region_routes_under_5s(region_store, repo, name):
    (olon, olat), (dlon, dlat) = SAMPLES[name]
    req = s.RouteRequest(origin=s.Coordinate(lon=olon, lat=olat), destination=s.Coordinate(lon=dlon, lat=dlat))
    t0 = time.perf_counter()
    res = route(req, repo, region_store)
    elapsed = time.perf_counter() - t0
    print(f"\n{name}: {elapsed:.2f} s, {res.healthy.distance_m:.0f} m, verde {res.healthy.green_pct}, "
          f"puntos {len(res.healthy.pois)}")
    assert not res.direct.approximate and not res.healthy.approximate
    assert elapsed < 5.0


def test_store_prefers_smallest_zone():
    store = GraphStore.load(DATA_DIR / "graph")
    if "region" not in {z.name for z in store.zones}:
        pytest.skip("sin grafo regional")
    zone, _, _ = store.locate([SAMPLES["madrid_28079"][0], SAMPLES["madrid_28079"][1]], 300)
    assert zone.name == "madrid"
    zone, _, _ = store.locate(list(SAMPLES["algete_28009"]), 300)
    assert zone.name == "region"
```

(Si `Coordinate` exige `lat` antes que `lon` o `approximate` tiene otro nombre, ajustar al contrato real de `schemas.py` sin cambiarlo.)

- [ ] **Paso 2: ver que fallan/se saltan antes del grafo.** Sin `data/graph/region` → SKIPPED. Con el grafo de Task 53 ya construido se ejecutan directamente; el criterio es el Paso 3.

- [ ] **Paso 3: ejecutar.** Run: `cd app/api && .venv/bin/pytest tests/routing -m slow -s -q > $SCRATCH/lat.log 2>&1; grep -E "carga|p50|s, |passed|failed" $SCRATCH/lat.log`. Esperado: todas pasan; apuntar carga, nodos/tramos y p50/máx de Dijkstra y A\* por grafo, y el tiempo de cada muestra.

- [ ] **Paso 4: memoria de la API.** `cd app/api && .venv/bin/uvicorn main:app --port 8010 > $SCRATCH/api.log 2>&1 &`; esperar a «grafos cargados» en el log; `ps -o rss= -p <pid>` (régimen) y pico con `grep VmHWM /proc/<pid>/status`; una ruta en Algete con `curl -s -X POST localhost:8010/route -H 'content-type: application/json' -d '{"origin":{"lat":40.5966,"lon":-3.4979},"destination":{"lat":40.5998,"lon":-3.5085}}' -w '%{time_total}\n' -o /dev/null`; parar el proceso. Esperado: VmHWM ≤ ~6 GB. Si pasa, **parar y preguntar** (opción: no cargar `madrid/` y `getafe/` cuando hay `region/`, que toca `store.py`).

- [ ] **Paso 5: commit.** `git add app/api/tests/routing && git commit -m "Rutas: validacion y latencia del grafo regional (B4 Task 54)"`.

**Terminado cuando:** las 3 muestras dan ruta real < 5 s con el grafo regional, `locate` elige la zona más pequeña, y hay cifras de memoria y latencia.

---

### Task 55: B4 (4/4) · DEC-A11 en la arquitectura

**Rol:** Rutas · **Servicio:** docs · **Depende de:** Tasks 53–54 · **Duración:** 20 min

**Ficheros:** Modificar `docs/arquitectura.md` (§4.4: fila «Comunidad (all)» en la tabla de latencia, viñeta del verde de OSM, entrada DEC-A11; fila A-11 de la tabla de pendientes §10).

- [ ] **Paso 1:** añadir a la tabla de §4.4 la fila `| Comunidad (all) | N / M | s, GB | s | GB | p50 / máx | p50 / máx | < 1 s |` con las cifras de Tasks 53–54 y la de capital rehecha si cambian.
- [ ] **Paso 2:** viñeta: «En los municipios sin VPLA (capital incluida) el % verde sale de polígonos de OSM (`routing.yaml: osm_green`, criterio propio); solo donde el municipio tiene alguno; si no, NaN.» Y la lista de municipios que siguen sin dato (Task 53 paso 6).
- [ ] **Paso 3:** entrada **DEC-A11** con las cifras y la recomendación (regional, o solo Getafe + capital si la memoria o la latencia no caben), y qué copiar a la VM (`data/graph/region/`, `data/graph/madrid/`, `data/graph/getafe/`, `data/clean/poi.parquet` → `docker compose restart api`). Fila A-11 de §10 con ✅ o el recorte.
- [ ] **Paso 4: commit.** `git add docs/arquitectura.md && git commit -m "Docs: DEC-A11 con cifras del grafo regional (B4 Task 55)"`.

**Terminado cuando:** §4.4 tiene las cifras reales y la recomendación de DEC-A11.

---

## Cierre de la fase A

`cd app/ingest && .venv/bin/pytest -q > $SCRATCH/ingest.log 2>&1; tail -3 $SCRATCH/ingest.log`, lo mismo en `app/api`; `git fetch && git rebase origin/main` y pruebas otra vez; revisión propia de la rama (`git diff origin/main --stat`: solo ficheros de B4); informe y **parar** hasta que la persona diga que siga con la fase B.
