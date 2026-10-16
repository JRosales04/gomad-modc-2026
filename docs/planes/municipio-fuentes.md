# Plan del bloque B1 — Municipio y fuentes (F5, RF-17, RF-18, RF-19)

> **Para agentes:** este fichero empieza solo con la **división en tareas** (alcance, ficheros, pruebas clave). El ejecutor de cada lote (`docs/guia-ejecucion.md` §7) detalla primero **solo las Tasks de su lote** con `superpowers:writing-plans`, en este mismo fichero y debajo de su encabezado, con el formato de las Tasks 26–32 de `docs/plan-implementacion.md` (Rol, Servicio, Ficheros, Interfaces, pasos TDD con «Esperado:», commit, «Terminado cuando»). Después las ejecuta con `superpowers:executing-plans`. Su ledger es `.superpowers/sdd/municipio-fuentes/progress.md`.
>
> **No se puede cambiar** lo que fija esta división: alcance, ficheros «Es suyo» y pruebas clave. Si los datos reales obligan a cambiarlo, se registra un Ruling. El verificador compara con las dos cosas: la división (escrita antes de ejecutar) y el detalle.

**Spec:** ficha del **Bloque B1** en `docs/trabajo-paralelo.md` §3 (DEC-09 con los 14 indicadores, encaje RF-18, cambio de contrato, cifras corregidas) y §1 (ficheros compartidos), filas V-D1, S-M1 y S-D1 de `docs/plan-implementacion.md`, `docs/decisiones-pendientes.md` D-09, `docs/informe-datos.md` (trampas de datos).
**Fecha:** viernes 16/10/2026.

**Reglas comunes a todas las Tasks:**
- Antes de escribir el detalle, comprobar en los datos reales (`app/data/raw/`, `app/data/clean/*.parquet`, `app/data/perfil/perfil.json`) los nombres exactos de las columnas. No inventar campos (CLAUDE.md §2.5).
- Valores en `app/config/`, nunca en el código. Lo que no tenga fuente oficial lleva `own_criterion: true`.
- En los ficheros compartidos, solo el trozo propio (`main.py`: solo la función de su endpoint; `build_db.py` y `repository.py`: solo funciones y métodos nuevos; `src/data/*.ts`: solo las funciones de su endpoint).
- No se tocan `CLAUDE.md`, `docs/arquitectura.md` ni `docs/assets/requisitos_fuentes.json`: lo que haya que cambiar en ellos se dice en el informe y va en la PR de documentación.

---

## Lote LB1-1 · Datos (servicio `app/ingest/`) — Tasks 33, 34, 35

### Task 33: B1-D1 · Normalizador de servicios → `clean/service.parquet`
- **Alcance:** `app/ingest/normalize/services.py`, registrado en `normalize` como los demás. Una fila por servicio situado, en EPSG:4326, con `ine_code` de 5 dígitos:
  - `sanitarios`: una fila por **centro** (`centro_nro_registro` distintos); quedarse con el tipo para los indicadores («Centro de salud», «Consultorio de atención primaria»).
  - `farmacias`: coma decimal en las coordenadas.
  - `educativos`: solo `SITUACIÓN` = ALTA.
  - `atencion_social`: fuera los 177 «RESERVADO».
  - `desfibriladores`: municipio por **cruce espacial** con `municipality.geom` (no `municipio_codigo`), coma decimal.
  - EIEL `nucleos` (`CALIDADUMT`), solo si el indicador `good_3g_pct` lo lee de aquí (si no, en la Task 35).
  - Filtro de puntos fuera de la Comunidad y coordenadas a 0 (`common.filter_region`).
- **Es suyo:** `app/ingest/normalize/services.py`, `app/ingest/tests/test_services.py`.
- **Pruebas clave** (`slow` con datos reales): 429 centros de salud + consultorios en 179 municipios; educativos ALTA 3.906 en **156** municipios; 0 filas «RESERVADO»; DEA en **172** municipios por cruce espacial; ninguna coordenada fuera de la Comunidad. Más una prueba rápida con muestra pequeña: coma decimal → float.
- **Terminado cuando:** `python -m normalize services` escribe `clean/service.parquet` y las pruebas pasan sin saltarse.

#### Detalle de la Task 33 (ejecutor de LB1-1, 16/10)

**Rol:** Datos · **Servicio:** `app/ingest/` · **Depende de:** Task 16 (`common.py`), `municipios` descargado · **Duración:** 1 h

**Ficheros:** Crear `normalize/services.py`, `tests/test_services.py`.

**Datos reales comprobados el 16/10** (`app/data/raw/`, descarga de hoy; las cifras de la división son de días antes):
- `sanitarios` (46.000 filas): `centro_nro_registro`, `centro_tipo`, `municipio_nombre`, `localizacion_coordenada_x/_y` (25830). `centro_tipo` y la coordenada son únicos por centro. 15.885 centros; **430** (no 429) con `centro_tipo` ∈ {«Centro de salud», «Consultorio de atención primaria»}, en 179 municipios por nombre, 8 sin coordenadas. 5 centros con coordenada `-109, -208` (fuera).
- `farmacias` (2.956): `FARMACIA_NRO_SOE` (único), `MUNICIPIO_NOMBRE`, `LOCALIZACION_COORDENADA_X/_Y` (25830, coma decimal en 2.760; 4 vacías). Cruce espacial → 160 municipios.
- `educativos` (7.757): `CODIGO` (único), `TIPO_EXT`, `CDMUNI`, `UTM_X/_Y` (25830), `SITUACIÓN`. ALTA 3.906 en 156 municipios; 55 sin coordenadas.
- `atencion_social` (2.643): `numero_registro` (único), `tipo`, `municipio_codigo`, `direccion_coor_x/_y` (25830). **175** (no 177) con `direccion_coor_x` = «RESERVADO» (también municipio, calle y CP); otras 2 solo tienen el teléfono reservado y sí se pueden situar. Quedan 2.468 en 138 municipios; 84 sin coordenadas.
- `desfibriladores` (13.156): `codigo_dea` (1 repetido), `tipo_establecimiento`, `municipio_codigo`, `direccion_coordenada_x/_y` (25830) y `direccion_longitud/_latitud` (coma decimal). Cruce espacial con las UTM (como `route_poi` `aed` en `furniture.py`) → 172 municipios, ninguno sin casar.
- EIEL `nucleos`: **no** entra aquí. `good_3g_pct` es un % de núcleos, no un servicio situado; lo calcula la Task 35 leyendo `eiel_nucleos` (Ruling en el ledger).

**Interfaces:**
- Consume: `common.RAW`, `common.filter_region`, `common.ine_code`, `common.latest_csv`, `common.municipalities`, `common.normalize_name`, `common.read_csv`, `common.to_float`, `common.to_wgs84`, `common.assign_municipality`, `common.write`; `normalize.normalizer`.
- Produce: `app/data/clean/service.parquet` (GeoParquet, EPSG:4326), una fila por servicio con municipio conocido. Columnas: `id` (`'{source}:{id_origen}'`, único), `source` (id de `download_sources.py`), `category` (`health` | `pharmacy` | `education` | `social` | `aed`), `subtype` (`centro_tipo`, `TIPO_EXT`, `tipo`, `tipo_establecimiento`; nulo en farmacias), `ine_code` (str 5), `geometry` (punto o **nula**).
- Reglas: `ine_code` es el que declara la fuente (`municipio_nombre` normalizado, `CDMUNI`, `municipio_codigo`), salvo `farmacias` y `desfibriladores`, que van por **cruce espacial** con `municipality.geom` cuando tienen coordenadas (DEC-09). Coordenada ausente, a 0 o fuera de la Comunidad (`common.filter_region`) → `geometry` nula, pero la fila se queda si conoce su municipio: así los indicadores cuentan los 430 centros y los 3.906 educativos (Ruling: «situado» = con municipio; el mapa solo pinta las geometrías no nulas). Fila sin municipio → fuera.
- Funciones: `located(df, x, y, crs) -> GeoDataFrame` (todas las filas, coma decimal, geometría nula si falta coordenada), `health(df, by_name)`, `pharmacies(df, by_name)`, `schools(df)`, `social(df)`, `aeds(df)` (cada una → `GeoDataFrame` con `COLUMNS`), `build(parts) -> GeoDataFrame`.

- [ ] **Paso 1: prueba que falla** — `tests/test_services.py`:

```python
import geopandas as gpd
import pandas as pd
import pytest

from common import CLEAN, RAW, latest_csv, municipalities, read_csv, to_wgs84
from normalize import load_all
from normalize.services import health, located, schools, social

HEALTH_TYPES = {"Centro de salud", "Consultorio de atención primaria"}


def test_located_parses_comma_decimal_and_keeps_rows_without_coordinates():
    df = pd.DataFrame({"x": ["440267,13", ""], "y": ["4475425,75", "4475425"]})
    g = located(df, "x", "y", 25830)
    lon, lat = to_wgs84([440267.13], [4475425.75])
    assert len(g) == 2 and g.crs.to_epsg() == 4326
    assert g.geometry.iloc[0].x == pytest.approx(lon[0]) and g.geometry.iloc[0].y == pytest.approx(lat[0])
    assert g.geometry.iloc[1] is None


def test_health_one_row_per_centre_by_name():
    df = pd.DataFrame({"centro_nro_registro": ["C1", "C1", "C2"],
                       "centro_tipo": ["Centro de salud", "Centro de salud", "Clínica dental"],
                       "municipio_nombre": ["Rozas de Madrid (Las)", "Rozas de Madrid (Las)", "Getafe"],
                       "localizacion_coordenada_x": ["", "", "437838"],
                       "localizacion_coordenada_y": ["", "", "4461942"]})
    g = health(df, {"las rozas de madrid": "28127", "getafe": "28065"})
    assert list(g["id"]) == ["sanitarios:C1", "sanitarios:C2"]
    assert list(g["ine_code"]) == ["28127", "28065"] and g.geometry.iloc[0] is None
    assert list(g["subtype"]) == ["Centro de salud", "Clínica dental"]


def test_schools_only_alta_and_social_without_reserved():
    s = schools(pd.DataFrame({"CODIGO": ["1", "2"], "TIPO_EXT": ["CEIP", "CEIP"], "CDMUNI": ["65", "065"],
                              "UTM_X": ["437838", ""], "UTM_Y": ["4461942", ""], "SITUACIÓN": ["ALTA", "BAJA"]}))
    assert list(s["id"]) == ["educativos:1"] and list(s["ine_code"]) == ["28065"]
    a = social(pd.DataFrame({"numero_registro": ["C1", "C2"], "tipo": ["RESIDENCIAS", "RESIDENCIAS"],
                             "municipio_codigo": ["079", "RESERVADO"],
                             "direccion_coor_x": ["443644", "RESERVADO"], "direccion_coor_y": ["4476188", "RESERVADO"]}))
    assert list(a["id"]) == ["atencion_social:C1"] and list(a["ine_code"]) == ["28079"]


@pytest.fixture(scope="module")
def service():
    load_all()["services"]()
    return gpd.read_parquet(CLEAN / "service.parquet")


@pytest.mark.slow
def test_service_points_inside_region(service):
    assert service.crs.to_epsg() == 4326
    assert service["id"].is_unique
    assert service["ine_code"].str.match(r"^28\d{3}$").all()
    assert set(service["category"]) == {"health", "pharmacy", "education", "social", "aed"}
    region = municipalities().union_all()
    assert service.geometry.dropna().intersects(region).all()


@pytest.mark.slow
def test_health_centres(service):
    # division: 429; la descarga del 16/10 trae 430 (Ruling en el ledger)
    hc = service[(service.category == "health") & service.subtype.isin(HEALTH_TYPES)]
    assert len(hc) == 430 and hc.ine_code.nunique() == 179


@pytest.mark.slow
def test_schools_alta(service):
    s = service[service.category == "education"]
    assert len(s) == 3906 and s.ine_code.nunique() == 156


@pytest.mark.slow
def test_social_without_reserved(service):
    raw = read_csv(latest_csv(RAW / "atencion_social", ["numero_registro", "direccion_coor_x"]))
    reserved = "atencion_social:" + raw.loc[raw.direccion_coor_x == "RESERVADO", "numero_registro"]
    assert len(reserved) == 175                                   # division: 177 (Ruling en el ledger)
    s = service[service.category == "social"]
    assert not s["id"].isin(reserved).any() and len(s) == len(raw) - len(reserved)
    assert not s["subtype"].eq("RESERVADO").any()


@pytest.mark.slow
def test_aed_and_pharmacies_by_spatial_join(service):
    aed = service[service.category == "aed"]
    assert aed.ine_code.nunique() == 172                          # municipio_codigo daria 161
    assert aed.geometry.notna().all()
    assert service[service.category == "pharmacy"].ine_code.nunique() == 160
```

- [ ] **Paso 2:** Run: `.venv/bin/pytest tests/test_services.py -q` → Esperado: FAIL en la recogida con `ModuleNotFoundError: No module named 'normalize.services'`.
- [ ] **Paso 3: implementación** — `normalize/services.py`:

```python
"""Servicios de la Comunidad -> clean/service.parquet (V-D1, DEC-09).

Una fila por servicio con municipio conocido. ine_code: el que declara la fuente (nombre o codigo), salvo
farmacias y DEA, que van por cruce espacial con municipality.geom. Geometria en EPSG:4326, nula si la fuente
no trae coordenadas o caen fuera de la Comunidad: la fila sigue contando en los indicadores, el mapa no la pinta.
"""
import geopandas as gpd
import pandas as pd

from common import (RAW, assign_municipality, filter_region, ine_code, latest_csv, municipalities, normalize_name,
                    read_csv, to_float, to_wgs84, write)
from normalize import normalizer

COLUMNS = ["id", "source", "category", "subtype", "ine_code", "geometry"]
SPATIAL = ("farmacias", "desfibriladores")


def located(df, x, y, crs):
    """Todas las filas de df con su punto; nulo si falta una coordenada. Acepta coma decimal."""
    xs = df[x].map(to_float).to_numpy(dtype=float)
    ys = df[y].map(to_float).to_numpy(dtype=float)
    ok = ~(pd.isna(xs) | pd.isna(ys))
    if crs == 25830 and ok.any():
        xs[ok], ys[ok] = to_wgs84(xs[ok], ys[ok])
    g = gpd.GeoDataFrame(df.reset_index(drop=True), geometry=gpd.points_from_xy(xs, ys), crs=4326)
    g.loc[~ok, "geometry"] = None
    return g


def _frame(g, source, category, ids, subtype, ine):
    return g.assign(id=source + ":" + ids.astype(str).str.strip(), source=source, category=category,
                    subtype=subtype, ine_code=ine)[COLUMNS]


def health(df, by_name):
    """sanitarios trae una fila por servicio: una por centro (centro_tipo y coordenada son del centro)."""
    g = located(df.drop_duplicates("centro_nro_registro"), "localizacion_coordenada_x", "localizacion_coordenada_y",
                25830)
    return _frame(g, "sanitarios", "health", g["centro_nro_registro"], g["centro_tipo"].str.strip(),
                  g["municipio_nombre"].map(normalize_name).map(by_name))


def pharmacies(df, by_name):
    g = located(df, "LOCALIZACION_COORDENADA_X", "LOCALIZACION_COORDENADA_Y", 25830)
    return _frame(g, "farmacias", "pharmacy", g["FARMACIA_NRO_SOE"], None,
                  g["MUNICIPIO_NOMBRE"].map(normalize_name).map(by_name))


def schools(df):
    """Solo SITUACIÓN = ALTA (hay 3.552 de baja)."""
    g = located(df[df["SITUACIÓN"].str.strip() == "ALTA"], "UTM_X", "UTM_Y", 25830)
    return _frame(g, "educativos", "education", g["CODIGO"], g["TIPO_EXT"].str.strip(), g["CDMUNI"].map(ine_code))


def social(df):
    """Fuera los centros protegidos: direccion_coor_x «RESERVADO» (tambien municipio y calle)."""
    g = located(df[df["direccion_coor_x"].str.strip() != "RESERVADO"], "direccion_coor_x", "direccion_coor_y", 25830)
    return _frame(g, "atencion_social", "social", g["numero_registro"], g["tipo"].str.strip(),
                  g["municipio_codigo"].map(ine_code))


def aeds(df):
    """Mismas coordenadas que route_poi aed (furniture.py); municipio_codigo solo de respaldo sin coordenadas."""
    g = located(df.drop_duplicates("codigo_dea"), "direccion_coordenada_x", "direccion_coordenada_y", 25830)
    return _frame(g, "desfibriladores", "aed", g["codigo_dea"], g["tipo_establecimiento"].str.strip(),
                  g["municipio_codigo"].map(ine_code))


def build(parts):
    out = gpd.GeoDataFrame(pd.concat(parts, ignore_index=True), geometry="geometry", crs=4326)
    has = out.geometry.notna()
    inside, outside = filter_region(out[has])
    out.loc[has & ~out.index.isin(inside.index), "geometry"] = None
    spatial = out["source"].isin(SPATIAL) & out.geometry.notna()
    joined = assign_municipality(out.loc[spatial, ["geometry"]].assign(ine_code=None))
    out.loc[spatial, "ine_code"] = joined["ine_code"]
    dropped = int(out["ine_code"].isna().sum())
    out = out[out["ine_code"].notna()].reset_index(drop=True)
    print(f"   service: {len(out)} servicios ({outside} fuera de la Comunidad sin punto, {dropped} sin municipio):",
          out["category"].value_counts().to_dict())
    return out


@normalizer("services")
def run():
    by_name = dict(zip(municipalities()["name_norm"], municipalities()["ine_code"]))
    def raw(source, columns):
        return read_csv(latest_csv(RAW / source, columns))
    parts = [
        health(raw("sanitarios", ["centro_nro_registro", "centro_tipo", "municipio_nombre"]), by_name),
        pharmacies(raw("farmacias", ["FARMACIA_NRO_SOE", "MUNICIPIO_NOMBRE"]), by_name),
        schools(raw("educativos", ["CODIGO", "CDMUNI", "SITUACIÓN"])),
        social(raw("atencion_social", ["numero_registro", "municipio_codigo", "direccion_coor_x"])),
        aeds(raw("desfibriladores", ["codigo_dea", "municipio_codigo", "direccion_coordenada_x"])),
    ]
    return write(build(parts), "service")
```

- [ ] **Paso 4:** Run: `.venv/bin/pytest tests/test_services.py -q -m "not slow"` → Esperado: `3 passed`. Después `.venv/bin/python -m normalize services` → Esperado: `-> services: …/clean/service.parquet` y la línea `service:` con las cinco categorías. Y `.venv/bin/pytest tests/test_services.py -q` → Esperado: `8 passed` (ninguno saltado).
- [ ] **Paso 5:** Run: `.venv/bin/pytest -q` → Esperado: los mismos 4 fallos previos de la línea base (ledger, «Preparación») y ninguno nuevo.
- [ ] **Paso 6: commit** — `git -C ../.. add app/ingest/normalize/services.py app/ingest/tests/test_services.py && git -C ../.. commit -m "Datos: normalizador de servicios -> clean/service.parquet (B1 Task 33)"`

**Terminado cuando:** `python -m normalize services` escribe `clean/service.parquet` con las cinco categorías y `tests/test_services.py` pasa entero sin saltarse.

### Task 34: B1-D2 · `app/config/indicators.yaml` y su validación
- **Alcance:** los **14 indicadores** de la tabla DEC-09 de la ficha B1 (`key`, `category`, `label`, `source`, `unit`, regla «sin filas» `zero` | `null`, `year`), y la sección `fit` del encaje RF-18 (`own_criterion: true`): qué indicador mira cada perfil y cada «Salgo con…» (`senior` → `health_centres` y `aed_per_1000`; `kids` → `schools`; `stroller` → `green_m2_per_inhabitant`; `dog` → áreas caninas de `route_poi`). Validación al cargar: claves obligatorias, `category` dentro de las del contrato (`Indicator.category` en `app/api/schemas.py`) y `key` sin repetir.
- **Es suyo:** `app/config/indicators.yaml`, `app/config/README.md` (una línea), la validación en `app/ingest/` (lee el YAML) y su prueba.
- **Pruebas clave:** el YAML real pasa la validación; un YAML con una categoría fuera del contrato o una clave repetida falla con un mensaje legible.
- **Terminado cuando:** existe `indicators.yaml` con los 14 indicadores y `fit`, y la validación está probada.

#### Detalle de la Task 34 (ejecutor de LB1-1, 16/10)

**Rol:** Datos · **Servicio:** `app/ingest/` · **Depende de:** DEC-09 (ficha B1), contrato `Indicator` (`app/api/schemas.py`) · **Duración:** 45 min

**Ficheros:** Crear `../config/indicators.yaml`, `indicators.py`, `tests/test_indicators.py`. Modificar `../config/README.md` (la fila de `indicators.yaml`).

**Comprobado el 16/10:** `Indicator.category` del contrato = `sport | nature | mobility | health | education | connectivity | social` (igual en `app/frontend/src/api/openapi.json`); `Profile` = `general | senior | stroller | sensitive` y `Companion` = `dog | kids` (`stroller` es un **perfil**, no un acompañante); `route_poi.type` de las áreas caninas = `dog_area`; las 8 actividades de `activities.yaml` (`walk`, `run`, `swim`, `padel`, `tennis`, `football`, `basketball`, `gym`). `pyyaml` ya es dependencia de `ingest`.

**Interfaces:**
- Consume: `common.CONFIG_DIR`; `../config/indicators.yaml`.
- Produce: `indicators.py` (módulo de primer nivel del servicio, como `build_db.py`):
  - `CATEGORIES`, `PROFILES`, `COMPANIONS`: copias de los `Literal` del contrato (sin importar de `app/api`); `test_contract_enums_in_sync` las compara con `openapi.json`.
  - `REQUIRED = ("key", "category", "label", "source", "unit", "no_rows", "year")`, `NO_ROWS = ("zero", "null")`.
  - `validate(config) -> dict` (devuelve el mismo `config`; lanza `IndicatorConfigError(ValueError)` con un mensaje en español que nombra el indicador y la clave) y `load(path=CONFIG_DIR / "indicators.yaml") -> dict`.
- Formato de `indicators.yaml`:
  - `population_year: 2025` (DEC-09: población de `clean/population.parquet`, año 2025).
  - `indicators:` lista de 14 con `key`, `category`, `label` (con tildes), `source` (**lista** de ids de `download_sources.py`; `catalog_activities` usa la tabla `destination_activity`), `unit`, `no_rows` (`zero` | `null`: municipio sin filas → 0 o NULL) y `year` (entero o `null`).
  - `fit:` `own_criterion: true`, `source`, `met_if_above: 0` (un indicador se cumple si su valor es mayor; NULL = «sin datos»), `profiles` (perfil → lista de `key`), `companions` (acompañante → lista de `key` o `{route_poi: <tipo>, when_absent: no_data}`). `activities: destination_activity` (cada actividad elegida se cuenta en esa tabla; la frase es de la Task 37).
  - Validación: claves obligatorias; `category` del contrato; `no_rows` en `NO_ROWS`; `source` lista no vacía; `year` entero o nulo; `key` sin repetir; `population_year` entero; en `fit`, perfiles y acompañantes del contrato y cada `key` citado existente.

- [ ] **Paso 1: prueba que falla** — `tests/test_indicators.py`:

```python
import copy
import json

import pytest
import yaml

from common import CONFIG_DIR
from indicators import CATEGORIES, COMPANIONS, PROFILES, IndicatorConfigError, load, validate

DEC09_KEYS = ["sport_facilities", "sport_facilities_per_1000", "catalog_activities", "green_m2_per_inhabitant",
              "drove_roads_km", "recreation_areas", "bus_stops_per_1000", "rail_stations", "health_centres",
              "pharmacies_per_1000", "aed_per_1000", "schools", "good_3g_pct", "social_centres"]


@pytest.fixture
def real():
    return yaml.safe_load((CONFIG_DIR / "indicators.yaml").read_text(encoding="utf-8"))


def test_real_yaml_is_valid_with_dec09_indicators():
    cfg = load()
    assert [i["key"] for i in cfg["indicators"]] == DEC09_KEYS
    by_key = {i["key"]: i for i in cfg["indicators"]}
    assert by_key["sport_facilities"]["no_rows"] == "null" and by_key["health_centres"]["no_rows"] == "zero"
    assert by_key["green_m2_per_inhabitant"]["no_rows"] == "null" and by_key["good_3g_pct"]["no_rows"] == "null"
    assert sum(i["no_rows"] == "null" for i in cfg["indicators"]) == 4
    assert by_key["good_3g_pct"]["year"] == 2023 and cfg["population_year"] == 2025
    fit = cfg["fit"]
    assert fit["own_criterion"] is True
    assert fit["profiles"]["senior"] == ["health_centres", "aed_per_1000"]
    assert fit["profiles"]["stroller"] == ["green_m2_per_inhabitant"]
    assert fit["companions"]["kids"] == ["schools"]
    assert fit["companions"]["dog"] == {"route_poi": "dog_area", "when_absent": "no_data"}


def test_unknown_category_fails_readably(real):
    real["indicators"][3]["category"] = "green"
    with pytest.raises(IndicatorConfigError, match=r"green_m2_per_inhabitant.*categoría «green»"):
        validate(real)


def test_duplicate_key_fails_readably(real):
    real["indicators"].append(copy.deepcopy(real["indicators"][0]))
    with pytest.raises(IndicatorConfigError, match=r"clave repetida.*sport_facilities"):
        validate(real)


def test_missing_required_field_fails_readably(real):
    del real["indicators"][8]["unit"]
    with pytest.raises(IndicatorConfigError, match=r"health_centres.*falta «unit»"):
        validate(real)


@pytest.mark.parametrize("change, message", [
    (lambda c: c["indicators"][0].update(no_rows="cero"), r"sport_facilities.*no_rows"),
    (lambda c: c["fit"]["profiles"].update(elderly=["schools"]), r"perfil «elderly»"),
    (lambda c: c["fit"]["companions"].update(kids=["playgrounds"]), r"indicador «playgrounds»"),
])
def test_bad_values_fail_readably(real, change, message):
    change(real)
    with pytest.raises(IndicatorConfigError, match=message):
        validate(real)


def test_contract_enums_in_sync(root):
    schemas = json.loads((root.parent / "frontend" / "src" / "api" / "openapi.json")
                         .read_text(encoding="utf-8"))["components"]["schemas"]
    assert list(CATEGORIES) == schemas["Indicator"]["properties"]["category"]["enum"]
    assert list(PROFILES) == schemas["RecommendRequest"]["properties"]["profile"]["enum"]
    assert list(COMPANIONS) == schemas["RecommendRequest"]["properties"]["companions"]["items"]["enum"]
```

- [ ] **Paso 2:** Run: `.venv/bin/pytest tests/test_indicators.py -q` → Esperado: FAIL en la recogida con `ModuleNotFoundError: No module named 'indicators'`.
- [ ] **Paso 3: implementación** — `indicators.py`:

```python
"""Carga y valida config/indicators.yaml (DEC-09, Task 34): indicadores de la vista de municipio y encaje RF-18.

Las categorias, perfiles y acompanantes son copia del contrato (app/api/schemas.py): ningun servicio importa
codigo de otro; test_contract_enums_in_sync las compara con el openapi.json.
"""
import yaml

from common import CONFIG_DIR

CATEGORIES = ("sport", "nature", "mobility", "health", "education", "connectivity", "social")
PROFILES = ("general", "senior", "stroller", "sensitive")
COMPANIONS = ("dog", "kids")
REQUIRED = ("key", "category", "label", "source", "unit", "no_rows", "year")
NO_ROWS = ("zero", "null")


class IndicatorConfigError(ValueError):
    pass


def _fail(msg):
    raise IndicatorConfigError(f"indicators.yaml: {msg}")


def _check_indicator(ind, n):
    name = ind.get("key") or f"n.º {n}"
    for field in REQUIRED:
        if field not in ind:
            _fail(f"al indicador «{name}» le falta «{field}»")
    if ind["category"] not in CATEGORIES:
        _fail(f"el indicador «{name}» tiene la categoría «{ind['category']}», que no está en el contrato "
              f"({', '.join(CATEGORIES)})")
    if ind["no_rows"] not in NO_ROWS:
        _fail(f"el indicador «{name}» tiene no_rows «{ind['no_rows']}»; debe ser {' o '.join(NO_ROWS)}")
    if not isinstance(ind["source"], list) or not ind["source"]:
        _fail(f"el indicador «{name}» necesita «source» como lista de ids de fuente")
    if ind["year"] is not None and not isinstance(ind["year"], int):
        _fail(f"el indicador «{name}» tiene «year» {ind['year']!r}; debe ser un año o null")


def _check_refs(kind, allowed, mapping, keys):
    for who, refs in (mapping or {}).items():
        if who not in allowed:
            _fail(f"fit: {kind} «{who}» no está en el contrato ({', '.join(allowed)})")
        if isinstance(refs, dict):
            if "route_poi" not in refs:
                _fail(f"fit: {kind} «{who}» necesita una lista de indicadores o «route_poi»")
            continue
        for ref in refs:
            if ref not in keys:
                _fail(f"fit: {kind} «{who}» cita el indicador «{ref}», que no existe")


def validate(config):
    """Devuelve config si es valido; si no, IndicatorConfigError con un mensaje legible."""
    if not isinstance(config.get("population_year"), int):
        _fail("falta «population_year» (año del padrón para las tasas)")
    seen = set()
    for n, ind in enumerate(config.get("indicators") or [], start=1):
        _check_indicator(ind, n)
        if ind["key"] in seen:
            _fail(f"clave repetida «{ind['key']}»")
        seen.add(ind["key"])
    if not seen:
        _fail("no hay indicadores")
    fit = config.get("fit") or _fail("falta la sección «fit» (encaje RF-18)")
    if fit.get("own_criterion") is not True:
        _fail("fit: es criterio propio y debe llevar «own_criterion: true»")
    _check_refs("perfil", PROFILES, fit.get("profiles"), seen)
    _check_refs("acompañante", COMPANIONS, fit.get("companions"), seen)
    return config


def load(path=None):
    path = path or CONFIG_DIR / "indicators.yaml"
    return validate(yaml.safe_load(path.read_text(encoding="utf-8")))
```

  `../config/indicators.yaml`: los 14 indicadores de la tabla DEC-09 en su orden, con la etiqueta, la unidad y la regla «sin filas» de la tabla; `source` con los ids de la columna «Fuente» (`[nmc_deporte, padron]` en las tasas, `[nmc_estmetro, nmc_estcerca]`, `[destination_activity]`); `year` 2023 en `good_3g_pct` (EIEL 2023), 2025 en `green_m2_per_inhabitant` (VPLA 2025 y padrón 2025), `null` en el resto (sin año en la fuente: la fecha va por `source_date`). Un comentario por indicador con el cálculo de la columna «Cálculo» (lo implementa la Task 35). Sección `fit` como en «Interfaces».

  `../config/README.md`: la fila de `indicators.yaml` dice «14 indicadores de la vista de municipio (F5) con su regla «sin filas», y `fit`: qué indicador mira cada perfil y acompañante (RF-18, criterio propio) | DEC-09 (16/10); lo valida `ingest/indicators.py`».

- [ ] **Paso 4:** Run: `.venv/bin/pytest tests/test_indicators.py -q` → Esperado: `8 passed`. Y `.venv/bin/python -c "import indicators; print(len(indicators.load()['indicators']))"` → Esperado: `14`.
- [ ] **Paso 5:** Run: `.venv/bin/pytest -q` → Esperado: los mismos fallos previos de la línea base (ledger, «Preparación») y ninguno nuevo.
- [ ] **Paso 6: commit** — `git -C ../.. add app/config/indicators.yaml app/config/README.md app/ingest/indicators.py app/ingest/tests/test_indicators.py && git -C ../.. commit -m "Datos: config/indicators.yaml (DEC-09) y su validacion (B1 Task 34)"`

**Terminado cuando:** `indicators.load()` devuelve los 14 indicadores de DEC-09 y la sección `fit`, y `tests/test_indicators.py` prueba que una categoría fuera del contrato, una clave repetida o una clave obligatoria ausente fallan con un mensaje que nombra el indicador.

### Task 35: B1-D3 · Tabla `municipality_indicator` en `build_db.py`
- **Alcance:** una función **nueva** llamada desde `build_main` (sin cambiar las existentes) que calcula los 14 indicadores de `indicators.yaml` para los 179 municipios → `municipality_indicator(ine_code, category, key, value, unit, year, source)`. `value` es NULL cuando no hay datos: con regla `zero`, municipio sin filas = 0; con regla `null`, fuera de cobertura = NULL. Población de `clean/population.parquet`, año 2025. Paradas de bus, farmacias y DEA por cruce espacial (`nmc_busparadas` trae 209 códigos). `drove_roads_km`: comprobar que `NM_LONG` está en metros e ignorar los `CD_MUNI` `289xx`. `catalog_activities` sale de `destination_activity`.
- **Es suyo:** su función en `app/ingest/build_db.py` y su prueba.
- **Pruebas clave** (`slow`): 179 × 14 filas; **Patones** `sport_facilities` NULL (no 0); `green_m2_per_inhabitant` NULL en los municipios sin VPLA (Madrid incluido) y con valor en Getafe; `health_centres` suma 429; coberturas de la columna «Cobertura (16/10)» de la ficha. Más una prueba rápida con datos mínimos: la regla `zero` frente a `null`.
- **Terminado cuando:** `python -m build_db main` deja la tabla en `gomad.duckdb` y las pruebas pasan.

---

## Lote LB1-2 · API de municipio (servicio `app/api/`) — Tasks 36, 37

### Task 36: B1-M1 · `/municipality/{ine_code}` con indicadores
- **Alcance:** métodos **nuevos** en `repository.py` (indicadores de un municipio y su nombre), `services/municipality.py` y la función `municipality` de `main.py` (sustituye al 501). Indicadores agrupados por categoría con fuente y fecha (RF-19, de `source_date`). «Sin datos» explícito cuando `value` es NULL. **Sin ranking** ni comparación con otros municipios. Código inexistente → 404 con mensaje legible; sin `gomad.duckdb` → 503 (como `/recommend`).
- **Es suyo:** `app/api/services/municipality.py`, sus métodos en `repository.py`, la función `municipality` de `main.py`, `app/api/tests/test_municipality.py`, y datos de prueba en `tests/mini_data.py` (solo añadir).
- **Pruebas clave:** `test_municipality_179_respond` (`slow`), `test_municipality_missing_is_null`, `test_municipality_unknown_404`, y una sin base de datos → 503.
- **Terminado cuando:** los 179 códigos responden y el contrato actual no cambia.

### Task 37: B1-M2 · Encaje con preferencias (RF-18) y cambio de contrato
- **Alcance:** parámetros opcionales `activities`, `profile` y `companions` en `/municipality/{ine_code}`. El campo `fit` (`list[str]`, ya en el contrato) se rellena según la sección `fit` de `indicators.yaml`:
  - primera frase: «Cumple N de M», más «K sin datos» si los hay;
  - después, una frase por actividad («Pádel: sí, 4 sitios» / «Pádel: no hay en este municipio») y por perfil o acompañante;
  - perro: «Sí» o «Sin datos», nunca «No»;
  - NULL → «Sin datos»; nunca nota, orden ni percentil.

  Cambio de contrato como dice `docs/trabajo-paralelo.md` §1: `scripts/export_openapi.py`, `npm run contract` en `app/frontend`, `test_contract.py` en verde, y en el informe un aviso a los demás bloques.
- **Es suyo:** lo mismo que en la Task 36, más `app/api/schemas.py` (solo los parámetros nuevos), `app/frontend/src/api/openapi.json` y `schema.d.ts` (regenerados, no a mano).
- **Pruebas clave:** sin preferencias → `fit` vacío o solo «Cumple 0 de 0» (decidir y registrar un Ruling); actividad sin destinos → «no hay»; perro sin datos → «Sin datos»; ningún texto contiene posición, nota ni percentil; `test_contract.py`.
- **Terminado cuando:** el encaje sale con las tres entradas y el contrato está regenerado.

---

## Lote LB1-3 · Fuentes (servicio `app/api/`) — Task 38 (se puede lanzar en paralelo con LB1-1)

### Task 38: B1-M3 · `/sources` con licencia, URL y fechas
- **Alcance:**
  - `app/config/sources.yaml`: se amplía, sin perder `labels`. Para cada fuente que use la app: editor, licencia y URL. Licencias: CKAN de la Comunidad y del Ayuntamiento CC BY 4.0; IDEM y Nomecalles las de su portal (comprobarlas); OSM ODbL; AEMET su aviso legal; Sanidad para los umbrales de calor; BOE para el ICA.
  - `services/sources.py`: última recarga y último fallo de cada fuente, desde `manifest.json` y `source_date`.
  - La función `sources` de `main.py` (sustituye al 501).
- **Es suyo:** `app/config/sources.yaml`, `app/api/services/sources.py`, la función `sources` de `main.py`, `app/api/tests/test_sources.py`.
- **Pruebas clave:** `test_sources_all_have_license` (todas las fuentes usadas tienen licencia y URL); una fuente sin `manifest.json` sale con fecha nula y aviso, no 500; cada `DataSource.label` que devuelven `/recommend` y `/route` aparece en `/sources`.
- **Terminado cuando:** `/sources` lista todas las fuentes usadas con licencia, URL y fechas.

---

## Lote LB1-4 · Front (`app/frontend/`) — Task 39 (después de LB1-2 y LB1-3)

### Task 39: B1-F1 · Conectar municipio, lista de municipios y fuentes
- **Alcance:** solo `src/data/municipality.ts` y `src/data/sources.ts` (y lo mínimo de `src/data/` que haga falta). `getMunicipality` llama a `/api/municipality/{ine_code}` con las preferencias del perfil y `getSources` a `/api/sources`. `listMunicipalities` se decide con un Ruling: lista estática actual o de la API (P-09). En `MODE=test` siguen deterministas, sin red. En **un commit aparte**, quitar solo los textos «(ejemplo)» y «Cifras de ejemplo» de Municipio y Fuentes. Nada de diseño (es del bloque F).
- **Es suyo:** `app/frontend/src/data/municipality.ts`, `src/data/sources.ts`, sus pruebas y, solo para los textos de ejemplo, `Municipality.tsx` y `Sources.tsx`.
- **Pruebas clave:** `npm test`, `npm run lint` y `npm run build` en verde; error 404/503 → estado de error con «Reintentar»; sin llamadas de red en las pruebas.
- **Terminado cuando:** Municipio y Fuentes muestran datos reales en `npm run dev` con la API local.
