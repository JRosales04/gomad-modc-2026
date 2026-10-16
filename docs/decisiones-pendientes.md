# Decisiones pendientes — para cerrar el miércoles 14/10/2026

Preparado de madrugada el 14/10/2026. **No se ha decidido nada**: cada ficha da contexto, opciones, una recomendación razonada y qué desbloquea. Cuando decidáis, apuntad la decisión en el CLAUDE.md §11 (y en `docs/assets/requisitos_fuentes.json` si toca fuentes o requisitos).

Orden propuesto: primero las **bloqueantes** (D-01 a D-04), que impiden empezar a programar; el resto puede decidirse a lo largo del día.

| ID | Decisión | Bloquea | Recomendación |
|---|---|---|---|
| D-01 | Almacén | Todo el modelo de datos | DuckDB + GeoParquet |
| D-02 | Pilotos de ruta | Grafo, F3 | Getafe primero; capital si da tiempo |
| D-03 | Proveedor de IA (F6) | F6, `.env` | El que se pueda dar de alta mañana; ver criterios. **Decidido el 15/10: OCI Language** (arquitectura §10, A-12) |
| D-04 | Geocodificación (RF-01) | Primera pantalla | Buscador de Nomecalles + callejero completo |
| D-05 | Regla de aire por perfil | Motor (RF-09, RF-15) | Derivada del texto del BOE |
| D-06 | Calor: qué umbral usar | Motor (RF-09) | **Decidido el 16/10:** «día de calor» por zona meteosalud (Tmáx horaria > umbral de Sanidad), perfiles de riesgo sin exterior de 14 a 19 h; sin niveles |
| D-07 | Pesos por defecto y velocidades | Motor (RF-07) | Propuesta de partida abajo |
| D-08 | Tabla actividad → destino | RF-02, RF-04 | Propuesta con cifras reales abajo |
| D-09 | Indicadores de F5 | F5 | **Decidido el 16/10:** 14 indicadores en 7 categorías; encaje = lista Sí/No/Sin datos + «Cumple N de M» |
| D-10 | Nombre | Front, dominio | GOATS |
| D-11 | Usos de IA (§6.5) | Alcance | Solo el n.º 1 (deporte por instalación). **Decidido el 15/10:** n.º 1 descartado (sin LLM), n.º 2 pendiente (CLAUDE.md §11) |
| D-12 | Desnivel (IGN) | RF-13 | Fuera del MVP |
| D-13 | Despliegue | Domingo | Resuelto en `docs/arquitectura.md` §1 (Compose en VM de OCI) |
| DEC-13 (P-13) | Cuota de AEMET | B2, F2 en 179 municipios | **Decidido el 16/10:** pilotos cada hora + rotación de 1/6 del resto (todos cada 6 h), `AEMET_PAUSE_S=30` |
| D-14 | PDF de presentaciones en el repo | Nada | Dejarlos |

---

## D-01 · Almacén: DuckDB o Oracle Autonomous Database — **bloqueante**

**Contexto:** CLAUDE.md §6 y §11. Hay cuenta de Oracle (Oracle Academy, 250 €). Ya está instalado el plugin `duckdb-skills`, pero no el binario `duckdb`.

| | DuckDB + Parquet/GeoParquet | Oracle Autonomous DB 26ai |
|---|---|---|
| Montaje | Minutos; un fichero, sin servidor | Alta en OCI, wallet, red y usuarios: horas |
| Espacial | Extensión `spatial` (ST_*, reproyección 25830→4326) | Oracle Spatial (muy completo) |
| Despliegue | El fichero viaja con la API | Servicio externo: latencia y otra dependencia en la demo |
| Extra para el jurado | Tecnologías abiertas (RNF) | Select AI, APEX y Spatial Studio: suma con el patrocinador (Oracle) |
| Riesgo con 6 días | Bajo | Medio o alto (nadie del equipo lo ha montado aún, que sepamos) |

**Recomendación:** **DuckDB** para la app. Oracle **solo** si sobra tiempo y para la pantalla de administración (APEX + Select AI), cargando allí las tablas ya limpias: así se suma con el patrocinador sin poner en riesgo la demo.
**Desbloquea:** P-06 (instalar DuckDB) y la ingesta del jueves.

## D-02 · Pilotos de ruta saludable — **bloqueante**

**Contexto:** CLAUDE.md §5.3. Datos de esta noche:
- **Getafe:** **no está en EIEL** (0 instalaciones), así que su detalle deportivo sale de Nomecalles (19 instalaciones) + VPLA (648 polígonos verdes, 33,4 M m²) + OSM. Tiene estación de aire propia (28065014).
- **Madrid capital:** no está en VPLA (no hay % de verde por planeamiento), pero sí en los datos del Ayuntamiento (76.640 bancos, 2.270 fuentes, 112 áreas caninas, tráfico en tiempo real).
- **San Lorenzo de El Escorial (alternativa):** EIEL + VPLA + OSM nivel A, sin estación de aire.

**Recomendación:** **Getafe** como piloto único hasta el viernes 16; la capital solo si F1–F5 están verdes el sábado. Conviene que Getafe aparezca en el guion de la demo (§5.2).
**Desbloquea:** descarga del extracto de OSM y construcción del grafo (P-07).

## D-03 · Proveedor de IA para F6 — **bloqueante para F6**

**Contexto:** CLAUDE.md §6.3. La IA solo convierte texto en parámetros (JSON validado) y redacta con los resultados del motor. No se le envía ubicación exacta ni datos personales.

**Criterios para elegir** (por este orden):
1. **Que se pueda tener la clave mañana** (alta, facturación, cuota).
2. Salida JSON fiable contra un esquema cerrado (uso de herramientas o modo JSON).
3. Latencia por debajo de 2 s.
4. Encaje con el reto: OCI Generative AI suma con el patrocinador.
5. Coste dentro de los 250 € de Oracle Academy o de una cuenta propia.

**Opciones:** OCI Generative AI (Oracle) · API de Anthropic (Claude) · otro proveedor.
**Recomendación:** probar OCI Generative AI la primera hora. Si a mediodía no funciona, pasar al plan B sin más discusión. En cualquier caso: **respuestas de reserva grabadas** para la demo (CLAUDE.md §6.3).
**Desbloquea:** `IA_PROVEEDOR`, `IA_API_KEY` e `IA_MODELO` en `.env`.
**Decidido el 15/10:** OCI Language + reglas + plantillas, sin LLM (`docs/arquitectura.md` §10, A-12; CLAUDE.md §11).

## D-04 · Cómo obtener coordenadas de una dirección escrita (RF-01) — **bloqueante para la pantalla de inicio**

**Contexto:** el CLAUDE.md (§7.1 y §11) lo daba por pendiente. **Investigado esta noche:**
- El buscador (`…/nomecalles-buscador/v1/direcciones?busqueda=…`, sin clave) devuelve `id`, `direccion`, `tipo` (`app` = portal, `calle`), `municipio`, `cdVial` y `cdVialIne`, pero **no coordenadas**. Las rutas `/direcciones/{id}` y `?id=` no existen (404 y 400). También existe `/v1/puntos-interes?busqueda=…` (tampoco da coordenadas) y `/v1/delimitaciones`.
- **Solución encontrada:** la capa descargable sin clave **`callejero_completo_2025`** (por el mismo `paquetes/<capa>` que ya usa el script) es un CSV de 231 MB (zip de 33 MB, cp1252) con **855.909 portales de los 179 municipios** y `coord_x`/`coord_y` en EPSG:25830. **Prueba:** buscador «calle madrid 10 getafe» → `cdVial 065A0460`, número 10 → callejero → x 437838,98 / y 4461942,01 (CP 28901). Funciona.

**Opciones:**
1. Buscador para el texto libre + callejero (solo columnas útiles, en Parquet) para las coordenadas. Es geocodificación completa sin clave y con fuente oficial.
2. Solo la ubicación del navegador y, como alternativa, el centro del municipio (ya tenemos los polígonos).
3. Un geocodificador externo (Nominatim/OSM): otra dependencia y su política de uso.

**Recomendación:** **opción 1**, con la 2 como respaldo. ⚠ Supone **añadir una capa nueva** (`callejero_completo_2025`) al script: el CLAUDE.md §2.12 pide preguntar antes. Es de Nomecalles, que ya es fuente del proyecto.

## D-05 · Regla de aire según el perfil

**Contexto:** el ICA tiene **una sola tabla de bandas** (no hay bandas distintas para personas sensibles, contra lo que dice el CLAUDE.md §6.2). Lo que cambia por población es la **recomendación**. Ver `docs/assets/umbrales.md` §1.4–1.5.

**Propuesta derivada del texto oficial** (para validar):

| Perfil | Categoría a partir de la cual se propone cubierto u otra franja (RF-09) | Texto del BOE en que se apoya |
|---|---|---|
| General, carrito, con perro, con niños | **Desfavorable** | «Considera reducir las actividades prolongadas y enérgicas al aire libre…» |
| Sensible a la contaminación, mayor | **Regular** | Grupos de riesgo, Regular: «Considera reducir las actividades prolongadas y enérgicas al aire libre…» |
| Todos | **Muy desfavorable**: desaconsejar exterior | «Reduce toda actividad al aire libre…» / «Considera reducir las actividades al aire libre…» |

**Preguntas abiertas:**
- ¿«Mayor» cuenta como grupo de riesgo? El BOE no lo dice.
- ¿Niños? El documento de MITECO citado en la búsqueda menciona «niños con problemas respiratorios», no todos los niños.
- ¿Correr (actividad «enérgica») endurece la regla un nivel frente a pasear?

## D-06 · Calor: qué umbral usar

**Contexto:** umbrales oficiales verificados (`umbrales.md` §2): plan de Sanidad 2026, umbral de Tmáx por zona meteosalud (35,8 / 37,4 / 39,2 °C) con la tabla municipio → zona en `heat_zones.csv`. Meteoalerta de AEMET: no localizado. La sensación térmica horaria de AEMET sirve para elegir la franja, pero no tiene umbral oficial.
**Recomendación:** combinación probable: «día en alerta» (Sanidad o AEMET) → proponer cubierto o franja temprana; dentro del día, elegir la hora con menor sensación térmica (propuesta detallada en `umbrales.md` §2.3).
**Desbloqueado: umbrales oficiales, tabla municipio → zona (`docs/assets/heat_zones.csv`) y propuesta en `docs/assets/umbrales.md` §2.3.**

**Decidido el 16/10: opción C, «día de calor» simple (sin niveles de la Ecuación 1).** *(Desde DEC-16 la Tmáx prevista es la diaria de Open-Meteo, `daily.temperature_2m_max`, no el máximo horario de AEMET.)*
- **Día de calor** (municipio, día) = máximo de la `temperatura` horaria de AEMET de ese día **>** umbral de Tmáx de su zona meteosalud (35,8 / 37,4 / 39,2 °C; plan de Sanidad 2026, Anexo I pág. 41; zona por `heat_zones.csv`). Oficial: umbrales y zonas. Criterio propio: usar el máximo horario como Tmáx y evaluar día a día, sin el sumatorio de 3 días.
- **Perfiles de riesgo:** `senior`, `stroller` y «Salgo con…» `kids` (Anexo V pág. 52: mayores de 65 y menores de 4 años; que carrito o niños sean menores de 4 años es lectura propia).
- **Efecto:** en día de calor y con perfil de riesgo, las horas de 14:00 a 19:00 no valen para exterior (RF-09: cubierto u otra franja), citando «especialmente entre las 14:00h y las 19:00h» (Anexo V pág. 52; convertirlo en bloqueo es criterio propio). Entre las horas válidas, desempate por menor `sensTermica` (criterio propio; hace falta para el caso de Carmen). Resto de perfiles: solo aviso informativo «Día de calor en tu zona», sin bloqueo.
- Se aplica todo el año (el plan se activa del 16/5 al 30/9: criterio propio). Se descartan la propuesta completa por niveles (A) y el umbral propio único de sensación térmica (D).
- **Caso de Carmen:** con 36 °C en Getafe (zona 722802, umbral 37,4) **no** es día de calor. El guion pasa a **38 °C** con previsión de reserva grabada → «Ahora no: mejor a las 21:00» (la previsión es horaria: no puede salir 20:30).
- Formato de `heat` en `rules.yaml` y ficheros afectados: ficha de B3 en `docs/trabajo-paralelo.md`.

## D-07 · Pesos por defecto y velocidades (RF-07, RF-16)

**Propuesta de partida** (números redondos para mover en la demo; **no** son datos oficiales):

| Factor | Peso por defecto |
|---|---|
| Cercanía | 30 % |
| Adecuación a la actividad | 25 % |
| Verde y sombra | 20 % |
| Aire previsto | 15 % |
| Meteorología | 10 % |

Velocidades para el «tiempo a pie»: hay que elegirlas **y citar de dónde salen**. No hay fuente localizada todavía (pendiente P-11).

## D-08 · Tabla actividad → destino (RF-02)

**Datos reales de esta noche** para cerrar el borrador del CLAUDE.md §6.2:

| Actividad | EIEL (155 municipios) | Nomecalles (178) por nombre | Ayuntamiento (capital) |
|---|---|---|---|
| Nadar | `TIPOINSTAL`: 35 al aire libre + 10 cubiertas | «piscina» 40 | `ay_piscinas` 56 |
| Pádel | `PADEL` 154 | «pádel/padel» 57 | `ay_idb` / polideportivos |
| Tenis | `TENIS` 164 | «tenis» 29 | idem |
| Fútbol | `FUTBOL` 322 | «campo de fútbol» 50 | idem |
| Baloncesto | `BALONCESTO` 330 | — | idem |
| Atletismo (correr) | `ATLETISMO` 22 | «atletismo» 2 | idem |
| Gimnasio / cubierto | `GIMNASIO` 47 + `POLIDEPORTIVOS CUBIERTOS` 42 + `SUP_CUBI > 0` | «polideportivo» 190, «pabellón» 38 | polideportivos 82 |
| Caminar / pasear | Parques 2.100 | Parques 845 (62 municipios) | Parques 208 |

Además: VPLA zonas verdes (166 municipios), sendas (224), vías pecuarias (1.694), áreas recreativas (84).
**Decidir:** catálogo cerrado de actividades (¿8–10?) y si «Sorpréndeme» (RF-03) puede elegir cualquiera.

## D-09 · Indicadores de F5

**Criterio propuesto:** solo indicadores con cobertura conocida, y «sin datos» explícito en el resto. Cobertura medida esta noche:
- Deporte: Nomecalles 178/179.
- Naturaleza: VPLA 166, vías pecuarias 169, áreas recreativas 51.
- Movilidad: paradas de bus 179, metro 15, cercanías 34.
- Salud: centros de salud y consultorios en 179 (429 centros), farmacias 160, desfibriladores 161.
- Educación: 170.
- Conectividad: EIEL núcleos 155.
- Social: 137.

**Coberturas re-medidas el 16/10** (DuckDB sobre `app/data/gomad.duckdb`, `app/data/clean/` y `app/data/raw/`). No cuadran: **educación 156** (no 170; 3.906 centros en ALTA por `CDMUNI`), **zonas verdes VPLA 162** (166 es `in_vpla`; 4 no tienen «Zonas Verdes»), **desfibriladores 172** por cruce espacial (161 por `municipio_codigo`), **áreas recreativas 55** (no 51), **cercanías 33 municipios / 92 estaciones** y metro 296 estaciones (no 34 / 297). Coinciden: salud 179 por `municipio_nombre` (429 centros; 8 sin coordenadas), farmacias 160, vías pecuarias 169 (sin los códigos `289xx` que no son municipios), bus 179 por cruce espacial (`CMUN` de `busparadas` trae 209 códigos: no usarlo), deporte Nomecalles 178, conectividad 155, social 137 (2.471 centros sin los 177 «RESERVADO»).

**Cifras finales de la Task 35** (descarga del 16/10 por la tarde; mandan sobre las de arriba): zonas verdes **167** (`in_vpla` = 167; los 4 de VPLA sin «Zonas Verdes» valen 0, no «sin datos»), vías pecuarias **171** (los tramos `28077` y `28906`–`28912` se asignan por cruce espacial a Lozoyuela 28901 y Madrid 28079: ignorarlos daba «0 km» falso), estaciones **39** municipios (cercanías 34), centros de salud **430**.

**Decidido el 16/10: opción A (14 indicadores) y encaje como lista de comprobación.**
- Regla de valores: en **registros regionales completos** (farmacias, educativos, sanitarios, social, DEA, metro y cercanías, áreas recreativas) un municipio sin filas vale **0**; en **fuentes parciales** (EIEL, VPLA, Nomecalles `deporte`) vale **NULL = «sin datos»**. Tasas por 1.000 hab. con `population.parquet` (2025, 179).
- **Encaje (RF-18):** solo del municipio consultado. Una línea Sí / No / Sin datos por cada actividad elegida («Pádel: sí, 4 sitios») y por cada necesidad del perfil (mayor: centros de salud y DEA; «con niños»: centros educativos; carrito: zonas verdes), más un resumen «Cumple N de M». Sin nota, sin orden entre municipios y sin percentiles. Qué necesidad mira cada perfil es criterio propio.
- Lista con fuente, unidad y cálculo: ficha de B1 en `docs/trabajo-paralelo.md`. Descartados (C): bibliotecas EIEL (104), comercio Nomecalles (23–27) y mobiliario OSM.

## D-10 · Nombre

**Decidido el 15/10: GoMad** (*Guía de Ocio: Madrid Activo y Deportivo*), como el repositorio. Se barajaron GOATS, MAD GOAT y GO MAD.

## D-11 · Usos de IA del §6.5

**Recomendación:** solo el **n.º 1** (deducir el deporte de las instalaciones de Nomecalles en lote, revisando una muestra). Es el que más suma en el criterio 1.1, y esta noche se ha confirmado que hace falta: `CATEGORIA` tiene un solo valor y 179 filas están marcadas `DS_REVISAR=true`. El resto, después de la demo.

## D-12 · Desnivel (IGN MDT05)

RF-13 es Should y la fuente está sin verificar. **Recomendación:** fuera del MVP. Getafe es bastante llano.

## D-13 · Despliegue

Tiene que haber HTTPS para la geolocalización. Opciones: Render, Railway, OCI (patrocinador). Decidir el sábado, cuando se sepa qué pesa la API y si se usa DuckDB.
Resuelto en `docs/arquitectura.md` §1 (D-13: Docker Compose en VM de OCI). **No confundir con DEC-13** (cuota de AEMET, abajo): en `docs/guia-ejecucion.md` y `docs/trabajo-paralelo.md` DEC-13 es P-13.

## Decisiones menores del 16/10 (teselas, dominio, hueco de Getafe)

- **Teselas del mapa (bloque M):** OpenFreeMap (online, gratis, sin clave) desde ya; PMTiles local de la Comunidad el lunes para la demo sin red (L-4).
- **Dominio (A-03, V-F4):** subdominio gratuito de DuckDNS apuntando a la IP de la VM; `DOMAIN` en `app/deploy/.env` de la VM.
- **Hueco de Getafe (B3):** 0 destinos de nadar, tenis y baloncesto porque Getafe no está en EIEL y los nombres de Nomecalles no lo dicen. Se descartan las palabras clave (habría que adivinar que «Polideportivo» tiene piscina) y OSM amplio (falsos positivos de comunidades y colegios). **Decidido: OSM filtrado** como fuente de destinos: centros deportivos y estadios con `sport` y nombre; pistas de tenis, baloncesto y pádel con nombre o `access=yes|public`; piscinas solo con nombre o `access=public`; `suitability` 0,8. Detalle en la ficha B3 de `docs/trabajo-paralelo.md`.

## DEC-13 (P-13) · Cuota de AEMET — **superada por DEC-16**

> **Superada por DEC-16 (16/10):** la previsión ya no es de AEMET sino de Open-Meteo. De esta decisión solo sigue valiendo que una previsión de más de 12 h no se usa. Lo que sigue es histórico.

**Contexto:** `docs/PENDIENTES.md` P-13. Cada municipio son 2 peticiones; el 14/10, 7 peticiones en ~1 min dieron 429 y volvió a responder a los ~100 s. Con `AEMET_PAUSE_S=10` salen ~12 peticiones/min: falla. AEMET **elabora la previsión municipal unas 3 veces al día** (vistas el 14–16/10: `elaborado` 12:01, 20:53 y 07:09), así que bajarla cada hora no aporta nada.

**Decidido el 16/10: opción (d), pilotos cada hora + rotación.**
- `AEMET_PAUSE_S=30` (por municipio → 4 peticiones/min, por debajo de las ~6 del 429).
- Cada ejecución horaria: los 3 pilotos (`AEMET_HOURLY=28065,28079,28131`) + 1/6 del resto (`AEMET_ROTATION_SLICES=6`, porción = hora % 6 sobre los 176 restantes ordenados por código; ~30). ≈ 33 municipios × 30 s ≈ **16,5 min**; todos se refrescan cada 6 h. ≈ 1.550 peticiones/día (cuota diaria de AEMET no publicada ni medida: si hay 429 sostenido, `AEMET_ROTATION_SLICES=0` = solo pilotos).
- Un 429 se reintenta una vez tras 120 s; si vuelve a fallar se salta ese municipio y siguen los demás (hoy `download_aemet` es todo o nada).
- **Sin previsión reciente:** se usa la última que cubra la hora pedida y se muestra su `elaborado` (RF-19); aviso «previsión antigua» si `elaborado` tiene **más de 12 h** (criterio propio); si ninguna cubre la hora → «Previsión: sin datos», no se evalúan lluvia ni calor.
- Descartadas: (a) solo pilotos (176 municipios sin F2), (b) solo consultados (la api tendría que avisar a la ingesta) y (c) los 179 cada 6 h (90 min por ejecución).
- Valores y comportamiento para implementar: ficha de B2 en `docs/trabajo-paralelo.md`.

## DEC-15 · Datos en tiempo real sin persistencia

> *La parte de AEMET (cola, cuota, vecino) la sustituye DEC-16: Open-Meteo, una petición para los 179.*

**Contexto:** el diseño anterior de B2 recargaba `realtime.duckdb` cada hora y, si una fuente caía, enseñaba el último dato con aviso. Eso permite mostrar aire o meteo de hace muchas horas, que no sirve para decidir «¿salgo ahora?». Medido el 16/10 a las 16:14: `aire_dia` 24 KB en 0,24 s (última hora válida, la 13: ~3 h de retraso de la propia red), `ay_aire` 19 KB en 2,1 s, `ay_meteo` 14 KB en 0,9 s, `pm.xml` 2,2 MB en 0,4 s: se pueden pedir en directo.

**Decidido el 16/10:**
- Aire, previsión y tráfico **no se guardan en disco** (salvo la caché de arranque de la previsión, que se descarta si tiene más de 12 h). La API los pide en segundo plano y los tiene en memoria (`LiveStore`, `config/realtime.yaml`).
- **Nunca se muestra un dato más viejo que su `max_age`** (aire 3 h, previsión 12 h, tráfico 15 min; criterio propio salvo los 12 h de DEC-13). Si el portal cae, el último válido solo mientras siga dentro de `max_age`; después, «sin dato actual» y ese factor no cuenta. Sustituye a «último dato en caché + aviso» del RNF para estas fuentes.
- **Horas futuras:** previsión horaria de AEMET (hoy y mañana; probabilidad de lluvia por franjas de 6 h) y patrón histórico del aire por estación y hora, presentado como **estimación**. Pasado mañana después de las 07:00 no hay previsión horaria: el selector de hora se limita a ~36 h.
- **AEMET** no se pide en cada consulta (2 peticiones por municipio, 429 a ~6/min): cola en la API a 4 peticiones/min con prioridad para los municipios pedidos y los pilotos; un municipio sin previsión usa la del más cercano con previsión dentro de `forecast_fallback_km` y lo dice. Sustituye a la rotación 1/6 de DEC-13 desde la ingesta.
- **Polen** (`mediciones_polen` y `captadores_polen` del CKAN de la Comunidad, comprobados el 16/10; dato diario con ~5 días de retraso): Could, fuente nueva que aprueba el equipo; solo aviso, no puntúa.
- Plan: `docs/planes/tiempo-real.md`; ficha B2 en `docs/trabajo-paralelo.md`.

## DEC-16 · Open-Meteo sustituye a AEMET

**Contexto (16/10):** la API OpenData de AEMET limita a ~6 peticiones/min por IP y, tras un 429, bloquea mucho tiempo: la VM llevaba más de 30 min con 429 y la web decía «Previsión: sin datos». Con 2 peticiones por municipio, los 179 necesitaban ~90 min de cola. Open-Meteo devuelve los 179 municipios en **una** petición (comprobado el 16/10: 0,4 s, 3 llamadas seguidas con 200), sin clave.

**Decidido el 16/10 (equipo):**
- Se elimina AEMET por completo (código, configuración, pruebas y documentación vigente) y la previsión pasa a **Open-Meteo** (`api.open-meteo.com/v1/forecast`, 3 días, horaria).
- **Una petición por hora** con un punto por municipio (`app/config/forecast_points.csv`: centroide del contorno o, si cae fuera, un punto interior). 179 × 24 ≈ 4.300 coordenadas al día, dentro del límite de uso no comercial (10.000/día, 5.000/h, 600/min).
- Tras un error o 429, **espera global** que se duplica (120 s → 3.600 s), nunca una petición por tick. Caché de arranque `data/live/forecast.json` (se descarta lo de más de 12 h y lo que no lleve `provider: open_meteo`, es decir, la caché de AEMET). `/sources` da como fecha de Open-Meteo la última descarga de la API.
- **Privacidad:** a Open-Meteo solo van esos 179 puntos, nunca la ubicación de la persona (prueba `test_user_location_never_sent`).
- **Licencia:** CC BY 4.0, atribución «Weather data by Open-Meteo.com» con enlace a https://open-meteo.com/ en la pantalla de Fuentes.
- **Calor (DEC-06):** la Tmáx del día es `daily.temperature_2m_max` de Open-Meteo (criterio propio usarla frente al umbral de Sanidad, que se definió con la Tmáx de AEMET).
- **Sin hora de elaboración:** la fecha de la previsión que se muestra es la de descarga.
- Fuera: cola por municipio, cuota, pilotos, previsión del municipio vecino, `AEMET_API_KEY`, `AEMET_MUNICIPALITIES`, `AEMET_PAUSE_S`, `INIT_AEMET_MUNICIPALITIES`.
- Plan: `docs/planes/open-meteo.md` (Tasks 72–79).

## D-14 · PDF de presentaciones en el repositorio (46 MB)

Ya están subidos en el primer commit. Quitarlos ahora no reduce el historial. **Recomendación:** dejarlos.
