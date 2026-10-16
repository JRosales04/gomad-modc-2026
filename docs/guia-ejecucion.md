# Guía de ejecución del plan — GoMad (14–20/10/2026)

Hoja de ruta **operativa** para ir ejecutando `docs/plan-implementacion.md` paso a paso con Claude Code. El plan dice *qué* hay que construir; esta guía dice **en qué orden lanzarlo, con qué prompt, qué necesita cada paso y cómo saber que ha salido bien**.

- **Actualizada:** jueves 15/10/2026, 16:00 (L9 fusionado: backend de datos completo; falta el front base (L3) y P1).
- **Prompts que usa:** `docs/prompt_task_executer.md` (ejecutar) y `docs/prompt_task_checker.md` (verificar). En ambos solo se cambia la primera línea.

---

## 1. Cómo funciona

### Tipos de paso

| Tipo | Quién | Qué es | Con qué |
|---|---|---|---|
| **EJECUTAR** | Claude, en una conversación nueva | Implementa una o varias tareas del plan con TDD, en su propia rama, y para | `docs/prompt_task_executer.md` → skill `superpowers:executing-plans` |
| **VERIFICAR** | Claude, en **otra** conversación nueva | Revisa, solo lectura, que la ejecución cumple el plan; da veredicto ✅ / ⚠️ / ❌ | `docs/prompt_task_checker.md` |
| **MANUAL** | Una persona | Lo que Claude no puede o no debe hacer: instalar con `sudo`, claves, nube, maquetadora | Terminal, consola de OCI, etc. |
| **MANUAL GUIADO** | La persona del front | Tareas del frontend que se programan a mano (Task 10, 23–25 y filas de Front de vie–dom). Claude no las ejecuta; puede documentarlas o revisarlas | `app/frontend/docs/guia.md` (plan por pasos, configuración, checklist) y `app/frontend/docs/pantallas.md` (cada pantalla) |
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

## 2. Estado actual (15/10, 16:00)

| Tarea | Estado | Dónde |
|---|---|---|
| Task 1 — estructura por servicios, dependencias, renombrado | ✅ fusionada | PR #1 |
| Task 2 — descarga por niveles, cambios, OSM, callejero | ✅ fusionada | PR #2 |
| Task 3 — AEMET en el script | ✅ fusionada | PR #2 |
| Task 4 — AEMET verificado con la clave | ✅ fusionada | PR #2 |
| Task 8 — red peatonal de OSM medida (pyosmium; pyrosm no compila en 3.12) | ✅ fusionada | PR #3 |
| Task 5 — Docker Compose (api + frontend), Caddy sin claves ni ubicación en logs | ✅ fusionada | PR #4 |
| Task 7 — umbrales de calor del plan de Sanidad y tabla municipio → zona (179) | ✅ fusionada | PR #5, PR #6 |
| Task 9 — especificación de pantallas + guía del frontend (Task 10 y front pasan a MANUAL GUIADO) | ✅ fusionada; falta validar con la maquetadora | PR #7 → `app/frontend/docs/` |
| Task 6 — VM de OCI: E5.Flex 2 OCPU / 16 GB en `eu-madrid-1`, `/api/health` responde desde fuera (solo HTTP) | ✅ hecha | `docs/arquitectura.md` §6.1 |
| Task 11 — contrato de la API (Pydantic + `openapi.json`), ventana horaria en hora local de Madrid | ✅ fusionada | PR #9, PR #10 |
| Tasks 12–14 — reglas (ICA, calor, lluvia), puntuación 0–10 y mejor franja | ✅ fusionadas | PR #11 |
| Tasks 16–17 — utilidades y normalizadores de referencia (`route_poi` con `status`/`working`, regla de cubierto) | ✅ fusionadas | PR #12 |
| Tasks 20–22 — grafo de Getafe, Dijkstra/A\*, latencia (Getafe p50 0,015 s; capital medida: p50 0,45 s, 1,2 GB) | ✅ fusionadas | PR #13, arquitectura §4.4 |
| Task 10 — base técnica del front (paso 0 de la guía) | ⏳ a mano: en `main` solo la barra inferior (`152e317`); **faltan** pruebas (Vitest + axe), fuentes propias (`index.html` aún carga Google Fonts) | `app/frontend/docs/pendientes.md` §A |
| Front paso 2 — imagen de producción multi-stage (`node:22.23.3-alpine` + Caddy) y `app/deploy/deploy.sh`; probado en local sin `dist/` | ✅ en rama, despliegue en la VM pendiente (solo HTTP; HTTPS con el dominio) | rama `front/vie16-despliegue` |
| Task 15 — prueba del proveedor de IA: DEC-03 = **OCI Language + reglas + plantillas, sin LLM**; 0,23 s de media | ✅ fusionada | PR #17 |
| Tasks 18–19 — aire, previsión y bases DuckDB: `gomad.duckdb` (destinos, actividades, municipios, estaciones, mobiliario) y `realtime.duckdb` (aire, ICA horario, previsión) | ✅ fusionadas | PR #19 |
| D2 — DEC-05, 07, 07b, 08 | ✅ volcadas en `app/config/` (`rules.yaml`, `weights.yaml`, `activities.yaml`; `routing.yaml` ya no provisional) | PR #15 |
| DEC-P04, DEC-10, DEC-11, DEC-12 | ✅ P-04 aplicado; nombre **GoMad**; IA n.º 1 descartado (palabras clave) y n.º 2 pendiente; desnivel **sí** (Should, sábado con S-R1; MDT05 comprobado por WCS) | PR #16, #17 |
| ⚠️ Previsión AEMET | `realtime.duckdb` solo tiene Getafe y Madrid, descargadas el 14/10 (hasta el 16/10 07:00): hay que recargar antes de probar y decidir DEC-13 (cuota) para los 179 | DEC-13, S-D2 |
| ⚠️ Hueco de Getafe | 0 destinos para nadar, tenis y baloncesto (Getafe no está en EIEL y Nomecalles no da el deporte): decidir en P1 (más palabras clave u OSM `sport=*`) | `app/config/activities.yaml` |
| **P-13** — cuota de AEMET (`AEMET_PAUSE_S` mal calculado) | ✅ decidido el 16/10 (DEC-13); lo implementa B2 | `docs/PENDIENTES.md` → DEC-13 abajo |

---

## 3. Orden completo (resumen)

| # | Día | Tipo | Tareas | Rama | Rol | Necesita antes |
|---|---|---|---|---|---|---|
| — | Mié | ✅ hecho | 1, 2, 3, 4 | — | — | — |
| M1 | Mié | ✅ hecho | prerrequisitos | — | quien ejecute | Docker Engine en WSL, poppler, Node 20.20 |
| L1 | Mié | ✅ hecho | 5 | `motor/mie14-compose` | Motor | PR #4 |
| L2 | Mié | ✅ hecho | 8 | `rutas/mie14-osm` | Rutas | PR #3 |
| L3 | Mié | MANUAL GUIADO | 10 (paso 0 de `app/frontend/docs/guia.md`) | `front/mie14-base` | Front | Node ≥ 20.19 (mejor 22) y **L1 fusionado** ✅ |
| L4 | Mié | ✅ hecho | 7 | `motor/mie14-calor` | Motor | PR #5, PR #6 |
| M2 | Mié | ✅ hecho (jue 15) | 6 (VM de OCI) | — | Motor | arquitectura §6.1 |
| M3 | Mié | ✅ documentado (PR #7; falta validar) | 9 → `app/frontend/docs/pantallas.md` | — | Front + maquetadora | — |
| D1 | Mié | ✅ P-04 (jue 15); DEC-13 pasa al viernes | DEC-P04, DEC-13 | — | Equipo | — |
| L5 | Jue 9:00 | ✅ hecho | 11 | `motor/jue15-contrato` | Motor | PR #9, PR #10 |
| L6 | Jue | ✅ hecho | 15 | `motor/jue15-ia` | Motor | PR #17 |
| L7 | Jue | ✅ hecho | 12, 13, 14 | `motor/jue15-motor` | Motor | PR #11 |
| L8 | Jue | ✅ hecho | 16, 17 | `datos/jue15-normalizar` | Datos | PR #12 |
| L9 | Jue | ✅ hecho | 18, 19 | `datos/jue15-aire-build` | Datos | PR #19 |
| L10 | Jue | ✅ hecho | 20, 21, 22 | `rutas/jue15-grafo` | Rutas | PR #13 |
| L11 | Jue | MANUAL GUIADO | 23, 24, 25 (pasos 1–3 de `app/frontend/docs/guia.md`) | `front/jue15-pantallas` | Front | **L3 y L5 fusionados**, M3 hecho |
| D2 | Jue 11:00 | ✅ hecho | DEC-05, 07, 07b, 08 | — | Equipo | PR #15 |
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
  source ~/.bashrc && nvm install 22 && nvm use 22 && node -v          # para L3 (Task 10): >= 20.19 (Vite 8); el Node 18 del sistema no vale
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

### L3 · MANUAL GUIADO — Task 10: base técnica del frontend (paso 0 de la guía)

> **Cambio del 14/10:** el proyecto Vite ya existe (React 19.3, Vite 8.3, TypeScript 6.0), hecho a mano por la persona del front, que sigue trabajando en él. **No se lanza a Claude** sobre `app/frontend/`: ni `npm create vite` ni los `npm install` de la Task 10 (sus versiones son para Vite 5).

- **Qué hace:** completa lo que faltaba de la Task 10 sobre el proyecto actual: dependencias del stack (versiones comprobadas), Vitest + axe, router, fuentes e iconos servidos por nosotros (sin Google), proxy de `/api` en desarrollo, Dockerfile multi-stage y `.dockerignore`.
- **Lista de trabajo:** `app/frontend/docs/pendientes.md` (decisiones del 14/10: se mantienen las versiones, barra inferior, iconos aplazados, API en la siguiente sesión).
- **Cómo:** **`app/frontend/docs/guia.md` §3, paso 0** (qué hacer, ficheros, fragmentos de configuración y criterios de «terminado»). Desajustes y su gravedad en §2 de la guía.
- **Por qué en este orden:** el Dockerfile provisional **no compila en limpio** (`"/dist": not found`, comprobado el 14/10) y bloquea el despliegue del viernes; el jueves las pantallas (L11) se construyen encima.
- **Utiliza:** Node ≥ 20.19 (recomendado 22 LTS: Vite 8 no arranca con el Node 18 del sistema), npm, Vitest, axe, Docker para probar la imagen.
- **Necesita:** **L1 fusionado en main** ✅. Avisar a Motor antes de fusionar (cambia el Dockerfile del Compose).
- **Ojo:** el Dockerfile multi-stage conserva el `Caddyfile` actual (filtro de logs y `{$DOMAIN::80}`). `DOMAIN` sigue llegando solo por `app/deploy/.env`.
- **Formato:** rama `front/mie14-base`, commits pequeños `Front: …`, PR a `main` tras pasar el checklist de la guía §5. Si se quiere una revisión, Claude puede **verificar** la rama en solo lectura con `docs/prompt_task_checker.md` usando como referencia la guía, no los pasos de la Task 10.
- **Comprobación rápida:**
  ```bash
  cd app/frontend && npm test && npm run lint && npm run build      # pruebas en verde y dist/ generado
  grep -rn "googleapis\|gstatic" index.html src || echo "sin Google"
  (cd ../deploy && docker compose build frontend)                       # compila sin dist/ local
  ```

### L4 · ✅ HECHO (PR #5, PR #6) — Task 7: umbrales de calor del plan de Sanidad

> **Resultado (14/10):** ejecutada, verificada, corregida en una ronda y verificada otra vez. Lo que queda en el repositorio:
> - **Umbrales oficiales** (`docs/assets/umbrales.md` §2.1, Anexo I, pág. 41): Sierra de Madrid (722801) 35,8 °C · Metropolitana y Henares (722802) 37,4 °C · Sur, Vegas y Oeste (722803) 39,2 °C. Son de **temperatura máxima diaria**, no horaria ni de sensación térmica.
> - **Regla de niveles** (§2.2, págs. 22–24): suma de grados por encima del umbral en 3 días → 0 verde, ≤ 3,5 amarillo, ≤ 7 naranja, > 7 rojo. Grupos de riesgo del Anexo V (mayores de 65, menores de 4, gestantes…).
> - **Tabla municipio → zona de los 179** en `docs/assets/heat_zones.csv` (`ine_code`, `municipality`, `zone_code`), sacada del mapa de la pág. 41 sobre las geometrías de `municipios.geojson`. Comprobada: 179 sin huecos ni repetidos, pilotos correctos (Madrid y Getafe 722802, San Lorenzo 722801) y los 54 municipios de frontera cotejados con el mapa.
> - **Propuesta para DEC-06** (§2.3, no es decisión): «nivel estimado» con la previsión horaria de AEMET y el umbral de la zona; avisar desde naranja a la población general y desde amarillo a «mayor», «niños menores de 4 años» y «carrito» (el carrito es lectura nuestra); dentro del día, la hora con menor `sensTermica`, evitando 14:00–19:00.
> - **Aviso para DEC-06 y L7:** el contrato actual `heat.max_feels_like_c` de `app/config/rules.yaml` (Task 12) **no admite umbrales por zona**; si se acepta la propuesta, hay que ampliarlo.
> - P-03 ✅ en `docs/PENDIENTES.md`; D-06 y A-06 ya no están bloqueados.
> - **Pendientes menores:** `decisiones-pendientes.md` D-06 todavía dice «Sanidad o AEMET» (Meteoalerta no se localizó); el script que generó el CSV está solo en el workspace (`.superpowers/…/t7tools/`), no versionado.


- **Qué hace:** descarga el PDF del plan de calor 2026, lo convierte a texto y copia **literalmente** los umbrales de la Comunidad de Madrid a `docs/assets/umbrales.md` §2, con página citada, más una **propuesta** (no decisión) para DEC-06.
- **Por qué en este orden:** desbloquea DEC-06 (calor), que el motor necesita el viernes; no depende de nada más.
- **Utiliza:** `pdftotext` (poppler), la URL del PDF que figura en `umbrales.md` §2, el esquema real de AEMET (Task 4 ✅).
- **Necesita:** `poppler-utils` (M1).
- **Prompt de ejecución:** `TAREAS={7}   RAMA={motor/mie14-calor}   BASE={main}   MANUALES_HECHOS={Task 7 paso 1: poppler-utils instalado}`
- **Prompt de verificación:** `TAREAS={7}   RAMA={motor/mie14-calor}   BASE={main}` (apenas hay pruebas: el verificador debe cotejar los valores con el PDF).
- **Comprobación rápida:** `umbrales.md` §2 ya no dice «PENDIENTE»; cada valor lleva página del PDF; `heat_zones.csv` tiene 179 filas (`tail -n +2 docs/assets/heat_zones.csv | wc -l`).

### M2 · ✅ HECHO (15/10) — Task 6: VM de OCI

> **Resultado:** `gomad-vm`, `VM.Standard.E5.Flex` 2 OCPU / 16 GB, Ubuntu 24.04, `eu-madrid-1`, IP `YOUR_SERVER_IP` (A1.Flex sin capacidad). `/api/health` responde desde fuera; el front es una página de prueba hasta la Task 10. Detalle y pasos dados en `docs/arquitectura.md` §6.1. Para el viernes (V-F4): dominio → `DOMAIN` en `app/deploy/.env` de la VM.

- **Qué hace:** crea la máquina donde se desplegará la app y comprueba que responde desde internet.
- **Por qué:** el primer despliegue con HTTPS es el viernes (V-F4); conviene tener la VM y su IP antes.
- **Utiliza:** consola de OCI con la cuenta del equipo, Ubuntu 24.04, Docker.
- **Necesita:** **L1 fusionado** ✅ (el Compose).
- **Pasos:** los de la Task 6 del plan: forma `VM.Standard.A1.Flex` (Always Free) o de pago, puertos 80/443 abiertos en la VCN y en iptables, Docker, `git clone`, `app/.env` creado a mano en la VM (claves), **`app/deploy/.env` con `DOMAIN=:80`** hasta tener dominio (con dominio: `DOMAIN=<dominio>` y Caddy saca el certificado), `docker compose up`. Para llevar los datos que lee la api (`app/data` está vacío en la VM): `docs/arquitectura.md` §6.1, «Llevar los datos a la VM».
- **Memoria:** con 4 GB la API y la construcción del grafo regional no caben a la vez (arquitectura §3.4: ~3,1 GB al construir, ~1–1,5 GB la API). Preferir A1.Flex con 12 GB o más.
- **Listo cuando:** `curl -s http://<IP_PÚBLICA>/api/health` → `{"status":"ok"}`. Apuntar forma, región e IP en `docs/arquitectura.md` §6 (**sin** credenciales).

### M3 · ✅ DOCUMENTADO (PR #7; falta validar) — Task 9: especificación de pantallas

> **Decisiones del 14/10 (tras la auditoría del front):** se mantienen React 19 / Vite 8 / TypeScript 6 y se corrige lo que esté mal · **barra de navegación inferior** en móvil (`pantallas.md` §9.1) · iconos: Google Material Symbols desde un `.woff` propio, **aplazado** · la **parte de API del front, en la siguiente sesión** (hasta entonces, datos de ejemplo). Toda la documentación del front vive en `app/frontend/docs/` (índice en su `README.md`; empezar por `pendientes.md`).

- **Qué hay:** `app/frontend/docs/pantallas.md` especifica las 8 pantallas (Inicio, Resultados, Detalle, Ruta, Municipio, Perfil/preferencias, Asistente, Fuentes y aviso) con los campos del contrato (Task 11), textos, estados, accesibilidad, estado del código actual (✅/🟡/⬜ con fichero:línea) y preguntas abiertas (§10).
- **Qué falta:** la ronda con la maquetadora: cada pantalla acaba con «Validar con la maquetadora». Inicio y Resultados primero (bloquean L11).
- **Listo cuando:** las secciones de Inicio y Resultados están validadas y las preguntas P-01 a P-07 respondidas o aplazadas.

### D1 · DECISIÓN — Hoy

| ID | Qué | Límite | Dónde se apunta |
|---|---|---|---|
| DEC-P04 | Aprobar las correcciones de `docs/PENDIENTES.md` P-04 al CLAUDE.md y `requisitos_fuentes.json` | **mié 14, 18:00** | CLAUDE.md, `docs/assets/requisitos_fuentes.json` |
| DEC-13 (P-13) | Cuota de AEMET: (a) subconjunto fijo de municipios, (b) solo los consultados recientemente, o (c) recarga cada 3–6 h para el resto. Después, corregir `AEMET_PAUSE_S` (≥ 20 s + margen) y su comentario en `app/.env.example` | ✅ **Decidido el 16/10:** pilotos cada hora + rotación 1/6, `AEMET_PAUSE_S=30` (`docs/decisiones-pendientes.md`) | `app/.env.example`, CLAUDE.md §7.1 |
| DEC-10 | Nombre (adelantarlo si se puede) | jue 15, 10:00 | CLAUDE.md §1 |

---

## 5. Jueves 15/10 — detalle

### M4 · MANUAL — Prerrequisitos del jueves

- **Credenciales de IA para L6:** comprobar en la consola de OCI que la región tiene **OCI Language** (DEC-03); crear credenciales (`~/.oci/config` y las variables `OCI_*` e `IA_PROVEEDOR=oci_language` en `app/.env`). Nunca en el repo. ✅ hecho el 15/10.
- **Reunión de decisiones a las 11:00** (D2): Motor y Datos llevan sus propuestas escritas.

### L5 · ✅ HECHO (PR #9, PR #10) — Task 11: contrato de la API

- **Qué hace:** define todos los modelos Pydantic (`app/api/schemas.py`), declara los endpoints (`/activities`, `/location`, `/recommend`, `/route`, `/municipality/{ine_code}`, `/assistant/*`, `/sources`) con respuesta 501 y exporta el OpenAPI a `app/frontend/src/api/openapi.json`.
- **Por qué en este orden:** **es lo primero del jueves**: el motor, la IA y el front construyen contra este contrato; sin él, se bloquean unos a otros.
- **Utiliza:** `app/api/.venv`, FastAPI, Pydantic v2, `scripts/export_openapi.py`.
- **Necesita:** Task 1 ✅.
- **Prompt de ejecución:** `TAREAS={11}   RAMA={motor/jue15-contrato}   BASE={main}   MANUALES_HECHOS={ninguno}`
- **Prompt de verificación:** `TAREAS={11}   RAMA={motor/jue15-contrato}   BASE={main}`
- **Comprobación rápida:** `cd app/api && .venv/bin/pytest -q` (incluye `test_contract.py`) y existe `app/frontend/src/api/openapi.json`. **Fusionar cuanto antes y avisar al equipo.**

### L6 · ✅ HECHO (PR #17) — Task 15: prueba del proveedor de IA

> **Estado (15/10, tarde):** DEC-03 decidido: **OCI Language** (servicio de IA de Oracle, sin LLM) + reglas + plantillas. OCI Generative AI descartado (404 por permisos en `eu-madrid-1`; `eu-frankfurt-1` no suscrita) y Anthropic descartado (coste propio). `app/api/scripts/probe_ai.py` extrae «15 km», «parque», «bancos» y «supermercado» (no «fuentes») en 0,23 s de media. El paso de entidades a `AssistantParams` (diccionario RF-21, negaciones) y las plantillas de `write_up` son de D-M1. Credenciales: `OCI_*` en `app/.env` y `~/.oci/config`; en la VM se copia `~/.oci` y se monta en solo lectura en el contenedor `api`.

- **Qué hace:** crea la interfaz `AIProvider` (`app/api/ai/base.py`) y un script que manda una frase de ejemplo a OCI Language, imprime entidades y frases clave y mide la latencia de 5 llamadas (objetivo < 2 s). No valida contra `AssistantParams`: Language no genera JSON (eso es D-M1).
- **Por qué en este orden:** tenía hora límite (DEC-03); resuelta con OCI Language, sin plan B.
- **Utiliza:** `app/api/.venv`, SDK del proveedor (solo en el `pyproject.toml` de `api`), `schemas.AssistantParams`.
- **Necesita:** **L5 fusionado**, credenciales (M4).
- **Prompt de ejecución:** `TAREAS={15}   RAMA={motor/jue15-ia}   BASE={main}   MANUALES_HECHOS={Task 15 paso 1: credenciales de OCI en ~/.oci/config y app/.env; DEC-03 = OCI Language}`
- **Prompt de verificación:** `TAREAS={15}   RAMA={motor/jue15-ia}   BASE={main}`
- **Comprobación rápida:** `cd app/api && .venv/bin/python scripts/probe_ai.py` imprime entidades y frases clave y «OK» (media < 2 s); anotado en `docs/arquitectura.md` §10 (A-12) y `CLAUDE.md` §11; el texto enviado **no** lleva ubicación.

### L7 · ✅ HECHO (PR #11) — Tasks 12, 13, 14: motor de reglas, puntuación y mejor franja

- **Qué hace:** `rules` (categoría ICA del BOE, filtros de aire/calor/lluvia por perfil), `scoring` (nota 0–10 ponderada, renormalizando factores sin datos) y `slots` (mejor hora y alternativa cubierta). Todo lee los valores de `app/config/`; los tests usan valores de prueba.
- **Por qué en este orden:** las tres van juntas (cada una usa la anterior) y son el corazón de F2; el viernes `/recommend` las ensambla.
- **Utiliza:** `app/api/.venv`, `app/config/ica_thresholds.yaml` (BOE verificado), `settings.py`.
- **Necesita:** **L5 fusionado**. No necesita las decisiones: los valores reales entran después en `app/config/rules.yaml` y `weights.yaml`.
- **Prompt de ejecución:** `TAREAS={12,13,14}   RAMA={motor/jue15-motor}   BASE={main}   MANUALES_HECHOS={ninguno}`
- **Prompt de verificación:** `TAREAS={12,13,14}   RAMA={motor/jue15-motor}   BASE={main}`
- **Comprobación rápida:** `cd app/api && .venv/bin/pytest tests/engine -q`; entre las pruebas están Carmen (36 °C), Lucía (ozono) y «dos personas, mismo sitio, distinta respuesta».

### L8 · ✅ HECHO (PR #12) — Tasks 16, 17: utilidades y normalizadores de referencia

- **Qué hace:** `common.py` (comas decimales, código INE, reproyección 25830→4326, codificaciones) y los normalizadores de municipios, padrón, deporte, zonas verdes y mobiliario → `app/data/clean/*.parquet`. Las pruebas comprueban las cifras del informe de datos (726 EIEL, 166 municipios VPLA, 19 instalaciones en Getafe…).
- **Por qué en este orden:** todo lo demás de datos (aire, construcción de la base, grafo) parte de estos ficheros limpios.
- **Utiliza:** `app/ingest/.venv`, GeoPandas, pyproj, `app/data/raw/` y `app/data/perfil/perfil.json`.
- **Necesita:** datos descargados (`cd app/ingest && python3 scripts/download_sources.py --group full` y `--only vpla_redes --include-heavy`).
- **Prompt de ejecución:** `TAREAS={16,17}   RAMA={datos/jue15-normalizar}   BASE={main}   MANUALES_HECHOS={ninguno}`
- **Prompt de verificación:** `TAREAS={16,17}   RAMA={datos/jue15-normalizar}   BASE={main}`
- **Comprobación rápida:** `cd app/ingest && .venv/bin/pytest -q` (las `slow` deben **ejecutarse**, no saltarse) y existen `municipality`, `population`, `destination_raw`, `green` y `poi` en `app/data/clean/`.

### L9 · ✅ HECHO (PR #19) — Tasks 18, 19: aire, previsión y construcción de las bases DuckDB

- **Qué hace:** normaliza estaciones y lecturas de aire (fecha por fila, `T`/`V` sí, `N` no) y la previsión de AEMET; construye `app/data/gomad.duckdb` y `app/data/realtime.duckdb` de forma atómica, con las medias móviles del ICA (O₃ 8 h, PM 24 h).
- **Por qué en este orden:** necesita los ficheros de L8; es lo que leerá `/recommend` el viernes.
- **Utiliza:** `app/ingest/.venv`, DuckDB (+ extensión `spatial`), `app/ingest/tests/data/aemet_28065.json` (Task 4), `app/config/activities.yaml`.
- **Necesita:** **L8 fusionado**. El paso 4 de la Task 19 (construcción real) necesita **DEC-08** tomada y `app/config/activities.yaml` escrito; si aún no, el ejecutor deja ese paso pendiente.
- **Prompt de ejecución:** `TAREAS={18,19}   RAMA={datos/jue15-aire-build}   BASE={main}   MANUALES_HECHOS={DEC-08 decidida y app/config/activities.yaml escrito (PR #15)}`
- **Prompt de verificación:** `TAREAS={18,19}   RAMA={datos/jue15-aire-build}   BASE={main}`
- **Comprobación rápida:** `python -m build_db all` genera los dos `.duckdb`; `green` es NULL (no 0) donde no hay VPLA.

### L10 · ✅ HECHO (PR #13) — Tasks 20, 21, 22: grafo de Getafe, motor de rutas y latencia

> **Resultado (15/10):** Dijkstra de igraph por defecto (A\* 2–4× más lento por la heurística en Python); Getafe 59.751 nodos, p50 0,015 s, 221 MB; capital medida también (980.138 nodos, p50 0,45 s / máx 1,06 s, 1,2 GB): **no hacen falta Contraction Hierarchies** y es la primera entrada de DEC-A11. `routing.yaml` sigue PROVISIONAL hasta DEC-07. Detalle en `docs/arquitectura.md` §4.4.

- **Qué hace:** construye el grafo peatonal de Getafe con factores por tramo (tráfico por tipo de vía, % verde, fuentes, bancos y DEA cerca), lo carga en memoria en la API, calcula la ruta directa y la saludable (Dijkstra / A\*) y la distancia a todos los destinos (Dijkstra con límite), y mide la latencia.
- **Por qué en este orden:** necesita las mediciones de L2 y el verde/mobiliario de L8; el viernes `/route` lo usa.
- **Utiliza:** `app/ingest/.venv` (pyrosm) para el grafo, `app/api/.venv` (igraph, SciPy) para las rutas, `app/config/routing.yaml` (provisional hasta DEC-07).
- **Necesita:** **L2 y L8 fusionados**.
- **Prompt de ejecución:** `TAREAS={20,21,22}   RAMA={rutas/jue15-grafo}   BASE={main}   MANUALES_HECHOS={ninguno}`
- **Prompt de verificación:** `TAREAS={20,21,22}   RAMA={rutas/jue15-grafo}   BASE={main}`
- **Comprobación rápida:** existe `app/data/graph/getafe/`; `cd app/api && .venv/bin/pytest tests/routing -q -s` muestra latencias < 5 s; cifras en `docs/arquitectura.md` §4.4.

### L11 · MANUAL GUIADO — Tasks 23, 24, 25: tipos, Inicio y Resultados

- **Qué hace:** genera los tipos TypeScript desde el OpenAPI, el cliente y respuestas simuladas (MSW), y conecta Inicio («¿Qué te apetece hacer?») y Resultados (lista con nota, mejor hora, «sin datos», «Ver más») a ellos, accesibles (axe) y sin guardar la ubicación. Parte de las maquetas que ya existen (`Home.tsx`, `Results.tsx`).
- **Cómo:** **`app/frontend/docs/guia.md` §3, pasos 1, 2 y 3** (y §4 para el contrato, los tipos y MSW); qué lleva cada pantalla en **`app/frontend/docs/pantallas.md` §1 y §2**. Las pruebas y criterios de «terminado» de las Tasks 23–25 del plan siguen valiendo.
- **Por qué en este orden:** con el contrato (L5) el front avanza sin esperar a la API real; Inicio va antes que Resultados.
- **Utiliza:** Node ≥ 20.19, `openapi-typescript` (con `npx`, guía §4.2), MSW 2, TanStack Query 5, Vitest 4 + axe.
- **Necesita:** **L3 y L5 fusionados** (`app/frontend/src/api/openapi.json` lo versiona Motor en L5: no crearlo a mano), M3 validado para Inicio y Resultados.
- **Formato:** rama `front/jue15-pantallas`, un commit por paso (`Front: tipos del contrato, cliente y respuestas simuladas`, `Front: pantalla de inicio`, `Front: pantalla de resultados`), PR a `main` tras el checklist de la guía §5. Verificación opcional por Claude en solo lectura.
- **Comprobación rápida:** `cd app/frontend && npm run contract && npm test`; `VITE_MOCK=1 npm run dev` muestra Inicio → Resultados en 3 toques.

### D2 · ✅ DECISIÓN — Jueves (todas tomadas; ver CLAUDE.md §11)

| ID | Qué | Límite | Fichero |
|---|---|---|---|
| DEC-10 | ✅ **GoMad** | 10:00 | CLAUDE.md §1, `app/frontend/index.html` |
| DEC-05 | ✅ General y carrito desde Desfavorable; sensible y mayor desde Regular | 12:00 | `app/config/rules.yaml` → `air` |
| DEC-07 | ✅ 30/25/20/15/10; 4,5 / 9 / 3,5 km/h; ruta como `routing.yaml` | 12:00 | `app/config/weights.yaml`, `app/config/routing.yaml` |
| DEC-07b | ✅ Desde el 50 % | 12:00 | `app/config/rules.yaml` → `rain` |
| DEC-08 | ✅ 8 actividades | 12:00 | `app/config/activities.yaml` |
| DEC-03 | ✅ OCI Language + reglas + plantillas, sin LLM (L6) | 12:00 | `app/.env`, CLAUDE.md §11 |
| DEC-11, DEC-12 | ✅ IA n.º 1 descartado, n.º 2 pendiente; desnivel sí (Should) | 20:00 | CLAUDE.md §11 |

Lo que no tenga fuente oficial se escribe en el YAML con `own_criterion: true`. Escribir los YAML es un commit pequeño a `main` por PR (puede hacerlo Claude si se le dan los valores).

### P1 · PLANIFICAR — Cierre del jueves (20:00)

- `pytest` en verde en `app/api` y `app/ingest`; `npx vitest run` en `app/frontend`.
- Repasar las decisiones de D2.
- Meter en el plan del viernes lo decidido hoy que aún no tiene tarea: **hueco de Getafe** (nadar, tenis, baloncesto), **desnivel** dentro de S-R1 (WCS del IGN por teselas de ≤ 4096 px; añadir `rasterio` a `ingest`), montaje de `~/.oci` en la `api` del Compose dentro de V-F4 y **dominio** para el HTTPS.
- Decisiones del viernes 12:00: DEC-06 (calor; `rules.yaml` no admite umbrales por zona), DEC-09 (indicadores F5), DEC-13 (cuota AEMET).
- Pedir a Claude: «usa superpowers:writing-plans para detallar las tareas del viernes de `docs/plan-implementacion.md` como Task 26 en adelante, con lo aprendido hoy», y añadir aquí los lotes del viernes.

---

## 6. Viernes 16 a lunes 19 — vista previa

Están en el plan como tablas (V-…, S-…, D-…, L-…). **Se detallan cada tarde para el día siguiente** (paso P1) y se añaden a esta guía con el mismo formato.

**Frontend (V-F1…V-F4, S-F1, S-F2, D-F1, D-F2): MANUAL GUIADO.** No se convierten en lotes de EJECUTAR: la persona del front los hace con `app/frontend/docs/guia.md` §3 (vie: pasos 4 y 5 — mapa, detalle, ajustes y despliegue; sáb: paso 6 — ruta y municipio; dom: paso 7 — asistente y fuentes; lun: paso 8 — accesibilidad) y `app/frontend/docs/pantallas.md`, en ramas `front/<día>-<tema>` con commits `Front: …` y PR a `main` tras el checklist de la guía §5. Claude puede verificar en solo lectura.

| Día | Lo principal | Hito |
|---|---|---|
| Vie 16 | `/recommend` y `/route` reales, `/location`, indicadores F5, mapa, detalle, ajustes | **Primer despliegue con HTTPS** en la VM; DEC-06 (propuesta lista en `umbrales.md` §2.3) y DEC-09 a las 12:00; DEC-13 (cuota AEMET) |
| Sáb 17 | `/municipality`, `/sources`, ingesta programada, **grafo de toda la Comunidad**, pantallas Ruta y Municipio | DEC-A11 a las 14:00 (si no llega: solo Getafe) |
| Dom 18 | Servicio `ingest` en Compose con cron, caché ante caídas, F6 asistente, ruta circular | **23:59: congelación de alcance** |
| Lun 19 | Ensayo con las personas de la demo, errores, guion, demo sin red, accesibilidad | — |
| Mar 20 | **Demo** | — |

**Orden de recorte si falta tiempo:** F6 → ruta en toda la Comunidad (solo Getafe) → Oracle/APEX.
