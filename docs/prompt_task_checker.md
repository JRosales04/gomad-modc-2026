TAREAS={33}   RAMA={datos/b1-indicadores}   BASE={docs/vie16-claude-md}

Eres un verificador independiente. NO eres quien implementó: otra sesión ejecutó las tareas
anteriores de docs/plan-implementacion.md con la skill superpowers:executing-plans. Tu trabajo
es comprobar, con evidencia, si lo hizo bien. No confíes en su resumen ni en su ledger: verifica tú.

## Reglas
- SOLO LECTURA. No edites ficheros, no hagas commits, no cambies de rama de forma que pierdas
  estado, no fusiones, no hagas push, no instales nada fuera de los venvs del proyecto.
  Si necesitas ejecutar algo que escribe en disco (p. ej. el script de descarga), avisa antes
  y explica por qué; si escribe en app/data/ (no versionado) puedes hacerlo.
- No arregles nada aunque sea trivial: anótalo como hallazgo.
- Cada afirmación del informe lleva su evidencia (comando + salida relevante, o fichero:línea).
- Responde en español, en tono directo.

## Contexto que debes leer primero
1. CLAUDE.md (sobre todo §2: idioma, la IA no decide, no inventar campos, claves solo en .env).
2. docs/plan-implementacion.md: secciones «Estructura por servicios», «Restricciones globales»,
   «Foco de revisión» y el texto COMPLETO de cada «### Task N:» de TAREAS.
3. docs/arquitectura.md solo si una tarea la cita para resolver una duda.
4. El ledger: .superpowers/sdd/plan-implementacion/progress.md (si no existe, es un hallazgo).

## Qué comprobar (en este orden)

### A. Alcance y git
- `git log --oneline BASE..RAMA` y `git diff --stat BASE...RAMA`: ¿los commits corresponden
  solo a TAREAS? ¿hay trabajo de tareas que no tocaban (p. ej. la siguiente)?
- ¿Trabajó en RAMA y no en main? ¿Hizo push o merge sin permiso? (`git branch -a`, `git log origin/main`)
- ¿`git status` limpio? ¿Mensajes de commit en español y con los textos del plan?
- ¿Se ha versionado algo prohibido? `git ls-files | grep -E "\.venv|app/data|\.env$|egg-info|\.superpowers|node_modules|dist/"`

### B. Fidelidad al plan, tarea por tarea
Para cada tarea de TAREAS, recorre sus pasos uno a uno y rellena una tabla:
| Paso | Qué pedía el plan | Hecho / No / Distinto | Evidencia |
- Ficheros: ¿existen todos los de «Crear/Modificar/Renombrar»? ¿hay ficheros extra no pedidos?
- Interfaces («Produce»): ¿nombres, firmas, columnas y claves EXACTAMENTE como en el plan?
  (grep de cada función/clase/columna listada). Una firma distinta rompe tareas posteriores.
- Código: compara con los bloques del plan. Las diferencias no son malas por sí mismas, pero
  cada una debe tener su «Ruling:» en el ledger.
- Pasos [manual]: deben estar saltados, no simulados.

### C. Pruebas (la parte más importante)
- Ejecuta tú las pruebas que nombra cada tarea, desde el directorio de su servicio, con el venv
  del servicio (p. ej. `cd app/api && .venv/bin/pytest -v`). Copia el resumen real.
- ¿Existen TODOS los tests que el plan lista, con esos nombres? ¿Hay tests del plan que faltan
  o que se han debilitado (asserts quitados, valores cambiados, skips añadidos)?
- Pruebas `slow`: ¿se saltan sin datos y pasan con datos si app/data existe?
- TDD: no puedes ver el pasado, pero sí comprobar que los tests fallarían sin la implementación.
  Para 1–2 tests clave por tarea, razona (o prueba en una copia temporal fuera del repo, p. ej.
  con `git worktree add` en /tmp y luego `git worktree remove`) que fallan si se quita el código.
- Ejecuta cada comando con «Esperado:» del plan que sea seguro (no destructivo, sin claves) y
  compara la salida real con lo esperado.

### D. Restricciones globales
- Idioma: código e identificadores en inglés; comentarios y docstrings en español SIN tildes
  (busca `#.*[áéíóúñ]` y docstrings con tildes en los .py/.ts nuevos); textos para la persona
  usuaria en español con tildes; ids de datasets y campos de origen sin traducir.
- Servicios: ningún import entre app/api e app/ingest (`grep -rn "from ingest\|import ingest" app/api`
  y viceversa); rutas de datos/config por GOMAD_DATA_DIR / GOMAD_CONFIG_DIR, no rutas absolutas.
- Secretos: ninguna clave en código, tests, manifest.json ni URLs guardadas
  (si existe app/.env: `grep -c "$(grep AEMET_API_KEY app/.env | cut -d= -f2)"` sobre lo versionado → 0).
- No se han inventado datasets ni campos: cada campo de origen usado existe en
  app/data/perfil/perfil.json o en CLAUDE.md.
- No se han fijado en código valores pendientes de decisión (pesos, umbrales de aire/calor/lluvia,
  actividades, indicadores): deben leerse de app/config/.
- La ubicación del usuario no se escribe en logs.

### E. Ledger y rulings
- ¿Tiene la línea `Task N: complete (commits X..Y, tests: … → …)` para cada tarea? ¿El rango de
  commits y el resultado de tests coinciden con lo que tú has visto?
- Juzga cada «Ruling:»: ¿estaba justificado? ¿contradice la spec o CLAUDE.md? ¿hay desviaciones
  del plan SIN ruling (decisiones en secreto)?
- ¿Se hizo la revisión final de rama que exige la skill? Si no, anótalo (no es bloqueante).

### F. Criterio de terminado
- Para cada tarea, cita su «Terminado cuando:» y di si se cumple, con evidencia.
- Revisa el «Foco de revisión» del plan: si alguna de esas situaciones cae en TAREAS, ¿está su
  prueba y pasa?

## Formato del informe final
1. **Veredicto**: ✅ APTO para fusionar / ⚠️ APTO con observaciones / ❌ NO APTO. Una frase de motivo.
2. **Resumen de pruebas**: comando → resultado, por servicio.
3. **Hallazgos**, ordenados por gravedad:
   - 🔴 Bloqueante (rompe tareas posteriores, viola CLAUDE.md §2, secretos, tests que faltan o
     debilitados, trabajo fuera de alcance, push/merge no autorizado)
   - 🟠 Importante (desviación sin ruling, interfaz distinta del plan, Esperado que no se cumple)
   - 🟡 Menor (estilo, comentarios, ficheros extra inofensivos)
   Cada uno: qué, dónde (fichero:línea o comando), evidencia y arreglo sugerido (sin aplicarlo).
4. **Rulings**: tabla ruling → ¿de acuerdo? → motivo.
5. **Tabla de pasos** de la sección B.
6. **Qué falta para fusionar**, como lista de acciones concretas (o «nada»).

Si algo no se puede verificar (falta un dato, una herramienta, una clave), dilo explícitamente
como «no verificado» con el motivo; nunca lo des por bueno.