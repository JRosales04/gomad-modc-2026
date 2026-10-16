# Plan del bloque B2 — Datos en tiempo real (aire, tiempo, tráfico; polen si da tiempo)

> **Para agentes:** este fichero empieza solo con la **división en tareas** (alcance, ficheros, pruebas clave). El ejecutor de cada lote (`docs/guia-ejecucion.md` §8) detalla primero **solo las Tasks de su lote** con `superpowers:writing-plans`, en este mismo fichero y debajo de su encabezado, con el formato de las Tasks 26–32 de `docs/plan-implementacion.md` (Rol, Servicio, Ficheros, Interfaces, pasos TDD con «Esperado:», commit, «Terminado cuando»). Después las ejecuta con `superpowers:executing-plans`. Su ledger es `.superpowers/sdd/tiempo-real/progress.md`.
>
> **No se puede cambiar** lo que fija esta división: alcance, ficheros «Es suyo» y pruebas clave. Si los datos reales obligan a cambiarlo, se registra un Ruling. El verificador compara con las dos cosas: la división (escrita antes de ejecutar) y el detalle.

**Spec:** ficha del **Bloque B2** en `docs/trabajo-paralelo.md` §3 y **DEC-15** en `docs/decisiones-pendientes.md` (datos en vivo sin persistencia). Sustituye al diseño anterior de B2 («Datos vivos»: `realtime.duckdb` recargado por cron, rotación de AEMET de DEC-13), que no llegó a empezarse.
**Fecha:** viernes 16/10/2026.

---

## Idea del bloque

Los datos que caducan en horas (aire medido, previsión, tráfico) **no se guardan en disco ni se enseñan viejos**. La API los pide a los portales, los tiene en memoria con su TTL y descarta lo que pasa de su antigüedad máxima. En disco solo queda lo de referencia (estaciones, municipios, grafo) y lo que es un **modelo**, no una medida: el patrón horario del aire.

```
                     API (un proceso, uvicorn sin --workers)
  ┌────────────────────────── LiveStore (memoria) ──────────────────────────────┐
  │ refresco en segundo plano (hilo en lifespan), las peticiones solo leen      │
  │  air       ← aire_dia (CKAN CM) + ay_aire (Ayto.)   cada 10 min             │
  │  forecast  ← AEMET horaria por municipio            cola con cuota (4/min): │
  │              1.º los pedidos por usuarios, 2.º pilotos, 3.º el resto (179)  │
  │  traffic   ← pm.xml (Ayto.)                         cada 5 min, solo si se  │
  │                                                     pidió ruta en capital   │
  │                                                     en los últimos 15 min   │
  │  pollen    ← mediciones_polen (CKAN CM)             1 vez al día (Could)    │
  │                                                                             │
  │  validez: dato.ts ≥ ahora − max_age   (aire 3 h · previsión 12 h ·          │
  │           tráfico 15 min · polen 7 días; config/realtime.yaml)              │
  │  si no la cumple → «sin dato actual»; nunca el valor viejo                  │
  │  portal caído → último válido SOLO mientras siga dentro de max_age          │
  └───────┬──────────────────────────────────────────────┬──────────────────────┘
          │ Repository.air_categories / forecast         │ horas futuras de aire:
          │ (misma interfaz; cambia de dónde lee)        ▼ air_pattern (gomad.duckdb)
          ▼                                              «estimación», nunca «medido»
  /recommend · /route (tráfico en capital) · /conditions/{ine} (nuevo, Task 68)
```

**Qué cubre cada fuente para una hora pedida:**

| Hora pedida | Tiempo | Aire | Tráfico |
|---|---|---|---|
| Ahora | AEMET, hora en curso | última medición si tiene ≤ 3 h (la red CM publica con ~3 h de retraso, medido el 16/10) | pm.xml si tiene ≤ 15 min (solo capital) |
| Resto de hoy y mañana | AEMET horaria (temperatura, sensación, cielo, viento por hora; probabilidad de lluvia por franjas de 6 h) | patrón histórico de la estación para esa hora (estimación) | jerarquía de vías del grafo (como hoy) |
| Pasado mañana después de las 07:00 | sin previsión horaria → «sin datos»; el selector de hora del front se limita a ~36 h | patrón | jerarquía de vías |

**Por qué AEMET no se pide en cada consulta:** son 2 peticiones por municipio y el 429 llega a unas 6/min (CLAUDE.md §7.1). Un `/recommend` toca varios municipios: pedirlos en la petición la bloquearía minutos. La cola en segundo plano a 4 peticiones/min recorre los 179 en ~90 min, y AEMET solo elabora unas 3 veces al día, así que la memoria siempre tiene una previsión reciente. Un municipio sin previsión en memoria usa la del **municipio con previsión más cercano** dentro de `forecast_fallback_km` y lo dice («Previsión de Getafe»), o «sin datos» si no hay ninguno (criterio propio).

**Arranque en frío:** la memoria se pierde al reiniciar. Para no esperar 90 min: (1) la previsión se copia a `data/live/forecast.json` como **caché de arranque**, y al leerla se descarta lo que tenga más de 12 h; (2) los pilotos se piden primero; (3) aire y tráfico tardan < 3 s en llenarse. Aire y tráfico **no** se escriben a disco.

**Demo sin red (L-4):** `GOMAD_LIVE_SNAPSHOT=<dir>` hace que el LiveStore lea respuestas grabadas en lugar de los portales y que la app lo diga («datos grabados el …»).

---

**Reglas comunes a todas las Tasks:**
- Antes de escribir el detalle, comprobar en los datos reales (`app/data/raw/`, `app/data/perfil/perfil.json`, una petición real al portal) los nombres exactos de las columnas. No inventar campos (CLAUDE.md §2.5).
- Valores (TTL, `max_age`, cuota, radios) en `app/config/realtime.yaml`, nunca en el código; lo que no tenga fuente oficial lleva `own_criterion: true`.
- **Ningún import entre servicios:** la API no puede importar `app/ingest/normalize/air.py` ni `aemet.py`. Lo que haga falta se reescribe en `app/api/live/` con sus pruebas, usando las muestras de `app/ingest/tests/data/` copiadas a `app/api/tests/data/`.
- Las pruebas **nunca** llaman a los portales: cliente `httpx` falso (`httpx.MockTransport`). Una prueba `slow` opcional por fuente puede llamar al portal real (se salta sin red).
- La ubicación del usuario no va a los logs; las URL de AEMET con la clave tampoco (la clave va en la cabecera `api_key`).
- En los ficheros compartidos, solo el trozo propio (`main.py`: `lifespan` y la función de su endpoint; `build_db.py`: funciones nuevas; `repository.py`: B2 **sí** puede cambiar `forecast` y `air_categories`, solo de dónde leen, sin cambiar su firma ni lo que devuelven).
- No se tocan `CLAUDE.md`, `docs/arquitectura.md` ni `docs/assets/requisitos_fuentes.json`: lo que haya que cambiar en ellos se dice en el informe y va en la PR de documentación.

---

## Lote LB2-1 · Núcleo en vivo (servicio `app/api/`) — Tasks 40, 41, 42

### Task 40: B2-M1 · `config/realtime.yaml` y `LiveStore` (caché con validez)
- **Alcance:** `app/config/realtime.yaml` con, por fuente: `url` o id, `ttl_s`, `max_age_h`, `timeout_s`; para AEMET: `requests_per_min: 4`, `retry_429_s: 120`, `pilots: [28065, 28079, 28131]`, `forecast_fallback_km`, `max_issued_age_h: 12` (DEC-13); `own_criterion: true` salvo lo que cite fuente. `app/api/live/store.py`: `LiveStore` con una entrada por fuente (`value`, `observed_at`, `fetched_at`, `status` ok/stale/failed, `last_error`), refresco en un hilo de fondo arrancado y parado en `lifespan`, una sola descarga a la vez por fuente, `get(source)` que devuelve `None` si `observed_at` es más viejo que `max_age_h` (aunque el portal esté caído), y modo instantánea (`GOMAD_LIVE_SNAPSHOT`). Validación de `realtime.yaml` al arrancar (un YAML erróneo para el arranque, como `rules.yaml`).
- **Es suyo:** `app/config/realtime.yaml`, `app/config/README.md` (una fila), `app/api/live/__init__.py`, `app/api/live/store.py`, la línea del `LiveStore` en `lifespan` de `main.py`, `app/api/tests/live/test_store.py`.
- **Pruebas clave:** dentro de TTL no se vuelve a pedir; portal caído y dato con 2 h → se sirve (`status=stale`); portal caído y dato con 4 h (aire, `max_age_h: 3`) → `None`; timeout del portal no bloquea `get`; dos refrescos a la vez → una sola petición; modo instantánea no abre conexiones; `realtime.yaml` sin `max_age_h` → error al arrancar que nombra la fuente.
- **Terminado cuando:** la API arranca con el `LiveStore` (sin fuentes aún) y las pruebas pasan.

### Task 41: B2-M2 · Aire en vivo (`aire_dia` + `ay_aire`) en memoria
- **Alcance:** `app/api/live/air.py`: descarga de los dos CSV (URL de `realtime.yaml`, las mismas del manifiesto), paso a formato largo (`station_id`, `magnitude`, `ts`, `value`) con la validación del origen (`V` y `T` válidos, `N` y vacío fuera), códigos de municipio sin ceros, fecha de cada fila (a primera hora el fichero es el de ayer), y medias móviles por contaminante (los periodos de `ica_thresholds.yaml`, como `create_aqi_hourly`) sobre un **búfer en memoria de 24 h** (solo para las medias; lo que se muestra cumple `max_age_h`). `Repository.air_categories` lee del `LiveStore` en vez de `realtime.duckdb`, con la misma firma y la misma salida. Si el `LiveStore` no tiene aire, se comporta como hoy cuando falta `realtime.duckdb` (aire null y aviso).
- **Es suyo:** `app/api/live/air.py`, el cuerpo de `Repository.air_categories`, `app/api/tests/live/test_air.py`, `app/api/tests/data/aire_dia_sample.csv` y `ay_aire_sample.csv` (recortes reales).
- **Pruebas clave:** muestra real → mismas categorías que la ruta actual (`normalize/air.py` + `create_aqi_hourly`) para la misma hora (valores esperados calculados a mano en la prueba, sin importar ingest); fila `T` cuenta y fila `N` no; fichero de ayer a las 00:30 → sin medición actual; última medición con 3 h 10 min → `None`; las pruebas de `/recommend` existentes siguen pasando sin cambios.
- **Terminado cuando:** `/recommend` en local muestra el aire de la última hora publicada sin `realtime.duckdb` en disco.

### Task 42: B2-M3 · Previsión AEMET con cola y cuota
- **Alcance:** `app/api/live/forecast.py`: cola con prioridad (1.º municipios pedidos por usuarios y aún sin previsión fresca, 2.º pilotos, 3.º el resto en orden de código), limitador de `requests_per_min`, un 429 se reintenta una vez tras `retry_429_s` y si vuelve a fallar se deja para la siguiente vuelta; descodificación ISO-8859-15 → mismo esquema que `forecast` (`ine_code`, `ts`, `temp`, `feels_like`, `precip_prob`, `issued`), con la probabilidad de lluvia de la franja de 6 h que contiene la hora; «Ip» → precipitación 0 sin romper. Un municipio solo se vuelve a pedir cuando su `issued` tiene más de 6 h (AEMET elabora ~3 veces al día). Caché de arranque en `data/live/forecast.json` (se descarta al leer lo que pase de `max_issued_age_h`). `Repository.forecast` lee del `LiveStore` con la misma firma; un municipio sin previsión usa la del más cercano con previsión dentro de `forecast_fallback_km` y lo marca. `AEMET_API_KEY` solo de `app/.env`.
- **Es suyo:** `app/api/live/forecast.py`, el cuerpo de `Repository.forecast`, `app/api/tests/live/test_forecast.py`, `app/api/tests/data/aemet_28065.json` (copia de la muestra de ingest), `app/.env.example` (quitar `AEMET_HOURLY`, `AEMET_ROTATION_SLICES`, `AEMET_PAUSE_S` si ya no los usa nadie; si los usa `download_sources.py`, se dejan y se dice en el informe).
- **Pruebas clave:** con la muestra de Getafe, hoy de 09 a 23 h y mañana de 00 a 23 h; la hora 17 lleva la probabilidad de la franja `1420`; nunca más de `requests_per_min` peticiones por minuto (reloj falso); 429 → un reintento y sigue con el siguiente municipio; municipio pedido por un usuario pasa delante de la rotación; `issued` de hace 13 h → no se usa; sin previsión propia y Getafe a 5 km → «Previsión de Getafe»; la clave no aparece en ningún log ni excepción.
- **Terminado cuando:** con la API en marcha y la clave en `app/.env`, a los 2 min hay previsión de los 3 pilotos en memoria y `/recommend` la usa sin `realtime.duckdb`.

### Detalle del lote LB2-1 (ejecutor, 16/10)

**Arquitectura (para el criterio 1.1):** integración virtual **mediador-wrapper con caché en memoria**. Cada fuente tiene un *wrapper* (`live/air.py` para las dos redes de aire y `live/forecast.py` para AEMET) que habla con su portal y lo traduce a un esquema común. El *mediador* es `LiveStore` + `Repository`, que ofrece la vista global (`air_categories`, `forecast`) con la misma firma de siempre y aplica la regla común de frescura (`max_age_h`). El motor no cambia.

**Rol:** Motor · **Servicio:** `app/api/` · **Rama:** `motor/b2-vivo`

**Decisiones comunes del lote:**
- `Repository(data_dir, live=None)`: con `live` lee de memoria; sin `live` (pruebas existentes, `GOMAD_LIVE=off`) lee `realtime.duckdb` como hoy, así las pruebas de `/recommend` no cambian. `lifespan` crea el `LiveStore` salvo con `GOMAD_LIVE=off`, que `tests/conftest.py` fija para que ninguna prueba (tampoco las `slow` con `lifespan`) llame a los portales.
- Horas: todo en hora local de Madrid sin zona, como el resto de la API. El reloj (`now`) se inyecta para las pruebas.
- La clave de AEMET se lee de la variable de entorno `AEMET_API_KEY` (Compose la pasa con `env_file`) o, si no está, de `app/.env`. Va solo en la cabecera `api_key`. Ni los logs ni `last_error` llevan URL ni mensaje de excepción: solo el tipo de error y el código HTTP.

#### Task 40 · `realtime.yaml` y `LiveStore`
**Ficheros:** Crear `app/config/realtime.yaml`, `app/api/live/__init__.py`, `app/api/live/store.py`, `app/api/tests/live/test_store.py`. Modificar `app/config/README.md` (una fila), `main.py` (`lifespan`: validar `realtime.yaml` y crear, arrancar y parar el `LiveStore`), `repository.py` (`__init__` con `live=None`) y `tests/conftest.py` (`GOMAD_LIVE=off`).

**Valores de `realtime.yaml`** (criterio propio salvo el `max_age_h` de 12 h de la previsión, de DEC-13):
- `air_cm`: URL del manifiesto de `aire_dia`, `ttl_s: 600`, `max_age_h: 4`, `timeout_s: 10`. **Cambiado el 16/10 por decisión del equipo** (antes 3 h): se usa la última medición de cada estación con su hora, el tope se aplica **por estación** y una estación que lo supera se sustituye por la siguiente más cercana con dato; `recommend.yaml` `air_reading_valid_h` pasa también a 4.
- `air_ay`: URL del manifiesto de `ay_aire` y los mismos valores.
- `forecast`: `url` con `{ine}`, `ttl_s: 3600`, `max_age_h: 12`, `timeout_s: 15`, `requests_per_min: 4`, `retry_429_s: 120`, `refetch_after_h: 6`, `pilots: ["28065", "28079", "28131"]`, `forecast_fallback_km: 10`. La caducidad de la previsión es su `max_age_h: 12` (DEC-13); la clave `max_issued_age_h` de la división se quitó por duplicada (verificación, 16/10).
- `air_buffer_h: 24`, `tick_s: 5`, `retry_failed_s: 60` (tras un fallo, reintento como mucho cada 60 s).

**Interfaces que produce:**
- `validate_realtime(cfg)`: lanza `ValueError` que nombra la fuente si le falta `ttl_s`, `max_age_h` o `timeout_s`.
- `Entry(value, observed_at, fetched_at, status, last_error)`, con `status` en `ok | stale | failed`.
- `LiveStore(cfg, client=None, now=None, snapshot_dir=None)`, con estos métodos:
  - `register(name, fetch)`, donde `fetch(store) -> (value, observed_at)`;
  - `refresh(name) -> bool`: no vuelve a pedir dentro del TTL y hace una sola descarga a la vez por fuente (lock sin espera);
  - `get(name) -> Entry | None`: `None` si `observed_at < now − max_age_h`;
  - `entry(name)`, `http_get(source, url, headers=None, key="data") -> (bytes, content_type)` (el `content_type` hace falta para la codificación de AEMET; en modo instantánea lee `snapshot_dir/<source>/<key>`, devuelve `content_type` vacío y nunca abre conexiones), `start()`, `stop()`, `snapshot` (bool).

**Pasos:**
- [x] Escribir `tests/live/test_store.py` con estas pruebas: `test_within_ttl_does_not_refetch`, `test_portal_down_recent_value_is_stale`, `test_portal_down_old_value_is_none`, `test_slow_portal_does_not_block_get`, `test_concurrent_refresh_single_request`, `test_snapshot_mode_never_opens_connections`, `test_realtime_yaml_without_max_age_names_source` (además, el `realtime.yaml` real pasa la validación).
- [x] Ejecutar `.venv/bin/pytest tests/live/test_store.py -q`. Esperado: error de colección (`No module named 'live'`).
- [x] Implementar, ejecutar las pruebas de la Task (Esperado: 7 passed) y la suite completa (Esperado: solo los 2 fallos de la línea base).
- [x] Commit `Motor: LiveStore y realtime.yaml, datos en vivo en memoria con validez máxima (B2 Task 40)`.

#### Task 41 · Aire en vivo
**Ficheros:** Crear `live/air.py`, `tests/live/test_air.py`, `tests/data/aire_dia_sample.csv` y `ay_aire_sample.csv` (recortes reales de `app/data/raw/`: Getafe 28065 y una estación de la capital). Modificar el cuerpo de `Repository.air_categories`.

**Interfaces que produce:**
- `parse_air_csv(text) -> list[(station_id, magnitude, ts, value)]`, con estas reglas:
  - se quedan `V` y `T` y se descartan `N` y los vacíos;
  - magnitudes 1, 8, 9, 10 y 14;
  - `station_id` = `28` + municipio con 3 cifras + estación con 3 cifras;
  - `ts` = fin de la hora;
  - fecha de cada fila;
  - coma o punto decimal.
- `AirFeed(source, url, buffer_h)`, con `fetch(store)`. Mezcla las lecturas en un búfer de 24 h y devuelve `(buffer, max ts)`.
- `air_categories(readings_list, start, end, ica, valid_h)`: misma salida que `Repository.air_categories`. Calcula medias móviles de `period_hours` en la ventana `[ts − (h−1) h, ts]`, con la cobertura `min_coverage` y `aqi_category`.
- `register_air(store, cfg)`.

**Pasos:**
- [x] Escribir `tests/live/test_air.py` con estas pruebas:
  - `test_sample_categories_match_batch_path`: los valores esperados se calculan a mano en la prueba, sin importar ingest;
  - `test_t_counts_n_does_not`;
  - `test_yesterday_file_after_midnight_has_no_current_reading`;
  - `test_last_reading_3h10_is_none`;
  - `test_repository_reads_live_air`.
- [x] FAIL (no existe `live.air`) → implementar → PASS. Suite: solo los 2 fallos de la línea base (las pruebas de `/recommend` no cambian).
- [x] Commit `Motor: aire en vivo de las dos redes en memoria (B2 Task 41)`.

#### Task 42 · Previsión AEMET con cola y cuota
**Ficheros:** Crear `live/forecast.py`, `tests/live/test_forecast.py` y `tests/data/aemet_28065.json` (copia de la muestra de ingest). Modificar el cuerpo de `Repository.forecast`. `.env.example` no cambia: `download_sources.py` usa todavía `AEMET_MUNICIPALITIES` y `AEMET_PAUSE_S`, y así se dirá en el informe.

**Interfaces que produce:**
- `decode(raw, content_type="")` (usa el `content_type` de `http_get`).
- `parse_forecast(doc) -> (series {ts: (temp, feels_like, precip_prob, precip)}, issued)`. Solo cuenta las horas con temperatura; `probPrecipitacion` se toma de la franja de 6 h que contiene la hora; «Ip» → 0.
- `RateLimiter(per_min, now)`, con `allow() -> bool` (ventana de 60 s; cuenta cada petición HTTP, 2 por municipio).
- `ForecastFeed(store, cfg, codes, centers=None, cache_path=None, key=None)`, con estos métodos:
  - `request(ines)`: prioridad para los municipios que piden las personas;
  - `next_due() -> ine | None`: orden pedidos → pilotos → resto por código; un municipio toca si no tiene previsión o si su `issued` tiene más de `refetch_after_h` y su último intento más de `ttl_s`;
  - `step() -> str`: hace como mucho una descarga de dos pasos si el limitador lo permite. Un 429 se reintenta una vez tras `retry_429_s`; si vuelve a fallar, el municipio espera a la siguiente vuelta y se sigue con el siguiente;
  - `get(ine) -> (series, issued, note) | None`: `None` si `issued` tiene más de `max_age_h` (salvo en modo instantánea). Si el municipio no tiene previsión propia, usa la del más cercano con previsión dentro de `forecast_fallback_km`, con `note = "Previsión de <nombre>"`;
  - `load_cache()` / `save_cache()`: guarda en `data/live/forecast.json` y al leer descarta lo que tenga más de `max_age_h`.
- `aemet_key()`.

**Pasos:**
- [x] Escribir `tests/live/test_forecast.py` con estas pruebas:
  - `test_getafe_sample_hours`: hoy de 09 a 23 h, mañana de 00 a 23 h;
  - `test_hour_17_uses_band_1420`;
  - `test_ip_is_zero`;
  - `test_rate_limit_never_exceeded` (reloj falso);
  - `test_429_retries_once_then_moves_on`;
  - `test_user_request_jumps_queue`;
  - `test_issued_13h_ago_not_used`;
  - `test_nearest_forecast_within_km`: «Previsión de Getafe» a unos 5 km;
  - `test_key_never_in_logs_or_errors`;
  - `test_cache_drops_old_on_load`;
  - `test_repository_reads_live_forecast`.
- [x] FAIL → implementar → PASS. Suite: solo los 2 fallos de la línea base.
- [x] Commit `Motor: previsión de AEMET en memoria con cola, cuota y caché de arranque (B2 Task 42)`.
- [x] **Terminado cuando:** con la clave en `app/.env`, `uvicorn` (sin `GOMAD_LIVE=off`) tiene a los 2 min la previsión de los 3 pilotos y el aire de las dos redes, y `/recommend` en Getafe los usa con `realtime.duckdb` renombrado.

---

## Lote LB2-2 · Referencia (servicio `app/ingest/`) — Tasks 43, 44 (en paralelo con LB2-1)

### Task 43: B2-D1 · Patrón horario del aire (V-D3) → `air_pattern`
- **Alcance:** a partir de `aire_historico` (descarga `--only aire_historico --include-heavy`), una función **nueva** en `build_db.py` llamada desde `build_main`: `air_pattern(station_id, pollutant, month, day_type, hour, p50, p90, n)` con `day_type` laborable/fin de semana, de los últimos años que fije el detalle (comprobar tamaño y años disponibles). Los periodos de las medias son los del ICA. Solo red CM: **comprobar** si el Ayuntamiento tiene histórico horario abierto para sus 24 estaciones; si no, la capital queda sin estimación y se dice (Ruling).
- **Es suyo:** su función en `app/ingest/build_db.py`, lo que necesite en `app/ingest/normalize/air.py` (funciones nuevas), `app/ingest/tests/test_air_pattern.py`.
- **Pruebas clave:** datos mínimos → p50 correcto por hora y tipo de día; hora sin datos suficientes (`n` por debajo del mínimo del detalle) → sin fila, no 0; (`slow`) las 28 estaciones CM con 24 horas × 2 tipos de día en el mes actual.
- **Terminado cuando:** `python -m build_db main` deja `air_pattern` en `gomad.duckdb`.

### Task 44: B2-D2 · Sensores de tráfico → tramos del grafo de la capital
- **Alcance:** tabla de referencia `traffic_sensor_edge(idelem, edge_id, distance_m)`: cada punto de `pm.xml` (`st_x`, `st_y` en EPSG:25830, coma decimal) asignado al tramo más cercano del grafo de la capital (`data/graph/28079/` o el regional de B4 si ya está fusionado) dentro de `sensor_max_m` de `realtime.yaml`. Los sensores no se mueven: se recalcula con el grafo (semanal). Se escribe en `data/graph/<zona>/traffic_sensor_edge.parquet` junto a `edges.parquet`.
- **Es suyo:** una función nueva en `app/ingest/graph.py` (sin cambiar las existentes) o un módulo nuevo `app/ingest/traffic.py` (preferible, para no pisar a B4), `app/ingest/tests/test_traffic.py`.
- **Pruebas clave:** sensor a 5 m de un tramo → ese tramo; sensor a más de `sensor_max_m` → sin tramo; (`slow`) más del 80 % de los ~4.000 sensores con tramo (umbral a comprobar en el detalle con los datos reales).
- **Terminado cuando:** existe `traffic_sensor_edge.parquet` para la capital y las pruebas pasan.

---

## Lote LB2-3 · Usar lo vivo en el motor (servicio `app/api/`) — Tasks 45, 46 (después de LB2-1 y LB2-2)

### Task 45: B2-M4 · Tráfico en vivo en `/route` (solo capital)
- **Alcance:** `app/api/live/traffic.py`: `pm.xml` → `{idelem: carga}` (descarta `error` ≠ N y valores fuera de rango); se pide solo mientras haya rutas en capital en los últimos 15 min. En `/route`, si la ruta está en la zona de la capital y hay tráfico vivo con ≤ `max_age`, el `traffic` de los tramos con sensor se sustituye por `carga / 100` (o la escala que fije el detalle con los datos reales) **en una copia por petición**; sin tráfico vivo, el de la jerarquía de vías (como hoy). La descripción de la ruta dice cuál se ha usado («tráfico en tiempo real de las 16:05» / «tráfico estimado por tipo de vía»).
- **Es suyo:** `app/api/live/traffic.py`, el uso en `app/api/services/route.py` (solo el trozo que elige el `traffic` de cada tramo), `app/api/tests/live/test_traffic.py`, `app/api/tests/data/pm_sample.xml`. Si hace falta un parámetro opcional en la función de coste de `app/api/routing/graph.py`, **una línea** y avisando (es de B4).
- **Pruebas clave:** muestra real → cargas por sensor; tramo con sensor al 90 % de carga → la ruta saludable lo evita frente a la misma red sin tráfico vivo; tráfico de hace 20 min → se usa el de la jerarquía y se dice; Getafe nunca pide `pm.xml`; latencia de `/route` en capital < 5 s con el parseo (medido).
- **Terminado cuando:** una ruta en capital cambia con un `pm.xml` grabado de hora punta frente a uno de madrugada, y lo dice.

### Task 46: B2-M5 · Aire de horas futuras con el patrón (estimación)
- **Alcance:** `Repository.air_pattern(station_ids, hours)` (método **nuevo**) y su uso en `services/recommend.py`: para una hora sin medición válida, la categoría del ICA calculada con el `p50` del patrón de esa estación, mes, tipo de día y hora; marcada como **estimación** en la explicación y en `DataSource` (`own_criterion: true`, «Estimación con el histórico de la estación»). Sustituye a `air_reading_valid_h` como única salida para el futuro; la última medición se sigue usando para la hora actual.
- **Es suyo:** `Repository.air_pattern`, el trozo de `services/recommend.py` que rellena `aqi_category` por hora, las plantillas de explicación que digan «estimado», `app/api/tests/test_recommend_future_air.py`.
- **Pruebas clave:** caso de Lucía (ozono): con un patrón de ozono alto por la tarde y bajo a primera hora, la mejor franja de mañana sale temprano y la explicación dice «estimado»; estación sin patrón (capital, si Task 43 no lo tiene) → aire null y aviso, nunca un valor inventado; hora actual con medición válida → medición, no patrón.
- **Terminado cuando:** `/recommend` con ventana de mañana devuelve aire estimado por hora y lo marca.

---

## Lote LB2-4 · Contrato y front — Tasks 68, 69 (después de LB2-3 y de que B1 haya cerrado su cambio de contrato)

### Task 68: B2-M6 · `/conditions/{ine_code}` («Ahora en tu zona»)
- **Alcance:** endpoint nuevo de solo lectura: `{ine_code, air: {category, measured_at, station, estimated}, weather: {temp, feels_like, precip_prob, sky, hour, issued, from_ine_code}, traffic: {available, observed_at} | null, pollen: null, sources: [DataSource]}` para la hora en curso; cada bloque `null` con su motivo si no hay dato válido. **Cambio de contrato** (§1 de `trabajo-paralelo.md`: `export_openapi.py`, `npm run contract`, `test_contract.py`, avisar).
- **Es suyo:** `app/api/services/conditions.py`, la función `conditions` de `main.py`, los esquemas nuevos en `schemas.py` (solo añadir), `openapi.json` y `schema.d.ts` regenerados, `app/api/tests/test_conditions.py`.
- **Pruebas clave:** 28065 con todo en memoria → los tres bloques con sus fechas; aire de hace 4 h → `air: null` con motivo; 28999 → 404; ninguna coordenada en la respuesta ni en los logs.
- **Terminado cuando:** `curl localhost:8000/conditions/28065` responde < 200 ms (solo memoria) y `test_contract.py` pasa.

### Task 69: B2-F1 · Conectar «Ahora en tu zona» y las fechas en el front
- **Alcance:** `getConditions` en `src/data/conditions.ts` (nuevo) con su dato de ejemplo en `src/data/mock/` para `MODE=test`; las fechas («Aire medido a las 13:00», «Previsión de AEMET de las 12:00», «Estimación») ya vienen en `DataSource`: solo se conectan. El componente visual es de F: B2 deja la función y, si F no ha hecho la tarjeta, una versión mínima accesible (icono + color + texto) en un commit aparte y avisando.
- **Es suyo:** `app/frontend/src/data/conditions.ts`, `app/frontend/src/data/mock/conditions.*`, su prueba.
- **Pruebas clave:** Vitest de `getConditions` con la respuesta de ejemplo; axe sin violaciones en la tarjeta si se crea; con `air: null` se lee «Sin medición reciente», nunca un valor.
- **Terminado cuando:** `npm test && npm run build && npm run lint` en verde.

---

## Lote LB2-5 · Recarga programada y polen (Could) — Tasks 70, 71

### Task 70: B2-D3 · Recarga de referencia y diaria (lo que queda del S-D2)
- **Alcance:** con aire, previsión y tráfico en la API, la ingesta programada solo hace `reference` (mensual), `daily` (04:00) y `weekly` (OSM + grafo): `app/ingest/jobs/run_level.sh <nivel>` con `flock` (que no se solapen), descarga → `normalize` de lo cambiado → `build_db main` → `restart api` no hace falta (la API ve el fichero nuevo en la petición siguiente). En la VM: cron del sistema con `docker compose run --rm ingest …` (servicio `ingest` en Compose, con `../data` en lectura y escritura y `../config` en solo lectura). El nivel `hourly` deja de programarse.
- **Es suyo:** `app/ingest/jobs/`, `app/ingest/Dockerfile`, el servicio `ingest` en `app/deploy/docker-compose.yml`, `app/deploy/crontab.example`, `app/ingest/tests/test_jobs.py`.
- **Pruebas clave:** dos `run_level.sh daily` a la vez → el segundo sale sin hacer nada; fuente sin cambios (`changed: false` en el manifiesto) → no se reconstruye; `docker compose config` válido.
- **Terminado cuando:** `docker compose run --rm ingest jobs/run_level.sh daily` termina en local y deja `gomad.duckdb` nuevo.

### Task 71: B2-D4 · Polen (Could; solo si LB2-1 a LB2-3 están fusionados antes del sábado 22:00)
- **Alcance:** fuente nueva (CLAUDE.md §2.12: **la aprueba el equipo antes de empezar**). `captadores_polen` (referencia; CSV **Windows-1252**, coma decimal, `x_epsg25830`/`y_epsg25830`; 11 captadores) → `pollen_station(code, name, ine_code, geom)` y `municipality_pollen_station` (captador más cercano y distancia) en `gomad.duckdb`. `mediciones_polen` (CKAN, DIARIO; `captador; fecha_lectura; tipo_polinico; granos_de_polen_x_metro_cubico`; 10 captadores con datos, el último del 11/10 el 16/10) en el `LiveStore`, una vez al día, `max_age_h` de días. **Umbrales:** copiar los niveles oficiales por tipo polínico de la Red Palinocam o SEAIC y citarlos; si no se encuentran, se muestra el valor sin calificar y `own_criterion: true`. Solo aviso para el perfil `sensitive` («Gramíneas: 40 granos/m³ en Getafe, dato del 11/10») y bloque `pollen` de `/conditions`; **no** puntúa ni filtra. Añadir `polen` y `polen_captadores` a `download_sources.py` (nivel `reference` para captadores).
- **Es suyo:** `app/ingest/normalize/pollen.py`, su función en `build_db.py`, sus entradas en `download_sources.py`, `app/api/live/pollen.py`, la sección `pollen` de `realtime.yaml`, sus pruebas.
- **Pruebas clave:** captadores en Windows-1252 bien leídos y `GETA` asignado a 28065; dato de hace 8 días → `pollen: null`; el polen nunca cambia `score` ni `viable`.
- **Terminado cuando:** `/conditions/28065` trae polen con su fecha.

---

## Fuera de este bloque (anotado para no olvidarlo)

- **Meteo medida del Ayuntamiento (`ay_meteo`):** solo capital; la previsión de AEMET para la hora en curso cubre los 179 con la misma fuente. No se usa salvo que el equipo lo pida.
- **Avisos meteorológicos de AEMET (Meteoalerta), índice UV, disponibilidad de BiciMAD:** fuentes nuevas sin verificar y fuera del MVP (CLAUDE.md §5). No entran.
- **Tráfico fuera de la capital:** no hay dato abierto en tiempo real; se queda la jerarquía de vías.
