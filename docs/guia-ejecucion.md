# Guía de ejecución del plan — GoMad (14–20/10/2026)

Hoja de ruta **operativa** para ir ejecutando `docs/plan-implementacion.md` paso a paso con Claude Code. El plan dice *qué* hay que construir; esta guía dice **en qué orden lanzarlo, con qué prompt, qué necesita cada paso y cómo saber que ha salido bien**.

- **Actualizada:** miércoles 14/10/2026, 18:45 (Tasks 5 y 8 fusionadas).
- **Prompts que usa:** `docs/prompt_task_executer.md` (ejecutar) y `docs/prompt_task_checker.md` (verificar). En ambos solo se cambia la primera línea.

---

## 1. Cómo funciona

### Tipos de paso

| Tipo | Quién | Qué es | Con qué |
|---|---|---|---|
| **EJECUTAR** | Claude, en una conversación nueva | Implementa una o varias tareas del plan con TDD, en su propia rama, y para | `docs/prompt_task_executer.md` → skill `superpowers:executing-plans` |
| **VERIFICAR** | Claude, en **otra** conversación nueva | Revisa, solo lectura, que la ejecución cumple el plan; da veredicto ✅ / ⚠️ / ❌ | `docs/prompt_task_checker.md` |
| **MANUAL** | Una persona | Lo que Claude no puede o no debe hacer: instalar con `sudo`, claves, nube, maquetadora | Terminal, consola de OCI, etc. |
| **DECISIÓN** | El equipo | Valores que el código no decide (pesos, umbrales, actividades…) | Se apuntan en `CLAUDE.md` §11 y se vuelcan en `app/config/*.yaml` |
| **FUSIONAR** | Una persona (o Claude si se lo pides) | PR de la rama a `main` en GitHub tras un ✅ | GitHub |

### El ciclo de cada lote

```
1. git switch main && git pull           ← partir siempre de main actualizado
2. EJECUTAR   (conversación nueva)       ← prompt_task_executer.md con TAREAS, RAMA, MANUALES_HECHOS
3. VERIFICAR  (otra conversación nueva)  ← prompt_task_checker.md con las mismas TAREAS y RAMA
4. ¿✅ o ⚠️ aceptable?  → PR a main y fusionar  → siguiente lote
   ¿❌ o 🔴?            → pasar los hallazgos a una conversación de EJECUTAR («corrige esto en la rama X»)
                          y volver a VERIFICAR
```

**Por qué dos conversaciones:** quien ejecuta no se revisa bien a sí mismo. El verificador empieza en limpio, vuelve a ejecutar las pruebas y compara con el plan, no con lo que el ejecutor dice que hizo.

### Valores de los prompts

- **`TAREAS`**: números de `### Task N:` del plan, p. ej. `{5}` o `{12,13,14}`.
- **`RAMA`**: nombre nuevo para la ejecución (tabla de abajo). En el verificador, **la misma** que creó la ejecución (`git branch` si dudas).
- **`BASE`**: `main`.
- **`MANUALES_HECHOS`** (solo ejecutor): los pasos `[manual]` que ya has hecho, p. ej. `{Task 5 paso 1: Docker instalado}`; si ninguno, `{ninguno}`.

### Reglas de git del equipo
- Nadie trabaja directamente en `main`: cada lote en su rama y entra por PR.
- Antes de crear una rama: `git switch main && git pull --ff-only`.
- Tras fusionar: borrar la rama (`git branch -d RAMA && git push origin --delete RAMA`).
- `app/data/`, `app/.env` y los `.venv/` no se suben nunca.

---

## 2. Estado actual (14/10, tarde)

| Tarea | Estado | Dónde |
|---|---|---|
| Task 1 — estructura por servicios, dependencias, renombrado | ✅ fusionada | PR #1 |
| Task 2 — descarga por niveles, cambios, OSM, callejero | ✅ fusionada | PR #2 |
| Task 3 — AEMET en el script | ✅ fusionada | PR #2 |
| Task 4 — AEMET verificado con la clave | ✅ fusionada | PR #2 |
| Task 8 — red peatonal de OSM medida (pyosmium; pyrosm no compila en 3.12) | ✅ fusionada | PR #3 |
| Task 5 — Docker Compose (api + frontend), Caddy sin claves ni ubicación en logs | ✅ fusionada | PR #4 |
| **P-13** — cuota de AEMET (`AEMET_PAUSE_S` mal calculado) | ⚠️ pendiente de decisión | `docs/PENDIENTES.md` → DEC-13 abajo |

---

## 3. Orden completo (resumen)

| # | Día | Tipo | Tareas | Rama | Rol | Necesita antes |
|---|---|---|---|---|---|---|
| — | Mié | ✅ hecho | 1, 2, 3, 4 | — | — | — |
| M1 | Mié | MANUAL | prerrequisitos | — | quien ejecute | — (Docker ✅; faltan Node 20 y poppler si no están) |
| L1 | Mié | ✅ hecho | 5 | `motor/mie14-compose` | Motor | PR #4 |
| L2 | Mié | ✅ hecho | 8 | `rutas/mie14-osm` | Rutas | PR #3 |
| L3 | Mié | EJECUTAR + VERIFICAR | 10 | `front/mie14-vite` | Front | Node 20 (M1) y **L1 fusionado** |
| L4 | Mié | EJECUTAR + VERIFICAR | 7 | `motor/mie14-calor` | Motor | `poppler-utils` (M1) |
| M2 | Mié | MANUAL | 6 (VM de OCI) | — | Motor | **L1 fusionado** |
| M3 | Mié | MANUAL | 9 (bocetos) | — | Front + maquetadora | — |
| D1 | Mié | DECISIÓN | DEC-P04, DEC-13 | — | Equipo | — |
| L5 | Jue 9:00 | EJECUTAR + VERIFICAR | 11 | `motor/jue15-contrato` | Motor | — (**primero del jueves**) |
| L6 | Jue | EJECUTAR + VERIFICAR | 15 | `motor/jue15-ia` | Motor | credenciales IA (M4), **L5 fusionado**; límite 12:00 |
| L7 | Jue | EJECUTAR + VERIFICAR | 12, 13, 14 | `motor/jue15-motor` | Motor | **L5 fusionado** |
| L8 | Jue | EJECUTAR + VERIFICAR | 16, 17 | `datos/jue15-normalizar` | Datos | datos descargados |
| L9 | Jue | EJECUTAR + VERIFICAR | 18, 19 | `datos/jue15-aire-build` | Datos | **L8 fusionado**; DEC-08 para el paso 4 de Task 19 |
| L10 | Jue | EJECUTAR + VERIFICAR | 20, 21, 22 | `rutas/jue15-grafo` | Rutas | **L2 y L8 fusionados** |
| L11 | Jue | EJECUTAR + VERIFICAR | 23, 24, 25 | `front/jue15-pantallas` | Front | **L3 y L5 fusionados**, M3 hecho |
| D2 | Jue 11:00 | DECISIÓN | DEC-05, 07, 07b, 08 | — | Equipo | propuestas de Motor y Datos |
| P1 | Jue tarde | PLANIFICAR | detallar viernes | — | Coordinación | cierre del jueves |

Si sois varios, cada rol sigue su columna en paralelo respetando «Necesita antes». Si es una sola persona: el orden de la tabla.

---

## 4. Miércoles 14/10 — detalle

### M1 · MANUAL — Prerrequisitos de las tareas de hoy

- **Qué hace:** deja instaladas las herramientas que Claude no puede instalar (piden `sudo` o tocan Windows).
- **Por qué ahora:** sin esto, los lotes L1, L3 y L4 se paran a la mitad.
- **Qué hacer:**
  ```bash
  sudo apt install -y poppler-utils                                   # para L4 (Task 7)
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  source ~/.bashrc && nvm install 20 && nvm use 20 && node -v          # para L3 (Task 10): v20.x
  ```
  Docker (para L1, Task 5): instalar **Docker Desktop** en Windows → Settings → Resources → WSL Integration → activar la distribución. Comprobar: `docker compose version`.
- **Listo cuando:** `pdftotext -v`, `node -v` (v20) y `docker compose version` responden.
- **Docker con «permission denied» en `/var/run/docker.sock`** aunque estés en el grupo `docker`: la sesión no tiene el grupo aplicado. Cierra y abre la terminal de WSL (o `newgrp docker`). Mientras tanto, Claude puede usar `sg docker -c '…'`.

### L1 · ✅ HECHO (PR #4) — Task 5: Docker Compose básico (api + frontend)

> **Resultado (14/10):** ejecutada, verificada, corregida en dos rondas y fusionada. Cambios respecto al texto original del plan (el plan ya está al día):
> - **Caddy filtra su log de errores** (bloque global `log default`): sin consulta de la URL, IP ni cabeceras. Con la api caída (502) el log escribía `/api/location?text=…&lat=…`.
> - **`DOMAIN` va en `app/deploy/.env`** (copia de `app/deploy/.env.example`, `:80` en local), **no** en `app/.env`. El contenedor de Caddy, el expuesto a Internet, recibe **solo** `DOMAIN`; las claves de `app/.env` solo llegan a la `api`. Sin `DOMAIN` o vacío, Compose se niega a arrancar (para no quedarse sin HTTPS sin aviso).
> - `app/api/.dockerignore` excluye también `.env*`, `.pytest_cache/`, `*.egg-info/` y `**/__pycache__/`.
> - **Pendientes menores aplazados** (para D-D1 / V-F4): la API corre como root (`USER`), falta publicar `443/udp`, `/api` sin barra cae en la SPA, la imagen lleva `build/` y `egg-info`, `/config` de Caddy sin volumen, `app/frontend/` sin `.dockerignore` (L3).


- **Qué hace:** crea `app/api/Dockerfile`, el Caddyfile y un Dockerfile provisional en `app/frontend/`, y `app/deploy/docker-compose.yml`. Levanta en local la API (`/api/health`) y una página estática detrás de Caddy, sin log de acceso (privacidad).
- **Por qué en este orden:** es la base del despliegue; la VM de OCI (M2) y el Dockerfile definitivo del front (L3) parten de aquí.
- **Utiliza:** Docker Compose, imagen `python:3.12-slim`, `caddy:2.8.4`; servicio `app/api` con su `pyproject.toml`.
- **Necesita:** Task 1 ✅, Docker (M1). `app/.env` existe (aunque solo tenga la clave de AEMET).
- **Prompt de ejecución:** `TAREAS={5}   RAMA={motor/mie14-compose}   BASE={main}   MANUALES_HECHOS={Task 5 paso 1: Docker instalado}`
- **Prompt de verificación:** `TAREAS={5}   RAMA={motor/mie14-compose}   BASE={main}`
- **Comprobación rápida:**
  ```bash
  cd app
  mkdir -p frontend/dist && echo '<!doctype html><title>GoMad</title>' > frontend/dist/index.html   # hasta L3
  cp deploy/.env.example deploy/.env               # solo la primera vez: DOMAIN=:80
  docker compose -f deploy/docker-compose.yml up -d --build
  curl -s localhost/api/health                     # {"status":"ok"}
  docker compose -f deploy/docker-compose.yml exec api ls -a /srv/api   # sin .env ni .venv
  docker compose -f deploy/docker-compose.yml exec -T frontend env | cut -d= -f1   # DOMAIN, sin AEMET_API_KEY, IA_* ni ORACLE_*
  docker compose -f deploy/docker-compose.yml down
  ```

### L2 · ✅ HECHO (PR #3) — Task 8: extracto de OSM y prueba de pyrosm

> **Resultado (14/10):** pyrosm 0.6.2 no instala en Python 3.12; se usa **pyosmium 3.7.0** (extra `routing` del `pyproject.toml` de `ingest`). Cifras medidas en `docs/arquitectura.md` §3.4 (Getafe 59.751 nodos / 68.000 tramos; región 2,4 M / 2,6 M, ~50 s, ~3,1 GB al construir). **Aviso para L10 (Task 20):** el paso 3b solo sustituye la red; los POI (bancos, fuentes, áreas caninas, juegos) necesitan también la vía pyosmium. Además hay tramos duplicados `{u,v}` que deduplicar y hay que usar solo `length_m` (EPSG:25830).


- **Qué hace:** instala pyrosm en el venv de `ingest` (o pyosmium si no compila en Python 3.12), mide la red peatonal de Getafe y de Madrid (nodos, tramos, segundos, memoria) y apunta las cifras en `docs/arquitectura.md` §3.4.
- **Por qué en este orden:** decide pronto si el grafo regional cabe en memoria (DEC-A11) y si pyrosm sirve; el grafo del jueves (L10) depende de ello.
- **Utiliza:** `app/ingest/.venv`, `app/data/raw/osm/madrid-latest.osm.pbf` (bajado en Task 2), `municipios.geojson`.
- **Necesita:** Task 2 ✅ (si el `.pbf` no está: `cd app/ingest && python3 scripts/download_sources.py --only osm --include-heavy`).
- **Prompt de ejecución:** `TAREAS={8}   RAMA={rutas/mie14-osm}   BASE={main}   MANUALES_HECHOS={ninguno}`
- **Prompt de verificación:** `TAREAS={8}   RAMA={rutas/mie14-osm}   BASE={main}`
- **Comprobación rápida:** `docs/arquitectura.md` §3.4 tiene cifras **medidas** de Getafe y Madrid y dice si se usa pyrosm o el respaldo.

### L3 · EJECUTAR + VERIFICAR — Task 10: proyecto Vite + React + TypeScript

- **Qué hace:** crea la SPA en `app/frontend/` con los estilos del prototipo (`main.css`, `icons.css`), fuentes servidas por nosotros (Figtree y Material Symbols, sin Google), prueba con axe, y convierte el Dockerfile del front en multi-stage (compila con Node y sirve con Caddy).
- **Por qué en este orden:** después de L1 porque **reescribe** su Dockerfile del front; el jueves las pantallas (L11) se construyen encima.
- **Utiliza:** Node 20, npm, Vite 5, React 18, Vitest, axe, MSW; Docker para probar la imagen.
- **Necesita:** Node 20 (M1), **L1 fusionado en main** ✅.
- **Ojo:** el Dockerfile multi-stage conserva el `Caddyfile` actual (filtro de logs y `{$DOMAIN::80}`) y añade `app/frontend/.dockerignore` (`node_modules/`, `dist/`, `.env*`). `DOMAIN` sigue llegando solo por `app/deploy/.env`.
- **Prompt de ejecución:** `TAREAS={10}   RAMA={front/mie14-vite}   BASE={main}   MANUALES_HECHOS={Task 10 paso 1: Node 20 instalado}`
- **Prompt de verificación:** `TAREAS={10}   RAMA={front/mie14-vite}   BASE={main}`
- **Comprobación rápida:**
  ```bash
  cd app/frontend && npx vitest run && npm run build      # pruebas en verde y dist/ generado
  grep -r "googleapis" index.html src || echo "sin Google"
  ```

### L4 · EJECUTAR + VERIFICAR — Task 7: umbrales de calor del plan de Sanidad

- **Qué hace:** descarga el PDF del plan de calor 2026, lo convierte a texto y copia **literalmente** los umbrales de la Comunidad de Madrid a `docs/assets/umbrales.md` §2, con página citada, más una **propuesta** (no decisión) para DEC-06.
- **Por qué en este orden:** desbloquea DEC-06 (calor), que el motor necesita el viernes; no depende de nada más.
- **Utiliza:** `pdftotext` (poppler), la URL del PDF que figura en `umbrales.md` §2, el esquema real de AEMET (Task 4 ✅).
- **Necesita:** `poppler-utils` (M1).
- **Prompt de ejecución:** `TAREAS={7}   RAMA={motor/mie14-calor}   BASE={main}   MANUALES_HECHOS={Task 7 paso 1: poppler-utils instalado}`
- **Prompt de verificación:** `TAREAS={7}   RAMA={motor/mie14-calor}   BASE={main}` (apenas hay pruebas: el verificador debe cotejar los valores con el PDF).
- **Comprobación rápida:** `umbrales.md` §2 ya no dice «PENDIENTE»; cada valor lleva página del PDF.

### M2 · MANUAL — Task 6: VM de OCI

- **Qué hace:** crea la máquina donde se desplegará la app y comprueba que responde desde internet.
- **Por qué:** el primer despliegue con HTTPS es el viernes (V-F4); conviene tener la VM y su IP antes.
- **Utiliza:** consola de OCI con la cuenta del equipo, Ubuntu 24.04, Docker.
- **Necesita:** **L1 fusionado** ✅ (el Compose).
- **Pasos:** los de la Task 6 del plan: forma `VM.Standard.A1.Flex` (Always Free) o de pago, puertos 80/443 abiertos en la VCN y en iptables, Docker, `git clone`, `app/.env` creado a mano en la VM (claves), **`app/deploy/.env` con `DOMAIN=:80`** hasta tener dominio (con dominio: `DOMAIN=<dominio>` y Caddy saca el certificado), `docker compose up`.
- **Memoria:** con 4 GB la API y la construcción del grafo regional no caben a la vez (arquitectura §3.4: ~3,1 GB al construir, ~1–1,5 GB la API). Preferir A1.Flex con 12 GB o más.
- **Listo cuando:** `curl -s http://<IP_PÚBLICA>/api/health` → `{"status":"ok"}`. Apuntar forma, región e IP en `docs/arquitectura.md` §6 (**sin** credenciales).

### M3 · MANUAL — Task 9: bocetos con la maquetadora

- **Qué hace:** cierra el detalle de las pantallas **Inicio** y **Resultados** en `docs/pantallas.md` (elementos, textos, estados, foco, accesibilidad).
- **Por qué:** las pantallas del jueves (L11) se maquetan a partir de esto.
- **Utiliza:** `docs/idea/muevete-cerca-prototipo.html`, `docs/idea/pdf/3_GoMAD_Interfaz_de_usuario.pdf`, arquitectura §5.2.
- **Listo cuando:** `docs/pantallas.md` en `main` con Inicio y Resultados cerrados.

### D1 · DECISIÓN — Hoy

| ID | Qué | Límite | Dónde se apunta |
|---|---|---|---|
| DEC-P04 | Aprobar las correcciones de `docs/PENDIENTES.md` P-04 al CLAUDE.md y `requisitos_fuentes.json` | **mié 14, 18:00** | CLAUDE.md, `docs/assets/requisitos_fuentes.json` |
| DEC-13 (P-13) | Cuota de AEMET: (a) subconjunto fijo de municipios, (b) solo los consultados recientemente, o (c) recarga cada 3–6 h para el resto. Después, corregir `AEMET_PAUSE_S` (≥ 20 s + margen) y su comentario en `app/.env.example` | **vie 16, 12:00** (antes de programar la descarga horaria del sábado) | `app/.env.example`, CLAUDE.md §7.1 |
| DEC-10 | Nombre (adelantarlo si se puede) | jue 15, 10:00 | CLAUDE.md §1 |

---

## 5. Jueves 15/10 — detalle

### M4 · MANUAL — Prerrequisitos del jueves

- **Credenciales de IA para L6:** comprobar en la consola de OCI que la región tiene **Generative AI** con un modelo de chat; crear credenciales (`~/.oci/config` y las variables `IA_*` en `app/.env`). Nunca en el repo.
- **Reunión de decisiones a las 11:00** (D2): Motor y Datos llevan sus propuestas escritas.

### L5 · EJECUTAR + VERIFICAR — Task 11: contrato de la API (9:00)

- **Qué hace:** define todos los modelos Pydantic (`app/api/schemas.py`), declara los endpoints (`/activities`, `/location`, `/recommend`, `/route`, `/municipality/{ine_code}`, `/assistant/*`, `/sources`) con respuesta 501 y exporta el OpenAPI a `app/frontend/src/api/openapi.json`.
- **Por qué en este orden:** **es lo primero del jueves**: el motor, la IA y el front construyen contra este contrato; sin él, se bloquean unos a otros.
- **Utiliza:** `app/api/.venv`, FastAPI, Pydantic v2, `scripts/export_openapi.py`.
- **Necesita:** Task 1 ✅.
- **Prompt de ejecución:** `TAREAS={11}   RAMA={motor/jue15-contrato}   BASE={main}   MANUALES_HECHOS={ninguno}`
- **Prompt de verificación:** `TAREAS={11}   RAMA={motor/jue15-contrato}   BASE={main}`
- **Comprobación rápida:** `cd app/api && .venv/bin/pytest -q` (incluye `test_contract.py`) y existe `app/frontend/src/api/openapi.json`. **Fusionar cuanto antes y avisar al equipo.**

### L6 · EJECUTAR + VERIFICAR — Task 15: prueba de OCI Generative AI (límite 12:00)

- **Qué hace:** crea la interfaz `AIProvider` (`app/api/ai/base.py`) y un script que pide a OCI GenAI convertir una frase de ejemplo en `AssistantParams` y mide la latencia. Si a las 12:00 no funciona (JSON válido en < 2 s), pasa al plan B (API de Anthropic).
- **Por qué en este orden:** tiene hora límite (DEC-03); cuanto antes se sepa, antes se decide el plan B.
- **Utiliza:** `app/api/.venv`, SDK del proveedor (solo en el `pyproject.toml` de `api`), `schemas.AssistantParams`.
- **Necesita:** **L5 fusionado**, credenciales (M4).
- **Prompt de ejecución:** `TAREAS={15}   RAMA={motor/jue15-ia}   BASE={main}   MANUALES_HECHOS={Task 15 paso 1: credenciales de OCI en ~/.oci/config y app/.env}`
- **Prompt de verificación:** `TAREAS={15}   RAMA={motor/jue15-ia}   BASE={main}`
- **Comprobación rápida:** proveedor elegido y latencia medida, anotados en `docs/arquitectura.md` §10 y `CLAUDE.md` §11; el prompt al LLM **no** lleva ubicación.

### L7 · EJECUTAR + VERIFICAR — Tasks 12, 13, 14: motor de reglas, puntuación y mejor franja

- **Qué hace:** `rules` (categoría ICA del BOE, filtros de aire/calor/lluvia por perfil), `scoring` (nota 0–10 ponderada, renormalizando factores sin datos) y `slots` (mejor hora y alternativa cubierta). Todo lee los valores de `app/config/`; los tests usan valores de prueba.
- **Por qué en este orden:** las tres van juntas (cada una usa la anterior) y son el corazón de F2; el viernes `/recommend` las ensambla.
- **Utiliza:** `app/api/.venv`, `app/config/ica_thresholds.yaml` (BOE verificado), `settings.py`.
- **Necesita:** **L5 fusionado**. No necesita las decisiones: los valores reales entran después en `app/config/rules.yaml` y `weights.yaml`.
- **Prompt de ejecución:** `TAREAS={12,13,14}   RAMA={motor/jue15-motor}   BASE={main}   MANUALES_HECHOS={ninguno}`
- **Prompt de verificación:** `TAREAS={12,13,14}   RAMA={motor/jue15-motor}   BASE={main}`
- **Comprobación rápida:** `cd app/api && .venv/bin/pytest tests/engine -q`; entre las pruebas están Carmen (36 °C), Lucía (ozono) y «dos personas, mismo sitio, distinta respuesta».

### L8 · EJECUTAR + VERIFICAR — Tasks 16, 17: utilidades y normalizadores de referencia

- **Qué hace:** `common.py` (comas decimales, código INE, reproyección 25830→4326, codificaciones) y los normalizadores de municipios, padrón, deporte, zonas verdes y mobiliario → `app/data/clean/*.parquet`. Las pruebas comprueban las cifras del informe de datos (726 EIEL, 166 municipios VPLA, 19 instalaciones en Getafe…).
- **Por qué en este orden:** todo lo demás de datos (aire, construcción de la base, grafo) parte de estos ficheros limpios.
- **Utiliza:** `app/ingest/.venv`, GeoPandas, pyproj, `app/data/raw/` y `app/data/perfil/perfil.json`.
- **Necesita:** datos descargados (`cd app/ingest && python3 scripts/download_sources.py --group full` y `--only vpla_redes --include-heavy`).
- **Prompt de ejecución:** `TAREAS={16,17}   RAMA={datos/jue15-normalizar}   BASE={main}   MANUALES_HECHOS={ninguno}`
- **Prompt de verificación:** `TAREAS={16,17}   RAMA={datos/jue15-normalizar}   BASE={main}`
- **Comprobación rápida:** `cd app/ingest && .venv/bin/pytest -q` (las `slow` deben **ejecutarse**, no saltarse) y existen `municipality`, `population`, `destination_raw`, `green` y `poi` en `app/data/clean/`.

### L9 · EJECUTAR + VERIFICAR — Tasks 18, 19: aire, previsión y construcción de las bases DuckDB

- **Qué hace:** normaliza estaciones y lecturas de aire (fecha por fila, `T`/`V` sí, `N` no) y la previsión de AEMET; construye `app/data/gomad.duckdb` y `app/data/realtime.duckdb` de forma atómica, con las medias móviles del ICA (O₃ 8 h, PM 24 h).
- **Por qué en este orden:** necesita los ficheros de L8; es lo que leerá `/recommend` el viernes.
- **Utiliza:** `app/ingest/.venv`, DuckDB (+ extensión `spatial`), `app/ingest/tests/data/aemet_28065.json` (Task 4), `app/config/activities.yaml`.
- **Necesita:** **L8 fusionado**. El paso 4 de la Task 19 (construcción real) necesita **DEC-08** tomada y `app/config/activities.yaml` escrito; si aún no, el ejecutor deja ese paso pendiente.
- **Prompt de ejecución:** `TAREAS={18,19}   RAMA={datos/jue15-aire-build}   BASE={main}   MANUALES_HECHOS={DEC-08 decidida y app/config/activities.yaml escrito}` (o `{ninguno}` si aún no)
- **Prompt de verificación:** `TAREAS={18,19}   RAMA={datos/jue15-aire-build}   BASE={main}`
- **Comprobación rápida:** `python -m build_db all` genera los dos `.duckdb`; `green` es NULL (no 0) donde no hay VPLA.

### L10 · EJECUTAR + VERIFICAR — Tasks 20, 21, 22: grafo de Getafe, motor de rutas y latencia

- **Qué hace:** construye el grafo peatonal de Getafe con factores por tramo (tráfico por tipo de vía, % verde, fuentes, bancos y DEA cerca), lo carga en memoria en la API, calcula la ruta directa y la saludable (Dijkstra / A\*) y la distancia a todos los destinos (Dijkstra con límite), y mide la latencia.
- **Por qué en este orden:** necesita las mediciones de L2 y el verde/mobiliario de L8; el viernes `/route` lo usa.
- **Utiliza:** `app/ingest/.venv` (pyrosm) para el grafo, `app/api/.venv` (igraph, SciPy) para las rutas, `app/config/routing.yaml` (provisional hasta DEC-07).
- **Necesita:** **L2 y L8 fusionados**.
- **Prompt de ejecución:** `TAREAS={20,21,22}   RAMA={rutas/jue15-grafo}   BASE={main}   MANUALES_HECHOS={ninguno}`
- **Prompt de verificación:** `TAREAS={20,21,22}   RAMA={rutas/jue15-grafo}   BASE={main}`
- **Comprobación rápida:** existe `app/data/graph/getafe/`; `cd app/api && .venv/bin/pytest tests/routing -q -s` muestra latencias < 5 s; cifras en `docs/arquitectura.md` §4.4.

### L11 · EJECUTAR + VERIFICAR — Tasks 23, 24, 25: tipos, Inicio y Resultados

- **Qué hace:** genera los tipos TypeScript desde el OpenAPI, el cliente y respuestas simuladas (MSW), y maqueta las pantallas Inicio («¿Qué te apetece hacer?») y Resultados (lista con nota, mejor hora, «sin datos», «Ver más»), accesibles (axe) y sin guardar la ubicación.
- **Por qué en este orden:** con el contrato (L5) el front avanza sin esperar a la API real; Inicio va antes que Resultados.
- **Utiliza:** Node 20, `app/frontend`, `openapi-typescript`, MSW, TanStack Query, Vitest + axe, `docs/pantallas.md`.
- **Necesita:** **L3 y L5 fusionados**, M3 (bocetos) hecho.
- **Prompt de ejecución:** `TAREAS={23,24,25}   RAMA={front/jue15-pantallas}   BASE={main}   MANUALES_HECHOS={Task 9: docs/pantallas.md con Inicio y Resultados}`
- **Prompt de verificación:** `TAREAS={23,24,25}   RAMA={front/jue15-pantallas}   BASE={main}`
- **Comprobación rápida:** `cd app/frontend && npm run contract && npx vitest run`; `VITE_MOCK=1 npm run dev` muestra Inicio → Resultados en 3 toques.

### D2 · DECISIÓN — Jueves

| ID | Qué | Límite | Fichero |
|---|---|---|---|
| DEC-10 | Nombre | 10:00 | CLAUDE.md §1, `app/frontend/index.html` |
| DEC-05 | Regla de aire por perfil | 12:00 | `app/config/rules.yaml` → `air` |
| DEC-07 | Pesos por defecto, velocidades y pesos de ruta | 12:00 | `app/config/weights.yaml`, `app/config/routing.yaml` |
| DEC-07b | Umbral de lluvia | 12:00 | `app/config/rules.yaml` → `rain` |
| DEC-08 | Actividades y tabla actividad → destino | 12:00 | `app/config/activities.yaml` |
| DEC-03 | OCI GenAI o plan B (lo resuelve L6) | 12:00 | `app/.env`, CLAUDE.md §11 |
| DEC-11, DEC-12 | Usos de IA de §6.5; desnivel sí/no | 20:00 | CLAUDE.md §11 |

Lo que no tenga fuente oficial se escribe en el YAML con `own_criterion: true`. Escribir los YAML es un commit pequeño a `main` por PR (puede hacerlo Claude si se le dan los valores).

### P1 · PLANIFICAR — Cierre del jueves (20:00)

- `pytest` en verde en `app/api` y `app/ingest`; `npx vitest run` en `app/frontend`.
- Repasar las decisiones de D2.
- Pedir a Claude: «usa superpowers:writing-plans para detallar las tareas del viernes de `docs/plan-implementacion.md` como Task 26 en adelante, con lo aprendido hoy», y añadir aquí los lotes del viernes.

---

## 6. Viernes 16 a lunes 19 — vista previa

Están en el plan como tablas (V-…, S-…, D-…, L-…). **Se detallan cada tarde para el día siguiente** (paso P1) y se añaden a esta guía con el mismo formato.

| Día | Lo principal | Hito |
|---|---|---|
| Vie 16 | `/recommend` y `/route` reales, `/location`, indicadores F5, mapa, detalle, ajustes | **Primer despliegue con HTTPS** en la VM; DEC-06 y DEC-09 a las 12:00; DEC-13 (cuota AEMET) |
| Sáb 17 | `/municipality`, `/sources`, ingesta programada, **grafo de toda la Comunidad**, pantallas Ruta y Municipio | DEC-A11 a las 14:00 (si no llega: solo Getafe) |
| Dom 18 | Servicio `ingest` en Compose con cron, caché ante caídas, F6 asistente, ruta circular | **23:59: congelación de alcance** |
| Lun 19 | Ensayo con las personas de la demo, errores, guion, demo sin red, accesibilidad | — |
| Mar 20 | **Demo** | — |

**Orden de recorte si falta tiempo:** F6 → ruta en toda la Comunidad (solo Getafe) → Oracle/APEX.
