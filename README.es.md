# requarks-wiki-mcp

Servidor MCP para una instancia de [Wiki.js](https://js.wiki/) que permite usarla como base de conocimiento.

Funciones:
- Búsqueda y listado de páginas para flujos de recuperación tipo RAG.
- Lectura de contenido por ruta o ID de página.
- Herramientas opcionales de creación/actualización con controles de seguridad explícitos.

## Requisitos

- Node.js 20+
- Un host de Wiki.js accesible
- API key (JWT) de Wiki.js con permisos adecuados

## Configuración

```bash
cp .env.example .env
npm install
```

Configura `.env`:

```env
WIKI_BASE_URL=https://your-wiki-hostname
WIKI_API_TOKEN=your_wikijs_api_key_jwt
WIKI_GRAPHQL_PATH=/graphql
WIKI_DEFAULT_LOCALE=en
WIKI_DEFAULT_EDITOR=markdown

# Mutaciones deshabilitadas por defecto
WIKI_MUTATIONS_ENABLED=false
WIKI_MUTATION_CONFIRM_TOKEN=CONFIRM_UPDATE
WIKI_MUTATION_DRY_RUN=true
# Prefijos de ruta separados por coma (sin '/' inicial, vacío = sin restricción)
WIKI_ALLOWED_MUTATION_PATH_PREFIXES=
```

Referencia de variables de entorno:

| Variable | Requerida | Valor por defecto | Descripción |
|---|---|---|---|
| `WIKI_BASE_URL` | Sí | - | URL base de Wiki.js (por ejemplo, `https://wiki.example.com`). |
| `WIKI_API_TOKEN` | Sí | - | JWT del API key usado en `Authorization: Bearer ...`. |
| `WIKI_GRAPHQL_PATH` | No | `/graphql` | Ruta GraphQL añadida a `WIKI_BASE_URL`. |
| `WIKI_DEFAULT_LOCALE` | No | `en` | Locale por defecto cuando no se envía en la llamada. |
| `WIKI_DEFAULT_EDITOR` | No | `markdown` | Editor por defecto al crear páginas. |
| `WIKI_MUTATIONS_ENABLED` | No | `false` | Activa herramientas de escritura cuando es `true`. |
| `WIKI_MUTATION_CONFIRM_TOKEN` | No | `CONFIRM_UPDATE` | Valor `confirm` requerido para mutaciones. |
| `WIKI_MUTATION_DRY_RUN` | No | `true` | Si es `true`, solo devuelve vista previa sin escribir. |
| `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` | No | `` (vacío) | Prefijos permitidos para mutaciones, separados por coma. |

Requisito de Wiki.js (GraphQL + API key):
- Este MCP usa GraphQL de Wiki.js internamente.
- En Wiki.js, ve a `Administration -> API` y habilita la API.
- Crea un API key y configúralo en `WIKI_API_TOKEN`.

## Inicio rápido (checklist)

- En Wiki.js: `Administration -> API` -> habilitar API
- Crear API key y preparar `WIKI_API_TOKEN`
- En este proyecto: `npm install` -> `npm run build`
- Agregar configuración en el cliente MCP (`~/.mcp.json`)
- Primera prueba: `wikijs_search_pages` -> usar `path` en `wikijs_get_page_by_path`

## Ejemplo de configuración MCP (`~/.mcp.json`)

```json
{
  "mcpServers": {
    "requarks-wiki": {
      "command": "npx",
      "args": ["-y", "@yowu-dev/requarks-wiki-mcp@latest"],
      "env": {
        "WIKI_BASE_URL": "https://wiki.your-domain.dev",
        "WIKI_API_TOKEN": "your_wikijs_api_key_jwt",
        "WIKI_GRAPHQL_PATH": "/graphql",
        "WIKI_DEFAULT_LOCALE": "en",
        "WIKI_DEFAULT_EDITOR": "markdown",
        "WIKI_MUTATIONS_ENABLED": "false",
        "WIKI_MUTATION_CONFIRM_TOKEN": "CONFIRM_UPDATE",
        "WIKI_MUTATION_DRY_RUN": "true",
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": ""
      }
    }
  }
}
```

Ejemplo para local/desarrollo (ejecutar `dist` sin instalar el paquete):

```json
{
  "mcpServers": {
    "requarks-wiki-local": {
      "command": "node",
      "args": ["/absolute/path/to/requarks-wiki-mcp/dist/index.js"],
      "env": {
        "WIKI_BASE_URL": "https://wiki.your-domain.dev",
        "WIKI_API_TOKEN": "your_wikijs_api_key_jwt",
        "WIKI_GRAPHQL_PATH": "/graphql",
        "WIKI_DEFAULT_LOCALE": "en",
        "WIKI_DEFAULT_EDITOR": "markdown",
        "WIKI_MUTATIONS_ENABLED": "false",
        "WIKI_MUTATION_CONFIRM_TOKEN": "CONFIRM_UPDATE",
        "WIKI_MUTATION_DRY_RUN": "true",
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": ""
      }
    }
  }
}
```

## Ejecución

Desarrollo:

```bash
npm run dev
```

Build + ejecución:

```bash
npm run build
npm start
```

## Herramientas MCP

Lectura:
- `wikijs_search_pages`
- `wikijs_list_pages`
- `wikijs_get_page_by_path`
- `wikijs_get_page_by_id`

Escritura (solo con `WIKI_MUTATIONS_ENABLED=true`):
- `wikijs_create_page`
- `wikijs_update_page`

Las mutaciones requieren `confirm` igual a `WIKI_MUTATION_CONFIRM_TOKEN`.

## Escenarios de uso (simulación de usuario)

Escenario 1) Investigar una causa de error (estilo RAG)
- Solicitud del usuario: "Busca documentación sobre Kotlin `CancellationException` y dame un resumen corto"
- Secuencia MCP: `wikijs_search_pages(query="kotlin cancellationexception")` -> `wikijs_get_page_by_path(path=resultado.path)`
- Resultado: encuentra páginas relevantes y recupera el contenido para resumir causas y soluciones.

Escenario 2) Revisar cambios recientes de documentación
- Solicitud del usuario: "Muéstrame las 20 páginas más recientemente actualizadas"
- Secuencia MCP: `wikijs_list_pages(limit=20, locale="en")`
- Resultado: devuelve `path/title/updatedAt` para un reporte rápido de cambios.

Escenario 3) Consultar una página exacta por ID
- Solicitud del usuario: "Lee la página 7283 y extrae solo los TODO"
- Secuencia MCP: `wikijs_get_page_by_id(id=7283)`
- Resultado: obtiene el contenido exacto de la página y permite extraer solo la información necesaria.

Escenario 4) Crear contenido con revisión previa segura
- Solicitud del usuario: "Crea una checklist de despliegue en `sandbox`"
- Secuencia MCP (revisión): `wikijs_create_page(..., confirm=token)` con `WIKI_MUTATION_DRY_RUN=true`
- Secuencia MCP (aplicar): misma llamada con `WIKI_MUTATION_DRY_RUN=false`
- Resultado: primero vista previa, luego creación real en rutas permitidas por `WIKI_ALLOWED_MUTATION_PATH_PREFIXES`.

## Consejos operativos

- Para flujos RAG, prioriza lectura por `path` (`wikijs_get_page_by_path`). (El `id` de búsqueda puede no coincidir con el ID real de página)
- Para escritura, se recomienda empezar con `WIKI_MUTATIONS_ENABLED=false` y `WIKI_MUTATION_DRY_RUN=true`.
- Cuando necesites escribir de verdad: limita el alcance con `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` y luego usa `WIKI_MUTATION_DRY_RUN=false`.
- Las mutaciones escriben un audit log en stderr; en producción conviene recolectar esos logs.

## Solución de problemas

- `Missing required environment variable: WIKI_*`: faltan variables en `.env` o en `env` del cliente MCP.
- `PageViewForbidden 6013`: revisa permisos del grupo del API key y reglas de página para `read:pages`/`read:source`.
- Se puede listar pero falla `content`: normalmente falta `read:source` en permisos/reglas.
- Si GraphQL no está en `/graphql`: ajusta `WIKI_GRAPHQL_PATH`.

## Notas de permisos (Wiki.js)

- Algunas operaciones pueden requerir `manage:pages`/`delete:pages` en reglas de página.
- La lectura de `content` puede requerir `read:source`.
- Si aparece 6013 (`PageViewForbidden`), revisa permisos del grupo y reglas de página.
