# GoMad

GoMad recomienda destinos y rutas para moverse por la Comunidad de Madrid. Tiene un frontend React/Vite, una API FastAPI y una ingesta que construye las bases DuckDB y el grafo a partir de fuentes públicas. Los datos generados no se incluyen en Git: cada instalación debe generarlos.

## Requisitos

- Docker Engine o Docker Desktop con Docker Compose v2, conexión a Internet y espacio para las descargas y las bases. La construcción del grafo requiere aproximadamente 4 GB de RAM.
- Para ejecutar sin Docker: Python 3.12 y Node.js 22. El frontend usa `npm ci` y las dependencias fijadas en `package-lock.json`.
- Puerto 80 libre para el frontend de Docker; 5173 y 8000 para el modo de desarrollo. En sistemas donde el puerto 80 requiere privilegios, cambia el puerto del host en `app/deploy/docker-compose.yml` antes de arrancar.

## Arranque local con Docker

Desde la raíz del clon:

```bash
cp app/.env.example app/.env
cp app/deploy/.env.example app/deploy/.env
cd app
docker compose --env-file deploy/.env -f deploy/docker-compose.init.yml run --rm ingest
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
curl -fsS http://localhost/api/health
```

La ingesta descarga datos abiertos de la Comunidad y el Ayuntamiento de Madrid, OpenStreetMap y Open-Meteo; puede tardar y algunas fuentes pueden fallar temporalmente. El comando de ingesta devuelve error si falló algún paso: comprueba su salida y vuelve a ejecutarlo. Los ficheros se escriben en `app/data/`, ignorado por Git. La API necesita `app/data/gomad.duckdb`, `app/data/realtime.duckdb` y el grafo para ofrecer todos los resultados. Para parar: `docker compose --env-file deploy/.env -f deploy/docker-compose.yml down`. El script `app/deploy/deploy.sh` usa el checkout actual y no hace `git pull`.

`app/deploy/.env` contiene `DOMAIN=:80` para HTTP local. Para publicar en un dominio propio, configura `DOMAIN` con ese dominio y su DNS; Caddy obtendrá HTTPS. No pongas claves en ese archivo: las variables de la API van en `app/.env`.

## Desarrollo sin Docker

Primero genera los datos con el comando de ingesta anterior. Después, en dos terminales:

```bash
cd app/api
python3.12 -m venv .venv
. .venv/bin/activate
python -m pip install -e '.[dev]'
set -a; . ../.env; set +a
uvicorn main:app --host localhost --port 8000 --no-access-log
```

```bash
cd app/frontend
npm ci
npm run dev
```

Abre `http://localhost:5173`; Vite reenvía `/api` a `localhost:8000`. Si utilizas una API **tuya** en otro servidor, copia `app/frontend/.env.example` a `app/frontend/.env` y establece `GOMAD_API=https://tu-dominio.example` (el servidor debe servir `/api`). `app/frontend/.env` queda ignorado por Git. También puedes exportar `GOMAD_API` en la terminal.

## Variables y credenciales

| Archivo / variable | Uso | Obligatoria |
|---|---|---|
| `app/.env`: `GOMAD_LIVE` | `off` lee las bases locales sin actualización en vivo; quita `off` para activar la actualización según la configuración. | No |
| `GOMAD_DATA_DIR`, `GOMAD_CONFIG_DIR`, `GOMAD_LIVE_SNAPSHOT` | Rutas alternativas al ejecutar Python directamente. | No |
| `IA_PROVEEDOR`, `OCI_COMPARTMENT_ID`, `OCI_REGION`, `OCI_CONFIG_FILE` | OCI Language para el asistente. Sin credenciales, usa el diccionario local. | No |
| `app/deploy/.env`: `DOMAIN` | Host de Caddy; `:80` en local. | Sí, con Compose |
| `app/frontend/.env`: `GOMAD_API` | URL de una API propia para el servidor de desarrollo. | No |

El funcionamiento básico no necesita API keys: las fuentes activas de datos abiertos y Open-Meteo son públicas. Si quieres OCI Language, crea una cuenta y credenciales en la [consola de Oracle Cloud](https://cloud.oracle.com/), anota el identificador de tu compartimento y la región en `app/.env`, y guarda el fichero de configuración y la clave privada **fuera del repositorio**. En Docker, define `OCI_DIR` con la ruta absoluta de esa carpeta en `app/deploy/.env` y añade `-f deploy/docker-compose.oci.yml` al comando de arranque. El fichero de OCI debe referirse a su clave dentro del contenedor en `/oci/`. OCI Language es opcional y puede tener costes de uso.

No se usan `IA_API_KEY`, `IA_MODELO`, `ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_DSN` ni `ORACLE_WALLET_DIR` en el código actual. No hace falta obtener claves de AEMET: la previsión activa se obtiene de Open-Meteo. Mantén `app/.env`, `app/deploy/.env`, `app/frontend/.env`, los wallets, las claves privadas y `app/data/` fuera de Git.

## Pruebas

```bash
cd app/api && python3.12 -m venv .venv && . .venv/bin/activate && python -m pip install -e '.[dev]' && pytest -q
cd ../ingest && python3.12 -m venv .venv && . .venv/bin/activate && python -m pip install -e '.[routing,dev]' && pytest -q
cd ../frontend && npm ci && npm test && npm run lint && npm run build
```

Algunas pruebas de Python marcadas como `slow` requieren los datos generados. Las pruebas de frontend incluyen datos de muestra locales y no llaman a servicios externos.

## Problemas frecuentes

- `502` desde Caddy: comprueba `docker compose --env-file deploy/.env -f deploy/docker-compose.yml ps` y los logs del servicio `api`.
- Resultados vacíos o error de datos: comprueba la salida de la ingesta y que `app/data/` contiene las bases y el grafo.
- Fallos al escribir `app/data/` en Linux: ejecuta la ingesta con `GOMAD_UID=$(id -u) GOMAD_GID=$(id -g)` exportadas en la terminal.
- Puerto 80 ocupado: cambia el primer valor de `ports` del servicio `frontend` y accede al nuevo puerto.
- OCI no disponible: la aplicación sigue usando el diccionario local. Revisa `OCI_DIR`, `OCI_CONFIG_FILE` y los permisos de tus archivos privados si deseas activarlo.

Los documentos históricos en `docs/` describen decisiones y despliegues anteriores; los comandos anteriores son la referencia para una instalación nueva.
