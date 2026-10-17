# Aire de las horas futuras con CAMS (fila 2) — plan de implementación

> **Para agentes:** se ejecuta con superpowers:executing-plans. Pasos con casillas (`- [ ]`). Ledger: `.superpowers/sdd/aire-previsto/progress.md`.

**Objetivo:** que `/recommend` elija la mejor hora con la categoría ICA **prevista** de cada hora futura (Copernicus CAMS vía Open-Meteo), manteniendo la medición real en la hora actual, y que la explicación y las fuentes digan «previsto».

**Arquitectura:** un feed nuevo en `app/api/live/air_forecast.py`, gemelo de `live/forecast.py` (una petición para los 179 puntos de `forecast_points.csv`, espera global creciente tras fallo, caché de arranque `data/live/air_forecast.json`). Al descargar calcula una vez la categoría ICA por municipio y hora con las medias móviles y bandas de `ica_thresholds.yaml`. `services/recommend.py` la usa al rellenar el aire de cada hora.

**Tecnología:** Python 3.12, httpx (ya en la API), pytest con `httpx.MockTransport`.

**Spec:** `docs/pendientes-app.md` §3 fila 2 y §4; CLAUDE.md §2, §3.1, §6.2, §7.1; `docs/assets/umbrales.md`.

## API comprobada (17/10/2026, contra el servicio real)

`GET https://air-quality-api.open-meteo.com/v1/air-quality?hourly=ozone,nitrogen_dioxide,pm10,pm2_5&past_days=1&forecast_days=3&timezone=Europe%2FMadrid&latitude=<l1,l2,…>&longitude=<…>`
- Varias coordenadas → **lista** de objetos en el mismo orden (uno → objeto). 179 puntos: 200, 0,69 MB, 0,63 s.
- Cada objeto: `latitude`/`longitude` de la celda, `hourly_units` (todas `μg/m³`), `hourly.time` (`"2026-10-16T00:00"`, hora local sin zona) y `hourly.ozone`, `hourly.nitrogen_dioxide`, `hourly.pm10`, `hourly.pm2_5`.
- Con `past_days=1&forecast_days=3`: **96 horas**, desde las 00:00 de ayer hasta las 23:00 de pasado mañana. 0 nulos en la prueba (se toleran).
- Muestra real guardada: `app/api/tests/data/cams_sample.json` (Getafe, Madrid, San Lorenzo; 16–19/10).

## Restricciones globales

- Código en inglés; comentarios y docstrings en español sin tildes; textos para la persona con tildes (CLAUDE.md §2.1).
- A Open-Meteo solo van los 179 puntos de `app/config/forecast_points.csv`; nunca la ubicación de la persona; los logs no llevan la URL (lleva coordenadas) ni el mensaje de error (§2.8, §4.6).
- Límites de Open-Meteo (cada coordenada cuenta): 10.000/día y 5.000/h compartidos con la previsión (179 × 24 = 4.296/día). Este feed: `ttl_s` 10.800 (cada 3 h → 1.432/día; CAMS Europa se elabora una vez al día), espera global creciente 120 s → 3.600 s tras un fallo.
- Bandas, periodos y cobertura del ICA solo de `app/config/ica_thresholds.yaml`; valores sin fuente oficial con `own_criterion: true`.
- Sin cambio de contrato (`schemas.py`): «previsto» va en el texto de las razones, en la etiqueta de la fuente y en la explicación.
- Solo ficheros de la ficha: `app/api/live/`, sección `air_forecast` de `app/config/realtime.yaml`, el trozo de aire por hora de `app/api/services/recommend.py`, `app/config/sources.yaml`, `docs/assets/requisitos_fuentes.json`, CLAUDE.md §7, pruebas.

## Decisiones (Rulings del plan)

- **R1 · Categoría de una hora prevista:** igual que la medida (`live/air.py:air_categories`): media móvil de `period_hours` por contaminante (O₃ 8 h, PM 24 h, NO₂ 1 h) en `[t − (h−1), t]`, solo con `min_coverage`; categoría = la peor de los contaminantes. La serie CAMS lleva `past_days=1` para que las medias de las primeras horas de hoy estén completas. Sin SO₂ (la ficha pide O₃, NO₂, PM10, PM2.5). El valor horario de CAMS en `t` se toma como la hora que acaba en `t`, como `h01…h24` (error ≤ 1 h). Coste si me equivoco: una categoría desplazada una hora.
- **R2 · Qué dato usa cada hora:** hora en curso (= hora de `now`) y anteriores → medición real (`category_at`); si no hay medición válida, la previsión. Horas futuras → previsión del municipio del destino; si no la hay, como hoy (última medición durante `air_reading_valid_h`). Coste: si CAMS se desvía mucho de la estación, la hora futura puede cambiar de categoría bruscamente respecto a la actual.
- **R3 · «Previsto» sin contrato:** las razones de aire de una hora prevista terminan en « (prevista)» (concuerda con «Calidad del aire»); `sources` del resultado lleva `DataSource(source="cams_air", label="Calidad del aire prevista (CAMS, Open-Meteo)", date=<descarga>)` y la explicación lo cita en «Fuentes: …». Coste: el front no puede pintar distinto la casilla de una hora prevista (haría falta un campo nuevo).
- **R4 · `/sources` sin fecha de recarga de CAMS:** `services/sources.py` es de la fila 1; la entrada `cams_air` sale con su etiqueta, editor y licencia pero `last_refresh` nulo. Se añade después con 2 líneas (como `open_meteo`) cuando entre la fila 1. Coste: en la página de fuentes no se ve «actualizado hace…» de CAMS.

## Review Focus

1. **CAMS caído o 429** → `/recommend` sigue funcionando con la medición como hoy, sin aviso nuevo ni 500; la siguiente petición espera de forma global. → Task 91 `test_failure_waits_globally_and_keeps_data`, Task 92 `test_without_air_forecast_behaves_as_before`.
2. **Respuesta con menos puntos de los pedidos o JSON roto** → se descarta entera (no se asignan municipios cruzados). → Task 90 `test_parse_rejects_wrong_length`.
3. **Valores nulos en una hora** → esa hora sin categoría para ese contaminante; la media respeta `min_coverage`. → Task 90 `test_categories_moving_means_and_nulls`.
4. **Ventana que empieza mañana** (todas las horas sin medición) → todas con categoría prevista y la fuente CAMS en el resultado. → Task 92 `test_window_tomorrow_uses_forecast`.
5. **Caché vieja o de otro formato al arrancar** → se ignora lo descargado hace más de `max_age_h`. → Task 91 `test_cache_roundtrip_and_expiry`.

---

### Task 90: Parser y categorías ICA de CAMS

**Rol:** Motor · **Servicio:** `app/api`

**Ficheros:**
- Crear: `app/api/live/air_forecast.py`
- Modificar: `app/config/realtime.yaml` (sección `sources.air_forecast`)
- Crear: `app/api/tests/live/test_air_forecast.py`, `app/api/tests/data/cams_sample.json` (ya descargada)

**Interfaces (produce):**
- `VARIABLES = {"ozone": "O3", "nitrogen_dioxide": "NO2", "pm10": "PM10", "pm2_5": "PM2_5"}`
- `parse_response(raw: bytes, points: list) -> dict[str, dict[str, dict[datetime, float]]]` → `{ine: {contaminante: {hora: valor}}}`; `ValueError` si el número de objetos ≠ puntos.
- `categories(series: dict[str, dict[datetime, float]], ica: dict) -> dict[datetime, str]` → categoría ICA por hora (R1), reutilizando `engine.rules.aqi_category`.
- `realtime.yaml` → `sources.air_forecast: {url, points: forecast_points.csv, ttl_s: 10800, max_age_h: 24, timeout_s: 30, retry_s: 120, retry_max_s: 3600}`; `url` = la de «API comprobada» sin latitudes ni longitudes.

- [ ] **Step 1: pruebas que fallan** en `test_air_forecast.py`:
  - `test_parse_sample`: con la muestra y los 3 `POINTS` de `test_forecast.py`, `set(out) == {"28065","28079","28131"}`, `set(out["28065"]) == {"O3","NO2","PM10","PM2_5"}`, 96 horas, primera `datetime(2026,10,16,0)`, y el valor de O₃ de Getafe en la primera hora igual a `SAMPLE[0]["hourly"]["ozone"][0]`.
  - `test_parse_rejects_wrong_length`: con 2 puntos → `ValueError`.
  - `test_categories_moving_means_and_nulls`: serie sintética de 30 h con NO₂ 30 constante, O₃ 120 las últimas 8 h y 10 antes, PM10 45 constante, PM2_5 ausente; con `settings.load("ica_thresholds")`: la última hora es `"moderate"` (O₃ media 8 h = 120), la hora 7 (8.ª hora) de PM10 cuenta pero la hora 0 no tiene PM (cobertura < 18 h) y su categoría sale solo de NO₂/O₃ (`"good"`); un NO₂ `None` en una hora no rompe.
  - `test_realtime_has_air_forecast`: `validate_realtime(settings.load("realtime"))` pasa y `air_forecast` tiene `ttl_s >= 3600` y `points == "forecast_points.csv"`.
- [ ] **Step 2:** `.venv/bin/pytest tests/live/test_air_forecast.py -q` → Esperado: FAIL por `ModuleNotFoundError: live.air_forecast`.
- [ ] **Step 3:** implementar `parse_response` y `categories` (ventana deslizante con dos punteros sobre las horas ordenadas, O(n); nulos fuera) y añadir la sección de `realtime.yaml` con comentario (criterio propio salvo los límites de Open-Meteo).
- [ ] **Step 4:** misma orden → Esperado: 4 passed; `.venv/bin/pytest tests/live -q` sin fallos.
- [ ] **Step 5:** commit `Motor: parser y categorías ICA de la previsión de aire CAMS (Task 90)`.

**Terminado cuando:** la muestra real se parsea y la categoría por hora sigue las medias y la cobertura del ICA.

### Task 91: `AirForecastFeed` en vivo con espera y caché

**Rol:** Motor · **Servicio:** `app/api`

**Ficheros:**
- Modificar: `app/api/live/air_forecast.py`, `app/api/live/__init__.py` (`build_live`)
- Test: `app/api/tests/live/test_air_forecast.py`

**Interfaces:**
- Consume: `live.forecast.load_points`, `LiveStore.http_get/now/snapshot`, `PortalError`.
- Produce: `AirForecastFeed(store, cfg, points, ica, cache_path=None)` con `step() -> str` (`"wait" | "idle" | "ok:<n>" | "<código>" | "error"`), `get(ine) -> tuple[dict[datetime,str], datetime] | None` (categorías, hora de descarga), `fetched_at`, `last_error`, `save_cache()`, `load_cache() -> int`. `build_live` crea `store.air_forecast` (solo si `realtime.yaml` tiene `air_forecast`), carga la caché `cache_path.with_name("air_forecast.json")` y registra `step` con `add_task`. En modo grabado lee `snapshot_dir/air_forecast/cams.json`.

- [ ] **Step 1: pruebas que fallan** (portal falso con `MockTransport` que repite la muestra según las coordenadas pedidas, como `OpenMeteo` de `test_forecast.py`):
  - `test_one_request_for_all_points_and_ttl`: 179 puntos de `forecast_points.csv` → una petición con 179 latitudes, `step() == "ok:179"`; segundo `step()` → `"idle"`; con el reloj +3 h → nueva petición; la URL lleva `past_days=1` y las 4 variables; `get("28065")[0]` contiene `datetime(2026,10,16,12)`.
  - `test_failure_waits_globally_and_keeps_data`: tras un ok, 429 → `"429"`, `next_try` = +120 s, `get` sigue devolviendo lo anterior; otro fallo → espera 240 s; ningún log contiene `latitude`.
  - `test_get_respects_max_age`: con el reloj +25 h → `get` es `None`.
  - `test_cache_roundtrip_and_expiry`: tras un ok con `cache_path`, otro feed con `load_cache() == 3` y mismas categorías; con reloj +25 h → `0`.
  - `test_build_live_registers_air_forecast`: `build_live(cfg, client, cache_path=tmp/"live"/"forecast.json")` → `store.air_forecast` existe y su `cache_path.name == "air_forecast.json"`.
- [ ] **Step 2:** `.venv/bin/pytest tests/live/test_air_forecast.py -q` → Esperado: FAIL (`AirForecastFeed` no existe).
- [ ] **Step 3:** implementar el feed con la misma lógica de espera, TTL y caché que `ForecastFeed` (la caché guarda las categorías: `{ine: {"issued", "hours": [[ts, cat], …]}}`), y las líneas de `build_live`.
- [ ] **Step 4:** misma orden y `.venv/bin/pytest tests/live -q` → Esperado: todo PASS.
- [ ] **Step 5:** commit `Motor: feed en vivo de la previsión de aire CAMS (Task 91)`.

**Terminado cuando:** la API arranca con el feed registrado, una petición cada 3 h como mucho y espera creciente tras fallo.

### Task 92: `/recommend` usa el aire previsto en las horas futuras

**Rol:** Motor · **Servicio:** `app/api`

**Ficheros:**
- Modificar: `app/api/services/recommend.py` (`recommend`, `_Run.__init__`, `_hour_contexts`, `score`, `_sources`, filtro de fuentes de `recommendation`)
- Test: `app/api/tests/services/test_recommend.py`

**Interfaces:**
- Consume: `AirForecastFeed.get(ine)` (Task 91).
- Produce: `air_forecast_feed(repo) -> AirForecastFeed | None` (lee `repo.live.air_forecast`; las pruebas lo sustituyen con `monkeypatch`); `PREDICTED = " (prevista)"`; fuente `cams_air`.

- [ ] **Step 1: pruebas que fallan** (feed falso con `get(ine)` que devuelve categorías por hora para `28065` e `issued = NOW`):
  - `test_future_hours_use_air_forecast`: ventana 10–15 h, medición «good» a las 09 h, previsión «poor» de 11 h en adelante, perfil `sensitive` → `hours[0].aqi_category == "good"`, `hours[1..].aqi_category == "poor"`, las razones de las horas 11+ que empiezan por «Calidad del aire» terminan en « (prevista)» (concuerda con «Calidad del aire»), hay una fuente `cams_air` con «prevista» en la etiqueta y la explicación contiene «Calidad del aire prevista».
  - `test_current_hour_without_measurement_uses_forecast`: `air=False` en `build_mini_data` y previsión «fair» → `hours[0].aqi_category == "fair"` y no sale el aviso «Aire: sin medición reciente cerca…».
  - `test_window_tomorrow_uses_forecast`: ventana mañana 08–10 h (con previsión del tiempo para esas horas) → todas las horas con la categoría prevista.
  - `test_without_air_forecast_behaves_as_before`: feed `None` → igual que `test_air_from_nearest_station_with_coverage` (última hora `None`) y sin fuente `cams_air`.
  - `test_covered_site_has_no_cams_source`: el polideportivo cubierto no lleva `cams_air`.
- [ ] **Step 2:** `.venv/bin/pytest tests/services/test_recommend.py -q` → Esperado: las 5 nuevas FAIL (`air_forecast_feed` no existe / sin «previsto»).
- [ ] **Step 3:** implementar R2 y R3 en `recommend.py`: `recommend()` pasa a `_Run` la hora en curso (`window[0]` si es la de `now`, ya que `window_hours` empieza en ella); `_hour_contexts` elige medición o previsión por hora y guarda qué horas son previstas por clave; `score` añade « (prevista)» a las razones de aire de esas horas; `_sources` añade `cams_air` si algún hora no cubierta la usa; el filtro de fuentes de la explicación incluye `cams_air`.
- [ ] **Step 4:** `.venv/bin/pytest -m "not slow" -q` → Esperado: todo PASS.
- [ ] **Step 5:** commit `Motor: /recommend usa el aire previsto de CAMS en las horas futuras (Task 92)`.

**Terminado cuando:** la mejor hora tiene en cuenta el aire previsto y la respuesta dice cuándo es previsto.

### Task 93: Fuente CAMS en `/sources`, matriz y CLAUDE.md

**Rol:** Docs/Motor · **Servicio:** `app/api`

**Ficheros:**
- Modificar: `app/config/sources.yaml` (label y catalog `cams_air`), `docs/assets/requisitos_fuentes.json` (RF-06 y RF-08), `CLAUDE.md` §7.1 (fila nueva) y §3 (una línea en la tabla de recarga horaria si procede)
- Test: `app/api/tests/test_sources.py`

- [ ] **Step 1: prueba que falla** `test_cams_air_listed`: `/sources` contiene `cams_air` con «prevista» en el nombre, licencia que empieza por «CC BY 4.0» y menciona Copernicus y Open-Meteo, y URL `https://open-meteo.com/en/docs/air-quality-api`.
- [ ] **Step 2:** `.venv/bin/pytest tests/test_sources.py -q` → Esperado: FAIL (falta `cams_air`).
- [ ] **Step 3:** añadir `cams_air` a `labels` («Calidad del aire prevista (CAMS, Open-Meteo)») y `catalog` (editor «Copernicus Atmosphere Monitoring Service (CAMS) vía Open-Meteo.com», licencia «CC BY 4.0 · Weather data by Open-Meteo.com · Contiene información modificada del Copernicus Atmosphere Monitoring Service»); entrada en `requisitos_fuentes.json` y fila en CLAUDE.md §7.1.
- [ ] **Step 4:** `.venv/bin/pytest -m "not slow" -q` y `python3 -c "import json; json.load(open('docs/assets/requisitos_fuentes.json'))"` → Esperado: PASS y JSON válido.
- [ ] **Step 5:** commit `Docs: fuente CAMS (aire previsto) en /sources, matriz y CLAUDE.md (Task 93)`.

**Terminado cuando:** la fuente se atribuye en la app y está documentada.
