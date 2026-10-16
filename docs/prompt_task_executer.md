TAREAS={2,3}   RAMA={datos/mie14-descarga}   BASE={main}   MANUALES_HECHOS={ninguno}

Usa superpowers:executing-plans con docs/plan-implementacion.md.

## Alcance
- Ejecuta SOLO las tareas de TAREAS, en ese orden. Al terminar la última, PARA y dame el informe.
  No empieces ninguna otra tarea aunque parezca rápida o dependa de estas.
- Trabaja en la rama RAMA creada desde BASE actualizada:
  `git switch BASE && git pull --ff-only origin BASE && git switch -c RAMA`
  (si RAMA ya existe, continúa en ella y retoma desde el ledger).
- No fusiones a BASE, no hagas push, no abras PR, no borres ramas.

## Pasos [manual]
- Los pasos o tareas marcados [manual] los hace una persona. Ya están hechos: MANUALES_HECHOS.
- Los demás [manual] NO los simules ni los sustituyas: sáltalos, anótalo en el ledger y, si una
  tarea no puede continuar sin uno, para y dime exactamente qué tengo que hacer (comando o acción).
- Nunca pidas ni muestres claves; si hace falta una, debe estar ya en app/.env.

## Reglas del proyecto (además de las del plan)
- Lee antes CLAUDE.md §2 y las secciones «Estructura por servicios», «Restricciones globales» y
  «Foco de revisión» del plan. Mandan sobre cualquier costumbre tuya.
- Cada tarea indica su **Servicio**: ejecuta sus comandos desde ese directorio y con el venv de ese
  servicio (`.venv/bin/python`, `.venv/bin/pytest`). Commits con `git -C ../..` y rutas desde la raíz.
- Código en inglés; comentarios y docstrings en español SIN tildes; textos visibles para la persona
  usuaria en español con tildes. Ids de datasets y campos de origen sin traducir.
- Ningún import entre app/api y app/ingest. Datos y config por GOMAD_DATA_DIR / GOMAD_CONFIG_DIR.
- No inventes datasets ni campos: si un campo no está en el plan, en CLAUDE.md o en
  app/data/perfil/perfil.json, compruébalo contra los datos reales antes de usarlo.
- No fijes en código valores pendientes de decisión (pesos, umbrales, actividades, indicadores):
  van en app/config/ y solo si la decisión (DEC-xx) ya está tomada; si no, usa los valores de prueba
  del plan solo en los tests.
- No añadas dependencias, fuentes ni funcionalidades que la tarea no pida. Si una versión fijada no
  instala, usa la más cercana que funcione en los dos servicios si es compartida (duckdb) y regístralo.

## Cómo trabajar
- TDD estricto: escribe el test del plan, ejecútalo y comprueba que FALLA por el motivo esperado,
  implementa, y comprueba que PASA. No debilites tests del plan (no quites asserts, no cambies
  valores esperados, no añadas skips) para que pasen.
- Cada comando con «Esperado:» se ejecuta y se compara. Si no coincide:
  - si el código está mal → depura (superpowers:systematic-debugging) y arregla la causa;
  - si el plan está mal → decide el cambio mínimo coherente con la spec y regístralo en el ledger como
    `Task N: Ruling: <qué> — <por qué> — <coste si me equivoco>`.
  Ninguna desviación del plan sin su Ruling.
- Comprobaciones con red (portales, AEMET, Geofabrik): ejecútalas; si un portal falla, reintenta una
  vez y, si sigue fallando, regístralo y sigue con lo que no dependa de él.
- Para y pregúntame solo si: hay que borrar o sobrescribir algo que no está en git, una acción afecta
  fuera del repo (nube, push), aparece un secreto, o el plan es imposible de seguir.

## Al terminar
1. Ejecuta las pruebas completas de cada servicio tocado y `git status` (debe quedar limpio).
2. Haz la revisión final de la rama que pide la skill (revisor nuevo, el modelo más capaz) y aplica
   solo los hallazgos Critical/Important, cada uno con su test que falle antes y pase después.
3. Dame este informe, en español:
   - **Estado** por tarea: completa / parcial / bloqueada (y por qué).
   - **Commits**: `git log --oneline BASE..RAMA`.
   - **Pruebas**: comando → resultado real, por servicio.
   - **Esperados que no coincidieron** y qué hiciste.
   - **Rulings** (copiados del ledger) con su coste si me equivoco.
   - **Pasos [manual] pendientes** y qué tengo que hacer exactamente.
   - **Minors diferidos** de la revisión final.
   - **Siguiente paso** recomendado (p. ej. «lanzar el verificador con TAREAS={2,3}»).