# requarks-wiki-mcp

Servidor MCP para una instancia de [Wiki.js](https://js.wiki/) que permite a los agentes usarla como base de conocimiento.

Funciones:

- **29 herramientas** (19 de lectura + 10 de escritura) que cubren páginas, comentarios, etiquetas, recursos, usuarios, navegación e información del sistema.
- Buscar, listar y navegar páginas para flujos de recuperación (uso tipo RAG).
- Obtener contenido de página por ruta o ID de página, ver historial de versiones y restaurar versiones anteriores.
- Navegar la jerarquía del sitio con árbol de páginas, grafo de enlaces de página y estructura de navegación.
- Sistema completo de comentarios: listar, leer, crear, actualizar y eliminar comentarios en páginas.
- Navegación de recursos y carpetas para descubrimiento de archivos multimedia.
- Contexto de usuario: perfil del usuario actual y búsqueda de usuarios.
- Diagnóstico del sistema: información de versión, configuración del sitio y árbol de navegación.
- Gestión de etiquetas: listar, buscar, actualizar y eliminar etiquetas.
- Herramientas opcionales de creación/actualización/eliminación/movimiento/restauración de páginas con controles de seguridad explícitos.
- Recursos integrados: guía de sintaxis markdown, guía de diagramas Mermaid y guía de permisos de API.
- Taxonomía de errores tipados con mensajes amigables para LLM.
- Cliente GraphQL con timeout, reintentos con backoff exponencial y correlación de solicitudes.
- Seguridad reforzada: filtrado de campos sensibles, validación de URL, límites de longitud de entrada.

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

# Las operaciones de mutación están deshabilitadas por defecto
WIKI_MUTATIONS_ENABLED=false
# Control de seguridad adicional opcional para escrituras. Si se establece, las herramientas de escritura deben pasar confirm coincidente.
WIKI_MUTATION_CONFIRM_TOKEN=
WIKI_MUTATION_DRY_RUN=true
# Prefijos de ruta separados por coma sin barra inicial (vacío = sin restricción de prefijo)
WIKI_ALLOWED_MUTATION_PATH_PREFIXES=

# Resiliencia HTTP
WIKI_HTTP_TIMEOUT_MS=15000
WIKI_HTTP_MAX_RETRIES=2
```

Referencia de variables de entorno:

| Variable                              | Requerida | Valor por defecto | Descripción                                                                                                             |
| ------------------------------------- | --------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `WIKI_BASE_URL`                       | Sí        | -                 | URL base de Wiki.js (por ejemplo, `https://wiki.example.com`).                                                          |
| `WIKI_API_TOKEN`                      | Sí        | -                 | JWT del API key de Wiki.js usado en `Authorization: Bearer ...`.                                                        |
| `WIKI_GRAPHQL_PATH`                   | No        | `/graphql`        | Ruta del endpoint GraphQL añadida a `WIKI_BASE_URL`.                                                                    |
| `WIKI_DEFAULT_LOCALE`                 | No        | `en`              | Locale por defecto usado cuando la entrada de la herramienta no proporciona locale.                                     |
| `WIKI_DEFAULT_EDITOR`                 | No        | `markdown`        | Editor por defecto usado para la creación de páginas cuando no se especifica.                                           |
| `WIKI_MUTATIONS_ENABLED`              | No        | `false`           | Habilita todas las herramientas de escritura (mutaciones de página, comentario y etiqueta) cuando se establece a `true`. |
| `WIKI_MUTATION_CONFIRM_TOKEN`         | No        | `` (vacío)        | Control de seguridad adicional opcional. Cuando se establece, las llamadas de herramientas de escritura deben proporcionar `confirm` coincidente. |
| `WIKI_MUTATION_DRY_RUN`               | No        | `true`            | Cuando es `true`, las herramientas de mutación devuelven solo vista previa y no escriben en Wiki.js.                     |
| `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` | No        | `` (vacío)        | Prefijos de ruta separados por coma (sin barra inicial) permitidos para mutaciones. Vacío significa sin restricción de prefijo. |
| `WIKI_HTTP_TIMEOUT_MS`                | No        | `15000`           | Timeout de solicitud HTTP en milisegundos (incluyendo lectura de cuerpo). Mínimo 1.                                      |
| `WIKI_HTTP_MAX_RETRIES`               | No        | `2`               | Reintentos máximos para fallos transitorios de lectura (408, 502-504). Las mutaciones nunca se reintentan. Mínimo 0.     |

Requisito de Wiki.js (GraphQL + API key):

- Este MCP usa GraphQL de Wiki.js internamente.
- En la administración de Wiki.js, ve a `Administration -> API` y habilita el acceso a la API.
- Crea un API key y configúralo como `WIKI_API_TOKEN`.

## Ejemplo de configuración del cliente MCP (`~/.mcp.json`)

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
        "WIKI_MUTATIONS_ENABLED": "true",
        "WIKI_MUTATION_CONFIRM_TOKEN": "CONFIRM_UPDATE",
        "WIKI_MUTATION_DRY_RUN": "false",
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": "",
        "WIKI_HTTP_TIMEOUT_MS": "15000",
        "WIKI_HTTP_MAX_RETRIES": "2"
      }
    }
  }
}
```

## Registrar MCP vía ruta local (sin publicar en npm)

Puedes registrar este servidor MCP directamente desde la ruta de tu proyecto local sin publicar/instalar desde npm.

1. Compilar en este repositorio

```bash
npm install
npm run build
```

2. Registrar ruta absoluta local en `~/.mcp.json`

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
        "WIKI_MUTATIONS_ENABLED": "true",
        "WIKI_MUTATION_CONFIRM_TOKEN": "",
        "WIKI_MUTATION_DRY_RUN": "false",
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": "",
        "WIKI_HTTP_TIMEOUT_MS": "15000",
        "WIKI_HTTP_MAX_RETRIES": "2"
      }
    }
  }
}
```

Notas:

- Siempre usa una ruta absoluta.
- Vuelve a ejecutar `npm run build` después de cambios en el código para que `dist/index.js` se mantenga actualizado.

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

### Herramientas de lectura (19)

**Páginas:**

| Herramienta | Descripción |
| --- | --- |
| `wikijs_search_pages` | Búsqueda de texto completo en páginas wiki. |
| `wikijs_list_pages` | Listar páginas con filtro de locale opcional y límite. |
| `wikijs_get_page_by_path` | Obtener contenido completo de página por ruta + locale. |
| `wikijs_get_page_by_id` | Obtener contenido completo de página por ID numérico. |
| `wikijs_get_page_tree` | Navegar jerarquía del sitio (carpetas, páginas o ambos). |
| `wikijs_get_page_history` | Ver historial de ediciones de una página. |
| `wikijs_get_page_version` | Obtener el contenido completo de una versión específica. |
| `wikijs_get_page_links` | Obtener relaciones de enlaces de página (grafo de conocimiento). |

**Etiquetas:**

| Herramienta | Descripción |
| --- | --- |
| `wikijs_list_tags` | Listar todas las etiquetas para descubrimiento de taxonomía de contenido. |
| `wikijs_search_tags` | Buscar etiquetas que coincidan con una cadena de consulta. |

**Comentarios:**

| Herramienta | Descripción |
| --- | --- |
| `wikijs_list_comments` | Listar todos los comentarios de una página por ruta y locale. |
| `wikijs_get_comment` | Obtener un solo comentario por ID. |

**Sistema y navegación:**

| Herramienta | Descripción |
| --- | --- |
| `wikijs_get_system_info` | Versión de Wiki.js, tipo de base de datos y estadísticas de uso. |
| `wikijs_get_navigation` | Estructura de árbol de navegación. |
| `wikijs_get_site_config` | Configuración del sitio (campos no sensibles). |

**Recursos:**

| Herramienta | Descripción |
| --- | --- |
| `wikijs_list_assets` | Listar recursos con filtro opcional de carpeta y tipo. |
| `wikijs_list_asset_folders` | Listar carpetas de recursos. |

**Usuarios:**

| Herramienta | Descripción |
| --- | --- |
| `wikijs_get_current_user` | Obtener el perfil del usuario API autenticado actualmente. |
| `wikijs_search_users` | Buscar usuarios por nombre o correo electrónico. |

### Herramientas de escritura (10, deshabilitadas a menos que `WIKI_MUTATIONS_ENABLED=true`)

**Mutaciones de páginas:**

| Herramienta | Descripción |
| --- | --- |
| `wikijs_create_page` | Crear una nueva página con contenido, etiquetas y metadatos. |
| `wikijs_update_page` | Actualizar una página existente por ID. |
| `wikijs_delete_page` | Eliminar una página por ID. Puede necesitar `manage:pages` o `delete:pages`. |
| `wikijs_move_page` | Mover/renombrar una página a nueva ruta o locale. |
| `wikijs_restore_page` | Restaurar una página a una versión anterior. |

**Mutaciones de comentarios:**

| Herramienta | Descripción |
| --- | --- |
| `wikijs_create_comment` | Crear un comentario en una página. |
| `wikijs_update_comment` | Actualizar un comentario existente por ID. |
| `wikijs_delete_comment` | Eliminar un comentario por ID. |

**Mutaciones de etiquetas:**

| Herramienta | Descripción |
| --- | --- |
| `wikijs_update_tag` | Actualizar el slug y título de una etiqueta. |
| `wikijs_delete_tag` | Eliminar una etiqueta de todas las páginas. |

### Seguridad de mutaciones

- Cuando se establece `WIKI_MUTATION_CONFIRM_TOKEN`, las herramientas de mutación requieren un argumento `confirm` coincidente.
- Cuando `WIKI_MUTATION_DRY_RUN=true`, las herramientas de escritura devuelven una vista previa y no mutan Wiki.js.
- Si se establece `WIKI_ALLOWED_MUTATION_PATH_PREFIXES`, las mutaciones de página y creación de comentarios se limitan a esos prefijos de ruta.
- Todos los intentos de mutación escriben una línea de auditoría estructurada en stderr.

## Recursos MCP

| URI de recurso                     | Descripción                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `wikijs://markdown-guide`          | Guía de sintaxis markdown de Wiki.js (CommonMark/GFM + extensiones específicas de Wiki.js) para creación y actualización de páginas. |
| `wikijs://mermaid-guide`           | Guía de sintaxis de diagramas Mermaid 8.8.2 para Wiki.js (9 tipos de diagrama soportados, advertencias de funciones no soportadas, restricciones de versión). |
| `wikijs://api-permissions-guide`   | Modelo de permisos de API de Wiki.js, códigos de error y guía de configuración de API key para autodiagnóstico de errores de permisos. |

## Notas de permisos (Wiki.js)

El comportamiento de permisos de Wiki.js puede ser sorprendente para las API keys. En particular:

- Algunas operaciones pueden requerir reglas `manage:pages`/`delete:pages` a nivel de regla de página.
- Leer `content` puede requerir `read:source` dependiendo de verificaciones a nivel de esquema/campo.
- Las operaciones de comentarios requieren `read:comments`, `write:comments` o `manage:comments`.
- La información del sistema y la navegación requieren permisos de API key a nivel de administrador.

Códigos de error comunes:

| Código | Significado |
| --- | --- |
| 6013 | `PageViewForbidden` — verificar permisos de grupo + reglas de página para `read:pages`/`read:source` |
| 6003 | La página no existe |
| 8002 | `CommentPostForbidden` |
| 8003 | `CommentNotFound` |
| 8004 | `CommentViewForbidden` |
| 8005 | `CommentManageForbidden` |

Para más detalles, lee el recurso `wikijs://api-permissions-guide`.

## Permisos mínimos sugeridos para API Key

Para uso intensivo en lectura de base de conocimiento:

- `read:pages`, `read:source`
- `read:comments` (para navegación de comentarios)
- Reglas de página que permitan esos permisos para rutas/locales previstos

Para flujos de trabajo de escritura:

- `write:pages` (crear y actualizar)
- `manage:pages` o `delete:pages` (para operaciones de eliminación/movimiento)
- `write:comments`, `manage:comments` (para mutaciones de comentarios)
- `manage:system` (para gestión de etiquetas)

## Guía de seguridad

- Mantén el token de API solo del lado del servidor.
- Comienza con permisos de solo lectura.
- Mantén `WIKI_MUTATIONS_ENABLED=false` a menos que se necesiten actualizaciones.
- Refuerzo opcional: establece un `WIKI_MUTATION_CONFIRM_TOKEN` aleatorio fuerte y pasa `confirm` coincidente para llamadas de escritura.
- Mantén `WIKI_MUTATION_DRY_RUN=true` hasta que estés listo para escrituras reales.
- Usa `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` para restringir el alcance de escritura.
- `wikijs_get_system_info` filtra campos de infraestructura sensibles (dbHost, configFile, etc.) por defecto.
- Los campos `scriptJs`/`scriptCss` en creación/actualización de páginas tienen límite de longitud (10,000 caracteres) e incluyen advertencias de ejecución en navegador.
