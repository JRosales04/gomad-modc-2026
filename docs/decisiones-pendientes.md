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
| D-06 | Calor: qué umbral usar | Motor (RF-09) | Desbloqueado: umbrales oficiales, tabla municipio → zona (`docs/assets/heat_zones.csv`) y propuesta en `docs/assets/umbrales.md` §2.3 |
| D-07 | Pesos por defecto y velocidades | Motor (RF-07) | Propuesta de partida abajo |
| D-08 | Tabla actividad → destino | RF-02, RF-04 | Propuesta con cifras reales abajo |
| D-09 | Indicadores de F5 | F5 | Uno o dos por categoría, con cobertura conocida |
| D-10 | Nombre | Front, dominio | GOATS |
| D-11 | Usos de IA (§6.5) | Alcance | Solo el n.º 1 (deporte por instalación). **Decidido el 15/10:** n.º 1 descartado (sin LLM), n.º 2 pendiente (CLAUDE.md §11) |
| D-12 | Desnivel (IGN) | RF-13 | Fuera del MVP |
| D-13 | Despliegue | Domingo | Decidir el sábado |
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

## D-10 · Nombre

GOATS (recomendado en el CLAUDE.md §1), MAD GOAT o GO MAD. El repositorio ya se llama GoMad. **Es cosa de cinco minutos**: mejor no dejarlo para después del jueves 15 (logo, dominio, textos).

## D-11 · Usos de IA del §6.5

**Recomendación:** solo el **n.º 1** (deducir el deporte de las instalaciones de Nomecalles en lote, revisando una muestra). Es el que más suma en el criterio 1.1, y esta noche se ha confirmado que hace falta: `CATEGORIA` tiene un solo valor y 179 filas están marcadas `DS_REVISAR=true`. El resto, después de la demo.

## D-12 · Desnivel (IGN MDT05)

RF-13 es Should y la fuente está sin verificar. **Recomendación:** fuera del MVP. Getafe es bastante llano.

## D-13 · Despliegue

Tiene que haber HTTPS para la geolocalización. Opciones: Render, Railway, OCI (patrocinador). Decidir el sábado, cuando se sepa qué pesa la API y si se usa DuckDB.

## D-14 · PDF de presentaciones en el repositorio (46 MB)

Ya están subidos en el primer commit. Quitarlos ahora no reduce el historial. **Recomendación:** dejarlos.
