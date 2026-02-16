# requarks-wiki-mcp

Servidor MCP para uma instância de [Wiki.js](https://js.wiki/) que permite aos agentes usá-la como base de conhecimento.

Recursos:

- **29 ferramentas** (19 leitura + 10 escrita) cobrindo páginas, comentários, tags, assets, usuários, navegação e informações do sistema.
- Busca, listagem e navegação de páginas para fluxos de recuperação (uso estilo RAG).
- Obtenha conteúdo de páginas por caminho ou ID, visualize histórico de versões e restaure versões anteriores.
- Navegue pela hierarquia do site com árvore de páginas, grafo de links entre páginas e estrutura de navegação.
- Sistema completo de comentários: listar, ler, criar, atualizar e deletar comentários em páginas.
- Navegação de assets e pastas para descoberta de arquivos de mídia.
- Contexto de usuário: perfil do usuário atual e busca de usuários.
- Diagnósticos do sistema: informações de versão, configuração do site e árvore de navegação.
- Gerenciamento de tags: listar, buscar, atualizar e deletar tags.
- Ferramentas opcionais de criar/atualizar/deletar/mover/restaurar páginas com mecanismos de segurança explícitos.
- Recursos integrados: guia de sintaxe markdown, guia de diagramas Mermaid e guia de permissões da API.
- Taxonomia de erros tipada com mensagens amigáveis para LLM.
- Cliente GraphQL com timeout, retry com backoff exponencial e correlação de requisições.
- Proteção de segurança: filtragem de campos sensíveis, validação de URL, limites de tamanho de entrada.

## Requisitos

- Node.js 20+
- Um hostname Wiki.js acessível
- Chave de API Wiki.js (JWT) com permissões adequadas

## Setup

```bash
cp .env.example .env
npm install
```

Configure o `.env`:

```env
WIKI_BASE_URL=https://your-wiki-hostname
WIKI_API_TOKEN=your_wikijs_api_key_jwt
WIKI_GRAPHQL_PATH=/graphql
WIKI_DEFAULT_LOCALE=en
WIKI_DEFAULT_EDITOR=markdown

# Operações de mutação são desabilitadas por padrão
WIKI_MUTATIONS_ENABLED=false
# Camada extra de segurança opcional para escritas. Se configurado, ferramentas de escrita devem passar confirm correspondente.
WIKI_MUTATION_CONFIRM_TOKEN=
WIKI_MUTATION_DRY_RUN=true
# Prefixos de caminho separados por vírgula sem barra inicial (vazio = sem restrição de prefixo)
WIKI_ALLOWED_MUTATION_PATH_PREFIXES=

# Resiliência HTTP
WIKI_HTTP_TIMEOUT_MS=15000
WIKI_HTTP_MAX_RETRIES=2
```

Referência de variáveis de ambiente:

| Variável                              | Obrigatória | Padrão     | Descrição                                                                                                                     |
| ------------------------------------- | ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `WIKI_BASE_URL`                       | Sim         | -          | URL base do Wiki.js (por exemplo, `https://wiki.example.com`).                                                                |
| `WIKI_API_TOKEN`                      | Sim         | -          | JWT da chave de API do Wiki.js usado em `Authorization: Bearer ...`.                                                          |
| `WIKI_GRAPHQL_PATH`                   | Não         | `/graphql` | Caminho do endpoint GraphQL anexado ao `WIKI_BASE_URL`.                                                                       |
| `WIKI_DEFAULT_LOCALE`                 | Não         | `en`       | Locale padrão usado quando a entrada da ferramenta não fornece locale.                                                        |
| `WIKI_DEFAULT_EDITOR`                 | Não         | `markdown` | Editor padrão usado para criação de página quando não especificado.                                                           |
| `WIKI_MUTATIONS_ENABLED`              | Não         | `false`    | Habilita todas as ferramentas de escrita (mutações de página, comentário e tag) quando definido como `true`.                  |
| `WIKI_MUTATION_CONFIRM_TOKEN`         | Não         | `` (vazio) | Camada extra de segurança opcional. Quando configurado, chamadas de ferramentas de escrita devem fornecer `confirm` correspondente. |
| `WIKI_MUTATION_DRY_RUN`               | Não         | `true`     | Quando `true`, ferramentas de mutação retornam apenas preview e não escrevem no Wiki.js.                                      |
| `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` | Não         | `` (vazio) | Prefixos de caminho separados por vírgula (sem barra inicial) permitidos para mutações. Vazio significa sem restrição de prefixo. |
| `WIKI_HTTP_TIMEOUT_MS`                | Não         | `15000`    | Timeout de requisição HTTP em milissegundos (incluindo leitura do body). Mínimo 1.                                            |
| `WIKI_HTTP_MAX_RETRIES`               | Não         | `2`        | Máximo de retries para falhas transitórias de leitura (408, 502-504). Mutações nunca são retentadas. Mínimo 0.                |

Pré-requisito Wiki.js (GraphQL + chave de API):

- Este MCP usa GraphQL do Wiki.js internamente.
- No admin do Wiki.js, vá em `Administration -> API` e habilite o acesso à API.
- Crie uma chave de API e defina-a como `WIKI_API_TOKEN`.

## Exemplo de Configuração do Cliente MCP (`~/.mcp.json`)

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

## Registrar MCP Via Caminho Local (Sem Publicação npm)

Você pode registrar este servidor MCP diretamente do caminho local do seu projeto sem publicar/instalar do npm.

1. Build neste repositório

```bash
npm install
npm run build
```

2. Registre o caminho absoluto local em `~/.mcp.json`

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

- Sempre use um caminho absoluto.
- Execute `npm run build` novamente após mudanças no código para manter o `dist/index.js` atualizado.

## Execução

Desenvolvimento:

```bash
npm run dev
```

Build + execução:

```bash
npm run build
npm start
```

## Ferramentas MCP

### Ferramentas de Leitura (19)

**Páginas:**

| Ferramenta | Descrição |
| --- | --- |
| `wikijs_search_pages` | Busca de texto completo em páginas do wiki. |
| `wikijs_list_pages` | Lista páginas com filtro opcional de locale e limite. |
| `wikijs_get_page_by_path` | Obtém conteúdo completo da página por caminho + locale. |
| `wikijs_get_page_by_id` | Obtém conteúdo completo da página por ID numérico. |
| `wikijs_get_page_tree` | Navega pela hierarquia do site (pastas, páginas ou ambos). |
| `wikijs_get_page_history` | Visualiza o histórico de edições de uma página. |
| `wikijs_get_page_version` | Obtém o conteúdo completo de uma versão específica. |
| `wikijs_get_page_links` | Obtém relacionamentos de links entre páginas (grafo de conhecimento). |

**Tags:**

| Ferramenta | Descrição |
| --- | --- |
| `wikijs_list_tags` | Lista todas as tags para descoberta de taxonomia de conteúdo. |
| `wikijs_search_tags` | Busca tags que correspondem a uma string de consulta. |

**Comentários:**

| Ferramenta | Descrição |
| --- | --- |
| `wikijs_list_comments` | Lista todos os comentários de uma página por caminho e locale. |
| `wikijs_get_comment` | Obtém um único comentário por ID. |

**Sistema & Navegação:**

| Ferramenta | Descrição |
| --- | --- |
| `wikijs_get_system_info` | Versão do Wiki.js, tipo de banco de dados e estatísticas de uso. |
| `wikijs_get_navigation` | Estrutura da árvore de navegação. |
| `wikijs_get_site_config` | Configuração do site (campos não sensíveis). |

**Assets:**

| Ferramenta | Descrição |
| --- | --- |
| `wikijs_list_assets` | Lista assets com filtro opcional de pasta e tipo. |
| `wikijs_list_asset_folders` | Lista pastas de assets. |

**Usuários:**

| Ferramenta | Descrição |
| --- | --- |
| `wikijs_get_current_user` | Obtém o perfil do usuário de API atualmente autenticado. |
| `wikijs_search_users` | Busca usuários por nome ou email. |

### Ferramentas de Escrita (10, desabilitadas a menos que `WIKI_MUTATIONS_ENABLED=true`)

**Mutações de Página:**

| Ferramenta | Descrição |
| --- | --- |
| `wikijs_create_page` | Cria uma nova página com conteúdo, tags e metadados. |
| `wikijs_update_page` | Atualiza uma página existente por ID. |
| `wikijs_delete_page` | Deleta uma página por ID. Pode precisar de `manage:pages` ou `delete:pages`. |
| `wikijs_move_page` | Move/renomeia uma página para um novo caminho ou locale. |
| `wikijs_restore_page` | Restaura uma página para uma versão anterior. |

**Mutações de Comentário:**

| Ferramenta | Descrição |
| --- | --- |
| `wikijs_create_comment` | Cria um comentário em uma página. |
| `wikijs_update_comment` | Atualiza um comentário existente por ID. |
| `wikijs_delete_comment` | Deleta um comentário por ID. |

**Mutações de Tag:**

| Ferramenta | Descrição |
| --- | --- |
| `wikijs_update_tag` | Atualiza o slug e título de uma tag. |
| `wikijs_delete_tag` | Deleta uma tag de todas as páginas. |

### Segurança de Mutações

- Quando `WIKI_MUTATION_CONFIRM_TOKEN` estiver configurado, ferramentas de mutação exigem um argumento `confirm` correspondente.
- Quando `WIKI_MUTATION_DRY_RUN=true`, ferramentas de escrita retornam um preview e não modificam o Wiki.js.
- Se `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` estiver configurado, mutações de página e criação de comentário são limitadas a esses prefixos de caminho.
- Todas as tentativas de mutação escrevem uma linha de auditoria estruturada no stderr.

## Recursos MCP

| URI do Recurso                     | Descrição                                                                                                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `wikijs://markdown-guide`          | Guia de sintaxe markdown do Wiki.js (CommonMark/GFM + extensões específicas do Wiki.js) destinado à criação e atualização de páginas. |
| `wikijs://mermaid-guide`           | Guia de sintaxe de diagramas Mermaid 8.8.2 para Wiki.js (9 tipos de diagrama suportados, avisos de funcionalidades não suportadas, restrições de versão). |
| `wikijs://api-permissions-guide`   | Modelo de permissões da API do Wiki.js, códigos de erro e guia de configuração de chave de API para autodiagnóstico de erros de permissão. |

## Notas sobre Permissões (Wiki.js)

O comportamento de permissões do Wiki.js pode ser surpreendente para chaves de API. Em particular:

- Algumas operações podem exigir regras `manage:pages`/`delete:pages` no nível de regra de página.
- Ler `content` pode exigir `read:source` dependendo de verificações de nível de esquema/campo.
- Operações de comentário exigem `read:comments`, `write:comments` ou `manage:comments`.
- Informações do sistema e navegação exigem permissões de chave de API de nível admin.

Códigos de erro comuns:

| Código | Significado |
| --- | --- |
| 6013 | `PageViewForbidden` — verifique permissões de grupo + regras de página para `read:pages`/`read:source` |
| 6003 | A página não existe |
| 8002 | `CommentPostForbidden` |
| 8003 | `CommentNotFound` |
| 8004 | `CommentViewForbidden` |
| 8005 | `CommentManageForbidden` |

Para mais detalhes, leia o recurso `wikijs://api-permissions-guide`.

## Permissões Mínimas Sugeridas para Chave de API

Para uso de KB com foco em leitura:

- `read:pages`, `read:source`
- `read:comments` (para navegação de comentários)
- Regras de página permitindo essas permissões para caminhos/locales pretendidos

Para fluxos de escrita:

- `write:pages` (criar e atualizar)
- `manage:pages` ou `delete:pages` (para operações de deletar/mover)
- `write:comments`, `manage:comments` (para mutações de comentário)
- `manage:system` (para gerenciamento de tags)

## Orientações de Segurança

- Mantenha o token da API apenas no lado do servidor.
- Comece com permissões somente leitura.
- Mantenha `WIKI_MUTATIONS_ENABLED=false` a menos que atualizações sejam necessárias.
- Proteção opcional: defina um `WIKI_MUTATION_CONFIRM_TOKEN` aleatório forte e passe o `confirm` correspondente para chamadas de escrita.
- Mantenha `WIKI_MUTATION_DRY_RUN=true` até estar pronto para escritas reais.
- Use `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` para restringir o escopo de escrita.
- `wikijs_get_system_info` filtra campos sensíveis de infraestrutura (dbHost, configFile, etc.) por padrão.
- Campos `scriptJs`/`scriptCss` em criar/atualizar página têm limite de tamanho (10.000 caracteres) e incluem avisos de execução no navegador.
