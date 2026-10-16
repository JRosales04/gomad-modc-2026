# Plan de implementación — GoMad (demo del martes 20/10/2026)

> **Para agentes:** SUB-SKILL OBLIGATORIA: `superpowers:executing-plans` (recomendado en `docs/PENDIENTES.md` P-10) o `superpowers:subagent-driven-development`. Cada tarea es un encabezado `### Task N:` (numeración global; los scripts de las skills extraen la tarea por ese número). **Cada sesión ejecuta solo el rango de tareas que le indique la persona** (ver «Cómo ejecutar este plan»). Las tareas o pasos marcados **[manual]** los hace una persona; el agente no los ejecuta: los salta y lo anota en el registro. Los pasos usan casillas (`- [ ]`).

**Objetivo:** convertir el diseño aprobado de `docs/arquitectura.md` en una app web móvil desplegada con HTTPS (F1–F5 obligatorias, F6 si da tiempo) para la demo del martes 20/10/2026.

**Arquitectura:** tres servicios de Docker Compose, cada uno en su directorio de `app/` con sus propias dependencias: **`ingest`** (descarga por niveles de recarga → normalizadores → GeoParquet → `gomad.duckdb` + `realtime.duckdb` + grafo), **`api`** (FastAPI sin estado con el grafo peatonal en memoria: igraph + `scipy.sparse.csgraph`) y **`frontend`** (SPA React + Vite + TypeScript con MapLibre, compilada y servida por Caddy con HTTPS). Comparten `app/data/` (volumen) y `app/config/` (solo lectura). Despliegue en una VM de OCI.

**Stack:** Python 3.12, DuckDB (+ `spatial` solo en ingest), GeoPandas/pyogrio/pyproj/shapely 2, pyrosm (o pyosmium de respaldo), python-igraph, SciPy, FastAPI + Pydantic v2, pytest · Node 20 LTS, React 18, Vite 5, TypeScript (**front real desde el 14/10: Node ≥ 20.19, React 19, Vite 8, TypeScript 6**, ver `app/frontend/docs/guia.md` §2.1), react-map-gl (MapLibre), React Router, TanStack Query, Radix UI, MSW, Vitest + axe · Docker Compose, Caddy, OCI.

**Spec:** `docs/arquitectura.md` (manda sobre CLAUDE.md §6 donde difieran). Contexto: `CLAUDE.md`, `docs/PENDIENTES.md`, `docs/decisiones-pendientes.md`, `docs/informe-datos.md`, `docs/assets/umbrales.md`, `docs/assets/requisitos_fuentes.json`.

**Fecha del plan:** miércoles 14/10/2026 (revisión: código en inglés y un directorio por servicio).

---

## Estructura por servicios

```
GoMad/                                  raíz del repositorio: CLAUDE.md, docs/
└── app/
    ├── .env.example   .env             .env compartido por los servicios (no se sube)
    ├── api/           servicio API     pyproject.toml · Dockerfile · .venv/ · main.py · schemas.py · settings.py
    │                                   engine/ · routing/ · ai/ · services/ · scripts/ · tests/
    ├── ingest/        servicio ingesta pyproject.toml · Dockerfile (domingo) · .venv/ · common.py · build_db.py · graph.py
    │                                   normalize/ · scripts/ · tests/
    ├── frontend/      servicio web     package.json · Dockerfile (compila y sirve con Caddy) · Caddyfile · src/ · public/
    ├── config/        YAML compartidos (montado en solo lectura en api e ingest)
    ├── deploy/        docker-compose.yml
    └── data/          volumen compartido: raw/, clean/, perfil/, gomad.duckdb, realtime.duckdb, graph/ (no se sube)
```

**Convenciones de rutas (obligatorias):**
- Cada tarea indica su **Servicio** (`app/api/`, `app/ingest/`, `app/frontend/`, `app/deploy/`). **Las rutas de ficheros y los comandos de la tarea son relativos a ese directorio**, y los comandos se ejecutan desde él.
- Recursos compartidos desde un servicio: `../config/`, `../data/`, `../.env`, `../frontend/…`. Documentación del repositorio: `../../CLAUDE.md`, `../../docs/…`.
- **Commits:** con `git -C ../..` y rutas desde la raíz del repositorio (`app/ingest/…`, `CLAUDE.md`), p. ej. `git -C ../.. add app/ingest/scripts CLAUDE.md && git -C ../.. commit -m "…"`.
- En las tablas de los días 16–19, las rutas son relativas a `app/`.
- **Código Python:** cada servicio es su propia raíz de importación (`pythonpath = ["."]`): en `api`, `from engine.rules import …`, `from schemas import …`; en `ingest`, `from common import …`, `python -m normalize`. **Ningún servicio importa código de otro.**
- **Rutas de datos y configuración en código:** variables de entorno `GOMAD_DATA_DIR` y `GOMAD_CONFIG_DIR`; por defecto `app/data` y `app/config` (en Docker: `/data` y `/config`).
- **Venv por servicio Python** (`app/api/.venv`, `app/ingest/.venv`, ya creados): solo para desarrollo local. En Docker no hay venv: cada `Dockerfile` instala el `pyproject.toml` de su servicio.
- **DuckDB con la misma versión exacta en `api` e `ingest`** (la ingesta escribe el `.duckdb` que lee la API). Lo comprueba `test_shared_versions.py` (Task 1).
- Los directorios vacíos llevan `.gitkeep`; se borra al crear el primer fichero dentro.

---

## Cómo ejecutar este plan

`superpowers:executing-plans` **no tiene parámetros**: por defecto ejecuta todas las tareas del plan seguidas, sin parar. Para trabajar por días y roles, la persona se lo dice en el mensaje (las instrucciones del usuario mandan sobre la skill):

```
Usa superpowers:executing-plans con docs/plan-implementacion.md.
Ejecuta SOLO las tareas 2, 3 y 4 (rol Datos, miércoles). Salta lo marcado [manual]. Para al terminar la 4.
```

- **Registro de progreso:** la skill guarda un *ledger* en `.superpowers/sdd/plan-implementacion/progress.md` (ignorado por git, uno por copia del repo). Las tareas con `Task N: complete` no se repiten. La verdad compartida es `git log` en `main`.
- **Rama:** la skill no trabaja en `main`. Cada rol abre su rama (`datos/mie14`, `motor/jue15`…) o *worktree* y fusiona a `main` con las pruebas en verde.
- **Revisión final:** al acabar su rango, la skill pide una revisión de toda la rama.
- **Frontend [manual guiado] (desde el 14/10):** la SPA de `app/frontend/` la construye **a mano** la persona del front, que ya está trabajando en ella. Las tareas marcadas **[manual guiado]** (Task 10, Tasks 23–25 y las filas de Front de viernes a domingo) **no las ejecuta el agente**: las salta y lo anota en el registro. La persona las hace siguiendo `app/frontend/docs/guia.md` (estado, desajustes, plan por días, contrato, checklist) y `app/frontend/docs/pantallas.md` (especificación de cada pantalla). El contenido original de esas tareas se conserva como referencia (archivos, pruebas y criterios de «terminado»), salvo las versiones de la Task 10, que ya no aplican (ver la guía §2.1). Un agente **sí** puede documentar, revisar o verificar ese trabajo, pero no escribir en `app/frontend/` sin que la persona lo pida.
- **Días 16–19:** están como tablas, **no** como `### Task N:`. Cada tarde, quien coordine pide `superpowers:writing-plans` para convertir las tablas del día siguiente en tareas detalladas (Task 26 en adelante) en este mismo fichero.

### Rangos por día y rol

| Día | Datos (`ingest`) | Motor (`api`, `deploy`) | Rutas (`ingest` + `api`) | Front (`frontend`) |
|---|---|---|---|---|
| Mié 14 | 2, 3, 4 | 1 (primero), 5, 6 [manual], 7 | 8 | 9 ✅ (`app/frontend/docs/pantallas.md`), 10 [manual guiado] |
| Jue 15 | 16, 17, 18, 19 | 11 (9:00), 12, 13, 14, 15 | 20, 21, 22 | 23, 24, 25 [manual guiado] |

**Orden obligatorio:** Task 1 antes que cualquier otra tarea Python; Task 11 (contrato) antes que 23–25 y antes que las tareas del viernes.

---

## Restricciones globales

Cada tarea las incluye implícitamente.

- **Idioma (CLAUDE.md §2.1):** **código en inglés** — identificadores, ficheros, módulos, endpoints, tablas, columnas propias, claves de configuración y nombres de pruebas. **Comentarios y docstrings en español sin tildes.** Textos que ve la persona usuaria (interfaz, mensajes, explicaciones, avisos, salida de los scripts) en español con tildes. Los identificadores de datasets (`eiel_deporte`…) y de campos de origen (`CDMUNICIPIO`…) **no se traducen**. Documentación y commits en español.
- **Estructura por servicios** (sección anterior): sin importaciones entre servicios; lo compartido va por `data/`, `config/`, `.env` y el `openapi.json`.
- **Ámbito:** 179 municipios, **sin filtro de población** (§2.2). Ayuntamiento de Madrid solo como complemento para la capital (§2.3).
- **La IA interpreta y explica; el motor de reglas decide** (§2.4). `/recommend` y `/route` no llaman nunca a la IA.
- **No inventar identificadores de datasets ni campos** (§2.5). Los campos de origen usados aquí se comprobaron el 14/10 en `app/data/perfil/perfil.json`.
- **Claves solo en `app/.env`** (`AEMET_API_KEY`, `IA_*`, `ORACLE_*`). Nunca en el repositorio, en una imagen Docker, en `manifest.json`, en URLs guardadas ni en logs.
- **Nomecalles:** solo la descarga pública sin clave (§2.7).
- **Privacidad:** sin registro; **la ubicación nunca se escribe en los logs**; al proveedor de IA no se envía ubicación exacta ni datos personales (§2.8).
- **Umbrales oficiales copiados de la fuente y citados** (§2.9). Lo que no tenga fuente oficial lleva `own_criterion: true` y la app lo dice. Aviso visible «no es consejo médico».
- **Accesibilidad WCAG 2.1 AA**, móvil primero; cada indicador con icono + color + texto (§2.10).
- **Licencias:** atribución de cada fuente en `/sources` y en la app (§2.11).
- **Alcance:** no añadir funcionalidades ni fuentes sin preguntar (§2.12). **Domingo 18 a las 23:59 se congela el alcance.**
- **Orden de recorte:** F6 → ruta saludable en toda la Comunidad (solo Getafe) → Oracle/APEX (arquitectura §9).
- **Decisiones pendientes** (arquitectura §10): el código **lee** pesos, regla de aire, calor, lluvia, velocidades, actividades e indicadores **de `config/*.yaml`**; las pruebas usan valores propios. Ninguna tarea de código fija esos valores.
- **Coordenadas:** todo en EPSG:4326; reproyección desde EPSG:25830 con `pyproj` y `always_xy=True`, **ignorando los `.prj` de Nomecalles**.
- **Código INE** siempre de 5 dígitos (`28` + 3).
- **Si cambian requisitos o fuentes:** actualizar `docs/assets/requisitos_fuentes.json` y `CLAUDE.md` (§2.13).
- **Rendimiento:** recomendación < 3 s, ruta < 5 s.
- **Nombres respecto a la spec** (Task 1 actualiza `docs/arquitectura.md` y CLAUDE.md §6.1 con esta tabla):

| Spec (español) | Código |
|---|---|
| `scripts/descargar_fuentes.py`, `perfilar_fuentes.py` | `app/ingest/scripts/download_sources.py`, `app/ingest/scripts/profile_sources.py` |
| campo `refresco`, niveles `referencia/diario/horario/demanda` | `refresh`: `reference/weekly/daily/hourly/on_demand` |
| `ingesta/`, `normalizar/`, `construir.py`, `grafo.py` | `app/ingest/`, `normalize/`, `build_db.py`, `graph.py` |
| `api/esquemas.py`, `motor/` (`reglas`, `puntuacion`, `franja`, `explicacion`), `rutas/`, `repositorio.py`, `ia/` | `app/api/schemas.py`, `engine/` (`rules`, `scoring`, `slots`, `explanation`), `routing/`, `repository.py`, `ai/` |
| `web/` | `app/frontend/` |
| `data/tiempo_real.duckdb`, `data/grafo/{nodos,tramos}` | `app/data/realtime.duckdb`, `app/data/graph/<zona>/{nodes,edges}` |
| tablas `municipio`, `destino`, `estacion_aire`, `lectura_aire`, `prevision`, `tramo`, `poi_ruta`, `servicio`, `indicador_municipio` | `municipality`, `destination`, `air_station`, `air_reading`, `forecast`, `edge`, `route_poi`, `service`, `municipality_indicator` |
| `/recomendar`, `/ruta`, `/municipio/{cod_ine}`, `/asistente/*`, `/fuentes`, `/actividades`, `/ubicacion` | `/recommend`, `/route`, `/municipality/{ine_code}`, `/assistant/*`, `/sources`, `/activities`, `/location` |

## Foco de revisión

Situaciones que una persona real se encontrará aunque ninguna prueba «obvia» las cubra. Cada una tiene su prueba en la tarea indicada.

1. **Municipio con datos parciales** (sin VPLA, sin estación de aire propia, sin mobiliario en OSM; p. ej. Madrid capital sin VPLA o Patones sin Nomecalles): la nota se calcula con los factores disponibles, renormalizando pesos, y la respuesta dice qué falta. Nunca un 500 ni un 0 silencioso. → Task 13 (`test_missing_factor_renormalizes`), Task 19 (`test_build_main_real`: `green` NULL, no 0) y viernes V-M1 (`test_recommend_capital_without_vpla`).
2. **Dato viejo o fuente caída** (el `aire_dia` regional de madrugada trae el día anterior; AEMET 429/5xx): último dato válido con su fecha real y aviso; la descarga no borra lo anterior. → Task 2 (`test_failure_keeps_manifest`), Task 18 (`test_air_date_per_row`), Task 19 (`test_atomic_replace`).
3. **Origen o destino lejos de la red peatonal o desconectados:** `RouteNotFound` → la API devuelve línea recta marcada `approximate` con aviso, no un 500. → Task 21 (`test_unreachable_raises`, `test_nearest_node_too_far`) y viernes V-R1.
4. **Pesos extremos** (todos a 0, uno al 100 %): sin división por cero; todos a 0 vuelve a los pesos por defecto con aviso. → Task 13 (`test_all_zero_weights_fall_back`) y validación Pydantic en Task 11.
5. **Ventana horaria sin previsión** (cruza medianoche, excede las horas de AEMET, empieza en el pasado): horas «sin datos» que no se eligen como mejor franja; ventana invertida → 422 legible. → Task 14 (`test_window_crosses_midnight`, `test_hours_without_forecast`) y Task 11 (`test_inverted_window_is_422`).

Además: **la ubicación nunca aparece en los logs** → `--no-access-log` desde Task 5 y prueba `test_logs_without_location` en V-M1.

---

## Mapa de ficheros (rutas relativas a `app/`)

```
.env.example                           + AEMET_MUNICIPALITIES, AEMET_PAUSE_S                   (Task 3)
api/
  pyproject.toml                       dependencias de la API                                  (Task 1)
  Dockerfile  .dockerignore            imagen de la API                                        (Task 5)
  main.py                              arranque, /health, rutas del contrato                   (Tasks 1, 11)
  schemas.py                           contrato Pydantic                                       (Task 11)
  settings.py                          rutas compartidas y carga de config/*.yaml              (Task 12)
  engine/rules.py scoring.py slots.py                                          (Tasks 12–14)
  routing/graph.py                                                             (Task 21)
  ai/base.py                                                                   (Task 15)
  scripts/export_openapi.py probe_ai.py                                        (Tasks 11, 15)
  tests/conftest.py test_health.py test_contract.py engine/ routing/
ingest/
  pyproject.toml                       dependencias de la ingesta                              (Task 1)
  common.py                            utilidades de normalizacion                             (Task 16)
  normalize/__init__.py __main__.py municipalities.py population.py sports.py green.py furniture.py air.py aemet.py (Tasks 16–18)
  build_db.py                          GeoParquet -> gomad.duckdb / realtime.duckdb            (Task 19)
  graph.py                             OSM -> data/graph/<zona>/{nodes,edges}.parquet          (Task 20)
  scripts/download_sources.py          (renombrado) refresh, cambios, OSM, AEMET, callejero    (Tasks 1–3)
  scripts/profile_sources.py           (renombrado; traduccion interna el sabado)
  scripts/verify_aemet.py probe_pyrosm.py                                      (Tasks 4, 8)
  tests/conftest.py test_shared_versions.py scripts/ data/ test_*.py
frontend/
  package.json  src/  public/fonts/    React + Vite                                            (Task 10, 23–25)
  Caddyfile  Dockerfile                Caddy sirve el front y hace de proxy a la API           (Tasks 5, 10)
config/
  README.md                            que decision rellena cada fichero                       (Task 1)
  ica_thresholds.yaml                  bandas ICA del BOE (verificadas)                        (Task 12)
  rules.yaml weights.yaml activities.yaml routing.yaml indicators.yaml          (DEC-05/06/07/07b/08/09)
deploy/
  docker-compose.yml                   servicios api y frontend (ingest el domingo)            (Task 5)
```

---

## Decisiones del equipo (no las toma el código)

Cada decisión se apunta en `CLAUDE.md` §11 y `docs/arquitectura.md` §10 y se vuelca en el fichero de `app/config/` indicado.

| ID | Decisión (arquitectura §10) | Propone | Decide | **Fecha límite** | Fichero | Si no se decide a tiempo |
|---|---|---|---|---|---|---|
| DEC-P04 | Aplicar correcciones de `PENDIENTES.md` P-04 al CLAUDE.md y `requisitos_fuentes.json` | Datos | Equipo | **mié 14, 18:00** | `CLAUDE.md`, JSON | Se sigue con `informe-datos.md` como referencia |
| DEC-10 | Nombre (D-10, A-03) | Equipo | Equipo | **jue 15, 10:00** | `CLAUDE.md` §1, `frontend/index.html` | Nombre provisional «GoMad» |
| DEC-05 | Regla de aire por perfil (D-05, A-05) | Motor (`umbrales.md` §1.5) | Equipo | **jue 15, 12:00** | `config/rules.yaml` → `air` | Bloquea `/recommend` real |
| DEC-07 | Pesos por defecto, velocidades y pesos de ruta (D-07, A-04, P-11) | Motor + Rutas | Equipo | **jue 15, 12:00** | `config/weights.yaml`, `config/routing.yaml` | Bloquea `/recommend` y `/route` reales |
| DEC-07b | Umbral de probabilidad de lluvia (umbrales.md §3) | Motor | Equipo | **jue 15, 12:00** | `config/rules.yaml` → `rain` | Regla de lluvia desactivada y aviso |
| DEC-08 | Tabla actividad → destino y catálogo (D-08, A-07) | Datos + Motor | Equipo | **jue 15, 12:00** | `config/activities.yaml` | Bloquea la construcción real de `destination` |
| DEC-11 | Usos de IA de §6.5 (D-11, A-09) | Equipo | Equipo | **jue 15, 20:00** | `CLAUDE.md` §11 | Solo F6 |
| DEC-12 | Desnivel IGN sí/no (D-12) | Rutas | Equipo | **jue 15, 20:00** | `CLAUDE.md` §11 | Fuera del MVP |
| DEC-03 | Proveedor de IA de F6 (D-03). ✅ Decidido el 15/10: OCI Language + diccionario RF-21 + plantillas, sin LLM (antes: punto de control OCI GenAI → plan B, descartado) | Motor | Motor (regla aprobada) | **jue 15, 12:00** | `app/.env` (`IA_*`, `OCI_*`) | — |
| DEC-06 | Umbrales de calor (D-06, A-06) — bloqueado por Tasks 4 y 7 | Motor | Equipo | **vie 16, 12:00** | `config/rules.yaml` → `heat` | Regla de calor desactivada; la app dice «sin umbral oficial de calor cargado» |
| DEC-09 | Indicadores de F5 (D-09, A-08) | Datos | Equipo | **vie 16, 12:00** | `config/indicators.yaml` | Bloquea `/municipality` real |
| DEC-A10 | Forma de la VM de OCI (A-10) | Motor | Motor | **mié 14, al crearla** | `docs/arquitectura.md` §6 | — |
| DEC-A11 | Tamaño del grafo regional y latencia en la capital (A-11) | Rutas | Rutas + equipo | **sáb 17, 14:00** | `docs/arquitectura.md` §4.4 | Solo Getafe (recorte n.º 2) |
| DEC-A02 | Detalle de cada pantalla (A-02) | Front | Front + maquetadora | Antes de maquetar cada una | `app/frontend/docs/pantallas.md` | — |

**Reunión de decisiones del jueves a las 11:00 (45 min):** DEC-05, DEC-07, DEC-07b, DEC-08. Lo que no tenga fuente oficial queda en el YAML con `own_criterion: true`.

---

## Calendario resumido

| Día | Datos | Motor | Rutas | Front (maquetadora) |
|---|---|---|---|---|
| **Mié 14** | T2 script (refresh, cambios, OSM, callejero) · T3 AEMET en el script · T4 verificar AEMET · DEC-P04 | **T1 estructura (primero)** · T5 Compose · T6 VM OCI · T7 plan de calor | T8 extracto OSM + pyrosm | T9 bocetos · T10 proyecto Vite |
| **Jue 15** | T16 `common` · T17 normalizadores de referencia · T18 aire y AEMET · T19 `build_db` | **T11 contrato (9:00–11:00)** · T12 `rules` · T13 `scoring` · T14 `slots` · T15 IA | T20 grafo de Getafe · T21 A\* y Dijkstra con límite · T22 latencia | T23 tipos + MSW · T24 Inicio · T25 Resultados |
| **Vie 16** | V-D1 servicios + indicadores · V-D2 `/location` · V-D3 patrón horario del aire | V-M1 `/recommend` · V-M2 explicaciones | V-R1 `/route` en Getafe | V-F1 mapa · V-F2 detalle · V-F3 ajustes · **V-F4 despliegue HTTPS** |
| **Sáb 17** | S-D1 `/sources` · S-D2 ingesta programada · S-D3 traducir `profile_sources.py` | S-M1 `/municipality` | S-R1 grafo regional · DEC-A11 | S-F1 ruta · S-F2 municipio |
| **Dom 18** | D-D1 servicio `ingest` en Compose + caché ante caídas + cron | D-M1 F6 | D-R1 ruta circular | D-F1 asistente · D-F2 fuentes · **D-X congelación 23:59** |
| **Lun 19** | L-1 ensayo · L-2 errores · L-3 guion · L-4 demo sin red · L-5 accesibilidad |||
| **Mar 20** | **Demo** |||

---

# MIÉRCOLES 14/10 — detalle completo

### Task 1: M-M1 · Dependencias por servicio, esqueleto de la API y renombrado a inglés

**Rol:** Motor · **Servicio:** `app/` (la tarea toca `api/` e `ingest/`; comandos desde `app/` salvo donde se indica `cd`) · **Duración:** 1,5 h · **Hacer primero.**

**Ficheros:**
- Crear: `api/pyproject.toml`, `api/main.py` (sin `__init__.py`: cada servicio es raíz de importación), `api/tests/conftest.py`, `api/tests/test_health.py`, `ingest/pyproject.toml`, `ingest/tests/conftest.py`, `ingest/tests/test_shared_versions.py`, `config/README.md`
- Renombrar: `ingest/scripts/descargar_fuentes.py` → `ingest/scripts/download_sources.py`; `ingest/scripts/perfilar_fuentes.py` → `ingest/scripts/profile_sources.py`
- Borrar: los `.gitkeep` de los directorios que reciben ficheros
- Modificar: `../CLAUDE.md` (§2.6, §3, §6.1, §6.4), `../docs/arquitectura.md` (§2, §3, §4, §6, §9b) con la estructura por servicios y la tabla de nombres

**Interfaces:**
- Produce: `main:app` (FastAPI, servicio `api`) con `GET /health → {"status": "ok"}`; fixture `root` (directorio del servicio) en cada `tests/conftest.py`; marcador `slow` en ambos servicios (se salta si falta `app/data/raw`).

- [ ] **Paso 1 [manual]: `pip` en el sistema** (los venvs `api/.venv` e `ingest/.venv` ya existen; falta `pip` en WSL): `sudo apt install -y python3-pip`. Comprobar: `api/.venv/bin/python -m pip --version`.

- [ ] **Paso 2: `api/pyproject.toml`**

```toml
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[project]
name = "gomad-api"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi==0.115.0",
  "uvicorn[standard]==0.30.6",
  "pydantic==2.9.2",
  "duckdb==1.1.1",            # misma version que ingest (test_shared_versions)
  "numpy==2.1.1",
  "pandas==2.2.3",
  "pyarrow==17.0.0",
  "shapely==2.0.6",
  "scipy==1.14.1",
  "python-igraph==0.11.6",
  "pyyaml==6.0.2",
  "httpx==0.27.2",
]

[project.optional-dependencies]
dev = ["pytest==8.3.3"]

[tool.setuptools]
packages = []   # el codigo se importa desde la raiz del servicio (pythonpath de pytest / PYTHONPATH en Docker)

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
markers = ["slow: necesita datos reales en app/data (se salta si faltan)"]
```

- [ ] **Paso 3: `ingest/pyproject.toml`**

```toml
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[project]
name = "gomad-ingest"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "duckdb==1.1.1",            # misma version que api (test_shared_versions)
  "numpy==2.1.1",
  "pandas==2.2.3",
  "pyarrow==17.0.0",
  "geopandas==1.0.1",
  "pyogrio==0.10.0",
  "shapely==2.0.6",
  "pyproj==3.7.0",
  "pyyaml==6.0.2",
]

[project.optional-dependencies]
routing = ["pyrosm==0.6.2"]
dev = ["pytest==8.3.3"]

[tool.setuptools]
packages = []

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
markers = ["slow: necesita datos reales en app/data (se salta si faltan)"]
```

> Si `pip` no resuelve alguna versión en Python 3.12, usar la menor que lo haga **en los dos servicios a la vez** si es compartida, y anotarlo en el commit. `pyrosm` va como extra porque puede no compilar en 3.12 (Task 8).

- [ ] **Paso 4: instalar**

```bash
(cd api && . .venv/bin/activate && pip install -U pip && pip install -e ".[dev]")
(cd ingest && . .venv/bin/activate && pip install -U pip && pip install -e ".[dev]")
api/.venv/bin/python -c "import fastapi, duckdb, igraph, scipy, pandas"
ingest/.venv/bin/python -c "import duckdb, geopandas, pyproj"
```
Esperado: sin errores ni salida.

- [ ] **Paso 5: pruebas que fallan**

`api/tests/conftest.py`:
```python
import pathlib

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1]      # app/api
DATA_DIR = ROOT.parent / "data"                          # app/data


@pytest.fixture
def root():
    return ROOT


def pytest_collection_modifyitems(config, items):
    # las pruebas "slow" necesitan app/data descargado; si no esta, se saltan
    if (DATA_DIR / "raw" / "municipios" / "municipios.geojson").exists():
        return
    skip = pytest.mark.skip(reason="faltan datos reales en app/data (ingest/scripts/download_sources.py)")
    for item in items:
        if "slow" in item.keywords:
            item.add_marker(skip)
```

`ingest/tests/conftest.py`: mismo contenido, con el comentario `# app/ingest` en `ROOT`.

`api/tests/test_health.py`:
```python
from fastapi.testclient import TestClient

from main import app


def test_health():
    r = TestClient(app).get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
```

`ingest/tests/test_shared_versions.py`:
```python
"""La ingesta escribe el .duckdb que lee la API: la version de DuckDB debe ser identica."""
import re


def pinned(pyproject_text, package):
    m = re.search(rf'"{package}==([^"]+)"', pyproject_text)
    return m.group(1) if m else None


def test_duckdb_version_matches_api(root):
    ingest = pinned((root / "pyproject.toml").read_text(encoding="utf-8"), "duckdb")
    api = pinned((root.parent / "api" / "pyproject.toml").read_text(encoding="utf-8"), "duckdb")
    assert ingest is not None and ingest == api
```

Run: `(cd api && .venv/bin/pytest -v)` → Esperado: FAIL (`ModuleNotFoundError: No module named 'main'`). `(cd ingest && .venv/bin/pytest -v)` → Esperado: PASS (las versiones ya coinciden).

- [ ] **Paso 6: `api/main.py` mínimo**

```python
"""API de GoMad. Sin estado: sin sesiones ni registro; la ubicacion nunca se escribe en los logs."""
from fastapi import FastAPI

app = FastAPI(title="GoMad API", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
```

`config/README.md`: una línea por fichero de `config/` (ver Mapa de ficheros) con la decisión que lo rellena, la regla «cada valor sin fuente oficial lleva `own_criterion: true`» y que se monta en solo lectura en `api` e `ingest`.

Run: `(cd api && .venv/bin/pytest -v)` → Esperado: PASS.

- [ ] **Paso 7: renombrar scripts y actualizar documentos**

```bash
git mv ingest/scripts/descargar_fuentes.py ingest/scripts/download_sources.py
git mv ingest/scripts/perfilar_fuentes.py ingest/scripts/profile_sources.py
grep -rl "descargar_fuentes\|perfilar_fuentes" ../CLAUDE.md ../docs/arquitectura.md ../docs/informe-datos.md ../docs/PENDIENTES.md ingest/scripts/ \
  | xargs sed -i 's/descargar_fuentes/download_sources/g; s/perfilar_fuentes/profile_sources/g'
(cd ingest && python3 scripts/download_sources.py --listar | head -3)   # flags aun en espanol hasta Task 2
find api ingest config -name .gitkeep -delete
```

En `../CLAUDE.md` §6.1 y `../docs/arquitectura.md` §2, §3, §4, §6 y §9b: sustituir los nombres según la tabla de «Restricciones globales», describir la estructura por servicios (sección «Estructura por servicios») y añadir «Nombres en inglés y un directorio por servicio desde el 14/10 (CLAUDE.md §2.1 y §3)». No tocar `docs/contexto-muevete-cerca.md` ni la idea (históricos).

- [ ] **Paso 8: commit**

```bash
git -C .. add -A app CLAUDE.md docs/arquitectura.md docs/informe-datos.md docs/PENDIENTES.md
git -C .. commit -m "Dependencias por servicio, esqueleto de la API y nombres de código en inglés"
```

**Terminado cuando:** ambos venvs instalan su `pyproject.toml`, `pytest` pasa en `api` y en `ingest`, y no queda referencia a `descargar_fuentes`/`perfilar_fuentes` en CLAUDE.md ni en `docs/arquitectura.md`.

---

### Task 2: M-D1 · Script de descarga: `refresh`, `--refresh`, `--force`, comprobación de cambios, OSM y callejero

**Rol:** Datos · **Servicio:** `app/ingest/` · **Depende de:** Task 1 · **Duración:** 2,5–3 h

**Ficheros:**
- Modificar: `scripts/download_sources.py` (traducción completa de identificadores y CLI + funcionalidad nueva)
- Crear: `tests/scripts/test_download_sources.py`
- Modificar: `../../CLAUDE.md` §3 (comandos de arranque) y §6.4 (estado «implementado»)

**Interfaces:**
- Produce:
  - `ROOT` (app/ingest), `APP_DIR` (app), `DATA_DIR` (`GOMAD_DATA_DIR` o `app/data`), `RAW_DIR = DATA_DIR / "raw"`
  - `Source = namedtuple("Source", "kind ident group heavy desc refresh")`
  - `REFRESH_LEVELS = ("reference", "weekly", "daily", "hourly", "on_demand")`
  - `select(args) -> list[str]`
  - `download_source(key: str, src: Source, previous: dict, force: bool, aemet_municipalities: str | None = None) -> dict` (entrada nueva del manifiesto con `changed: bool`)
  - `run(args) -> int`
  - CLI: `--list`, `--group {minimal,full}`, `--only`, `--refresh <level>`, `--include-heavy`, `--force`, `--aemet-municipalities`
  - `RAW_DIR/manifest.json[key]`: `kind`, `identifier`, `refresh`, `urls`, `downloaded`, `checked`, `files` (rutas relativas a `RAW_DIR`), `bytes`, `sha256`, `changed`, `modified` (CKAN), `etag`, `last_modified`, `last_failure {date, error}`. Las entradas antiguas con claves en español se sustituyen en la primera descarga.
- Los **ids de fuente** (`eiel_deporte`, `ay_bancos`…) y las carpetas `data/raw/<id>/` **no cambian**.

> **Nivel `weekly`:** la spec nombra 4 niveles, pero su tabla dice «OSM **semanal**». Se añade `weekly` para que el cron semanal (OSM + grafo) sea un nivel seleccionable.

**Traducción de identificadores existentes** (renombrar en todo el fichero):

| Antes | Después |
|---|---|
| `RAIZ` (app/ingest), `DESTINO` | `ROOT`, `RAW_DIR` (vía `APP_DIR` y `DATA_DIR`, ver paso 3) |
| `FUENTES` (tupla de 5) | `_SOURCES` (tupla de 6) → `SOURCES` (`Source`) |
| `pedir`, `guardar`, `nombre_desde_url`, `descomprimir_seguro` | `fetch`, `save`, `filename_from_url`, `safe_unzip` |
| `bajar_ckan`, `bajar_nomecalles` | `download_ckan`, `download_nomecalles` |
| grupos `minimo` / `completo` | `minimal` / `full` |
| variables locales (`carpeta`, `ruta`, `contenido`, `miembro`…) | `folder`, `path`, `content`, `member`… |

Los textos que imprime el script siguen en español con tildes; los comentarios, en español sin tildes.

**Asignación de niveles** (CLAUDE.md §6.4):

| Nivel | ids |
|---|---|
| `reference` | `eiel_deporte`, `eiel_parques`, `eiel_nucleos`, `eiel_sanitario`, `eiel_ensenanza`, `eiel_cultural`, `vpla_redes`, `sendas`, `vias_pecuarias`, `municipios`, `zonas_aire`, `areas_recreativas`, `cubierta_terrestre`, `viales`, `padron`, `densidad`, `renta`, `zonas_bano`, `educativos`, `aire_estaciones`, `estaciones_aire_idem`, `ay_aire_estaciones`, `aire_historico`, `aire_zonas`¹, `callejero` |
| `daily` | `sanitarios`, `farmacias`, `desfibriladores`, `atencion_social`, todos los `nmc_*`, `ay_polideportivos`, `ay_idb`, `ay_piscinas`, `ay_parques`, `ay_fuentes`, `ay_bancos`, `ay_areas_caninas` |
| `weekly` | `osm` |
| `hourly` | `aire_dia`, `ay_aire`, `ay_meteo`, `aemet` (Task 3) |
| `on_demand` | `ay_trafico` |

¹ `aire_zonas` (CKAN, municipio → zona) no aparece en la tabla de §6.4; es de referencia como `zonas_aire`. Anotarlo en CLAUDE.md §6.4.

- [ ] **Paso 1: pruebas que fallan** — `tests/scripts/test_download_sources.py`

```python
"""Pruebas del descargador. No tocan la red: se sustituye fetch."""
import argparse
import importlib.util
import json
import pathlib

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[2]      # app/ingest


@pytest.fixture
def dl(tmp_path, monkeypatch):
    spec = importlib.util.spec_from_file_location("download_sources", ROOT / "scripts" / "download_sources.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    monkeypatch.setattr(mod, "RAW_DIR", tmp_path / "raw")
    monkeypatch.setattr(mod, "APP_DIR", tmp_path)
    return mod


def args(**kw):
    base = dict(list=False, group="minimal", only=None, include_heavy=False, refresh=None, force=False,
                aemet_municipalities=None)
    base.update(kw)
    return argparse.Namespace(**base)


def test_every_source_has_level(dl):
    for key, src in dl.SOURCES.items():
        assert src.refresh in dl.REFRESH_LEVELS, key


def test_select_hourly_level(dl):
    assert set(dl.select(args(refresh="hourly"))) == {"aire_dia", "ay_aire", "ay_meteo", "aemet"}


def test_select_level_excludes_heavy_unless_flag(dl):
    assert "osm" not in dl.select(args(refresh="weekly"))
    assert dl.select(args(refresh="weekly", include_heavy=True)) == ["osm"]


def test_osm_and_street_directory_registered(dl):
    assert dl.SOURCES["osm"].ident == "https://download.geofabrik.de/europe/spain/madrid-latest.osm.pbf"
    assert dl.SOURCES["callejero"].ident == "callejero_completo_2025"
    assert dl.SOURCES["callejero"].kind == "nmc"


def test_unchanged_ckan_is_not_downloaded(dl, monkeypatch):
    calls = []
    monkeypatch.setattr(dl, "ckan_modified", lambda base, ident: "2026-10-01T10:00:00")
    monkeypatch.setattr(dl, "fetch", lambda *a, **k: calls.append(a) or b"x")
    previous = {"modified": "2026-10-01T10:00:00", "sha256": "abc", "files": []}
    entry = dl.download_source("padron", dl.SOURCES["padron"], previous, force=False)
    assert entry["changed"] is False
    assert calls == []


def test_force_skips_change_check(dl, monkeypatch):
    monkeypatch.setattr(dl, "ckan_modified", lambda base, ident: "2026-10-01T10:00:00")
    monkeypatch.setattr(dl, "download_ckan", lambda base, ident, folder, heavy: (
        [dl.save(folder, "a.csv", b"1;2")], ["https://x/a.csv"], "2026-10-01T10:00:00"))
    previous = {"modified": "2026-10-01T10:00:00", "sha256": "abc", "files": []}
    entry = dl.download_source("padron", dl.SOURCES["padron"], previous, force=True)
    assert entry["changed"] is True


def test_same_content_is_not_a_change(dl, monkeypatch):
    monkeypatch.setattr(dl, "fetch_conditional", lambda url, previous, timeout=300: (b"<xml/>", {}))
    e1 = dl.download_source("ay_trafico", dl.SOURCES["ay_trafico"], {}, force=False)
    e2 = dl.download_source("ay_trafico", dl.SOURCES["ay_trafico"], e1, force=False)
    assert e1["changed"] is True and e2["changed"] is False
    assert e1["files"] == ["ay_trafico/pm.xml"]                  # relativas a RAW_DIR


def test_304_is_not_downloaded(dl, monkeypatch):
    monkeypatch.setattr(dl, "fetch_conditional", lambda url, previous, timeout=300: (None, {}))
    previous = {"etag": '"v1"', "sha256": "abc", "files": ["osm/madrid-latest.osm.pbf"]}
    entry = dl.download_source("osm", dl.SOURCES["osm"], previous, force=False)
    assert entry["changed"] is False and entry["etag"] == '"v1"'


def test_failure_keeps_manifest(dl, monkeypatch):
    dl.RAW_DIR.mkdir(parents=True)
    (dl.RAW_DIR / "manifest.json").write_text(json.dumps({"aire_dia": {"sha256": "old"}}), encoding="utf-8")

    def broken(*a, **k):
        raise OSError("portal caído")

    monkeypatch.setattr(dl, "download_ckan", broken)
    monkeypatch.setattr(dl, "ckan_modified", lambda *a: None)
    rc = dl.run(args(only="aire_dia"))
    manifest = json.loads((dl.RAW_DIR / "manifest.json").read_text(encoding="utf-8"))
    assert rc == 1
    assert manifest["aire_dia"]["sha256"] == "old"
    assert "error" in manifest["aire_dia"]["last_failure"]
```

Run: `.venv/bin/pytest tests/scripts/test_download_sources.py -v` → Esperado: FAIL (`AttributeError: … 'REFRESH_LEVELS'` o similar).

- [ ] **Paso 2: traducir los identificadores existentes** según la tabla (sin cambiar comportamiento). Comprobar: `python3 scripts/download_sources.py --listar` sigue funcionando.

- [ ] **Paso 3: rutas, cabecera y tipos** (sustituyen a `ROOT`/`RAW_DIR` del paso 2; tras `import zipfile`):

```python
import hashlib
import os
import time
import urllib.error
from collections import namedtuple

ROOT = pathlib.Path(__file__).resolve().parent.parent       # app/ingest
APP_DIR = ROOT.parent                                        # app (donde esta .env)
DATA_DIR = pathlib.Path(os.environ.get("GOMAD_DATA_DIR", APP_DIR / "data"))   # volumen compartido
RAW_DIR = DATA_DIR / "raw"

Source = namedtuple("Source", "kind ident group heavy desc refresh")
REFRESH_LEVELS = ("reference", "weekly", "daily", "hourly", "on_demand")
GEOFABRIK_MADRID = "https://download.geofabrik.de/europe/spain/madrid-latest.osm.pbf"
```

- [ ] **Paso 4: `_SOURCES`** — añadir **como sexto elemento** de cada tupla el nivel de la tabla, cambiar `"minimo"`/`"completo"` por `"minimal"`/`"full"` y, al final, las fuentes nuevas:

```python
    # --- Nuevas (14/10) ---
    "osm":       ("url", GEOFABRIK_MADRID, "full", True,
                  "Extracto OSM de la Comunidad de Madrid (Geofabrik, ODbL): red peatonal y mobiliario", "weekly"),
    "callejero": ("nmc", "callejero_completo_2025", "full", True,
                  "Callejero completo 2025: 855.909 portales con coordenadas (geocodificación RF-01, D-04)", "reference"),
    "aemet":     ("aemet", "prediccion/especifica/municipio/horaria", "minimal", False,
                  "AEMET: predicción horaria por municipio (clave en .env)", "hourly"),
}
SOURCES = {key: Source(*value) for key, value in _SOURCES.items()}
```

Comentario de cabecera del bloque: `# id: (kind, identificador, grupo, pesada, descripcion, refresh)`. Corregir la descripción de `nmc_parques` a «Parques y jardines (845 filas, 62 municipios)». Hasta Task 3:

```python
def download_aemet(folder, municipalities):
    raise NotImplementedError("AEMET se añade en Task 3")
```

- [ ] **Paso 5: peticiones condicionales, huella y metadatos de CKAN** (debajo de `fetch`):

```python
def fetch_conditional(url, previous, timeout=300):
    """GET con If-None-Match / If-Modified-Since. Devuelve (None, cabeceras) si el servidor responde 304."""
    headers = dict(UA)
    if previous.get("etag"):
        headers["If-None-Match"] = previous["etag"]
    if previous.get("last_modified"):
        headers["If-Modified-Since"] = previous["last_modified"]
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read(), {"etag": r.headers.get("ETag"), "last_modified": r.headers.get("Last-Modified")}
    except urllib.error.HTTPError as e:
        if e.code == 304:
            return None, {}
        raise


def file_hash(paths):
    h = hashlib.sha256()
    for p in sorted(paths):
        with open(p, "rb") as f:
            for block in iter(lambda: f.read(1 << 20), b""):
                h.update(block)
    return h.hexdigest()


def ckan_modified(base, ident):
    meta = json.loads(fetch(f"{base}/package_show?id={urllib.parse.quote(ident)}"))["result"]
    return meta.get("metadata_modified")
```

`download_ckan` devuelve también `metadata_modified` como tercer valor:

```python
    return ([save(folder, filename_from_url(r["url"]), fetch(r["url"])) for r in chosen],
            [r["url"] for r in chosen], meta.get("metadata_modified"))
```

- [ ] **Paso 6: selección y descarga de una fuente**

```python
def select(args):
    if args.only:
        return [x.strip() for x in args.only.split(",") if x.strip()]
    if args.refresh:
        keys = [k for k, s in SOURCES.items() if s.refresh == args.refresh]
    else:
        keys = [k for k, s in SOURCES.items() if args.group == "full" or s.group == "minimal"]
    return [k for k in keys if args.include_heavy or not SOURCES[k].heavy]


def now():
    return dt.datetime.now().isoformat(timespec="seconds")


def download_source(key, src, previous, force, aemet_municipalities=None):
    """Descarga una fuente si ha cambiado. Devuelve la entrada nueva del manifiesto."""
    folder = RAW_DIR / key
    unchanged = {**previous, "refresh": src.refresh, "checked": now(), "changed": False}
    extra = {}
    # CKAN de referencia/diario: metadata_modified (las horarias cambian el recurso sin tocar el paquete)
    if src.kind in ("ckan_cm", "ckan_ay") and src.refresh in ("reference", "daily") and not force:
        base = CKAN_CM if src.kind == "ckan_cm" else CKAN_AY
        modified = ckan_modified(base, src.ident)
        if modified and modified == previous.get("modified"):
            return unchanged
    if src.kind == "wfs":
        content, extra = fetch_conditional(WFS + src.ident, {} if force else previous, timeout=900)
        if content is None:
            return unchanged
        paths, urls = [save(folder, f"{key}.geojson", content)], [WFS + src.ident]
    elif src.kind == "nmc":
        paths, urls = download_nomecalles(src.ident, folder)
    elif src.kind in ("ckan_cm", "ckan_ay"):
        base = CKAN_CM if src.kind == "ckan_cm" else CKAN_AY
        paths, urls, modified = download_ckan(base, src.ident, folder, src.heavy)
        extra = {"modified": modified}
    elif src.kind == "aemet":
        paths, urls = download_aemet(folder, aemet_municipalities)
    else:
        content, extra = fetch_conditional(src.ident, {} if force else previous)
        if content is None:
            return unchanged
        paths, urls = [save(folder, filename_from_url(src.ident), content)], [src.ident]
    digest = file_hash(paths)
    return {"kind": src.kind, "identifier": src.ident, "refresh": src.refresh, "urls": urls,
            "downloaded": now(), "checked": now(),
            "files": [str(p.relative_to(RAW_DIR)) for p in paths],
            "bytes": sum(p.stat().st_size for p in paths), "sha256": digest,
            "changed": force or digest != previous.get("sha256"),
            **{k: v for k, v in extra.items() if v}}
```

> `download_ckan(..., src.heavy)`: hoy el script decide con `--incluir-pesadas` si baja todos los CSV de un paquete; solo `aire_historico` tiene varios y es pesado, así que `src.heavy` equivale.

- [ ] **Paso 7: `run` y `main`** (un fallo **no** borra la entrada anterior; manifiesto escrito de forma atómica):

```python
def run(args):
    if args.list:
        for key, s in SOURCES.items():
            print(f"{key:22} {s.group:8} {s.refresh:10} {'PESADA ' if s.heavy else '       '}{s.kind:8} {s.desc}")
        return 0
    keys = select(args)
    unknown = [k for k in keys if k not in SOURCES]
    if unknown:
        print("ids desconocidos:", ", ".join(unknown), file=sys.stderr)
        return 2
    manifest_path = RAW_DIR / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    failures = 0
    for key in keys:
        src = SOURCES[key]
        print(f"-> {key} [{src.refresh}]: {src.desc}", flush=True)
        previous = manifest.get(key, {})
        try:
            manifest[key] = download_source(key, src, previous, args.force, args.aemet_municipalities)
            state = "cambiado" if manifest[key]["changed"] else "sin cambios"
            print(f"   ok, {state} ({manifest[key].get('bytes', 0) / 1e6:.1f} MB)")
        except Exception as e:  # una fuente caida no debe parar el resto (RNF-08)
            failures += 1
            manifest[key] = {**previous, "last_failure": {"date": now(), "error": str(e)[:300]}}
            print(f"   ERROR: {e}", file=sys.stderr)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    tmp = manifest_path.with_suffix(".tmp")
    tmp.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, manifest_path)
    print(f"\nHecho: {len(keys) - failures} correctas, {failures} con error. Manifiesto: {manifest_path}")
    return 1 if failures else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--list", action="store_true", help="muestra las fuentes y sale")
    ap.add_argument("--group", choices=["minimal", "full"], default="minimal")
    ap.add_argument("--only", help="ids separados por comas (ignora --group y --refresh)")
    ap.add_argument("--refresh", choices=REFRESH_LEVELS, help="solo las fuentes de ese nivel de recarga (CLAUDE.md §6.4)")
    ap.add_argument("--include-heavy", action="store_true", help="incluye capas grandes y todos los CSV históricos")
    ap.add_argument("--force", action="store_true", help="descarga aunque la fuente no haya cambiado")
    ap.add_argument("--aemet-municipalities", help="códigos INE separados por comas o 'todos' (por defecto, AEMET_MUNICIPALITIES de .env)")
    return run(ap.parse_args())
```

Actualizar el docstring del módulo (en español sin tildes) con los usos nuevos.

- [ ] **Paso 8: comprobar la URL de Geofabrik**

```bash
curl -sI https://download.geofabrik.de/europe/spain/madrid-latest.osm.pbf | grep -iE '^(HTTP|content-length|etag|last-modified)'
```
Esperado: `HTTP/2 200` (o 302 a un espejo) y `Last-Modified` o `ETag`. Si da 404, copiar el enlace real del `.osm.pbf` de https://download.geofabrik.de/europe/spain/madrid.html y actualizar `GEOFABRIK_MADRID` y `test_osm_and_street_directory_registered`.

- [ ] **Paso 9: pruebas en verde** — Run: `.venv/bin/pytest tests/scripts/test_download_sources.py -v` → Esperado: 9 PASS.

- [ ] **Paso 10: prueba real contra los portales**

```bash
python3 scripts/download_sources.py --list | head -5
python3 scripts/download_sources.py --refresh reference          # 1.ª vez: descarga y apunta modified/sha256
python3 scripts/download_sources.py --refresh reference          # 2.ª vez: casi todo «sin cambios»
python3 scripts/download_sources.py --only osm,callejero --include-heavy
python3 scripts/download_sources.py --only osm                   # 2.ª vez: «sin cambios» por 304 o sha256
python3 -c "import json;m=json.load(open('../data/raw/manifest.json'));print({k:(v.get('refresh'),v.get('changed')) for k,v in m.items()})"
```
Esperado: en la segunda pasada, las CKAN salen «sin cambios» **sin descargar** y las WFS «sin cambios» por sha256 o 304. Existen `../data/raw/osm/madrid-latest.osm.pbf` y `../data/raw/callejero/`.

- [ ] **Paso 11: documentar y commit.** En `../../CLAUDE.md` §3, sustituir los comandos de arranque por:
```bash
cd app/ingest && . .venv/bin/activate
python3 scripts/download_sources.py --list
python3 scripts/download_sources.py --group full
python3 scripts/download_sources.py --refresh reference --include-heavy   # mensual
python3 scripts/download_sources.py --refresh daily                       # 04:00
python3 scripts/download_sources.py --refresh hourly                      # cada hora
python3 scripts/download_sources.py --refresh weekly --include-heavy      # OSM (y despues el grafo)
cp ../.env.example ../.env                                                # y poner la clave de AEMET
```
En §6.4: «Implementado el 14/10 (`refresh`, `--refresh`, comprobación de cambios por `metadata_modified` / `ETag`-`Last-Modified` / sha256); nivel extra `weekly` para OSM; `aire_zonas` en `reference`».

```bash
git -C ../.. add app/ingest/scripts/download_sources.py app/ingest/tests/scripts CLAUDE.md
git -C ../.. commit -m "Descarga por niveles de recarga, comprobación de cambios, OSM y callejero"
```

**Terminado cuando:** las 9 pruebas pasan; la segunda ejecución de `--refresh reference` no vuelve a descargar los CSV de CKAN; `osm` y `callejero` están en `app/data/raw/` y en el manifiesto con `refresh`, `sha256` y `changed`; un fallo no borra la entrada anterior.

---

### Task 3: M-D2 · AEMET en el script de descarga

**Rol:** Datos · **Servicio:** `app/ingest/` · **Depende de:** Task 2 · **Duración:** 1 h

**Ficheros:**
- Modificar: `scripts/download_sources.py` (`read_env`, `aemet_municipalities`, `download_aemet`; `fetch` admite cabeceras)
- Modificar: `../.env.example`, `tests/scripts/test_download_sources.py`

**Interfaces:**
- Produce: `read_env(path=None) -> dict[str, str]` (por defecto `APP_DIR / ".env"`); `aemet_municipalities(value: str | None) -> list[str]`; `download_aemet(folder, municipalities: str | None) -> (list[Path], list[str])`; ficheros `data/raw/aemet/<ine>.json` (documento `datos`, bytes tal cual) y `data/raw/aemet/<ine>.meta.json` (primer nivel, sin la clave).
- La clave va en la **cabecera `api_key`**, no en la URL, para que nunca acabe en `manifest.json` ni en logs. (Task 4 comprueba que AEMET la acepta; si no, se usa `?api_key=` y se **quita** de las URLs antes de guardarlas.)

- [ ] **Paso 1: pruebas que fallan** (añadir a `tests/scripts/test_download_sources.py`)

```python
def test_aemet_without_key_gives_clear_error(dl, monkeypatch):
    monkeypatch.setattr(dl, "read_env", lambda path=None: {})
    with pytest.raises(RuntimeError, match="AEMET_API_KEY"):
        dl.download_aemet(dl.RAW_DIR / "aemet", "28065")


def test_aemet_key_not_in_urls_or_files(dl, monkeypatch):
    key = "SECRET-KEY-123"
    monkeypatch.setattr(dl, "read_env", lambda path=None: {"AEMET_API_KEY": key, "AEMET_PAUSE_S": "0"})
    seen = []

    def fake_fetch(url, timeout=300, headers=None):
        seen.append((url, headers))
        if "opendata/api/prediccion" in url:
            return json.dumps({"estado": 200, "datos": "https://opendata.aemet.es/opendata/sh/abc"}).encode()
        return b'[{"nombre": "Getafe", "prediccion": {"dia": []}}]'

    monkeypatch.setattr(dl, "fetch", fake_fetch)
    paths, urls = dl.download_aemet(dl.RAW_DIR / "aemet", "28065")
    assert all(key not in u for u in urls)
    assert all(key not in p.read_text(encoding="latin-1") for p in paths)
    assert seen[0][1]["api_key"] == key and key not in seen[0][0]


def test_aemet_status_429_is_error(dl, monkeypatch):
    monkeypatch.setattr(dl, "read_env", lambda path=None: {"AEMET_API_KEY": "k", "AEMET_PAUSE_S": "0"})
    monkeypatch.setattr(dl, "fetch", lambda url, timeout=300, headers=None: json.dumps(
        {"estado": 429, "descripcion": "Límite de peticiones"}).encode())
    with pytest.raises(RuntimeError, match="429"):
        dl.download_aemet(dl.RAW_DIR / "aemet", "28065")


def test_aemet_all_reads_179_municipalities(dl):
    folder = dl.RAW_DIR / "municipios"
    folder.mkdir(parents=True)
    feats = [{"type": "Feature", "properties": {"CDMUNICIPIO": f"{i:03d}"}, "geometry": None} for i in range(1, 180)]
    (folder / "municipios.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}))
    assert len(dl.aemet_municipalities("todos")) == 179
    assert dl.aemet_municipalities("28065,28079") == ["28065", "28079"]


def test_read_env_reads_app_env(dl):
    (dl.APP_DIR / ".env").write_text("AEMET_API_KEY=abc\n# comentario\n", encoding="utf-8")
    assert dl.read_env()["AEMET_API_KEY"] == "abc"
```

Run: `.venv/bin/pytest tests/scripts/test_download_sources.py -k "aemet or env" -v` → Esperado: FAIL (`no attribute 'read_env'`).

- [ ] **Paso 2: implementar**

`fetch` con cabeceras opcionales:

```python
def fetch(url, timeout=300, headers=None):
    req = urllib.request.Request(url, headers={**UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()
```

```python
AEMET_URL = "https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/horaria/"


def read_env(path=None):
    """Lee app/.env (CLAVE=valor por linea) sin dependencias. Las variables de entorno reales mandan."""
    path = pathlib.Path(path or (APP_DIR / ".env"))
    values = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                values[k.strip()] = v.strip().strip('"').strip("'")
    values.update({k: v for k, v in os.environ.items() if k.startswith("AEMET_")})
    return values


def aemet_municipalities(value):
    if value and value != "todos":
        return [c.strip() for c in value.split(",") if c.strip()]
    geo = json.loads((RAW_DIR / "municipios" / "municipios.geojson").read_text(encoding="utf-8"))
    return sorted("28" + str(f["properties"]["CDMUNICIPIO"]).zfill(3) for f in geo["features"])


def download_aemet(folder, municipalities):
    env = read_env()
    key = env.get("AEMET_API_KEY")
    if not key:
        raise RuntimeError("Falta AEMET_API_KEY en app/.env (ver app/.env.example)")
    pause = float(env.get("AEMET_PAUSE_S", "1.5"))
    codes = aemet_municipalities(municipalities or env.get("AEMET_MUNICIPALITIES", "todos"))
    paths, urls = [], []
    for code in codes:
        first = json.loads(fetch(AEMET_URL + code, timeout=60, headers={"api_key": key}))
        if first.get("estado") != 200:
            raise RuntimeError(f"AEMET {code}: estado {first.get('estado')} {first.get('descripcion', '')}")
        paths.append(save(folder, f"{code}.json", fetch(first["datos"], timeout=60)))
        meta = {k: v for k, v in first.items() if k != "api_key"}
        paths.append(save(folder, f"{code}.meta.json", json.dumps(meta, ensure_ascii=False).encode("utf-8")))
        urls.append(AEMET_URL + code)
        time.sleep(pause)
    return paths, urls
```

> `estado`, `datos`, `descripcion` son claves de la respuesta de AEMET (CLAUDE.md §7.1), no identificadores nuestros. Si un municipio falla, `download_aemet` lanza y `run` conserva la entrada anterior.

`../.env.example`, debajo de `AEMET_API_KEY=`:
```
# Municipios a pedir cada hora: 'todos' (179) o codigos INE separados por comas. Ajustar a la cuota real (Task 4).
AEMET_MUNICIPALITIES=todos
# Pausa entre municipios, en segundos (cada municipio son 2 peticiones)
AEMET_PAUSE_S=1.5
```

- [ ] **Paso 3:** Run: `.venv/bin/pytest tests/scripts/test_download_sources.py -v` → Esperado: 14 PASS.
- [ ] **Paso 4: commit** — `git -C ../.. add app/ingest/scripts/download_sources.py app/ingest/tests/scripts app/.env.example && git -C ../.. commit -m "AEMET: previsión horaria por municipio con la clave en cabecera"`

**Terminado cuando:** las pruebas pasan, incluida la de que la clave no aparece en URLs ni ficheros.

---

### Task 4: M-D3 · Verificar la API de AEMET con la clave del equipo (P-01)

**Rol:** Datos · **Servicio:** `app/ingest/` · **Depende de:** Task 3 · **Duración:** 45 min · El paso 1 es **[manual]**.

**Ficheros:**
- Crear: `scripts/verify_aemet.py`, `tests/data/aemet_28065.json` (muestra real **sin clave**)
- Modificar: `../../CLAUDE.md` §7.1, `../../docs/assets/umbrales.md` §3, `../../docs/PENDIENTES.md` (P-01 ✅)

- [ ] **Paso 1 [manual]:** `cp ../.env.example ../.env` y pegar la clave en `AEMET_API_KEY` (la persona; la clave no se pega en el chat). Comprobar: `git check-ignore ../.env` → imprime la ruta.

- [ ] **Paso 2: `scripts/verify_aemet.py`**

```python
#!/usr/bin/env python3
"""Comprueba la API de AEMET con la clave de app/.env y resume el esquema real.

Uso: python3 scripts/verify_aemet.py 28065 28079
Guarda las respuestas en app/data/raw/aemet_verificacion/ (no se versiona) e imprime las claves
de cada dia, los periodos de cada campo, las cabeceras de cuota y la codificacion.
"""
import importlib.util
import json
import pathlib
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent      # app/ingest
spec = importlib.util.spec_from_file_location("dl", ROOT / "scripts" / "download_sources.py")
dl = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dl)


def fetch_with_headers(url, headers):
    req = urllib.request.Request(url, headers={**dl.UA, **headers})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read(), dict(r.headers)


def main(codes):
    key = dl.read_env().get("AEMET_API_KEY")
    if not key:
        sys.exit("Falta AEMET_API_KEY en app/.env")
    out_dir = dl.RAW_DIR / "aemet_verificacion"
    out_dir.mkdir(parents=True, exist_ok=True)
    for code in codes:
        body, headers = fetch_with_headers(dl.AEMET_URL + code, {"api_key": key})
        first = json.loads(body)
        print(f"\n== {code}: estado {first.get('estado')} · {first.get('descripcion')}")
        print("   cabeceras de cuota:", {k: v for k, v in headers.items() if "request" in k.lower() or "limit" in k.lower()})
        data, headers2 = fetch_with_headers(first["datos"], {})
        print("   Content-Type de datos:", headers2.get("Content-Type"))
        try:
            text = data.decode("utf-8")
            print("   codificación: utf-8")
        except UnicodeDecodeError:
            text = data.decode("latin-1")
            print("   codificación: NO es utf-8 (leído como latin-1)")
        (out_dir / f"{code}.json").write_text(text, encoding="utf-8")
        doc = json.loads(text)
        doc = doc[0] if isinstance(doc, list) else doc
        print("   claves raíz:", sorted(doc))
        print("   elaborado:", doc.get("elaborado"))
        days = doc["prediccion"]["dia"]
        print("   días:", [d.get("fecha") for d in days])
        for field, value in days[0].items():
            if isinstance(value, list) and value and isinstance(value[0], dict):
                print(f"   {field}: {len(value)} elementos; claves {sorted(value[0])}; ejemplo {value[0]}")
            else:
                print(f"   {field}: {value!r}"[:160])


if __name__ == "__main__":
    main(sys.argv[1:] or ["28065", "28079"])
```

- [ ] **Paso 3:** Run: `python3 scripts/verify_aemet.py 28065 28079 28131` → Esperado: `estado 200` en los tres. **Apuntar** para CLAUDE.md §7.1 y Task 18: (1) si acepta la clave en cabecera (si `401`, pasar a `?api_key=` en Task 3 quitándola de `urls`); (2) codificación; (3) claves reales de cada día (esperadas: `temperatura`, `sensTermica`, `precipitacion`, `probPrecipitacion`, `estadoCielo`, `humedadRelativa`, `vientoAndRachaMax`, `orto`, `ocaso`, `fecha`); (4) formato de `periodo` (hora `"07"` o franja `"0208"`) y valores no numéricos (`"Ip"`); (5) días y horas que cubre; (6) cabeceras de cuota → ajustar `AEMET_MUNICIPALITIES` y `AEMET_PAUSE_S`; si 179 × 2 peticiones/hora no caben, **proponer** al equipo pedir solo los municipios consultados recientemente (no implementarlo sin preguntar).

- [ ] **Paso 4:** copiar `../data/raw/aemet_verificacion/28065.json` a `tests/data/aemet_28065.json` y comprobar que no lleva la clave: `grep -c "$(grep AEMET_API_KEY ../.env | cut -d= -f2)" tests/data/aemet_28065.json` → Esperado: `0`.

- [ ] **Paso 5:** Run: `python3 scripts/download_sources.py --only aemet --aemet-municipalities 28065,28079` → Esperado: `ok, cambiado`. Después `grep -c "$(grep AEMET_API_KEY ../.env | cut -d= -f2)" ../data/raw/manifest.json` → `0`.

- [ ] **Paso 6: documentar y commit.** CLAUDE.md §7.1 (fila AEMET: «comprobado 14/10» + lo apuntado), `docs/PENDIENTES.md` P-01 → ✅.

```bash
git -C ../.. add app/ingest/scripts/verify_aemet.py app/ingest/tests/data/aemet_28065.json CLAUDE.md docs/PENDIENTES.md
git -C ../.. commit -m "AEMET verificado con la clave del equipo: esquema real y muestra para pruebas"
```

**Terminado cuando:** hay muestra real de Getafe en `tests/data/`, el CLAUDE.md documenta el esquema y la cuota comprobados, y la clave no aparece en ningún fichero versionado ni en el manifiesto.

---

### Task 5: M-M2 · Docker Compose básico (api + frontend)

**Rol:** Motor · **Servicio:** `app/` (toca `api/`, `frontend/` y `deploy/`) · **Depende de:** Task 1 · **Duración:** 1 h · El paso 1 es **[manual]**.

**Ficheros:** Crear `api/Dockerfile`, `api/.dockerignore`, `frontend/Dockerfile` (provisional; Task 10 lo convierte en multi-stage), `frontend/Caddyfile`, `deploy/docker-compose.yml`.

> El servicio `ingest` se añade al Compose el domingo (D-D1), con su `Dockerfile` y el cron.

- [ ] **Paso 1 [manual]:** instalar Docker (Engine en WSL o integración WSL de Docker Desktop). Comprobar: `docker compose version`.

- [ ] **Paso 2: `api/Dockerfile`**

```dockerfile
FROM python:3.12-slim
WORKDIR /srv/api
COPY pyproject.toml ./
RUN pip install --no-cache-dir .
COPY . .
# datos y configuracion compartidos llegan por volumen (docker-compose.yml)
ENV PYTHONPATH=/srv/api PYTHONUNBUFFERED=1 GOMAD_DATA_DIR=/data GOMAD_CONFIG_DIR=/config
EXPOSE 8000
# --no-access-log: el log de acceso escribiria la URL completa (GET /location?text=... = direccion del usuario)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
```

`api/.dockerignore`: `.venv/`, `__pycache__/`, `tests/`, `scripts/`.

- [ ] **Paso 3: `frontend/Caddyfile`**

```
# DOMAIN llega de app/deploy/.env via Compose: ":80" sirve solo HTTP (local); con el dominio real
# Caddy saca el certificado de Let's Encrypt. {$DOMAIN::80} es red de seguridad si se arranca sin Compose
{
	# el log de errores (p. ej. 502 mientras arranca la api) incluye la peticion:
	# se quitan la consulta de la URL, las IP y las cabeceras (Referer) para no guardar ubicaciones
	log default {
		format filter {
			wrap json
			fields {
				request>uri regexp \?.* ?[redacted]
				request>remote_ip delete
				request>client_ip delete
				request>remote_port delete
				request>headers delete
			}
		}
	}
}

{$DOMAIN::80} {
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
	# sin log de acceso: no guardar URLs con ubicacion
	log {
		output discard
	}
}
```

`frontend/Dockerfile` (provisional hasta Task 10):

```dockerfile
FROM caddy:2.8.4
COPY Caddyfile /etc/caddy/Caddyfile
COPY dist /srv/web
```

- [ ] **Paso 4: `deploy/docker-compose.yml`**

```yaml
services:
  api:
    build: ../api
    env_file: ../.env
    volumes:
      - ../data:/data:ro
      - ../config:/config:ro
    restart: unless-stopped
  frontend:
    build: ../frontend
    ports:
      - "80:80"
      - "443:443"
    # solo DOMAIN, interpolado desde app/deploy/.env (sin claves): Caddy es el contenedor expuesto
    # y no debe recibir las de app/.env. Sin definir o vacio, compose no arranca
    environment:
      DOMAIN: ${DOMAIN:?Falta DOMAIN en app/deploy/.env (":80" en local, el dominio en la VM)}
    volumes:
      - caddy_data:/data
    depends_on:
      - api
    restart: unless-stopped
volumes:
  caddy_data:
```

`deploy/.env.example` (versionado; el `deploy/.env` real no se sube). Compose lo lee solo para interpolar: el contenedor de Caddy, expuesto a Internet, recibe **solo** `DOMAIN`, nunca las claves de `app/.env` (que solo recibe la api):

```
# Copiar a app/deploy/.env. Compose lo lee solo para interpolar docker-compose.yml. Solo DOMAIN, sin claves
# (las claves van en app/.env, que solo recibe la api).
# En local: ":80", solo HTTP. En la VM: el dominio real (p. ej. gomad.example.org) y Caddy saca el
# certificado de Let's Encrypt. Vacio o sin definir, compose se niega a arrancar.
DOMAIN=:80
```

- [ ] **Paso 5: probar**

```bash
mkdir -p frontend/dist && echo '<!doctype html><title>GoMad</title><p>GoMad</p>' > frontend/dist/index.html
touch .env && cp deploy/.env.example deploy/.env                  # .env si aun no existe (Task 4 lo rellena); DOMAIN=:80
docker compose -f deploy/docker-compose.yml up -d --build
curl -s localhost/api/health                                      # {"status":"ok"}
curl -s localhost/ | grep GoMad
docker compose -f deploy/docker-compose.yml exec api ls -a /srv/api      # no aparece .env ni .venv
docker compose -f deploy/docker-compose.yml exec -T frontend env | cut -d= -f1   # DOMAIN, sin AEMET_API_KEY, IA_* ni ORACLE_*
docker compose -f deploy/docker-compose.yml down
```
Esperado: lo indicado en los comentarios. `frontend/dist/` no se sube (`dist/` en `.gitignore`).

- [ ] **Paso 6: commit** — `git -C .. add app/api/Dockerfile app/api/.dockerignore app/frontend/Dockerfile app/frontend/Caddyfile app/deploy && git -C .. commit -m "Docker Compose básico: servicios api y frontend"`

**Terminado cuando:** `docker compose up` sirve `/api/health` y la página estática en local, y la imagen de la API no contiene `.env` ni `.venv`.

---

### Task 6: M-M3 · VM de OCI (DEC-A10) [manual]

**Rol:** Motor · **Depende de:** Task 5 · **Duración:** 1–1,5 h · **Tarea manual: el agente no la ejecuta** (crea recursos en la nube con la cuenta del equipo).

**Ficheros:** Modificar `docs/arquitectura.md` §6 (forma, región, IP) — **sin** credenciales.

- [ ] **Paso 1:** consola de OCI → Compute → Instances → Create. Ubuntu 24.04. Forma: primero **VM.Standard.A1.Flex (Always Free)** con 2 OCPU / 12 GB; si no hay capacidad, una de pago con créditos y ≥ 4 GB RAM. **DEC-A10:** apuntar forma, región y motivo.
- [ ] **Paso 2:** *security list* de la VCN: entrada TCP 80 y 443 (0.0.0.0/0). En la VM: `sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT && sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT && sudo netfilter-persistent save`.
- [ ] **Paso 3:** `curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker ubuntu` y volver a entrar.
- [ ] **Paso 4:** `git clone` del repo; `app/.env` **creado a mano en la VM** (`chmod 600 app/.env`); `mkdir -p app/frontend/dist app/data`; la página de prueba; `cd app && docker compose -f deploy/docker-compose.yml up -d --build`.
- [ ] **Paso 5:** `curl -s http://<IP_PÚBLICA>/api/health` → Esperado: `{"status":"ok"}`.
- [ ] **Paso 6:** commit de la nota en `docs/arquitectura.md` §6 y §10 (A-10 ✅).

**Terminado cuando:** `/api/health` responde desde fuera por la IP pública.

---

### Task 7: M-M4 · Leer el plan de calor de Sanidad (P-03, desbloquea DEC-06)

**Rol:** Motor · **Servicio:** raíz del repositorio (solo documentación) · **Duración:** 45 min · El paso 1 es **[manual]**.

- [ ] **Paso 1 [manual]:** `sudo apt install -y poppler-utils`.
- [ ] **Paso 2:** descargar el PDF de la URL de `docs/assets/umbrales.md` §2 a `app/data/raw/calor/plan2026.pdf` y `pdftotext -layout app/data/raw/calor/plan2026.pdf app/data/raw/calor/plan2026.txt`.
- [ ] **Paso 3:** localizar la tabla de umbrales por zona meteosalud de la Comunidad de Madrid y copiarla **literalmente** a `umbrales.md` §2 (valores, unidad, zona, página del PDF, regla de niveles). Sin interpretar ni redondear.
- [ ] **Paso 4:** con el esquema real de AEMET (Task 4), escribir en `umbrales.md` §2 la **propuesta** para DEC-06 (qué dato horario se compara y con qué). No es decisión.
- [ ] **Paso 5:** `git add docs/assets/umbrales.md docs/PENDIENTES.md && git commit -m "Umbrales de calor del plan de Sanidad 2026"` (P-03 ✅).

**Terminado cuando:** `umbrales.md` §2 tiene los umbrales oficiales de Madrid con página citada y una propuesta para DEC-06.

---

### Task 8: M-R1 · Extracto de OSM y prueba de pyrosm en Getafe

**Rol:** Rutas · **Servicio:** `app/ingest/` · **Depende de:** Task 1 y Task 2 paso 10 (si no, `curl -o ../data/raw/osm/madrid-latest.osm.pbf <URL de Geofabrik>`) · **Duración:** 1,5 h

**Ficheros:** Crear `scripts/probe_pyrosm.py`. Modificar `../../docs/arquitectura.md` §3.4.

- [ ] **Paso 1:** `.venv/bin/pip install -e ".[routing]"`. Si no compila en 3.12, usar el respaldo con pyosmium (`.venv/bin/pip install osmium==3.7.0`, Task 20 paso 3b) y anotarlo.

- [ ] **Paso 2: `scripts/probe_pyrosm.py`**

```python
#!/usr/bin/env python3
"""Mide la red peatonal de OSM para un municipio: nodos, tramos, tiempo y memoria.

Uso: python scripts/probe_pyrosm.py 28065
"""
import json
import os
import pathlib
import resource
import sys
import time

import geopandas as gpd

ROOT = pathlib.Path(__file__).resolve().parent.parent      # app/ingest
DATA_DIR = pathlib.Path(os.environ.get("GOMAD_DATA_DIR", ROOT.parent / "data"))
PBF = DATA_DIR / "raw" / "osm" / "madrid-latest.osm.pbf"


def municipality_bbox(ine_code):
    muni = gpd.read_file(DATA_DIR / "raw" / "municipios" / "municipios.geojson")
    muni = muni.set_crs(25830, allow_override=True).to_crs(4326)
    row = muni[("28" + muni["CDMUNICIPIO"].astype(str).str.zfill(3)) == ine_code]
    if row.empty:
        sys.exit(f"Municipio {ine_code} no encontrado")
    return [float(v) for v in row.total_bounds]


def main(ine_code):
    from pyrosm import OSM
    bbox = municipality_bbox(ine_code)
    t0 = time.perf_counter()
    osm = OSM(str(PBF), bounding_box=bbox)
    nodes, edges = osm.get_network(network_type="walking", nodes=True)
    seconds = time.perf_counter() - t0
    mem_mb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024
    print(json.dumps({"municipality": ine_code, "bbox": bbox, "nodes": len(nodes), "edges": len(edges),
                      "seconds": round(seconds, 1), "max_memory_mb": round(mem_mb),
                      "edge_columns": list(edges.columns)[:40],
                      "highway": edges["highway"].value_counts().head(15).to_dict()}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "28065")
```

> `municipios.geojson` viene del WFS en EPSG:25830. Comprobar que la `bbox` sale en grados (≈ −3,8, 40,3 en Getafe); si sale en metros, quitar el `set_crs` y repetir.

- [ ] **Paso 3:** Run: `.venv/bin/python scripts/probe_pyrosm.py 28065` y luego `28079`. Esperado: `nodes` y `edges` > 0; columnas `u`, `v`, `length`, `highway`, `geometry`.
- [ ] **Paso 4:** anotar en `../../docs/arquitectura.md` §3.4 las cifras **medidas** de Getafe y capital (nodos, tramos, segundos, MB), la estimación regional y si cabe en la VM de Task 6. Primera entrada de DEC-A11.
- [ ] **Paso 5: commit** — `git -C ../.. add app/ingest/scripts/probe_pyrosm.py docs/arquitectura.md && git -C ../.. commit -m "Medición de la red peatonal de OSM en Getafe y Madrid"`

**Terminado cuando:** hay cifras medidas en `arquitectura.md` §3.4 y se sabe si pyrosm funciona en 3.12.

---

### Task 9: M-F1 · Bocetos con la maquetadora (DEC-A02, primera ronda) [manual]

> **✅ Hecha el 14/10 como documentación (pendiente de validar con la maquetadora):** `app/frontend/docs/pantallas.md` especifica las 8 pantallas (Inicio y Resultados incluidas) con los campos del contrato de la Task 11, estados, accesibilidad, estado actual del código del compañero y preguntas abiertas (§10). Falta la ronda con la maquetadora: cada sección acaba con «Validar con la maquetadora». Los pasos de abajo se conservan como referencia.

**Rol:** Front · **Duración:** 2–3 h · **Tarea manual** (trabajo con la maquetadora).

**Ficheros:** Crear `app/frontend/docs/pantallas.md`.

- [ ] **Paso 1:** recorrer `docs/idea/muevete-cerca-prototipo.html` y la tabla de arquitectura §5.2. Para **Inicio** y **Resultados**, cerrar: elementos, textos, orden de foco, estados (cargando, error, vacío, «sin datos») y cómo se ve cada indicador (icono + color + texto).
- [ ] **Paso 2:** `app/frontend/docs/pantallas.md` con una sección por pantalla: propósito, endpoint que usa (nombres de Task 11), componentes, estados y accesibilidad. Las no cerradas: «se cierra el <día> antes de maquetar».
- [ ] **Paso 3:** commit.

**Terminado cuando:** Inicio y Resultados están cerrados en `app/frontend/docs/pantallas.md` (bloquean Tasks 24 y 25).

---

### Task 10: M-F2 · Proyecto Vite + React + TypeScript con estilos y fuentes propias [manual guiado]

> **[manual guiado] (14/10):** el proyecto Vite ya existe, creado a mano por la persona del front (React 19.3, Vite 8.3, TypeScript 6.0; no React 18/Vite 5). **No ejecutar los pasos de abajo** (no `npm create vite`, no los `npm install` con estas versiones, que son para Vite 5). Lo que falta de esta tarea (stack, pruebas con axe, fuentes propias, iconos, router, Dockerfile multi-stage, `.dockerignore`) está en **`app/frontend/docs/guia.md` §3, paso 0**, con versiones comprobadas. El criterio «Terminado cuando» de abajo sigue valiendo.

**Rol:** Front · **Servicio:** `app/frontend/` · **Duración:** 2 h · El paso 1 es **[manual]**.

**Ficheros:** Crear el proyecto Vite en este directorio, `src/styles/main.css`, `src/styles/icons.css`, `public/fonts/`, `src/App.tsx`, `src/main.tsx`, `src/setupTests.ts`, `src/App.test.tsx`. Modificar `Dockerfile` (multi-stage).

- [ ] **Paso 1 [manual]:** Node 20 LTS con `nvm` (`nvm install 20 && nvm use 20`). Comprobar `node -v` → `v20.x`.

- [ ] **Paso 2: crear el proyecto en este directorio**

```bash
rm -f .gitkeep
npm create vite@5.5.2 . -- --template react-ts      # si pregunta por ficheros existentes (Caddyfile, Dockerfile): "Ignore files and continue"
npm install
npm install react-router-dom@6.26.2 @tanstack/react-query@5.56.2 react-map-gl@7.1.7 maplibre-gl@4.7.1 \
  @radix-ui/react-slider@1.2.0 @radix-ui/react-dialog@1.1.1
npm install -D vitest@2.1.1 @testing-library/react@16.0.1 @testing-library/jest-dom@6.5.0 jsdom@25.0.0 \
  vitest-axe@0.1.0 msw@2.4.9 openapi-typescript@7.4.1
```
Si alguna versión no existe, usar la más cercana anterior y anotarla. Comprobar que `Caddyfile` y `Dockerfile` siguen intactos.

- [ ] **Paso 3: fuentes servidas por nosotros** (no `fonts.googleapis.com`, RGPD): `.woff2` de Figtree (OFL) y Material Symbols Rounded (Apache 2.0) desde sus repositorios oficiales a `public/fonts/` con sus licencias, declaradas con `@font-face` en `main.css`. `index.html` sin ningún `<link>` a Google.
- [ ] **Paso 4: `main.css`** con las variables de color claro/oscuro y las clases del prototipo (`.btn1`, `.btn2`, `.score`, `.tabs`, `.seg`, `.back`, `.empty`…), `:focus-visible` visible y `@media (prefers-reduced-motion: reduce)`. `icons.css`: clase `.icon` para Material Symbols. Clases nuevas en inglés; las del prototipo se mantienen.

- [ ] **Paso 5: prueba que falla** — `src/App.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("has an h1 and no axe violations", async () => {
    const { container } = render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    const result = await axe(container);
    expect(result.violations).toEqual([]);
  });
});
```

Vitest en `vite.config.ts` (`test: { environment: "jsdom", setupFiles: ["./src/setupTests.ts"] }`; `setupTests.ts` con `import "@testing-library/jest-dom/vitest"`). Run: `npx vitest run` → Esperado: FAIL.

- [ ] **Paso 6: `App.tsx`** con `<header>`, `<nav aria-label="Principal">` inferior («Mi entorno · Municipios · Perfil»), `<main id="content">` con `<h1>`, enlace «Saltar al contenido»; `index.html` con `lang="es"`. Run: `npx vitest run` → PASS; `npm run build` → sin errores.

- [ ] **Paso 7: `Dockerfile` multi-stage** (sustituye al provisional de Task 5):

```dockerfile
# 1) compila la SPA
FROM node:20-alpine AS build
WORKDIR /srv/frontend
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2) Caddy sirve los estaticos y hace de proxy a la API
FROM caddy:2.8.4
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /srv/frontend/dist /srv/web
```

`.dockerignore`: `node_modules/`, `dist/`. Run: `(cd ../deploy && docker compose build frontend)` → Esperado: imagen construida (si Docker ya está; si no, comprobarlo en Task 5/V-F4).

- [ ] **Paso 8: commit** — `git -C ../.. add app/frontend && git -C ../.. commit -m "Front: proyecto Vite con estilos del prototipo, fuentes propias y Dockerfile multi-stage"`

**Terminado cuando:** `npm run build` genera `dist/`, la prueba con axe pasa, no hay peticiones a Google y la imagen del frontend compila la SPA.

---

# JUEVES 15/10 — detalle completo

### Task 11: J-M1 · Contrato de la API (9:00–11:00, bloquea al resto)

**Rol:** Motor (con Front y Rutas los primeros 20 min) · **Servicio:** `app/api/` · **Depende de:** Task 1 · **Duración:** 2 h

**Ficheros:**
- Crear: `schemas.py`, `scripts/export_openapi.py`, `tests/test_contract.py`, `../frontend/src/api/openapi.json` (generado)
- Modificar: `main.py`

**Interfaces (produce; todos los roles lo usan):**

```python
# schemas.py
"""Contrato de la API (arquitectura §4.1). Cambiarlo = regenerar openapi.json y los tipos del front."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Profile = Literal["general", "senior", "stroller", "sensitive"]
Companion = Literal["dog", "kids"]
Setting = Literal["outdoor", "indoor", "any"]
# categorias del ICA (BOE-A-2020-10426): Buena, Razonablemente buena, Regular, Desfavorable,
# Muy desfavorable, Extremadamente desfavorable
AqiCategory = Literal["good", "fair", "moderate", "poor", "very_poor", "extremely_poor"]
Factor = Literal["proximity", "suitability", "green", "air", "weather"]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Coordinate(Strict):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class DataSource(Strict):
    source: str                       # id de ingest/scripts/download_sources.py, p. ej. "aire_dia"
    label: str                        # texto para la persona, p. ej. "Calidad del aire (Comunidad de Madrid)"
    date: datetime | None             # fecha del dato (no de la descarga) si se conoce
    own_criterion: bool = False       # True si el umbral/valor no tiene fuente oficial (CLAUDE.md §2.9)


class Weights(Strict):
    proximity: float = Field(ge=0, le=1)
    suitability: float = Field(ge=0, le=1)
    green: float = Field(ge=0, le=1)
    air: float = Field(ge=0, le=1)
    weather: float = Field(ge=0, le=1)


class RouteWeights(Strict):
    traffic: float = Field(ge=0, le=1)
    green: float = Field(ge=0, le=1)
    fountains: float = Field(ge=0, le=1)


class Activity(Strict):
    id: str
    label: str
    icon: str                         # nombre de Material Symbols
    outdoor: bool | None              # None = puede ser ambas


class ActivitiesResponse(Strict):
    activities: list[Activity]
    profiles: list[Profile]
    companions: list[Companion]
    default_weights: Weights


class LocationCandidate(Strict):
    label: str
    municipality: str
    ine_code: str = Field(pattern=r"^28\d{3}$")
    coordinate: Coordinate
    precision: Literal["address", "street", "municipality"]


class LocationResponse(Strict):
    candidates: list[LocationCandidate]


class RecommendRequest(Strict):
    origin: Coordinate
    activity: str | None = None       # None = «Sorpréndeme» (RF-03)
    window_start: datetime
    window_end: datetime
    duration_min: int = Field(ge=10, le=480)
    max_distance_m: int = Field(ge=200, le=50_000)
    setting: Setting = "any"
    profile: Profile = "general"
    companions: list[Companion] = []
    weights: Weights | None = None    # None = por defecto (config/weights.yaml)
    limit: int = Field(default=3, ge=1, le=20)
    offset: int = Field(default=0, ge=0)   # «Ver más» (RF-05)

    @model_validator(mode="after")
    def check_window(self):
        if self.window_end <= self.window_start:
            raise ValueError("El final de la ventana debe ser posterior al inicio.")
        return self


class DestinationSummary(Strict):
    id: str                           # '{fuente}:{id_origen}'
    name: str
    type: Literal["facility", "park", "recreation_area", "trail", "bathing_area"]
    covered: bool | None
    municipality: str
    ine_code: str
    coordinate: Coordinate
    source: DataSource


class FactorScore(Strict):
    factor: Factor
    value: float | None = Field(ge=0, le=10)   # None = sin datos (no cuenta en la nota)
    weight: float = Field(ge=0, le=1)          # peso efectivo tras renormalizar
    text: str                                  # «Aire: razonablemente bueno»


class HourEvaluation(Strict):
    hour: datetime
    score: float | None = Field(ge=0, le=10)
    outdoor_ok: bool | None                    # None = sin datos para decidir
    reasons: list[str]
    temperature_c: float | None
    feels_like_c: float | None
    precip_prob: float | None
    aqi_category: AqiCategory | None


class Recommendation(Strict):
    destination: DestinationSummary
    distance_m: float
    duration_min: float
    score: float = Field(ge=0, le=10)
    factors: list[FactorScore]
    best_hour: datetime | None
    hours: list[HourEvaluation]
    indoor_alternative: bool                   # True si se propone por lluvia/calor/aire (RF-09)
    explanation: str                           # lenguaje llano, plantillas (RF-10)
    sources: list[DataSource]


class RecommendResponse(Strict):
    results: list[Recommendation]
    has_more: bool
    warnings: list[str]                        # «Verde: sin datos en este municipio»
    medical_disclaimer: str


class RouteRequest(Strict):
    origin: Coordinate
    destination: Coordinate
    profile: Profile = "general"
    weights: RouteWeights | None = None


class RoutePoi(Strict):
    type: Literal["fountain", "bench", "bin", "toilet", "dog_area", "playground", "aed", "outdoor_gym", "supermarket"]
    coordinate: Coordinate
    source: str


class RouteVariant(Strict):
    kind: Literal["direct", "healthy"]
    geometry: dict                             # GeoJSON LineString en EPSG:4326
    distance_m: float
    duration_min: float
    green_pct: float | None = Field(ge=0, le=100)
    traffic_m: float
    pois: list[RoutePoi]
    approximate: bool = False                  # True = linea recta (sin red peatonal)
    description: str                           # «2,4 km, 30 min, 68 % por zona verde, 2 fuentes»


class RouteResponse(Strict):
    direct: RouteVariant
    healthy: RouteVariant
    warnings: list[str]
    sources: list[DataSource]


class Indicator(Strict):
    category: Literal["sport", "nature", "mobility", "health", "education", "connectivity", "social"]
    key: str
    label: str
    value: float | None                        # None = «sin datos» explicito
    unit: str
    year: int | None
    source: DataSource


class MunicipalityResponse(Strict):
    ine_code: str
    name: str
    population: int | None
    indicators: list[Indicator]
    fit: list[str]                             # frases sin ranking (RF-18)


class AssistantParams(Strict):
    """Esquema cerrado de F6 (RF-21). El LLM solo puede rellenar esto."""
    activity: Literal["walk", "run"]
    distance_km: float | None = Field(default=None, gt=0, le=42)
    duration_min: int | None = Field(default=None, gt=0, le=480)
    loop: bool = True
    pass_by: list[Literal["park", "fountain", "bench", "supermarket", "dog_area", "playground"]] = []
    avoid: list[Literal["traffic", "hills"]] = []


class InterpretRequest(Strict):
    text: str = Field(min_length=3, max_length=500)


class InterpretResponse(Strict):
    params: AssistantParams | None
    clarification: str | None                  # RF-24: pregunta si es ambiguo
    rejection: str | None                      # RF-24: fuera de catalogo o consejo medico


class AssistantRouteRequest(Strict):
    origin: Coordinate
    params: AssistantParams


class Condition(Strict):
    condition: str
    met: bool
    detail: str                                # dato del motor, nunca inventado


class AssistantRouteResponse(Strict):
    route: RouteVariant
    conditions: list[Condition]
    explanation: str
    written_by_ai: bool


class SourceInfo(Strict):
    id: str
    name: str
    publisher: str
    license: str
    url: str
    last_refresh: datetime | None
    last_failure: datetime | None


class SourcesResponse(Strict):
    sources: list[SourceInfo]
```

> **Dependencia de decisiones:** `Profile` y `Companion` pueden cambiar con DEC-05/DEC-08; `activity` es `str` (validado contra `config/activities.yaml` en tiempo de ejecución) para que el catálogo no obligue a regenerar tipos. Si cambian los `Literal`, se regenera (Task 23 paso 1).

> **Cambio tras la revisión (commit b5b3cdf):** `RecommendRequest` tiene un `field_validator` que convierte `window_start`/`window_end` con zona a hora local de Madrid sin zona; `window_*`, `HourEvaluation.hour` y `Recommendation.best_hour` llevan `description` con esa convención. Pruebas añadidas: `test_aware_window_is_converted_to_madrid_local_time` y `test_mixed_timezone_inverted_window_is_422_not_500`. El código de `app/api/schemas.py` prevalece sobre este bloque.

- [ ] **Paso 1: prueba que falla** — `tests/test_contract.py`

```python
import json

from fastapi.testclient import TestClient

from main import app

ROUTES = {
    ("get", "/activities"), ("get", "/location"), ("post", "/recommend"), ("post", "/route"),
    ("get", "/municipality/{ine_code}"), ("post", "/assistant/interpret"), ("post", "/assistant/route"),
    ("get", "/sources"), ("get", "/health"),
}


def test_all_contract_routes_exist():
    schema = app.openapi()
    present = {(method, path) for path, ops in schema["paths"].items() for method in ops}
    assert ROUTES <= present


def test_versioned_openapi_is_up_to_date(root):
    """Si falla: python scripts/export_openapi.py y regenerar los tipos del front (Task 23)."""
    saved = json.loads((root.parent / "frontend" / "src" / "api" / "openapi.json").read_text(encoding="utf-8"))
    assert saved == app.openapi()


def test_inverted_window_is_422():
    body = {"origin": {"lat": 40.3, "lon": -3.73}, "window_start": "2026-10-20T10:00:00",
            "window_end": "2026-10-20T09:00:00", "duration_min": 45, "max_distance_m": 3000}
    r = TestClient(app).post("/recommend", json=body)
    assert r.status_code == 422


def test_unknown_field_is_422():
    r = TestClient(app).post("/assistant/interpret", json={"text": "15 km", "location": "x"})
    assert r.status_code == 422
```

Run: `.venv/bin/pytest tests/test_contract.py -v` → Esperado: FAIL.

- [ ] **Paso 2: rutas en `main.py`** (cuerpo provisional `501`):

```python
"""API de GoMad. Sin estado: sin sesiones ni registro; la ubicacion nunca se escribe en los logs."""
from fastapi import FastAPI, HTTPException, Query

import schemas as s

app = FastAPI(title="GoMad API", version="0.1.0")


def _not_implemented():
    raise HTTPException(status_code=501, detail="Pendiente de implementar")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/activities", response_model=s.ActivitiesResponse)
def activities():
    _not_implemented()


@app.get("/location", response_model=s.LocationResponse)
def location(text: str = Query(min_length=3, max_length=200)):
    _not_implemented()


@app.post("/recommend", response_model=s.RecommendResponse)
def recommend(request: s.RecommendRequest):
    _not_implemented()


@app.post("/route", response_model=s.RouteResponse)
def route(request: s.RouteRequest):
    _not_implemented()


@app.get("/municipality/{ine_code}", response_model=s.MunicipalityResponse)
def municipality(ine_code: str):
    _not_implemented()


@app.post("/assistant/interpret", response_model=s.InterpretResponse)
def assistant_interpret(request: s.InterpretRequest):
    _not_implemented()


@app.post("/assistant/route", response_model=s.AssistantRouteResponse)
def assistant_route(request: s.AssistantRouteRequest):
    _not_implemented()


@app.get("/sources", response_model=s.SourcesResponse)
def sources():
    _not_implemented()
```

- [ ] **Paso 3: `scripts/export_openapi.py`**

```python
#!/usr/bin/env python3
"""Exporta el contrato OpenAPI para el front: app/frontend/src/api/openapi.json."""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent      # app/api
sys.path.insert(0, str(ROOT))
from main import app  # noqa: E402

target = ROOT.parent / "frontend" / "src" / "api" / "openapi.json"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(app.openapi(), ensure_ascii=False, indent=1), encoding="utf-8")
print(f"Escrito {target}")
```

Run: `.venv/bin/python scripts/export_openapi.py && .venv/bin/pytest -v` → Esperado: PASS.

- [ ] **Paso 4: commit** — `git -C ../.. add app/api app/frontend/src/api/openapi.json && git -C ../.. commit -m "Contrato de la API: modelos Pydantic y OpenAPI"`. Avisar al equipo.

**Terminado cuando:** `openapi.json` está en `main` y las 4 pruebas del contrato pasan.

---

### Task 12: J-M2 · Módulo `rules` (filtros duros) y configuración

**Rol:** Motor · **Servicio:** `app/api/` · **Depende de:** Task 11 · **Duración:** 2 h

**Ficheros:** Crear `../config/ica_thresholds.yaml`, `settings.py`, `engine/__init__.py`, `engine/rules.py`, `tests/engine/test_rules.py`. `../config/rules.yaml` lo crean DEC-05/06/07b.

**Interfaces:**
- Produce:
  - `settings.APP_DIR`, `settings.CONFIG_DIR` (`GOMAD_CONFIG_DIR` o `app/config`), `settings.DATA_DIR` (`GOMAD_DATA_DIR` o `app/data`), `settings.load(name: str) -> dict | None`
  - `CATEGORIES: tuple[str, ...]` (mejor a peor, como `AqiCategory`); `CATEGORY_LABEL: dict[str, str]` (textos del BOE)
  - `pollutant_category(pollutant: str, value: float | None, bands: dict) -> str | None`
  - `aqi_category(values: dict[str, float | None], bands: dict) -> str | None`
  - `@dataclass HourContext(hour: datetime, temperature_c, feels_like_c, precip_prob, aqi_category)`
  - `@dataclass RuleResult(outdoor_ok: bool | None, reasons: list[str])`
  - `evaluate_outdoor(ctx: HourContext, profile: str, rules: dict) -> RuleResult`
- Formato de `config/rules.yaml` (contrato con el código; valores de DEC-05/06/07b):

```yaml
air:             # DEC-05: categoria a partir de la cual NO se recomienda exterior, por perfil
  general: poor
  senior: ...
  stroller: ...
  sensitive: ...
  source: "BOE-A-2020-10426, tabla de recomendaciones"
heat:            # DEC-06: null = regla desactivada
  max_feels_like_c: null
  source: null
  own_criterion: false
rain:            # DEC-07b: null = regla desactivada
  max_precip_prob: null
  own_criterion: true
```

- [ ] **Paso 1: `../config/ica_thresholds.yaml`** (valores **verificados**, `umbrales.md` §1.1; límite superior de cada banda)

```yaml
# Indice Nacional de Calidad del Aire. Resolucion de 2 de septiembre de 2020 (BOE-A-2020-10426),
# que sustituye el anexo de la Orden TEC/351/2019. Tabla: https://www.boe.es/datos/imagenes/disp/2020/242/10426_5606.png
# Limite SUPERIOR (ug/m3) de cada categoria, de mejor a peor. Por encima del ultimo: dato erroneo (se descarta).
# Valores no enteros: se redondean al entero mas proximo antes de comparar (la tabla del BOE es de enteros).
source: "BOE-A-2020-10426"
categories: [good, fair, moderate, poor, very_poor, extremely_poor]
bands:
  NO2:   [40, 90, 120, 230, 340, 1000]
  O3:    [50, 100, 130, 240, 380, 800]
  PM10:  [20, 40, 50, 100, 150, 1200]
  PM2_5: [10, 20, 25, 50, 75, 800]
  SO2:   [100, 200, 350, 500, 750, 1250]
period_hours: {NO2: 1, SO2: 1, O3: 8, PM10: 24, PM2_5: 24}
```

- [ ] **Paso 2: pruebas que fallan** — `tests/engine/test_rules.py`

```python
from datetime import datetime

import pytest

from engine.rules import CATEGORIES, HourContext, aqi_category, evaluate_outdoor, pollutant_category
from settings import load

BANDS = load("ica_thresholds")["bands"]

# Reglas de PRUEBA (no son las decididas; esas van en config/rules.yaml tras DEC-05/06/07b)
RULES = {
    "air": {"general": "poor", "sensitive": "moderate"},
    "heat": {"max_feels_like_c": 30.0},
    "rain": {"max_precip_prob": 50},
}


@pytest.mark.parametrize("value,expected", [
    (0, "good"), (40, "good"), (40.4, "good"), (40.6, "fair"), (41, "fair"),
    (90, "fair"), (91, "moderate"), (120, "moderate"), (121, "poor"),
    (230, "poor"), (231, "very_poor"), (341, "extremely_poor"), (1000, "extremely_poor"),
])
def test_no2_band_limits(value, expected):
    assert pollutant_category("NO2", value, BANDS) == expected


@pytest.mark.parametrize("value,expected", [(50, "good"), (51, "fair"), (130, "moderate"),
                                            (131, "poor"), (241, "very_poor")])
def test_o3_band_limits(value, expected):
    assert pollutant_category("O3", value, BANDS) == expected


def test_above_max_is_discarded():
    assert pollutant_category("NO2", 1001, BANDS) is None


def test_missing_value_is_none():
    assert pollutant_category("PM10", None, BANDS) is None


def test_aqi_is_worst_category():
    assert aqi_category({"NO2": 30, "O3": 135, "PM10": None}, BANDS) == "poor"


def test_aqi_without_any_data():
    assert aqi_category({"NO2": None, "O3": None}, BANDS) is None


def ctx(**kw):
    base = dict(hour=datetime(2026, 7, 15, 18), temperature_c=25.0, feels_like_c=25.0,
                precip_prob=0.0, aqi_category="good")
    base.update(kw)
    return HourContext(**base)


def test_moderate_air_blocks_sensitive_not_general():
    assert evaluate_outdoor(ctx(aqi_category="moderate"), "sensitive", RULES).outdoor_ok is False
    assert evaluate_outdoor(ctx(aqi_category="moderate"), "general", RULES).outdoor_ok is True


def test_lucia_high_ozone():
    r = evaluate_outdoor(ctx(aqi_category="poor"), "sensitive", RULES)
    assert r.outdoor_ok is False
    assert any("aire" in reason.lower() for reason in r.reasons)


def test_carmen_36_degrees():
    r = evaluate_outdoor(ctx(temperature_c=36.0, feels_like_c=37.0), "general", RULES)
    assert r.outdoor_ok is False
    assert any("calor" in reason.lower() for reason in r.reasons)


def test_rain():
    assert evaluate_outdoor(ctx(precip_prob=80), "general", RULES).outdoor_ok is False


def test_disabled_rule_does_not_block():
    rules = {**RULES, "heat": {"max_feels_like_c": None}}
    assert evaluate_outdoor(ctx(feels_like_c=45.0), "general", rules).outdoor_ok is True


def test_profile_without_rule_uses_general():
    assert evaluate_outdoor(ctx(aqi_category="poor"), "stroller", RULES).outdoor_ok is False


def test_no_data_at_all_is_undetermined():
    r = evaluate_outdoor(ctx(feels_like_c=None, temperature_c=None, precip_prob=None, aqi_category=None),
                         "general", RULES)
    assert r.outdoor_ok is None


def test_categories_in_order():
    assert CATEGORIES[0] == "good" and CATEGORIES[-1] == "extremely_poor"
```

Run: `.venv/bin/pytest tests/engine/test_rules.py -v` → Esperado: FAIL (`ModuleNotFoundError`).

- [ ] **Paso 3: implementar**

`settings.py`:
```python
"""Rutas compartidas y carga de config/*.yaml. Los valores decididos por el equipo viven ahi, nunca en el codigo."""
import functools
import os
import pathlib

import yaml

APP_DIR = pathlib.Path(__file__).resolve().parent.parent                       # app
CONFIG_DIR = pathlib.Path(os.environ.get("GOMAD_CONFIG_DIR", APP_DIR / "config"))
DATA_DIR = pathlib.Path(os.environ.get("GOMAD_DATA_DIR", APP_DIR / "data"))


@functools.cache
def load(name: str) -> dict | None:
    path = CONFIG_DIR / f"{name}.yaml"
    if not path.exists():
        return None
    return yaml.safe_load(path.read_text(encoding="utf-8"))
```

`engine/__init__.py` vacío. `engine/rules.py`:
```python
"""Filtros duros: se puede recomendar actividad al aire libre a esta hora y con este perfil?

Umbrales leidos de config/ (ica_thresholds.yaml verificado; rules.yaml decidido por el equipo).
"""
from dataclasses import dataclass, field
from datetime import datetime

CATEGORIES = ("good", "fair", "moderate", "poor", "very_poor", "extremely_poor")
# textos oficiales del BOE para mostrar a la persona
CATEGORY_LABEL = {"good": "Buena", "fair": "Razonablemente buena", "moderate": "Regular",
                  "poor": "Desfavorable", "very_poor": "Muy desfavorable",
                  "extremely_poor": "Extremadamente desfavorable"}


def pollutant_category(pollutant, value, bands):
    if value is None:
        return None
    v = round(value)
    for category, limit in zip(CATEGORIES, bands[pollutant]):
        if v <= limit:
            return category
    return None  # por encima del maximo: dato erroneo (Resolucion de 2020)


def aqi_category(values, bands):
    cats = [pollutant_category(p, v, bands) for p, v in values.items() if p in bands]
    cats = [c for c in cats if c is not None]
    return max(cats, key=CATEGORIES.index) if cats else None


@dataclass
class HourContext:
    hour: datetime
    temperature_c: float | None
    feels_like_c: float | None
    precip_prob: float | None
    aqi_category: str | None


@dataclass
class RuleResult:
    outdoor_ok: bool | None
    reasons: list[str] = field(default_factory=list)


def evaluate_outdoor(ctx, profile, rules):
    reasons, evaluated = [], 0
    air = rules.get("air") or {}
    limit = air.get(profile) or air.get("general")
    if limit and ctx.aqi_category is not None:
        evaluated += 1
        if CATEGORIES.index(ctx.aqi_category) >= CATEGORIES.index(limit):
            reasons.append(f"Calidad del aire {CATEGORY_LABEL[ctx.aqi_category].lower()}")
    max_heat = (rules.get("heat") or {}).get("max_feels_like_c")
    if max_heat is not None and ctx.feels_like_c is not None:
        evaluated += 1
        if ctx.feels_like_c > max_heat:
            reasons.append(f"Calor: sensación térmica de {ctx.feels_like_c:.0f} °C")
    max_rain = (rules.get("rain") or {}).get("max_precip_prob")
    if max_rain is not None and ctx.precip_prob is not None:
        evaluated += 1
        if ctx.precip_prob > max_rain:
            reasons.append(f"Lluvia: {ctx.precip_prob:.0f} % de probabilidad")
    if reasons:
        return RuleResult(False, reasons)
    return RuleResult(True if evaluated else None, [])
```

- [ ] **Paso 4:** Run: `.venv/bin/pytest tests/engine/test_rules.py -v` → Esperado: PASS.
- [ ] **Paso 5: commit** — `git -C ../.. add app/config/ica_thresholds.yaml app/api/settings.py app/api/engine app/api/tests/engine && git -C ../.. commit -m "Motor: reglas de aire (ICA del BOE), calor y lluvia leídas de configuración"`

**Terminado cuando:** pasan las pruebas, incluidos los límites de banda del ICA y las personas Carmen y Lucía con reglas de prueba.

---

### Task 13: J-M3 · Módulo `scoring`

**Rol:** Motor · **Servicio:** `app/api/` · **Depende de:** Task 12 · **Duración:** 1,5 h

**Ficheros:** Crear `engine/scoring.py`, `tests/engine/test_scoring.py`.

**Interfaces:**
- Produce:
  - `FACTORS = ("proximity", "suitability", "green", "air", "weather")`
  - `normalize_weights(weights: dict | None, defaults: dict) -> tuple[dict, list[str]]`
  - `proximity_factor(distance_m, max_distance_m) -> float`
  - `air_factor(category: str | None) -> float | None`
  - `weather_factor(precip_prob: float | None) -> float | None`
  - `@dataclass Score(value: float, by_factor: dict, effective_weights: dict)`
  - `compute_score(factors: dict[str, float | None], weights: dict) -> Score` (renormaliza sobre los disponibles)
- `suitability` y `green` (0–1) los trae cada destino desde `gomad.duckdb` (Task 19).

> `weather_factor` usa solo la probabilidad de lluvia (el calor es filtro duro en `rules`). Criterio de implementación a confirmar en DEC-07; la respuesta lo marca `own_criterion`.

- [ ] **Paso 1: pruebas que fallan** — `tests/engine/test_scoring.py`

```python
import pytest

from engine.scoring import (FACTORS, air_factor, compute_score, normalize_weights, proximity_factor,
                            weather_factor)

# Pesos de PRUEBA (los reales salen de DEC-07 -> config/weights.yaml)
DEFAULTS = {"proximity": 0.2, "suitability": 0.2, "green": 0.2, "air": 0.2, "weather": 0.2}


def test_proximity():
    assert proximity_factor(0, 3000) == 1.0
    assert proximity_factor(1500, 3000) == pytest.approx(0.5)
    assert proximity_factor(4000, 3000) == 0.0


def test_air_is_monotonic():
    values = [air_factor(c) for c in ("good", "fair", "moderate", "poor", "very_poor", "extremely_poor")]
    assert values == sorted(values, reverse=True)
    assert values[0] == 1.0 and values[-1] == 0.0
    assert air_factor(None) is None


def test_weather():
    assert weather_factor(0) == 1.0 and weather_factor(100) == 0.0 and weather_factor(None) is None


def test_perfect_score_is_10():
    assert compute_score({f: 1.0 for f in FACTORS}, DEFAULTS).value == pytest.approx(10.0)


def test_missing_factor_renormalizes():
    s = compute_score({"proximity": 1.0, "suitability": 1.0, "green": None, "air": 1.0, "weather": 1.0}, DEFAULTS)
    assert s.value == pytest.approx(10.0)
    assert s.by_factor["green"] is None
    assert "green" not in s.effective_weights
    assert sum(s.effective_weights.values()) == pytest.approx(1.0)


def test_all_zero_weights_fall_back():
    weights, warnings = normalize_weights({f: 0.0 for f in FACTORS}, DEFAULTS)
    assert weights == pytest.approx(DEFAULTS)
    assert warnings


def test_weights_are_normalized():
    weights, _ = normalize_weights({"proximity": 1, "suitability": 1, "green": 0, "air": 0, "weather": 0}, DEFAULTS)
    assert weights["proximity"] == pytest.approx(0.5) and sum(weights.values()) == pytest.approx(1.0)


def test_two_people_same_place_different_answer():
    """Guion de la demo (criterio 2.2): mover pesos cambia el orden."""
    near_grey = {"proximity": 1.0, "suitability": 0.8, "green": 0.1, "air": 0.6, "weather": 1.0}
    far_green = {"proximity": 0.4, "suitability": 0.8, "green": 1.0, "air": 0.9, "weather": 1.0}
    hurry, _ = normalize_weights({"proximity": 1, "suitability": 0.2, "green": 0, "air": 0, "weather": 0}, DEFAULTS)
    nature, _ = normalize_weights({"proximity": 0.1, "suitability": 0.2, "green": 1, "air": 1, "weather": 0}, DEFAULTS)
    assert compute_score(near_grey, hurry).value > compute_score(far_green, hurry).value
    assert compute_score(far_green, nature).value > compute_score(near_grey, nature).value


def test_no_factor_available():
    s = compute_score({f: None for f in FACTORS}, DEFAULTS)
    assert s.value == 0.0 and s.effective_weights == {}
```

Run: `.venv/bin/pytest tests/engine/test_scoring.py -v` → Esperado: FAIL.

- [ ] **Paso 2: implementar** — `engine/scoring.py`

```python
"""Puntuacion ponderada 0-10 (RF-07). Factores normalizados 0-1; None = sin datos (no cuenta)."""
from dataclasses import dataclass

from engine.rules import CATEGORIES

FACTORS = ("proximity", "suitability", "green", "air", "weather")


def normalize_weights(weights, defaults):
    warnings = []
    weights = {f: float((weights or {}).get(f, 0.0)) for f in FACTORS} if weights else dict(defaults)
    total = sum(weights.values())
    if total <= 0:
        warnings.append("Todos los pesos estaban a cero: se usan los pesos por defecto.")
        weights, total = dict(defaults), sum(defaults.values())
    return {f: weights[f] / total for f in FACTORS}, warnings


def proximity_factor(distance_m, max_distance_m):
    if max_distance_m <= 0:
        return 0.0
    return max(0.0, min(1.0, 1.0 - distance_m / max_distance_m))


def air_factor(category):
    if category is None:
        return None
    return 1.0 - CATEGORIES.index(category) / (len(CATEGORIES) - 1)


def weather_factor(precip_prob):
    if precip_prob is None:
        return None
    return max(0.0, min(1.0, 1.0 - precip_prob / 100.0))


@dataclass
class Score:
    value: float
    by_factor: dict
    effective_weights: dict


def compute_score(factors, weights):
    available = {f: v for f, v in factors.items() if v is not None and weights.get(f, 0) > 0}
    total = sum(weights[f] for f in available)
    if total <= 0:
        return Score(0.0, {f: factors.get(f) for f in FACTORS}, {})
    effective = {f: weights[f] / total for f in available}
    value = 10.0 * sum(effective[f] * available[f] for f in available)
    return Score(round(value, 2), {f: factors.get(f) for f in FACTORS}, effective)
```

- [ ] **Paso 3:** Run: `.venv/bin/pytest tests/engine -v` → Esperado: PASS.
- [ ] **Paso 4: commit** — `git -C ../.. add app/api/engine/scoring.py app/api/tests/engine/test_scoring.py && git -C ../.. commit -m "Motor: puntuación ponderada con renormalización de factores sin datos"`

**Terminado cuando:** pasan las pruebas, incluida «dos personas, mismo sitio, distinta respuesta».

---

### Task 14: J-M4 · Módulo `slots` (mejor hora y alternativa cubierta)

**Rol:** Motor · **Servicio:** `app/api/` · **Depende de:** Tasks 12, 13 · **Duración:** 1,5 h

**Ficheros:** Crear `engine/slots.py`, `tests/engine/test_slots.py`.

**Interfaces:**
- Consume: `HourContext`, `evaluate_outdoor`, `compute_score`, `air_factor`, `weather_factor`.
- Produce:
  - `@dataclass HourResult(hour: datetime, score: float | None, outdoor_ok: bool | None, reasons: list[str], ctx: HourContext | None)`
  - `window_hours(start: datetime, end: datetime) -> list[datetime]`
  - `evaluate_hours(contexts: dict[datetime, HourContext], window: list[datetime], covered: bool | None, profile: str, rules: dict, fixed_factors: dict, weights: dict) -> list[HourResult]`
  - `best_hour(results: list[HourResult]) -> HourResult | None`
  - `needs_indoor(results: list[HourResult]) -> bool` (ninguna hora viable al aire libre → RF-09)
- Un destino `covered=True` ignora lluvia/calor/aire; uno descubierto en hora no viable tiene `score=None`. Hora sin `HourContext` → `score=None`, motivo «Sin previsión para esta hora».

- [ ] **Paso 1: pruebas que fallan** — `tests/engine/test_slots.py`

```python
from datetime import datetime

from engine.rules import HourContext
from engine.slots import best_hour, evaluate_hours, needs_indoor, window_hours

RULES = {"air": {"general": "poor"}, "heat": {"max_feels_like_c": 30.0}, "rain": {"max_precip_prob": 50}}
WEIGHTS = {"proximity": 0.2, "suitability": 0.2, "green": 0.2, "air": 0.2, "weather": 0.2}
FIXED = {"proximity": 0.8, "suitability": 1.0, "green": 0.7}


def ctx(h, feels=25.0, rain=0.0, aqi="good", day=15):
    return HourContext(datetime(2026, 7, day, h), feels, feels, rain, aqi)


def test_window_hours():
    assert window_hours(datetime(2026, 7, 15, 18, 20), datetime(2026, 7, 15, 21, 0)) == [
        datetime(2026, 7, 15, 18), datetime(2026, 7, 15, 19), datetime(2026, 7, 15, 20)]


def test_window_crosses_midnight():
    w = window_hours(datetime(2026, 7, 15, 22), datetime(2026, 7, 16, 1))
    assert w == [datetime(2026, 7, 15, 22), datetime(2026, 7, 15, 23), datetime(2026, 7, 16, 0)]


def test_carmen_best_late_evening():
    contexts = {c.hour: c for c in [ctx(17, feels=36), ctx(18, feels=34), ctx(19, feels=31), ctx(20, feels=28)]}
    res = evaluate_hours(contexts, list(contexts), False, "general", RULES, FIXED, WEIGHTS)
    assert best_hour(res).hour == datetime(2026, 7, 15, 20)
    assert not needs_indoor(res)


def test_all_unviable_suggests_indoor():
    contexts = {c.hour: c for c in [ctx(17, feels=36), ctx(18, feels=35)]}
    res = evaluate_hours(contexts, list(contexts), False, "general", RULES, FIXED, WEIGHTS)
    assert needs_indoor(res)
    assert best_hour(res) is None


def test_covered_destination_ignores_heat():
    contexts = {c.hour: c for c in [ctx(17, feels=36)]}
    res = evaluate_hours(contexts, list(contexts), True, "general", RULES, FIXED, WEIGHTS)
    assert res[0].outdoor_ok is None and res[0].score is not None


def test_hours_without_forecast():
    contexts = {datetime(2026, 7, 15, 18): ctx(18)}
    window = [datetime(2026, 7, 15, 18), datetime(2026, 7, 15, 19)]
    res = evaluate_hours(contexts, window, False, "general", RULES, FIXED, WEIGHTS)
    assert res[1].score is None and "Sin previsión" in res[1].reasons[0]
    assert best_hour(res).hour == datetime(2026, 7, 15, 18)


def test_worse_air_lowers_score():
    contexts = {c.hour: c for c in [ctx(8, aqi="good"), ctx(9, aqi="moderate")]}
    res = evaluate_hours(contexts, list(contexts), False, "general", RULES, FIXED, WEIGHTS)
    assert res[0].score > res[1].score
```

Run: `.venv/bin/pytest tests/engine/test_slots.py -v` → Esperado: FAIL.

- [ ] **Paso 2: implementar** — `engine/slots.py`

```python
"""Evaluacion hora a hora y mejor franja (RF-08, RF-09)."""
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from engine.rules import HourContext, evaluate_outdoor
from engine.scoring import air_factor, compute_score, weather_factor


@dataclass
class HourResult:
    hour: datetime
    score: float | None
    outdoor_ok: bool | None
    reasons: list[str] = field(default_factory=list)
    ctx: HourContext | None = None


def window_hours(start, end):
    h = start.replace(minute=0, second=0, microsecond=0)
    hours = []
    while h < end:
        hours.append(h)
        h += timedelta(hours=1)
    return hours


def evaluate_hours(contexts, window, covered, profile, rules, fixed_factors, weights):
    results = []
    for hour in window:
        c = contexts.get(hour)
        if c is None:
            results.append(HourResult(hour, None, None, ["Sin previsión para esta hora"]))
            continue
        if covered:
            ok, reasons = None, []
        else:
            r = evaluate_outdoor(c, profile, rules)
            ok, reasons = r.outdoor_ok, r.reasons
        if ok is False:
            results.append(HourResult(hour, None, False, reasons, c))
            continue
        factors = {**fixed_factors,
                   "air": None if covered else air_factor(c.aqi_category),
                   "weather": None if covered else weather_factor(c.precip_prob)}
        results.append(HourResult(hour, compute_score(factors, weights).value, ok, reasons, c))
    return results


def best_hour(results):
    candidates = [r for r in results if r.score is not None]
    # a igual nota, la hora mas temprana
    return max(candidates, key=lambda r: (r.score, -r.hour.timestamp())) if candidates else None


def needs_indoor(results):
    with_data = [r for r in results if r.ctx is not None]
    return bool(with_data) and all(r.outdoor_ok is False for r in with_data)
```

- [ ] **Paso 3:** Run: `.venv/bin/pytest tests/engine -v` → Esperado: PASS.
- [ ] **Paso 4: commit** — `git -C ../.. add app/api/engine/slots.py app/api/tests/engine/test_slots.py && git -C ../.. commit -m "Motor: mejor franja horaria y alternativa cubierta"`

**Terminado cuando:** pasan las pruebas, incluidas ventana que cruza medianoche y horas sin previsión.

---

### Task 15: J-M5 · Prueba de OCI Generative AI antes de mediodía (DEC-03)

> Ejecutada el 15/10 con DEC-03 = OCI Language (sin LLM): `probe_ai.py` mide entidades y frases clave (0,23–0,28 s); la validación contra `AssistantParams` pasa a D-M1.

**Rol:** Motor · **Servicio:** `app/api/` · **Duración:** 1 h · **Límite: 12:00** · Paso 1 **[manual]**.

**Ficheros:** Crear `ai/__init__.py`, `ai/base.py`, `scripts/probe_ai.py`. `../.env` (no versionado): `IA_PROVEEDOR`, credenciales, `IA_MODELO`. Si el proveedor necesita SDK, se añade **solo** al `pyproject.toml` de `api`.

**Interfaces (produce; D-M1 las implementa del todo):**

```python
# ai/base.py
"""Interfaz de IA (arquitectura D-03). La IA solo interpreta texto y redacta con resultados del motor."""
from typing import Protocol

from schemas import Condition, InterpretResponse


class AIProvider(Protocol):
    def interpret(self, text: str) -> InterpretResponse: ...
    def write_up(self, conditions: list[Condition], route_summary: str) -> str: ...
```

- [ ] **Paso 1 [manual]:** en OCI, comprobar que la región tiene **Generative AI** con un modelo de chat con salida JSON o herramientas; crear credenciales (`~/.oci/config` y `app/.env`, nunca en el repo).
- [ ] **Paso 2:** `scripts/probe_ai.py`: envía «15 km andando, por un parque, con fuentes y bancos y que pase por un supermercado» con `AssistantParams.model_json_schema()` y valida con `AssistantParams.model_validate_json`; mide la latencia de 5 llamadas. **No** envía ubicación.
- [ ] **Paso 3 (DEC-03):** si a las **12:00** OCI no devuelve JSON válido en < 2 s de media → **plan B** (API de Anthropic, `claude-haiku-5-5` por latencia; la persona da de alta la clave). Anotar en `docs/arquitectura.md` §10 y `CLAUDE.md` §11.
- [ ] **Paso 4:** `git -C ../.. add app/api/ai app/api/scripts/probe_ai.py app/api/pyproject.toml docs/arquitectura.md CLAUDE.md && git -C ../.. commit -m "IA: interfaz y prueba del proveedor (DEC-03)"`.

**Terminado cuando:** hay proveedor elegido con una llamada validada contra el esquema y la latencia medida.

---

### Task 16: J-D1 · `common.py`: utilidades de normalización

**Rol:** Datos · **Servicio:** `app/ingest/` · **Depende de:** Task 1 · **Duración:** 1,5 h

**Ficheros:** Crear `common.py`, `normalize/__init__.py`, `normalize/__main__.py`, `tests/test_common.py`.

**Interfaces (produce):**
- `ROOT` (app/ingest), `APP_DIR` (app), `DATA_DIR` (`GOMAD_DATA_DIR` o `app/data`), `RAW = DATA_DIR/"raw"`, `CLEAN = DATA_DIR/"clean"`, `CONFIG_DIR` (`GOMAD_CONFIG_DIR` o `app/config`)
- `to_float(v) -> float | None` (coma decimal, vacíos, `None`)
- `ine_code(v) -> str | None` (`"6"`→`"28006"`, `"079"`→`"28079"`, `"28079"`→`"28079"`, vacío/`RESERVADO`→`None`)
- `normalize_name(name: str) -> str` («Rozas de Madrid (Las)» y «Las Rozas de Madrid» → mismo valor)
- `to_wgs84(xs, ys) -> tuple[np.ndarray, np.ndarray]` desde EPSG:25830
- `municipalities() -> GeoDataFrame` (EPSG:4326; `ine_code`, `name`, `name_norm`, `geometry`), cacheada
- `assign_municipality(gdf) -> gdf` (rellena `ine_code` por punto en polígono donde falte)
- `filter_region(gdf) -> tuple[gdf, int]` (quita fuera de la Comunidad y (0,0); devuelve descartados)
- `read_csv(path, sep=";") -> DataFrame` (`utf-8-sig` y si falla `cp1252`; todo como texto)
- `points(df, x, y, crs) -> GeoDataFrame` (`crs` 25830 o 4326; sin filas sin coordenadas)
- `write(gdf, name: str) -> Path` (GeoParquet en `CLEAN/<name>.parquet`, vía `.tmp` + `os.replace`)
- `REGISTRY: dict[str, Callable]`, decorador `@normalizer("name")`, `load_all()`; CLI `python -m normalize [names…]`

- [ ] **Paso 1: pruebas que fallan** — `tests/test_common.py`

```python
import numpy as np
import pandas as pd
import pytest

import common


@pytest.mark.parametrize("v,expected", [("40,123", 40.123), ("40.5", 40.5), ("", None), (None, None),
                                        (" -3,7 ", -3.7), ("abc", None), (12, 12.0)])
def test_to_float(v, expected):
    assert common.to_float(v) == expected


@pytest.mark.parametrize("v,expected", [("6", "28006"), ("079", "28079"), ("28079", "28079"), (65, "28065"),
                                        ("", None), ("RESERVADO", None), (None, None)])
def test_ine_code(v, expected):
    assert common.ine_code(v) == expected


def test_normalize_name():
    assert common.normalize_name("Rozas de Madrid (Las)") == common.normalize_name("LAS ROZAS DE MADRID")
    assert common.normalize_name("Álamo, El") == common.normalize_name("El Álamo")


def test_reprojection_getafe():
    # portal de prueba de D-04 (calle Madrid 10, Getafe): x 437838,98 / y 4461942,01
    lon, lat = common.to_wgs84(np.array([437838.98]), np.array([4461942.01]))
    assert -3.8 < lon[0] < -3.65 and 40.25 < lat[0] < 40.35


def test_read_csv_cp1252(tmp_path):
    path = tmp_path / "x.csv"
    path.write_bytes("Territorio;Valor\nMóstoles;1\n".encode("cp1252"))
    assert common.read_csv(path).loc[0, "Territorio"] == "Móstoles"


def test_read_csv_utf8_bom(tmp_path):
    path = tmp_path / "x.csv"
    path.write_bytes("﻿municipio;valor\nGetafe;1\n".encode("utf-8"))
    assert list(common.read_csv(path).columns) == ["municipio", "valor"]


def test_data_dir_is_shared_app_data():
    assert common.DATA_DIR.name == "data" and common.DATA_DIR.parent == common.APP_DIR


@pytest.mark.slow
def test_there_are_179_municipalities():
    m = common.municipalities()
    assert len(m) == 179 and m["ine_code"].str.match(r"^28\d{3}$").all()
    assert m.crs.to_epsg() == 4326


@pytest.mark.slow
def test_filter_region_drops_outside_and_zeros():
    df = pd.DataFrame({"x": [437838.98, 0, 100000], "y": [4461942.01, 0, 4000000]})
    inside, dropped = common.filter_region(common.points(df, "x", "y", 25830))
    assert len(inside) == 1 and dropped == 2
```

Run: `.venv/bin/pytest tests/test_common.py -v` → Esperado: FAIL. (`test_data_dir_is_shared_app_data` supone que `GOMAD_DATA_DIR` no está definida en el entorno local.)

- [ ] **Paso 2: implementar** — `common.py`

```python
"""Utilidades comunes de normalizacion (informe-datos §2 y §4)."""
import functools
import os
import pathlib
import unicodedata

import geopandas as gpd
import numpy as np
import pandas as pd
from pyproj import Transformer

ROOT = pathlib.Path(__file__).resolve().parent                                  # app/ingest
APP_DIR = ROOT.parent                                                           # app
DATA_DIR = pathlib.Path(os.environ.get("GOMAD_DATA_DIR", APP_DIR / "data"))     # volumen compartido
CONFIG_DIR = pathlib.Path(os.environ.get("GOMAD_CONFIG_DIR", APP_DIR / "config"))
RAW = DATA_DIR / "raw"
CLEAN = DATA_DIR / "clean"
_TO_WGS84 = Transformer.from_crs(25830, 4326, always_xy=True)
_ARTICLES = ("el", "la", "los", "las")


def to_float(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return None if pd.isna(v) else float(v)
    s = str(v).strip().replace(",", ".")
    try:
        return float(s) if s else None
    except ValueError:
        return None


def ine_code(v):
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


def normalize_name(name):
    s = unicodedata.normalize("NFKD", str(name)).encode("ascii", "ignore").decode().lower().strip()
    for art in _ARTICLES:
        # "rozas de madrid (las)" y "alamo, el" -> articulo delante
        if s.endswith(f"({art})"):
            s = f"{art} " + s[: -len(art) - 2].strip()
        elif s.endswith(f", {art}"):
            s = f"{art} " + s[: -len(art) - 2].strip()
    return " ".join(s.replace("-", " ").split())


def to_wgs84(xs, ys):
    lon, lat = _TO_WGS84.transform(np.asarray(xs, dtype=float), np.asarray(ys, dtype=float))
    return np.asarray(lon), np.asarray(lat)


def read_csv(path, sep=";"):
    for encoding in ("utf-8-sig", "cp1252"):
        try:
            return pd.read_csv(path, sep=sep, dtype=str, encoding=encoding, keep_default_na=False)
        except UnicodeDecodeError:
            continue
    raise ValueError(f"Codificación no reconocida: {path}")


def points(df, x, y, crs):
    xs, ys = df[x].map(to_float), df[y].map(to_float)
    ok = xs.notna() & ys.notna()
    df, xs, ys = df[ok].copy(), xs[ok].to_numpy(), ys[ok].to_numpy()
    if crs == 25830:
        xs, ys = to_wgs84(xs, ys)
    return gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(xs, ys), crs=4326)


@functools.cache
def municipalities():
    g = gpd.read_file(RAW / "municipios" / "municipios.geojson")
    g = g.set_crs(25830, allow_override=True).to_crs(4326)
    g["ine_code"] = g["CDMUNICIPIO"].map(ine_code)
    g["name"] = g["DSMUNICIPIO"]
    g["name_norm"] = g["name"].map(normalize_name)
    return g[["ine_code", "name", "name_norm", "geometry"]]


def assign_municipality(gdf):
    missing = gdf["ine_code"].isna() if "ine_code" in gdf else pd.Series(True, index=gdf.index)
    if missing.any():
        joined = gpd.sjoin(gdf.loc[missing, ["geometry"]], municipalities()[["ine_code", "geometry"]],
                           how="left", predicate="within")
        joined = joined[~joined.index.duplicated()]
        gdf.loc[missing, "ine_code"] = joined["ine_code"]
    return gdf


def filter_region(gdf):
    region = municipalities().union_all()
    geom = gdf.geometry
    ok = ~((geom.x == 0) & (geom.y == 0)) if (geom.geom_type == "Point").all() else pd.Series(True, index=gdf.index)
    ok &= geom.intersects(region)
    return gdf[ok].copy(), int((~ok).sum())


def write(gdf, name):
    CLEAN.mkdir(parents=True, exist_ok=True)
    target = CLEAN / f"{name}.parquet"
    tmp = target.with_suffix(".tmp")
    gdf.to_parquet(tmp, index=False)
    os.replace(tmp, target)
    return target
```

> Comprobar en la primera ejecución (`test_there_are_179_municipalities`) que el GeoJSON está de verdad en 25830 (antes de reproyectar, coordenadas ~370.000–500.000 / 4.410.000–4.560.000). Si no, ajustar `set_crs`.

`normalize/__init__.py`:

```python
"""Registro de normalizadores: uno por fuente -> app/data/clean/<nombre>.parquet.

Uso: python -m normalize                  # todos
     python -m normalize green poi         # solo esos
"""
import importlib
import pkgutil

REGISTRY = {}


def normalizer(name):
    def register(func):
        REGISTRY[name] = func
        return func
    return register


def load_all():
    for m in pkgutil.iter_modules(__path__):
        if m.name != "__main__":
            importlib.import_module(f"{__name__}.{m.name}")
    return REGISTRY
```

`normalize/__main__.py`:

```python
import sys
import traceback

from normalize import load_all

registry = load_all()
names = sys.argv[1:] or list(registry)
failures = 0
for name in names:
    try:
        print(f"-> {name}: {registry[name]()}")
    except Exception:  # una fuente rota no para el resto; el parquet anterior se mantiene
        failures += 1
        traceback.print_exc()
sys.exit(1 if failures else 0)
```

- [ ] **Paso 3:** Run: `.venv/bin/pytest tests/test_common.py -v` → Esperado: PASS (las `slow` también, con `app/data/raw`).
- [ ] **Paso 4: commit** — `git -C ../.. add app/ingest/common.py app/ingest/normalize app/ingest/tests/test_common.py && git -C ../.. commit -m "Ingesta: utilidades comunes de normalización"`

**Terminado cuando:** las pruebas pasan con los datos reales descargados.

---

### Task 17: J-D2 · Normalizadores de referencia y diario (municipios, padrón, deporte, verde, mobiliario)

**Rol:** Datos · **Servicio:** `app/ingest/` · **Depende de:** Task 16 · **Duración:** 3 h

**Ficheros:** Crear `normalize/municipalities.py`, `normalize/population.py`, `normalize/sports.py`, `normalize/green.py`, `normalize/furniture.py`; `tests/test_normalize_reference.py`.

**Interfaces (produce — esquemas de `app/data/clean/` que Task 19 consume):**

| Fichero | Columnas | Geometría |
|---|---|---|
| `municipality.parquet` | `ine_code`, `name`, `name_norm`, `in_eiel` (bool), `in_vpla` (bool) | polígono |
| `population.parquet` | `ine_code`, `year` (int), `population` (int) | — |
| `destination_raw.parquet` | `id`, `source`, `source_id`, `name`, `type` (`facility`/`park`/`recreation_area`), `covered`, `accessible`, `condition`, `owner`, `water`, `sports` (list[str]: columnas EIEL con «SI»), `facility_type`, `label`, `area_m2`, `url`, `ine_code` | punto |
| `green.parquet` | `id`, `source`, `ine_code`, `use_detail`, `area_m2` | polígono |
| `poi.parquet` | `id`, `type` (`fountain`, `bench`, `dog_area`, `aed`; OSM añade `bin`, `playground` en Task 20), `source`, `ine_code`, `status` (estado de origen, p. ej. `CERRADA_TEMPORALMENT`; nulo si la fuente no lo da), `working` (boolean: `False` = fuera de servicio, nulo = sin dato; decidido 15/10) | punto |

Campos de origen (comprobados en `app/data/perfil/perfil.json` el 14/10):
- `municipios`: `CDMUNICIPIO`, `DSMUNICIPIO`.
- `padron`: `Año`, `Tipo territorio`, `Código territorio`, `Territorio`, `Sexo`, `Valor` (cp1252).
- `eiel_deporte`: `PROV`, `MUN`, `ENT`, `POBLAMIENT`, `ORDEN_INST`, `NOMBRE`, `TIPOINSTAL`, `SUP_CUBI`, `TITULAR`, `ACCESOSILL`, `ESTADO` y columnas por deporte `SUBACUATIC`…`VELA`.
- `nmc_deporte`: `CMUN`, `DESCR`, `ETIQUETA`, `UTM_X`, `UTM_Y`, `ID_APP`, `URL`.
- `ay_polideportivos`/`ay_idb`/`ay_piscinas`/`ay_parques`: `PK`, `NOMBRE`, `LATITUD`, `LONGITUD`, `CONTENT-URL`, `EQUIPAMIENTO` (cp1252).
- `vpla_redes`: `CDID`, `CD_MUNICIPIO`, `DS_USO_GENE`, `DS_USO_DETA`, `NM_AREA`.
- `eiel_parques`: `PROV`, `MUN`, `ENT`, `POBLAMIENT`, `ORDEN_PARQ`, `NOMBRE`, `TIPOPARQUE`, `AGUA`, `ESTADO`.
- `nmc_parques`: `CMUN`, `ETIQUETA`, `UTM_X`, `UTM_Y`.
- `areas_recreativas`: `DS_NOMBRE`, `NM_COOX`, `NM_COOY`, `IT_FUENTE`.
- `ay_fuentes`/`ay_bancos`/`ay_areas_caninas`: `ID`, `COORD_GIS_X`, `COORD_GIS_Y` (25830; **no** `LATITUD/LONGITUD`, informe §2.1).
- `desfibriladores`: `codigo_dea`, `municipio_codigo`, `direccion_coordenada_x`, `direccion_coordenada_y` (25830).

- [ ] **Paso 1: pruebas que fallan** — `tests/test_normalize_reference.py`

```python
import geopandas as gpd
import pandas as pd
import pytest

from common import CLEAN, municipalities
from normalize import load_all

pytestmark = pytest.mark.slow
R = load_all()


def read(name):
    return gpd.read_parquet(CLEAN / f"{name}.parquet")


def check_points(gdf):
    assert gdf.crs.to_epsg() == 4326
    assert gdf["ine_code"].dropna().str.match(r"^28\d{3}$").all()
    region = municipalities().union_all().buffer(0.01)
    assert gdf.geometry.representative_point().within(region).all()


def test_municipality():
    R["municipality"]()
    m = read("municipality")
    assert len(m) == 179
    assert m.loc[m.ine_code == "28065", "in_eiel"].item() is False   # Getafe no esta en EIEL
    assert m.loc[m.ine_code == "28079", "in_vpla"].item() is False   # capital fuera de VPLA
    assert m["in_vpla"].sum() == 166 and m["in_eiel"].sum() == 155


def test_population():
    R["population"]()
    p = pd.read_parquet(CLEAN / "population.parquet")
    latest = p[p.year == p.year.max()]
    assert latest["ine_code"].nunique() == 179
    assert latest.loc[latest.ine_code == "28079", "population"].item() > 3_000_000


def test_destination_raw():
    R["destination_raw"]()
    d = read("destination_raw")
    check_points(d)
    assert d["id"].is_unique
    assert (d.source == "eiel_deporte").sum() == 726
    assert (d[d.source == "nmc_deporte"].ine_code == "28065").sum() == 19
    assert d[d.source == "nmc_deporte"].ine_code.nunique() == 178
    eiel = d[d.source == "eiel_deporte"]
    assert eiel["sports"].map(lambda xs: "PADEL" in xs).sum() == 154
    assert eiel["sports"].map(lambda xs: "NATACION" in xs).sum() == 0     # columna vacia (CLAUDE.md §8)


def test_green():
    R["green"]()
    v = read("green")
    vpla = v[v.source == "vpla_redes"]
    assert len(vpla) == 16_867                                             # «Zonas Verdes y Espacios Libres»
    assert vpla.ine_code.nunique() == 166
    getafe = vpla[vpla.ine_code == "28065"]
    assert len(getafe) == 648 and round(getafe.area_m2.sum() / 1e6, 1) == 33.4   # informe-datos §3


def test_poi():
    R["poi"]()
    p = read("poi")
    check_points(p)
    assert (p.type == "bench").sum() >= 76_000                             # ay_bancos por COORD_GIS (76.627)
    assert (p.type == "dog_area").sum() == 112
    assert (p.type == "aed").sum() > 12_000
```

> Las cifras salen de `docs/informe-datos.md`. Si una descarga nueva cambia una cifra, comprobar el motivo y actualizar prueba e informe en el mismo commit.

Run: `.venv/bin/pytest tests/test_normalize_reference.py -v` → Esperado: FAIL (`KeyError: 'municipality'`).

- [ ] **Paso 2: `normalize/municipalities.py`**

```python
import geopandas as gpd

from common import RAW, ine_code, municipalities, write
from normalize import normalizer


@normalizer("municipality")
def run():
    m = municipalities().copy()
    eiel = gpd.read_file(RAW / "eiel_deporte" / "eiel_deporte.geojson", columns=["MUN"], ignore_geometry=True)
    vpla = gpd.read_file(RAW / "vpla_redes" / "vpla_redes.geojson", columns=["CD_MUNICIPIO"], ignore_geometry=True)
    # los 155 municipios de EIEL son los que tienen filas en la capa de deporte
    m["in_eiel"] = m["ine_code"].isin(set(eiel["MUN"].map(ine_code)))
    m["in_vpla"] = m["ine_code"].isin(set(vpla["CD_MUNICIPIO"].map(ine_code)))
    return write(m, "municipality")
```

- [ ] **Paso 3: `normalize/population.py`**

```python
import pandas as pd

from common import CLEAN, RAW, municipalities, normalize_name, read_csv
from normalize import normalizer


@normalizer("population")
def run():
    df = read_csv(next((RAW / "padron").glob("*.csv")))
    # padron mezcla municipios, zonas estadisticas y total regional (informe-datos §2.12)
    df = df[df["Tipo territorio"].str.lower().str.startswith("municipio")]
    df = df[df["Sexo"].str.lower().isin(["total", "ambos sexos"])]
    by_name = dict(zip(municipalities()["name_norm"], municipalities()["ine_code"]))
    df["ine_code"] = df["Territorio"].map(lambda t: by_name.get(normalize_name(t)))
    unmatched = df["ine_code"].isna().sum()
    if unmatched:
        print(f"   population: {unmatched} filas sin casar por nombre:",
              sorted(df.loc[df.ine_code.isna(), "Territorio"].unique())[:10])
    out = pd.DataFrame({"ine_code": df["ine_code"], "year": df["Año"].astype(int),
                        "population": df["Valor"].map(lambda v: int(float(str(v).replace(".", "").replace(",", "."))))})
    out = out.dropna(subset=["ine_code"])
    CLEAN.mkdir(parents=True, exist_ok=True)
    target = CLEAN / "population.parquet"
    out.to_parquet(target, index=False)
    return target
```

> **Antes de ejecutar**, mirar en el perfil los valores reales de `Tipo territorio`, `Sexo` y el formato de `Valor` (separador de miles) y ajustar filtros y conversión a esos literales. Si `Código territorio` trae el código INE, usarlo con `ine_code()` en vez del nombre.

- [ ] **Paso 4: `normalize/sports.py`**

```python
import geopandas as gpd
import pandas as pd

from common import RAW, assign_municipality, filter_region, ine_code, points, read_csv, to_float, write
from normalize import normalizer

SPORT_COLUMNS = ["SUBACUATIC", "ATLETISMO", "BEISBOL", "BALONCESTO", "BALONMANO", "BOLOS", "BALONVOLEA",
                 "DEPINVIERN", "ESQUINAUTI", "FUTBOL", "GOLF", "GIMNASIA", "JUDOKARATE", "LUCHA", "NATACION",
                 "OTROS", "PADEL", "PELOTA", "PIRAGUISMO", "PATINAJE", "REMO", "TENIS", "TIROALPLAT", "VELA"]
COLUMNS = ["id", "source", "source_id", "name", "type", "covered", "accessible", "condition", "owner", "water",
           "sports", "facility_type", "label", "area_m2", "url", "ine_code", "geometry"]


def is_yes(v):
    return str(v).strip().upper() == "SI"


def eiel_sports():
    g = gpd.read_file(RAW / "eiel_deporte" / "eiel_deporte.geojson").set_crs(25830, allow_override=True).to_crs(4326)
    g["geometry"] = g.geometry.representative_point()
    g["source_id"] = g[["PROV", "MUN", "ENT", "POBLAMIENT", "ORDEN_INST"]].astype(str).agg("-".join, axis=1)
    g["source"], g["type"] = "eiel_deporte", "facility"
    g["name"] = g["NOMBRE"]
    g["covered"] = g["SUP_CUBI"].map(lambda v: (to_float(v) or 0) > 0)
    g["accessible"] = g["ACCESOSILL"].map(lambda v: None if not v else not str(v).upper().startswith("SIN"))
    g["condition"], g["owner"], g["facility_type"] = g["ESTADO"], g["TITULAR"], g["TIPOINSTAL"]
    g["sports"] = g[SPORT_COLUMNS].apply(lambda row: [c for c in SPORT_COLUMNS if is_yes(row[c])], axis=1)
    g["ine_code"] = g["MUN"].map(ine_code)
    return g


def nmc_sports():
    df = gpd.read_file(next((RAW / "nmc_deporte").glob("*.shp")), ignore_geometry=True)   # .prj no fiable
    g = points(df, "UTM_X", "UTM_Y", 25830)
    g["source_id"] = g["ID_APP"].where(g["ID_APP"].astype(str).str.strip() != "", g.index.astype(str))
    g["source"], g["type"] = "nmc_deporte", "facility"
    g["name"], g["label"], g["url"] = g["DESCR"], g["ETIQUETA"], g["URL"]
    g["ine_code"] = g["CMUN"].map(ine_code)
    g["sports"] = [[] for _ in range(len(g))]
    return g


def city_council(source):
    g = points(read_csv(next((RAW / source).glob("*.csv"))), "LONGITUD", "LATITUD", 4326)
    g["source_id"], g["source"], g["type"] = g["PK"], source, "facility"
    g["name"], g["url"], g["label"] = g["NOMBRE"], g["CONTENT-URL"], g["EQUIPAMIENTO"]
    g["ine_code"] = "28079"
    g["sports"] = [[] for _ in range(len(g))]
    return g


@normalizer("destination_raw")
def run():
    from normalize.green import green_destinations   # los parques tambien son destinos
    parts = [eiel_sports(), nmc_sports()] + [city_council(s) for s in ("ay_polideportivos", "ay_idb", "ay_piscinas")]
    parts += green_destinations()
    alldest = pd.concat([p.reindex(columns=COLUMNS) for p in parts], ignore_index=True)
    alldest["id"] = alldest["source"] + ":" + alldest["source_id"].astype(str)
    alldest = gpd.GeoDataFrame(alldest, geometry="geometry", crs=4326)
    alldest = assign_municipality(alldest)
    alldest, dropped = filter_region(alldest)
    print(f"   destination_raw: {len(alldest)} destinos, {dropped} fuera de la Comunidad descartados")
    return write(alldest, "destination_raw")
```

> Si `id` no es único en EIEL, añadir `NOMBRE` al `source_id` y anotarlo. `ACCESOSILL`: mirar los literales reales en el perfil (el informe habla de 77 «SIN ACCESO») y ajustar la regla.

- [ ] **Paso 5: `normalize/green.py`**

```python
import geopandas as gpd

from common import RAW, ine_code, points, read_csv, to_float, write
from normalize import normalizer

YES_VALUES = ("S", "SI", "1", "TRUE")   # ajustar a los literales reales de IT_FUENTE y AGUA (perfil)


def vpla_green():
    g = gpd.read_file(RAW / "vpla_redes" / "vpla_redes.geojson").set_crs(25830, allow_override=True)
    g = g[g["DS_USO_GENE"] == "Zonas Verdes y Espacios Libres"].to_crs(4326)
    g["id"] = "vpla_redes:" + g["CDID"].astype(str)
    g["source"], g["ine_code"], g["use_detail"] = "vpla_redes", g["CD_MUNICIPIO"].map(ine_code), g["DS_USO_DETA"]
    g["area_m2"] = g["NM_AREA"].map(to_float)
    return g[["id", "source", "ine_code", "use_detail", "area_m2", "geometry"]]


def green_destinations():
    """Parques y areas como destinos puntuales (type park / recreation_area)."""
    v = vpla_green()
    p1 = v.assign(geometry=v.geometry.representative_point(), source_id=v["id"].str.split(":").str[1],
                  name=v["use_detail"], type="park", covered=False, label=v["use_detail"])
    e = gpd.read_file(RAW / "eiel_parques" / "eiel_parques.geojson").set_crs(25830, allow_override=True).to_crs(4326)
    p2 = e.assign(geometry=e.geometry.representative_point(),
                  source_id=e[["PROV", "MUN", "ENT", "POBLAMIENT", "ORDEN_PARQ"]].astype(str).agg("-".join, axis=1),
                  source="eiel_parques", name=e["NOMBRE"], type="park", covered=False,
                  water=e["AGUA"].map(lambda x: str(x).strip().upper() in YES_VALUES if x else None),
                  condition=e["ESTADO"], label=e["TIPOPARQUE"], ine_code=e["MUN"].map(ine_code))
    n = gpd.read_file(next((RAW / "nmc_parques").glob("*.shp")), ignore_geometry=True)   # .prj erroneo (informe §2.2)
    n = points(n, "UTM_X", "UTM_Y", 25830)
    p3 = n.assign(source_id=n.index.astype(str), source="nmc_parques", name=n["ETIQUETA"], type="park",
                  covered=False, ine_code=n["CMUN"].map(ine_code))
    a = gpd.read_file(RAW / "areas_recreativas" / "areas_recreativas.geojson", ignore_geometry=True)
    a = points(a, "NM_COOX", "NM_COOY", 25830)
    # sin codigo de municipio (DS_MUNI es nombre): assign_municipality lo pone por geometria
    p4 = a.assign(source_id=a.index.astype(str), source="areas_recreativas", name=a["DS_NOMBRE"],
                  type="recreation_area", covered=False, ine_code=None,
                  water=a["IT_FUENTE"].map(lambda x: str(x).strip().upper() in YES_VALUES))
    ay = points(read_csv(next((RAW / "ay_parques").glob("*.csv"))), "LONGITUD", "LATITUD", 4326)
    p5 = ay.assign(source_id=ay["PK"], source="ay_parques", name=ay["NOMBRE"], type="park", covered=False,
                   ine_code="28079", url=ay["CONTENT-URL"])
    for p in (p1, p2, p3, p4, p5):
        if "sports" not in p:
            p["sports"] = [[] for _ in range(len(p))]
    return [p1, p2, p3, p4, p5]


@normalizer("green")
def run():
    return write(vpla_green(), "green")
```

- [ ] **Paso 6: `normalize/furniture.py`**

```python
import pandas as pd

from common import RAW, assign_municipality, filter_region, ine_code, points, read_csv, write
from normalize import normalizer

CITY_COUNCIL = {"ay_fuentes": "fountain", "ay_bancos": "bench", "ay_areas_caninas": "dog_area"}


@normalizer("poi")
def run():
    parts = []
    for source, kind in CITY_COUNCIL.items():
        # COORD_GIS_X/Y (25830): LATITUD/LONGITUD casi vacias en bancos y areas caninas (informe §2.1)
        g = points(read_csv(next((RAW / source).glob("*.csv"))), "COORD_GIS_X", "COORD_GIS_Y", 25830)
        parts.append(g.assign(id=source + ":" + g["ID"].astype(str), type=kind, source=source, ine_code="28079"))
    d = points(read_csv(next((RAW / "desfibriladores").glob("*.csv"))),
               "direccion_coordenada_x", "direccion_coordenada_y", 25830)
    parts.append(d.assign(id="desfibriladores:" + d["codigo_dea"].astype(str), type="aed", source="desfibriladores",
                          ine_code=d["municipio_codigo"].map(ine_code)))
    allpoi = pd.concat([p[["id", "type", "source", "ine_code", "geometry"]] for p in parts], ignore_index=True)
    allpoi = assign_municipality(allpoi.set_geometry("geometry"))
    allpoi, dropped = filter_region(allpoi)
    allpoi = allpoi.drop_duplicates("id")
    print(f"   poi: {len(allpoi)} puntos ({dropped} fuera)")
    return write(allpoi, "poi")
```

> El mobiliario de **OSM** se añade en Task 20, que ya lee el `.pbf`.

- [ ] **Paso 7:** Run: `.venv/bin/python -m normalize municipality population green destination_raw poi && .venv/bin/pytest tests -v` → Esperado: PASS. Corregir lo que salga en «sin casar» o «fuera».
- [ ] **Paso 8: commit** — `git -C ../.. add app/ingest/normalize app/ingest/tests && git -C ../.. commit -m "Ingesta: normalizadores de municipios, padrón, deporte, verde y mobiliario"`

**Terminado cuando:** los cinco parquet existen y las pruebas con las cifras del informe pasan.

---

### Task 18: J-D3 · Normalizadores de aire (estaciones y lecturas) y de AEMET

**Rol:** Datos · **Servicio:** `app/ingest/` · **Depende de:** Tasks 16, 4 · **Duración:** 2,5 h

**Ficheros:** Crear `normalize/air.py`, `normalize/aemet.py`, `tests/test_normalize_realtime.py`, `tests/data/aire_dia_sample.csv` (15 filas reales con cabecera).

**Interfaces (produce):**

| Fichero (en `app/data/clean/`) | Columnas |
|---|---|
| `air_station.parquet` | `id` (8 dígitos `28MMMEEE`), `network` (`CM`/`AY`), `name`, `ine_code`, `area_type`, geometría punto |
| `air_reading/<fuente>_<AAAAMMDD>.parquet` | `station_id`, `magnitude` (int), `ts` (hora local, **fin** de la hora: `h01` = 01:00), `value`, `flag` (`T`/`V`) |
| `forecast/<ine>.parquet` | `ine_code`, `ts`, `temp`, `feels_like`, `precip_prob`, `precip`, `wind`, `sky`, `issued` |

- Funciones: `long_readings(df) -> DataFrame` (de `h01…h24`/`v01…v24` a formato largo; acepta mayúsculas del Ayuntamiento), `municipality_forecast(doc: dict, ine: str) -> DataFrame`.
- Reglas de informe-datos §2: fecha **por fila** (`ano`, `mes`, `dia`), aceptar `T` y `V`, descartar `N`; código de municipio sin ceros → `ine_code`.

> **`h24`** = 24:00 = 00:00 del día siguiente. Comprobarlo en la descripción oficial del fichero (enlace en `umbrales.md` §1.2) antes de fusionar; la prueba fija la convención.

- [ ] **Paso 1: pruebas que fallan** — `tests/test_normalize_realtime.py`

```python
import json
from datetime import datetime

import pandas as pd
import pytest

from common import ROOT, read_csv
from normalize.aemet import municipality_forecast
from normalize.air import long_readings

DATA = ROOT / "tests" / "data"


def test_air_date_per_row():
    df = read_csv(DATA / "aire_dia_sample.csv")
    long = long_readings(df)
    row = df.iloc[0]
    expected_day = datetime(int(row["ano"]), int(row["mes"]), int(row["dia"]))
    assert long["ts"].min() >= pd.Timestamp(expected_day)          # no supone «hoy»
    assert set(long["flag"]) <= {"T", "V"}                          # N descartado
    assert long["station_id"].str.match(r"^28\d{6}$").all()


def test_air_h24_is_next_midnight():
    df = pd.DataFrame([{"provincia": "28", "municipio": "65", "estacion": "14", "magnitud": "8",
                        "punto_muestreo": "x", "ano": "2026", "mes": "10", "dia": "13",
                        **{f"h{i:02d}": "" for i in range(1, 25)}, **{f"v{i:02d}": "N" for i in range(1, 25)},
                        "h24": "12", "v24": "V"}])
    long = long_readings(df)
    assert list(long["ts"]) == [pd.Timestamp("2026-10-14 00:00")]
    assert long["station_id"].item() == "28065014"


def test_air_city_council_uppercase():
    df = pd.DataFrame([{"PROVINCIA": "28", "MUNICIPIO": "079", "ESTACION": "4", "MAGNITUD": "14",
                        "PUNTO_MUESTREO": "x", "ANO": "2026", "MES": "10", "DIA": "14",
                        **{f"H{i:02d}": "" for i in range(1, 25)}, **{f"V{i:02d}": "N" for i in range(1, 25)},
                        "H08": "55", "V08": "V"}])
    long = long_readings(df)
    assert long["station_id"].item() == "28079004" and long["value"].item() == 55.0


@pytest.mark.skipif(not (DATA / "aemet_28065.json").exists(), reason="muestra de Task 4")
def test_aemet_hourly_forecast():
    doc = json.loads((DATA / "aemet_28065.json").read_text(encoding="utf-8"))
    f = municipality_forecast(doc[0] if isinstance(doc, list) else doc, "28065")
    assert len(f) >= 24
    assert f["ts"].is_monotonic_increasing and f["ts"].is_unique
    assert f["temp"].notna().all()
    assert f["precip_prob"].between(0, 100).all()
    assert (f["precip"] >= 0).all()
```

Run → Esperado: FAIL.

- [ ] **Paso 2: `normalize/air.py`**

```python
import datetime as dt

import geopandas as gpd
import pandas as pd

from common import CLEAN, RAW, ine_code, points, read_csv, to_float, write
from normalize import normalizer

AQI_MAGNITUDES = {1, 8, 9, 10, 14}   # SO2, NO2, PM2.5, PM10, O3 (umbrales.md §1.2)


def long_readings(df):
    df = df.rename(columns=str.lower)
    rows = []
    for _, r in df.iterrows():
        magnitude = int(r["magnitud"])
        if magnitude not in AQI_MAGNITUDES:
            continue
        station = f"{ine_code(r['municipio'])}{int(r['estacion']):03d}"
        day = dt.datetime(int(r["ano"]), int(r["mes"]), int(r["dia"]))
        for h in range(1, 25):
            value, flag = to_float(r[f"h{h:02d}"]), str(r[f"v{h:02d}"]).strip().upper()
            if value is None or flag not in ("T", "V"):
                continue
            rows.append((station, magnitude, day + dt.timedelta(hours=h), value, flag))
    return pd.DataFrame(rows, columns=["station_id", "magnitude", "ts", "value", "flag"])


@normalizer("air_reading")
def run_readings():
    out_dir = CLEAN / "air_reading"
    out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for source in ("aire_dia", "ay_aire"):
        long = long_readings(read_csv(next((RAW / source).glob("*.csv"))))
        for day, group in long.groupby(long["ts"].dt.strftime("%Y%m%d")):
            target = out_dir / f"{source}_{day}.parquet"
            if target.exists():   # el mismo dia llega varias veces: V gana a T, lo nuevo a lo viejo
                old = pd.read_parquet(target)
                group = (pd.concat([old, group]).sort_values("flag", key=lambda s: s.eq("V"))
                         .drop_duplicates(["station_id", "magnitude", "ts"], keep="last"))
            group.to_parquet(target, index=False)
            written.append(target)
    return written


@normalizer("air_station")
def run_stations():
    cm = points(read_csv(next((RAW / "aire_estaciones").glob("*.csv"))),
                "estacion_coord_UTM_ETRS89_x", "estacion_coord_UTM_ETRS89_y", 25830)
    cm = cm.assign(id=cm["estacion_codigo"].astype(str).str.zfill(8), network="CM",
                   name=cm["estacion_municipio"], area_type=cm["estacion_tipo_area"])
    ay = points(read_csv(next((RAW / "ay_aire_estaciones").glob("*.csv"))), "LONGITUD", "LATITUD", 4326)
    ay = ay.assign(id=ay["CODIGO"].astype(str).str.zfill(8), network="AY", name=ay["ESTACION"], area_type=ay["NOM_TIPO"])
    stations = pd.concat([cm, ay], ignore_index=True)
    stations["ine_code"] = stations["id"].str[:5]
    return write(gpd.GeoDataFrame(stations[["id", "network", "name", "ine_code", "area_type", "geometry"]], crs=4326),
                 "air_station")
```

> **Comprobar con datos reales:** que `estacion_codigo` (CM) y `CODIGO` (Ayto.) tienen el formato `28MMMEEE` que generan las lecturas (Getafe = `28065014`); si no, construir el id igual que en `long_readings`. Añadir en el paso 4 la prueba `slow` **toda `station_id` de las lecturas existe en `air_station`**.

- [ ] **Paso 3: `normalize/aemet.py`** (estructura según CLAUDE.md §7.1; **ajustar a lo documentado en Task 4**)

```python
import datetime as dt
import json

import pandas as pd

from common import CLEAN, RAW, to_float
from normalize import normalizer


def _hourly(items, day):
    """[{value, periodo:'07'}] -> {datetime: valor}. Ignora periodos que no sean una hora."""
    out = {}
    for e in items or []:
        p = str(e.get("periodo", ""))
        if len(p) == 2 and p.isdigit():
            v = e.get("value")
            out[day + dt.timedelta(hours=int(p))] = 0.0 if str(v).lower() == "ip" else to_float(v)
    return out


def _by_band(items, day):
    """probPrecipitacion: [{value, periodo:'0208'}] -> valor para cada hora de la franja."""
    out = {}
    for e in items or []:
        p = str(e.get("periodo", ""))
        if len(p) == 4 and p.isdigit():
            start, end = int(p[:2]), int(p[2:]) or 24
            end = end if end > start else end + 24
            for h in range(start, end):
                out[day + dt.timedelta(hours=h)] = to_float(e.get("value"))
    return out


def municipality_forecast(doc, ine):
    rows = {}
    for d in doc["prediccion"]["dia"]:
        day = dt.datetime.fromisoformat(d["fecha"][:10])
        series = {"temp": _hourly(d.get("temperatura"), day),
                  "feels_like": _hourly(d.get("sensTermica"), day),
                  "precip": _hourly(d.get("precipitacion"), day),
                  "precip_prob": _by_band(d.get("probPrecipitacion"), day),
                  "sky": {day + dt.timedelta(hours=int(e["periodo"])): e.get("descripcion")
                          for e in d.get("estadoCielo", [])
                          if str(e.get("periodo", "")).isdigit() and len(str(e["periodo"])) == 2}}
        for column, values in series.items():
            for ts, v in values.items():
                rows.setdefault(ts, {})[column] = v
    df = pd.DataFrame([{"ts": ts, **v} for ts, v in sorted(rows.items())])
    df = df[df["temp"].notna()].copy()
    df["ine_code"], df["issued"] = ine, doc.get("elaborado")
    for c in ("feels_like", "precip_prob", "precip", "wind", "sky"):
        if c not in df:
            df[c] = None
    return df[["ine_code", "ts", "temp", "feels_like", "precip_prob", "precip", "wind", "sky", "issued"]]


@normalizer("forecast")
def run():
    out_dir = CLEAN / "forecast"
    out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for path in sorted((RAW / "aemet").glob("28???.json")):
        raw = path.read_bytes()
        try:
            doc = json.loads(raw.decode("utf-8"))
        except UnicodeDecodeError:
            doc = json.loads(raw.decode("latin-1"))
        doc = doc[0] if isinstance(doc, list) else doc
        target = out_dir / f"{path.stem}.parquet"
        municipality_forecast(doc, path.stem).to_parquet(target, index=False)
        written.append(target)
    return written
```

> `wind` queda vacío en el MVP (ninguna regla lo usa). Si `probPrecipitacion` viene **por hora**, usar `_hourly` para ese campo (la prueba con la muestra real lo detecta).

- [ ] **Paso 4:** `head -16 ../data/raw/aire_dia/calidad_aire_datos_dia.csv > tests/data/aire_dia_sample.csv`; añadir la prueba de cobertura de estaciones; Run: `.venv/bin/python -m normalize air_station air_reading forecast && .venv/bin/pytest tests -v` → Esperado: PASS.
- [ ] **Paso 5 (P-12):** ejecutar `python3 scripts/download_sources.py --only aire_dia` a las 09:00, 12:00 y 16:00 y apuntar en `../../docs/PENDIENTES.md` P-12 a qué hora el fichero regional pasa al día en curso.
- [ ] **Paso 6: commit** — `git -C ../.. add app/ingest/normalize app/ingest/tests docs/PENDIENTES.md && git -C ../.. commit -m "Ingesta: aire en formato largo con fecha por fila y previsión horaria de AEMET"`

**Terminado cuando:** las pruebas pasan con la muestra real de AEMET y todas las estaciones de las lecturas casan con `air_station`.

---

### Task 19: J-D4 · `build_db.py`: `gomad.duckdb` y `realtime.duckdb` con sustitución atómica

**Rol:** Datos · **Servicio:** `app/ingest/` · **Depende de:** Tasks 17, 18 · **Duración:** 2,5 h

**Ficheros:** Crear `build_db.py`, `tests/test_build_db.py`. Lee `../config/activities.yaml` (DEC-08).

> Se llama `build_db.py` (no `build.py`) para no tapar el paquete `build` de PyPI que usa `pip`.

**Interfaces (produce; `repository` de la API, el viernes, consume):**

`app/data/gomad.duckdb`:
- `municipality(ine_code, name, population, in_eiel, in_vpla, geom GEOMETRY)`
- `destination(id, source, name, type, covered, accessible, condition, owner, water, url, ine_code, lon, lat, green DOUBLE NULL, updated TIMESTAMP)` — `green` = fracción 0–1 del círculo de 300 m alrededor del destino cubierta por `green.parquet`; `NULL` en municipios sin VPLA. Radio = **criterio propio** (DEC-07).
- `destination_activity(destination_id, activity, suitability)` — de `config/activities.yaml`
- `air_station(id, network, name, ine_code, area_type, lon, lat)`
- `route_poi(id, type, source, ine_code, status, working, lon, lat)` — `status`: estado de origen (p. ej. `CERRADA_TEMPORALMENT`), nulo si no hay; `working`: boolean, nulo = sin dato
- `source_date(source, downloaded, modified)` (de `manifest.json`, RF-19)

`app/data/realtime.duckdb`:
- `air_reading(station_id, magnitude, ts, value, flag)` (últimos 3 días)
- `aqi_hourly(station_id, ts, pollutant, mean, n_hours)` — media móvil: NO2/SO2 1 h, O3 8 h, PM 24 h (`umbrales.md` §1.2) — `n_hours` = horas con dato en la ventana; la tabla **no** filtra por cobertura: quien la consuma (`repository`, V-M1) debe exigir un mínimo antes de dar categoría ICA (una hora suelta de O₃ o PM no es el ICA). El mínimo es decisión del equipo (propuesta: 75 %, 6 de 8 h para O₃ y 18 de 24 h para PM, criterio propio) y va en `config/ica_thresholds.yaml`, no en código.
- `forecast(ine_code, ts, temp, feels_like, precip_prob, precip, wind, sky, issued)`

Funciones: `build_main(target, rules=None) -> Path`, `build_realtime(target) -> Path`, `apply_activities(destinations, rules) -> DataFrame`, `create_aqi_hourly(con)`, `atomic(target, fill_fn) -> Path`; CLI `python -m build_db {main|realtime|all}`.

**Formato de `config/activities.yaml`** (contrato; valores de DEC-08):

```yaml
activities:
  - id: swim
    label: Nadar                  # texto visible, en espanol
    icon: pool
    outdoor: null
    rules:                        # encaja si cumple CUALQUIER regla; suitability = la mayor
      - {source: eiel_deporte, field: facility_type, in: ["PISCINAS AL AIRE LIBRE", "PISCINAS CUBIERTAS"], suitability: 1.0}
      - {source: nmc_deporte, field: name, contains: ["piscina"], suitability: 0.9}
      - {source: ay_piscinas, suitability: 1.0}
  # claves de una regla: source (obligatoria), field + in | contains, sport (columna EIEL en `sports`), type, suitability
```

- [ ] **Paso 1: pruebas que fallan** — `tests/test_build_db.py`

```python
import duckdb
import pandas as pd
import pytest

import build_db

TEST_RULES = {"activities": [
    {"id": "swim", "label": "Nadar", "icon": "pool", "outdoor": None, "rules": [
        {"source": "eiel_deporte", "field": "facility_type", "in": ["PISCINAS CUBIERTAS"], "suitability": 1.0},
        {"source": "nmc_deporte", "field": "name", "contains": ["piscina"], "suitability": 0.9}]},
    {"id": "padel", "label": "Pádel", "icon": "sports_tennis", "outdoor": None, "rules": [
        {"source": "eiel_deporte", "sport": "PADEL", "suitability": 1.0},
        {"source": "nmc_deporte", "field": "name", "contains": ["pádel", "padel"], "suitability": 0.8}]},
]}


def sample_destinations():
    return pd.DataFrame([
        {"id": "eiel_deporte:1", "source": "eiel_deporte", "name": "Piscina cubierta", "facility_type": "PISCINAS CUBIERTAS", "sports": []},
        {"id": "eiel_deporte:2", "source": "eiel_deporte", "name": "Polideportivo", "facility_type": "OTROS", "sports": ["PADEL"]},
        {"id": "nmc_deporte:3", "source": "nmc_deporte", "name": "Pistas de PÁDEL Norte", "facility_type": None, "sports": []},
        {"id": "nmc_deporte:4", "source": "nmc_deporte", "name": "Campo de fútbol", "facility_type": None, "sports": []},
    ])


def test_apply_activities():
    r = build_db.apply_activities(sample_destinations(), TEST_RULES)
    assert set(zip(r.destination_id, r.activity)) == {
        ("eiel_deporte:1", "swim"), ("eiel_deporte:2", "padel"), ("nmc_deporte:3", "padel")}


def test_atomic_replace(tmp_path):
    target = tmp_path / "x.duckdb"
    target.write_bytes(b"old version")

    def fails(con):
        raise RuntimeError("fuente rota")

    with pytest.raises(RuntimeError):
        build_db.atomic(target, fails)
    assert target.read_bytes() == b"old version"                # el anterior se mantiene (arquitectura §3.3)
    build_db.atomic(target, lambda con: con.execute("CREATE TABLE t AS SELECT 1 AS a"))
    assert duckdb.connect(str(target), read_only=True).execute("SELECT a FROM t").fetchone() == (1,)


def test_aqi_moving_averages():
    hours = pd.date_range("2026-10-13 01:00", periods=30, freq="h")
    readings = pd.DataFrame({"station_id": "28065014", "magnitude": 14, "ts": hours,
                             "value": [float(i) for i in range(30)], "flag": "V"})
    con = duckdb.connect()
    con.register("air_reading", readings)
    build_db.create_aqi_hourly(con)
    row = con.execute("SELECT mean, n_hours FROM aqi_hourly WHERE pollutant='O3' AND ts = ?",
                      [hours[-1].to_pydatetime()]).fetchone()
    assert row == (sum(range(22, 30)) / 8, 8)                    # media de las 8 ultimas horas


@pytest.mark.slow
def test_build_main_real(tmp_path):
    path = build_db.build_main(tmp_path / "gomad.duckdb", rules=TEST_RULES)
    con = duckdb.connect(str(path), read_only=True)
    assert con.execute("SELECT count(*) FROM municipality").fetchone()[0] == 179
    assert con.execute("SELECT count(*) FROM destination WHERE ine_code IS NULL").fetchone()[0] == 0
    without_vpla = con.execute("SELECT count(*) FROM destination d JOIN municipality m USING (ine_code) "
                               "WHERE NOT m.in_vpla AND d.green IS NOT NULL").fetchone()[0]
    assert without_vpla == 0                                     # sin VPLA -> green NULL, no 0
    assert con.execute("SELECT count(*) FROM destination_activity WHERE activity='swim'").fetchone()[0] > 0
```

Run → Esperado: FAIL.

- [ ] **Paso 2: implementar** — `build_db.py`

```python
"""GeoParquet -> app/data/gomad.duckdb y app/data/realtime.duckdb (arquitectura §3.3).

Escribe un fichero nuevo y lo sustituye de golpe: la API (solo lectura) nunca ve un fichero a medias.
Uso: python -m build_db main | realtime | all
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

from common import CLEAN, CONFIG_DIR, DATA_DIR, RAW

GREEN_RADIUS_M = 300   # criterio propio (DEC-07)
PERIODS = {1: ("SO2", 1), 8: ("NO2", 1), 14: ("O3", 8), 10: ("PM10", 24), 9: ("PM2_5", 24)}


def atomic(target, fill_fn):
    tmp = target.with_suffix(".tmp.duckdb")
    tmp.unlink(missing_ok=True)
    con = duckdb.connect(str(tmp))
    try:
        fill_fn(con)
        con.close()
        os.replace(tmp, target)
    except Exception:
        con.close()
        tmp.unlink(missing_ok=True)
        raise
    return target


def _plain(s):
    return unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower()


def apply_activities(destinations, rules):
    rows = []
    for act in rules["activities"]:
        for rule in act["rules"]:
            sub = destinations[destinations["source"] == rule["source"]]
            if "sport" in rule:
                sub = sub[sub["sports"].map(lambda xs: rule["sport"] in list(xs))]
            if "in" in rule:
                sub = sub[sub[rule["field"]].isin(rule["in"])]
            if "contains" in rule:
                keys = [_plain(c) for c in rule["contains"]]
                sub = sub[sub[rule["field"]].map(lambda v: any(k in _plain(v) for k in keys))]
            if "type" in rule:
                sub = sub[sub["type"] == rule["type"]]
            rows += [(i, act["id"], rule["suitability"]) for i in sub["id"]]
    r = pd.DataFrame(rows, columns=["destination_id", "activity", "suitability"])
    return r.groupby(["destination_id", "activity"], as_index=False)["suitability"].max()


def green_fraction(destinations, green, municipalities):
    """Fraccion del circulo de GREEN_RADIUS_M m cubierta por zona verde (EPSG:25830). NULL si el municipio no esta en VPLA."""
    d = destinations.to_crs(25830)
    circles = gpd.GeoDataFrame({"id": d["id"]}, geometry=d.buffer(GREEN_RADIUS_M), crs=25830)
    inter = gpd.overlay(circles, green.to_crs(25830)[["geometry"]], how="intersection", keep_geom_type=True)
    area = inter.dissolve(by="id").area if len(inter) else pd.Series(dtype=float)
    frac = (area / circles.set_index("id").area).reindex(d["id"]).fillna(0.0).clip(0, 1)
    in_vpla = d["ine_code"].map(municipalities.set_index("ine_code")["in_vpla"]).fillna(False).to_numpy()
    return frac.where(in_vpla, None).to_numpy()


def create_aqi_hourly(con):
    parts = []
    for magnitude, (pollutant, hours) in PERIODS.items():
        parts.append(f"""
          SELECT station_id, ts, '{pollutant}' AS pollutant,
                 avg(value) OVER w AS mean, count(value) OVER w AS n_hours
          FROM air_reading WHERE magnitude = {magnitude}
          WINDOW w AS (PARTITION BY station_id ORDER BY ts
                       RANGE BETWEEN INTERVAL {hours - 1} HOURS PRECEDING AND CURRENT ROW)""")
    con.execute("CREATE TABLE aqi_hourly AS " + " UNION ALL ".join(parts))


def _source_dates():
    manifest = json.loads((RAW / "manifest.json").read_text(encoding="utf-8"))
    return pd.DataFrame([{"source": k, "downloaded": v.get("downloaded"), "modified": v.get("modified")}
                         for k, v in manifest.items()])


def build_main(target=DATA_DIR / "gomad.duckdb", rules=None):
    rules = rules or yaml.safe_load((CONFIG_DIR / "activities.yaml").read_text(encoding="utf-8"))
    municipalities = gpd.read_parquet(CLEAN / "municipality.parquet")
    population = pd.read_parquet(CLEAN / "population.parquet")
    population = population[population.year == population.year.max()][["ine_code", "population"]]
    destinations = gpd.read_parquet(CLEAN / "destination_raw.parquet")
    destinations = destinations[destinations["ine_code"].notna()].copy()
    destinations["green"] = green_fraction(destinations, gpd.read_parquet(CLEAN / "green.parquet"), municipalities)
    destinations["lon"], destinations["lat"] = destinations.geometry.x, destinations.geometry.y
    destinations["updated"] = dt.datetime.now()
    activities = apply_activities(destinations, rules)
    stations = gpd.read_parquet(CLEAN / "air_station.parquet")
    poi = gpd.read_parquet(CLEAN / "poi.parquet")

    def fill(con):
        con.execute("INSTALL spatial; LOAD spatial;")
        m = municipalities.merge(population, on="ine_code", how="left").assign(wkb=lambda x: x.geometry.to_wkb())
        con.register("m", pd.DataFrame(m.drop(columns="geometry")))
        con.execute("CREATE TABLE municipality AS SELECT ine_code, name, population, in_eiel, in_vpla, "
                    "ST_GeomFromWKB(wkb) AS geom FROM m")
        cols = ["id", "source", "name", "type", "covered", "accessible", "condition", "owner", "water", "url",
                "ine_code", "lon", "lat", "green", "updated"]
        con.register("d", pd.DataFrame(destinations[cols]))
        con.execute("CREATE TABLE destination AS SELECT * FROM d")
        con.register("a", activities)
        con.execute("CREATE TABLE destination_activity AS SELECT * FROM a")
        con.register("s", pd.DataFrame(stations.assign(lon=stations.geometry.x, lat=stations.geometry.y)
                                       .drop(columns="geometry")))
        con.execute("CREATE TABLE air_station AS SELECT * FROM s")
        con.register("p", pd.DataFrame(poi.assign(lon=poi.geometry.x, lat=poi.geometry.y).drop(columns="geometry")))
        con.execute("CREATE TABLE route_poi AS SELECT * FROM p")
        con.register("f", _source_dates())
        con.execute("CREATE TABLE source_date AS SELECT * FROM f")
    return atomic(target, fill)


def build_realtime(target=DATA_DIR / "realtime.duckdb"):
    since = dt.datetime.now() - dt.timedelta(days=3)

    def fill(con):
        con.execute(f"CREATE TABLE air_reading AS SELECT * FROM read_parquet('{CLEAN}/air_reading/*.parquet') "
                    f"WHERE ts >= TIMESTAMP '{since:%Y-%m-%d %H:%M:%S}'")
        create_aqi_hourly(con)
        con.execute(f"CREATE TABLE forecast AS SELECT * FROM read_parquet('{CLEAN}/forecast/*.parquet')")
    return atomic(target, fill)


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what in ("main", "all"):
        print(build_main())
    if what in ("realtime", "all"):
        print(build_realtime())
```

> La extensión `spatial` solo la usa `ingest` (red la primera vez). La API **no** la necesita: consulta `lon`/`lat`. Si `green_fraction` pasa de 5 min, limitar a polígonos del mismo municipio con un `sjoin` previo.

- [ ] **Paso 3:** Run: `.venv/bin/pytest tests/test_build_db.py -v -m "not slow"` → Esperado: PASS.
- [ ] **Paso 4 (tras DEC-08, jue 12:00):** el equipo deja `../config/activities.yaml` con la tabla decidida. Run: `.venv/bin/python -m build_db all && .venv/bin/pytest tests -v` → Esperado: PASS (incluidas `slow`). Comprobación: `.venv/bin/python -c "import duckdb;print(duckdb.connect('../data/gomad.duckdb',read_only=True).sql('SELECT activity, count(*) FROM destination_activity GROUP BY 1 ORDER BY 2 DESC'))"` → cifras coherentes con D-08.
- [ ] **Paso 5: commit** — `git -C ../.. add app/ingest/build_db.py app/ingest/tests/test_build_db.py app/config/activities.yaml && git -C ../.. commit -m "Ingesta: construcción atómica de gomad.duckdb y realtime.duckdb con medias móviles del ICA"`

**Terminado cuando:** los dos `.duckdb` se generan desde cero, un fallo a mitad conserva el anterior, `aqi_hourly` calcula las medias del BOE y `green` es `NULL` (no 0) donde no hay VPLA.

---

### Task 20: J-R1 · Grafo peatonal de Getafe con factores por tramo

**Rol:** Rutas · **Servicio:** `app/ingest/` · **Depende de:** Tasks 8, 17 · **Duración:** 3 h

**Ficheros:** Crear `graph.py`, `tests/test_graph.py`, `../config/routing.yaml` (provisional hasta DEC-07).

**Interfaces (produce; Task 21 en `api` consume los ficheros, no el código):**
- `app/data/graph/<zona>/nodes.parquet`: `node` (int, 0…n−1), `osm_id`, `lon`, `lat`
- `app/data/graph/<zona>/edges.parquet`: `u`, `v` (índices de nodo), `length_m`, `highway`, `traffic` (0–1, `config/routing.yaml`), `green_pct` (0–1 o NaN sin dato), `near_fountain`, `near_bench`, `near_aed` (bool), `fountain_id`, `bench_id`, `aed_id` (id del punto más cercano o nulo; revisión final 15/10), `geom` (WKB LineString 4326)
- `build_graph(pbf: Path, bbox: list[float] | None, out_dir: Path, config: dict) -> dict`; `index_nodes(nodes, edges)`; `edge_factors(edges, green, poi, config, has_green) -> GeoDataFrame`; `osm_pois(osm) -> GeoDataFrame`
- Añade a `clean/poi.parquet` el mobiliario de OSM (`amenity=bench` → `bench`, `amenity=drinking_water` → `fountain`, `amenity=waste_basket` → `bin`, `leisure=dog_park` → `dog_area`, `leisure=playground` → `playground`; `source="osm"`). Claves OSM de `requisitos_fuentes.json`.

**Formato de `config/routing.yaml`** (contrato; valores de DEC-07; lo leen `ingest` y `api`):

```yaml
# PROVISIONAL hasta DEC-07
traffic_by_highway:     # 0 = sin trafico, 1 = maximo. Criterio propio salvo que se cite otra fuente.
  primary: 1.0
  # ... un valor por cada valor de highway que salga en la red peatonal (ver salida de Task 8)
default_traffic: 0.3
cost_floor: 0.5         # arquitectura §4.4: factor >= 0,5
poi_radius_m: 25
traffic_display_threshold: 0.5
default_route_weights: {traffic: 0.5, green: 0.5, fountains: 0.2}
own_criterion: true
```

- [ ] **Paso 1: pruebas que fallan** — `tests/test_graph.py`

```python
import geopandas as gpd
import pandas as pd
import pytest
from shapely.geometry import LineString, Point, Polygon

from common import DATA_DIR
from graph import edge_factors, index_nodes

CONFIG = {"traffic_by_highway": {"primary": 1.0, "footway": 0.0}, "default_traffic": 0.3, "poi_radius_m": 25}


def test_index_nodes_contiguous():
    edges = pd.DataFrame({"u": [900, 901], "v": [901, 902]})
    nodes = pd.DataFrame({"id": [902, 900, 901], "lon": [0.0, 0.1, 0.2], "lat": [0.0, 0.0, 0.0]})
    n, e = index_nodes(nodes, edges)
    assert sorted(n["node"]) == [0, 1, 2]
    assert set(e["u"]) | set(e["v"]) <= set(n["node"])


def test_edge_factors():
    # dos tramos de ~100 m en Getafe; el primero cruza un parque en su mitad
    a, b, c = (-3.7300, 40.3050), (-3.7288, 40.3050), (-3.7276, 40.3050)
    edges = gpd.GeoDataFrame({"highway": ["footway", "primary"]},
                             geometry=[LineString([a, b]), LineString([b, c])], crs=4326)
    park = gpd.GeoDataFrame(geometry=[Polygon([(-3.7300, 40.3040), (-3.7294, 40.3040),
                                               (-3.7294, 40.3060), (-3.7300, 40.3060)])], crs=4326)
    fountain = gpd.GeoDataFrame({"type": ["fountain"]}, geometry=[Point(-3.7282, 40.30505)], crs=4326)
    f = edge_factors(edges, park, fountain, CONFIG, has_green=True)
    assert f.loc[0, "green_pct"] == pytest.approx(0.5, abs=0.05)
    assert f.loc[1, "green_pct"] == pytest.approx(0.0, abs=0.01)
    assert list(f["traffic"]) == [0.0, 1.0]
    assert list(f["near_fountain"]) == [False, True]
    assert (f["length_m"] > 90).all() and (f["length_m"] < 110).all()


def test_without_vpla_green_is_nan():
    e = gpd.GeoDataFrame({"highway": ["footway"]}, geometry=[LineString([(-3.73, 40.3), (-3.729, 40.3)])], crs=4326)
    empty = gpd.GeoDataFrame(geometry=[], crs=4326)
    f = edge_factors(e, empty, gpd.GeoDataFrame({"type": []}, geometry=[], crs=4326), CONFIG, has_green=False)
    assert f["green_pct"].isna().all()


@pytest.mark.slow
def test_getafe_graph_exists():
    e = pd.read_parquet(DATA_DIR / "graph" / "getafe" / "edges.parquet")
    n = pd.read_parquet(DATA_DIR / "graph" / "getafe" / "nodes.parquet")
    assert len(e) > 1000 and (e["length_m"] > 0).all()
    assert e[["u", "v"]].max().max() < len(n)
    assert e["green_pct"].notna().mean() > 0.9          # Getafe esta en VPLA
```

Run → Esperado: FAIL.

- [ ] **Paso 2: implementar** — `graph.py`

```python
"""OSM -> app/data/graph/<zona>/{nodes,edges}.parquet con factores por tramo (arquitectura §3.4).

Uso: python -m graph 28065            # Getafe -> data/graph/getafe/
     python -m graph all              # toda la Comunidad -> data/graph/region/ (sabado)
"""
import sys
import time

import geopandas as gpd
import numpy as np
import pandas as pd
import yaml

from common import CLEAN, CONFIG_DIR, DATA_DIR, RAW, municipalities, write

PBF = RAW / "osm" / "madrid-latest.osm.pbf"
OSM_POI = {("amenity", "bench"): "bench", ("amenity", "drinking_water"): "fountain",
           ("amenity", "waste_basket"): "bin", ("leisure", "dog_park"): "dog_area",
           ("leisure", "playground"): "playground"}
ZONE_NAMES = {"28065": "getafe", "28079": "madrid", "28131": "san_lorenzo"}


def index_nodes(nodes, edges):
    used = pd.unique(pd.concat([edges["u"], edges["v"]]))
    n = nodes[nodes["id"].isin(used)].reset_index(drop=True)
    n["node"] = np.arange(len(n))
    mapping = dict(zip(n["id"], n["node"]))
    e = edges.assign(u=edges["u"].map(mapping), v=edges["v"].map(mapping)).dropna(subset=["u", "v"])
    e[["u", "v"]] = e[["u", "v"]].astype(np.int64)
    return n.rename(columns={"id": "osm_id"})[["node", "osm_id", "lon", "lat"]], e


def edge_factors(edges, green, poi, config, has_green):
    e = edges.to_crs(25830).reset_index(drop=True)
    e["length_m"] = e.length
    e["traffic"] = (e["highway"].astype(str).map(config["traffic_by_highway"])
                    .fillna(config["default_traffic"]).astype(float))
    if has_green and len(green):
        zones = green.to_crs(25830).union_all()
        e["green_pct"] = (e.geometry.intersection(zones).length / e["length_m"]).clip(0, 1)
    else:
        e["green_pct"] = np.nan
    p = poi.to_crs(25830)
    for kind, column in (("fountain", "near_fountain"), ("bench", "near_bench"), ("aed", "near_aed")):
        pts = p[p["type"] == kind]
        if len(pts):
            near = gpd.sjoin_nearest(e[["geometry"]], pts[["geometry"]], how="left",
                                     max_distance=config["poi_radius_m"], distance_col="d")
            e[column] = near.groupby(level=0)["d"].min().notna().reindex(e.index, fill_value=False).to_numpy()
        else:
            e[column] = False
    return e.to_crs(4326)


def osm_pois(osm):
    query = {}
    for key, value in OSM_POI:
        query.setdefault(key, []).append(value)
    pois = osm.get_pois(custom_filter=query)
    if pois is None or pois.empty:
        return gpd.GeoDataFrame({"id": [], "type": [], "source": [], "ine_code": []}, geometry=[], crs=4326)
    pois = pois.set_crs(4326, allow_override=True)
    pois["type"] = None
    for (key, value), kind in OSM_POI.items():
        if key in pois:
            pois.loc[pois[key] == value, "type"] = kind
    pois = pois[pois["type"].notna()].copy()
    pois["geometry"] = pois.geometry.representative_point()
    pois["id"] = "osm:" + pois["id"].astype(str)
    pois["source"], pois["ine_code"] = "osm", None
    return pois[["id", "type", "source", "ine_code", "geometry"]]


def build_graph(pbf, bbox, out_dir, config):
    from pyrosm import OSM
    t0 = time.perf_counter()
    osm = OSM(str(pbf), bounding_box=bbox)
    nodes, edges = osm.get_network(network_type="walking", nodes=True)
    nodes = pd.DataFrame({"id": nodes["id"], "lon": nodes["lon"], "lat": nodes["lat"]})
    edges = edges[["u", "v", "highway", "geometry"]].set_crs(4326, allow_override=True)
    edges = edges[edges["u"] != edges["v"]]
    # mobiliario OSM -> poi.parquet (una sola lectura del extracto)
    old_poi = gpd.read_parquet(CLEAN / "poi.parquet")
    poi = gpd.GeoDataFrame(pd.concat([old_poi[old_poi["source"] != "osm"], osm_pois(osm)], ignore_index=True),
                           geometry="geometry", crs=4326)
    write(poi, "poi")
    green = gpd.read_parquet(CLEAN / "green.parquet")
    if bbox:
        green = green.cx[bbox[0]:bbox[2], bbox[1]:bbox[3]]
        poi = poi.cx[bbox[0]:bbox[2], bbox[1]:bbox[3]]
    f = edge_factors(edges, green, poi, config, has_green=len(green) > 0)
    n, e = index_nodes(nodes, f)
    out_dir.mkdir(parents=True, exist_ok=True)
    n.to_parquet(out_dir / "nodes.parquet", index=False)
    e = e.assign(geom=e.geometry.to_wkb())
    cols = ["u", "v", "length_m", "highway", "traffic", "green_pct", "near_fountain", "near_bench", "near_aed", "geom"]
    pd.DataFrame(e[cols]).to_parquet(out_dir / "edges.parquet", index=False)
    return {"nodes": len(n), "edges": len(e), "seconds": round(time.perf_counter() - t0, 1)}


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "28065"
    config = yaml.safe_load((CONFIG_DIR / "routing.yaml").read_text(encoding="utf-8"))
    if target == "all":
        print(build_graph(PBF, None, DATA_DIR / "graph" / "region", config))
    else:
        row = municipalities()[municipalities()["ine_code"] == target]
        out = DATA_DIR / "graph" / ZONE_NAMES.get(target, target)
        print(build_graph(PBF, [float(v) for v in row.total_bounds], out, config))
```

> **Limitación (Getafe):** `green_pct` usa solo VPLA; en los 13 municipios sin VPLA queda `NaN` y se completa el sábado (S-R1). Si `highway` trae listas (`"['footway', 'path']"`) en cantidad, quedarse con el primer valor.

- [ ] **Paso 3:** crear `../config/routing.yaml` provisional (bloque de arriba, con un valor por cada `highway` visto en Task 8). Run: `.venv/bin/python -m graph 28065` → Esperado: imprime nodos, tramos y segundos.
- [ ] **Paso 3b (respaldo si pyrosm no instala, Task 8):** sustituir `OSM(...).get_network` por un `osmium.SimpleHandler` con `locations=True` que recorra `ways` con `highway` peatonal (`footway`, `path`, `pedestrian`, `living_street`, `residential`, `service`, `steps`, `track`, `unclassified`, `tertiary`, `secondary`, `primary`, `cycleway` sin `foot=no`…) y genere un tramo por par de nodos consecutivos con `u`, `v`, `highway`, `LineString`. Mismas columnas de salida. Anotar la lista exacta en el commit.
- [ ] **Paso 4:** Run: `.venv/bin/pytest tests/test_graph.py -v` → Esperado: PASS.
- [ ] **Paso 5: commit** — `git -C ../.. add app/ingest/graph.py app/ingest/tests/test_graph.py app/config/routing.yaml && git -C ../.. commit -m "Rutas: grafo peatonal de Getafe con tráfico por vía, verde y mobiliario por tramo"`

**Terminado cuando:** existe `app/data/graph/getafe/` con nodos y tramos válidos, las pruebas pasan y `poi.parquet` incluye el mobiliario de OSM.

---

### Task 21: J-R2 · Motor de rutas: KD-tree, costes por petición, A\*/Dijkstra y Dijkstra con límite

**Rol:** Rutas · **Servicio:** `app/api/` · **Depende de:** Task 20 · **Duración:** 3 h

**Ficheros:** Crear `routing/__init__.py`, `routing/graph.py`, `tests/routing/test_routing.py`.

**Interfaces (produce; viernes V-R1 y V-M1 consumen):**

```python
class RouteNotFound(Exception): ...

@dataclass
class Graph:
    lon: np.ndarray; lat: np.ndarray                      # por nodo
    u: np.ndarray; v: np.ndarray                          # por tramo
    length: np.ndarray; traffic: np.ndarray; green: np.ndarray   # green: NaN = sin dato
    near_fountain: np.ndarray; near_bench: np.ndarray; near_aed: np.ndarray
    geom_wkb: list                                        # LineString WKB por tramo (geom(i) la decodifica)
    ig: igraph.Graph                                      # no dirigido
    csr: scipy.sparse.csr_matrix                          # longitudes, simetrica
    tree: scipy.spatial.cKDTree                           # en metros locales
    cos_lat0: float

def load_graph(directory: Path) -> Graph
def nearest_node(g: Graph, lon: float, lat: float, max_m: float = 300) -> int      # RouteNotFound si > max_m
def edge_costs(g: Graph, weights: dict, floor: float) -> np.ndarray               # > 0 siempre
def shortest_path(g: Graph, origin: int, target: int, costs: np.ndarray, algorithm: str = "dijkstra") -> list[int]   # ids de tramo
def bounded_distances(g: Graph, origin: int, limit_m: float) -> np.ndarray        # inf si no alcanzable
def summarize(g: Graph, edges: list[int], traffic_threshold: float = 0.5) -> dict  # distance_m, green_pct (None sin dato), traffic_m, fountains, benches, aeds
```

- Fórmula (arquitectura §4.4): `factor = max(floor, 1 + w_traffic·traffic − w_green·green − w_fountains·near_fountain)` con `green` NaN → 0; `cost = length × factor`. Directa: `cost = length`.

- [ ] **Paso 1: pruebas que fallan** — `tests/routing/test_routing.py`

```python
import numpy as np
import pandas as pd
import pytest
from shapely.geometry import LineString

from routing.graph import (RouteNotFound, bounded_distances, edge_costs, load_graph, nearest_node,
                           shortest_path, summarize)


@pytest.fixture
def graph(tmp_path):
    """   0 --(100 m, avenida)-- 1
          |                      |
       (80 m, parque)        (80 m, parque)
          |                      |
          2 --(60 m, parque)---- 3        4 -- 5 (aislados)
    Directa 0->1 = 100 m por la avenida; saludable 0->2->3->1 = 220 m por parque.
    Coordenadas con distancias geometricas menores que las longitudes (heuristica de A* admisible)."""
    nodes = pd.DataFrame({"node": range(6), "osm_id": range(6),
                          "lon": [-3.7300, -3.7289, -3.7300, -3.7289, -3.7000, -3.6990],   # 0,0011 grados ~ 93 m
                          "lat": [40.3050, 40.3050, 40.3043, 40.3043, 40.3100, 40.3100]})  # 0,0007 grados ~ 78 m
    rows = [(0, 1, 100, 1.0, 0.0, False), (0, 2, 80, 0.0, 1.0, True), (2, 3, 60, 0.0, 1.0, False),
            (3, 1, 80, 0.0, 1.0, False), (4, 5, 85, 0.0, np.nan, False)]
    edges = pd.DataFrame(rows, columns=["u", "v", "length_m", "traffic", "green_pct", "near_fountain"])
    edges["highway"] = "footway"
    edges["near_bench"] = False
    edges["near_aed"] = False
    edges["geom"] = [LineString([(nodes.lon[u], nodes.lat[u]), (nodes.lon[v], nodes.lat[v])]).wkb
                     for u, v in zip(edges.u, edges.v)]
    nodes.to_parquet(tmp_path / "nodes.parquet")
    edges.to_parquet(tmp_path / "edges.parquet")
    return load_graph(tmp_path)


WEIGHTS = {"traffic": 1.0, "green": 0.5, "fountains": 0.2}


def test_costs_always_positive(graph):
    for w in (WEIGHTS, {"traffic": 0, "green": 1, "fountains": 1}, {"traffic": 1, "green": 1, "fountains": 1}):
        c = edge_costs(graph, w, floor=0.5)
        assert (c > 0).all() and (c >= 0.5 * graph.length - 1e-9).all()


@pytest.mark.parametrize("algorithm", ["dijkstra", "astar"])
def test_direct_and_healthy(graph, algorithm):
    direct = shortest_path(graph, 0, 1, graph.length, algorithm)
    healthy = shortest_path(graph, 0, 1, edge_costs(graph, WEIGHTS, 0.5), algorithm)
    sd, sh = summarize(graph, direct), summarize(graph, healthy)
    assert sd["distance_m"] == pytest.approx(100)
    assert sh["distance_m"] == pytest.approx(220)
    assert sh["distance_m"] >= sd["distance_m"]          # la saludable nunca es mas corta
    assert sh["green_pct"] == pytest.approx(100) and sd["traffic_m"] == pytest.approx(100)
    assert sh["fountains"] == 1


def test_unreachable_raises(graph):
    with pytest.raises(RouteNotFound):
        shortest_path(graph, 0, 4, graph.length)


def test_nearest_node(graph):
    assert nearest_node(graph, -3.72999, 40.30501) == 0


def test_nearest_node_too_far(graph):
    with pytest.raises(RouteNotFound):
        nearest_node(graph, -3.60, 40.40)


def test_bounded_dijkstra(graph):
    d = bounded_distances(graph, 0, limit_m=150)
    assert d[1] == pytest.approx(100) and d[2] == pytest.approx(80) and d[3] == pytest.approx(140)
    assert np.isinf(d[4])


def test_green_without_data_is_none(graph):
    assert summarize(graph, [4])["green_pct"] is None
```

Run → Esperado: FAIL.

- [ ] **Paso 2: implementar** — `routing/graph.py`

```python
"""Grafo peatonal en memoria (arquitectura §4.4). Coste por peticion, vectorizado; nunca <= 0."""
import math
from dataclasses import dataclass, field

import igraph as ig
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import dijkstra
from scipy.spatial import cKDTree
from shapely import wkb

M_PER_DEG_LAT = 111_320.0


class RouteNotFound(Exception):
    pass


@dataclass
class Graph:
    lon: np.ndarray
    lat: np.ndarray
    u: np.ndarray
    v: np.ndarray
    length: np.ndarray
    traffic: np.ndarray
    green: np.ndarray
    near_fountain: np.ndarray
    near_bench: np.ndarray
    near_aed: np.ndarray
    geom_wkb: list
    ig: ig.Graph
    csr: csr_matrix
    tree: cKDTree
    cos_lat0: float
    _geom: dict = field(default_factory=dict)

    def geom(self, i):
        if i not in self._geom:
            self._geom[i] = wkb.loads(self.geom_wkb[i])
        return self._geom[i]


def _xy(lon, lat, cos_lat0):
    # proyeccion local equirectangular: suficiente para distancias de pocos km
    return np.column_stack([np.asarray(lon) * M_PER_DEG_LAT * cos_lat0, np.asarray(lat) * M_PER_DEG_LAT])


def load_graph(directory):
    n = pd.read_parquet(directory / "nodes.parquet").sort_values("node")
    e = pd.read_parquet(directory / "edges.parquet")
    cos_lat0 = math.cos(math.radians(float(n["lat"].mean())))
    u, v = e["u"].to_numpy(np.int64), e["v"].to_numpy(np.int64)
    length = e["length_m"].to_numpy(float)
    count = len(n)
    graph_ig = ig.Graph(n=count, edges=np.column_stack([u, v]).tolist(), directed=False)
    csr = csr_matrix((np.concatenate([length, length]), (np.concatenate([u, v]), np.concatenate([v, u]))),
                     shape=(count, count))
    return Graph(lon=n["lon"].to_numpy(float), lat=n["lat"].to_numpy(float), u=u, v=v, length=length,
                 traffic=e["traffic"].to_numpy(float), green=e["green_pct"].to_numpy(float),
                 near_fountain=e["near_fountain"].to_numpy(bool), near_bench=e["near_bench"].to_numpy(bool),
                 near_aed=e["near_aed"].to_numpy(bool), geom_wkb=list(e["geom"]), ig=graph_ig, csr=csr,
                 tree=cKDTree(_xy(n["lon"], n["lat"], cos_lat0)), cos_lat0=cos_lat0)


def nearest_node(g, lon, lat, max_m=300):
    d, i = g.tree.query(_xy([lon], [lat], g.cos_lat0)[0])
    if d > max_m:
        raise RouteNotFound(f"No hay red peatonal a menos de {max_m} m")
    return int(i)


def edge_costs(g, weights, floor):
    green = np.nan_to_num(g.green, nan=0.0)
    factor = (1 + weights.get("traffic", 0) * g.traffic - weights.get("green", 0) * green
              - weights.get("fountains", 0) * g.near_fountain)
    return g.length * np.maximum(factor, floor)


def shortest_path(g, origin, target, costs, algorithm="dijkstra"):
    if algorithm == "astar":
        xy = _xy(g.lon, g.lat, g.cos_lat0)
        # factor minimo real: hace la heuristica admisible (linea recta x factor minimo)
        min_factor = float(np.min(costs / g.length)) if len(g.length) else 1.0
        heuristic = lambda graph, a, b: float(np.hypot(*(xy[a] - xy[b]))) * min_factor * 0.999
        edges = g.ig.get_shortest_path_astar(origin, target, heuristics=heuristic, weights=costs, output="epath")
    else:
        edges = g.ig.get_shortest_path(origin, target, weights=costs, output="epath")
    if origin != target and not edges:
        raise RouteNotFound("Origen y destino no están conectados por la red peatonal")
    return list(edges)


def bounded_distances(g, origin, limit_m):
    return dijkstra(g.csr, directed=False, indices=origin, limit=limit_m)


def summarize(g, edges, traffic_threshold=0.5):
    idx = np.asarray(edges, dtype=np.int64)
    length = g.length[idx]
    green = g.green[idx]
    has_data = ~np.isnan(green)
    green_pct = None if not has_data.any() else float(
        100 * (green[has_data] * length[has_data]).sum() / length[has_data].sum())
    return {"distance_m": float(length.sum()), "green_pct": green_pct,
            "traffic_m": float(length[g.traffic[idx] >= traffic_threshold].sum()),
            "fountains": int(g.near_fountain[idx].sum()), "benches": int(g.near_bench[idx].sum()),
            "aeds": int(g.near_aed[idx].sum())}
```

> `get_shortest_path_astar` existe en python-igraph ≥ 0.10.2; la heurística en Python se llama por nodo y puede ser **más lenta** que el Dijkstra en C: Task 22 lo mide y elige (por defecto `dijkstra`). `traffic_threshold` viene de `config/routing.yaml` (`traffic_display_threshold`).

- [ ] **Paso 3:** Run: `.venv/bin/pytest tests/routing/test_routing.py -v` → Esperado: PASS.
- [ ] **Paso 4: commit** — `git -C ../.. add app/api/routing app/api/tests/routing && git -C ../.. commit -m "Rutas: grafo en memoria, coste con suelo, A*/Dijkstra y Dijkstra con límite"`

**Terminado cuando:** pasan las pruebas, incluidas coste > 0, saludable ≥ directa, inalcanzable y nodo lejano.

---

### Task 22: J-R3 · Prueba de latencia en Getafe (y capital si hay grafo)

**Rol:** Rutas · **Servicio:** `app/api/` · **Depende de:** Task 21 · **Duración:** 1 h

**Ficheros:** Crear `tests/routing/test_latency.py`. Modificar `../../docs/arquitectura.md` §4.4.

- [ ] **Paso 1:** `tests/routing/test_latency.py`

```python
"""Latencia real (RNF: ruta < 5 s, recomendacion < 3 s). Se salta si no hay grafo construido."""
import time

import numpy as np
import pytest

from routing.graph import bounded_distances, edge_costs, load_graph, shortest_path
from settings import DATA_DIR

pytestmark = pytest.mark.slow
WEIGHTS = {"traffic": 1.0, "green": 0.5, "fountains": 0.2}


@pytest.fixture(scope="module", params=["getafe", "madrid"])
def g(request):
    d = DATA_DIR / "graph" / request.param
    if not (d / "edges.parquet").exists():
        pytest.skip(f"sin grafo de {request.param}")
    t0 = time.perf_counter()
    graph = load_graph(d)
    print(f"\n{request.param}: carga {time.perf_counter() - t0:.2f} s, {len(graph.lon)} nodos, {len(graph.u)} tramos")
    return graph


@pytest.mark.parametrize("algorithm", ["dijkstra", "astar"])
def test_direct_and_healthy_under_5s(g, algorithm):
    rng = np.random.default_rng(1)
    times = []
    for _ in range(10):
        a, b = (int(x) for x in rng.integers(0, len(g.lon), 2))
        t0 = time.perf_counter()
        costs = edge_costs(g, WEIGHTS, 0.5)
        for c in (g.length, costs):
            try:
                shortest_path(g, a, b, c, algorithm)
            except Exception:
                pass
        times.append(time.perf_counter() - t0)
    print(f"{algorithm}: p50 {np.median(times):.3f} s, max {max(times):.3f} s")
    assert max(times) < 5.0


def test_bounded_dijkstra_under_1s(g):
    t0 = time.perf_counter()
    bounded_distances(g, 0, 5000)
    assert time.perf_counter() - t0 < 1.0
```

- [ ] **Paso 2:** Run: `.venv/bin/pytest tests/routing/test_latency.py -v -s` → Esperado: PASS; apuntar p50/máx por algoritmo, tiempo de carga y memoria (`/usr/bin/time -v .venv/bin/python -c "import pathlib; from routing.graph import load_graph; load_graph(pathlib.Path('../data/graph/getafe'))"` → «Maximum resident set size»).
- [ ] **Paso 3:** si da tiempo, `(cd ../ingest && .venv/bin/python -m graph 28079)` y repetir para la capital (entrada de DEC-A11).
- [ ] **Paso 4:** escribir en `../../docs/arquitectura.md` §4.4 las cifras medidas y el algoritmo elegido. `git -C ../.. add app/api/tests/routing/test_latency.py docs/arquitectura.md && git -C ../.. commit -m "Rutas: latencia medida en Getafe"`.

**Terminado cuando:** hay cifras reales de latencia y memoria en `arquitectura.md` y la prueba pasa en Getafe.

---

### Task 23: J-F1 · Tipos generados del OpenAPI y MSW [manual guiado]

> **[manual guiado] (14/10):** la hace a mano la persona del front siguiendo **`app/frontend/docs/guia.md` §3, paso 1** y **`app/frontend/docs/pantallas.md` (campos por pantalla)**. El agente no la ejecuta. Ficheros, pruebas y criterio de «Terminado cuando» de abajo siguen siendo la referencia.

**Rol:** Front · **Servicio:** `app/frontend/` · **Depende de:** Tasks 11, 10 · **Duración:** 1,5 h

**Ficheros:** Crear `src/api/types.ts` (generado), `src/api/client.ts`, `src/mocks/handlers.ts`, `src/mocks/browser.ts`, `src/mocks/data/*.json`, `src/mocks/data.test.ts`. Modificar `package.json`, `src/main.tsx`.

**Interfaces (produce):** `Schemas["RecommendResponse"]`, etc.; `client.recommend(body: Schemas["RecommendRequest"]): Promise<Schemas["RecommendResponse"]>` y uno por endpoint, contra `/api`.

- [ ] **Paso 1:** en `package.json`: `"types": "openapi-typescript src/api/openapi.json -o src/api/types.ts"` y `"contract": "npm run types && tsc --noEmit"`. Run: `npm run types`.
- [ ] **Paso 2: `src/api/client.ts`**

```ts
import type { components } from "./types";

export type Schemas = components["schemas"];
const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(BASE + path, { headers: { "Content-Type": "application/json" }, ...init });
  // mensaje visible para la persona usuaria
  if (!r.ok) throw new Error(`No se pudo cargar (${r.status}). Inténtalo de nuevo.`);
  return r.json() as Promise<T>;
}

export const client = {
  activities: () => request<Schemas["ActivitiesResponse"]>("/activities"),
  location: (text: string) => request<Schemas["LocationResponse"]>(`/location?text=${encodeURIComponent(text)}`),
  recommend: (body: Schemas["RecommendRequest"]) =>
    request<Schemas["RecommendResponse"]>("/recommend", { method: "POST", body: JSON.stringify(body) }),
  route: (body: Schemas["RouteRequest"]) =>
    request<Schemas["RouteResponse"]>("/route", { method: "POST", body: JSON.stringify(body) }),
  municipality: (ineCode: string) => request<Schemas["MunicipalityResponse"]>(`/municipality/${ineCode}`),
  sources: () => request<Schemas["SourcesResponse"]>("/sources"),
};
```

- [ ] **Paso 3: datos simulados tipados** en `src/mocks/data/` (uno por endpoint). Para `recommend`, tres resultados de Getafe con nombres **ficticios marcados «(ejemplo)»** — nada que parezca un dato oficial —, uno con factor `green` a `null` («sin datos») y otro con `indoor_alternative: true`. `handlers.ts` con `http.get("/api/activities", …)`, `http.post("/api/recommend", …)`, etc. (MSW 2). En `main.tsx`, arrancar el *worker* solo si `import.meta.env.VITE_MOCK === "1"`.
- [ ] **Paso 4: prueba** `src/mocks/data.test.ts`: importa cada JSON con `satisfies Schemas["…"]` (si el contrato cambia, `tsc` falla). Run: `npm run contract && npx vitest run` → Esperado: PASS.
- [ ] **Paso 5: commit** — `git -C ../.. add app/frontend && git -C ../.. commit -m "Front: tipos del contrato, cliente y respuestas simuladas"`.

**Terminado cuando:** `npm run contract` pasa y la app arranca con `VITE_MOCK=1 npm run dev` sin API.

---

### Task 24: J-F2 · Pantalla Inicio «¿Qué te apetece hacer?» [manual guiado]

> **[manual guiado] (14/10):** la hace a mano la persona del front siguiendo **`app/frontend/docs/guia.md` §3, paso 2** y **`app/frontend/docs/pantallas.md` §1**. El agente no la ejecuta. Ficheros, pruebas y criterio de «Terminado cuando» de abajo siguen siendo la referencia.

**Rol:** Front · **Servicio:** `app/frontend/` · **Depende de:** Tasks 23, 9 · **Duración:** 3 h

**Ficheros:** Crear `src/screens/Home.tsx`, `src/components/LocationPicker.tsx`, `src/state/preferences.tsx` (contexto + `localStorage`), `src/screens/Home.test.tsx`.

- Actividades de `GET /activities`; botón «Sorpréndeme» (RF-03); ubicación por GPS (`navigator.geolocation`, solo tras un gesto) o texto (`/location`, lista de candidatos accesible); resumen de preferencias; primera recomendación en ≤ 3 interacciones.
- `preferences.tsx`: perfil, acompañantes, pesos, tiempo y distancia en `localStorage` con `try/catch` (si falla, en memoria). **La ubicación no se guarda en `localStorage`.**

- [ ] **Paso 1: pruebas que fallan** (`Home.test.tsx`, MSW de nodo): `it("renders activities as buttons")`, `it("has one h1")`, `it("navigates to /results after activity + location")`, `it("has no axe violations")`, `it("never stores lat/lon in localStorage")`.
- [ ] **Paso 2:** implementar hasta verde. **Paso 3:** `npm run build`. **Paso 4:** `git -C ../.. add app/frontend && git -C ../.. commit -m "Front: pantalla de inicio"`.

**Terminado cuando:** pruebas y axe en verde; Inicio → Resultados en 3 toques con datos simulados.

---

### Task 25: J-F3 · Pantalla Resultados (lista, sin mapa todavía) [manual guiado]

> **[manual guiado] (14/10):** la hace a mano la persona del front siguiendo **`app/frontend/docs/guia.md` §3, paso 3** y **`app/frontend/docs/pantallas.md` §2**. El agente no la ejecuta. Ficheros, pruebas y criterio de «Terminado cuando» de abajo siguen siendo la referencia.

**Rol:** Front · **Servicio:** `app/frontend/` · **Depende de:** Task 24 · **Duración:** 3 h

**Ficheros:** Crear `src/screens/Results.tsx`, `src/components/ResultCard.tsx`, `src/components/Indicator.tsx` (icono + color + texto, nunca solo color), `src/screens/Results.test.tsx`.

- `useQuery(["recommend", request], …)` (TanStack Query descarta respuestas viejas al cambiar la petición); lista `ul/li` con nombre, distancia, tiempo, «Nota 8,2 sobre 10», mejor hora; «Ver más» con `offset`; `warnings` y `medical_disclaimer` visibles; anuncio `aria-live="polite"` («3 resultados actualizados»).

- [ ] **Paso 1: pruebas que fallan:** `it("renders 3 list items")`, `it("shows 'Verde: sin datos' when green is null")`, `it("'Ver más' requests offset=3")`, `it("updates the aria-live region")`, `it("has no axe violations")`, `it("Indicator always has visible text")`.
- [ ] **Paso 2:** implementar. **Paso 3:** `npm run build`. **Paso 4:** `git -C ../.. add app/frontend && git -C ../.. commit -m "Front: pantalla de resultados"`.

**Terminado cuando:** pruebas y axe en verde con datos simulados.

---

## Cierre del jueves (20:00, 15 min, todo el equipo)

- [ ] `pytest` en verde en `app/api` y `app/ingest` (con datos reales en el equipo de Datos); `npx vitest run` en `app/frontend`.
- [ ] Estado de DEC-05, DEC-07, DEC-07b, DEC-08 (cerradas), DEC-03 (proveedor elegido), DEC-11, DEC-12.
- [ ] Actualizar `docs/PENDIENTES.md`; lo no terminado pasa al viernes **por delante** de lo nuevo.
- [ ] **Detallar el viernes:** `superpowers:writing-plans` convierte la tabla del viernes en Task 26 en adelante en este fichero.

---

# VIERNES 16/10 — tareas (se detallan el jueves por la tarde; rutas relativas a `app/`)

> Filas de Front: **[manual guiado]**, se hacen a mano con `app/frontend/docs/guia.md` §3 (paso 4 y 5) y `app/frontend/docs/pantallas.md`; al detallar el día con `writing-plans` no se convierten en `### Task N:` ejecutables por el agente.

| ID | Rol | Tarea | Ficheros | Terminado cuando | Prueba |
|---|---|---|---|---|---|
| V-D1 | Datos | Normalizador de servicios (`sanitarios` contando `centro_nro_registro` distintos, tipos «Centro de salud»/«Consultorio de atención primaria»; `farmacias` con coma decimal; `educativos` con `SITUACIÓN`=ALTA; `atencion_social` sin «RESERVADO»; EIEL `cultural`/`nucleos`) → `service.parquet`; tabla `municipality_indicator(ine_code, category, key, value NULL=sin datos, unit, year, source)` según **DEC-09** (`config/indicators.yaml`) en `build_main` | `ingest/normalize/services.py`, `ingest/build_db.py`, `config/indicators.yaml` | 179 municipios con todas sus filas de indicador (valor o NULL), coberturas iguales a D-09 | `ingest/tests/test_services.py`: 429 centros de salud + consultorios; educativos ALTA 3.906; 177 RESERVADO excluidos; Patones `sport` NULL (no 0) |
| V-D2 | Datos | → **Tasks 26 y 31**. `/location`: `ingest/normalize/addresses.py` (CSV cp1252 → `clean/addresses.parquet` con vial, número, coordenadas reproyectadas, `ine_code`; **comprobar antes los nombres reales de columnas del CSV**); en la API, cliente del buscador de Nomecalles (sin clave) con `httpx`, caché de 1 h en memoria y respaldo «centro del municipio» | `ingest/normalize/addresses.py`, `api/geocoding.py`, `api/main.py` | «calle madrid 10 getafe» → x 437838,98 / y 4461942,01 reproyectado (D-04); sin resultado → municipio por nombre; buscador caído → municipio | `api/tests/test_location.py` con buscador simulado + 1 prueba `slow` real |
| V-D3 | Datos | Patrón horario del aire para horas futuras (CLAUDE.md §6.2): `--only aire_historico --include-heavy`, mediana por estación × magnitud × mes × hora → tabla `air_pattern` en `gomad.duckdb`. Hasta que exista, el motor usa la última categoría medida y lo dice | `ingest/normalize/air.py`, `ingest/build_db.py` | `air_pattern` con las estaciones con histórico | 24 horas × 12 meses por estación-magnitud con datos |
| V-M1 | Motor | → **Tasks 28 y 29**. `/activities` y `/recommend` reales: `repository.py` (candidatos por caja + haversine en DuckDB solo lectura, reabriendo `realtime.duckdb` por petición), `bounded_distances` (Task 21) donde hay grafo y haversine × factor de rodeo (criterio propio, marcado) donde no, estación más cercana o de la zona, `HourContext` por hora, `slots`, `scoring`; «Sorpréndeme» = 3 actividades distintas; middleware de log **sin ubicación** (ruta, código y ms) | `api/repository.py`, `api/services/recommend.py`, `api/main.py` | < 3 s en Getafe y capital; `warnings` cuando falta un factor | `api/tests/test_endpoints.py`: `test_recommend_getafe`, `test_recommend_capital_without_vpla`, `test_surprise_me_three_distinct_activities`, `test_logs_without_location` |
| V-M2 | Motor | → **Task 27**. `explanation.py`: plantillas en lenguaje llano con factores dominantes y mejor hora; cita fuente y fecha; marca criterio propio | `api/engine/explanation.py` | Explicación sin datos que no estén en la respuesta | `api/tests/engine/test_explanation.py`: cifras de la frase = cifras del objeto; Carmen recibe «Ahora no: mejor a las …» |
| V-R1 | Rutas | → **Task 30**. `/route` en Getafe: grafo cargado al arrancar (`lifespan`), directa y saludable en paralelo (`ThreadPoolExecutor`), GeoJSON, `description`, POIs de `route_poi` a ≤ 25 m (solo `working IS NOT FALSE`: las fuentes fuera de servicio no cuentan para la ruta ni para F6; el mapa puede mostrarlas como «Fuera de servicio»); fuera del grafo o desconectado → línea recta `approximate=True` + aviso; tiempo con la velocidad de DEC-07 | `api/services/route.py`, `api/main.py` | < 5 s; nunca 500 por ruta imposible | `test_route_getafe`, `test_route_outside_graph_is_approximate` |
| V-F1 | Front **[manual guiado]** | Mapa MapLibre sincronizado con la lista (RF-11); la lista es el equivalente completo; OpenFreeMap en desarrollo | `frontend/src/components/Map.tsx` | Selección sincronizada | Vitest: seleccionar tarjeta cambia el marcador activo |
| V-F2 | Front **[manual guiado]** | Detalle «¿Por qué?»: nota por factor, línea horaria con mejor franja, aire y tiempo con icono+color+texto (colores ICA de `umbrales.md` §1.3 como pastilla con contraste), fuente y fecha | `frontend/src/screens/Detail.tsx` | Contraste ≥ 4,5:1 | Vitest + axe |
| V-F3 | Front **[manual guiado]** | Panel «Ajustar» (hoja inferior Radix): pesos con recálculo al soltar (RF-16), perfil, «Salgo con…», tiempo y distancia | `frontend/src/components/SettingsSheet.tsx` | Mover un peso cambia el orden sin recargar | Vitest: soltar lanza una sola petición |
| V-F4 | Front + Motor **[manual en parte]**; parte del front **[manual guiado]** | **Primer despliegue HTTPS**: dominio (DEC-10) o subdominio gratuito; `DOMAIN=<dominio>` en `app/deploy/.env` de la VM (no en `app/.env`); imagen `frontend` multi-stage; `app/data/` en la VM | `deploy/*`, `docs/arquitectura.md` §6 | `https://<dominio>/` abre en un móvil y pide la ubicación | `curl -I https://…/api/health` → 200 con certificado válido. ✅ **16/10:** https://example.com (`docs/arquitectura.md` §6.1) |

## VIERNES 16/10 — detalle de V-D2, V-M2, V-M1, V-R1 y conexión del front (Tasks 26–32)

> Detallado el 16/10 con `superpowers:writing-plans` (rama `motor/vie16-api-conexion`). Especificación: filas V-D2, V-M1, V-M2 y V-R1 de la tabla de arriba, CLAUDE.md §2, §5, §6, §11 y `docs/arquitectura.md` §4. **Fuera de este bloque** (siguen en 501 y el front con datos de ejemplo): `/municipality` (S-M1), `/sources` (S-D1), `/assistant/*` (D-M1), V-D1, V-D3, mapa MapLibre (V-F1), HTTPS (V-F4). La conexión del front (Task 32) la pidió la persona para este encargo, aunque el front sea [manual guiado].

**Objetivo:** que GoMad funcione de punta a punta: `/activities`, `/recommend`, `/route` y `/location` reales sobre `app/data/` y el front llamándolos.

**Arquitectura:** `repository.py` es el único que habla con DuckDB (solo lectura, una conexión por consulta para ver las sustituciones atómicas de `ingest`); `routing/store.py` guarda en memoria los grafos de `data/graph/<zona>/` (cargados en el `lifespan`); `services/recommend.py` y `services/route.py` orquestan el motor (`engine/*`, `routing/graph.py`) sin IA; `engine/explanation.py` redacta con plantillas; `geocoding.py` resuelve texto → coordenadas con el callejero normalizado por `ingest` y el buscador público de Nomecalles. El front cambia el cuerpo de sus funciones de `src/data/` por un cliente HTTP.

**Datos reales comprobados el 16/10** (no inventar otros): `gomad.duckdb` → `destination(id, source, name, type, covered, accessible, condition, owner, water, url, ine_code, lon, lat, green, updated)`, `destination_activity(destination_id, activity, suitability)`, `municipality(ine_code, name [MAYÚSCULAS], population, in_eiel, in_vpla, geom)`, `air_station(id, network [CM|AY], name, ine_code, area_type, lon, lat)`, `route_poi(id, type, source, ine_code, status, working, lon, lat)`, `source_date(source, downloaded, modified)`; `realtime.duckdb` → `forecast(ine_code, ts, temp, feels_like, precip_prob, precip, wind, sky, issued)`, `aqi_hourly(station_id, ts, pollutant [NO2|O3|PM10|PM2_5|SO2], mean, n_hours)`; `graph/{getafe,madrid}/nodes.parquet(node, osm_id, lon, lat)` y `edges.parquet(u, v, length_m, highway, traffic, green_pct, near_*, *_id, geom)` (la `geom` de cada tramo va de `u` a `v`); `clean/municipality.parquet(ine_code, name, name_norm, geometry WKB EPSG:4326, in_eiel, in_vpla)`. Callejero `raw/callejero/gdie_callejero_completo.csv`: **separado por comas**, cp1252, 855.909 filas, `cdtipo` A (portal) / K (punto kilométrico) / V (vial sin número), `cdmuni` 3 dígitos, `dsmuni` con mayúsculas y tildes correctas («Las Rozas de Madrid»), `cdvial`, `cdtvia` («Calle», «Avda»…), `dspart` («de la»), `dsvial`, `tiponumero` (N = número), `numero` («000010»), `calif` (letra), `coord_x`/`coord_y` EPSG:25830. «calle madrid 10 getafe» → `cdvial` 065A0460, x 437838,9803 / y 4461942,0104 → lon −3,7314934 / lat 40,3056775. Buscador de Nomecalles (sin clave) → `data.direcciones[]` con `direccion` («Calle Madrid 10»), `tipo` (`app` portal / `calle`), `municipio` («065»), `nombreMunicipio`, `cdVial`.

**Decisiones de este bloque (criterio propio en `app/config/`, con Ruling en el ledger):**
- `config/recommend.yaml` (nuevo, `own_criterion: true`): `straight_line_detour: 1.3` (distancia a pie ≈ línea recta × 1,3 donde no hay grafo), `dedupe_radius_m: 50` (mismo nombre a < 50 m = mismo sitio en dos fuentes; cierra el Ruling I7 de Task 19), `max_candidates: 400` (por actividad, los más cercanos en línea recta), `indoor_fallback_activity: gym` (alternativa cubierta de RF-09 si la actividad no tiene destinos cubiertos), `air_reading_valid_h: 3` (sin patrón horario V-D3, la última medición vale 3 h; después, aire `null`).
- `config/ica_thresholds.yaml` + `min_coverage: 0.75` (`min_coverage_own_criterion: true`): cobertura mínima de las medias móviles (O₃ 6 de 8 h, PM 18 de 24 h), como pedía el contrato de Task 19.
- `config/routing.yaml` + `snap_max_m: 300` (distancia máxima del punto a la red peatonal; antes valor por defecto en código).
- `config/rules.yaml` → `air.own_criterion_profiles: [senior]`: qué perfiles usan un umbral de aire sin fuente oficial (para marcar «criterio propio» en la explicación).
- `config/sources.yaml` (nuevo): solo `labels` (texto de cada fuente para `DataSource.label`); S-D1 añadirá editor, licencia y URL.

**Restricciones globales de este bloque** (de CLAUDE.md y del encargo; aplican a todas las tareas):
- Código en inglés; comentarios y docstrings en español **sin tildes**; textos visibles en español **con tildes**.
- Cada servicio con su venv y desde su directorio; **ningún import entre `app/api` y `app/ingest`**; datos y config por `GOMAD_DATA_DIR` / `GOMAD_CONFIG_DIR`.
- La IA no decide; aquí no hay IA. **No fijar en código** pesos, umbrales, actividades ni velocidades: `rules.yaml`, `weights.yaml`, `activities.yaml`, `routing.yaml`, `recommend.yaml`.
- **Privacidad:** la ubicación solo en el cuerpo (o en la query de `/location`, que es texto); **nunca en logs**: middleware con método, ruta, código y ms, sin cuerpo ni query.
- **Contrato:** `app/api/schemas.py`. Si cambia: `scripts/export_openapi.py`, `npm run contract` en el front, `test_contract.py` en verde y Ruling.
- Rendimiento: `/recommend` < 3 s y `/route` < 5 s en Getafe y en la capital.
- Nunca un 500 por falta de un dato o por una ruta imposible: factor `null` + `warnings`, o línea recta `approximate`.
- Pruebas del front deterministas: en `MODE=test` datos de ejemplo o `vi.spyOn`/`vi.stubGlobal`, nunca la red.

**Foco de revisión de este bloque** (entradas que ninguna prueba obvia cubre):
1. **Ventana ya pasada o sin previsión** (el front manda «ahora → +3 h» y la previsión de AEMET del municipio no está descargada o es vieja): horas sin nota o con factores `null`, aviso legible y nunca 500. → Task 29 `test_window_in_past_warns`, `test_missing_factors_renormalize_with_warnings`.
2. **Mismo sitio en dos fuentes** (EIEL y Nomecalles con el mismo parque): el top 3 no lo repite. → Task 29 `test_dedupe_same_name_close`.
3. **Punto de origen o destino fuera de cualquier grafo** (Patones, o un punto en mitad del campo): `/recommend` usa línea recta × 1,3 marcada «aproximada» y `/route` línea recta `approximate=True`. → Task 29 `test_distance_graph_or_approximate`, Task 30 `test_route_outside_graph_is_approximate`.
4. **Buscador de Nomecalles caído o lento** (timeout, 5xx, JSON raro): `/location` responde con el callejero local, sin esperar más de 3 s. → Task 31 `test_location_nomecalles_down_falls_back_local`.
5. **Geolocalización denegada o sin HTTPS** (la VM de la demo va por HTTP hasta V-F4): mensaje claro y se puede escribir una dirección. → Task 32 `geolocation.test.ts`.

---

### Task 26: V-D2 (1/2) · Callejero normalizado para `/location`

**Rol:** Datos · **Servicio:** `app/ingest/` · **Depende de:** Task 16 (`common.py`) · **Duración:** 45 min

**Ficheros:** Crear `normalize/addresses.py`, `tests/test_addresses.py`, `tests/data/callejero_sample.csv` (cp1252).

**Interfaces:**
- Consume: `common.RAW`, `common.ine_code`, `common.to_wgs84`, `common.write`; `normalize.normalizer`.
- Produce: `app/data/clean/addresses.parquet` con columnas `ine_code` (str 5), `municipality` (`dsmuni`), `street_code` (`cdvial`), `street_type` (`cdtvia`), `street` (`dspart` + `dsvial`), `street_norm` (`plain(street)`), `number` (Int64, nulo en filas de vial), `letter` (`calif`), `lon`, `lat` (EPSG:4326). `plain(text)`: minúsculas, sin tildes, solo `[a-z0-9]` separados por un espacio (la API usa la misma regla en `geocoding.plain`). `build(path) -> pandas.DataFrame`.

- [ ] **Paso 1: prueba que falla** — `tests/data/callejero_sample.csv` (escribirlo en cp1252 con Python: `pathlib.Path(...).write_text(texto, encoding="cp1252")`):

```
cdtipo,cdmuni,dsmuni,cdtvia,cdvial,dspart,dsvial,tiponumero,numero,calif,coord_x,coord_y
"A","065","Getafe","Calle","065A0460","","Madrid","N","000010"," ",437838.98030000,4461942.01040000
"A","065","Getafe","Calle","065A0460","","Madrid","N","000065","B",438024.93100000,4462262.10770000
"K","061","Galapagar","Ctra","061C0001","","El Escorial","","9600","",419343.90540000,4495000.00000000
"V","006","Alcobendas","Calle","006A0078","de la","Constitución","","","",445785.36110000,4488340.73990000
"A","079","Madrid","Calle","079A0001","","Sin Número","S","000000","",440000.00000000,4474000.00000000
```

`tests/test_addresses.py`:

```python
import pathlib

import pandas as pd
import pytest

from common import CLEAN, to_wgs84
from normalize import load_all
from normalize.addresses import build, plain

SAMPLE = pathlib.Path(__file__).parent / "data" / "callejero_sample.csv"


def test_plain():
    assert plain("Cñada. de la Ñora-Vieja") == "cnada de la nora vieja"
    assert plain("  GRAN   Vía ") == "gran via"


def test_build_keeps_numbered_portals_and_streets():
    out = build(SAMPLE)
    assert len(out) == 3                                   # fuera: punto kilometrico (K) y portal sin numero (S)
    row = out[(out.ine_code == "28065") & (out.number == 10)].iloc[0]
    lon, lat = to_wgs84([437838.9803], [4461942.0104])
    assert row.lon == pytest.approx(lon[0]) and row.lat == pytest.approx(lat[0])
    assert (row.street, row.street_norm, row.street_type, row.municipality, row.street_code) == (
        "Madrid", "madrid", "Calle", "Getafe", "065A0460")
    assert out[out.number == 65].letter.item() == "B"
    street = out[out.ine_code == "28006"].iloc[0]
    assert pd.isna(street.number)
    assert street.street == "de la Constitución" and street.street_norm == "de la constitucion"
    assert not (out.municipality == "Galapagar").any()


@pytest.mark.slow
def test_addresses_real():
    load_all()["addresses"]()
    out = pd.read_parquet(CLEAN / "addresses.parquet")
    assert out.ine_code.nunique() == 179
    row = out[(out.ine_code == "28065") & (out.street_code == "065A0460") & (out.number == 10)].iloc[0]
    assert row.lon == pytest.approx(-3.7314934, abs=1e-6) and row.lat == pytest.approx(40.3056775, abs=1e-6)
    assert out.lon.between(-4.7, -3.0).all() and out.lat.between(39.8, 41.2).all()
```

- [ ] **Paso 2:** Run: `.venv/bin/pytest tests/test_addresses.py -q -m "not slow"` → Esperado: FAIL con `ModuleNotFoundError: No module named 'normalize.addresses'`.
- [ ] **Paso 3: implementación** — `normalize/addresses.py`:

```python
"""Callejero completo 2025 (IDEM) -> clean/addresses.parquet para /location (D-04).

CSV separado por comas, cp1252, coordenadas EPSG:25830. Una fila por portal (cdtipo A), punto kilometrico (K)
o vial sin numero (V). Se quedan los portales con numero (A + tiponumero N) y los viales (V) para la precision «calle».
"""
import re
import unicodedata

import pandas as pd

from common import RAW, ine_code, to_wgs84, write
from normalize import normalizer

SOURCE = RAW / "callejero" / "gdie_callejero_completo.csv"
COLUMNS = ["cdtipo", "cdmuni", "dsmuni", "cdtvia", "cdvial", "dspart", "dsvial", "tiponumero", "numero", "calif",
           "coord_x", "coord_y"]


def plain(text):
    # misma regla que api/geocoding.py: minusculas, sin tildes, solo letras y numeros
    s = unicodedata.normalize("NFKD", str(text)).encode("ascii", "ignore").decode().lower()
    return " ".join(re.sub(r"[^a-z0-9]+", " ", s).split())


def build(path):
    df = pd.read_csv(path, sep=",", dtype=str, encoding="cp1252", usecols=COLUMNS, keep_default_na=False)
    numbered = (df["cdtipo"] == "A") & (df["tiponumero"] == "N") & df["numero"].str.strip().str.isdigit()
    df = df[numbered | (df["cdtipo"] == "V")].copy()
    x = pd.to_numeric(df["coord_x"].str.replace(",", "."), errors="coerce")
    y = pd.to_numeric(df["coord_y"].str.replace(",", "."), errors="coerce")
    df, x, y = df[x.notna() & y.notna()], x[x.notna() & y.notna()], y[x.notna() & y.notna()]
    lon, lat = to_wgs84(x.to_numpy(), y.to_numpy())
    street = (df["dspart"].str.strip() + " " + df["dsvial"].str.strip()).str.strip()
    number = [int(n) if t == "A" else None for n, t in zip(df["numero"], df["cdtipo"])]
    out = pd.DataFrame({
        "ine_code": df["cdmuni"].map(ine_code).to_numpy(),
        "municipality": df["dsmuni"].str.strip().to_numpy(),
        "street_code": df["cdvial"].str.strip().to_numpy(),
        "street_type": df["cdtvia"].str.strip().to_numpy(),
        "street": street.to_numpy(),
        "street_norm": street.map(plain).to_numpy(),
        "number": pd.array(number, dtype="Int64"),
        "letter": df["calif"].str.strip().to_numpy(),
        "lon": lon, "lat": lat})
    return out[out["ine_code"].notna()].reset_index(drop=True)


@normalizer("addresses")
def run():
    return write(build(SOURCE), "addresses")
```

- [ ] **Paso 4:** Run: `.venv/bin/pytest tests/test_addresses.py -q -m "not slow"` → Esperado: `2 passed`. Si falta el CSV real: `.venv/bin/python scripts/download_sources.py --only callejero --include-heavy`. Después `.venv/bin/python -m normalize addresses` y `.venv/bin/pytest tests/test_addresses.py -q` → Esperado: `3 passed` (apuntar filas y segundos).
- [ ] **Paso 5: commit** — `git -C ../.. add app/ingest/normalize/addresses.py app/ingest/tests/test_addresses.py app/ingest/tests/data/callejero_sample.csv && git -C ../.. commit -m "Datos: callejero normalizado para /location (V-D2)"`

**Terminado cuando:** `clean/addresses.parquet` existe con los 179 municipios y «Calle Madrid 10, Getafe» en lon −3,7314934 / lat 40,3056775.

---

### Task 27: V-M2 · Explicaciones con plantillas

**Rol:** Motor · **Servicio:** `app/api/` · **Depende de:** Tasks 12–14 · **Duración:** 1 h

**Ficheros:** Crear `engine/explanation.py`, `tests/engine/test_explanation.py`.

**Interfaces:**
- Consume: `engine.rules.CATEGORY_LABEL`; objetos con `.hour`, `.score`, `.outdoor_ok`, `.reasons` (`engine.slots.HourResult`).
- Produce: `fmt_number(value, decimals=1) -> str` («8,7»), `fmt_distance(m) -> str` («850 m», «1,2 km»), `fmt_minutes(min) -> str` («16 min»), `fmt_hour(dt) -> str` («20:00»), `fmt_date(dt) -> str` («16/10 a las 12:01»); `factor_text(factor, value, *, distance_m=None, green=None, aqi_category=None, precip_prob=None, covered=False) -> str`; `@dataclass ExplanationInput(name, distance_m, duration_min, score, factors: list[tuple[str, float|None, float]], first, best, indoor_alternative=False, activity_label=None, own_criterion_rule=False, sources: list[tuple[str, datetime|None]] = [], approximate_distance=False)`; `explain(x: ExplanationInput) -> str`; `route_description(distance_m, duration_min, green_pct, traffic_m, counts: dict[str, int], approximate=False) -> str`.

- [ ] **Paso 1: pruebas que fallan** — `tests/engine/test_explanation.py`:

```python
import re
from datetime import datetime

from engine.explanation import (ExplanationInput, explain, factor_text, fmt_distance, fmt_minutes, fmt_number,
                                route_description)
from engine.slots import HourResult

H = lambda h: datetime(2026, 7, 15, h)


def carmen(**kw):
    first = HourResult(H(17), None, False, ["Calor: sensación térmica de 36 °C"])
    best = HourResult(H(20), 8.2, True)
    base = dict(name="Parque Uno", distance_m=1234.0, duration_min=16.4, score=8.26,
                factors=[("proximity", 7.0, 0.3), ("green", 8.0, 0.2), ("air", 10.0, 0.15), ("weather", None, 0.0)],
                first=first, best=best)
    return ExplanationInput(**{**base, **kw})


def test_formats():
    assert fmt_number(8.26) == "8,3" and fmt_distance(840) == "840 m" and fmt_distance(1234) == "1,2 km"
    assert fmt_minutes(16.4) == "16 min" and fmt_minutes(0.2) == "1 min"


def test_carmen_now_no_better_later():
    text = explain(carmen())
    assert text.startswith("Ahora no: mejor a las 20:00 (calor: sensación térmica de 36 °C)")


def test_numbers_in_sentence_come_from_object():
    text = explain(carmen())
    assert set(re.findall(r"\d+(?:,\d+)?", text)) == {"20", "00", "36", "1,2", "16", "8,3", "10"}
    assert "Destaca por zona verde y cercanía" in text or "Destaca por cercanía y zona verde" in text


def test_best_hour_now():
    text = explain(carmen(first=HourResult(H(20), 8.2, True), best=HourResult(H(20), 8.2, True)))
    assert text.startswith("Mejor hora: 20:00")


def test_no_viable_hour():
    text = explain(carmen(best=None))
    assert text.startswith("Ahora no se recomienda al aire libre en toda la ventana elegida (calor")


def test_own_criterion_is_marked():
    assert "(umbral de criterio propio)" in explain(carmen(own_criterion_rule=True))
    assert "criterio propio" not in explain(carmen())


def test_surprise_activity_indoor_and_sources():
    text = explain(carmen(activity_label="Nadar", indoor_alternative=True,
                          sources=[("Previsión horaria (AEMET)", datetime(2026, 7, 15, 12, 1)), ("Aire", None)],
                          approximate_distance=True))
    assert "Para nadar: Parque Uno, a 1,2 km aprox. (16 min a pie)" in text
    assert "Es un sitio cubierto" in text
    assert text.endswith("Fuentes: Previsión horaria (AEMET) (15/07 a las 12:01); Aire.")


def test_factor_texts():
    assert factor_text("proximity", 7.0, distance_m=850) == "Cercanía: a 850 m"
    assert factor_text("green", None, green=None) == "Verde: sin datos en este municipio"
    assert factor_text("green", 6.5, green=0.65) == "Verde: 65 % de zona verde alrededor"
    assert factor_text("air", 8.0, aqi_category="fair") == "Aire: razonablemente buena"
    assert factor_text("air", None) == "Aire: sin medición reciente"
    assert factor_text("air", None, covered=True) == "Aire: no cuenta en un sitio cubierto"
    assert factor_text("weather", 7.0, precip_prob=30) == "Lluvia: 30 % de probabilidad"
    assert factor_text("suitability", 9.0) == "Adecuación a la actividad: 9,0 sobre 10"


def test_route_description():
    text = route_description(2430, 32.4, 68.2, 350, {"fountain": 2, "bench": 1, "aed": 0})
    assert text == "2,4 km, 32 min a pie, 68 % por zona verde, 350 m junto a tráfico, 2 fuentes, 1 banco"
    assert "sin datos de zona verde" in route_description(500, 7, None, 0, {})
    assert "sin tramos con tráfico" in route_description(500, 7, None, 0, {})
    assert route_description(800, 11, None, 0, {}, approximate=True).startswith("Línea recta de 800 m")
```

- [ ] **Paso 2:** Run: `.venv/bin/pytest tests/engine/test_explanation.py -q` → Esperado: FAIL con `ModuleNotFoundError: No module named 'engine.explanation'`.
- [ ] **Paso 3: implementación** — `engine/explanation.py`:

```python
"""Explicaciones en lenguaje llano con plantillas (RF-10, V-M2). Sin IA: solo cifras que ya estan en la respuesta."""
from dataclasses import dataclass, field
from datetime import datetime

from engine.rules import CATEGORY_LABEL

FACTOR_LABEL = {"proximity": "cercanía", "suitability": "adecuación a la actividad", "green": "zona verde",
                "air": "calidad del aire", "weather": "tiempo"}


def fmt_number(value, decimals=1):
    return f"{value:.{decimals}f}".replace(".", ",")


def fmt_distance(meters):
    if meters < 1000:
        return f"{round(meters / 10) * 10:.0f} m"
    return f"{fmt_number(meters / 1000)} km"


def fmt_minutes(minutes):
    return f"{max(1, round(minutes))} min"


def fmt_hour(dt):
    return dt.strftime("%H:%M")


def fmt_date(dt):
    return dt.strftime("%d/%m a las %H:%M")


def factor_text(factor, value, *, distance_m=None, green=None, aqi_category=None, precip_prob=None, covered=False):
    if factor == "proximity":
        return f"Cercanía: a {fmt_distance(distance_m)}"
    if factor == "suitability":
        return f"Adecuación a la actividad: {fmt_number(value)} sobre 10"
    if factor == "green":
        return "Verde: sin datos en este municipio" if green is None else f"Verde: {round(green * 100)} % de zona verde alrededor"
    if factor == "air":
        if covered:
            return "Aire: no cuenta en un sitio cubierto"
        return "Aire: sin medición reciente" if aqi_category is None else f"Aire: {CATEGORY_LABEL[aqi_category].lower()}"
    if factor == "weather":
        if covered:
            return "Tiempo: no cuenta en un sitio cubierto"
        return "Tiempo: sin previsión" if precip_prob is None else f"Lluvia: {round(precip_prob)} % de probabilidad"
    raise ValueError(f"Factor desconocido: {factor}")


@dataclass
class ExplanationInput:
    name: str
    distance_m: float
    duration_min: float
    score: float
    factors: list                      # [(factor, valor 0-10 o None, peso efectivo)]
    first: object | None               # HourResult de la primera hora de la ventana
    best: object | None                # HourResult de la mejor hora
    indoor_alternative: bool = False
    activity_label: str | None = None  # «Sorprendeme»: actividad propuesta
    own_criterion_rule: bool = False   # la regla que bloquea la primera hora no tiene fuente oficial
    sources: list = field(default_factory=list)   # [(etiqueta, fecha o None)]
    approximate_distance: bool = False


def _lower_first(text):
    return text[:1].lower() + text[1:]


def explain(x):
    parts = []
    blocked = x.first is not None and x.first.outdoor_ok is False
    reasons = "; ".join(_lower_first(r) for r in x.first.reasons) if blocked else ""
    mark = " (umbral de criterio propio)" if blocked and x.own_criterion_rule else ""
    if x.best is None:
        parts.append(f"Ahora no se recomienda al aire libre en toda la ventana elegida ({reasons}{mark})" if blocked
                     else "Sin datos para elegir la mejor hora")
    elif blocked and x.best.hour != x.first.hour:
        parts.append(f"Ahora no: mejor a las {fmt_hour(x.best.hour)} ({reasons}{mark})")
    else:
        parts.append(f"Mejor hora: {fmt_hour(x.best.hour)}")
    approx = " aprox." if x.approximate_distance else ""
    where = f"{x.name}, a {fmt_distance(x.distance_m)}{approx} ({fmt_minutes(x.duration_min)} a pie)"
    if x.activity_label:
        where = f"Para {x.activity_label.lower()}: {where}"
    parts.append(f"{where}; nota {fmt_number(x.score)} sobre 10")
    ranked = sorted(((w * v, f) for f, v, w in x.factors if v is not None and w > 0), reverse=True)
    dominant = [f for contribution, f in ranked[:2] if contribution > 0]
    if dominant:
        parts.append("Destaca por " + " y ".join(FACTOR_LABEL[f] for f in dominant))
    if x.indoor_alternative:
        parts.append("Es un sitio cubierto: alternativa por lluvia, calor o mal aire")
    if x.sources:
        parts.append("Fuentes: " + "; ".join(f"{label} ({fmt_date(d)})" if d else label for label, d in x.sources))
    return ". ".join(parts) + "."


def route_description(distance_m, duration_min, green_pct, traffic_m, counts, approximate=False):
    if approximate:
        return (f"Línea recta de {fmt_distance(distance_m)} ({fmt_minutes(duration_min)} a pie, aproximada): "
                "no hay red peatonal cargada para este trayecto.")
    parts = [fmt_distance(distance_m), f"{fmt_minutes(duration_min)} a pie",
             "sin datos de zona verde" if green_pct is None else f"{round(green_pct)} % por zona verde",
             f"{fmt_distance(traffic_m)} junto a tráfico" if traffic_m > 0 else "sin tramos con tráfico"]
    for key, one, many in (("fountain", "fuente", "fuentes"), ("bench", "banco", "bancos"),
                           ("aed", "desfibrilador", "desfibriladores")):
        n = counts.get(key, 0)
        if n:
            parts.append(f"{n} {one if n == 1 else many}")
    return ", ".join(parts)
```

- [ ] **Paso 4:** Run: `.venv/bin/pytest tests/engine/test_explanation.py -q` → Esperado: `9 passed`.
- [ ] **Paso 5: commit** — `git -C ../.. add app/api/engine/explanation.py app/api/tests/engine/test_explanation.py && git -C ../.. commit -m "Motor: explicaciones en lenguaje llano con plantillas (V-M2)"`

**Terminado cuando:** las cifras de cada frase salen del objeto y Carmen recibe «Ahora no: mejor a las …».

---

### Task 28: V-M1 (1/2) · `repository.py`, datos de prueba y configuración de `/recommend`

**Rol:** Motor · **Servicio:** `app/api/` · **Depende de:** Tasks 19, 26 · **Duración:** 1,5 h

**Ficheros:** Crear `repository.py`, `tests/mini_data.py`, `tests/test_repository.py`, `../config/recommend.yaml`, `../config/sources.yaml`. Modificar `../config/ica_thresholds.yaml`, `../config/routing.yaml`, `../config/rules.yaml`, `../config/README.md`, `engine/rules.py` (`AIR_META_KEYS`), `tests/engine/test_rules.py`.

**Interfaces:**
- Consume: tablas reales de `gomad.duckdb` y `realtime.duckdb` (ver «Datos reales» arriba); `clean/addresses.parquet` (Task 26); `engine.rules.aqi_category`.
- Produce (`repository.py`): `class DataUnavailable(Exception)`; `haversine_m(lon1, lat1, lon2, lat2) -> ndarray` (vectorizado); `parse_date(text) -> datetime | None` (ISO o RFC 1123 → hora local de Madrid sin zona); `category_at(readings: list[tuple[datetime, str]], hour, valid_h) -> str | None`; `@dataclass Candidate(id, source, name, type, covered, ine_code, lon, lat, green, activity, suitability, straight_m)`; `@dataclass Station(id, network, name, lon, lat)`; `class Repository(data_dir)` con `candidates(lon, lat, radius_m, activities, setting, per_activity) -> list[Candidate]`, `forecast(ine_codes, start, end) -> (dict[ine, dict[datetime, (temp, feels, prob)]], dict[ine, datetime|None])`, `stations() -> list[Station]`, `air_categories(start, end, ica, valid_h) -> dict[station_id, list[(ts, category)]]`, `source_dates() -> dict[str, datetime|None]`, `municipality_names() -> dict[ine, str]`, `route_pois(min_lon, min_lat, max_lon, max_lat) -> list[tuple(id, type, source, lon, lat)]`. `tests/mini_data.py`: `NOW`, `ORIGIN`, `build_mini_data(base, *, forecast=True, precip=0.0, feels=20.0, air=True, graph=False) -> Path` (lo usan Tasks 29–31).

- [ ] **Paso 1: configuración** — `../config/recommend.yaml`:

```yaml
# Parametros de /recommend sin fuente oficial (V-M1, 16/10/2026). CRITERIO PROPIO: la app lo dice.
own_criterion: true
straight_line_detour: 1.3        # distancia a pie ~ linea recta x 1,3 donde no hay grafo peatonal cargado
dedupe_radius_m: 50              # mismo nombre a menos de 50 m = mismo sitio en dos fuentes (Ruling I7 de Task 19)
max_candidates: 400              # por actividad, los mas cercanos en linea recta (latencia < 3 s)
indoor_fallback_activity: gym    # RF-09: alternativa cubierta si la actividad no tiene destinos cubiertos
air_reading_valid_h: 3           # sin patron horario (V-D3), la ultima medicion vale estas horas; despues, aire null
```

`../config/sources.yaml`:

```yaml
# Texto de cada fuente para la persona (DataSource.label). S-D1 anadira editor, licencia y URL.
labels:
  eiel_deporte: "Instalaciones deportivas (EIEL 2023, Comunidad de Madrid)"
  eiel_parques: "Parques (EIEL 2023, Comunidad de Madrid)"
  nmc_deporte: "Instalaciones deportivas (Nomecalles, Comunidad de Madrid)"
  nmc_parques: "Parques (Nomecalles, Comunidad de Madrid)"
  vpla_redes: "Zonas verdes del planeamiento (Comunidad de Madrid)"
  areas_recreativas: "Áreas recreativas (Comunidad de Madrid)"
  ay_idb: "Instalaciones deportivas básicas (Ayuntamiento de Madrid)"
  ay_piscinas: "Piscinas públicas (Ayuntamiento de Madrid)"
  ay_polideportivos: "Polideportivos (Ayuntamiento de Madrid)"
  ay_parques: "Parques y jardines (Ayuntamiento de Madrid)"
  aire_dia: "Calidad del aire (Comunidad de Madrid)"
  ay_aire: "Calidad del aire (Ayuntamiento de Madrid)"
  aemet: "Previsión horaria (AEMET)"
  osm: "Red peatonal y mobiliario (© colaboradores de OpenStreetMap)"
  ay_fuentes: "Fuentes de agua (Ayuntamiento de Madrid)"
  ay_bancos: "Bancos (Ayuntamiento de Madrid)"
  ay_areas_caninas: "Áreas caninas (Ayuntamiento de Madrid)"
  desfibriladores: "Desfibriladores (Comunidad de Madrid)"
  callejero: "Callejero (Comunidad de Madrid)"
  "config:weights": "Pesos por defecto de la nota (criterio propio)"
  "config:routing": "Pesos de la ruta saludable (criterio propio)"
```

Añadir al final de `../config/ica_thresholds.yaml`:

```yaml
# Cobertura minima de las medias moviles para dar categoria (O3 8 h -> 6 h, PM 24 h -> 18 h; NO2/SO2 1 h).
# CRITERIO PROPIO (Ruling I2 de Task 19): una hora suelta de O3 o PM no es el ICA.
min_coverage: 0.75
min_coverage_own_criterion: true
```

En `../config/routing.yaml`, tras `poi_radius_m`: `snap_max_m: 300        # distancia maxima de un punto a la red peatonal (criterio propio)`. En `../config/rules.yaml`, dentro de `air`, tras `own_criterion`: `own_criterion_profiles: [senior]   # perfiles cuyo umbral no sale del BOE`. En `../config/README.md`, filas nuevas: `recommend.yaml` (parámetros de `/recommend`, criterio propio, V-M1) y `sources.yaml` (etiquetas de fuentes; S-D1 lo amplía).

- [ ] **Paso 2: prueba de la regla de aire** — en `tests/engine/test_rules.py` añadir:

```python
def test_air_meta_key_own_criterion_profiles_is_not_a_profile():
    rules = {"air": {"general": "poor", "own_criterion": True, "own_criterion_profiles": ["senior"]}}
    validate_rules(rules)                      # no debe tomarlo por un perfil con categoria invalida
    ctx = HourContext(datetime(2026, 7, 15, 10), 20, 20, 0, "poor")
    assert evaluate_outdoor(ctx, "own_criterion_profiles", rules).outdoor_ok is False   # cae a general
```

Run: `.venv/bin/pytest tests/engine/test_rules.py -q` → Esperado: FAIL (`ValueError: rules.yaml: air.own_criterion_profiles = ['senior'] no es una categoría`). Implementación: `AIR_META_KEYS = ("source", "own_criterion", "own_criterion_profiles")` en `engine/rules.py`. Run de nuevo → Esperado: PASS.

- [ ] **Paso 3: datos de prueba** — `tests/mini_data.py`:

```python
"""Datos minimos con el mismo esquema que app/data (comprobado el 16/10) para pruebas rapidas sin datos reales."""
from datetime import datetime, timedelta

import duckdb
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import shapely
from shapely.geometry import LineString, box

NOW = datetime(2026, 10, 16, 10, 0)            # hora local de Madrid sin zona
ORIGIN = {"lat": 40.3050, "lon": -3.7300}      # nodo 0 del grafo mini

# id, source, name, type, covered, ine_code, lon, lat, green, {actividad: suitability}
DESTINATIONS = [
    ("eiel_parques:1", "eiel_parques", "Parque Uno", "park", False, "28065", -3.7289, 40.3050, 0.8, {"walk": 1.0, "run": 0.8}),
    ("nmc_parques:1", "nmc_parques", "PARQUE UNO", "park", False, "28065", -3.72893, 40.30503, 0.8, {"walk": 1.0}),
    ("nmc_parques:2", "nmc_parques", "Parque Dos", "park", False, "28065", -3.7300, 40.3100, None, {"walk": 1.0}),
    ("eiel_deporte:1", "eiel_deporte", "Polideportivo Cubierto", "facility", True, "28065", -3.7250, 40.3050, 0.1, {"gym": 1.0}),
    ("ay_parques:1", "ay_parques", "Parque Capital", "park", False, "28079", -3.7300, 40.3080, None, {"walk": 0.9}),
    ("nmc_parques:3", "nmc_parques", "Parque Lejano", "park", False, "28065", -3.7300, 40.3500, 0.5, {"walk": 1.0}),
    ("eiel_deporte:2", "eiel_deporte", "Pista de Atletismo", "facility", False, "28065", -3.7310, 40.3055, 0.3, {"run": 1.0}),
]
ADDRESSES = [   # ine_code, municipality, street_code, street_type, street, street_norm, number, letter, lon, lat
    ("28065", "Getafe", "065A0460", "Calle", "Madrid", "madrid", 10, "", -3.7314934, 40.3056775),
    ("28065", "Getafe", "065A0460", "Calle", "Madrid", "madrid", 12, "", -3.7314000, 40.3057500),
    ("28065", "Getafe", "065A0460", "Calle", "Madrid", "madrid", None, "", -3.7316000, 40.3050000),
    ("28065", "Getafe", "065A0100", "Calle", "de la Constitución", "de la constitucion", 5, "", -3.7290000, 40.3060000),
    ("28079", "Madrid", "079A0001", "Calle", "Gran Vía", "gran via", 1, "", -3.7019000, 40.4196000),
]
MUNICIPALITY_BOXES = {"28065": ("GETAFE", box(-3.80, 40.25, -3.65, 40.34)),
                      "28079": ("MADRID", box(-3.85, 40.34, -3.55, 40.55))}


def _graph(directory):
    """   0 --(100 m, avenida)-- 1          0 = ORIGIN, 1 = Parque Uno
          |                      |
       (80 m, parque)        (80 m, parque)      4 -- 5 aislados (fuera de la componente principal)
          |                      |
          2 --(60 m, parque)---- 3"""
    directory.mkdir(parents=True)
    nodes = pd.DataFrame({"node": range(6), "osm_id": range(6),
                          "lon": [-3.7300, -3.7289, -3.7300, -3.7289, -3.7000, -3.6990],
                          "lat": [40.3050, 40.3050, 40.3043, 40.3043, 40.3100, 40.3100]})
    rows = [(0, 1, 100, 1.0, 0.0), (0, 2, 80, 0.0, 1.0), (2, 3, 60, 0.0, 1.0), (3, 1, 80, 0.0, 1.0), (4, 5, 85, 0.0, 0.0)]
    edges = pd.DataFrame(rows, columns=["u", "v", "length_m", "traffic", "green_pct"])
    edges["highway"] = "footway"
    for k in ("near_fountain", "near_bench", "near_aed"):
        edges[k] = False
    edges["geom"] = [LineString([(nodes.lon[u], nodes.lat[u]), (nodes.lon[v], nodes.lat[v])]).wkb
                     for u, v in zip(edges.u, edges.v)]
    nodes.to_parquet(directory / "nodes.parquet")
    edges.to_parquet(directory / "edges.parquet")


def build_mini_data(base, *, forecast=True, precip=0.0, feels=20.0, air=True, graph=False):
    """precip: numero o funcion hora_relativa -> probabilidad (para simular lluvia solo a ciertas horas)."""
    base.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(base / "gomad.duckdb"))
    con.execute("""CREATE TABLE destination (id VARCHAR, source VARCHAR, name VARCHAR, type VARCHAR, covered BOOLEAN,
                   accessible BOOLEAN, condition VARCHAR, owner VARCHAR, water BOOLEAN, url VARCHAR, ine_code VARCHAR,
                   lon DOUBLE, lat DOUBLE, green DOUBLE, updated TIMESTAMP)""")
    con.execute("CREATE TABLE destination_activity (destination_id VARCHAR, activity VARCHAR, suitability DOUBLE)")
    for d in DESTINATIONS:
        con.execute("INSERT INTO destination VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?)", [*d[:9], NOW])
        for activity, suitability in d[9].items():
            con.execute("INSERT INTO destination_activity VALUES (?, ?, ?)", [d[0], activity, suitability])
    con.execute("CREATE TABLE municipality (ine_code VARCHAR, name VARCHAR, population BIGINT, in_eiel BOOLEAN, in_vpla BOOLEAN)")
    con.execute("INSERT INTO municipality VALUES ('28065', 'GETAFE', 193238, false, true), ('28079', 'MADRID', 3506730, false, false)")
    con.execute("CREATE TABLE air_station (id VARCHAR, network VARCHAR, name VARCHAR, ine_code VARCHAR, area_type VARCHAR, lon DOUBLE, lat DOUBLE)")
    con.execute("INSERT INTO air_station VALUES ('28065014', 'CM', 'Getafe', '28065', 'Urbana', -3.7310, 40.3060)")
    con.execute("""CREATE TABLE route_poi (id VARCHAR, type VARCHAR, source VARCHAR, ine_code VARCHAR, status VARCHAR,
                   working BOOLEAN, lon DOUBLE, lat DOUBLE)""")
    con.execute("""INSERT INTO route_poi VALUES
        ('ay_fuentes:1', 'fountain', 'ay_fuentes', '28065', NULL, true, -3.7300, 40.30465),
        ('ay_fuentes:2', 'fountain', 'ay_fuentes', '28065', 'CERRADA_TEMPORALMENT', false, -3.72945, 40.3043),
        ('osm:node/1', 'bench', 'osm', '28065', NULL, NULL, -3.72945, 40.30435)""")
    con.execute("CREATE TABLE source_date (source VARCHAR, downloaded VARCHAR, modified VARCHAR)")
    con.execute("""INSERT INTO source_date VALUES ('eiel_parques', '2026-10-14T15:51:38', NULL),
        ('aire_dia', '2026-10-16T09:10:00', '2026-10-16T09:05:00.123456'),
        ('osm', '2026-10-14T15:42:30', 'Tue, 13 Oct 2026 23:55:22 GMT')""")
    con.close()
    rt = duckdb.connect(str(base / "realtime.duckdb"))
    rt.execute("""CREATE TABLE forecast (ine_code VARCHAR, ts TIMESTAMP_NS, temp DOUBLE, feels_like DOUBLE,
                  precip_prob DOUBLE, precip DOUBLE, wind INTEGER, sky VARCHAR, issued VARCHAR)""")
    if forecast:
        for h in range(6):
            p = precip(h) if callable(precip) else precip
            rt.execute("INSERT INTO forecast VALUES ('28065', ?, ?, ?, ?, 0, 5, 'Despejado', '2026-10-16T08:00:00')",
                       [NOW + timedelta(hours=h), feels, feels, p])
    rt.execute("CREATE TABLE aqi_hourly (station_id VARCHAR, ts TIMESTAMP_NS, pollutant VARCHAR, mean DOUBLE, n_hours BIGINT)")
    if air:
        # NO2 30 -> buena; PM10 45 seria «regular», pero con 15 de 24 h no llega a la cobertura minima
        rt.execute("INSERT INTO aqi_hourly VALUES ('28065014', ?, 'NO2', 30.0, 1), ('28065014', ?, 'PM10', 45.0, 15)",
                   [NOW - timedelta(hours=1)] * 2)
    rt.close()
    clean = base / "clean"
    clean.mkdir(exist_ok=True)
    pd.DataFrame(ADDRESSES, columns=["ine_code", "municipality", "street_code", "street_type", "street", "street_norm",
                                     "number", "letter", "lon", "lat"]).astype({"number": "Int64"}).to_parquet(
        clean / "addresses.parquet", index=False)
    pq.write_table(pa.table({"ine_code": list(MUNICIPALITY_BOXES),
                             "name": [n for n, _ in MUNICIPALITY_BOXES.values()],
                             "geometry": [shapely.to_wkb(g) for _, g in MUNICIPALITY_BOXES.values()]}),
                   clean / "municipality.parquet")
    if graph:
        _graph(base / "graph" / "mini")
    return base
```

- [ ] **Paso 4: pruebas que fallan** — `tests/test_repository.py`:

```python
from datetime import datetime, timedelta

import pytest

from mini_data import NOW, ORIGIN, build_mini_data
from repository import DataUnavailable, Repository, category_at, haversine_m, parse_date
import settings

ICA = settings.load("ica_thresholds")


@pytest.fixture
def repo(tmp_path):
    return Repository(build_mini_data(tmp_path / "data"))


def test_haversine():
    assert float(haversine_m(-3.7300, 40.3050, -3.7289, 40.3050)) == pytest.approx(93, abs=1)


def test_candidates_by_box_distance_and_activity(repo):
    found = repo.candidates(ORIGIN["lon"], ORIGIN["lat"], 1000, ["walk"], "any", 400)
    assert {c.id for c in found} == {"eiel_parques:1", "nmc_parques:1", "nmc_parques:2", "ay_parques:1"}
    first = min(found, key=lambda c: c.straight_m)
    assert first.activity == "walk" and first.suitability == 1.0 and first.straight_m == pytest.approx(93, abs=1)
    assert next(c for c in found if c.id == "nmc_parques:2").green is None


def test_candidates_setting_and_limit(repo):
    assert [c.id for c in repo.candidates(ORIGIN["lon"], ORIGIN["lat"], 1000, ["walk", "gym"], "indoor", 400)] == ["eiel_deporte:1"]
    assert "eiel_deporte:1" not in {c.id for c in repo.candidates(ORIGIN["lon"], ORIGIN["lat"], 1000, ["gym"], "outdoor", 400)}
    assert len(repo.candidates(ORIGIN["lon"], ORIGIN["lat"], 1000, ["walk"], "any", 2)) == 2


def test_forecast_in_window(repo):
    by, issued = repo.forecast(["28065", "28079"], NOW, NOW + timedelta(hours=2))
    assert sorted(by["28065"]) == [NOW + timedelta(hours=h) for h in range(3)]
    assert by["28065"][NOW] == (20.0, 20.0, 0.0)
    assert "28079" not in by and issued["28065"] == datetime(2026, 10, 16, 8, 0)


def test_air_categories_require_coverage(repo):
    cats = repo.air_categories(NOW, NOW + timedelta(hours=2), ICA, 3)
    assert cats == {"28065014": [(NOW - timedelta(hours=1), "good")]}    # PM10 con 15 h no cuenta


def test_category_at_uses_last_reading_within_valid_hours():
    readings = [(NOW - timedelta(hours=1), "good"), (NOW, "moderate")]
    assert category_at(readings, NOW - timedelta(hours=1), 3) == "good"
    assert category_at(readings, NOW + timedelta(hours=3), 3) == "moderate"
    assert category_at(readings, NOW + timedelta(hours=4), 3) is None
    assert category_at(readings, NOW - timedelta(hours=2), 3) is None


def test_parse_date():
    assert parse_date("2026-10-16T09:05:00.123456") == datetime(2026, 10, 16, 9, 5, 0, 123456)
    assert parse_date("Tue, 13 Oct 2026 23:55:22 GMT") == datetime(2026, 10, 14, 1, 55, 22)
    assert parse_date(None) is None and parse_date("ayer") is None


def test_source_dates_prefer_modified(repo):
    dates = repo.source_dates()
    assert dates["aire_dia"] == datetime(2026, 10, 16, 9, 5, 0, 123456)
    assert dates["eiel_parques"] == datetime(2026, 10, 14, 15, 51, 38)


def test_municipality_names_prefer_callejero(repo):
    assert repo.municipality_names() == {"28065": "Getafe", "28079": "Madrid"}


def test_route_pois_skip_not_working(repo):
    ids = {r[0] for r in repo.route_pois(-3.74, 40.30, -3.72, 40.31)}
    assert ids == {"ay_fuentes:1", "osm:node/1"}


def test_missing_realtime_is_empty_and_missing_main_raises(tmp_path):
    base = build_mini_data(tmp_path / "data")
    (base / "realtime.duckdb").unlink()
    repo = Repository(base)
    assert repo.forecast(["28065"], NOW, NOW) == ({}, {})
    assert repo.air_categories(NOW, NOW, ICA, 3) == {}
    (base / "gomad.duckdb").unlink()
    with pytest.raises(DataUnavailable):
        repo.candidates(ORIGIN["lon"], ORIGIN["lat"], 1000, ["walk"], "any", 400)
```

- [ ] **Paso 5:** Run: `.venv/bin/pytest tests/test_repository.py -q` → Esperado: FAIL con `ModuleNotFoundError: No module named 'repository'`.
- [ ] **Paso 6: implementación** — `repository.py`:

```python
"""Unico punto que conoce DuckDB (arquitectura §4.3). Solo lectura: cada consulta abre y cierra su conexion, asi
una sustitucion atomica de gomad.duckdb o realtime.duckdb (ingest) se ve en la peticion siguiente."""
import email.utils
import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import duckdb
import numpy as np

from engine.rules import aqi_category

EARTH_RADIUS_M = 6_371_008.8
M_PER_DEG_LAT = 111_320.0
LOCAL_TZ = ZoneInfo("Europe/Madrid")


class DataUnavailable(Exception):
    pass


def haversine_m(lon1, lat1, lon2, lat2):
    lon1, lat1, lon2, lat2 = (np.radians(np.asarray(a, dtype=float)) for a in (lon1, lat1, lon2, lat2))
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    return 2 * EARTH_RADIUS_M * np.arcsin(np.sqrt(a))


def parse_date(text):
    """Fecha de source_date/forecast (ISO o RFC 1123 de las cabeceras HTTP) en hora local de Madrid sin zona."""
    if not text:
        return None
    try:
        d = datetime.fromisoformat(text)
    except ValueError:
        try:
            d = email.utils.parsedate_to_datetime(text)
        except (TypeError, ValueError):
            return None
    return d.astimezone(LOCAL_TZ).replace(tzinfo=None) if d.tzinfo else d


def _number(v):
    return None if v is None or (isinstance(v, float) and math.isnan(v)) else float(v)


def _naive(ts):
    # TIMESTAMP_NS llega como datetime o pandas.Timestamp segun la version: siempre datetime
    return ts.to_pydatetime() if hasattr(ts, "to_pydatetime") else ts


def category_at(readings, hour, valid_h):
    """Ultima categoria medida en o antes de `hour` con como mucho valid_h horas de antiguedad; None si no hay."""
    last = None
    for ts, category in readings:
        if ts > hour:
            break
        last = (ts, category)
    if last is None or hour - last[0] > timedelta(hours=valid_h):
        return None
    return last[1]


@dataclass
class Candidate:
    id: str
    source: str
    name: str
    type: str
    covered: bool | None
    ine_code: str
    lon: float
    lat: float
    green: float | None
    activity: str
    suitability: float
    straight_m: float


@dataclass
class Station:
    id: str
    network: str
    name: str
    lon: float
    lat: float


class Repository:
    def __init__(self, data_dir):
        self.main = data_dir / "gomad.duckdb"
        self.realtime = data_dir / "realtime.duckdb"
        self.addresses = data_dir / "clean" / "addresses.parquet"
        self._names = None

    def _query(self, path, sql, params=(), required=False):
        if not path.exists():
            if required:
                raise DataUnavailable("Los datos todavía no están cargados en el servidor.")
            return []
        con = duckdb.connect(str(path), read_only=True)
        try:
            return con.execute(sql, list(params)).fetchall()
        finally:
            con.close()

    def candidates(self, lon, lat, radius_m, activities, setting, per_activity):
        dlat = radius_m / M_PER_DEG_LAT
        dlon = radius_m / (M_PER_DEG_LAT * math.cos(math.radians(lat)))
        covered = {"indoor": "AND d.covered", "outdoor": "AND d.covered IS DISTINCT FROM TRUE"}.get(setting, "")
        marks = ", ".join("?" for _ in activities)
        sql = f"""
            SELECT * FROM (
              SELECT d.id, d.source, d.name, d.type, d.covered, d.ine_code, d.lon, d.lat, d.green,
                     a.activity, a.suitability,
                     2 * {EARTH_RADIUS_M} * asin(sqrt(pow(sin(radians(d.lat - ?) / 2), 2)
                       + cos(radians(?)) * cos(radians(d.lat)) * pow(sin(radians(d.lon - ?) / 2), 2))) AS straight_m
              FROM destination d JOIN destination_activity a ON a.destination_id = d.id
              WHERE a.activity IN ({marks}) AND d.lat BETWEEN ? AND ? AND d.lon BETWEEN ? AND ? {covered})
            WHERE straight_m <= ?
            QUALIFY row_number() OVER (PARTITION BY activity ORDER BY straight_m, id) <= ?
            ORDER BY straight_m, id"""
        params = [lat, lat, lon, *activities, lat - dlat, lat + dlat, lon - dlon, lon + dlon, radius_m, per_activity]
        rows = self._query(self.main, sql, params, required=True)
        return [Candidate(*r[:8], _number(r[8]), *r[9:]) for r in rows]

    def forecast(self, ine_codes, start, end):
        if not ine_codes:
            return {}, {}
        marks = ", ".join("?" for _ in ine_codes)
        rows = self._query(self.realtime, f"""SELECT ine_code, ts, temp, feels_like, precip_prob, issued FROM forecast
                                              WHERE ine_code IN ({marks}) AND ts BETWEEN ? AND ? ORDER BY ts""",
                           [*ine_codes, start, end])
        by, issued = {}, {}
        for ine, ts, temp, feels, prob, iss in rows:
            by.setdefault(ine, {})[_naive(ts)] = (_number(temp), _number(feels), _number(prob))
            issued[ine] = parse_date(iss)
        return by, issued

    def stations(self):
        return [Station(*r) for r in self._query(self.main, "SELECT id, network, name, lon, lat FROM air_station",
                                                 required=True)]

    def air_categories(self, start, end, ica, valid_h):
        """{estacion: [(hora, categoria)]} ordenado, con las medias que cumplen la cobertura minima del ICA."""
        rows = self._query(self.realtime, """SELECT station_id, ts, pollutant, mean, n_hours FROM aqi_hourly
                                             WHERE ts BETWEEN ? AND ? ORDER BY station_id, ts""",
                           [start - timedelta(hours=valid_h), end])
        needed = {p: math.ceil(ica["min_coverage"] * h) for p, h in ica["period_hours"].items()}
        measured = {}
        for station, ts, pollutant, mean, n_hours in rows:
            if _number(mean) is None or pollutant not in needed or n_hours is None or n_hours < needed[pollutant]:
                continue
            measured.setdefault(station, {}).setdefault(_naive(ts), {})[pollutant] = float(mean)
        out = {}
        for station, by_ts in measured.items():
            cats = [(ts, aqi_category(values, ica["bands"])) for ts, values in sorted(by_ts.items())]
            cats = [(ts, c) for ts, c in cats if c is not None]
            if cats:
                out[station] = cats
        return out

    def source_dates(self):
        rows = self._query(self.main, "SELECT source, downloaded, modified FROM source_date")
        return {source: parse_date(modified) or parse_date(downloaded) for source, downloaded, modified in rows}

    def municipality_names(self):
        """Nombre para mostrar: el del callejero («Las Rozas de Madrid»); si falta, el de municipality (MAYUSCULAS)."""
        if self._names is None:
            names = dict(self._query(self.main, "SELECT ine_code, name FROM municipality", required=True))
            if self.addresses.exists():
                con = duckdb.connect()
                try:
                    names.update(dict(con.execute("SELECT DISTINCT ine_code, municipality FROM read_parquet(?)",
                                                  [str(self.addresses)]).fetchall()))
                finally:
                    con.close()
            self._names = names
        return self._names

    def route_pois(self, min_lon, min_lat, max_lon, max_lat):
        return self._query(self.main, """SELECT id, type, source, lon, lat FROM route_poi
                                         WHERE working IS NOT FALSE AND lon BETWEEN ? AND ? AND lat BETWEEN ? AND ?""",
                           [min_lon, max_lon, min_lat, max_lat], required=True)
```

- [ ] **Paso 7:** Run: `.venv/bin/pytest tests/test_repository.py tests/engine -q` → Esperado: todo PASS (`11 passed` en `test_repository.py`).
- [ ] **Paso 8: commit** — `git -C ../.. add app/api/repository.py app/api/tests/mini_data.py app/api/tests/test_repository.py app/api/engine/rules.py app/api/tests/engine/test_rules.py app/config && git -C ../.. commit -m "Motor: repository de solo lectura y configuración de /recommend (V-M1)"`

**Terminado cuando:** las consultas devuelven candidatos, previsión, aire con cobertura mínima, fechas y nombres; sin `realtime.duckdb` no falla y sin `gomad.duckdb` lanza `DataUnavailable`.

---

### Task 29: V-M1 (2/2) · `/activities`, `/recommend`, grafos al arrancar y log sin ubicación

**Rol:** Motor · **Servicio:** `app/api/` · **Depende de:** Tasks 21, 27, 28 · **Duración:** 3 h

**Ficheros:** Crear `routing/store.py`, `services/__init__.py`, `services/common.py`, `services/recommend.py`, `tests/services/test_recommend.py`, `tests/test_endpoints.py`. Modificar `routing/graph.py` (`nearest_nodes`), `tests/routing/test_routing.py`, `main.py`, `../../docs/arquitectura.md` §4.2.

**Interfaces:**
- Consume: `Repository` y `category_at`, `haversine_m` (Task 28); `explanation` (Task 27); `engine.slots`, `engine.scoring`, `engine.rules`; `routing.graph.load_graph`, `bounded_distances`.
- Produce: `routing.graph.nearest_nodes(g, lons, lats, max_m) -> (nodes ndarray int64 [-1 si > max_m], dist ndarray m)`; `routing.store.Zone(name, graph, bbox)`, `GraphStore(zones=())`, `GraphStore.load(directory)`, `GraphStore.locate(points: list[(lon, lat)], max_m) -> (Zone, nodes, dists) | None` (zona más pequeña que contiene todos los puntos); `services.common.walking_speed_kmh(profile, weights_cfg)`, `services.common.data_source(source, labels, date, own_criterion=False) -> schemas.DataSource`; `services.recommend.recommend(req, repo, graphs, now=None) -> RecommendResponse`, `UnknownActivity`, `MEDICAL_DISCLAIMER`; en `main.py`: `lifespan` (valida config, crea `app.state.repo`, `app.state.graphs`), dependencias `get_repo`, `get_graphs` (sin `lifespan`: repositorio sobre `settings.DATA_DIR` y `GraphStore()` vacío), middleware de log `gomad.api`.

- [ ] **Paso 1: `nearest_nodes`** — en `tests/routing/test_routing.py` añadir (usa la fixture `graph` del fichero):

```python
def test_nearest_nodes_vectorized(graph):
    nodes, dist = nearest_nodes(graph, [-3.7300, -3.7289, -3.7000], [40.3050, 40.30505, 40.3100], max_m=300)
    assert nodes.tolist() == [0, 1, -1]                # el tercero cae en la componente aislada: fuera
    assert dist[0] == pytest.approx(0) and dist[1] == pytest.approx(5.6, abs=0.5)
```

(añadir `nearest_nodes` al `import` de `routing.graph`). Run: `.venv/bin/pytest tests/routing/test_routing.py -q` → Esperado: FAIL (`ImportError: cannot import name 'nearest_nodes'`). Implementación en `routing/graph.py`, tras `nearest_node`:

```python
def nearest_nodes(g, lons, lats, max_m=300):
    """Nodo mas cercano (componente principal) de cada punto y su distancia en metros; -1 si esta a mas de max_m."""
    d, i = g.tree.query(_xy(lons, lats, g.cos_lat0))
    nodes = g.tree_nodes[i] if g.tree_nodes is not None else i
    return np.where(d <= max_m, nodes, -1).astype(np.int64), d
```

Run → Esperado: PASS.

- [ ] **Paso 2: pruebas del servicio que fallan** — `tests/services/test_recommend.py`:

```python
from datetime import timedelta

import pytest

import schemas as s
from mini_data import NOW, ORIGIN, build_mini_data
from repository import Repository
from routing.store import GraphStore
from services.recommend import MEDICAL_DISCLAIMER, UnknownActivity, recommend


def request(**kw):
    base = dict(origin=ORIGIN, activity="walk", window_start=NOW, window_end=NOW + timedelta(hours=3),
                duration_min=45, max_distance_m=1000)
    return s.RecommendRequest(**{**base, **kw})


def run(tmp_path, req=None, graph=False, **data):
    base = build_mini_data(tmp_path / "data", graph=graph, **data)
    graphs = GraphStore.load(base / "graph") if graph else GraphStore()
    return recommend(req or request(), Repository(base), graphs, now=NOW)


def test_ranking_pagination_and_disclaimer(tmp_path):
    first = run(tmp_path, request(limit=1))
    assert first.medical_disclaimer == MEDICAL_DISCLAIMER and first.has_more
    assert first.results[0].destination.id == "eiel_parques:1"
    assert first.results[0].destination.municipality == "Getafe"
    second = run(tmp_path / "b", request(limit=1, offset=1))
    assert second.results[0].destination.id != "eiel_parques:1"


def test_dedupe_same_name_close(tmp_path):
    ids = [r.destination.id for r in run(tmp_path, request(limit=10)).results]
    assert "eiel_parques:1" in ids and "nmc_parques:1" not in ids        # «PARQUE UNO» a 3 m: el mismo sitio


def test_missing_factors_renormalize_with_warnings(tmp_path):
    res = run(tmp_path, request(limit=10))
    capital = next(r for r in res.results if r.destination.id == "ay_parques:1")
    green = next(f for f in capital.factors if f.factor == "green")
    assert green.value is None and green.weight == 0
    assert sum(f.weight for f in capital.factors) == pytest.approx(1)
    assert "Verde: sin datos en Getafe, Madrid." in res.warnings
    assert "Previsión: sin datos para Madrid." in res.warnings
    assert any(w.startswith("Calor:") for w in res.warnings)              # DEC-06 pendiente (heat null)


def test_air_from_nearest_station_with_coverage(tmp_path):
    rec = run(tmp_path, request(window_end=NOW + timedelta(hours=4))).results[0]
    assert rec.hours[0].aqi_category == "good"                             # NO2 30; PM10 sin cobertura no cuenta
    assert rec.hours[-1].aqi_category is None                              # mas de 3 h tras la medicion: sin dato
    assert any(d.source == "aire_dia" and "Getafe" in d.label for d in rec.sources)


def test_rain_now_better_later_explains(tmp_path):
    res = run(tmp_path, precip=lambda h: 90.0 if h == 0 else 0.0)
    rec = res.results[0]
    assert rec.hours[0].outdoor_ok is False and rec.best_hour == NOW + timedelta(hours=1)
    assert rec.explanation.startswith("Ahora no: mejor a las 11:00 (lluvia: 90 % de probabilidad (umbral de criterio propio))")


def test_rain_all_window_proposes_covered(tmp_path):
    res = run(tmp_path, precip=90.0)
    assert res.results[0].indoor_alternative and res.results[0].destination.id == "eiel_deporte:1"
    assert any("sitios cubiertos" in w for w in res.warnings)


def test_surprise_me_distinct_activities(tmp_path):
    res = run(tmp_path, request(activity=None, limit=3))
    labels = [r.explanation.split("Para ")[1].split(":")[0] for r in res.results]
    assert len(set(labels)) == len(labels) == 3                          # caminar, correr y gimnasio
    assert not res.has_more                                              # no hay una cuarta actividad a 1 km


def test_distance_graph_or_approximate(tmp_path):
    res = run(tmp_path, request(limit=10), graph=True)
    by_id = {r.destination.id: r for r in res.results}
    assert by_id["eiel_parques:1"].distance_m == pytest.approx(100, abs=1)          # por la red: 100 m
    assert not any(d.source == "config:recommend" for d in by_id["eiel_parques:1"].sources)
    assert any(d.source == "config:recommend" and d.own_criterion for d in by_id["nmc_parques:2"].sources)
    assert by_id["nmc_parques:2"].distance_m == pytest.approx(555.9 * 1.3, rel=0.01)


def test_window_in_past_warns(tmp_path):
    res = run(tmp_path, request(window_start=NOW - timedelta(hours=5), window_end=NOW - timedelta(hours=3)))
    assert "La ventana horaria elegida ya ha pasado: elige otra." in res.warnings
    assert all(r.hours == [] and r.best_hour is None for r in res.results)


def test_unknown_activity(tmp_path):
    with pytest.raises(UnknownActivity):
        run(tmp_path, request(activity="parapente"))


def test_explanation_numbers_match_object(tmp_path):
    rec = run(tmp_path).results[0]
    from engine.explanation import fmt_distance, fmt_number
    assert fmt_distance(rec.distance_m) in rec.explanation and fmt_number(rec.score) in rec.explanation
```

- [ ] **Paso 3:** Run: `.venv/bin/pytest tests/services -q` → Esperado: FAIL con `ModuleNotFoundError: No module named 'routing.store'`.
- [ ] **Paso 4: implementación** — `routing/store.py`:

```python
"""Grafos peatonales en memoria, cargados una vez al arrancar (lifespan): uno por zona en data/graph/<zona>/."""
from dataclasses import dataclass

import numpy as np

from routing.graph import Graph, load_graph, nearest_nodes


@dataclass
class Zone:
    name: str
    graph: Graph
    bbox: tuple                # (lon_min, lat_min, lon_max, lat_max) de sus nodos


class GraphStore:
    def __init__(self, zones=()):
        # la zona mas pequena primero: mas rapida (Getafe antes que la caja de la capital)
        self.zones = sorted(zones, key=lambda z: len(z.graph.lon))

    @classmethod
    def load(cls, directory):
        zones = []
        for d in sorted(directory.glob("*")) if directory.exists() else []:
            if (d / "nodes.parquet").exists() and (d / "edges.parquet").exists():
                g = load_graph(d)
                zones.append(Zone(d.name, g, (g.lon.min(), g.lat.min(), g.lon.max(), g.lat.max())))
        return cls(zones)

    def locate(self, points, max_m):
        lons = np.array([p[0] for p in points], dtype=float)
        lats = np.array([p[1] for p in points], dtype=float)
        for z in self.zones:
            x0, y0, x1, y1 = z.bbox
            if not ((lons >= x0) & (lons <= x1) & (lats >= y0) & (lats <= y1)).all():
                continue
            nodes, dist = nearest_nodes(z.graph, lons, lats, max_m)
            if (nodes >= 0).all():
                return z, nodes, dist
        return None
```

`services/__init__.py` vacío. `services/common.py`:

```python
"""Piezas compartidas por los servicios de la API."""
import schemas as s


def walking_speed_kmh(profile, weights_cfg):
    # velocidad a pie del perfil (weights.yaml -> speeds_kmh); general y sensible caminan a la de «walk»
    speeds = weights_cfg["speeds_kmh"]
    return speeds.get(profile, speeds["walk"])


def data_source(source, labels, date, own_criterion=False):
    return s.DataSource(source=source, label=labels.get(source, source), date=date, own_criterion=own_criterion)
```

`services/recommend.py`:

```python
"""POST /recommend (arquitectura §4.2): candidatos -> distancia a pie -> contexto por hora -> reglas -> nota.

Determinista y sin IA. Pesos, umbrales, actividades, velocidades y criterios propios salen de config/."""
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

import numpy as np

import schemas as s
import settings
from engine import explanation as ex
from engine.rules import HourContext
from engine.scoring import FACTORS, air_factor, compute_score, normalize_weights, proximity_factor, weather_factor
from engine.slots import best_hour, evaluate_hours, needs_indoor, window_hours
from repository import category_at, haversine_m
from routing.graph import bounded_distances, nearest_nodes
from services.common import data_source, walking_speed_kmh

LOCAL_TZ = ZoneInfo("Europe/Madrid")
MEDICAL_DISCLAIMER = "Recomendación orientativa con datos abiertos. No es consejo médico."
CONFIG = ("activities", "weights", "rules", "ica_thresholds", "recommend", "routing", "sources")


class UnknownActivity(ValueError):
    pass


@dataclass
class Scored:
    cand: object
    distance_m: float
    approximate: bool
    covered: bool
    hours: list
    best: object
    score: float
    fixed: dict
    indoor_alternative: bool = False

    @property
    def viable(self):
        return self.best is not None


def _plain(text):
    t = unicodedata.normalize("NFKD", str(text)).encode("ascii", "ignore").decode().lower()
    return " ".join(t.split())


def _same_place(a, b, radius_m):
    if a.cand.id == b.cand.id:
        return True
    return (_plain(a.cand.name) == _plain(b.cand.name)
            and float(haversine_m(a.cand.lon, a.cand.lat, b.cand.lon, b.cand.lat)) <= radius_m)


def _page(scored, req, radius_m):
    """Pagina sin repetir sitio; en «Sorprendeme», como mucho un resultado por actividad (RF-03)."""
    need = req.offset + req.limit
    kept, activities = [], set()
    for x in scored:
        if req.activity is None and x.cand.activity in activities:
            continue
        if any(_same_place(k, x, radius_m) for k in kept):
            continue
        kept.append(x)
        activities.add(x.cand.activity)
        if len(kept) > need:
            break
    return kept[req.offset:need], len(kept) > need


def _hour(h):
    c = h.ctx
    return s.HourEvaluation(hour=h.hour, score=h.score, outdoor_ok=h.outdoor_ok, reasons=h.reasons,
                            temperature_c=c.temperature_c if c else None, feels_like_c=c.feels_like_c if c else None,
                            precip_prob=c.precip_prob if c else None, aqi_category=c.aqi_category if c else None)


class _Run:
    """Estado de una peticion: contexto cargado una vez y reutilizado por todos los candidatos."""

    def __init__(self, req, repo, graphs, cfg, weights, window):
        self.req, self.repo, self.cfg, self.weights, self.window = req, repo, cfg, weights, window
        self.catalog = {a["id"]: a for a in cfg["activities"]["activities"]}
        self.labels = (cfg["sources"] or {}).get("labels", {})
        self.located = graphs.locate([(req.origin.lon, req.origin.lat)], cfg["routing"]["snap_max_m"])
        self.net = None
        self.forecasts, self.issued, self.loaded = {}, {}, set()
        self.air, self.stations, self.station_of, self.contexts = None, [], {}, {}
        self.dates = repo.source_dates()
        self.names = repo.municipality_names()

    def _distances(self, cands):
        dist = np.array([c.straight_m for c in cands], dtype=float) * self.cfg["recommend"]["straight_line_detour"]
        approx = np.ones(len(cands), dtype=bool)
        if self.located is not None:
            zone, nodes, snaps = self.located
            if self.net is None:
                self.net = bounded_distances(zone.graph, int(nodes[0]), self.req.max_distance_m)
            cn, cd = nearest_nodes(zone.graph, [c.lon for c in cands], [c.lat for c in cands],
                                   self.cfg["routing"]["snap_max_m"])
            ok = cn >= 0
            dist[ok] = self.net[cn[ok]] + cd[ok] + snaps[0]
            approx = ~ok
        return dist, approx

    def _load_context(self, cands):
        if not self.window:
            return
        new = sorted({c.ine_code for c in cands} - self.loaded)
        if new:
            by, issued = self.repo.forecast(new, self.window[0], self.window[-1])
            self.forecasts.update(by)
            self.issued.update(issued)
            self.loaded |= set(new)
        if self.air is None:
            self.air = self.repo.air_categories(self.window[0], self.window[-1], self.cfg["ica_thresholds"],
                                                self.cfg["recommend"]["air_reading_valid_h"])
            self.stations = [st for st in self.repo.stations() if st.id in self.air]
        if self.stations:
            d = haversine_m(np.array([c.lon for c in cands])[:, None], np.array([c.lat for c in cands])[:, None],
                            np.array([st.lon for st in self.stations])[None, :],
                            np.array([st.lat for st in self.stations])[None, :])
            for c, i in zip(cands, d.argmin(axis=1)):
                self.station_of[c.id] = self.stations[int(i)]

    def _hour_contexts(self, c):
        station = self.station_of.get(c.id)
        key = (c.ine_code, station.id if station else None)
        if key not in self.contexts:
            fc = self.forecasts.get(c.ine_code)
            readings = self.air.get(station.id, []) if station else []
            valid_h = self.cfg["recommend"]["air_reading_valid_h"]
            out = {}
            for h in self.window:
                f = fc.get(h) if fc else None
                if fc and f is None:
                    continue          # hay prevision del municipio, pero no para esta hora: «Sin prevision»
                temp, feels, prob = f if f else (None, None, None)
                out[h] = HourContext(h, temp, feels, prob, category_at(readings, h, valid_h))
            self.contexts[key] = out
        return self.contexts[key]

    def score(self, cands):
        if not cands:
            return []
        dist, approx = self._distances(cands)
        keep = dist <= self.req.max_distance_m
        cands = [c for c, k in zip(cands, keep) if k]
        dist, approx = dist[keep], approx[keep]
        self._load_context(cands)
        out = []
        for c, d, a in zip(cands, dist, approx):
            covered = self.catalog[c.activity].get("outdoor") is False or bool(c.covered)
            fixed = {"proximity": proximity_factor(d, self.req.max_distance_m), "suitability": c.suitability,
                     "green": c.green}
            hours = evaluate_hours(self._hour_contexts(c), self.window, covered, self.req.profile, self.cfg["rules"],
                                   fixed, self.weights)
            best = best_hour(hours)
            score = best.score if best else compute_score({**fixed, "air": None, "weather": None}, self.weights).value
            out.append(Scored(c, float(d), bool(a), covered, hours, best, score, fixed))
        return out

    def _own_rule(self, first):
        if first is None or first.outdoor_ok is not False:
            return False
        rules = self.cfg["rules"]
        for r in first.reasons:
            if r.startswith("Lluvia") and (rules.get("rain") or {}).get("own_criterion"):
                return True
            if r.startswith("Calor") and (rules.get("heat") or {}).get("own_criterion"):
                return True
            if r.startswith("Calidad del aire") and self.req.profile in (rules.get("air") or {}).get(
                    "own_criterion_profiles", []):
                return True
        return False

    def _sources(self, x):
        c = x.cand
        out = [data_source(c.source, self.labels, self.dates.get(c.source))]
        if c.green is not None:
            out.append(data_source("vpla_redes", self.labels, self.dates.get("vpla_redes")))
        if c.ine_code in self.issued:
            out.append(data_source("aemet", self.labels, self.issued[c.ine_code]))
        station = self.station_of.get(c.id)
        if station and not x.covered:
            sid = "aire_dia" if station.network == "CM" else "ay_aire"
            out.append(s.DataSource(source=sid, label=f"{self.labels.get(sid, sid)} · estación {station.name}",
                                    date=self.air[station.id][-1][0]))
        if self.req.weights is None:
            out.append(data_source("config:weights", self.labels, None,
                                   bool(self.cfg["weights"].get("own_criterion"))))
        if x.approximate:
            detour = ex.fmt_number(self.cfg["recommend"]["straight_line_detour"])
            out.append(s.DataSource(source="config:recommend", label=f"Distancia aproximada: línea recta × {detour}",
                                    date=None, own_criterion=True))
        return out

    def recommendation(self, x, surprise):
        c, req = x.cand, self.req
        duration = x.distance_m / 1000 / walking_speed_kmh(req.profile, self.cfg["weights"]) * 60
        ref = x.best.ctx if x.best else None
        shown = ref or next((h.ctx for h in x.hours if h.ctx is not None), None)
        factors = {**x.fixed,
                   "air": None if x.covered or ref is None else air_factor(ref.aqi_category),
                   "weather": None if x.covered or ref is None else weather_factor(ref.precip_prob)}
        score = compute_score(factors, self.weights)
        factor_scores = [
            s.FactorScore(factor=f, value=None if factors[f] is None else round(10 * factors[f], 1),
                          weight=round(score.effective_weights.get(f, 0.0), 4),
                          text=ex.factor_text(f, None if factors[f] is None else 10 * factors[f],
                                              distance_m=x.distance_m, green=c.green,
                                              aqi_category=shown.aqi_category if shown else None,
                                              precip_prob=shown.precip_prob if shown else None, covered=x.covered))
            for f in FACTORS]
        sources = self._sources(x)
        first = x.hours[0] if x.hours else None
        text = ex.explain(ex.ExplanationInput(
            name=c.name, distance_m=x.distance_m, duration_min=duration, score=x.score,
            factors=[(f.factor, f.value, f.weight) for f in factor_scores], first=first, best=x.best,
            indoor_alternative=x.indoor_alternative,
            activity_label=self.catalog[c.activity]["label"] if surprise else None,
            own_criterion_rule=self._own_rule(first),
            sources=[(d.label, d.date) for d in sources if d.source in ("aemet", "aire_dia", "ay_aire")],
            approximate_distance=x.approximate))
        return s.Recommendation(
            destination=s.DestinationSummary(id=c.id, name=c.name, type=c.type, covered=True if x.covered else c.covered,
                                             municipality=self.names.get(c.ine_code, c.ine_code), ine_code=c.ine_code,
                                             coordinate=s.Coordinate(lat=c.lat, lon=c.lon), source=sources[0]),
            distance_m=round(x.distance_m, 1), duration_min=round(duration, 1),
            score=round(min(10.0, max(0.0, x.score)), 2), factors=factor_scores,
            best_hour=x.best.hour if x.best else None, hours=[_hour(h) for h in x.hours],
            indoor_alternative=x.indoor_alternative, explanation=text, sources=sources)

    def warnings(self, picked):
        out = []
        name = lambda x: self.names.get(x.cand.ine_code, x.cand.ine_code)
        no_green = sorted({name(x) for x in picked if x.cand.green is None})
        if no_green:
            out.append(f"Verde: sin datos en {', '.join(no_green)}.")
        if self.window:
            no_fc = sorted({name(x) for x in picked if x.cand.ine_code not in self.forecasts})
            if no_fc:
                out.append(f"Previsión: sin datos para {', '.join(no_fc)}.")
            if any(not x.covered and all(h.ctx is None or h.ctx.aqi_category is None for h in x.hours) for x in picked):
                out.append("Aire: sin medición reciente cerca; la nota no lo tiene en cuenta.")
        if (self.cfg["rules"].get("heat") or {}).get("max_feels_like_c") is None:
            out.append("Calor: todavía no hay un umbral oficial cargado; no se evalúa.")
        if any(x.approximate for x in picked):
            detour = ex.fmt_number(self.cfg["recommend"]["straight_line_detour"])
            out.append(f"Distancias aproximadas donde no hay red peatonal cargada (línea recta × {detour}, criterio propio).")
        return out


def recommend(req, repo, graphs, now=None):
    cfg = {name: settings.load(name) for name in CONFIG}
    catalog = {a["id"] for a in cfg["activities"]["activities"]}
    if req.activity is not None and req.activity not in catalog:
        raise UnknownActivity(f"Actividad desconocida: {req.activity}")
    weights, warnings = normalize_weights(req.weights.model_dump() if req.weights else None,
                                          cfg["weights"]["defaults"])
    window = window_hours(req.window_start, req.window_end, now or datetime.now(LOCAL_TZ))
    if not window:
        warnings.append("La ventana horaria elegida ya ha pasado: elige otra.")
    run = _Run(req, repo, graphs, cfg, weights, window)
    rc = cfg["recommend"]
    activities = [req.activity] if req.activity else [a["id"] for a in cfg["activities"]["activities"]]
    scored = run.score(repo.candidates(req.origin.lon, req.origin.lat, req.max_distance_m, activities, req.setting,
                                       rc["max_candidates"]))
    outdoor = [x for x in scored if not x.covered]
    if outdoor and all(needs_indoor(x.hours) for x in outdoor):
        for x in scored:
            x.indoor_alternative = x.covered
        fallback = rc.get("indoor_fallback_activity")
        if req.setting != "outdoor" and not any(x.covered for x in scored) and fallback in catalog:
            extra = run.score(repo.candidates(req.origin.lon, req.origin.lat, req.max_distance_m, [fallback],
                                              "indoor", rc["max_candidates"]))
            for x in extra:
                x.indoor_alternative = True
            scored += extra
        warnings.append("Ahora no se recomienda actividad al aire libre en la ventana elegida: te proponemos sitios cubiertos."
                        if any(x.covered for x in scored) else
                        "Ahora no se recomienda actividad al aire libre en la ventana elegida: prueba otra franja.")
    scored.sort(key=lambda x: (not x.viable, -x.score, x.distance_m))
    picked, has_more = _page(scored, req, rc["dedupe_radius_m"])
    results = [run.recommendation(x, surprise=req.activity is None) for x in picked]
    warnings += run.warnings(picked)
    if not scored:
        warnings.append(f"No hay destinos para esta actividad a menos de {ex.fmt_distance(req.max_distance_m)}.")
    return s.RecommendResponse(results=results, has_more=has_more, warnings=list(dict.fromkeys(warnings)),
                               medical_disclaimer=MEDICAL_DISCLAIMER)
```

- [ ] **Paso 5:** Run: `.venv/bin/pytest tests/services -q` → Esperado: `11 passed`.
- [ ] **Paso 6: pruebas de los endpoints que fallan** — `tests/test_endpoints.py`:

```python
import logging
import time
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

import main
from main import app, get_graphs, get_repo
from mini_data import build_mini_data
from repository import Repository
from routing.store import GraphStore
from settings import DATA_DIR

GETAFE = {"lat": 40.3057, "lon": -3.7329}
SOL = {"lat": 40.4169, "lon": -3.7035}


def body(origin, activity="walk", hours=3, **kw):
    now = datetime.now().replace(second=0, microsecond=0)
    return {"origin": origin, "activity": activity, "window_start": now.isoformat(),
            "window_end": (now + timedelta(hours=hours)).isoformat(), "duration_min": 45, "max_distance_m": 3000, **kw}


@pytest.fixture
def mini(tmp_path):
    base = build_mini_data(tmp_path / "data")
    app.dependency_overrides[get_repo] = lambda: Repository(base)
    app.dependency_overrides[get_graphs] = lambda: GraphStore()
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_activities_from_config():
    data = TestClient(app).get("/activities").json()
    assert [a["id"] for a in data["activities"]] == ["walk", "run", "swim", "padel", "tennis", "football", "basketball", "gym"]
    assert data["profiles"] == ["general", "senior", "stroller", "sensitive"] and data["companions"] == ["dog", "kids"]
    assert data["default_weights"]["proximity"] == 0.3


def test_unknown_activity_is_422(mini):
    assert mini.post("/recommend", json=body(GETAFE, activity="parapente")).status_code == 422


def test_recommend_without_data_is_503_not_500(tmp_path):
    app.dependency_overrides[get_repo] = lambda: Repository(tmp_path)
    app.dependency_overrides[get_graphs] = lambda: GraphStore()
    try:
        r = TestClient(app, raise_server_exceptions=False).post("/recommend", json=body(GETAFE))
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 503


def test_logs_without_location(mini, caplog):
    caplog.set_level(logging.INFO, logger="gomad.api")
    mini.post("/recommend", json=body(GETAFE))
    mini.get("/location", params={"text": "calle madrid 10 getafe"})
    text = caplog.text
    assert "POST /recommend 200" in text and "GET /location" in text
    for secret in ("40.30", "-3.73", "madrid 10", "calle", "getafe"):
        assert secret not in text.lower()


@pytest.fixture(scope="module")
def real():
    if not (DATA_DIR / "gomad.duckdb").exists():
        pytest.skip("sin app/data/gomad.duckdb")
    with TestClient(app) as client:          # lifespan: carga los grafos de data/graph/
        yield client


@pytest.mark.slow
def test_recommend_getafe(real):
    t0 = time.perf_counter()
    r = real.post("/recommend", json=body(GETAFE))
    elapsed = time.perf_counter() - t0
    assert r.status_code == 200, r.text
    data = r.json()
    print(f"\n/recommend Getafe: {elapsed:.2f} s, avisos: {data['warnings']}")
    assert elapsed < 3.0
    assert len(data["results"]) == 3 and data["has_more"]
    for rec in data["results"]:
        assert rec["destination"]["ine_code"] == "28065" or rec["distance_m"] <= 3000
        assert rec["explanation"] and rec["sources"] and 0 <= rec["score"] <= 10


@pytest.mark.slow
def test_recommend_capital_without_vpla(real):
    t0 = time.perf_counter()
    r = real.post("/recommend", json=body(SOL))
    elapsed = time.perf_counter() - t0
    assert r.status_code == 200, r.text
    data = r.json()
    print(f"\n/recommend capital: {elapsed:.2f} s, avisos: {data['warnings']}")
    assert elapsed < 3.0
    assert data["results"]
    capital = [x for x in data["results"] if x["destination"]["ine_code"] == "28079"]
    assert capital and all(next(f for f in x["factors"] if f["factor"] == "green")["value"] is None for x in capital)
    assert any(w.startswith("Verde: sin datos en") and "Madrid" in w for w in data["warnings"])


@pytest.mark.slow
def test_surprise_me_three_distinct_activities(real):
    t0 = time.perf_counter()
    data = real.post("/recommend", json=body(GETAFE, activity=None)).json()
    print(f"\n/recommend Sorpréndeme: {time.perf_counter() - t0:.2f} s")
    labels = [r["explanation"].split("Para ")[1].split(":")[0] for r in data["results"]]
    assert len(labels) == 3 and len(set(labels)) == 3
```

- [ ] **Paso 7:** Run: `.venv/bin/pytest tests/test_endpoints.py -q -m "not slow"` → Esperado: FAIL (`ImportError: cannot import name 'get_graphs' from 'main'`).
- [ ] **Paso 8: implementación** — `main.py` (sustituye las versiones 501 de `/activities` y `/recommend`; el resto sigue en 501):

```python
"""API de GoMad. Sin estado: sin sesiones ni registro; la ubicacion nunca se escribe en los logs."""
import logging
import time
from contextlib import asynccontextmanager
from typing import get_args

from fastapi import Depends, FastAPI, HTTPException, Query, Request

import schemas as s
import settings
from engine.rules import validate_rules
from engine.scoring import validate_weights
from repository import DataUnavailable, Repository
from routing.store import GraphStore
from services import recommend as recommend_service

log = logging.getLogger("gomad.api")
if not log.handlers:
    # uvicorn no configura este logger: sin handler propio, los INFO se perderian
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
    log.addHandler(handler)
    log.setLevel(logging.INFO)
    log.propagate = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    # un error de configuracion para el arranque, no sale como 500 en una peticion
    validate_rules(settings.load("rules"))
    validate_weights(settings.load("weights")["defaults"])
    app.state.repo = Repository(settings.DATA_DIR)
    t0 = time.perf_counter()
    app.state.graphs = GraphStore.load(settings.DATA_DIR / "graph")
    log.info("grafos cargados: %s en %.1f s", [z.name for z in app.state.graphs.zones], time.perf_counter() - t0)
    yield


app = FastAPI(title="GoMad API", version="0.1.0", lifespan=lifespan)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    # solo metodo, ruta, codigo y milisegundos: ni cuerpo ni query (la query de /location es una direccion)
    t0 = time.perf_counter()
    status = 500
    try:
        response = await call_next(request)
        status = response.status_code
        return response
    finally:
        log.info("%s %s %d %.0f ms", request.method, request.url.path, status, (time.perf_counter() - t0) * 1000)


def get_repo(request: Request) -> Repository:
    return getattr(request.app.state, "repo", None) or Repository(settings.DATA_DIR)


def get_graphs(request: Request) -> GraphStore:
    return getattr(request.app.state, "graphs", None) or GraphStore()


def _not_implemented():
    raise HTTPException(status_code=501, detail="Pendiente de implementar")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/activities", response_model=s.ActivitiesResponse)
def activities():
    catalog = settings.load("activities")["activities"]
    return s.ActivitiesResponse(
        activities=[s.Activity(id=a["id"], label=a["label"], icon=a["icon"], outdoor=a.get("outdoor")) for a in catalog],
        profiles=list(get_args(s.Profile)), companions=list(get_args(s.Companion)),
        default_weights=s.Weights(**settings.load("weights")["defaults"]))


@app.post("/recommend", response_model=s.RecommendResponse)
def recommend(request: s.RecommendRequest, repo: Repository = Depends(get_repo),
              graphs: GraphStore = Depends(get_graphs)):
    try:
        return recommend_service.recommend(request, repo, graphs)
    except recommend_service.UnknownActivity as e:
        raise HTTPException(status_code=422, detail=str(e))
    except DataUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
```

(`/location`, `/route`, `/municipality`, `/assistant/*`, `/sources` se quedan como estaban, con `_not_implemented()`.)

- [ ] **Paso 9:** Run: `.venv/bin/pytest tests/test_endpoints.py tests/test_contract.py -q -m "not slow"` → Esperado: PASS (el contrato no cambia: `test_versioned_openapi_is_up_to_date` en verde).
- [ ] **Paso 10: datos frescos y pruebas reales** — en `../ingest`: `AEMET_MUNICIPALITIES=28065,28079 .venv/bin/python scripts/download_sources.py --refresh hourly` (si AEMET falla, seguir: la previsión saldrá `null` con aviso), `.venv/bin/python -m normalize air_reading forecast` y `.venv/bin/python -m build_db realtime`. Después, en `app/api`: `.venv/bin/pytest tests/test_endpoints.py -q -s -m slow` → Esperado: `3 passed`, cada `/recommend` < 3 s (apuntar tiempos y avisos).
- [ ] **Paso 11: docs** — en `../../docs/arquitectura.md` §4.2, al final de la lista: «**Implementado el 16/10 (Tasks 28–29):** distancia por el grafo de la zona más pequeña que contiene el origen (Dijkstra con límite) y, si no, línea recta × `straight_line_detour`; aire de la estación más cercana con medición válida (cobertura `min_coverage`), que vale `air_reading_valid_h` horas; sin previsión del municipio, los factores de tiempo van a `null` con aviso; mismo nombre a < `dedupe_radius_m` = mismo sitio; «Sorpréndeme» = un resultado por actividad. Parámetros en `config/recommend.yaml` (criterio propio).»
- [ ] **Paso 12: commit** — `git -C ../.. add app/api docs/arquitectura.md && git -C ../.. commit -m "Motor: /activities y /recommend reales, grafos al arrancar y log sin ubicación (V-M1)"`

**Terminado cuando:** `/recommend` responde < 3 s en Getafe y en la capital, con `warnings` cuando falta un factor, «Sorpréndeme» da 3 actividades distintas y el log no tiene ubicación.

---

### Task 30: V-R1 · `/route` con directa y saludable en paralelo

**Rol:** Rutas · **Servicio:** `app/api/` · **Depende de:** Tasks 21, 27, 28, 29 · **Duración:** 2 h

**Ficheros:** Crear `services/route.py`, `tests/services/test_route.py`. Modificar `schemas.py` (`LineString`), `main.py`, `tests/test_endpoints.py`, `../frontend/src/api/openapi.json` (regenerado), `../frontend/src/api/schema.d.ts` (regenerado), `../frontend/src/lib/geometry.ts` (si deja de compilar).

**Interfaces:**
- Consume: `GraphStore.locate`, `routing.graph.edge_costs`, `shortest_path`, `summarize`, `RouteNotFound`; `Repository.route_pois`, `source_dates`; `explanation.route_description`; `services.common`.
- Produce: `schemas.LineString(type: Literal["LineString"], coordinates: list[list[float]])` y `RouteVariant.geometry: LineString` (contrato; pedido en `pendientes.md` B); `services.route.path_coordinates(g, origin_node, edges) -> list[[lon, lat]]`; `services.route.pois_along(repo, coords, radius_m) -> list[RoutePoi]`; `services.route.route(req, repo, graphs) -> RouteResponse` (nunca lanza `RouteNotFound`).

- [ ] **Paso 1: pruebas que fallan** — `tests/services/test_route.py`:

```python
import pytest

import schemas as s
from mini_data import ORIGIN, build_mini_data
from repository import Repository
from routing.store import GraphStore
from services.route import path_coordinates, route

PARK = {"lat": 40.3050, "lon": -3.7289}         # nodo 1


@pytest.fixture
def setup(tmp_path):
    base = build_mini_data(tmp_path / "data", graph=True)
    return Repository(base), GraphStore.load(base / "graph")


def test_direct_and_healthy_on_graph(setup):
    repo, graphs = setup
    res = route(s.RouteRequest(origin=ORIGIN, destination=PARK), repo, graphs)
    assert res.direct.distance_m == pytest.approx(100) and res.healthy.distance_m == pytest.approx(220)
    assert res.healthy.green_pct > res.direct.green_pct and res.direct.traffic_m == pytest.approx(100)
    assert res.healthy.geometry.coordinates[0] == [ORIGIN["lon"], ORIGIN["lat"]]
    assert res.healthy.geometry.coordinates[-1] == [PARK["lon"], PARK["lat"]]
    assert {(p.type, p.source) for p in res.healthy.pois} == {("fountain", "ay_fuentes"), ("bench", "osm")}
    assert res.direct.pois == []                                    # la fuente queda a 39 m de la avenida
    assert "1 fuente" in res.healthy.description and "1 banco" in res.healthy.description
    assert res.healthy.duration_min == pytest.approx(220 / 4500 * 60, abs=0.1)   # walk 4,5 km/h
    assert not res.healthy.approximate and any(d.source == "osm" for d in res.sources)


def test_path_coordinates_follow_direction(setup):
    _, graphs = setup
    g = graphs.zones[0].graph
    # de 1 a 0 por el parque: tramos 3-1, 2-3 y 0-2 recorridos al reves
    coords = path_coordinates(g, 1, [3, 2, 1])
    assert coords == [[-3.7289, 40.3050], [-3.7289, 40.3043], [-3.7300, 40.3043], [-3.7300, 40.3050]]


def test_senior_walks_slower(setup):
    repo, graphs = setup
    res = route(s.RouteRequest(origin=ORIGIN, destination=PARK, profile="senior"), repo, graphs)
    assert res.direct.duration_min == pytest.approx(100 / 3500 * 60, abs=0.1)


def test_route_outside_graph_is_approximate(setup):
    repo, graphs = setup
    far = {"lat": 40.9500, "lon": -3.4700}                          # Patones: sin grafo
    res = route(s.RouteRequest(origin=ORIGIN, destination=far), repo, graphs)
    assert res.direct.approximate and res.healthy.approximate
    assert res.direct.geometry.coordinates == [[ORIGIN["lon"], ORIGIN["lat"]], [far["lon"], far["lat"]]]
    assert res.direct.description.startswith("Línea recta de")
    assert any("línea recta" in w for w in res.warnings)
```

- [ ] **Paso 2:** Run: `.venv/bin/pytest tests/services/test_route.py -q` → Esperado: FAIL con `ModuleNotFoundError: No module named 'services.route'`.
- [ ] **Paso 3: contrato** — en `schemas.py`, antes de `RouteVariant`:

```python
class LineString(Strict):
    """GeoJSON LineString en EPSG:4326: [[lon, lat], ...]."""
    type: Literal["LineString"]
    coordinates: list[list[float]] = Field(min_length=2)
```

y en `RouteVariant`: `geometry: LineString`. Después: `.venv/bin/python scripts/export_openapi.py`, `(cd ../frontend && npm run contract)` (si `tsc -b` falla en `src/lib/geometry.ts` o en `src/data/mock/route.ts`, ajustar los tipos sin cambiar comportamiento) y `.venv/bin/pytest tests/test_contract.py -q` → Esperado: PASS.

- [ ] **Paso 4: implementación** — `services/route.py`:

```python
"""POST /route (arquitectura §4.4): directa y saludable en paralelo sobre el grafo de la zona.

Fuera de la red o desconectado: linea recta marcada approximate y aviso. Nunca un 500 por una ruta imposible."""
import math
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import shapely

import schemas as s
import settings
from engine.explanation import route_description
from repository import M_PER_DEG_LAT, haversine_m
from routing.graph import RouteNotFound, edge_costs, shortest_path, summarize
from services.common import data_source, walking_speed_kmh

POOL = ThreadPoolExecutor(max_workers=4)
POI_TYPES = set(s.RoutePoi.model_fields["type"].annotation.__args__)
NO_NETWORK = "No hay red peatonal cargada para este trayecto: se muestra la línea recta (aproximada)."
DISCONNECTED = "Origen y destino no están conectados por la red peatonal: se muestra la línea recta (aproximada)."


def path_coordinates(g, origin_node, edges):
    """[lon, lat] de la ruta en orden; cada tramo se gira segun el nodo por el que se entra (su geom va de u a v)."""
    coords = [[float(g.lon[origin_node]), float(g.lat[origin_node])]]
    current = origin_node
    for e in edges:
        line = list(g.geom(e).coords)
        if g.u[e] == current:
            current = int(g.v[e])
        else:
            line.reverse()
            current = int(g.u[e])
        coords.extend([float(x), float(y)] for x, y in line[1:])
    return coords


def pois_along(repo, coords, radius_m):
    """Puntos de route_poi (solo working IS NOT FALSE) a menos de radius_m de la linea de la ruta."""
    lons, lats = np.array([c[0] for c in coords]), np.array([c[1] for c in coords])
    cos0 = math.cos(math.radians(float(lats.mean())))
    pad_lat = radius_m / M_PER_DEG_LAT
    pad_lon = pad_lat / cos0
    rows = repo.route_pois(lons.min() - pad_lon, lats.min() - pad_lat, lons.max() + pad_lon, lats.max() + pad_lat)
    rows = [r for r in rows if r[1] in POI_TYPES]
    if not rows:
        return []
    xy = lambda lo, la: np.column_stack([np.asarray(lo) * M_PER_DEG_LAT * cos0, np.asarray(la) * M_PER_DEG_LAT])
    line = shapely.LineString(xy(lons, lats))
    points = shapely.points(xy([r[3] for r in rows], [r[4] for r in rows]))
    near = shapely.distance(line, points) <= radius_m
    return [s.RoutePoi(type=t, coordinate=s.Coordinate(lat=lat, lon=lon), source=src)
            for (_, t, src, lon, lat), ok in zip(rows, near) if ok]


def _straight(kind, origin, destination, speed):
    d = float(haversine_m(origin.lon, origin.lat, destination.lon, destination.lat))
    minutes = d / 1000 / speed * 60
    return s.RouteVariant(kind=kind, geometry=s.LineString(type="LineString", coordinates=[
        [origin.lon, origin.lat], [destination.lon, destination.lat]]), distance_m=round(d, 1),
        duration_min=round(minutes, 1), green_pct=None, traffic_m=0.0, pois=[], approximate=True,
        description=route_description(d, minutes, None, 0, {}, approximate=True))


def _variant(kind, g, req, nodes, snaps, edges, routing, speed, repo):
    coords = [[req.origin.lon, req.origin.lat], *path_coordinates(g, int(nodes[0]), edges),
              [req.destination.lon, req.destination.lat]]
    summary = summarize(g, edges, routing["traffic_display_threshold"])
    distance = summary["distance_m"] + float(snaps[0]) + float(snaps[1])
    minutes = distance / 1000 / speed * 60
    pois = pois_along(repo, coords, routing["poi_radius_m"])
    green = summary["green_pct"]
    return s.RouteVariant(kind=kind, geometry=s.LineString(type="LineString", coordinates=coords),
                          distance_m=round(distance, 1), duration_min=round(minutes, 1),
                          green_pct=None if green is None else round(green, 1),
                          traffic_m=round(summary["traffic_m"], 1), pois=pois,
                          description=route_description(distance, minutes, green, summary["traffic_m"],
                                                        Counter(p.type for p in pois)))


def route(req, repo, graphs):
    routing, weights_cfg = settings.load("routing"), settings.load("weights")
    labels = (settings.load("sources") or {}).get("labels", {})
    speed = walking_speed_kmh(req.profile, weights_cfg)
    located = graphs.locate([(req.origin.lon, req.origin.lat), (req.destination.lon, req.destination.lat)],
                            routing["snap_max_m"])
    straight = lambda warning: s.RouteResponse(direct=_straight("direct", req.origin, req.destination, speed),
                                               healthy=_straight("healthy", req.origin, req.destination, speed),
                                               warnings=[warning], sources=[])
    if located is None:
        return straight(NO_NETWORK)
    zone, nodes, snaps = located
    g = zone.graph
    weights = req.weights.model_dump() if req.weights else routing["default_route_weights"]
    costs = edge_costs(g, weights, routing["cost_floor"])
    futures = [POOL.submit(shortest_path, g, int(nodes[0]), int(nodes[1]), c) for c in (g.length, costs)]
    try:
        direct_edges, healthy_edges = (f.result() for f in futures)
    except RouteNotFound:
        return straight(DISCONNECTED)
    direct = _variant("direct", g, req, nodes, snaps, direct_edges, routing, speed, repo)
    healthy = _variant("healthy", g, req, nodes, snaps, healthy_edges, routing, speed, repo)
    warnings = []
    if direct.green_pct is None or healthy.green_pct is None:
        warnings.append("Zona verde: sin datos en parte del recorrido.")
    dates = repo.source_dates()
    sources = [data_source("osm", labels, dates.get("osm"))]
    if healthy.green_pct is not None:
        sources.append(data_source("vpla_redes", labels, dates.get("vpla_redes")))
    for src in sorted({p.source for p in direct.pois + healthy.pois} - {"osm"}):
        sources.append(data_source(src, labels, dates.get(src)))
    if req.weights is None:
        sources.append(data_source("config:routing", labels, None, bool(routing.get("own_criterion"))))
    return s.RouteResponse(direct=direct, healthy=healthy, warnings=warnings, sources=sources)
```

En `main.py`: `from services import route as route_service` y

```python
@app.post("/route", response_model=s.RouteResponse)
def route(request: s.RouteRequest, repo: Repository = Depends(get_repo), graphs: GraphStore = Depends(get_graphs)):
    try:
        return route_service.route(request, repo, graphs)
    except DataUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
```

- [ ] **Paso 5:** Run: `.venv/bin/pytest tests/services/test_route.py -q` → Esperado: `4 passed`.
- [ ] **Paso 6: endpoints** — en `tests/test_endpoints.py` añadir:

```python
def test_route_outside_graph_is_approximate(mini):
    r = mini.post("/route", json={"origin": GETAFE, "destination": {"lat": 40.95, "lon": -3.47}})
    assert r.status_code == 200
    data = r.json()
    assert data["direct"]["approximate"] and data["healthy"]["approximate"]
    assert data["direct"]["geometry"]["type"] == "LineString"


@pytest.mark.slow
def test_route_getafe(real):
    payload = {"origin": GETAFE, "destination": {"lat": 40.3120, "lon": -3.7230}}
    t0 = time.perf_counter()
    r = real.post("/route", json=payload)
    elapsed = time.perf_counter() - t0
    assert r.status_code == 200, r.text
    data = r.json()
    print(f"\n/route Getafe: {elapsed:.2f} s · {data['direct']['description']} · {data['healthy']['description']}")
    assert elapsed < 5.0
    assert not data["direct"]["approximate"] and not data["healthy"]["approximate"]
    assert data["healthy"]["distance_m"] >= data["direct"]["distance_m"] - 1
    assert len(data["healthy"]["geometry"]["coordinates"]) > 2


@pytest.mark.slow
def test_route_capital(real):
    t0 = time.perf_counter()
    r = real.post("/route", json={"origin": SOL, "destination": {"lat": 40.4153, "lon": -3.6845}})   # Sol -> Retiro
    elapsed = time.perf_counter() - t0
    print(f"\n/route capital: {elapsed:.2f} s · {r.json()['healthy']['description']}")
    assert r.status_code == 200 and elapsed < 5.0
```

Run: `.venv/bin/pytest tests/test_endpoints.py -q -s` → Esperado: todo PASS (apuntar tiempos de las rutas).

- [ ] **Paso 7: commit** — `git -C ../.. add app/api app/frontend/src/api app/frontend/src/lib app/frontend/src/data/mock && git -C ../.. commit -m "Rutas: /route con directa y saludable en paralelo y geometría LineString en el contrato (V-R1)"`

**Terminado cuando:** `/route` < 5 s en Getafe y capital; fuera de grafo o desconectado, línea recta `approximate` con aviso; `geometry` tipada como `LineString` en el front.

---

### Task 31: V-D2 (2/2) · `/location` con el callejero y el buscador de Nomecalles

**Rol:** Datos · **Servicio:** `app/api/` · **Depende de:** Tasks 26, 28, 29 · **Duración:** 1,5 h

**Ficheros:** Crear `geocoding.py`, `tests/test_location.py`. Modificar `main.py`.

**Interfaces:**
- Consume: `clean/addresses.parquet` (Task 26), `clean/municipality.parquet` (Task 17); buscador `https://apiscm.comunidad.madrid/t/ciudadanos.comunidad.madrid/sector-publico/nomecalles-buscador/v1/direcciones?busqueda=…` (sin clave).
- Produce: `geocoding.plain(text)` (igual que `ingest/normalize/addresses.plain`); `class Geocoder(data_dir, client: httpx.Client | None = None, ttl_s=3600, timeout_s=3.0)` con `search(text) -> list[dict]` (campos de `LocationCandidate`); en `main.py`: `get_geocoder` y `GET /location`.

- [ ] **Paso 1: pruebas que fallan** — `tests/test_location.py`:

```python
import httpx
import pytest
from fastapi.testclient import TestClient

from geocoding import Geocoder, plain
from main import app, get_geocoder
from mini_data import build_mini_data
from settings import DATA_DIR

NOMECALLES = {"data": {"direcciones": [
    {"id": 5187835, "direccion": "Calle Madrid 10", "tipo": "app", "municipio": "065", "nombreMunicipio": "Getafe",
     "cdVial": "065A0460"},
    {"id": 289285, "direccion": "Calle Madrid", "tipo": "calle", "municipio": "065", "nombreMunicipio": "Getafe",
     "cdVial": "065A0460"},
    {"id": 291492, "direccion": "Calle de Camino de Getafe", "tipo": "calle", "municipio": "058",
     "nombreMunicipio": "Fuenlabrada", "cdVial": "058A0201"}]}}


@pytest.fixture
def data(tmp_path):
    return build_mini_data(tmp_path / "data")


def client_with(handler):
    calls = []

    def wrapped(request):
        calls.append(request)
        return handler(request)
    return httpx.Client(transport=httpx.MockTransport(wrapped)), calls


def test_plain():
    assert plain("  GETAFÉ, C/ Madrid nº10 ") == "getafe c madrid n 10"


def test_location_address_with_number_local(data):
    out = Geocoder(data).search("calle madrid 10 getafe")
    assert out[0] == {"label": "Calle Madrid 10, Getafe", "municipality": "Getafe", "ine_code": "28065",
                      "coordinate": {"lat": 40.3056775, "lon": -3.7314934}, "precision": "address"}
    assert out[-1]["precision"] == "municipality" and out[-1]["ine_code"] == "28065"


def test_location_street_without_number(data):
    out = Geocoder(data).search("Calle de la Constitución, Getafe")
    assert out[0]["precision"] == "street" and out[0]["label"] == "Calle de la Constitución, Getafe"


def test_location_municipality_by_name_without_accents(data):
    for text in ("MADRID", "getafé", "Getafe"):
        out = Geocoder(data).search(text)
        assert out[0]["precision"] == "municipality"
    assert Geocoder(data).search("GETAFÉ")[0]["coordinate"] == {"lat": pytest.approx(40.295), "lon": pytest.approx(-3.725)}
    assert Geocoder(data).search("geta")[0]["municipality"] == "Getafe"     # parcial, sin numero ni calle


def test_location_uses_nomecalles_and_caches(data):
    client, calls = client_with(lambda r: httpx.Response(200, json=NOMECALLES))
    g = Geocoder(data, client)
    out = g.search("calle madrid 10 getafe")
    assert out[0]["precision"] == "address" and out[0]["coordinate"]["lon"] == pytest.approx(-3.7314934)
    assert all(c["ine_code"] == "28065" for c in out)                      # Fuenlabrada no: el texto dice Getafe
    g.search("Calle Madrid 10 Getafe")
    assert len(calls) == 1 and calls[0].url.params["busqueda"] == "calle madrid 10 getafe"


def test_location_nomecalles_down_falls_back_local(data):
    def down(request):
        raise httpx.ConnectError("caido")
    client, _ = client_with(down)
    out = Geocoder(data, client).search("calle madrid 10 getafe")
    assert out[0]["label"] == "Calle Madrid 10, Getafe"
    client, _ = client_with(lambda r: httpx.Response(500))
    assert Geocoder(data, client).search("calle madrid 10 getafe")[0]["precision"] == "address"


def test_location_nothing_found(data):
    assert Geocoder(data).search("zzzzzz") == []


def test_location_text_bounds_422(data):
    app.dependency_overrides[get_geocoder] = lambda: Geocoder(data)
    try:
        c = TestClient(app)
        assert c.get("/location", params={"text": "ab"}).status_code == 422
        assert c.get("/location", params={"text": "x" * 201}).status_code == 422
        r = c.get("/location", params={"text": "calle madrid 10 getafe"})
        assert r.status_code == 200 and r.json()["candidates"][0]["precision"] == "address"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.slow
def test_location_real_calle_madrid_10_getafe():
    if not (DATA_DIR / "clean" / "addresses.parquet").exists():
        pytest.skip("sin clean/addresses.parquet (python -m normalize addresses en ingest)")
    out = Geocoder(DATA_DIR).search("calle madrid 10 getafe")          # D-04, solo callejero local
    assert out[0]["precision"] == "address" and out[0]["ine_code"] == "28065"
    assert out[0]["coordinate"]["lon"] == pytest.approx(-3.7314934, abs=1e-6)
    assert out[0]["coordinate"]["lat"] == pytest.approx(40.3056775, abs=1e-6)
```

- [ ] **Paso 2:** Run: `.venv/bin/pytest tests/test_location.py -q -m "not slow"` → Esperado: FAIL con `ModuleNotFoundError: No module named 'geocoding'`.
- [ ] **Paso 3: implementación** — `geocoding.py`:

```python
"""GET /location (RF-01, D-04): direccion con numero o municipio por nombre.

Orden: municipio por nombre -> buscador de Nomecalles (sin clave, cache 1 h), resuelto con el callejero normalizado
(clean/addresses.parquet) -> si el buscador cae o no aporta, busqueda local en el callejero.
El texto es la ubicacion de la persona: nunca se escribe en los logs."""
import re
import time
import unicodedata

import duckdb
import httpx
import pyarrow.parquet as pq
import shapely

SEARCH_URL = ("https://apiscm.comunidad.madrid/t/ciudadanos.comunidad.madrid/sector-publico/"
              "nomecalles-buscador/v1/direcciones")
STREET_TYPES = {"calle", "c", "cl", "avenida", "avda", "av", "plaza", "pza", "pl", "paseo", "po", "camino", "cmno",
                "carretera", "ctra", "glorieta", "gta", "travesia", "trva", "ronda", "pasaje", "psaje", "urbanizacion",
                "urb", "callejon", "cllon", "costanilla", "cstan", "bulevar", "bulev", "cuesta", "custa", "canada",
                "cnada", "vereda", "vreda", "colonia", "col", "lugar", "rotonda", "rtda"}
STOP_WORDS = {"de", "del", "la", "las", "el", "los", "y", "en", "n", "no", "num", "numero"}
MAX_CANDIDATES = 6
CACHE_MAX = 1000


def plain(text):
    # misma regla que ingest/normalize/addresses.py: minusculas, sin tildes, solo letras y numeros
    s = unicodedata.normalize("NFKD", str(text)).encode("ascii", "ignore").decode().lower()
    return " ".join(re.sub(r"[^a-z0-9]+", " ", s).split())


def _candidate(label, municipality, ine_code, lon, lat, precision):
    return {"label": label, "municipality": municipality, "ine_code": ine_code,
            "coordinate": {"lat": round(float(lat), 7), "lon": round(float(lon), 7)}, "precision": precision}


class Geocoder:
    def __init__(self, data_dir, client=None, ttl_s=3600, timeout_s=3.0):
        self.addresses = data_dir / "clean" / "addresses.parquet"
        self.municipality_file = data_dir / "clean" / "municipality.parquet"
        self.client, self.ttl_s, self.timeout_s = client, ttl_s, timeout_s
        self._cache = {}
        self._municipalities = None

    # --- municipios -------------------------------------------------------------------------------------------
    def municipalities(self):
        """[(ine_code, nombre, nombre llano, lon, lat)]: centro del contorno y nombre del callejero."""
        if self._municipalities is None:
            names = {}
            if self.addresses.exists():
                con = duckdb.connect()
                try:
                    names = dict(con.execute("SELECT DISTINCT ine_code, municipality FROM read_parquet(?)",
                                             [str(self.addresses)]).fetchall())
                finally:
                    con.close()
            t = pq.read_table(self.municipality_file, columns=["ine_code", "name", "geometry"]).to_pydict()
            out = []
            for ine, name, wkb in zip(t["ine_code"], t["name"], t["geometry"]):
                poly = shapely.from_wkb(wkb)
                center = poly.centroid if poly.contains(poly.centroid) else poly.point_on_surface()
                display = names.get(ine) or name.title()
                out.append((ine, display, plain(display), center.x, center.y))
            self._municipalities = out
        return self._municipalities

    def _municipality_in(self, q):
        """Municipio nombrado en el texto (palabras completas); si hay varios, el que acaba mas tarde y mas largo."""
        best = None
        padded = f" {q} "
        for m in self.municipalities():
            names = {m[2]}
            first, _, rest = m[2].partition(" ")
            if first in ("el", "la", "los", "las") and rest:
                names.add(rest)                  # «rozas de madrid» = «Las Rozas de Madrid»
            for n in names:
                i = padded.rfind(f" {n} ")
                if i >= 0 and (best is None or (i + len(n), len(n)) > (best[1] + len(best[2]), len(best[2]))):
                    best = (m, i, n)
        return best

    def _muni_candidate(self, m):
        return _candidate(m[1], m[1], m[0], m[3], m[4], "municipality")

    # --- busqueda ---------------------------------------------------------------------------------------------
    def search(self, text):
        q = plain(text)
        if not q:
            return []
        found = self._municipality_in(q)
        rest = q
        if found:
            _, i, n = found
            rest = (f" {q} "[:i] + " " + f" {q} "[i + len(n) + 2:]).strip()
        tokens = rest.split()
        while tokens and tokens[0] in STREET_TYPES:
            tokens = tokens[1:]
        numbers = [int(t) for t in tokens if t.isdigit()]
        words = [t for t in tokens if not t.isdigit() and t not in STOP_WORDS]
        muni = found[0] if found else None
        if not words:
            if muni:
                return [self._muni_candidate(muni)]
            return [self._muni_candidate(m) for m in self.municipalities() if q in m[2]][:MAX_CANDIDATES]
        number = numbers[-1] if numbers else None
        out = self._remote(text, muni) or self._local(words, number, muni)
        if not out and not muni and not numbers:
            # «geta», «rozas»: parte del nombre de un municipio
            return [self._muni_candidate(m) for m in self.municipalities() if q in m[2]][:MAX_CANDIDATES]
        if muni:
            out.append(self._muni_candidate(muni))      # respaldo: el centro del municipio
        unique = list({(c["label"], c["ine_code"]): c for c in out}.values())
        return unique[:MAX_CANDIDATES]

    def _rows(self, where, params):
        if not self.addresses.exists():
            return []
        con = duckdb.connect()
        try:
            return con.execute(f"""SELECT ine_code, municipality, street_code, street_type, street, street_norm,
                                          number, lon, lat FROM read_parquet(?) WHERE {where}""",
                               [str(self.addresses), *params]).fetchall()
        finally:
            con.close()

    @staticmethod
    def _resolve_street(rows, number):
        """De las filas de un vial: el portal pedido (precision address) o un punto del vial (precision street)."""
        ine, muni, _, stype, street = rows[0][:5]
        if number is not None:
            exact = [r for r in rows if r[6] == number]
            if exact:
                r = exact[0]
                return _candidate(f"{stype} {street} {number}, {muni}", muni, ine, r[7], r[8], "address")
        vial = [r for r in rows if r[6] is None]
        numbered = sorted((r for r in rows if r[6] is not None), key=lambda r: r[6])
        r = vial[0] if vial else numbered[len(numbered) // 2]
        return _candidate(f"{stype} {street}, {muni}", muni, ine, r[7], r[8], "street")

    def _local(self, words, number, muni):
        where = " AND ".join("(' ' || street_norm || ' ') LIKE ?" for _ in words)
        params = [f"% {w} %" for w in words]
        if muni:
            where += " AND ine_code = ?"
            params.append(muni[0])
        streets = {}
        for r in self._rows(where, params):
            streets.setdefault((r[0], r[2]), []).append(r)
        target = " ".join(words)
        # primero el vial cuyo nombre (sin «de la») es exactamente lo buscado, luego el mas corto
        ranked = sorted(streets.values(), key=lambda rows: (
            " ".join(t for t in rows[0][5].split() if t not in STOP_WORDS) != target, len(rows[0][5])))
        return [self._resolve_street(rows, number) for rows in ranked[:MAX_CANDIDATES]]

    def _remote(self, text, muni):
        if self.client is None:
            return []
        key = plain(text)
        hit = self._cache.get(key)
        if hit and time.monotonic() - hit[0] < self.ttl_s:
            items = hit[1]
        else:
            try:
                r = self.client.get(SEARCH_URL, params={"busqueda": key}, timeout=self.timeout_s)
                r.raise_for_status()
                items = r.json()["data"]["direcciones"]
            except (httpx.HTTPError, ValueError, KeyError, TypeError):
                return []
            if len(self._cache) >= CACHE_MAX:
                self._cache.clear()
            self._cache[key] = (time.monotonic(), items)
        wanted = []
        for item in items:
            ine = "28" + str(item.get("municipio", "")).zfill(3)
            if item.get("tipo") not in ("app", "calle") or (muni and ine != muni[0]) or not item.get("cdVial"):
                continue
            m = re.search(r"(\d+)\s*$", item.get("direccion", ""))
            wanted.append((ine, item["cdVial"], int(m.group(1)) if item["tipo"] == "app" and m else None))
        if not wanted:
            return []
        codes = sorted({w[1] for w in wanted})
        rows = self._rows(f"street_code IN ({', '.join('?' for _ in codes)})", codes)
        by_street = {}
        for r in rows:
            by_street.setdefault((r[0], r[2]), []).append(r)
        out = []
        for ine, code, number in wanted:
            street = by_street.get((ine, code))
            if street:
                out.append(self._resolve_street(street, number))
        return out[:MAX_CANDIDATES]
```

En `main.py`: `import httpx`, `from geocoding import Geocoder`; en `lifespan`, antes del `yield`: `app.state.geocoder = Geocoder(settings.DATA_DIR, httpx.Client())`; después del `yield`: `app.state.geocoder.client.close()`. Y:

```python
def get_geocoder(request: Request) -> Geocoder:
    return getattr(request.app.state, "geocoder", None) or Geocoder(settings.DATA_DIR)


@app.get("/location", response_model=s.LocationResponse)
def location(text: str = Query(min_length=3, max_length=200), geocoder: Geocoder = Depends(get_geocoder)):
    return s.LocationResponse(candidates=[s.LocationCandidate(**c) for c in geocoder.search(text)])
```

- [ ] **Paso 4:** Run: `.venv/bin/pytest tests/test_location.py -q` → Esperado: `9 passed` (la `slow` con `clean/addresses.parquet` real de Task 26).
- [ ] **Paso 5:** Run: `.venv/bin/pytest -q` → Esperado: toda la suite de `app/api` en verde (incluido `test_logs_without_location`, que ahora pasa por `/location` real).
- [ ] **Paso 6: commit** — `git -C ../.. add app/api && git -C ../.. commit -m "Datos: /location con callejero local y buscador de Nomecalles con caché (V-D2)"`

**Terminado cuando:** «calle madrid 10 getafe» → lon −3,7314934 / lat 40,3056775 (D-04); municipio por nombre sin tildes ni mayúsculas; buscador caído → callejero local; texto < 3 o > 200 → 422.

---

### Task 32: Conexión del front a la API (cliente HTTP, `/activities`, `/recommend`, `/route`, `/location`, GPS)

**Rol:** Front (a petición de la persona, 16/10) · **Servicio:** `app/frontend/` · **Depende de:** Tasks 29–31 · **Duración:** 2 h

**Ficheros:** Crear `src/data/http.ts`, `src/data/http.test.ts`, `src/data/mode.ts`, `src/data/geolocation.ts`, `src/data/geolocation.test.ts`. Modificar `src/data/activities.ts`, `src/data/recommend.ts`, `src/data/route.ts`, `src/data/location.ts`, `vite.config.ts`, `src/components/LocationPicker.tsx`, `src/components/Results.tsx` (subtítulo), `src/components/Sources.tsx` y `src/components/Sources.test.tsx` (quitar el selector de escenarios), `docs/pendientes.md` (§B), `docs/pantallas.md` (Rulings).

**Interfaces:**
- Consume: contrato (`src/api/types.ts`); `ApiError` (`src/data/errors.ts`); `MUNICIPALITIES` (`src/data/mock/municipalities.ts`, lista estática de P-09).
- Produce: `http.ts` → `API_BASE = "/api"`, `getJson<T>(path, timeoutMs?)`, `postJson<T>(path, body, timeoutMs?)`, `ApiError(status, mensaje)` con `status` HTTP o `0` (sin conexión o tiempo agotado); `mode.ts` → `sampleDataMode(): boolean` (`MODE === "test"`); `geolocation.ts` → `LocationError`, `LOCATION_MESSAGES`, `nearestMunicipality(lat, lon)`, `locateWithBrowser(geo, secure, timeoutMs?) -> Promise<LocationCandidate>`; `location.ts` → `currentLocation(): Promise<LocationCandidate>`.

- [ ] **Paso 1: pruebas que fallan** — `src/data/http.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RecommendRequest } from "../api/types";
import { ApiError } from "./errors";
import { getJson, postJson } from "./http";

const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe("cliente HTTP", () => {
    it("hace GET a /api y devuelve el JSON", async () => {
        const fetchMock = vi.fn().mockResolvedValue(json(200, { status: "ok" }));
        vi.stubGlobal("fetch", fetchMock);
        await expect(getJson("/health")).resolves.toEqual({ status: "ok" });
        expect(fetchMock.mock.calls[0][0]).toBe("/api/health");
    });

    it("hace POST con el cuerpo en JSON", async () => {
        const fetchMock = vi.fn().mockResolvedValue(json(200, { ok: true }));
        vi.stubGlobal("fetch", fetchMock);
        await postJson("/route", { a: 1 });
        const init = fetchMock.mock.calls[0][1] as RequestInit;
        expect(init.method).toBe("POST");
        expect(init.body).toBe('{"a":1}');
        expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    });

    it("convierte un 422 de validación en ApiError legible", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(422, { detail: [{ msg: "x" }] })));
        const error = await getJson("/location?text=ab").catch((e) => e);
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(422);
        expect(error.message).toMatch(/no es válido/);
    });

    it("usa el detail de texto de la API", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(503, { detail: "Los datos todavía no están cargados." })));
        const error = await getJson("/recommend").catch((e) => e);
        expect(error).toMatchObject({ status: 503, message: "Los datos todavía no están cargados." });
    });

    it("un 500 sin JSON da un mensaje de servidor", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })));
        const error = await getJson("/x").catch((e) => e);
        expect(error).toMatchObject({ status: 500 });
        expect(error.message).toMatch(/servidor/);
    });

    it("sin conexión da ApiError con estado 0", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
        const error = await getJson("/x").catch((e) => e);
        expect(error).toMatchObject({ status: 0 });
        expect(error.message).toMatch(/conectar/);
    });

    it("corta la petición si tarda demasiado", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn((_url: string, init: RequestInit) =>
                new Promise((_resolve, reject) => {
                    init.signal!.addEventListener("abort", () =>
                        reject(new DOMException("aborted", "AbortError")),
                    );
                }),
            ),
        );
        const error = await getJson("/x", 10).catch((e) => e);
        expect(error).toMatchObject({ status: 0 });
        expect(error.message).toMatch(/tarda demasiado/);
    });

    it("fuera de las pruebas, recommend llama a POST /api/recommend", async () => {
        vi.stubEnv("MODE", "production");
        const fetchMock = vi.fn().mockResolvedValue(json(200, { results: [], has_more: false, warnings: [], medical_disclaimer: "" }));
        vi.stubGlobal("fetch", fetchMock);
        const { recommend } = await import("./recommend");
        const req = { origin: { lat: 40.3, lon: -3.7 } } as RecommendRequest;
        await recommend(req);
        expect(fetchMock.mock.calls[0][0]).toBe("/api/recommend");
        expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual(req);
    });
});
```

`src/data/geolocation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { LOCATION_MESSAGES, locateWithBrowser, nearestMunicipality } from "./geolocation";

function fakeGeo(result: { lat: number; lon: number } | { code: number }): Geolocation {
    return {
        getCurrentPosition: (ok: PositionCallback, fail?: PositionErrorCallback | null) => {
            if ("code" in result) fail?.({ code: result.code, message: "", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
            else ok({ coords: { latitude: result.lat, longitude: result.lon } } as GeolocationPosition);
        },
    } as unknown as Geolocation;
}

describe("geolocalización", () => {
    it("devuelve la posición con el municipio más cercano", async () => {
        const c = await locateWithBrowser(fakeGeo({ lat: 40.3057, lon: -3.7329 }), true);
        expect(c).toMatchObject({ label: "Tu ubicación", municipality: "Getafe", ine_code: "28065", precision: "address" });
        expect(c.coordinate).toEqual({ lat: 40.3057, lon: -3.7329 });
    });

    it("sin HTTPS lo explica", async () => {
        await expect(locateWithBrowser(fakeGeo({ lat: 40.3, lon: -3.7 }), false)).rejects.toThrow(LOCATION_MESSAGES.insecure);
    });

    it("permiso denegado", async () => {
        await expect(locateWithBrowser(fakeGeo({ code: 1 }), true)).rejects.toThrow(LOCATION_MESSAGES.denied);
    });

    it("sin posición o sin API", async () => {
        await expect(locateWithBrowser(fakeGeo({ code: 3 }), true)).rejects.toThrow(LOCATION_MESSAGES.unavailable);
        await expect(locateWithBrowser(undefined, true)).rejects.toThrow(LOCATION_MESSAGES.unavailable);
    });

    it("fuera de la Comunidad", async () => {
        await expect(locateWithBrowser(fakeGeo({ lat: 41.39, lon: 2.17 }), true)).rejects.toThrow(LOCATION_MESSAGES.outside);
        expect(nearestMunicipality(40.4169, -3.7035)?.municipality.ine_code).toBe("28079");
    });
});
```

- [ ] **Paso 2:** Run: `npx vitest run src/data/http.test.ts src/data/geolocation.test.ts` → Esperado: FAIL (`Failed to resolve import "./http"`).
- [ ] **Paso 3: implementación** — `src/data/mode.ts`:

```ts
// En las pruebas (MODE=test) las funciones de src/data usan los datos de ejemplo: nunca la red.
// Se lee en cada llamada para que una prueba pueda simular otro modo con vi.stubEnv.
export function sampleDataMode(): boolean {
    return import.meta.env.MODE === "test";
}
```

`src/data/http.ts`:

```ts
import { ApiError } from "./errors";

// Cliente de la API: misma maquina, prefijo /api (Caddy en produccion, proxy de Vite en desarrollo)
export const API_BASE = "/api";
const TIMEOUT_MS = 15_000;

async function errorMessage(response: Response): Promise<string> {
    let detail: unknown = null;
    try {
        detail = ((await response.json()) as { detail?: unknown })?.detail;
    } catch {
        // sin cuerpo JSON
    }
    if (typeof detail === "string" && detail) return detail;
    if (response.status === 422) return "Hay un dato que no es válido. Revisa lo que has escrito.";
    if (response.status === 404) return "No lo hemos encontrado.";
    if (response.status >= 500) return "El servidor no responde ahora. Inténtalo de nuevo en unos minutos.";
    return "No se pudo completar la petición.";
}

async function request<T>(path: string, init: RequestInit, timeoutMs: number): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(`${API_BASE}${path}`, { ...init, signal: controller.signal });
        if (!response.ok) throw new ApiError(response.status, await errorMessage(response));
        return (await response.json()) as T;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        if (controller.signal.aborted) {
            throw new ApiError(0, "La respuesta tarda demasiado. Inténtalo de nuevo.");
        }
        throw new ApiError(0, "No se pudo conectar con el servidor. Comprueba tu conexión.");
    } finally {
        clearTimeout(timer);
    }
}

export function getJson<T>(path: string, timeoutMs = TIMEOUT_MS): Promise<T> {
    return request<T>(path, { method: "GET", headers: { Accept: "application/json" } }, timeoutMs);
}

export function postJson<T>(path: string, body: unknown, timeoutMs = TIMEOUT_MS): Promise<T> {
    return request<T>(
        path,
        {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify(body),
        },
        timeoutMs,
    );
}
```

`src/data/geolocation.ts`:

```ts
import type { LocationCandidate } from "../api/types";
import { MUNICIPALITIES, type MunicipalityItem } from "./mock/municipalities";

// «Usar mi ubicacion» (RF-01): GPS del navegador tras el gesto; la posicion no se guarda en ningun sitio.
export const LOCATION_MESSAGES = {
    insecure:
        "Tu navegador solo comparte la ubicación en páginas seguras (HTTPS). Escribe una dirección o un municipio.",
    denied: "No has dado permiso para usar tu ubicación. Escribe una dirección o un municipio.",
    unavailable: "No hemos podido saber dónde estás. Escribe una dirección o un municipio.",
    outside:
        "Tu ubicación está fuera de la Comunidad de Madrid. Escribe una dirección o un municipio de la Comunidad.",
};
// a mas de esto del centro de cualquier municipio, fuera de la Comunidad (criterio propio)
const MAX_KM_FROM_CENTER = 40;

export class LocationError extends Error {}

function km(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const rad = Math.PI / 180;
    const a =
        Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(a));
}

export function nearestMunicipality(lat: number, lon: number): { municipality: MunicipalityItem; km: number } | null {
    let best: { municipality: MunicipalityItem; km: number } | null = null;
    for (const m of MUNICIPALITIES) {
        const d = km(lat, lon, m.lat, m.lon);
        if (!best || d < best.km) best = { municipality: m, km: d };
    }
    return best;
}

export function locateWithBrowser(
    geo: Geolocation | undefined,
    secure: boolean,
    timeoutMs = 10_000,
): Promise<LocationCandidate> {
    if (!secure) return Promise.reject(new LocationError(LOCATION_MESSAGES.insecure));
    if (!geo) return Promise.reject(new LocationError(LOCATION_MESSAGES.unavailable));
    return new Promise((resolve, reject) => {
        geo.getCurrentPosition(
            (position) => {
                const { latitude: lat, longitude: lon } = position.coords;
                const near = nearestMunicipality(lat, lon);
                if (!near || near.km > MAX_KM_FROM_CENTER) {
                    reject(new LocationError(LOCATION_MESSAGES.outside));
                    return;
                }
                resolve({
                    label: "Tu ubicación",
                    municipality: near.municipality.name,
                    ine_code: near.municipality.ine_code,
                    coordinate: { lat, lon },
                    precision: "address",
                });
            },
            (error) =>
                reject(new LocationError(error.code === 1 ? LOCATION_MESSAGES.denied : LOCATION_MESSAGES.unavailable)),
            { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
        );
    });
}
```

Funciones de `src/data/` (cada una conserva su comentario de endpoint; se quita la línea «paso 3: sustituir…»):

```ts
// activities.ts
export function getActivities(): Promise<ActivitiesResponse> {
    if (sampleDataMode()) return simulate(() => structuredClone(ACTIVITIES_MOCK));
    return getJson<ActivitiesResponse>("/activities");
}
// recommend.ts
export function recommend(req: RecommendRequest): Promise<RecommendResponse> {
    if (sampleDataMode()) return simulate(() => recommendMock(req));
    return postJson<RecommendResponse>("/recommend", req);
}
// route.ts
export function getRoute(req: RouteRequest): Promise<RouteResponse> {
    if (sampleDataMode()) return simulate(() => routeMock(req));
    return postJson<RouteResponse>("/route", req);
}
// location.ts
export function searchLocation(text: string): Promise<LocationResponse> {
    if (sampleDataMode()) return simulate(() => locationMock(text));
    return getJson<LocationResponse>(`/location?text=${encodeURIComponent(text)}`);
}

// «Usar mi ubicacion»: GPS real tras el gesto (sin guardarlo). En las pruebas, la de ejemplo;
// en desarrollo, si el GPS falla, tambien (y la pantalla lo dice).
export async function currentLocation(): Promise<LocationCandidate> {
    if (sampleDataMode()) return sampleLocation();
    try {
        return await locateWithBrowser(navigator.geolocation, window.isSecureContext);
    } catch (error) {
        if (import.meta.env.DEV) return sampleLocation();
        throw error;
    }
}
```

`vite.config.ts`: descomentar el bloque `server.proxy` de `/api` (destino `http://localhost:8000`, `rewrite` que quita `/api`) y borrar la línea «paso 3: …».

`LocationPicker.tsx`: el botón llama a `locate` en vez de `pick(sampleLocation())`:

```tsx
const [locating, setLocating] = useState(false);
const [locateError, setLocateError] = useState("");

const locate = async () => {
    setLocating(true);
    setLocateError("");
    try {
        pick(await currentLocation());
    } catch (error) {
        setLocateError(error instanceof Error ? error.message : "No hemos podido saber dónde estás.");
    } finally {
        setLocating(false);
    }
};
```

el botón: `onClick={locate}` con `disabled={locating}` y texto `{locating ? "Buscando tu ubicación…" : "Usar mi ubicación"}`; en `announcement`, antes de los casos de búsqueda: `if (locating) announcement = "Buscando tu ubicación…"; if (locateError) announcement = locateError;`. La nota de `isSampleLocation(origin)` pasa a «Es una ubicación de ejemplo: el GPS no está disponible en este entorno de desarrollo.» (solo se ve en desarrollo).

`Results.tsx:310`: quitar « · datos de ejemplo». `Sources.tsx`: quitar `SampleData` (y sus imports `useState`, `useNavigate`, `getActivities`, `listMunicipalities`, scenarios, `useAppState`, `ErrorMessage` si quedan sin uso) y su uso; `Sources.test.tsx`: quitar las dos pruebas del selector («avisa si falla al aplicar el escenario», «permite elegir un escenario de la demo y verlo (Carmen)»). `src/data/scenarios.ts` y `src/data/mock/` **se quedan** (solo las usan las pruebas y las pantallas que siguen en ejemplo).

- [ ] **Paso 4:** Run: `npx vitest run src/data` → Esperado: PASS. Después `npm test && npm run build && npm run lint` → Esperado: todo en verde (si alguna prueba de Inicio pulsaba «Usar mi ubicación» de forma síncrona, esperar con `findBy…`).
- [ ] **Paso 5: docs** — `docs/pendientes.md` §B: marcar `[x]` cliente (`src/data/http.ts`), proxy, «Sustituir el cuerpo» solo para `getActivities`, `recommend`, `getRoute`, `searchLocation` (anotando que el resto sigue en ejemplo porque su endpoint está en 501), la ubicación con GPS y la petición de `LineString`; borrar los datos de ejemplo queda parcial (lo conectado sí). `docs/pantallas.md`, «Decisiones tomadas al construir»: Rulings del paso 3 (GPS → municipio más cercano de la lista estática; ejemplo solo en pruebas y como respaldo del GPS en desarrollo; selector de escenarios quitado; `scenarios.ts` se queda para las pruebas).
- [ ] **Paso 6: commit** — `git -C ../.. add app/frontend && git -C ../.. commit -m "Front: cliente HTTP y conexión de actividades, recomendación, ruta y ubicación a la API"`

**Terminado cuando:** el front llama a `/api/activities`, `/api/recommend`, `/api/route` y `/api/location`; «Usar mi ubicación» usa el GPS con mensajes si se deniega o no hay HTTPS; `npm test && npm run build && npm run lint` en verde sin red.

---

### Prueba de punta a punta (tras la Task 32)
`cd app && docker compose -f deploy/docker-compose.yml up -d --build` y con `curl` (midiendo tiempos con `-w '%{time_total}'`): `/api/activities`, `POST /api/recommend` (Getafe, caminar, próximas 3 h), `POST /api/route`, `/api/location?text=calle%20madrid%2010%20getafe`, `/` sirve el front; `docker compose logs api` muestra «grafos cargados» (el contenedor ve `app/data` en `/data`); `docker stats --no-stream`; `down` al terminar.


---

# SÁBADO 17/10 — tareas (rutas relativas a `app/`)

> Filas de Front: **[manual guiado]**, se hacen a mano con `app/frontend/docs/guia.md` §3 (paso 6) y `app/frontend/docs/pantallas.md`; al detallar el día con `writing-plans` no se convierten en `### Task N:` ejecutables por el agente.

| ID | Rol | Tarea | Ficheros | Terminado cuando | Prueba |
|---|---|---|---|---|---|
| S-D1 | Datos | `/sources`: atribución, licencia (CKAN CC BY 4.0, OSM ODbL, AEMET aviso legal, Nomecalles…), URL, última recarga y último fallo desde `source_date`/`manifest.json`; fecha de cada dato en las respuestas (RF-19) | `api/main.py`, `config/sources.yaml` | Todas las fuentes usadas listadas | `test_sources_all_have_license` |
| S-D2 | Datos | Guiones `ingest/jobs/hourly.sh` (descarga `--refresh hourly` → `python -m normalize air_reading forecast` → `python -m build_db realtime`), `daily.sh`, `weekly.sh` (OSM + grafo), `reference.sh`; no reconstruyen si `changed` es falso | `ingest/jobs/*.sh` | Dos ejecuciones seguidas: la segunda no reconstruye | Manual + log |
| S-D3 | Datos (baja prioridad) | Traducir identificadores internos de `ingest/scripts/profile_sources.py` (solo nombres; mismo resultado) | `ingest/scripts/profile_sources.py` | `data/perfil/perfil.json` idéntico antes y después | `diff` de la salida |
| S-M1 | Motor | `/municipality/{ine_code}`: indicadores por categoría con «sin datos» explícito y encaje con preferencias, **sin ranking** (RF-17, RF-18); código inexistente → 404 legible | `api/services/municipality.py` | 179 códigos responden | `test_municipality_179_respond`, `test_municipality_missing_is_null`, `test_municipality_unknown_404` |
| S-R1 | Rutas | **Grafo de toda la Comunidad** (`python -m graph all` en `ingest`; si se queda sin memoria, `osmium extract` por caja); `green_pct` en los 13 sin VPLA con parques OSM o cubierta terrestre por `bbox`; validación: capital, San Lorenzo (28131) y uno sin mobiliario; memoria y latencia → **DEC-A11 antes de las 14:00** | `ingest/graph.py`, `docs/arquitectura.md` §4.4 | Rutas válidas en las 3 muestras < 5 s, o recorte apuntado | `api/tests/routing/test_latency.py` con el grafo regional |
| S-F1 | Front **[manual guiado]** | Pantalla Ruta: directa vs. saludable en mapa y en texto, métricas, fuentes/bancos/DEA, aviso si `approximate` | `frontend/src/screens/Route.tsx` | Descripción en texto completa sin mirar el mapa | Vitest + axe |
| S-F2 | Front **[manual guiado]** | Pantalla Municipio: indicadores por categoría, «sin datos» visible, encaje, sin rankings | `frontend/src/screens/Municipality.tsx` | Getafe, capital y Patones | Vitest + axe |

# DOMINGO 18/10 — tareas (fin del día: congelación; rutas relativas a `app/`)

> Filas de Front: **[manual guiado]**, se hacen a mano con `app/frontend/docs/guia.md` §3 (paso 7) y `app/frontend/docs/pantallas.md`; al detallar el día con `writing-plans` no se convierten en `### Task N:` ejecutables por el agente.

| ID | Rol | Tarea | Ficheros | Terminado cuando | Prueba |
|---|---|---|---|---|---|
| D-D1 | Datos | **Servicio `ingest` en Compose:** `ingest/Dockerfile` (Python 3.12 + su `pyproject.toml` + cron con los guiones de S-D2: horario, 04:00, semanal, mensual), volúmenes `../data:/data` (lectura y escritura) y `../config:/config:ro`. Caché ante caídas en la API: si `realtime.duckdb` tiene más de 2 h, la API sigue y avisa con la hora real; tráfico de la capital en memoria 5–15 min con respaldo por tipo de vía | `ingest/Dockerfile`, `deploy/docker-compose.yml`, `api/repository.py` | Sin red 1 h: la app sigue y avisa; el cron recarga sola la ingesta horaria | `test_stale_data_warns`; `docker compose logs ingest` tras una hora |
| D-M1 | Motor | **F6** (primer recorte), **sin LLM** (DEC-03 = OCI Language + diccionario del catálogo RF-21 + plantillas): `/assistant/interpret` combina entidades y frases clave de OCI Language con una búsqueda directa de las palabras del catálogo en el texto (Language **no** detecta «fuentes»: comprobado con `scripts/probe_ai.py`) y con negaciones («sin cuestas», «evitar tráfico» → `avoid`); construye `AssistantParams` y lo valida con `AssistantParams.model_validate`; si es ambiguo, `InterpretResponse.clarification`; consejo médico o fuera de catálogo → `InterpretResponse.rejection`; **nunca** envía ubicación a OCI. Si OCI Language falla o tarda, solo el diccionario. `/assistant/route` comprueba cada condición con datos del motor (`Condition`) y `write_up` redacta con **plantillas** y datos del motor (no hay LLM): `written_by_ai=False`; respuestas grabadas en `api/ai/recorded.py` | `api/ai/*.py`, `api/main.py` | Funciona con y sin OCI Language | `api/tests/test_assistant.py` (Language simulado, sin red): «15 km andando, por un parque, con fuentes y bancos y que pase por un supermercado» → `distance_km` 15 y `pass_by` con `park`, `supermarket`, `fountain` y `bench`; negación → `avoid`; texto fuera de catálogo → `rejection` o `clarification`, no 500; el texto enviado a OCI no contiene coordenadas; las condiciones salen del motor |
| D-R1 | Rutas | Ruta circular por distancia objetivo (RF-22): puntos de paso a ≈ objetivo/3 con la saludable, ±10 %; si no, la más cercana con aviso | `api/routing/loop.py` | 5 km en Getafe entre 4,5 y 5,5 km | `api/tests/routing/test_loop.py` (`slow`) |
| D-F1 | Front **[manual guiado]** | Asistente (F6): texto → chips editables → ruta + condiciones; usable solo con formulario | `frontend/src/screens/Assistant.tsx` | Funciona sin IA | Vitest + axe |
| D-F2 | Front **[manual guiado]** | Fuentes y aviso: licencias, fechas, «no es consejo médico», privacidad | `frontend/src/screens/Sources.tsx` | Enlazada desde todas las pantallas | Vitest + axe |
| **D-X** | Todos | **23:59 — congelación de alcance.** Solo correcciones. Lo que no esté en `main` con pruebas en verde **no entra**. Aplicar el orden de recorte si hace falta y anotarlo en `docs/arquitectura.md` §9 | — | `git tag congelacion-18oct` | `pytest` (api e ingest) y `npx vitest run` en verde en la etiqueta |

**Oracle/APEX (arquitectura §3.5):** solo si F1–F5 están terminados el domingo a mediodía (recorte n.º 3).

# LUNES 19/10 — tareas

| ID | Rol | Tarea | Terminado cuando |
|---|---|---|---|
| L-1 | Todos | Ensayo con las personas de la demo (CLAUDE.md §5.2) y el guion **«dos personas, mismo sitio, distinta respuesta»** | Cada persona recorre su flujo en el móvil sin ayuda |
| L-2 | Todos | Corrección de errores del ensayo (nada nuevo) | Lista cerrada o aceptada |
| L-3 | Todos | Guion de 10 min mapeado a los criterios (1.1, 1.2, 2.1, 2.2) | Ensayado dos veces dentro de tiempo |
| L-4 | Motor + Datos | **Demo sin red**: mismo Compose en un portátil con `app/data/` congelado, PMTiles local y respuestas de IA grabadas | La demo completa funciona con el wifi apagado |
| L-5 | Front | Accesibilidad: `a11y-architect`, teclado completo y lector de pantalla en el flujo principal; contraste de las pastillas del ICA | Sin bloqueantes AA abiertos |

**Martes 20/10:** demo. Antes de salir: `curl -I https://<dominio>/api/health`, ingesta horaria al día, portátil de respaldo cargado.

---

## Autorrevisión del plan

1. **Cobertura de la spec:** §3.1 → Tasks 2–3; §3.2 → Tasks 16–18, V-D1, V-D2; §3.3 → Task 19; §3.4 → Task 20, S-R1; §3.5 → condicionado; §4.1 → Task 11 (contrato) y V-M1, V-R1, V-D2, S-D1, S-M1, D-M1; §4.2 → V-M1; §4.3 → Tasks 12–14, 21, 15, V-M2, D-M1; §4.4 → Tasks 21–22, D-R1, DEC-A11; §5 → Tasks 9, 10, 23–25, V-F1–V-F3, S-F1, S-F2, D-F1, D-F2, L-5; §6 → Tasks 5, 6, 10 (imagen del front), V-F4, D-D1, L-4; §7 → D-D1, V-R1, V-M1; §8 → pruebas en cada tarea; §9 → calendario y D-X; §10 → tabla de decisiones.
2. **Sin marcadores vacíos:** los valores pendientes viven en `app/config/` con su DEC y fecha; código y pruebas no dependen de ellos.
3. **Consistencia de nombres:** `HourContext`, `evaluate_outdoor`, `compute_score`, `evaluate_hours`, `best_hour`, `needs_indoor`, `load_graph`, `edge_costs`, `shortest_path`, `bounded_distances`, `summarize`, `RouteNotFound`, `build_main`, `build_realtime`, `apply_activities`, `create_aqi_hourly`, `atomic`, `DATA_DIR`, `CONFIG_DIR` se usan igual en todas las tareas; endpoints y modelos según Task 11.
4. **Foco de revisión:** las cinco situaciones tienen prueba en su tarea.
5. **Idioma:** código en inglés; comentarios y docstrings en español sin tildes; textos para la persona usuaria y salida de scripts en español con tildes; ids de datasets y campos de origen sin traducir.
6. **Servicios:** ningún import entre `api` e `ingest` (la latencia usa `settings.DATA_DIR`, no `common`); lo compartido va por `app/data`, `app/config`, `app/.env` y `openapi.json`; versión de DuckDB fijada igual y comprobada (`test_shared_versions.py`).
