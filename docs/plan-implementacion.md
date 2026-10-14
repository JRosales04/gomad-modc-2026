# Plan de implementación — GoMad (demo del martes 20/10/2026)

> **Para agentes:** SUB-SKILL OBLIGATORIA: usar `superpowers:executing-plans` (recomendado en `docs/PENDIENTES.md` P-10) o `superpowers:subagent-driven-development` para ejecutar este plan tarea a tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** convertir el diseño aprobado de `docs/arquitectura.md` en una app web móvil desplegada con HTTPS (F1–F5 obligatorias, F6 si da tiempo) para la demo del martes 20/10/2026.

**Arquitectura:** ingesta Python por niveles de recarga (`scripts/descargar_fuentes.py` → normalizadores → GeoParquet → `gomad.duckdb` + `tiempo_real.duckdb`); API FastAPI sin estado con el grafo peatonal en memoria (igraph + `scipy.sparse.csgraph`); SPA React + Vite + TypeScript con MapLibre; Docker Compose (Caddy + API + ingesta) en una VM de OCI.

**Stack:** Python 3.12, DuckDB (+ extensión `spatial` solo en la ingesta), GeoPandas/pyogrio/pyproj/shapely 2, pyrosm (o pyosmium de respaldo), python-igraph, SciPy, FastAPI + Pydantic v2, pytest · Node 20 LTS, React 18, Vite 5, TypeScript, react-map-gl (MapLibre), React Router, TanStack Query, Radix UI, MSW, Vitest + axe · Docker Compose, Caddy, OCI.

**Spec:** `docs/arquitectura.md` (manda sobre CLAUDE.md §6 donde difieran). Contexto: `CLAUDE.md`, `docs/PENDIENTES.md`, `docs/decisiones-pendientes.md`, `docs/informe-datos.md`, `docs/referencia/umbrales.md`, `docs/referencia/requisitos_fuentes.json`.

**Fecha del plan:** miércoles 14/10/2026.

---

## Restricciones globales

Cada tarea las incluye implícitamente.

- **Idioma:** español en interfaz, textos, documentación, mensajes de commit y nombres de módulos (CLAUDE.md §2.1). Identificadores en español salvo términos técnicos sin traducción habitual.
- **Ámbito:** 179 municipios, **sin filtro de población** (CLAUDE.md §2.2). Ayuntamiento de Madrid solo como complemento para la capital (§2.3).
- **La IA interpreta y explica; el motor de reglas decide** (§2.4). Ningún LLM elige destinos, calcula rutas ni puntúa. `/recomendar` y `/ruta` no llaman nunca a la IA.
- **No inventar identificadores de datasets ni campos** (§2.5). Todos los campos usados en este plan se han comprobado el 14/10 en `data/perfil/perfil.json` (columnas reales). Si hace falta otro, comprobarlo antes contra la API real.
- **Claves solo en `.env`** (`AEMET_API_KEY`, `IA_*`, `ORACLE_*`). Nunca en el repositorio, en la imagen Docker, en `manifest.json`, en URLs guardadas ni en logs.
- **Nomecalles:** solo la descarga pública sin clave (§2.7).
- **Privacidad:** sin registro; **la ubicación nunca se escribe en los logs**; al proveedor de IA no se envía ubicación exacta ni datos personales (§2.8).
- **Umbrales oficiales copiados de la fuente y citados** (§2.9). Lo que no tenga fuente oficial se marca en la app como «criterio propio del proyecto». Aviso visible «no es consejo médico».
- **Accesibilidad WCAG 2.1 AA**, móvil primero; cada indicador con icono + color + texto (§2.10, arquitectura §5.3).
- **Licencias:** atribución de cada fuente en `/fuentes` y en la app (§2.11).
- **Alcance:** no añadir funcionalidades ni fuentes sin preguntar (§2.12). **Domingo 18 a última hora se congela el alcance**: desde ahí solo correcciones.
- **Orden de recorte si falta tiempo:** F6 → ruta saludable en toda la Comunidad (se queda solo Getafe) → Oracle/APEX (arquitectura §9).
- **Decisiones pendientes** (arquitectura §10): el código **lee** pesos, regla de aire, calor, lluvia, velocidades, actividades e indicadores **de `config/`**; las pruebas usan valores de prueba propios. Los ficheros de `config/` con valores reales solo se rellenan cuando el equipo decide (tareas DEC-xx). Ninguna tarea de código fija esos valores.
- **Coordenadas:** todo se guarda en EPSG:4326; reproyección desde EPSG:25830 con `pyproj` y `always_xy=True`, **ignorando los `.prj` de Nomecalles** (informe-datos §2.2).
- **Código INE** siempre de 5 dígitos (`28` + 3).
- **Si cambias requisitos o fuentes**: actualizar `docs/referencia/requisitos_fuentes.json` y `CLAUDE.md` (§2.13).
- **Rendimiento:** recomendación < 3 s, ruta < 5 s (RNF).
- **Commits:** pequeños, en español, uno por tarea como mínimo. Rama por rol (`datos/…`, `motor/…`, `rutas/…`, `front/…`) y fusión a `main` con las pruebas en verde.

## Foco de revisión

Situaciones que la spec implica y que una persona real se encontrará, aunque ninguna prueba unitaria «obvia» las cubra. Cada una tiene su prueba en la tarea indicada.

1. **Municipio con datos parciales** (sin VPLA, sin estación de aire propia, sin mobiliario en OSM; p. ej. Madrid capital sin VPLA o Patones sin Nomecalles): la nota se calcula con los factores disponibles, renormalizando pesos, y la respuesta dice qué falta («Verde: sin datos»). Nunca un 500 ni un 0 silencioso. → Prueba en **J-M3** (`test_factor_ausente_renormaliza`) y en **V-M1** (`test_recomendar_capital_sin_vpla`).
2. **Dato viejo o fuente caída** (el `aire_dia` regional de madrugada trae el día anterior; AEMET responde 429 o 5xx): se usa el último dato válido con su fecha real y un aviso; el descargador no borra lo anterior. → Pruebas en **M-D1** (`test_fallo_no_borra_manifest`) y **J-D3** (`test_aire_fecha_por_fila`).
3. **Origen o destino lejos de la red peatonal o en componentes desconectados**: error claro `RutaNoEncontrada` → la API devuelve ruta directa en línea recta marcada «aproximada» con aviso, no un 500. → Pruebas en **J-R2** (`test_inalcanzable_lanza_error`, `test_nodo_cercano_demasiado_lejos`) y **V-R1**.
4. **Pesos extremos** (todos a 0, uno al 100 %, valores fuera de 0–1): no hay división por cero; todos a 0 vuelve a los pesos por defecto con aviso. → Prueba en **J-M3** (`test_pesos_todos_cero`) y validación en **J-M1**.
5. **Ventana horaria sin previsión** (ventana que cruza medianoche, que excede las horas de AEMET o que empieza en el pasado): las horas sin previsión salen como «sin datos» y no se eligen como mejor franja; ventana pasada → error 422 legible. → Pruebas en **J-M4** (`test_ventana_cruza_medianoche`, `test_horas_sin_prevision`).

Además (restricción global, no solo foco): **la ubicación nunca aparece en los logs** → prueba `test_logs_sin_ubicacion` en **V-M1**.

---

## Mapa de ficheros

```
pyproject.toml                    dependencias Python y configuración de pytest   (M-M1)
.env.example                      + AEMET_MUNICIPIOS, AEMET_PAUSA_S               (M-D1)
scripts/
  descargar_fuentes.py            + refresco, --refresco, --forzar, cambios, OSM, AEMET, callejero (M-D1, M-D2)
  verificar_aemet.py              comprueba la API con la clave y guarda muestras (M-D3)
  exportar_openapi.py             app.openapi() → web/src/api/openapi.json       (J-M1)
  probar_pyrosm.py                medición del extracto en Getafe                 (M-R1)
config/
  umbrales_ica.yaml               bandas ICA del BOE (verificadas, con cita)      (J-M2)
  reglas.yaml                     regla de aire por perfil, calor, lluvia         (DEC-05/06/07b → J-M2 lee)
  pesos.yaml                      pesos por defecto y velocidades                 (DEC-07 → J-M3 lee)
  actividades.yaml                catálogo cerrado y reglas actividad → destino   (DEC-08 → J-D4 lee)
  rutas.yaml                      penalización por tipo de vía, suelo, radios     (DEC-07 → J-R2 lee)
  indicadores.yaml                indicadores de F5                               (DEC-09 → V-D1 lee)
ingesta/
  __init__.py
  comun.py                        rutas, cod_ine, comas decimales, reproyección, caja de la Comunidad, escritura GeoParquet (J-D1)
  normalizar/
    __init__.py                   registro de normalizadores                      (J-D1)
    municipios.py  padron.py                                                      (J-D2)
    deporte.py                    eiel_deporte, nmc_deporte, ay_polideportivos, ay_idb, ay_piscinas (J-D2)
    verde.py                      vpla_redes, eiel_parques, nmc_parques, ay_parques, areas_recreativas (J-D2)
    aire.py                       estaciones (CM + Ayto.) y lecturas (aire_dia + ay_aire) (J-D3)
    aemet.py                      previsión horaria                               (J-D3)
    mobiliario.py                 ay_fuentes, ay_bancos, ay_areas_caninas, desfibriladores (J-D2)
    servicios.py                  sanitarios, farmacias, educativos, atencion_social, eiel_*  (V-D1)
    callejero.py                  callejero_completo_2025 → Parquet de portales   (V-D2)
  construir.py                    GeoParquet → gomad.duckdb / tiempo_real.duckdb (sustitución atómica) (J-D4)
  grafo.py                        OSM → data/grafo/{nodos,tramos}.parquet         (J-R1)
api/
  __init__.py
  main.py                         arranque, /salud, routers, logs sin ubicación   (M-M1, J-M1, V-M1)
  esquemas.py                     contrato Pydantic                               (J-M1)
  configuracion.py                carga de config/*.yaml                          (J-M2)
  repositorio.py                  todas las consultas SQL                         (V-M1)
  motor/__init__.py reglas.py puntuacion.py franja.py explicacion.py           (J-M2…J-M4, V-M2)
  rutas/__init__.py grafo.py                                                      (J-R2)
  ia/__init__.py base.py oci.py plan_b.py grabadas.py                             (J-M5, D-M1)
deploy/
  Dockerfile.api  docker-compose.yml  Caddyfile  crontab                          (M-M2, V-F4, D-D1)
web/                              React + Vite (M-F2 en adelante)
tests/
  conftest.py
  scripts/test_descargar.py                                                       (M-D1, M-D2)
  ingesta/test_comun.py test_normalizar_*.py test_construir.py test_grafo.py
  motor/test_reglas.py test_puntuacion.py test_franja.py
  rutas/test_rutas.py test_latencia.py
  api/test_salud.py test_contrato.py test_endpoints.py
  datos/                          muestras pequeñas reales (aemet_28065.json, aire_dia_muestra.csv…)
```

---

## Decisiones del equipo (no las toma el código)

Cada decisión se apunta, al tomarla, en `CLAUDE.md` §11 y en `docs/arquitectura.md` §10, y se vuelca en el fichero de `config/` indicado. El código ya está preparado para leerla.

| ID | Decisión (arquitectura §10) | Propone | Decide | **Fecha límite** | Fichero | Si no se decide a tiempo |
|---|---|---|---|---|---|---|
| DEC-P04 | Aplicar correcciones de `PENDIENTES.md` P-04 al CLAUDE.md y `requisitos_fuentes.json` | Datos | Equipo | **mié 14, 18:00** | `CLAUDE.md`, JSON | Se sigue con `informe-datos.md` como referencia |
| DEC-10 | Nombre (D-10, A-03) | Equipo | Equipo | **jue 15, 10:00** | `CLAUDE.md` §1, `web/index.html` | El front usa «GoMad» como nombre provisional |
| DEC-05 | Regla de aire por perfil (D-05, A-05) | Motor (con `umbrales.md` §1.5) | Equipo | **jue 15, 12:00** | `config/reglas.yaml` → `aire` | Bloquea `/recomendar` real del viernes |
| DEC-07 | Pesos por defecto, velocidades a pie/corriendo y pesos de ruta (D-07, A-04, P-11) | Motor + Rutas | Equipo | **jue 15, 12:00** | `config/pesos.yaml`, `config/rutas.yaml` | Bloquea `/recomendar` y `/ruta` reales |
| DEC-07b | Umbral de probabilidad de lluvia (umbrales.md §3) | Motor | Equipo | **jue 15, 12:00** | `config/reglas.yaml` → `lluvia` | Regla de lluvia desactivada y aviso |
| DEC-08 | Tabla actividad → destino y catálogo cerrado (D-08, A-07) | Datos + Motor | Equipo | **jue 15, 12:00** | `config/actividades.yaml` | Bloquea la construcción real de `destino` |
| DEC-11 | Usos de IA de §6.5 (D-11, A-09) | Equipo | Equipo | **jue 15, 20:00** | `CLAUDE.md` §11 | Solo F6 |
| DEC-12 | Desnivel IGN sí/no (D-12) | Rutas | Equipo | **jue 15, 20:00** | `CLAUDE.md` §11 | Fuera del MVP |
| DEC-03 | Punto de control OCI Generative AI → plan B (D-03) | Motor | Motor (regla ya aprobada) | **jue 15, 12:00** | `.env` (`IA_*`) | Plan B automáticamente |
| DEC-06 | Umbrales de calor (D-06, A-06) — bloqueado por P-03 y M-D3 | Motor | Equipo | **vie 16, 12:00** | `config/reglas.yaml` → `calor` | Regla de calor desactivada; la app dice «sin umbral oficial de calor cargado» |
| DEC-09 | Indicadores de F5 (D-09, A-08) | Datos | Equipo | **vie 16, 12:00** | `config/indicadores.yaml` | Bloquea `/municipio` real del sábado |
| DEC-A10 | Forma de la VM de OCI (A-10) | Motor | Motor | **mié 14, al crearla** | `docs/arquitectura.md` §6 | — |
| DEC-A11 | Tamaño del grafo regional y latencia en la capital (A-11) → ¿CH por perfiles? | Rutas | Rutas + equipo | **sáb 17, 14:00** | `docs/arquitectura.md` §4.4 | Solo Getafe (recorte n.º 2) |
| DEC-A02 | Detalle de cada pantalla (A-02) | Front | Front + maquetadora | Por pantalla, antes de maquetarla | `docs/pantallas.md` | — |

**Reunión de decisiones del jueves a las 11:00 (45 min, todo el equipo):** DEC-05, DEC-07, DEC-07b, DEC-08. Motor y Datos llevan la propuesta escrita (las de `decisiones-pendientes.md` como punto de partida) y las fuentes citables localizadas para velocidades (P-11). Lo que no tenga fuente oficial queda marcado en el YAML con `criterio_propio: true` para que la app lo diga.

---

## Calendario resumido

| Día | Datos | Motor | Rutas | Front (maquetadora) |
|---|---|---|---|---|
| **Mié 14** | M-D1 script (refresco, cambios, OSM, callejero) · M-D2 AEMET en el script · M-D3 verificar AEMET · DEC-P04 | M-M1 estructura del repo · M-M2 Compose básico · M-M3 VM de OCI · P-03 leer plan de calor | M-R1 extracto OSM + pyrosm en Getafe | M-F1 bocetos · M-F2 proyecto Vite + estilos y fuentes propias |
| **Jue 15** | J-D1 `comun` · J-D2 normalizadores de referencia · J-D3 aire y AEMET · J-D4 `construir` | **J-M1 contrato (9:00–11:00)** · J-M2 `reglas` · J-M3 `puntuacion` · J-M4 `franja` · J-M5 prueba OCI GenAI | J-R1 grafo de Getafe con factores · J-R2 A\* y Dijkstra con límite · J-R3 latencia | J-F1 tipos + MSW · J-F2 Inicio · J-F3 Resultados |
| **Vie 16** | V-D1 servicios + `indicador_municipio` · V-D2 `/ubicacion` + callejero · V-D3 patrón horario del aire | V-M1 `/recomendar` real · V-M2 explicaciones | V-R1 `/ruta` en Getafe | V-F1 mapa · V-F2 detalle · V-F3 ajustes · **V-F4 primer despliegue HTTPS** |
| **Sáb 17** | S-D1 `/fuentes` + fechas · S-D2 ingesta programada | S-M1 `/municipio` | S-R1 grafo regional + validación · DEC-A11 | S-F1 ruta · S-F2 municipio |
| **Dom 18** | D-D1 caché ante caídas + cron en la VM | D-M1 F6 `/asistente/*` + grabadas | D-R1 ruta circular | D-F1 asistente · D-F2 fuentes y aviso · **D-X congelación 23:59** |
| **Lun 19** | L-1 ensayo · L-2 errores · L-3 guion · L-4 demo sin red · L-5 accesibilidad |||
| **Mar 20** | **Demo** |||

---

# MIÉRCOLES 14/10 — detalle completo

## M-D1 · Script de descarga: `refresco`, `--refresco`, `--forzar`, comprobación de cambios, OSM y callejero

**Rol:** Datos · **Duración estimada:** 2–3 h

**Ficheros:**
- Modificar: `scripts/descargar_fuentes.py` (todo el bloque `FUENTES`, `pedir`, `bajar_ckan`, `bajar_nomecalles`, `main`)
- Crear: `tests/scripts/test_descargar.py`, `tests/conftest.py` (si M-M1 aún no lo creó; si existe, no tocar)
- Modificar: `CLAUDE.md` §3 (arranque) y §6.4 (estado «implementado»)

**Interfaces:**
- Produce (otras tareas lo usan):
  - `Fuente = namedtuple("Fuente", "tipo ident grupo pesada desc refresco")`
  - `NIVELES = ("referencia", "semanal", "diario", "horario", "demanda")`
  - `seleccionar(args) -> list[str]` (ids)
  - `descargar_fuente(k: str, f: Fuente, previo: dict, forzar: bool) -> dict` (entrada nueva de manifiesto con `cambiado: bool`)
  - CLI: `--refresco <nivel>`, `--forzar`; el resto igual que hoy.
  - `data/raw/manifest.json[k]` añade `refresco`, `comprobado`, `cambiado`, `sha256`, `modificado` (CKAN), `etag`, `last_modified`.
- Consume: nada nuevo.

> **Nota sobre `semanal`:** arquitectura/CLAUDE §6.4 nombra 4 niveles, pero la propia tabla dice «OSM **semanal**». Se añade `semanal` como valor propio para que el cron semanal (OSM + grafo) sea un nivel seleccionable. No cambia la política.

**Asignación de niveles** (CLAUDE.md §6.4, copiada):

| Nivel | ids |
|---|---|
| `referencia` | `eiel_deporte`, `eiel_parques`, `eiel_nucleos`, `eiel_sanitario`, `eiel_ensenanza`, `eiel_cultural`, `vpla_redes`, `sendas`, `vias_pecuarias`, `municipios`, `zonas_aire`, `areas_recreativas`, `cubierta_terrestre`, `viales`, `padron`, `densidad`, `renta`, `zonas_bano`, `educativos`, `aire_estaciones`, `estaciones_aire_idem`, `ay_aire_estaciones`, `aire_historico`, `aire_zonas`¹, `callejero` |
| `diario` | `sanitarios`, `farmacias`, `desfibriladores`, `atencion_social`, todos los `nmc_*`, `ay_polideportivos`, `ay_idb`, `ay_piscinas`, `ay_parques`, `ay_fuentes`, `ay_bancos`, `ay_areas_caninas` |
| `semanal` | `osm` |
| `horario` | `aire_dia`, `ay_aire`, `ay_meteo`, `aemet` (M-D2) |
| `demanda` | `ay_trafico` |

¹ `aire_zonas` (municipio → zona, CKAN) no aparece en la tabla de §6.4; es tabla de referencia como `zonas_aire`. Anotarlo en CLAUDE.md §6.4 al terminar.

- [ ] **Paso 1: entorno de pruebas mínimo** (si M-M1 no está aún en `main`)

```bash
sudo apt install -y python3.12-venv python3-pip
python3 -m venv .venv && . .venv/bin/activate
pip install pytest==8.3.3
mkdir -p tests/scripts && touch tests/__init__.py tests/scripts/__init__.py
```

- [ ] **Paso 2: escribir las pruebas que fallan** — `tests/scripts/test_descargar.py`

```python
"""Pruebas del descargador. No tocan la red: se sustituye `pedir`."""
import argparse
import importlib.util
import json
import pathlib

import pytest

RAIZ = pathlib.Path(__file__).resolve().parents[2]


@pytest.fixture
def dl(tmp_path, monkeypatch):
    spec = importlib.util.spec_from_file_location("descargar_fuentes", RAIZ / "scripts" / "descargar_fuentes.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    monkeypatch.setattr(mod, "DESTINO", tmp_path / "raw")
    monkeypatch.setattr(mod, "RAIZ", tmp_path)
    return mod


def args(**kw):
    base = dict(listar=False, grupo="minimo", solo=None, incluir_pesadas=False, refresco=None, forzar=False,
                aemet_municipios=None)
    base.update(kw)
    return argparse.Namespace(**base)


def test_todas_las_fuentes_tienen_nivel(dl):
    for k, f in dl.FUENTES.items():
        assert f.refresco in dl.NIVELES, k


def test_seleccion_por_nivel_horario(dl):
    assert set(dl.seleccionar(args(refresco="horario"))) == {"aire_dia", "ay_aire", "ay_meteo", "aemet"}


def test_seleccion_por_nivel_excluye_pesadas_salvo_flag(dl):
    assert "osm" not in dl.seleccionar(args(refresco="semanal"))
    assert dl.seleccionar(args(refresco="semanal", incluir_pesadas=True)) == ["osm"]


def test_osm_y_callejero_registrados(dl):
    assert dl.FUENTES["osm"].ident == "https://download.geofabrik.de/europe/spain/madrid-latest.osm.pbf"
    assert dl.FUENTES["callejero"].ident == "callejero_completo_2025"
    assert dl.FUENTES["callejero"].tipo == "nmc"


def test_ckan_sin_cambios_no_descarga(dl, monkeypatch):
    llamadas = []
    monkeypatch.setattr(dl, "ckan_modificado", lambda base, ident: "2026-10-01T10:00:00")
    monkeypatch.setattr(dl, "pedir", lambda *a, **k: llamadas.append(a) or b"x")
    previo = {"modificado": "2026-10-01T10:00:00", "sha256": "abc", "ficheros": []}
    entrada = dl.descargar_fuente("padron", dl.FUENTES["padron"], previo, forzar=False)
    assert entrada["cambiado"] is False
    assert llamadas == []


def test_forzar_ignora_comprobacion(dl, monkeypatch):
    monkeypatch.setattr(dl, "ckan_modificado", lambda base, ident: "2026-10-01T10:00:00")
    monkeypatch.setattr(dl, "bajar_ckan", lambda base, ident, carpeta, pesadas: (
        [dl.guardar(carpeta, "a.csv", b"1;2")], ["https://x/a.csv"], "2026-10-01T10:00:00"))
    previo = {"modificado": "2026-10-01T10:00:00", "sha256": "abc", "ficheros": []}
    entrada = dl.descargar_fuente("padron", dl.FUENTES["padron"], previo, forzar=True)
    assert entrada["cambiado"] is True


def test_mismo_contenido_no_cuenta_como_cambio(dl, monkeypatch):
    monkeypatch.setattr(dl, "pedir_condicional", lambda url, previo, timeout=300: (b"<xml/>", {}))
    e1 = dl.descargar_fuente("ay_trafico", dl.FUENTES["ay_trafico"], {}, forzar=False)
    e2 = dl.descargar_fuente("ay_trafico", dl.FUENTES["ay_trafico"], e1, forzar=False)
    assert e1["cambiado"] is True and e2["cambiado"] is False


def test_304_no_descarga(dl, monkeypatch):
    monkeypatch.setattr(dl, "pedir_condicional", lambda url, previo, timeout=300: (None, {}))
    previo = {"etag": '"v1"', "sha256": "abc", "ficheros": ["data/raw/osm/madrid-latest.osm.pbf"]}
    entrada = dl.descargar_fuente("osm", dl.FUENTES["osm"], previo, forzar=False)
    assert entrada["cambiado"] is False and entrada["etag"] == '"v1"'


def test_fallo_no_borra_manifest(dl, monkeypatch, capsys):
    (dl.DESTINO).mkdir(parents=True)
    (dl.DESTINO / "manifest.json").write_text(json.dumps({"aire_dia": {"sha256": "viejo"}}), encoding="utf-8")
    def roto(*a, **k):
        raise OSError("portal caído")
    monkeypatch.setattr(dl, "bajar_ckan", roto)
    monkeypatch.setattr(dl, "ckan_modificado", lambda *a: None)
    rc = dl.ejecutar(args(solo="aire_dia"))
    manifest = json.loads((dl.DESTINO / "manifest.json").read_text(encoding="utf-8"))
    assert rc == 1
    assert manifest["aire_dia"]["sha256"] == "viejo"
    assert "error" in manifest["aire_dia"]["ultimo_fallo"]
```

- [ ] **Paso 3: ejecutar y ver que fallan**

Run: `.venv/bin/pytest tests/scripts/test_descargar.py -v`
Esperado: FAIL (`AttributeError: module 'descargar_fuentes' has no attribute 'NIVELES'` y similares).

- [ ] **Paso 4: implementar**

4a. Cabecera: añadir imports y tipos (tras `import zipfile`):

```python
import hashlib
import os
import time
import urllib.error
from collections import namedtuple

Fuente = namedtuple("Fuente", "tipo ident grupo pesada desc refresco")
NIVELES = ("referencia", "semanal", "diario", "horario", "demanda")
GEOFABRIK_MADRID = "https://download.geofabrik.de/europe/spain/madrid-latest.osm.pbf"
```

4b. `FUENTES`: renombrar el diccionario literal actual a `_FUENTES`, añadir **como sexto elemento** de cada tupla el nivel de la tabla de arriba y, al final, las dos fuentes nuevas. Después:

```python
    # --- Nuevas (14/10) ---
    "osm":       ("url", GEOFABRIK_MADRID, "completo", True,
                  "Extracto OSM de la Comunidad de Madrid (Geofabrik, ODbL): red peatonal y mobiliario", "semanal"),
    "callejero": ("nmc", "callejero_completo_2025", "completo", True,
                  "Callejero completo 2025: 855.909 portales con coordenadas (geocodificación RF-01, D-04)", "referencia"),
}
FUENTES = {k: Fuente(*v) for k, v in _FUENTES.items()}
```

Actualizar el comentario de cabecera del bloque a `# id: (tipo, identificador, grupo, pesada, descripción, refresco)`. Corregir de paso la descripción de `nmc_parques` a «Parques y jardines (845 filas, 62 municipios)» (informe-datos §3).

4c. Peticiones condicionales y huella (debajo de `pedir`):

```python
def pedir_condicional(url, previo, timeout=300):
    """GET con If-None-Match / If-Modified-Since. Devuelve (None, cabeceras) si el servidor responde 304."""
    cab = dict(UA)
    if previo.get("etag"):
        cab["If-None-Match"] = previo["etag"]
    if previo.get("last_modified"):
        cab["If-Modified-Since"] = previo["last_modified"]
    req = urllib.request.Request(url, headers=cab)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read(), {"etag": r.headers.get("ETag"), "last_modified": r.headers.get("Last-Modified")}
    except urllib.error.HTTPError as e:
        if e.code == 304:
            return None, {}
        raise


def huella(rutas):
    h = hashlib.sha256()
    for r in sorted(rutas):
        h.update(pathlib.Path(r).read_bytes())
    return h.hexdigest()


def ckan_modificado(base, ident):
    meta = json.loads(pedir(f"{base}/package_show?id={urllib.parse.quote(ident)}"))["result"]
    return meta.get("metadata_modified")
```

> Los ficheros grandes (`osm`, `callejero`) se leen enteros para la huella: ~300 MB en memoria una vez por semana/mes; aceptable. Si molesta, cambiar `huella` a lectura por bloques.

4d. `bajar_ckan` devuelve también `metadata_modified` (añadir como tercer valor de retorno):

```python
    return ([guardar(carpeta, nombre_desde_url(r["url"]), pedir(r["url"])) for r in elegidos],
            [r["url"] for r in elegidos], meta.get("metadata_modified"))
```

4e. Selección y descarga de una fuente (sustituyen al cuerpo del bucle de `main`):

```python
def seleccionar(args):
    if args.solo:
        return [x.strip() for x in args.solo.split(",") if x.strip()]
    if args.refresco:
        ids = [k for k, f in FUENTES.items() if f.refresco == args.refresco]
    else:
        ids = [k for k, f in FUENTES.items() if args.grupo == "completo" or f.grupo == "minimo"]
    return [k for k in ids if args.incluir_pesadas or not FUENTES[k].pesada]


def ahora():
    return dt.datetime.now().isoformat(timespec="seconds")


def descargar_fuente(k, f, previo, forzar, aemet_municipios=None):
    """Descarga una fuente si ha cambiado. Devuelve la entrada nueva del manifiesto."""
    carpeta = DESTINO / k
    sin_cambios = {**previo, "refresco": f.refresco, "comprobado": ahora(), "cambiado": False}
    extra = {}
    # 1) CKAN de referencia/diario: metadata_modified (las horarias cambian el recurso sin tocar el paquete)
    if f.tipo in ("ckan_cm", "ckan_ay") and f.refresco in ("referencia", "diario") and not forzar:
        base = CKAN_CM if f.tipo == "ckan_cm" else CKAN_AY
        mod = ckan_modificado(base, f.ident)
        if mod and mod == previo.get("modificado"):
            return sin_cambios
    if f.tipo == "wfs":
        contenido, extra = pedir_condicional(WFS + f.ident, {} if forzar else previo, timeout=900)
        if contenido is None:
            return sin_cambios
        rutas, urls = [guardar(carpeta, f"{k}.geojson", contenido)], [WFS + f.ident]
    elif f.tipo == "nmc":
        rutas, urls = bajar_nomecalles(f.ident, carpeta)
    elif f.tipo in ("ckan_cm", "ckan_ay"):
        base = CKAN_CM if f.tipo == "ckan_cm" else CKAN_AY
        rutas, urls, mod = bajar_ckan(base, f.ident, carpeta, f.pesada)
        extra = {"modificado": mod}
    elif f.tipo == "aemet":
        rutas, urls = bajar_aemet(carpeta, aemet_municipios)
    else:
        contenido, extra = pedir_condicional(f.ident, {} if forzar else previo)
        if contenido is None:
            return sin_cambios
        rutas, urls = [guardar(carpeta, nombre_desde_url(f.ident), contenido)], [f.ident]
    sha = huella(rutas)
    return {"tipo": f.tipo, "identificador": f.ident, "refresco": f.refresco, "urls": urls,
            "descargado": ahora(), "comprobado": ahora(),
            "ficheros": [str(r.relative_to(RAIZ)) for r in rutas],
            "bytes": sum(r.stat().st_size for r in rutas), "sha256": sha,
            "cambiado": forzar or sha != previo.get("sha256"), **{k2: v for k2, v in extra.items() if v}}
```

> `bajar_ckan(..., f.pesada)`: hoy el script pasa `args.incluir_pesadas` para decidir si baja todos los CSV de un paquete; con `--refresco` eso equivale a `f.pesada` (solo `aire_historico` tiene varios CSV). Mantener el comportamiento: si se llama con `--grupo` sin `--incluir-pesadas`, `aire_historico` ni se selecciona.

4f. `main` → `ejecutar(args)` + `main()` fino. Un fallo **no** borra la entrada anterior: se anota `ultimo_fallo`.

```python
def ejecutar(args):
    if args.listar:
        for k, f in FUENTES.items():
            print(f"{k:22} {f.grupo:8} {f.refresco:10} {'PESADA ' if f.pesada else '       '}{f.tipo:8} {f.desc}")
        return 0
    ids = seleccionar(args)
    desconocidos = [x for x in ids if x not in FUENTES]
    if desconocidos:
        print("ids desconocidos:", ", ".join(desconocidos), file=sys.stderr)
        return 2
    manifest_path = DESTINO / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    fallos = 0
    for k in ids:
        f = FUENTES[k]
        print(f"-> {k} [{f.refresco}]: {f.desc}", flush=True)
        previo = manifest.get(k, {})
        try:
            manifest[k] = descargar_fuente(k, f, previo, args.forzar, args.aemet_municipios)
            estado = "cambiado" if manifest[k]["cambiado"] else "sin cambios"
            print(f"   ok, {estado} ({manifest[k].get('bytes', 0) / 1e6:.1f} MB)")
        except Exception as e:  # una fuente caída no debe parar el resto (RNF-08)
            fallos += 1
            manifest[k] = {**previo, "ultimo_fallo": {"fecha": ahora(), "error": str(e)[:300]}}
            print(f"   ERROR: {e}", file=sys.stderr)
    DESTINO.mkdir(parents=True, exist_ok=True)
    tmp = manifest_path.with_suffix(".tmp")
    tmp.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, manifest_path)
    print(f"\nHecho: {len(ids) - fallos} correctas, {fallos} con error. Manifiesto: {manifest_path.relative_to(RAIZ)}")
    return 1 if fallos else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--listar", action="store_true", help="muestra las fuentes y sale")
    ap.add_argument("--grupo", choices=["minimo", "completo"], default="minimo")
    ap.add_argument("--solo", help="ids separados por comas (ignora --grupo y --refresco)")
    ap.add_argument("--refresco", choices=NIVELES, help="solo las fuentes de ese nivel de recarga (CLAUDE.md §6.4)")
    ap.add_argument("--incluir-pesadas", action="store_true", help="incluye capas grandes y todos los CSV históricos")
    ap.add_argument("--forzar", action="store_true", help="descarga aunque la fuente no haya cambiado")
    ap.add_argument("--aemet-municipios", help="códigos INE separados por comas o 'todos' (por defecto, AEMET_MUNICIPIOS de .env)")
    return ejecutar(ap.parse_args())
```

Actualizar el docstring del módulo con los nuevos usos (`--refresco horario`, `--forzar`, `--solo osm --incluir-pesadas`).

Hasta M-D2, `bajar_aemet` no existe: añadir de momento

```python
def bajar_aemet(carpeta, municipios):
    raise NotImplementedError("AEMET se añade en M-D2")
```

y la entrada `"aemet": ("aemet", "prediccion/especifica/municipio/horaria", "minimo", False, "AEMET: predicción horaria por municipio (clave en .env)", "horario"),` en `_FUENTES`.

- [ ] **Paso 5: comprobar que la URL de Geofabrik existe y admite peticiones condicionales**

```bash
curl -sI https://download.geofabrik.de/europe/spain/madrid-latest.osm.pbf | grep -iE '^(HTTP|content-length|etag|last-modified)'
```
Esperado: `HTTP/2 200` (o 302 a un espejo) y al menos `Last-Modified` o `ETag`. Si da 404, abrir https://download.geofabrik.de/europe/spain/madrid.html, copiar el enlace real del `.osm.pbf` y actualizar `GEOFABRIK_MADRID` y la prueba `test_osm_y_callejero_registrados`.

- [ ] **Paso 6: pruebas en verde**

Run: `.venv/bin/pytest tests/scripts/test_descargar.py -v`
Esperado: 9 PASS.

- [ ] **Paso 7: prueba real contra los portales**

```bash
python3 scripts/descargar_fuentes.py --listar | head -5           # columna de nivel visible
python3 scripts/descargar_fuentes.py --refresco referencia         # 1.ª vez: descarga y apunta modificado/sha256
python3 scripts/descargar_fuentes.py --refresco referencia         # 2.ª vez: casi todo «sin cambios»
python3 scripts/descargar_fuentes.py --solo osm,callejero --incluir-pesadas
python3 scripts/descargar_fuentes.py --solo osm                    # 2.ª vez: «sin cambios» por 304 o sha256
python3 -c "import json;m=json.load(open('data/raw/manifest.json'));print({k:(v.get('refresco'),v.get('cambiado')) for k,v in m.items()})"
```
Esperado: en la segunda pasada de `referencia`, las fuentes CKAN salen «sin cambios» **sin descargar** (rápido) y las WFS «sin cambios» por sha256 o 304. `data/raw/osm/madrid-latest.osm.pbf` y `data/raw/callejero/` existen.

- [ ] **Paso 8: documentar y commit**

En `CLAUDE.md` §3, añadir al bloque de arranque:
```bash
python3 scripts/descargar_fuentes.py --refresco referencia --incluir-pesadas   # mensual
python3 scripts/descargar_fuentes.py --refresco diario                         # 04:00
python3 scripts/descargar_fuentes.py --refresco horario                        # cada hora
python3 scripts/descargar_fuentes.py --refresco semanal --incluir-pesadas      # OSM (y después el grafo)
```
En §6.4: «Implementado el 14/10 (campo `refresco`, `--refresco`, comprobación de cambios por `metadata_modified` / `ETag`-`Last-Modified` / sha256); nivel extra `semanal` para OSM; `aire_zonas` en referencia».

```bash
git add scripts/descargar_fuentes.py tests/ CLAUDE.md
git commit -m "Descarga por niveles de recarga, comprobación de cambios, OSM y callejero"
```

**Terminado cuando:** las 9 pruebas pasan; la segunda ejecución de `--refresco referencia` no vuelve a descargar los CSV de CKAN; `osm` y `callejero` están en `data/raw/` y en el manifiesto con `refresco`, `sha256` y `cambiado`; un fallo simulado no borra la entrada anterior del manifiesto.

---

## M-D2 · AEMET en el script de descarga

**Rol:** Datos · **Depende de:** M-D1 · **Duración:** 1 h

**Ficheros:**
- Modificar: `scripts/descargar_fuentes.py` (`leer_env`, `bajar_aemet`)
- Modificar: `.env.example` (añadir `AEMET_MUNICIPIOS`, `AEMET_PAUSA_S`)
- Modificar: `tests/scripts/test_descargar.py`

**Interfaces:**
- Produce: `leer_env(ruta=RAIZ / ".env") -> dict[str, str]`; `bajar_aemet(carpeta, municipios: str | None) -> (list[Path], list[str])`; ficheros `data/raw/aemet/<cod_ine>.json` (el documento de `datos`, bytes tal cual) y `data/raw/aemet/<cod_ine>.meta.json` (respuesta de primer nivel sin la clave).
- La clave va en la **cabecera `api_key`**, no en la URL, para que nunca acabe en `manifest.json` ni en logs. (M-D3 comprueba que AEMET la acepta en cabecera; si no, se usa `?api_key=` y se **elimina** de las URLs antes de guardarlas.)

- [ ] **Paso 1: pruebas que fallan** (añadir a `tests/scripts/test_descargar.py`)

```python
def test_aemet_sin_clave_da_error_claro(dl, monkeypatch):
    monkeypatch.setattr(dl, "leer_env", lambda ruta=None: {})
    monkeypatch.delenv("AEMET_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="AEMET_API_KEY"):
        dl.bajar_aemet(dl.DESTINO / "aemet", "28065")


def test_aemet_la_clave_no_aparece_en_urls_ni_ficheros(dl, monkeypatch):
    clave = "CLAVE-SECRETA-123"
    monkeypatch.setattr(dl, "leer_env", lambda ruta=None: {"AEMET_API_KEY": clave, "AEMET_PAUSA_S": "0"})
    vistos = []

    def falso_pedir(url, timeout=300, cabeceras=None):
        vistos.append((url, cabeceras))
        if "opendata/api/prediccion" in url:
            return json.dumps({"estado": 200, "datos": "https://opendata.aemet.es/opendata/sh/abc"}).encode()
        return b'[{"nombre": "Getafe", "prediccion": {"dia": []}}]'

    monkeypatch.setattr(dl, "pedir", falso_pedir)
    rutas, urls = dl.bajar_aemet(dl.DESTINO / "aemet", "28065")
    assert all(clave not in u for u in urls)
    assert all(clave not in r.read_text(encoding="latin-1") for r in rutas)
    assert vistos[0][1]["api_key"] == clave and clave not in vistos[0][0]


def test_aemet_estado_429_es_error(dl, monkeypatch):
    monkeypatch.setattr(dl, "leer_env", lambda ruta=None: {"AEMET_API_KEY": "k", "AEMET_PAUSA_S": "0"})
    monkeypatch.setattr(dl, "pedir", lambda url, timeout=300, cabeceras=None: json.dumps(
        {"estado": 429, "descripcion": "Límite de peticiones"}).encode())
    with pytest.raises(RuntimeError, match="429"):
        dl.bajar_aemet(dl.DESTINO / "aemet", "28065")


def test_aemet_todos_lee_179_municipios(dl, monkeypatch, tmp_path):
    carpeta = dl.DESTINO / "municipios"
    carpeta.mkdir(parents=True)
    feats = [{"type": "Feature", "properties": {"CDMUNICIPIO": f"{i:03d}"}, "geometry": None} for i in range(1, 180)]
    (carpeta / "municipios.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}))
    assert len(dl.municipios_aemet("todos")) == 179
    assert dl.municipios_aemet("28065,28079") == ["28065", "28079"]
```

- [ ] **Paso 2: verlas fallar** — Run: `.venv/bin/pytest tests/scripts/test_descargar.py -k aemet -v` → FAIL (`no attribute 'leer_env'`).

- [ ] **Paso 3: implementar**

`pedir` admite cabeceras extra (compatible con las llamadas actuales):

```python
def pedir(url, timeout=300, cabeceras=None):
    req = urllib.request.Request(url, headers={**UA, **(cabeceras or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()
```

```python
AEMET = "https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/horaria/"


def leer_env(ruta=None):
    """Lee .env (KEY=valor por línea) sin dependencias. Las variables de entorno reales mandan."""
    ruta = ruta or (RAIZ / ".env")
    valores = {}
    if pathlib.Path(ruta).exists():
        for linea in pathlib.Path(ruta).read_text(encoding="utf-8").splitlines():
            linea = linea.strip()
            if linea and not linea.startswith("#") and "=" in linea:
                k, v = linea.split("=", 1)
                valores[k.strip()] = v.strip().strip('"').strip("'")
    valores.update({k: v for k, v in os.environ.items() if k.startswith("AEMET_")})
    return valores


def municipios_aemet(valor):
    if valor and valor != "todos":
        return [c.strip() for c in valor.split(",") if c.strip()]
    geo = json.loads((DESTINO / "municipios" / "municipios.geojson").read_text(encoding="utf-8"))
    return sorted("28" + str(f["properties"]["CDMUNICIPIO"]).zfill(3) for f in geo["features"])


def bajar_aemet(carpeta, municipios):
    env = leer_env()
    clave = env.get("AEMET_API_KEY")
    if not clave:
        raise RuntimeError("Falta AEMET_API_KEY en .env (ver .env.example)")
    pausa = float(env.get("AEMET_PAUSA_S", "1.5"))
    codigos = municipios_aemet(municipios or env.get("AEMET_MUNICIPIOS", "todos"))
    rutas, urls = [], []
    for cod in codigos:
        primero = json.loads(pedir(AEMET + cod, timeout=60, cabeceras={"api_key": clave}))
        if primero.get("estado") != 200:
            raise RuntimeError(f"AEMET {cod}: estado {primero.get('estado')} {primero.get('descripcion', '')}")
        rutas.append(guardar(carpeta, f"{cod}.json", pedir(primero["datos"], timeout=60)))
        meta = {k: v for k, v in primero.items() if k != "api_key"}
        rutas.append(guardar(carpeta, f"{cod}.meta.json", json.dumps(meta, ensure_ascii=False).encode("utf-8")))
        urls.append(AEMET + cod)
        time.sleep(pausa)
    return rutas, urls
```

> Si un municipio falla, `bajar_aemet` lanza y `ejecutar` mantiene la entrada anterior del manifiesto (y los ficheros de la hora anterior siguen en disco). Suficiente para el MVP; si M-D3 muestra fallos sueltos frecuentes, cambiar a «continuar con el siguiente y anotar los fallidos».

`.env.example`, debajo de `AEMET_API_KEY=`:
```
# Municipios a pedir cada hora: 'todos' (179) o códigos INE separados por comas. Ajustar a la cuota real (M-D3).
AEMET_MUNICIPIOS=todos
# Pausa entre municipios, en segundos (cada municipio son 2 peticiones)
AEMET_PAUSA_S=1.5
```

- [ ] **Paso 4: pruebas en verde** — Run: `.venv/bin/pytest tests/scripts/test_descargar.py -v` → 13 PASS.

- [ ] **Paso 5: commit**

```bash
git add scripts/descargar_fuentes.py tests/scripts/test_descargar.py .env.example
git commit -m "AEMET: previsión horaria por municipio con la clave en cabecera"
```

**Terminado cuando:** las pruebas pasan, incluida la de que la clave no aparece en URLs ni ficheros.

---

## M-D3 · Verificar la API de AEMET con la clave del equipo (P-01)

**Rol:** Datos · **Depende de:** M-D2 · **Duración:** 45 min

**Ficheros:**
- Crear: `scripts/verificar_aemet.py`
- Crear: `tests/datos/aemet_28065.json` (muestra real **sin clave**, para las pruebas de J-D3)
- Modificar: `CLAUDE.md` §7.1 (fila AEMET: «comprobado 14/10» + campos reales), `docs/referencia/umbrales.md` §3, `docs/PENDIENTES.md` (P-01 ✅)

- [ ] **Paso 1:** `cp .env.example .env` y pegar la clave del equipo en `AEMET_API_KEY` (lo hace una persona; la clave no se pega en el chat ni en ningún fichero versionado). Comprobar: `git check-ignore .env` → imprime `.env`.

- [ ] **Paso 2: script de verificación** — `scripts/verificar_aemet.py`

```python
#!/usr/bin/env python3
"""Comprueba la API de AEMET con la clave de .env y resume el esquema real.

Uso: python3 scripts/verificar_aemet.py 28065 28079
Guarda las respuestas en data/raw/aemet_verificacion/ (no se versiona) y escribe por pantalla
las claves de cada día, los periodos de cada campo, las cabeceras de cuota y la codificación.
"""
import importlib.util
import json
import pathlib
import sys
import urllib.request

RAIZ = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("dl", RAIZ / "scripts" / "descargar_fuentes.py")
dl = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dl)


def pedir_con_cabeceras(url, cab):
    req = urllib.request.Request(url, headers={**dl.UA, **cab})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read(), dict(r.headers)


def main(codigos):
    clave = dl.leer_env().get("AEMET_API_KEY")
    if not clave:
        sys.exit("Falta AEMET_API_KEY en .env")
    salida = RAIZ / "data" / "raw" / "aemet_verificacion"
    salida.mkdir(parents=True, exist_ok=True)
    for cod in codigos:
        cuerpo, cab = pedir_con_cabeceras(dl.AEMET + cod, {"api_key": clave})
        primero = json.loads(cuerpo)
        print(f"\n== {cod}: estado {primero.get('estado')} · {primero.get('descripcion')}")
        print("   cabeceras de cuota:", {k: v for k, v in cab.items() if "request" in k.lower() or "limit" in k.lower()})
        datos, cab2 = pedir_con_cabeceras(primero["datos"], {})
        print("   Content-Type de datos:", cab2.get("Content-Type"))
        try:
            texto = datos.decode("utf-8")
            print("   codificación: utf-8")
        except UnicodeDecodeError:
            texto = datos.decode("latin-1")
            print("   codificación: NO es utf-8 (leído como latin-1)")
        (salida / f"{cod}.json").write_text(texto, encoding="utf-8")
        doc = json.loads(texto)
        doc = doc[0] if isinstance(doc, list) else doc
        print("   claves raíz:", sorted(doc))
        print("   elaborado:", doc.get("elaborado"))
        dias = doc["prediccion"]["dia"]
        print("   días:", [d.get("fecha") for d in dias])
        for campo, valor in dias[0].items():
            if isinstance(valor, list) and valor and isinstance(valor[0], dict):
                print(f"   {campo}: {len(valor)} elementos; claves {sorted(valor[0])}; ejemplo {valor[0]}")
            else:
                print(f"   {campo}: {valor!r}"[:160])


if __name__ == "__main__":
    main(sys.argv[1:] or ["28065", "28079"])
```

- [ ] **Paso 3: ejecutar** — `python3 scripts/verificar_aemet.py 28065 28079 28131`

Esperado: `estado 200` en los tres. **Apuntar** (para CLAUDE.md §7.1 y para J-D3):
1. ¿AEMET acepta la clave en cabecera? (si `estado 401` → pasar a `?api_key=` en M-D2 y borrar la clave de las URLs antes de guardarlas en `urls`).
2. Codificación del documento `datos`.
3. Claves reales de cada día (esperadas según CLAUDE.md: `temperatura`, `sensTermica`, `precipitacion`, `probPrecipitacion`, `estadoCielo`, `humedadRelativa`, `vientoAndRachaMax`, `orto`, `ocaso`, `fecha`).
4. Formato de `periodo` en cada campo (¿hora `"07"` o franja `"0208"`?) y valores no numéricos (p. ej. `"Ip"` en precipitación).
5. Cuántos días y horas cubre (para el límite de la ventana de F4).
6. Cabeceras de cuota (si las hay) → ajustar `AEMET_MUNICIPIOS` y `AEMET_PAUSA_S` para que 179 municipios × 2 peticiones/hora quepan; si no caben, proponer al equipo pedir solo los municipios de las peticiones recientes (decisión del equipo; no implementarlo sin preguntar).

- [ ] **Paso 4: muestra para las pruebas** — copiar `data/raw/aemet_verificacion/28065.json` a `tests/datos/aemet_28065.json` **comprobando antes** que no contiene la clave: `grep -c "$(grep AEMET_API_KEY .env | cut -d= -f2)" tests/datos/aemet_28065.json` → `0`.

- [ ] **Paso 5: descarga real por el script** — `python3 scripts/descargar_fuentes.py --solo aemet --aemet-municipios 28065,28079` → `ok, cambiado`. Después `grep -c "$(grep AEMET_API_KEY .env | cut -d= -f2)" data/raw/manifest.json` → `0`.

- [ ] **Paso 6: documentar y commit**

CLAUDE.md §7.1, fila AEMET: quitar «sin verificar», añadir «comprobado 14/10» con lo apuntado en el paso 3. `docs/PENDIENTES.md` P-01 → ✅.

```bash
git add scripts/verificar_aemet.py tests/datos/aemet_28065.json CLAUDE.md docs/PENDIENTES.md
git commit -m "AEMET verificado con la clave del equipo: esquema real y muestra para pruebas"
```

**Terminado cuando:** hay muestra real de Getafe en `tests/datos/`, el CLAUDE.md documenta el esquema comprobado y la cuota, y la clave no aparece en ningún fichero versionado ni en el manifiesto.

---

## M-M1 · Estructura del repositorio (§9b) y entorno Python

**Rol:** Motor · **Duración:** 1 h · **Hacer primero** (las demás tareas Python dependen de `pyproject.toml`).

**Ficheros:**
- Crear: `pyproject.toml`, `api/__init__.py`, `api/main.py`, `api/motor/__init__.py`, `api/rutas/__init__.py`, `api/ia/__init__.py`, `ingesta/__init__.py`, `ingesta/normalizar/__init__.py`, `config/README.md`, `tests/__init__.py`, `tests/conftest.py`, `tests/api/test_salud.py`, `tests/datos/.gitkeep`
- Modificar: `.gitignore` (nada que añadir: `data/`, `.venv/`, `node_modules/`, `dist/` ya están)

**Interfaces:**
- Produce: `api.main:app` (FastAPI) con `GET /salud → {"estado": "ok"}`; fixture `raiz` en `tests/conftest.py`; marcador `lento`.

- [ ] **Paso 1: `pyproject.toml`**

```toml
[project]
name = "gomad"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi==0.115.0",
  "uvicorn[standard]==0.30.6",
  "pydantic==2.9.2",
  "duckdb==1.1.1",
  "numpy==2.1.1",
  "scipy==1.14.1",
  "python-igraph==0.11.6",
  "pyyaml==6.0.2",
  "httpx==0.27.2",
]

[project.optional-dependencies]
ingesta = [
  "pandas==2.2.3",
  "pyarrow==17.0.0",
  "geopandas==1.0.1",
  "pyogrio==0.10.0",
  "shapely==2.0.6",
  "pyproj==3.7.0",
]
rutas = ["pyrosm==0.6.2"]
dev = ["pytest==8.3.3"]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
markers = ["lento: necesita datos reales en data/ (se salta si faltan)"]

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools]
packages = []   # el código se importa desde la raíz (pytest pythonpath / PYTHONPATH en Docker)
```

> Las versiones son las publicadas a fecha de hoy que conocemos; si `pip` no resuelve alguna en Python 3.12, subir a la menor versión que lo haga y anotarlo en el commit. `pyrosm` va aparte porque puede no compilar en 3.12 (M-R1 lo comprueba).

- [ ] **Paso 2: instalar**

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -U pip && pip install -e ".[ingesta,dev]"
```
Esperado: sin errores. `python -c "import fastapi, duckdb, igraph, geopandas, pyproj"` no imprime nada.

- [ ] **Paso 3: prueba que falla** — `tests/api/test_salud.py`

```python
from fastapi.testclient import TestClient

from api.main import app


def test_salud():
    r = TestClient(app).get("/salud")
    assert r.status_code == 200
    assert r.json() == {"estado": "ok"}
```

`tests/conftest.py`:
```python
import pathlib

import pytest

RAIZ = pathlib.Path(__file__).resolve().parents[1]


@pytest.fixture
def raiz():
    return RAIZ
```

Run: `pytest tests/api/test_salud.py -v` → FAIL (`ModuleNotFoundError: No module named 'api.main'`).

- [ ] **Paso 4: `api/main.py` mínimo**

```python
"""API de GoMad. Sin estado: sin sesiones ni registro; la ubicación nunca se escribe en los logs."""
from fastapi import FastAPI

app = FastAPI(title="GoMad API", version="0.1.0")


@app.get("/salud")
def salud() -> dict:
    return {"estado": "ok"}
```

Crear vacíos los `__init__.py` de la lista. `config/README.md`: una línea por fichero de `config/` (ver Mapa de ficheros) diciendo qué decisión lo rellena y que **cada valor sin fuente oficial lleva `criterio_propio: true`**.

- [ ] **Paso 5:** `pytest -v` → PASS (y las de `tests/scripts/` si M-D1 ya está fusionada).

- [ ] **Paso 6: commit**

```bash
git add pyproject.toml api ingesta config tests
git commit -m "Estructura del repositorio y entorno Python"
```

**Terminado cuando:** `pip install -e ".[ingesta,dev]"` funciona en un equipo limpio y `pytest` pasa.

---

## M-M2 · Docker Compose básico

**Rol:** Motor · **Depende de:** M-M1 · **Duración:** 1 h

**Ficheros:**
- Crear: `deploy/Dockerfile.api`, `deploy/docker-compose.yml`, `deploy/Caddyfile`, `.dockerignore`

- [ ] **Paso 1: Docker en el equipo** (WSL: hoy no hay `docker`). Instalar Docker Engine en la distribución o activar la integración WSL de Docker Desktop. Comprobar: `docker compose version`.

- [ ] **Paso 2: `deploy/Dockerfile.api`**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir .
COPY api ./api
COPY config ./config
ENV PYTHONPATH=/app PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
```

> `--no-access-log`: el log de acceso de uvicorn escribe la URL completa y, en `GET /ubicacion?texto=…`, eso sería la dirección del usuario. Se desactiva desde el primer día (restricción de privacidad). El log propio sin ubicación llega en V-M1.

- [ ] **Paso 3: `deploy/docker-compose.yml`**

```yaml
services:
  api:
    build:
      context: ..
      dockerfile: deploy/Dockerfile.api
    env_file: ../.env
    volumes:
      - ../data:/app/data:ro
    restart: unless-stopped
  caddy:
    image: caddy:2.8.4
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ../web/dist:/srv/web:ro
      - caddy_datos:/data
    environment:
      - DOMINIO=${DOMINIO:-:80}
    depends_on:
      - api
    restart: unless-stopped
volumes:
  caddy_datos:
```

- [ ] **Paso 4: `deploy/Caddyfile`**

```
{$DOMINIO} {
	encode gzip
	handle /api/* {
		uri strip_prefix /api
		reverse_proxy api:8000
	}
	handle {
		root * /srv/web
		try_files {path} /index.html
		file_server
	}
	log {
		output discard
	}
}
```

> Con `DOMINIO=:80` sirve HTTP (pruebas). En V-F4 se pone el dominio real y Caddy saca el certificado de Let's Encrypt solo. `log { output discard }`: Caddy tampoco guarda URLs con ubicación.

`.dockerignore`: `data/`, `.venv/`, `web/node_modules/`, `.env`, `.git/`, `docs/presentaciones/`.

- [ ] **Paso 5: probar**

```bash
mkdir -p web/dist && echo '<!doctype html><title>GoMad</title><p>GoMad</p>' > web/dist/index.html
docker compose -f deploy/docker-compose.yml up -d --build
curl -s localhost/api/salud        # {"estado":"ok"}
curl -s localhost/ | grep GoMad
docker compose -f deploy/docker-compose.yml exec api env | grep -c AEMET_API_KEY   # 1: llega por env_file
docker compose -f deploy/docker-compose.yml exec api ls -a /app        # no debe aparecer .env (llega solo como variables)
docker compose -f deploy/docker-compose.yml down
```
Esperado: lo indicado en los comentarios.

- [ ] **Paso 6: commit** — `git add deploy .dockerignore && git commit -m "Docker Compose básico: API y Caddy"` (no subir `web/dist`, ya ignorado por `dist/`).

**Terminado cuando:** `docker compose up` sirve `/api/salud` y la página estática en local, y la imagen no contiene `.env`.

---

## M-M3 · VM de OCI (DEC-A10)

**Rol:** Motor · **Depende de:** M-M2 · **Duración:** 1–1,5 h

**Ficheros:** Modificar `docs/arquitectura.md` §6 (forma elegida, región, IP) — **sin** credenciales.

- [ ] **Paso 1: crear la VM** en la consola de OCI con la cuenta del equipo: Compute → Instances → Create. Imagen **Ubuntu 24.04**. Forma: probar primero **VM.Standard.A1.Flex (Always Free, Ampere)** con 2 OCPU / 12 GB; si la región no tiene capacidad, una forma de pago con créditos y ≥ 4 GB RAM. Clave SSH pública propia. **DEC-A10:** apuntar forma, región y motivo.
- [ ] **Paso 2: red.** En la *security list* de la VCN abrir entrada TCP 80 y 443 (0.0.0.0/0) además de 22. En la VM: `sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT && sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT && sudo netfilter-persistent save` (las imágenes Ubuntu de OCI traen iptables cerrado).
- [ ] **Paso 3: Docker en la VM:** `curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker ubuntu` y volver a entrar.
- [ ] **Paso 4: desplegar lo de M-M2:** `git clone` del repo (clave de despliegue de solo lectura o `gh`), crear `.env` **a mano en la VM** (`chmod 600 .env`), `mkdir -p web/dist data`, la misma página de prueba y `docker compose -f deploy/docker-compose.yml up -d --build`.
- [ ] **Paso 5: comprobar desde fuera:** `curl -s http://<IP_PÚBLICA>/api/salud` → `{"estado":"ok"}`. Si la imagen ARM falla al compilar alguna dependencia, anotarlo (todas las del `pyproject` tienen ruedas `aarch64`; `pyrosm` no va en la imagen de la API).
- [ ] **Paso 6: commit** de la nota en `docs/arquitectura.md` §6 y §10 (A-10 ✅).

**Terminado cuando:** `/api/salud` responde desde fuera por la IP pública. HTTPS llega en V-F4.

---

## M-M4 · Leer el plan de calor de Sanidad (P-03, desbloquea DEC-06)

**Rol:** Motor · **Duración:** 45 min

- [ ] **Paso 1:** `! sudo apt install -y poppler-utils` (la persona lo ejecuta en el prompt).
- [ ] **Paso 2:** descargar el PDF de la URL de `umbrales.md` §2 a `data/raw/calor/plan2026.pdf` y `pdftotext -layout data/raw/calor/plan2026.pdf data/raw/calor/plan2026.txt`.
- [ ] **Paso 3:** localizar la tabla de umbrales por zona meteosalud de la Comunidad de Madrid y copiar **literalmente** a `umbrales.md` §2: valores, unidad (máxima prevista), zona, página del PDF y regla de niveles. No interpretar ni redondear.
- [ ] **Paso 4:** con el esquema real de AEMET (M-D3), escribir en `umbrales.md` §2 la **propuesta** para DEC-06 (qué dato horario de AEMET se compara y con qué). No es decisión: la toma el equipo antes del vie 16, 12:00.
- [ ] **Paso 5:** commit `docs/referencia/umbrales.md`, `docs/PENDIENTES.md` (P-03 ✅).

**Terminado cuando:** `umbrales.md` §2 tiene los umbrales oficiales de Madrid con página citada y una propuesta para DEC-06.

---

## M-R1 · Extracto de OSM y prueba de pyrosm en Getafe

**Rol:** Rutas · **Depende de:** M-M1 (entorno) y M-D1 paso 7 (el `.pbf` descargado; si M-D1 no está, `curl -o data/raw/osm/madrid-latest.osm.pbf <URL de Geofabrik>`) · **Duración:** 1,5 h

**Ficheros:** Crear `scripts/probar_pyrosm.py`. Modificar `docs/arquitectura.md` §3.4 (tamaños medidos).

- [ ] **Paso 1: instalar pyrosm** — `pip install -e ".[rutas]"`. Si falla al compilar en Python 3.12 (dependencias en Cython), usar el **respaldo con pyosmium** (`pip install osmium==3.7.0`) descrito en J-R1 paso 3b y anotarlo.
- [ ] **Paso 2: `scripts/probar_pyrosm.py`**

```python
#!/usr/bin/env python3
"""Mide la red peatonal de OSM para un municipio: nodos, tramos, tiempo y memoria.

Uso: python scripts/probar_pyrosm.py 28065
"""
import json
import pathlib
import resource
import sys
import time

import geopandas as gpd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
PBF = RAIZ / "data" / "raw" / "osm" / "madrid-latest.osm.pbf"


def caja_municipio(cod_ine):
    muni = gpd.read_file(RAIZ / "data" / "raw" / "municipios" / "municipios.geojson")
    muni = muni.set_crs(25830, allow_override=True).to_crs(4326)
    fila = muni[("28" + muni["CDMUNICIPIO"].astype(str).str.zfill(3)) == cod_ine]
    if fila.empty:
        sys.exit(f"Municipio {cod_ine} no encontrado")
    return [float(v) for v in fila.total_bounds]


def main(cod_ine):
    from pyrosm import OSM
    caja = caja_municipio(cod_ine)
    t0 = time.perf_counter()
    osm = OSM(str(PBF), bounding_box=caja)
    nodos, tramos = osm.get_network(network_type="walking", nodes=True)
    seg = time.perf_counter() - t0
    mem = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024
    print(json.dumps({"municipio": cod_ine, "caja": caja, "nodos": len(nodos), "tramos": len(tramos),
                      "segundos": round(seg, 1), "memoria_max_mb": round(mem),
                      "columnas_tramos": list(tramos.columns)[:40],
                      "highway": tramos["highway"].value_counts().head(15).to_dict()}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "28065")
```

> `municipios.geojson` viene del WFS en EPSG:25830 (informe-datos §1); `set_crs(25830, allow_override=True)` evita fiarse de lo que declare el GeoJSON. **Comprobar** en la salida que la caja está en grados (≈ −3,8, 40,3 para Getafe); si sale en metros, el GeoJSON ya venía en otro CRS: quitar el `set_crs` y repetir.

- [ ] **Paso 3: ejecutar** — `python scripts/probar_pyrosm.py 28065` y luego `28079` (capital). Esperado: JSON con nodos y tramos > 0, columnas `u`, `v`, `length`, `highway`, `geometry` presentes.
- [ ] **Paso 4:** anotar en `docs/arquitectura.md` §3.4 (bajo «Tamaño estimado (sin verificar)») las cifras **medidas** de Getafe y capital: nodos, tramos, segundos, MB. Estimar la región como proporción y decir si cabe en la VM elegida en M-M3. Es la primera entrada de DEC-A11.
- [ ] **Paso 5: commit** — `git add scripts/probar_pyrosm.py docs/arquitectura.md && git commit -m "Medición de la red peatonal de OSM en Getafe y Madrid"`.

**Terminado cuando:** hay cifras medidas de Getafe y capital en `arquitectura.md` §3.4 y se sabe si pyrosm funciona en 3.12 (o se usa el respaldo).

---

## M-F1 · Bocetos con la maquetadora (DEC-A02, primera ronda)

**Rol:** Front · **Duración:** 2–3 h

**Ficheros:** Crear `docs/pantallas.md`.

- [ ] **Paso 1:** recorrer `docs/idea/muevete-cerca-prototipo.html` y la tabla de arquitectura §5.2 con la maquetadora. Para **Inicio** y **Resultados** (las del jueves), cerrar: elementos, textos, orden de foco, estados (cargando, error, vacío, «sin datos»), y cómo se ve cada indicador con icono + color + texto.
- [ ] **Paso 2:** escribir `docs/pantallas.md` con una sección por pantalla (Inicio, Resultados, Detalle, Ruta, Municipio, Perfil, Asistente, Fuentes y aviso) y, para cada una: propósito, datos que pide a la API (nombre del endpoint de arquitectura §4.1), componentes, estados y notas de accesibilidad. Las que no se cierren hoy quedan con «se cierra el <día> antes de maquetar».
- [ ] **Paso 3:** commit `docs/pantallas.md`.

**Terminado cuando:** Inicio y Resultados están cerrados en `docs/pantallas.md` (bloquean J-F2 y J-F3).

---

## M-F2 · Proyecto Vite + React + TypeScript con estilos y fuentes propias

**Rol:** Front · **Duración:** 2 h

**Ficheros:** Crear `web/` (Vite), `web/src/styles/main.css`, `web/src/styles/icons.css`, `web/public/fonts/` (Figtree y Material Symbols), `web/src/App.tsx`, `web/src/main.tsx`, `web/src/App.test.tsx`.

- [ ] **Paso 1: Node 20 LTS** (hay Node 18 sin `npm`): instalar con `nvm` (`nvm install 20 && nvm use 20`). Comprobar `node -v` → `v20.x`, `npm -v`.
- [ ] **Paso 2: crear el proyecto**

```bash
npm create vite@5.5.2 web -- --template react-ts
cd web
npm install
npm install react-router-dom@6.26.2 @tanstack/react-query@5.56.2 react-map-gl@7.1.7 maplibre-gl@4.7.1 \
  @radix-ui/react-slider@1.2.0 @radix-ui/react-dialog@1.1.1
npm install -D vitest@2.1.1 @testing-library/react@16.0.1 @testing-library/jest-dom@6.5.0 jsdom@25.0.0 \
  vitest-axe@0.1.0 msw@2.4.9 openapi-typescript@7.4.1
```
Si alguna versión no existe, usar la más cercana anterior y anotarla.

- [ ] **Paso 3: fuentes servidas por nosotros** (no `fonts.googleapis.com`, RGPD): descargar los `.woff2` de Figtree (OFL) y Material Symbols Rounded (Apache 2.0) desde sus repositorios oficiales a `web/public/fonts/` junto con sus licencias (`OFL.txt`, `LICENSE-material-symbols.txt`), y declararlos con `@font-face` en `main.css`. Comprobar que `index.html` **no** tiene ningún `<link>` a Google.
- [ ] **Paso 4: `main.css`** con las variables de color (claro y oscuro) y las clases del prototipo (`.btn1`, `.btn2`, `.score`, `.tabs`, `.seg`, `.back`, `.empty`…) copiadas de `docs/idea/muevete-cerca-prototipo.html`, más `:focus-visible` visible y `@media (prefers-reduced-motion: reduce)`. `icons.css`: clase `.icono` para Material Symbols con `aria-hidden` obligatorio en el componente.
- [ ] **Paso 5: prueba que falla** — `web/src/App.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("tiene un h1 y no tiene violaciones de axe", async () => {
    const { container } = render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    const resultado = await axe(container);
    expect(resultado.violations).toEqual([]);
  });
});
```

Configurar Vitest en `vite.config.ts` (`test: { environment: "jsdom", setupFiles: ["./src/setupTests.ts"] }`, con `import "@testing-library/jest-dom/vitest"` en `setupTests.ts`). Run: `npx vitest run` → FAIL (la plantilla no tiene `h1` accesible o tiene el logo de Vite).

- [ ] **Paso 6: `App.tsx`** con `<header>`, `<nav aria-label="Principal">` inferior («Mi entorno · Municipios · Perfil»), `<main id="contenido">` con `<h1>` y enlace «Saltar al contenido»; `index.html` con `lang="es"`. Run: `npx vitest run` → PASS. `npm run build` → sin errores.
- [ ] **Paso 7: commit** — `git add web && git commit -m "Front: proyecto Vite con estilos del prototipo y fuentes propias"` (`node_modules/` y `dist/` ya ignorados).

**Terminado cuando:** `npm run build` genera `web/dist/`, la prueba con axe pasa y no hay peticiones a Google.

---

# JUEVES 15/10 — detalle completo

## J-M1 · Contrato de la API (9:00–11:00, bloquea al resto)

**Rol:** Motor (con Front y Rutas presentes los primeros 20 min) · **Duración:** 2 h

**Ficheros:**
- Crear: `api/esquemas.py`, `scripts/exportar_openapi.py`, `tests/api/test_contrato.py`, `web/src/api/openapi.json` (generado)
- Modificar: `api/main.py` (routers con `response_model`; cuerpo `501` hasta que exista la implementación)

**Interfaces (produce; todos los roles lo usan):**

```python
# api/esquemas.py
"""Contrato de la API (arquitectura §4.1). Cambiarlo = regenerar openapi.json y los tipos del front."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Perfil = Literal["general", "mayor", "carrito", "sensible"]
Acompanante = Literal["perro", "ninos"]
Entorno = Literal["exterior", "interior", "indiferente"]
CategoriaICA = Literal["buena", "razonablemente_buena", "regular", "desfavorable",
                       "muy_desfavorable", "extremadamente_desfavorable"]


class Estricto(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Coordenada(Estricto):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class FuenteDato(Estricto):
    fuente: str                       # id de scripts/descargar_fuentes.py, p. ej. "aire_dia"
    nombre: str                       # texto para la persona, p. ej. "Calidad del aire (Comunidad de Madrid)"
    fecha: datetime | None            # fecha del dato (no de la descarga) si se conoce
    criterio_propio: bool = False     # True si el umbral/valor no tiene fuente oficial (CLAUDE.md §2.9)


class Pesos(Estricto):
    cercania: float = Field(ge=0, le=1)
    adecuacion: float = Field(ge=0, le=1)
    verde: float = Field(ge=0, le=1)
    aire: float = Field(ge=0, le=1)
    meteo: float = Field(ge=0, le=1)


class PesosRuta(Estricto):
    trafico: float = Field(ge=0, le=1)
    verde: float = Field(ge=0, le=1)
    fuentes: float = Field(ge=0, le=1)


class Actividad(Estricto):
    id: str
    nombre: str
    icono: str                        # nombre de Material Symbols
    exterior: bool | None             # None = puede ser ambas


class RespuestaActividades(Estricto):
    actividades: list[Actividad]
    perfiles: list[Perfil]
    acompanantes: list[Acompanante]
    pesos_por_defecto: Pesos


class CandidatoUbicacion(Estricto):
    etiqueta: str
    municipio: str
    cod_ine: str = Field(pattern=r"^28\d{3}$")
    coordenada: Coordenada
    precision: Literal["portal", "calle", "municipio"]


class RespuestaUbicacion(Estricto):
    candidatos: list[CandidatoUbicacion]


class PeticionRecomendar(Estricto):
    origen: Coordenada
    actividad: str | None = None      # None = «Sorpréndeme» (RF-03)
    ventana_inicio: datetime
    ventana_fin: datetime
    duracion_min: int = Field(ge=10, le=480)
    distancia_max_m: int = Field(ge=200, le=50_000)
    entorno: Entorno = "indiferente"
    perfil: Perfil = "general"
    acompanantes: list[Acompanante] = []
    pesos: Pesos | None = None        # None = por defecto (config/pesos.yaml)
    limite: int = Field(default=3, ge=1, le=20)
    desplazamiento: int = Field(default=0, ge=0)   # «Ver más» (RF-05)

    @model_validator(mode="after")
    def ventana_valida(self):
        if self.ventana_fin <= self.ventana_inicio:
            raise ValueError("ventana_fin debe ser posterior a ventana_inicio")
        return self


class DestinoResumen(Estricto):
    id: str                           # '{fuente}:{id_origen}'
    nombre: str
    tipo: Literal["instalacion", "parque", "area_recreativa", "senda", "zona_bano"]
    cubierta: bool | None
    municipio: str
    cod_ine: str
    coordenada: Coordenada
    fuente: FuenteDato


class NotaFactor(Estricto):
    factor: Literal["cercania", "adecuacion", "verde", "aire", "meteo"]
    valor: float | None = Field(ge=0, le=10)   # None = sin datos (no cuenta en la nota)
    peso: float = Field(ge=0, le=1)            # peso efectivo tras renormalizar
    texto: str                                 # «Aire: Razonablemente buena»


class HoraEvaluada(Estricto):
    hora: datetime
    nota: float | None = Field(ge=0, le=10)
    exterior_viable: bool | None               # None = sin datos para decidir
    motivos: list[str]                         # por qué no es viable o qué la penaliza
    temperatura_c: float | None
    sens_termica_c: float | None
    prob_precipitacion: float | None
    categoria_ica: CategoriaICA | None


class Recomendacion(Estricto):
    destino: DestinoResumen
    distancia_m: float
    tiempo_min: float
    nota: float = Field(ge=0, le=10)
    factores: list[NotaFactor]
    mejor_hora: datetime | None
    horas: list[HoraEvaluada]
    alternativa_cubierta: bool                 # True si se propone por lluvia/calor/aire (RF-09)
    explicacion: str                           # lenguaje llano, plantillas (RF-10)
    fuentes: list[FuenteDato]


class RespuestaRecomendar(Estricto):
    resultados: list[Recomendacion]
    hay_mas: bool
    avisos: list[str]                          # «Verde: sin datos en este municipio», «Aire de hace 3 h»
    aviso_medico: str


class PeticionRuta(Estricto):
    origen: Coordenada
    destino: Coordenada
    perfil: Perfil = "general"
    pesos: PesosRuta | None = None


class PoiRuta(Estricto):
    tipo: Literal["fuente", "banco", "papelera", "aseo", "area_canina", "juegos", "dea", "biosaludable", "supermercado"]
    coordenada: Coordenada
    fuente: str


class VarianteRuta(Estricto):
    tipo: Literal["directa", "saludable"]
    geometria: dict                            # GeoJSON LineString en EPSG:4326
    distancia_m: float
    tiempo_min: float
    pct_verde: float | None = Field(ge=0, le=100)
    metros_con_trafico: float
    pois: list[PoiRuta]
    aproximada: bool = False                   # True = línea recta (sin red peatonal)
    descripcion: str                           # «2,4 km, 30 min, 68 % por zona verde, 2 fuentes»


class RespuestaRuta(Estricto):
    directa: VarianteRuta
    saludable: VarianteRuta
    avisos: list[str]
    fuentes: list[FuenteDato]


class Indicador(Estricto):
    categoria: Literal["deporte", "naturaleza", "movilidad", "salud", "educacion", "conectividad", "social"]
    indicador: str
    nombre: str
    valor: float | None                        # None = «sin datos» explícito
    unidad: str
    anio: int | None
    fuente: FuenteDato


class RespuestaMunicipio(Estricto):
    cod_ine: str
    nombre: str
    poblacion: int | None
    indicadores: list[Indicador]
    encaje: list[str]                          # frases sin ranking (RF-18)


class ParametrosAsistente(Estricto):
    """Esquema cerrado de F6 (RF-21). El LLM solo puede rellenar esto."""
    actividad: Literal["caminar", "correr"]
    distancia_km: float | None = Field(default=None, gt=0, le=42)
    duracion_min: int | None = Field(default=None, gt=0, le=480)
    circular: bool = True
    pasar_por: list[Literal["parque", "fuente", "banco", "supermercado", "area_canina", "juegos"]] = []
    evitar: list[Literal["trafico", "cuestas"]] = []


class PeticionInterpretar(Estricto):
    texto: str = Field(min_length=3, max_length=500)


class RespuestaInterpretar(Estricto):
    parametros: ParametrosAsistente | None
    aclaracion: str | None                     # RF-24: pregunta si es ambiguo
    rechazo: str | None                        # RF-24: fuera de catálogo o consejo médico


class PeticionAsistenteRuta(Estricto):
    origen: Coordenada
    parametros: ParametrosAsistente


class Condicion(Estricto):
    condicion: str
    cumplida: bool
    detalle: str                               # dato del motor, nunca inventado


class RespuestaAsistenteRuta(Estricto):
    ruta: VarianteRuta
    condiciones: list[Condicion]
    explicacion: str
    redactada_por_ia: bool


class InfoFuente(Estricto):
    id: str
    nombre: str
    organismo: str
    licencia: str
    url: str
    ultima_recarga: datetime | None
    ultimo_fallo: datetime | None


class RespuestaFuentes(Estricto):
    fuentes: list[InfoFuente]
```

> **Pendiente de decisión dentro del contrato:** los valores de `Perfil`, `Acompanante` y el catálogo de actividades dependen de DEC-05/DEC-08; el contrato deja `actividad: str` (validado contra `config/actividades.yaml` en tiempo de ejecución) para que la decisión no obligue a regenerar tipos. Si DEC-05 añade perfiles, se amplía el `Literal` y se regenera (J-F1 paso 3).

- [ ] **Paso 1: prueba que falla** — `tests/api/test_contrato.py`

```python
import json

from fastapi.testclient import TestClient

from api.main import app

RUTAS = {
    ("get", "/actividades"), ("get", "/ubicacion"), ("post", "/recomendar"), ("post", "/ruta"),
    ("get", "/municipio/{cod_ine}"), ("post", "/asistente/interpretar"), ("post", "/asistente/ruta"),
    ("get", "/fuentes"), ("get", "/salud"),
}


def test_todas_las_rutas_del_contrato():
    esquema = app.openapi()
    presentes = {(m, p) for p, ops in esquema["paths"].items() for m in ops}
    assert RUTAS <= presentes


def test_openapi_versionado_al_dia(raiz):
    """Si falla: python scripts/exportar_openapi.py y regenerar los tipos del front (J-F1)."""
    guardado = json.loads((raiz / "web" / "src" / "api" / "openapi.json").read_text(encoding="utf-8"))
    assert guardado == app.openapi()


def test_ventana_invertida_da_422():
    cuerpo = {"origen": {"lat": 40.3, "lon": -3.73}, "ventana_inicio": "2026-10-20T10:00:00",
              "ventana_fin": "2026-10-20T09:00:00", "duracion_min": 45, "distancia_max_m": 3000}
    r = TestClient(app).post("/recomendar", json=cuerpo)
    assert r.status_code == 422


def test_campo_desconocido_da_422():
    r = TestClient(app).post("/asistente/interpretar", json={"texto": "15 km", "ubicacion": "x"})
    assert r.status_code == 422
```

Run: `pytest tests/api/test_contrato.py -v` → FAIL.

- [ ] **Paso 2: rutas en `api/main.py`** (cuerpo provisional `501`):

```python
from fastapi import FastAPI, HTTPException, Query

from api import esquemas as e

app = FastAPI(title="GoMad API", version="0.1.0")


def _pendiente():
    raise HTTPException(status_code=501, detail="Pendiente de implementar")


@app.get("/salud")
def salud() -> dict:
    return {"estado": "ok"}


@app.get("/actividades", response_model=e.RespuestaActividades)
def actividades():
    _pendiente()


@app.get("/ubicacion", response_model=e.RespuestaUbicacion)
def ubicacion(texto: str = Query(min_length=3, max_length=200)):
    _pendiente()


@app.post("/recomendar", response_model=e.RespuestaRecomendar)
def recomendar(peticion: e.PeticionRecomendar):
    _pendiente()


@app.post("/ruta", response_model=e.RespuestaRuta)
def ruta(peticion: e.PeticionRuta):
    _pendiente()


@app.get("/municipio/{cod_ine}", response_model=e.RespuestaMunicipio)
def municipio(cod_ine: str):
    _pendiente()


@app.post("/asistente/interpretar", response_model=e.RespuestaInterpretar)
def asistente_interpretar(peticion: e.PeticionInterpretar):
    _pendiente()


@app.post("/asistente/ruta", response_model=e.RespuestaAsistenteRuta)
def asistente_ruta(peticion: e.PeticionAsistenteRuta):
    _pendiente()


@app.get("/fuentes", response_model=e.RespuestaFuentes)
def fuentes():
    _pendiente()
```

- [ ] **Paso 3: `scripts/exportar_openapi.py`**

```python
#!/usr/bin/env python3
"""Exporta el contrato OpenAPI para el front: web/src/api/openapi.json."""
import json
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
from api.main import app  # noqa: E402

destino = RAIZ / "web" / "src" / "api" / "openapi.json"
destino.parent.mkdir(parents=True, exist_ok=True)
destino.write_text(json.dumps(app.openapi(), ensure_ascii=False, indent=1), encoding="utf-8")
print(f"Escrito {destino.relative_to(RAIZ)}")
```

Run: `python scripts/exportar_openapi.py && pytest tests/api -v` → PASS.

- [ ] **Paso 4: commit** — `git add api scripts/exportar_openapi.py tests/api web/src/api/openapi.json && git commit -m "Contrato de la API: modelos Pydantic y OpenAPI"`. **Avisar al equipo** (Front empieza J-F1 en cuanto esté en `main`).

**Terminado cuando:** `openapi.json` está en `main`, las 4 pruebas del contrato pasan y Front ha generado los tipos sin errores.

---

## J-M2 · Módulo `reglas` (filtros duros) y configuración

**Rol:** Motor · **Depende de:** J-M1 · **Duración:** 2 h

**Ficheros:**
- Crear: `config/umbrales_ica.yaml`, `api/configuracion.py`, `api/motor/reglas.py`, `tests/motor/__init__.py`, `tests/motor/test_reglas.py`
- `config/reglas.yaml` lo crea **DEC-05/06/07b**; el código no lo necesita para las pruebas.

**Interfaces:**
- Produce:
  - `CATEGORIAS: tuple[str, ...]` (orden de mejor a peor, como `CategoriaICA`)
  - `categoria_contaminante(contaminante: str, valor: float | None, bandas: dict) -> str | None`
  - `categoria_ica(valores: dict[str, float | None], bandas: dict) -> str | None`
  - `@dataclass ContextoHora(hora: datetime, temperatura_c, sens_termica_c, prob_precipitacion, categoria_ica)`
  - `@dataclass ResultadoReglas(exterior_viable: bool | None, motivos: list[str])`
  - `evaluar_exterior(ctx: ContextoHora, perfil: str, reglas: dict) -> ResultadoReglas`
  - `api.configuracion.cargar(nombre: str) -> dict` (lee `config/<nombre>.yaml`; `None` si no existe)
- Formato de `reglas` (lo rellena DEC-05/06/07b; estas claves son el contrato con el código):

```yaml
aire:            # DEC-05: categoría a partir de la cual NO se recomienda exterior, por perfil
  general: desfavorable
  mayor: ...
  carrito: ...
  sensible: ...
  fuente: "BOE-A-2020-10426, tabla de recomendaciones"
calor:           # DEC-06: null = regla desactivada
  sens_termica_max_c: null
  fuente: null
  criterio_propio: false
lluvia:          # DEC-07b: null = regla desactivada
  prob_precipitacion_max: null
  criterio_propio: true
```

- [ ] **Paso 1: `config/umbrales_ica.yaml`** (valores **verificados**, copiados de `umbrales.md` §1.1; límite superior de cada banda)

```yaml
# Índice Nacional de Calidad del Aire. Resolución de 2 de septiembre de 2020 (BOE-A-2020-10426),
# que sustituye el anexo de la Orden TEC/351/2019. Tabla: https://www.boe.es/datos/imagenes/disp/2020/242/10426_5606.png
# Límite SUPERIOR (µg/m³) de cada categoría, de mejor a peor. Por encima del último: dato erróneo (se descarta).
fuente: "BOE-A-2020-10426"
categorias: [buena, razonablemente_buena, regular, desfavorable, muy_desfavorable, extremadamente_desfavorable]
bandas:
  NO2:   [40, 90, 120, 230, 340, 1000]
  O3:    [50, 100, 130, 240, 380, 800]
  PM10:  [20, 40, 50, 100, 150, 1200]
  PM2_5: [10, 20, 25, 50, 75, 800]
  SO2:   [100, 200, 350, 500, 750, 1250]
periodo_horas: {NO2: 1, SO2: 1, O3: 8, PM10: 24, PM2_5: 24}
```

> Valores no enteros: la tabla del BOE es de enteros (0–40, 41–90…). Criterio de implementación: un valor pertenece a la primera banda cuyo límite superior sea **≥ valor redondeado al entero más próximo** (40,4 → 40 → buena; 40,6 → 41 → razonablemente buena). Se documenta en el YAML y en `/fuentes`.

- [ ] **Paso 2: pruebas que fallan** — `tests/motor/test_reglas.py`

```python
from datetime import datetime

import pytest

from api.configuracion import cargar
from api.motor.reglas import (CATEGORIAS, ContextoHora, categoria_contaminante, categoria_ica,
                              evaluar_exterior)

BANDAS = cargar("umbrales_ica")["bandas"]

# Reglas de PRUEBA (no son las decididas; esas van en config/reglas.yaml tras DEC-05/06/07b)
REGLAS = {
    "aire": {"general": "desfavorable", "sensible": "regular"},
    "calor": {"sens_termica_max_c": 30.0},
    "lluvia": {"prob_precipitacion_max": 50},
}


@pytest.mark.parametrize("valor,esperada", [
    (0, "buena"), (40, "buena"), (40.4, "buena"), (40.6, "razonablemente_buena"), (41, "razonablemente_buena"),
    (90, "razonablemente_buena"), (91, "regular"), (120, "regular"), (121, "desfavorable"),
    (230, "desfavorable"), (231, "muy_desfavorable"), (341, "extremadamente_desfavorable"), (1000, "extremadamente_desfavorable"),
])
def test_no2_limites_de_banda(valor, esperada):
    assert categoria_contaminante("NO2", valor, BANDAS) == esperada


@pytest.mark.parametrize("valor,esperada", [(50, "buena"), (51, "razonablemente_buena"), (130, "regular"),
                                            (131, "desfavorable"), (241, "muy_desfavorable")])
def test_o3_limites(valor, esperada):
    assert categoria_contaminante("O3", valor, BANDAS) == esperada


def test_por_encima_del_maximo_se_descarta():
    assert categoria_contaminante("NO2", 1001, BANDAS) is None


def test_sin_valor_es_none():
    assert categoria_contaminante("PM10", None, BANDAS) is None


def test_ica_es_la_peor_categoria():
    assert categoria_ica({"NO2": 30, "O3": 135, "PM10": None}, BANDAS) == "desfavorable"


def test_ica_sin_ningun_dato():
    assert categoria_ica({"NO2": None, "O3": None}, BANDAS) is None


def ctx(**kw):
    base = dict(hora=datetime(2026, 7, 15, 18), temperatura_c=25.0, sens_termica_c=25.0,
                prob_precipitacion=0.0, categoria_ica="buena")
    base.update(kw)
    return ContextoHora(**base)


def test_aire_regular_bloquea_a_sensible_y_no_a_general():
    assert evaluar_exterior(ctx(categoria_ica="regular"), "sensible", REGLAS).exterior_viable is False
    assert evaluar_exterior(ctx(categoria_ica="regular"), "general", REGLAS).exterior_viable is True


def test_lucia_ozono_alto():
    r = evaluar_exterior(ctx(categoria_ica="desfavorable"), "sensible", REGLAS)
    assert r.exterior_viable is False
    assert any("aire" in m.lower() for m in r.motivos)


def test_carmen_36_grados():
    r = evaluar_exterior(ctx(temperatura_c=36.0, sens_termica_c=37.0), "general", REGLAS)
    assert r.exterior_viable is False
    assert any("calor" in m.lower() for m in r.motivos)


def test_lluvia():
    assert evaluar_exterior(ctx(prob_precipitacion=80), "general", REGLAS).exterior_viable is False


def test_regla_desactivada_no_bloquea():
    reglas = {**REGLAS, "calor": {"sens_termica_max_c": None}}
    assert evaluar_exterior(ctx(sens_termica_c=45.0), "general", reglas).exterior_viable is True


def test_perfil_sin_regla_usa_general():
    assert evaluar_exterior(ctx(categoria_ica="desfavorable"), "carrito", REGLAS).exterior_viable is False


def test_sin_datos_de_nada_es_indeterminado():
    r = evaluar_exterior(ctx(sens_termica_c=None, temperatura_c=None, prob_precipitacion=None, categoria_ica=None),
                         "general", REGLAS)
    assert r.exterior_viable is None


def test_categorias_en_orden():
    assert CATEGORIAS[0] == "buena" and CATEGORIAS[-1] == "extremadamente_desfavorable"
```

Run: `pytest tests/motor/test_reglas.py -v` → FAIL (`ModuleNotFoundError`).

- [ ] **Paso 3: implementar**

`api/configuracion.py`:
```python
"""Carga de config/*.yaml. Los valores decididos por el equipo viven ahí, nunca en el código."""
import functools
import pathlib

import yaml

CONFIG = pathlib.Path(__file__).resolve().parent.parent / "config"


@functools.cache
def cargar(nombre: str) -> dict | None:
    ruta = CONFIG / f"{nombre}.yaml"
    if not ruta.exists():
        return None
    return yaml.safe_load(ruta.read_text(encoding="utf-8"))
```

`api/motor/reglas.py`:
```python
"""Filtros duros: ¿se puede recomendar actividad al aire libre a esta hora y con este perfil?

Umbrales leídos de config/ (umbrales_ica.yaml verificado; reglas.yaml decidido por el equipo).
"""
from dataclasses import dataclass, field
from datetime import datetime

CATEGORIAS = ("buena", "razonablemente_buena", "regular", "desfavorable",
              "muy_desfavorable", "extremadamente_desfavorable")
NOMBRE_CATEGORIA = {"buena": "Buena", "razonablemente_buena": "Razonablemente buena", "regular": "Regular",
                    "desfavorable": "Desfavorable", "muy_desfavorable": "Muy desfavorable",
                    "extremadamente_desfavorable": "Extremadamente desfavorable"}


def categoria_contaminante(contaminante, valor, bandas):
    if valor is None:
        return None
    v = round(valor)
    for categoria, limite in zip(CATEGORIAS, bandas[contaminante]):
        if v <= limite:
            return categoria
    return None  # por encima del máximo: dato erróneo (Resolución de 2020)


def categoria_ica(valores, bandas):
    cats = [categoria_contaminante(c, v, bandas) for c, v in valores.items() if c in bandas]
    cats = [c for c in cats if c is not None]
    return max(cats, key=CATEGORIAS.index) if cats else None


@dataclass
class ContextoHora:
    hora: datetime
    temperatura_c: float | None
    sens_termica_c: float | None
    prob_precipitacion: float | None
    categoria_ica: str | None


@dataclass
class ResultadoReglas:
    exterior_viable: bool | None
    motivos: list[str] = field(default_factory=list)


def evaluar_exterior(ctx, perfil, reglas):
    motivos, evaluadas = [], 0
    aire = reglas.get("aire") or {}
    limite = aire.get(perfil) or aire.get("general")
    if limite and ctx.categoria_ica is not None:
        evaluadas += 1
        if CATEGORIAS.index(ctx.categoria_ica) >= CATEGORIAS.index(limite):
            motivos.append(f"Aire {NOMBRE_CATEGORIA[ctx.categoria_ica].lower()}")
    max_calor = (reglas.get("calor") or {}).get("sens_termica_max_c")
    if max_calor is not None and ctx.sens_termica_c is not None:
        evaluadas += 1
        if ctx.sens_termica_c > max_calor:
            motivos.append(f"Calor: sensación térmica de {ctx.sens_termica_c:.0f} °C")
    max_lluvia = (reglas.get("lluvia") or {}).get("prob_precipitacion_max")
    if max_lluvia is not None and ctx.prob_precipitacion is not None:
        evaluadas += 1
        if ctx.prob_precipitacion > max_lluvia:
            motivos.append(f"Lluvia: {ctx.prob_precipitacion:.0f} % de probabilidad")
    if motivos:
        return ResultadoReglas(False, motivos)
    return ResultadoReglas(True if evaluadas else None, [])
```

Añadir `pyyaml` ya está en `pyproject`. Crear `tests/motor/__init__.py` vacío.

- [ ] **Paso 4:** `pytest tests/motor/test_reglas.py -v` → todo PASS.
- [ ] **Paso 5: commit** — `git add config/umbrales_ica.yaml api/configuracion.py api/motor/reglas.py tests/motor && git commit -m "Motor: reglas de aire (ICA del BOE), calor y lluvia leídas de configuración"`

**Terminado cuando:** las pruebas pasan, incluidos los límites de banda del ICA y las personas Carmen y Lucía con reglas de prueba.

---

## J-M3 · Módulo `puntuacion`

**Rol:** Motor · **Depende de:** J-M2 · **Duración:** 1,5 h

**Ficheros:** Crear `api/motor/puntuacion.py`, `tests/motor/test_puntuacion.py`.

**Interfaces:**
- Produce:
  - `FACTORES = ("cercania", "adecuacion", "verde", "aire", "meteo")`
  - `normalizar_pesos(pesos: dict[str, float] | None, por_defecto: dict[str, float]) -> tuple[dict[str, float], list[str]]` (pesos que suman 1 + avisos)
  - `factor_cercania(distancia_m: float, distancia_max_m: float) -> float` (0–1)
  - `factor_aire(categoria: str | None) -> float | None`
  - `factor_meteo(prob_precipitacion: float | None) -> float | None`
  - `@dataclass Nota(nota: float, por_factor: dict[str, float | None], pesos_efectivos: dict[str, float])`
  - `puntuar(factores: dict[str, float | None], pesos: dict[str, float]) -> Nota` (renormaliza sobre los disponibles)
- `adecuacion` y `verde` (0–1) los trae cada destino desde `gomad.duckdb` (J-D4).

> `factor_meteo` usa solo la probabilidad de lluvia (el calor es filtro duro en `reglas`). Es **criterio de implementación**, a confirmar en DEC-07; se marca `criterio_propio` en la respuesta.

- [ ] **Paso 1: pruebas que fallan** — `tests/motor/test_puntuacion.py`

```python
import pytest

from api.motor.puntuacion import (FACTORES, factor_aire, factor_cercania, factor_meteo, normalizar_pesos,
                                  puntuar)

# Pesos de PRUEBA (los reales salen de DEC-07 → config/pesos.yaml)
DEFECTO = {"cercania": 0.2, "adecuacion": 0.2, "verde": 0.2, "aire": 0.2, "meteo": 0.2}


def test_cercania():
    assert factor_cercania(0, 3000) == 1.0
    assert factor_cercania(1500, 3000) == pytest.approx(0.5)
    assert factor_cercania(4000, 3000) == 0.0


def test_aire_monotono():
    valores = [factor_aire(c) for c in ("buena", "razonablemente_buena", "regular", "desfavorable",
                                        "muy_desfavorable", "extremadamente_desfavorable")]
    assert valores == sorted(valores, reverse=True)
    assert valores[0] == 1.0 and valores[-1] == 0.0
    assert factor_aire(None) is None


def test_meteo():
    assert factor_meteo(0) == 1.0 and factor_meteo(100) == 0.0 and factor_meteo(None) is None


def test_nota_todo_perfecto_es_10():
    n = puntuar({f: 1.0 for f in FACTORES}, DEFECTO)
    assert n.nota == pytest.approx(10.0)


def test_factor_ausente_renormaliza():
    n = puntuar({"cercania": 1.0, "adecuacion": 1.0, "verde": None, "aire": 1.0, "meteo": 1.0}, DEFECTO)
    assert n.nota == pytest.approx(10.0)
    assert n.por_factor["verde"] is None
    assert "verde" not in n.pesos_efectivos
    assert sum(n.pesos_efectivos.values()) == pytest.approx(1.0)


def test_pesos_todos_cero_vuelve_a_defecto():
    pesos, avisos = normalizar_pesos({f: 0.0 for f in FACTORES}, DEFECTO)
    assert pesos == pytest.approx(DEFECTO)
    assert avisos


def test_pesos_se_normalizan():
    pesos, _ = normalizar_pesos({"cercania": 1, "adecuacion": 1, "verde": 0, "aire": 0, "meteo": 0}, DEFECTO)
    assert pesos["cercania"] == pytest.approx(0.5) and sum(pesos.values()) == pytest.approx(1.0)


def test_dos_personas_mismo_sitio_distinta_respuesta():
    """Guion de la demo (criterio 2.2): mover pesos cambia el orden."""
    cerca_gris = {"cercania": 1.0, "adecuacion": 0.8, "verde": 0.1, "aire": 0.6, "meteo": 1.0}
    lejos_verde = {"cercania": 0.4, "adecuacion": 0.8, "verde": 1.0, "aire": 0.9, "meteo": 1.0}
    prisa, _ = normalizar_pesos({"cercania": 1, "adecuacion": 0.2, "verde": 0, "aire": 0, "meteo": 0}, DEFECTO)
    verde, _ = normalizar_pesos({"cercania": 0.1, "adecuacion": 0.2, "verde": 1, "aire": 1, "meteo": 0}, DEFECTO)
    assert puntuar(cerca_gris, prisa).nota > puntuar(lejos_verde, prisa).nota
    assert puntuar(lejos_verde, verde).nota > puntuar(cerca_gris, verde).nota


def test_ningun_factor_disponible():
    n = puntuar({f: None for f in FACTORES}, DEFECTO)
    assert n.nota == 0.0 and n.pesos_efectivos == {}
```

Run: `pytest tests/motor/test_puntuacion.py -v` → FAIL.

- [ ] **Paso 2: implementar** — `api/motor/puntuacion.py`

```python
"""Puntuación ponderada 0–10 (RF-07). Factores normalizados 0–1; None = sin datos (no cuenta)."""
from dataclasses import dataclass

from api.motor.reglas import CATEGORIAS

FACTORES = ("cercania", "adecuacion", "verde", "aire", "meteo")


def normalizar_pesos(pesos, por_defecto):
    avisos = []
    pesos = {f: float((pesos or {}).get(f, 0.0)) for f in FACTORES} if pesos else dict(por_defecto)
    total = sum(pesos.values())
    if total <= 0:
        avisos.append("Todos los pesos estaban a cero: se usan los pesos por defecto.")
        pesos, total = dict(por_defecto), sum(por_defecto.values())
    return {f: pesos[f] / total for f in FACTORES}, avisos


def factor_cercania(distancia_m, distancia_max_m):
    if distancia_max_m <= 0:
        return 0.0
    return max(0.0, min(1.0, 1.0 - distancia_m / distancia_max_m))


def factor_aire(categoria):
    if categoria is None:
        return None
    return 1.0 - CATEGORIAS.index(categoria) / (len(CATEGORIAS) - 1)


def factor_meteo(prob_precipitacion):
    if prob_precipitacion is None:
        return None
    return max(0.0, min(1.0, 1.0 - prob_precipitacion / 100.0))


@dataclass
class Nota:
    nota: float
    por_factor: dict
    pesos_efectivos: dict


def puntuar(factores, pesos):
    disponibles = {f: v for f, v in factores.items() if v is not None and pesos.get(f, 0) > 0}
    total = sum(pesos[f] for f in disponibles)
    if total <= 0:
        return Nota(0.0, {f: factores.get(f) for f in FACTORES}, {})
    efectivos = {f: pesos[f] / total for f in disponibles}
    nota = 10.0 * sum(efectivos[f] * disponibles[f] for f in disponibles)
    return Nota(round(nota, 2), {f: factores.get(f) for f in FACTORES}, efectivos)
```

- [ ] **Paso 3:** `pytest tests/motor -v` → PASS.
- [ ] **Paso 4: commit** — `git commit -am "Motor: puntuación ponderada con renormalización de factores sin datos"` (añadir los ficheros nuevos con `git add` antes).

**Terminado cuando:** pasan las pruebas, incluida «dos personas, mismo sitio, distinta respuesta».

---

## J-M4 · Módulo `franja` (mejor hora y alternativa cubierta)

**Rol:** Motor · **Depende de:** J-M2, J-M3 · **Duración:** 1,5 h

**Ficheros:** Crear `api/motor/franja.py`, `tests/motor/test_franja.py`.

**Interfaces:**
- Consume: `ContextoHora`, `evaluar_exterior`, `puntuar`, `factor_aire`, `factor_meteo`.
- Produce:
  - `@dataclass HoraResultado(hora: datetime, nota: float | None, exterior_viable: bool | None, motivos: list[str], ctx: ContextoHora)`
  - `horas_ventana(inicio: datetime, fin: datetime) -> list[datetime]` (horas en punto, incluye la de inicio truncada)
  - `evaluar_horas(contextos: dict[datetime, ContextoHora], ventana: list[datetime], cubierta: bool | None, perfil: str, reglas: dict, factores_fijos: dict, pesos: dict) -> list[HoraResultado]`
  - `mejor_hora(resultados: list[HoraResultado]) -> HoraResultado | None`
  - `necesita_cubierta(resultados: list[HoraResultado]) -> bool` (ninguna hora viable al aire libre → RF-09)
- Reglas: un destino **cubierto** (`cubierta=True`) ignora lluvia/calor/aire; uno descubierto en una hora no viable tiene `nota=None`. Horas sin `ContextoHora` → `nota=None`, motivo «Sin previsión para esta hora».

- [ ] **Paso 1: pruebas que fallan** — `tests/motor/test_franja.py`

```python
from datetime import datetime

from api.motor.franja import evaluar_horas, horas_ventana, mejor_hora, necesita_cubierta
from api.motor.reglas import ContextoHora

REGLAS = {"aire": {"general": "desfavorable"}, "calor": {"sens_termica_max_c": 30.0},
          "lluvia": {"prob_precipitacion_max": 50}}
PESOS = {"cercania": 0.2, "adecuacion": 0.2, "verde": 0.2, "aire": 0.2, "meteo": 0.2}
FIJOS = {"cercania": 0.8, "adecuacion": 1.0, "verde": 0.7}


def ctx(h, sens=25.0, lluvia=0.0, ica="buena", dia=15):
    return ContextoHora(datetime(2026, 7, dia, h), sens, sens, lluvia, ica)


def test_horas_ventana():
    assert horas_ventana(datetime(2026, 7, 15, 18, 20), datetime(2026, 7, 15, 21, 0)) == [
        datetime(2026, 7, 15, 18), datetime(2026, 7, 15, 19), datetime(2026, 7, 15, 20)]


def test_ventana_cruza_medianoche():
    v = horas_ventana(datetime(2026, 7, 15, 22), datetime(2026, 7, 16, 1))
    assert v == [datetime(2026, 7, 15, 22), datetime(2026, 7, 15, 23), datetime(2026, 7, 16, 0)]


def test_carmen_mejor_a_ultima_hora():
    contextos = {c.hora: c for c in [ctx(17, sens=36), ctx(18, sens=34), ctx(19, sens=31), ctx(20, sens=28)]}
    res = evaluar_horas(contextos, list(contextos), False, "general", REGLAS, FIJOS, PESOS)
    assert mejor_hora(res).hora == datetime(2026, 7, 15, 20)
    assert not necesita_cubierta(res)


def test_todo_inviable_propone_cubierta():
    contextos = {c.hora: c for c in [ctx(17, sens=36), ctx(18, sens=35)]}
    res = evaluar_horas(contextos, list(contextos), False, "general", REGLAS, FIJOS, PESOS)
    assert necesita_cubierta(res)
    assert mejor_hora(res) is None


def test_destino_cubierto_ignora_calor():
    contextos = {c.hora: c for c in [ctx(17, sens=36)]}
    res = evaluar_horas(contextos, list(contextos), True, "general", REGLAS, FIJOS, PESOS)
    assert res[0].exterior_viable is None and res[0].nota is not None


def test_horas_sin_prevision():
    contextos = {datetime(2026, 7, 15, 18): ctx(18)}
    ventana = [datetime(2026, 7, 15, 18), datetime(2026, 7, 15, 19)]
    res = evaluar_horas(contextos, ventana, False, "general", REGLAS, FIJOS, PESOS)
    assert res[1].nota is None and "Sin previsión" in res[1].motivos[0]
    assert mejor_hora(res).hora == datetime(2026, 7, 15, 18)


def test_aire_peor_baja_la_nota():
    contextos = {c.hora: c for c in [ctx(8, ica="buena"), ctx(9, ica="regular")]}
    res = evaluar_horas(contextos, list(contextos), False, "general", REGLAS, FIJOS, PESOS)
    assert res[0].nota > res[1].nota
```

Run: `pytest tests/motor/test_franja.py -v` → FAIL.

- [ ] **Paso 2: implementar** — `api/motor/franja.py`

```python
"""Evaluación hora a hora y mejor franja (RF-08, RF-09)."""
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from api.motor.puntuacion import factor_aire, factor_meteo, puntuar
from api.motor.reglas import ContextoHora, evaluar_exterior


@dataclass
class HoraResultado:
    hora: datetime
    nota: float | None
    exterior_viable: bool | None
    motivos: list[str] = field(default_factory=list)
    ctx: ContextoHora | None = None


def horas_ventana(inicio, fin):
    h = inicio.replace(minute=0, second=0, microsecond=0)
    horas = []
    while h < fin:
        horas.append(h)
        h += timedelta(hours=1)
    return horas


def evaluar_horas(contextos, ventana, cubierta, perfil, reglas, factores_fijos, pesos):
    resultados = []
    for hora in ventana:
        c = contextos.get(hora)
        if c is None:
            resultados.append(HoraResultado(hora, None, None, ["Sin previsión para esta hora"]))
            continue
        if cubierta:
            viable, motivos = None, []
        else:
            r = evaluar_exterior(c, perfil, reglas)
            viable, motivos = r.exterior_viable, r.motivos
        if viable is False:
            resultados.append(HoraResultado(hora, None, False, motivos, c))
            continue
        factores = {**factores_fijos,
                    "aire": None if cubierta else factor_aire(c.categoria_ica),
                    "meteo": None if cubierta else factor_meteo(c.prob_precipitacion)}
        resultados.append(HoraResultado(hora, puntuar(factores, pesos).nota, viable, motivos, c))
    return resultados


def mejor_hora(resultados):
    candidatas = [r for r in resultados if r.nota is not None]
    return max(candidatas, key=lambda r: (r.nota, -r.hora.timestamp())) if candidatas else None


def necesita_cubierta(resultados):
    con_datos = [r for r in resultados if r.ctx is not None]
    return bool(con_datos) and all(r.exterior_viable is False for r in con_datos)
```

- [ ] **Paso 3:** `pytest tests/motor -v` → PASS.
- [ ] **Paso 4: commit** — `git add api/motor/franja.py tests/motor/test_franja.py && git commit -m "Motor: mejor franja horaria y alternativa cubierta"`

**Terminado cuando:** pasan las pruebas, incluidas ventana que cruza medianoche y horas sin previsión.

---

## J-M5 · Prueba de OCI Generative AI antes de mediodía (DEC-03)

**Rol:** Motor · **Duración:** 1 h · **Límite: 12:00**

**Ficheros:** Crear `api/ia/base.py`; `scripts/probar_ia.py`. `.env` (no versionado): `IA_PROVEEDOR`, `IA_API_KEY`/credenciales OCI, `IA_MODELO`.

**Interfaces (produce; D-M1 las implementa del todo):**

```python
# api/ia/base.py
"""Interfaz de IA (arquitectura D-03). La IA solo interpreta texto y redacta con resultados del motor."""
from typing import Protocol

from api.esquemas import Condicion, RespuestaInterpretar


class ProveedorIA(Protocol):
    def interpretar(self, texto: str) -> RespuestaInterpretar: ...
    def redactar(self, condiciones: list[Condicion], resumen_ruta: str) -> str: ...
```

- [ ] **Paso 1:** en la consola de OCI, comprobar que la región/tenencia tiene **Generative AI** disponible y un modelo de chat con salida JSON o uso de herramientas; crear política/credenciales (en `~/.oci/config` local y en `.env`, **nunca** en el repo).
- [ ] **Paso 2:** `scripts/probar_ia.py`: envía «15 km andando, por un parque, con fuentes y bancos y que pase por un supermercado» con el esquema de `ParametrosAsistente` (`ParametrosAsistente.model_json_schema()`) y valida la respuesta con `ParametrosAsistente.model_validate_json`. Mide la latencia de 5 llamadas. **No** envía ubicación.
- [ ] **Paso 3 (DEC-03):** si a las **12:00** OCI no devuelve JSON válido en < 2 s de media → **plan B** (API de Anthropic, modelo `claude-haiku-5-5` por latencia; la persona da de alta la clave en `.env`). Anotar el resultado en `docs/arquitectura.md` §10 y `CLAUDE.md` §11.
- [ ] **Paso 4:** commit `api/ia/base.py`, `scripts/probar_ia.py`, docs.

**Terminado cuando:** hay un proveedor elegido con una llamada validada contra el esquema y la latencia medida.

---

## J-D1 · `ingesta/comun.py`: utilidades de normalización

**Rol:** Datos · **Depende de:** M-M1 · **Duración:** 1,5 h

**Ficheros:** Crear `ingesta/comun.py`, `ingesta/normalizar/__init__.py`, `tests/ingesta/__init__.py`, `tests/ingesta/test_comun.py`.

**Interfaces (produce):**
- `RAIZ`, `RAW = RAIZ/"data"/"raw"`, `CLEAN = RAIZ/"data"/"clean"`
- `a_float(v) -> float | None` (coma decimal, vacíos, `None`)
- `cod_ine(v) -> str | None` (`"6"`→`"28006"`, `"079"`→`"28079"`, `"28079"`→`"28079"`, vacío/`RESERVADO`→`None`)
- `normalizar_nombre(nombre: str) -> str` (minúsculas, sin tildes, artículos reordenados: «Rozas de Madrid (Las)» y «Las Rozas de Madrid» → mismo valor)
- `a_wgs84(xs, ys) -> tuple[np.ndarray, np.ndarray]` desde EPSG:25830
- `municipios() -> geopandas.GeoDataFrame` (EPSG:4326, columnas `cod_ine`, `nombre`, `nombre_norm`, `geometry`) — cacheada
- `asignar_municipio(gdf) -> gdf` (rellena `cod_ine` por punto en polígono donde falte)
- `filtrar_comunidad(gdf) -> tuple[gdf, int]` (quita fuera del polígono de la Comunidad y (0,0); devuelve descartados)
- `leer_csv(ruta, sep=";") -> pandas.DataFrame` (prueba `utf-8-sig` y si falla `cp1252`; todo como texto)
- `escribir(gdf, nombre: str) -> Path` (GeoParquet en `CLEAN/<nombre>.parquet`, escribe a `.tmp` y `os.replace`)
- `puntos(df, x, y, crs) -> GeoDataFrame` (`crs` 25830 o 4326; quita filas sin coordenadas)
- `REGISTRO: dict[str, Callable[[], Path]]` y decorador `@normalizador("nombre")` en `ingesta/normalizar/__init__.py`; `python -m ingesta.normalizar [nombres…]` ejecuta todos o los indicados.

- [ ] **Paso 1: pruebas que fallan** — `tests/ingesta/test_comun.py`

```python
import numpy as np
import pandas as pd
import pytest

from ingesta import comun


@pytest.mark.parametrize("v,esperado", [("40,123", 40.123), ("40.5", 40.5), ("", None), (None, None),
                                        (" -3,7 ", -3.7), ("abc", None), (12, 12.0)])
def test_a_float(v, esperado):
    assert comun.a_float(v) == esperado


@pytest.mark.parametrize("v,esperado", [("6", "28006"), ("079", "28079"), ("28079", "28079"), (65, "28065"),
                                        ("", None), ("RESERVADO", None), (None, None)])
def test_cod_ine(v, esperado):
    assert comun.cod_ine(v) == esperado


def test_normalizar_nombre():
    assert comun.normalizar_nombre("Rozas de Madrid (Las)") == comun.normalizar_nombre("LAS ROZAS DE MADRID")
    assert comun.normalizar_nombre("Álamo, El") == comun.normalizar_nombre("El Álamo")


def test_reproyeccion_getafe():
    # Portal de prueba de D-04 (calle Madrid 10, Getafe): x 437838,98 / y 4461942,01
    lon, lat = comun.a_wgs84(np.array([437838.98]), np.array([4461942.01]))
    assert -3.8 < lon[0] < -3.65 and 40.25 < lat[0] < 40.35


def test_leer_csv_cp1252(tmp_path):
    ruta = tmp_path / "x.csv"
    ruta.write_bytes("Territorio;Valor\nMóstoles;1\n".encode("cp1252"))
    df = comun.leer_csv(ruta)
    assert df.loc[0, "Territorio"] == "Móstoles"


def test_leer_csv_utf8_bom(tmp_path):
    ruta = tmp_path / "x.csv"
    ruta.write_bytes("﻿municipio;valor\nGetafe;1\n".encode("utf-8"))
    assert list(comun.leer_csv(ruta).columns) == ["municipio", "valor"]


@pytest.mark.lento
def test_municipios_son_179():
    m = comun.municipios()
    assert len(m) == 179 and m["cod_ine"].str.match(r"^28\d{3}$").all()
    assert m.crs.to_epsg() == 4326


@pytest.mark.lento
def test_filtrar_comunidad_quita_fuera_y_ceros():
    df = pd.DataFrame({"x": [437838.98, 0, 100000], "y": [4461942.01, 0, 4000000]})
    gdf = comun.puntos(df, "x", "y", 25830)
    dentro, descartados = comun.filtrar_comunidad(gdf)
    assert len(dentro) == 1 and descartados == 2
```

`tests/conftest.py`: añadir que las pruebas `lento` se salten si falta `data/raw/municipios/municipios.geojson`:

```python
def pytest_collection_modifyitems(config, items):
    if (RAIZ / "data" / "raw" / "municipios" / "municipios.geojson").exists():
        return
    saltar = pytest.mark.skip(reason="faltan datos reales en data/raw (python3 scripts/descargar_fuentes.py)")
    for item in items:
        if "lento" in item.keywords:
            item.add_marker(saltar)
```

Run: `pytest tests/ingesta/test_comun.py -v` → FAIL.

- [ ] **Paso 2: implementar** — `ingesta/comun.py`

```python
"""Utilidades comunes de normalización (informe-datos §2 y §4)."""
import functools
import os
import pathlib
import unicodedata

import geopandas as gpd
import numpy as np
import pandas as pd
from pyproj import Transformer

RAIZ = pathlib.Path(__file__).resolve().parent.parent
RAW = RAIZ / "data" / "raw"
CLEAN = RAIZ / "data" / "clean"
_A_WGS84 = Transformer.from_crs(25830, 4326, always_xy=True)
_ARTICULOS = ("el", "la", "los", "las")


def a_float(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return None if pd.isna(v) else float(v)
    s = str(v).strip().replace(",", ".")
    try:
        return float(s) if s else None
    except ValueError:
        return None


def cod_ine(v):
    if v is None:
        return None
    s = str(v).strip()
    if not s.isdigit():
        return None
    if len(s) == 5 and s.startswith("28"):
        return s
    if len(s) <= 3:
        return "28" + s.zfill(3)
    return None


def normalizar_nombre(nombre):
    s = unicodedata.normalize("NFKD", str(nombre)).encode("ascii", "ignore").decode().lower().strip()
    for art in _ARTICULOS:
        if s.endswith(f"({art})"):
            s = f"{art} " + s[: -len(art) - 2].strip()
        elif s.endswith(f", {art}"):
            s = f"{art} " + s[: -len(art) - 2].strip()
    return " ".join(s.replace("-", " ").split())


def a_wgs84(xs, ys):
    lon, lat = _A_WGS84.transform(np.asarray(xs, dtype=float), np.asarray(ys, dtype=float))
    return np.asarray(lon), np.asarray(lat)


def leer_csv(ruta, sep=";"):
    for codif in ("utf-8-sig", "cp1252"):
        try:
            return pd.read_csv(ruta, sep=sep, dtype=str, encoding=codif, keep_default_na=False)
        except UnicodeDecodeError:
            continue
    raise ValueError(f"Codificación no reconocida: {ruta}")


def puntos(df, x, y, crs):
    xs, ys = df[x].map(a_float), df[y].map(a_float)
    ok = xs.notna() & ys.notna()
    df, xs, ys = df[ok].copy(), xs[ok].to_numpy(), ys[ok].to_numpy()
    if crs == 25830:
        xs, ys = a_wgs84(xs, ys)
    return gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(xs, ys), crs=4326)


@functools.cache
def municipios():
    g = gpd.read_file(RAW / "municipios" / "municipios.geojson")
    g = g.set_crs(25830, allow_override=True).to_crs(4326)
    g["cod_ine"] = g["CDMUNICIPIO"].map(cod_ine)
    g["nombre"] = g["DSMUNICIPIO"]
    g["nombre_norm"] = g["nombre"].map(normalizar_nombre)
    return g[["cod_ine", "nombre", "nombre_norm", "geometry"]]


def asignar_municipio(gdf):
    falta = gdf["cod_ine"].isna() if "cod_ine" in gdf else pd.Series(True, index=gdf.index)
    if falta.any():
        unido = gpd.sjoin(gdf.loc[falta, ["geometry"]], municipios()[["cod_ine", "geometry"]],
                          how="left", predicate="within")
        unido = unido[~unido.index.duplicated()]
        gdf.loc[falta, "cod_ine"] = unido["cod_ine"]
    return gdf


def filtrar_comunidad(gdf):
    comunidad = municipios().union_all()
    geom = gdf.geometry
    ok = ~((geom.x == 0) & (geom.y == 0)) if (geom.geom_type == "Point").all() else pd.Series(True, index=gdf.index)
    ok &= geom.intersects(comunidad)
    return gdf[ok].copy(), int((~ok).sum())


def escribir(gdf, nombre):
    CLEAN.mkdir(parents=True, exist_ok=True)
    destino = CLEAN / f"{nombre}.parquet"
    tmp = destino.with_suffix(".tmp")
    gdf.to_parquet(tmp, index=False)
    os.replace(tmp, destino)
    return destino
```

> **Comprobar** en la primera ejecución (`test_municipios_son_179`) que el GeoJSON está de verdad en 25830 (las coordenadas de `total_bounds` antes de reproyectar deben ser ~ 370.000–500.000 / 4.410.000–4.560.000). Si el WFS lo sirviera en otro CRS, ajustar `set_crs`.

`ingesta/normalizar/__init__.py`:

```python
"""Registro de normalizadores: uno por fuente → data/clean/<nombre>.parquet.

Uso: python -m ingesta.normalizar                 # todos
     python -m ingesta.normalizar deporte verde   # solo esos
"""
import importlib
import pkgutil

REGISTRO = {}


def normalizador(nombre):
    def registrar(func):
        REGISTRO[nombre] = func
        return func
    return registrar


def cargar_todos():
    for m in pkgutil.iter_modules(__path__):
        importlib.import_module(f"{__name__}.{m.name}")
    return REGISTRO
```

`ingesta/normalizar/__main__.py`:

```python
import sys
import traceback

from ingesta.normalizar import cargar_todos

registro = cargar_todos()
nombres = sys.argv[1:] or list(registro)
fallos = 0
for n in nombres:
    try:
        print(f"-> {n}: {registro[n]()}")
    except Exception:  # una fuente rota no para el resto; el parquet anterior se mantiene
        fallos += 1
        traceback.print_exc()
sys.exit(1 if fallos else 0)
```

- [ ] **Paso 3:** `pytest tests/ingesta/test_comun.py -v` → PASS (las `lento` también, si hay `data/raw`).
- [ ] **Paso 4: commit** — `git add ingesta tests && git commit -m "Ingesta: utilidades comunes de normalización"`

**Terminado cuando:** las pruebas pasan con los datos reales descargados.

---

## J-D2 · Normalizadores de referencia y diario (municipios, padrón, deporte, verde, mobiliario)

**Rol:** Datos · **Depende de:** J-D1 · **Duración:** 3 h

**Ficheros:** Crear `ingesta/normalizar/municipios.py`, `padron.py`, `deporte.py`, `verde.py`, `mobiliario.py`; `tests/ingesta/test_normalizar_referencia.py`.

**Interfaces (produce — esquemas de `data/clean/`, que J-D4 consume):**

| Fichero | Columnas | Geometría |
|---|---|---|
| `municipio.parquet` | `cod_ine`, `nombre`, `nombre_norm`, `en_eiel` (bool), `en_vpla` (bool) | polígono |
| `padron.parquet` | `cod_ine`, `anio` (int), `poblacion` (int) | — (DataFrame Parquet) |
| `destino_bruto.parquet` | `id`, `fuente`, `id_origen`, `nombre`, `tipo`, `cubierta` (bool/None), `accesible` (bool/None), `estado`, `titular`, `agua` (bool/None), `deportes` (list[str]: columnas EIEL con «SI»), `tipoinstal`, `etiqueta`, `area_m2`, `url`, `cod_ine` | punto (polígonos → `representative_point`) |
| `verde.parquet` | `id`, `fuente`, `cod_ine`, `uso_deta`, `area_m2` | polígono (para `pct_verde` del grafo y el factor verde) |
| `poi.parquet` | `id`, `tipo` (`fuente`, `banco`, `area_canina`, `dea`), `fuente`, `cod_ine` | punto |

Campos de origen (todos comprobados en `data/perfil/perfil.json` el 14/10):
- `municipios`: `CDMUNICIPIO`, `DSMUNICIPIO`.
- `padron`: `Año`, `Tipo territorio`, `Código territorio`, `Territorio`, `Sexo`, `Valor` (cp1252; filtrar `Tipo territorio` = municipios; ver valores reales de `Sexo` para el total).
- `eiel_deporte`: `PROV`, `MUN`, `ENT`, `POBLAMIENT`, `ORDEN_INST`, `NOMBRE`, `TIPOINSTAL`, `SUP_CUBI`, `TITULAR`, `ACCESOSILL`, `ESTADO` y las columnas por deporte `ATLETISMO`…`VELA` (lista exacta en el perfil).
- `nmc_deporte`: `CMUN`, `DESCR`, `ETIQUETA`, `UTM_X`, `UTM_Y`, `ID_APP`, `URL`.
- `ay_polideportivos`/`ay_idb`/`ay_piscinas`/`ay_parques`: `PK`, `NOMBRE`, `LATITUD`, `LONGITUD`, `CONTENT-URL`, `EQUIPAMIENTO`, `ACCESIBILIDAD` (cp1252).
- `vpla_redes`: `CDID`, `CD_MUNICIPIO`, `DS_USO_GENE`, `DS_USO_DETA`, `NM_AREA`.
- `eiel_parques`: `PROV`, `MUN`, `ENT`, `POBLAMIENT`, `ORDEN_PARQ`, `NOMBRE`, `TIPOPARQUE`, `AGUA`, `JUEGOSINFA`, `ACCESOSILL`, `ESTADO`, `SUP_AIRE`.
- `nmc_parques`: `CMUN`, `ETIQUETA`, `DESCR`, `UTM_X`, `UTM_Y`.
- `areas_recreativas`: `DS_NOMBRE`, `DS_MUNI`, `NM_COOX`, `NM_COOY`, `IT_FUENTE`, `IT_BANCOS`.
- `ay_fuentes`/`ay_bancos`/`ay_areas_caninas`: `ID`, `COORD_GIS_X`, `COORD_GIS_Y` (25830; **no** `LATITUD/LONGITUD`, informe §2.1), `ESTADO`.
- `desfibriladores`: `codigo_dea`, `municipio_codigo`, `direccion_coordenada_x`, `direccion_coordenada_y` (25830; las lat/lon tienen coma decimal).

- [ ] **Paso 1: pruebas que fallan** — `tests/ingesta/test_normalizar_referencia.py`

```python
import geopandas as gpd
import pandas as pd
import pytest

from ingesta.comun import CLEAN, municipios
from ingesta.normalizar import cargar_todos

pytestmark = pytest.mark.lento
R = cargar_todos()


def leer(nombre):
    return gpd.read_parquet(CLEAN / f"{nombre}.parquet")


def comprobar_puntos(gdf):
    assert gdf.crs.to_epsg() == 4326
    assert gdf["cod_ine"].dropna().str.match(r"^28\d{3}$").all()
    comunidad = municipios().union_all().buffer(0.01)
    assert gdf.geometry.representative_point().within(comunidad).all()


def test_municipio():
    R["municipio"]()
    m = leer("municipio")
    assert len(m) == 179
    assert m.loc[m.cod_ine == "28065", "en_eiel"].item() is False   # Getafe no está en EIEL
    assert m.loc[m.cod_ine == "28079", "en_vpla"].item() is False   # capital fuera de VPLA
    assert m["en_vpla"].sum() == 166 and m["en_eiel"].sum() == 155


def test_padron():
    R["padron"]()
    p = pd.read_parquet(CLEAN / "padron.parquet")
    ultimo = p[p.anio == p.anio.max()]
    assert ultimo["cod_ine"].nunique() == 179
    assert ultimo.loc[ultimo.cod_ine == "28079", "poblacion"].item() > 3_000_000


def test_destino_bruto():
    R["destino_bruto"]()
    d = leer("destino_bruto")
    comprobar_puntos(d)
    assert d["id"].is_unique
    assert (d.fuente == "eiel_deporte").sum() == 726
    assert (d[d.fuente == "nmc_deporte"].cod_ine == "28065").sum() == 19
    assert d[d.fuente == "nmc_deporte"].cod_ine.nunique() == 178
    eiel = d[d.fuente == "eiel_deporte"]
    assert eiel["deportes"].map(lambda xs: "PADEL" in xs).sum() == 154
    assert eiel["deportes"].map(lambda xs: "NATACION" in xs).sum() == 0     # columna vacía (CLAUDE.md §8)


def test_verde():
    R["verde"]()
    v = leer("verde")
    vpla = v[v.fuente == "vpla_redes"]
    assert len(vpla) == 16_867                                             # «Zonas Verdes y Espacios Libres»
    assert vpla.cod_ine.nunique() == 166
    getafe = vpla[vpla.cod_ine == "28065"]
    assert len(getafe) == 648 and round(getafe.area_m2.sum() / 1e6, 1) == 33.4   # informe-datos §3


def test_poi():
    R["poi"]()
    p = leer("poi")
    comprobar_puntos(p)
    assert (p.tipo == "banco").sum() >= 76_000                             # ay_bancos por COORD_GIS (76.627)
    assert (p.tipo == "area_canina").sum() == 112
    assert (p.tipo == "dea").sum() > 12_000
```

> Las cifras de las aserciones salen de `docs/informe-datos.md` (perfil del 14/10). Si una descarga nueva cambia una cifra, comprobar el motivo y actualizar la prueba y el informe en el mismo commit.

Run: `pytest tests/ingesta/test_normalizar_referencia.py -v` → FAIL (`KeyError: 'municipio'`).

- [ ] **Paso 2: `ingesta/normalizar/municipios.py`**

```python
import geopandas as gpd

from ingesta.comun import RAW, cod_ine, escribir, municipios
from ingesta.normalizar import normalizador


@normalizador("municipio")
def normalizar():
    m = municipios().copy()
    eiel = gpd.read_file(RAW / "eiel_deporte" / "eiel_deporte.geojson", columns=["MUN"], ignore_geometry=True)
    vpla = gpd.read_file(RAW / "vpla_redes" / "vpla_redes.geojson", columns=["CD_MUNICIPIO"], ignore_geometry=True)
    m["en_eiel"] = m["cod_ine"].isin(set(eiel["MUN"].map(cod_ine)))
    m["en_vpla"] = m["cod_ine"].isin(set(vpla["CD_MUNICIPIO"].map(cod_ine)))
    return escribir(m, "municipio")
```

> `en_eiel` se deduce de la capa de deporte (155 municipios = los de EIEL). Si `MUN` viniera con prefijo de provincia, `cod_ine` lo admite (5 dígitos).

- [ ] **Paso 3: `ingesta/normalizar/padron.py`**

```python
import pandas as pd

from ingesta.comun import CLEAN, RAW, leer_csv, municipios, normalizar_nombre
from ingesta.normalizar import normalizador


@normalizador("padron")
def normalizar():
    ruta = next((RAW / "padron").glob("*.csv"))
    df = leer_csv(ruta)
    df = df[df["Tipo territorio"].str.lower().str.startswith("municipio")]
    df = df[df["Sexo"].str.lower().isin(["total", "ambos sexos"])]
    nombres = dict(zip(municipios()["nombre_norm"], municipios()["cod_ine"]))
    df["cod_ine"] = df["Territorio"].map(lambda t: nombres.get(normalizar_nombre(t)))
    sin = df["cod_ine"].isna().sum()
    if sin:
        print(f"   padron: {sin} filas sin casar por nombre:", sorted(df.loc[df.cod_ine.isna(), "Territorio"].unique())[:10])
    out = pd.DataFrame({"cod_ine": df["cod_ine"], "anio": df["Año"].astype(int),
                        "poblacion": df["Valor"].map(lambda v: int(float(str(v).replace(".", "").replace(",", "."))))})
    out = out.dropna(subset=["cod_ine"])
    CLEAN.mkdir(parents=True, exist_ok=True)
    destino = CLEAN / "padron.parquet"
    out.to_parquet(destino, index=False)
    return destino
```

> **Antes de ejecutar**, mirar los valores reales de `Tipo territorio` y `Sexo` en el perfil (`data/perfil/perfil.json` → `padron`) y ajustar los dos filtros a esos literales exactos. Comprobar también si `Código territorio` trae el código INE: si es así, usarlo con `cod_ine()` en lugar del nombre (más fiable). Si `Valor` trae separador de miles con punto, la conversión de arriba lo cubre; si trae decimales con coma, también.

- [ ] **Paso 4: `ingesta/normalizar/deporte.py`**

```python
import geopandas as gpd
import pandas as pd

from ingesta.comun import RAW, a_float, asignar_municipio, cod_ine, escribir, filtrar_comunidad, leer_csv, puntos
from ingesta.normalizar import normalizador

COLUMNAS_DEPORTE = ["SUBACUATIC", "ATLETISMO", "BEISBOL", "BALONCESTO", "BALONMANO", "BOLOS", "BALONVOLEA",
                    "DEPINVIERN", "ESQUINAUTI", "FUTBOL", "GOLF", "GIMNASIA", "JUDOKARATE", "LUCHA", "NATACION",
                    "OTROS", "PADEL", "PELOTA", "PIRAGUISMO", "PATINAJE", "REMO", "TENIS", "TIROALPLAT", "VELA"]
COLUMNAS = ["id", "fuente", "id_origen", "nombre", "tipo", "cubierta", "accesible", "estado", "titular", "agua",
            "deportes", "tipoinstal", "etiqueta", "area_m2", "url", "cod_ine", "geometry"]


def si(v):
    return str(v).strip().upper() == "SI"


def eiel_deporte():
    g = gpd.read_file(RAW / "eiel_deporte" / "eiel_deporte.geojson").set_crs(25830, allow_override=True).to_crs(4326)
    g["geometry"] = g.geometry.representative_point()
    g["id_origen"] = g[["PROV", "MUN", "ENT", "POBLAMIENT", "ORDEN_INST"]].astype(str).agg("-".join, axis=1)
    g["fuente"], g["tipo"] = "eiel_deporte", "instalacion"
    g["nombre"] = g["NOMBRE"]
    g["cubierta"] = g["SUP_CUBI"].map(lambda v: (a_float(v) or 0) > 0)
    g["accesible"] = g["ACCESOSILL"].map(lambda v: None if not v else not str(v).upper().startswith("SIN"))
    g["estado"], g["titular"], g["tipoinstal"] = g["ESTADO"], g["TITULAR"], g["TIPOINSTAL"]
    g["deportes"] = g[COLUMNAS_DEPORTE].apply(lambda fila: [c for c in COLUMNAS_DEPORTE if si(fila[c])], axis=1)
    g["cod_ine"] = g["MUN"].map(cod_ine)
    return g


def nmc_deporte():
    df = gpd.read_file(next((RAW / "nmc_deporte").glob("*.shp")), ignore_geometry=True)   # .prj no fiable
    g = puntos(df, "UTM_X", "UTM_Y", 25830)
    g["id_origen"] = g["ID_APP"].where(g["ID_APP"].astype(str).str.strip() != "", g.index.astype(str))
    g["fuente"], g["tipo"] = "nmc_deporte", "instalacion"
    g["nombre"], g["etiqueta"], g["url"] = g["DESCR"], g["ETIQUETA"], g["URL"]
    g["cod_ine"] = g["CMUN"].map(cod_ine)
    g["deportes"] = [[] for _ in range(len(g))]
    return g


def ayuntamiento(fuente):
    df = leer_csv(next((RAW / fuente).glob("*.csv")))
    g = puntos(df, "LONGITUD", "LATITUD", 4326)
    g["id_origen"], g["fuente"], g["tipo"] = g["PK"], fuente, "instalacion"
    g["nombre"], g["url"], g["etiqueta"] = g["NOMBRE"], g["CONTENT-URL"], g["EQUIPAMIENTO"]
    g["cod_ine"] = "28079"
    g["deportes"] = [[] for _ in range(len(g))]
    return g


@normalizador("destino_bruto")
def normalizar():
    from ingesta.normalizar.verde import destinos_verdes   # parques también son destinos
    partes = [eiel_deporte(), nmc_deporte()] + [ayuntamiento(f) for f in ("ay_polideportivos", "ay_idb", "ay_piscinas")]
    partes += destinos_verdes()
    todo = pd.concat([p.reindex(columns=COLUMNAS) for p in partes], ignore_index=True)
    todo["id"] = todo["fuente"] + ":" + todo["id_origen"].astype(str)
    todo = gpd.GeoDataFrame(todo, geometry="geometry", crs=4326)
    todo = asignar_municipio(todo)
    todo, fuera = filtrar_comunidad(todo)
    print(f"   destino_bruto: {len(todo)} destinos, {fuera} fuera de la Comunidad descartados")
    return escribir(todo, "destino_bruto")
```

> `id_origen` de EIEL: concatenación de los campos de clave EIEL. La prueba `d["id"].is_unique` lo verifica; si hay duplicados, añadir `NOMBRE` y anotarlo. `ACCESOSILL`: mirar en el perfil los literales reales (el informe habla de 77 «SIN ACCESO») y ajustar la regla si hay otros valores.

- [ ] **Paso 5: `ingesta/normalizar/verde.py`**

```python
import geopandas as gpd

from ingesta.comun import RAW, a_float, cod_ine, escribir, leer_csv, puntos
from ingesta.normalizar import normalizador


def vpla_verde():
    g = gpd.read_file(RAW / "vpla_redes" / "vpla_redes.geojson").set_crs(25830, allow_override=True)
    g = g[g["DS_USO_GENE"] == "Zonas Verdes y Espacios Libres"].to_crs(4326)
    g["id"] = "vpla_redes:" + g["CDID"].astype(str)
    g["fuente"], g["cod_ine"], g["uso_deta"] = "vpla_redes", g["CD_MUNICIPIO"].map(cod_ine), g["DS_USO_DETA"]
    g["area_m2"] = g["NM_AREA"].map(a_float)
    return g[["id", "fuente", "cod_ine", "uso_deta", "area_m2", "geometry"]]


def destinos_verdes():
    """Parques y áreas como destinos puntuales (tipo parque / area_recreativa)."""
    v = vpla_verde()
    p1 = v.assign(geometry=v.geometry.representative_point(), id_origen=v["id"].str.split(":").str[1],
                  nombre=v["uso_deta"], tipo="parque", cubierta=False, etiqueta=v["uso_deta"])
    e = gpd.read_file(RAW / "eiel_parques" / "eiel_parques.geojson").set_crs(25830, allow_override=True).to_crs(4326)
    p2 = e.assign(geometry=e.geometry.representative_point(),
                  id_origen=e[["PROV", "MUN", "ENT", "POBLAMIENT", "ORDEN_PARQ"]].astype(str).agg("-".join, axis=1),
                  fuente="eiel_parques", nombre=e["NOMBRE"], tipo="parque", cubierta=False,
                  agua=e["AGUA"].map(lambda x: str(x).upper().startswith("SI") if x else None),
                  estado=e["ESTADO"], etiqueta=e["TIPOPARQUE"], cod_ine=e["MUN"].map(cod_ine))
    n = gpd.read_file(next((RAW / "nmc_parques").glob("*.shp")), ignore_geometry=True)   # .prj erróneo (informe §2.2)
    n = puntos(n, "UTM_X", "UTM_Y", 25830)
    p3 = n.assign(id_origen=n.index.astype(str), fuente="nmc_parques", nombre=n["ETIQUETA"], tipo="parque",
                  cubierta=False, cod_ine=n["CMUN"].map(cod_ine))
    a = gpd.read_file(RAW / "areas_recreativas" / "areas_recreativas.geojson", ignore_geometry=True)
    a = puntos(a, "NM_COOX", "NM_COOY", 25830)
    p4 = a.assign(id_origen=a.index.astype(str), fuente="areas_recreativas", nombre=a["DS_NOMBRE"],
                  tipo="area_recreativa", cubierta=False, cod_ine=None,
                  agua=a["IT_FUENTE"].map(lambda x: str(x).upper() in ("S", "SI", "1", "TRUE")))
    ay = puntos(leer_csv(next((RAW / "ay_parques").glob("*.csv"))), "LONGITUD", "LATITUD", 4326)
    p5 = ay.assign(id_origen=ay["PK"], fuente="ay_parques", nombre=ay["NOMBRE"], tipo="parque", cubierta=False,
                   cod_ine="28079", url=ay["CONTENT-URL"])
    for p in (p1, p2, p3, p4, p5):
        if "deportes" not in p:
            p["deportes"] = [[] for _ in range(len(p))]
    return [p1, p2, p3, p4, p5]


@normalizador("verde")
def normalizar():
    return escribir(vpla_verde(), "verde")
```

> **Comprobar** antes de escribir la regla de `IT_FUENTE` los valores reales de esa columna en el perfil; ajustar el conjunto `("S", "SI", "1", "TRUE")` a los literales que haya. Igual con `AGUA` de EIEL. `areas_recreativas` no trae código de municipio (`DS_MUNI` es nombre): `asignar_municipio` lo pone por geometría en `destino_bruto`.

- [ ] **Paso 6: `ingesta/normalizar/mobiliario.py`**

```python
import pandas as pd

from ingesta.comun import RAW, asignar_municipio, cod_ine, escribir, filtrar_comunidad, leer_csv, puntos
from ingesta.normalizar import normalizador

AYUNTAMIENTO = {"ay_fuentes": "fuente", "ay_bancos": "banco", "ay_areas_caninas": "area_canina"}


@normalizador("poi")
def normalizar():
    partes = []
    for fuente, tipo in AYUNTAMIENTO.items():
        g = puntos(leer_csv(next((RAW / fuente).glob("*.csv"))), "COORD_GIS_X", "COORD_GIS_Y", 25830)
        partes.append(g.assign(id=fuente + ":" + g["ID"].astype(str), tipo=tipo, fuente=fuente, cod_ine="28079"))
    d = puntos(leer_csv(next((RAW / "desfibriladores").glob("*.csv"))),
               "direccion_coordenada_x", "direccion_coordenada_y", 25830)
    partes.append(d.assign(id="desfibriladores:" + d["codigo_dea"].astype(str), tipo="dea", fuente="desfibriladores",
                           cod_ine=d["municipio_codigo"].map(cod_ine)))
    todo = pd.concat([p[["id", "tipo", "fuente", "cod_ine", "geometry"]] for p in partes], ignore_index=True)
    todo = asignar_municipio(todo.set_geometry("geometry"))
    todo, fuera = filtrar_comunidad(todo)
    todo = todo.drop_duplicates("id")
    print(f"   poi: {len(todo)} puntos ({fuera} fuera)")
    return escribir(todo, "poi")
```

> El mobiliario de **OSM** (bancos, fuentes, papeleras… fuera de la capital) se extrae en J-R1 del mismo `.pbf` y se añade a `poi` allí (tipo con `fuente="osm"`), para leer el extracto una sola vez.

- [ ] **Paso 7:** `python -m ingesta.normalizar municipio padron verde destino_bruto poi` y después `pytest tests/ingesta -v` → PASS. Corregir lo que salga en los mensajes «sin casar» o «fuera».
- [ ] **Paso 8: commit** — `git add ingesta tests && git commit -m "Ingesta: normalizadores de municipios, padrón, deporte, verde y mobiliario"`

**Terminado cuando:** los cinco parquet existen y las pruebas con las cifras del informe pasan.

---

## J-D3 · Normalizadores de aire (estaciones y lecturas) y de AEMET

**Rol:** Datos · **Depende de:** J-D1, M-D3 · **Duración:** 2,5 h

**Ficheros:** Crear `ingesta/normalizar/aire.py`, `ingesta/normalizar/aemet.py`, `tests/ingesta/test_normalizar_tiempo_real.py`, `tests/datos/aire_dia_muestra.csv` (15 filas reales copiadas de `data/raw/aire_dia/calidad_aire_datos_dia.csv`, con cabecera).

**Interfaces (produce):**

| Fichero | Columnas |
|---|---|
| `estacion_aire.parquet` | `id` (8 dígitos `28MMMEEE`), `red` (`CM`/`AY`), `nombre`, `cod_ine`, `tipo_area`, `magnitudes` (list[int]), geometría punto |
| `lectura_aire/<fuente>_<AAAAMMDD>.parquet` (uno por fuente y día) | `estacion_id`, `magnitud` (int), `ts` (timestamp local, **fin** de la hora: `h01` = 01:00), `valor` (float), `validado` (`T`/`V`) |
| `prevision/<cod_ine>.parquet` | `cod_ine`, `ts`, `temp`, `sens_termica`, `prob_precip`, `precip`, `viento`, `cielo`, `elaborado` |

- Funciones: `lecturas_largas(df: DataFrame) -> DataFrame` (de `h01…h24`/`v01…v24` a formato largo; acepta mayúsculas del Ayuntamiento), `prevision_municipio(doc: dict, cod_ine: str) -> DataFrame`.
- Reglas de informe-datos §2: fecha **por fila** (`ano`, `mes`, `dia`), aceptar `T` y `V`, descartar `N`; código de municipio sin ceros → `cod_ine`.

> **Hora `h24`**: en estos ficheros `h01` es la media de 00:00–01:00; `h24` corresponde a las 24:00 = 00:00 del día siguiente. Comprobarlo en la descripción oficial del fichero (enlazada en `umbrales.md` §1.2) antes de fusionar; la prueba fija la convención elegida.

- [ ] **Paso 1: pruebas que fallan** — `tests/ingesta/test_normalizar_tiempo_real.py`

```python
import json
from datetime import datetime

import pandas as pd
import pytest

from ingesta.comun import RAIZ, leer_csv
from ingesta.normalizar.aemet import prevision_municipio
from ingesta.normalizar.aire import lecturas_largas

DATOS = RAIZ / "tests" / "datos"


def test_aire_fecha_por_fila():
    df = leer_csv(DATOS / "aire_dia_muestra.csv")
    largo = lecturas_largas(df)
    fila = df.iloc[0]
    esperado_dia = datetime(int(fila["ano"]), int(fila["mes"]), int(fila["dia"]))
    assert largo["ts"].min() >= pd.Timestamp(esperado_dia)                # no supone «hoy»
    assert set(largo["validado"]) <= {"T", "V"}                            # N descartado
    assert largo["estacion_id"].str.match(r"^28\d{6}$").all()


def test_aire_h24_es_medianoche_siguiente():
    df = pd.DataFrame([{"provincia": "28", "municipio": "65", "estacion": "14", "magnitud": "8",
                        "punto_muestreo": "x", "ano": "2026", "mes": "10", "dia": "13",
                        **{f"h{i:02d}": "" for i in range(1, 25)}, **{f"v{i:02d}": "N" for i in range(1, 25)},
                        "h24": "12", "v24": "V"}])
    largo = lecturas_largas(df)
    assert list(largo["ts"]) == [pd.Timestamp("2026-10-14 00:00")]
    assert largo["estacion_id"].item() == "28065014"


def test_aire_ayuntamiento_mayusculas():
    df = pd.DataFrame([{"PROVINCIA": "28", "MUNICIPIO": "079", "ESTACION": "4", "MAGNITUD": "14",
                        "PUNTO_MUESTREO": "x", "ANO": "2026", "MES": "10", "DIA": "14",
                        **{f"H{i:02d}": "" for i in range(1, 25)}, **{f"V{i:02d}": "N" for i in range(1, 25)},
                        "H08": "55", "V08": "V"}])
    largo = lecturas_largas(df)
    assert largo["estacion_id"].item() == "28079004" and largo["valor"].item() == 55.0


@pytest.mark.skipif(not (DATOS / "aemet_28065.json").exists(), reason="muestra de M-D3")
def test_aemet_prevision_horaria():
    doc = json.loads((DATOS / "aemet_28065.json").read_text(encoding="utf-8"))
    p = prevision_municipio(doc[0] if isinstance(doc, list) else doc, "28065")
    assert len(p) >= 24
    assert p["ts"].is_monotonic_increasing and p["ts"].is_unique
    assert p["temp"].notna().all()
    assert p["prob_precip"].between(0, 100).all()
    assert (p["precip"] >= 0).all()
```

Run → FAIL.

- [ ] **Paso 2: `ingesta/normalizar/aire.py`**

```python
import datetime as dt

import geopandas as gpd
import pandas as pd

from ingesta.comun import CLEAN, RAW, a_float, cod_ine, escribir, leer_csv, puntos
from ingesta.normalizar import normalizador

ICA = {1, 8, 9, 10, 14}   # SO2, NO2, PM2.5, PM10, O3 (umbrales.md §1.2)


def lecturas_largas(df):
    df = df.rename(columns=str.lower)
    filas = []
    for _, r in df.iterrows():
        mag = int(r["magnitud"])
        if mag not in ICA:
            continue
        est = f"{cod_ine(r['municipio'])}{int(r['estacion']):03d}"
        base = dt.datetime(int(r["ano"]), int(r["mes"]), int(r["dia"]))
        for h in range(1, 25):
            valor, flag = a_float(r[f"h{h:02d}"]), str(r[f"v{h:02d}"]).strip().upper()
            if valor is None or flag not in ("T", "V"):
                continue
            filas.append((est, mag, base + dt.timedelta(hours=h), valor, flag))
    return pd.DataFrame(filas, columns=["estacion_id", "magnitud", "ts", "valor", "validado"])


@normalizador("lectura_aire")
def normalizar_lecturas():
    salida = CLEAN / "lectura_aire"
    salida.mkdir(parents=True, exist_ok=True)
    escritos = []
    for fuente in ("aire_dia", "ay_aire"):
        largo = lecturas_largas(leer_csv(next((RAW / fuente).glob("*.csv"))))
        for dia, grupo in largo.groupby(largo["ts"].dt.strftime("%Y%m%d")):
            destino = salida / f"{fuente}_{dia}.parquet"
            if destino.exists():   # el mismo día llega varias veces: V gana a T, lo nuevo a lo viejo
                previo = pd.read_parquet(destino)
                grupo = (pd.concat([previo, grupo]).sort_values("validado", key=lambda s: s.eq("V"))
                         .drop_duplicates(["estacion_id", "magnitud", "ts"], keep="last"))
            grupo.to_parquet(destino, index=False)
            escritos.append(destino)
    return escritos


@normalizador("estacion_aire")
def normalizar_estaciones():
    cm = puntos(leer_csv(next((RAW / "aire_estaciones").glob("*.csv"))),
                "estacion_coord_UTM_ETRS89_x", "estacion_coord_UTM_ETRS89_y", 25830)
    cm = cm.assign(id=cm["estacion_codigo"].astype(str).str.zfill(8), red="CM",
                   nombre=cm["estacion_municipio"], tipo_area=cm["estacion_tipo_area"])
    ay = puntos(leer_csv(next((RAW / "ay_aire_estaciones").glob("*.csv"))), "LONGITUD", "LATITUD", 4326)
    ay = ay.assign(id=ay["CODIGO"].astype(str).str.zfill(8), red="AY", nombre=ay["ESTACION"], tipo_area=ay["NOM_TIPO"])
    todo = pd.concat([cm, ay], ignore_index=True)
    todo["cod_ine"] = todo["id"].str[:5]
    return escribir(gpd.GeoDataFrame(todo[["id", "red", "nombre", "cod_ine", "tipo_area", "geometry"]], crs=4326),
                    "estacion_aire")
```

> **Comprobar** con los datos reales: (1) que `estacion_codigo` (CM) y `CODIGO` (Ayto.) tienen el formato de 8 dígitos `28MMMEEE` que generan las lecturas (Getafe = `28065014`, CLAUDE.md §5.3); si no, construir el id igual que en `lecturas_largas`. (2) Prueba de cobertura que añadir al paso 4: **toda `estacion_id` de las lecturas existe en `estacion_aire`**. `magnitudes` por estación se deduce de las lecturas en J-D4 (no hace falta leer las columnas `estacion_analizador_*`).

- [ ] **Paso 3: `ingesta/normalizar/aemet.py`** (estructura según CLAUDE.md §7.1; **ajustar a lo que M-D3 haya documentado**)

```python
import datetime as dt
import json

import pandas as pd

from ingesta.comun import CLEAN, RAW, a_float
from ingesta.normalizar import normalizador


def _por_hora(lista, fecha):
    """[{value, periodo:'07'}] → {datetime: valor}. Ignora periodos que no sean una hora."""
    salida = {}
    for e in lista or []:
        p = str(e.get("periodo", ""))
        if len(p) == 2 and p.isdigit():
            v = e.get("value")
            salida[fecha + dt.timedelta(hours=int(p))] = 0.0 if str(v).lower() == "ip" else a_float(v)
    return salida


def _por_franja(lista, fecha):
    """probPrecipitacion: [{value, periodo:'0208'}] → valor para cada hora de la franja."""
    salida = {}
    for e in lista or []:
        p = str(e.get("periodo", ""))
        if len(p) == 4 and p.isdigit():
            ini, fin = int(p[:2]), int(p[2:]) or 24
            fin = fin if fin > ini else fin + 24
            for h in range(ini, fin):
                salida[fecha + dt.timedelta(hours=h)] = a_float(e.get("value"))
    return salida


def prevision_municipio(doc, cod_ine):
    filas = {}
    for dia in doc["prediccion"]["dia"]:
        fecha = dt.datetime.fromisoformat(dia["fecha"][:10])
        series = {"temp": _por_hora(dia.get("temperatura"), fecha),
                  "sens_termica": _por_hora(dia.get("sensTermica"), fecha),
                  "precip": _por_hora(dia.get("precipitacion"), fecha),
                  "prob_precip": _por_franja(dia.get("probPrecipitacion"), fecha),
                  "cielo": {fecha + dt.timedelta(hours=int(e["periodo"])): e.get("descripcion")
                            for e in dia.get("estadoCielo", []) if str(e.get("periodo", "")).isdigit()
                            and len(str(e["periodo"])) == 2}}
        for campo, serie in series.items():
            for ts, v in serie.items():
                filas.setdefault(ts, {})[campo] = v
    df = pd.DataFrame([{"ts": ts, **v} for ts, v in sorted(filas.items())])
    df = df[df["temp"].notna()].copy()
    df["cod_ine"], df["elaborado"] = cod_ine, doc.get("elaborado")
    for c in ("sens_termica", "prob_precip", "precip", "viento", "cielo"):
        if c not in df:
            df[c] = None
    return df[["cod_ine", "ts", "temp", "sens_termica", "prob_precip", "precip", "viento", "cielo", "elaborado"]]


@normalizador("prevision")
def normalizar():
    salida = CLEAN / "prevision"
    salida.mkdir(parents=True, exist_ok=True)
    escritos = []
    for ruta in sorted((RAW / "aemet").glob("28???.json")):
        texto = ruta.read_bytes()
        try:
            doc = json.loads(texto.decode("utf-8"))
        except UnicodeDecodeError:
            doc = json.loads(texto.decode("latin-1"))
        doc = doc[0] if isinstance(doc, list) else doc
        destino = salida / f"{ruta.stem}.parquet"
        prevision_municipio(doc, ruta.stem).to_parquet(destino, index=False)
        escritos.append(destino)
    return escritos
```

> `viento` se deja vacío en el MVP (no lo usa ninguna regla); `vientoAndRachaMax` tiene estructura propia: si DEC-06 lo necesitara, se añade entonces. Si la probabilidad de lluvia de AEMET viene **por hora** y no por franja, `_por_franja` no encontrará periodos de 4 cifras: usar `_por_hora` para ese campo (la prueba con la muestra real lo detecta).

- [ ] **Paso 4:** copiar 15 filas reales a `tests/datos/aire_dia_muestra.csv` (`head -16 data/raw/aire_dia/calidad_aire_datos_dia.csv > tests/datos/aire_dia_muestra.csv`); añadir la prueba de cobertura de estaciones (`lento`); `python -m ingesta.normalizar estacion_aire lectura_aire prevision`; `pytest tests/ingesta -v` → PASS.
- [ ] **Paso 5 (P-12):** ejecutar `python3 scripts/descargar_fuentes.py --solo aire_dia` a las 09:00, 12:00 y 16:00 y apuntar en `docs/PENDIENTES.md` P-12 a qué hora el fichero regional pasa al día en curso.
- [ ] **Paso 6: commit** — `git add ingesta tests && git commit -m "Ingesta: aire en formato largo con fecha por fila y previsión horaria de AEMET"`

**Terminado cuando:** las pruebas pasan con la muestra real de AEMET y todas las estaciones de las lecturas casan con `estacion_aire`.

---

## J-D4 · `ingesta/construir.py`: `gomad.duckdb` y `tiempo_real.duckdb` con sustitución atómica

**Rol:** Datos · **Depende de:** J-D2, J-D3 · **Duración:** 2,5 h

**Ficheros:** Crear `ingesta/construir.py`, `tests/ingesta/test_construir.py`. Lee `config/actividades.yaml` (DEC-08).

**Interfaces (produce; V-M1 `repositorio` consume):**

`data/gomad.duckdb`:
- `municipio(cod_ine PK, nombre, poblacion, en_eiel, en_vpla, geom GEOMETRY)`
- `destino(id PK, fuente, nombre, tipo, cubierta, accesible, estado, titular, agua, url, cod_ine, lon DOUBLE, lat DOUBLE, verde DOUBLE NULL, actualizado TIMESTAMP)` — `verde` = fracción 0–1 del círculo de 300 m alrededor del destino cubierta por `verde.parquet`; `NULL` en municipios sin VPLA (factor «sin datos»). El radio es **criterio propio**, revisable en DEC-07.
- `destino_actividad(destino_id, actividad, adecuacion DOUBLE)` — de aplicar `config/actividades.yaml`
- `estacion_aire(id PK, red, nombre, cod_ine, tipo_area, lon, lat)`
- `poi_ruta(id PK, tipo, fuente, cod_ine, lon, lat)`
- `fuente_fecha(fuente, fecha_dato TIMESTAMP, descargado TIMESTAMP)` (desde `manifest.json`, para RF-19)

`data/tiempo_real.duckdb`:
- `lectura_aire(estacion_id, magnitud, ts, valor, validado)` (últimos 3 días)
- `ica_hora(estacion_id, ts, contaminante, media, n_horas)` — media móvil: NO2/SO2 1 h, O3 8 h, PM 24 h (`umbrales.md` §1.2)
- `prevision(cod_ine, ts, temp, sens_termica, prob_precip, precip, viento, cielo, elaborado)`

Funciones: `construir_principal(destino: Path) -> Path`, `construir_tiempo_real(destino: Path) -> Path`, `aplicar_actividades(destinos: DataFrame, reglas: dict) -> DataFrame`, CLI `python -m ingesta.construir {principal|tiempo_real|todo}`.

**Formato de `config/actividades.yaml`** (contrato con el código; los valores los pone DEC-08):

```yaml
actividades:
  - id: nadar
    nombre: Nadar
    icono: pool
    exterior: null
    reglas:                       # un destino encaja si cumple CUALQUIER regla; adecuacion = la mayor
      - {fuente: eiel_deporte, campo: tipoinstal, en: ["PISCINAS AL AIRE LIBRE", "PISCINAS CUBIERTAS"], adecuacion: 1.0}
      - {fuente: nmc_deporte, campo: nombre, contiene: ["piscina"], adecuacion: 0.9}
      - {fuente: ay_piscinas, adecuacion: 1.0}
  # campos admitidos en una regla: fuente (obligatorio), campo + en | contiene | deporte (columna EIEL en `deportes`), tipo, adecuacion
```

- [ ] **Paso 1: pruebas que fallan** — `tests/ingesta/test_construir.py`

```python
import duckdb
import geopandas as gpd
import pandas as pd
import pytest
from shapely.geometry import Point

from ingesta import construir

REGLAS_PRUEBA = {"actividades": [
    {"id": "nadar", "nombre": "Nadar", "icono": "pool", "exterior": None, "reglas": [
        {"fuente": "eiel_deporte", "campo": "tipoinstal", "en": ["PISCINAS CUBIERTAS"], "adecuacion": 1.0},
        {"fuente": "nmc_deporte", "campo": "nombre", "contiene": ["piscina"], "adecuacion": 0.9}]},
    {"id": "padel", "nombre": "Pádel", "icono": "sports_tennis", "exterior": None, "reglas": [
        {"fuente": "eiel_deporte", "deporte": "PADEL", "adecuacion": 1.0},
        {"fuente": "nmc_deporte", "campo": "nombre", "contiene": ["pádel", "padel"], "adecuacion": 0.8}]},
]}


def destinos_prueba():
    return pd.DataFrame([
        {"id": "eiel_deporte:1", "fuente": "eiel_deporte", "nombre": "Piscina cubierta", "tipoinstal": "PISCINAS CUBIERTAS", "deportes": []},
        {"id": "eiel_deporte:2", "fuente": "eiel_deporte", "nombre": "Polideportivo", "tipoinstal": "OTROS", "deportes": ["PADEL"]},
        {"id": "nmc_deporte:3", "fuente": "nmc_deporte", "nombre": "Pistas de PÁDEL Norte", "tipoinstal": None, "deportes": []},
        {"id": "nmc_deporte:4", "fuente": "nmc_deporte", "nombre": "Campo de fútbol", "tipoinstal": None, "deportes": []},
    ])


def test_aplicar_actividades():
    r = construir.aplicar_actividades(destinos_prueba(), REGLAS_PRUEBA)
    pares = set(zip(r.destino_id, r.actividad))
    assert pares == {("eiel_deporte:1", "nadar"), ("eiel_deporte:2", "padel"), ("nmc_deporte:3", "padel")}


def test_sustitucion_atomica(tmp_path):
    destino = tmp_path / "x.duckdb"
    destino.write_bytes(b"version vieja")
    def falla(con):
        raise RuntimeError("fuente rota")
    with pytest.raises(RuntimeError):
        construir.atomico(destino, falla)
    assert destino.read_bytes() == b"version vieja"            # el anterior se mantiene (arquitectura §3.3)
    construir.atomico(destino, lambda con: con.execute("CREATE TABLE t AS SELECT 1 AS a"))
    assert duckdb.connect(str(destino), read_only=True).execute("SELECT a FROM t").fetchone() == (1,)


def test_ica_medias_moviles(tmp_path):
    horas = pd.date_range("2026-10-13 01:00", periods=30, freq="h")
    lect = pd.DataFrame({"estacion_id": "28065014", "magnitud": 14, "ts": horas,
                         "valor": [float(i) for i in range(30)], "validado": "V"})
    con = duckdb.connect()
    con.register("lectura_aire", lect)
    construir.crear_ica_hora(con)
    fila = con.execute("SELECT media, n_horas FROM ica_hora WHERE contaminante='O3' AND ts = ?",
                       [horas[-1].to_pydatetime()]).fetchone()
    assert fila == (sum(range(22, 30)) / 8, 8)                 # media de las 8 últimas horas


@pytest.mark.lento
def test_construir_principal_real(tmp_path):
    ruta = construir.construir_principal(tmp_path / "gomad.duckdb", reglas=REGLAS_PRUEBA)
    con = duckdb.connect(str(ruta), read_only=True)
    assert con.execute("SELECT count(*) FROM municipio").fetchone()[0] == 179
    assert con.execute("SELECT count(*) FROM destino WHERE cod_ine IS NULL").fetchone()[0] == 0
    sin_vpla = con.execute("SELECT count(*) FROM destino d JOIN municipio m USING (cod_ine) "
                           "WHERE NOT m.en_vpla AND d.verde IS NOT NULL").fetchone()[0]
    assert sin_vpla == 0                                       # sin VPLA → verde NULL, no 0
    assert con.execute("SELECT count(*) FROM destino_actividad WHERE actividad='nadar'").fetchone()[0] > 0
```

Run → FAIL.

- [ ] **Paso 2: implementar** — `ingesta/construir.py`

```python
"""GeoParquet → data/gomad.duckdb y data/tiempo_real.duckdb (arquitectura §3.3).

Escribe un fichero nuevo y lo sustituye de golpe: la API (solo lectura) nunca ve un fichero a medias.
Uso: python -m ingesta.construir principal | tiempo_real | todo
"""
import datetime as dt
import json
import os
import sys
import unicodedata

import duckdb
import geopandas as gpd
import pandas as pd
import yaml

from ingesta.comun import CLEAN, RAIZ, RAW

DATA = RAIZ / "data"
RADIO_VERDE_M = 300   # criterio propio (DEC-07)
PERIODOS = {1: ("SO2", 1), 8: ("NO2", 1), 14: ("O3", 8), 10: ("PM10", 24), 9: ("PM2_5", 24)}


def atomico(destino, construir_fn):
    tmp = destino.with_suffix(".tmp.duckdb")
    tmp.unlink(missing_ok=True)
    con = duckdb.connect(str(tmp))
    try:
        construir_fn(con)
        con.close()
        os.replace(tmp, destino)
    except Exception:
        con.close()
        tmp.unlink(missing_ok=True)
        raise
    return destino


def _sin_tildes(s):
    return unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower()


def aplicar_actividades(destinos, reglas):
    filas = []
    for act in reglas["actividades"]:
        for regla in act["reglas"]:
            sub = destinos[destinos["fuente"] == regla["fuente"]]
            if "deporte" in regla:
                sub = sub[sub["deportes"].map(lambda xs: regla["deporte"] in list(xs))]
            if "en" in regla:
                sub = sub[sub[regla["campo"]].isin(regla["en"])]
            if "contiene" in regla:
                claves = [_sin_tildes(c) for c in regla["contiene"]]
                sub = sub[sub[regla["campo"]].map(lambda v: any(c in _sin_tildes(v) for c in claves))]
            if "tipo" in regla:
                sub = sub[sub["tipo"] == regla["tipo"]]
            filas += [(i, act["id"], regla["adecuacion"]) for i in sub["id"]]
    r = pd.DataFrame(filas, columns=["destino_id", "actividad", "adecuacion"])
    return r.groupby(["destino_id", "actividad"], as_index=False)["adecuacion"].max()


def fraccion_verde(destinos, verde, municipios):
    """Fracción del círculo de RADIO_VERDE_M m cubierta por zona verde (EPSG:25830). NULL si el municipio no está en VPLA."""
    d = destinos.to_crs(25830)
    circulos = gpd.GeoDataFrame({"id": d["id"]}, geometry=d.buffer(RADIO_VERDE_M), crs=25830)
    inter = gpd.overlay(circulos, verde.to_crs(25830)[["geometry"]], how="intersection", keep_geom_type=True)
    area = inter.dissolve(by="id").area if len(inter) else pd.Series(dtype=float)
    frac = (area / circulos.set_index("id").area).reindex(d["id"]).fillna(0.0).clip(0, 1)
    en_vpla = d["cod_ine"].map(municipios.set_index("cod_ine")["en_vpla"]).fillna(False).to_numpy()
    return frac.where(en_vpla, None).to_numpy()


def crear_ica_hora(con):
    partes = []
    for mag, (nombre, horas) in PERIODOS.items():
        partes.append(f"""
          SELECT estacion_id, ts, '{nombre}' AS contaminante,
                 avg(valor) OVER w AS media, count(valor) OVER w AS n_horas
          FROM lectura_aire WHERE magnitud = {mag}
          WINDOW w AS (PARTITION BY estacion_id ORDER BY ts
                       RANGE BETWEEN INTERVAL {horas - 1} HOURS PRECEDING AND CURRENT ROW)""")
    con.execute("CREATE TABLE ica_hora AS " + " UNION ALL ".join(partes))


def _fechas_fuentes():
    manifest = json.loads((RAW / "manifest.json").read_text(encoding="utf-8"))
    return pd.DataFrame([{"fuente": k, "descargado": v.get("descargado"), "modificado": v.get("modificado")}
                         for k, v in manifest.items()])


def construir_principal(destino=DATA / "gomad.duckdb", reglas=None):
    reglas = reglas or yaml.safe_load((RAIZ / "config" / "actividades.yaml").read_text(encoding="utf-8"))
    municipios = gpd.read_parquet(CLEAN / "municipio.parquet")
    padron = pd.read_parquet(CLEAN / "padron.parquet")
    padron = padron[padron.anio == padron.anio.max()][["cod_ine", "poblacion"]]
    destinos = gpd.read_parquet(CLEAN / "destino_bruto.parquet")
    destinos = destinos[destinos["cod_ine"].notna()].copy()
    destinos["verde"] = fraccion_verde(destinos, gpd.read_parquet(CLEAN / "verde.parquet"), municipios)
    destinos["lon"], destinos["lat"] = destinos.geometry.x, destinos.geometry.y
    destinos["actualizado"] = dt.datetime.now()
    actividades = aplicar_actividades(destinos, reglas)
    estaciones = gpd.read_parquet(CLEAN / "estacion_aire.parquet")
    poi = gpd.read_parquet(CLEAN / "poi.parquet")

    def llenar(con):
        con.execute("INSTALL spatial; LOAD spatial;")
        m = municipios.merge(padron, on="cod_ine", how="left").assign(wkb=lambda x: x.geometry.to_wkb())
        con.register("m", pd.DataFrame(m.drop(columns="geometry")))
        con.execute("CREATE TABLE municipio AS SELECT cod_ine, nombre, poblacion, en_eiel, en_vpla, "
                    "ST_GeomFromWKB(wkb) AS geom FROM m")
        cols = ["id", "fuente", "nombre", "tipo", "cubierta", "accesible", "estado", "titular", "agua", "url",
                "cod_ine", "lon", "lat", "verde", "actualizado"]
        con.register("d", pd.DataFrame(destinos[cols]))
        con.execute("CREATE TABLE destino AS SELECT * FROM d")
        con.register("a", actividades)
        con.execute("CREATE TABLE destino_actividad AS SELECT * FROM a")
        con.register("e", pd.DataFrame(estaciones.assign(lon=estaciones.geometry.x, lat=estaciones.geometry.y)
                                       .drop(columns="geometry")))
        con.execute("CREATE TABLE estacion_aire AS SELECT * FROM e")
        con.register("p", pd.DataFrame(poi.assign(lon=poi.geometry.x, lat=poi.geometry.y).drop(columns="geometry")))
        con.execute("CREATE TABLE poi_ruta AS SELECT * FROM p")
        con.register("f", _fechas_fuentes())
        con.execute("CREATE TABLE fuente_fecha AS SELECT * FROM f")
    return atomico(destino, llenar)


def construir_tiempo_real(destino=DATA / "tiempo_real.duckdb"):
    desde = dt.datetime.now() - dt.timedelta(days=3)

    def llenar(con):
        con.execute(f"CREATE TABLE lectura_aire AS SELECT * FROM read_parquet('{CLEAN}/lectura_aire/*.parquet') "
                    f"WHERE ts >= TIMESTAMP '{desde:%Y-%m-%d %H:%M:%S}'")
        crear_ica_hora(con)
        con.execute(f"CREATE TABLE prevision AS SELECT * FROM read_parquet('{CLEAN}/prevision/*.parquet')")
    return atomico(destino, llenar)


if __name__ == "__main__":
    que = sys.argv[1] if len(sys.argv) > 1 else "todo"
    if que in ("principal", "todo"):
        print(construir_principal())
    if que in ("tiempo_real", "todo"):
        print(construir_tiempo_real())
```

> La extensión `spatial` se instala en el equipo de ingesta (necesita red la primera vez). La API **no** la necesita: consulta `lon`/`lat` (arquitectura §3.3: la API solo abre en lectura). `fraccion_verde` con ~25.000 destinos y 16.867 polígonos puede tardar minutos; si pasa de 5 min, limitar `verde` a los polígonos del mismo municipio con `sjoin` previo.

- [ ] **Paso 3:** pruebas unitarias en verde: `pytest tests/ingesta/test_construir.py -v -m "not lento"`.
- [ ] **Paso 4 (después de DEC-08, jue 12:00):** el equipo deja `config/actividades.yaml` con la tabla decidida; `python -m ingesta.construir todo`; `pytest tests/ingesta -v` (incluidas `lento`) → PASS. Comprobación rápida: `duckdb data/gomad.duckdb -c "SELECT actividad, count(*) FROM destino_actividad GROUP BY 1 ORDER BY 2 DESC"` → cifras coherentes con la tabla de D-08 (`decisiones-pendientes.md`).
- [ ] **Paso 5: commit** — `git add ingesta tests config/actividades.yaml && git commit -m "Ingesta: construcción atómica de gomad.duckdb y tiempo_real.duckdb con medias móviles del ICA"`

**Terminado cuando:** los dos `.duckdb` se generan desde cero, un fallo a mitad conserva el anterior, `ica_hora` calcula las medias del BOE y `verde` es `NULL` (no 0) donde no hay VPLA.

---

## J-R1 · Grafo peatonal de Getafe con factores por tramo

**Rol:** Rutas · **Depende de:** M-R1, J-D2 (`verde.parquet`, `poi.parquet`) · **Duración:** 3 h

**Ficheros:** Crear `ingesta/grafo.py`, `tests/ingesta/test_grafo.py`. Lee `config/rutas.yaml` (DEC-07; las pruebas usan su propia tabla).

**Interfaces (produce; J-R2 consume):**
- `data/grafo/nodos.parquet`: `nodo` (int, 0…n−1), `osm_id` (int64), `lon`, `lat`
- `data/grafo/tramos.parquet`: `u`, `v` (int, índices de nodo), `longitud_m`, `tipo_via` (valor de `highway`), `trafico` (0–1, de `config/rutas.yaml` → `trafico_por_via`), `pct_verde` (0–1 o NaN sin dato), `fuente_cerca`, `banco_cerca`, `dea_cerca` (bool), `geom` (WKB LineString 4326)
- `construir_grafo(pbf: Path, caja: list[float] | None, salida: Path, config: dict) -> dict` (devuelve resumen: nodos, tramos, segundos)
- Además añade a `data/clean/poi.parquet` el mobiliario de OSM del mismo extracto (`amenity=bench` → `banco`, `amenity=drinking_water` → `fuente`, `amenity=waste_basket` → `papelera`, `leisure=dog_park` → `area_canina`, `leisure=playground` → `juegos`; `fuente="osm"`). Claves OSM tomadas de `requisitos_fuentes.json`.

**Formato de `config/rutas.yaml`** (contrato; valores en DEC-07):

```yaml
trafico_por_via:      # 0 = sin tráfico, 1 = máximo. Criterio propio salvo que se cite otra fuente.
  primary: 1.0
  # … un valor por cada valor de highway que salga en la red peatonal
trafico_por_defecto: 0.3
suelo_factor: 0.5     # arquitectura §4.4: factor ≥ 0,5
radio_poi_m: 25
pesos_ruta_por_defecto: {trafico: 0.5, verde: 0.5, fuentes: 0.2}
criterio_propio: true
```

- [ ] **Paso 1: pruebas que fallan** — `tests/ingesta/test_grafo.py`

```python
import geopandas as gpd
import pandas as pd
import pytest
from shapely.geometry import LineString, Point, Polygon

from ingesta.comun import RAIZ
from ingesta.grafo import factores_tramos, indexar_nodos

CONFIG = {"trafico_por_via": {"primary": 1.0, "footway": 0.0}, "trafico_por_defecto": 0.3, "radio_poi_m": 25}


def test_indexar_nodos_contiguos():
    tramos = pd.DataFrame({"u": [900, 901], "v": [901, 902]})
    nodos = pd.DataFrame({"id": [902, 900, 901], "lon": [0.0, 0.1, 0.2], "lat": [0.0, 0.0, 0.0]})
    n, t = indexar_nodos(nodos, tramos)
    assert sorted(n["nodo"]) == [0, 1, 2]
    assert set(t["u"]) | set(t["v"]) <= set(n["nodo"])


def test_factores_tramos():
    # Dos tramos de ~100 m en Getafe; el primero atraviesa un parque a la mitad
    a, b, c = (-3.7300, 40.3050), (-3.7288, 40.3050), (-3.7276, 40.3050)
    tramos = gpd.GeoDataFrame({"highway": ["footway", "primary"]},
                              geometry=[LineString([a, b]), LineString([b, c])], crs=4326)
    parque = gpd.GeoDataFrame(geometry=[Polygon([(-3.7300, 40.3040), (-3.7294, 40.3040),
                                                 (-3.7294, 40.3060), (-3.7300, 40.3060)])], crs=4326)
    fuente = gpd.GeoDataFrame({"tipo": ["fuente"]}, geometry=[Point(-3.7282, 40.30505)], crs=4326)
    f = factores_tramos(tramos, parque, fuente, CONFIG, hay_verde=True)
    assert f.loc[0, "pct_verde"] == pytest.approx(0.5, abs=0.05)
    assert f.loc[1, "pct_verde"] == pytest.approx(0.0, abs=0.01)
    assert list(f["trafico"]) == [0.0, 1.0]
    assert list(f["fuente_cerca"]) == [False, True]
    assert (f["longitud_m"] > 90).all() and (f["longitud_m"] < 110).all()


def test_sin_vpla_pct_verde_es_nan():
    t = gpd.GeoDataFrame({"highway": ["footway"]}, geometry=[LineString([(-3.73, 40.3), (-3.729, 40.3)])], crs=4326)
    vacio = gpd.GeoDataFrame(geometry=[], crs=4326)
    f = factores_tramos(t, vacio, gpd.GeoDataFrame({"tipo": []}, geometry=[], crs=4326), CONFIG, hay_verde=False)
    assert f["pct_verde"].isna().all()


@pytest.mark.lento
def test_grafo_getafe_existe():
    t = pd.read_parquet(RAIZ / "data" / "grafo" / "getafe" / "tramos.parquet")
    n = pd.read_parquet(RAIZ / "data" / "grafo" / "getafe" / "nodos.parquet")
    assert len(t) > 1000 and (t["longitud_m"] > 0).all()
    assert t[["u", "v"]].max().max() < len(n)
    assert t["pct_verde"].notna().mean() > 0.9          # Getafe está en VPLA
```

Run → FAIL.

- [ ] **Paso 2: implementar** — `ingesta/grafo.py`

```python
"""OSM → data/grafo/{nodos,tramos}.parquet con factores por tramo (arquitectura §3.4).

Uso: python -m ingesta.grafo 28065            # Getafe → data/grafo/getafe/
     python -m ingesta.grafo todos             # toda la Comunidad → data/grafo/ (S-R1)
"""
import sys
import time

import geopandas as gpd
import numpy as np
import pandas as pd
import yaml

from ingesta.comun import CLEAN, RAIZ, RAW, escribir, municipios

PBF = RAW / "osm" / "madrid-latest.osm.pbf"
OSM_POI = {("amenity", "bench"): "banco", ("amenity", "drinking_water"): "fuente",
           ("amenity", "waste_basket"): "papelera", ("leisure", "dog_park"): "area_canina",
           ("leisure", "playground"): "juegos"}


def indexar_nodos(nodos, tramos):
    usados = pd.unique(pd.concat([tramos["u"], tramos["v"]]))
    n = nodos[nodos["id"].isin(usados)].reset_index(drop=True)
    n["nodo"] = np.arange(len(n))
    mapa = dict(zip(n["id"], n["nodo"]))
    t = tramos.assign(u=tramos["u"].map(mapa), v=tramos["v"].map(mapa)).dropna(subset=["u", "v"])
    t[["u", "v"]] = t[["u", "v"]].astype(np.int64)
    return n.rename(columns={"id": "osm_id"})[["nodo", "osm_id", "lon", "lat"]], t


def factores_tramos(tramos, verde, poi, config, hay_verde):
    t = tramos.to_crs(25830).reset_index(drop=True)
    t["longitud_m"] = t.length
    via = t["highway"].astype(str)
    t["trafico"] = via.map(config["trafico_por_via"]).fillna(config["trafico_por_defecto"]).astype(float)
    if hay_verde and len(verde):
        zonas = verde.to_crs(25830).union_all()
        t["pct_verde"] = (t.geometry.intersection(zonas).length / t["longitud_m"]).clip(0, 1)
    else:
        t["pct_verde"] = np.nan
    p = poi.to_crs(25830)
    for tipo, col in (("fuente", "fuente_cerca"), ("banco", "banco_cerca"), ("dea", "dea_cerca")):
        puntos = p[p["tipo"] == tipo]
        if len(puntos):
            cerca = gpd.sjoin_nearest(t[["geometry"]], puntos[["geometry"]], how="left",
                                      max_distance=config["radio_poi_m"], distance_col="d")
            t[col] = cerca.groupby(level=0)["d"].min().notna().reindex(t.index, fill_value=False).to_numpy()
        else:
            t[col] = False
    return t.to_crs(4326)


def poi_osm(osm):
    filtro = {}
    for (clave, valor) in OSM_POI:
        filtro.setdefault(clave, []).append(valor)
    pois = osm.get_pois(custom_filter=filtro)
    if pois is None or pois.empty:
        return gpd.GeoDataFrame({"id": [], "tipo": [], "fuente": [], "cod_ine": []}, geometry=[], crs=4326)
    pois = pois.set_crs(4326, allow_override=True)
    pois["tipo"] = None
    for (clave, valor), tipo in OSM_POI.items():
        if clave in pois:
            pois.loc[pois[clave] == valor, "tipo"] = tipo
    pois = pois[pois["tipo"].notna()].copy()
    pois["geometry"] = pois.geometry.representative_point()
    pois["id"] = "osm:" + pois["id"].astype(str)
    pois["fuente"], pois["cod_ine"] = "osm", None
    return pois[["id", "tipo", "fuente", "cod_ine", "geometry"]]


def construir_grafo(pbf, caja, salida, config):
    from pyrosm import OSM
    t0 = time.perf_counter()
    osm = OSM(str(pbf), bounding_box=caja)
    nodos, tramos = osm.get_network(network_type="walking", nodes=True)
    nodos = pd.DataFrame({"id": nodos["id"], "lon": nodos["lon"], "lat": nodos["lat"]})
    tramos = tramos[["u", "v", "highway", "geometry"]].set_crs(4326, allow_override=True)
    tramos = tramos[tramos["u"] != tramos["v"]]
    # mobiliario OSM → poi.parquet (una sola lectura del extracto)
    poi_previo = gpd.read_parquet(CLEAN / "poi.parquet")
    poi = gpd.GeoDataFrame(pd.concat([poi_previo[poi_previo["fuente"] != "osm"], poi_osm(osm)], ignore_index=True),
                           geometry="geometry", crs=4326)
    escribir(poi, "poi")
    verde = gpd.read_parquet(CLEAN / "verde.parquet")
    if caja:
        verde = verde.cx[caja[0]:caja[2], caja[1]:caja[3]]
        poi = poi.cx[caja[0]:caja[2], caja[1]:caja[3]]
    f = factores_tramos(tramos, verde, poi, config, hay_verde=len(verde) > 0)
    n, t = indexar_nodos(nodos, f)
    salida.mkdir(parents=True, exist_ok=True)
    n.to_parquet(salida / "nodos.parquet", index=False)
    t = t.assign(geom=t.geometry.to_wkb())
    cols = ["u", "v", "longitud_m", "highway", "trafico", "pct_verde", "fuente_cerca", "banco_cerca", "dea_cerca", "geom"]
    pd.DataFrame(t[cols]).rename(columns={"highway": "tipo_via"}).to_parquet(salida / "tramos.parquet", index=False)
    return {"nodos": len(n), "tramos": len(t), "segundos": round(time.perf_counter() - t0, 1)}


if __name__ == "__main__":
    objetivo = sys.argv[1] if len(sys.argv) > 1 else "28065"
    config = yaml.safe_load((RAIZ / "config" / "rutas.yaml").read_text(encoding="utf-8"))
    if objetivo == "todos":
        print(construir_grafo(PBF, None, RAIZ / "data" / "grafo", config))
    else:
        muni = municipios()
        fila = muni[muni["cod_ine"] == objetivo]
        nombre = {"28065": "getafe", "28079": "madrid", "28131": "san_lorenzo"}.get(objetivo, objetivo)
        print(construir_grafo(PBF, [float(v) for v in fila.total_bounds], RAIZ / "data" / "grafo" / nombre, config))
```

> **Limitación conocida (Getafe):** el `pct_verde` usa solo VPLA; en los 13 municipios sin VPLA (capital incluida) queda `NaN` y se completa en S-R1 con parques de OSM o cubierta terrestre (arquitectura §3.4). Las direcciones de `highway` (`list` en algunos tramos de OSM) se convierten con `astype(str)`; revisar en la salida del paso 3 que no aparezcan valores tipo `"['footway', 'path']"` en cantidad; si los hay, quedarse con el primero.

- [ ] **Paso 3b (respaldo si pyrosm no instala, M-R1):** sustituir `OSM(...).get_network` por un `osmium.SimpleHandler` con `locations=True` que recorra `ways` con `highway` en los tipos peatonales de pyrosm (`footway`, `path`, `pedestrian`, `living_street`, `residential`, `service`, `steps`, `track`, `unclassified`, `tertiary`, `secondary`, `primary`, `cycleway` con `foot!=no`, …) y genere un tramo por cada par de nodos consecutivos con `u`, `v`, `highway` y `LineString`. Mismas columnas de salida. Anotar la lista exacta usada en el commit.
- [ ] **Paso 3:** `config/rutas.yaml` provisional **solo para construir hoy** (los valores definitivos salen de DEC-07; hasta entonces el fichero lleva en la primera línea `# PROVISIONAL hasta DEC-07`). `python -m ingesta.grafo 28065` → imprime nodos, tramos y segundos.
- [ ] **Paso 4:** `pytest tests/ingesta/test_grafo.py -v` → PASS.
- [ ] **Paso 5: commit** — `git add ingesta/grafo.py tests/ingesta/test_grafo.py config/rutas.yaml && git commit -m "Rutas: grafo peatonal de Getafe con tráfico por vía, verde y mobiliario por tramo"`

**Terminado cuando:** existe `data/grafo/getafe/` con nodos y tramos válidos, las pruebas pasan y `poi.parquet` incluye el mobiliario de OSM.

---

## J-R2 · Motor de rutas: KD-tree, costes por petición, A\*/Dijkstra y Dijkstra con límite

**Rol:** Rutas · **Depende de:** J-R1 · **Duración:** 3 h

**Ficheros:** Crear `api/rutas/grafo.py`, `tests/rutas/__init__.py`, `tests/rutas/test_rutas.py`.

**Interfaces (produce; V-R1 y V-M1 consumen):**

```python
class RutaNoEncontrada(Exception): ...

@dataclass
class Grafo:
    lon: np.ndarray; lat: np.ndarray                     # por nodo
    u: np.ndarray; v: np.ndarray                         # por tramo
    longitud: np.ndarray; trafico: np.ndarray; verde: np.ndarray   # verde: NaN = sin dato
    fuente_cerca: np.ndarray; banco_cerca: np.ndarray; dea_cerca: np.ndarray
    geom: list                                           # shapely LineString por tramo (lazy)
    ig: igraph.Graph                                     # no dirigido
    csr: scipy.sparse.csr_matrix                         # longitudes, simétrica
    arbol: scipy.spatial.cKDTree                         # en metros locales

def cargar_grafo(directorio: Path) -> Grafo
def nodo_cercano(g: Grafo, lon: float, lat: float, max_m: float = 300) -> int      # RutaNoEncontrada si > max_m
def costes(g: Grafo, pesos: dict, suelo: float) -> np.ndarray                       # > 0 siempre
def camino(g: Grafo, origen: int, destino: int, pesos_tramo: np.ndarray, algoritmo: str = "dijkstra") -> list[int]   # índices de tramo
def distancias_limitadas(g: Grafo, origen: int, limite_m: float) -> np.ndarray      # inf si no alcanzable
def resumen(g: Grafo, tramos: list[int]) -> dict  # distancia_m, pct_verde (None si sin dato), metros_con_trafico, fuentes, bancos, deas
```

- Fórmula (arquitectura §4.4): `factor = max(suelo, 1 + w_trafico·trafico − w_verde·verde − w_fuentes·fuente_cerca)` con `verde` NaN → 0; `coste = longitud × factor`. Directa: `coste = longitud`.
- «Metros con tráfico»: suma de longitudes con `trafico ≥ 0,5` (umbral de presentación, criterio propio; se mueve a `config/rutas.yaml` como `umbral_trafico_presentacion`).

- [ ] **Paso 1: pruebas que fallan** — `tests/rutas/test_rutas.py`

```python
import numpy as np
import pandas as pd
import pytest
from shapely.geometry import LineString

from api.rutas.grafo import (RutaNoEncontrada, camino, cargar_grafo, costes, distancias_limitadas, nodo_cercano,
                             resumen)


@pytest.fixture
def grafo(tmp_path):
    """   0 ──(100 m, avenida)── 1
          │                      │
       (80 m, parque)        (80 m, parque)
          │                      │
          2 ──(60 m, parque)──── 3        4 (aislado, unido solo a 5)  5
    Directa 0→1 = 100 m por la avenida; saludable 0→2→3→1 = 220 m por parque."""
    nodos = pd.DataFrame({"nodo": range(6), "osm_id": range(6),
                          "lon": [-3.7300, -3.7289, -3.7300, -3.7289, -3.7000, -3.6990],   # 0,0011° ≈ 93 m < 100 m (heurística admisible)
                          "lat": [40.3050, 40.3050, 40.3043, 40.3043, 40.3100, 40.3100]})   # 0,0007° ≈ 78 m < 80 m
    filas = [(0, 1, 100, 1.0, 0.0, False), (0, 2, 80, 0.0, 1.0, True), (2, 3, 60, 0.0, 1.0, False),
             (3, 1, 80, 0.0, 1.0, False), (4, 5, 85, 0.0, np.nan, False)]
    tramos = pd.DataFrame(filas, columns=["u", "v", "longitud_m", "trafico", "pct_verde", "fuente_cerca"])
    tramos["tipo_via"] = "footway"
    tramos["banco_cerca"] = False
    tramos["dea_cerca"] = False
    tramos["geom"] = [LineString([(nodos.lon[u], nodos.lat[u]), (nodos.lon[v], nodos.lat[v])]).wkb
                      for u, v in zip(tramos.u, tramos.v)]
    nodos.to_parquet(tmp_path / "nodos.parquet")
    tramos.to_parquet(tmp_path / "tramos.parquet")
    return cargar_grafo(tmp_path)


PESOS = {"trafico": 1.0, "verde": 0.5, "fuentes": 0.2}


def test_costes_siempre_positivos(grafo):
    for w in (PESOS, {"trafico": 0, "verde": 1, "fuentes": 1}, {"trafico": 1, "verde": 1, "fuentes": 1}):
        c = costes(grafo, w, suelo=0.5)
        assert (c > 0).all() and (c >= 0.5 * grafo.longitud - 1e-9).all()


@pytest.mark.parametrize("algoritmo", ["dijkstra", "astar"])
def test_directa_y_saludable(grafo, algoritmo):
    directa = camino(grafo, 0, 1, grafo.longitud, algoritmo)
    saludable = camino(grafo, 0, 1, costes(grafo, PESOS, 0.5), algoritmo)
    rd, rs = resumen(grafo, directa), resumen(grafo, saludable)
    assert rd["distancia_m"] == pytest.approx(100)
    assert rs["distancia_m"] == pytest.approx(220)
    assert rs["distancia_m"] >= rd["distancia_m"]          # la saludable nunca es más corta
    assert rs["pct_verde"] == pytest.approx(100) and rd["metros_con_trafico"] == pytest.approx(100)
    assert rs["fuentes"] == 1


def test_inalcanzable_lanza_error(grafo):
    with pytest.raises(RutaNoEncontrada):
        camino(grafo, 0, 4, grafo.longitud)


def test_nodo_cercano(grafo):
    assert nodo_cercano(grafo, -3.72999, 40.30501) == 0


def test_nodo_cercano_demasiado_lejos(grafo):
    with pytest.raises(RutaNoEncontrada):
        nodo_cercano(grafo, -3.60, 40.40)


def test_dijkstra_con_limite(grafo):
    d = distancias_limitadas(grafo, 0, limite_m=150)
    assert d[1] == pytest.approx(100) and d[2] == pytest.approx(80) and d[3] == pytest.approx(140)
    assert np.isinf(d[4])


def test_pct_verde_sin_dato_es_none(grafo):
    assert resumen(grafo, [4])["pct_verde"] is None
```

Run → FAIL.

- [ ] **Paso 2: implementar** — `api/rutas/grafo.py`

```python
"""Grafo peatonal en memoria (arquitectura §4.4). Coste por petición, vectorizado; nunca ≤ 0."""
import math
from dataclasses import dataclass, field

import igraph as ig
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import dijkstra
from scipy.spatial import cKDTree
from shapely import wkb

M_POR_GRADO_LAT = 111_320.0
UMBRAL_TRAFICO = 0.5


class RutaNoEncontrada(Exception):
    pass


@dataclass
class Grafo:
    lon: np.ndarray
    lat: np.ndarray
    u: np.ndarray
    v: np.ndarray
    longitud: np.ndarray
    trafico: np.ndarray
    verde: np.ndarray
    fuente_cerca: np.ndarray
    banco_cerca: np.ndarray
    dea_cerca: np.ndarray
    geom_wkb: list
    ig: ig.Graph
    csr: csr_matrix
    arbol: cKDTree
    cos_lat0: float
    _geom: dict = field(default_factory=dict)

    def geom(self, i):
        if i not in self._geom:
            self._geom[i] = wkb.loads(self.geom_wkb[i])
        return self._geom[i]


def _xy(lon, lat, cos_lat0):
    return np.column_stack([np.asarray(lon) * M_POR_GRADO_LAT * cos_lat0, np.asarray(lat) * M_POR_GRADO_LAT])


def cargar_grafo(directorio):
    n = pd.read_parquet(directorio / "nodos.parquet").sort_values("nodo")
    t = pd.read_parquet(directorio / "tramos.parquet")
    cos_lat0 = math.cos(math.radians(float(n["lat"].mean())))
    u, v = t["u"].to_numpy(np.int64), t["v"].to_numpy(np.int64)
    longitud = t["longitud_m"].to_numpy(float)
    num = len(n)
    grafo_ig = ig.Graph(n=num, edges=np.column_stack([u, v]).tolist(), directed=False)
    csr = csr_matrix((np.concatenate([longitud, longitud]), (np.concatenate([u, v]), np.concatenate([v, u]))),
                     shape=(num, num))
    return Grafo(lon=n["lon"].to_numpy(float), lat=n["lat"].to_numpy(float), u=u, v=v, longitud=longitud,
                 trafico=t["trafico"].to_numpy(float), verde=t["pct_verde"].to_numpy(float),
                 fuente_cerca=t["fuente_cerca"].to_numpy(bool), banco_cerca=t["banco_cerca"].to_numpy(bool),
                 dea_cerca=t["dea_cerca"].to_numpy(bool), geom_wkb=list(t["geom"]), ig=grafo_ig, csr=csr,
                 arbol=cKDTree(_xy(n["lon"], n["lat"], cos_lat0)), cos_lat0=cos_lat0)


def nodo_cercano(g, lon, lat, max_m=300):
    d, i = g.arbol.query(_xy([lon], [lat], g.cos_lat0)[0])
    if d > max_m:
        raise RutaNoEncontrada(f"No hay red peatonal a menos de {max_m} m")
    return int(i)


def costes(g, pesos, suelo):
    verde = np.nan_to_num(g.verde, nan=0.0)
    factor = 1 + pesos.get("trafico", 0) * g.trafico - pesos.get("verde", 0) * verde \
        - pesos.get("fuentes", 0) * g.fuente_cerca
    return g.longitud * np.maximum(factor, suelo)


def camino(g, origen, destino, pesos_tramo, algoritmo="dijkstra"):
    if algoritmo == "astar":
        xy = _xy(g.lon, g.lat, g.cos_lat0)
        suelo = float(np.min(pesos_tramo / g.longitud)) if len(g.longitud) else 1.0
        heur = lambda grafo, a, b: float(np.hypot(*(xy[a] - xy[b]))) * suelo * 0.999   # admisible
        tramos = g.ig.get_shortest_path_astar(origen, destino, heuristics=heur, weights=pesos_tramo, output="epath")
    else:
        tramos = g.ig.get_shortest_path(origen, destino, weights=pesos_tramo, output="epath")
    if origen != destino and not tramos:
        raise RutaNoEncontrada("Origen y destino no están conectados por la red peatonal")
    return list(tramos)


def distancias_limitadas(g, origen, limite_m):
    return dijkstra(g.csr, directed=False, indices=origen, limit=limite_m)


def resumen(g, tramos):
    idx = np.asarray(tramos, dtype=np.int64)
    lon = g.longitud[idx]
    total = float(lon.sum())
    verde = g.verde[idx]
    con_dato = ~np.isnan(verde)
    pct = None if not con_dato.any() else float(100 * (verde[con_dato] * lon[con_dato]).sum() / lon[con_dato].sum())
    return {"distancia_m": total, "pct_verde": pct,
            "metros_con_trafico": float(lon[g.trafico[idx] >= UMBRAL_TRAFICO].sum()),
            "fuentes": int(g.fuente_cerca[idx].sum()), "bancos": int(g.banco_cerca[idx].sum()),
            "deas": int(g.dea_cerca[idx].sum())}
```

> `get_shortest_path_astar` existe en python-igraph ≥ 0.10.2; la heurística en Python se llama por nodo y puede ser **más lenta** que el Dijkstra en C de igraph: J-R3 lo mide y se elige el más rápido (por defecto `dijkstra`). `pct_verde` en la prueba: el tramo 0→2 tiene `fuente_cerca=True` y verde 1, así que la saludable lo prefiere.

- [ ] **Paso 3:** `pytest tests/rutas/test_rutas.py -v` → PASS.
- [ ] **Paso 4: commit** — `git add api/rutas tests/rutas && git commit -m "Rutas: grafo en memoria, coste con suelo, A*/Dijkstra y Dijkstra con límite"`

**Terminado cuando:** pasan las pruebas, incluidas coste > 0, saludable ≥ directa, inalcanzable y nodo lejano.

---

## J-R3 · Prueba de latencia en Getafe (y capital si hay grafo)

**Rol:** Rutas · **Depende de:** J-R2 · **Duración:** 1 h

**Ficheros:** Crear `tests/rutas/test_latencia.py`. Modificar `docs/arquitectura.md` §4.4 (cifras medidas, algoritmo elegido).

- [ ] **Paso 1:** `tests/rutas/test_latencia.py`

```python
"""Latencia real (RNF: ruta < 5 s, recomendación < 3 s). Se salta si no hay grafo construido."""
import time

import numpy as np
import pytest

from api.rutas.grafo import camino, cargar_grafo, costes, distancias_limitadas
from ingesta.comun import RAIZ

pytestmark = pytest.mark.lento
PESOS = {"trafico": 1.0, "verde": 0.5, "fuentes": 0.2}


@pytest.fixture(scope="module", params=["getafe", "madrid"])
def g(request):
    d = RAIZ / "data" / "grafo" / request.param
    if not (d / "tramos.parquet").exists():
        pytest.skip(f"sin grafo de {request.param}")
    t0 = time.perf_counter()
    grafo = cargar_grafo(d)
    print(f"\n{request.param}: carga {time.perf_counter() - t0:.2f} s, {len(grafo.lon)} nodos, {len(grafo.u)} tramos")
    return grafo


@pytest.mark.parametrize("algoritmo", ["dijkstra", "astar"])
def test_ruta_directa_y_saludable_bajo_5s(g, algoritmo):
    rng = np.random.default_rng(1)
    tiempos = []
    for _ in range(10):
        a, b = (int(x) for x in rng.integers(0, len(g.lon), 2))
        t0 = time.perf_counter()
        c = costes(g, PESOS, 0.5)
        for pesos in (g.longitud, c):
            try:
                camino(g, a, b, pesos, algoritmo)
            except Exception:
                pass
        tiempos.append(time.perf_counter() - t0)
    print(f"{algoritmo}: p50 {np.median(tiempos):.3f} s, máx {max(tiempos):.3f} s")
    assert max(tiempos) < 5.0


def test_dijkstra_limitado_bajo_1s(g):
    t0 = time.perf_counter()
    distancias_limitadas(g, 0, 5000)
    assert time.perf_counter() - t0 < 1.0
```

- [ ] **Paso 2:** `pytest tests/rutas/test_latencia.py -v -s` → PASS; apuntar p50/máx de cada algoritmo, tiempo de carga y memoria (`/usr/bin/time -v python -c "from api.rutas.grafo import cargar_grafo; ..."` → «Maximum resident set size»).
- [ ] **Paso 3:** si da tiempo, `python -m ingesta.grafo 28079` y repetir para la capital (entrada de DEC-A11).
- [ ] **Paso 4:** escribir en `docs/arquitectura.md` §4.4 las cifras medidas (sustituyen a «Latencia estimada (sin verificar)») y el algoritmo elegido. Commit.

**Terminado cuando:** hay cifras reales de latencia y memoria en `arquitectura.md` y la prueba pasa en Getafe.

---

## J-F1 · Tipos generados del OpenAPI y MSW

**Rol:** Front · **Depende de:** J-M1, M-F2 · **Duración:** 1,5 h

**Ficheros:** Crear `web/src/api/tipos.ts` (generado), `web/src/api/cliente.ts`, `web/src/mocks/handlers.ts`, `web/src/mocks/navegador.ts`, `web/src/mocks/datos/*.json`, `web/src/mocks/datos.test.ts`. Modificar `web/package.json` (scripts), `web/src/main.tsx`.

**Interfaces (produce):** tipos `components["schemas"]["RespuestaRecomendar"]`, etc.; `cliente.recomendar(p: PeticionRecomendar): Promise<RespuestaRecomendar>` y equivalentes para cada endpoint, contra `/api`.

- [ ] **Paso 1:** en `web/package.json`: `"tipos": "openapi-typescript src/api/openapi.json -o src/api/tipos.ts"` y `"contrato": "npm run tipos && tsc --noEmit"`. Ejecutar `npm run tipos`.
- [ ] **Paso 2: `cliente.ts`**

```ts
import type { components } from "./tipos";

export type Esquemas = components["schemas"];
const BASE = "/api";

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  const r = await fetch(BASE + ruta, { headers: { "Content-Type": "application/json" }, ...init });
  if (!r.ok) throw new Error(`Error ${r.status} en ${ruta}`);
  return r.json() as Promise<T>;
}

export const cliente = {
  actividades: () => pedir<Esquemas["RespuestaActividades"]>("/actividades"),
  ubicacion: (texto: string) => pedir<Esquemas["RespuestaUbicacion"]>(`/ubicacion?texto=${encodeURIComponent(texto)}`),
  recomendar: (p: Esquemas["PeticionRecomendar"]) =>
    pedir<Esquemas["RespuestaRecomendar"]>("/recomendar", { method: "POST", body: JSON.stringify(p) }),
  ruta: (p: Esquemas["PeticionRuta"]) => pedir<Esquemas["RespuestaRuta"]>("/ruta", { method: "POST", body: JSON.stringify(p) }),
  municipio: (cod: string) => pedir<Esquemas["RespuestaMunicipio"]>(`/municipio/${cod}`),
  fuentes: () => pedir<Esquemas["RespuestaFuentes"]>("/fuentes"),
};
```

- [ ] **Paso 3: datos simulados tipados** en `web/src/mocks/datos/` (uno por endpoint; para Recomendar, tres resultados de Getafe con nombres **ficticios marcados como ejemplo** — no datos reales inventados que parezcan oficiales —, uno con `verde: null` para ver el «sin datos», y uno con `alternativa_cubierta: true`). `handlers.ts` con `http.get("/api/actividades", …)`, `http.post("/api/recomendar", …)`, etc. (MSW 2). En `main.tsx`, arrancar el *worker* solo si `import.meta.env.VITE_SIMULAR === "1"`.
- [ ] **Paso 4: prueba** `web/src/mocks/datos.test.ts`: importa cada JSON con su tipo (`satisfies Esquemas["RespuestaRecomendar"]`) — si el contrato cambia, `tsc` falla. Run: `npm run contrato && npx vitest run` → PASS.
- [ ] **Paso 5: commit** — «Front: tipos del contrato, cliente y respuestas simuladas».

**Terminado cuando:** `npm run contrato` pasa y la app arranca con `VITE_SIMULAR=1 npm run dev` sin API.

---

## J-F2 · Pantalla Inicio «¿Qué te apetece hacer?»

**Rol:** Front · **Depende de:** J-F1, M-F1 (Inicio cerrado en `docs/pantallas.md`) · **Duración:** 3 h

**Ficheros:** Crear `web/src/pantallas/Inicio.tsx`, `web/src/componentes/SelectorUbicacion.tsx`, `web/src/estado/preferencias.tsx` (contexto + `localStorage`), `web/src/pantallas/Inicio.test.tsx`.

- Actividades desde `GET /actividades`; botón «Sorpréndeme» (RF-03); ubicación por GPS (`navigator.geolocation`, solo con gesto del usuario) o texto (`/ubicacion`, con lista de candidatos accesible); resumen de preferencias; primera recomendación en ≤ 3 interacciones (RNF).
- `preferencias.tsx`: perfil, acompañantes, pesos, tiempo y distancia en `localStorage` con `try/catch` (si falla, en memoria). **La ubicación no se guarda en `localStorage`.**

- [ ] **Paso 1: pruebas que fallan** (`Inicio.test.tsx`, con MSW de nodo): muestra las actividades simuladas como `button`; el `h1` existe; elegir «Correr» + ubicación de prueba navega a `/resultados`; axe sin violaciones; `localStorage` no contiene `lat`/`lon` tras elegir ubicación.
- [ ] **Paso 2:** implementar hasta verde. **Paso 3:** `npm run build`. **Paso 4:** commit.

**Terminado cuando:** pruebas y axe en verde; flujo Inicio → Resultados en 3 toques con datos simulados.

---

## J-F3 · Pantalla Resultados (lista, sin mapa todavía)

**Rol:** Front · **Depende de:** J-F2 · **Duración:** 3 h

**Ficheros:** Crear `web/src/pantallas/Resultados.tsx`, `web/src/componentes/TarjetaResultado.tsx`, `web/src/componentes/Indicador.tsx` (icono + color + texto, nunca solo color), `web/src/pantallas/Resultados.test.tsx`.

- `useQuery(["recomendar", peticion], …)` con TanStack Query (descarta respuestas viejas al cambiar la petición); lista `ul/li` con nombre, distancia, tiempo, «Nota 8,2 sobre 10», mejor hora; «Ver más» con `desplazamiento`; avisos y `aviso_medico` visibles; anuncio `aria-live="polite"` («3 resultados actualizados»).

- [ ] **Paso 1: pruebas que fallan:** 3 `li` con los datos simulados; «Verde: sin datos» visible en el que trae `null`; «Ver más» pide `desplazamiento=3`; región `aria-live` actualizada; axe sin violaciones; `Indicador` siempre tiene texto visible.
- [ ] **Paso 2:** implementar. **Paso 3:** `npm run build`. **Paso 4:** commit.

**Terminado cuando:** pruebas y axe en verde con datos simulados.

---

## Cierre del jueves (20:00, 15 min, todo el equipo)

- [ ] `pytest` completo en `main` en verde (con datos reales en el equipo de Datos).
- [ ] Revisar estado de DEC-05, DEC-07, DEC-07b, DEC-08 (deben estar cerradas), DEC-03 (proveedor elegido), DEC-11, DEC-12.
- [ ] Actualizar `docs/PENDIENTES.md` y este plan (marcar casillas; mover lo que no se terminó al viernes **por delante** de lo nuevo).

---

# VIERNES 16/10 — tareas

| ID | Rol | Tarea | Ficheros | Terminado cuando | Prueba |
|---|---|---|---|---|---|
| V-D1 | Datos | Normalizador de servicios (`sanitarios` contando `centro_nro_registro` distintos y tipos «Centro de salud»/«Consultorio de atención primaria»; `farmacias` con coma decimal; `educativos` con `SITUACIÓN`=ALTA; `atencion_social` sin «RESERVADO»; EIEL `cultural`/`nucleos`) → `servicio.parquet`; tabla `indicador_municipio(cod_ine, categoria, indicador, valor NULL=sin datos, unidad, anio, fuente)` según **DEC-09** (`config/indicadores.yaml`) dentro de `construir_principal` | `ingesta/normalizar/servicios.py`, `ingesta/construir.py`, `config/indicadores.yaml` | 179 municipios con todas las filas de indicador (valor o NULL), cifras de cobertura iguales a D-09 | `tests/ingesta/test_servicios.py`: 429 centros de salud+consultorios; educativos ALTA 3.906; 177 RESERVADO excluidos; Patones con `deporte` NULL (no 0) |
| V-D2 | Datos | `/ubicacion`: `callejero.py` (CSV cp1252 → Parquet con `cd_vial`, número, `coord_x`/`coord_y` reproyectadas, `cod_ine`; **comprobar los nombres reales de columnas del CSV antes de escribir el normalizador**); cliente del buscador de Nomecalles (sin clave) con `httpx` y caché de 1 h en memoria; respaldo «centro del municipio» | `ingesta/normalizar/callejero.py`, `api/ubicacion.py`, `api/main.py` | «calle madrid 10 getafe» → x 437838,98 / y 4461942,01 reproyectado (D-04); texto sin resultado → municipio por nombre; buscador caído → municipio | `tests/api/test_ubicacion.py` con el buscador simulado (sin red) + 1 prueba `lento` real |
| V-D3 | Datos | Patrón horario del aire para horas futuras (CLAUDE.md §6.2): bajar `aire_historico` (`--solo aire_historico --incluir-pesadas`), mediana por estación × magnitud × mes × hora del día → `patron_aire.parquet` → tabla en `gomad.duckdb`. Hasta que exista, el motor usa la última categoría medida y lo dice («aire previsto: igual que la última medición») | `ingesta/normalizar/aire.py`, `ingesta/construir.py` | Tabla `patron_aire` con las 52 estaciones (o las que tengan histórico) | Prueba de forma: 24 horas × 12 meses por estación-magnitud con datos |
| V-M1 | Motor | `/actividades` y `/recomendar` reales: `repositorio.py` (candidatos por caja + haversine en DuckDB solo lectura, reabriendo `tiempo_real.duckdb` por petición), Dijkstra con límite (J-R2) para distancia real cuando el origen está en un municipio con grafo y haversine × factor de rodeo (criterio propio, marcado) donde no, estación más cercana o de la zona, `ContextoHora` por hora, `franja`, `puntuacion`; «Sorpréndeme» = 3 actividades distintas; middleware de log **sin ubicación** (solo ruta, código y ms) | `api/repositorio.py`, `api/servicio_recomendar.py`, `api/main.py` | Respuesta < 3 s en Getafe y capital; `avisos` cuando falta un factor | `tests/api/test_endpoints.py`: `test_recomendar_getafe`, `test_recomendar_capital_sin_vpla` (verde NULL + aviso), `test_sorprendeme_tres_actividades_distintas`, `test_logs_sin_ubicacion` (captura `caplog`, ninguna línea contiene la lat/lon enviadas) |
| V-M2 | Motor | `explicacion.py`: plantillas en lenguaje llano a partir de los factores dominantes y de la mejor hora («Ve a las 20:00: baja el calor y el aire es razonablemente bueno; el 68 % del entorno es zona verde»); cita fuente y fecha; marca criterio propio | `api/motor/explicacion.py` | Cada recomendación trae explicación sin datos que no estén en la respuesta | `tests/motor/test_explicacion.py`: las cifras de la frase coinciden con las del objeto; Carmen recibe «Ahora no: mejor a las …» |
| V-R1 | Rutas | `/ruta` en Getafe: grafo cargado al arrancar (`lifespan`), directa y saludable en paralelo (`ThreadPoolExecutor`), GeoJSON, `descripcion` en texto, POIs de `poi_ruta` a ≤ 25 m de la ruta; fuera del grafo o desconectado → línea recta `aproximada=True` + aviso; tiempo con la velocidad de DEC-07 | `api/servicio_ruta.py`, `api/main.py` | < 5 s; nunca 500 por ruta imposible | `tests/api/test_endpoints.py::test_ruta_getafe`, `::test_ruta_fuera_del_grafo_es_aproximada` |
| V-F1 | Front | Mapa MapLibre (react-map-gl) sincronizado con la lista (RF-11): seleccionar en lista resalta en mapa y viceversa; la lista sigue siendo el equivalente completo; mapa base OpenFreeMap en desarrollo | `web/src/componentes/Mapa.tsx` | Selección sincronizada; el mapa tiene `aria-hidden` o etiqueta y nada es exclusivo del mapa | Vitest: seleccionar tarjeta cambia el marcador activo (mapa simulado) |
| V-F2 | Front | Detalle «¿Por qué?»: nota por factor, línea horaria con la mejor franja, aire y tiempo con icono+color+texto (colores ICA de `umbrales.md` §1.3 como pastilla con contraste), fuente y fecha | `web/src/pantallas/Detalle.tsx` | Contraste ≥ 4,5:1 en todas las pastillas | Vitest + axe |
| V-F3 | Front | Panel «Ajustar» (hoja inferior Radix): deslizadores de pesos, recálculo al soltar (RF-16), perfil, «Salgo con…», tiempo y distancia | `web/src/componentes/PanelAjustes.tsx` | Mover un peso cambia el orden sin recargar | Vitest: soltar el deslizador lanza una sola petición nueva |
| V-F4 | Front + Motor | **Primer despliegue HTTPS**: nombre/dominio (DEC-10) o subdominio gratuito; `DOMINIO=` en `.env` de la VM; `web/dist` compilado con `VITE_SIMULAR=0`; `data/` copiado a la VM (o ingesta ejecutada allí) | `deploy/*`, `docs/arquitectura.md` §6 | `https://<dominio>/` abre en un móvil real y pide la ubicación | Manual: geolocalización funciona en móvil; `curl -I https://…/api/salud` → 200 con certificado válido |
| DEC-06 / DEC-09 | Equipo | Cerrar antes de las 12:00 (ver tabla de decisiones) | `config/reglas.yaml`, `config/indicadores.yaml` | Ficheros en `main` | — |

---

# SÁBADO 17/10 — tareas

| ID | Rol | Tarea | Ficheros | Terminado cuando | Prueba |
|---|---|---|---|---|---|
| S-D1 | Datos | `/fuentes`: atribución, licencia (CKAN CC BY 4.0, OSM ODbL, AEMET aviso legal, Nomecalles…), URL, última recarga y último fallo desde `fuente_fecha`/`manifest.json`; fechas de cada dato en las respuestas (RF-19) | `api/main.py`, `config/fuentes.yaml` (licencias, con URL de la licencia) | Todas las fuentes usadas por la app listadas | `tests/api/test_endpoints.py::test_fuentes_todas_con_licencia` |
| S-D2 | Datos | Ingesta programada local: guiones `deploy/ingesta_horaria.sh` (descargar `--refresco horario` → normalizar `lectura_aire prevision` → `construir tiempo_real`), `_diaria.sh`, `_semanal.sh` (OSM + grafo) y `_referencia.sh`; cada uno no hace nada si `cambiado` es falso | `deploy/*.sh` | Ejecutar dos veces seguidas: la segunda no reconstruye | Manual + log |
| S-M1 | Motor | `/municipio/{cod_ine}`: indicadores por categoría con «sin datos» explícito y encaje con preferencias en frases, **sin ranking ni comparación** (RF-17, RF-18); código inexistente → 404 legible | `api/servicio_municipio.py` | 179 códigos responden | `test_municipio_179_responden`, `test_municipio_sin_datos_es_null`, `test_municipio_inexistente_404` |
| S-R1 | Rutas | **Grafo de toda la Comunidad** (`python -m ingesta.grafo todos`; si pyrosm se queda sin memoria, recortar antes con `osmium extract` por caja); `pct_verde` en los 13 sin VPLA con parques OSM (`leisure=park`) o cubierta terrestre por `bbox`; validación por muestras: capital, San Lorenzo de El Escorial (28131) y un municipio sin datos de mobiliario; medir memoria y latencia (J-R3 con `madrid`) → **DEC-A11 antes de las 14:00**: seguir, CH por perfiles fijos, o recorte n.º 2 (solo Getafe) | `ingesta/grafo.py`, `docs/arquitectura.md` §4.4 | Rutas válidas en las 3 muestras y < 5 s, o decisión de recorte apuntada | `test_latencia.py` con el grafo regional |
| S-F1 | Front | Pantalla Ruta: directa vs. saludable en mapa y en texto, métricas, fuentes/bancos/DEA, aviso si `aproximada` | `web/src/pantallas/Ruta.tsx` | Descripción en texto completa sin mirar el mapa | Vitest + axe |
| S-F2 | Front | Pantalla Municipio: indicadores por categoría, «sin datos» visible, encaje con preferencias, sin rankings | `web/src/pantallas/Municipio.tsx` | Funciona para Getafe, capital y Patones | Vitest + axe |

---

# DOMINGO 18/10 — tareas (fin del día: congelación)

| ID | Rol | Tarea | Ficheros | Terminado cuando | Prueba |
|---|---|---|---|---|---|
| D-D1 | Datos | Caché ante caídas: si `tiempo_real.duckdb` tiene más de 2 h, la API sigue sirviendo y añade aviso con la hora real del dato; tráfico de la capital en memoria 5–15 min (CLAUDE.md §6.4) con respaldo por tipo de vía; **cron en la VM** con los guiones de S-D2 (horario, 04:00, semanal, mensual) | `api/repositorio.py`, `deploy/crontab`, `deploy/docker-compose.yml` (servicio `ingesta`) | Cortar la red de la VM 1 h: la app sigue y avisa | `test_dato_viejo_avisa` (fecha simulada) |
| D-M1 | Motor | **F6** (primer recorte si falta tiempo): `/asistente/interpretar` con el proveedor de DEC-03 y validación contra `ParametrosAsistente` (rechazo de consejo médico y fuera de catálogo, aclaración si ambiguo; **sin ubicación** en el prompt); `/asistente/ruta` comprueba cada condición con datos del motor y solo entonces llama a `redactar`; si la IA falla → explicación con plantillas y `redactada_por_ia=False`; respuestas grabadas para la demo en `api/ia/grabadas.py` | `api/ia/*.py`, `api/main.py` | Funciona con y sin LLM | `tests/api/test_asistente.py`: esquema inválido del LLM → aclaración, no 500; el prompt no contiene coordenadas; condiciones cumplidas/no cumplidas salen del motor |
| D-R1 | Rutas | Ruta circular por distancia objetivo (RF-22): puntos de paso a ≈ objetivo/3, encadenados con la saludable, ±10 %; si no se consigue, la más cercana con aviso | `api/rutas/circular.py` | 5 km en Getafe dentro de 4,5–5,5 km | `tests/rutas/test_circular.py` sobre el grafo de Getafe (`lento`) |
| D-F1 | Front | Asistente (F6): texto → chips editables → ruta + condiciones cumplidas/no cumplidas; funciona con el formulario aunque la IA no responda | `web/src/pantallas/Asistente.tsx` | Usable solo con formulario | Vitest + axe |
| D-F2 | Front | Fuentes y aviso: licencias, fechas, «no es consejo médico», privacidad (sin registro, ubicación solo en la consulta) | `web/src/pantallas/Fuentes.tsx` | Enlazada desde todas las pantallas | Vitest + axe |
| **D-X** | Todos | **23:59 — congelación de alcance.** Desde aquí solo correcciones de errores, textos y rendimiento. Lo que no esté en `main` con pruebas en verde **no entra**. Aplicar el orden de recorte si hace falta (F6 → ruta regional → Oracle) y anotarlo en `docs/arquitectura.md` §9 | — | Etiqueta `git tag congelacion-18oct` en `main` | `pytest` y `npx vitest run` en verde en la etiqueta |

**Oracle/APEX (arquitectura §3.5):** solo si F1–F5 están terminados el domingo a mediodía; si no, no se empieza (recorte n.º 3).

---

# LUNES 19/10 — tareas

| ID | Rol | Tarea | Terminado cuando |
|---|---|---|---|
| L-1 | Todos | Ensayo con las personas de la demo (CLAUDE.md §5.2): Carmen (36 °C, 45 min), Lucía (ozono, sensible), Dani con carrito, Ana y su perro, familia que se muda; y el guion **«dos personas, mismo sitio, distinta respuesta»** moviendo pesos en directo | Cada persona recorre su flujo en el móvil sin ayuda |
| L-2 | Todos | Corrección de errores del ensayo (solo errores; nada nuevo) | Lista de errores cerrada o aceptada |
| L-3 | Todos | Guion de 10 min mapeado a los criterios (1.1 datos abiertos y trazabilidad, con el botón de recarga en administración; 1.2 resolución; 2.1 sencillez; 2.2 interactividad, primer desempate) | Guion ensayado dos veces dentro de tiempo |
| L-4 | Motor + Datos | **Demo sin red**: el mismo Compose en un portátil con `data/` congelado, mapa base PMTiles local y respuestas de IA grabadas | La demo completa funciona con el wifi apagado |
| L-5 | Front | Accesibilidad: revisión con `a11y-architect`, teclado completo y lector de pantalla (NVDA o TalkBack) en el flujo principal; contraste en las pastillas del ICA | Sin bloqueantes AA abiertos |

**Martes 20/10:** demo. Antes de salir: `curl -I https://<dominio>/api/salud`, ingesta horaria al día, portátil de respaldo cargado.

---

## Autorrevisión del plan (hecha al escribirlo)

1. **Cobertura de la spec:** §3.1 → M-D1/M-D2; §3.2 → J-D1–J-D3, V-D1, V-D2; §3.3 → J-D4; §3.4 → J-R1, S-R1; §3.5 → condicionado (domingo); §4.1 endpoints → J-M1 (contrato) y V-M1, V-R1, V-D2, S-D1, S-M1, D-M1; §4.2 → V-M1; §4.3 módulos → J-M2–J-M4, V-M2, J-R2, J-M5/D-M1; §4.4 → J-R2, J-R3, D-R1, DEC-A11; §5 → M-F1, M-F2, J-F1–J-F3, V-F1–V-F3, S-F1, S-F2, D-F1, D-F2, L-5; §6 → M-M2, M-M3, V-F4, D-D1, L-4; §7 → D-D1, V-R1 (aproximada), V-M1 (avisos); §8 → pruebas en cada tarea; §9 → calendario y D-X; §10 → tabla de decisiones.
2. **Sin marcadores vacíos:** los valores pendientes viven en `config/` con su tarea DEC y fecha; el código y las pruebas no dependen de ellos.
3. **Consistencia de nombres:** `ContextoHora`, `evaluar_exterior`, `puntuar`, `evaluar_horas`, `mejor_hora`, `necesita_cubierta`, `cargar_grafo`, `costes`, `camino`, `distancias_limitadas`, `resumen`, `RutaNoEncontrada`, `construir_principal`, `construir_tiempo_real`, `aplicar_actividades`, `crear_ica_hora`, `atomico` se usan igual en todas las tareas.
4. **Foco de revisión:** las cinco situaciones tienen prueba en su tarea (J-M3, J-M4, M-D1, J-D3, J-R2, V-M1, V-R1).
