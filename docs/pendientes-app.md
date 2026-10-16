# Lo que falta para tener GoMad terminada (17/10/2026)

Estado de partida: MVP F1–F5 completo y desplegado en https://example.com (`main` en `76bb820`). Esta lista es lo que falta para dar la app por **terminada**, sin contar funcionalidades nuevas que se decidan más adelante.

**Decisiones del 17/10:**
- La demo será **sobre la web, en modo móvil**; la presentación la prepara el equipo.
- El ensayo con personas queda para el final, como pruebas.
- La demo sin red pasa a **secundaria**.
- El diseño del front lo hace la persona de diseño **directamente sobre `main`**; se controla con las pruebas.
- El asistente (F6) se mejora en otra conversación.
- El polen entra como implementación nueva.
- **Fuentes nuevas aprobadas (17/10):** Copernicus CAMS vía Open-Meteo (aire y polen previstos) y la Red Palinológica de la Comunidad (`mediciones_polen`, `captadores_polen`). Hay que apuntarlas en `requisitos_fuentes.json` y CLAUDE.md §7 al implementarlas.
- Calor y ozono altos en la demo: **no se preparan escenarios**; si en octubre no se dan, se mencionan en la presentación.

| # | Qué | Para qué | Bloque / Task | Prioridad | Depende de | Dónde se trabaja |
|---|---|---|---|---|---|---|
| 1 | **Recarga programada por fuente**: cron en la VM con la imagen de `ingest`, cada fuente a su ritmo (referencia mensual, diario a las 04:00, OSM y grafo semanal, Open-Meteo y aire cada hora); reinicio de la API solo si cambian `gomad.duckdb` o el grafo; registro de fallos visible en `/sources` | Que los datos se actualicen solos y no haya que copiarlos a mano | B2 Task 70 (ampliada) | 🔴 Imprescindible | — | Otro PC |
| 2 | **Aire de las horas futuras** con la previsión de Copernicus CAMS vía Open-Meteo (O₃, NO₂, PM10, PM2.5 por hora → ICA de cada hora futura); medición real para la hora actual y previsión para el resto, marcada como «previsto» | Mejor franja según el aire (Lucía, ozono); hoy las horas futuras dicen «Aire: sin datos» | B2 Task 46 (con CAMS en vez del patrón) | 🔴 | — (fuente aprobada el 17/10) | Otro PC |
| 3 | **`/conditions/{ine}`** («Ahora en tu zona») y su conexión en Inicio | Pastillas de Inicio con una petición propia, con fuente y hora; también en Municipio | B2 Tasks 68 + 69 | 🟠 | 2 (para el aire) | Otro PC |
| 4 | **Asistente F6, fase A**: texto → parámetros editables → ruta que pasa por lo pedido → condiciones cumplidas o no, con plantillas | Funcionalidad que luce en el criterio 2.2; hoy `/assistant/*` da 501 | B5 Tasks 58–64 (fase A) | 🔴 | `~/.oci` en la VM (fila 13) | Tu PC, otra conversación |
| 5 | **Ruta circular por distancia** (±10 %) | «15 km por un parque…» del asistente | B5 fase B (D-R1) | 🟠 | 4 | Tu PC |
| 6 | **Desnivel**: MDT05 del IGN por WCS (teselas de ≤ 4096 px), altura por nodo, pendiente por tramo, «evitar cuestas», desnivel en el resumen de ruta | RF-13; perfiles mayor y carrito | B4 fase B | 🟠 | — | Tu PC |
| 7 | **Tráfico en tiempo real en la capital**: sensores `pm.xml` → tramos del grafo, y su uso en `/route` | Ruta saludable con el tráfico real, no solo por tipo de vía | B2 Tasks 44 + 45 | 🟡 | — | Otro PC |
| 8 | **Polen**: medido (Red Palinológica de la Comunidad, `mediciones_polen`, diario, CC BY) y previsto (CAMS vía Open-Meteo); aviso para el perfil sensible | Funcionalidad nueva aprobada | B2 Task 71 (ampliada) | 🟡 | 2 (misma API de CAMS) | Otro PC |
| 9 | **Diseño del front** (pantallas, iconos, escritorio), directamente sobre `main` | Acabado visual | F | 🟠 | — | Mac (diseño) |
| 10 | **Prueba en móvil real** (Android e iOS), a 320 px y con zoom al 200–400 %; teclado y lector de pantalla en el flujo principal | La demo es web en modo móvil; WCAG 2.1 AA | L-5 + `pendientes.md` B2 | 🔴 | 9 | Equipo |
| 11 | ~~Escenarios de demo de calor y ozono~~ | Descartado el 17/10: se menciona en la presentación | — | — | — | — |
| 12 | **Caché ante caídas** de todas las fuentes en vivo (aire, tráfico, polen): último dato válido + aviso | Requisito no funcional (si cae una fuente) | B2 | 🟠 | 1, 7, 8 | Otro PC |
| 13 | **`~/.oci` en la VM**, montado en solo lectura en el contenedor `api` | Lo necesita el asistente (OCI Language) | Bloque D | 🔴 cuando entre 4 | 4 | Tú (VM) |
| 14 | **IP fija de la VM** (IP reservada en OCI) o vigilar que DuckDNS siga apuntando bien | Si la IP efímera cambia, la web deja de responder | Bloque D | 🟠 | — | Tú (OCI) |
| 15 | **Pruebas con cifras exactas → rangos o invariantes** (centros de salud, VPLA…) | Se rompen con cada republicación de los portales y más aún con la recarga automática | Todos | 🟠 | 1 | Quien toque cada bloque |
| 16 | **Documentación al día**: CLAUDE.md (§1, §6 «Preferencias», §10 fechas), guía de ejecución, `trabajo-paralelo.md` (B2 ampliado, polen, CAMS) | Que cualquier conversación nueva parta de la realidad | Docs | 🟡 | — | Cualquiera |
| 17 | **Limpieza de GitHub**: 20 ramas fusionadas; activar «Automatically delete head branches» | Orden | — | 🟡 | — | Tú |
| 18 | **Demo sin red**: Compose en un portátil con datos congelados, PMTiles y previsión congelada | Respaldo si falla la wifi | L-4 | 🟡 Secundario | 1–8 | Al final |
| 19 | **Ensayo con personas** (como pruebas) | Encontrar fallos de uso | L-1 | 🟡 Al final | Todo lo anterior | Equipo |

**Orden propuesto:** 1 y 2 (otro PC) y 4 (tu PC) a la vez → 6 y 9 → 3, 7 y 8 → 10 y 12 → 13 y 14 al desplegar → 15–19.

**Fuentes nuevas** (aprobadas el 17/10; apuntarlas en `requisitos_fuentes.json` y CLAUDE.md §7 al implementarlas): Copernicus CAMS vía Open-Meteo y Red Palinológica de la Comunidad.
