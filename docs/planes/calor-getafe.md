# Plan del bloque B3 — Calor y hueco de Getafe (DEC-06, RF-04, RF-09)

> **Nota (16/10):** AEMET sustituida por Open-Meteo (DEC-16); la Tmáx del día es la diaria de Open-Meteo (`docs/planes/open-meteo.md`).

> **Para agentes:** ejecutar con `superpowers:executing-plans`, Task a Task, con TDD. Ledger: `.superpowers/sdd/calor-getafe/progress.md` (no el del plan general). Pasos con casillas (`- [ ]`).

**Objetivo:** que el motor aplique el «día de calor» de DEC-06 por zona meteosalud y que Getafe (y los municipios grandes sin EIEL) tengan destinos de nadar, tenis y baloncesto desde OSM filtrado.

**Arquitectura:** el calor se decide en `engine/rules.py` con dos datos nuevos por hora (Tmáx prevista del día y umbral de la zona del municipio), que `services/recommend.py` calcula a partir de la previsión del día completo y de `config/heat_zones.csv`; `engine/slots.py` solo añade el desempate por sensación térmica. Los destinos OSM se leen con pyosmium en `normalize/sports.py`, entran en `clean/destination_raw.parquet` con `source = "osm_sport"` y las reglas `source: osm_sport` de `activities.yaml` los asignan a actividades con el `apply_activities` que ya existe.

**Tecnología:** Python 3.12, FastAPI, DuckDB, PyYAML, pytest; pyosmium 3.7 (`app/ingest`, extra `routing`), GeoPandas.

**Spec:** ficha del **Bloque B3** en `docs/trabajo-paralelo.md` §3 (DEC-06 opción C y hueco de Getafe, decididos el 16/10), §1 (ficheros compartidos), `docs/assets/umbrales.md` (calor), `docs/decisiones-pendientes.md` D-06.
**Fecha:** viernes 16/10/2026.

## Restricciones globales

- Valores en `app/config/`, nunca en el código (umbrales, zonas, horas, perfiles de riesgo, suitability). Lo que no sale de la fuente oficial lleva `own_criterion: true`.
- Solo los ficheros «Es suyo» de la ficha: `app/config/rules.yaml` (sección `heat`), `app/config/heat_zones.csv`, `app/api/engine/rules.py`, `app/api/engine/slots.py` (solo el desempate), `app/api/services/recommend.py` (solo pasar `companions` y la Tmáx del día, y el aviso de calor), `app/config/activities.yaml`, `app/ingest/normalize/sports.py`, `docs/assets/requisitos_fuentes.json` (OSM como fuente de RF-04), y sus pruebas.
- No se tocan: el contrato (`schemas.py`, `openapi.json`), `config/sources.yaml` (B1: se le pide la etiqueta de `osm_sport`), `engine/explanation.py`, `repository.py`, `mini_data.py`, el front.
- Textos exactos (con tildes, los ve la persona): motivo «Día de calor (máx. prevista 38 °C, umbral de tu zona 37,4 °C): mejor evitar de 14:00 a 19:00»; aviso «Día de calor en tu zona». Números con coma decimal y sin decimales si son enteros (`explanation.fmt_number`).
- Código en inglés; comentarios en español sin tildes. Commits en español con prefijo de rol.
- Pruebas en Windows: `app/api/.venv/Scripts/python -m pytest` y `app/ingest/.venv/Scripts/python -m pytest` (las de datos reales, `slow`).

## Foco de revisión

1. **Previsión que no cubre el día entero** (AEMET empieza a las 08–09 h el primer día): la Tmáx sale de las horas que haya; un día sin ninguna `temp` no es día de calor (nunca bloquea por falta de dato). → Task 49, `test_heat_day_max_ignores_missing_temps`.
2. **Municipio sin zona en `heat_zones.csv`** (ine raro o tabla incompleta): `validate_rules` lo impide al arrancar; en una petición, sin zona no hay regla de calor. → Task 47 `test_zone_table_must_cover_179`, Task 48 `test_no_threshold_no_heat_rule`.
3. **Ventana que cruza medianoche** entre un día de calor y uno que no lo es: cada hora usa la Tmáx de **su** día. → Task 49, `test_window_across_days_uses_each_day_max`.
4. **Hora 19:00 exacta**: `avoid_hours: [14, 19]` es de 14:00 a 19:00, la hora 19 ya vale; la 14 no. → Task 48, `test_avoid_hours_bounds`.
5. **Piscinas privadas o sin nombre** (769 en la caja de Getafe): nunca entran, aunque tengan `sport=swimming`. → Task 50, `test_osm_filter_rules`.

---

### Task 47: B3-1 · Sección `heat` de `rules.yaml`, `heat_zones.csv` y su validación

**Rol:** Motor · **Servicio:** `app/api/` · **Depende de:** nada · **Duración:** 30 min

**Ficheros:** Modificar `app/config/rules.yaml` (solo `heat`), `app/api/engine/rules.py`, `app/api/tests/engine/test_rules.py`. Crear `app/config/heat_zones.csv` (copia literal de `docs/assets/heat_zones.csv`: `ine_code,municipality,zone_code`, 179 filas).

**Interfaces:**
- Produce: `heat` en `rules.yaml` exactamente como la propuesta de la ficha (zonas `722801` 35.8, `722802` 37.4, `722803` 39.2; `zone_table`, `risk_profiles: [senior, stroller]`, `risk_companions: [kids]`, `avoid_hours: [14, 19]`, `tiebreak: feels_like`, `source`, `own_criterion: true`, `own_criterion_items`). Desaparece `max_feels_like_c`.
- Produce: `load_heat_zones(path: pathlib.Path) -> dict[str, str]` (ine_code → zone_code, lee el CSV con `csv.DictReader`, UTF-8).
- Produce: `validate_rules(rules, zones: dict[str, str] | None = None)` — además de lo de hoy: cada zona con `max_temp_c` numérico (`_check_number`, 0–60); exactamente las zonas `722801`, `722802`, `722803`; `avoid_hours` dos enteros 0–24 con inicio < fin; `risk_profiles` ⊆ perfiles del contrato no hace falta (se deja libre); si `zones` no es `None`: 179 códigos y todos con zona definida en `heat.zones`. `heat` ausente o `null` sigue siendo válido (regla desactivada).
- El 179 es el ámbito del proyecto (CLAUDE.md §2.2), no un valor ajustable: constante `MUNICIPALITY_COUNT = 179` en `rules.py`.
- `main.py` no cambia: `validate_rules(settings.load("rules"))` sigue igual; la cobertura de la tabla se comprueba en la prueba con el fichero real y en `recommend` (Task 49) al cargarla.

- [ ] **Paso 1: prueba que falla** — en `test_rules.py` cambiar `RULES["heat"]` por la forma nueva (`HEAT` de prueba con las 3 zonas reales) y añadir:

```python
def test_real_rules_and_zone_table_are_valid():
    rules = load("rules")
    zones = load_heat_zones(CONFIG_DIR / rules["heat"]["zone_table"])
    validate_rules(rules, zones)
    assert len(zones) == 179 and zones["28065"] == "722802"
    assert rules["heat"]["zones"]["722802"]["max_temp_c"] == 37.4

def test_zone_table_must_cover_179():
    with pytest.raises(ValueError):
        validate_rules({"heat": HEAT}, {"28065": "722802"})

def test_zone_table_with_unknown_zone_fails():
    zones = {f"28{i:03d}": "722802" for i in range(179)} | {"28065": "999999"}
    with pytest.raises(ValueError):
        validate_rules({"heat": HEAT}, zones)
```

y en `test_invalid_rules_fail_validation` los casos `{"heat": {**HEAT, "zones": {**HEAT["zones"], "722801": {"name": "Sierra", "max_temp_c": "treinta"}}}}`, `{"heat": {**HEAT, "avoid_hours": [19, 14]}}` y `{"heat": {**HEAT, "zones": {"722801": HEAT["zones"]["722801"]}}}` (faltan zonas).

- [ ] **Paso 2:** `app/api/.venv/Scripts/python -m pytest tests/engine/test_rules.py -q` — Esperado: FAIL (`load_heat_zones` no existe; `heat_zones.csv` no está en `app/config`).
- [ ] **Paso 3:** copiar el CSV, escribir la sección `heat` y ampliar `validate_rules` / añadir `load_heat_zones` en `rules.py`.
- [ ] **Paso 4:** misma orden — Esperado: PASS. Las pruebas de `max_feels_like_c` que ya no aplican se sustituyen en la Task 48 (aquí solo se adaptan las de validación).
- [ ] **Paso 5: commit** — `git add app/config/rules.yaml app/config/heat_zones.csv app/api/engine/rules.py app/api/tests/engine/test_rules.py && git commit -m "Motor: calor por zona meteosalud en rules.yaml y su validación (B3 Task 47)"`

**Terminado cuando:** `rules.yaml` tiene la sección `heat` de la ficha, `app/config/heat_zones.csv` cubre los 179 municipios y `validate_rules` rechaza zonas, horas o tabla erróneas.

---

### Task 48: B3-2 · Regla «día de calor» en `evaluate_outdoor` y desempate en `slots.py`

**Rol:** Motor · **Servicio:** `app/api/` · **Depende de:** Task 47 · **Duración:** 45 min

**Ficheros:** Modificar `app/api/engine/rules.py`, `app/api/engine/slots.py`, `app/api/tests/engine/test_rules.py`, `app/api/tests/engine/test_slots.py`.

**Interfaces:**
- Consume: `rules["heat"]` de la Task 47.
- Produce: `HourContext` con dos campos nuevos al final, con valor por defecto: `day_max_temp_c: float | None = None` (Tmáx prevista del día de esa hora) y `heat_threshold_c: float | None = None` (umbral de la zona del municipio). Sin los dos, no hay regla de calor.
- Produce: `is_heat_day(ctx: HourContext) -> bool` (`day_max_temp_c > heat_threshold_c`, estricto; `False` si falta alguno).
- Produce: `at_heat_risk(profile: str, companions, rules) -> bool` (`profile in heat.risk_profiles` o algún `companion in heat.risk_companions`).
- Produce: `evaluate_outdoor(ctx, profile, rules, companions=())` — con día de calor, perfil de riesgo y `avoid_hours[0] <= ctx.hour.hour < avoid_hours[1]`: `outdoor_ok=False` con el motivo exacto `f"Día de calor (máx. prevista {fmt(day_max)} °C, umbral de tu zona {fmt(threshold)} °C): mejor evitar de {a:02d}:00 a {b:02d}:00"` (`fmt` = coma decimal y sin «,0»: 38 → «38», 37.4 → «37,4»; función local `_fmt_c`, no se importa `explanation`). La regla cuenta como evaluada (`evaluated += 1`) siempre que haya umbral y Tmáx. Sin perfil de riesgo, no bloquea. Desaparece la regla `max_feels_like_c`.
- Produce: `evaluate_hours(contexts, window, covered, profile, rules, fixed_factors, weights, companions=())` (pasa `companions` a `evaluate_outdoor`).
- Produce: `best_hour(results, tiebreak=None)` — con `tiebreak == "feels_like"`, a igual nota gana la hora de día de calor con menor `feels_like_c`; después, la más temprana. Clave: `(score, -feels_like_c si is_heat_day(ctx) y hay dato, si no 0, -timestamp)`.

- [ ] **Paso 1: prueba que falla** — `test_rules.py` (sustituye `test_carmen_36_degrees` y `test_disabled_rule_does_not_block`):

```python
def heat_ctx(hour, day_max, threshold=37.4, feels=30.0):
    return HourContext(datetime(2026, 7, 15, hour), day_max, feels, 0.0, "good", day_max, threshold)

def test_carmen_38_blocks_senior_in_afternoon():
    r = evaluate_outdoor(heat_ctx(16, 38.0), "senior", RULES)
    assert r.outdoor_ok is False
    assert r.reasons == ["Día de calor (máx. prevista 38 °C, umbral de tu zona 37,4 °C): mejor evitar de 14:00 a 19:00"]

def test_carmen_36_is_not_heat_day():
    assert evaluate_outdoor(heat_ctx(16, 36.0), "senior", RULES).outdoor_ok is True

def test_heat_day_does_not_block_general():
    assert evaluate_outdoor(heat_ctx(16, 38.0), "general", RULES).outdoor_ok is True

def test_kids_companion_is_risk():
    assert evaluate_outdoor(heat_ctx(16, 38.0), "general", RULES, companions=["kids"]).outdoor_ok is False
    assert evaluate_outdoor(heat_ctx(16, 38.0), "general", RULES, companions=["dog"]).outdoor_ok is True
    assert evaluate_outdoor(heat_ctx(16, 38.0), "stroller", RULES).outdoor_ok is False

@pytest.mark.parametrize("hour,ok", [(13, True), (14, False), (18, False), (19, True)])
def test_avoid_hours_bounds(hour, ok):
    assert evaluate_outdoor(heat_ctx(hour, 38.0), "senior", RULES).outdoor_ok is ok

def test_threshold_is_strict():
    assert evaluate_outdoor(heat_ctx(16, 37.4), "senior", RULES).outdoor_ok is True

def test_no_threshold_no_heat_rule():
    assert evaluate_outdoor(heat_ctx(16, 45.0, threshold=None), "senior", RULES).outdoor_ok is True
```

`test_slots.py` (cambiar `RULES` a la forma nueva con `HEAT` y las pruebas de Carmen por sensación térmica):

```python
def test_heat_day_tiebreak_lowest_feels_like():
    hours = [HourContext(datetime(2026, 7, 15, h), 38.0, f, 0.0, "good", 38.0, 37.4) for h, f in [(19, 33.0), (20, 31.0), (21, 29.0)]]
    contexts = {c.hour: c for c in hours}
    res = evaluate_hours(contexts, list(contexts), False, "senior", RULES, FIXED, WEIGHTS)
    assert best_hour(res, tiebreak="feels_like").hour == datetime(2026, 7, 15, 21)
    assert best_hour(res).hour == datetime(2026, 7, 15, 19)          # sin desempate: la mas temprana

def test_heat_day_all_afternoon_blocked_for_senior():
    contexts = {c.hour: c for c in [HourContext(datetime(2026, 7, 15, h), 38.0, 36.0, 0.0, "good", 38.0, 37.4) for h in (15, 16)]}
    res = evaluate_hours(contexts, list(contexts), False, "senior", RULES, FIXED, WEIGHTS)
    assert needs_indoor(res)
    res = evaluate_hours(contexts, list(contexts), False, "general", RULES, FIXED, WEIGHTS, companions=["kids"])
    assert needs_indoor(res)
```

- [ ] **Paso 2:** `app/api/.venv/Scripts/python -m pytest tests/engine -q` — Esperado: FAIL (`HourContext` no acepta 7 argumentos).
- [ ] **Paso 3:** implementar en `rules.py` y `slots.py` con las firmas de arriba.
- [ ] **Paso 4:** misma orden — Esperado: PASS, y `tests/engine/test_explanation.py` sigue en verde (no se toca).
- [ ] **Paso 5: commit** — `git commit -m "Motor: día de calor con perfiles de riesgo de 14 a 19 h y desempate por sensación térmica (B3 Task 48)"` con los 4 ficheros.

**Terminado cuando:** con 38 °C y umbral 37,4 un perfil de riesgo no tiene exterior de 14:00 a 19:00, el resto sí, y entre horas iguales de un día de calor gana la de menor sensación térmica.

---

### Task 49: B3-3 · `/recommend`: Tmáx del día, zona, `companions` y aviso de calor

**Rol:** Motor · **Servicio:** `app/api/` · **Depende de:** Task 48 · **Duración:** 45 min

**Ficheros:** Modificar `app/api/services/recommend.py` (solo lo de la ficha), `app/api/tests/services/test_recommend.py`.

**Interfaces:**
- Consume: `load_heat_zones`, `HourContext(..., day_max_temp_c, heat_threshold_c)`, `evaluate_hours(..., companions)`, `best_hour(results, tiebreak)`, `is_heat_day` (Tasks 47–48); `settings.CONFIG_DIR`.
- Cambios en `_Run` (nada más en el fichero):
  - `__init__`: `self.heat = cfg["rules"].get("heat") or {}`; `self.zones = load_heat_zones(settings.CONFIG_DIR / self.heat["zone_table"])` si hay `heat` (si no, `{}`).
  - `_load_context`: pide la previsión del **día completo** de la ventana: `self.repo.forecast(new, window[0].replace(hour=0), window[-1].replace(hour=23))` (las horas fuera de la ventana solo sirven para la Tmáx).
  - Nuevo `_day_max(fc, day) -> float | None`: máximo de `temp` no nulo de las horas de `fc` con `ts.date() == day`.
  - `_hour_contexts`: cada `HourContext` lleva `day_max_temp_c = _day_max(fc, h.date())` y `heat_threshold_c = heat.zones[zone].max_temp_c` de la zona del `ine_code` del destino (sin zona → `None`).
  - `score`: `evaluate_hours(..., companions=self.req.companions)` y `best_hour(hours, self.heat.get("tiebreak"))`.
  - `_own_rule`: el prefijo de calor pasa de `"Calor"` a `"Día de calor"`.
  - `warnings`: fuera «Calor: todavía no hay un umbral oficial cargado; no se evalúa.»; si alguna hora evaluada de un destino elegido al aire libre es de día de calor y la persona **no** es de riesgo → «Día de calor en tu zona». (Con perfil de riesgo el motivo ya va en cada hora.) Si `heat` falta en `rules.yaml` → «Calor: no hay umbral de calor cargado; no se evalúa.» (se mantiene la transparencia).
- Respuesta de reserva (guion de Carmen): la prueba de 38 °C es la que fija el texto.

- [ ] **Paso 1: prueba que falla** — en `test_recommend.py`, un ayudante `carmen(tmp_path, day_max, profile="senior", **req)` que llama a `build_mini_data(tmp_path / "data", forecast=False)`, inserta en `realtime.duckdb` la previsión de Getafe de las 0–23 h del 16/10/2026 (temperatura 25 salvo 14–18 h con pico `day_max` a las 16 h; `feels_like` 34, 33, 31, 29, 28 de 18 a 22 h; `precip_prob` 0) y pide `walk` con ventana 15:00–22:00 (`now = NOW`). Pruebas:

```python
def test_carmen_38_now_no_better_at_21(tmp_path):
    res = carmen(tmp_path, 38.0)
    rec = res.results[0]
    assert rec.best_hour == datetime(2026, 10, 16, 21)
    assert rec.explanation.startswith("Ahora no: mejor a las 21:00 (día de calor (máx. prevista 38 °C, umbral de tu zona 37,4 °C)")
    assert "Día de calor en tu zona" not in res.warnings

def test_carmen_38_surprise_has_covered_alternative(tmp_path):
    res = carmen(tmp_path, 38.0, activity=None, limit=3)
    assert any(r.destination.covered for r in res.results)

def test_carmen_36_is_not_heat_day(tmp_path):
    res = carmen(tmp_path, 36.0)
    assert res.results[0].best_hour == datetime(2026, 10, 16, 15)
    assert not res.results[0].explanation.startswith("Ahora no")

def test_heat_day_general_only_warns(tmp_path):
    res = carmen(tmp_path, 38.0, profile="general")
    assert "Día de calor en tu zona" in res.warnings
    assert res.results[0].hours[0].outdoor_ok is True

def test_heat_day_kids_companion_blocks(tmp_path):
    rec = carmen(tmp_path, 38.0, profile="general", companions=["kids"]).results[0]
    assert rec.hours[0].outdoor_ok is False

def test_heat_day_max_ignores_missing_temps(tmp_path): ...   # temp NULL en las horas de pico -> no es dia de calor
def test_window_across_days_uses_each_day_max(tmp_path): ...  # 16/10 con 38 y 17/10 con 30: senior a las 15 h del 17 vale
```

y en `test_missing_factors_renormalize_with_warnings` la línea de «Calor:» pasa a `assert not any(w.startswith("Calor:") for w in res.warnings)`.

- [ ] **Paso 2:** `app/api/.venv/Scripts/python -m pytest tests/services/test_recommend.py -q` — Esperado: FAIL (Carmen a las 15:00, sin bloqueo).
- [ ] **Paso 3:** implementar los cambios de `_Run`.
- [ ] **Paso 4:** `app/api/.venv/Scripts/python -m pytest -q` — Esperado: PASS todo el servicio (incluido `test_contract.py`: el contrato no cambia).
- [ ] **Paso 5: commit** — `git commit -m "Motor: /recommend aplica el día de calor de la zona del municipio y avisa al resto (B3 Task 49)"`.

**Terminado cuando:** con 38 °C en Getafe, Carmen (mayor) recibe «Ahora no: mejor a las 21:00» y en «Sorpréndeme» una alternativa cubierta; con 36 °C no hay día de calor; los demás perfiles ven solo «Día de calor en tu zona».

---

### Task 50: B3-4 · Destinos deportivos de OSM filtrado en `normalize/sports.py`

**Rol:** Datos · **Servicio:** `app/ingest/` · **Depende de:** nada (paralela a 47–49) · **Duración:** 1 h

**Ficheros:** Modificar `app/ingest/normalize/sports.py`. Crear `app/ingest/tests/test_osm_sports.py`, `app/ingest/tests/data/osm_sports_sample.osm` (XML OSM pequeño que pyosmium lee directamente).

**Interfaces:**
- Consume: `common.RAW`, `normalize.normalizer`; pyosmium (`osmium`, extra `routing` de `pyproject.toml`, ya declarado).
- Produce: `osm_sport_tags(tags: dict[str, str]) -> list[str] | None` — lista de deportes (`sport=*` separado por `;`, sin espacios, minúsculas) si el elemento entra, `None` si no:
  - `leisure` ∈ {`sports_centre`, `stadium`} con `sport` **y** `name`;
  - `leisure=pitch` con algún `sport` ∈ {`tennis`, `basketball`, `padel`} y (`name` o `access` ∈ {`yes`, `public`}); solo se conservan esos tres deportes;
  - `leisure=swimming_pool` con `name` o `access=public`, y nunca `access=private`; deportes = `["swimming"]`.
- Produce: `osm_default_name(tags) -> str` — `name` si lo hay; si no: `"Pista de tenis (OpenStreetMap)"`, `"Pista de baloncesto (OpenStreetMap)"`, `"Pista de pádel (OpenStreetMap)"` (primer deporte de la pista), `"Piscina (OpenStreetMap)"`.
- Produce: `osm_sports(pbf: pathlib.Path) -> geopandas.GeoDataFrame` con `COLUMNS` de `sports.py`: `id` = `"osm:" + tipo + "/" + id` (`osm:node/1`, `osm:way/2`, `osm:relation/3`, como `route_poi`), `source = "osm_sport"`, `source_id` = `tipo/id`, `type = "facility"`, `name`, `sports`, `facility_type` = valor de `leisure`, `covered` (`True` si `covered`/`indoor` = `yes`; `False` si `leisure=pitch`; si no, nulo), `ine_code` nulo (lo pone `assign_municipality`), geometría = punto (nodo) o centroide de la vía / multipolígono, EPSG:4326. Nodos y vías con `SimpleHandler.apply_file(locations=True)`; relaciones multipolígono por `area()` solo si `not a.from_way()`.
- Cambio en `run()`: `parts.append(osm_sports(RAW / "osm" / "madrid-latest.osm.pbf"))` si el fichero existe (si no, aviso por consola y se sigue); `alldest["id"]` solo se rellena con `source:source_id` donde venga vacío.

- [ ] **Paso 1: prueba que falla** — `osm_sports_sample.osm` con: un `sports_centre` con nombre y `sport=swimming;tennis` (vía cerrada), un `sports_centre` sin nombre, una `pitch` de tenis sin nombre ni acceso, una `pitch` de baloncesto con `access=public` sin nombre, una `pitch` de fútbol con nombre, una `swimming_pool` sin nombre, una `swimming_pool` con nombre y `access=private`, una `swimming_pool` con nombre (nodo), y un multipolígono `stadium` con `sport=athletics` y nombre. `test_osm_sports.py`:

```python
@pytest.mark.parametrize("tags,expected", [
    ({"leisure": "sports_centre", "sport": "swimming;tennis", "name": "Forus"}, ["swimming", "tennis"]),
    ({"leisure": "sports_centre", "sport": "tennis"}, None),
    ({"leisure": "pitch", "sport": "tennis"}, None),
    ({"leisure": "pitch", "sport": "basketball", "access": "public"}, ["basketball"]),
    ({"leisure": "pitch", "sport": "soccer", "name": "Campo"}, None),
    ({"leisure": "swimming_pool"}, None),
    ({"leisure": "swimming_pool", "name": "Piscina comunitaria", "access": "private"}, None),
    ({"leisure": "swimming_pool", "access": "public"}, ["swimming"]),
])
def test_osm_filter_rules(tags, expected):
    assert osm_sport_tags(tags) == expected

def test_osm_sports_reads_sample():
    g = osm_sports(SAMPLE)
    assert set(g["id"]) == {"osm:way/1", "osm:way/4", "osm:node/8", "osm:relation/9"}
    assert (g["source"] == "osm_sport").all() and g.crs.to_epsg() == 4326
    assert g.set_index("id").loc["osm:way/4", "name"] == "Pista de baloncesto (OpenStreetMap)"
    assert g.set_index("id").loc["osm:way/4", "covered"] == False
```

- [ ] **Paso 2:** `app/ingest/.venv/Scripts/python -m pytest tests/test_osm_sports.py -q` — Esperado: FAIL (`osm_sport_tags` no existe).
- [ ] **Paso 3:** implementar en `sports.py`.
- [ ] **Paso 4:** misma orden — Esperado: PASS; `app/ingest/.venv/Scripts/python -m pytest -q` sin fallos nuevos.
- [ ] **Paso 5: commit** — `git commit -m "Datos: destinos deportivos de OSM filtrado (centros con nombre, pistas y piscinas públicas) (B3 Task 50)"`.

**Terminado cuando:** `python -m normalize destination_raw` incluye filas `osm_sport` sin piscinas privadas ni sin nombre (salvo `access=public`).

---

### Task 51: B3-5 · Reglas `source: osm_sport` en `activities.yaml` y prueba de Getafe

**Rol:** Datos · **Servicio:** `app/ingest/` · **Depende de:** Task 50 · **Duración:** 45 min

**Ficheros:** Modificar `app/config/activities.yaml`, `app/ingest/tests/test_osm_sports.py`, `docs/assets/requisitos_fuentes.json` (OSM `sport=*` como fuente de RF-04).

**Interfaces:**
- Consume: `osm_sports` (Task 50), `build_db.apply_activities(destinations, rules)` (sin cambios: la regla `sport` ya filtra por la lista `sports`).
- Produce: en `activities.yaml`, una regla por actividad con `suitability: 0.8` (criterio propio, por debajo de las fuentes oficiales): `swim` ← `{source: osm_sport, sport: swimming}`; `tennis` ← `tennis`; `basketball` ← `basketball`; `padel` ← `padel`; `football` ← `soccer`; `run` ← `athletics`; `gym` ← `fitness`. Comentario de cabecera: `osm_sport` = OSM filtrado (ODbL), decisión del 16/10.
- `build_db.py` no cambia (Ruling: `apply_activities` ya cubre la regla `sport`; la ficha citaba «su función en build_db.py»).

- [ ] **Paso 1: prueba que falla** — en `test_osm_sports.py`:

```python
def test_activity_rules_for_osm():
    acts = apply_activities(osm_sports(SAMPLE).assign(ine_code="28065"), load_activities())
    got = set(zip(acts["destination_id"], acts["activity"]))
    assert {("osm:way/1", "swim"), ("osm:way/1", "tennis"), ("osm:way/4", "basketball"),
            ("osm:node/8", "swim"), ("osm:relation/9", "run")} <= got
    assert set(acts["suitability"]) == {0.8}

@pytest.mark.slow
def test_getafe_has_swim_tennis_basketball():
    pbf = RAW / "osm" / "madrid-latest.osm.pbf"
    if not pbf.exists():
        pytest.skip("falta el extracto OSM")
    g = assign_municipality(osm_sports(pbf))
    getafe = g[g["ine_code"] == "28065"]
    acts = apply_activities(getafe, load_activities())
    assert {"swim", "tennis", "basketball"} <= set(acts["activity"])
    pools = getafe[getafe["facility_type"] == "swimming_pool"]
    assert (pools["access"] != "private").all()
    assert ((pools["name"] != "Piscina (OpenStreetMap)") | (pools["access"] == "public")).all()
```

(`osm_sports` devuelve además la columna `access`; `run()` la descarta al reindexar a `COLUMNS`.)

- [ ] **Paso 2:** `app/ingest/.venv/Scripts/python -m pytest tests/test_osm_sports.py -q` — Esperado: FAIL (no hay reglas `osm_sport`).
- [ ] **Paso 3:** añadir las reglas a `activities.yaml` y la fuente a `requisitos_fuentes.json` (RF-04).
- [ ] **Paso 4:** `app/ingest/.venv/Scripts/python -m pytest -q` y `app/api/.venv/Scripts/python -m pytest -q` (la API valida `activities.yaml` al arrancar) — Esperado: PASS; la `slow` de Getafe pasa si está el extracto OSM.
- [ ] **Paso 5: commit** — `git commit -m "Datos: reglas osm_sport en activities.yaml; Getafe con nadar, tenis y baloncesto (B3 Task 51)"`.

**Terminado cuando:** con el extracto OSM, Getafe tiene al menos un destino de nadar, tenis y baloncesto y ninguna piscina sin nombre ni privada; pendiente para B1: etiqueta `osm_sport` en `config/sources.yaml` (ODbL).

---

## Qué hay que desplegar (al fusionar)

`git pull` en la VM y, en `app/ingest`: `python -m normalize destination_raw` y `python -m build_db main` con el extracto OSM; reiniciar `api` (lee `rules.yaml` y `heat_zones.csv` al arrancar y en cada petición).
