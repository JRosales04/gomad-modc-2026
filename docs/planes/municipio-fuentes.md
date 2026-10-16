# Plan del bloque B1 — Municipio y fuentes (F5, RF-17, RF-18, RF-19)

> **Para agentes:** este fichero empieza solo con la **división en tareas** (alcance, ficheros, pruebas clave). El ejecutor de cada lote (`docs/guia-ejecucion.md` §7) detalla primero **solo las Tasks de su lote** con `superpowers:writing-plans`, en este mismo fichero y debajo de su encabezado, con el formato de las Tasks 26–32 de `docs/plan-implementacion.md` (Rol, Servicio, Ficheros, Interfaces, pasos TDD con «Esperado:», commit, «Terminado cuando»). Después las ejecuta con `superpowers:executing-plans`. Su ledger es `.superpowers/sdd/municipio-fuentes/progress.md`.
>
> **No se puede cambiar** lo que fija esta división: alcance, ficheros «Es suyo» y pruebas clave. Si los datos reales obligan a cambiarlo, se registra un Ruling. El verificador compara con las dos cosas: la división (escrita antes de ejecutar) y el detalle.

**Spec:** ficha del **Bloque B1** en `docs/trabajo-paralelo.md` §3 (DEC-09 con los 14 indicadores, encaje RF-18, cambio de contrato, cifras corregidas) y §1 (ficheros compartidos), filas V-D1, S-M1 y S-D1 de `docs/plan-implementacion.md`, `docs/decisiones-pendientes.md` D-09, `docs/informe-datos.md` (trampas de datos).
**Fecha:** viernes 16/10/2026.

**Reglas comunes a todas las Tasks:**
- Antes de escribir el detalle, comprobar en los datos reales (`app/data/raw/`, `app/data/clean/*.parquet`, `app/data/perfil/perfil.json`) los nombres exactos de las columnas. No inventar campos (CLAUDE.md §2.5).
- Valores en `app/config/`, nunca en el código. Lo que no tenga fuente oficial lleva `own_criterion: true`.
- En los ficheros compartidos, solo el trozo propio (`main.py`: solo la función de su endpoint; `build_db.py` y `repository.py`: solo funciones y métodos nuevos; `src/data/*.ts`: solo las funciones de su endpoint).
- No se tocan `CLAUDE.md`, `docs/arquitectura.md` ni `docs/assets/requisitos_fuentes.json`: lo que haya que cambiar en ellos se dice en el informe y va en la PR de documentación.

---

## Lote LB1-1 · Datos (servicio `app/ingest/`) — Tasks 33, 34, 35

### Task 33: B1-D1 · Normalizador de servicios → `clean/service.parquet`
- **Alcance:** `app/ingest/normalize/services.py`, registrado en `normalize` como los demás. Una fila por servicio situado, en EPSG:4326, con `ine_code` de 5 dígitos:
  - `sanitarios`: una fila por **centro** (`centro_nro_registro` distintos); quedarse con el tipo para los indicadores («Centro de salud», «Consultorio de atención primaria»).
  - `farmacias`: coma decimal en las coordenadas.
  - `educativos`: solo `SITUACIÓN` = ALTA.
  - `atencion_social`: fuera los 177 «RESERVADO».
  - `desfibriladores`: municipio por **cruce espacial** con `municipality.geom` (no `municipio_codigo`), coma decimal.
  - EIEL `nucleos` (`CALIDADUMT`), solo si el indicador `good_3g_pct` lo lee de aquí (si no, en la Task 35).
  - Filtro de puntos fuera de la Comunidad y coordenadas a 0 (`common.filter_region`).
- **Es suyo:** `app/ingest/normalize/services.py`, `app/ingest/tests/test_services.py`.
- **Pruebas clave** (`slow` con datos reales): 429 centros de salud + consultorios en 179 municipios; educativos ALTA 3.906 en **156** municipios; 0 filas «RESERVADO»; DEA en **172** municipios por cruce espacial; ninguna coordenada fuera de la Comunidad. Más una prueba rápida con muestra pequeña: coma decimal → float.
- **Terminado cuando:** `python -m normalize services` escribe `clean/service.parquet` y las pruebas pasan sin saltarse.

### Task 34: B1-D2 · `app/config/indicators.yaml` y su validación
- **Alcance:** los **14 indicadores** de la tabla DEC-09 de la ficha B1 (`key`, `category`, `label`, `source`, `unit`, regla «sin filas» `zero` | `null`, `year`), y la sección `fit` del encaje RF-18 (`own_criterion: true`): qué indicador mira cada perfil y cada «Salgo con…» (`senior` → `health_centres` y `aed_per_1000`; `kids` → `schools`; `stroller` → `green_m2_per_inhabitant`; `dog` → áreas caninas de `route_poi`). Validación al cargar: claves obligatorias, `category` dentro de las del contrato (`Indicator.category` en `app/api/schemas.py`) y `key` sin repetir.
- **Es suyo:** `app/config/indicators.yaml`, `app/config/README.md` (una línea), la validación en `app/ingest/` (lee el YAML) y su prueba.
- **Pruebas clave:** el YAML real pasa la validación; un YAML con una categoría fuera del contrato o una clave repetida falla con un mensaje legible.
- **Terminado cuando:** existe `indicators.yaml` con los 14 indicadores y `fit`, y la validación está probada.

### Task 35: B1-D3 · Tabla `municipality_indicator` en `build_db.py`
- **Alcance:** una función **nueva** llamada desde `build_main` (sin cambiar las existentes) que calcula los 14 indicadores de `indicators.yaml` para los 179 municipios → `municipality_indicator(ine_code, category, key, value, unit, year, source)`. `value` es NULL cuando no hay datos: con regla `zero`, municipio sin filas = 0; con regla `null`, fuera de cobertura = NULL. Población de `clean/population.parquet`, año 2025. Paradas de bus, farmacias y DEA por cruce espacial (`nmc_busparadas` trae 209 códigos). `drove_roads_km`: comprobar que `NM_LONG` está en metros e ignorar los `CD_MUNI` `289xx`. `catalog_activities` sale de `destination_activity`.
- **Es suyo:** su función en `app/ingest/build_db.py` y su prueba.
- **Pruebas clave** (`slow`): 179 × 14 filas; **Patones** `sport_facilities` NULL (no 0); `green_m2_per_inhabitant` NULL en los municipios sin VPLA (Madrid incluido) y con valor en Getafe; `health_centres` suma 429; coberturas de la columna «Cobertura (16/10)» de la ficha. Más una prueba rápida con datos mínimos: la regla `zero` frente a `null`.
- **Terminado cuando:** `python -m build_db main` deja la tabla en `gomad.duckdb` y las pruebas pasan.

---

## Lote LB1-2 · API de municipio (servicio `app/api/`) — Tasks 36, 37

### Task 36: B1-M1 · `/municipality/{ine_code}` con indicadores
- **Alcance:** métodos **nuevos** en `repository.py` (indicadores de un municipio y su nombre), `services/municipality.py` y la función `municipality` de `main.py` (sustituye al 501). Indicadores agrupados por categoría con fuente y fecha (RF-19, de `source_date`). «Sin datos» explícito cuando `value` es NULL. **Sin ranking** ni comparación con otros municipios. Código inexistente → 404 con mensaje legible; sin `gomad.duckdb` → 503 (como `/recommend`).
- **Es suyo:** `app/api/services/municipality.py`, sus métodos en `repository.py`, la función `municipality` de `main.py`, `app/api/tests/test_municipality.py`, y datos de prueba en `tests/mini_data.py` (solo añadir).
- **Pruebas clave:** `test_municipality_179_respond` (`slow`), `test_municipality_missing_is_null`, `test_municipality_unknown_404`, y una sin base de datos → 503.
- **Terminado cuando:** los 179 códigos responden y el contrato actual no cambia.

### Task 37: B1-M2 · Encaje con preferencias (RF-18) y cambio de contrato
- **Alcance:** parámetros opcionales `activities`, `profile` y `companions` en `/municipality/{ine_code}`. El campo `fit` (`list[str]`, ya en el contrato) se rellena según la sección `fit` de `indicators.yaml`:
  - primera frase: «Cumple N de M», más «K sin datos» si los hay;
  - después, una frase por actividad («Pádel: sí, 4 sitios» / «Pádel: no hay en este municipio») y por perfil o acompañante;
  - perro: «Sí» o «Sin datos», nunca «No»;
  - NULL → «Sin datos»; nunca nota, orden ni percentil.

  Cambio de contrato como dice `docs/trabajo-paralelo.md` §1: `scripts/export_openapi.py`, `npm run contract` en `app/frontend`, `test_contract.py` en verde, y en el informe un aviso a los demás bloques.
- **Es suyo:** lo mismo que en la Task 36, más `app/api/schemas.py` (solo los parámetros nuevos), `app/frontend/src/api/openapi.json` y `schema.d.ts` (regenerados, no a mano).
- **Pruebas clave:** sin preferencias → `fit` vacío o solo «Cumple 0 de 0» (decidir y registrar un Ruling); actividad sin destinos → «no hay»; perro sin datos → «Sin datos»; ningún texto contiene posición, nota ni percentil; `test_contract.py`.
- **Terminado cuando:** el encaje sale con las tres entradas y el contrato está regenerado.

---

## Lote LB1-3 · Fuentes (servicio `app/api/`) — Task 38 (se puede lanzar en paralelo con LB1-1)

### Task 38: B1-M3 · `/sources` con licencia, URL y fechas
- **Alcance:**
  - `app/config/sources.yaml`: se amplía, sin perder `labels`. Para cada fuente que use la app: editor, licencia y URL. Licencias: CKAN de la Comunidad y del Ayuntamiento CC BY 4.0; IDEM y Nomecalles las de su portal (comprobarlas); OSM ODbL; AEMET su aviso legal; Sanidad para los umbrales de calor; BOE para el ICA.
  - `services/sources.py`: última recarga y último fallo de cada fuente, desde `manifest.json` y `source_date`.
  - La función `sources` de `main.py` (sustituye al 501).
- **Es suyo:** `app/config/sources.yaml`, `app/api/services/sources.py`, la función `sources` de `main.py`, `app/api/tests/test_sources.py`.
- **Pruebas clave:** `test_sources_all_have_license` (todas las fuentes usadas tienen licencia y URL); una fuente sin `manifest.json` sale con fecha nula y aviso, no 500; cada `DataSource.label` que devuelven `/recommend` y `/route` aparece en `/sources`.
- **Terminado cuando:** `/sources` lista todas las fuentes usadas con licencia, URL y fechas.

---

## Lote LB1-4 · Front (`app/frontend/`) — Task 39 (después de LB1-2 y LB1-3)

### Task 39: B1-F1 · Conectar municipio, lista de municipios y fuentes
- **Alcance:** solo `src/data/municipality.ts` y `src/data/sources.ts` (y lo mínimo de `src/data/` que haga falta). `getMunicipality` llama a `/api/municipality/{ine_code}` con las preferencias del perfil y `getSources` a `/api/sources`. `listMunicipalities` se decide con un Ruling: lista estática actual o de la API (P-09). En `MODE=test` siguen deterministas, sin red. En **un commit aparte**, quitar solo los textos «(ejemplo)» y «Cifras de ejemplo» de Municipio y Fuentes. Nada de diseño (es del bloque F).
- **Es suyo:** `app/frontend/src/data/municipality.ts`, `src/data/sources.ts`, sus pruebas y, solo para los textos de ejemplo, `Municipality.tsx` y `Sources.tsx`.
- **Pruebas clave:** `npm test`, `npm run lint` y `npm run build` en verde; error 404/503 → estado de error con «Reintentar»; sin llamadas de red en las pruebas.
- **Terminado cuando:** Municipio y Fuentes muestran datos reales en `npm run dev` con la API local.
