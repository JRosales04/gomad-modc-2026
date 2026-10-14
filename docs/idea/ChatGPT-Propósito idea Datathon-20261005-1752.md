# Propósito idea Datathon

**User:** Anonymous  
**Created:** 10/5/2026 17:38:02  
**Updated:** 10/5/2026 17:51:10  
**Exported:** 10/5/2026 17:52:45  
**Link:** [https://chatgpt.com/c/6ac3c45a-24b8-83ed-866f-333cdb1cc653](https://chatgpt.com/c/6ac3c45a-24b8-83ed-866f-333cdb1cc653)  

## Prompt:
5/10/2026, 17:38:14

a partir de esto me tienes que decir con qué propósito se tiene que definir una idea para esta datathon, luego te pasaré mi idea para que le eches un ojo y valores si vamos por buen camino

[Attachment: Pegado text(3).txt]

## Response:
5/10/2026, 17:38:18 · gpt-5-6

Sí. He revisado las bases y, antes de que me pases vuestra idea, hay una cosa importante: el objetivo no es simplemente "hacer algo con datos abiertos". La idea tiene que estar planteada para maximizar dos bloques que valen exactamente lo mismo en la evaluación: calidad del resultado (50 puntos) y usabilidad/interactividad (50 puntos). `Pegado text.txt`

### ¿Para qué tiene que servir vuestra idea?

El propósito general del Datathon es desarrollar una solución tecnológica innovadora para ciudadanía de la Comunidad de Madrid, utilizando principalmente datos abiertos de la Comunidad y, si tiene sentido, complementándolos con datos públicos de otras entidades. Las áreas explícitas son:

- Natalidad
- Transportes
- Servicios sociales
- Bienestar
- Salud `Pegado text.txt`

Pero yo lo plantearía así:

> "Tenemos un problema real de una persona o colectivo de Madrid → existen datos públicos que permiten entenderlo → los combinamos/procesamos → generamos una decisión, recomendación o información útil → la presentamos de forma muy sencilla e interactiva."

Ese es el tipo de cadena que deberíais buscar.

### Lo que realmente va a valorar el jurado

Hay cuatro preguntas que vuestra idea debería poder responder claramente:

1. ¿Estamos tratando los datos de forma correcta y con sentido?
   
   Hasta 25 puntos. No basta con coger tres datasets y ponerlos juntos; tiene que haber una relación lógica entre ellos. `Pegado text.txt`

2. ¿Resolvemos realmente el problema?
   
   Otros 25 puntos. Aquí está la diferencia entre un dashboard bonito y un proyecto que tiene utilidad real. `Pegado text.txt`

3. ¿Una persona puede entender el resultado fácilmente?
   
   25 puntos. El usuario no debería necesitar saber qué es una API, un dataset ni cómo habéis procesado los datos. `Pegado text.txt`

4. ¿Puede adaptar la solución a su situación?
   
   Otros 25 puntos. Este es especialmente importante: el usuario debería poder introducir preferencias, ubicación, necesidades, situación familiar, etc., y obtener un resultado personalizado. `Pegado text.txt`

De hecho, el criterio de desempate más importante es precisamente la flexibilidad/adaptación al caso específico del usuario. `Pegado text.txt`

### Por tanto, yo buscaría una idea con esta estructura

```text
PROBLEMA REAL
      ↓
¿A quién le ocurre?
      ↓
DATOS ABIERTOS
      ↓
Cruce + análisis
      ↓
RESULTADO / RECOMENDACIÓN
      ↓
INTERFAZ MUY SENCILLA
      ↓
"Esto es lo que te interesa a TI"
```

Y evitaría especialmente:

- Un simple mapa con puntos.
- Un dashboard que solo muestra estadísticas.
- "Metemos IA porque queda bien".
- Una solución que necesite explicar durante 10 minutos cómo utilizarla.
- Una idea en la que los datos sean accesorios y realmente no aporten nada.
- Algo tan ambicioso que luego sea imposible tener un MVP funcional.

Las propias bases dejan bastante libertad tecnológica y de tratamiento de datos, pero exigen utilizar las APIs de los catálogos de datos abiertos de la Comunidad de Madrid, incluyendo IDEM y el catálogo unificado, y presentar un MVP funcional. `Pegado text.txt`

### Y hay una pista MUY importante

Los ejemplos que ponen las bases no son casuales. Todos convierten datos públicos en una acción útil:

- "¿Qué actividad física puedo hacer?"
- "¿Cómo hago una ruta accesible?"
- "¿Por dónde paseo para evitar contaminación?"
- "¿Dónde tengo un servicio sanitario abierto?"
- "¿Dónde puedo reciclar este residuo?"

Es decir, no se quedan en:

> "Aquí tienes los datos."

Sino que buscan:

> "Dime qué necesitas y te digo qué hacer."

`Pegado text.txt`

Eso, para mí, es la clave del Datathon.

Además, en la fase de ideas os van a pedir explícitamente título, aproximación técnica, fuentes de datos y propuesta de interfaz, así que cuando me pases vuestra idea podemos revisarla exactamente con esos cuatro elementos. `Pegado text.txt`

Pásame ahora vuestra idea tal cual la tengáis, aunque esté verde o sea un poco chapuza. Te la voy a evaluar bastante a saco: encaje con el reto, datos disponibles, utilidad real, dificultad, MVP, diferenciación y, sobre todo, **qué posibilidades le veo de sacar muchos puntos frente a otras propuestas**.

## Prompt:
5/10/2026, 17:41:45

[Attachment: Se ha pegado el markdown.md]

## Response:
5/10/2026, 17:41:47 · gpt-5-6

Sí: viendo la propuesta completa, vais por muy buen camino. De hecho, conceptualmente creo que está bastante bien alineada con las bases. `Se ha pegado el markdown.md`

Mi valoración inicial sería:

| Aspecto | Valoración |
|---|---|
| Encaje con el reto | 🟢 Muy alto |
| Uso de datos abiertos | 🟢 Muy alto |
| Utilidad ciudadana | 🟢 Muy alto |
| Interactividad | 🟢 Muy alto |
| Diferenciación | 🟢 Buena |
| Viabilidad del MVP | 🟡 Riesgo medio |
| Riesgo de sobrealcance | 🔴 Alto |

### Lo que más me gusta

La idea no se queda en "te enseño parques e instalaciones". Hace una cadena bastante potente:

> qué hacer → dónde hacerlo → cuándo hacerlo → cómo llegar de forma saludable.

Eso encaja especialmente bien con los criterios del jurado porque permite personalizar el resultado según tiempo, actividad, perfil, preferencias, ubicación, etc. `Se ha pegado el markdown.md`

Y hay otra cosa que me parece especialmente buena: la ruta saludable no es simplemente "Google Maps pero con otro nombre". Estáis intentando optimizarla según tráfico, zonas verdes, sombra, fuentes, pendientes, escaleras, etc. Eso convierte los datos en una decisión.

### El mayor acierto estratégico

Habéis identificado correctamente que el criterio 2.2 es oro:

> "¿Puede adaptar la solución a su caso específico?"

La propuesta tiene perfiles, sliders, tiempo disponible, distancia máxima, interior/exterior, número de personas, preferencias de ruta... `Se ha pegado el markdown.md`

Eso puede dar muchísimo juego en una demo.

Por ejemplo:

> "Dos personas están en Getafe. Una quiere llegar rápido y otra prioriza sombra y aire limpio."

Movéis un slider → cambia la ruta → cambia la recomendación.

Eso es exactamente el tipo de interactividad que un jurado puede entender en 10 segundos.

### PERO: aquí os daría un buen tirón de orejas

Ahora mismo la propuesta intenta hacer **demasiadas cosas**.

Tenéis:

- recomendador de deportes
- recomendador de actividades
- recomendador temporal
- perfiles
- calidad del aire
- meteorología
- UV
- polen
- tráfico
- zonas verdes
- sombra
- fuentes
- rutas peatonales
- accesibilidad
- planes para grupos
- planificación semanal
- rutas circulares
- transporte público...

Y además queréis cubrir toda la Comunidad de Madrid.

Eso es peligrosísimo para un MVP de aproximadamente dos semanas.

La propia propuesta reconoce el problema y plantea un núcleo reducido, lo cual está bien. `Se ha pegado el markdown.md`

Pero yo iría incluso más lejos.

### Yo convertiría el proyecto en esto

El corazón debería ser:

> "Dime dónde estás, cuánto tiempo tienes y qué quieres hacer, y te digo dónde, cuándo y por qué es el mejor sitio para hacerlo hoy."

Y después:

> "Te llevo hasta allí por una ruta más saludable que la ruta convencional."

Todo lo demás debería estar subordinado a eso.

No intentaría que el MVP sea "una plataforma completa de ocio saludable". Intentaría que sea **un recomendador contextual de actividad física**.

Eso hace que la historia sea mucho más fácil de vender.

### También cambiaría una cosa conceptual

Cuidado con vender demasiado la parte de "salud".

Tenéis frases como:

> "ruta más saludable"

> "valoración de salud"

> "exposición estimada"

Está bien como concepto, pero puede generar preguntas incómodas:

- ¿Cómo sabéis que una ruta es más saludable?
- ¿Qué relación exacta hay entre tráfico y exposición?
- ¿Cómo interpoláis la contaminación entre estaciones?
- ¿Por qué ese umbral?
- ¿Cómo sabéis que una persona con asma debería evitar X?

Habéis anticipado bastante bien este problema al explicar que el aire calle a calle es una estimación y al usar umbrales oficiales. `Se ha pegado el markdown.md`

Pero yo sería muy cuidadoso con el lenguaje:

**No estáis haciendo medicina.**

Estáis haciendo:

> recomendación de actividad basada en condiciones ambientales.

Eso es mucho más defendible.

### Y hay una comprobación que para mí es crítica

Antes de enamoraros de los cuatro modos, hay que comprobar los datasets.

Especialmente:

> instalaciones deportivas → deportes disponibles → cubierta/exterior.

La propia propuesta identifica esto como la verificación más urgente. `Se ha pegado el markdown.md`

Si resulta que el dataset no permite saber de forma fiable qué deporte se practica en cada instalación, el modo:

> "Quiero jugar al pádel"

puede convertirse en una chapuza de inferencias.

En cambio, el núcleo:

> parques + instalaciones + meteorología + aire + ubicación + rutas

parece mucho más robusto.

---

### Mi nota provisional

Si me obligaras a puntuarla ahora mismo, **sin haber comprobado todavía los datasets reales**, le daría aproximadamente:

**8-8,5/10 como idea.**

Con una reducción inteligente del alcance y verificando que las fuentes prometidas existen realmente:

**9/10 o incluso más.**

El potencial para ganar está ahí. El peligro no es que la idea sea mala; **es que intentéis construir la idea entera que habéis escrito**.

Y una última cosa: vuestra sección de "Estrategia ante el jurado" está pensando correctamente en los criterios de evaluación, especialmente 2.2 y 1.2. `Se ha pegado el markdown.md` Eso me parece una señal muy buena.

Si quieres, el siguiente paso que haría es **desmontar esta propuesta como si yo fuera miembro del jurado**: qué partes compraría, cuáles cuestionaría, qué preguntas os haría y qué cambiaría para intentar convertirla en una propuesta de 90-100 puntos.

## Prompt:
5/10/2026, 17:44:40

necesito que me hagas un elevator pitch en relacion al problema que plantean las bases con mi idea para saber bien como identificar puntos puertes y puntos negativos y donde reducir/ampliar

## Response:
5/10/2026, 17:44:42 · gpt-5-6

Sí. De hecho, creo que hacer el elevator pitch es una de las mejores formas de detectar si la idea está demasiado abierta, porque te obliga a responder en 30-45 segundos: “¿qué problema concreto resolvemos y por qué nuestros datos permiten resolverlo mejor?”.

Las bases plantean, en esencia, un problema de elección de municipio y de acceso/uso de servicios y condiciones que afectan al bienestar, usando datos abiertos para ayudar al ciudadano a tomar decisiones. `Pegado text.txt`

Vuestra propuesta lo lleva a una decisión mucho más cotidiana: qué actividad hacer, dónde hacerla, cuándo hacerla y cómo llegar en mejores condiciones. `Se ha pegado el markdown.md`

### Elevator pitch de vuestra idea

**standard: Elevator pitch - Muévete Cerca**

Hoy tenemos mucha información sobre nuestro entorno, pero está dispersa: instalaciones deportivas, parques, calidad del aire, tráfico y meteorología. El problema es que el ciudadano tiene que cruzar todos esos datos por su cuenta para decidir algo tan sencillo como qué actividad hacer, dónde y cuándo.

Muévete Cerca convierte esos datos abiertos en una recomendación personalizada. Le dices qué quieres hacer, cuánto tiempo tienes y, opcionalmente, tus preferencias, y el sistema combina actividad disponible, meteorología, calidad del aire, zonas verdes y movilidad para decirte dónde hacerlo, cuál es el mejor momento y cómo llegar por una ruta más saludable.

No queremos enseñar al ciudadano un mapa lleno de datos; queremos transformar esos datos en una decisión sencilla y útil: “esto es lo que puedes hacer, aquí, ahora y esta es la mejor forma de llegar”.

Ese pitch ya os deja ver bastante bien dónde está la chicha.

### Lo que yo considero puntos fuertes

1. El problema se entiende rápido

“Hay mucha información dispersa y no sé qué hacer, dónde ni cuándo.”

Eso es bueno para el jurado porque no necesitáis explicar primero vuestra arquitectura, APIs, WFS, DuckDB, etc.

2. Encaja directamente con las bases

Las bases hablan precisamente de utilizar datos abiertos para facilitar decisiones relacionadas con bienestar, salud, movilidad, servicios y condiciones del entorno. `Pegado text.txt`

Y vuestra propuesta no se limita a enseñar esos datos: los cruza para generar una recomendación.

Eso es importante porque el criterio 1.2 valora cuánto resolvéis realmente el reto, y el 2.2 cuánto podéis adaptar el resultado al usuario. `Pegado text.txt`

3. El “cuándo” es probablemente vuestro elemento más diferencial

Hay muchas aplicaciones que te pueden decir:

> “Aquí tienes un parque / gimnasio / instalación deportiva.”

Vosotros podéis decir:

> “Hoy tienes estas tres opciones, pero para esta actividad este sitio es mejor a las 20:00 porque la temperatura y la calidad del aire son más favorables.”

Eso convierte datos temporales en una decisión.

4. La ruta saludable es un buen segundo nivel

No os quedáis en:

> actividad → sitio

sino:

> actividad → sitio → momento → ruta

Y la propuesta plantea comparar la ruta directa con una alternativa que reduzca exposición a tráfico y priorice zonas verdes, sombra, etc. `Se ha pegado el markdown.md`

Ahí hay una demo visual muy potente.

---

### Pero aquí empiezan los problemas

El pitch también revela que estáis intentando resolver demasiadas cosas.

Ahora mismo la idea contiene:

- recomendador de actividades
- recomendador de instalaciones
- recomendador horario
- calidad del aire
- meteorología
- UV
- polen
- tráfico
- zonas verdes
- sombra
- fuentes
- rutas saludables
- accesibilidad
- perfiles
- grupos
- planes con amigos
- principiantes
- planificación semanal
- circular routes
- transporte público

Y eso es muchísimo para un MVP.

La propia propuesta reconoce que tenéis varios modos y una expansión bastante grande. `Se ha pegado el markdown.md`

Mi crítica aquí sería bastante dura:

> Tenéis una idea de producto de 9/10, pero un MVP potencialmente de 5/10 si intentáis implementar todo.

El peligro no es que el jurado piense que la idea es mala. Es que vea muchas funcionalidades y ninguna suficientemente profunda.

---

## Yo reduciría el concepto a esta columna vertebral

```text
¿QUÉ QUIERO HACER?
        ↓
¿DÓNDE PUEDO HACERLO?
        ↓
¿CUÁNDO ES MEJOR?
        ↓
¿CÓMO LLEGO DE FORMA MÁS SALUDABLE?
```

Eso es Muévete Cerca.

Todo lo demás debería justificar su existencia dentro de esa cadena.

Por ejemplo:

| Funcionalidad | Decisión |
|---|---|
| Instalaciones deportivas | DÓNDE |
| Parques | DÓNDE |
| Meteorología | CUÁNDO |
| Calidad del aire | CUÁNDO / DÓNDE |
| Tráfico | CÓMO |
| Zonas verdes | CÓMO |
| Sombra | CÓMO |
| Perfil usuario | Personalización |
| Ruta | CÓMO |

En cambio:

| Funcionalidad | Mi opinión |
|---|---|
| UV | Reducible |
| Polen | Reducible |
| Plan semanal | Fuera del MVP |
| Plan con amigos | Fuera del MVP |
| Transporte público | Fuera |
| Circular routes | Fuera |
| Reservas | Fuera |
| Precios | Fuera |
| “IA” | No hace falta |

Esto último es importante: no intentaría meter IA simplemente para vender el proyecto como IA. Las bases premian el tratamiento correcto de los datos, la resolución del reto, la simplicidad y la flexibilidad, no que pongáis un LLM con calzador. `Pegado text.txt`

---

# El punto que yo ampliaría

Hay una frase del pitch que puede convertirse en vuestro argumento principal:

> “No queremos enseñar al ciudadano un mapa lleno de datos; queremos transformar esos datos en una decisión.”

Ese es vuestro verdadero valor.

Porque podéis enseñar:

```text
Temperatura: 34 ºC
NO₂: ...
Tráfico: ...
Parques: ...
Instalaciones: ...
```

pero eso obliga al usuario a interpretar los datos.

Vosotros queréis hacer:

```text
🏃 Correr

📍 Parque X
🕗 Mejor hora: 20:30
🌡️ Temperatura favorable
🌳 68 % de la ruta junto a zonas verdes
🚗 Evita las principales vías de tráfico

¿Por qué?
Porque a las 18:00 la temperatura es demasiado alta
y la ruta alternativa reduce la exposición al tráfico.
```

Eso sí es un producto.

Y además encaja muy bien con el criterio 2.1 de las bases: que sea sencillo obtener y entender el resultado. `Pegado text.txt`

---

# Y hay una pregunta que deberíais haceros ya

El reto oficial habla de:

> “¿A qué municipio de menos de 50.000 habitantes podría mudarme?”

`Pegado text.txt`

Mientras que vosotros estáis resolviendo:

> “¿Qué puedo hacer hoy cerca de mí?”

Eso no es exactamente el mismo problema.

No creo que tengáis que abandonar vuestra idea -la propuesta encaja con las áreas y ejemplos del reto-, pero sí tenéis que explicar muy bien el puente.

Yo lo plantearía así:

> “Las bases plantean que las condiciones y servicios disponibles en un municipio son factores relevantes para decidir dónde vivir. Nosotros llevamos esa misma idea al día a día: una vez que vives allí, ¿cómo puedes aprovechar esas condiciones para decidir qué hacer, dónde y cuándo?”

Eso hace que vuestra propuesta no parezca una aplicación de deporte que casualmente utiliza datos de Madrid.

Pasa a ser:

> “Una herramienta que demuestra el valor de los datos abiertos del territorio para mejorar decisiones cotidianas de los ciudadanos.”

Y eso está mucho más alineado con el espíritu del reto. `Pegado text.txt`

### Mi diagnóstico ahora mismo

```text
ALINEACIÓN CON EL RETO       █████████░  9/10
PROBLEMA                     ████████░░  8/10
DIFERENCIACIÓN               ████████░░  8/10
POTENCIAL DE DEMO             ██████████ 10/10
PERSONALIZACIÓN              ██████████ 10/10
VIABILIDAD DEL MVP           ██████░░░░  6/10
RIESGO DE SCOPE CREEP        ██████████ 10/10
```

Mi recomendación sería muy clara: no ampliaría funcionalidades ahora. Primero cerraría una experiencia principal extremadamente buena: “quiero hacer X → dime dónde y cuándo → llévame por la mejor ruta”.

Y después añadiría perfiles/sliders como mecanismo para demostrar el 2.2, que es precisamente uno de los criterios de evaluación y además el primer desempate. `Pegado text.txt`

Si queréis maximizar puntuación, yo incluso reformularía el pitch y la estructura de la demo alrededor de un único caso de uso potente (por ejemplo Carmen o Lucía) y haría que el resto de funcionalidades aparezcan como extensiones, no como el producto principal. `Se ha pegado el markdown.md`

## Prompt:
5/10/2026, 17:47:02

esta idea lo cumple?? Poner en valor la accesibilidad y la prestación de servicios públicos y privados
(educación, salud, conectividad, movilidad, cultura, etc.) como elementos
clave en la decisión de elegir un municipio como lugar de vida.

## Response:
5/10/2026, 17:47:07 · gpt-5-6

Sí, pero con un matiz importante: vuestra idea lo cumple de forma indirecta, no de forma explícita.

La frase de las bases habla de que los servicios y condiciones de un municipio deben servir para decidir "¿me gustaría vivir aquí?". `Pegado text.txt`

Vuestra idea actualmente responde más bien a:

> "Ya vivo aquí / estoy aquí: ¿qué puedo hacer y cómo puedo aprovechar mi entorno?"

### Dónde sí encaja

Vuestro proyecto pone en valor varios elementos que aparecen en las bases:

- Salud → calidad del aire, temperatura, condiciones ambientales.
- Movilidad → rutas peatonales y alternativas a vías con tráfico.
- Accesibilidad → filtros y rutas adaptadas a determinadas necesidades.
- Ocio/deporte → instalaciones deportivas, parques y zonas verdes.
- Servicios públicos → utiliza datos públicos para conocer qué recursos existen y dónde están.

La propuesta además cruza estos datos para producir una recomendación, que es precisamente el tipo de reutilización de datos que busca el reto. `Se ha pegado el markdown.md`

### El problema está aquí

La frase clave de las bases es:

> "elementos clave en la decisión de elegir un municipio como lugar de vida"

Y ahí vuestra propuesta actual no termina de llegar.

Por ejemplo:

```text
Municipio A
├── 15 instalaciones deportivas
├── 8 parques
├── buena calidad del aire
├── buenas rutas peatonales
└── ...
```

Eso sí podría ayudarme a decidir:

> "¿Me gustaría vivir en este municipio?"

Pero vuestro sistema actualmente hace:

```text
Estoy en Municipio A
        ↓
Quiero correr
        ↓
¿Dónde corro?
        ↓
¿Cuándo?
        ↓
¿Cómo llego?
```

Son problemas relacionados, pero no exactamente el mismo.

---

## Yo haría un pequeño giro, no cambiaría la idea

No intentaría convertir "Muévete Cerca" en una aplicación inmobiliaria ni en un comparador de municipios. Sería cargarse una buena idea.

Lo que haría es añadir una capa de "conocer el municipio" que conecte directamente con el objetivo de las bases:

```text
          DATOS DEL MUNICIPIO
                  ↓
     ┌────────────┴────────────┐
     ↓                         ↓
¿QUÉ OFRECE?              ¿CÓMO ES?
     ↓                         ↓
deporte                   aire
parques                   tráfico
servicios                 zonas verdes
movilidad                 temperatura
     └────────────┬────────────┘
                  ↓
          ¿QUÉ PUEDO HACER?
                  ↓
          MUÉVETE CERCA
```

Así podéis decir:

> "Muévete Cerca no solo te ayuda a decidir qué hacer en un municipio, sino que convierte los servicios y características del territorio en información útil para valorar su calidad de vida."

Eso conecta mucho mejor con las bases.

### Y aquí hay una oportunidad bastante potente

Podríais introducir un pequeño módulo:

"¿Cómo es vivir aquí?"

Por ejemplo:

```text
📍 Alcalá de Henares

🏃 Deporte
42 instalaciones deportivas

🌳 Naturaleza
23 zonas verdes próximas

🚶 Movilidad
78% de las actividades recomendadas
son accesibles caminando

🌬️ Calidad ambiental
Condiciones favorables para actividad
al aire libre durante X horas/día

☀️ Bienestar
X franjas horarias recomendables
esta semana
```

Y después:

> "¿Qué significa esto para ti?"

```text
🏃 Corredor → buenas opciones
👨‍👩‍👧 Familia → parques + actividades
👴 Persona mayor → rutas + servicios cercanos
```

Ahí sí estáis poniendo en valor los servicios y características del municipio como elementos de calidad de vida.

---

## Pero cuidado con una cosa

No intentaría afirmar:

> "Alcalá es mejor que Leganés para vivir."

Eso os puede meter en un jardín metodológico enorme.

Mejor:

> "Según tus preferencias, estos son los servicios y condiciones que encontrarás en este municipio."

Eso es mucho más defendible con datos abiertos.

Y además encaja mejor con el criterio de interactividad/flexibilidad de las bases: el usuario puede cambiar sus preferencias y obtener un resultado diferente. `Pegado text.txt`

### En resumen

Ahora mismo:

```text
Bases:
¿Dónde me gustaría vivir?
        ↓
Vuestra idea:
¿Qué puedo hacer donde vivo?
```

Hay conexión, pero existe un salto.

Con un pequeño añadido:

```text
¿QUÉ OFRECE ESTE MUNICIPIO?
        ↓
¿CÓMO ENCAJA CON MIS NECESIDADES?
        ↓
¿QUÉ PUEDO HACER EN ÉL?
        ↓
¿DÓNDE + CUÁNDO + CÓMO?
```

ya podéis defender mucho mejor que estáis abordando el problema de las bases.

Y, de hecho, yo diría que esta es probablemente la principal modificación que estudiaría antes de presentar la idea: no añadir 15 funcionalidades, sino añadir una única capa que conecte explícitamente "características del municipio → calidad de vida → recomendación personalizada".

## Prompt:
5/10/2026, 17:50:12

con toda la información que tienes, defíneme cómo debe ser el MVP, qué funcionaldiades principales presentar y realizar un primer prototipo visual de alto nivel

## Response:
5/10/2026, 17:50:13

![Muévete Cerca: MVP de bienestar urbano](Mu%C3%A9vete%20Cerca_%20MVP%20de%20bienestar%20urbano.png)



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)