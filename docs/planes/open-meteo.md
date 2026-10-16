# Plan — Open-Meteo sustituye a AEMET (DEC-16) · Tasks 72–79

> **Para agentes:** plan escrito con `superpowers:writing-plans` y ejecutado con `superpowers:executing-plans`. Ledger: `.superpowers/sdd/open-meteo/progress.md`. Formato de las Tasks 26–32 de `docs/plan-implementacion.md`.

**Spec:** decisión del equipo **DEC-16** (16/10/2026): se elimina AEMET por completo y la previsión del tiempo pasa a **Open-Meteo** en código, configuración, pruebas y documentación vigente. Motivo: la API OpenData de AEMET limita a ~6 peticiones/min por IP y bloquea mucho tiempo (la VM llevaba > 30 min con 429 y la web decía «Previsión: sin datos»); Open-Meteo devuelve los 179 municipios en **una** petición, sin clave.
**Rama:** `motor/open-meteo` desde `main` · **Fecha:** viernes 16/10/2026.

**Comprobado el 16/10 con una llamada real** (`api.open-meteo.com/v1/forecast`, 3 coordenadas, 200 en 0,4 s):
- Varias coordenadas → **lista** de objetos, uno por punto y en el mismo orden; con una sola coordenada, un objeto (no lista).
- Cada objeto: `latitude`, `longitude` (de la celda del modelo, no las pedidas), `elevation`, `timezone`, `utc_offset_seconds`, `hourly_units`, `hourly` (`time` `"2026-10-16T00:00"` en hora local de Madrid sin zona, `temperature_2m` °C, `apparent_temperature` °C, `precipitation_probability` %, `precipitation` mm, `weather_code` WMO, `wind_speed_10m` km/h), `daily` (`time` `"2026-10-16"`, `temperature_2m_max`).
- 72 horas (3 días completos desde las 00:00 de hoy), la probabilidad de lluvia es **horaria**.
- **No hay hora de elaboración** (a diferencia del `elaborado` de AEMET): la fecha de la previsión es la de descarga.
- `daily.temperature_2m_max` **no siempre** es el máximo de las 24 horas (17/10 en Getafe: 23,0 frente a 22,9 horario): se calcula a resolución más fina. Se usa la diaria para el calor (DEC-06).
- Límites de uso no comercial: 600/min, 5.000/h, 10.000/día, y cada coordenada cuenta. 179 × 24 al día ≈ 4.300: cabe con `ttl_s` 3600.
- Licencia CC BY 4.0, atribución «Weather data by Open-Meteo.com» con enlace a https://open-meteo.com/.

**Reglas comunes:**
- Privacidad (CLAUDE.md §2.8): a Open-Meteo solo van los **puntos representativos de los 179 municipios** de `app/config/forecast_points.csv`, nunca la ubicación de la persona. Una prueba lo comprueba.
- Valores en `app/config/` (URL, TTL, esperas), nunca en el código. Lo que no tiene fuente oficial lleva `own_criterion: true`.
- **No cambia el contrato de la API** (`schemas.py`, `openapi.json`): solo cambian los textos de `DataSource` y `SourceInfo`.
- No se toca el aire en vivo (`live/air.py`) ni nada de B2 que no sea la previsión.
- Las pruebas nunca llaman al portal (`httpx.MockTransport` o `monkeypatch` de `fetch`).
- Documentos históricos (`docs/contexto-muevete-cerca.md`, `docs/idea/`, `docs/assets/matriz-datos.html`, Tasks ya ejecutadas de `docs/plan-implementacion.md` y `docs/planes/*.md`) no se reescriben: como mucho una nota «AEMET sustituida por Open-Meteo (DEC-16)».

**Foco de revisión (casos límite con su prueba):**
1. Open-Meteo responde con menos objetos que puntos o con un objeto suelto → no se asigna previsión a municipios equivocados (`test_list_order_matches_points`, Task 73; `test_open_meteo_length_mismatch_is_error`, Task 76).
2. 429 o red caída repetidos → espera global creciente, nunca una petición por tick (`test_error_sets_global_growing_wait`, Task 73).
3. Reinicio de la API sin red → la caché de arranque sirve la previsión de < 12 h y descarta la vieja (`test_cache_roundtrip_drops_old`, Task 73).
4. Ubicación de la persona → nunca sale hacia Open-Meteo (`test_user_location_never_sent`, Task 74).
5. Día con Tmáx diaria por encima del umbral y máximo horario por debajo → es día de calor (`test_heat_uses_daily_max`, Task 74).

**Línea base (16/10, antes de empezar):** `app/api`: 259 passed, 13 skipped, 1 failed (`test_endpoints.py::test_route_getafe`, con datos reales del grafo, ajena a la previsión). `app/ingest` (`-m "not slow"`): 133 passed (tras instalar el extra `routing` en el `.venv`).

---

### Task 72: Datos · Puntos de previsión de los 179 municipios

**Rol:** Datos · **Servicio:** `app/ingest/` (genera un fichero de `app/config/`) · **Duración:** 20 min

**Ficheros:** Crear `app/ingest/scripts/forecast_points.py`, `app/ingest/tests/scripts/test_forecast_points.py`, `app/config/forecast_points.csv`. Modificar `app/config/README.md` (una fila).

**Interfaces:**
- Consume: `data/clean/municipality.parquet` (`ine_code`, `name`, `geometry`).
- Produce: `forecast_points.csv` con cabecera `ine_code,name,lat,lon` (179 filas, ordenadas por `ine_code`, coordenadas con 4 decimales ≈ 10 m). Regla del punto: la misma que `Geocoder.municipalities` de la API (centroide del contorno si cae dentro; si no, `point_on_surface`). `points(parquet_path) -> list[(ine, name, lat, lon)]`, `main()` escribe el CSV en `CONFIG_DIR`.
- Por qué un CSV de configuración: lo leen la API (sin depender de que el geocodificador haya cargado) y el script de descarga, que solo usa la biblioteca estándar; y la prueba de privacidad puede comprobar que solo salen estas coordenadas.

- [ ] **Paso 1: prueba que falla** — `test_forecast_points.py`: (a) `points()` sobre un parquet de 2 polígonos (un cuadrado y una «C» cuyo centroide cae fuera) da el centroide del cuadrado y un punto dentro de la «C»; (b) el `forecast_points.csv` del repositorio tiene 179 filas, códigos `28\d{3}` únicos, Getafe 28065 / Madrid 28079 / San Lorenzo 28131 presentes y todas las coordenadas dentro de la caja de la Comunidad (lat 39,8–41,2; lon −4,6 a −3,0).
  Ejecutar `.venv/bin/pytest tests/scripts/test_forecast_points.py -q`. Esperado: error de importación (no existe el script).
- [ ] **Paso 2:** implementar el script; generarlo con los datos reales: `.venv/bin/python scripts/forecast_points.py`. Esperado: `179 puntos -> app/config/forecast_points.csv`.
- [ ] **Paso 3:** pruebas. Esperado: 2 passed.
- [ ] **Commit:** `Datos: puntos de previsión de los 179 municipios en config (DEC-16, Task 72)`.

**Terminado cuando:** `app/config/forecast_points.csv` tiene los 179 municipios y la prueba pasa.

---

### Task 73: Motor · Feed de Open-Meteo en la API (una petición para los 179)

**Rol:** Motor · **Servicio:** `app/api/` · **Depende de:** Task 72 · **Duración:** 1 h

**Ficheros:** Reescribir `app/api/live/forecast.py` y `app/api/tests/live/test_forecast.py`. Modificar `app/config/realtime.yaml` (sección `forecast`). Crear `app/api/tests/data/open_meteo_sample.json` (respuesta real recortada: Getafe, Madrid y San Lorenzo, 3 días) y `app/config/weather_codes.yaml` (tabla WMO 4677 → texto en español). Borrar `app/api/tests/data/aemet_28065.json`.

**Interfaces:**
- `realtime.yaml` → `sources.forecast`: `url` (base con `hourly`, `daily`, `forecast_days=3`, `timezone=Europe/Madrid`; el código añade `&latitude=…&longitude=…`), `points: forecast_points.csv`, `ttl_s: 3600`, `max_age_h: 12`, `timeout_s: 30`, `retry_s: 120`, `retry_max_s: 3600` (espera **global** que se duplica en cada fallo seguido: 120, 240, 480 … hasta 3600 s; nunca un bucle cada minuto). Fuera: `requests_per_min`, `retry_429_s`, `refetch_after_h`, `pilots`, `forecast_fallback_km`.
- `load_points(path) -> list[(ine, name, lat, lon)]`.
- `parse_open_meteo(doc) -> (series, day_max)`: `series = {datetime: (temp, feels_like, precip_prob, precip, wind, sky)}` (solo horas con temperatura; `sky` = texto de `weather_codes.yaml`), `day_max = {date: tmax}`.
- `parse_response(body, points) -> {ine: (series, day_max)}`: lista en el mismo orden que los puntos (un objeto suelto = un punto); si la longitud no cuadra → `ValueError` (no se asigna nada).
- `ForecastFeed(store, cfg, points, cache_path=None)`:
  - `step() -> str`: `"idle"` dentro del TTL, `"wait"` durante la espera tras un fallo, `"ok:<n>"` tras una descarga correcta de `n` municipios, `"<status>"` / `"error"` tras un fallo (solo el código HTTP o el tipo de error, nunca la URL). Una sola petición por paso.
  - `get(ine) -> (series, issued, day_max) | None` (`issued` = hora de descarga, local de Madrid; `None` si pasa de `max_age_h`, salvo en modo grabado).
  - `save_cache()` / `load_cache()` sobre `data/live/forecast.json` (se conserva; descarta lo de más de `max_age_h`).
  - Modo grabado (`GOMAD_LIVE_SNAPSHOT`): lee `<snapshot>/forecast/open_meteo.json`, nunca abre conexiones.

- [ ] **Paso 1: prueba que falla** — `tests/live/test_forecast.py` con: `test_sample_parses_three_days` (Getafe: 72 horas desde las 00:00, una hora concreta con sus 6 valores, `sky` en español); `test_daily_max_comes_from_daily` (el `day_max` es `daily.temperature_2m_max`, distinto del máximo horario en la muestra); `test_list_order_matches_points` (respuesta de 3 puntos → cada municipio recibe su objeto; longitud distinta → nada asignado); `test_one_request_serves_179` (179 puntos, portal falso que responde con 179 objetos: **una** petición y `get` da serie para los 179); `test_request_carries_only_config_points` (las `latitude`/`longitude` de la URL son exactamente las del CSV, en su orden; no hay clave ni cabecera de clave); `test_error_sets_global_growing_wait` (429 → `"429"`, en los siguientes 120 s `"wait"` sin peticiones; segundo fallo → espera 240 s; éxito → vuelve a `ttl_s`); `test_within_ttl_no_request`; `test_old_forecast_not_served` (13 h después → `None`); `test_cache_roundtrip_drops_old`; `test_snapshot_mode_serves_recorded_forecast`; `test_errors_logged_without_url` (el log y `last_error` no llevan coordenadas).
  Ejecutar `.venv/bin/pytest tests/live/test_forecast.py -q`. Esperado: errores de importación (`parse_open_meteo` no existe).
- [ ] **Paso 2:** implementar; `weather_codes.yaml` con los códigos 0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99 (tabla «WMO Weather interpretation codes (WW)» de la documentación de Open-Meteo; WMO 4677).
- [ ] **Paso 3:** pruebas de la Task. Esperado: todas pasan.
- [ ] **Commit:** junto con la Task 74 (el `live/__init__.py` y `repository.py` usan la nueva firma; por separado la suite quedaría rota).

**Terminado cuando:** el feed descarga los 179 con una petición y las pruebas pasan.

---

### Task 74: Motor · Conexión del feed: arranque, `Repository.forecast` y Tmáx diaria

**Rol:** Motor · **Servicio:** `app/api/` · **Depende de:** Task 73 · **Duración:** 45 min

**Ficheros:** Modificar `app/api/live/__init__.py` (`build_live` sin `centers` ni `key`: lee los puntos de `realtime.yaml`), `app/api/main.py` (solo la llamada a `build_live` en `lifespan`), `app/api/repository.py` (cuerpo de `forecast` y `_live_forecast`; nuevo atributo `forecast_day_max`), `app/api/services/recommend.py` (`_load_context` y `_day_max`: Tmáx del día de la previsión diaria si la hay, si no máximo horario; fuera la nota del vecino), `app/api/live/store.py` (solo comentarios que citan AEMET), `app/api/tests/live/test_minors.py`.

**Interfaces:**
- `Repository.forecast(ine_codes, start, end) -> (by, issued)`: **misma firma y salida**. Además rellena `self.forecast_day_max = {ine: {date: tmax}}` (en vivo, de `daily.temperature_2m_max`; sin vivo, de la columna `temp_max_day` de `realtime.duckdb` si existe).
- `forecast_notes` **desaparece** (Ruling): con los 179 en una petición no hay «previsión del municipio vecino». `recommend` deja de leerlo.
- `ForecastFeed` ya no tiene cola: `request()` desaparece y `Repository` no pide nada al leer.

- [ ] **Paso 1: prueba que falla** — en `test_forecast.py`: `test_repository_reads_live_forecast` (misma firma; `by[ine][ts]` = (temp, feels, prob); `forecast_day_max` con la diaria); `test_build_live_uses_config_points` (el feed tiene los 179 puntos del CSV y su `step` está en las tareas del hilo). En `test_minors.py`: `test_recommend_uses_live_air_and_forecast` con Open-Meteo y la etiqueta «Previsión horaria (Open-Meteo)»; `test_heat_uses_daily_max` (con Tmáx diaria 38 °C y horaria 37 °C en Getafe, umbral 37,4 → día de calor); `test_user_location_never_sent` (un `/recommend` con un origen concreto: ninguna petición al portal de previsión lleva esa coordenada; solo las del CSV). Se quitan las pruebas de la cola, la cuota y el vecino.
  Ejecutar `.venv/bin/pytest tests/live -q`. Esperado: fallos por la firma antigua de `build_live`/`Repository`.
- [ ] **Paso 2:** implementar. Ejecutar `.venv/bin/pytest -q`. Esperado: solo el fallo de la línea base.
- [ ] **Commit (Tasks 73 + 74):** `Motor: previsión de Open-Meteo en vivo, una petición para los 179 municipios (DEC-16, Tasks 73-74)`.

**Terminado cuando:** la suite de la API pasa (salvo la línea base) y `/recommend` en local muestra temperatura y probabilidad de lluvia por hora en Getafe, Madrid y San Lorenzo.

---

### Task 75: Motor · Fuente `open_meteo`: etiquetas, licencia y atribución

**Rol:** Motor · **Servicio:** `app/api/` + `app/config/` · **Duración:** 20 min

**Ficheros:** Modificar `app/config/sources.yaml` (`labels.open_meteo` y `catalog.open_meteo`; fuera `aemet`), `app/config/rules.yaml` (comentario de `rain` y `own_criterion_items` del calor), `app/config/README.md` (fila de `realtime.yaml`), `app/api/services/recommend.py` (id `open_meteo` en `DataSource`), `app/api/engine/slots.py` y `app/api/schemas.py` (solo comentarios), `app/api/tests/test_sources.py`, `app/api/tests/engine/test_explanation.py`, `app/api/tests/live/test_store.py` (docstring).

**Interfaces:**
- `catalog.open_meteo`: `publisher: "Open-Meteo.com"`, `license: "CC BY 4.0 · Weather data by Open-Meteo.com"`, `url: "https://open-meteo.com/"`, `attribution: "Weather data by Open-Meteo.com"`. Como `SourceInfo` no tiene campo de atribución y el contrato no cambia, el texto de atribución va en `license` (lo muestra la tabla de Fuentes) y el enlace en `url` (Ruling).
- `labels.open_meteo: "Previsión horaria (Open-Meteo)"`.
- `rules.yaml`: `own_criterion_items` del calor cambia `daily_max_from_hourly` por `daily_max_from_open_meteo` (el umbral de Sanidad se compara con la Tmáx prevista por Open-Meteo, no por AEMET: criterio propio).

- [ ] **Paso 1: prueba que falla** — `test_sources.py`: `open_meteo` en las fuentes usadas, con licencia que empieza por «CC BY 4.0», contiene «Weather data by Open-Meteo.com» y `url` `https://open-meteo.com/`; `/sources` la lista; `aemet` no aparece. `test_explanation.py` con la etiqueta nueva.
  Ejecutar `.venv/bin/pytest tests/test_sources.py tests/engine/test_explanation.py -q`. Esperado: fallos (no existe `open_meteo`).
- [ ] **Paso 2:** implementar. `.venv/bin/pytest -q`. Esperado: solo la línea base. `scripts/export_openapi.py` no cambia `openapi.json` (`test_contract.py` pasa).
- [ ] **Commit:** `Motor: fuente Open-Meteo con licencia CC BY 4.0 y atribución en /sources (DEC-16, Task 75)`.

**Terminado cuando:** `/sources` lista Open-Meteo con su licencia y atribución y no queda «aemet» en `app/api` ni en `app/config`.

---

### Task 76: Datos · Ingesta de Open-Meteo (demo sin red y `GOMAD_LIVE=off`)

**Rol:** Datos · **Servicio:** `app/ingest/` · **Depende de:** Task 72 · **Duración:** 45 min

**Ficheros:** Modificar `app/ingest/scripts/download_sources.py` (fuente `open_meteo` en lugar de `aemet`; fuera `read_env`, `aemet_municipalities`, `download_aemet` y `--aemet-municipalities`), `app/ingest/tests/scripts/test_download_sources.py`, `app/ingest/tests/test_normalize_realtime.py`. Crear `app/ingest/normalize/open_meteo.py`, `app/ingest/tests/data/open_meteo_sample.json` (copia de la muestra de la API). Borrar `app/ingest/normalize/aemet.py`, `app/ingest/scripts/verify_aemet.py`, `app/ingest/tests/data/aemet_28065.json`.

**Interfaces:**
- `SOURCES["open_meteo"] = ("open_meteo", <url base>, "minimal", False, "Open-Meteo: previsión horaria de los 179 municipios (una petición, sin clave)", "hourly")`. `OPEN_METEO_URL` igual al `url` de `realtime.yaml` (una prueba lo compara: el script solo usa la biblioteca estándar y no lee YAML).
- `download_open_meteo(folder) -> (paths, urls)`: lee `CONFIG_DIR/forecast_points.csv` (`GOMAD_CONFIG_DIR`), **una** petición, guarda `data/raw/open_meteo/forecast.json` (la respuesta tal cual) y `points.csv` (los puntos usados, en el mismo orden). Respuesta que no es lista de la misma longitud → error (la fuente queda con `last_failure`).
- `normalize/open_meteo.py`: `@normalizer("forecast")`, `municipality_forecast(item, ine, issued) -> DataFrame` con `FORECAST_COLUMNS = [ine_code, ts, temp, feels_like, precip_prob, precip, wind, sky, issued, temp_max_day]` (`temp_max_day` = Tmáx diaria del día de `ts`; columna nueva al final, `build_db` la copia con `SELECT *`); `issued` = `downloaded` del manifiesto. Salida: `clean/forecast/<ine>.parquet` (la misma de antes).

- [ ] **Paso 1: prueba que falla** — `test_download_sources.py`: `hourly` = `{aire_dia, ay_aire, ay_meteo, open_meteo}`; `test_open_meteo_one_request_for_all_points` (`fetch` falso: una llamada, URL con las 179 latitudes del CSV en orden, ficheros guardados); `test_open_meteo_length_mismatch_is_error`; `test_open_meteo_url_matches_realtime_yaml`. `test_normalize_realtime.py`: `test_open_meteo_hourly_forecast` (muestra → 72 filas de Getafe, columnas, `precip_prob` horaria, `sky` en español, `temp_max_day` de la diaria) y `test_open_meteo_writes_one_parquet_per_point`.
  Ejecutar `.venv/bin/pytest tests/scripts/test_download_sources.py tests/test_normalize_realtime.py -q`. Esperado: fallos/errores de importación.
- [ ] **Paso 2:** implementar; la tabla WMO → texto se lee de `app/config/weather_codes.yaml` (misma tabla que la API). `.venv/bin/pytest -q -m "not slow"`. Esperado: todo pasa.
- [ ] **Paso 3 (real, sin clave):** `GOMAD_DATA_DIR=<tmp> .venv/bin/python scripts/download_sources.py --only open_meteo` y `python -m normalize forecast`. Esperado: `clean/forecast/` con 179 ficheros.
- [ ] **Commit:** `Datos: ingesta de Open-Meteo en lugar de AEMET, una petición sin clave (DEC-16, Task 76)`.

**Terminado cuando:** la ingesta descarga y normaliza la previsión de los 179 sin clave.

---

### Task 77: Datos · Despliegue e inicialización sin clave de AEMET

**Rol:** Datos (despliegue) · **Servicio:** `app/deploy/`, `app/ingest/scripts/init_data.sh`, `app/.env.example` · **Duración:** 20 min

**Ficheros:** Modificar `app/.env.example` (fuera `AEMET_API_KEY`, `AEMET_MUNICIPALITIES`, `AEMET_PAUSE_S`), `app/deploy/docker-compose.init.yml` (fuera `INIT_AEMET_MUNICIPALITIES`; comentario del `env_file`), `app/ingest/scripts/init_data.sh` (fuera el aviso de la clave y `--aemet-municipalities`).

- [ ] **Paso 1:** `git grep -n -i aemet -- app/.env.example app/deploy app/ingest/scripts/init_data.sh`. Esperado antes: varias líneas; después: vacío.
- [ ] **Paso 2 (real):** `GOMAD_DATA_PATH=<tmp> docker compose -f deploy/docker-compose.init.yml run --rm ingest --skip-graph`. Esperado: `<tmp>/clean/forecast/` con 179 parquet sin clave. Borrar la carpeta temporal.
- [ ] **Commit:** `Deploy: inicialización y .env sin AEMET (DEC-16, Task 77)`.

**Terminado cuando:** la inicialización genera la previsión sin ninguna clave.

---

### Task 78: Front · Datos de ejemplo y textos: Open-Meteo

**Rol:** Front · **Servicio:** `app/frontend/` · **Duración:** 15 min

**Ficheros:** Modificar `src/data/mock/recommend.ts`, `src/data/mock/sources.ts`, `src/test/Recommendation.test.tsx`, `src/test/Sources.test.tsx`, `docs/pantallas.md`. Sin tocar componentes ni diseño.

- [ ] **Paso 1: prueba que falla** — `Recommendation.test.tsx` espera `Previsión horaria (Open-Meteo) · dd/mm hh:mm`; `Sources.test.tsx` espera «Weather data by Open-Meteo.com» en la tabla. `npx vitest run src/test/Recommendation.test.tsx src/test/Sources.test.tsx`. Esperado: 2 fallos.
- [ ] **Paso 2:** cambiar los mocks (`source: "open_meteo"`, editor «Open-Meteo.com», licencia «CC BY 4.0 · Weather data by Open-Meteo.com», URL https://open-meteo.com/) y `pantallas.md`. `npm test && npm run build && npm run lint`. Esperado: todo en verde.
- [ ] **Commit:** `Front: Open-Meteo en los datos de ejemplo y la tabla de fuentes (DEC-16, Task 78)`.

**Terminado cuando:** `git grep -il aemet -- app` está vacío y el front pasa pruebas, compilación y lint.

---

### Task 79: Docs · Documentación vigente (DEC-16)

**Rol:** Docs · **Duración:** 40 min

**Ficheros:** `CLAUDE.md` (§1, §2.11, §3, §6.3–6.4, §7.1 fila de Open-Meteo, §8, §11 DEC-16), `docs/assets/requisitos_fuentes.json` (RF-06, RF-08 y los que citen AEMET), `docs/arquitectura.md`, `docs/trabajo-paralelo.md` (ficha B2), `docs/decisiones-pendientes.md` (DEC-16 nueva; DEC-13 «superada por DEC-16»; nota en D-06 y DEC-15), `docs/assets/umbrales.md`, `docs/PENDIENTES.md` (P-13 superado). Notas de una línea en los históricos que lo necesiten (`docs/planes/tiempo-real.md`, `docs/planes/calor-getafe.md`).

- [ ] **Paso 1:** `git grep -n -i aemet -- CLAUDE.md docs/arquitectura.md docs/trabajo-paralelo.md docs/assets/requisitos_fuentes.json docs/assets/umbrales.md docs/PENDIENTES.md` y revisar cada aparición: o se cambia a Open-Meteo, o queda como histórico explícito («sustituida por Open-Meteo, DEC-16»).
- [ ] **Paso 2:** `python3 -c "import json; json.load(open('docs/assets/requisitos_fuentes.json'))"`. Esperado: sin error.
- [ ] **Commit:** `Docs: Open-Meteo sustituye a AEMET en la documentación vigente (DEC-16, Task 79)`.

**Terminado cuando:** la documentación vigente describe Open-Meteo y las menciones a AEMET que quedan son históricas y lo dicen.

---

## Comprobación final

- `git grep -il aemet -- app` → vacío.
- `cd app/api && .venv/bin/pytest -q` (solo la línea base), `cd app/ingest && .venv/bin/pytest -q -m "not slow"`, `cd app/frontend && npm test && npm run build && npm run lint`.
- API local (`GOMAD_LIVE` sin poner): `/recommend` en Getafe, Madrid y San Lorenzo con temperatura y probabilidad de lluvia por hora; `/sources` con Open-Meteo.
- `git fetch && git rebase origin/main` antes de terminar.
