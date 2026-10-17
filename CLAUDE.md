# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Proyecto MAD Open Data Challenge 2026 (GoMad, antes «Muévete Cerca»)

Este archivo es el contexto completo del proyecto para Claude Code. Se escribió el 14/10/2026 al migrar el trabajo de un portátil a un PC de sobremesa. Todo lo marcado como **comprobado** se verificó contra las API reales de los portales (6–14/10/2026); lo marcado como **sin verificar** viene de documentación.

---

## 1. Estado actual (14/10/2026)

- **El proyecto ha sido aprobado** en la fase de ideas. Estamos en **fase de desarrollo** (13–20 oct 2026).
- **Demo presencial: martes 20 de octubre de 2026**, 10 minutos. Después el jurado accede al prototipo y a los datasets. Ganadores ese mismo día.
- **Objetivo del equipo:** no solo una demo, sino una **app web usable que se pueda ofrecer directamente** a la ciudadanía (desplegada, con HTTPS, rápida en móvil).
- **Previsión del tiempo: Open-Meteo, sin clave** (DEC-16, 16/10): sustituye a AEMET OpenData, que limitaba a ~6 peticiones/min por IP y bloqueaba la VM con 429. Los 179 municipios llegan en una petición (§7.1). `AEMET_API_KEY` ya no se usa.
- **El equipo ya tiene cuenta de Oracle** (acceso de Oracle Academy/OCI para el reto). Las credenciales **nunca** van en el repositorio ni en este archivo: solo en `.env` (ver `.env.example`).
- **Código de la app en marcha (16/10):** ingesta + normalización + `build_db`, grafo de rutas, API FastAPI (`/activities`, `/recommend`, `/route` y `/location` reales; `/municipality`, `/sources` y `/assistant/*` todavía en 501) y front React; despliegue con Docker Compose. Comandos y flujo en §3.1.
- **Nombre del proyecto: GoMad** (*Guía de Ocio: Madrid Activo y Deportivo*), decidido el 15/10.

## 2. Instrucciones para Claude en este proyecto

1. **Idioma:** español en conversación, interfaz, textos y documentación. **Código en inglés** (identificadores, nombres de ficheros y módulos, endpoints, tablas, columnas propias, claves de configuración, nombres de pruebas). **Comentarios y docstrings en español sin tildes.** Los textos que ve la persona usuaria (interfaz, mensajes, explicaciones) en español con tildes. Los identificadores de datasets y campos de origen (`eiel_deporte`, `CDMUNICIPIO`…) no se traducen. (Decidido el 14/10.)
2. **Ámbito: toda la Comunidad de Madrid, los 179 municipios, sin ningún filtro por población.** La idea inicial de «municipios de menos de 50.000 habitantes» está **descartada**; no la reintroduzcas.
3. **Ayuntamiento de Madrid (datos.madrid.es) solo como complemento para Madrid capital**, que falta en varias fuentes regionales. Las fuentes base son de la Comunidad (lo exigen las bases).
4. **La IA interpreta y explica; el motor de reglas decide.** Nunca uses un LLM para elegir destinos, calcular rutas ni puntuar. El LLM solo convierte texto libre en parámetros estructurados y redacta explicaciones con resultados del motor, sin añadir datos.
5. **No inventes identificadores de datasets ni campos.** Usa los de este archivo y de `docs/assets/requisitos_fuentes.json`; si necesitas uno nuevo, compruébalo contra la API real antes de usarlo.
6. **Consumo automatizado por API**, no cargas manuales (lo exigen las bases y RNF-06). La ingesta parte de `app/ingest/scripts/download_sources.py`.
7. **Nomecalles: usa solo la descarga pública sin clave** (sección 7). Su web lleva credenciales OAuth incrustadas en el JavaScript: **no las uses**, no son nuestras.
8. **Privacidad:** sin registro, sin datos de salud, la ubicación solo se usa en la consulta. Al proveedor de IA no se envía ubicación exacta ni datos personales.
9. **Explicabilidad y trazabilidad:** cada recomendación lleva su motivo; cada dato mostrado, su fuente y fecha (RF-19); umbrales tomados de fuentes oficiales y citados. **No es consejo médico** (aviso visible).
10. **Accesibilidad:** móvil primero, WCAG 2.1 AA, cada indicador con icono + color de semáforo + texto (nunca solo color).
11. **Licencias:** atribución de cada fuente en la app (CKAN Comunidad y Ayuntamiento: CC BY 4.0; OSM: ODbL; Open-Meteo: CC BY 4.0 con la atribución «Weather data by Open-Meteo.com» y enlace a https://open-meteo.com/). Los datasets que publiquemos: CC BY.
12. **Alcance:** priorizar F1–F5 sobre los pilotos. No añadir funcionalidades ni fuentes nuevas sin preguntar; el plazo es muy corto.
13. Si cambias requisitos o fuentes, **actualiza `docs/assets/requisitos_fuentes.json` y este archivo**.

## 3. Estructura del repositorio

```
CLAUDE.md                         ← este archivo
.gitignore                        ← app/data/, app/.env y app/*/.venv no se suben
app/                              ← TODO el código (desde el 14/10). Un directorio por servicio de Docker Compose
  .env.example                    ← copiar a app/.env (compartido por los servicios); claves solo ahí
  api/                            ← servicio API (FastAPI): pyproject.toml, main.py, engine, routing, ai, services, scripts, tests; .venv propio
  ingest/                         ← servicio de ingesta: pyproject.toml, scripts, normalize, tests; .venv propio
    scripts/download_sources.py   ← descarga todas las fuentes a app/data/raw/ (solo stdlib, probado)
    scripts/profile_sources.py    ← perfil de los datos descargados (app/data/perfil/)
  frontend/                       ← servicio web (React + Vite, compilado y servido con Caddy)
    docs/                         ← documentación del front: pendientes.md (empieza aquí), guia.md, pantallas.md
  config/                         ← YAML compartidos (montado en solo lectura en api e ingest); README.md dice qué decisión rellena cada uno
  deploy/                         ← docker-compose.yml + .env.example (solo DOMAIN; copiar a deploy/.env)
  data/raw/<fuente>/              ← volumen compartido: datos descargados + manifest.json (URL, fecha, tamaño)
```

Nombres en inglés y un directorio por servicio desde el 14/10 (§2.1 y §3). Cada servicio Python es su propia raíz de importación y **ningún servicio importa código de otro**: lo compartido va por `app/data/`, `app/config/`, `app/.env` y el `openapi.json`. La tabla de equivalencias spec (español) → código está en `docs/arquitectura.md` §9b. Pruebas: `cd app/api && .venv/bin/pytest` y `cd app/ingest && .venv/bin/pytest` (las marcadas `slow` se saltan si falta `app/data/raw`).

```
docs/contexto-muevete-cerca.md    ← documento largo: matriz requisito→fuente con enlaces, esquemas, tabla de 25 municipios
docs/assets/requisitos_fuentes.json    ← matriz de trazabilidad en JSON (24 requisitos), fuente de verdad
docs/assets/municipios_candidatos.json ← 25 municipios con más datos y sus 23 indicadores
docs/assets/umbrales.md                ← umbrales oficiales (ICA del BOE; calor pendiente)
docs/assets/matriz-datos.html          ← página de trabajo (copia local del artifact)
docs/idea/                        ← documento de idea .docx (DESACTUALIZADO, ver §4.3), prototipo visual .png y .html, logo_gomad.png, notas ChatGPT
docs/idea/pdf/                    ← GoMAD: aproximación técnica, fuentes de datos e interfaz de usuario (PDF)
docs/bases/                       ← bases del reto (Bases-MAD-Open-Data-Challenge-2026.pdf) + 8 PDF de la jornada del 6/10
docs/plan-implementacion.md       ← plan por tareas (Task N) hasta la demo; docs/guia-ejecucion.md ← orden de ejecución por días y roles
docs/prompt_task_executer.md      ← plantilla para ejecutar tareas (executing-plans); docs/prompt_task_checker.md ← plantilla del verificador
```

**Arranque en un equipo nuevo:**
```bash
# solo la primera vez (cada servicio Python tiene su venv; igual en app/api):
#   cd app/ingest && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
cd app/ingest && . .venv/bin/activate
cp ../.env.example ../.env                                                # claves de IA/Oracle si hacen falta (la previsión no necesita clave)
python3 scripts/download_sources.py --list
python3 scripts/download_sources.py --group full
python3 scripts/download_sources.py --refresh reference --include-heavy   # mensual
python3 scripts/download_sources.py --refresh daily                       # 04:00
python3 scripts/download_sources.py --refresh hourly                      # cada hora
python3 scripts/download_sources.py --refresh weekly --include-heavy      # OSM (y despues el grafo)
```
`open_meteo` está en el grupo `minimal` y en el nivel `hourly`: una sola petición con los 179 puntos de `app/config/forecast_points.csv`, sin clave (DEC-16).
Capas marcadas PESADAS (no se bajan por defecto; `--include-heavy`): `vpla_redes`, `viales`, `cubierta_terrestre` (~137.000 polígonos: mejor pedirla filtrada por `bbox` del piloto), `aire_historico`, `ay_bancos`, `osm` (~85 MB), `callejero` (~33 MB zip). `--force` descarga aunque la fuente no haya cambiado.

**Inicializar los datos en un equipo nuevo, sin instalar Python** (desde `app/`; 20–30 min la primera vez, Docker con ≥ 6 GB de RAM):
```bash
docker compose -f deploy/docker-compose.init.yml run --rm ingest     # descarga, normaliza, gomad.duckdb, realtime.duckdb y grafo regional
```
Opciones: `--skip-download` (rehacer con lo ya descargado) y `--skip-graph`; y `GOMAD_DATA_PATH` (otra carpeta de datos). Imagen `app/ingest/Dockerfile`, guion `app/ingest/scripts/init_data.sh`. Solo para equipos de desarrollo: no forma parte del despliegue.

**Levantar la app con Docker Compose** (desde `app/`):
```bash
cp deploy/.env.example deploy/.env        # solo DOMAIN: ":80" en local, el dominio en la VM
docker compose -f deploy/docker-compose.yml up -d --build
curl -s localhost/api/health             # {"status":"ok"}
```
El Compose compila el front dentro de la imagen (Dockerfile multi-stage: `node:22.23.3-alpine` hace `npm ci` y `npm run build`, Caddy sirve `dist`), así que no hace falta `dist/` local; las pruebas del front se ejecutan antes, en local (`cd app/frontend && npm test`). En la VM, desde `~/GoMad`: `app/deploy/deploy.sh` (hace `git pull --ff-only`, `up -d --build` y comprueba `/` y `/api/health`; `--no-pull` para saltarse el pull).
Las claves de `app/.env` solo llegan al contenedor `api`; Caddy (`frontend`) recibe solo `DOMAIN`. Si `docker` da «permission denied» en el socket tras añadirte al grupo `docker`, abre una terminal nueva (o `newgrp docker`).

### 3.1 Desarrollo: flujo de datos y comandos

**Flujo de datos** (cada paso lee lo que deja el anterior en `app/data/`; `GOMAD_DATA_DIR` y `GOMAD_CONFIG_DIR` cambian las rutas, por defecto `app/data` y `app/config`):
1. `app/ingest/scripts/download_sources.py` → `data/raw/<fuente>/` + `manifest.json`.
2. `cd app/ingest && python -m normalize [fuente…]` → GeoParquet limpio (un módulo por dominio en `normalize/`; una fuente rota no para el resto y se conserva el parquet anterior).
2b. `python osm_green.py` → `clean/osm_green.parquet` (áreas verdes de OSM con las etiquetas `osm_green` de `routing.yaml`; ~70 s, tras descargar `osm` y antes de `build_db main`). Sin él, `build_db` deja `green` NULL fuera de VPLA.
3. `python -m build_db main | realtime | all` → `data/gomad.duckdb` y `data/realtime.duckdb` (se escriben en un fichero temporal y se sustituyen de golpe; la API los abre en solo lectura).
4. `python graph.py [28065 | <ine> | all]` → `data/graph/<zona>/` (nodos y `edges.parquet`) desde el extracto OSM; `all` = grafo regional.

**API** (`app/api/`, raíz de importación propia, sin paquete): `main.py` define endpoints y carga al arrancar `Repository` (DuckDB), `GraphStore` (grafos en memoria) y `Geocoder`, y valida `rules.yaml` y `weights.yaml` (un YAML erróneo para el arranque). Capas: `services/` orquesta cada endpoint → `engine/` (puntuación, franjas, reglas, explicación con plantillas) y `routing/` (A*/Dijkstra sobre el grafo); `schemas.py` es el contrato Pydantic. Los logs nunca llevan query ni cuerpo (la query de `/location` es una dirección). `/location` (`geocoding.py`) acepta texto parcial (prefijos de 3+ letras, sin tildes) y devuelve varios candidatos: primero municipios, después calles; con número de portal o calle + municipio, las calles primero y el municipio de respaldo al final; topes en `config/location.yaml`.
```bash
cd app/api && .venv/bin/uvicorn main:app --reload --port 8000   # el front en dev hace proxy de /api a :8000
.venv/bin/pytest tests/engine/test_scoring.py -k nombre           # una prueba
.venv/bin/pytest -m "not slow"                                     # sin datos reales
```

**Contrato API ↔ front:** al cambiar `schemas.py` o un endpoint, `cd app/api && .venv/bin/python scripts/export_openapi.py` (escribe `app/frontend/src/api/openapi.json`) y `cd app/frontend && npm run contract` (regenera `schema.d.ts`). `tests/test_contract.py` falla si `openapi.json` está desfasado.

**Front** (`app/frontend/`, empieza por `docs/pendientes.md`): `npm run dev` (:5173), `npm test` (Vitest + Testing Library + axe), `npx vitest run src/App.test.tsx` (un fichero), `npm run lint` (oxlint), `npm run build` (tsc + vite). Datos de ejemplo de las personas de la demo en `src/data/mock/`.

### 3.2 Documentación de contexto (`docs/`)

**Documento de trabajo vigente (desde el 17/10): `docs/pendientes-app.md`** — estado, lo que falta, ficha de cada tarea, reglas de trabajo en paralelo, cómo lanzar/verificar y despliegue. `docs/trabajo-paralelo.md` y `docs/guia-ejecucion.md` son históricos.

Los markdown de `docs/` son **contexto del proyecto**: léelos cuando la tarea toque su tema, en vez de deducirlo del código. Prioridad si se contradicen: este archivo → `docs/arquitectura.md` (prevalece sobre §6) → `docs/plan-implementacion.md` → el resto.

| Documento | Qué contiene | Cuándo leerlo |
|---|---|---|
| `docs/arquitectura.md` | Diseño técnico aprobado: decisiones D-01…D-13, flujo de `/recommend`, módulos del motor, rutas (coste con suelo, Dijkstra de igraph, latencias medidas), stack del front, accesibilidad, VM de OCI (§6.1: despliegue y **cómo copiar `app/data` a la VM**), fiabilidad, pendientes A-01…A-13 | Antes de tocar la API, las rutas, el front o el despliegue |
| `docs/plan-implementacion.md` | Plan por tareas (`### Task N:`, 1–32 detalladas; sábado–lunes como tablas S-/D-/L-). Secciones clave: «Estructura por servicios», «Restricciones globales», «Foco de revisión» (5 casos límite con su prueba), «Decisiones del equipo» (DEC-xx → fichero de `app/config/`) | Al ejecutar o verificar una tarea; es muy largo (~340 KB): busca la tarea por su encabezado |
| `docs/trabajo-paralelo.md` | **Reparto vigente desde el 16/10:** bloques F, M, B1–B5, D y L, cada uno con su rama, sus ficheros («Es suyo»), su rango de Tasks y su plan en `docs/planes/<bloque>.md` (B1: `docs/planes/municipio-fuentes.md`, lotes en `docs/guia-ejecucion.md` §7); reglas para los ficheros compartidos, decisiones del 16/10 ya cerradas, prompt base y orden de fusión | Antes de empezar cualquier bloque de trabajo |
| `docs/guia-ejecucion.md` | Orden de ejecución por lotes y roles, estado de cada tarea y PR, ciclo EJECUTAR → VERIFICAR (dos conversaciones distintas) → PR | Para saber qué está hecho y qué toca después |
| `docs/prompt_task_executer.md` / `prompt_task_checker.md` | Plantillas para ejecutar (`superpowers:executing-plans`, TDD, ledger en `.superpowers/`) y verificar en solo lectura; se cambia solo la primera línea (`TAREAS`, `RAMA`, `BASE`) | Cuando la persona pida ejecutar o verificar tareas del plan |
| `docs/PENDIENTES.md` | Tareas P-00…P-13 (p. ej. P-12 hora de cambio de día de `aire_dia`, P-13 cuota de AEMET, superada por DEC-16) | Al tocar ingesta horaria o la previsión |
| `docs/decisiones-pendientes.md` | Fichas D-01…D-14 con opciones y cifras. Muchas ya están decididas (ver §11); **D-10 «GOATS» está superada: el nombre es GoMad** | Para entender el porqué de una decisión |
| `docs/informe-datos.md` | Perfil real de las 46 fuentes (filas, cobertura, codificación, CRS) y 12 trampas de datos con su tratamiento | Antes de escribir o cambiar un normalizador |
| `docs/assets/umbrales.md` | ICA del BOE (bandas, periodos, colores, recomendaciones literales) y calor del plan de Sanidad 2026 (umbrales por zona, regla de niveles, propuesta DEC-06); `heat_zones.csv` = municipio → zona | Antes de tocar `rules.yaml`, `ica_thresholds.yaml` o textos de salud |
| `docs/contexto-muevete-cerca.md` | Documento de traspaso del 6/10: matriz RF → fuente con enlaces, esquemas, tabla de 25 municipios. Fechas y nombres superados | Solo para enlaces o detalle de una fuente concreta |
| `docs/idea/ChatGPT-…md` | Notas de ideación del 5/10 (histórico) | Casi nunca |

Reglas de trabajo que salen de estos documentos:
- **Front = [manual guiado]:** la persona del front programa `app/frontend/` a mano siguiendo `app/frontend/docs/` (`pendientes.md`, `guia.md`, `pantallas.md`). No escribas ahí salvo que lo pida; sí puedes revisar o documentar.
- **Git:** nadie trabaja en `main`; una rama por lote (`<rol>/<día>-<tema>`, p. ej. `motor/vie16-api-conexion`) creada desde `main` actualizado, y entra por PR. Commits en español con prefijo de rol (`Motor: …`, `Front: …`, `Docs: …`).
- **Valores sin decisión no van en código:** pesos, umbrales, actividades e indicadores se leen de `app/config/*.yaml`; lo que no tiene fuente oficial lleva `own_criterion: true` y la app lo dice.
- **Orden de recorte si falta tiempo:** F6 → ruta en toda la Comunidad (solo Getafe) → Oracle/APEX. Congelación de alcance: domingo 18, 23:59.

Página de trabajo publicada (privada): https://claude.ai/artifact/MT3co6p1UKtJypQwBGqZpK

## 4. El reto

**MAD Open Data Challenge 2026** (UC3M + Comunidad de Madrid + Oracle). Soluciones para la ciudadanía de la Comunidad de Madrid en **natalidad, transportes, servicios sociales, bienestar y salud**, con **datos abiertos de la Comunidad**, enriquecibles con otras fuentes públicas o privadas fiables. Hay que: definir un problema, establecer indicadores/datasets que reutilicen o enriquezcan los datos, integrar fuentes, implementar algoritmos de recomendación y entregar un prototipo funcional usable por el jurado.

Las ideas de ejemplo de las presentaciones (paseos saludables, soledad no deseada, punto sanitario abierto, reciclaje, economía circular) son **opcionales**.

**Criterios (100 puntos):**
| Criterio | Pts |
|---|---|
| 1.1 Corrección del planteamiento teórico en el tratamiento de datos abiertos | 25 |
| 1.2 Grado de resolución del reto | 25 |
| 2.1 Sencillez para obtener y entender resultados | 25 |
| 2.2 Interactividad y flexibilidad para adaptarlo al caso del usuario (**primer desempate**) | 25 |

Soporte: Discord https://discord.gg/ZfNFQvrRb · Web: https://datathon-mad.sel.inf.uc3m.es · Oracle Academy ofrece licencias (250 €/equipo): Autonomous AI Database 26ai, APEX, Select AI, AI Vector Search, OML/AutoML, Spatial Studio, OCI Generative AI y Speech.

### 4.1 Presentaciones del 6/10 (resumen útil)
1. Oracle: confianza por diseño (finalidad, datos, modelo, personas); empezar por un reto concreto y una medida de impacto.
2. Lecciones de ediciones anteriores: valor de los datos reutilizados y generados, ayudar a decidir, fiabilidad, capacidad de crecimiento.
3. El reto (sección 4).
4. Instituto de Estadística: catálogo → eDatos → **Nomecalles** (cartografía y puntos de interés).
5. Ayuntamiento de Madrid: ~700 datasets (equipamientos, aire, tráfico, padrón, panel de barrios).
6. Comunidad: CKAN `datos.comunidad.madrid/api/3/action/...`, IDEM, portal estadístico.
7. Oracle DB 26ai: convergente, Select AI, vectores.
8. Keensai: APEX con mapas nativos e IA integrada.

### 4.2 La idea
**«Quiero hacer X → dime dónde y cuándo → llévame por la mejor ruta.»** Web móvil, sin registro, que convierte datos abiertos en una decisión explicada: *«Corre en este parque a las 20:00; baja la temperatura, el aire es bueno y el 68 % del camino va por zona verde.»* Más una vista de municipio con lo que ofrece cada localidad, sin rankings.

**Problema:** (1) información dispersa en 4 portales con formatos, CRS y codificaciones distintos; (2) decisiones a ciegas (ozono, calor; la mayoría de municipios no tiene estación de aire propia); (3) la ruta corta suele ser la peor (tráfico, sin sombra); (4) elegir dónde vivir sin ver qué ofrece cada uno de los 179 municipios.

### 4.3 El documento de idea (.docx) está desactualizado
`docs/idea/Muévete … .docx` (5/10) todavía: menciona municipios < 50.000 hab.; dice «sin IA generativa» (ahora existe F6); propone pilotos aún sin elegir; no incluye Nomecalles. **La fuente de verdad es este archivo.**

## 5. Funcionalidades y requisitos

| ID | Funcionalidad | Qué hace | Prioridad |
|---|---|---|---|
| F1 | Recomendador de actividad | Actividad elegida o «Sorpréndeme» → 3 mejores destinos cercanos con nota 0–10, ampliable | MVP |
| F2 | Información del momento y mejor franja | Previsión horaria + aire → mejor hora; con lluvia/calor/mal aire propone cubierto u otra franja | MVP |
| F3 | Mapa y ruta saludable | Ruta directa vs. saludable (más verde, menos tráfico) con distancia, tiempo, % verde, tramos con tráfico; fuentes, bancos, sombra, desfibriladores | MVP |
| F4 | Personalización | Tiempo, distancia máx., interior/exterior, perfil (general, mayor, carrito, sensible a contaminación; «Salgo con…» perro/niños), pesos por factor; recálculo instantáneo | MVP |
| F5 | Vista de municipio | Indicadores: deporte, naturaleza, movilidad, salud, educación, conectividad + encaje con preferencias, sin rankings | MVP |
| F6 | Asistente de rutas con IA | Texto libre («15 km andando, por un parque, con fuentes y bancos y que pase por un supermercado») → parámetros editables → motor → explicación de qué se cumple y qué no | Should |

**Requisitos funcionales** (Must = imprescindible para la demo):
| ID | F | Requisito | Prio |
|---|---|---|---|
| RF-01 | F1 | Ubicación por navegador o dirección/municipio escritos | Must |
| RF-02 | F1 | Catálogo cerrado de actividades (correr, caminar, nadar, pádel…) | Must |
| RF-03 | F1 | «Sorpréndeme»: 3 opciones de tipos distintos | Must |
| RF-04 | F1 | Catálogo unificado de destinos (tipo, actividades, interior/exterior, coordenadas) | Must |
| RF-05 | F1 | Top 3 con distancia, tiempo a pie y nota; «Ver más» | Must |
| RF-06 | F2 | Previsión horaria y aire de la estación más cercana | Must |
| RF-07 | F2 | Puntuación: cercanía, adecuación, verde, aire, meteo; pesos por defecto o del usuario | Must |
| RF-08 | F2 | Mejor franja dentro de la ventana elegida | Must |
| RF-09 | F2 | Lluvia/calor/aire malo → instalación cubierta u otra franja | Must |
| RF-10 | F2 | Explicación en lenguaje llano | Must |
| RF-11 | F3 | Mapa sincronizado con la lista | Must |
| RF-12 | F3 | Ruta saludable vs. directa (distancia, tiempo, % verde, tráfico) | Must |
| RF-13 | F3 | Desnivel, sombra, fuentes y desfibriladores en el resumen de ruta | Should |
| RF-14 | F4 | Tiempo, distancia máx., interior/exterior | Must |
| RF-15 | F4 | Perfil que ajusta umbrales y filtros | Must |
| RF-16 | F4 | Pesos ajustables, recálculo sin reiniciar | Must |
| RF-17 | F5 | Indicadores por categoría | Must |
| RF-18 | F5 | Encaje con preferencias, sin comparar municipios | Should |
| RF-19 | — | Fuente y fecha de cada dato | Should |
| RF-20 | F6 | Texto libre → parámetros visibles y editables | Should |
| RF-21 | F6 | Catálogo cerrado de condiciones: distancia/duración, actividad, circular/ida, pasar por (parque, fuente, banco, supermercado, área canina, juegos…), evitar (tráfico, cuestas) | Should |
| RF-22 | F6 | Ruta por distancia objetivo (±10 %), circular o ida, con puntos de paso | Should |
| RF-23 | F6 | Respuesta con condiciones cumplidas/no cumplidas, solo con datos del motor | Should |
| RF-24 | F6 | Pedir aclaración si es ambiguo; rechazar fuera de catálogo o consejo médico | Should |

**No funcionales:** primera recomendación en ≤3 interacciones y <1 min; lenguaje llano; móvil + WCAG 2.1 AA; recomendación <3 s, ruta <5 s; sin registro (RGPD/LOPDGDD); consumo por API; recarga por niveles según la frecuencia de cada fuente (§6.4); si cae una fuente, último dato en caché + aviso; motor trazable con umbrales oficiales; aviso «no es consejo médico»; licencias listadas; tecnologías abiertas; añadir municipio sin tocar código.

**Fuera del MVP:** reservas/ocupación/precios, plan con amigos, vista semanal, transporte público como modo de llegada, UV y polen, comparativas de municipios, recomendador que aprende del usuario.

### 5.1 Perspectivas
- **Ciudadano (principal, MVP):** F1–F6.
- **Administración (secundaria, una pantalla de demostración):** carencias por municipio; equipamiento en mal estado (EIEL: 25 instalaciones «MALO», 77 sin acceso en silla de ruedas); informe de «datos que faltan» (75 municipios casi sin mobiliario en OSM, 12 fuera del planeamiento, columna NATACION vacía…); publicar el catálogo unificado como dataset abierto CC BY. Idea: hacerla en Oracle APEX + Select AI.
- **Empresa (terciaria, evolución):** huecos de oferta deportiva por habitante y renta, tejido de clubes. Regla: **la recomendación al ciudadano nunca se vende** (sin anuncios ni patrocinios).

### 5.2 Personas de la demo
- **Carmen, 72:** julio, **38 °C en Getafe** (día de calor: umbral de su zona 37,4 °C; con 36 °C no lo es, DEC-06), 45 min → «Ahora no: mejor a las 21:00» (previsión horaria), alternativa cubierta, bancos en ruta. Con previsión de reserva grabada.
- **Lucía, 28, corredora sensible a la contaminación:** ozono alto → mejor franja mañana temprano, circuito lejos de avenidas.
- **Dani y su hija de 4 años, con carrito:** parque con juegos por ruta sin vías rápidas.
- **Ana y su perro:** área canina, fuentes y papeleras en ruta.
- **Familia que se muda:** vista de municipio.
- Guion clave para 2.2: **«dos personas, mismo sitio, distinta respuesta»** moviendo los pesos en directo.

### 5.3 Pilotos
- **Ruta saludable:** **Getafe** (OSM nivel A: 1.074 bancos, 61 fuentes, 307 papeleras; 172,8 m² zona verde/hab en VPLA; estación de aire propia; 19 instalaciones en Nomecalles) y **Madrid capital** (tráfico en tiempo real, fuentes, mobiliario y aire del Ayuntamiento). Alternativa: **San Lorenzo de El Escorial** (único con EIEL + VPLA + OSM nivel A; sin estación de aire). Descartados: Algete (sin mobiliario en OSM), Guadarrama (fuera de VPLA).
- **Recomendación de destinos y vista de municipio:** los 179 municipios.

## 6. Arquitectura propuesta

> Diseño técnico aprobado el 14/10: **`docs/arquitectura.md`** (prevalece sobre esta sección donde difieran).

- **Ingesta (Python, `app/ingest/`):** a partir de `scripts/download_sources.py`; normalizar a **EPSG:4326** y **UTF-8**; programada por niveles de recarga (§6.4); caché del último dato válido.
- **Almacén:** DuckDB + Parquet/GeoParquet **o** Oracle Autonomous Database (ya hay cuenta de Oracle). **Decisión pendiente** (ver §11). Oracle facilita Select AI/APEX para la pantalla de administración y OCI Language para F6 (DEC-03), y suma con el patrocinador; DuckDB es más simple de montar y desplegar.
- **API (FastAPI, `app/api/`):** `/recommend`, `/route`, `/municipality/{ine_code}`, `/assistant/*` (F6), `/sources` (atribución y fechas), `/activities`, `/location`.
- **Rutas:** grafo peatonal de OSM (extracto Geofabrik + OSMnx o similar) precalculado por municipio piloto; coste por tramo = longitud × penalización por tráfico/tipo de vía − bonificación por verde, sombra y fuentes.
- **Frontend:** SPA móvil con MapLibre GL; navegación inferior «Mi entorno · Municipios · Perfil»; 5 pantallas (inicio «¿Qué quieres hacer?», resultados mapa+lista, detalle con «¿Por qué?» y mejor franja, ruta saludable, vista de municipio) + asistente F6.
- **Despliegue:** publicado en **https://example.com** (VM de OCI, 16/10; `docs/arquitectura.md` §6.1). HTTPS obligatorio (la geolocalización del navegador lo exige); claves solo en `app/.env` (solo las recibe la api); `DOMAIN` de Caddy en `app/deploy/.env` (copiar de `app/deploy/.env.example`: `:80` en local, el dominio en la VM), así el contenedor expuesto no recibe claves; página de fuentes y licencias; aviso legal y de privacidad.

### 6.1 Modelo de datos destino
Tablas con nombre en inglés desde el 14/10 (`municipio` → `municipality`, `destino` → `destination`, `estacion_aire` → `air_station`, `lectura_aire` → `air_reading`, `prevision` → `forecast`, `tramo` → `edge`, `poi_ruta` → `route_poi`, `servicio` → `service`, `indicador_municipio` → `municipality_indicator`); columnas en inglés según `build_db.py` (Task 19 del plan); las que Task 19 no define siguen en español y los campos se fijan en el contrato y en `build_db.py`.
- `municipality(ine_code PK, name, geom, population, densidad, renta_media, zona_aire, in_eiel, in_vpla, piloto_ruta)`
- `destination(id PK '{source}:{id_origen}', source, name, type [instalacion|parque|area_recreativa|senda|zona_bano], actividades[], covered, exterior, accessible, condition, owner, water, url, ine_code FK, geom, updated)` — `green`: fracción de 300 m alrededor en zona verde; VPLA y, en los municipios sin VPLA con áreas verdes en OSM, OSM (`clean/osm_green.parquet`); NULL si no hay ninguna
- `air_station(id PK, network [CM|AY], name, area_type, magnitudes[], ine_code, geom)`
- `air_reading(station_id, magnitude, ts, value, flag)` — formato largo (H01…H24 → filas)
- `forecast(ine_code, ts, temp, feels_like, precip_prob, precip, wind, sky, issued, temp_max_day)` — Open-Meteo (DEC-16): `precip_prob` horaria, `issued` = fecha de descarga, `temp_max_day` = Tmáx diaria del día de `ts` (calor, DEC-06)
- `edge(id, u, v, geom, longitud_m, tipo_via, pct_verde, trafico, fuente_cerca)` — en `app/data/graph/<zona>/edges.parquet`: `length_m`, `highway`, `traffic`, `green_pct` (NaN = municipio sin VPLA), `near_fountain/bench/aed` y `fountain_id/bench_id/aed_id` (punto más cercano a ≤ `poi_radius_m`; la ruta cuenta puntos distintos y solo fuentes con `working IS NOT FALSE`)
- `route_poi(id, type [fuente|banco|papelera|aseo|area_canina|juegos|dea|biosaludable|supermercado], source, status, working, geom)` — `status`: estado de origen (p. ej. `CERRADA_TEMPORALMENT`), nulo si no hay; `working`: boolean, nulo = sin dato. La ruta solo cuenta `working IS NOT FALSE` (las fuentes fuera de servicio se muestran, no cuentan).
- `service(id, categoria [salud|farmacia|educacion|social|cultura|transporte], subtipo, ine_code, geom)`
- `municipality_indicator(ine_code, categoria, indicador, valor (NULL = sin datos), unidad, anio, source)`

Código de municipio: INE de 5 dígitos `28` + 3 dígitos (`MUN` en EIEL, `CMUN` en Nomecalles, `CD_MUNICIPIO` en VPLA). Madrid = 28079, Getafe = 28065, San Lorenzo de El Escorial = 28131.

### 6.2 Lógica de recomendación (borradores a validar por el equipo)
- **Filtros duros:** actividad, tiempo, distancia máxima; cubierto si llueve, calor extremo o aire desfavorable.
- **Puntuación ponderada 0–10:** cercanía, adecuación a la actividad, verde/sombra, aire previsto, meteorología. Pesos por defecto **por definir**; el usuario los cambia (RF-16).
- **Umbrales:** aire → bandas del **Índice Nacional de Calidad del Aire (MITECO)**: **una sola tabla de bandas**; lo que cambia por población es la recomendación (BOE-A-2020-10426, `umbrales.md` §1.5); calor → umbrales oficiales del Ministerio de Sanidad, comparados con la Tmáx prevista de Open-Meteo (DEC-06, DEC-16). **Copiarlos de la fuente oficial, no de memoria**, y citarlos en la app.
- **Mejor franja:** evaluar cada hora con la previsión horaria de Open-Meteo + patrón horario de la estación (histórico).
- **Borrador actividad → destino (RF-02), pendiente de cerrar:**
  - *Caminar / pasear:* parques (EIEL, Nomecalles, VPLA zonas verdes, Ayto.), sendas, vías pecuarias, áreas recreativas.
  - *Correr:* lo anterior + pistas de atletismo (EIEL `ATLETISMO`) + nombres con «atletismo».
  - *Nadar:* EIEL `TIPOINSTAL` «PISCINAS AL AIRE LIBRE»/«PISCINAS CUBIERTAS» (**no** la columna `NATACION`, vacía), Nomecalles con «piscina» en el nombre, piscinas del Ayto., zonas de baño.
  - *Pádel / tenis / fútbol / baloncesto:* columnas EIEL `PADEL`, `TENIS`, `FUTBOL`, `BALONCESTO`; Nomecalles por palabra clave («pádel/padel», «tenis», «campo de fútbol»…); OSM `sport=*`.
  - *Gimnasio / cubierto:* `covered` de EIEL se decide por `TIPOINSTAL` (`app/ingest/normalize/sports.py:eiel_covered`): exteriores «AIRE LIBRE», «SIN CUBRIR», «PISTAS POLIDEPORTIVAS», «TERRENOS DE JUEGO», «ESCUELA DE VELA», «ESTACIONES DE ESQUI», «PUERTO DEPORTIVO»; cubiertos «CUBIERT…» y «GIMNASIO»; tipos mixtos («COMPLEJOS POLIDEPORTIVOS», «OTROS») por `SUP_CUBI > 0`; sin dato → nulo. **No** basta `SUP_CUBI > 0`: lo cumplen piscinas al aire libre y campos con vestuario o grada cubiertos.

### 6.3 F6 — asistente de rutas (diseño)
1. Interpretación (OCI Language + diccionario del catálogo RF-21): texto → parámetros (validados contra un esquema cerrado) que se muestran y son editables. Ejemplo: `{actividad:"caminar", distancia_km:15, circular:true, pasar_por:["parque","supermercado"], durante:{fuentes:"frecuentes", bancos:"frecuentes"}}`.
2. Motor: elige puntos de paso que sumen la distancia objetivo (±10 %) y los encadena con la ruta saludable sobre el grafo del piloto.
3. Motor: comprueba cada condición con datos reales.
4. Plantillas: redactan la respuesta solo con esos resultados («14,6 km… no hay bancos entre el km 3 y el 5»).
Riesgos: la ruta circular por distancia es la parte difícil; latencia de OCI Language 0,23 s de media (medida el 15/10); dependencia externa en la demo (guardar respuestas de reserva). Proveedor (DEC-03, 15/10): **OCI Language + reglas + plantillas, sin LLM** (ver §11); los pasos 1 y 4 los hacen el diccionario del catálogo y las plantillas.

### 6.4 Política de recarga de datos (decidida 14/10, implementada en el script de descarga el 14/10)
Cada fuente se recarga según la frecuencia con que la publica su portal: ni más (gasta recursos y cuota), ni menos (datos viejos). Sustituye y afina el RNF «estáticos a diario, aire y previsión cada hora». Frecuencias declaradas en los metadatos de CKAN (6/10): sanitarios DIARIO, farmacias SEMANAL, centros educativos ANUAL, atención social MENSUAL, zonas de baño ANUAL, estaciones de aire MENSUAL, aire del día HORARIO; Ayuntamiento: aire y meteo continuo, equipamientos diario.

| Nivel | Cuándo se recarga | Fuentes (ids de `app/ingest/scripts/download_sources.py`) |
|---|---|---|
| **1. Referencia** | Al publicarse una versión nueva: comprobación mensual + botón «Recargar todas las fuentes» solo en administración | `eiel_*` (EIEL 2023), `vpla_redes` (planeamiento 2025), `sendas`, `vias_pecuarias`, `municipios`, `zonas_aire`, `areas_recreativas`, `cubierta_terrestre`, `viales`, `padron`, `densidad`, `renta`, `zonas_bano`, `educativos`, `aire_estaciones`, `estaciones_aire_idem`, `ay_aire_estaciones`, `aire_historico`, `aire_zonas` (CKAN, municipio → zona; no estaba en la tabla original), `callejero` |
| **2. Diario** | Una vez al día, de madrugada (tarea programada) | `sanitarios`, `farmacias`, `desfibriladores`, `atencion_social`, `nmc_*` (Nomecalles), `ay_polideportivos`, `ay_idb`, `ay_piscinas`, `ay_parques`, `ay_fuentes`, `ay_bancos`, `ay_areas_caninas`; OSM **semanal** (rehacer el grafo de rutas es costoso) |
| **3. Horario** | Cada hora, automático, con caché del último dato válido | `aire_dia`, `ay_aire`, `ay_meteo`, previsión de Open-Meteo (en la API, una petición por hora para los 179; DEC-16) |
| **4. Bajo demanda** | Al pedirlo el usuario, con caché corta (5–15 min) | `ay_trafico` (cambia cada 5 min); botón de usuario «Actualizar ahora», que **solo** refresca aire, tráfico y previsión, limitado a una vez cada pocos minutos |

**Implementado el 14/10** (`refresh`, `--refresh`, comprobación de cambios por `metadata_modified` / `ETag`-`Last-Modified` / sha256); nivel extra `weekly` para OSM; `aire_zonas` en `reference`. En las capas WFS de IDEM el sha256 ignora el `timeStamp` de la respuesta y los ids `fid-…` que GeoServer genera en cada petición (no manda `ETag` ni `Last-Modified`). Falta la tarea programada por nivel (sábado, S-D2).

Implementación mínima (no sobredimensionar):
- Añadir un campo `refresh` a cada entrada de `SOURCES` en el script y una opción `--refresh <nivel>` para descargar solo ese nivel. Valores en código: `reference` (nivel 1), `weekly` (OSM), `daily` (nivel 2), `hourly` (nivel 3), `on_demand` (nivel 4).
- **Antes de descargar, comprobar si la fuente ha cambiado** (`metadata_modified` de CKAN o cabecera `Last-Modified`/`ETag`); si no ha cambiado, no se descarga ni se reprocesa.
- Una tarea programada (cron o el planificador del despliegue) por nivel; tras cada descarga, reprocesar solo las tablas afectadas.
- Guardar en `data/raw/manifest.json` la fecha de cada recarga y mostrarla en la app («Aire actualizado hace 12 min», RF-19).
- Nunca un botón público que recargue todo: son ~220 MB, varios minutos, y saturaría los portales y los límites de uso de Open-Meteo.
- En la demo, el botón de administración enseña que los datos llegan en directo de los portales oficiales (suma en el criterio 1.1).

### 6.5 Otros usos de IA barajados (DEC-11, 15/10: n.º 1 descartado, se usan palabras clave; n.º 2 pendiente, necesita un LLM; ver §11)
1. **Deducir el deporte de cada instalación** de Nomecalles y del texto `EQUIPAMIENTO` del Ayuntamiento con un LLM, en lote, revisando una muestra → enriquece datos públicos (criterio 1.1). **Descartado (DEC-11): sin LLM disponible, se usan palabras clave.**
2. **Select AI + APEX** para la pantalla de administración (preguntas en lenguaje natural).
3. **Predicción horaria del aire** con AutoML/OML usando el histórico desde 2005 (solo si alguien domina modelos).
4. **Voz** para F6 (OCI Speech), pensada para personas mayores.
5. Resumen del municipio en lenguaje llano (solo redacta nuestros números).
6. Detección automática de errores en los datos (para el informe de datos que faltan).
7. Búsqueda semántica con AI Vector Search (se solapa con F6).
No hacer: recomendador que aprende del usuario (exige guardar historial), IA que decida rutas o notas.

## 7. Fuentes de datos (todas comprobadas salvo indicación)

### 7.1 Portales y acceso
| Portal | Acceso | Notas |
|---|---|---|
| **CKAN Comunidad** https://datos.comunidad.madrid | `/api/3/action/package_show?id=<id>`; ficha `https://datos.comunidad.madrid/dataset/<id>` | CSV con `;`. UTF-8 con BOM en datos propios; **Windows-1252** en series estadísticas (padrón, renta, densidad). Coordenadas UTM ETRS89 30N (EPSG:25830), a veces con coma decimal |
| **IDEM** https://idem.comunidad.madrid | WFS `https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=<capa>&outputFormat=application/json` (admite `count`, `propertyName`, `srsName=EPSG:4326`, `bbox`). Fichas por CSW: `…/catalogocartografia/srv/spa/csw` | 206 capas. La búsqueda JSON del catálogo da 403: usar CSW |
| **Nomecalles** (Instituto de Estadística) https://gestiona.comunidad.madrid/nomecalles_web/ | **Sin clave:** `GET https://apiscm.comunidad.madrid/t/ciudadanos.comunidad.madrid/sector-publico/nomecalles-descargas/v1/paquetes/<capa>` → `data.url_descarga` (zip con shapefile, caduca en 1 h). Lista de capas: `nomecalles_web/assets/download-layers.json`. Buscador de direcciones (sin clave): `…/nomecalles-buscador/v1/direcciones?busqueda=calle madrid 10 getafe` | Shapefile EPSG:25830, DBF UTF-8. El buscador **no devuelve coordenadas**: se resuelven con `callejero_completo_2025` (D-04, decidido el 14/10) |
| **Ayuntamiento de Madrid** https://datos.madrid.es | CKAN `https://datos.madrid.es/api/3/action/…`; ficha `/dataset/<id>` | **Solo capital.** Suele incluir LATITUD/LONGITUD, pero **no** en bancos (3.733 de 76.640) ni áreas caninas (2 de 112): usar `COORD_GIS_X/Y` (EPSG:25830) y reproyectar |
| **Tráfico Ayto.** | `https://informo.madrid.es/informo/tmadrid/pm.xml` (cada 5 min) | ~4.000 puntos: `idelem`, `descripcion`, `intensidad`, `ocupacion`, `carga`, `nivelServicio`, `error`, `st_x`, `st_y` (UTM) |
| **OpenStreetMap** | Geofabrik https://download.geofabrik.de/europe/spain/madrid.html (preferido); Overpass solo para pruebas (overpass-api.de dio 406; funcionó `maps.mail.ru/osm/tools/overpass/api/interpreter`; limita peticiones) | ODbL. Mobiliario muy desigual entre municipios |
| **Open-Meteo** *(comprobado 16/10, sin clave; sustituye a AEMET OpenData, DEC-16)* | `GET https://api.open-meteo.com/v1/forecast?latitude=<lat1,lat2,…>&longitude=<lon1,lon2,…>&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max&forecast_days=3&timezone=Europe%2FMadrid` (URL en `app/config/realtime.yaml`). Con varias coordenadas devuelve una **lista**, un objeto por punto y en el mismo orden; con una sola, un objeto. Cada objeto: `latitude`/`longitude` de la celda del modelo (no las pedidas), `elevation`, `hourly` (`time` `"2026-10-16T00:00"` en hora local sin zona; °C, %, mm, código WMO, km/h) y `daily` (`time`, `temperature_2m_max`). **72 horas** desde las 00:00 de hoy, probabilidad de lluvia **horaria**. **Sin hora de elaboración**: la fecha de la previsión es la de descarga. `daily.temperature_2m_max` no siempre coincide con el máximo de las 24 horas (17/10 en Getafe: 23,3 frente a 23,2): se usa la diaria para el calor (DEC-06). 179 municipios en 0,4–0,7 s, 0,9 MB. Equivalencias: `temperature_2m`→`temp`, `apparent_temperature`→`feels_like`, `precipitation_probability`→`precip_prob`, `precipitation`→`precip`, `wind_speed_10m`→`wind`, `weather_code`→`sky` (texto de `app/config/weather_codes.yaml`, tabla WMO 4677), `daily.temperature_2m_max`→`temp_max_day` | **CC BY 4.0**, atribución obligatoria «Weather data by Open-Meteo.com» con enlace a https://open-meteo.com/. Límites de uso no comercial: 600/min, 5.000/h, 10.000/día y **cada coordenada cuenta**: 179 × 24 ≈ 4.300/día (refresco cada hora). Solo se envían los puntos de `app/config/forecast_points.csv` (un punto por municipio), **nunca la ubicación de la persona** (§2.8). Tras un 429 o error, espera global creciente (120 s → 3.600 s) |
| **CAMS vía Open-Meteo** *(aire previsto; comprobado 17/10, sin clave; fila 2)* | `GET https://air-quality-api.open-meteo.com/v1/air-quality?hourly=ozone,nitrogen_dioxide,pm10,pm2_5&past_days=1&forecast_days=3&timezone=Europe%2FMadrid&latitude=…&longitude=…` (URL en `app/config/realtime.yaml`, `air_forecast`). Misma forma que la previsión: lista en el orden de los puntos; `hourly_units` en µg/m³; **96 horas** (00:00 de ayer → 23:00 de pasado mañana; `past_days=1` completa las medias del ICA). API: `app/api/live/air_forecast.py`, cada 3 h, misma espera creciente, caché `data/live/air_forecast.json`; categoría ICA por hora con las medias y bandas de `ica_thresholds.yaml`. `/recommend`: hora en curso = medición; horas futuras = previsión, marcada «(prevista)» y con la fuente `cams_air` | **CC BY 4.0** («Weather data by Open-Meteo.com»), con aviso de Copernicus. Comparte límites con la previsión: 179 × 8 = 1.432 coordenadas/día. Solo los puntos de `forecast_points.csv`, nunca la ubicación de la persona |
| **MITECO ICA** | https://www.miteco.gob.es/es/calidad-y-evaluacion-ambiental/temas/atmosfera-y-calidad-del-aire/calidad-del-aire/visualizacion-datos-calidad-del-aire/ica.html | Umbrales oficiales (RF-15) |
| **IGN MDT05** *(comprobado 15/10 por WCS)* | WCS INSPIRE del IGN, sin clave: `https://servicios.idee.es/wcs-inspire/mdt?SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=Elevacion25830_5&SUBSET=x(<xmin>,<xmax>)&SUBSET=y(<ymin>,<ymax>)&FORMAT=image/tiff` (cobertura `Elevacion25830_5`: 5 m, EPSG:25830; también `Elevacion4326_*`, `Elevacion4258_5`). El Centro de Descargas del CNIG no respondió | GeoTIFF int16 en metros enteros. **Máximo 4096 × 4096 píxeles por petición** (≈ 20 km de lado): pedir por teselas. Getafe (caja de 16,6 × 7,7 km): 10 MB en 1,8 s, alturas 535–700 m. Con 1 m de resolución vertical, calcular la pendiente en tramos largos o suavizada. Desnivel (RF-13, Should; DEC-12) |

### 7.2 Capas clave y campos
**EIEL 2023 (IDEM) — solo 155 municipios (no la capital ni los grandes):**
- `ServiciosPublicos:IDEM_EIEL_INSTAL_DEPORTIVA_23` (726): `MUN`, `MUNICIPIO`, `NOMBRE`, `TIPOINSTAL`, `SUP_CUBI`, `SUP_AIRE`, `TITULAR`, `GESTION`, `ACCESOSILL`, `ESTADO`, columnas SI/vacío por deporte (`PADEL` 154, `TENIS` 164, `FUTBOL` 322, `BALONCESTO` 330, `ATLETISMO` 22, `GIMNASIA` 242…). **`NATACION` vacía en las 726 filas.**
- `CubiertaTerrestre:IDEM_EIEL_PARQUE_23` (2.100): `TIPOPARQUE`, `SUP_AIRE`, `AGUA`, `JUEGOSINFA`, `COMEDOR`, `ACCESOSILL`, `ESTADO`.
- `UnidadesAdministrativas:IDEM_EIEL_NUCLEOS_23`: conectividad (`CALIDADGSM`, `CALIDADUMT`, `ACCESOREDx`).
- También: centros sanitarios, de enseñanza, culturales (`BIBLIOTECA`, `HOGARPENSI`…), asistenciales.

**Planeamiento `UsoDelSuelo:VPLA_V_RED_REF_25`** (37.420 polígonos y **167 municipios** en la descarga del 16/10, incluidos los grandes; **no** Madrid capital, Guadarrama, Torrelodones, Sevilla la Nueva, Villanueva de la Cañada y otros, 12 en total): `CD_MUNICIPIO`, `DS_USO_GENE` («Zonas Verdes y Espacios Libres» 16.867; 17.010 el 16/10), `DS_USO_DETA` («Jardines y Plazas», «Parques Municipales y Urbanos», «Deportivos» 738…), `NM_AREA` (m²).

**Otras IDEM:** áreas recreativas `IDEM_MA_AREAS_RECREA` (84; `IT_FUENTE`, `IT_BANCOS`, `IT_PAPEL`, `IT_ASEOS`, `IT_JINFANT`, `IT_CBIOSAL`…), sendas `IDEM_V_MA_SENDAS_VERDES`, vías pecuarias `IDEM_MA_VIAS_PECUARIAS`, cubierta terrestre `BTA:IDEM_BTA_CUBIERTER_POL_17` (`id_fenomeno`, p. ej. «Arbolado forestal»), viales `IDEM_GDIE_G_CALLES` (`TIPOLOGIA`), municipios `Comun:IDEM_V_MUNICIPIOS`, estaciones de aire de **ambas redes** `IDEM_MA_EST_CALIDAD_AIRE` (48), zonas de aire.

**Nomecalles:** `deporte` (1.358 en 178 municipios; capital 596, Getafe 19; **sin deporte por instalación**: deducir del nombre — «polideportivo» 190, «piscina» 40, «pádel/padel» 57, «tenis» 29, «campo de fútbol» 50), `deporteotros` (87), `parques` (845 filas, 779 nombres distintos, 62 municipios), `busparadas` (15.037), `estmetro` (297), `estcerca` (93), `hipermercados`, `mercadoabastos`, `galimentacion`, `biblipubli` (solo 16 bibliotecas regionales, todas en la capital; para el resto, EIEL `cultural` `BIBLIOTECA`), `centrossalud`, `farmacias`, `bici` (vías ciclistas). Campos: `CMUN`, `DESCR`/`ETIQUETA`, `DIRECCION`, `UTM_X`, `UTM_Y`. **Ojo: la capa `bancos` son oficinas bancarias, no bancos para sentarse.**

**CKAN Comunidad:** aire `calidad_aire_estaciones` (28, **no** capital), `calidad_aire_datos_dia` (`h01…h24` valores, `v01…v24` validación `V` válido / `T` temporal pendiente de validar / `N` no válido; en tiempo real se aceptan `T` y `V`; horas futuras vacías con N; leer la fecha de cada fila: a primera hora el fichero es el de ayer), `calidad_aire_datos_historico` (desde 2005), `calidad_aire_datos_meteo_historico`, `calidad_aire_zonas`; magnitudes 1 SO₂, 8 NO₂, 9 PM2.5, 10 PM10, 14 O₃ (las cinco entran en el ICA). Servicios: `centros_servicios_establecimientos_sanitarios` (una fila por servicio: contar `centro_nro_registro` distintos; tipos «Centro de salud» y «Consultorio de atención primaria»), `oficinas_farmacia`, `centros_educativos` (filtrar `SITUACIÓN` = ALTA), `atencion_social_registro_centros`, `censo_clasificacion_zonas_bano`, **`desfibriladores_externos_fuera_ambito_sanitario`** (toda la región, con lat/lon). Estadística: `padron_por_sexo`, `1930748` (densidad), `irpf_indicador_renta`; disponibles si hacen falta: `grado_envejecimiento_por_edad`, `201276`, `personas_discapacidad_por_edad_y_sexo`. Bici pública `bases_prestamo_bicicletas` (solo enlace al mapa del CRTM; 3 sistemas: BiciMAD, BicinRivas, BiBO Boadilla).

**Ayuntamiento (capital):** aire `212531-0-calidad-aire-tiempo-real` (mismo formato H/V), estaciones `212629-0-estaciones-control-aire` (24), meteo `300392-0-meteorologia-tiempo-real`, tráfico `202087-0-trafico-intensidad` (pm.xml), fuentes `300051-0-fuentes`, polideportivos `200186-0-polideportivos`, básicas `200215-0-instalaciones-deportivas`, piscinas `210227-0-piscinas-publicas`, parques `200761-0-parques-jardines`, panel de barrios `300087-0-indicadores-distritos`, bancos `300095-0-mobiliario-bancos`, papeleras `300096-0-mobiliario-papeleras`, áreas caninas `300094-0-areas-caninas`, aseos `300103-0-aseos-publicos-operativos`, áreas infantiles `200652-0-areas-infantiles`, censo de locales `200085-0-censo-locales`.

La **matriz completa requisito → fuente con enlaces** está en `docs/assets/requisitos_fuentes.json` y en la sección 6 de `docs/contexto-muevete-cerca.md`.

### 7.3 Estrategia de cobertura (179 municipios)
| Capa | Principal | Complementos |
|---|---|---|
| Instalaciones deportivas | Nomecalles `deporte` (178) | EIEL (detalle, 155), VPLA «Deportivos», OSM `sport=*`, Ayto. |
| Parques y verde | VPLA zonas verdes (166) | EIEL parques, Nomecalles parques, áreas recreativas, cubierta terrestre, Ayto.; verde de destinos y rutas fuera de VPLA: áreas verdes de OSM (`osm_green`) |
| Aire | Red regional (28) + red Ayto. (24) | Sin estación → la de su zona |
| Meteo | Open-Meteo, un punto por municipio (DEC-16) | Estaciones Ayto. |
| Tráfico | Jerarquía de vías (OSM `highway`, viales IDEM) | Tiempo real en capital |
| Mobiliario de ruta | OSM | EIEL parques (agua), áreas recreativas, Ayto. |
| Desfibriladores | CKAN Comunidad | — |
| Servicios | CKAN Comunidad | EIEL, panel de barrios |
| Movilidad (F5) | Nomecalles paradas, metro, cercanías | Bici pública |
| Conectividad (F5) | EIEL núcleos (155) | Resto: «sin datos» |
| Comercio (F6) | Nomecalles (grandes superficies) | OSM `shop=supermarket/convenience`, censo de locales Ayto. |

### 7.4 Mobiliario en OSM (6/10/2026, 30.672 elementos)
Municipios con al menos uno: fuentes 152, juegos 143, bancos 88, biosaludables 59, papeleras 57, áreas caninas 57, aseos 56. Nivel A (≥50 bancos, ≥10 papeleras, ≥5 fuentes) 16 municipios; B 88; C 64; nada 11. En la app: mostrar «donde hay datos» con aviso de cobertura. MVP de ruta: fuentes, bancos, sombra, áreas caninas, juegos, desfibriladores.

## 8. Hallazgos sobre los datos (trampas)
- No hay censo de instalaciones deportivas en el CKAN de la Comunidad → Nomecalles + EIEL + VPLA + OSM.
- EIEL solo 155 municipios; VPLA no tiene 12 (incl. capital; 13 hasta la descarga del 16/10).
- `NATACION` vacía en EIEL → usar `TIPOINSTAL`.
- Red de aire regional sin la capital → unir con la del Ayto. (mismo formato).
- Nomecalles sin deporte por instalación → palabras clave (el LLM en lote de §6.5 se descartó, DEC-11).
- EPSG:25830 y comas decimales → reproyectar y normalizar en ingesta.
- Codificaciones mezcladas (UTF-8 BOM / Windows-1252).
- Sanitarios: una fila por servicio. Educativos: filtrar ALTA (hay 3.552 de baja).
- Nomecalles `bancos` = oficinas bancarias.
- Enlaces de Nomecalles caducan en 1 h → pedirlos en cada ingesta.
- Overpass limita peticiones → usar extracto de Geofabrik.
- Open-Meteo: sin hora de elaboración (fecha = descarga), coordenadas de respuesta de la celda del modelo (no las pedidas: asignar por orden) y Tmáx diaria distinta del máximo horario.
- Horas futuras del aire vacías (N) → futuro con la previsión de Open-Meteo + patrón histórico.
- Rutas verdes y autobuses interurbanos en CKAN solo como HTML → sendas IDEM y paradas Nomecalles.
- Más trampas comprobadas el 14/10 (detalle en `docs/informe-datos.md` §2): `.prj` erróneo o ausente en Nomecalles (forzar EPSG:25830); validación del aire con `T` además de `V`/`N`; `aire_dia` de madrugada trae el día anterior; códigos de municipio sin ceros (`6`, `079`); `aire_zonas` solo con nombres en mayúsculas; comas decimales en farmacias, desfibriladores, estaciones y `pm.xml`; 177 centros de atención social «RESERVADO» (no situables; 175 en la descarga del 16/10); coordenadas fuera de la Comunidad (filtrar por polígono); `CATEGORIA` de Nomecalles `deporte` sin el deporte; padrón, densidad y renta mezclan tipos de territorio (filtrar `Tipo territorio`).

## 9. Portales evaluados y descartados
- **LoDCOREMadrid** (cátedra UC3M, https://lodcoremadrid.es): API de atractivo con 611 indicadores (4G/5G/100 Mbps…), pero pedir valores falla; API de accesibilidad solo 155 municipios. No usar; como mucho preguntar en Discord. Su servidor está en modo depuración (avisarles).
- **eDatos/IESTADIS** e **INE**: lo útil ya está en el CKAN de la Comunidad. INE solo aportaría renta por sección censal (empresa).

## 10. Plan hasta la demo (miércoles 14 → martes 20)
| Día | Objetivo |
|---|---|
| Mié 14 | Repo y entorno; decidir almacén (DuckDB vs Oracle), proveedor de IA y nombre; verificar la API de AEMET con la clave del equipo (Madrid 28079, Getafe 28065; sustituida por Open-Meteo el 16/10, DEC-16); ingesta → tablas `municipio`, `destino`, `estacion_aire`, `servicio`; campo `refresco` y comprobación de cambios en el script (§6.4) |
| Jue 15 | Motor de puntuación + mejor franja + alternativa cubierta; `/recommend`; grafo peatonal de Getafe |
| Vie 16 | Ruta saludable en Getafe (y capital si da tiempo); `/route`; esqueleto del front |
| Sáb 17 | Front F1–F4 completo; F5 `/municipality/{ine_code}` |
| Dom 18 | F6 asistente (Should); caché ante caídas; página de fuentes y licencias; despliegue con HTTPS |
| Lun 19 | Ensayo con las personas de la demo, corrección de errores, guion de 10 min, respuestas de reserva sin red |
| **Mar 20** | **Demo** |

Roles sugeridos (equipo de hasta 4): **Datos** (ingesta, modelo, licencias), **Motor** (puntuación, franja, API), **Rutas** (grafo y costes), **Front** (MapLibre, perfiles, F5, F6).

## 11. Decisiones
**Tomadas:** toda la Comunidad sin límite de población · Ayuntamiento solo para la capital · foco ciudadano > administración > empresa · ideas de ejemplo opcionales · desfibriladores, bici pública y Nomecalles incluidos · F6 añadido (IA solo interpreta y explica) · sin requisitos nuevos para «espacios cubiertos» (como mucho ampliar RF-09 con bibliotecas/centros cívicos) · no ampliar fuentes (envejecimiento, discapacidad, LoDCORE, atlas de renta fuera) · recarga de datos por 4 niveles (referencia, diario, horario, bajo demanda), sin botón público de recarga total (§6.4). **Arquitectura (14/10, detalle en `docs/arquitectura.md`):** GeoParquet como núcleo + DuckDB en solo lectura para la app, Oracle ADB/APEX opcional · IA de F6: OCI Generative AI con plan B y F6 usable sin LLM (sustituido el 15/10 por DEC-03: OCI Language, ver abajo) · rutas: diseño regional, afinado en Getafe hasta el vie 16 y los 179 municipios el sáb 17 · grafo en memoria con A\*/Dijkstra bidireccional y coste por petición (factor multiplicativo con suelo, nunca negativo) · ubicación escrita con buscador de Nomecalles + `callejero_completo_2025` · despliegue con Docker Compose en VM de OCI, primero el vie 16. · front: React + Vite + TypeScript sobre el prototipo de `docs/idea`, MapLibre, TanStack Query, `main.css` + `icons.css`, Google Material Symbols servidos por nosotros, WCAG 2.1 AA (contraste, teclado, lectores, HTML semántico); modo oscuro con interruptor fuera del MVP. · **Front (14/10, tras la auditoría):** se mantienen React 19 / Vite 8 / TypeScript 6 (no React 18 / Vite 5 como decía el plan) y se corrige lo que esté mal · **barra de navegación inferior** en móvil · iconos: Google Material Symbols desde un fichero `.woff` propio (aplazado) · el front se programa a mano ([manual guiado]) con `app/frontend/docs/`; la conexión con la API, en la siguiente sesión. · **Motor (15/10, D2):** catálogo de 8 actividades (caminar, correr, nadar, pádel, tenis, fútbol, baloncesto, gimnasio y cubierto) en `app/config/activities.yaml` · aire: general y carrito desde «Desfavorable», sensible y mayor desde «Regular» (BOE; mayor = criterio propio) · lluvia: cubierto u otra franja desde el 50 % de probabilidad · pesos por defecto cercanía 30 · adecuación 25 · verde 20 · aire 15 · meteo 10; velocidades 4,5 / 9 / 3,5 km/h (`weights.yaml`, criterio propio) · pesos de ruta: los de `routing.yaml`.

**Nombre y desnivel (15/10):** nombre **GoMad** · **Desnivel (DEC-12, 15/10): sí, como Should**: alturas del IGN MDT05 por nodo y pendiente por tramo, construidas junto con el grafo regional del sábado (S-R1); descarga del MDT05 por WCS comprobada el 15/10 (§7.1). Si no llega, se recorta justo después de F6 y la app dice «sin datos de desnivel».

**IA (15/10, DEC-03 y DEC-11):** F6 = **OCI Language** (entidades y frases clave; 0,23 s de media) **+ reglas + plantillas, sin LLM**: un diccionario del catálogo RF-21 pasa las entidades a `AssistantParams` y `write_up` redacta con plantillas solo con datos del motor (D-M1). OCI Generative AI descartado (404 por permisos en `eu-madrid-1`, no se pide al administrador; `eu-frankfurt-1` no suscrita) y Anthropic descartado (coste propio); no se usa ningún otro proveedor. Credenciales: `OCI_*` en `app/.env` y `~/.oci/config`; en la VM se copia `~/.oci` y se monta en solo lectura en el contenedor `api`. §6.5 n.º 1 (deducir el deporte con LLM) **descartado**: palabras clave. §6.5 n.º 2 (Select AI + APEX) **pendiente**: necesita un LLM.

**Viernes 16/10 (DEC-09, DEC-13, DEC-06; detalle en `docs/decisiones-pendientes.md` y fichas B1–B3 de `docs/trabajo-paralelo.md`):**
- **DEC-09 · Indicadores F5:** 14 indicadores en 7 categorías (deporte 3, naturaleza 3, movilidad 2, salud 3, educación, conectividad, social); registro regional sin filas → 0, fuente parcial fuera de cobertura → «sin datos»; encaje = lista Sí/No/Sin datos por actividad y perfil + «Cumple N de M», sin nota ni orden (criterio propio).
- **DEC-13 · Cuota AEMET (superada por DEC-16):** `AEMET_PAUSE_S=30` (4 peticiones/min); cada hora los 3 pilotos + 1/6 del resto (todos cada 6 h, ~16,5 min por ejecución); AEMET solo elabora ~3 veces al día; aviso «previsión antigua» si `elaborado` > 12 h (criterio propio).
- **DEC-06 · Calor:** «día de calor» = Tmáx horaria del día > umbral de Sanidad de su zona (35,8 / 37,4 / 39,2 °C, `heat_zones.csv`); mayor, carrito y «con niños» sin exterior de 14 a 19 h y desempate por menor sensación térmica; resto, solo aviso. Umbrales oficiales, regla de aplicación criterio propio; sin niveles.
- **Mapa, dominio y Getafe:** teselas de OpenFreeMap ya y PMTiles local el lunes (demo sin red) · dominio en DuckDNS · OSM filtrado como fuente de destinos deportivos (centros con `sport` y nombre; pistas y piscinas solo con nombre o acceso público), para el hueco de nadar, tenis y baloncesto en Getafe y en los municipios sin EIEL.

- **DEC-15 · Datos en tiempo real (16/10, bloque B2 rediseñado, `docs/planes/tiempo-real.md`):** aire, previsión y tráfico en memoria de la API (sin `realtime.duckdb`), pedidos en segundo plano; nunca se muestra un dato más viejo que su `max_age` (`config/realtime.yaml`); horas futuras con AEMET horaria y patrón histórico del aire como estimación; AEMET por cola con cuota en la API (sustituye a la rotación de DEC-13); polen como Could, pendiente de aprobar. Cuando se implemente, actualizar §6.4 (el nivel horario pasa a la API). La previsión es de Open-Meteo desde DEC-16.

- **DEC-16 · Open-Meteo sustituye a AEMET (16/10):** la API OpenData de AEMET limita a ~6 peticiones/min por IP y bloqueaba la VM durante más de 30 min (429; la web decía «Previsión: sin datos»). Open-Meteo da los 179 municipios en **una** petición, sin clave (CC BY 4.0, atribución en Fuentes). API: `app/api/live/forecast.py`, una petición por hora, espera global creciente tras un fallo, caché `data/live/forecast.json`; ingesta: fuente `open_meteo` (nivel `hourly`) → `clean/forecast/<ine>.parquet` con `temp_max_day`. Puntos: `app/config/forecast_points.csv`. Fuera: cola por municipio, cuota, pilotos, previsión del vecino y `AEMET_*`. El calor (DEC-06) usa la Tmáx diaria de Open-Meteo. Plan: `docs/planes/open-meteo.md` (Tasks 72–79).

**Pendientes:** detalle de pantallas (con la maquetadora, al maquetar) · Select AI + APEX (§6.5 n.º 2, necesita un LLM). Lista completa en `docs/arquitectura.md` §10.
