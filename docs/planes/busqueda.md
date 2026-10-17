# Corrección C1 «Filtro de búsqueda» — plan de implementación (Tasks 130–133)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Pasos con casillas (`- [ ]`). Ledger: `.superpowers/sdd/busqueda/progress.md`.

**Objetivo:** que `GET /location?text=…` devuelva varios candidatos ordenados (primero municipios, después calles y direcciones) y acepte texto parcial (prefijos, palabras sueltas, sin tildes ni mayúsculas), sin perder la dirección con número ni el buscador remoto de Nomecalles, y en < 1 s.

**Arquitectura:** `Geocoder` (en `app/api/geocoding.py`) carga una vez en memoria un índice de viales (los 48.676 viales distintos de `clean/addresses.parquet`, con su nombre llano y el del municipio) y busca en él por prefijo de palabra en Python. Cada palabra de la consulta debe ser prefijo de una palabra del nombre del vial o de su municipio, y al menos una debe estar en el nombre del vial («mayor geta» → Calle Mayor de Getafe; «calle alcala» no lista todas las calles de Alcalá de Henares). Los municipios cuyas palabras empiezan por todas las de la consulta van primero; si el texto lleva número de portal o nombra un municipio junto a una calle, las calles van primero y el municipio queda como respaldo al final (como hoy). Los portales del vial elegido se siguen leyendo con DuckDB solo para los viales que entran en la lista. Los topes salen de `app/config/location.yaml`.

**Tech stack:** Python 3.12, DuckDB, pyarrow, FastAPI, pytest.

**Spec:** ficha C1 del encargo (17/10, no está en `docs/pendientes-app.md`); RF-01, D-04; CLAUDE.md §2.

## Global Constraints

- Contrato sin cambios: `LocationResponse{candidates: [LocationCandidate]}`, `precision ∈ {address, street, municipality}`; `schemas.py` y `openapi.json` no se tocan.
- El front ya muestra la lista de candidatos (`LocationPicker.tsx`, una `<ul>` de botones): **no se toca**.
- `main.py`: solo la función `location` (y, si hace falta, una línea en `lifespan`).
- Topes y longitudes mínimas en `app/config/location.yaml` (criterio propio, `own_criterion: true`), nunca en el código.
- El texto de búsqueda nunca va a los logs; al buscador remoto solo va cuando el local no encuentra el vial (como hoy).
- Código en inglés; comentarios y docstrings en español sin tildes; textos visibles con tildes.
- Latencia objetivo < 1 s por búsqueda con `app/data/clean/addresses.parquet` real (carga del índice aparte, una vez).

## Review Focus

1. **Palabra muy corta o vacía de sentido** («calle de», «av 3»): sin palabras útiles no debe listar miles de calles ni fallar → `test_location_short_words_need_whole_word` (Task 131).
2. **Prefijo que coincide con muchos municipios** («san»): los municipios no pueden ocupar toda la lista; quedan huecos para calles → `test_location_municipalities_capped` (Task 132).
3. **El nombre de un municipio es también el de una calle** («calle madrid 10» sin municipio): no devolver solo el centro de Madrid → `test_location_municipality_name_as_street_with_type_or_number` (Task 132).
4. **Errata en la calle con el remoto caído**: se mantiene el respaldo del municipio → pruebas existentes `test_location_nomecalles_*` siguen en verde (Task 131).
5. **Sin `addresses.parquet`** (equipo nuevo): solo municipios, sin error → `test_location_without_addresses_only_municipalities` (Task 131).

---

### Task 130: topes de la búsqueda en `app/config/location.yaml`

**Rol:** Motor · **Servicio:** api

**Files:**
- Create: `app/config/location.yaml`
- Modify: `app/config/README.md` (una fila), `app/api/geocoding.py` (`MAX_CANDIDATES` fuera)
- Test: `app/api/tests/test_location.py`

**Interfaces:**
- Produces: `location.yaml` con `own_criterion: true`, `max_candidates: 8`, `max_municipalities: 5`, `min_prefix_len: 3`. `Geocoder.__init__(data_dir, client=None, ttl_s=3600, timeout_s=3.0, config=None)`: `config=None` → `settings.load("location")`; guarda `self.max_candidates`, `self.max_municipalities`, `self.min_prefix_len`.

- [ ] **Step 1:** prueba `test_location_config_limits`: `settings.load("location")` tiene las tres claves enteras > 0 y `own_criterion is True`; `Geocoder(data, config={"max_candidates": 2, "max_municipalities": 1, "min_prefix_len": 3}).search("las rozas")` devuelve 2 candidatos.
- [ ] **Step 2:** `cd app/api && .venv/bin/pytest tests/test_location.py -q -k config` → Esperado: FAIL (no existe `location.yaml` / `config` inesperado).
- [ ] **Step 3:** crear el YAML, la fila del README y leer los topes en `Geocoder`.
- [ ] **Step 4:** `.venv/bin/pytest tests/test_location.py -q` → Esperado: todo PASS.
- [ ] **Step 5: commit** `Motor: topes de /location en config/location.yaml (Task 130)`.

**Terminado cuando:** no queda `MAX_CANDIDATES` en `geocoding.py` y las pruebas de `/location` pasan.

### Task 131: índice de viales en memoria y búsqueda por prefijo

**Rol:** Motor · **Servicio:** api

**Files:**
- Modify: `app/api/geocoding.py` (`_local`, nuevo `_streets`, `STREET_TYPES` → `TYPE_ALIASES`)
- Test: `app/api/tests/test_location.py` (fixture que añade viales al `addresses.parquet` de `build_mini_data`, sin tocar `mini_data.py`)

**Interfaces:**
- Consumes: topes de la Task 130.
- Produces: `TYPE_ALIASES: dict[str, str]` (lo escrito → tipo llano de los datos: `calle|c|cl → calle`, `avenida|avda|av → avda`, `plaza|pza|pl → plaza`, `camino|cmno → cmno`, `carretera|ctra → ctra`, `paseo|po → paseo`, … `canada|cnada → cnada`); `STREET_TYPES = set(TYPE_ALIASES)`. `Geocoder._streets() -> list[tuple]` (una tupla por vial: `ine_code, municipality, street_code, street_type, street, street_norm, " "+street_norm, " "+municipio llano`, cargada una vez). `Geocoder._local(words, number, muni, typed_type=None) -> list[dict]`.
- Regla de coincidencia: palabra con `len >= min_prefix_len` → prefijo de una palabra (`" " + w in " " + texto`); más corta → palabra completa. Todas las palabras en vial ∪ municipio, al menos una en el vial; con `muni`, solo viales de ese `ine_code`.
- Orden de viales: (1) nombre cubierto (todas las palabras del vial, sin `STOP_WORDS`, emparejadas), (2) menos palabras emparejadas solo por prefijo, (3) tipo escrito igual al del vial (sin tipo escrito, «Calle» primero), (4) nombre más corto, (5) municipio. Se resuelven (`_resolve_street`) solo los `max_candidates` primeros.

- [ ] **Step 1: pruebas que fallan** (fixture `data` amplía el callejero con: Getafe «Calle Mayor» y «Plaza Mayor»; Madrid «Calle de Toledo» y «Calle Getafe»; Leganés «Calle Toledo»):
  - `test_location_street_prefix`: `search("constitu getafe")[0]["label"] == "Calle de la Constitución, Getafe"`.
  - `test_location_street_and_partial_municipality`: `search("mayor geta")[0]["label"] == "Calle Mayor, Getafe"` (no «Plaza Mayor»: sin tipo escrito, «Calle» primero; con «plaza mayor geta», Plaza Mayor primero).
  - `test_location_typed_type_first`: `search("calle mayor getafe")[0]["label"] == "Calle Mayor, Getafe"` y `search("plaza mayor getafe")[0]["label"] == "Plaza Mayor, Getafe"`.
  - `test_location_short_words_need_whole_word`: `search("calle de")` no tiene `precision == "street"`.
  - `test_location_without_addresses_only_municipalities`: sin `addresses.parquet`, `search("getafe")` == solo el municipio.
- [ ] **Step 2:** `.venv/bin/pytest tests/test_location.py -q` → Esperado: FAIL en las nuevas (hoy «constitu» y «geta» con calle no encuentran nada).
- [ ] **Step 3:** implementar `_streets`, `_local` y `TYPE_ALIASES`; `search` pasa el tipo escrito (el primer token que esté en `TYPE_ALIASES`).
- [ ] **Step 4:** `.venv/bin/pytest tests/test_location.py -q` → Esperado: todo PASS (incluidas las existentes de número, errata con Nomecalles y remoto caído).
- [ ] **Step 5: commit** `Motor: /location busca calles por prefijo en un índice en memoria (Task 131)`.

**Terminado cuando:** pruebas verdes y la errata sigue yendo al remoto solo cuando el local no encuentra el vial.

### Task 132: varios candidatos, municipios primero

**Rol:** Motor · **Servicio:** api

**Files:**
- Modify: `app/api/geocoding.py` (`search`, nuevo `_municipalities_matching`)
- Test: `app/api/tests/test_location.py`

**Interfaces:**
- Produces: `Geocoder._municipalities_matching(words) -> list[tuple]`: municipios cuyas palabras (nombre llano, también sin artículo inicial) tienen todas las de `words` como prefijo; orden: nombre igual al texto, nombre que empieza por el texto, más corto; como mucho `max_municipalities`.
- Orden de `search`:
  - Sin número y sin calle aparte del municipio (el texto entero describe municipios: «getafe», «geta», «las rozas», «alcala»): municipios coincidentes primero, después viales cuyo nombre contiene esas palabras (en cualquier municipio).
  - Municipio nombrado + palabras de calle, o con número: viales primero y el municipio nombrado al final (respaldo, como hoy).
  - Municipio nombrado sin más palabras pero con tipo de vía o número («calle madrid 10»): el nombre se toma como calle en cualquier municipio (y los municipios coincidentes delante si no hay número).
  - Siempre sin duplicados y como mucho `max_candidates`.

- [ ] **Step 1: pruebas que fallan:**
  - `test_location_municipality_then_streets`: `search("getafe")` → `[0]` municipio Getafe y algún `street` con label «Calle Getafe, Madrid».
  - `test_location_partial_municipality_then_streets`: `search("geta")[0]["label"] == "Getafe"` y hay «Calle Getafe, Madrid».
  - `test_location_street_in_several_municipalities`: `search("calle toledo")` → dos `street` («Calle de Toledo, Madrid», «Calle Toledo, Leganés»), ninguno `municipality`; `search("toledo leganes")[0]` es el de Leganés.
  - `test_location_municipalities_capped`: con `max_municipalities: 1`, `search("madrid")` → un solo municipio y luego calles.
  - `test_location_municipality_name_as_street_with_type_or_number`: `search("calle getafe 2")` incluye «Calle Getafe 2, Madrid» con `precision == "address"`.
- [ ] **Step 2:** `.venv/bin/pytest tests/test_location.py -q` → Esperado: FAIL en las nuevas.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** `.venv/bin/pytest tests/test_location.py -q` → Esperado: todo PASS.
- [ ] **Step 5: commit** `Motor: /location devuelve municipios y después calles (Task 132)`.

**Terminado cuando:** pruebas verdes; `test_location_municipality_words_before_streets` y las de dirección siguen igual.

### Task 133: datos reales, latencia y documentación

**Rol:** Motor · **Servicio:** api

**Files:**
- Test: `app/api/tests/test_location.py` (pruebas `slow` con `app/data`)
- Modify: `CLAUDE.md` (una línea en §3.1 sobre `/location`)

- [ ] **Step 1:** pruebas `slow` (se saltan sin `clean/addresses.parquet`): `test_location_real_partial_and_order`: «geta» → `[0]` Getafe y > 1 candidato; «getafe» → > 1 candidato, `[0]` municipio; «mayor getafe» → `[0]` vial de Getafe con «Mayor» en el label; «calle toledo» → ≥ 3 municipios distintos; cada búsqueda < 1 s tras la primera (que carga el índice).
- [ ] **Step 2:** `.venv/bin/pytest tests/test_location.py -q` → Esperado: todo PASS. Medir con `/tmp/claude-1000/probe.py` y anotar antes/después en el ledger.
- [ ] **Step 3:** línea en CLAUDE.md §3.1; commit `Motor: pruebas reales y latencia de /location (Task 133)`.

**Terminado cuando:** `cd app/api && .venv/bin/pytest -q` en verde (salvo fallos ajenos documentados) y latencias anotadas.

---

## Arreglos del verificador (17/10, «APTO con observaciones»)

Un commit por arreglo, prefijo «Motor:» y «(verificador)» al final; pruebas en `app/api/tests/test_location.py`.

### Task 134: resultados de Nomecalles sin relación con el texto
- Prueba `test_location_remote_unrelated_discarded`: el remoto devuelve «Calle Madrid» para «zzqxw» → `[]`; la errata «calle madrd 10 getafe» sigue resolviendo `address`. `test_location_remote_timeout_from_config`: el `timeout` de la petición es `remote_timeout_s` de `location.yaml`.
- Regla: un vial remoto vale si alguna palabra del texto (sin tipo, número, palabras vacías ni el municipio nombrado) es prefijo de una palabra de su nombre o se le parece (`difflib`, razón ≥ `remote_min_similarity`, 0,8).
- `location.yaml`: `remote_timeout_s: 2.0`, `remote_min_similarity: 0.8`.

### Task 135: `location.yaml` ausente o incompleto → error claro al arrancar
- Prueba `test_location_config_missing_is_clear`: `config=None` con `settings.load("location") is None` → `ValueError("falta config/location.yaml")`; sin una clave → `ValueError` con «falta la clave max_candidates». El `Geocoder` se crea en `lifespan`, así que el error para el arranque.

### Task 136: desempate por población del municipio
- Prueba: con `clean/population.parquet` (último año), «calle toledo» → Madrid antes que Leganés; sin el fichero, población 0 (orden de antes).
- Orden de viales: (…, nombre corto, **población del municipio**, portales del vial, municipio).

### Task 137: filtrar por `ine_code` además de `street_code`
- `_local` y `_remote` leen los portales con `street_code IN (…) AND ine_code IN (…)`. Prueba: un vial con el mismo `street_code` en otro municipio no se mezcla.
