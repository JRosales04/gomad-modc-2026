# Asistente F6, fase A (fila 4) — plan de implementación

> **Para agentes:** se ejecuta con superpowers:executing-plans. Pasos con casillas (`- [ ]`). Ledger: `.superpowers/sdd/asistente/progress.md`.

**Objetivo:** que `/assistant/interpret` convierta texto libre en `AssistantParams` (o una aclaración o un rechazo) con OCI Language + diccionario, y que `/assistant/route` devuelva una ruta saludable que pasa por los puntos pedidos, con cada condición comprobada por el motor y una explicación de plantillas (sin ruta circular, que es de la fila 5).

**Arquitectura:** `app/api/ai/` tiene el adaptador de OCI Language (`oci_language.py`, solo recibe el texto), las respuestas grabadas (`recorded.py`), las reglas del diccionario RF-21 (`dictionary.py`, puras) y el proveedor `RulesProvider` (`provider.py`), que implementa `AIProvider` (`interpret`, `write_up`). `services/assistant.py` elige los puntos de paso con `repo.map_points` (los más cercanos al origen), encadena tramos de ruta saludable con `routing.graph.shortest_path` y comprueba las condiciones. Todos los textos, palabras y umbrales viven en `app/config/assistant.yaml`.

**Tecnología:** Python 3.12, FastAPI, SDK `oci` (ya en `pyproject.toml`), pytest (OCI siempre simulado); React + Vitest en el front.

**Spec:** `docs/pendientes-app.md` §3 fila 4 y §4; CLAUDE.md §2, §6.3, §11 (DEC-03); RF-20 a RF-24.

## Restricciones globales

- Código en inglés; comentarios y docstrings en español sin tildes; textos para la persona con tildes (CLAUDE.md §2.1).
- A OCI solo va el texto de la persona: nunca la ubicación ni la petición de ruta (CLAUDE.md §2.8). Los logs no llevan ni el texto ni la ubicación.
- La IA interpreta y explica; el motor decide (CLAUDE.md §2.4). `written_by_ai = False` siempre (plantillas, DEC-03).
- Si OCI falla, tarda o no hay credenciales (`IA_PROVEEDOR` distinto de `oci_language`, falta `OCI_COMPARTMENT_ID` o el fichero de config) → solo diccionario, sin error para la persona.
- Ningún dato inventado: lo que el motor no puede comprobar sale como condición **no cumplida** con su motivo real.
- Valores en `app/config/assistant.yaml`; los que no tienen fuente oficial, con `own_criterion: true`.
- Sin cambio de contrato (`schemas.py` / `openapi.json`).
- Solo ficheros de la ficha: `app/api/ai/*`, `app/api/services/assistant.py`, las funciones `assistant_*` de `main.py` (y su dependencia), `app/config/assistant.yaml` (+ su fila en `app/config/README.md`), `app/frontend/src/data/assistant.ts`, lo mínimo de `Assistant.tsx`, pruebas. **No** se toca `routing/loop.py` ni la sección `loop:` de `routing.yaml` (fila 5).

## Decisiones (Rulings del plan)

- **R1 · Destino sin «pasar por»:** sin ruta circular, una ruta necesita un destino. Si la persona no pide pasar por ningún sitio (o no se encuentra ninguno de los pedidos), la ruta va al **parque más cercano** (`route.default_destination: park`) y la explicación lo dice. Coste si me equivoco: la persona esperaba otra cosa; lo ve escrito y puede elegir puntos.
- **R2 · Varios puntos de paso:** el más cercano de cada tipo pedido dentro de `route.search_radius_m`, ordenados por vecino más cercano desde el origen, encadenados con la ruta saludable. La ruta es solo de ida y acaba en el último. Coste: con puntos en direcciones opuestas la ruta da un rodeo.
- **R3 · Condiciones que el motor no puede cumplir todavía:** «Circular» → no cumplida («la ruta circular todavía no está disponible»); distancia o duración objetivo → se compara honestamente con la ruta real (±10 %, `route.tolerance`) y, si no cae, no cumplida con el aviso de que el ajuste por distancia aún no existe; «Evitar cuestas» → no cumplida, «sin datos de desnivel» (fila 6); «Supermercado» → no cumplido, «sin datos de supermercados cargados» (no hay supermercados en `route_poi` ni en `destination`, comprobado el 18/10). Coste: más «No cumple» en la demo hasta que entren las filas 5 y 6.
- **R4 · Punto de enganche de la fila 5:** `services/assistant.py:plan_loop(graph, origin_node, target_m, waypoint_nodes, costs) -> list[int] | None` (lista de tramos del grafo), que hoy devuelve `None`. El servicio lo llama si `params.loop` o hay distancia/duración objetivo; con `None` sigue con la ruta de ida (R2/R3). La fila 5 solo cambia el cuerpo de `plan_loop` para llamar a `routing/loop.py`.
- **R5 · Qué aporta OCI Language:** las frases clave y los textos de entidades se buscan en el diccionario igual que el texto (se suman), y las entidades de cantidad (`interpret.quantity_entity_types`) se leen antes que el texto para distancia y duración. Language no detecta «fuentes» (fila 4): la búsqueda directa del diccionario en el texto va siempre. Coste: si Language no aporta nada, el resultado es el del diccionario solo (igual que sin credenciales).
- **R6 · Respuestas grabadas:** `ai/recorded.py` guarda el análisis real de OCI (entidades y frases) de las frases de la demo; si OCI no responde y el texto normalizado coincide, se usa el grabado. Se graba en la Task 64 con una llamada real (solo texto).
- **R7 · Evitar tráfico:** cumplida si los metros junto a tráfico (`traffic_m`, umbral de `routing.yaml`) son ≤ `route.avoid_traffic_max_share` (10 %, criterio propio) del recorrido; con «evitar tráfico» la ruta usa `route.avoid_traffic_weights` (tráfico 1,0). Coste: umbral sin fuente oficial (marcado).

## Review Focus

1. **OCI lanza excepción o tarda** → la interpretación sale del diccionario, 200, sin texto de error. → Task 60 `test_oci_failure_falls_back_to_dictionary`.
2. **Texto con consejo médico aunque pida una ruta** («15 km con la rodilla operada») → rechazo, nunca parámetros. → Task 58 `test_medical_wins_over_route`.
3. **«parque infantil»** no debe marcar «parque» además de «juegos»; **«sin cuestas»** → `avoid`, **«con cuestas»** → nada. → Task 58 `test_multiword_and_negations`.
4. **Origen fuera de la red / sin ningún punto cerca** → ruta aproximada (línea recta) o 422 legible, nunca 500. → Task 61 `test_no_network_is_approximate`, Task 62 `test_route_without_destination_is_422`.
5. **La ubicación no llega a OCI ni a los logs** → Task 62 `test_interpret_sends_only_text_and_logs_nothing`.

---

### Task 58: Diccionario RF-21 y reglas de interpretación

**Rol:** Motor · **Servicio:** `app/api`

**Files:**
- Create: `app/config/assistant.yaml` (secciones `interpret`, `messages`; `route` y `templates` en tareas siguientes), fila en `app/config/README.md`
- Create: `app/api/ai/dictionary.py`
- Test: `app/api/tests/ai/test_dictionary.py`

**Interfaces:**
- Produces: `Analysis` (dataclass en `ai/dictionary.py`): `entities: list[tuple[str, str]]` (texto, tipo), `phrases: list[str]`; `normalize(text: str) -> str` (minúsculas, sin tildes, espacios simples); `interpret_text(text: str, analysis: Analysis | None, cfg: dict) -> s.InterpretResponse`; `validate_assistant_config(cfg: dict) -> None` (ValueError si faltan secciones o un tipo de `pass_by`/`avoid` no es del contrato).

Reglas (en este orden): médico → `rejection` (`messages.medical`); fuera de catálogo (otra actividad: nadar, bici…) → `rejection` (`messages.out_of_catalog`); correr y caminar a la vez → `clarification` (`messages.which_activity`); sin distancia ni duración → `clarification` (`messages.missing_amount`); distancia > 42 km o duración > 480 min → `clarification` (`messages.too_long`). Palabras: coincidencia por inicio de palabra sobre el texto normalizado, de la más larga a la más corta, y cada tramo de texto solo cuenta una vez. Negación: una palabra de `interpret.negations` hasta `interpret.negation_window` palabras antes → la palabra de `avoid` cuenta y la de `pass_by` no; sin negación, las de `avoid` solo cuentan si están en `interpret.avoid_direct` («llano»). Cantidades: regex de número + unidad de `interpret.distance_units` / `interpret.duration_units` (factor a km / min) y frases fijas `interpret.duration_phrases` («media hora»: 30). Solo ida: `interpret.one_way`.

- [ ] **Step 1: Write the failing tests** (`cfg = settings.load("assistant")`)
  - `test_example_phrase`: «15 km andando, por un parque, con fuentes y bancos y que pase por un supermercado» → `params == AssistantParams(activity="walk", distance_km=15, loop=True, pass_by=["park","fountain","bench","supermarket"], avoid=[])` (orden del contrato), `clarification is None and rejection is None`.
  - `test_run_duration_and_one_way`: «quiero correr 45 minutos, solo ida, sin tráfico» → `activity="run", duration_min=45, distance_km=None, loop=False, avoid=["traffic"]`; «media hora caminando» → `duration_min=30`; «2 horas» + «pasear» → 120; «800 m» → `distance_km=0.8`.
  - `test_multiword_and_negations`: «5 km por un parque infantil» → `pass_by=["playground"]`; «5 km sin cuestas» → `avoid=["hills"]`; «5 km con cuestas» → `avoid=[]`; «5 km sin pasar por supermercado» → `pass_by=[]`; «5 km por llano» → `avoid=["hills"]`; «5 km con mi perro» → `pass_by=["dog_area"]`.
  - `test_medical_wins_over_route`: «15 km con la rodilla operada», «¿Puedo correr con la tensión alta?» → `rejection` contiene «no da consejo médico», `params is None`.
  - `test_out_of_catalog`: «10 km en bici» → `rejection` con «caminar o correr».
  - `test_ambiguous_asks`: «quiero dar un paseo» → `clarification` con «¿Qué distancia o cuánto tiempo»; «correr o caminar 5 km» → `clarification` de actividad; «60 km andando» → `clarification` de máximo.
  - `test_analysis_adds_phrases_and_quantities`: texto «ruta tranquila» con `Analysis(entities=[("10 km","QUANTITY")], phrases=["parque"])` → `distance_km=10, pass_by=["park"]`.
  - `test_config_is_valid`: `validate_assistant_config(cfg)` no lanza; con `pass_by: {castle: [...]}` lanza `ValueError`.
- [ ] **Step 2: Run** `pytest tests/ai/test_dictionary.py -q` · Esperado: FAIL (módulo no existe).
- [ ] **Step 3: Implement** `assistant.yaml` (`interpret`, `messages`, `own_criterion: true`) y `ai/dictionary.py`.
- [ ] **Step 4: Run** `pytest tests/ai/test_dictionary.py -q` · Esperado: PASS.
- [ ] **Step 5: Commit** «Asistente: diccionario RF-21 e interpretacion por reglas (Task 58)».

**Terminado cuando:** las 8 pruebas pasan y ningún texto ni palabra está en el código.

### Task 59: Adaptador de OCI Language y respuestas grabadas

**Rol:** Motor · **Servicio:** `app/api`

**Files:**
- Create: `app/api/ai/oci_language.py`, `app/api/ai/recorded.py`
- Modify: `app/config/assistant.yaml` (sección `oci`: `timeout_s`, `language_code`)
- Test: `app/api/tests/ai/test_oci_language.py`

**Interfaces:**
- Consumes: `Analysis`, `normalize` (Task 58).
- Produces: `OciLanguage(client, compartment_id: str, language_code: str)` con `analyze(text: str) -> Analysis` (llama a `batch_detect_language_entities` y `batch_detect_language_key_phrases` con un único `TextDocument` con **solo** el texto); `from_env(env: Mapping[str, str], cfg: dict) -> OciLanguage | None` (None si `IA_PROVEEDOR != "oci_language"`, falta `OCI_COMPARTMENT_ID` o el fichero de config no existe; crea `AIServiceLanguageClient` con `timeout=(cfg.timeout_s, cfg.timeout_s)` y `retry_strategy=NoneRetryStrategy()`; nunca registra claves); `RECORDED: dict[str, Analysis]`; `recorded(text: str) -> Analysis | None` (por `normalize`).

- [ ] **Step 1: Write the failing tests** (cliente falso que guarda los `details` recibidos)
  - `test_analyze_sends_only_text`: `analyze("15 km por un parque")` → los dos `details` llevan `documents` de longitud 1 con `text == "15 km por un parque"`, `language_code == "es"`, y el compartimento; devuelve `Analysis(entities=[("15 km","QUANTITY")], phrases=["parque"])` del cliente falso.
  - `test_from_env_without_credentials`: `from_env({}, cfg) is None`; `from_env({"IA_PROVEEDOR":"oci_language","OCI_COMPARTMENT_ID":"x","OCI_CONFIG_FILE":str(tmp_path/"no")}, cfg) is None`; `IA_PROVEEDOR="otro"` → None.
  - `test_recorded_by_normalized_text`: `recorded("15 KM andando, por un parque, con fuentes y bancos y que pase por un supermercado ")` no es None; `recorded("otra cosa") is None`.
- [ ] **Step 2: Run** `pytest tests/ai/test_oci_language.py -q` · Esperado: FAIL.
- [ ] **Step 3: Implement** ambos módulos (la grabación provisional del ejemplo se sustituye por la real en la Task 64).
- [ ] **Step 4: Run** · Esperado: PASS.
- [ ] **Step 5: Commit** «Asistente: adaptador de OCI Language y respuestas grabadas (Task 59)».

**Terminado cuando:** ninguna prueba abre red y `from_env` nunca lanza por falta de credenciales.

### Task 60: Proveedor de reglas (`interpret` + `write_up`)

**Rol:** Motor · **Servicio:** `app/api`

**Files:**
- Create: `app/api/ai/provider.py`
- Modify: `app/config/assistant.yaml` (sección `templates`)
- Test: `app/api/tests/ai/test_provider.py`

**Interfaces:**
- Consumes: `interpret_text`, `Analysis` (58), `OciLanguage`, `recorded` (59), `AIProvider` y `Condition` (`ai/base.py`, `schemas`).
- Produces: `RulesProvider(cfg: dict, language: OciLanguage | None = None)` con `interpret(text) -> s.InterpretResponse` (análisis de OCI; si lanza cualquier excepción o no hay `language` → `recorded(text)` → `None`; luego `interpret_text`) y `write_up(conditions: list[s.Condition], route_summary: str) -> str` con `templates`: `"{summary}. Cumple {met} de {total} condiciones."` + `" No cumple: {failed}."` si hay alguna (nombres en minúscula unidos por «, » e «y»); sin condiciones solo `"{summary}."`; `build_provider(cfg: dict, env: Mapping[str, str]) -> RulesProvider`.

- [ ] **Step 1: Write the failing tests**
  - `test_uses_oci_analysis`: language falso que devuelve `phrases=["parque"]` para «ruta de 5 km» → `pass_by == ["park"]`.
  - `test_oci_failure_falls_back_to_dictionary`: language falso que lanza `RuntimeError` → para el ejemplo de 15 km sale `distance_km == 15` y `"fountain" in pass_by`, sin excepción.
  - `test_write_up_templates`: con `[Condition("Pasar por: parque", True, "…"), Condition("Circular", False, "…")]` y resumen «2,4 km, 30 min a pie» → `"2,4 km, 30 min a pie. Cumple 1 de 2 condiciones. No cumple: circular."`; `isinstance(RulesProvider(cfg), AIProvider)` vía `typing.runtime_checkable` no se exige: se comprueba que tiene `interpret` y `write_up`.
- [ ] **Step 2: Run** · Esperado: FAIL.
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** `pytest tests/ai -q` · Esperado: PASS.
- [ ] **Step 5: Commit** «Asistente: proveedor de reglas con OCI y plantillas (Task 60)».

### Task 61: Servicio `/assistant/route` sin ruta circular

**Rol:** Rutas · **Servicio:** `app/api`

**Files:**
- Create: `app/api/services/assistant.py`
- Modify: `app/config/assistant.yaml` (sección `route`: `search_radius_m: 2000`, `default_destination: park`, `tolerance: 0.10`, `avoid_traffic_max_share: 0.10`, `avoid_traffic_weights`, `destination_kinds` (park → destino `park`), `poi_kinds` (fountain, bench, dog_area, playground → `route_poi`), `no_data` (supermarket), `labels` y textos de condiciones)
- Test: `app/api/tests/services/test_assistant.py` (datos `mini_data` con grafo)

**Interfaces:**
- Consumes: `repo.map_points(bbox, destination_kinds, poi_kinds, limit, pool_activity)`, `graphs.locate`, `routing.graph.edge_costs/shortest_path/summarize`, `services.route.path_coordinates/PoiIndex`, `engine.explanation.route_description`, `RulesProvider.write_up`.
- Produces: `class NoDestination(Exception)`; `plan_loop(graph, origin_node: int, target_m: float | None, waypoint_nodes: list[int], costs) -> list[int] | None` (hoy `None`; R4); `assistant_route(req: s.AssistantRouteRequest, repo, graphs, provider) -> s.AssistantRouteResponse`.

Condiciones, en este orden: distancia (o duración) objetivo si la hay; «Circular» o «Solo ida»; una por cada `pass_by`; una por cada `avoid`. `route.kind = "healthy"`, `written_by_ai = False`.

- [ ] **Step 1: Write the failing tests**
  - `test_passes_by_nearest_park`: origen = `ORIGIN`, `pass_by=["park"]`, `loop=False`, `distance_km=None, duration_min=30` → la geometría acaba en el nodo de «Parque Uno»/duplicado más cercano, la condición «Pasar por: parque» cumplida con su nombre en `detail`, `written_by_ai is False`, `route.kind == "healthy"`.
  - `test_fountain_and_bench_checked_on_route`: `pass_by=["fountain","bench"]` → ambas cumplidas (la fuente operativa y el banco están junto al tramo verde); la fuente `working=false` no se elige.
  - `test_unavailable_conditions_are_honest`: `loop=True, distance_km=5, pass_by=["supermarket"], avoid=["hills"]` → «Circular», distancia de 5 km, supermercado y cuestas **no cumplidas**, cada `detail` con su motivo («todavía no está disponible», «sin datos de supermercados», «sin datos de desnivel»); la ruta va al parque más cercano (R1) y la explicación lo dice.
  - `test_avoid_traffic`: `avoid=["traffic"]` con destino «Parque Uno» → la ruta va por el parque (220 m), `traffic_m == 0`, condición cumplida.
  - `test_plan_loop_hook_is_used`: con `monkeypatch.setattr(assistant, "plan_loop", lambda *a: [1, 2, 3, 0])` y `loop=True` → la ruta usa esos tramos y la condición «Circular» se cumple (vuelve al origen).
  - `test_no_network_is_approximate`: `GraphStore()` vacío → `route.approximate is True`, 200 lógico (sin excepción).
  - `test_nothing_nearby_raises`: origen en Patones con `GraphStore()` → `NoDestination`.
- [ ] **Step 2: Run** `pytest tests/services/test_assistant.py -q` · Esperado: FAIL.
- [ ] **Step 3: Implement** el servicio.
- [ ] **Step 4: Run** · Esperado: PASS.
- [ ] **Step 5: Commit** «Asistente: ruta saludable con puntos de paso y condiciones del motor (Task 61)».

**Terminado cuando:** toda condición sale de datos del grafo o de `route_poi`/`destination`, y lo que no se puede comprobar sale «no cumplida» con motivo.

### Task 62: Endpoints `assistant_*`

**Rol:** Motor · **Servicio:** `app/api`

**Files:**
- Modify: `app/api/main.py` (`get_assistant`, `assistant_interpret`, `assistant_route`; validación de `assistant.yaml` en `lifespan`, una línea)
- Test: `app/api/tests/test_assistant_endpoints.py`

**Interfaces:**
- Consumes: `build_provider` (60), `assistant_route`, `NoDestination` (61).
- Produces: `get_assistant(request) -> RulesProvider` (de `app.state.assistant` o creado una vez con `os.environ`), `POST /assistant/interpret` → 200 `InterpretResponse`; `POST /assistant/route` → 200 `AssistantRouteResponse`, `NoDestination` → 422, `DataUnavailable` → 503.

- [ ] **Step 1: Write the failing tests** (`app.dependency_overrides[get_assistant]` con un `RulesProvider` cuyo language falso registra las llamadas)
  - `test_interpret_endpoint`: el ejemplo → 200, `params.distance_km == 15`.
  - `test_interpret_sends_only_text_and_logs_nothing`: el language falso recibe exactamente el texto; en `caplog` aparece `POST /assistant/interpret 200` y no aparece el texto.
  - `test_route_endpoint_mini`: datos mini con grafo, `pass_by=["park"]` → 200, `written_by_ai is False`, `conditions` no vacío; en `caplog` no aparecen las coordenadas.
  - `test_route_without_destination_is_422`: origen en Patones → 422 con `detail` legible.
- [ ] **Step 2: Run** · Esperado: FAIL (501).
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** `pytest -q -m "not slow"` · Esperado: todo PASS (incluido `test_contract.py` sin cambios en `openapi.json`).
- [ ] **Step 5: Commit** «Asistente: endpoints /assistant/interpret y /assistant/route (Task 62)».

### Task 63: Front conectado a la API

**Rol:** Front · **Servicio:** `app/frontend`

**Files:**
- Modify: `app/frontend/src/data/assistant.ts`, `app/frontend/src/components/Assistant.tsx` (solo quitar el aviso fijo), `app/frontend/src/test/Assistant.test.tsx`, `app/frontend/src/test/data.test.ts`

**Interfaces:**
- Produces: `interpret(text)` → `postJson<InterpretResponse>("/assistant/interpret", { text })`; `assistantRoute(req)` → `postJson<AssistantRouteResponse>("/assistant/route", req)`; en `sampleDataMode()` siguen los mocks.

- [ ] **Step 1: Write the failing tests**
  - `Assistant.test.tsx`: se sustituye «avisa de que sus respuestas todavía son de ejemplo» por «no muestra el aviso de respuestas de ejemplo» (`queryByText(/Respuestas de ejemplo/)` es null) y se añade «si interpretar falla, muestra el error» (`vi.spyOn(assistantApi, "interpret").mockRejectedValueOnce(...)` → «No se pudo interpretar ahora. Rellena los campos a mano.»).
  - `data.test.ts`: con `vi.stubEnv("MODE", "production")` y `fetch` simulado, `interpret("5 km")` hace POST a `/api/assistant/interpret` con cuerpo `{"text":"5 km"}` y `assistantRoute(req)` a `/api/assistant/route` con el `req`.
- [ ] **Step 2: Run** `npm test` · Esperado: FAIL en las pruebas nuevas.
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** `npm test && npm run build && npm run lint` · Esperado: verde.
- [ ] **Step 5: Commit** «Front: asistente conectado a /api/assistant (Task 63)».

### Task 64: Comprobación con datos reales y OCI real, grabaciones y cierre

**Rol:** Motor · **Servicio:** `app/api`

**Files:**
- Modify: `app/api/ai/recorded.py` (análisis reales de OCI de las frases de la demo)
- Create: `app/api/tests/test_assistant_real.py` (prueba `slow` con el grafo regional: Getafe, `pass_by=["park","fountain"]`, < 5 s)

- [ ] **Step 1:** Llamada real a OCI con las frases de la demo (solo texto) → copiar entidades y frases a `RECORDED`; `pytest tests/ai -q` · Esperado: PASS.
- [ ] **Step 2:** Prueba `slow` con datos reales (`GOMAD_DATA_DIR` del checkout principal), una vez · Esperado: 200, < 5 s, condiciones con datos.
- [ ] **Step 3:** `pytest -q -m "not slow"`, `npm test`, `npm run build`, `npm run lint`; `git fetch && git rebase origin/main`; repetir pruebas · Esperado: verde; `git status` limpio.
- [ ] **Step 4: Commit** «Asistente: respuestas grabadas reales y prueba con el grafo regional (Task 64)».
