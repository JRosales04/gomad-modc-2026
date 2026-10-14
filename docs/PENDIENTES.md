# PENDIENTES — GoMad

Cada punto lleva: **fecha** en que se apuntó · **qué** es · **por qué** importa · **dónde** está (fichero, sección o comando) · **para cuándo** (según el plan del CLAUDE.md §10).
Las **decisiones** del equipo están aparte, en `docs/decisiones-pendientes.md` (D-01…D-14). Aquí van las **tareas**.

Estado: ⬜ por hacer · 🔶 bloqueado · ✅ hecho

---

## Lo primero del miércoles 14/10 (por orden)

| # | Estado | Tarea | Tiempo |
|---|---|---|---|
| P-00 | ⬜ | Revisar lo que se hizo de noche y fusionar la rama `preparacion` | 15 min |
| P-01 | ✅ | Crear `.env` con la clave de AEMET y verificar su API (hecho el 14/10, CLAUDE.md §7.1) | 30 min |
| — | ⬜ | Reunión de decisiones D-01 a D-04 (`docs/decisiones-pendientes.md`) | 45 min |
| P-03 | ✅ | Instalar `poppler-utils` y completar los umbrales de calor y la tabla municipio → zona (hecho el 14/10, `umbrales.md` §2, `heat_zones.csv`) | 30 min |
| P-04 | ⬜ | Aplicar las correcciones al CLAUDE.md | 20 min |

---

## Detalle

### P-00 · Revisar y fusionar la rama `preparacion`
- **Apuntado:** 14/10/2026 · **Para:** mié 14, a primera hora.
- **Qué:** esta noche se trabajó en la rama local `preparacion`, **sin subirla a GitHub**. Contiene:
  - `scripts/profile_sources.py`: perfilador de `data/raw/` (solo stdlib, ~5 s).
  - `docs/informe-datos.md`: resultado del perfil, 12 trampas nuevas y cifras comprobadas.
  - `docs/assets/umbrales.md`: ICA oficial (BOE) completo; calor pendiente.
  - `docs/decisiones-pendientes.md` y este fichero.
- **Cómo:**
  ```bash
  git log --oneline main..preparacion      # ver qué hay
  git diff main..preparacion --stat
  git switch main && git merge preparacion && git push
  ```
- **Datos generados (no se suben):** `data/perfil/perfil.json` (perfil por columna) y `data/perfil/municipios_referencia.json`.

### P-01 · ✅ Clave de AEMET y verificación de su API
- **Hecho:** 14/10/2026. `app/.env` creado por el equipo; AEMET en el script de descarga (Task 3) y verificado con `app/ingest/scripts/verify_aemet.py` (Task 4). Esquema, codificación y cuota en CLAUDE.md §7.1. Muestra de Getafe en `app/ingest/tests/data/aemet_28065.json`.
- **Apuntado:** 14/10/2026 · **Para:** mié 14 (CLAUDE.md §10).
- **Qué:** `.env` todavía **no existe**. El esquema de AEMET está «sin verificar» (CLAUDE.md §7.1). Además, el script de descarga **no incluye AEMET**.
- **Por qué:** sin la previsión horaria no hay F2 (mejor franja) ni regla de calor (D-06).
- **Cómo:**
  ```bash
  cp .env.example .env    # y pegar la clave en AEMET_API_KEY
  ```
  Después pedid a Claude que compruebe `prediccion/especifica/municipio/horaria/28065` (Getafe) y `28079` (Madrid) y que documente los campos reales en el CLAUDE.md §7.1.
- **Dónde:** `.env.example`, CLAUDE.md §7.1, `scripts/download_sources.py`.

### P-02 · Invitar al equipo al repositorio
- **Apuntado:** 14/10/2026 · **Para:** mié 14.
- **Qué:** el repo https://github.com/100495715/GoMad es privado y solo tiene un usuario.
- **Cómo:** pasad los usuarios de GitHub a Claude (lo hace con `gh api`) o usad Settings → Collaborators.

### P-03 · ✅ Umbrales de calor
- **Apuntado:** 14/10/2026 · **Hecho:** 14/10/2026 (Task 7).
- **Qué se hizo:** leído el plan de Sanidad 2026 (`app/data/raw/calor/plan2026.pdf`, no versionado). Umbrales de las 3 zonas meteosalud de Madrid (Anexo I, pág. 41), regla de niveles (págs. 22–24) e interpretación (Anexo V) copiados en `docs/assets/umbrales.md` §2, con propuesta para DEC-06 (§2.3). Tabla municipio → zona meteosalud de los 179 municipios transcrita del mapa de la pág. 41 en `docs/assets/heat_zones.csv` (método y comprobaciones en `umbrales.md` §2.1).
- **No localizados, no hacen falta** si DEC-06 adopta el plan de Sanidad: tabla de umbrales de Meteoalerta (AEMET) por zona de Madrid y plan de calor propio de la Comunidad de Madrid.
- **Desbloquea:** D-06.

### P-04 · Correcciones al CLAUDE.md (no aplicadas: requieren vuestro visto bueno)
- **Apuntado:** 14/10/2026 · **Para:** mié 14.
- **Qué:** esta noche se encontraron datos del CLAUDE.md que no cuadran con la realidad. **No se ha tocado el CLAUDE.md.** Lista:

| § CLAUDE.md | Dice | Realidad (fuente) |
|---|---|---|
| §6.2 | Bandas del ICA «distintas para población general y sensible» | Una sola tabla de bandas; cambia la recomendación (BOE-A-2020-10426) → `umbrales.md` §1.5 |
| §7.1 | URL del ICA de MITECO `…/calidad-del-aire/ica.html` | **404**. La buena es `…/visualizacion-datos-calidad-del-aire/ica.html` |
| §7.2 | `calidad_aire_datos_dia`: `v01…v24` validación «V/N» | También `T` = temporal pendiente de validación (descripción oficial del fichero). A las 02:00 todo es `T` |
| §7.2 | Magnitudes 8, 9, 10, 14 | Añadir **1 = SO₂** (también entra en el ICA) |
| §7.1 | Ayuntamiento «incluye LATITUD/LONGITUD» | En **bancos** (3.733 de 76.640) y **áreas caninas** (2 de 112) casi no; usar `COORD_GIS_X/Y` (EPSG:25830) |
| §7.2 | Nomecalles `parques` 780 | **845** filas (779 nombres distintos) |
| §7.2 | Nomecalles «campo de fútbol» 48 | **50** |
| §7.2 | `biblipubli` como fuente de bibliotecas | Solo **16**, todas de la red regional en la **capital**. Para el resto: EIEL `cultural` (`BIBLIOTECA`) |
| §7.1 / §11 | Coordenadas del buscador de Nomecalles «por averiguar» | Resuelto con `callejero_completo_2025` → D-04 |
| §8 | Trampas | Añadir las 12 de `informe-datos.md` §2 (`.prj` erróneo en Nomecalles, `RESERVADO` en atención social, fecha del aire del día, etc.) |

- **Cómo:** pedid a Claude «aplica P-04 al CLAUDE.md y a `requisitos_fuentes.json`». La instrucción §2.13 del CLAUDE.md obliga a mantener los dos sincronizados.

### P-05 · Aligerar el CLAUDE.md (propuesta del 14/10)
- **Apuntado:** 14/10/2026 · **Para:** mié 14, después de P-04.
- **Qué:** el CLAUDE.md (~36 KB, unos 9.000 tokens) se carga en **cada** sesión. Propuesta: dejar §1–§6, §10 y §11 y pasar §7–§9 (fuentes, campos y trampas) a una skill `fuentes-madrid` en `.claude/skills/` que se cargue solo al trabajar con datos.
- **Por qué:** es el mayor ahorro de tokens posible, más que caveman.

### P-06 · Instalar DuckDB (si D-01 = DuckDB)
- **Apuntado:** 14/10/2026 · **Para:** mié 14.
- **Qué:** el plugin `duckdb-skills` está instalado, pero el binario `duckdb` no. Python no tiene `duckdb` ni `pandas`.
- **Cómo:** pedid a Claude «instala duckdb» (usa la skill `install-duckdb`). Para Python, un entorno `.venv` del proyecto (ya está en `.gitignore`).

### P-07 · Fuentes que faltan en el script de descarga
- **Apuntado:** 14/10/2026 · **Para:** mié 14 – jue 15.
- **Qué:** `scripts/download_sources.py` **no incluye**:
  1. **OSM** (extracto de Geofabrik de Madrid): imprescindible para el grafo de rutas (F3) y el mobiliario fuera de la capital.
  2. **AEMET** (P-01).
  3. `callejero_completo_2025` (si D-04 = sí).
- Capas PESADAS aún sin descargar: `viales`, `cubierta_terrestre` (mejor por `bbox` de Getafe), `aire_historico` (hace falta para el «patrón horario» de F2, CLAUDE.md §6.2).

### P-08 · Política de recarga por niveles (§6.4), sin implementar
- **Apuntado:** 14/10/2026 · **Para:** dom 18 (caché ante caídas).
- **Qué:** falta el campo `refresco` en cada entrada de `FUENTES`, la opción `--refresco <nivel>` y la comprobación de cambios (`metadata_modified`, `Last-Modified`/`ETag`) antes de descargar.
- **Dónde:** `scripts/download_sources.py`; especificación en CLAUDE.md §6.4.

### P-09 · Cruces espaciales pendientes en la ingesta
- **Apuntado:** 14/10/2026 · **Para:** jue 15.
- **Qué:** fuentes sin código de municipio que hay que asignar por geometría (punto o línea dentro del polígono del municipio): `sendas` (224), los `ay_*` (todo es capital, trivial), 48 tramos de `vias_pecuarias`, el 9,3 % de `desfibriladores` y `aire_zonas` (solo nombres; «Horcajo de la Sierra» ≠ «Horcajo de la Sierra-Aoslos»).
- **Dónde:** `docs/informe-datos.md` §1 y §4.

### P-10 · Empezar F1 con superpowers
- **Apuntado:** 14/10/2026 · **Para:** mié 14, después de las decisiones.
- **Qué:** lanzar `brainstorming` para el primer flujo completo (Getafe, «correr», ubicación → top 3 → mapa), pidiéndole que respete el calendario del CLAUDE.md §10 y la congelación de funcionalidades del domingo. Para ejecutar el plan, `executing-plans` (más barato que `subagent-driven-development`).

### P-11 · Fuentes citables que faltan para el motor
- **Apuntado:** 14/10/2026 · **Para:** jue 15 (motor).
- **Qué:** valores que el motor necesita y para los que todavía no hay fuente oficial localizada:
  - velocidad media al caminar y al correr, para el «tiempo a pie» (RF-05);
  - umbral de lluvia (`probPrecipitacion`) para proponer cubierto (RF-09);
  - si «mayor» y «niños» cuentan como «grupos de riesgo» del ICA (D-05).
- **Regla:** si no hay fuente oficial, la app debe decir que es un criterio propio del proyecto (CLAUDE.md §2.9).

### P-12 · Comprobar el aire del día a otras horas
- **Apuntado:** 14/10/2026 · **Para:** jue 15.
- **Qué:** a las 02:08 del 14/10, `calidad_aire_datos_dia.csv` contenía **el día 13** (horas 1–23); el del Ayuntamiento ya traía el 14. Hay que ver a qué hora cambia de día el regional, para no mostrar «aire de hoy» con datos de ayer (RF-19).
- **Cómo:** `python3 scripts/download_sources.py --solo aire_dia` a varias horas y mirar `ano/mes/dia`.

### P-13 · Cuota de AEMET: `AEMET_PAUSE_S` mal calculado y propuesta sin presentar
- **Apuntado:** 14/10/2026 (verificación de la Task 4) · **Para:** antes de programar la descarga horaria (sáb 17, S-D2).
- **Qué:**
  1. `app/.env.example` pone `AEMET_PAUSE_S=10` y dice «~6 peticiones/min», pero la pausa es **por municipio** y cada municipio son **2 peticiones** (`download_aemet`): salen **~12 peticiones/min**. El 14/10 dio 429 tras 6 peticiones en ~1 min, así que con 10 s la ejecución horaria fallará casi siempre (`download_aemet` es todo o nada).
  2. CLAUDE.md §7.1 remite a una «propuesta en `app/.env.example`» que no existe: solo pone «provisional».
- **Por qué:** sin previsión horaria no hay F2 (mejor franja) ni regla de calor.
- **Cómo:** peticiones/min = 2 × 60 / pausa → pausa ≥ 20 s más margen (179 municipios ≈ 1 h: no cabe en el ciclo horario). Decidir en equipo entre: (a) subconjunto fijo en `AEMET_MUNICIPALITIES` (pilotos + capital); (b) solo municipios consultados recientemente; (c) recarga cada 3–6 h para el resto. Después corregir el comentario de `app/.env.example` y la referencia de CLAUDE.md §7.1.

---

## Hecho esta noche (14/10/2026)

- ✅ Perfil completo de las 46 fuentes descargadas → `docs/informe-datos.md`.
- ✅ ICA oficial verificado contra el BOE: bandas, periodos, colores y recomendaciones literales → `docs/assets/umbrales.md` §1.
- ✅ Códigos de magnitud y bandera `T`/`V`/`N` verificados contra la descripción oficial del fichero de la Comunidad.
- ✅ Geocodificación de direcciones resuelta (falta decidir si se usa) → D-04.
- ✅ Ficha de decisiones → `docs/decisiones-pendientes.md`.
