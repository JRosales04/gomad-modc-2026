# Comprobaciones de la preparación pública (23/10/2026)

Se ejecutaron en una copia de trabajo independiente, con Python 3.12.14 y las dependencias fijadas en los dos `pyproject.toml`. Los archivos locales de `app/data/` de esa copia procedían del clon existente y pueden estar incompletos o desactualizados.

| Comprobación | Resultado |
|---|---|
| Frontend `npm test -- --run` | 374 pruebas aprobadas |
| Frontend `npm run lint` | Correcto; dos avisos de Fast Refresh preexistentes |
| Frontend `npm run build` | Correcto; aviso de tamaño de chunks |
| API `pytest -q` (completa) | 453 aprobadas, 7 omitidas, 3 fallos ligados a datos locales: grafo de Madrid y verde de Madrid ausentes o desactualizados |
| API `pytest -q -m 'not slow' -k 'not store_prefers_smallest_zone'` | 432 aprobadas, 31 excluidas |
| Ingesta `pytest -q` (completa) | 124 aprobadas, 2 fallos, 20 errores; ejecución interrumpida tras 4 min. Los fallos requieren archivos de datos/grafo que no estaban en la copia; los errores de DuckDB al instalar `spatial` se debieron a que el entorno aislado no permitía escribir en `~/.duckdb`. |
| Ingesta `pytest -q -m 'not slow'` | 163 aprobadas, 44 excluidas |
| `docker compose ... config --quiet` | Correcto para el Compose principal y el de ingesta |
| Arranque de contenedores | No probado: Docker Engine no estaba disponible en el entorno. |

La auditoría de archivos y de todos los commits alcanzables de las ramas preparadas no encontró claves privadas, tokens de GitHub/AWS ni los identificadores de despliegue que se retiraron. La búsqueda automática no garantiza detectar todos los formatos posibles de secreto. Antes de publicar, revisa el contenido y las ramas que quieres hacer públicas.
