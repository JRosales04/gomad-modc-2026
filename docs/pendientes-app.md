# GoMad — documento de trabajo único (desde el 17/10/2026)

**Este es el único documento vigente para organizar el trabajo.** Contexto del proyecto (reto, reglas, fuentes, datos): `CLAUDE.md`. Detalle técnico si hace falta: `docs/arquitectura.md`. El resto (`docs/trabajo-paralelo.md`, `docs/guia-ejecucion.md`, `docs/plan-implementacion.md`, `docs/planes/*.md` ya ejecutados) es **histórico**: no se actualiza.

---

## 1. Estado (17/10/2026)

- **En producción:** https://example.com (VM de OCI, HTTPS, `main` en `76bb820`).
- **MVP F1–F5 completo:** 9 pantallas con mapa MapLibre; `/activities`, `/recommend` (nota, mejor hora, alternativa cubierta, calor por zona, lluvia, aire, explicación), `/route` (grafo de toda la Comunidad), `/location`, `/municipality` (14 indicadores y encaje), `/sources` (39 fuentes).
- **Datos en vivo:** previsión de **Open-Meteo** (179 municipios en 1 petición, cada hora, sin clave; AEMET eliminada, DEC-16) y aire medido (Comunidad + Ayuntamiento, últimas 4 h).
- **Sin hacer:** `/assistant/*` (501), `/conditions`, aire de horas futuras, desnivel, tráfico en vivo, polen y recarga automática de datos en la VM.

**Decisiones del 17/10:**
- La demo es **sobre la web, en modo móvil**; la presentación la prepara el equipo.
- El ensayo con personas queda al final, como pruebas. La demo sin red pasa a **secundaria**.
- El diseño del front se hace **directamente sobre `main`**, controlado con las pruebas.
- **Fuentes nuevas aprobadas:** Copernicus CAMS vía Open-Meteo (aire y polen previstos) y Red Palinológica de la Comunidad (`mediciones_polen`, `captadores_polen`). Se apuntan en `docs/assets/requisitos_fuentes.json` y CLAUDE.md §7 al implementarlas.
- Calor y ozono altos: **no se preparan escenarios**; si en octubre no se dan, se mencionan en la presentación.

---

## 2. Lo que falta

| # | Qué | Prioridad | Depende de |
|---|---|---|---|
| 1 | Recarga programada por fuente en la VM | 🔴 | — |
| 2 | Aire de las horas futuras con CAMS | 🔴 | — |
| 3 | `/conditions` + «Ahora en tu zona» | 🟠 | 2 |
| 4 | Asistente F6, fase A | 🔴 | 13 al desplegar |
| 5 | Ruta circular por distancia | 🟠 | 4 |
| 6 | Desnivel | 🟠 | — |
| 7 | Tráfico en tiempo real en la capital | 🟡 | — |
| 8 | Polen (medido + previsto) | 🟡 | 2 |
| 9 | Diseño del front | 🟠 | — |
| 12 | Caché ante caídas de todas las fuentes en vivo | 🟠 | 1, 7, 8 |
| 13 | `~/.oci` en la VM | 🔴 cuando entre 4 | 4 |
| 16 | CLAUDE.md al día | 🟡 | — |
| 17 | Limpieza de ramas en GitHub | 🟡 | — |

**Orden:** 1 + 2 y 4 a la vez → 6 y 9 → 3, 7 y 8 → 12 → 13 al desplegar el 4 → 16 y 17.
**Congelación de alcance:** domingo 18 a las 23:59. **Demo:** martes 20.

---

## 3. Ficha de cada fila

Cada ficha dice qué hacer y **qué ficheros son suyos**. Una fila no toca los ficheros de otra; en los compartidos, solo su trozo (§4).

### 1 · Recarga programada por fuente 🔴
- **Qué:** cron dentro de un servicio `ingest` en `app/deploy/docker-compose.yml` (reutiliza la imagen de `app/ingest/Dockerfile`). Cada fuente a su ritmo, según CLAUDE.md §6.4: referencia, mensual (EIEL, VPLA, padrón, callejero…); diario a las 04:00 (servicios, Nomecalles, Ayuntamiento); semanal (OSM y grafo regional). Solo descarga si la fuente cambió (ya lo hace `download_sources.py`); después normaliza lo afectado, `build_db` atómico y, si cambian `gomad.duckdb` o el grafo, reinicia la API (o la API recarga sola). Fallos registrados y visibles en `/sources` («último fallo»). El grafo regional pide ~4 GB: de madrugada.
- **Es suyo:** `app/ingest/jobs/`, el servicio `ingest` del compose, `app/ingest/scripts/init_data.sh` (si lo reutiliza), lo mínimo de `services/sources.py` para el último fallo.
- **Rama:** `datos/recarga` · Tasks desde la 80 en `docs/planes/recarga.md`.

### 2 · Aire de las horas futuras con CAMS 🔴
- **Qué:** previsión horaria de O₃, NO₂, PM10 y PM2.5 de Copernicus CAMS vía `https://air-quality-api.open-meteo.com/v1/air-quality` (varias coordenadas en una petición, sin clave, CC BY 4.0; comprobado el 16/10) → categoría ICA de cada hora futura con las bandas del BOE (`app/config/ica_thresholds.yaml`) → `/recommend` la usa para elegir la mejor hora. Hora actual: medición real; horas futuras: previsión, marcada como «previsto» en la explicación y en las fuentes. Al proveedor solo van los puntos de los 179 municipios (`app/config/forecast_points.csv`), nunca la ubicación de la persona.
- **Es suyo:** `app/api/live/` (feed nuevo, sin tocar `forecast.py` salvo lo imprescindible), `app/config/realtime.yaml` (sección nueva), el trozo de `services/recommend.py` que rellena el aire por hora, `sources.yaml` (fuente nueva), `requisitos_fuentes.json` y CLAUDE.md §7.
- **Rama:** `motor/aire-previsto` · Tasks desde la 90 en `docs/planes/aire-previsto.md`.

### 3 · `/conditions` + «Ahora en tu zona» 🟠
- **Qué:** `GET /conditions/{ine_code}`: temperatura, sensación térmica, probabilidad de lluvia y aire de la hora actual del municipio, con fuente y hora. **Cambia el contrato** (§4). En el front, las pastillas de Inicio dejan de pedir una recomendación entera y usan este endpoint; opcionalmente también en Municipio.
- **Es suyo:** `app/api/services/conditions.py`, la función `conditions` de `main.py`, el contrato (`schemas.py`, `openapi.json`, `schema.d.ts`), `src/data/conditions.ts`, lo mínimo de `Home.tsx`.
- **Rama:** `motor/conditions` · Tasks desde la 100.

### 4 · Asistente F6, fase A 🔴
- **Qué:** `/assistant/interpret`: entidades y frases clave de OCI Language + búsqueda directa de las palabras del catálogo RF-21 (Language no detecta «fuentes») + negaciones («sin cuestas» → `avoid`) → `AssistantParams` validado; ambiguo → `clarification`; consejo médico o fuera de catálogo → `rejection`; **nunca envía ubicación a OCI**; si OCI falla, solo diccionario. `/assistant/route` (sin ruta circular): ruta saludable que pasa por el punto pedido más cercano; comprueba cada condición con el motor (`Condition`) y redacta con plantillas; `written_by_ai=False`; respuestas grabadas en `app/api/ai/recorded.py`. Front: `interpret` y `assistantRoute` de `src/data/assistant.ts` llaman a la API. Diseño de referencia: CLAUDE.md §6.3 y §11 (DEC-03).
- **Es suyo:** `app/api/ai/*`, `app/api/services/assistant.py`, las funciones `assistant_*` de `main.py`, `src/data/assistant.ts`.
- **Rama:** `motor/asistente` · Tasks 58–64 en `docs/planes/asistente.md`.

### 5 · Ruta circular por distancia 🟠
- **Qué:** RF-22: puntos de paso a ≈ objetivo/3 encadenados con la ruta saludable, ±10 %; si no se alcanza, la más cercana con aviso. La usa el asistente.
- **Es suyo:** `app/api/routing/loop.py` y su uso en `services/assistant.py`.
- **Rama:** la del 4 o `motor/ruta-circular`.

### 6 · Desnivel 🟠
- **Qué:** MDT05 del IGN por WCS (`Elevacion25830_5`, teselas de ≤ 4096 px; CLAUDE.md §7.1), `rasterio` en `app/ingest/pyproject.toml`, altura por nodo y pendiente por tramo (en tramos largos o suavizada: alturas en metros enteros), peso `hills` en `routing.yaml`, condición «evitar cuestas», desnivel en el resumen de ruta (RF-13). Sin altura → «sin datos de desnivel». Se reconstruye el grafo regional (~4 GB de RAM).
- **Es suyo:** `app/ingest/graph.py`, `app/ingest/pyproject.toml`, `app/api/routing/graph.py` (solo añadir), `app/config/routing.yaml`, el resumen de ruta en `services/route.py`.
- **Rama:** `rutas/desnivel` · Tasks 56–57 en `docs/planes/regional.md`.

### 7 · Tráfico en tiempo real en la capital 🟡
- **Qué:** sensores `https://informo.madrid.es/informo/tmadrid/pm.xml` (cada 5 min; `st_x`, `st_y` en UTM) → tramos del grafo de la capital → `/route` usa la carga real en vez de la estimada por tipo de vía; caché corta (5–15 min) y respaldo por tipo de vía.
- **Es suyo:** `app/ingest/traffic.py` (asignación sensor → tramo), un feed en `app/api/live/`, el trozo de `services/route.py` que elige el tráfico de cada tramo.
- **Rama:** `motor/trafico` · Tasks 44–45 en `docs/planes/tiempo-real.md`.

### 8 · Polen 🟡
- **Qué:** medido (CKAN de la Comunidad, `mediciones_polen`, diario, CC BY; captadores en `captadores_polen`) y previsto (CAMS vía Open-Meteo, la misma API del 2: olivo, gramíneas, abedul…). Aviso para el perfil sensible y, si encaja, en «Ahora en tu zona».
- **Es suyo:** fuente nueva en `download_sources.py` y su normalizador, un feed en `app/api/live/`, `sources.yaml`, `requisitos_fuentes.json` y CLAUDE.md §7.
- **Rama:** `datos/polen` · Tasks desde la 110.

### 9 · Diseño del front 🟠
- **Qué:** acabado visual de las 9 pantallas, escritorio y móvil; iconos; textos.
- **Cómo:** directamente sobre `main`. Antes de cada push: `cd app/frontend && npm test && npm run build && npm run lint` en verde. No tocar `src/data/`, `src/api/` ni la lógica de datos.
- **Para trabajar sin backend local:** `GOMAD_API=https://example.com npm run dev` (§6).

### 12 · Caché ante caídas 🟠
- Si una fuente en vivo cae (aire, tráfico, polen), la API sigue con el último dato válido dentro de su `max_age` y avisa con la hora real; pasado ese tiempo, «sin datos». La previsión de Open-Meteo ya lo hace (`data/live/forecast.json`); falta el resto.
- **Es suyo:** `app/api/live/` (los feeds de aire, tráfico y polen) y `app/config/realtime.yaml`.

### 13 · `~/.oci` en la VM 🔴 (cuando entre el 4)
- Copiar `~/.oci` del PC a la VM (por `scp`, nunca por git), montarlo en solo lectura en el servicio `api` de `docker-compose.yml`, poner las variables `OCI_*` en `app/.env` de la VM y reiniciar la API.

### 16 · CLAUDE.md al día 🟡
- §1 (estado), §6 (la barra dice «Preferencias», no «Perfil»), §10 (fechas). Cada fila actualiza CLAUDE.md §7 si añade una fuente.

### 17 · Limpieza de GitHub 🟡
- Borrar las ramas ya fusionadas y activar en GitHub Settings → General → «Automatically delete head branches».

---

## 4. Reglas de trabajo

1. **Una fila = una rama = una conversación**, que sale de `main` actualizado y entra por PR. Excepción: el diseño (fila 9), directamente sobre `main`.
2. **Cada fila toca solo sus ficheros** («Es suyo»). Si necesita uno de otra, para y avisa.
3. **El plan de cada fila va en su propio fichero**, `docs/planes/<fila>.md`, con su rango de Tasks; su ledger es `.superpowers/sdd/<fila>/progress.md`.
4. **Ficheros compartidos:** solo el trozo propio y con cambios pequeños. Antes de la PR: `git fetch && git rebase origin/main`.

| Fichero compartido | Regla |
|---|---|
| `app/api/main.py` | Solo la función del endpoint propio (y, si hace falta, una línea en `lifespan`) |
| `app/api/schemas.py` + `openapi.json` | **El contrato.** Una fila a la vez; si cambia: `scripts/export_openapi.py`, `npm run contract`, `test_contract.py` y avisar |
| `app/ingest/build_db.py`, `app/api/repository.py` | Añadir funciones y métodos; no cambiar los existentes |
| `app/deploy/docker-compose.yml` | Solo la fila 1 (servicio `ingest`) y la 13 (`~/.oci`) |
| `app/config/*.yaml` | Cada fila solo su sección |
| `app/frontend/src/data/*.ts` | Los de backend, solo la función de su endpoint |
| `app/frontend/src/components/*.tsx` | Del diseño (fila 9); los de backend, solo lo mínimo y avisando |
| `CLAUDE.md`, `docs/assets/requisitos_fuentes.json` | Cambios mínimos al final de cada fila (fuente nueva → §7 y JSON) |

5. **Valores en `app/config/`, nunca en el código.** Lo que no tenga fuente oficial lleva `own_criterion: true`.
6. **Privacidad:** la ubicación de la persona nunca sale hacia terceros ni va a los logs; a los proveedores solo van los puntos de los 179 municipios.
7. **Nadie trabaja en la VM:** solo se despliega en ella (§6).

---

## 5. Cómo lanzar y verificar una fila

**Ejecutor**, en una conversación nueva (cambiar lo que va entre `<…>`):

```
FILA=<4>   RAMA=<motor/asistente>   BASE=main   PLAN=<docs/planes/asistente.md>   TASKS=<58–64>

Lee docs/pendientes-app.md (§3 la ficha de tu FILA, §4 reglas) y CLAUDE.md §2.
1) superpowers:writing-plans: escribe en PLAN las Tasks de tu fila, numeradas en TASKS (Rol, Servicio,
   Ficheros, Interfaces, pasos TDD con «Esperado:», commit, «Terminado cuando»). Commit «Plan: fila <n> (Tasks …)».
2) superpowers:executing-plans con PLAN (ledger del PLAN).
Reglas: rama RAMA desde BASE actualizada; solo los ficheros «Es suyo» de tu ficha; en los compartidos, solo
tu trozo (§4); no cambies el contrato salvo imprescindible; valores en app/config/; sin push, sin merge, sin
PR; no te conectes a la VM. No leas docs/plan-implementacion.md entero (~340 KB). Redirige salidas largas a un
fichero y lee el final. Revisión final tú mismo, sin subagente.
Al terminar: pruebas de cada servicio tocado, `git fetch && git rebase origin/main`, pruebas otra vez, e
informe (estado por Task, commits, pruebas con salida real, Rulings, qué hay que desplegar y cómo).
```

**Verificador**, en otra conversación nueva: `docs/prompt_task_checker.md` con `TAREAS={<rango>}`, `RAMA`, `BASE=main`, añadiendo: «El plan está en PLAN, no en docs/plan-implementacion.md, y lo escribió la misma sesión que lo ejecutó: compáralo también con la ficha de la fila en docs/pendientes-app.md. Comprueba que la rama solo toca los ficheros de esa ficha». Para filas pequeñas, basta con revisar las pruebas y el diff.

---

## 6. Despliegue y datos

**Desplegar después de fusionar** (desde un PC con la clave de la VM):
```bash
ssh -i ~/.ssh/gomad-oci.key ubuntu@YOUR_SERVER_IP "cd ~/GoMad && GOMAD_URL=https://example.com app/deploy/deploy.sh"
```

**Si la fila cambia datos** (`gomad.duckdb`, `graph/`, `clean/`), mientras no esté la fila 1: regenerarlos en un PC y copiarlos.
1. Regenerar, desde `app/ingest`: `.venv/bin/python -m normalize`, luego `.venv/bin/python -m build_db all`, y `.venv/bin/python graph.py all` si cambia el grafo.
2. Copiar a la VM y reiniciar la API:
```bash
rsync -az -e "ssh -i ~/.ssh/gomad-oci.key" ~/GoMad/app/data/{gomad.duckdb,realtime.duckdb,graph,clean} ubuntu@YOUR_SERVER_IP:~/GoMad/app/data/ && ssh -i ~/.ssh/gomad-oci.key ubuntu@YOUR_SERVER_IP "cd ~/GoMad && docker compose -f app/deploy/docker-compose.yml restart api"
```

**Comprobar:** `curl -s https://example.com/api/health` → `{"status":"ok"}`; y en el móvil, una búsqueda.

**Equipo nuevo, datos sin instalar Python** (desde `app/`, ~8 min, Docker con ≥ 6 GB de RAM):
```bash
docker compose -f deploy/docker-compose.init.yml run --rm ingest
```

**Front contra la API de la VM, sin backend local** (desde `app/frontend`):
```bash
GOMAD_API=https://example.com npm run dev
```

**Acceso a la VM para otra persona:** genera su propia clave (`ssh-keygen -t ed25519 -f ~/.ssh/gomad_vm`) y pasa **solo la pública**; se añade en la VM a `~/.ssh/authorized_keys`. Nunca se comparte la clave privada.

**Copias de seguridad en la VM:** `~/gomad-data-bak-*.tgz` (datos) y `~/env-backup-*` (`app/.env`).
