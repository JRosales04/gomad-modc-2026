# Fila 5 · Ruta circular por distancia, RF-22 (Tasks 180–184)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Ledger: `.superpowers/sdd/ruta-circular/progress.md`.

**Goal:** `app/api/routing/loop.py`: ruta por distancia objetivo (±10 %), circular o de ida, con puntos de paso opcionales, encadenando tramos de la ruta saludable de F3; si no cumple la tolerancia lo dice (flag + aviso) y devuelve la más cercana.

**Architecture:** por petición se recorta un **subgrafo local** alrededor del origen (Dijkstra acotado por longitud, `bounded_distances`): un bucle de longitud L nunca se aleja más de L/2 del origen, así que el recorte no pierde rutas válidas y cada Dijkstra posterior es barato aunque el grafo cargado sea el regional. Sobre el subgrafo, con el coste saludable `edge_costs` (el mismo de `/route`): se encadenan tramos origen → puntos pedidos → punto(s) automáticos → (origen si es circular). Los puntos automáticos se eligen por distancia de red (longitud) ≈ objetivo/3 y rumbo; cada tramo penaliza los tramos ya usados (evita ir y volver por la misma calle). Varios intentos (reescalado por la relación real/estimada y giro del rumbo) con presupuesto de tiempo; gana el más cercano al objetivo. Sin aleatoriedad: misma entrada, misma ruta.

**Tech:** numpy, scipy.sparse.csgraph (`dijkstra` con predecesores), igraph no se usa en el bucle; sin dependencias nuevas.

**Spec:** ficha FILA 5 de `docs/pendientes-app.md` §3 y prompt del 18/10; CLAUDE.md §6.3 (paso 2) y RF-22; RNF ruta < 5 s.

## Global Constraints
- Código en inglés; comentarios y docstrings en español sin tildes; textos de usuario en español con tildes. Commits `Motor: …`.
- Es suyo: `app/api/routing/loop.py`, `app/api/tests/routing/test_loop*.py`, sección nueva `loop:` de `app/config/routing.yaml`. No se tocan `main.py`, `schemas.py`, `openapi.json`, `services/assistant.py`, `app/api/ai/*` ni el front. En `routing/graph.py` solo añadir.
- Valores en `app/config/routing.yaml` → `loop:`; tolerancia 0,10 (RF-22); el resto `own_criterion: true`.
- La ubicación del usuario no va a logs (loop.py no registra nada).
- Ruta < 5 s sobre el grafo real (presupuesto de intentos en config, por debajo).

## Review Focus
1. Origen en una red pequeña o un callejón (pocos candidatos) → devuelve lo mejor con `within_tolerance=False` y aviso, sin excepción (Task 181, `test_small_component_returns_best_with_flag`).
2. Punto pedido en otra componente / inalcanzable → `RouteNotFound` (la integración cae a la línea recta como `/route`) (Task 182, `test_unreachable_waypoint_raises`).
3. Puntos pedidos que ya suman más que el objetivo → ruta por ellos, `within_tolerance=False`, aviso (Task 182, `test_waypoints_longer_than_target_flagged`).
4. Objetivo no positivo → `ValueError` (Task 181, `test_invalid_target`).
5. Presupuesto de tiempo agotado → devuelve el mejor intento hasta entonces (Task 181, `test_time_budget_returns_best`).

---

### Task 180: configuración `loop:` y subgrafo local con camino saludable

**Files:** Modify `app/config/routing.yaml` (sección `loop:`); Create `app/api/routing/loop.py`; Test `app/api/tests/routing/test_loop.py`.

**Interfaces:**
- Consumes: `routing.graph.Graph`, `bounded_distances(g, origin, limit_m)`, `RouteNotFound`.
- Produces: `Subgraph(g, origin: int, radius_m: float, costs: np.ndarray)` con `.contains(node) -> bool`, `.length_from(node: int) -> np.ndarray` (distancias por longitud a todos los nodos globales, `inf` fuera), `.path(a: int, b: int, used: set[int], penalty: float) -> list[int]` (ids globales de tramo, en orden, por el coste saludable multiplicando por `penalty` los tramos de `used`; `RouteNotFound` si no hay camino).
- Config: `loop: {tolerance: 0.10, leg_fraction: 0.333, candidate_tolerance: 0.05, initial_scale: 1.1, turn_deg: 60, bearing_step_deg: 90, initial_bearing_deg: 0, max_attempts: 8, rescales_per_direction: 2, reuse_penalty: 3.0, radius_margin: 1.2, time_budget_s: 3.0, own_criterion: true}`.

Fixture `grid` (en el test): rejilla 21 × 21 nodos a 100 m (≈ 0,0009° de lat), tramos `footway` de 100 m, una columna central verde (`green_pct=1`, resto 0) y un par de tramos `traffic=1`; dos nodos sueltos en otra componente; parquet en `tmp_path` y `load_graph`, como en `test_routing.py`.

- [ ] Step 1: pruebas:
  - `test_loop_config`: `settings.load("routing")["loop"]["tolerance"] == 0.10` y `own_criterion is True`.
  - `test_subgraph_radius`: nodo central, radio 300 m → `contains` del vecino a 300 m True y del de 400 m False; `length_from(centro)[vecino a 3 tramos] == 300`.
  - `test_subgraph_path_prefers_healthy`: entre dos nodos de la misma fila a ambos lados de un tramo con tráfico, con `edge_costs` de pesos `{traffic: 1}` el camino evita ese tramo y es más largo que la recta; los tramos devueltos son contiguos y van de a a b.
  - `test_subgraph_path_penalizes_used`: con `used` = tramos del camino directo y `penalty` 3, el camino nuevo no repite ninguno.
  - `test_subgraph_path_unreachable`: hacia un nodo de la otra componente → `RouteNotFound`.
- [ ] Step 2: `pytest tests/routing/test_loop.py` → Esperado: FAIL (no existe `routing.loop`).
- [ ] Step 3: implementar `Subgraph`: nodos con `bounded_distances(g, origin, radius_m)` finito; tramos con los dos extremos dentro; un par (a, b) por tramo duplicado (el de menor coste, guardando su id global; el de menor longitud para `length_from`); CSR simétrico; el coste penalizado se rehace sobre los mismos `indices/indptr` (permutación calculada una vez); el par → tramo por `searchsorted` de la clave `a * n + b`. Coste mínimo `> 0` (scipy ignora pesos 0).
- [ ] Step 4: `pytest tests/routing/test_loop.py` → Esperado: PASS.
- [ ] Step 5: commit `Motor: subgrafo local y configuracion de la ruta circular (Task 180)`.

**Terminado cuando:** las 5 pruebas pasan y `test_routing.py` sigue en verde.

### Task 181: ruta circular sin puntos pedidos (`loop_route`)

**Files:** Modify `app/api/routing/loop.py`; Test `app/api/tests/routing/test_loop.py`.

**Interfaces:**
- Consumes: `Subgraph` (Task 180), `edge_costs`, `summarize(g, edges, traffic_threshold)`, `services.route.path_coordinates(g, origin_node, edges)`.
- Produces:
  - `@dataclass Waypoint(node: int, lon: float, lat: float, requested: bool)`.
  - `@dataclass LoopRoute(edges: list[int], coordinates: list[list[float]], length_m: float, target_m: float, within_tolerance: bool, deviation_pct: float, waypoints: list[Waypoint], summary: dict, warning: str | None, attempts: int)`; `summary` = salida de `summarize` (`distance_m, green_pct, traffic_m, fountains, benches, aeds`); `length_m` = tramos + `snap_m` (× 2 si es circular).
  - `loop_route(g, origin: int, target_m: float, costs: np.ndarray, cfg: dict, *, loop: bool = True, waypoints: Sequence[int] = (), snap_m: float = 0.0, traffic_threshold: float = 0.5, clock=time.perf_counter) -> LoopRoute`.

Algoritmo (lo que la firma no decide):
```
radius = target*(1+tol)/2 (circular) o target*(1+tol) (ida), ampliado a radius_margin * distancia del punto pedido mas lejano
para cada intento i < max_attempts y mientras clock()-t0 < time_budget_s:
    rumbo = initial_bearing + (i // rescales_per_direction) * bearing_step
    anclas = origen + pedidos (tramos saludables encadenados, penalizando lo usado)
    libres: circular sin pedidos -> A (longitud desde origen ~ target*leg_fraction/scale, rumbo) y luego X;
            resto -> X si queda distancia (> tol*target)
    X: circular -> d_ancla[X] + d_origen[X] ~ restante/scale; ida -> d_ancla[X] ~ restante/scale;
       preferencia por rumbo = rumbo de la ultima ancla + turn_deg (o el del intento si la ancla es el origen)
    candidato: |estimada - buscada| <= candidate_tolerance * buscada, el de rumbo mas parecido; si no hay, el de estimada mas cercana
    scale = (longitud real de los tramos libres) / (estimada)  -> para el siguiente intento
    se queda el intento de menor |longitud - objetivo|; si cumple la tolerancia, termina
```
Aviso (`warning`, español con tildes) solo si no cumple: «No se ha encontrado una ruta de {objetivo} km dentro del ±10 %: la más cercana mide {real} km.» (km con coma decimal, una cifra).

- [ ] Step 1: pruebas (rejilla de Task 180, coste `edge_costs(g, {traffic: .5, green: .5, fountains: .2}, .5)`, `cfg = settings.load("routing")["loop"]`):
  - `test_loop_within_tolerance`: origen en el centro, 3000 m → `within_tolerance`, `abs(length_m-3000) <= 300`, `edges` contiguos y el último acaba en el origen, 2 `waypoints` con `requested=False`.
  - `test_loop_coordinates_closed`: `coordinates[0] == coordinates[-1]` y `len >= 4`.
  - `test_loop_summary_matches`: `summary == summarize(g, edges, 0.5)`; `length_m == summary["distance_m"] + 2 * snap_m` con `snap_m=12`.
  - `test_loop_deterministic`: dos llamadas iguales → mismos `edges`.
  - `test_small_component_returns_best_with_flag`: origen en la componente de 2 nodos, 3000 m → no lanza, `within_tolerance is False`, `warning` contiene «más cercana».
  - `test_invalid_target`: `target_m=0` → `ValueError`.
  - `test_time_budget_returns_best`: `clock` falso que avanza `time_budget_s` en cada llamada y objetivo 3000 → `attempts == 1` y devuelve ruta.
- [ ] Step 2: Esperado: FAIL (`loop_route` no existe).
- [ ] Step 3: implementar `loop_route` (circular sin pedidos) con el algoritmo de arriba.
- [ ] Step 4: Esperado: PASS (las de Task 180 también).
- [ ] Step 5: commit `Motor: ruta circular por distancia objetivo (Task 181)`.

**Terminado cuando:** las 7 pruebas pasan.

### Task 182: ruta de ida y puntos de paso pedidos

**Files:** Modify `app/api/routing/loop.py`; Test `app/api/tests/routing/test_loop.py`.

**Interfaces:** `loop_route(..., loop=False)` y `loop_route(..., waypoints=[nodo, ...])` de Task 181 (sin cambios de firma).

- [ ] Step 1: pruebas:
  - `test_one_way_within_tolerance`: 1500 m, `loop=False` → cumple, el último nodo no es el origen, 1 punto automático.
  - `test_loop_through_requested_waypoint`: punto pedido a 500 m del centro, 3000 m circular → cumple, la ruta pasa por ese nodo, `waypoints[0].requested is True` y le sigue uno automático.
  - `test_one_way_ends_beyond_requested`: ida, 1500 m, punto pedido a 500 m → pasa por él y cumple.
  - `test_waypoints_longer_than_target_flagged`: punto pedido en una esquina (≈ 2 km por red) y objetivo circular 1000 m → pasa por él, `within_tolerance is False`, `warning` no vacío, sin puntos automáticos.
  - `test_unreachable_waypoint_raises`: punto pedido en la otra componente → `RouteNotFound`.
- [ ] Step 2: Esperado: FAIL en las que dependen de pedidos/ida.
- [ ] Step 3: completar `loop_route` (anclas pedidas en el orden dado; restante ≤ tol·objetivo → sin punto libre).
- [ ] Step 4: Esperado: PASS (todo `test_loop.py`).
- [ ] Step 5: commit `Motor: ruta de ida y puntos de paso pedidos (Task 182)`.

**Terminado cuando:** todo `test_loop.py` pasa.

### Task 183: latencia sobre el grafo real

**Files:** Create `app/api/tests/routing/test_loop_latency.py` (slow).

- [ ] Step 1: prueba `slow` (se salta sin grafo; usa `DATA_DIR/graph/<getafe|madrid|region>`, la primera que exista; en el PC solo hay `region`): orígenes fijos Getafe (−3,7319, 40,3057) y Madrid (−3,7038, 40,4168), objetivos 5 km y 15 km circulares + 5 km de ida; `nearest_node`, `edge_costs` con `default_route_weights`, `loop_route`; imprime tiempo, longitud y `within_tolerance`; asserts: tiempo < 5 s cada una y `abs(desviación) <= 10 %` o `warning` presente (nunca finge).
- [ ] Step 2: ejecutarla una vez (`GOMAD_DATA_DIR=…/app/data pytest -m slow tests/routing/test_loop_latency.py -s`) → Esperado: PASS; anotar tiempos en el ledger. Si pasa de 5 s: bajar `time_budget_s`/`max_attempts` en config (Ruling).
- [ ] Step 3: commit `Motor: latencia de la ruta circular en el grafo real (Task 183)`.

**Terminado cuando:** medido y < 5 s en las seis combinaciones.

### Task 184: interfaz documentada, suite completa y rebase

**Files:** Modify `app/api/routing/loop.py` (docstring del módulo).

- [ ] Step 1: docstring del módulo con la interfaz pública exacta (`loop_route`, parámetros, `LoopRoute`, `Waypoint`, excepciones) y cómo integrarla (nodo de origen con `GraphStore.locate`, `costs = edge_costs(...)`, `cfg = settings.load("routing")["loop"]`, `snap_m`).
- [ ] Step 2: `pytest` completo de `app/api` → Esperado: verde salvo fallos ya existentes en main (anotarlos).
- [ ] Step 3: `git fetch && git rebase origin/main`, `pytest` otra vez; `git status` limpio.
- [ ] Step 4: commit `Motor: interfaz de la ruta circular documentada (Task 184)`.

**Terminado cuando:** suite verde (o solo fallos previos), rama rebasada, ledger cerrado.
