# Muévete Cerca — Contexto completo del proyecto (MAD Open Data Challenge 2026)

> **Actualización 14/10/2026:** el proyecto ha sido **aprobado** y estamos en fase de desarrollo. La fuente de verdad pasa a ser `CLAUDE.md` (raíz del repositorio), que incluye el estado actual, el plan hasta la demo, las decisiones pendientes y los nombres candidatos (GOATS, MAD GOAT, GO MAD…). Este documento se conserva como referencia detallada (matriz con enlaces, esquemas, tabla de municipios). Las fechas de la sección 14 están superadas.

> Documento de traspaso. Recoge todo lo trabajado hasta el 6 de octubre de 2026: el reto, la idea, las funcionalidades, las perspectivas, las bases de datos verificadas (con identificadores, enlaces y formato), los hallazgos sobre los datos, los municipios candidatos, las decisiones tomadas y lo que queda pendiente. Está pensado para pegarlo en otra conversación y continuar sin perder contexto.
>
> Todo lo marcado como «comprobado» se consultó directamente en las API de los portales el 6/10/2026. Lo marcado como «sin verificar» viene de documentación o no se pudo consultar.

---

## 0. Resumen en 10 líneas

1. **Reto:** MAD Open Data Challenge 2026 (UC3M + Comunidad de Madrid + Oracle). Soluciones para la ciudadanía de la Comunidad de Madrid en natalidad, transportes, servicios sociales, bienestar y salud, usando datos abiertos de la Comunidad (se pueden enriquecer con otras fuentes públicas o privadas fiables).
2. **Idea:** *Muévete Cerca*, web móvil que recomienda qué actividad física u ocio saludable hacer, dónde, a qué hora y por qué ruta ir, cruzando equipamientos, zonas verdes, calidad del aire, meteorología y mobiliario urbano. Incluye una vista de municipio.
3. **Ámbito:** **toda la Comunidad de Madrid, los 179 municipios, sin límite de población.** Se descartó la idea inicial de centrarse en municipios de menos de 50.000 habitantes.
4. **Portal del Ayuntamiento de Madrid:** solo como complemento para Madrid capital, porque la capital no está en varias fuentes regionales.
5. **Perspectivas:** ciudadano (principal, MVP), administración (secundaria, demostración), empresa privada (terciaria, evolución).
6. **Funcionalidades MVP:** F1 recomendador, F2 mejor franja, F3 mapa y ruta saludable, F4 personalización, F5 vista de municipio, y F6 asistente de rutas con IA (Should). 24 requisitos (RF-01 a RF-24).
7. **Fuentes clave verificadas:** EIEL 2023 (IDEM), planeamiento VPLA 2025 (IDEM), Nomecalles (Instituto de Estadística, sin clave), red de calidad del aire (CKAN Comunidad), centros sanitarios, farmacias, educativos, desfibriladores (CKAN), AEMET (sin verificar, requiere clave), OpenStreetMap.
8. **Pilotos propuestos para la ruta saludable:** Getafe y Madrid capital. Alternativa: San Lorenzo de El Escorial.
9. **Fechas:** ideas del 6 al 9 de octubre de 2026; finalistas el 13; desarrollo del 13 al 20; demo presencial de 10 minutos el 20 de octubre.
10. **Página de trabajo (artifact):** https://claude.ai/artifact/MT3co6p1UKtJypQwBGqZpK (privada, hay que compartirla desde el menú Share).

---

## 1. El reto: MAD Open Data Challenge 2026

### 1.1 Enunciado
Desarrollar soluciones tecnológicas innovadoras para la ciudadanía de la Comunidad de Madrid en las áreas de **natalidad, transportes, servicios sociales, bienestar y salud**, utilizando **datos abiertos publicados por la Comunidad de Madrid**, pudiendo enriquecerlos con datos de otras entidades públicas o privadas de confiabilidad contrastada.

### 1.2 Qué supone el reto
- Definir un problema relevante para la ciudadanía.
- Establecer indicadores y/o datasets que reutilicen, agreguen o enriquezcan los datos públicos de partida.
- Recopilar, procesar e integrar fuentes abiertas para resolver el problema.
- Implementar los algoritmos que generen las recomendaciones.
- Entregar un prototipo funcional de interfaz que el jurado pueda usar.

### 1.3 Ideas de ejemplo (opcionales, no obligatorias)
Las presentaciones dan ejemplos, pero **no hay que cumplirlos todos**; son inspiración:
- Planificar paseos por entornos saludables evitando tráfico y mala calidad del aire, priorizando parques, sombra y fuentes (es la más cercana a nuestra idea).
- Mapear puntos de encuentro y servicios contra la soledad no deseada.
- Punto sanitario abierto más cercano según ubicación y hora.
- Punto de reciclaje más cercano para residuos específicos.
- Mapa de economía circular cercana.

### 1.4 Fuentes sugeridas por la organización
Ayuntamiento de Madrid (datos.madrid.es), Datos Abiertos de la Comunidad de Madrid (empleo, bienestar, ALMUDENA), Portal Estadístico de la Comunidad (indicadores agregados, Nomecalles), INE, LoDCOREMadrid (indicadores de accesibilidad a servicios públicos).

### 1.5 Herramientas
Sin restricciones. Oracle (patrocinador) ofrece licencias Oracle Academy (250 € por equipo), Autonomous AI Database, APEX, Select AI, Spatial Studio.

### 1.6 Fases y fechas
| Fase | Fechas | Qué |
|---|---|---|
| Ideas | 6–9 oct 2026 | Formulario en https://datathon-mad.sel.inf.uc3m.es/index.php/participa/ — título, aproximación técnica, fuentes de datos, propuesta de interfaz |
| Selección | 13 oct 2026 | Publicación de finalistas (máximo 15 equipos; requisito: estudiantes de universidades madrileñas) |
| Desarrollo | 13–20 oct 2026 | Soporte en Discord (https://discord.gg/ZfNFQvrRb) |
| Defensa | 20 oct 2026 | Demostración presencial de 10 minutos; el jurado accede después a datasets y prototipo. Ganadores ese mismo día |

### 1.7 Criterios de evaluación (100 puntos)
| Criterio | Puntos |
|---|---|
| 1.1 Corrección y adecuación del planteamiento teórico en el tratamiento de los datos abiertos | 25 |
| 1.2 Grado de resolución del reto planteado | 25 |
| 2.1 Sencillez en la obtención y comprensión de los resultados por los destinatarios | 25 |
| 2.2 Interactividad y flexibilidad para que el destinatario adapte la solución a su caso (**primer criterio de desempate**) | 25 |

---

## 2. Resumen de las 8 presentaciones de la jornada

| # | Ponente / tema | Lo útil para nosotros |
|---|---|---|
| 1 | Oracle — Uso de datos para retos sociales en la era de la IA | Confianza por diseño (finalidad, datos, modelo, personas); priorizar casos con impacto medible; «empezad por un reto concreto y una medida de impacto» |
| 2 | Experiencias y lecciones de ediciones anteriores | Valor estratégico de los datos reutilizados y generados; ayudar al usuario a decidir; información fiable; ideas con capacidad de crecimiento |
| 3 | Presentación del reto | Enunciado, ideas de ejemplo, fuentes, fases, criterios (ver sección 1) |
| 4 | Instituto de Estadística (IECM) — Catálogo, eDatos, Nomecalles | Descubrir (catálogo) → analizar (eDatos) → localizar (Nomecalles: cartografía y puntos de interés) |
| 5 | Ayuntamiento de Madrid — datos.madrid.es | ~700 datasets; ejemplos: calendario laboral, censo de locales, padrón, callejero, panel de indicadores de barrios, aire/ruido/meteo, tráfico (~60 datasets), inventario de equipamientos (60+ datasets) |
| 6 | Comunidad de Madrid — datos.comunidad.madrid | CKAN con API estándar (`/api/3/action/package_list`, `package_search`, `package_show?id=…`), IDEM (datos espaciales), portal estadístico. Más vistos: centros de atención social, zonas de baño, farmacias |
| 7 | Oracle — Plataforma de bases de datos | Oracle Database 26ai, Autonomous DB, Select AI (preguntas en lenguaje natural), vectores |
| 8 | Keensai — APEX + IA | APEX para apps de datos, mapas nativos (sin API key), geocodificación, IA generativa integrada |

---

## 3. La idea: Muévete Cerca

**Lema de uso:** «Quiero hacer X → dime dónde y cuándo → llévame por la mejor ruta».

Web móvil, **sin registro y sin datos de salud**, que convierte datos abiertos en una decisión explicada. Ejemplo de salida: *«Corre en este parque a las 20:00; baja la temperatura, el aire es bueno y el 68 % del camino va por zona verde.»* La vista de municipio resume qué ofrece cada localidad para quien piensa vivir allí, sin hacer rankings entre municipios.

- **Áreas del reto:** bienestar y salud, con apoyo en transportes.
- **Motor:** reglas explicables y puntuación ponderada. **IA generativa solo para interpretar peticiones en texto libre y redactar explicaciones** (F6); las decisiones las toma siempre el motor de reglas trazable.
- **Arquitectura propuesta:** ingesta en Python (API CKAN, WFS IDEM, Nomecalles, AEMET) → almacén DuckDB con Parquet/GeoParquet → API FastAPI (recomendar, ruta, municipio) → interfaz web con MapLibre, móvil primero.
- **Fuera del MVP:** reservas, precios, ocupación, plan con amigos, planificación semanal, rutas circulares, transporte público como modo de llegada, UV y polen, comparativas de municipios.

### 3.1 Decisiones que cambian el documento de idea original (.docx del 5/10)
- **Se elimina cualquier límite por población.** El .docx todavía menciona «¿A qué municipio de menos de 50.000 habitantes podría mudarme?» y propone elegir un piloto por debajo de ese umbral: **hay que quitarlo**.
- Ámbito: los 179 municipios. El Ayuntamiento de Madrid solo como complemento de la capital.
- Pilotos de ruta saludable: Getafe y Madrid capital (antes se había propuesto Algete, descartado por falta de mobiliario mapeado).

---

## 4. El problema

| Problema | Explicación |
|---|---|
| **Información dispersa (4 portales)** | Instalaciones y parques en la IDEM y Nomecalles, aire y salud en el catálogo de la Comunidad, previsión en AEMET, detalle de la capital en el Ayuntamiento. Cada uno con su formato, sistema de coordenadas y codificación |
| **Decisiones a ciegas** | Se sale a correr con ozono alto o a pasear a las 17:00 con 36 °C sin que nada avise de que a las 20:30 sería mejor. La mayoría de municipios no tiene estación de aire propia y depende de la de su zona |
| **El camino corto suele ser el peor** | La ruta más corta a pie suele ir por la avenida con más tráfico y menos sombra. Los datos de zonas verdes, cubierta vegetal, fuentes y bancos existen pero ningún navegador los usa para elegir camino |
| **Elegir dónde vivir sin ver qué ofrece (179 municipios)** | Instalaciones, parques, zonas verdes, centros de salud o desfibriladores están inventariados en fuentes distintas, pero no se presentan pensando en quien decide dónde vivir |

---

## 5. Funcionalidades, requisitos y perspectivas

### 5.1 Funcionalidades del MVP
| ID | Funcionalidad | Qué hace | Decisión que resuelve |
|---|---|---|---|
| F1 | Recomendador de actividad | El usuario elige actividad (correr, caminar, nadar, pádel…) o «Sorpréndeme»; propone las 3 mejores opciones cercanas puntuadas de 0 a 10, ampliables | Qué y dónde |
| F2 | Información del momento y mejor franja | Cruza previsión horaria y calidad del aire; propone la mejor hora; con lluvia, calor o mal aire propone algo cubierto u otra franja | Cuándo |
| F3 | Mapa y ruta saludable | Compara la ruta directa a pie con una con más verde y menos tráfico (distancia, tiempo, % verde, tramos con tráfico); muestra fuentes, bancos, sombra y desfibriladores en ruta | Cómo llegar |
| F4 | Personalización | Tiempo, distancia máxima, interior/exterior, perfil (general, persona mayor, familia con carrito, sensible a la contaminación; idea: «Salgo con…» perro/niños) y pesos de cada factor; recalcula al instante | Adaptarlo a cada persona (criterio 2.2) |
| F5 | Vista de municipio | Indicadores por categoría: deporte, naturaleza, movilidad, salud, educación, conectividad, y encaje con las preferencias del usuario, sin rankings | Qué ofrece el sitio donde vivo o quiero vivir |
| F6 | Asistente de rutas con IA (Should) | El usuario pide la ruta en texto libre («15 km andando, que pase por un parque, con fuentes y bancos y por un supermercado»); la IA lo traduce a parámetros editables, el motor calcula la ruta con datos reales y la IA explica qué condiciones se cumplen y cuáles no | Pedir una ruta compleja sin formularios |

### 5.2 Requisitos funcionales (Must = imprescindible para la demo; Should = si el núcleo está probado)
| ID | Func. | Requisito | Prioridad |
|---|---|---|---|
| RF-01 | F1 | Ubicación por navegador o por dirección/municipio escritos | Must |
| RF-02 | F1 | Catálogo cerrado de actividades (correr, caminar, nadar, pádel y otras que los datos distingan) | Must |
| RF-03 | F1 | «Sorpréndeme»: 3 opciones de tipos distintos, ampliables | Must |
| RF-04 | F1 | Catálogo unificado de destinos (instalaciones, parques, zonas verdes) con tipo, actividades, interior/exterior y coordenadas | Must |
| RF-05 | F1 | Top 3 con distancia, tiempo a pie y puntuación 0–10; «Ver más opciones» | Must |
| RF-06 | F2 | Previsión horaria y calidad del aire de la estación más cercana a cada destino | Must |
| RF-07 | F2 | Puntuación: cercanía, adecuación, zona verde, aire y meteorología; pesos por defecto o del usuario | Must |
| RF-08 | F2 | Evaluar cada hora de la ventana y proponer la mejor franja | Must |
| RF-09 | F2 | Con lluvia, calor extremo o aire desfavorable: instalación cubierta u otra franja | Must |
| RF-10 | F2 | Explicación en lenguaje llano («¿Por qué te recomendamos este lugar?») | Must |
| RF-11 | F3 | Mapa con usuario y destinos, sincronizado con la lista | Must |
| RF-12 | F3 | Ruta saludable vs. directa: distancia, tiempo, % zona verde, tramos con tráfico intenso | Must |
| RF-13 | F3 | Desnivel, sombra estimada y fuentes de agua (y desfibriladores) en el resumen de ruta | Should |
| RF-14 | F4 | Tiempo disponible, distancia máxima a pie, interior/exterior/indiferente | Must |
| RF-15 | F4 | Perfil opcional que ajusta umbrales y filtros de ruta | Must |
| RF-16 | F4 | Pesos de cada factor ajustables; recalcula sin reiniciar | Must |
| RF-17 | F5 | Indicadores por categoría: deporte, naturaleza, movilidad, salud, educación, conectividad | Must |
| RF-18 | F5 | Encaje del municipio con las preferencias, sin ordenar ni comparar municipios | Should |
| RF-20 | F6 | Pedir la ruta en texto libre; la IA la convierte en parámetros que se muestran y se pueden editar | Should |
| RF-21 | F6 | Catálogo cerrado de condiciones: distancia o duración, actividad, circular o ida, pasar por (parque, fuente, banco, supermercado, área canina, juegos…) y evitar (tráfico, cuestas) | Should |
| RF-22 | F6 | Ruta por distancia objetivo (±10 %), circular o de ida, con puntos de paso obligatorios | Should |
| RF-23 | F6 | Respuesta que dice qué condiciones se cumplen y cuáles no, redactada solo con resultados del motor | Should |
| RF-24 | F6 | Pedir aclaración si la petición es ambigua; rechazar lo que sale del catálogo o es consejo médico | Should |
| RF-19 | Transversal | Fuente y fecha de actualización de cada dato; enlaces a webs de instalaciones | Should |

**Requisitos no funcionales (resumen del .docx):** primera recomendación en ≤3 interacciones y <1 min; lenguaje llano con etiquetas de texto; móvil y WCAG 2.1 AA con semáforo + icono + texto; recomendación <3 s y ruta <5 s; sin registro ni datos personales (RGPD/LOPDGDD); consumo automatizado por API (no carga manual); estáticos a diario, aire y previsión cada hora; caché si cae una fuente; motor de reglas trazable con umbrales oficiales; aviso de que no es consejo médico; licencias y atribución listadas, resultados CC BY; tecnologías abiertas y añadir municipio sin cambiar código.

### 5.3 Personas para la demo
| Persona | Situación | Resultado esperado |
|---|---|---|
| Carmen, 72 años | Julio, 36 °C, 45 minutos libres | «Ahora no: calor extremo. Mejor a las 20:30», con alternativa cubierta y bancos en ruta |
| Lucía, 28, corredora sensible a la contaminación | Día de ozono alto, tras el trabajo | Mejor franja mañana temprano y circuito lejos de avenidas |
| Dani y su hija de 4 años | Sábado por la mañana, con carrito | Parque con juegos por una ruta sin vías rápidas, pocos minutos más larga |
| Ana y su perro | Paseo de tarde | Área canina, fuentes y papeleras en el camino |
| Familia que se muda | Valora un municipio | Qué ofrece en deporte, verde, salud, educación, sin rankings |

### 5.4 Las tres perspectivas
**Ciudadano (principal, MVP).** Quien quiere moverse más y mejor cerca de casa y quien valora a qué municipio mudarse. Obtiene las 3 mejores opciones con nota y motivo, la mejor hora, la ruta saludable con fuentes/bancos/sombra y el resumen de su municipio. Funcionalidades F1–F5.

**Administración (secundaria, demostración).** Los 179 ayuntamientos y la Comunidad (deportes, salud pública, medio ambiente, datos abiertos).
- Mapa de carencias: municipios sin instalación cubierta, sin piscina o con poca zona verde por habitante (evolución).
- Equipamiento a reparar: según la EIEL, 25 instalaciones en estado «malo» y 77 sin acceso en silla de ruedas.
- Demanda agregada y anónima (qué se busca, dónde, a qué hora) (evolución).
- Días y zonas con calor o aire desfavorable.
- Informe de datos que faltan (MVP): 75 municipios casi sin mobiliario mapeado en OSM, 13 fuera del planeamiento, columna NATACION vacía en la EIEL…
- Catálogo unificado de destinos publicado como dataset abierto CC BY (MVP).
- Idea: hacer la pantalla de administración en Oracle APEX (patrocinador).

**Empresa privada (terciaria, evolución).** Gimnasios y clubes de pádel, comercio deportivo, turismo activo, programas de bienestar.
- Huecos de mercado: pádel o gimnasios por habitante cruzado con renta.
- Tejido deportivo: clubes y entidades registradas por municipio.
- Rutas y destinos de naturaleza para turismo activo.
- Regla: **la recomendación al ciudadano nunca se vende** (sin anuncios ni destinos patrocinados).

Requisitos propuestos para estas perspectivas (no forman parte del MVP): AD-01 carencias por municipio; AD-02 equipamiento en mal estado o sin acceso; AD-03 días/horas con calor o aire desfavorable; AD-04 demanda agregada anónima; AD-05 publicar el catálogo unificado como dataset abierto; EM-01 huecos de oferta deportiva por habitante y renta; EM-02 tejido deportivo por municipio.

### 5.5 Elementos de la ruta (mobiliario y servicios)
Idea: que la ruta muestre y bonifique elementos útiles según con quién sales. Todos los datasets marcados «Ayto.» **solo cubren Madrid capital**; fuera de ella la fuente es OSM o capas regionales.

| Elemento | Fuente regional | Capital (Ayto.) | OSM |
|---|---|---|---|
| Fuentes de agua | Agua en parques EIEL, `IT_FUENTE` áreas recreativas | `300051-0-fuentes`, fuentes para mascotas `50055-0-fuentes-mascotas` | `amenity=drinking_water` |
| Bancos | `IT_BANCOS` áreas recreativas (solo 84 áreas) | `300095-0-mobiliario-bancos` | `amenity=bench` |
| Papeleras | `IT_PAPEL` áreas recreativas | `300096-0-mobiliario-papeleras`, con bolsas para excrementos `300081-0-papeleras-bolsas-excrementos` | `amenity=waste_basket` |
| Aseos | `IT_ASEOS` áreas recreativas | `300103-0-aseos-publicos-operativos` | `amenity=toilets` |
| Áreas caninas | — | `300094-0-areas-caninas` | `leisure=dog_park` |
| Juegos infantiles | `JUEGOSINFA` parques EIEL, `IT_JINFANT` | `200652-0-areas-infantiles` | `leisure=playground` |
| Biosaludables | `IT_CBIOSAL` áreas recreativas | — | `leisure=fitness_station` |
| Sombra / arbolado | Cubierta terrestre BTA (IDEM) | `300761-0-arbolado-especies` | `natural=tree` |
| Iluminación | — | `300573-0-unidades-luminosas-farolas` | `lit=yes` |
| **Desfibriladores** | **`desfibriladores_externos_fuera_ambito_sanitario` (toda la región)** | — | `emergency=defibrillator` |
| Mesas / merenderos | `IT_MESAS`, `COMEDOR` parques EIEL | `300217-0-mobiliario-mesas` | — |

| Supermercados y comercio de alimentación | Nomecalles `hipermercados`, `mercadoabastos`, `galimentacion` (solo comercio grande) | `200085-0-censo-locales` (todos los locales con actividad) | `shop=supermarket`, `shop=convenience` |

Recomendación para el MVP: fuentes, bancos, sombra, áreas caninas, juegos infantiles y desfibriladores; mostrar el resto «donde haya datos» con aviso.

### 5.6 F6 — Asistente de rutas con IA (diseño)
Principio: **la IA interpreta y explica; el motor decide.** Flujo:
1. El usuario escribe: «ruta de 15 km andando, que pase por un parque, con fuentes y bancos, y por un supermercado».
2. La IA devuelve solo parámetros estructurados, que se muestran y se pueden editar: `{actividad: "caminar", distancia_km: 15, circular: true, pasar_por: ["parque", "supermercado"], durante: {fuentes: "frecuentes", bancos: "frecuentes"}}`.
3. El motor elige puntos de paso que sumen la distancia objetivo y los encadena con la ruta saludable sobre el grafo peatonal (en los municipios piloto).
4. El motor comprueba cada condición contra los datos reales.
5. La IA redacta la respuesta usando solo esos resultados: «14,6 km por el parque X: 6 fuentes, 11 bancos y un supermercado en el km 9. No hay bancos entre el km 3 y el 5».

Si la petición es ambigua, pregunta; si pide algo fuera del catálogo o consejo médico, lo dice. Riesgos: generar rutas circulares por distancia es la parte difícil (antes era funcionalidad futura); el texto va a un proveedor de IA (sin ubicación ni datos personales; avisar en la app); la demo depende de un servicio externo (tener respuestas guardadas); añade 1–2 s de latencia.


## 6. Matriz de trazabilidad: requisito → bases de datos

Origen: **IDEM** = Infraestructura de Datos Espaciales de la Comunidad (WFS) · **CKAN** = catálogo de datos abiertos de la Comunidad · **NMC** = Nomecalles (Instituto de Estadística de la Comunidad) · **Externa** = AEMET, OSM, IGN, MITECO · **Ayto.** = Ayuntamiento de Madrid, solo como complemento para la capital.

### RF-01 · F1 · Ubicación por GPS, dirección o municipio

**Cobertura:** 179 municipios

| Base de datos | Identificador | Origen | Enlace |
|---|---|---|---|
| Límites municipales | `Comun:IDEM_V_MUNICIPIOS` | IDEM | [GeoJSON](https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeNames=Comun:IDEM_V_MUNICIPIOS) |
| Viales urbanos | `RedesTransporte:IDEM_GDIE_G_CALLES` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_callescm) · [GeoJSON](https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeNames=RedesTransporte:IDEM_GDIE_G_CALLES) |

### RF-02 · F1 · Elegir actividad: correr, caminar, nadar, pádel…

**Cobertura:** Los 179 municipios combinando fuentes: Nomecalles en 178 (sin deporte por instalación), EIEL en 155 (con deporte), planeamiento en 166, OSM en todos

| Base de datos | Identificador | Origen | Enlace |
|---|---|---|---|
| EIEL: instalaciones deportivas | `ServiciosPublicos:IDEM_EIEL_INSTAL_DEPORTIVA_23` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_eiel_instdepor2023) · [GeoJSON](https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeNames=ServiciosPublicos:IDEM_EIEL_INSTAL_DEPORTIVA_23) |
| Planeamiento: redes públicas «Deportivos» | `UsoDelSuelo:VPLA_V_RED_REF_25` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_redesref2025) · [GeoJSON](https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeNames=UsoDelSuelo:VPLA_V_RED_REF_25) |
| Nomecalles: instalaciones deportivas (deporte deducido del nombre) | `Nomecalles · deporte` | NMC | [ficha](https://gestiona.comunidad.madrid/nomecalles_web/) · [API](https://apiscm.comunidad.madrid/t/ciudadanos.comunidad.madrid/sector-publico/nomecalles-descargas/v1/paquetes/deporte) |
| OpenStreetMap sport=* | `openstreetmap` | Externa | [ficha](https://download.geofabrik.de/europe/spain/madrid.html) |

**Complemento para la capital (Ayuntamiento de Madrid):**

- Centros deportivos municipales — `200186-0-polideportivos` — [ficha](https://datos.madrid.es/dataset/200186-0-polideportivos)
- Instalaciones deportivas básicas — `200215-0-instalaciones-deportivas` — [ficha](https://datos.madrid.es/dataset/200215-0-instalaciones-deportivas)
- Piscinas municipales — `210227-0-piscinas-publicas` — [ficha](https://datos.madrid.es/dataset/210227-0-piscinas-publicas)

### RF-03 · F1 · Modo «Sorpréndeme»

**Cobertura:** Comunidad

| Base de datos | Identificador | Origen | Enlace |
|---|---|---|---|
| Catálogo de destinos (RF-04) | `—` | IDEM |  |
| AEMET: predicción horaria por municipio | `prediccion/especifica/municipio/horaria` | Externa | [ficha](https://opendata.aemet.es/centrodedescargas/productosAEMET) |

**Complemento para la capital (Ayuntamiento de Madrid):**

- Las de RF-04

### RF-04 · F1 · Catálogo unificado de destinos

**Cobertura:** Comunidad

| Base de datos | Identificador | Origen | Enlace |
|---|---|---|---|
| EIEL: instalaciones deportivas | `ServiciosPublicos:IDEM_EIEL_INSTAL_DEPORTIVA_23` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_eiel_instdepor2023) · [GeoJSON](https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeNames=ServiciosPublicos:IDEM_EIEL_INSTAL_DEPORTIVA_23) |
| Nomecalles: instalaciones deportivas | `Nomecalles · deporte` | NMC | [ficha](https://gestiona.comunidad.madrid/nomecalles_web/) · [API](https://apiscm.comunidad.madrid/t/ciudadanos.comunidad.madrid/sector-publico/nomecalles-descargas/v1/paquetes/deporte) |
| EIEL: parques | `CubiertaTerrestre:IDEM_EIEL_PARQUE_23` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_eiel_parques2023) · [GeoJSON](https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeNames=CubiertaTerrestre:IDEM_EIEL_PARQUE_23) |
| Nomecalles: parques y jardines | `Nomecalles · parques` | NMC | [ficha](https://gestiona.comunidad.madrid/nomecalles_web/) · [API](https://apiscm.comunidad.madrid/t/ciudadanos.comunidad.madrid/sector-publico/nomecalles-descargas/v1/paquetes/parques) |
| Planeamiento: zonas verdes y deportivos | `UsoDelSuelo:VPLA_V_RED_REF_25` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_redesref2025) · [GeoJSON](https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeNames=UsoDelSuelo:VPLA_V_RED_REF_25) |
| Áreas recreativas | `ServiciosPublicos:IDEM_MA_AREAS_RECREA` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_areasrecrea) · [GeoJSON](https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeNames=ServiciosPublicos:IDEM_MA_AREAS_RECREA) |
| Sendas por la naturaleza | `RedesTransporte:IDEM_V_MA_SENDAS_VERDES` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_sendasnaturaleza) · [GeoJSON](https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeNames=RedesTransporte:IDEM_V_MA_SENDAS_VERDES) |
| Vías pecuarias | `Zonas:IDEM_MA_VIAS_PECUARIAS` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_vpec) · [GeoJSON](https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeNames=Zonas:IDEM_MA_VIAS_PECUARIAS) |
| Zonas de baño | `censo_clasificacion_zonas_bano` | CKAN | [ficha](https://datos.comunidad.madrid/dataset/censo_clasificacion_zonas_bano) |

**Complemento para la capital (Ayuntamiento de Madrid):**

- Centros deportivos municipales — `200186-0-polideportivos` — [ficha](https://datos.madrid.es/dataset/200186-0-polideportivos)
- Instalaciones deportivas básicas — `200215-0-instalaciones-deportivas` — [ficha](https://datos.madrid.es/dataset/200215-0-instalaciones-deportivas)
- Piscinas municipales — `210227-0-piscinas-publicas` — [ficha](https://datos.madrid.es/dataset/210227-0-piscinas-publicas)
- Parques y jardines — `200761-0-parques-jardines` — [ficha](https://datos.madrid.es/dataset/200761-0-parques-jardines)

### RF-05 · F1 · Top 3 con distancia, tiempo a pie y nota

**Cobertura:** Comunidad

| Base de datos | Identificador | Origen | Enlace |
|---|---|---|---|
| Catálogo de destinos (RF-04) | `—` | IDEM |  |
| OpenStreetMap: red peatonal | `openstreetmap` | Externa | [ficha](https://download.geofabrik.de/europe/spain/madrid.html) |

### RF-06 · F2 · Previsión horaria y aire de la estación más cercana

**Cobertura:** 179 municipios; sin estación propia se usa la de su zona

| Base de datos | Identificador | Origen | Enlace |
|---|---|---|---|
| AEMET: predicción horaria por municipio | `prediccion/especifica/municipio/horaria` | Externa | [ficha](https://opendata.aemet.es/centrodedescargas/productosAEMET) |
| Calidad del aire: estaciones | `calidad_aire_estaciones` | CKAN | [ficha](https://datos.comunidad.madrid/dataset/calidad_aire_estaciones) |
| Calidad del aire: datos del día | `calidad_aire_datos_dia` | CKAN | [ficha](https://datos.comunidad.madrid/dataset/calidad_aire_datos_dia) |
| Calidad del aire: municipios por zona | `calidad_aire_zonas` | CKAN | [ficha](https://datos.comunidad.madrid/dataset/calidad_aire_zonas) |

**Complemento para la capital (Ayuntamiento de Madrid):**

- Calidad del aire en tiempo real — `212531-0-calidad-aire-tiempo-real` — [ficha](https://datos.madrid.es/dataset/212531-0-calidad-aire-tiempo-real)
- Estaciones de control del aire — `212629-0-estaciones-control-aire` — [ficha](https://datos.madrid.es/dataset/212629-0-estaciones-control-aire)
- Meteorología en tiempo real — `300392-0-meteorologia-tiempo-real` — [ficha](https://datos.madrid.es/dataset/300392-0-meteorologia-tiempo-real)

### RF-07 · F2 · Puntuación: cercanía, actividad, verde, aire y tiempo

**Cobertura:** Comunidad

| Base de datos | Identificador | Origen | Enlace |
|---|---|---|---|
| Planeamiento: zonas verdes | `UsoDelSuelo:VPLA_V_RED_REF_25` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_redesref2025) · [GeoJSON](https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeNames=UsoDelSuelo:VPLA_V_RED_REF_25) |
| Cubierta terrestre | `BTA:IDEM_BTA_CUBIERTER_POL_17` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_bta) |
| Fuentes de RF-06 | `—` | CKAN |  |

**Complemento para la capital (Ayuntamiento de Madrid):**

- Parques y jardines — `200761-0-parques-jardines` — [ficha](https://datos.madrid.es/dataset/200761-0-parques-jardines)
- Calidad del aire en tiempo real — `212531-0-calidad-aire-tiempo-real` — [ficha](https://datos.madrid.es/dataset/212531-0-calidad-aire-tiempo-real)

### RF-08 · F2 · Mejor franja horaria

**Cobertura:** Comunidad

| Base de datos | Identificador | Origen | Enlace |
|---|---|---|---|
| AEMET: predicción horaria por municipio | `prediccion/especifica/municipio/horaria` | Externa | [ficha](https://opendata.aemet.es/centrodedescargas/productosAEMET) |
| Calidad del aire: datos del día | `calidad_aire_datos_dia` | CKAN | [ficha](https://datos.comunidad.madrid/dataset/calidad_aire_datos_dia) |
| Calidad del aire: histórico horario | `calidad_aire_datos_historico` | CKAN | [ficha](https://datos.comunidad.madrid/dataset/calidad_aire_datos_historico) |

**Complemento para la capital (Ayuntamiento de Madrid):**

- Calidad del aire en tiempo real — `212531-0-calidad-aire-tiempo-real` — [ficha](https://datos.madrid.es/dataset/212531-0-calidad-aire-tiempo-real)

### RF-09 · F2 · Alternativa cubierta con lluvia, calor o mal aire

**Cobertura:** Comunidad

| Base de datos | Identificador | Origen | Enlace |
|---|---|---|---|
| EIEL: instalaciones deportivas (SUP_CUBI, TIPOINSTAL) | `ServiciosPublicos:IDEM_EIEL_INSTAL_DEPORTIVA_23` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_eiel_instdepor2023) · [GeoJSON](https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeNames=ServiciosPublicos:IDEM_EIEL_INSTAL_DEPORTIVA_23) |
| AEMET + calidad del aire | `—` | Externa |  |

**Complemento para la capital (Ayuntamiento de Madrid):**

- Centros deportivos municipales — `200186-0-polideportivos` — [ficha](https://datos.madrid.es/dataset/200186-0-polideportivos)
- Piscinas municipales — `210227-0-piscinas-publicas` — [ficha](https://datos.madrid.es/dataset/210227-0-piscinas-publicas)

### RF-10 · F2 · Explicación en lenguaje llano

- Sin base de datos propia: Motor de reglas, sin fuente propia.

### RF-11 · F3 · Mapa sincronizado con la lista

**Cobertura:** Comunidad

| Base de datos | Identificador | Origen | Enlace |
|---|---|---|---|
| Límites municipales | `Comun:IDEM_V_MUNICIPIOS` | IDEM | [GeoJSON](https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeNames=Comun:IDEM_V_MUNICIPIOS) |
| OpenStreetMap: mapa base | `openstreetmap` | Externa | [ficha](https://download.geofabrik.de/europe/spain/madrid.html) |

### RF-12 · F3 · Ruta saludable frente a ruta directa

**Cobertura:** Comunidad

| Base de datos | Identificador | Origen | Enlace |
|---|---|---|---|
| OpenStreetMap: red peatonal | `openstreetmap` | Externa | [ficha](https://download.geofabrik.de/europe/spain/madrid.html) |
| Planeamiento: zonas verdes | `UsoDelSuelo:VPLA_V_RED_REF_25` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_redesref2025) · [GeoJSON](https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeNames=UsoDelSuelo:VPLA_V_RED_REF_25) |
| Cubierta terrestre | `BTA:IDEM_BTA_CUBIERTER_POL_17` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_bta) |
| Viales urbanos (tipo de vía en lugar de tráfico) | `RedesTransporte:IDEM_GDIE_G_CALLES` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_callescm) · [GeoJSON](https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeNames=RedesTransporte:IDEM_GDIE_G_CALLES) |

**Complemento para la capital (Ayuntamiento de Madrid):**

- Tráfico en tiempo real (pm.xml) — `202087-0-trafico-intensidad` — [ficha](https://datos.madrid.es/dataset/202087-0-trafico-intensidad)
- Parques y jardines — `200761-0-parques-jardines` — [ficha](https://datos.madrid.es/dataset/200761-0-parques-jardines)

### RF-13 · F3 · Desnivel, sombra y fuentes en la ruta

**Cobertura:** Comunidad; desfibriladores en toda la región

| Base de datos | Identificador | Origen | Enlace |
|---|---|---|---|
| Cubierta terrestre (sombra) | `BTA:IDEM_BTA_CUBIERTER_POL_17` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_bta) |
| EIEL: parques (AGUA) | `CubiertaTerrestre:IDEM_EIEL_PARQUE_23` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_eiel_parques2023) · [GeoJSON](https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeNames=CubiertaTerrestre:IDEM_EIEL_PARQUE_23) |
| Áreas recreativas (IT_FUENTE) | `ServiciosPublicos:IDEM_MA_AREAS_RECREA` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_areasrecrea) · [GeoJSON](https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeNames=ServiciosPublicos:IDEM_MA_AREAS_RECREA) |
| OpenStreetMap amenity=drinking_water | `openstreetmap` | Externa | [ficha](https://download.geofabrik.de/europe/spain/madrid.html) |
| IGN: modelo digital del terreno (por verificar) | `MDT05` | Externa | [ficha](https://centrodedescargas.cnig.es/CentroDescargas/modelo-digital-terreno-mdt05) |
| Desfibriladores fuera del ámbito sanitario | `desfibriladores_externos_fuera_ambito_sanitario` | CKAN | [ficha](https://datos.comunidad.madrid/dataset/desfibriladores_externos_fuera_ambito_sanitario) |

**Complemento para la capital (Ayuntamiento de Madrid):**

- Fuentes de agua para beber — `300051-0-fuentes` — [ficha](https://datos.madrid.es/dataset/300051-0-fuentes)

### RF-14 · F4 · Tiempo, distancia, interior o exterior

- Sin base de datos propia: Filtros sobre RF-04.

### RF-15 · F4 · Perfiles: mayor, carrito, sensible a la contaminación

**Cobertura:** Comunidad

| Base de datos | Identificador | Origen | Enlace |
|---|---|---|---|
| EIEL: accesibilidad ACCESOSILL | `ServiciosPublicos:IDEM_EIEL_INSTAL_DEPORTIVA_23` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_eiel_instdepor2023) · [GeoJSON](https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeNames=ServiciosPublicos:IDEM_EIEL_INSTAL_DEPORTIVA_23) |
| Índice Nacional de Calidad del Aire (umbrales) | `MITECO` | Externa | [ficha](https://www.miteco.gob.es/es/calidad-y-evaluacion-ambiental/temas/atmosfera-y-calidad-del-aire/calidad-del-aire/ica.html) |

**Complemento para la capital (Ayuntamiento de Madrid):**

- Accesibilidad de polideportivos — `200186-0-polideportivos` — [ficha](https://datos.madrid.es/dataset/200186-0-polideportivos)
- Accesibilidad de parques y jardines — `200761-0-parques-jardines` — [ficha](https://datos.madrid.es/dataset/200761-0-parques-jardines)

### RF-16 · F4 · Pesos ajustables por factor

- Sin base de datos propia: Interfaz, sin fuente propia.

### RF-17 · F5 · Vista de municipio: deporte, naturaleza, movilidad, salud, educación, conectividad

**Cobertura:** Comunidad. Movilidad: paradas de autobús en todos los municipios; metro, cercanías y bici pública donde existen. Conectividad solo en los 155 municipios de la EIEL

| Base de datos | Identificador | Origen | Enlace |
|---|---|---|---|
| Centros sanitarios | `centros_servicios_establecimientos_sanitarios` | CKAN | [ficha](https://datos.comunidad.madrid/dataset/centros_servicios_establecimientos_sanitarios) |
| Farmacias | `oficinas_farmacia` | CKAN | [ficha](https://datos.comunidad.madrid/dataset/oficinas_farmacia) |
| Desfibriladores fuera del ámbito sanitario | `desfibriladores_externos_fuera_ambito_sanitario` | CKAN | [ficha](https://datos.comunidad.madrid/dataset/desfibriladores_externos_fuera_ambito_sanitario) |
| Centros educativos | `centros_educativos` | CKAN | [ficha](https://datos.comunidad.madrid/dataset/centros_educativos) |
| Centros de atención social | `atencion_social_registro_centros` | CKAN | [ficha](https://datos.comunidad.madrid/dataset/atencion_social_registro_centros) |
| Padrón por municipio | `padron_por_sexo` | CKAN | [ficha](https://datos.comunidad.madrid/dataset/padron_por_sexo) |
| Densidad de población | `1930748` | CKAN | [ficha](https://datos.comunidad.madrid/dataset/1930748) |
| Renta disponible bruta | `irpf_indicador_renta` | CKAN | [ficha](https://datos.comunidad.madrid/dataset/irpf_indicador_renta) |
| EIEL + planeamiento (deporte y naturaleza) | `—` | IDEM |  |
| EIEL: núcleos (conectividad) | `UnidadesAdministrativas:IDEM_EIEL_NUCLEOS_23` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_eiel_nucelos2023) · [GeoJSON](https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&typeNames=UnidadesAdministrativas:IDEM_EIEL_NUCLEOS_23) |
| Nomecalles: paradas de autobús | `Nomecalles · busparadas` | NMC | [ficha](https://gestiona.comunidad.madrid/nomecalles_web/) · [API](https://apiscm.comunidad.madrid/t/ciudadanos.comunidad.madrid/sector-publico/nomecalles-descargas/v1/paquetes/busparadas) |
| Nomecalles: estaciones de metro | `Nomecalles · estmetro` | NMC | [ficha](https://gestiona.comunidad.madrid/nomecalles_web/) · [API](https://apiscm.comunidad.madrid/t/ciudadanos.comunidad.madrid/sector-publico/nomecalles-descargas/v1/paquetes/estmetro) |
| Nomecalles: estaciones de cercanías | `Nomecalles · estcerca` | NMC | [ficha](https://gestiona.comunidad.madrid/nomecalles_web/) · [API](https://apiscm.comunidad.madrid/t/ciudadanos.comunidad.madrid/sector-publico/nomecalles-descargas/v1/paquetes/estcerca) |
| Bici pública (3 sistemas: BiciMAD, Rivas, Boadilla) | `bases_prestamo_bicicletas` | CKAN | [ficha](https://datos.comunidad.madrid/dataset/bases_prestamo_bicicletas) · [ficha](https://datos.crtm.es/maps/a303824bb41a45fb99f778d690e4d95b) |

**Complemento para la capital (Ayuntamiento de Madrid):**

- Panel de indicadores de distritos y barrios — `300087-0-indicadores-distritos` — [ficha](https://datos.madrid.es/dataset/300087-0-indicadores-distritos)
- Centros deportivos municipales — `200186-0-polideportivos` — [ficha](https://datos.madrid.es/dataset/200186-0-polideportivos)

### RF-18 · F5 · Encaje del municipio con las preferencias

- Sin base de datos propia: Derivado de RF-17.

### RF-20 · F6 · Pedir la ruta en texto libre; la IA la convierte en parámetros que se muestran y se pueden editar

**Cobertura:** No usa datos abiertos: solo interpreta el texto. No se envían ubicación ni datos personales

| Base de datos | Identificador | Origen | Enlace |
|---|---|---|---|
| Servicio de IA generativa (por decidir: OCI Generative AI de Oracle u otro) | `—` | Externa |  |

### RF-21 · F6 · Catálogo cerrado de condiciones: distancia o duración, actividad, circular o ida, pasar por (parque, fuente, banco, supermercado, área canina, juegos…) y evitar (tráfico, cuestas)

**Cobertura:** Comunidad. Comercio grande en Nomecalles; supermercados y tiendas pequeñas solo donde OSM los tiene

| Base de datos | Identificador | Origen | Enlace |
|---|---|---|---|
| Nomecalles: hipermercados | `Nomecalles · hipermercados` | NMC | [ficha](https://gestiona.comunidad.madrid/nomecalles_web/) · [API](https://apiscm.comunidad.madrid/t/ciudadanos.comunidad.madrid/sector-publico/nomecalles-descargas/v1/paquetes/hipermercados) |
| Nomecalles: mercados de abastos | `Nomecalles · mercadoabastos` | NMC | [ficha](https://gestiona.comunidad.madrid/nomecalles_web/) · [API](https://apiscm.comunidad.madrid/t/ciudadanos.comunidad.madrid/sector-publico/nomecalles-descargas/v1/paquetes/mercadoabastos) |
| Nomecalles: galerías de alimentación | `Nomecalles · galimentacion` | NMC | [ficha](https://gestiona.comunidad.madrid/nomecalles_web/) · [API](https://apiscm.comunidad.madrid/t/ciudadanos.comunidad.madrid/sector-publico/nomecalles-descargas/v1/paquetes/galimentacion) |
| OpenStreetMap: shop=supermarket / convenience, amenity=bench / drinking_water / waste_basket, leisure=dog_park / playground | `openstreetmap` | Externa | [ficha](https://download.geofabrik.de/europe/spain/madrid.html) |
| Parques, fuentes, desfibriladores y demás puntos de RF-04 y RF-13 | `—` | IDEM |  |

**Complemento para la capital (Ayuntamiento de Madrid):**

- Censo de locales y sus actividades — `200085-0-censo-locales` — [ficha](https://datos.madrid.es/dataset/200085-0-censo-locales)
- Bancos (mobiliario urbano) — `300095-0-mobiliario-bancos` — [ficha](https://datos.madrid.es/dataset/300095-0-mobiliario-bancos)
- Fuentes de agua para beber — `300051-0-fuentes` — [ficha](https://datos.madrid.es/dataset/300051-0-fuentes)

### RF-22 · F6 · Ruta por distancia objetivo (±10 %), circular o de ida, con puntos de paso obligatorios

**Cobertura:** Municipios piloto (grafo peatonal precalculado)

| Base de datos | Identificador | Origen | Enlace |
|---|---|---|---|
| OpenStreetMap: red peatonal | `openstreetmap` | Externa | [ficha](https://download.geofabrik.de/europe/spain/madrid.html) |
| Planeamiento: zonas verdes | `UsoDelSuelo:VPLA_V_RED_REF_25` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_redesref2025) |
| Cubierta terrestre | `BTA:IDEM_BTA_CUBIERTER_POL_17` | IDEM | [ficha](https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/spacm_bta) |

**Complemento para la capital (Ayuntamiento de Madrid):**

- Tráfico en tiempo real (pm.xml) — `202087-0-trafico-intensidad` — [ficha](https://datos.madrid.es/dataset/202087-0-trafico-intensidad)

### RF-23 · F6 · Respuesta que dice qué condiciones se cumplen y cuáles no, redactada solo con los resultados del motor

- Sin base de datos propia: Sale del motor de rutas; la IA solo redacta.

### RF-24 · F6 · Pedir aclaración si la petición es ambigua; rechazar lo que sale del catálogo o es consejo médico

- Sin base de datos propia: Reglas del asistente, sin fuente propia.

### RF-19 · Transversal · Fuente y fecha de cada dato

**Cobertura:** Comunidad

| Base de datos | Identificador | Origen | Enlace |
|---|---|---|---|
| Metadatos CKAN (fecha) y marca de validación V/N | `—` | CKAN |  |

**Complemento para la capital (Ayuntamiento de Madrid):**

- Metadatos CKAN del Ayuntamiento


---

## 7. Fuentes de datos: portales, acceso y formato

### 7.1 Portales usados y cómo se consultan
| Portal | URL | Acceso | Notas |
|---|---|---|---|
| Datos abiertos Comunidad de Madrid (CKAN) | https://datos.comunidad.madrid | API CKAN: `https://datos.comunidad.madrid/api/3/action/package_search?q=…`, `package_show?id=<id>`; ficha: `https://datos.comunidad.madrid/dataset/<id>` | CSV con `;`. Datos «propios» en UTF-8 con BOM; series estadísticas (padrón, renta, densidad) en Windows-1252. Coordenadas UTM ETRS89 huso 30 (EPSG:25830), a veces con coma decimal |
| IDEM (Infraestructura de Datos Espaciales) | https://idem.comunidad.madrid | WFS: `https://idem.comunidad.madrid/geoidem/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=<capa>&outputFormat=application/json` (admite `count=`, `propertyName=`, `srsName=EPSG:4326`). Catálogo CSW para fichas: `…/catalogocartografia/srv/spa/csw`; ficha: `https://idem.comunidad.madrid/catalogocartografia/srv/spa/catalog.search#/metadata/<id>` | 206 capas WFS. GeoJSON en EPSG:25830 por defecto. La búsqueda JSON del catálogo da 403; usar CSW |
| Nomecalles (Instituto de Estadística) | https://gestiona.comunidad.madrid/nomecalles_web/ | **Sin clave**: `GET https://apiscm.comunidad.madrid/t/ciudadanos.comunidad.madrid/sector-publico/nomecalles-descargas/v1/paquetes/<capa>` → JSON con `data.url_descarga` (zip con shapefile, enlace válido 1 hora). Lista de capas: `https://gestiona.comunidad.madrid/nomecalles_web/assets/download-layers.json`. Buscador: `…/nomecalles-buscador/v1/puntos-interes`, `/v1/direcciones`, `/v1/delimitaciones` (parámetro `busqueda`) | Shapefile EPSG:25830, DBF en UTF-8. Su web lleva credenciales incrustadas para otras API: **no usarlas**, la descarga funciona sin ellas |
| Datos abiertos Ayuntamiento de Madrid (CKAN) | https://datos.madrid.es | API CKAN `https://datos.madrid.es/api/3/action/…`; ficha `https://datos.madrid.es/dataset/<id>` | **Solo Madrid capital.** CSV `;` en Windows-1252 o UTF-8; JSON-LD para equipamientos; incluye LATITUD/LONGITUD |
| Informo (tráfico Ayto.) | https://informo.madrid.es/informo/tmadrid/pm.xml | XML en tiempo real (cada 5 min) | ~4.000 puntos de medida con `st_x`, `st_y` (UTM) incluidos |
| OpenStreetMap | Overpass (espejo que funcionó: `https://maps.mail.ru/osm/tools/overpass/api/interpreter`; overpass-api.de dio 406) y Geofabrik `https://download.geofabrik.de/europe/spain/madrid.html` | Overpass QL / PBF | Licencia ODbL. Cobertura de mobiliario muy desigual entre municipios |
| AEMET OpenData (sin verificar) | https://opendata.aemet.es/centrodedescargas/productosAEMET | `GET /opendata/api/prediccion/especifica/municipio/horaria/{cod_INE_5}?api_key=…` → JSON con URL `datos` → documento | **Requiere clave gratuita (pedir por email)**. Esquema tomado de documentación |
| CNIG / IGN (sin verificar) | https://centrodedescargas.cnig.es/CentroDescargas/modelo-digital-terreno-mdt05 | Descarga | Desnivel (RF-13) |
| MITECO — Índice Nacional de Calidad del Aire | https://www.miteco.gob.es/es/calidad-y-evaluacion-ambiental/temas/atmosfera-y-calidad-del-aire/calidad-del-aire/ica.html | Documento | Umbrales por categoría para población general y sensible (RF-15) |

### 7.2 Esquemas de las bases principales (campos clave comprobados)

**IDEM · `ServiciosPublicos:IDEM_EIEL_INSTAL_DEPORTIVA_23`** (ficha `spacm_eiel_instdepor2023`) — 726 puntos, 155 municipios (no incluye la capital ni los municipios grandes).
Campos: `MUN` (código INE 3 díg.), `MUNICIPIO`, `NOMBRE`, `TIPOINSTAL` (PISTAS POLIDEPORTIVAS 161, TERRENOS DE JUEGO 157, COMPLEJOS POLIDEPORTIVOS 142, OTROS 100, GIMNASIO 47, POLIDEPORTIVOS CUBIERTOS 42, PISCINAS AL AIRE LIBRE 35, FRONTONES, PISCINAS CUBIERTAS 10…), `SUP_CUBI`, `SUP_AIRE`, `SUP_PARCEL` (m²), `TITULAR`, `GESTION` (municipal, privada…), `ACCESOSILL` (CON/SIN ACCESO), `ESTADO` (BUENO 589, REGULAR 104, MALO 25, EN EJECUCION 8), una columna SI/vacío por deporte: `ATLETISMO` 22, `BALONCESTO` 330, `FUTBOL` 322, `PADEL` 154, `TENIS` 164, `GIMNASIA` 242, `SUBACUATIC` 51, `PATINAJE` 61, `OTROS` 302, **`NATACION` vacía en las 726 filas** (nadar se deduce de TIPOINSTAL).

**IDEM · `CubiertaTerrestre:IDEM_EIEL_PARQUE_23`** (`spacm_eiel_parques2023`) — 2.100 puntos. `NOMBRE`, `MUNICIPIO`, `TIPOPARQUE` (PARQUE URBANO, JARDINES, ZONAS RECREATIVAS, PARQUE INFANTIL…), `SUP_AIRE`, `AGUA`, `SANEAMIENT`, `COMEDOR`, `JUEGOSINFA` (EXISTE/NO EXISTE SERVICIO), `ACCESOSILL`, `ESTADO`.

**IDEM · `UnidadesAdministrativas:IDEM_EIEL_NUCLEOS_23`** (`spacm_eiel_nucelos2023`) — 467 polígonos. Población (`PADRON`, `POB_ESTACI`), conectividad (`CALIDADGSM`, `CALIDADUMT`, `CALIDADGPR`, `ACCESOREDI/A/W/T/B/S`), servicios básicos.

**IDEM · otras capas EIEL 2023:** `IDEM_EIEL_CENT_SANITARIO_23` (194; `TIPOCENTRO`, `UCI`), `IDEM_EIEL_CENT_ENSENANZA_23` (636; niveles educativos), `IDEM_EIEL_CENT_CULTURAL_23` (659; `BIBLIOTECA`, `CIVICOSOCI`, `HOGARPENSI`, `TEATRO`…), `IDEM_EIEL_CENT_ASISTENCIAL_23` (343).

**IDEM · `UsoDelSuelo:VPLA_V_RED_REF_25`** (`spacm_redesref2025`) — Planeamiento urbanístico refundido 2025, sistemas y redes públicas. 37.167 polígonos, **166 municipios incluidos los grandes (no la capital ni otros 12)**. `CD_MUNICIPIO`, `DS_MUNICIPIO`, `DS_USO_GENE` (Zonas Verdes y Espacios Libres 16.867; Comunicaciones; Equipamientos Sociales…), `DS_USO_DETA` (Jardines y Plazas, Parques Municipales y Urbanos, Vías Pecuarias, Deportivos 738…), `NM_AREA` (m²). Municipios sin esta capa: Madrid, Guadarrama, Torrelodones, Sevilla la Nueva, Villanueva de la Cañada, entre otros.

**IDEM · otras:** `ServiciosPublicos:IDEM_MA_AREAS_RECREA` (`spacm_areasrecrea`; 84 áreas con `IT_FUENTE`, `IT_BANCOS`, `IT_PAPEL`, `IT_ASEOS`, `IT_MESAS`, `IT_JINFANT`, `IT_CBIOSAL`, `IT_APARC`), `RedesTransporte:IDEM_V_MA_SENDAS_VERDES` (`spacm_sendasnaturaleza`; 224 líneas), `Zonas:IDEM_MA_VIAS_PECUARIAS` (`spacm_vpec`; 1.694), `BTA:IDEM_BTA_CUBIERTER_POL_17` (`spacm_bta`; 137.213 polígonos de cubierta terrestre, campo `id_fenomeno` p. ej. «Arbolado forestal»), `RedesTransporte:IDEM_GDIE_G_CALLES` (`spacm_callescm`; 48.841 viales con `TIPOLOGIA`), `Comun:IDEM_V_MUNICIPIOS` (179 polígonos, sin ficha en catálogo), `InstalacionesMedioAmbiente:IDEM_MA_EST_CALIDAD_AIRE` (48 estaciones de **ambas redes**, 24 de la capital), `InstalacionesMedioAmbiente:IDEM_MA_ZONAS_CALIDAD_AIRE`, `UsoDelSuelo:IDEM_MA_PARQUE_FOREST_PERI` (4 parques forestales del sur).

**CKAN Comunidad · calidad del aire** — `calidad_aire_estaciones` (28 estaciones fuera de la capital; `estacion_codigo`, `estacion_municipio`, `estacion_tipo_area`, `estacion_coord_longitud/latitud`, `estacion_analizador_NO2/PM10/PM2_5/O3…`), `calidad_aire_datos_dia` (horario; `municipio`, `estacion`, `magnitud`, `punto_muestreo`, `ano`, `mes`, `dia`, `h01…h24` valores y `v01…v24` validación V/N; las horas futuras salen vacías con N), `calidad_aire_datos_historico` (horario desde 2005, mismo formato), `calidad_aire_datos_meteo_historico` (meteo horaria desde 2020), `calidad_aire_zonas` (municipio → zona). Magnitudes: 8 NO₂, 9 PM2.5, 10 PM10, 14 O₃.

**CKAN Comunidad · servicios** — `centros_servicios_establecimientos_sanitarios` (45.962 filas, una por servicio; `centro_nro_registro`, `centro_tipo` —usar «Centro de salud» y «Consultorio de atención primaria»—, `municipio_nombre`, `localizacion_coordenada_x/y`), `oficinas_farmacia` (2.956; `MUNICIPIO_NOMBRE`, `LOCALIZACION_COORDENADA_X/Y`), `centros_educativos` (7.757; filtrar `SITUACIÓN` = ALTA, hay 3.552 de BAJA; `UTM_X/Y`), `atencion_social_registro_centros`, `censo_clasificacion_zonas_bano`, **`desfibriladores_externos_fuera_ambito_sanitario`** (toda la región; `tipo_establecimiento`, `municipio_nombre`, `direccion_longitud/latitud`, `horario_acceso`, `codigo_dea`), `spacm_entidades_deportivas` (sin coordenadas), `bases_prestamo_bicicletas` (solo enlace a mapa del CRTM; 3 sistemas: BiciMAD, BicinRivas, BiBO Boadilla).

**CKAN Comunidad · estadística municipal** — `padron_por_sexo`, `1930748` (densidad), `irpf_indicador_renta` (campos `Año`, `Tipo territorio`, `Código territorio`, `Territorio`, `Valor`, `Unidad`; cp1252). Disponibles si se necesitan: `grado_envejecimiento_por_edad`, `201276` (edad media), `personas_discapacidad_por_edad_y_sexo` (por municipio; hacen innecesario el INE).

**Nomecalles (comprobado descargando)**
| Capa (`ref`) | Registros | Cobertura | Campos |
|---|---|---|---|
| `deporte` | 1.358 | 178 municipios (capital 596, Getafe 19, Móstoles 27, Alcalá 26, Fuenlabrada 22, Leganés 18) | `CMUN`, `DESCR`, `DIRECCION`, `UTM_X`, `UTM_Y`, `PROCEDENCI`, `URL`, `ETIQUETA`, `CATEGORIA`. **Sin deporte por instalación**: deducir del nombre (polideportivo 190, campo de fútbol 48, piscina 40, pabellón 38, pádel 57, tenis 29, frontón 17) |
| `deporteotros` | 87 | 54 municipios | + `TIPO`, `SUBTIPO`, `IDINSTAL`, URL al censo del CSD |
| `imder` | 6 | Instituto Madrileño del Deporte | |
| `parques` | 780 | 62 municipios | `ETIQUETA`, `DIRECCION`, `UTM_X/Y`, `CMUN`, `MUNICIPIO`. Actualizado sept. 2025 |
| `busparadas` | 15.037 | Todos | `IDESTACION`, `MODO`, `CODIGOESTA`, `DESCR`, `CMUN`… |
| `estmetro` / `estcerca` | 297 / 93 | Donde existen | `ETIQUETA`, `LINEAS`/`LINEA`, `UTM_X/Y`, `MUNICIPIO` |
| Otras disponibles | | | `biblipubli`, `biblimunicipal`, `centrossalud`, `consultoriosalud`, `farmacias`, `bici` (vías ciclistas), `equipamientos_municipales`, `hospital`… |

**Ayuntamiento de Madrid (solo capital)** — `212531-0-calidad-aire-tiempo-real` (mismo formato H01…H24/V01…V24), `212629-0-estaciones-control-aire` (24), `300392-0-meteorologia-tiempo-real`, `202087-0-trafico-intensidad` (pm.xml: `idelem`, `descripcion`, `intensidad` veh/h, `ocupacion` %, `carga` 0–100, `nivelServicio`, `error`, `st_x`, `st_y`), `300051-0-fuentes`, `200186-0-polideportivos` (82), `200215-0-instalaciones-deportivas` (básicas), `210227-0-piscinas-publicas` (56), `200761-0-parques-jardines` (163), `300087-0-indicadores-distritos` (panel de barrios), más el mobiliario de la sección 5.5. Equipamientos con campos `NOMBRE`, `HORARIO`, `EQUIPAMIENTO` (texto), `ACCESIBILIDAD`, `CONTENT-URL`, `LATITUD`, `LONGITUD`, `DISTRITO`.

**AEMET (sin verificar)** — `prediccion.dia[]` con `fecha`, `temperatura[]`, `sensTermica[]`, `precipitacion[]`, `probPrecipitacion[]`, `estadoCielo[]`, `humedadRelativa[]`, `vientoAndRachaMax[]` (cada uno `{value, periodo}` con periodo = hora), `orto`, `ocaso`.

### 7.3 Cobertura por capa (estrategia para los 179 municipios)
| Capa | Fuente principal | Complementos |
|---|---|---|
| Instalaciones deportivas | Nomecalles `deporte` (178 municipios) | EIEL (detalle de deporte, cubierta, accesibilidad en 155), VPLA «Deportivos», OSM `sport=*`, Ayto. en capital |
| Parques y zonas verdes | VPLA zonas verdes (166) | EIEL parques, Nomecalles parques, áreas recreativas, Ayto. parques en capital |
| Calidad del aire | Red regional (28) + red Ayto. (24) | Municipios sin estación usan la de su zona |
| Meteorología | AEMET horaria por municipio (179) | Estaciones Ayto. en capital |
| Tráfico | Jerarquía de vías (OSM `highway`, viales IDEM) | Tráfico en tiempo real en capital |
| Fuentes de agua y mobiliario | OSM | EIEL parques (agua), áreas recreativas, Ayto. en capital |
| Desfibriladores | CKAN Comunidad (toda la región) | |
| Servicios (salud, educación, social) | CKAN Comunidad | EIEL, panel de barrios en capital |
| Movilidad (F5) | Nomecalles paradas, metro, cercanías | Bici pública (3 sistemas) |
| Conectividad (F5) | EIEL núcleos (155) | Resto «sin datos» (LoDCOREMadrid tendría 4G/5G pero su API no funciona) |

---

## 8. Hallazgos sobre los datos (riesgos y cómo tratarlos)
| Gravedad | Hallazgo | Tratamiento |
|---|---|---|
| Alta | El CKAN de la Comunidad no tiene censo de instalaciones deportivas | Usar Nomecalles (regional) + EIEL (detalle) + VPLA + OSM + Ayto. |
| Alta | La EIEL solo cubre 155 municipios (no los grandes ni la capital) | Combinar fuentes según la tabla 7.3 |
| Media | `NATACION` vacía en las 726 filas de la EIEL | Nadar = TIPOINSTAL «PISCINAS…» (45: 35 al aire libre, 10 cubiertas) |
| Media | La red de aire regional no mide en la capital | Unir red regional y del Ayto. (mismo formato); la capa IDEM tiene las 48 estaciones juntas |
| Media | Nomecalles no indica el deporte de cada instalación | Deducir por palabras clave del nombre; EIEL donde exista |
| Media | Coordenadas en EPSG:25830, algunas con coma decimal | Reproyectar todo a EPSG:4326 en la ingesta y normalizar decimales |
| Media | Codificaciones mezcladas (UTF-8 BOM, Windows-1252) | Detectar por fuente |
| Media | 13 municipios fuera del planeamiento VPLA (Madrid, Guadarrama, Torrelodones, Sevilla la Nueva, Villanueva de la Cañada…) | Mostrar «sin dato»; usar cubierta terrestre/OSM para el % verde |
| Media | Mobiliario en OSM muy desigual | Mostrar donde haya datos y avisar |
| Baja | `centros_educativos` incluye centros de baja | Filtrar `SITUACIÓN = ALTA` |
| Baja | En Nomecalles la capa `bancos` son **oficinas bancarias**, no bancos para sentarse | Bancos para sentarse: OSM `amenity=bench`, áreas recreativas `IT_BANCOS` y Ayto. `300095` |
| Baja | Rutas verdes y autobuses interurbanos en CKAN solo como HTML | Sendas IDEM; paradas Nomecalles |
| Baja | El sanitario tiene una fila por servicio | Contar `centro_nro_registro` distintos |
| Info | Las horas futuras del aire del día salen vacías (N) | Futuro con AEMET + patrón histórico de la estación |

---

## 9. Municipios: cobertura de datos y pilotos

### 9.1 Mobiliario en OpenStreetMap (los 179 municipios, 30.672 elementos descargados)
Municipios con al menos un elemento: fuentes 152, juegos infantiles 143, bancos 88, biosaludables 59, papeleras 57, áreas caninas 57, aseos 56, desfibriladores 28 (para DEA usar el dataset oficial).
Nivel de mapeo: **A completo** (≥50 bancos, ≥10 papeleras, ≥5 fuentes) 16 municipios · **B parcial** (≥10 bancos o ≥3 fuentes) 88 · **C escaso** 64 · **sin nada** 11. En unos 100 municipios la ruta puede mostrar algo útil.
Ejemplos: Getafe 1.074 bancos, 61 fuentes, 307 papeleras; Algete 0 bancos, 2 fuentes, 0 papeleras.

### 9.2 Pilotos de ruta saludable
- **Getafe ★**: mobiliario OSM nivel A, 172,8 m² de zona verde por habitante en VPLA, estación de aire propia, 216 desfibriladores, 19 instalaciones Nomecalles.
- **Madrid capital ★**: tráfico en tiempo real, fuentes, mobiliario, red de aire y equipamientos del Ayuntamiento.
- **Alternativa — San Lorenzo de El Escorial**: único con EIEL (deporte detallado), VPLA (90,5 m²/hab) y OSM nivel A a la vez; sin estación de aire propia.
- **Descartados**: Algete (casi sin mobiliario en OSM), Guadarrama (fuera del planeamiento).


### 9.3 Tabla de los 25 municipios con más datos

Ordenados por número de capas disponibles (EIEL, planeamiento, OSM nivel A/B, estación de aire propia; la capital suma el Ayuntamiento) y después por mobiliario OSM. «s/d» = el municipio no está en esa capa (no significa cero). ★ = piloto propuesto.

| Municipio | INE | Población 2025 | Bancos | Fuentes | Papeleras | Aseos | Áreas caninas | Juegos | Biosaludables | Nivel OSM | Instal. EIEL | Con pádel | Piscinas | Cubiertas | Parques EIEL | Zona verde m²/hab | Áreas recreativas | Desfibriladores | Centros salud | Farmacias | Centros educ. | Estación aire | Zona de aire |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Rascafría | 1202 | 1.704 | 28 | 8 | 4 | 5 | 0 | 2 | 0 | B | 6 | 0 | 0 | 3 | 13 | 56,9 | 4 | 1 | 2 | 1 | 2 | Sí | Rural Sierra Norte |
| San Martin de Valdeiglesias | 1338 | 9.324 | 10 | 10 | 3 | 0 | 0 | 6 | 0 | B | 10 | 0 | 2 | 6 | 15 | 73,3 | 2 | 8 | 1 | 3 | 11 | Sí | Rural Cuenca Del Alberche |
| Guadalix de la Sierra | 0679 | 6.993 | 0 | 7 | 0 | 0 | 0 | 0 | 0 | B | 5 | 1 | 0 | 5 | 10 | 112,9 | 0 | 5 | 1 | 2 | 5 | Sí | Rural Sierra Norte |
| Villa del Prado | 1718 | 7.743 | 0 | 4 | 0 | 1 | 0 | 2 | 0 | B | 3 | 2 | 0 | 3 | 19 | 159,2 | 1 | 0 | 1 | 2 | 4 | Sí | Rural Cuenca Del Alberche |
| El Atazar | 0164 | 110 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | B | 4 | 1 | 0 | 2 | 5 | s/d | 0 | 1 | 1 | 0 | 0 | Sí | Rural Sierra Norte |
| Getafe ★ | 0650 | 193.238 | 1074 | 61 | 307 | 28 | 6 | 144 | 17 | A | s/d | s/d | s/d | s/d | s/d | 172,8 | 0 | 216 | 9 | 61 | 105 | Sí | Aglomeración Urbana Sur |
| Fuenlabrada | 0587 | 190.076 | 474 | 15 | 23 | 3 | 2 | 184 | 3 | A | s/d | s/d | s/d | s/d | s/d | 25,4 | 0 | 168 | 8 | 66 | 106 | Sí | Aglomeración Urbana Sur |
| Majadahonda | 0800 | 73.625 | 327 | 22 | 143 | 11 | 16 | 47 | 1 | A | s/d | s/d | s/d | s/d | s/d | 58,0 | 1 | 120 | 2 | 25 | 43 | Sí | Aglomeración Urbana Noroeste |
| Leganés | 0745 | 195.734 | 192 | 102 | 28 | 12 | 2 | 115 | 6 | A | s/d | s/d | s/d | s/d | s/d | 40,5 | 0 | 202 | 9 | 68 | 107 | Sí | Aglomeración Urbana Sur |
| Alcalá de Henares | 0053 | 203.208 | 256 | 48 | 41 | 23 | 11 | 78 | 7 | A | s/d | s/d | s/d | s/d | s/d | 30,3 | 2 | 284 | 10 | 69 | 112 | Sí | Aglomeración Corredor Del Henares |
| Móstoles | 0920 | 214.817 | 60 | 8 | 18 | 5 | 13 | 191 | 33 | A | s/d | s/d | s/d | s/d | s/d | 25,6 | 0 | 184 | 10 | 73 | 104 | Sí | Aglomeración Urbana Sur |
| Alcorcón | 0072 | 175.719 | 182 | 10 | 10 | 11 | 4 | 103 | 5 | A | s/d | s/d | s/d | s/d | s/d | 33,8 | 0 | 136 | 8 | 69 | 102 | Sí | Aglomeración Urbana Sur |
| San Lorenzo de El Escorial | 1317 | 18.872 | 85 | 32 | 26 | 4 | 1 | 22 | 1 | A | 11 | 3 | 1 | 5 | 63 | 90,5 | 1 | 32 | 1 | 6 | 17 | No | Aglomeración Urbana Noroeste |
| Villamantilla | 1757 | 1.660 | 57 | 7 | 24 | 0 | 0 | 11 | 6 | A | 6 | 1 | 0 | 1 | 3 | 56,5 | 0 | 1 | 1 | 1 | 3 | No | Rural Cuenca Del Alberche |
| Algete | 0091 | 21.144 | 0 | 2 | 0 | 0 | 2 | 25 | 0 | C | 7 | 2 | 0 | 2 | 34 | 101,1 | 0 | 23 | 2 | 7 | 15 | Sí | Aglomeración Corredor Del Henares |
| Villarejo de Salvanes | 1809 | 8.042 | 4 | 1 | 0 | 1 | 0 | 3 | 0 | C | 5 | 0 | 0 | 2 | 9 | 14,1 | 0 | 6 | 1 | 2 | 11 | Sí | Rural Cuenca Del Tajuña |
| Orusco de Tajuna | 1028 | 1.531 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | C | 2 | 0 | 0 | 1 | 7 | 1,8 | 0 | 1 | 1 | 1 | 4 | Sí | Rural Cuenca Del Tajuña |
| Madrid ★ | 0796 | 3.506.730 | 9930 | 2075 | 3694 | 313 | 157 | 2041 | 347 | A | s/d | s/d | s/d | s/d | s/d | s/d | 0 | 7211 | 131 | 1814 | 1665 | No | Madrid |
| Coslada | 0493 | 80.512 | 281 | 33 | 2 | 1 | 13 | 82 | 20 | B | s/d | s/d | s/d | s/d | s/d | 32,9 | 0 | 111 | 6 | 30 | 45 | Sí | Aglomeración Corredor Del Henares |
| San Sebastian de los Reyes | 1343 | 96.992 | 14 | 98 | 2 | 5 | 17 | 100 | 8 | B | s/d | s/d | s/d | s/d | s/d | 63,1 | 0 | 101 | 4 | 28 | 63 | Sí | Aglomeración Corredor Del Henares |
| Torrejón de Ardoz | 1489 | 143.526 | 17 | 37 | 6 | 19 | 29 | 93 | 13 | B | s/d | s/d | s/d | s/d | s/d | 21,0 | 0 | 183 | 6 | 35 | 69 | Sí | Aglomeración Corredor Del Henares |
| San Fernando de Henares | 1300 | 39.059 | 183 | 30 | 0 | 2 | 3 | 40 | 5 | B | 7 | 0 | 0 | 4 | 30 | 63,1 | 0 | 116 | 2 | 11 | 21 | No | Aglomeración Corredor Del Henares |
| Alcobendas | 0066 | 123.342 | 25 | 45 | 7 | 4 | 8 | 55 | 2 | B | s/d | s/d | s/d | s/d | s/d | 38,2 | 1 | 283 | 6 | 38 | 87 | Sí | Aglomeración Corredor Del Henares |
| Collado Villalba | 0474 | 67.274 | 38 | 41 | 7 | 3 | 6 | 52 | 4 | B | s/d | s/d | s/d | s/d | s/d | 80,9 | 0 | 57 | 4 | 21 | 39 | Sí | Aglomeración Urbana Noroeste |
| San Martín de la Vega | 1322 | 21.010 | 102 | 39 | 1 | 13 | 2 | 15 | 1 | B | 12 | 1 | 1 | 4 | 33 | 55,5 | 2 | 16 | 1 | 6 | 15 | No | Aglomeración Urbana Sur |


---

## 10. Portales evaluados y descartados (o pendientes)
| Portal | Conclusión |
|---|---|
| **LoDCOREMadrid** (https://lodcoremadrid.es) | Cátedra de la **UC3M** (misma universidad que organiza el reto; servidores en `sel.inf.uc3m.es`). Visores de accesibilidad y de atractivo municipal. API de atractivo `https://attractiveness-api.sel.inf.uc3m.es/Inventario/indicadores/` lista **611 indicadores** (incluye cobertura 4G/5G/100 Mbps, zonas verdes, centros deportivos, piscinas cubiertas…), pero pedir valores falla (`/LAUs/valores_municipio/{id}` da error interno; `/LAUs/valores_indicador/{ind}/{año}` devuelve vacío). API de accesibilidad `https://accessibility-api.sel.inf.uc3m.es/visor/municipios` funciona (155 municipios). **Decisión: no usar; como mucho preguntar en Discord.** Aviso: su servidor de atractivo está en modo depuración (muestra trazas internas) |
| **eDatos / IESTADIS** (https://iestadis.edatos.io) | Tiene API, pero la población, densidad, renta y edad ya están en el CKAN de la Comunidad. No aporta nada nuevo |
| **INE** (API `servicios.ine.es/wstempus`) | Funciona. Solo aportaría el atlas de renta por sección censal (operación ADRH), útil para empresa. No hace falta para el MVP |
| **Nomecalles** | **Sí se usa** (ver 7.1 y 7.2) |

---

## 11. Recomendaciones
1. Publicar los datos derivados (catálogo unificado de destinos, indicadores por municipio) como datasets abiertos CC BY: suma en el criterio 1.1.
2. Convertir el «informe de datos que faltan» en entregable para la Comunidad y el Ayuntamiento (NATACION vacía, 13 municipios fuera del planeamiento, 75 municipios sin mobiliario mapeado…).
3. Demo «dos personas, mismo sitio, distinta respuesta» (Carmen y Lucía) moviendo los pesos en directo: criterio 2.2, primer desempate.
4. Plan B de demo: caché de AEMET y aire del día del ensayo y un «modo demo» por si falla la red.
5. Una cifra de impacto por ruta: «−35 % de tramos junto a tráfico intenso, +2 fuentes».
6. Pedir hoy la clave de AEMET y verificar su esquema (única fuente crítica sin comprobar).
7. Si se hace algo de administración, una sola pantalla (por ejemplo en Oracle APEX, patrocinador).
8. **No ampliar alcance**: administración y empresa como mucho una pantalla o un dataset cada una. Envejecimiento, discapacidad, LoDCOREMadrid y atlas de renta fuera del MVP.
9. «Espacios cubiertos cercanos» (bibliotecas, centros cívicos, polideportivos y piscinas cubiertas, de la EIEL y Nomecalles) como ampliación de RF-09 ante calor extremo; no son «refugios climáticos» porque ningún dato indica si tienen aire acondicionado. Sin requisito nuevo; está pendiente decidir si se incluye.

---

## 12. Registro de decisiones
| Decisión | Estado |
|---|---|
| Ámbito: toda la Comunidad de Madrid (179 municipios), sin límite de población | Tomada |
| Ayuntamiento de Madrid solo como complemento para la capital | Tomada |
| Foco principal en el ciudadano, después administración y por último empresa | Tomada |
| Las ideas de ejemplo de las presentaciones son opcionales | Tomada |
| Añadir desfibriladores, bici pública y Nomecalles a la matriz | Tomada (hecho) |
| No añadir requisitos nuevos para «espacios cubiertos» ni más perspectivas | Tomada |
| Pilotos de ruta: Getafe y Madrid capital; alternativa San Lorenzo de El Escorial | Propuesta, pendiente de confirmar por el equipo |
| Añadir F6 «Asistente de rutas con IA» (RF-20 a RF-24, Should). La IA generativa solo interpreta y explica; el motor de reglas decide | Tomada (sustituye a «sin IA generativa» del documento de idea) |
| Mobiliario en ruta para el MVP: fuentes, bancos, sombra, áreas caninas, juegos, desfibriladores | Propuesta |

---

## 13. Pendientes
- [ ] Quitar del .docx de idea toda referencia a «menos de 50.000 habitantes» y al piloto bajo ese umbral; actualizar la sección 7 (fuentes) con los identificadores de este documento.
- [ ] Pedir la clave de AEMET OpenData y verificar el esquema de la predicción horaria.
- [ ] Confirmar los pilotos con el equipo.
- [ ] Decidir los indicadores definitivos de la vista de municipio (F5).
- [ ] Revisar licencias de cada dataset (CKAN y Ayto. CC BY 4.0; OSM ODbL; AEMET aviso legal).
- [ ] Completar nombres del equipo (máximo 4) y enviar el formulario antes del 9 de octubre.
- [ ] Verificar el modelo de elevación del IGN si se mantiene el desnivel (RF-13, Should).

---

## 14. Planning propuesto
| Fecha | Tarea | Responsable |
|---|---|---|
| Mar 6 oct | Inventario de fuentes y esquemas | Hecho |
| Mié 7 | Cerrar matriz, pilotos e indicadores de F5; pedir clave AEMET | Todos |
| Jue 8 | Rehacer el documento de idea con identificadores exactos y estrategia de cobertura | Datos + producto |
| Vie 9 | Revisión y envío del formulario | Todos |
| Sáb 10 – Lun 12 | Pruebas: ingesta a DuckDB/GeoParquet en EPSG:4326; grafo peatonal del piloto con OSMnx y % verde por tramo; mejor franja con AEMET + aire | Datos / Rutas / Motor |
| Mar 13 | Finalistas. Ingesta programada y modelo unificado congelado | Datos |
| Mié 14 – Jue 15 | Motor de puntuación, mejor franja, alternativas, explicaciones; endpoints `/recomendar` y `/municipio` | Motor |
| Vie 16 | Ruta saludable en los pilotos; endpoint `/ruta` | Rutas |
| Sáb 17 – Dom 18 | Interfaz móvil, perfiles, pesos, caché, listado de fuentes y licencias | Front |
| Lun 19 | Ensayo con las personas de la demo y guion de 10 minutos | Todos |
| Mar 20 | Demo | Todos |

Roles sugeridos (4 personas): **Datos** (ingesta, limpieza, reproyección, modelo, licencias), **Motor** (puntuación, franja, API FastAPI), **Rutas** (grafo peatonal y costes por tramo), **Front** (MapLibre, perfiles, vista de municipio).

### 14.1 Modelo de datos destino (DuckDB + GeoParquet, EPSG:4326, UTF-8)
- `municipio(cod_ine PK, nombre, geom, poblacion, densidad, renta_media, zona_aire, en_eiel, en_vpla, piloto_ruta)`
- `destino(id PK '{fuente}:{id_origen}', fuente, nombre, tipo [instalacion|parque|area_recreativa|senda|zona_bano], actividades[], cubierta, exterior, accesible, estado, titular, agua, url, cod_ine FK, geom, actualizado)`
- `estacion_aire(id PK, red [CM|AY], nombre, tipo_area, magnitudes[], cod_ine, geom)`
- `lectura_aire(estacion_id, magnitud, ts, valor, validado)` (formato largo: H01…H24 → filas)
- `prevision(cod_ine, ts, temp, sens_termica, prob_precip, precip, viento, cielo)`
- `tramo(id, u, v, geom, longitud_m, tipo_via, pct_verde, trafico, fuente_cerca)`
- `poi_ruta(id, tipo [fuente|banco|papelera|aseo|area_canina|juegos|dea|biosaludable], fuente, geom)`
- `servicio(id, categoria [salud|farmacia|educacion|social|cultura|transporte], subtipo, cod_ine, geom)`
- `indicador_municipio(cod_ine, categoria, indicador, valor (NULL = sin datos), unidad, anio, fuente)`

---

## 15. Archivos y enlaces
- **Página de trabajo (artifact, privada):** https://claude.ai/artifact/MT3co6p1UKtJypQwBGqZpK — contiene: problema y propuesta, perspectivas, tabla de requisitos con bases de datos y enlaces, y los 25 municipios con más datos (tabla ordenable).
- **Repositorio:** `CLAUDE.md` (contexto principal), `docs/presentaciones/` (8 PDF), `docs/idea/` (.docx de idea desactualizado, prototipo .png y .html, notas de ChatGPT), `docs/referencia/` (`requisitos_fuentes.json`, `municipios_candidatos.json`, `matriz-datos.html`), `scripts/descargar_fuentes.py` (descarga las fuentes a `data/raw/`).

---

## 16. Cómo continuar en otra conversación
Pega este documento y empieza con algo como:

> «Este es el contexto de nuestro proyecto para el MAD Open Data Challenge 2026 (Muévete Cerca). Ámbito: toda la Comunidad de Madrid, sin límite de población. Ayúdame con: [siguiente tarea, por ejemplo: rehacer la sección de fuentes del documento de idea / diseñar el motor de puntuación / escribir el script de ingesta de Nomecalles y la EIEL].»
